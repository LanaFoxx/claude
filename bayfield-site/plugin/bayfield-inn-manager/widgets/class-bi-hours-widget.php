<?php
defined( 'ABSPATH' ) || exit;

/** Restaurant hours, as edited under Bayfield Inn › Hours. */
class BI_Hours_Widget extends \Elementor\Widget_Base {

	public function get_name() { return 'bi-hours'; }
	public function get_title() { return 'Restaurant Hours'; }
	public function get_icon() { return 'eicon-clock-o'; }
	public function get_categories() { return array( 'bayfield' ); }
	public function get_style_depends() { return array( 'bi-front' ); }

	protected function register_controls() {
		$this->start_controls_section( 'content', array( 'label' => 'Hours' ) );
		$this->add_control( 'restaurant', array(
			'label'   => 'Restaurant',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'options' => bi_hours_restaurants(),
			'default' => key( bi_hours_restaurants() ),
		) );
		$this->add_control( 'how_to', array(
			'type' => \Elementor\Controls_Manager::RAW_HTML,
			'raw'  => 'Hours are edited in <a href="' . esc_url( admin_url( 'admin.php?page=bi-hours' ) ) . '" target="_blank">Bayfield Inn › Hours</a>.',
		) );
		$this->end_controls_section();
	}

	protected function render() {
		$slug = (string) $this->get_settings_for_display( 'restaurant' );
		$h    = bi_hours_for( $slug );
		$any  = array_filter( array_map( 'trim', (array) $h['days'] ) );
		echo '<div class="bi-hours">';
		echo '<p class="bi-hours__title">Hours</p>';
		if ( $any ) {
			echo '<dl class="bi-hours__list">';
			foreach ( bi_hours_groups( $h['days'] ) as $g ) {
				printf( '<div class="bi-hours__row%s"><dt>%s</dt><dd>%s</dd></div>', 'Closed' === $g[1] ? ' is-closed' : '', esc_html( $g[0] ), esc_html( $g[1] ) );
			}
			echo '</dl>';
		} else {
			printf( '<p class="bi-hours__call">Call for today’s hours: <a href="tel:+17157793363">%s</a></p>', esc_html( BI_PHONE ) );
		}
		if ( '' !== trim( $h['note'] ) ) {
			printf( '<p class="bi-hours__note">%s</p>', esc_html( $h['note'] ) );
		}
		echo '</div>';
	}
}
