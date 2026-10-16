/**
 * CTC Elementor preview + page-by-page go-live (temporary, remove when Oxygen is switched off).
 * While Oxygen is active it renders every page itself. This bypasses Oxygen and renders Elementor
 * canvas, wrapped in the Elementor header/footer library templates, for:
 *   - PRIVATE pages that use an Elementor page template (previews, admins only), and
 *   - pages whose IDs are listed in the option `ctc_live_pages` (pages switched live one at a time,
 *     e.g. the homepage). Every other page keeps rendering with Oxygen.
 * Header/footer template IDs: options `ctc_preview_header` / `ctc_preview_footer`.
 */
function ctc_is_elementor_preview_page() {
	if ( ! is_singular( 'page' ) && ! is_front_page() ) return false;
	$id = get_queried_object_id();
	if ( ! $id ) return false;
	$tpl = get_post_meta( $id, '_wp_page_template', true );
	if ( ! in_array( $tpl, array( 'elementor_canvas', 'elementor_header_footer' ), true ) ) return false;
	if ( 'builder' !== get_post_meta( $id, '_elementor_edit_mode', true ) ) return false;
	$live = array_map( 'intval', (array) get_option( 'ctc_live_pages', array() ) );
	if ( in_array( $id, $live, true ) ) return true;
	return 'private' === get_post_status( $id ) || isset( $_GET['elementor-preview'] );
}
add_filter( 'template_include', function ( $template ) {
	if ( ! defined( 'ELEMENTOR_PATH' ) || ! ctc_is_elementor_preview_page() ) return $template;
	return ELEMENTOR_PATH . 'modules/page-templates/templates/canvas.php';
}, 1000 );
function ctc_preview_part( $key ) {
	if ( ! ctc_is_elementor_preview_page() || 'elementor_header_footer' !== get_post_meta( get_queried_object_id(), '_wp_page_template', true ) ) return;
	$tpl = (int) get_option( 'ctc_preview_' . $key );
	if ( $tpl && class_exists( '\Elementor\Plugin' ) ) echo \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $tpl, true );
}
add_action( 'elementor/page_templates/canvas/before_content', function () { ctc_preview_part( 'header' ); } );
add_action( 'elementor/page_templates/canvas/after_content', function () { ctc_preview_part( 'footer' ); } );
