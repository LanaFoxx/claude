/**
 * CTC plugin audit (Code Snippets, scope: admin). Read-only: site admins open /wp-admin/?ctc_audit=1 for a JSON report of
 * how each plugin is configured and used. Changes nothing.
 */
add_action( 'admin_init', function () {
	if ( empty( $_GET['ctc_audit'] ) || ! current_user_can( 'manage_options' ) ) return;
	$out = array();
	try {
	global $wpdb;
	$o   = function ( $k ) { $v = get_option( $k, null ); return $v; };
	$cnt = function ( $sql ) use ( $wpdb ) { return (int) $wpdb->get_var( $sql ); };
	$like = function ( $s ) use ( $wpdb ) { return '%' . $wpdb->esc_like( $s ) . '%'; };
	// Payment gateways enabled at checkout, and what recent orders were paid with.
	$gw = array();
	if ( function_exists( 'WC' ) ) foreach ( WC()->payment_gateways()->payment_gateways() as $id => $g ) if ( 'yes' === $g->enabled ) $gw[] = $id . ' (' . $g->get_title() . ')';
	$out['gateways_enabled'] = $gw;
	$pm = array();
	foreach ( wc_get_orders( array( 'type' => 'shop_order', 'limit' => 400, 'date_created' => '>' . ( time() - 365 * DAY_IN_SECONDS ), 'return' => 'objects' ) ) as $ord ) { $k = $ord->get_payment_method() ?: '(none)'; $pm[ $k ] = ( $pm[ $k ] ?? 0 ) + 1; }
	$out['orders_last_year_by_method'] = $pm;
	// Subscriptions.
	$out['subscriptions'] = function_exists( 'wcs_get_subscriptions' ) ? array( 'active' => count( wcs_get_subscriptions( array( 'subscription_status' => 'active', 'subscriptions_per_page' => -1, 'return' => 'ids' ) ) ), 'all' => count( wcs_get_subscriptions( array( 'subscriptions_per_page' => -1, 'subscription_status' => 'any', 'return' => 'ids' ) ) ) ) : 'n/a';
	$out['subscription_products'] = $cnt( "SELECT COUNT(*) FROM {$wpdb->posts} p JOIN {$wpdb->term_relationships} tr ON tr.object_id=p.ID JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id=tr.term_taxonomy_id JOIN {$wpdb->terms} t ON t.term_id=tt.term_id WHERE p.post_type='product' AND p.post_status='publish' AND tt.taxonomy='product_type' AND t.slug IN ('subscription','variable-subscription')" );
	// WooPayments.
	$wcpay = $o( 'woocommerce_woocommerce_payments_settings' );
	$out['woopayments'] = array( 'enabled' => $wcpay['enabled'] ?? '', 'account' => (bool) $o( 'wcpay_account_data' ) );
	// Stripe plugins.
	$s = $o( 'woocommerce_stripe_settings' ); $out['wc_stripe'] = array( 'enabled' => $s['enabled'] ?? '', 'testmode' => $s['testmode'] ?? '', 'has_key' => ! empty( $s['secret_key'] ) );
	$e = $o( 'woocommerce_eh_stripe_pay_settings' ); $out['eh_stripe'] = array( 'enabled' => $e['enabled'] ?? '', 'has_key' => ! empty( $e['eh_stripe_secret_key'] ) || ! empty( $e['secret_key'] ) );
	$out['orders_eh_stripe_tokens'] = $cnt( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->usermeta} WHERE meta_key LIKE %s", $like( 'eh_stripe' ) ) );
	// Product Options for WooCommerce: products that use it.
	$out['product_options_meta'] = $wpdb->get_results( $wpdb->prepare( "SELECT meta_key, COUNT(*) n FROM {$wpdb->postmeta} WHERE meta_key LIKE %s OR meta_key LIKE %s GROUP BY meta_key", $like( 'pofw' ), $like( 'product_option' ) ) );
	$out['product_options_tables'] = $wpdb->get_col( $wpdb->prepare( 'SHOW TABLES LIKE %s', $like( 'pofw' ) ) );
	// Direct checkout, thank-you redirect, order status control.
	foreach ( $wpdb->get_results( "SELECT option_name, LEFT(option_value, 300) v FROM {$wpdb->options} WHERE option_name LIKE 'qlwcdc%' OR option_name LIKE 'wc_thanks%' OR option_name LIKE 'wctr%' OR option_name LIKE 'bv_order%' OR option_name LIKE 'bvos%' OR option_name LIKE '%order_status_control%' OR option_name LIKE 'woocommerce_order_status_control%'" ) as $r ) $out['opts'][ $r->option_name ] = $r->v;
	$out['thanks_redirect_product_meta'] = $cnt( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key LIKE %s AND meta_value <> ''", $like( 'thanks' ) ) );
	// Mandrill.
	$mx = $o( 'wpmandrill' ); $out['mandrill'] = is_array( $mx ) ? array( 'has_api_key' => ! empty( $mx['api_key'] ), 'from' => $mx['from_username'] ?? '', 'keys' => array_keys( $mx ) ) : $mx;
	// YayMail.
	$out['yaymail_templates'] = $cnt( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type IN ('yaymail_template','yaymail-template') AND post_status <> 'trash'" );
	$out['yaymail_template_types'] = $wpdb->get_col( "SELECT DISTINCT post_type FROM {$wpdb->posts} WHERE post_type LIKE '%yaymail%'" );
	// Mailchimp for WooCommerce / Omnisend.
	$out['mailchimp_wc'] = array( 'store_id' => (bool) $o( 'mailchimp-woocommerce-store_id' ), 'connected' => (bool) ( $o( 'mailchimp-woocommerce' )['mailchimp_api_key'] ?? '' ), 'list' => $o( 'mailchimp-woocommerce' )['mailchimp_list'] ?? '' );
	$out['omnisend'] = array( 'api_key' => (bool) $o( 'omnisend_api_key' ), 'account_id' => (bool) $o( 'omnisend_account_id' ), 'last_sync' => $o( 'omnisend_last_sync' ) );
	// GA plugin, Pixel Manager.
	$ga = $o( 'gap_options' ); $out['ga_google_analytics'] = is_array( $ga ) ? array( 'tracking_id' => $ga['gap_id'] ?? '', 'enabled' => $ga['gap_enable'] ?? '' ) : $ga;
	$pmo = $o( 'wgact_plugin_options' ); $out['pixel_manager'] = is_array( $pmo ) ? array( 'google_ads' => $pmo['google']['ads']['conversion_id'] ?? '', 'ga4' => $pmo['google']['analytics']['ga4']['measurement_id'] ?? '', 'meta' => $pmo['facebook']['pixel_id'] ?? '' ) : $pmo;
	// LiveChat plugin.
	foreach ( $wpdb->get_results( "SELECT option_name, LEFT(option_value,120) v FROM {$wpdb->options} WHERE option_name LIKE 'livechat%' OR option_name LIKE 'wp_live_chat%' OR option_name LIKE 'lc_%'" ) as $r ) $out['livechat'][ $r->option_name ] = strlen( $r->v ) > 0 ? '(set)' : '';
	// Order export: saved profiles / schedules.
	foreach ( $wpdb->get_results( "SELECT option_name, LENGTH(option_value) n FROM {$wpdb->options} WHERE option_name LIKE 'woe_%'" ) as $r ) $out['order_export'][ $r->option_name ] = $r->n;
	$out['order_export_cron'] = array_values( array_filter( array_keys( _get_cron_array() ? call_user_func_array( 'array_merge', array_values( _get_cron_array() ) ) : array() ), function ( $h ) { return false !== strpos( $h, 'woe' ); } ) );
	// HFCM snippets.
	$t = $wpdb->prefix . 'hfcm_scripts';
	if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $t ) ) === $t ) $out['hfcm'] = $wpdb->get_results( ! empty( $_GET['full'] ) ? "SELECT * FROM $t" : "SELECT script_id, name, status, location, display_on, LEFT(snippet, 400) code FROM $t" );
	// Duplicate Page / AIO migration backups.
	$out['aiowm_backups'] = is_dir( WP_CONTENT_DIR . '/ai1wm-backups' ) ? count( glob( WP_CONTENT_DIR . '/ai1wm-backups/*.wpress' ) ) : 0;
	// Shortcodes in use from plugins.
	foreach ( array( 'hfcm', 'livechat', 'yaymail', 'woocommerce_checkout', 'moodleauth', 'mc4wp', 'omnisend' ) as $sc ) $out['shortcode_use'][ $sc ] = $cnt( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_status='publish' AND (post_content LIKE %s) ", $like( '[' . $sc ) ) ) + $cnt( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key='_elementor_data' AND meta_value LIKE %s", $like( '[' . $sc ) ) );
	$out['yoast_premium'] = array( 'version' => defined( 'WPSEO_PREMIUM_VERSION' ) ? WPSEO_PREMIUM_VERSION : '', 'redirects' => count( (array) get_option( 'wpseo-premium-redirects-base', array() ) ) );
	$out['subs_methods'] = function_exists( 'wcs_get_subscriptions' ) ? array_map( function ( $x ) { return $x->get_payment_method() . ' / ' . $x->get_status() . ' / next ' . $x->get_date( 'next_payment' ); }, array_values( wcs_get_subscriptions( array( 'subscriptions_per_page' => -1, 'subscription_status' => 'any' ) ) ) ) : array();
	foreach ( $out['product_options_tables'] as $tb ) $out['pofw_rows'][ $tb ] = $cnt( "SELECT COUNT(*) FROM `$tb`" );
	$out['pofw_products'] = $wpdb->get_col( "SELECT DISTINCT product_id FROM {$wpdb->prefix}pofw_product_option" );
	$out['eh_refundable_recent'] = $cnt( "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = '_payment_method' AND meta_value LIKE 'eh_%'" );
	$out['last_eh_order'] = $wpdb->get_var( "SELECT MAX(p.post_date) FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON m.post_id=p.ID AND m.meta_key='_payment_method' AND m.meta_value LIKE 'eh_%'" );
	$hpos = $wpdb->prefix . 'wc_orders';
	if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $hpos ) ) === $hpos ) $out['last_eh_order_hpos'] = $wpdb->get_var( "SELECT MAX(date_created_gmt) FROM $hpos WHERE payment_method LIKE 'eh_%'" );
	$out['last_wcpay_order'] = $wpdb->get_var( "SELECT MAX(date_created_gmt) FROM $hpos WHERE payment_method LIKE 'woocommerce_payments%'" );
	$out['all_time_methods'] = $wpdb->get_results( "SELECT meta_value m, COUNT(*) n, MAX(p.post_date) last FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID=pm.post_id WHERE pm.meta_key='_payment_method' AND p.post_type='shop_order' GROUP BY meta_value" );
	$out['wcpay_meta'] = $cnt( "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key IN ('_wcpay_intent_currency','_intention_status','_charge_id','_wcpay_payment_method') " );
	$out['wcpay_tokens'] = $cnt( "SELECT COUNT(*) FROM {$wpdb->prefix}woocommerce_payment_tokens WHERE gateway_id LIKE 'woocommerce_payments%'" );
	$out['wcpay_subscriptions'] = $cnt( "SELECT COUNT(*) FROM {$wpdb->postmeta} pm JOIN {$wpdb->posts} p ON p.ID=pm.post_id WHERE p.post_type='shop_subscription' AND pm.meta_key='_payment_method' AND pm.meta_value LIKE 'woocommerce_payments%'" );
	$out['pofw_any_meta'] = $wpdb->get_col( "SELECT DISTINCT meta_key FROM {$wpdb->postmeta} WHERE meta_key LIKE '%pofw%' OR meta_key LIKE '%product_option%' LIMIT 20" );
	$out['pofw_orderitem_meta'] = $cnt( "SELECT COUNT(*) FROM {$wpdb->prefix}woocommerce_order_itemmeta WHERE meta_key LIKE '%pofw%' OR meta_key LIKE '%option%'" );
	$out['pofw_tables_all'] = $wpdb->get_col( "SHOW TABLES LIKE '%pofw%'" );
	$out['gap_full'] = get_option( 'gap_options' );
	$cfg = ABSPATH . 'wp-config.php'; if ( ! file_exists( $cfg ) ) $cfg = dirname( ABSPATH ) . '/wp-config.php';
	$out['perf'] = array( 'SCRIPT_DEBUG' => defined( 'SCRIPT_DEBUG' ) ? SCRIPT_DEBUG : 'undef', 'WP_DEBUG' => WP_DEBUG, 'WP_CACHE' => defined( 'WP_CACHE' ) ? WP_CACHE : 'undef', 'CONCATENATE_SCRIPTS' => defined( 'CONCATENATE_SCRIPTS' ) ? CONCATENATE_SCRIPTS : 'undef',
		'php' => PHP_VERSION, 'server' => $_SERVER['SERVER_SOFTWARE'] ?? '', 'opcache' => function_exists( 'opcache_get_status' ) && ( $st = @opcache_get_status( false ) ) ? ! empty( $st['opcache_enabled'] ) : false,
		'object_cache' => wp_using_ext_object_cache(), 'config_writable' => is_writable( $cfg ), 'htaccess_writable' => is_writable( ABSPATH . '.htaccess' ), 'content_writable' => is_writable( WP_CONTENT_DIR ),
		'config_debug_lines' => preg_grep( '/SCRIPT_DEBUG|WP_DEBUG|WP_CACHE|WP_MEMORY/', file( $cfg ) ?: array() ), 'memory' => WP_MEMORY_LIMIT, 'autoload_kb' => round( $wpdb->get_var( "SELECT SUM(LENGTH(option_value)) FROM {$wpdb->options} WHERE autoload IN ('yes','on','auto-on','auto')" ) / 1024 ),
		'mods' => function_exists( 'apache_get_modules' ) ? array_values( array_filter( apache_get_modules(), function ( $m ) { return preg_match( '/rewrite|deflate|expires|headers|http2|brotli|cache/', $m ); } ) ) : 'n/a' );
	} catch ( Throwable $e ) { $out['ERROR'] = $e->getMessage() . ' line ' . $e->getLine(); }
	wp_send_json( $out );
} );

