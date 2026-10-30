/**
 * CTC Annual Auto-Renewal (Code Snippets, scope: global). Needs WooCommerce Subscriptions + a gateway that supports it.
 *
 * - Checkout: when the cart holds a subscription, an auto-renewal disclosure + required (unchecked) consent box above
 *   "Place order"; the consent (text + time) is saved on the order and the subscription.
 * - Emails (branded, from help@): confirmation when the plan starts, renewal reminders 30 and 7 days before each charge,
 *   CTEC deadline reminders (Sep 1, Oct 1, Oct 24), and a new-course announcement sent from WooCommerce > Auto-Renewal.
 *   Every email carries a one-click cancel link (no account login needed).
 * - Renewal: each paid renewal enrolls the student in the Moodle course currently mapped to the 20 Hour course product
 *   (Enroll Course > Courses Mapping) by calling the same Moodle endpoint the Thank You page uses.
 * The first purchase is enrolled by the Thank You page like any other order (plan items also point at the 20 Hour product).
 */
if ( ! defined( 'CTC_AR_PRICE_LABEL' ) ) define( 'CTC_AR_PRICE_LABEL', '$64.95/year' );
if ( ! defined( 'CTC_AR_PLAN_PRODUCT' ) ) define( 'CTC_AR_PLAN_PRODUCT', 30511 );   // the Annual Auto-Renewal subscription product
if ( ! defined( 'CTC_AR_SOURCE_PRODUCT' ) ) define( 'CTC_AR_SOURCE_PRODUCT', 48 );  // CTEC 20 Hour course: the plan uses this product's Moodle course mapping

// Thank You page enrollment (Moodle plugin) looks courses up by each order item's _product_id. Give plan items a second
// _product_id row pointing at the 20 Hour course product, so the first purchase enrolls in its mapped course too.
add_action( 'woocommerce_checkout_order_processed', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order ) return;
	foreach ( $order->get_items() as $item_id => $item ) {
		if ( (int) $item->get_product_id() === CTC_AR_PLAN_PRODUCT ) wc_add_order_item_meta( $item_id, '_product_id', CTC_AR_SOURCE_PRODUCT, false );
	}
}, 5 );

function ctc_ar_active() {
	return function_exists( 'wcs_get_subscriptions' ) && class_exists( 'WC_Subscriptions_Cart' );
}
function ctc_ar_cart_has_plan() {
	return ctc_ar_active() && WC()->cart && WC_Subscriptions_Cart::cart_contains_subscription();
}
function ctc_ar_guide_url() {
	return home_url( '/how-to-renew-your-ctec-registration/' );
}

/* ---------------------------------------------------------------- checkout disclosure + consent */
function ctc_ar_consent_text() {
	return 'I agree to pay ' . CTC_AR_PRICE_LABEL . ' today and to be charged ' . CTC_AR_PRICE_LABEL . ' automatically on this date every year until I cancel. I\'ll get reminders 30 and 7 days before each renewal, and I can cancel anytime online (link in every email) or at help@cataxcourses.com.';
}
add_action( 'woocommerce_review_order_before_submit', function () {
	if ( ! ctc_ar_cart_has_plan() ) return;
	echo '<div class="ctc-ar-box"><div class="ctc-ar-head"><strong class="ctc-ar-title">Annual Auto-Renewal</strong><span class="ctc-ar-price">' . esc_html( CTC_AR_PRICE_LABEL ) . '</span></div>'
		. '<p>You\'re enrolled in each year\'s updated 20 Hour course automatically. You still complete the course and renew your CTEC registration with CTEC yourself. <a href="' . esc_url( ctc_ar_guide_url() ) . '" target="_blank">How to renew&nbsp;→</a></p>'
		. '<p class="form-row validate-required ctc-ar-consent"><label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox"><input type="checkbox" class="woocommerce-form__input woocommerce-form__input-checkbox input-checkbox" name="ctc_ar_consent" value="1"> <span>' . esc_html( ctc_ar_consent_text() ) . '&nbsp;<abbr class="required" title="required">*</abbr></span></label></p></div>';
} );
add_action( 'woocommerce_checkout_process', function () {
	if ( ctc_ar_cart_has_plan() && empty( $_POST['ctc_ar_consent'] ) ) {
		wc_add_notice( 'Please check the Annual Auto-Renewal agreement box to continue.', 'error' );
	}
} );
add_action( 'woocommerce_checkout_create_order', function ( $order ) {
	if ( ctc_ar_cart_has_plan() && ! empty( $_POST['ctc_ar_consent'] ) ) {
		$order->update_meta_data( '_ctc_ar_consent', array( 'time' => current_time( 'mysql' ), 'text' => ctc_ar_consent_text() ) );
	}
} );
add_action( 'woocommerce_checkout_subscription_created', function ( $subscription, $order ) {
	$c = $order->get_meta( '_ctc_ar_consent' );
	if ( $c ) { $subscription->update_meta_data( '_ctc_ar_consent', $c ); $subscription->save(); }
}, 10, 2 );

