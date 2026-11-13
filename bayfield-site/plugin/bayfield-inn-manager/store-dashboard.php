<?php
/**
 * Store boxes on the dashboard (WooCommerce):
 * - Orders & sales: sales and order counts for today / 7 / 30 days, orders waiting to be
 *   shipped, and the most recent orders.
 * - Inventory & prices: every product and size with its price and stock, editable in place.
 * - Add a product: name, price, sizes, stock, description and photos in one form.
 */
defined( 'ABSPATH' ) || exit;

const BI_PAID_STATUSES = array( 'processing', 'completed', 'on-hold' );
const BI_SIZES         = array( 'Small', 'Medium', 'Large', 'XL', 'XXL', 'XXXL' );

add_action( 'wp_dashboard_setup', function () {
	if ( ! bi_store_on() || ! current_user_can( 'edit_products' ) ) {
		return;
	}
	global $wp_meta_boxes;
	// Replace the old "Add a product" box (Square links) with the WooCommerce one.
	unset( $wp_meta_boxes['dashboard']['side']['core']['bi_dash_product'] );
	wp_add_dashboard_widget( 'bi_dash_orders', 'Store: orders & sales', 'bi_dash_orders' );
	wp_add_dashboard_widget( 'bi_dash_inventory', 'Inventory & prices', 'bi_dash_inventory' );
	wp_add_dashboard_widget( 'bi_dash_newproduct', 'Add a product', 'bi_dash_newproduct' );
	$normal = $wp_meta_boxes['dashboard']['normal']['core'];
	$first  = array( 'bi_dash_orders' => $normal['bi_dash_orders'], 'bi_dash_inventory' => $normal['bi_dash_inventory'] );
	$np     = $normal['bi_dash_newproduct'];
	unset( $normal['bi_dash_orders'], $normal['bi_dash_inventory'], $normal['bi_dash_newproduct'] );
	$wp_meta_boxes['dashboard']['normal']['core'] = $first + $normal; // phpcs:ignore -- store boxes first
	$wp_meta_boxes['dashboard']['side']['core']   = array( 'bi_dash_newproduct' => $np ) + $wp_meta_boxes['dashboard']['side']['core']; // phpcs:ignore
}, 10000 );

/* ------------------------------------------------------------------- data */
function bi_store_summary() {
	$tz    = wp_timezone();
	$now   = new DateTime( 'now', $tz );
	$start = array(
		'today' => ( clone $now )->setTime( 0, 0 ),
		'7'     => ( clone $now )->modify( '-6 days' )->setTime( 0, 0 ),
		'30'    => ( clone $now )->modify( '-29 days' )->setTime( 0, 0 ),
	);
	$orders = wc_get_orders( array( 'status' => BI_PAID_STATUSES, 'limit' => -1, 'type' => 'shop_order', 'date_created' => '>=' . $start['30']->getTimestamp() ) );
	$tiles  = array();
	foreach ( $start as $k => $from ) {
		$tiles[ $k ] = array( 'sales' => 0.0, 'orders' => 0 );
		foreach ( $orders as $o ) {
			if ( $o->get_date_created() && $o->get_date_created()->getTimestamp() >= $from->getTimestamp() ) {
				$tiles[ $k ]['sales'] += (float) $o->get_total() - (float) $o->get_total_refunded();
				$tiles[ $k ]['orders']++;
			}
		}
	}
	$recent = array();
	foreach ( wc_get_orders( array( 'limit' => 8, 'orderby' => 'date', 'order' => 'DESC', 'type' => 'shop_order', 'status' => array_keys( wc_get_order_statuses() ) ) ) as $o ) {
		$items = array();
		foreach ( $o->get_items() as $it ) {
			$items[] = $it->get_quantity() . '× ' . $it->get_name();
		}
		$recent[] = array(
			'id'     => $o->get_id(),
			'number' => $o->get_order_number(),
			'name'   => trim( $o->get_formatted_billing_full_name() ) ?: $o->get_billing_email(),
			'total'  => html_entity_decode( wp_strip_all_tags( wc_price( $o->get_total() ) ) ),
			'status' => wc_get_order_status_name( $o->get_status() ),
			'slug'   => $o->get_status(),
			'date'   => $o->get_date_created() ? $o->get_date_created()->date_i18n( 'M j, g:i a' ) : '',
			'items'  => implode( ', ', $items ),
			'pickup' => (bool) array_filter( $o->get_shipping_methods(), function ( $m ) { return 'local_pickup' === $m->get_method_id(); } ),
			'url'    => $o->get_edit_order_url(),
		);
	}
	$to_ship = count( wc_get_orders( array( 'status' => 'processing', 'limit' => -1, 'return' => 'ids', 'type' => 'shop_order' ) ) );
	return array( 'tiles' => $tiles, 'recent' => $recent, 'toShip' => $to_ship );
}

