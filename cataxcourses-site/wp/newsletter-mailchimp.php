/**
 * CTC newsletter → Mailchimp (Code Snippets, scope: global).
 *
 * The homepage "Newsletter Signup (homepage)" Elementor form adds the person to the Mailchimp audience the
 * Mailchimp for WooCommerce plugin syncs the store to (same API key + audience), tagged "Website newsletter".
 * The form also keeps saving to Elementor > Submissions. Errors are logged in WooCommerce > Status > Logs (ctc-newsletter).
 */
if ( ! defined( 'CTC_NL_FORM' ) ) define( 'CTC_NL_FORM', 'Newsletter Signup (homepage)' );
if ( ! defined( 'CTC_NL_TAG' ) ) define( 'CTC_NL_TAG', 'Website newsletter' );

// API key + audience id from the Mailchimp for WooCommerce plugin.
function ctc_nl_mailchimp() {
	$o    = get_option( 'mailchimp-woocommerce', array() );
	$key  = function_exists( 'mailchimp_get_api_key' ) ? mailchimp_get_api_key() : ( $o['mailchimp_api_key'] ?? '' );
	$list = function_exists( 'mailchimp_get_list_id' ) ? mailchimp_get_list_id() : ( $o['mailchimp_list'] ?? '' );
	if ( ! $key || ! $list || false === strpos( $key, '-' ) ) return null;
	return array( 'key' => $key, 'list' => $list, 'base' => 'https://' . substr( $key, strrpos( $key, '-' ) + 1 ) . '.api.mailchimp.com/3.0/lists/' . rawurlencode( $list ) );
}
function ctc_nl_log( $msg ) {
	if ( function_exists( 'wc_get_logger' ) ) wc_get_logger()->info( $msg, array( 'source' => 'ctc-newsletter' ) );
}
function ctc_nl_subscribe( $email, $first = '' ) {
	$mc = ctc_nl_mailchimp();
	if ( ! $mc || ! is_email( $email ) ) { ctc_nl_log( 'Not sent to Mailchimp (no Mailchimp connection or bad email): ' . $email ); return false; }
	$hash = md5( strtolower( trim( $email ) ) );
	$auth = array( 'Authorization' => 'Basic ' . base64_encode( 'ctc:' . $mc['key'] ), 'Content-Type' => 'application/json' );
	$body = array( 'email_address' => $email, 'status_if_new' => 'subscribed', 'status' => 'subscribed' );
	if ( $first ) $body['merge_fields'] = array( 'FNAME' => $first );
	// PUT = add or update; "status" re-subscribes someone who unsubscribed only because they just asked to join again.
	$r = wp_remote_request( $mc['base'] . '/members/' . $hash, array( 'method' => 'PUT', 'timeout' => 20, 'headers' => $auth, 'body' => wp_json_encode( $body ) ) );
	$code = is_wp_error( $r ) ? 0 : (int) wp_remote_retrieve_response_code( $r );
	if ( $code < 200 || $code >= 300 ) { ctc_nl_log( 'Mailchimp add failed for ' . $email . ': ' . ( is_wp_error( $r ) ? $r->get_error_message() : $code . ' ' . wp_remote_retrieve_body( $r ) ) ); return false; }
	wp_remote_post( $mc['base'] . '/members/' . $hash . '/tags', array( 'timeout' => 20, 'headers' => $auth, 'body' => wp_json_encode( array( 'tags' => array( array( 'name' => CTC_NL_TAG, 'status' => 'active' ) ) ) ) ) );
	return true;
}
add_action( 'elementor_pro/forms/new_record', function ( $record ) {
	if ( CTC_NL_FORM !== $record->get_form_settings( 'form_name' ) ) return;
	$f = array();
	foreach ( (array) $record->get( 'fields' ) as $id => $field ) $f[ $id ] = trim( (string) ( $field['value'] ?? '' ) );
	ctc_nl_subscribe( $f['email'] ?? '', $f['first_name'] ?? '' );
} );

// Admin check (WooCommerce > Status > Logs aside): /wp-admin/?ctc_nl_check=1 shows whether the Mailchimp connection is found.
add_action( 'admin_init', function () {
	if ( empty( $_GET['ctc_nl_check'] ) || ! current_user_can( 'manage_options' ) ) return;
	$mc = ctc_nl_mailchimp();
	if ( ! $mc ) wp_send_json( array( 'connected' => false ) );
	$r = wp_remote_get( $mc['base'] . '?fields=name,stats.member_count', array( 'timeout' => 20, 'headers' => array( 'Authorization' => 'Basic ' . base64_encode( 'ctc:' . $mc['key'] ) ) ) );
	$j = is_wp_error( $r ) ? null : json_decode( wp_remote_retrieve_body( $r ), true );
	wp_send_json( array( 'connected' => (bool) $j && ! empty( $j['name'] ), 'audience' => $j['name'] ?? null, 'members' => $j['stats']['member_count'] ?? null ) );
} );