// The plan and the one-time 20 Hour online course replace each other: whichever was added last stays.
add_action( 'woocommerce_add_to_cart', function ( $key, $product_id, $qty = 1, $variation_id = 0 ) {
	if ( ! WC()->cart ) return;
	$added_plan = (int) $product_id === CTC_AR_PLAN_PRODUCT;
	$added_one  = 9293 === (int) $variation_id;
	if ( ! $added_plan && ! $added_one ) return;
	foreach ( WC()->cart->get_cart() as $k => $it ) {
		if ( $k === $key ) continue;
		if ( ( $added_plan && 9293 === (int) $it['variation_id'] ) || ( $added_one && CTC_AR_PLAN_PRODUCT === (int) $it['product_id'] ) ) WC()->cart->remove_cart_item( $k );
	}
}, 10, 4 );
// Plain wording for the Subscriptions "recurring totals" rows, so next year's charge doesn't read like a second charge today.
add_filter( 'gettext', function ( $t, $orig, $domain ) {
	if ( 'woocommerce-subscriptions' !== $domain ) return $t;
	if ( 'Recurring totals' === $orig ) return 'Renews yearly at';
	if ( 'Recurring total' === $orig ) return 'Then every year';
	if ( 'First renewal: %s' === $orig ) return 'Next charge: %s';
	return $t;
}, 20, 3 );

/* ---------------------------------------------------------------- one-click cancel */
function ctc_ar_cancel_url( $sub ) {
	$k = hash_hmac( 'sha256', $sub->get_id() . '|' . strtolower( $sub->get_billing_email() ), wp_salt( 'auth' ) );
	return add_query_arg( array( 'ctc_ar_cancel' => $sub->get_id(), 'k' => substr( $k, 0, 32 ) ), home_url( '/' ) );
}
add_action( 'template_redirect', function () {
	if ( empty( $_GET['ctc_ar_cancel'] ) || ! ctc_ar_active() ) return;
	$sub = wcs_get_subscription( (int) $_GET['ctc_ar_cancel'] );
	$ok  = $sub && hash_equals( substr( hash_hmac( 'sha256', $sub->get_id() . '|' . strtolower( $sub->get_billing_email() ), wp_salt( 'auth' ) ), 0, 32 ), (string) ( $_GET['k'] ?? '' ) );
	$css = 'font-family:Arial,Helvetica,sans-serif;color:#1C2333;max-width:560px;margin:60px auto;padding:0 20px;line-height:1.6';
	if ( ! $ok ) wp_die( '<div style="' . $css . '"><h1>Link not valid</h1><p>Please email help@cataxcourses.com or call (888) 229-1994 and we will cancel your auto-renewal for you.</p></div>', 'Cancel auto-renewal', array( 'response' => 200 ) );
	$end = $sub->get_date_to_display( 'next_payment' );
	if ( 'POST' === $_SERVER['REQUEST_METHOD'] && ! empty( $_POST['ctc_ar_confirm'] ) ) {
		if ( $sub->has_status( 'active' ) ) $sub->update_status( 'pending-cancel', 'Cancelled by the customer from the email cancel link.' );
		elseif ( $sub->has_status( array( 'on-hold', 'pending' ) ) ) $sub->update_status( 'cancelled', 'Cancelled by the customer from the email cancel link.' );
		ctc_ar_send( $sub, 'cancelled' );
		wp_die( '<div style="' . $css . '"><h1>Your auto-renewal is cancelled.</h1><p>You will not be charged again. You keep access to the course you already have. Thank you for studying with California Tax Courses!</p><p><a href="' . esc_url( home_url( '/' ) ) . '" style="color:#B8901F">Back to cataxcourses.com</a></p></div>', 'Auto-renewal cancelled', array( 'response' => 200 ) );
	}
	if ( ! $sub->has_status( array( 'active', 'on-hold', 'pending' ) ) ) wp_die( '<div style="' . $css . '"><h1>Already cancelled</h1><p>This auto-renewal is no longer active. You will not be charged again.</p></div>', 'Cancel auto-renewal', array( 'response' => 200 ) );
	wp_die( '<div style="' . $css . '"><h1>Cancel your Annual Auto-Renewal?</h1><p>Your plan renews on <strong>' . esc_html( $end ) . '</strong> for ' . esc_html( CTC_AR_PRICE_LABEL ) . '. If you cancel, you will not be charged again and you keep access to the course you already have.</p>'
		. '<form method="post"><input type="hidden" name="ctc_ar_confirm" value="1"><button type="submit" style="background:#D4A93A;color:#fff;border:0;border-radius:12px;padding:14px 26px;font-size:17px;font-weight:700;cursor:pointer">Yes, cancel my auto-renewal</button></form>'
		. '<p style="margin-top:18px"><a href="' . esc_url( home_url( '/' ) ) . '" style="color:#B8901F">Keep my auto-renewal</a></p></div>', 'Cancel auto-renewal', array( 'response' => 200 ) );
} );

