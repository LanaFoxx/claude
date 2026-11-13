<?php
defined( 'ABSPATH' ) || exit;

/**
 * Merchandise: product cards from Bayfield Inn › Merchandise. "Buy now" opens the item's
 * Square payment link, so checkout and payment happen securely on Square.
 */
class BI_Shop_Widget extends \Elementor\Widget_Base {

	public function get_name() { return 'bi-shop'; }
	public function get_title() { return 'Bayfield Merchandise'; }
	public function get_icon() { return 'eicon-products'; }
	public function get_categories() { return array( 'bayfield' ); }
	public function get_style_depends() { return array( 'bi-front' ); }
	public function get_script_depends() { return array( 'bi-front' ); }

	protected function register_controls() {
		$this->start_controls_section( 'content', array( 'label' => 'Merchandise' ) );
		$this->add_control( 'button_text', array( 'label' => 'Button text', 'type' => \Elementor\Controls_Manager::TEXT, 'default' => 'Buy now' ) );
		$this->add_control( 'how_to', array(
			'type' => \Elementor\Controls_Manager::RAW_HTML,
			'raw'  => 'Items, photos, sizes, prices and stock are edited under <a href="' . esc_url( admin_url( 'edit.php?post_type=product' ) ) . '" target="_blank">Products</a> (or from the Dashboard).',
		) );
		$this->end_controls_section();
	}

	protected function render() {
		if ( bi_store_on() ) {
			$this->render_store();
			return;
		}
		$this->render_links();
	}

	/** One product photo set: the first is the cover, hovering cycles through the rest (front.js). */
	private function media( $ids, $name, $badge, $sold, $group ) {
		echo '<div class="bi-product__media" data-bi-cycle>';
		if ( $badge && ! $sold ) {
			printf( '<span class="bi-product__badge">%s</span>', esc_html( $badge ) );
		}
		if ( $sold ) {
			echo '<span class="bi-product__badge bi-product__badge--sold">Sold out</span>';
		}
		if ( $ids ) {
			foreach ( $ids as $k => $aid ) {
				$full = wp_get_attachment_image_src( $aid, 'full' );
				$img  = wp_get_attachment_image_src( $aid, 'large' ) ?: $full;
				if ( ! $full ) {
					continue;
				}
				$label = $name . ( $k ? ' (photo ' . ( $k + 1 ) . ')' : '' );
				printf( '<a class="bi-product__img%s" href="%s" data-elementor-open-lightbox="yes" data-elementor-lightbox-slideshow="%s" data-elementor-lightbox-title="%s"><img src="%s" alt="%s"%s></a>',
					0 === $k ? ' is-active' : '', esc_url( $full[0] ), esc_attr( $group ), esc_attr( $label ), esc_url( $img[0] ), esc_attr( $label ), 0 === $k ? '' : ' loading="lazy"' );
			}
			if ( count( $ids ) > 1 ) {
				echo '<div class="bi-product__dots" role="group" aria-label="Photos">';
				foreach ( $ids as $k => $aid ) {
					printf( '<button type="button" class="bi-product__dot%s" aria-label="Show photo %d of %d"></button>', 0 === $k ? ' is-active' : '', $k + 1, count( $ids ) );
				}
				echo '</div>';
			}
		} else {
			echo '<div class="bi-product__placeholder">Photo coming soon</div>';
		}
		echo '</div>';
	}

