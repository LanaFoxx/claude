<?php
defined( 'ABSPATH' ) || exit;

/**
 * Photo gallery: section tabs (and sub-tabs), each a big photo with a thumbnail strip.
 * Photos are managed under Bayfield Inn › Gallery. Link to a section with /gallery/#section-id.
 */
class BI_Gallery_Widget extends \Elementor\Widget_Base {

	public function get_name() { return 'bi-gallery'; }
	public function get_title() { return 'Bayfield Gallery'; }
	public function get_icon() { return 'eicon-gallery-justified'; }
	public function get_categories() { return array( 'bayfield' ); }
	public function get_style_depends() { return array( 'bi-front' ); }
	public function get_script_depends() { return array( 'bi-front' ); }

	protected function register_controls() {
		$this->start_controls_section( 'content', array( 'label' => 'Gallery' ) );
		$this->add_control( 'set', array(
			'label'   => 'Photo set',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'options' => array( 'main' => 'Main gallery (with sections)', 'history' => 'History archive' ),
			'default' => 'main',
		) );
		$this->add_control( 'captions', array(
			'label'   => 'Show photo captions',
			'type'    => \Elementor\Controls_Manager::SWITCHER,
			'default' => '',
		) );
		$this->add_control( 'how_to', array(
			'type' => \Elementor\Controls_Manager::RAW_HTML,
			'raw'  => 'Photos and sections are edited in <a href="' . esc_url( admin_url( 'admin.php?page=bi-gallery' ) ) . '" target="_blank">Bayfield Inn › Gallery</a>.',
		) );
		$this->end_controls_section();
	}

	private function slideshow( $ids, $group, $captions, $button = null, $contain = false ) {
		$ids = array_values( array_filter( array_map( 'intval', (array) $ids ) ) );
		if ( ! $ids ) {
			echo '<p class="bi-empty">Photos coming soon.</p>';
			return;
		}
		echo '<div class="bi-show' . ( $contain ? ' bi-show--contain' : '' ) . '" data-bi-show>';
		echo '<div class="bi-show__stage">';
		foreach ( $ids as $i => $aid ) {
			$full  = wp_get_attachment_image_src( $aid, 'full' );
			$large = wp_get_attachment_image_src( $aid, '2048x2048' ) ?: $full;
			if ( ! $full ) {
				continue;
			}
			$cap = wp_get_attachment_caption( $aid ) ?: get_the_title( $aid );
			$alt = get_post_meta( $aid, '_wp_attachment_image_alt', true ) ?: $cap;
			printf( '<a class="bi-show__slide%s" href="%s" data-elementor-open-lightbox="yes" data-elementor-lightbox-slideshow="%s" data-elementor-lightbox-title="%s"><img src="%s" alt="%s" %s>%s</a>',
				0 === $i ? ' is-active' : '', esc_url( $full[0] ), esc_attr( $group ), esc_attr( $cap ), esc_url( $large[0] ), esc_attr( $alt ),
				0 === $i ? '' : 'loading="lazy"', $captions && $cap ? '<span class="bi-show__cap">' . esc_html( $cap ) . '</span>' : '' );
		}
		if ( count( $ids ) > 1 ) {
			echo '<button type="button" class="bi-show__nav bi-show__prev" aria-label="Previous photo">&#8592;</button><button type="button" class="bi-show__nav bi-show__next" aria-label="Next photo">&#8594;</button>';
			printf( '<span class="bi-show__count"><span data-bi-count>1</span> / %d</span>', count( $ids ) );
		}
		echo '</div>';
		if ( count( $ids ) > 1 ) {
			echo '<div class="bi-show__thumbs">';
			foreach ( $ids as $i => $aid ) {
				$t = wp_get_attachment_image_src( $aid, 'medium' );
				if ( $t ) {
					printf( '<button type="button" class="bi-show__thumb%s" aria-label="Photo %d"><img src="%s" alt="" loading="lazy"></button>', 0 === $i ? ' is-active' : '', $i + 1, esc_url( $t[0] ) );
				}
			}
			echo '</div>';
		}
		echo '</div>';
		if ( $button && ! empty( $button['label'] ) && ! empty( $button['url'] ) ) {
			printf( '<div class="bi-show__cta"><a class="bi-btn" href="%s">%s <span aria-hidden="true">&#8594;</span></a></div>', esc_url( $button['url'] ), esc_html( $button['label'] ) );
		}
	}

	private function tabs( $sections, $level ) {
		printf( '<div class="bi-tabs bi-tabs--%d" data-bi-tabs><div class="bi-tabs__bar" role="tablist">', $level );
		foreach ( $sections as $i => $sec ) {
			printf( '<button type="button" role="tab" class="bi-tabs__tab%s" data-bi-tab="%s" aria-selected="%s">%s</button>',
				0 === $i ? ' is-active' : '', esc_attr( $sec['id'] ?? sanitize_title( $sec['title'] ) ), 0 === $i ? 'true' : 'false', esc_html( $sec['title'] ) );
		}
		echo '</div>';
		foreach ( $sections as $i => $sec ) {
			printf( '<div class="bi-tabs__panel%s" role="tabpanel" data-bi-panel="%s">', 0 === $i ? ' is-active' : '', esc_attr( $sec['id'] ?? sanitize_title( $sec['title'] ) ) );
			if ( ! empty( $sec['subs'] ) ) {
				$this->tabs( $sec['subs'], $level + 1 );
			} else {
				$this->slideshow( $sec['images'] ?? array(), 'bi-' . ( $sec['id'] ?? $i ), false, $sec['button'] ?? null );
			}
			echo '</div>';
		}
		echo '</div>';
	}

	protected function render() {
		$s    = $this->get_settings_for_display();
		$data = bi_get_data( 'galleries' );
		if ( 'history' === $s['set'] ) {
			$this->slideshow( $data['history']['images'] ?? array(), 'bi-history', 'yes' === $s['captions'], null, true );
			return;
		}
		$sections = $data['main']['sections'] ?? array();
		if ( ! $sections ) {
			echo '<p class="bi-empty">Add gallery sections under Bayfield Inn › Gallery.</p>';
			return;
		}
		echo '<div class="bi-gallery">';
		$this->tabs( $sections, 1 );
		echo '</div>';
	}
}
