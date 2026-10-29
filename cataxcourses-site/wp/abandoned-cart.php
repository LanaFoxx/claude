/**
 * CTC abandoned-cart reminders (Code Snippets, scope: global).
 *
 * When a shopper enters their email on the checkout page, their cart is saved. If no paid order follows, three
 * branded reminder emails go out (WooCommerce Action Scheduler):
 *   step 1 – 2 hours later  – "your cart is saved"            (no coupon)
 *   step 2 – 3 days later   – one-time 10% off code (unique per cart, individual use, 1 use)
 *   step 3 – 7 days later   – last reminder                    (no coupon)
 * A paid order (processing/completed) with the same email, or the unsubscribe link, cancels what is left.
 * "Complete my enrollment" links rebuild the cart and go straight to checkout (step 2's link also applies the code).
 * Admin list: WooCommerce > Abandoned Carts. Email preview (admins): /?ctc_ac_preview=1|2|3
 */
if ( ! defined( 'CTC_AC_ADDRESS' ) ) define( 'CTC_AC_ADDRESS', '' ); // business postal address for the email footer (CAN-SPAM)
if ( ! defined( 'CTC_AC_STEPS' ) ) define( 'CTC_AC_STEPS', array( 1 => 2 * HOUR_IN_SECONDS, 2 => 3 * DAY_IN_SECONDS, 3 => 7 * DAY_IN_SECONDS ) );

function ctc_ac_table() {
	global $wpdb;
	return $wpdb->prefix . 'ctc_abandoned_carts';
}

add_action( 'init', function () {
	if ( '1' === get_option( 'ctc_ac_db' ) ) return;
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	dbDelta( 'CREATE TABLE ' . ctc_ac_table() . " (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		token varchar(40) NOT NULL,
		email varchar(190) NOT NULL,
		first_name varchar(100) NOT NULL DEFAULT '',
		cart longtext NOT NULL,
		total varchar(40) NOT NULL DEFAULT '',
		created datetime NOT NULL,
		updated datetime NOT NULL,
		status varchar(20) NOT NULL DEFAULT 'open',
		sent varchar(20) NOT NULL DEFAULT '',
		coupon varchar(40) NOT NULL DEFAULT '',
		PRIMARY KEY  (id),
		KEY email (email),
		KEY token (token)
	) " . $wpdb->get_charset_collate() . ';' );
	update_option( 'ctc_ac_db', '1' );
} );

function ctc_ac_row( $field, $value ) {
	global $wpdb;
	return $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . ctc_ac_table() . " WHERE $field = %s LIMIT 1", $value ) );
}

function ctc_ac_unschedule( $id ) {
	if ( ! function_exists( 'as_unschedule_all_actions' ) ) return;
	foreach ( array_keys( CTC_AC_STEPS ) as $step ) as_unschedule_all_actions( 'ctc_ac_send', array( 'id' => (int) $id, 'step' => $step ), 'ctc-abandoned-cart' );
}

/* ---------------------------------------------------------------- capture (checkout page) */
add_action( 'wp_footer', function () {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() || is_wc_endpoint_url() ) return;
	$ajax  = esc_url( admin_url( 'admin-ajax.php' ) );
	$nonce = wp_create_nonce( 'ctc_ac' );
	echo "<script>(function(){var last='';function send(){var e=document.getElementById('billing_email'),f=document.getElementById('billing_first_name');if(!e)return;var v=(e.value||'').trim();if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(v))return;var key=v+'|'+(f?f.value:'');if(key===last)return;last=key;var d=new FormData();d.append('action','ctc_ac_capture');d.append('nonce','$nonce');d.append('email',v);d.append('first_name',f?f.value:'');fetch('$ajax',{method:'POST',body:d,credentials:'same-origin'}).catch(function(){});}
document.addEventListener('change',function(ev){if(ev.target&&(ev.target.id==='billing_email'||ev.target.id==='billing_first_name'))send();});document.addEventListener('focusout',function(ev){if(ev.target&&ev.target.id==='billing_email')send();});setTimeout(send,1500);})();</script>";
} );