function bi_inventory_rows() {
	$rows = array();
	$all  = wc_get_products( array( 'status' => array( 'publish', 'draft', 'private' ), 'limit' => -1, 'orderby' => array( 'menu_order' => 'ASC', 'title' => 'ASC' ) ) );
	foreach ( $all as $p ) {
		if ( BI_GC_SKU === $p->get_sku() ) {
			continue;
		}
		$thumb = wp_get_attachment_image_src( $p->get_image_id(), 'thumbnail' );
		$items = $p->is_type( 'variable' ) ? array_filter( array_map( 'wc_get_product', $p->get_children() ) ) : array( $p );
		foreach ( $items as $v ) {
			$rows[] = array(
				'id'      => $v->get_id(),
				'product' => $p->get_id(),
				'name'    => $p->get_name(),
				'option'  => $v->is_type( 'variation' ) ? wp_strip_all_tags( wc_get_formatted_variation( $v, true, false, false ) ) : '',
				'price'   => $v->get_regular_price(),
				'stock'   => $v->managing_stock() ? (int) $v->get_stock_quantity() : '',
				'inStock' => $v->is_in_stock(),
				'status'  => $p->get_status(),
				'thumb'   => $thumb ? $thumb[0] : '',
				'edit'    => get_edit_post_link( $p->get_id(), 'raw' ),
			);
		}
	}
	return $rows;
}

/* ------------------------------------------------------------------- REST */
add_action( 'rest_api_init', function () {
	$can = function () { return bi_store_on() && current_user_can( 'edit_products' ); };
	register_rest_route( 'bayfield/v1', '/store/summary', array(
		'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () { return bi_store_summary(); },
	) );
	register_rest_route( 'bayfield/v1', '/store/inventory', array(
		array( 'methods' => 'GET', 'permission_callback' => $can, 'callback' => function () { return bi_inventory_rows(); } ),
		array( 'methods' => 'POST', 'permission_callback' => $can, 'callback' => function ( WP_REST_Request $req ) {
			$changed = 0;
			foreach ( (array) $req->get_param( 'rows' ) as $r ) {
				$v = wc_get_product( absint( $r['id'] ?? 0 ) );
				if ( ! $v || BI_GC_SKU === $v->get_sku() ) {
					continue;
				}
				$price = trim( (string) ( $r['price'] ?? '' ) );
				if ( '' !== $price && is_numeric( ltrim( $price, '$' ) ) ) {
					$v->set_regular_price( wc_format_decimal( ltrim( $price, '$' ) ) );
				}
				$stock = trim( (string) ( $r['stock'] ?? '' ) );
				if ( '' === $stock ) {
					// No number: not counted, just "in stock" or "sold out".
					$v->set_manage_stock( false );
					$v->set_stock_status( ! empty( $r['inStock'] ) ? 'instock' : 'outofstock' );
				} else {
					$v->set_manage_stock( true );
					$v->set_stock_quantity( max( 0, (int) $stock ) ); // 0 = sold out automatically
				}
				$v->save();
				if ( $v->is_type( 'variation' ) ) {
					WC_Product_Variable::sync( $v->get_parent_id() );
				}
				$changed++;
			}
			bi_store_purge();
			return array( 'ok' => true, 'changed' => $changed, 'rows' => bi_inventory_rows() );
		} ),
	) );
	register_rest_route( 'bayfield/v1', '/store/product', array(
		'methods' => 'POST', 'permission_callback' => $can, 'callback' => 'bi_store_create_product',
	) );
} );