/* ---------------------------------------------------------------- Moodle enrollment on renewal */
add_action( 'woocommerce_subscription_renewal_payment_complete', function ( $sub, $order ) {
	global $wpdb;
	$mdl = $wpdb->get_row( "SELECT moodleurl FROM {$wpdb->prefix}moodledetail WHERE id=1" );
	if ( ! $mdl || ! $mdl->moodleurl ) return;
	$pids = array( CTC_AR_SOURCE_PRODUCT ); // the plan follows the 20 Hour course's mapping (updated yearly under Enroll Course)
	foreach ( $sub->get_items() as $it ) $pids[] = (int) $it->get_product_id();
	$courses = $wpdb->get_col( "SELECT courseid FROM {$wpdb->prefix}wootomoodle WHERE productid IN (" . implode( ',', array_map( 'intval', $pids ) ) . ')' );
	if ( ! $courses ) { $sub->add_order_note( 'Auto-renewal: no Moodle course mapped to this product (Enroll Course > Courses Mapping).' ); return; }
	$u    = $sub->get_user();
	$args = array(
		'user' => $u ? $u->user_login : $sub->get_billing_first_name(), 'email' => $sub->get_billing_email(), 'course' => implode( ',', $courses ),
		'displayname' => trim( $sub->get_billing_first_name() . ' ' . $sub->get_billing_last_name() ), 'firstname' => $sub->get_billing_first_name(), 'lastname' => $sub->get_billing_last_name(),
	);
	$r = wp_remote_get( add_query_arg( array_map( 'rawurlencode', $args ), rtrim( $mdl->moodleurl, '/' ) . '/local/mdl_course_enroll/enrollcourse.php' ), array( 'timeout' => 30 ) );
	$msg = is_wp_error( $r ) ? $r->get_error_message() : wp_remote_retrieve_response_code( $r ) . ' ' . wp_strip_all_tags( (string) ( json_decode( wp_remote_retrieve_body( $r ), true )['message'] ?? '' ) );
	$order->add_order_note( 'Auto-renewal Moodle enrollment (course ' . implode( ',', $courses ) . '): ' . $msg );
	ctc_ar_send( $sub, 'renewed' );
}, 10, 2 );

/* ---------------------------------------------------------------- emails */
add_action( 'woocommerce_subscription_status_active', function ( $sub ) {
	if ( $sub->get_meta( '_ctc_ar_welcome_sent' ) ) return;
	$sub->update_meta_data( '_ctc_ar_welcome_sent', current_time( 'mysql' ) );
	$sub->save();
	ctc_ar_send( $sub, 'welcome' );
} );

add_action( 'init', function () {
	if ( ctc_ar_active() && function_exists( 'as_has_scheduled_action' ) && ! as_has_scheduled_action( 'ctc_ar_daily', array(), 'ctc-auto-renewal' ) ) {
		as_schedule_recurring_action( strtotime( 'tomorrow 9:00am' ), DAY_IN_SECONDS, 'ctc_ar_daily', array(), 'ctc-auto-renewal' );
	}
} );
add_action( 'ctc_ar_daily', function () {
	if ( ! ctc_ar_active() ) return;
	$now  = current_time( 'timestamp', true );
	$subs = wcs_get_subscriptions( array( 'subscription_status' => array( 'active' ), 'subscriptions_per_page' => -1 ) );
	foreach ( $subs as $sub ) {
		$next = (int) $sub->get_time( 'next_payment' );
		if ( ! $next ) continue;
		$days = ( $next - $now ) / DAY_IN_SECONDS;
		foreach ( array( 30 => 'reminder30', 7 => 'reminder7' ) as $d => $type ) {
			$flag = '_ctc_ar_' . $type . '_' . gmdate( 'Ymd', $next );
			if ( $days <= $d && $days > ( 30 === $d ? 7 : 0 ) && ! $sub->get_meta( $flag ) ) {
				$sub->update_meta_data( $flag, current_time( 'mysql' ) );
				$sub->save();
				ctc_ar_send( $sub, $type );
			}
		}
	}
	// CTEC deadline reminders (Oct 31), once per year each
	$md = current_time( 'm-d' );
	foreach ( array( '09-01' => 'deadline60', '10-01' => 'deadline30', '10-24' => 'deadline7' ) as $day => $type ) {
		$opt = 'ctc_ar_' . $type . '_' . current_time( 'Y' );
		if ( $md >= $day && $md <= '10-31' && ! get_option( $opt ) && ( 'deadline60' !== $type || $md < '10-01' ) && ( 'deadline30' !== $type || $md < '10-24' ) ) {
			update_option( $opt, current_time( 'mysql' ), false );
			foreach ( $subs as $sub ) ctc_ar_send( $sub, $type );
		}
	}
} );