function ctc_ac_capture() {
	check_ajax_referer( 'ctc_ac', 'nonce' );
	$email = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
	if ( ! is_email( $email ) || ! WC()->cart || WC()->cart->is_empty() ) wp_send_json_success();
	if ( in_array( strtolower( $email ), (array) get_option( 'ctc_ac_optout', array() ), true ) ) wp_send_json_success();
	$items = array();
	foreach ( WC()->cart->get_cart() as $item ) {
		$items[] = array(
			'product_id'   => (int) $item['product_id'],
			'variation_id' => (int) $item['variation_id'],
			'variation'    => (array) $item['variation'],
			'quantity'     => (int) $item['quantity'],
			'name'         => wp_strip_all_tags( $item['data']->get_name() ),
			'line_total'   => (float) $item['line_total'] + (float) $item['line_tax'],
		);
	}
	global $wpdb;
	$now   = current_time( 'mysql' );
	$first = sanitize_text_field( wp_unslash( $_POST['first_name'] ?? '' ) );
	$data  = array( 'email' => $email, 'first_name' => $first, 'cart' => wp_json_encode( $items ), 'total' => wp_strip_all_tags( WC()->cart->get_total() ), 'updated' => $now );
	if ( ! WC()->session ) wp_send_json_success();
	$id    = (int) WC()->session->get( 'ctc_ac_id' );
	$row   = $id ? ctc_ac_row( 'id', $id ) : null;
	if ( ! $row || 'open' !== $row->status ) {
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . ctc_ac_table() . " WHERE email = %s AND status = 'open' ORDER BY id DESC LIMIT 1", $email ) );
	}
	if ( $row ) {
		$wpdb->update( ctc_ac_table(), $data, array( 'id' => $row->id ) );
		$id = (int) $row->id;
	} else {
		$wpdb->insert( ctc_ac_table(), $data + array( 'token' => wp_generate_password( 32, false ), 'created' => $now, 'status' => 'open' ) );
		$id = (int) $wpdb->insert_id;
	}
	WC()->session->set( 'ctc_ac_id', $id );
	// (re)start the reminder clock from the latest checkout activity; steps already sent are not repeated
	ctc_ac_unschedule( $id );
	$sent = $row ? $row->sent : '';
	if ( function_exists( 'as_schedule_single_action' ) ) {
		foreach ( CTC_AC_STEPS as $step => $delay ) {
			if ( false === strpos( $sent, (string) $step ) ) as_schedule_single_action( time() + $delay, 'ctc_ac_send', array( 'id' => $id, 'step' => $step ), 'ctc-abandoned-cart' );
		}
	}
	wp_send_json_success();
}
add_action( 'wp_ajax_ctc_ac_capture', 'ctc_ac_capture' );
add_action( 'wp_ajax_nopriv_ctc_ac_capture', 'ctc_ac_capture' );

/* ---------------------------------------------------------------- recovered: a paid order stops the reminders */
function ctc_ac_recovered( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order ) return;
	global $wpdb;
	$rows = $wpdb->get_results( $wpdb->prepare( 'SELECT id FROM ' . ctc_ac_table() . " WHERE email = %s AND status = 'open'", $order->get_billing_email() ) );
	foreach ( $rows as $r ) {
		$wpdb->update( ctc_ac_table(), array( 'status' => 'recovered', 'updated' => current_time( 'mysql' ) ), array( 'id' => $r->id ) );
		ctc_ac_unschedule( $r->id );
	}
}
add_action( 'woocommerce_order_status_processing', 'ctc_ac_recovered' );
add_action( 'woocommerce_order_status_completed', 'ctc_ac_recovered' );

/* ---------------------------------------------------------------- send */
add_action( 'ctc_ac_send', function ( $id, $step ) {
	global $wpdb;
	$row = ctc_ac_row( 'id', (int) $id );
	if ( ! $row || 'open' !== $row->status || false !== strpos( $row->sent, (string) $step ) ) return;
	// paid in the meantime (e.g. with a different session)? then this cart is done
	$paid = wc_get_orders( array( 'billing_email' => $row->email, 'status' => array( 'processing', 'completed' ), 'date_created' => '>' . strtotime( get_gmt_from_date( $row->created ) ), 'limit' => 1, 'return' => 'ids' ) );
	if ( $paid ) {
		$wpdb->update( ctc_ac_table(), array( 'status' => 'recovered' ), array( 'id' => $row->id ) );
		ctc_ac_unschedule( $row->id );
		return;
	}
	$coupon = $row->coupon;
	if ( 2 === (int) $step && ! $coupon ) {
		$coupon = 'CTC10-' . strtoupper( wp_generate_password( 6, false ) );
		$c      = new WC_Coupon();
		$c->set_code( $coupon );
		$c->set_discount_type( 'percent' );
		$c->set_amount( 10 );
		$c->set_individual_use( true );     // cannot be combined with other coupons
		$c->set_usage_limit( 1 );           // one use in total
		$c->set_usage_limit_per_user( 1 );
		$c->set_description( 'Abandoned-cart reminder (email 2) for cart #' . $row->id );
		$c->save();
		$wpdb->update( ctc_ac_table(), array( 'coupon' => $coupon ), array( 'id' => $row->id ) );
	}
	$mail = ctc_ac_email( $row, (int) $step, 2 === (int) $step ? $coupon : '' );
	$ok   = wp_mail( $row->email, $mail['subject'], $mail['html'], array( 'Content-Type: text/html; charset=UTF-8', 'From: California Tax Courses <help@cataxcourses.com>', 'Reply-To: help@cataxcourses.com' ) );
	if ( $ok ) $wpdb->update( ctc_ac_table(), array( 'sent' => trim( $row->sent . ',' . $step, ',' ) ), array( 'id' => $row->id ) );
}, 10, 2 );