	/** WooCommerce products with size, quantity and Add to cart (stays on the page). */
	private function render_store() {
		$products = wc_get_products( array( 'status' => 'publish', 'limit' => -1, 'orderby' => array( 'menu_order' => 'ASC', 'title' => 'ASC' ), 'visibility' => 'catalog', 'type' => array( 'simple', 'variable' ) ) );
		$products = array_values( array_filter( $products, function ( $p ) { return BI_GC_SKU !== $p->get_sku(); } ) );
		if ( ! $products ) {
			echo '<p class="bi-empty">New merchandise is on its way. Check back soon.</p>';
			return;
		}
		echo '<div class="bi-shop">';
		foreach ( $products as $i => $p ) {
			$ids   = array_values( array_filter( array_merge( array( (int) $p->get_image_id() ), array_map( 'intval', $p->get_gallery_image_ids() ) ) ) );
			$sold  = ! $p->is_in_stock();
			$badge = (string) $p->get_meta( '_bi_badge' );
			printf( '<article class="bi-product%s" data-product="%d">', $sold ? ' is-sold' : '', (int) $p->get_id() );
			$this->media( $ids, $p->get_name(), $badge, $sold, 'bi-product-' . $i );
			echo '<div class="bi-product__body">';
			printf( '<h3 class="bi-product__name">%s</h3>', esc_html( $p->get_name() ) );
			printf( '<p class="bi-product__price" data-price-default="%1$s">%2$s</p>', esc_attr( wp_strip_all_tags( $p->get_price_html() ) ), wp_kses_post( $p->get_price_html() ) );
			$desc = $p->get_short_description() ?: $p->get_description();
			if ( $desc ) {
				printf( '<p class="bi-product__desc">%s</p>', esc_html( wp_strip_all_tags( $desc ) ) );
			}
			if ( $sold ) {
				echo '<span class="bi-btn bi-btn--disabled" aria-disabled="true">Sold out</span>';
			} else {
				echo '<form class="bi-buy" data-bi-buy novalidate>';
				printf( '<input type="hidden" name="product_id" value="%d">', (int) $p->get_id() );
				if ( $p->is_type( 'variable' ) ) {
					$uid = 'bi-size-' . (int) $p->get_id();
					printf( '<label class="bi-buy__label" for="%s">Size</label><select id="%s" class="bi-buy__size" name="variation_id" required><option value="">Choose a size</option>', esc_attr( $uid ), esc_attr( $uid ) );
					foreach ( $p->get_children() as $vid ) {
						$v = wc_get_product( $vid );
						if ( ! $v || ! $v->exists() || 'publish' !== $v->get_status() ) {
							continue;
						}
						$label = wp_strip_all_tags( wc_get_formatted_variation( $v, true, false, false ) ); // e.g. "Large"
						printf( '<option value="%d" data-price="%s"%s>%s%s</option>', (int) $vid, esc_attr( wp_strip_all_tags( wc_price( $v->get_price() ) ) ),
							$v->is_in_stock() ? '' : ' disabled', esc_html( $label ), $v->is_in_stock() ? '' : ' (sold out)' );
					}
					echo '</select>';
				}
				echo '<div class="bi-buy__row"><label class="screen-reader-text" for="q-' . (int) $p->get_id() . '">Quantity</label>';
				printf( '<input id="q-%d" class="bi-buy__qty" type="number" name="quantity" value="1" min="1" max="20" inputmode="numeric">', (int) $p->get_id() );
				echo '<button type="submit" class="bi-btn bi-buy__btn">Add to cart</button></div>';
				echo '<p class="bi-buy__msg" role="status" aria-live="polite"></p>';
				echo '</form>';
			}
			echo '</div></article>';
		}
		echo '</div>';
		echo '<p class="bi-shop__note">Secure checkout right here on our website, with card payments processed by Square.</p>';
	}

	/** Before the store existed: items from Bayfield Inn › Merchandise with Square payment links. */
	private function render_links() {
		$s        = $this->get_settings_for_display();
		$products = array_values( array_filter( bi_get_data( 'products' )['items'] ?? array(), function ( $p ) { return ! empty( $p['name'] ); } ) );
		if ( ! $products ) {
			echo '<p class="bi-empty">New merchandise is on its way. Check back soon.</p>';
			return;
		}
		echo '<div class="bi-shop">';
		foreach ( $products as $i => $p ) {
			$ids  = array_values( array_filter( array_map( 'intval', (array) ( $p['images'] ?? array() ) ) ) );
			$sold = ! empty( $p['soldout'] );
			echo '<article class="bi-product' . ( $sold ? ' is-sold' : '' ) . '">';
			$this->media( $ids, $p['name'], $p['badge'] ?? '', $sold, 'bi-product-' . $i );
			echo '<div class="bi-product__body">';
			printf( '<h3 class="bi-product__name">%s</h3>', esc_html( $p['name'] ) );
			if ( ! empty( $p['price'] ) ) {
				$price = trim( $p['price'] );
				printf( '<p class="bi-product__price">%s</p>', esc_html( preg_match( '/^\d/', $price ) ? '$' . $price : $price ) );
			}
			if ( ! empty( $p['desc'] ) ) {
				printf( '<p class="bi-product__desc">%s</p>', nl2br( esc_html( $p['desc'] ) ) );
			}
			if ( $sold ) {
				echo '<span class="bi-btn bi-btn--disabled" aria-disabled="true">Sold out</span>';
			} elseif ( empty( $p['link'] ) ) {
				echo '<span class="bi-btn bi-btn--disabled" aria-disabled="true">Coming soon</span>';
			} else {
				printf( '<a class="bi-btn" href="%s" target="_blank" rel="noopener">%s <span aria-hidden="true">&#8594;</span></a>', esc_url( $p['link'] ), esc_html( $s['button_text'] ?: 'Buy now' ) );
			}
			echo '</div></article>';
		}
		echo '</div>';
		echo '<p class="bi-shop__note">Secure checkout by Square: you’ll finish your order on the next screen.</p>';
	}
}
