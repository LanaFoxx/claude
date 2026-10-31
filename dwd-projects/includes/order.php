<?php
/**
 * Projects → Order: drag and drop the projects into the order they appear in the portfolio,
 * homepage carousel and project numbers (01, 02…). Pinned projects stay at the top.
 */
defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', function () {
	add_submenu_page( 'edit.php?post_type=' . DWDP_CPT, 'Project order', 'Order', 'edit_posts', 'dwdp-order', 'dwdp_order_page' );
} );

function dwdp_order_page() {
	$all    = get_posts(
		array(
			'post_type'      => DWDP_CPT,
			'post_status'    => array( 'publish', 'draft', 'pending', 'private' ),
			'posts_per_page' => -1,
			'orderby'        => array( 'menu_order' => 'ASC', 'date' => 'ASC' ),
		)
	);
	$pinned = array_filter( $all, function ( $p ) { return '1' === (string) dwdp_get( $p->ID, 'pinned' ); } );
	$rest   = array_diff_key( $all, $pinned );
	$row    = function ( $p, $locked ) {
		$cover = absint( dwdp_get( $p->ID, 'cover' ) );
		$img   = $cover ? wp_get_attachment_image_src( $cover, 'thumbnail' ) : false;
		$label = dwdp_get( $p->ID, 'industry' );
		printf(
			'<li class="dwdp-ord%1$s" data-id="%2$d"><span class="dwdp-ord-h dashicons %3$s"></span><span class="dwdp-ord-n"></span>%4$s<span class="dwdp-ord-t"><b>%5$s</b>%6$s</span>%7$s<a class="dwdp-ord-e" href="%8$s">Edit</a></li>',
			$locked ? ' is-pinned' : '',
			(int) $p->ID,
			$locked ? 'dashicons-sticky' : 'dashicons-menu',
			$img ? '<img src="' . esc_url( $img[0] ) . '" alt="">' : '<span class="dwdp-ord-noimg"></span>',
			esc_html( get_the_title( $p ) ),
			$label ? '<em>' . esc_html( $label ) . '</em>' : '',
			'publish' !== $p->post_status ? '<span class="dwdp-ord-s">' . esc_html( ucfirst( $p->post_status ) ) . '</span>' : ( $locked ? '<span class="dwdp-ord-s">Pinned first</span>' : '' ),
			esc_url( get_edit_post_link( $p->ID ) )
		);
	};
	?>
	<div class="wrap">
		<h1>Project order</h1>
		<p>Drag the projects into the order you want. This is the order on the Portfolio page and in the homepage carousel, and it sets each project's number (01, 02…). Pinned projects always stay first; unpin one in its project settings to move it.</p>
		<ul id="dwdp-order-list" class="dwdp-order-list">
			<?php foreach ( $pinned as $p ) { $row( $p, true ); } ?>
			<?php foreach ( $rest as $p ) { $row( $p, false ); } ?>
		</ul>
		<p><button type="button" class="button button-primary button-large" id="dwdp-order-save">Save order</button> <span id="dwdp-order-status" class="description"></span></p>
	</div>
	<style>
		.dwdp-order-list{max-width:760px;margin:18px 0}
		.dwdp-ord{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #dcdcde;border-radius:6px;padding:10px 14px;margin:0 0 8px;cursor:grab}
		.dwdp-ord.is-pinned{cursor:default;background:#f6f7f7}
		.dwdp-ord.ui-sortable-helper{box-shadow:0 8px 20px rgba(0,0,0,.15)}
		.dwdp-ord-placeholder{height:66px;border:2px dashed #72aee6;border-radius:6px;margin:0 0 8px;background:#f0f6fc}
		.dwdp-ord-h{color:#8c8f94}
		.dwdp-ord-n{width:26px;font-weight:600;color:#2271b1}
		.dwdp-ord img,.dwdp-ord-noimg{width:72px;height:46px;object-fit:cover;object-position:top;border-radius:4px;background:#f0f0f1;flex:none}
		.dwdp-ord-t{flex:1;display:flex;flex-direction:column}.dwdp-ord-t em{font-style:normal;color:#646970;font-size:12px}
		.dwdp-ord-s{font-size:12px;color:#646970;background:#f0f0f1;border-radius:10px;padding:2px 9px}
	</style>
	<script>
	jQuery(function ($) {
		var $l = $('#dwdp-order-list');
		function number() { $l.children('li').each(function (i) { $(this).find('.dwdp-ord-n').text(('0' + (i + 1)).slice(-2)); }); }
		$l.sortable({ items: '> li:not(.is-pinned)', handle: '', placeholder: 'dwdp-ord-placeholder', axis: 'y', update: function () { number(); $('#dwdp-order-status').text('Unsaved changes'); } });
		number();
		$('#dwdp-order-save').on('click', function () {
			var $b = $(this).prop('disabled', true), ids = $l.children('li').map(function () { return $(this).data('id'); }).get();
			$('#dwdp-order-status').text('Saving…');
			$.post(ajaxurl, { action: 'dwdp_save_order', nonce: '<?php echo esc_js( wp_create_nonce( 'dwdp_order' ) ); ?>', ids: ids }).done(function (r) {
				$('#dwdp-order-status').text(r && r.success ? 'Saved ✓ The site now shows this order.' : 'Could not save. Please try again.');
			}).fail(function () { $('#dwdp-order-status').text('Could not save. Please try again.'); }).always(function () { $b.prop('disabled', false); });
		});
	});
	</script>
	<?php
}

add_action( 'admin_enqueue_scripts', function ( $hook ) {
	if ( false !== strpos( $hook, 'dwdp-order' ) ) {
		wp_enqueue_script( 'jquery-ui-sortable' );
	}
} );

add_action( 'wp_ajax_dwdp_save_order', function () {
	check_ajax_referer( 'dwdp_order', 'nonce' );
	if ( ! current_user_can( 'edit_posts' ) ) {
		wp_send_json_error( null, 403 );
	}
	$ids = array_map( 'absint', isset( $_POST['ids'] ) ? (array) wp_unslash( $_POST['ids'] ) : array() );
	foreach ( $ids as $i => $id ) {
		if ( $id && DWDP_CPT === get_post_type( $id ) && current_user_can( 'edit_post', $id ) ) {
			wp_update_post( array( 'ID' => $id, 'menu_order' => $i + 1 ) );
		}
	}
	// Page caches hold the old order.
	do_action( 'dwdp_order_saved' );
	if ( function_exists( 'sg_cachepress_purge_cache' ) ) {
		sg_cachepress_purge_cache();
	}
	wp_send_json_success();
} );
