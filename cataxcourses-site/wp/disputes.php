/**
 * CTC Stripe disputes (Code Snippets, scope: global).
 *
 * Every hour, new and updated Stripe disputes are read with the WooCommerce Stripe keys, matched to their order and
 * customer, and saved in wp_ctc_disputes. For each dispute this builds an evidence packet for the agent to review and
 * submit in Stripe (nothing is sent to Stripe from here):
 *   - Evidence packet: printable page (save as PDF and upload to Stripe) with the order, receipt, customer and payment
 *     checks, checkout IP/device, terms + refund policy, delivery (Moodle enrollment notes) and the student's Moodle
 *     activity when the Moodle "CTC Disputes" block is installed.
 *   - Stripe form fields: the values to paste into Stripe's evidence form, plus a rebuttal written for the dispute reason.
 * The dispute agent (role "Dispute Agent", or any admin) sees Disputes in the WordPress menu and gets an email for each
 * new dispute with links straight to its packet. The Moodle block lists the same disputes on the Moodle dashboard.
 */
if ( ! defined( 'CTC_DISPUTE_CAP' ) ) define( 'CTC_DISPUTE_CAP', 'ctc_view_disputes' );

function ctc_dp_table() { global $wpdb; return $wpdb->prefix . 'ctc_disputes'; }
function ctc_dp_install() {
	global $wpdb;
	if ( get_option( 'ctc_dp_db' ) === '2' ) return;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	dbDelta( 'CREATE TABLE ' . ctc_dp_table() . " (
		id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
		dispute_id varchar(64) NOT NULL,
		account varchar(20) NOT NULL DEFAULT '',
		charge_id varchar(64) NOT NULL DEFAULT '',
		order_id bigint(20) unsigned NOT NULL DEFAULT 0,
		customer varchar(190) NOT NULL DEFAULT '',
		email varchar(190) NOT NULL DEFAULT '',
		amount int(11) NOT NULL DEFAULT 0,
		currency varchar(8) NOT NULL DEFAULT 'usd',
		reason varchar(64) NOT NULL DEFAULT '',
		status varchar(40) NOT NULL DEFAULT '',
		due_by datetime NULL,
		created datetime NULL,
		notified datetime NULL,
		auto_state varchar(20) NOT NULL DEFAULT '',
		submit_at datetime NULL,
		auto_log longtext NULL,
		data longtext NULL,
		PRIMARY KEY  (id),
		UNIQUE KEY dispute_id (dispute_id)
	) " . $wpdb->get_charset_collate() . ';' );
	update_option( 'ctc_dp_db', '2', false );
	if ( ! get_option( 'ctc_dp_token' ) ) update_option( 'ctc_dp_token', wp_generate_password( 40, false ), false );
	if ( ! get_role( 'ctc_dispute_agent' ) ) add_role( 'ctc_dispute_agent', 'Dispute Agent', array( 'read' => true, CTC_DISPUTE_CAP => true ) );
	if ( $admin = get_role( 'administrator' ) ) $admin->add_cap( CTC_DISPUTE_CAP );
}
add_action( 'init', 'ctc_dp_install' );

/* ---------------------------------------------------------------- Stripe */
// Secret keys to read disputes with: the WooCommerce Stripe plugin, and the old WebToffee plugin if it used another account.
function ctc_dp_keys() {
	$keys = array();
	$s    = get_option( 'woocommerce_stripe_settings', array() );
	if ( is_array( $s ) ) {
		$k = ( isset( $s['testmode'] ) && 'yes' === $s['testmode'] ) ? ( $s['test_secret_key'] ?? '' ) : ( $s['secret_key'] ?? '' );
		if ( $k ) $keys['stripe'] = $k;
	}
	if ( empty( $keys['stripe'] ) && class_exists( 'WC_Stripe_API' ) && method_exists( 'WC_Stripe_API', 'get_secret_key' ) && ( $k = WC_Stripe_API::get_secret_key() ) ) $keys['stripe'] = $k;
	$e = get_option( 'woocommerce_eh_stripe_pay_settings', array() );
	if ( is_array( $e ) ) {
		$k = $e['eh_stripe_secret_key'] ?? ( $e['secret_key'] ?? '' );
		if ( $k && ! in_array( $k, $keys, true ) && 0 === strpos( $k, 'sk_live' ) ) $keys['eh'] = $k;
	}
	return $keys;
}
function ctc_dp_stripe( $key, $path, $args = array() ) {
	$r = wp_remote_get( 'https://api.stripe.com/v1/' . $path . ( $args ? '?' . http_build_query( $args ) : '' ), array( 'timeout' => 40, 'headers' => array( 'Authorization' => 'Bearer ' . $key ) ) );
	if ( is_wp_error( $r ) ) return null;
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	return is_array( $j ) && empty( $j['error'] ) ? $j : null;
}

// Find the WooCommerce order for a charge: Stripe metadata first, then the transaction / intent ids the plugins store.
function ctc_dp_find_order( $charge ) {
	$oid = absint( $charge['metadata']['order_id'] ?? 0 );
	if ( $oid && wc_get_order( $oid ) ) return $oid;
	foreach ( array_filter( array( $charge['id'] ?? '', $charge['payment_intent'] ?? '' ) ) as $ref ) {
		$found = wc_get_orders( array( 'limit' => 1, 'return' => 'ids', 'transaction_id' => $ref ) );
		if ( $found ) return (int) $found[0];
		foreach ( array( '_stripe_intent_id', '_stripe_charge_id', '_eh_stripe_payment_charge' ) as $mk ) {
			$found = wc_get_orders( array( 'limit' => 1, 'return' => 'ids', 'meta_key' => $mk, 'meta_value' => $ref ) );
			if ( $found ) return (int) $found[0];
		}
	}
	return 0;
}

function ctc_dp_sync() {
	global $wpdb;
	ctc_dp_install();
	$new = array();
	foreach ( ctc_dp_keys() as $acct => $key ) {
		$since = (int) get_option( 'ctc_dp_since_' . $acct, strtotime( '-120 days' ) );
		$list  = ctc_dp_stripe( $key, 'disputes', array( 'limit' => 100, 'created' => array( 'gte' => $since ), 'expand' => array( 'data.charge' ) ) );
		if ( ! $list ) continue;
		foreach ( $list['data'] as $d ) {
			$charge = is_array( $d['charge'] ) ? $d['charge'] : ( ctc_dp_stripe( $key, 'charges/' . $d['charge'] ) ?: array( 'id' => $d['charge'] ) );
			$oid    = ctc_dp_find_order( $charge );
			$order  = $oid ? wc_get_order( $oid ) : null;
			$row    = array(
				'dispute_id' => $d['id'], 'account' => $acct, 'charge_id' => $charge['id'] ?? '', 'order_id' => $oid,
				'customer' => $order ? trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ) : (string) ( $charge['billing_details']['name'] ?? '' ),
				'email' => $order ? $order->get_billing_email() : (string) ( $charge['billing_details']['email'] ?? '' ),
				'amount' => (int) $d['amount'], 'currency' => $d['currency'], 'reason' => $d['reason'], 'status' => $d['status'],
				'due_by' => ! empty( $d['evidence_details']['due_by'] ) ? gmdate( 'Y-m-d H:i:s', $d['evidence_details']['due_by'] ) : null,
				'created' => gmdate( 'Y-m-d H:i:s', $d['created'] ),
				'data' => wp_json_encode( array( 'dispute' => $d, 'charge' => $charge ) ),
			);
			$exists = $wpdb->get_var( $wpdb->prepare( 'SELECT id FROM ' . ctc_dp_table() . ' WHERE dispute_id = %s', $d['id'] ) );
			if ( $exists ) { $wpdb->update( ctc_dp_table(), $row, array( 'id' => $exists ) ); continue; }
			// Disputes older than 3 days (the first check reads 120 days back) are listed without an email.
			if ( $d['created'] < time() - 3 * DAY_IN_SECONDS ) $row['notified'] = current_time( 'mysql', true );
			$wpdb->insert( ctc_dp_table(), $row );
			$new[] = $d['id'];
			if ( $order ) $order->add_order_note( sprintf( 'Stripe dispute %s opened (%s, %s). Evidence packet: Disputes menu in WordPress.', $d['id'], $d['reason'], wc_price( $d['amount'] / 100 ) ) );
		}
		update_option( 'ctc_dp_since_' . $acct, time() - 30 * DAY_IN_SECONDS, false ); // re-read the last 30 days for status changes
	}
	foreach ( $new as $id ) { ctc_dp_auto_draft( $id ); ctc_dp_notify( $id ); }
	ctc_dp_auto_due();
	update_option( 'ctc_dp_last_sync', current_time( 'mysql' ), false );
	return count( $new );
}
add_action( 'ctc_dp_sync', 'ctc_dp_sync' );
add_action( 'init', function () {
	if ( function_exists( 'as_has_scheduled_action' ) && ! as_has_scheduled_action( 'ctc_dp_sync', array(), 'ctc-disputes' ) ) {
		as_schedule_recurring_action( time() + 60, HOUR_IN_SECONDS, 'ctc_dp_sync', array(), 'ctc-disputes' );
	}
} );