function bi_store_purge() {
	if ( function_exists( 'sg_cachepress_purge_everything' ) ) {
		sg_cachepress_purge_everything(); // Merchandise page shows prices and stock
	}
}

function bi_store_create_product( WP_REST_Request $req ) {
	$name  = sanitize_text_field( (string) $req->get_param( 'name' ) );
	$price = wc_format_decimal( ltrim( (string) $req->get_param( 'price' ), '$' ) );
	if ( '' === $name || '' === $price ) {
		return new WP_Error( 'bi_product', 'Add a name and a price.', array( 'status' => 400 ) );
	}
	$sizes  = array_values( array_intersect( BI_SIZES, (array) $req->get_param( 'sizes' ) ) );
	$big    = trim( (string) $req->get_param( 'bigPrice' ) );
	$stock  = trim( (string) $req->get_param( 'stock' ) );
	$images = array_values( array_filter( array_map( 'absint', (array) $req->get_param( 'images' ) ), function ( $id ) { return 'attachment' === get_post_type( $id ); } ) );
	$p      = $sizes ? new WC_Product_Variable() : new WC_Product_Simple();
	$p->set_name( $name );
	$p->set_status( $req->get_param( 'draft' ) ? 'draft' : 'publish' );
	$desc = sanitize_textarea_field( (string) $req->get_param( 'desc' ) );
	$p->set_short_description( $desc );
	$p->set_description( $desc );
	if ( $images ) {
		$p->set_image_id( array_shift( $images ) );
		$p->set_gallery_image_ids( $images );
	}
	if ( $req->get_param( 'first' ) ) {
		$p->set_menu_order( -1 - time() % 100000 );
	} else {
		$p->set_menu_order( 1000 );
	}
	if ( $req->get_param( 'badge' ) ) {
		$p->update_meta_data( '_bi_badge', sanitize_text_field( (string) $req->get_param( 'badge' ) ) );
	}
	if ( ! $sizes ) {
		$p->set_regular_price( $price );
		if ( '' !== $stock ) {
			$p->set_manage_stock( true );
			$p->set_stock_quantity( max( 0, (int) $stock ) );
		}
		$p->save();
	} else {
		$tax = wc_attribute_taxonomy_name( 'size' ); // pa_size
		foreach ( $sizes as $s ) {
			if ( ! term_exists( $s, $tax ) ) {
				wp_insert_term( $s, $tax );
			}
		}
		$attr = new WC_Product_Attribute();
		$attr->set_id( wc_attribute_taxonomy_id_by_name( 'size' ) );
		$attr->set_name( $tax );
		$attr->set_options( array_map( function ( $s ) use ( $tax ) { return (int) get_term_by( 'name', $s, $tax )->term_id; }, $sizes ) );
		$attr->set_visible( true );
		$attr->set_variation( true );
		$p->set_attributes( array( $attr ) );
		$p->save();
		foreach ( $sizes as $i => $s ) {
			$v = new WC_Product_Variation();
			$v->set_parent_id( $p->get_id() );
			$v->set_attributes( array( $tax => get_term_by( 'name', $s, $tax )->slug ) );
			$v->set_regular_price( ( '' !== $big && in_array( $s, array( 'XL', 'XXL', 'XXXL' ), true ) ) ? wc_format_decimal( ltrim( $big, '$' ) ) : $price );
			$v->set_menu_order( $i );
			if ( '' !== $stock ) {
				$v->set_manage_stock( true );
				$v->set_stock_quantity( max( 0, (int) $stock ) );
			}
			$v->save();
		}
		WC_Product_Variable::sync( $p->get_id() );
	}
	bi_store_purge();
	return array( 'ok' => true, 'id' => $p->get_id(), 'edit' => get_edit_post_link( $p->get_id(), 'raw' ) );
}

