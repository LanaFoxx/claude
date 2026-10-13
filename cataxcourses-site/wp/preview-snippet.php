/**
 * CTC Elementor preview (temporary, remove at go-live).
 * While Oxygen is active it renders every page itself. For PRIVATE pages that use an
 * Elementor page template, render Elementor's canvas instead, wrapped in the draft
 * header/footer library templates. Public pages are never affected.
 */
function ctc_is_elementor_preview_page() {
	if ( ! is_singular( 'page' ) ) return false;
	$id = get_queried_object_id();
	if ( 'private' !== get_post_status( $id ) && ! isset( $_GET['elementor-preview'] ) ) return false;
	return in_array( get_post_meta( $id, '_wp_page_template', true ), array( 'elementor_canvas', 'elementor_header_footer' ), true );
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