function ctc_ar_send( $sub, $type ) {
	$mail = ctc_ar_email( $sub, $type );
	if ( ! $mail ) return false;
	$ok = wp_mail( $sub->get_billing_email(), $mail['subject'], $mail['html'], array( 'Content-Type: text/html; charset=UTF-8', 'From: California Tax Courses <help@cataxcourses.com>', 'Reply-To: help@cataxcourses.com' ) );
	$sub->add_order_note( 'Auto-renewal email "' . $type . '" ' . ( $ok ? 'sent' : 'FAILED' ) . '.' );
	return $ok;
}

function ctc_ar_email( $sub, $type ) {
	$name  = esc_html( $sub->get_billing_first_name() ?: 'there' );
	$next  = $sub->get_time( 'next_payment' ) ? date_i18n( 'F j, Y', $sub->get_time( 'next_payment', 'site' ) ) : '';
	$pm    = wp_strip_all_tags( $sub->get_payment_method_to_display( 'customer' ) );
	$guide = '<a href="' . esc_url( ctc_ar_guide_url() ) . '" style="color:#B8901F;font-weight:700">How to Renew Your CTEC Registration</a>';
	$todo  = '<p><strong>What you still need to do:</strong> auto-renewal only handles purchasing the course. Complete your course, then renew your CTEC registration and pay CTEC\'s fee by the October 31 deadline. ' . $guide . '</p>';
	$cancel_line = '<p>Cancel anytime: <a href="' . esc_url( ctc_ar_cancel_url( $sub ) ) . '" style="color:#B8901F;font-weight:700">cancel my auto-renewal</a> (one click, no login), or email help@cataxcourses.com. You will not be charged again after cancelling.</p>';
	$details = '<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:6px 0 14px">'
		. '<tr><td style="padding:8px 0;border-bottom:1px solid #E6E3DA;color:#4B5058">Plan</td><td align="right" style="padding:8px 0;border-bottom:1px solid #E6E3DA;font-weight:700">Annual Auto-Renewal, ' . esc_html( CTC_AR_PRICE_LABEL ) . '</td></tr>'
		. ( $next ? '<tr><td style="padding:8px 0;border-bottom:1px solid #E6E3DA;color:#4B5058">Next renewal</td><td align="right" style="padding:8px 0;border-bottom:1px solid #E6E3DA;font-weight:700">' . esc_html( $next ) . '</td></tr>' : '' )
		. ( $pm ? '<tr><td style="padding:8px 0;color:#4B5058">Payment method</td><td align="right" style="padding:8px 0;font-weight:700">' . esc_html( $pm ) . '</td></tr>' : '' ) . '</table>';
	$login = 'https://learn.cataxcourses.com';
	$t = array(
		'welcome'    => array( 'Your Annual Auto-Renewal is active', 'You are all set', 'Your auto-renewal is active.',
			"<p>Hi $name, thank you for enrolling! You are in this year's course, and your Annual Auto-Renewal is set up.</p>$details<p><strong>What happens each year:</strong> on your renewal date we automatically enroll you in the updated CTEC 20 Hour Continuing Education Course and email you, so you never have to go through checkout again.</p>$todo$cancel_line", 'Go to My Course →', $login ),
		'reminder30' => array( 'Your auto-renewal is coming up in 30 days', 'Renewal reminder', 'Your course renews in 30 days.',
			"<p>Hi $name, this is a reminder that your Annual Auto-Renewal for the CTEC 20 Hour Continuing Education Course will renew on <strong>" . esc_html( $next ) . '</strong>.</p>' . $details . $todo . $cancel_line, 'Go to My Course →', $login ),
		'reminder7'  => array( 'Your course renews in one week', 'Renewal reminder', 'Your course renews in one week.',
			"<p>Hi $name, your Annual Auto-Renewal will renew in one week, on <strong>" . esc_html( $next ) . '</strong>. You will be enrolled in the updated course automatically.</p>' . $details . $todo . $cancel_line, 'Go to My Course →', $login ),
		'renewed'    => array( 'You are enrolled in this year\'s course', 'Renewed', 'You are enrolled in the updated course.',
			"<p>Hi $name, your Annual Auto-Renewal went through and you are enrolled in the updated CTEC 20 Hour Continuing Education Course. Log in with your existing California Tax Courses login.</p>$details$todo$cancel_line", 'Start My Course →', $login ),
		'announce'   => array( 'The new CTEC 20 Hour course is now available', 'New course available', 'This year\'s updated course is here.',
			"<p>Hi $name, the updated CTEC 20 Hour Continuing Education Course is now available. Because you have Annual Auto-Renewal, you will be enrolled in it automatically on your renewal date" . ( $next ? ', <strong>' . esc_html( $next ) . '</strong>' : '' ) . '. You don\'t need to do anything to purchase it.</p><p>Need it sooner? Reply to this email or call (888) 229-1994 and we will help.</p>' . $todo . $cancel_line, 'Visit California Tax Courses →', home_url( '/' ) ),
		'deadline60' => array( 'CTEC renewal deadline: October 31', 'CTEC deadline reminder', 'The CTEC deadline is October 31.',
			"<p>Hi $name, a friendly reminder that the CTEC renewal deadline is <strong>October 31</strong>. If you haven't already, complete your 20 Hour Continuing Education Course and then renew your CTEC registration with CTEC.</p>$todo$cancel_line", 'Go to My Course →', $login ),
		'deadline30' => array( '30 days left to renew with CTEC', 'CTEC deadline reminder', '30 days until the CTEC deadline.',
			"<p>Hi $name, there are 30 days left until the October 31 CTEC renewal deadline. If you haven't already, finish your course now. Your hours are reported to CTEC instantly when you complete it.</p>$todo$cancel_line", 'Go to My Course →', $login ),
		'deadline7'  => array( 'One week left: CTEC deadline is October 31', 'Final CTEC reminder', 'One week left to renew with CTEC.',
			"<p>Hi $name, one week left! The CTEC renewal deadline is <strong>October 31</strong>. If you haven't already, complete your course and renew your CTEC registration with CTEC before the deadline.</p>$todo$cancel_line", 'Go to My Course →', $login ),
		'cancelled'  => array( 'Your auto-renewal is cancelled', 'Cancelled', 'Your auto-renewal is cancelled.',
			"<p>Hi $name, your Annual Auto-Renewal is cancelled and you will not be charged again. You keep access to the course you already have.</p><p>Remember: you still need to complete your course and renew your CTEC registration with CTEC by the deadline. $guide</p>", 'Visit California Tax Courses →', home_url( '/' ) ),
	);
	if ( ! isset( $t[ $type ] ) ) return null;
	list( $subject, $eyebrow, $title, $body, $cta, $cta_url ) = $t[ $type ];
	$font = "'Outfit','Manrope',Arial,Helvetica,sans-serif";
	$html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#F3F1EC">'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F1EC"><tr><td align="center" style="padding:28px 12px">'
		. '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;border-top:6px solid #D4A93A">'
		. '<tr><td align="center" style="padding:26px 24px 22px"><img src="https://cataxcourses.com/wp-content/uploads/2020/09/California-Tax-Courses-Logo-Gold-500px.png" width="190" alt="California Tax Courses" style="display:block;width:190px;height:auto;border:0"></td></tr>'
		. '<tr><td style="background:#1C2333;padding:32px 40px"><div style="font-family:' . $font . ';font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#D4A93A">' . esc_html( $eyebrow ) . '</div><div style="font-family:' . $font . ';font-size:32px;line-height:1.1;font-weight:800;color:#fff;padding-top:10px">' . esc_html( $title ) . '</div></td></tr>'
		. '<tr><td style="padding:28px 40px 6px;font-family:' . $font . ';font-size:16px;line-height:1.65;color:#4B5058">' . $body . '</td></tr>'
		. '<tr><td align="center" style="padding:12px 40px 32px"><a href="' . esc_url( $cta_url ) . '" style="display:inline-block;background:#D4A93A;color:#fff;text-decoration:none;font-family:' . $font . ';font-size:18px;font-weight:700;padding:15px 32px;border-radius:12px">' . esc_html( $cta ) . '</a></td></tr>'
		. '<tr><td align="center" style="background:#F3F1EC;padding:20px 40px;font-family:' . $font . ';font-size:14px;line-height:1.6;color:#4B5058">Questions? Call <a href="tel:8882291994" style="color:#B8901F;font-weight:700;text-decoration:none">(888) 229-1994</a> · Mon–Fri 9am–4pm PST · <a href="mailto:help@cataxcourses.com" style="color:#B8901F;text-decoration:none">help@cataxcourses.com</a></td></tr>'
		. '</table></td></tr></table></body></html>';
	return array( 'subject' => $subject, 'html' => $html );
}