/* ---------------------------------------------------------------- data for a packet */
function ctc_dp_row( $dispute_id ) {
	global $wpdb;
	$r = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . ctc_dp_table() . ' WHERE dispute_id = %s', $dispute_id ), ARRAY_A );
	if ( $r ) $r['data'] = json_decode( (string) $r['data'], true );
	return $r;
}
// The student's Moodle activity, from the Moodle "CTC Disputes" block (blocks/ctc_disputes/activity.php).
function ctc_dp_moodle_activity( $email ) {
	global $wpdb;
	$mdl = $wpdb->get_row( "SELECT moodleurl FROM {$wpdb->prefix}moodledetail WHERE id = 1" );
	if ( ! $email || ! $mdl || ! $mdl->moodleurl ) return null;
	$url = add_query_arg( array( 'email' => rawurlencode( $email ), 'token' => rawurlencode( get_option( 'ctc_dp_token' ) ) ), rtrim( $mdl->moodleurl, '/' ) . '/blocks/ctc_disputes/activity.php' );
	$r   = wp_remote_get( $url, array( 'timeout' => 30 ) );
	if ( is_wp_error( $r ) || 200 !== (int) wp_remote_retrieve_response_code( $r ) ) return null;
	$j = json_decode( wp_remote_retrieve_body( $r ), true );
	return is_array( $j ) && ! empty( $j['found'] ) ? $j : null;
}
function ctc_dp_reason_label( $r ) {
	$map = array( 'fraudulent' => 'Fraudulent (customer says they did not authorize it)', 'product_not_received' => 'Product not received', 'product_unacceptable' => 'Product unacceptable',
		'subscription_canceled' => 'Subscription canceled', 'duplicate' => 'Duplicate charge', 'credit_not_processed' => 'Credit / refund not processed', 'unrecognized' => 'Unrecognized charge', 'general' => 'General' );
	return $map[ $r ] ?? ucwords( str_replace( '_', ' ', $r ) );
}
function ctc_dp_money( $n, $cur = '' ) { return html_entity_decode( wp_strip_all_tags( wc_price( $n, $cur ? array( 'currency' => $cur ) : array() ) ), ENT_QUOTES, 'UTF-8' ); }
function ctc_dp_fmt( $ts ) { return $ts ? wp_date( 'M j, Y g:i a T', is_numeric( $ts ) ? (int) $ts : strtotime( $ts . ' UTC' ) ) : '—'; }

// Everything the packet and the Stripe form need, in one array.
function ctc_dp_facts( $row ) {
	$order  = $row['order_id'] ? wc_get_order( $row['order_id'] ) : null;
	$charge = $row['data']['charge'] ?? array();
	$card   = $charge['payment_method_details']['card'] ?? array();
	$f      = array(
		'order' => $order, 'charge' => $charge, 'card' => $card,
		'name' => $row['customer'], 'email' => $row['email'],
		'amount' => ctc_dp_money( $row['amount'] / 100, strtoupper( $row['currency'] ) ),
		'reason' => ctc_dp_reason_label( $row['reason'] ),
		'terms_url' => function_exists( 'wc_terms_and_conditions_page_id' ) && wc_terms_and_conditions_page_id() ? get_permalink( wc_terms_and_conditions_page_id() ) : home_url( '/terms-and-conditions/' ),
		'refund_url' => home_url( '/refund-policy/' ),
		'privacy_url' => get_privacy_policy_url() ?: home_url( '/privacy-policy/' ),
	);
	if ( $order ) {
		$f['items']    = array();
		foreach ( $order->get_items() as $it ) $f['items'][] = $it->get_name() . ' × ' . $it->get_quantity() . ' — ' . ctc_dp_money( $it->get_total(), $order->get_currency() );
		$f['paid']     = $order->get_date_paid() ? $order->get_date_paid()->getTimestamp() : ( $order->get_date_created() ? $order->get_date_created()->getTimestamp() : 0 );
		$f['ip']       = $order->get_customer_ip_address();
		$f['ua']       = $order->get_customer_user_agent();
		$f['address']  = wp_strip_all_tags( str_replace( '<br/>', ', ', $order->get_formatted_billing_address() ) );
		$f['phone']    = $order->get_billing_phone();
		$f['shipping'] = $order->has_shipping_address() ? wp_strip_all_tags( str_replace( '<br/>', ', ', $order->get_formatted_shipping_address() ) ) : '';
		$f['notes']    = array();
		foreach ( wc_get_order_notes( array( 'order_id' => $order->get_id(), 'order' => 'ASC' ) ) as $n ) {
			if ( preg_match( '/moodle|enrol|vervante|shipped|refund/i', $n->content ) ) $f['notes'][] = ctc_dp_fmt( $n->date_created->getTimestamp() ) . ' — ' . wp_strip_all_tags( $n->content );
		}
		$prev = wc_get_orders( array( 'billing_email' => $order->get_billing_email(), 'limit' => 20, 'exclude' => array( $order->get_id() ), 'status' => array( 'completed', 'processing' ) ) );
		$f['history'] = array_map( function ( $o ) { return '#' . $o->get_order_number() . ' — ' . ( $o->get_date_created() ? $o->get_date_created()->date_i18n( 'M j, Y' ) : '' ) . ' — ' . ctc_dp_money( $o->get_total() ); }, $prev );
		$f['refunds'] = $order->get_total_refunded();
	}
	$f['checks'] = array_filter( array(
		'Card' => trim( ucfirst( $card['brand'] ?? '' ) . ' ending in ' . ( $card['last4'] ?? '' ), ' ending in' ),
		'CVC check' => $card['checks']['cvc_check'] ?? '',
		'Address (street) check' => $card['checks']['address_line1_check'] ?? '',
		'ZIP check' => $card['checks']['address_postal_code_check'] ?? '',
		'3-D Secure' => ! empty( $card['three_d_secure'] ) ? ( $card['three_d_secure']['result'] ?? 'used' ) : '',
		'Stripe risk level' => $charge['outcome']['risk_level'] ?? '',
		'Card country' => $card['country'] ?? '',
	) );
	$f['moodle'] = ctc_dp_moodle_activity( $row['email'] );
	return $f;
}

// Rebuttal for Stripe's "additional information" box, written for the dispute reason.
function ctc_dp_rebuttal( $row, $f ) {
	$o      = $f['order'];
	$num    = $o ? '#' . $o->get_order_number() : '';
	$when   = ! empty( $f['paid'] ) ? wp_date( 'F j, Y', $f['paid'] ) : '';
	$m      = $f['moodle'];
	$used   = $m && ! empty( $m['user']['lastaccess'] ) ? sprintf( ' The student account (%s) was used to sign in to the course site, most recently on %s%s.', $m['user']['username'] ?? $f['email'], wp_date( 'F j, Y', (int) $m['user']['lastaccess'] ), ! empty( $m['logcount'] ) ? sprintf( ', with %d recorded course actions', (int) $m['logcount'] ) : '' ) : '';
	$intro  = sprintf( '%s purchased %s from California Tax Courses (cataxcourses.com) on %s, order %s, paying %s.', $f['name'] ?: 'The cardholder', $o ? implode( '; ', array_map( 'wp_strip_all_tags', $f['items'] ) ) : 'an online CTEC course', $when, $num, $f['amount'] );
	$access = ' The course is delivered online: immediately after payment the student is enrolled automatically on our course site (learn.cataxcourses.com) and receives login details by email.' . $used;
	$terms  = sprintf( ' At checkout the customer had to accept our Terms & Conditions (%s) and Refund Policy (%s) before paying.', $f['terms_url'], $f['refund_url'] );
	$match  = ! empty( $f['ip'] ) ? sprintf( ' The order was placed from IP address %s%s.', $f['ip'], ! empty( $f['checks']['ZIP check'] ) ? ', and the card issuer reported the ZIP check as "' . $f['checks']['ZIP check'] . '"' : '' ) : '';
	$hist   = ! empty( $f['history'] ) ? sprintf( ' The same customer has %d other paid order(s) with us that were not disputed.', count( $f['history'] ) ) : '';
	$refund = ! empty( $f['refunds'] ) ? sprintf( ' A refund of %s was already issued for this order.', ctc_dp_money( $f['refunds'] ) ) : ' No refund has been issued for this order.';
	switch ( $row['reason'] ) {
		case 'fraudulent':
		case 'unrecognized':
			$body = $intro . $match . $access . $hist . ' The student account was created in the cardholder\'s own name and email address' . ( $used ? ' and was used to take the course, which shows the purchase was made and used by the cardholder.' : '.' ) . $terms;
			break;
		case 'product_not_received':
			$body = $intro . $access . ' The product is a digital course, so there is nothing to ship; access was provided at the time of purchase and remains available.' . $terms . $refund;
			break;
		case 'product_unacceptable':
			$body = $intro . $access . ' The course is CTEC-approved and was delivered as described on the product page.' . $terms . $refund;
			break;
		case 'subscription_canceled':
			$body = $intro . ' This charge is for the Annual Auto-Renewal plan the customer chose at checkout, with clear consent to a yearly charge, reminder emails 30 and 7 days before renewal, and a one-click cancel link in every email. The plan was not canceled before this renewal.' . $access . $terms;
			break;
		case 'duplicate':
			$body = $intro . ' This is a single charge for a single order; any other charges are separate orders for separate products (listed in the evidence).' . $access;
			break;
		case 'credit_not_processed':
			$body = $intro . $access . $refund . $terms;
			break;
		default:
			$body = $intro . $access . $terms . $refund;
	}
	return $body . ' Supporting evidence is attached.';
}