// One-time config fix (site admins): /wp-admin/?ctc_cfg=scriptdebug_off sets SCRIPT_DEBUG to false in wp-config.php
// (debug mode was serving the large unminified copies of WordPress / Elementor scripts). Backup: wp-config.php.ctc-bak-20261105
add_action( 'admin_init', function () {
	if ( 'scriptdebug_off' !== ( $_GET['ctc_cfg'] ?? '' ) || ! current_user_can( 'manage_options' ) ) return;
	$cfg = ABSPATH . 'wp-config.php'; if ( ! file_exists( $cfg ) ) $cfg = dirname( ABSPATH ) . '/wp-config.php';
	$src = file_get_contents( $cfg );
	$new = preg_replace( "/^define\\(\\s*'SCRIPT_DEBUG',\\s*true\\s*\\);/m", "define( 'SCRIPT_DEBUG', false ); // CTC 2026-11-05: debug scripts off (speed)", $src, 1, $n );
	if ( ! $n ) wp_send_json( array( 'changed' => false, 'note' => 'no active SCRIPT_DEBUG true line' ) );
	if ( ! file_exists( $cfg . '.ctc-bak-20261105' ) ) copy( $cfg, $cfg . '.ctc-bak-20261105' );
	$ok = false !== file_put_contents( $cfg, $new );
	wp_send_json( array( 'changed' => $ok, 'backup' => file_exists( $cfg . '.ctc-bak-20261105' ) ) );
} );
// Elementor performance settings (site admins): /wp-admin/?ctc_el=show lists them, =apply turns on the speed settings.
add_action( 'admin_init', function () {
	$a = sanitize_key( $_GET['ctc_el'] ?? '' );
	if ( ! $a || ! current_user_can( 'manage_options' ) ) return;
	global $wpdb;
	$want = array(
		'elementor_css_print_method' => 'external', 'elementor_font_display' => 'swap', 'elementor_local_google_fonts' => '1',
		'elementor_optimized_image_loading' => '1', 'elementor_optimized_gutenberg_loading' => '1', 'elementor_lazy_load_background_images' => '1',
		'elementor_load_fa4_shim' => '', 'elementor_element_cache_ttl' => '24',
		'elementor_experiment-e_font_icon_svg' => 'active', 'elementor_experiment-e_optimized_markup' => 'active', 'elementor_experiment-e_element_cache' => 'active',
		'elementor_experiment-additional_custom_breakpoints' => 'active',
	);
	$out = array();
	foreach ( $wpdb->get_results( "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'elementor_experiment-%' OR option_name IN ('" . implode( "','", array_map( 'esc_sql', array_keys( $want ) ) ) . "')" ) as $r ) $out['now'][ $r->option_name ] = $r->option_value;
	if ( 'apply' === $a ) {
		foreach ( $want as $k => $v ) update_option( $k, $v );
		if ( class_exists( '\Elementor\Plugin' ) ) \Elementor\Plugin::$instance->files_manager->clear_cache();
		$out['applied'] = $want;
	}
	wp_send_json( $out );
} );