/* ---------------------------------------------------------------- recover link + unsubscribe */
add_action( 'wp_loaded', function () {
	if ( ! empty( $_GET['ctc_recover'] ) && function_exists( 'WC' ) && WC()->cart ) {
		$row = ctc_ac_row( 'token', sanitize_text_field( wp_unslash( $_GET['ctc_recover'] ) ) );
		if ( ! $row ) { wp_safe_redirect( home_url( '/' ) ); exit; }
		if ( WC()->session && ! WC()->session->has_session() ) WC()->session->set_customer_session_cookie( true );
		WC()->cart->empty_cart();
		foreach ( (array) json_decode( $row->cart, true ) as $it ) {
			WC()->cart->add_to_cart( (int) $it['product_id'], max( 1, (int) $it['quantity'] ), (int) $it['variation_id'], (array) $it['variation'] );
		}
		if ( ! empty( $_GET['c'] ) && $row->coupon ) WC()->cart->apply_coupon( $row->coupon );
		if ( WC()->customer ) {
			WC()->customer->set_billing_email( $row->email );
			if ( $row->first_name ) WC()->customer->set_billing_first_name( $row->first_name );
		}
		WC()->session->set( 'ctc_ac_id', (int) $row->id );
		wp_safe_redirect( wc_get_checkout_url() );
		exit;
	}
	if ( ! empty( $_GET['ctc_ac_unsub'] ) ) {
		$row = ctc_ac_row( 'token', sanitize_text_field( wp_unslash( $_GET['ctc_ac_unsub'] ) ) );
		if ( $row ) {
			global $wpdb;
			$wpdb->update( ctc_ac_table(), array( 'status' => 'unsubscribed' ), array( 'id' => $row->id ) );
			ctc_ac_unschedule( $row->id );
			$out = (array) get_option( 'ctc_ac_optout', array() );
			$out[] = strtolower( $row->email );
			update_option( 'ctc_ac_optout', array_values( array_unique( $out ) ), false );
		}
		wp_die( '<h1 style="font-family:Arial,sans-serif;color:#1C2333">You\'re unsubscribed.</h1><p style="font-family:Arial,sans-serif;color:#4B5058">You won\'t receive any more cart reminders from California Tax Courses. <a href="' . esc_url( home_url( '/' ) ) . '" style="color:#B8901F">Back to cataxcourses.com</a></p>', 'Unsubscribed', array( 'response' => 200 ) );
	}
	// admin preview of the three emails with sample data
	if ( ! empty( $_GET['ctc_ac_preview'] ) && current_user_can( 'manage_woocommerce' ) ) {
		$row = (object) array( 'token' => 'preview', 'email' => 'student@example.com', 'first_name' => 'Jordan', 'total' => '$69.95',
			'cart' => wp_json_encode( array( array( 'name' => 'CTEC 20 Hour Continuing Education Course - Online Video Course', 'quantity' => 1, 'line_total' => 69.95 ) ) ) );
		$step = max( 1, min( 3, (int) $_GET['ctc_ac_preview'] ) );
		$mail = ctc_ac_email( $row, $step, 2 === $step ? 'CTC10-SAMPLE' : '' );
		header( 'Content-Type: text/html; charset=UTF-8' );
		echo '<!-- subject: ' . esc_html( $mail['subject'] ) . ' -->' . $mail['html'];
		exit;
	}
}, 30 );