/* ---------------------------------------------------------------- notification */
function ctc_dp_agent_emails() {
	$to = array_filter( array_map( 'trim', explode( ',', (string) get_option( 'ctc_dp_notify', '' ) ) ), 'is_email' );
	foreach ( get_users( array( 'role' => 'ctc_dispute_agent', 'fields' => array( 'user_email' ) ) ) as $u ) $to[] = $u->user_email;
	return array_unique( $to ?: array( get_option( 'admin_email' ) ) );
}
function ctc_dp_link( $dispute_id, $view = 'packet' ) {
	return admin_url( 'admin.php?page=ctc-disputes&dispute=' . rawurlencode( $dispute_id ) . '&view=' . $view );
}
function ctc_dp_notify( $dispute_id ) {
	global $wpdb;
	$row = ctc_dp_row( $dispute_id );
	if ( ! $row || $row['notified'] ) return;
	$amount = ctc_dp_money( $row['amount'] / 100 );
	$due    = $row['due_by'] ? ctc_dp_fmt( $row['due_by'] ) : 'see Stripe';
	$btn    = function ( $url, $label, $gold = true ) { return '<a href="' . esc_url( $url ) . '" style="display:inline-block;margin:0 8px 10px 0;padding:12px 20px;border-radius:10px;background:' . ( $gold ? '#D4A93A' : '#1C2333' ) . ';color:#fff;font-weight:700;text-decoration:none">' . esc_html( $label ) . '</a>'; };
	$html   = '<div style="font-family:Arial,sans-serif;font-size:16px;color:#1C2333;max-width:600px">'
		. '<h2 style="margin:0 0 12px">New Stripe dispute: ' . esc_html( $row['customer'] ?: 'unknown customer' ) . '</h2>'
		. '<p style="margin:0 0 16px">' . esc_html( ctc_dp_reason_label( $row['reason'] ) ) . ' · ' . esc_html( $amount ) . ( $row['order_id'] ? ' · Order #' . (int) $row['order_id'] : '' ) . '<br><strong>Evidence due: ' . esc_html( $due ) . '</strong></p>'
		. '<p>' . $btn( ctc_dp_link( $dispute_id, 'packet' ), 'Open evidence packet' ) . $btn( ctc_dp_link( $dispute_id, 'form' ), 'Stripe form answers', false ) . '</p>'
		. ( 'drafted' === $row['auto_state']
			? '<p style="background:#FDF6E3;border-left:4px solid #D4A93A;padding:10px 14px">The evidence (answers + PDF documents) is already filled in on Stripe as a draft. <strong>It will be submitted automatically on ' . esc_html( ctc_dp_fmt( $row['submit_at'] ) ) . '.</strong> To stop it, click <strong>Hold</strong> on the <a href="' . esc_url( admin_url( 'admin.php?page=ctc-disputes' ) ) . '">Disputes page</a>.</p>'
			: ( 'failed' === $row['auto_state'] ? '<p style="color:#b32d2e"><strong>Automatic evidence upload failed</strong> (see the Disputes page). Please submit it manually.</p>' : '' ) )
		. '<p style="color:#555;font-size:14px">Review the packet and the answers before they are submitted. Stripe accepts one submission per dispute.<br>'
		. 'Stripe: <a href="https://dashboard.stripe.com/disputes/' . esc_attr( $dispute_id ) . '">dashboard.stripe.com/disputes/' . esc_html( $dispute_id ) . '</a></p></div>';
	wp_mail( ctc_dp_agent_emails(), sprintf( 'New dispute: %s – %s – evidence due %s', $row['customer'] ?: $dispute_id, $amount, $row['due_by'] ? wp_date( 'M j', strtotime( $row['due_by'] . ' UTC' ) ) : '' ), $html, array( 'Content-Type: text/html; charset=UTF-8' ) );
	$wpdb->update( ctc_dp_table(), array( 'notified' => current_time( 'mysql', true ) ), array( 'dispute_id' => $dispute_id ) );
}

/* ---------------------------------------------------------------- admin pages */
add_action( 'admin_menu', function () {
	add_menu_page( 'Disputes', 'Disputes', CTC_DISPUTE_CAP, 'ctc-disputes', 'ctc_dp_page', 'dashicons-shield', 56 );
} );
// Dispute agents only need this page: send them here after login and hide the rest of wp-admin from them.
add_filter( 'login_redirect', function ( $to, $req, $user ) {
	return ( $user instanceof WP_User && in_array( 'ctc_dispute_agent', (array) $user->roles, true ) && false === strpos( (string) $req, 'page=ctc-disputes' ) ) ? admin_url( 'admin.php?page=ctc-disputes' ) : $to;
}, 10, 3 );
add_action( 'admin_init', function () {
	$u = wp_get_current_user();
	if ( ! in_array( 'ctc_dispute_agent', (array) $u->roles, true ) || wp_doing_ajax() ) return;
	global $pagenow;
	if ( in_array( $pagenow, array( 'profile.php' ), true ) || ( 'admin.php' === $pagenow && 'ctc-disputes' === ( $_GET['page'] ?? '' ) ) ) return;
	wp_safe_redirect( admin_url( 'admin.php?page=ctc-disputes' ) );
	exit;
} );

function ctc_dp_page() {
	global $wpdb;
	if ( ! current_user_can( CTC_DISPUTE_CAP ) ) wp_die( 'Not allowed' );
	ctc_dp_install();
	if ( ! empty( $_GET['dispute'] ) ) { ctc_dp_view( sanitize_text_field( wp_unslash( $_GET['dispute'] ) ), sanitize_key( $_GET['view'] ?? 'packet' ) ); return; }
	$msg = '';
	if ( ! empty( $_POST['ctc_dp_sync'] ) && check_admin_referer( 'ctc_dp' ) ) $msg = '<div class="notice notice-success"><p>Checked Stripe: ' . (int) ctc_dp_sync() . ' new dispute(s).</p></div>';
	if ( ! empty( $_POST['ctc_dp_notify'] ) && current_user_can( 'manage_options' ) && check_admin_referer( 'ctc_dp' ) ) {
		update_option( 'ctc_dp_notify', sanitize_text_field( wp_unslash( $_POST['ctc_dp_notify'] ) ), false );
		$msg = '<div class="notice notice-success"><p>Saved.</p></div>';
	}
	$rows = $wpdb->get_results( 'SELECT dispute_id, order_id, customer, email, amount, reason, status, due_by, created, auto_state, submit_at, auto_log FROM ' . ctc_dp_table() . ' ORDER BY created DESC LIMIT 200', ARRAY_A );
	echo '<div class="wrap"><h1>Stripe Disputes</h1>' . $msg;
	echo '<p>New disputes are checked every hour (last check: ' . esc_html( get_option( 'ctc_dp_last_sync', 'not yet' ) ) . '). Open a packet, save it as PDF and upload it to the dispute in Stripe, then paste the form answers.</p>';
	echo '<form method="post" style="margin:12px 0">'; wp_nonce_field( 'ctc_dp' ); echo '<button class="button" name="ctc_dp_sync" value="1">Check Stripe now</button></form>';
	echo '<table class="widefat striped"><thead><tr><th>Opened</th><th>Customer</th><th>Order</th><th>Amount</th><th>Reason</th><th>Status</th><th>Evidence due</th><th>Automatic</th><th></th></tr></thead><tbody>';
	foreach ( $rows as $r ) {
		$open = in_array( $r['status'], array( 'needs_response', 'warning_needs_response' ), true );
		echo '<tr><td>' . esc_html( ctc_dp_fmt( $r['created'] ) ) . '</td><td><strong>' . esc_html( $r['customer'] ?: '—' ) . '</strong><br><span style="color:#666">' . esc_html( $r['email'] ) . '</span></td><td>' . ( $r['order_id'] ? '#' . (int) $r['order_id'] : '<span style="color:#b32d2e">not matched</span>' ) . '</td>'
			. '<td>' . wp_kses_post( wc_price( $r['amount'] / 100 ) ) . '</td><td>' . esc_html( ctc_dp_reason_label( $r['reason'] ) ) . '</td><td>' . ( $open ? '<strong style="color:#b32d2e">' : '<span>' ) . esc_html( str_replace( '_', ' ', $r['status'] ) ) . ( $open ? '</strong>' : '</span>' ) . '</td>'
			. '<td>' . esc_html( $r['due_by'] ? ctc_dp_fmt( $r['due_by'] ) : '—' ) . '</td><td>' . ctc_dp_auto_cell( $r ) . '</td><td><a class="button button-primary" href="' . esc_url( ctc_dp_link( $r['dispute_id'], 'packet' ) ) . '">Evidence packet</a> <a class="button" href="' . esc_url( ctc_dp_link( $r['dispute_id'], 'form' ) ) . '">Stripe form answers</a></td></tr>';
	}
	if ( ! $rows ) echo '<tr><td colspan="9">No disputes found yet.</td></tr>';
	echo '</tbody></table>';
	if ( current_user_can( 'manage_options' ) ) {
		echo '<h2 style="margin-top:32px">Settings</h2><form method="post">'; wp_nonce_field( 'ctc_dp' );
		echo '<p><label>Also email new disputes to (comma separated): <input type="text" name="ctc_dp_notify" style="width:420px" value="' . esc_attr( get_option( 'ctc_dp_notify', '' ) ) . '"></label> <button class="button">Save</button><br><span style="color:#666">Users with the <strong>Dispute Agent</strong> role are emailed automatically (Users → Add New → Role: Dispute Agent). They can only see this page.</span></p></form>';
		$mode = ctc_dp_mode();
		echo '<form method="post" style="margin:16px 0">'; wp_nonce_field( 'ctc_dp' );
		echo '<input type="hidden" name="ctc_dp_act" value="mode"><label><strong>Automatic evidence:</strong> <select name="mode">'
			. '<option value="auto"' . selected( $mode, 'auto', false ) . '>Draft on Stripe right away, submit automatically after ' . (int) ( CTC_DP_SUBMIT_AFTER / HOUR_IN_SECONDS ) . ' hours (unless held)</option>'
			. '<option value="draft"' . selected( $mode, 'draft', false ) . '>Draft on Stripe only (someone submits)</option>'
			. '<option value="off"' . selected( $mode, 'off', false ) . '>Off (packets and answers only)</option></select></label> <button class="button">Save</button></form>';
		echo '<p><strong>Moodle block settings</strong> (Site administration → Plugins → Blocks → CTC Disputes): WordPress URL <code>' . esc_html( home_url( '/' ) ) . '</code> · Shared token <code>' . esc_html( get_option( 'ctc_dp_token' ) ) . '</code></p>';
		echo '<p>Stripe accounts checked: ' . esc_html( implode( ', ', array_keys( ctc_dp_keys() ) ) ?: 'none found' ) . '</p>';
	}
	echo '</div>';
}

