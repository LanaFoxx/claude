/**
 * CTC admin menu (Code Snippets, scope: admin).
 *
 * Left-hand admin menu for administrators in three sections:
 *   (top)        Dashboard, Orders, Products, Coupons
 *   Development  Elementor, Pages, Posts, Appearance, Settings, Tools, Plugins, Media
 *   Other        everything else, in WordPress's usual order
 * Orders and Coupons (normally under WooCommerce) get their own top-level items. Nothing is removed.
 */
function ctc_am_applies() { return current_user_can( 'manage_options' ); }

function ctc_am_orders_url() {
	$hpos = class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
	return $hpos ? 'admin.php?page=wc-orders' : 'edit.php?post_type=shop_order';
}

add_action( 'admin_menu', function () {
	global $menu;
	if ( ! ctc_am_applies() ) return;
	add_menu_page( 'Orders', 'Orders', 'edit_shop_orders', ctc_am_orders_url(), '', 'dashicons-cart', 3 );
	add_menu_page( 'Coupons', 'Coupons', 'edit_shop_coupons', 'edit.php?post_type=shop_coupon', '', 'dashicons-tickets-alt', 4 );
	// WordPress's own separators are replaced by the two labelled section headings.
	foreach ( $menu as $k => $item ) if ( ! empty( $item[4] ) && false !== strpos( $item[4], 'wp-menu-separator' ) ) unset( $menu[ $k ] );
	$menu[] = array( '', 'read', 'ctc-sep-dev', '', 'wp-menu-separator ctc-am-head ctc-am-dev' );
	$menu[] = array( '', 'read', 'ctc-sep-other', '', 'wp-menu-separator ctc-am-head ctc-am-other' );
}, 9999 );

add_filter( 'custom_menu_order', function ( $on ) { return ctc_am_applies() ? true : $on; } );
add_filter( 'menu_order', function ( $order ) {
	global $menu;
	if ( ! ctc_am_applies() ) return $order;
	$titles = array();
	foreach ( $menu as $item ) $titles[ $item[2] ] = trim( wp_strip_all_tags( preg_replace( '#<span.*$#s', '', (string) $item[0] ) ) );
	$find = function ( $want ) use ( $titles ) { return array_keys( array_filter( $titles, function ( $t ) use ( $want ) { return 0 === strcasecmp( $t, $want ); } ) ); }; // all matches (Elementor has two top-level items)
	$top  = array_filter( array( 'index.php', ctc_am_orders_url(), 'edit.php?post_type=product', 'edit.php?post_type=shop_coupon' ), function ( $s ) use ( $titles ) { return isset( $titles[ $s ] ); } );
	$dev  = array_merge( ...array_map( $find, array( 'Elementor', 'Pages', 'Posts', 'Appearance', 'Settings', 'Tools', 'Plugins', 'Media' ) ) );
	$head = array_merge( array_values( $top ), array( 'ctc-sep-dev' ), array_values( $dev ), array( 'ctc-sep-other' ) );
	$rest = array_values( array_diff( $order, $head ) );
	return array_merge( $head, $rest );
}, 9999 );

add_action( 'admin_head', function () {
	if ( ! ctc_am_applies() ) return;
	echo '<style>
#adminmenu li.ctc-am-head{height:auto!important;margin:14px 0 4px!important;padding:0!important;cursor:default}
#adminmenu li.ctc-am-head .separator{height:auto!important;background:none!important;border-top:1px solid rgba(255,255,255,.12);padding:12px 12px 2px;margin:0}
#adminmenu li.ctc-am-head .separator::before{display:block;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#a7aaad}
#adminmenu li.ctc-am-dev .separator::before{content:"Development"}
#adminmenu li.ctc-am-other .separator::before{content:"Other"}
.folded #adminmenu li.ctc-am-head .separator::before{content:"";}
</style>';
} );