/* ---------------------------------------------------------------- admin: announcement + previews */
add_action( 'admin_menu', function () {
	add_submenu_page( 'woocommerce', 'Auto-Renewal', 'Auto-Renewal', 'manage_woocommerce', 'ctc-auto-renewal', function () {
		$sent = '';
		if ( ! empty( $_POST['ctc_ar_announce'] ) && check_admin_referer( 'ctc_ar_announce' ) && ctc_ar_active() ) {
			$n = 0;
			foreach ( wcs_get_subscriptions( array( 'subscription_status' => array( 'active' ), 'subscriptions_per_page' => -1 ) ) as $sub ) { if ( ctc_ar_send( $sub, 'announce' ) ) $n++; }
			update_option( 'ctc_ar_last_announce', current_time( 'mysql' ) . " ($n sent)", false );
			$sent = '<div class="notice notice-success"><p>New-course announcement sent to ' . $n . ' active subscribers.</p></div>';
		}
		$count = ctc_ar_active() ? count( wcs_get_subscriptions( array( 'subscription_status' => array( 'active' ), 'subscriptions_per_page' => -1, 'return' => 'ids' ) ) ) : 0;
		echo '<div class="wrap"><h1>Annual Auto-Renewal</h1>' . $sent . '<p>Active subscribers: <strong>' . (int) $count . '</strong>. Automatic emails: confirmation, renewal reminders 30 and 7 days before each charge, CTEC deadline reminders on Sep 1, Oct 1 and Oct 24. Each renewal enrolls the student in the Moodle course mapped to the plan under Enroll Course.</p>';
		echo '<h2>Each year, when the new course is ready</h2><ol><li>In <strong>Enroll Course → Courses Mapping</strong>, map the <strong>CTEC 20 Hour Continuing Education Course</strong> product to the new course (as you do every year). The auto-renewal plan follows that mapping automatically.</li><li>Click the button below to email every active subscriber that the new course is available.</li></ol>';
		echo '<form method="post" onsubmit="return confirm(\'Email all ' . (int) $count . ' active subscribers now?\')">';
		wp_nonce_field( 'ctc_ar_announce' );
		echo '<input type="hidden" name="ctc_ar_announce" value="1"><button class="button button-primary">Send new-course announcement</button> <span style="margin-left:10px;color:#666">Last sent: ' . esc_html( get_option( 'ctc_ar_last_announce', 'never' ) ) . '</span></form>';
		echo '<h2>Email previews</h2><p>';
		foreach ( array( 'welcome', 'reminder30', 'reminder7', 'renewed', 'announce', 'deadline60', 'deadline30', 'deadline7', 'cancelled' ) as $t ) echo '<a class="button" target="_blank" href="' . esc_url( add_query_arg( array( 'ctc_ar_preview' => $t ), home_url( '/' ) ) ) . '">' . esc_html( $t ) . '</a> ';
		echo '</p></div>';
	} );
} );
add_action( 'template_redirect', function () {
	if ( empty( $_GET['ctc_ar_preview'] ) || ! current_user_can( 'manage_woocommerce' ) ) return;
	// sample subscription-like object for previews
	$sample = new class {
		public function get_billing_first_name() { return 'Jordan'; }
		public function get_billing_last_name() { return 'Sample'; }
		public function get_billing_email() { return 'student@example.com'; }
		public function get_time( $k, $tz = 'gmt' ) { return strtotime( '+1 year' ); }
		public function get_payment_method_to_display( $c = '' ) { return 'Visa ending in 4242'; }
		public function get_id() { return 0; }
	};
	$mail = ctc_ar_email( $sample, sanitize_key( $_GET['ctc_ar_preview'] ) );
	header( 'Content-Type: text/html; charset=UTF-8' );
	echo $mail ? '<!-- subject: ' . esc_html( $mail['subject'] ) . ' -->' . $mail['html'] : 'Unknown email';
	exit;
} );