function ctc_dp_view( $dispute_id, $view ) {
	$row = ctc_dp_row( $dispute_id );
	if ( ! $row ) { echo '<div class="wrap"><p>Dispute not found.</p></div>'; return; }
	$f    = ctc_dp_facts( $row );
	$o    = $f['order'];
	$back = '<p class="ctc-noprint"><a href="' . esc_url( admin_url( 'admin.php?page=ctc-disputes' ) ) . '">← All disputes</a> · <a href="' . esc_url( ctc_dp_link( $dispute_id, 'packet' ) ) . '">Evidence packet</a> · <a href="' . esc_url( ctc_dp_link( $dispute_id, 'form' ) ) . '">Stripe form answers</a> · <a href="https://dashboard.stripe.com/disputes/' . esc_attr( $dispute_id ) . '" target="_blank">Open in Stripe</a>'
		. ( 'packet' === $view ? ' · <button class="button button-primary" onclick="window.print()">Print / Save as PDF</button>' : '' ) . '</p>';
	echo '<style>@media print{#adminmenumain,#wpadminbar,#wpfooter,.ctc-noprint,.notice{display:none!important}#wpcontent{margin:0!important;padding:0!important}html.wp-toolbar{padding:0!important}}.ctc-dp{max-width:900px;background:#fff;padding:28px 32px;border:1px solid #ddd;border-radius:8px}.ctc-dp h2{margin-top:28px;border-bottom:2px solid #D4A93A;padding-bottom:6px}.ctc-dp table{border-collapse:collapse;width:100%}.ctc-dp td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:top}.ctc-dp td:first-child{width:220px;color:#555}.ctc-copy{width:100%;min-height:110px;font-size:14px}</style>';
	echo '<div class="wrap">' . $back . '<div class="ctc-dp">';
	$tr = function ( $k, $v ) { if ( '' !== (string) $v ) echo '<tr><td>' . esc_html( $k ) . '</td><td>' . wp_kses_post( $v ) . '</td></tr>'; };
	if ( 'form' === $view ) {
		echo '<h1>Stripe evidence form answers</h1><p>' . esc_html( $f['name'] ) . ' · ' . esc_html( $f['reason'] ) . ' · dispute ' . esc_html( $dispute_id ) . '</p><p>Paste each value into the matching field in Stripe. Upload the evidence packet PDF as the main document.</p>';
		$fields = array(
			'Customer name' => $f['name'], 'Customer email' => $f['email'], 'Billing address' => $f['address'] ?? '', 'Customer purchase IP' => $f['ip'] ?? '',
			'Product description' => $o ? implode( "\n", array_map( 'wp_strip_all_tags', $f['items'] ) ) . "\nOnline CTEC-approved tax education course (video lessons, PDF, online exams), delivered on learn.cataxcourses.com." : '',
			'Service date' => ! empty( $f['paid'] ) ? wp_date( 'Y-m-d', $f['paid'] ) : '',
			'Access activity log' => $f['moodle'] ? ctc_dp_activity_text( $f['moodle'] ) : 'Student enrolled on learn.cataxcourses.com at purchase (see order notes in the evidence packet).',
			'Refund policy disclosure' => 'Shown at checkout; the customer must tick "I have read and agree to the Terms & Conditions" before paying. Refund Policy: ' . $f['refund_url'],
			'Cancellation policy disclosure' => 'Terms & Conditions: ' . $f['terms_url'] . ( 'subscription_canceled' === $row['reason'] ? "\nAuto-renewal consent box at checkout; reminders 30 and 7 days before renewal; one-click cancel link in every email." : '' ),
			'Additional information (rebuttal)' => ctc_dp_rebuttal( $row, $f ),
		);
		foreach ( $fields as $k => $v ) echo '<h2>' . esc_html( $k ) . '</h2><textarea class="ctc-copy" readonly onclick="this.select()">' . esc_textarea( $v ) . '</textarea>';
		echo '</div></div>';
		return;
	}
	echo '<h1 style="margin:0">California Tax Courses — dispute evidence</h1><p>cataxcourses.com · help@cataxcourses.com · (888) 229-1994</p>';
	echo '<h2>Dispute</h2><table>'; $tr( 'Dispute', esc_html( $dispute_id ) ); $tr( 'Reason', esc_html( $f['reason'] ) ); $tr( 'Amount', $f['amount'] ); $tr( 'Opened', esc_html( ctc_dp_fmt( $row['created'] ) ) ); echo '</table>';
	echo '<h2>Summary</h2><p>' . esc_html( ctc_dp_rebuttal( $row, $f ) ) . '</p>';
	echo '<h2>Customer</h2><table>'; $tr( 'Name', esc_html( $f['name'] ) ); $tr( 'Email', esc_html( $f['email'] ) ); $tr( 'Phone', esc_html( $f['phone'] ?? '' ) ); $tr( 'Billing address', esc_html( $f['address'] ?? '' ) ); $tr( 'Shipping address', esc_html( $f['shipping'] ?? '' ) ); echo '</table>';
	if ( $o ) {
		echo '<h2>Order #' . esc_html( $o->get_order_number() ) . '</h2><table>';
		$tr( 'Date paid', esc_html( ctc_dp_fmt( $f['paid'] ) ) ); $tr( 'Items', implode( '<br>', array_map( 'esc_html', $f['items'] ) ) ); $tr( 'Total', wc_price( $o->get_total(), array( 'currency' => $o->get_currency() ) ) );
		$tr( 'Payment method', esc_html( $o->get_payment_method_title() ) ); $tr( 'Order status', esc_html( wc_get_order_status_name( $o->get_status() ) ) ); $tr( 'Refunded', $f['refunds'] ? wc_price( $f['refunds'] ) : 'No refund requested or issued' );
		$tr( 'Checkout IP address', esc_html( $f['ip'] ) ); $tr( 'Device / browser', esc_html( $f['ua'] ) );
		echo '</table>';
	} else {
		echo '<h2>Order</h2><p style="color:#b32d2e">No WooCommerce order matched charge ' . esc_html( $row['charge_id'] ) . '. Look it up by customer email before submitting.</p>';
	}
	if ( $f['checks'] ) { echo '<h2>Payment verification (from Stripe)</h2><table>'; foreach ( $f['checks'] as $k => $v ) $tr( $k, esc_html( $v ) ); echo '</table>'; }
	echo '<h2>Delivery: course access</h2><p>Online course, delivered on learn.cataxcourses.com. The student is enrolled automatically when payment completes and receives login details by email; access does not expire.</p>';
	if ( ! empty( $f['notes'] ) ) echo '<table>' . implode( '', array_map( function ( $n ) { return '<tr><td colspan="2">' . esc_html( $n ) . '</td></tr>'; }, $f['notes'] ) ) . '</table>';
	if ( $f['moodle'] ) {
		$m = $f['moodle'];
		echo '<h2>Course activity (learn.cataxcourses.com)</h2><table>';
		$tr( 'Username', esc_html( $m['user']['username'] ?? '' ) ); $tr( 'Account created', esc_html( ctc_dp_fmt( $m['user']['timecreated'] ?? 0 ) ) ); $tr( 'First sign-in', esc_html( ctc_dp_fmt( $m['user']['firstaccess'] ?? 0 ) ) ); $tr( 'Last sign-in', esc_html( ctc_dp_fmt( $m['user']['lastaccess'] ?? 0 ) ) ); $tr( 'Last sign-in IP', esc_html( $m['user']['lastip'] ?? '' ) ); $tr( 'Recorded course actions', esc_html( (string) ( $m['logcount'] ?? '' ) ) );
		foreach ( (array) ( $m['courses'] ?? array() ) as $c ) $tr( 'Course: ' . $c['name'], esc_html( 'Enrolled ' . ctc_dp_fmt( $c['enrolled'] ?? 0 ) . ( ! empty( $c['lastaccess'] ) ? ' · last opened ' . ctc_dp_fmt( $c['lastaccess'] ) : '' ) . ( ! empty( $c['completed'] ) ? ' · completed ' . ctc_dp_fmt( $c['completed'] ) : '' ) . ( isset( $c['grade'] ) && '' !== $c['grade'] ? ' · grade ' . $c['grade'] : '' ) ) );
		echo '</table>';
		if ( ! empty( $m['quiz'] ) ) {
			echo '<h3>Exam attempts</h3><table>';
			foreach ( $m['quiz'] as $q ) echo '<tr><td>' . esc_html( ctc_dp_fmt( $q['start'] ) ) . '</td><td>' . esc_html( $q['name'] . ' — ' . $q['state'] . ( '' !== $q['score'] ? ', score ' . $q['score'] : '' ) . ( $q['finish'] ? ', finished ' . ctc_dp_fmt( $q['finish'] ) : '' ) ) . '</td></tr>';
			echo '</table>';
		}
		if ( ! empty( $m['recent'] ) ) {
			echo '<h3>Recent activity</h3><table>';
			foreach ( array_slice( $m['recent'], 0, 40 ) as $l ) echo '<tr><td>' . esc_html( ctc_dp_fmt( $l['time'] ) ) . '</td><td>' . esc_html( $l['what'] . ( ! empty( $l['ip'] ) ? ' (IP ' . $l['ip'] . ')' : '' ) ) . '</td></tr>';
			echo '</table>';
		}
	} else {
		echo '<p style="color:#666" class="ctc-noprint">Moodle activity not available (install the CTC Disputes block in Moodle to include sign-ins and lessons here).</p>';
	}
	if ( ! empty( $f['history'] ) ) echo '<h2>Other orders by this customer (not disputed)</h2><p>' . esc_html( implode( ' · ', $f['history'] ) ) . '</p>';
	echo '<h2>Policies accepted at checkout</h2><p>The customer must tick "I have read and agree to the website Terms &amp; Conditions" before the order can be placed.<br>Terms &amp; Conditions: ' . esc_html( $f['terms_url'] ) . '<br>Refund Policy: ' . esc_html( $f['refund_url'] ) . '<br>Privacy Policy: ' . esc_html( $f['privacy_url'] ) . '</p>';
	echo '</div></div>';
}
function ctc_dp_activity_text( $m ) {
	$lines = array( sprintf( 'Moodle account %s: created %s, first sign-in %s, last sign-in %s (IP %s), %d recorded course actions.', $m['user']['username'] ?? '', ctc_dp_fmt( $m['user']['timecreated'] ?? 0 ), ctc_dp_fmt( $m['user']['firstaccess'] ?? 0 ), ctc_dp_fmt( $m['user']['lastaccess'] ?? 0 ), $m['user']['lastip'] ?? '', (int) ( $m['logcount'] ?? 0 ) ) );
	foreach ( (array) ( $m['quiz'] ?? array() ) as $q ) $lines[] = 'Exam: ' . $q['name'] . ' — ' . $q['state'] . ( '' !== $q['score'] ? ', score ' . $q['score'] : '' ) . ', ' . ctc_dp_fmt( $q['start'] );
	foreach ( array_slice( (array) ( $m['recent'] ?? array() ), 0, 15 ) as $l ) $lines[] = ctc_dp_fmt( $l['time'] ) . ' — ' . $l['what'] . ( ! empty( $l['ip'] ) ? ' (IP ' . $l['ip'] . ')' : '' );
	return implode( "\n", $lines );
}