/* ---------------------------------------------------------------- branded email */
function ctc_ac_email( $row, $step, $coupon ) {
	$navy = '#1C2333'; $gold = '#D4A93A'; $goldText = '#B8901F'; $gray = '#4B5058'; $sand = '#F3F1EC'; $line = '#E6E3DA';
	$font = "'Outfit','Manrope',Arial,Helvetica,sans-serif";
	$name = $row->first_name ? esc_html( $row->first_name ) : 'there';
	$recover = add_query_arg( array_filter( array( 'ctc_recover' => $row->token, 'c' => $coupon ? 1 : null ) ), home_url( '/' ) );
	$unsub   = add_query_arg( 'ctc_ac_unsub', $row->token, home_url( '/' ) );
	$copy = array(
		1 => array( 'subject' => 'You left something in your cart', 'pre' => 'Your CTEC course is saved. Pick up right where you left off.',
			'eyebrow' => 'Your cart is saved', 'title' => 'Finish your enrollment.',
			'body' => "Hi $name, you were just a few steps away from enrolling. We saved your cart so you can pick up right where you left off.", 'cta' => 'Complete My Enrollment →' ),
		2 => array( 'subject' => "Here's 10% off to finish your enrollment", 'pre' => 'Your one-time 10% off code is inside.',
			'eyebrow' => 'A little something for you', 'title' => 'Take 10% off your course.',
			'body' => "Hi $name, still thinking it over? Here's a one-time code for 10% off when you complete your enrollment. Click the button and we'll apply it for you.", 'cta' => 'Use My 10% Off →' ),
		3 => array( 'subject' => 'Your cart is still waiting', 'pre' => 'Last reminder: your CTEC course is still in your cart.',
			'eyebrow' => 'Last reminder', 'title' => 'Your cart is still waiting.',
			'body' => "Hi $name, this is our last reminder: your course is still saved in your cart. Enroll today and start right away, 24/7, from any device. Questions? Just call or reply to this email.", 'cta' => 'Complete My Enrollment →' ),
	);
	$c = $copy[ $step ];
	$items = '';
	foreach ( (array) json_decode( $row->cart, true ) as $it ) {
		$items .= '<tr><td style="padding:14px 0;border-bottom:1px solid ' . $line . ';font-family:' . $font . ';font-size:16px;line-height:1.4;color:' . $navy . ';font-weight:600">' . esc_html( $it['name'] ) . ( (int) $it['quantity'] > 1 ? ' × ' . (int) $it['quantity'] : '' ) . '</td>'
			. '<td align="right" style="padding:14px 0 14px 12px;border-bottom:1px solid ' . $line . ';font-family:' . $font . ';font-size:16px;color:' . $navy . ';font-weight:700;white-space:nowrap">$' . number_format( (float) $it['line_total'], 2 ) . '</td></tr>';
	}
	$couponBox = $coupon ? '<tr><td style="padding:8px 40px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' . $sand . ';border:2px dashed ' . $gold . ';border-radius:12px"><tr><td align="center" style="padding:22px 16px">'
		. '<div style="font-family:' . $font . ';font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' . $goldText . '">Your one-time code · 10% off</div>'
		. '<div style="font-family:\'Courier New\',monospace;font-size:28px;font-weight:700;letter-spacing:3px;color:' . $navy . ';padding:10px 0 6px">' . esc_html( $coupon ) . '</div>'
		. '<div style="font-family:' . $font . ';font-size:13px;color:' . $gray . '">One-time use. Cannot be combined with other coupons.</div></td></tr></table></td></tr>' : '';
	$perk = function ( $t ) use ( $font, $navy, $gold ) { return '<tr><td style="padding:5px 0;font-family:' . $font . ';font-size:15px;color:' . $navy . '"><span style="color:' . $gold . ';font-weight:700">✓</span>&nbsp;&nbsp;' . $t . '</td></tr>'; };
	$addr = CTC_AC_ADDRESS ? ' · ' . esc_html( CTC_AC_ADDRESS ) : '';
	$html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' . esc_html( $c['subject'] ) . '</title>'
		. '<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;700;800&display=swap" rel="stylesheet"></head>'
		. '<body style="margin:0;padding:0;background:' . $sand . '"><div style="display:none;max-height:0;overflow:hidden;opacity:0">' . esc_html( $c['pre'] ) . '</div>'
		. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' . $sand . '"><tr><td align="center" style="padding:28px 12px">'
		. '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border-top:6px solid ' . $gold . '">'
		. '<tr><td align="center" style="padding:26px 24px 22px"><a href="' . esc_url( home_url( '/' ) ) . '"><img src="https://cataxcourses.com/wp-content/uploads/2020/09/California-Tax-Courses-Logo-Gold-500px.png" width="190" alt="California Tax Courses" style="display:block;width:190px;height:auto;border:0"></a></td></tr>'
		. '<tr><td style="background:' . $navy . ';padding:34px 40px 36px">'
		. '<div style="font-family:' . $font . ';font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:' . $gold . '">' . esc_html( $c['eyebrow'] ) . '</div>'
		. '<div style="font-family:' . $font . ';font-size:34px;line-height:1.1;font-weight:800;color:#ffffff;padding-top:10px">' . esc_html( $c['title'] ) . '</div></td></tr>'
		. '<tr><td style="padding:30px 40px 10px;font-family:' . $font . ';font-size:17px;line-height:1.65;color:' . $gray . '">' . $c['body'] . '</td></tr>'
		. $couponBox
		. '<tr><td style="padding:14px 40px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $items . '</table></td></tr>'
		. '<tr><td align="center" style="padding:28px 40px 10px"><a href="' . esc_url( $recover ) . '" style="display:inline-block;background:' . $gold . ';color:#ffffff;text-decoration:none;font-family:' . $font . ';font-size:19px;font-weight:700;padding:16px 34px;border-radius:12px">' . esc_html( $c['cta'] ) . '</a></td></tr>'
		. '<tr><td style="padding:22px 40px 30px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' . $perk( 'Instant enrollment, start right away 24/7' ) . $perk( 'Instant reporting to CTEC' ) . $perk( 'CTEC &amp; IRS approved education provider' ) . '</table></td></tr>'
		. '<tr><td style="background:' . $sand . ';padding:22px 40px;font-family:' . $font . ';font-size:14px;line-height:1.6;color:' . $gray . '" align="center">Questions? Call <a href="tel:8882291994" style="color:' . $goldText . ';font-weight:700;text-decoration:none">(888) 229-1994</a> · Mon–Fri 9am–4pm PST<br><a href="mailto:help@cataxcourses.com" style="color:' . $goldText . ';text-decoration:none">help@cataxcourses.com</a></td></tr>'
		. '</table>'
		. '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px"><tr><td align="center" style="padding:18px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8A8F99">'
		. 'You are receiving this because you started checkout at cataxcourses.com.<br>California Tax Courses' . $addr . '<br><a href="' . esc_url( $unsub ) . '" style="color:#8A8F99">Unsubscribe from cart reminders</a></td></tr></table>'
		. '</td></tr></table></body></html>';
	return array( 'subject' => $c['subject'], 'html' => $html );
}