/* ---------------------------------------------------------------- admin: paid students list + bulk Moodle enrollment */
// WooCommerce > Auto-Renewal Students: everyone whose auto-renewal is paid up (active, or cancelled but still inside the
// year they paid for), filterable by last payment date. CSV export (Moodle "Upload users" columns) and a button that
// enrolls every listed student in a Moodle course id through the same enrollcourse.php the checkout uses (queued in
// Action Scheduler, one request at a time; the result is saved per student and noted on the subscription).
function ctc_ar_paid_subs( $since ) {
	if ( ! ctc_ar_active() ) return array();
	$out = array();
	foreach ( wcs_get_subscriptions( array( 'subscription_status' => array( 'active', 'pending-cancel' ), 'subscriptions_per_page' => -1 ) ) as $sub ) {
		$paid = (int) $sub->get_time( 'last_order_date_paid' ) ?: (int) $sub->get_time( 'start' );
		if ( $paid >= $since ) $out[] = array( $sub, $paid );
	}
	usort( $out, function ( $a, $b ) { return $b[1] <=> $a[1]; } );
	return $out;
}
function ctc_ar_student( $sub ) {
	$u = $sub->get_user();
	return array(
		'user' => $u ? $u->user_login : $sub->get_billing_email(), 'email' => $u ? $u->user_email : $sub->get_billing_email(),
		'firstname' => $sub->get_billing_first_name(), 'lastname' => $sub->get_billing_last_name(),
		'displayname' => trim( $sub->get_billing_first_name() . ' ' . $sub->get_billing_last_name() ),
	);
}
function ctc_ar_since() {
	$d = isset( $_REQUEST['since'] ) ? sanitize_text_field( wp_unslash( $_REQUEST['since'] ) ) : '';
	return $d && strtotime( $d ) ? strtotime( $d . ' 00:00:00 UTC' ) : strtotime( '-1 year' );
}
add_action( 'admin_init', function () {
	if ( empty( $_GET['ctc_ar_csv'] ) || ! current_user_can( 'manage_woocommerce' ) || ! check_admin_referer( 'ctc_ar_students' ) ) return;
	$course = absint( $_GET['course'] ?? 0 );
	header( 'Content-Type: text/csv; charset=UTF-8' );
	header( 'Content-Disposition: attachment; filename=auto-renewal-students-' . gmdate( 'Y-m-d' ) . '.csv' );
	$f = fopen( 'php://output', 'w' );
	fputcsv( $f, array_merge( array( 'username', 'email', 'firstname', 'lastname' ), $course ? array( 'course1' ) : array(), array( 'last_paid', 'renews', 'status', 'subscription' ) ) );
	foreach ( ctc_ar_paid_subs( ctc_ar_since() ) as list( $sub, $paid ) ) {
		$s = ctc_ar_student( $sub );
		fputcsv( $f, array_merge( array( $s['user'], $s['email'], $s['firstname'], $s['lastname'] ), $course ? array( $course ) : array(),
			array( gmdate( 'Y-m-d', $paid ), ( $n = (int) $sub->get_time( 'next_payment' ) ) ? gmdate( 'Y-m-d', $n ) : '', $sub->get_status(), $sub->get_id() ) ) );
	}
	exit;
} );
add_action( 'ctc_ar_bulk_enroll', function ( $sub_id, $course ) {
	global $wpdb;
	$sub = wcs_get_subscription( $sub_id );
	$mdl = $wpdb->get_row( "SELECT moodleurl FROM {$wpdb->prefix}moodledetail WHERE id=1" );
	if ( ! $sub || ! $mdl || ! $mdl->moodleurl ) return;
	$r    = wp_remote_get( add_query_arg( array_map( 'rawurlencode', ctc_ar_student( $sub ) + array( 'course' => (int) $course ) ), rtrim( $mdl->moodleurl, '/' ) . '/local/mdl_course_enroll/enrollcourse.php' ), array( 'timeout' => 45 ) );
	$code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
	$ok   = $code >= 200 && $code < 300;
	$sub->update_meta_data( '_ctc_ar_course_' . (int) $course, $ok ? current_time( 'mysql' ) : 'failed' );
	$sub->add_order_note( sprintf( 'Bulk enrollment in Moodle course %d: %s', $course, $ok ? 'done' : 'FAILED (' . ( is_wp_error( $r ) ? $r->get_error_message() : 'HTTP ' . $code ) . ')' ) );
	$sub->save();
}, 10, 2 );
add_action( 'admin_menu', function () {
	add_submenu_page( 'woocommerce', 'Auto-Renewal Students', 'Auto-Renewal Students', 'manage_woocommerce', 'ctc-ar-students', function () {
		global $wpdb;
		$since  = ctc_ar_since();
		$course = absint( $_REQUEST['course'] ?? 0 );
		$msg    = '';
		if ( ! empty( $_POST['ctc_ar_enroll'] ) && $course && check_admin_referer( 'ctc_ar_students' ) ) {
			$n = 0;
			foreach ( ctc_ar_paid_subs( $since ) as list( $sub ) ) {
				if ( $sub->get_meta( '_ctc_ar_course_' . $course ) && 'failed' !== $sub->get_meta( '_ctc_ar_course_' . $course ) ) continue; // already enrolled
				as_enqueue_async_action( 'ctc_ar_bulk_enroll', array( $sub->get_id(), $course ), 'ctc-auto-renewal' );
				$n++;
			}
			$msg = '<div class="notice notice-success"><p>' . $n . ' students queued for Moodle course ' . $course . '. They are enrolled one by one in the background; refresh this page to follow along.</p></div>';
		}
		$rows    = ctc_ar_paid_subs( $since );
		$mapped  = $wpdb->get_col( $wpdb->prepare( "SELECT courseid FROM {$wpdb->prefix}wootomoodle WHERE productid = %d", CTC_AR_SOURCE_PRODUCT ) );
		$sinceIn = gmdate( 'Y-m-d', $since );
		$base    = admin_url( 'admin.php?page=ctc-ar-students' );
		echo '<div class="wrap"><h1>Auto-Renewal Students</h1>' . $msg;
		echo '<p>Students whose Annual Auto-Renewal is paid (active, or cancelled but still inside the year they paid for). Use this list to enroll them in the new CTEC 20 Hour course when it comes out.</p>';
		echo '<form method="get" style="margin:16px 0"><input type="hidden" name="page" value="ctc-ar-students">';
		echo '<label>Last paid on or after <input type="date" name="since" value="' . esc_attr( $sinceIn ) . '"></label> &nbsp; ';
		echo '<label>Moodle course id <input type="number" name="course" min="1" style="width:110px" value="' . ( $course ?: '' ) . '"></label> ';
		echo '<span style="color:#666">(20 Hour course currently mapped: ' . esc_html( $mapped ? implode( ', ', $mapped ) : 'none' ) . ')</span> &nbsp; <button class="button">Show</button></form>';
		echo '<p><strong>' . count( $rows ) . '</strong> paid students. ';
		echo '<a class="button" href="' . esc_url( wp_nonce_url( add_query_arg( array( 'ctc_ar_csv' => 1, 'since' => $sinceIn, 'course' => $course ?: null ), $base ), 'ctc_ar_students' ) ) . '">Download CSV</a>';
		echo ' <span style="color:#666">(Moodle "Upload users" columns: username, email, firstname, lastname' . ( $course ? ', course1' : '' ) . ')</span></p>';
		if ( $course ) {
			echo '<form method="post" onsubmit="return confirm(\'Enroll all ' . count( $rows ) . ' listed students in Moodle course ' . $course . '?\')">';
			wp_nonce_field( 'ctc_ar_students' );
			echo '<input type="hidden" name="since" value="' . esc_attr( $sinceIn ) . '"><input type="hidden" name="course" value="' . $course . '"><input type="hidden" name="ctc_ar_enroll" value="1">';
			echo '<button class="button button-primary">Enroll all listed students in Moodle course ' . $course . '</button> <span style="color:#666">Students already enrolled in this course are skipped.</span></form>';
		}
		echo '<table class="widefat striped" style="margin-top:16px"><thead><tr><th>Student</th><th>Email</th><th>Moodle username</th><th>Last paid</th><th>Renews</th><th>Status</th>' . ( $course ? '<th>Course ' . $course . '</th>' : '' ) . '</tr></thead><tbody>';
		foreach ( $rows as list( $sub, $paid ) ) {
			$s = ctc_ar_student( $sub );
			$n = (int) $sub->get_time( 'next_payment' );
			$e = $course ? (string) $sub->get_meta( '_ctc_ar_course_' . $course ) : '';
			echo '<tr><td><a href="' . esc_url( $sub->get_edit_order_url() ) . '">' . esc_html( $s['displayname'] ) . '</a></td><td>' . esc_html( $s['email'] ) . '</td><td>' . esc_html( $s['user'] ) . '</td><td>' . esc_html( gmdate( 'M j, Y', $paid ) ) . '</td><td>' . esc_html( $n ? gmdate( 'M j, Y', $n ) : '—' ) . '</td><td>' . esc_html( wcs_get_subscription_status_name( $sub->get_status() ) ) . '</td>'
				. ( $course ? '<td>' . ( '' === $e ? '—' : ( 'failed' === $e ? '<span style="color:#b32d2e">failed</span>' : '✓ ' . esc_html( mysql2date( 'M j', $e ) ) ) ) . '</td>' : '' ) . '</tr>';
		}
		if ( ! $rows ) echo '<tr><td colspan="7">No paid auto-renewal students in this period yet.</td></tr>';
		echo '</tbody></table></div>';
	} );
} );
