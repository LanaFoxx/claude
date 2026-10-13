/**
 * CTC security hardening (after the Aug 4 2026 link injection made through the admin account).
 * Add as a Code Snippet: type PHP, "Run snippet everywhere".
 * - Disables XML-RPC (password brute-force vector; nothing on this site uses it).
 * - Hides usernames from logged-out visitors (REST users endpoint, ?author=N scans, author sitemap).
 */
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'xmlrpc_methods', '__return_empty_array' );
add_action( 'init', function () {
	if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) {
		status_header( 403 );
		exit;
	}
}, 0 );
add_filter( 'wp_headers', function ( $headers ) {
	unset( $headers['X-Pingback'] );
	return $headers;
} );
add_filter( 'rest_endpoints', function ( $endpoints ) {
	if ( is_user_logged_in() ) return $endpoints;
	foreach ( array_keys( $endpoints ) as $route ) {
		if ( 0 === strpos( $route, '/wp/v2/users' ) ) unset( $endpoints[ $route ] );
	}
	return $endpoints;
} );
add_action( 'template_redirect', function () {
	if ( ! is_user_logged_in() && ( is_author() || isset( $_GET['author'] ) ) ) {
		wp_safe_redirect( home_url( '/' ), 301 );
		exit;
	}
} );
add_filter( 'wp_sitemaps_add_provider', function ( $provider, $name ) {
	return 'users' === $name ? false : $provider;
}, 10, 2 );
