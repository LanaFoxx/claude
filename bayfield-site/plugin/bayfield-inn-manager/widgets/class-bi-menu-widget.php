<?php
defined( 'ABSPATH' ) || exit;

/** Restaurant menu: shows a restaurant's menu as edited under Bayfield Inn › Restaurant Menus. */
class BI_Menu_Widget extends \Elementor\Widget_Base {

	public function get_name() { return 'bi-restaurant-menu'; }
	public function get_title() { return 'Restaurant Menu'; }
	public function get_icon() { return 'eicon-price-list'; }
	public function get_categories() { return array( 'bayfield' ); }
	public function get_style_depends() { return array( 'bi-front' ); }

	protected function register_controls() {
		$options = array();
		foreach ( bi_get_data( 'menus' )['restaurants'] ?? array() as $r ) {
			$options[ $r['slug'] ] = $r['name'];
		}
		$this->start_controls_section( 'content', array( 'label' => 'Menu' ) );
		$this->add_control( 'restaurant', array(
			'label'   => 'Restaurant',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'options' => $options,
			'default' => key( $options ),
		) );
		$this->add_control( 'show_pdf', array(
			'label'   => 'Show PDF download buttons',
			'type'    => \Elementor\Controls_Manager::SWITCHER,
			'default' => 'yes',
		) );
		$this->add_control( 'how_to', array(
			'type' => \Elementor\Controls_Manager::RAW_HTML,
			'raw'  => 'Dishes and prices are edited in <a href="' . esc_url( admin_url( 'admin.php?page=bi-menus' ) ) . '" target="_blank">Bayfield Inn › Restaurant Menus</a>.',
		) );
		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$r = null;
		foreach ( bi_get_data( 'menus' )['restaurants'] ?? array() as $candidate ) {
			if ( $candidate['slug'] === $s['restaurant'] ) {
				$r = $candidate;
			}
		}
		if ( ! $r ) {
			echo '<p class="bi-empty">Choose a restaurant, or add its menu under Bayfield Inn › Restaurant Menus.</p>';
			return;
		}
		$menus = $r['menus'] ?? array();
		$many  = count( $menus ) > 1;
		echo '<div class="bi-menu">';
		if ( 'yes' === $s['show_pdf'] ) {
			$pdfs = array_filter( $menus, function ( $m ) { return ! empty( $m['pdf'] ); } );
			if ( $pdfs ) {
				echo '<div class="bi-menu__pdfs">';
				foreach ( $pdfs as $m ) {
					printf( '<a class="bi-btn-outline" href="%s" target="_blank" rel="noopener">Download %smenu (PDF)</a>',
						esc_url( $m['pdf'] ), $many ? esc_html( strtolower( $m['title'] ) ) . ' ' : '' );
				}
				echo '</div>';
			}
		}
		foreach ( $menus as $m ) {
			if ( $many ) {
				printf( '<div class="bi-menu__divider"><span>%s</span></div>', esc_html( $m['title'] ) );
			}
			echo '<div class="bi-menu__cols">';
			foreach ( $m['sections'] ?? array() as $sec ) {
				echo '<section class="bi-menu__section">';
				printf( '<h3>%s</h3>', esc_html( $sec['title'] ) );
				if ( ! empty( $sec['note'] ) ) {
					printf( '<p class="bi-menu__note">%s</p>', esc_html( $sec['note'] ) );
				}
				echo '<ul>';
				foreach ( $sec['items'] ?? array() as $it ) {
					$price = trim( (string) ( $it['price'] ?? '' ) );
					printf( '<li><div class="bi-menu__line"><span class="bi-menu__name">%s</span>%s</div>%s</li>',
						esc_html( $it['name'] ?? '' ),
						'' !== $price ? '<span class="bi-menu__dots"></span><span class="bi-menu__price">' . esc_html( $price ) . '</span>' : '',
						! empty( $it['desc'] ) ? '<p>' . esc_html( $it['desc'] ) . '</p>' : '' );
				}
				echo '</ul></section>';
			}
			echo '</div>';
		}
		if ( ! empty( $r['footer'] ) ) {
			printf( '<p class="bi-menu__footer">%s</p>', esc_html( $r['footer'] ) );
		}
		foreach ( array_filter( array_map( 'trim', explode( "\n", (string) ( $r['notes'] ?? '' ) ) ) ) as $note ) {
			printf( '<p class="bi-menu__fine">%s</p>', esc_html( $note ) );
		}
		echo '</div>';
	}
}
