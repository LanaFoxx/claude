/**
 * CTC Moodle enrollment safety net (Code Snippets, scope: global).
 *
 * The Moodle plugin enrolls students from the customer's browser: the Thank You page ([moodleauth]) sends one AJAX
 * request to Moodle's enrollcourse.php. If that page never loads, loads slowly, the request times out while Moodle is
 * busy, or the customer closes the tab, the student is never enrolled.
 *
 * The Thank You page is left as it is. On top of it:
 *  1. When its request succeeds, the page tells WordPress (order meta _ctc_moodle_enrolled = thankyou).
 *  2. Every paid order with a Moodle course gets a server-side check 10 minutes later. If the Thank You page did not
 *     report success, the server sends the same enrollment request itself (same values the plugin sends), retrying
 *     at 30 minutes, 2 hours and 6 hours. Each attempt is logged as an order note; if all fail, the admin is emailed.
 */
if ( ! defined( 'CTC_ME_DELAYS' ) ) define( 'CTC_ME_DELAYS', array( 10 * MINUTE_IN_SECONDS, 30 * MINUTE_IN_SECONDS, 2 * HOUR_IN_SECONDS, 6 * HOUR_IN_SECONDS ) );

// Moodle course ids for an order, read the way the plugin reads them (every _product_id on the order's items).
function ctc_me_courses( $order_id ) {
	global $wpdb;
	if ( ! function_exists( 'getcourse' ) ) return '';
	$ids = $wpdb->get_col( $wpdb->prepare(
		"SELECT m.meta_value FROM {$wpdb->prefix}woocommerce_order_itemmeta m JOIN {$wpdb->prefix}woocommerce_order_items i ON i.order_item_id = m.order_item_id
		 WHERE i.order_id = %d AND m.meta_key = '_product_id'", $order_id ) );
	$ids = array_filter( array_map( 'absint', $ids ) );
	return $ids ? (string) getcourse( implode( ',', array_unique( $ids ) ) ) : '';
}

// The same request values the plugin's [moodleauth] script sends.
function ctc_me_args( $order, $courses ) {
	$u = $order->get_customer_id() ? get_userdata( $order->get_customer_id() ) : false;
	if ( $u ) {
		$first = get_user_meta( $u->ID, 'billing_first_name', true );
		$last  = get_user_meta( $u->ID, 'billing_last_name', true );
		$args  = array( 'user' => $u->user_login, 'email' => $u->user_email, 'displayname' => $u->display_name );
	} else {
		$first = $order->get_billing_first_name();
		$last  = $order->get_billing_last_name();
		$args  = array( 'user' => $order->get_billing_email(), 'email' => $order->get_billing_email(), 'displayname' => $first . ' ' . $last );
	}
	return $args + array( 'course' => $courses, 'firstname' => $first, 'lastname' => $last );
}

function ctc_me_url() {
	global $wpdb;
	$mdl = $wpdb->get_row( "SELECT moodleurl FROM {$wpdb->prefix}moodledetail WHERE id = 1" );
	return $mdl && $mdl->moodleurl ? rtrim( $mdl->moodleurl, '/' ) . '/local/mdl_course_enroll/enrollcourse.php' : '';
}

/* ---------------------------------------------------------------- schedule the check when an order is paid */
function ctc_me_schedule( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order || $order->get_meta( '_ctc_moodle_enrolled' ) || $order->get_meta( '_ctc_moodle_check' ) ) return;
	if ( '' === ctc_me_courses( $order_id ) || ! function_exists( 'as_schedule_single_action' ) ) return;
	$order->update_meta_data( '_ctc_moodle_check', time() );
	$order->save();
	as_schedule_single_action( time() + CTC_ME_DELAYS[0], 'ctc_me_check', array( (int) $order_id, 0 ), 'ctc-moodle' );
}
add_action( 'woocommerce_payment_complete', 'ctc_me_schedule' );
add_action( 'woocommerce_order_status_processing', 'ctc_me_schedule' );
add_action( 'woocommerce_order_status_completed', 'ctc_me_schedule' );

/* ---------------------------------------------------------------- Thank You page: report a successful enrollment */
add_action( 'wp_footer', function () {
	if ( ! function_exists( 'ctc_is_thankyou' ) || ! ctc_is_thankyou() || empty( $_GET['order'] ) || empty( $_GET['key'] ) ) return;
	$url   = esc_url( WC_AJAX::get_endpoint( 'ctc_me_ok' ) );
	$order = absint( $_GET['order'] );
	$key   = esc_js( wc_clean( wp_unslash( $_GET['key'] ) ) );
	echo "<script>if(window.jQuery)jQuery(document).ajaxSuccess(function(e,x,s){if(!s||!s.url||s.url.indexOf('enrollcourse.php')<0)return;var d=new FormData();d.append('order','$order');d.append('key','$key');fetch('$url',{method:'POST',body:d,credentials:'same-origin'});});</script>";
}, 40 );
function ctc_me_ok() {
	$order = wc_get_order( absint( $_POST['order'] ?? 0 ) );
	if ( ! $order || ! hash_equals( $order->get_order_key(), wc_clean( wp_unslash( $_POST['key'] ?? '' ) ) ) ) wp_send_json_error( null, 403 );
	if ( ! $order->get_meta( '_ctc_moodle_enrolled' ) ) {
		$order->update_meta_data( '_ctc_moodle_enrolled', 'thankyou' );
		$order->add_order_note( 'Moodle enrollment sent from the Thank You page.' );
		$order->save();
	}
	wp_send_json_success();
}
add_action( 'wc_ajax_ctc_me_ok', 'ctc_me_ok' );

/* ---------------------------------------------------------------- server-side enrollment (fallback + retries) */
add_action( 'ctc_me_check', function ( $order_id, $attempt ) {
	$order = wc_get_order( $order_id );
	if ( ! $order || $order->get_meta( '_ctc_moodle_enrolled' ) || ! $order->is_paid() ) return;
	$courses = ctc_me_courses( $order_id );
	$url     = ctc_me_url();
	if ( '' === $courses || '' === $url ) return;
	$r    = wp_remote_get( add_query_arg( array_map( 'rawurlencode', ctc_me_args( $order, $courses ) ), $url ), array( 'timeout' => 45 ) );
	$code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
	if ( $code >= 200 && $code < 300 ) {
		$order->update_meta_data( '_ctc_moodle_enrolled', 'server' );
		$order->add_order_note( sprintf( 'Moodle enrollment sent by the server (course %s): the Thank You page had not confirmed it. HTTP %d.', $courses, $code ) );
		$order->save();
		return;
	}
	$why  = is_wp_error( $r ) ? $r->get_error_message() : 'HTTP ' . $code;
	$next = $attempt + 1;
	if ( isset( CTC_ME_DELAYS[ $next ] ) ) {
		$order->add_order_note( sprintf( 'Moodle enrollment attempt %d failed (%s); trying again later.', $next, $why ) );
		as_schedule_single_action( time() + CTC_ME_DELAYS[ $next ] - CTC_ME_DELAYS[ $attempt ], 'ctc_me_check', array( (int) $order_id, $next ), 'ctc-moodle' );
		return;
	}
	$order->add_order_note( sprintf( 'Moodle enrollment FAILED after %d attempts (%s). Enroll this student manually.', $next, $why ) );
	wp_mail( get_option( 'admin_email' ), sprintf( 'Moodle enrollment failed – order #%s', $order->get_order_number() ),
		sprintf( "The student on order #%s could not be enrolled in Moodle automatically (%s).\nPlease enroll them manually: %s", $order->get_order_number(), $why, $order->get_edit_order_url() ) );
}, 10, 2 );