/* ---------------------------------------------------------------- feed for the Moodle block */
// GET /wp-json/ctc/v1/disputes?token=… : the dispute list for the Moodle dashboard block (no customer addresses).
add_action( 'rest_api_init', function () {
	register_rest_route( 'ctc/v1', '/disputes', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $req ) {
		$tok = (string) get_option( 'ctc_dp_token' );
		if ( ! $tok || ! hash_equals( $tok, (string) $req->get_param( 'token' ) ) ) return new WP_Error( 'forbidden', 'Bad token', array( 'status' => 403 ) );
		global $wpdb;
		$rows = $wpdb->get_results( 'SELECT dispute_id, order_id, customer, email, amount, currency, reason, status, due_by, created FROM ' . ctc_dp_table() . ' ORDER BY created DESC LIMIT 100', ARRAY_A );
		foreach ( $rows as &$r ) { $r['reason_label'] = ctc_dp_reason_label( $r['reason'] ); $r['packet'] = ctc_dp_link( $r['dispute_id'], 'packet' ); $r['form'] = ctc_dp_link( $r['dispute_id'], 'form' ); }
		return array( 'disputes' => $rows, 'last_sync' => get_option( 'ctc_dp_last_sync' ) );
	} ) );
	// The packet / form-answers page itself, for the Moodle block (rendered there inside Moodle).
	register_rest_route( 'ctc/v1', '/disputes/(?P<id>[A-Za-z0-9_]+)/(?P<view>packet|form)', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function ( WP_REST_Request $req ) {
		$tok = (string) get_option( 'ctc_dp_token' );
		if ( ! $tok || ! hash_equals( $tok, (string) $req->get_param( 'token' ) ) ) return new WP_Error( 'forbidden', 'Bad token', array( 'status' => 403 ) );
		ob_start();
		ctc_dp_view( $req['id'], $req['view'] );
		return array( 'html' => ob_get_clean() );
	} ) );
} );

/* ================================================================ automatic evidence (draft, then submit) */
// New disputes: the answers and three PDFs (evidence packet with the Moodle sign-in/activity log, receipt, policies)
// are uploaded to Stripe and saved on the dispute as a draft (Stripe does not send drafts to the bank). The dispute is
// then submitted automatically at submit_at (CTC_DP_SUBMIT_AFTER after drafting, and never later than 12 hours
// before Stripe's deadline) unless someone clicks Hold. Mode (Disputes > Settings): auto | draft | off.
if ( ! defined( 'CTC_DP_SUBMIT_AFTER' ) ) define( 'CTC_DP_SUBMIT_AFTER', DAY_IN_SECONDS );
function ctc_dp_mode() { return get_option( 'ctc_dp_auto', 'auto' ); }