/* ---------------------------------------------------------------- boxes */
function bi_dash_orders() {
	?>
	<div class="bi-store" data-store>
		<div class="bi-tiles bi-tiles--store">
			<div class="bi-tile"><span class="bi-tile__n" data-s="today">–</span><span class="bi-tile__l">Sales today</span><span class="bi-tile__d" data-o="today"></span></div>
			<div class="bi-tile"><span class="bi-tile__n" data-s="7">–</span><span class="bi-tile__l">Last 7 days</span><span class="bi-tile__d" data-o="7"></span></div>
			<div class="bi-tile"><span class="bi-tile__n" data-s="30">–</span><span class="bi-tile__l">Last 30 days</span><span class="bi-tile__d" data-o="30"></span></div>
			<a class="bi-tile bi-tile--ship" href="<?php echo esc_url( admin_url( 'admin.php?page=wc-orders&status=wc-processing' ) ); ?>"><span class="bi-tile__n" data-ship>–</span><span class="bi-tile__l">To ship / mail</span><span class="bi-tile__d">Orders waiting to be sent</span></a>
		</div>
		<h4 class="bi-chart-title">Recent orders</h4>
		<table class="bi-orders"><tbody data-recent><tr><td class="bi-dash-note">Loading…</td></tr></tbody></table>
		<p class="bi-store__foot">
			<a class="button button-primary" href="<?php echo esc_url( admin_url( 'admin.php?page=wc-orders' ) ); ?>">All orders</a>
			<a class="button" href="<?php echo esc_url( admin_url( 'edit.php?post_type=product' ) ); ?>">All products</a>
			<span class="bi-dash-note">Mark an order <b>Completed</b> once it's shipped or picked up; the customer gets an email.</span>
		</p>
	</div>
	<?php
}

function bi_dash_inventory() {
	?>
	<div class="bi-inv" data-inv>
		<p class="bi-dash-note bi-inv__help">Change a price or a stock count and click <b>Save changes</b>. <b>Stock</b>: leave it empty if you don't count items, and use the switch to mark sold out. Enter a number to count down automatically as orders come in (0 = sold out).</p>
		<div class="bi-inv__scroll">
			<table class="bi-inv__table">
				<thead><tr><th>Product</th><th>Size</th><th>Price</th><th>Stock</th><th>In stock</th></tr></thead>
				<tbody data-rows><tr><td colspan="5" class="bi-dash-note">Loading…</td></tr></tbody>
			</table>
		</div>
		<p class="bi-inv__save"><button type="button" class="button button-primary" data-save disabled>Save changes</button> <span class="bi-dash-note" data-msg></span></p>
	</div>
	<?php
}

function bi_dash_newproduct() {
	?>
	<form class="bi-quick" data-new-product>
		<label>Item name<input type="text" name="name" required placeholder="e.g. Bayfield Inn Beanie"></label>
		<div class="bi-quick__row">
			<label>Price<input type="text" name="price" required inputmode="decimal" placeholder="35"></label>
			<label>Label (optional)<input type="text" name="badge" placeholder="New"></label>
		</div>
		<fieldset class="bi-quick__sizes"><legend>Sizes <span class="bi-dash-note">(leave all unchecked for one size)</span></legend>
			<?php foreach ( BI_SIZES as $s ) : ?>
				<label class="bi-chip"><input type="checkbox" name="sizes" value="<?php echo esc_attr( $s ); ?>"><span><?php echo esc_html( $s ); ?></span></label>
			<?php endforeach; ?>
		</fieldset>
		<div class="bi-quick__row" data-size-extra hidden>
			<label>Price for XL and up (optional)<input type="text" name="bigPrice" inputmode="decimal" placeholder="Same as price"></label>
			<span></span>
		</div>
		<label>How many in stock? (optional)<input type="number" name="stock" min="0" placeholder="Leave empty to not count"></label>
		<label>Short description<textarea name="desc" rows="2" placeholder="Soft knit beanie with the Bayfield Inn logo."></textarea></label>
		<div class="bi-quick__photos" data-photos></div>
		<p><button type="button" class="button" data-pick><span class="dashicons dashicons-format-image"></span> Add photos</button></p>
		<label class="bi-quick__check"><input type="checkbox" name="first" checked> Show it first on the Merchandise page</label>
		<label class="bi-quick__check"><input type="checkbox" name="draft"> Save as hidden draft (not on the website yet)</label>
		<p class="bi-quick__actions"><button type="submit" class="button button-primary">Add product</button> <span class="bi-dash-note" data-msg></span></p>
	</form>
	<?php
}

