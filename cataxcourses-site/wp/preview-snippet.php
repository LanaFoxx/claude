/**
 * CTC Elementor preview + page-by-page go-live (temporary, remove when Oxygen is switched off).
 * While Oxygen is active it renders every page itself. This bypasses Oxygen and renders Elementor
 * canvas, wrapped in the Elementor header/footer library templates, for:
 *   - PRIVATE pages that use an Elementor page template (previews, admins only),
 *   - pages listed in CTC_LIVE_PAGES (switched live one at a time; e.g. the homepage), and
 *   - Elementor library templates while they are open in the Elementor editor.
 * Every other page keeps rendering with Oxygen. ROLLBACK for a live page: remove its ID below.
 */
if ( ! defined( 'CTC_HEADER_ID' ) ) define( 'CTC_HEADER_ID', __CTC_HEADER_ID__ );
if ( ! defined( 'CTC_FOOTER_ID' ) ) define( 'CTC_FOOTER_ID', __CTC_FOOTER_ID__ );
function ctc_live_pages() { return array( __CTC_LIVE_PAGES__ ); }

function ctc_is_elementor_preview_page() {
	$id = get_queried_object_id();
	if ( ! $id ) return false;
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
function ctc_preview_part( $tpl ) {
	if ( ! ctc_is_elementor_preview_page() || is_singular( 'elementor_library' ) ) return;
	if ( 'elementor_header_footer' !== get_post_meta( get_queried_object_id(), '_wp_page_template', true ) ) return;
	if ( $tpl && class_exists( '\Elementor\Plugin' ) ) echo \Elementor\Plugin::instance()->frontend->get_builder_content_for_display( $tpl, true );
}
add_action( 'elementor/page_templates/canvas/before_content', function () { ctc_preview_part( CTC_HEADER_ID ); } );
add_action( 'elementor/page_templates/canvas/after_content', function () { ctc_preview_part( CTC_FOOTER_ID ); } );