/* ---------------------------------------------------------------- tiny PDF writer (Helvetica, A4-letter, wrapped text) */
// $blocks: [ ['h', text], ['p', text], ['kv', [[label, value], …]], ['rows', [[col1, col2], …]] ]
function ctc_dp_pdf( $title, $blocks ) {
	$enc  = function ( $t ) { $t = html_entity_decode( wp_strip_all_tags( (string) $t ), ENT_QUOTES, 'UTF-8' ); $c = @iconv( 'UTF-8', 'Windows-1252//TRANSLIT', $t ); return false === $c ? preg_replace( '/[^\x20-\x7E]/', '?', $t ) : $c; };
	$esc  = function ( $t ) { return str_replace( array( '\\', '(', ')', "\r" ), array( '\\\\', '\\(', '\\)', '' ), $t ); };
	$wrap = function ( $t, $chars ) { $out = array(); foreach ( explode( "\n", $t ) as $ln ) { $w = wordwrap( $ln, $chars, "\n", true ); foreach ( explode( "\n", $w ) as $x ) $out[] = $x; } return $out; };
	$pages = array(); $ops = ''; $y = 0;
	$newpage = function () use ( &$pages, &$ops, &$y ) { if ( '' !== $ops ) $pages[] = $ops; $ops = ''; $y = 742; };
	$line = function ( $text, $font = 'F1', $size = 10, $x = 54 ) use ( &$ops, &$y, $esc, $newpage ) {
		if ( $y < 60 ) $newpage();
		$ops .= sprintf( "BT /%s %d Tf %d %d Td (%s) Tj ET\n", $font, $size, $x, $y, $esc( $text ) );
		$y -= $size + 4;
	};
	$newpage();
	foreach ( $wrap( $enc( $title ), 60 ) as $l ) $line( $l, 'F2', 16 );
	$line( $enc( 'California Tax Courses · cataxcourses.com · help@cataxcourses.com · (888) 229-1994' ), 'F1', 9 );
	$y -= 6;
	foreach ( $blocks as $b ) {
		switch ( $b[0] ) {
			case 'h':
				$y -= 8; if ( $y < 90 ) $newpage();
				$line( $enc( $b[1] ), 'F2', 12 ); $ops .= sprintf( "0.83 0.66 0.23 RG 1 w 54 %d m 558 %d l S 0 0 0 RG\n", $y + 11, $y + 11 ); $y -= 2;
				break;
			case 'p':
				foreach ( $wrap( $enc( $b[1] ), 105 ) as $l ) $line( $l ); $y -= 4;
				break;
			case 'kv':
				foreach ( $b[1] as $kv ) {
					if ( '' === (string) $kv[1] ) continue;
					$vals = $wrap( $enc( $kv[1] ), 78 );
					if ( $y < 60 ) $newpage();
					$ops .= sprintf( "BT /F2 9 Tf 54 %d Td (%s) Tj ET\n", $y, $esc( $enc( $kv[0] ) ) );
					foreach ( $vals as $i => $v ) { if ( $i ) { if ( $y < 60 ) $newpage(); } $ops .= sprintf( "BT /F1 9 Tf 200 %d Td (%s) Tj ET\n", $y, $esc( $v ) ); $y -= 13; }
				}
				$y -= 4;
				break;
			case 'rows':
				foreach ( $b[1] as $r ) {
					$vals = $wrap( $enc( $r[1] ), 82 );
					if ( $y < 60 ) $newpage();
					$ops .= sprintf( "BT /F1 8 Tf 54 %d Td (%s) Tj ET\n", $y, $esc( $enc( $r[0] ) ) );
					foreach ( $vals as $v ) { if ( $y < 60 ) $newpage(); $ops .= sprintf( "BT /F1 8 Tf 190 %d Td (%s) Tj ET\n", $y, $esc( $v ) ); $y -= 11; }
				}
				$y -= 4;
				break;
		}
	}
	$pages[] = $ops;
	// assemble: 1 catalog, 2 pages, 3 F1, 4 F2, then page + content pairs
	$objs = array( 1 => '<< /Type /Catalog /Pages 2 0 R >>', 3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>' );
	$kids = array(); $n = 5; $total = count( $pages );
	foreach ( $pages as $i => $content ) {
		$content .= sprintf( "BT /F1 8 Tf 54 30 Td (%s) Tj ET\n", $esc( 'Page ' . ( $i + 1 ) . ' of ' . $total ) );
		$objs[ $n ]     = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' . ( $n + 1 ) . ' 0 R >>';
		$objs[ $n + 1 ] = '<< /Length ' . strlen( $content ) . " >>\nstream\n" . $content . "endstream";
		$kids[] = $n . ' 0 R'; $n += 2;
	}
	$objs[2] = '<< /Type /Pages /Kids [' . implode( ' ', $kids ) . '] /Count ' . $total . ' >>';
	ksort( $objs );
	$pdf = "%PDF-1.4\n"; $off = array();
	foreach ( $objs as $i => $o ) { $off[ $i ] = strlen( $pdf ); $pdf .= $i . " 0 obj\n" . $o . "\nendobj\n"; }
	$x = strlen( $pdf );
	$pdf .= 'xref' . "\n0 " . ( count( $objs ) + 1 ) . "\n0000000000 65535 f \n";
	foreach ( $off as $o ) $pdf .= sprintf( "%010d 00000 n \n", $o );
	return $pdf . 'trailer << /Size ' . ( count( $objs ) + 1 ) . " /Root 1 0 R >>\nstartxref\n" . $x . "\n%%EOF";
}

/* ---------------------------------------------------------------- the three documents */
function ctc_dp_docs( $row, $f ) {
	$o    = $f['order'];
	$docs = array();
	// 1. evidence packet: summary, customer, order, payment checks, delivery + Moodle access log, history
	$b = array( array( 'h', 'Summary' ), array( 'p', ctc_dp_rebuttal( $row, $f ) ),
		array( 'h', 'Dispute' ), array( 'kv', array( array( 'Dispute', $row['dispute_id'] ), array( 'Reason', $f['reason'] ), array( 'Amount', $f['amount'] ), array( 'Opened', ctc_dp_fmt( $row['created'] ) ) ) ),
		array( 'h', 'Customer' ), array( 'kv', array( array( 'Name', $f['name'] ), array( 'Email', $f['email'] ), array( 'Phone', $f['phone'] ?? '' ), array( 'Billing address', $f['address'] ?? '' ), array( 'Shipping address', $f['shipping'] ?? '' ) ) ) );
	if ( $o ) $b = array_merge( $b, array( array( 'h', 'Order #' . $o->get_order_number() ), array( 'kv', array(
		array( 'Date paid', ctc_dp_fmt( $f['paid'] ) ), array( 'Items', implode( "\n", $f['items'] ) ), array( 'Total', ctc_dp_money( $o->get_total(), $o->get_currency() ) ),
		array( 'Payment method', $o->get_payment_method_title() ), array( 'Refunded', $f['refunds'] ? ctc_dp_money( $f['refunds'] ) : 'No refund requested or issued' ),
		array( 'Checkout IP address', $f['ip'] ), array( 'Device / browser', $f['ua'] ) ) ) ) );
	if ( $f['checks'] ) $b = array_merge( $b, array( array( 'h', 'Payment verification (from Stripe)' ), array( 'kv', array_map( null, array_keys( $f['checks'] ), array_values( $f['checks'] ) ) ) ) );
	$b[] = array( 'h', 'Delivery: course access' );
	$b[] = array( 'p', 'Online course delivered on learn.cataxcourses.com. The student is enrolled automatically when payment completes and receives login details by email; access does not expire.' );
	if ( ! empty( $f['notes'] ) ) $b[] = array( 'rows', array_map( function ( $n ) { $p = explode( ' — ', $n, 2 ); return array( $p[0], $p[1] ?? '' ); }, $f['notes'] ) );
	if ( $m = $f['moodle'] ) {
		$b[] = array( 'h', 'Course sign-ins and activity (learn.cataxcourses.com, timestamps ' . wp_timezone_string() . ')' );
		$b[] = array( 'kv', array( array( 'Username', $m['user']['username'] ?? '' ), array( 'Account created', ctc_dp_fmt( $m['user']['timecreated'] ?? 0 ) ), array( 'First sign-in', ctc_dp_fmt( $m['user']['firstaccess'] ?? 0 ) ),
			array( 'Last sign-in', ctc_dp_fmt( $m['user']['lastaccess'] ?? 0 ) ), array( 'Last sign-in IP', $m['user']['lastip'] ?? '' ), array( 'Recorded course actions', (string) ( $m['logcount'] ?? '' ) ) ) );
		foreach ( (array) ( $m['courses'] ?? array() ) as $c ) $b[] = array( 'kv', array( array( 'Course', $c['name'] ), array( 'Enrolled', ctc_dp_fmt( $c['enrolled'] ?? 0 ) ), array( 'Last opened', ctc_dp_fmt( $c['lastaccess'] ?? 0 ) ), array( 'Completed', ! empty( $c['completed'] ) ? ctc_dp_fmt( $c['completed'] ) : '' ), array( 'Grade', $c['grade'] ?? '' ) ) );
		if ( ! empty( $m['quiz'] ) ) { $b[] = array( 'h', 'Exam attempts' ); $b[] = array( 'rows', array_map( function ( $q ) { return array( ctc_dp_fmt( $q['start'] ), $q['name'] . ' — ' . $q['state'] . ( '' !== $q['score'] ? ', score ' . $q['score'] : '' ) ); }, $m['quiz'] ) ); }
		if ( ! empty( $m['recent'] ) ) { $b[] = array( 'h', 'Activity log (most recent first)' ); $b[] = array( 'rows', array_map( function ( $l ) { return array( ctc_dp_fmt( $l['time'] ), $l['what'] . ( ! empty( $l['ip'] ) ? ' (IP ' . $l['ip'] . ')' : '' ) ); }, array_slice( $m['recent'], 0, 60 ) ) ); }
	}
	if ( ! empty( $f['history'] ) ) { $b[] = array( 'h', 'Other orders by this customer (not disputed)' ); $b[] = array( 'p', implode( "\n", $f['history'] ) ); }
	$docs['service_documentation'] = array( 'evidence-' . $row['dispute_id'] . '.pdf', ctc_dp_pdf( 'Dispute evidence — ' . $f['name'], $b ) );
	// 2. receipt
	if ( $o ) {
		$docs['receipt'] = array( 'receipt-' . $o->get_order_number() . '.pdf', ctc_dp_pdf( 'Receipt — order #' . $o->get_order_number(), array(
			array( 'kv', array( array( 'Order', '#' . $o->get_order_number() ), array( 'Date', ctc_dp_fmt( $f['paid'] ) ), array( 'Customer', $f['name'] ), array( 'Email', $f['email'] ), array( 'Billing address', $f['address'] ) ) ),
			array( 'h', 'Items' ), array( 'p', implode( "\n", $f['items'] ) ),
			array( 'kv', array( array( 'Subtotal', ctc_dp_money( $o->get_subtotal(), $o->get_currency() ) ), array( 'Discount', $o->get_total_discount() ? '-' . ctc_dp_money( $o->get_total_discount(), $o->get_currency() ) : '' ), array( 'Shipping', $o->get_shipping_total() > 0 ? ctc_dp_money( $o->get_shipping_total(), $o->get_currency() ) : '' ), array( 'Tax', $o->get_total_tax() > 0 ? ctc_dp_money( $o->get_total_tax(), $o->get_currency() ) : '' ), array( 'Total paid', ctc_dp_money( $o->get_total(), $o->get_currency() ) ), array( 'Payment method', $o->get_payment_method_title() . ( ! empty( $f['checks']['Card'] ) ? ' (' . $f['checks']['Card'] . ')' : '' ) ) ) ),
		) ) );
	}
	// 3. policies the customer accepted (current text of the Terms and Refund Policy pages)
	$pol = array( array( 'p', 'At checkout the customer must tick "I have read and agree to the website Terms & Conditions" before the order can be placed.' ) );
	foreach ( array( 'Refund Policy' => $f['refund_url'], 'Terms & Conditions' => $f['terms_url'] ) as $label => $url ) {
		$pid  = url_to_postid( $url );
		$html = $pid && class_exists( '\Elementor\Plugin' ) ? \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $pid ) : '';
		if ( ! $html && $pid ) $html = get_post_field( 'post_content', $pid );
		$text = wp_strip_all_tags( preg_replace( '#<(style|script)[^>]*>.*?</\1>#s', '', str_replace( array( '</p>', '<br>', '</li>', '</h2>', '</h3>' ), "\n", (string) $html ) ) );
		$text = trim( preg_replace( "/\n{3,}/", "\n\n", implode( "\n", array_map( 'trim', explode( "\n", html_entity_decode( $text, ENT_QUOTES, 'UTF-8' ) ) ) ) ) );
		$pol[] = array( 'h', $label . ' (' . $url . ')' );
		$pol[] = array( 'p', $text ? mb_substr( $text, 0, 12000 ) : $url );
	}
	$docs['refund_policy'] = array( 'policies.pdf', ctc_dp_pdf( 'Refund Policy and Terms accepted at checkout', $pol ) );
	return $docs;
}