/* ---------------------------------------------------------------- admin list */
add_action( 'admin_menu', function () {
	add_submenu_page( 'woocommerce', 'Abandoned Carts', 'Abandoned Carts', 'manage_woocommerce', 'ctc-abandoned-carts', function () {
		global $wpdb;
		$rows = $wpdb->get_results( 'SELECT * FROM ' . ctc_ac_table() . ' ORDER BY id DESC LIMIT 200' );
		echo '<div class="wrap"><h1>Abandoned Carts</h1><p>Reminders go out 2 hours (no coupon), 3 days (one-time 10% code) and 7 days (no coupon) after the last checkout activity. A paid order with the same email stops them. Previews: <a href="' . esc_url( home_url( '/?ctc_ac_preview=1' ) ) . '" target="_blank">email 1</a> · <a href="' . esc_url( home_url( '/?ctc_ac_preview=2' ) ) . '" target="_blank">email 2</a> · <a href="' . esc_url( home_url( '/?ctc_ac_preview=3' ) ) . '" target="_blank">email 3</a></p>';
		echo '<table class="widefat striped"><thead><tr><th>Captured</th><th>Email</th><th>Name</th><th>Cart</th><th>Total</th><th>Status</th><th>Emails sent</th><th>Coupon</th><th>Cart link</th></tr></thead><tbody>';
		foreach ( $rows as $r ) {
			$names = implode( ', ', array_map( function ( $i ) { return $i['name'] ?? ''; }, (array) json_decode( $r->cart, true ) ) );
			echo '<tr><td>' . esc_html( $r->created ) . '</td><td>' . esc_html( $r->email ) . '</td><td>' . esc_html( $r->first_name ) . '</td><td>' . esc_html( $names ) . '</td><td>' . esc_html( $r->total ) . '</td><td>' . esc_html( $r->status ) . '</td><td>' . esc_html( $r->sent ?: '–' ) . '</td><td>' . esc_html( $r->coupon ?: '–' ) . '</td><td><a href="' . esc_url( add_query_arg( 'ctc_recover', $r->token, home_url( '/' ) ) ) . '" target="_blank">Open cart</a></td></tr>';
		}
		if ( ! $rows ) echo '<tr><td colspan="9">No abandoned carts captured yet.</td></tr>';
		echo '</tbody></table></div>';
	} );
} );
