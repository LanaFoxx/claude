<?php
defined( 'ABSPATH' ) || exit;

/**
 * Booking search + live results (The Inn / Condos filters) + embedded eviivo booking.
 * Reads the search from the URL: ?startdate=YYYY-MM-DD&enddate=YYYY-MM-DD&adults1=2&children1=0
 */
class BI_Booking_Widget extends \Elementor\Widget_Base {

	public function get_name() { return 'bi-booking'; }
	public function get_title() { return 'Bayfield Booking Search'; }
	public function get_icon() { return 'eicon-search-results'; }
	public function get_categories() { return array( 'bayfield' ); }
	public function get_style_depends() { return array( 'bi-front' ); }
	public function get_script_depends() { return array( 'bi-booking' ); }

	protected function register_controls() {
		$this->start_controls_section( 'content', array( 'label' => 'Property photos' ) );
		foreach ( bi_booking_properties() as $short => $prop ) {
			$this->add_control( 'img_' . strtolower( $short ), array( 'label' => $prop['name'], 'type' => \Elementor\Controls_Manager::MEDIA ) );
		}
		$this->add_control( 'how_to', array( 'type' => \Elementor\Controls_Manager::RAW_HTML,
			'raw' => 'Availability and prices are live from eviivo. Property names and room details are edited in eviivo.' ) );
		$this->end_controls_section();
	}

	protected function render() {
		$s      = $this->get_settings_for_display();
		$images = array();
		foreach ( bi_booking_properties() as $short => $prop ) {
			$img = $s[ 'img_' . strtolower( $short ) ] ?? array();
			if ( ! empty( $img['id'] ) ) {
				$src = wp_get_attachment_image_src( (int) $img['id'], 'large' );
				$images[ $short ] = $src ? $src[0] : ( $img['url'] ?? '' );
			} elseif ( ! empty( $img['url'] ) ) {
				$images[ $short ] = $img['url'];
			}
		}
		$opts = function ( $from, $to, $sel ) {
			$o = '';
			for ( $i = $from; $i <= $to; $i++ ) {
				$o .= sprintf( '<option value="%1$d"%2$s>%1$d</option>', $i, $i === $sel ? ' selected' : '' );
			}
			return $o;
		};
		?>
		<div class="bi-book" data-endpoint="<?php echo esc_url( rest_url( 'bayfield/v1/availability' ) ); ?>" data-images="<?php echo esc_attr( wp_json_encode( (object) $images ) ); ?>">
			<form class="bi-book__search" method="get" action="">
				<label class="bi-book__field"><span>Check-in</span><input type="date" name="startdate" required></label>
				<label class="bi-book__field"><span>Check-out</span><input type="date" name="enddate" required></label>
				<label class="bi-book__field"><span>Adults</span><select name="adults1"><?php echo $opts( 1, 14, 2 ); // phpcs:ignore ?></select></label>
				<label class="bi-book__field"><span>Children</span><select name="children1"><?php echo $opts( 0, 10, 0 ); // phpcs:ignore ?></select></label>
				<button type="submit" class="bi-book__go">Search stays <span aria-hidden="true">&#8594;</span></button>
			</form>
			<p class="bi-book__hint">Everyone stays together in one room or rental. The Inn · Bayfield on the Lake Condos · Isaac Wing House</p>

			<section class="bi-book__results" hidden aria-live="polite">
				<div class="bi-book__head">
					<div>
						<p class="bi-book__eyebrow">Your Bayfield getaway</p>
						<h2 class="bi-book__title">Your stay starts here.</h2>
					</div>
					<span class="bi-book__live"><span></span> Live availability</span>
				</div>
				<p class="bi-book__summary"></p>
				<p class="bi-book__status"></p>
				<div class="bi-book__filters" role="group" aria-label="Filter stays"></div>
				<div class="bi-book__grid"></div>
				<div class="bi-book__empty" hidden>
					<h3>No stays fit your whole party on these dates.</h3>
					<p>Try different dates, or call our front desk at <a href="tel:7157793363">(715) 779-3363</a> and we’ll help with your group.</p>
				</div>
				<p class="bi-book__note">Prices are live stay totals from eviivo. Final taxes, fees and policies are shown before you pay.</p>
			</section>

			<div class="bi-book__loading" hidden><span class="bi-book__spin"></span> Checking live availability…</div>
			<div class="bi-book__error" hidden>
				<h3>We couldn’t load live availability.</h3>
				<p>You can continue with the same dates and guests on our booking partner’s site.</p>
				<a class="bi-btn" target="_blank" rel="noopener">Open booking <span aria-hidden="true">&#8599;</span></a>
			</div>

			<section class="bi-book__panel" hidden>
				<div class="bi-book__panel-head">
					<div><p class="bi-book__eyebrow">Continue with eviivo</p><h2 class="bi-book__panel-title" tabindex="-1"></h2>
						<p class="bi-book__panel-sub">Your dates and full guest count are carried through. Choose a room below.</p></div>
					<button type="button" class="bi-book__close" aria-label="Close">&times;</button>
				</div>
				<div class="bi-book__panel-bar"><span>Booking is completed securely with eviivo, our booking partner.</span><a class="bi-book__newtab" target="_blank" rel="noopener">Open in a new tab &#8599;</a></div>
				<iframe class="bi-book__frame" title="Room options and booking" referrerpolicy="strict-origin-when-cross-origin"></iframe>
			</section>
		</div>
		<?php
	}
}