/* ---------------------------------------------------------------- Stripe evidence fields */
function ctc_dp_evidence( $row, $f ) {
	$o  = $f['order'];
	$ev = array(
		'customer_name' => $f['name'], 'customer_email_address' => $f['email'], 'billing_address' => $f['address'] ?? '',
		'customer_purchase_ip' => $f['ip'] ?? '',
		'product_description' => ( $o ? implode( "\n", $f['items'] ) . "\n" : '' ) . 'Online CTEC-approved tax education course (video lessons, PDF, online exams), delivered on learn.cataxcourses.com.',
		'service_date' => ! empty( $f['paid'] ) ? wp_date( 'Y-m-d', $f['paid'] ) : '',
		'access_activity_log' => $f['moodle'] ? ctc_dp_activity_text( $f['moodle'] ) : 'Student enrolled on learn.cataxcourses.com automatically at purchase; login details emailed (order notes in the attached evidence).',
		'refund_policy_disclosure' => 'Shown at checkout; the customer must tick "I have read and agree to the Terms & Conditions" before paying. Refund Policy: ' . $f['refund_url'],
		'cancellation_policy_disclosure' => 'Terms & Conditions: ' . $f['terms_url'] . ( 'subscription_canceled' === $row['reason'] ? "\nAuto-renewal consent box at checkout; reminders 30 and 7 days before renewal; one-click cancel link in every email." : '' ),
		'uncategorized_text' => ctc_dp_rebuttal( $row, $f ),
	);
	if ( 'credit_not_processed' === $row['reason'] && ! empty( $f['refunds'] ) ) $ev['refund_refusal_explanation'] = 'A refund of ' . ctc_dp_money( $f['refunds'] ) . ' was issued.';
	if ( 'subscription_canceled' === $row['reason'] ) $ev['cancellation_rebuttal'] = 'The auto-renewal was not canceled before this charge. The customer opted in at checkout, received reminder emails 30 and 7 days before renewal, and every email has a one-click cancel link.';
	if ( 'duplicate' === $row['reason'] ) $ev['duplicate_charge_explanation'] = 'This charge is for a single order; any other charges are separate orders for separate products.';
	return array_filter( $ev, function ( $v ) { return '' !== (string) $v; } );
}

function ctc_dp_stripe_post( $key, $path, $fields ) {
	$r = wp_remote_post( 'https://api.stripe.com/v1/' . $path, array( 'timeout' => 60, 'headers' => array( 'Authorization' => 'Bearer ' . $key ), 'body' => http_build_query( $fields ) ) );
	if ( is_wp_error( $r ) ) return array( 'error' => array( 'message' => $r->get_error_message() ) );
	return json_decode( wp_remote_retrieve_body( $r ), true ) ?: array( 'error' => array( 'message' => 'HTTP ' . wp_remote_retrieve_response_code( $r ) ) );
}
function ctc_dp_stripe_file( $key, $name, $bytes ) {
	$bd   = 'ctc' . wp_generate_password( 16, false );
	$body = "--$bd\r\nContent-Disposition: form-data; name=\"purpose\"\r\n\r\ndispute_evidence\r\n"
		. "--$bd\r\nContent-Disposition: form-data; name=\"file\"; filename=\"$name\"\r\nContent-Type: application/pdf\r\n\r\n$bytes\r\n--$bd--\r\n";
	$r = wp_remote_post( 'https://files.stripe.com/v1/files', array( 'timeout' => 90, 'headers' => array( 'Authorization' => 'Bearer ' . $key, 'Content-Type' => 'multipart/form-data; boundary=' . $bd ), 'body' => $body ) );
	$j = is_wp_error( $r ) ? null : json_decode( wp_remote_retrieve_body( $r ), true );
	return $j && ! empty( $j['id'] ) ? $j['id'] : new WP_Error( 'upload', $j['error']['message'] ?? ( is_wp_error( $r ) ? $r->get_error_message() : 'upload failed' ) );
}
function ctc_dp_log( $dispute_id, $msg ) {
	global $wpdb;
	$log = (string) $wpdb->get_var( $wpdb->prepare( 'SELECT auto_log FROM ' . ctc_dp_table() . ' WHERE dispute_id = %s', $dispute_id ) );
	$wpdb->update( ctc_dp_table(), array( 'auto_log' => trim( $log . "\n" . current_time( 'M j g:i a' ) . ' — ' . $msg ) ), array( 'dispute_id' => $dispute_id ) );
}

// Upload the documents and save the evidence on Stripe. $submit = true sends it to the bank (final).
function ctc_dp_push( $dispute_id, $submit ) {
	global $wpdb;
	$row = ctc_dp_row( $dispute_id );
	$key = ctc_dp_keys()[ $row['account'] ?? '' ] ?? '';
	if ( ! $row || ! $key ) return new WP_Error( 'nokey', 'No Stripe key for this dispute' );
	$live = ctc_dp_stripe( $key, 'disputes/' . $dispute_id );
	if ( ! $live || ! in_array( $live['status'], array( 'needs_response', 'warning_needs_response' ), true ) ) {
		$wpdb->update( ctc_dp_table(), array( 'auto_state' => 'closed', 'status' => $live['status'] ?? $row['status'] ), array( 'dispute_id' => $dispute_id ) );
		return new WP_Error( 'closed', 'Dispute no longer accepts evidence (' . ( $live['status'] ?? 'unknown' ) . ')' );
	}
	$f      = ctc_dp_facts( $row );
	$fields = array( 'evidence' => ctc_dp_evidence( $row, $f ) );
	foreach ( ctc_dp_docs( $row, $f ) as $field => $doc ) {
		$id = ctc_dp_stripe_file( $key, $doc[0], $doc[1] );
		if ( is_wp_error( $id ) ) return $id;
		$fields['evidence'][ $field ] = $id;
	}
	$fields['submit']   = $submit ? 'true' : 'false';
	$fields['metadata'] = array( 'ctc_evidence' => $submit ? 'submitted' : 'draft' );
	$res = ctc_dp_stripe_post( $key, 'disputes/' . $dispute_id, $fields );
	if ( ! empty( $res['error'] ) ) return new WP_Error( 'stripe', $res['error']['message'] ?? 'Stripe error' );
	return $res;
}

function ctc_dp_submit_time( $row ) {
	$t   = time() + CTC_DP_SUBMIT_AFTER;
	$due = $row['due_by'] ? strtotime( $row['due_by'] . ' UTC' ) - 12 * HOUR_IN_SECONDS : 0;
	return gmdate( 'Y-m-d H:i:s', $due ? max( time() + HOUR_IN_SECONDS, min( $t, $due ) ) : $t );
}
function ctc_dp_auto_draft( $dispute_id ) {
	global $wpdb;
	$row = ctc_dp_row( $dispute_id );
	if ( ! $row || 'off' === ctc_dp_mode() || ! in_array( $row['status'], array( 'needs_response', 'warning_needs_response' ), true ) ) return;
	$res = ctc_dp_push( $dispute_id, false );
	if ( is_wp_error( $res ) ) { $wpdb->update( ctc_dp_table(), array( 'auto_state' => 'closed' === $res->get_error_code() ? 'closed' : 'failed' ), array( 'dispute_id' => $dispute_id ) ); ctc_dp_log( $dispute_id, 'Draft failed: ' . $res->get_error_message() ); return; }
	$review = in_array( $row['reason'], array( 'credit_not_processed', 'product_unacceptable', 'subscription_canceled' ), true ); // depends on emails with the customer: a person decides
	$auto   = 'auto' === ctc_dp_mode() && ! $review;
	if ( $review ) ctc_dp_log( $dispute_id, 'Not auto-submitted: this reason depends on emails with the customer (refund request?). Check the inbox, add anything relevant in Stripe, then click Submit now or Resume auto-submit.' );
	$wpdb->update( ctc_dp_table(), array( 'auto_state' => $auto ? 'drafted' : 'draft_only', 'submit_at' => $auto ? ctc_dp_submit_time( $row ) : null ), array( 'dispute_id' => $dispute_id ) );
	ctc_dp_log( $dispute_id, 'Evidence saved on Stripe as a draft' . ( $auto ? '; auto-submit ' . ctc_dp_fmt( ctc_dp_submit_time( $row ) ) : '' ) . '.' );
}
function ctc_dp_auto_submit( $dispute_id ) {
	global $wpdb;
	$res = ctc_dp_push( $dispute_id, true ); // rebuilt at submit time, so newer Moodle activity is included
	if ( is_wp_error( $res ) ) {
		$wpdb->update( ctc_dp_table(), array( 'auto_state' => 'closed' === $res->get_error_code() ? 'closed' : 'failed' ), array( 'dispute_id' => $dispute_id ) );
		ctc_dp_log( $dispute_id, 'Submit failed: ' . $res->get_error_message() );
		if ( 'closed' !== $res->get_error_code() ) wp_mail( ctc_dp_agent_emails(), 'Dispute evidence NOT submitted: ' . $dispute_id, "Automatic submission failed (" . $res->get_error_message() . ").\nPlease submit it manually: " . ctc_dp_link( $dispute_id, 'form' ) . "\nStripe: https://dashboard.stripe.com/disputes/" . $dispute_id );
		return;
	}
	$wpdb->update( ctc_dp_table(), array( 'auto_state' => 'submitted', 'status' => $res['status'] ?? 'under_review' ), array( 'dispute_id' => $dispute_id ) );
	ctc_dp_log( $dispute_id, 'Evidence submitted to Stripe.' );
	$row = ctc_dp_row( $dispute_id );
	if ( $row['order_id'] && ( $o = wc_get_order( $row['order_id'] ) ) ) $o->add_order_note( 'Dispute ' . $dispute_id . ': evidence submitted to Stripe automatically.' );
}
// Due auto-submits (run with every hourly sync).
function ctc_dp_auto_due() {
	global $wpdb;
	if ( 'auto' !== ctc_dp_mode() ) return;
	foreach ( $wpdb->get_col( $wpdb->prepare( 'SELECT dispute_id FROM ' . ctc_dp_table() . " WHERE auto_state = 'drafted' AND submit_at <= %s", current_time( 'mysql', true ) ) ) as $id ) ctc_dp_auto_submit( $id );
}