add_action( 'admin_head-index.php', function () {
	if ( ! bi_store_on() ) {
		return;
	}
	?>
	<style>
	.bi-tiles--store { grid-template-columns: repeat(4, 1fr); }
	.bi-quick [hidden] { display: none !important; }
	.bi-tile--ship { text-decoration: none; background: #f0f6f2; }
	.bi-tile--ship .bi-tile__n { color: #17301B; }
	.bi-orders { width: 100%; border-collapse: collapse; margin: 0 0 12px; }
	.bi-orders td { padding: 8px 6px; border-top: 1px solid #f0f0f1; vertical-align: top; font-size: 13px; }
	.bi-orders tr:first-child td { border-top: 0; }
	.bi-orders a { font-weight: 600; text-decoration: none; }
	.bi-orders small { display: block; color: #646970; }
	.bi-orders .bi-num { white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
	.bi-status { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: #f0f0f1; color: #50575e; white-space: nowrap; }
	.bi-status--processing { background: #fcf0d4; color: #7a5600; }
	.bi-status--completed { background: #e6f2ea; color: #17301B; }
	.bi-status--cancelled, .bi-status--failed, .bi-status--refunded { background: #fbeaea; color: #8a1f1f; }
	.bi-pickup { font-size: 11px; color: #17301B; font-weight: 600; }
	.bi-store__foot, .bi-inv__save { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 0; }
	.bi-inv__help { margin: 0 0 10px; }
	.bi-inv__scroll { max-height: 460px; overflow: auto; border: 1px solid #dcdcde; border-radius: 6px; margin: 0 0 12px; }
	.bi-inv__table { width: 100%; border-collapse: collapse; font-size: 13px; }
	.bi-inv__table th { position: sticky; top: 0; background: #f6f7f7; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #50575e; padding: 8px; z-index: 1; }
	.bi-inv__table td { padding: 6px 8px; border-top: 1px solid #f0f0f1; vertical-align: middle; }
	.bi-inv__table tr.is-first td { border-top: 2px solid #dcdcde; }
	.bi-inv__table tr.is-changed td { background: #fffbea; }
	.bi-inv__prod { display: flex; align-items: center; gap: 8px; }
	.bi-inv__prod img { width: 32px; height: 32px; object-fit: cover; border-radius: 3px; }
	.bi-inv__prod a { text-decoration: none; color: #1d2327; font-weight: 600; }
	.bi-inv__table input[type=text], .bi-inv__table input[type=number] { width: 78px; }
	.bi-inv__table .bi-draft { font-size: 11px; color: #b32d2e; font-weight: 400; }
	.bi-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
	.bi-switch input { opacity: 0; width: 0; height: 0; }
	.bi-switch span { position: absolute; inset: 0; border-radius: 999px; background: #c3c4c7; transition: background .2s; cursor: pointer; }
	.bi-switch span::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: left .2s; }
	.bi-switch input:checked + span { background: #17301B; }
	.bi-switch input:checked + span::after { left: 18px; }
	.bi-switch input:disabled + span { opacity: .45; cursor: default; }
	.bi-switch input:focus-visible + span { outline: 2px solid #2271b1; outline-offset: 2px; }
	.bi-quick__sizes { border: 0; padding: 0; margin: 0 0 10px; }
	.bi-quick__sizes legend { font-size: 12px; color: #50575e; margin-bottom: 6px; }
	.bi-quick label.bi-chip { display: inline-block; margin: 0 4px 6px 0; cursor: pointer; position: relative; }
	.bi-chip input { position: absolute; opacity: 0; }
	.bi-quick .bi-chip span { display: inline-block; padding: 5px 12px; border: 1px solid #c3c4c7; border-radius: 999px; font-size: 12.5px; color: #1d2327; background: #fff; }
	.bi-chip input:checked + span { background: #17301B; border-color: #17301B; color: #fff; }
	.bi-chip input:focus-visible + span { outline: 2px solid #2271b1; outline-offset: 1px; }
	@media (max-width: 600px) { .bi-tiles--store { grid-template-columns: 1fr 1fr; } }
	</style>
	<?php
} );

add_action( 'admin_footer-index.php', function () {
	if ( ! bi_store_on() ) {
		return;
	}
	?>
	<script>
	(function () {
		var REST = <?php echo wp_json_encode( esc_url_raw( rest_url( 'bayfield/v1/' ) ) ); ?>, nonce = <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?>;
		function api(path, opts) { opts = opts || {}; opts.headers = Object.assign({ 'X-WP-Nonce': nonce, 'Content-Type': 'application/json' }, opts.headers || {}); opts.credentials = 'same-origin';
			return fetch(REST + path, opts).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j && j.message || 'Something went wrong.'); return j; }); }); }
		function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
		function money(n) { return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

		// Orders & sales.
		var st = document.querySelector('[data-store]');
		if (st) api('store/summary').then(function (d) {
			['today', '7', '30'].forEach(function (k) { st.querySelector('[data-s="' + k + '"]').textContent = money(d.tiles[k].sales); st.querySelector('[data-o="' + k + '"]').textContent = d.tiles[k].orders + ' order' + (d.tiles[k].orders === 1 ? '' : 's'); });
			st.querySelector('[data-ship]').textContent = d.toShip;
			st.querySelector('[data-recent]').innerHTML = d.recent.length ? d.recent.map(function (o) {
				return '<tr><td><a href="' + esc(o.url) + '">#' + esc(o.number) + ' ' + esc(o.name) + '</a><small>' + esc(o.items) + '</small>' + (o.pickup ? '<span class="bi-pickup">Front-desk pickup</span>' : '') + '</td>'
					+ '<td><span class="bi-status bi-status--' + esc(o.slug) + '">' + esc(o.status) + '</span><small>' + esc(o.date) + '</small></td><td class="bi-num">' + esc(o.total) + '</td></tr>';
			}).join('') : '<tr><td class="bi-dash-note">No orders yet.</td></tr>';
		}).catch(function (e) { st.querySelector('[data-recent]').innerHTML = '<tr><td>' + esc(e.message) + '</td></tr>'; });

		// Inventory & prices.
		var inv = document.querySelector('[data-inv]');
		function drawInv(rows) {
			var last = null;
			inv.querySelector('[data-rows]').innerHTML = rows.map(function (r) {
				var first = r.product !== last; last = r.product;
				return '<tr data-id="' + r.id + '"' + (first ? ' class="is-first"' : '') + '><td>' + (first ? '<span class="bi-inv__prod">' + (r.thumb ? '<img src="' + esc(r.thumb) + '" alt="">' : '') + '<a href="' + esc(r.edit) + '">' + esc(r.name) + '</a>' + (r.status !== 'publish' ? ' <span class="bi-draft">(hidden)</span>' : '') + '</span>' : '') + '</td>'
					+ '<td>' + esc(r.option || '—') + '</td>'
					+ '<td><input type="text" inputmode="decimal" data-k="price" value="' + esc(r.price) + '" aria-label="Price for ' + esc(r.name + ' ' + r.option) + '"></td>'
					+ '<td><input type="number" min="0" data-k="stock" value="' + esc(r.stock) + '" placeholder="—" aria-label="Stock count for ' + esc(r.name + ' ' + r.option) + '"></td>'
					+ '<td><label class="bi-switch"><input type="checkbox" data-k="inStock"' + (r.inStock ? ' checked' : '') + (r.stock !== '' ? ' disabled' : '') + ' aria-label="In stock: ' + esc(r.name + ' ' + r.option) + '"><span></span></label></td></tr>';
			}).join('') || '<tr><td colspan="5" class="bi-dash-note">No products yet.</td></tr>';
		}
		if (inv) {
			var save = inv.querySelector('[data-save]'), msg = inv.querySelector('[data-msg]');
			api('store/inventory').then(drawInv);
			inv.addEventListener('input', function (e) {
				var tr = e.target.closest('tr[data-id]'); if (!tr) return; tr.classList.add('is-changed'); save.disabled = false; msg.textContent = '';
				if (e.target.dataset.k === 'stock') { var sw = tr.querySelector('[data-k=inStock]'); sw.disabled = e.target.value !== ''; if (e.target.value !== '') sw.checked = +e.target.value > 0; }
			});
			save.addEventListener('click', function () {
				var rows = Array.prototype.map.call(inv.querySelectorAll('tr.is-changed'), function (tr) {
					return { id: +tr.dataset.id, price: tr.querySelector('[data-k=price]').value, stock: tr.querySelector('[data-k=stock]').value, inStock: tr.querySelector('[data-k=inStock]').checked };
				});
				save.disabled = true; msg.textContent = 'Saving…';
				api('store/inventory', { method: 'POST', body: JSON.stringify({ rows: rows }) })
					.then(function (r) { drawInv(r.rows); msg.textContent = 'Saved. The website is updated.'; })
					.catch(function (e) { save.disabled = false; msg.textContent = e.message; });
			});
		}

		// Add a product.
		var np = document.querySelector('[data-new-product]');
		if (np) {
			var photos = [], box = np.querySelector('[data-photos]'), frame, extra = np.querySelector('[data-size-extra]');
			function drawPhotos() { box.innerHTML = photos.map(function (p, i) { return '<figure><img src="' + esc(p.url) + '" alt=""><button type="button" data-rm="' + i + '" aria-label="Remove photo">×</button></figure>'; }).join(''); }
			box.addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (b) { photos.splice(+b.dataset.rm, 1); drawPhotos(); } });
			np.addEventListener('change', function (e) { if (e.target.name === 'sizes') extra.hidden = !np.querySelector('[name=sizes]:checked'); });
			np.querySelector('[data-pick]').addEventListener('click', function () {
				if (!frame) {
					frame = wp.media({ title: 'Product photos (the first one is the cover)', button: { text: 'Use these photos' }, library: { type: 'image' }, multiple: 'add' });
					frame.on('select', function () { frame.state().get('selection').each(function (a) { a = a.toJSON(); if (!photos.some(function (p) { return p.id === a.id; })) photos.push({ id: a.id, url: (a.sizes && a.sizes.thumbnail || a).url }); }); drawPhotos(); });
				}
				frame.open();
			});
			np.addEventListener('submit', function (e) {
				e.preventDefault(); var m = np.querySelector('[data-msg]'), btn = np.querySelector('[type=submit]'), f = new FormData(np);
				btn.disabled = true; m.textContent = 'Adding…';
				api('store/product', { method: 'POST', body: JSON.stringify({ name: f.get('name'), price: f.get('price'), badge: f.get('badge'), sizes: f.getAll('sizes'), bigPrice: f.get('bigPrice'),
					stock: f.get('stock'), desc: f.get('desc'), first: !!f.get('first'), draft: !!f.get('draft'), images: photos.map(function (p) { return p.id; }) }) })
					.then(function (r) {
						m.innerHTML = 'Added. <a href="<?php echo esc_url( home_url( '/merchandise/' ) ); ?>" target="_blank">View the Merchandise page</a> · <a href="' + esc(r.edit) + '">More options</a>';
						np.reset(); photos = []; drawPhotos(); extra.hidden = true; if (inv) api('store/inventory').then(drawInv);
					})
					.catch(function (er) { m.textContent = er.message; })
					.then(function () { btn.disabled = false; });
			});
		}
	})();
	</script>
	<?php
}, 30 );
