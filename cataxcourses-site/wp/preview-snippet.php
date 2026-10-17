/**
 * CTC Elementor preview + page-by-page go-live (temporary, remove when Oxygen is switched off).
 * While Oxygen is active it renders every page itself. This bypasses Oxygen and renders Elementor
 * canvas, wrapped in the Elementor header/footer library templates, for:
 *   - PRIVATE pages that use an Elementor page template (previews, admins only),
 *   - pages listed in ctc_live_pages() (switched live one at a time),
 *   - WooCommerce products listed in ctc_product_templates() (product id => Elementor template id;
 *     the product itself is not modified, its design lives in the template),
 *   - Elementor library templates while they are open in the Elementor editor.
 * Every other page keeps rendering with Oxygen. ROLLBACK: remove the page / product ID below.
 */
if ( ! defined( 'CTC_HEADER_ID' ) ) define( 'CTC_HEADER_ID', __CTC_HEADER_ID__ );
if ( ! defined( 'CTC_FOOTER_ID' ) ) define( 'CTC_FOOTER_ID', __CTC_FOOTER_ID__ );
function ctc_live_pages() { return array( __CTC_LIVE_PAGES__ ); }
function ctc_product_templates() { return array( __CTC_PRODUCT_TEMPLATES__ ); }

function ctc_product_template_id() {
	if ( ! is_singular( 'product' ) ) return 0;
	$map = ctc_product_templates();
	$id  = get_queried_object_id();
	return isset( $map[ $id ] ) ? (int) $map[ $id ] : 0;
}
function ctc_is_elementor_preview_page() {
	$id = get_queried_object_id();
	if ( ! $id ) return false;
	if ( ctc_product_template_id() ) return true;
	if ( is_singular( 'elementor_library' ) ) return isset( $_GET['elementor-preview'] ) && current_user_can( 'edit_post', $id );
	if ( ! is_singular( 'page' ) && ! is_front_page() ) return false;
	$tpl = get_post_meta( $id, '_wp_page_template', true );
	if ( ! in_array( $tpl, array( 'elementor_canvas', 'elementor_header_footer' ), true ) ) return false;
	if ( 'builder' !== get_post_meta( $id, '_elementor_edit_mode', true ) ) return false;
	if ( in_array( $id, array_map( 'intval', ctc_live_pages() ), true ) ) return true;
	return 'private' === get_post_status( $id ) || ( isset( $_GET['elementor-preview'] ) && current_user_can( 'edit_post', $id ) );
}
add_filter( 'template_include', function ( $template ) {
	if ( ! defined( 'ELEMENTOR_PATH' ) || ! ctc_is_elementor_preview_page() ) return $template;
	return ELEMENTOR_PATH . 'modules/page-templates/templates/canvas.php';
}, 1000 );
function ctc_with_header_footer() {
	if ( ! ctc_is_elementor_preview_page() || is_singular( 'elementor_library' ) ) return false;
	return ctc_product_template_id() || 'elementor_header_footer' === get_post_meta( get_queried_object_id(), '_wp_page_template', true );
}
function ctc_render_template( $tpl ) {
	if ( $tpl && class_exists( '\Elementor\Plugin' ) ) echo \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $tpl, true );
}
add_action( 'elementor/page_templates/canvas/before_content', function () {
	if ( ! ctc_with_header_footer() ) return;
	ctc_render_template( CTC_HEADER_ID );
	ctc_render_template( ctc_product_template_id() ); // course page design (products only)
} );
add_action( 'elementor/page_templates/canvas/after_content', function () {
	if ( ctc_with_header_footer() ) ctc_render_template( CTC_FOOTER_ID );
} );
// Products: the design replaces the product description output; keep WooCommerce's product schema.
add_filter( 'the_content', function ( $content ) {
	return ( ctc_product_template_id() && in_the_loop() && is_main_query() ) ? '' : $content;
}, 999 );
add_action( 'wp', function () {
	$tpl = ctc_product_template_id();
	if ( ! $tpl || ! function_exists( 'WC' ) || ! WC()->structured_data ) return;
	$product = wc_get_product( get_queried_object_id() );
	if ( $product ) WC()->structured_data->generate_product_data( $product );
} );
// Order links (/checkout/?add-to-cart=ID): don't add a second copy of a package already in the cart.
add_filter( 'woocommerce_add_to_cart_validation', function ( $passed, $product_id, $quantity, $variation_id = 0 ) {
	if ( ! $passed || empty( $_GET['add-to-cart'] ) || ! WC()->cart ) return $passed;
	$want = $variation_id ? (int) $variation_id : (int) $product_id;
	foreach ( WC()->cart->get_cart() as $item ) {
		$have = ! empty( $item['variation_id'] ) ? (int) $item['variation_id'] : (int) $item['product_id'];
		if ( $have === $want ) return false;
	}
	return $passed;
}, 20, 4 );