/* ---------------------------------------------------------------- controls on the Disputes page */
add_action( 'admin_init', function () {
	global $wpdb;
	if ( empty( $_POST['ctc_dp_act'] ) || ! current_user_can( CTC_DISPUTE_CAP ) || ! check_admin_referer( 'ctc_dp' ) ) return;
	$id  = sanitize_text_field( wp_unslash( $_POST['dispute'] ?? '' ) );
	$act = sanitize_key( $_POST['ctc_dp_act'] );
	$row = $id ? ctc_dp_row( $id ) : null;
	if ( 'mode' === $act && current_user_can( 'manage_options' ) ) {
		update_option( 'ctc_dp_auto', in_array( $_POST['mode'] ?? '', array( 'auto', 'draft', 'off' ), true ) ? $_POST['mode'] : 'auto', false );
	} elseif ( $row && 'hold' === $act && 'drafted' === $row['auto_state'] ) {
		$wpdb->update( ctc_dp_table(), array( 'auto_state' => 'held' ), array( 'dispute_id' => $id ) ); ctc_dp_log( $id, 'Held by ' . wp_get_current_user()->display_name . '.' );
	} elseif ( $row && 'resume' === $act && in_array( $row['auto_state'], array( 'held', 'draft_only' ), true ) ) {
		$wpdb->update( ctc_dp_table(), array( 'auto_state' => 'drafted', 'submit_at' => ctc_dp_submit_time( $row ) ), array( 'dispute_id' => $id ) ); ctc_dp_log( $id, 'Auto-submit resumed by ' . wp_get_current_user()->display_name . '.' );
	} elseif ( $row && 'draft' === $act ) {
		ctc_dp_auto_draft( $id );
	} elseif ( $row && 'submit' === $act && ! in_array( $row['auto_state'], array( 'submitted', 'closed' ), true ) ) {
		ctc_dp_log( $id, 'Submit now clicked by ' . wp_get_current_user()->display_name . '.' ); ctc_dp_auto_submit( $id );
	}
	wp_safe_redirect( admin_url( 'admin.php?page=ctc-disputes' ) );
	exit;
} );
// Draft the disputes that are open but were stored before automation existed (runs once per dispute).
function ctc_dp_backfill() {
	global $wpdb;
	if ( 'off' === ctc_dp_mode() ) return;
	foreach ( $wpdb->get_col( 'SELECT dispute_id FROM ' . ctc_dp_table() . " WHERE auto_state = '' AND status IN ('needs_response','warning_needs_response')" ) as $id ) ctc_dp_auto_draft( $id );
}
add_action( 'ctc_dp_sync', 'ctc_dp_backfill', 20 );
// Admin: what Stripe currently holds for a dispute (evidence fields filled, files attached, submitted or not).
add_action( 'admin_init', function () {
	if ( empty( $_GET['ctc_dp_stripe'] ) || ! current_user_can( 'manage_options' ) ) return;
	$row = ctc_dp_row( sanitize_text_field( wp_unslash( $_GET['dispute'] ?? '' ) ) );
	$key = $row ? ( ctc_dp_keys()[ $row['account'] ] ?? '' ) : '';
	$d   = $key ? ctc_dp_stripe( $key, 'disputes/' . $row['dispute_id'] ) : null;
	if ( ! $d ) wp_die( 'Not found' );
	wp_send_json( array( 'status' => $d['status'], 'submission_count' => $d['evidence_details']['submission_count'] ?? null, 'has_evidence' => $d['evidence_details']['has_evidence'] ?? null,
		'filled' => array_keys( array_filter( (array) $d['evidence'] ) ), 'metadata' => $d['metadata'] ?? array() ) );
} );
// Admin: download the generated PDFs (to check what Stripe receives).
add_action( 'admin_init', function () {
	if ( empty( $_GET['ctc_dp_pdf'] ) || ! current_user_can( CTC_DISPUTE_CAP ) ) return;
	$row = ctc_dp_row( sanitize_text_field( wp_unslash( $_GET['dispute'] ?? '' ) ) );
	if ( ! $row ) wp_die( 'Not found' );
	$docs = ctc_dp_docs( $row, ctc_dp_facts( $row ) );
	$doc  = $docs[ sanitize_key( $_GET['ctc_dp_pdf'] ) ] ?? reset( $docs );
	header( 'Content-Type: application/pdf' );
	header( 'Content-Disposition: inline; filename=' . $doc[0] );
	echo $doc[1];
	exit;
} );

function ctc_dp_auto_cell( $r ) {
	$labels = array( '' => '—', 'drafted' => 'Drafted on Stripe · submits ' . ( $r['submit_at'] ? ctc_dp_fmt( $r['submit_at'] ) : '' ), 'draft_only' => 'Drafted on Stripe (not auto-submitting)',
		'held' => '<strong>Held</strong> (drafted on Stripe)', 'submitted' => '<span style="color:#1a7f37">✓ Submitted</span>', 'failed' => '<span style="color:#b32d2e">Failed – submit manually</span>', 'closed' => 'Closed' );
	$btn = function ( $act, $label, $confirm = '' ) use ( $r ) {
		return '<form method="post" style="display:inline"' . ( $confirm ? ' onsubmit="return confirm(\'' . esc_js( $confirm ) . '\')"' : '' ) . '>' . wp_nonce_field( 'ctc_dp', '_wpnonce', true, false )
			. '<input type="hidden" name="dispute" value="' . esc_attr( $r['dispute_id'] ) . '"><button class="button button-small" name="ctc_dp_act" value="' . $act . '">' . $label . '</button></form> ';
	};
	$out  = wp_kses_post( $labels[ $r['auto_state'] ] ?? esc_html( $r['auto_state'] ) ) . '<br>';
	$open = in_array( $r['status'], array( 'needs_response', 'warning_needs_response' ), true );
	if ( $open ) {
		if ( 'drafted' === $r['auto_state'] ) $out .= $btn( 'hold', 'Hold' );
		if ( in_array( $r['auto_state'], array( 'held', 'draft_only' ), true ) ) $out .= $btn( 'resume', 'Resume auto-submit' );
		if ( in_array( $r['auto_state'], array( '', 'failed' ), true ) ) $out .= $btn( 'draft', 'Draft on Stripe' );
		if ( ! in_array( $r['auto_state'], array( 'submitted', 'closed' ), true ) ) $out .= $btn( 'submit', 'Submit now', 'Submit this evidence to Stripe now? This is final.' );
	}
	$out .= '<br><a href="' . esc_url( admin_url( 'admin.php?ctc_dp_pdf=service_documentation&dispute=' . rawurlencode( $r['dispute_id'] ) ) ) . '" target="_blank">Evidence PDF</a> · <a href="' . esc_url( admin_url( 'admin.php?ctc_dp_pdf=receipt&dispute=' . rawurlencode( $r['dispute_id'] ) ) ) . '" target="_blank">Receipt</a> · <a href="' . esc_url( admin_url( 'admin.php?ctc_dp_pdf=refund_policy&dispute=' . rawurlencode( $r['dispute_id'] ) ) ) . '" target="_blank">Policies</a>';
	if ( $r['auto_log'] ) $out .= '<details><summary style="cursor:pointer;color:#666">Log</summary><pre style="white-space:pre-wrap;font-size:11px">' . esc_html( $r['auto_log'] ) . '</pre></details>';
	return $out;
}
