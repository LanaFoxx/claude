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
			'raw'  => 'Items, photos, prices and Square links are edited in <a href="' . esc_url( admin_url( 'admin.php?page=bi-merch' ) ) . '" target="_blank">Bayfield Inn › Merchandise</a>.',
		) );
		$this->end_controls_section();
	}

	protected function render() {
		$s        = $this->get_settings_for_display();
		$products = array_values( array_filter( bi_get_data( 'products' )['items'] ?? array(), function ( $p ) { return ! empty( $p['name'] ); } ) );
		if ( ! $products ) {
			echo '<p class="bi-empty">New merchandise is on its way. Check back soon.</p>';
			return;
		}
		echo '<div class="bi-shop">';
		foreach ( $products as $i => $p ) {
			$ids   = array_values( array_filter( array_map( 'intval', (array) ( $p['images'] ?? array() ) ) ) );
			$group = 'bi-product-' . $i;
			$soon  = empty( $p['link'] );
			$sold  = ! empty( $p['soldout'] );
			echo '<article class="bi-product' . ( $sold ? ' is-sold' : '' ) . '">';
			echo '<div class="bi-product__media">';
			if ( ! empty( $p['badge'] ) && ! $sold ) {
				printf( '<span class="bi-product__badge">%s</span>', esc_html( $p['badge'] ) );
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
					// First photo shows; the second fades in on hover. All open in the lightbox.
					printf( '<a class="bi-product__img%s" href="%s" data-elementor-open-lightbox="yes" data-elementor-lightbox-slideshow="%s" data-elementor-lightbox-title="%s"%s><img src="%s" alt="%s" loading="lazy"></a>',
						0 === $k ? ' is-first' : ( 1 === $k ? ' is-second' : '' ), esc_url( $full[0] ), esc_attr( $group ), esc_attr( $p['name'] ),
						$k > 1 ? ' hidden' : '', esc_url( $img[0] ), esc_attr( $p['name'] ) );
				}
			} else {
				echo '<div class="bi-product__placeholder">Photo coming soon</div>';
			}
			echo '</div><div class="bi-product__body">';
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
			} elseif ( $soon ) {
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
