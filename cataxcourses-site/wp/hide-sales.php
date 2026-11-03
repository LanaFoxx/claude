/**
 * CTC hide sales (Code Snippets, scope: global).
 *
 * Full administrators listed in the option ctc_hide_sales_users (default: Clint Butler, user #29) keep every admin
 * permission except the ones that show money: orders, sales reports / Analytics, customers, payments settings and
 * Stripe keys, Stripe disputes, abandoned carts, auto-renewal billing, and the WooCommerce dashboard sales widget.
 * Products, coupons, pages, posts, SEO, Elementor, settings, plugins and users stay available.
 * Because the permissions are removed (not just hidden), direct links and the REST API are refused too.
 */
function ctc_hs_users() { return array_map( 'intval', (array) get_option( 'ctc_hide_sales_users', array( 29 ) ) ); }
function ctc_hs_applies( $user_id = 0 ) {
	$user_id = $user_id ?: get_current_user_id();
	return $user_id && in_array( (int) $user_id, ctc_hs_users(), true );
}

// Money-related capabilities removed for these users.
function ctc_hs_blocked_caps() {
	return array(
		'manage_woocommerce', 'view_woocommerce_reports', 'ctc_view_disputes',
		'edit_shop_orders', 'edit_others_shop_orders', 'publish_shop_orders', 'read_private_shop_orders', 'delete_shop_orders',
		'delete_private_shop_orders', 'delete_published_shop_orders', 'delete_others_shop_orders', 'edit_private_shop_orders',
		'edit_published_shop_orders', 'edit_shop_order', 'read_shop_order', 'delete_shop_order',
		'edit_shop_order_terms', 'manage_shop_order_terms', 'delete_shop_order_terms', 'assign_shop_order_terms',
		'edit_shop_subscriptions', 'read_private_shop_subscriptions', 'edit_shop_subscription', 'read_shop_subscription',
	);
}
add_filter( 'user_has_cap', function ( $allcaps, $caps, $args, $user ) {
	if ( empty( $user->ID ) || ! ctc_hs_applies( $user->ID ) ) return $allcaps;
	foreach ( ctc_hs_blocked_caps() as $c ) $allcaps[ $c ] = false;
	return $allcaps;
}, 999, 4 );

// Meta caps for single orders (edit/read/delete one order) map to the blocked caps above; refuse them outright as well.
add_filter( 'map_meta_cap', function ( $caps, $cap, $user_id ) {
	if ( ctc_hs_applies( $user_id ) && preg_match( '/shop_order|shop_subscription/', $cap ) ) return array( 'do_not_allow' );
	return $caps;
}, 999, 3 );

// Menus and pages that show money but are gated by other permissions.
add_action( 'admin_menu', function () {
	if ( ! ctc_hs_applies() ) return;
	foreach ( array( 'woocommerce', 'wc-admin&path=/analytics/overview', 'wc-reports', 'ctc-disputes', 'admin.php?page=wc-orders', 'edit.php?post_type=shop_order' ) as $slug ) remove_menu_page( $slug );
	remove_submenu_page( 'woocommerce', 'wc-orders' );
}, 99999 );
add_action( 'wp_dashboard_setup', function () {
	if ( ! ctc_hs_applies() ) return;
	remove_meta_box( 'woocommerce_dashboard_status', 'dashboard', 'normal' );
	remove_meta_box( 'wc_admin_dashboard_setup', 'dashboard', 'normal' );
}, 99999 );
add_action( 'admin_init', function () {
	if ( ! ctc_hs_applies() || wp_doing_ajax() ) return;
	$page = sanitize_key( $_GET['page'] ?? '' );
	$type = sanitize_key( $_GET['post_type'] ?? '' );
	$blocked = in_array( $page, array( 'wc-orders', 'wc-reports', 'wc-admin', 'wc-settings', 'wc-status', 'ctc-disputes', 'ctc-auto-renewal', 'ctc-ar-students', 'ctc-abandoned-carts', 'wc-subscriptions' ), true )
		|| in_array( $type, array( 'shop_order', 'shop_subscription' ), true );
	if ( $blocked ) { wp_safe_redirect( admin_url() ); exit; }
} );
// WooCommerce's own REST routes for orders, reports and Analytics.
add_filter( 'rest_pre_dispatch', function ( $result, $server, $request ) {
	if ( ! ctc_hs_applies() ) return $result;
	if ( preg_match( '#^/(wc/v\d|wc-analytics|wc-admin)/(orders|reports|customers|leaderboards|payment|refunds|subscriptions)#', $request->get_route() ) || preg_match( '#^/ctc/v1/(disputes|orders-20)#', $request->get_route() ) ) {
		return new WP_Error( 'rest_forbidden', 'Not available for this account.', array( 'status' => 403 ) );
	}
	return $result;
}, 10, 3 );
// Admin bar: no WooCommerce / order shortcuts.
add_action( 'admin_bar_menu', function ( $bar ) {
	if ( ! ctc_hs_applies() ) return;
	foreach ( array( 'woocommerce-site-visibility-badge', 'new-shop_order', 'wc-admin', 'ctc-disputes' ) as $n ) $bar->remove_node( $n );
}, 99999 );
// This restriction lives in a Code Snippet: keep these users out of the Snippets screens so it is not switched off by accident.
add_filter( 'code_snippets_cap', function ( $cap ) { return ctc_hs_applies() ? 'do_not_allow' : $cap; } );
add_filter( 'code_snippets/cap', function ( $cap ) { return ctc_hs_applies() ? 'do_not_allow' : $cap; } );
// Check (site admins): /wp-admin/?ctc_hs_check=29 lists what that user can and cannot do.
add_action( 'admin_init', function () {
	if ( empty( $_GET['ctc_hs_check'] ) || ! current_user_can( 'manage_options' ) || ctc_hs_applies() ) return;
	$uid = absint( $_GET['ctc_hs_check'] );
	$out = array( 'user' => $uid, 'restricted' => ctc_hs_applies( $uid ), 'roles' => get_userdata( $uid )->roles ?? array() );
	foreach ( array( 'manage_options', 'activate_plugins', 'edit_pages', 'edit_products', 'edit_shop_coupons', 'manage_woocommerce', 'view_woocommerce_reports', 'edit_shop_orders', 'read_private_shop_orders', 'ctc_view_disputes' ) as $c ) $out['can'][ $c ] = user_can( $uid, $c );
	wp_send_json( $out );
} );
