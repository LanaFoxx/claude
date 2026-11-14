<?php
defined( 'ABSPATH' ) || exit;

/** Gift card order form: card type, amount, To / From and a note. Adds to the cart and goes to checkout (the card is mailed to the checkout shipping address). */
class BI_Gift_Card_Widget extends \Elementor\Widget_Base {

	public function get_name() { return 'bi-gift-card'; }
	public function get_title() { return 'Gift Card Form'; }
	public function get_icon() { return 'eicon-form-horizontal'; }
	public function get_categories() { return array( 'bayfield' ); }
	public function get_style_depends() { return array( 'bi-front' ); }
	public function get_script_depends() { return array( 'bi-front' ); }

	protected function register_controls() {
		$this->start_controls_section( 'content', array( 'label' => 'Gift card' ) );
		$this->add_control( 'how_to', array(
			'type' => \Elementor\Controls_Manager::RAW_HTML,
			'raw'  => 'Amounts and card types are set by the Bayfield Inn Manager plugin. Orders appear under WooCommerce › Orders.',
		) );
		$this->end_controls_section();
	}

	protected function render() {
		if ( ! function_exists( 'bi_gc_product_id' ) || ! bi_gc_product_id() ) {
			echo '<p class="bi-empty">Gift cards are available by phone: (715) 779-3363.</p>';
			return;
		}
		// After a failed add-to-cart the page reloads with the shopper's answers and the reason.
		$posted = ! empty( $_POST['bi_gc'] ) ? wp_unslash( $_POST ) : array(); // phpcs:ignore
		$val    = function ( $k, $d = '' ) use ( $posted ) { return isset( $posted[ $k ] ) ? sanitize_text_field( $posted[ $k ] ) : $d; };
		echo '<div class="bi-gc">';
		if ( function_exists( 'wc_print_notices' ) && ! \Elementor\Plugin::$instance->editor->is_edit_mode() ) {
			wc_print_notices();
		}
		$type   = $val( 'bi_gc_type', 'inn' );
		$amount = $val( 'bi_gc_amount', '100' );
		?>
		<form class="bi-gc__form" method="post" action="<?php echo esc_url( get_permalink() ); ?>">
			<input type="hidden" name="bi_gc" value="1">
			<input type="hidden" name="add-to-cart" value="<?php echo (int) bi_gc_product_id(); ?>">
			<fieldset class="bi-gc__group">
				<legend>Gift card for</legend>
				<div class="bi-pills">
					<?php foreach ( BI_GC_TYPES as $k => $label ) : ?>
						<label class="bi-pill"><input type="radio" name="bi_gc_type" value="<?php echo esc_attr( $k ); ?>" <?php checked( $type, $k ); ?>><span><?php echo esc_html( $label ); ?></span></label>
					<?php endforeach; ?>
				</div>
			</fieldset>
			<fieldset class="bi-gc__group">
				<legend>Amount</legend>
				<div class="bi-pills">
					<?php foreach ( BI_GC_AMTS as $a ) : ?>
						<label class="bi-pill"><input type="radio" name="bi_gc_amount" value="<?php echo (int) $a; ?>" <?php checked( (string) $amount, (string) $a ); ?>><span>$<?php echo (int) $a; ?></span></label>
					<?php endforeach; ?>
				</div>
			</fieldset>
			<div class="bi-gc__row">
				<label class="bi-field">Or choose an amount<input type="number" name="bi_gc_custom" min="<?php echo (int) BI_GC_MIN; ?>" max="<?php echo (int) BI_GC_MAX; ?>" step="1" placeholder="$" inputmode="numeric" value="<?php echo esc_attr( $val( 'bi_gc_custom' ) ); ?>"></label>
				<label class="bi-field">Quantity<input type="number" name="quantity" min="1" max="20" value="<?php echo esc_attr( $val( 'quantity', '1' ) ); ?>" inputmode="numeric"></label>
			</div>
			<p class="bi-gc__heading">On the card</p>
			<div class="bi-gc__row">
				<label class="bi-field">To<input type="text" name="bi_gc_to" placeholder="Recipient’s name" autocomplete="off" value="<?php echo esc_attr( $val( 'bi_gc_to' ) ); ?>"></label>
				<label class="bi-field">From<input type="text" name="bi_gc_from" placeholder="Your name" value="<?php echo esc_attr( $val( 'bi_gc_from' ) ); ?>"></label>
			</div>
			<label class="bi-field">Personal message <span class="bi-opt">(optional)</span><textarea name="bi_gc_message" rows="3" maxlength="400"><?php echo esc_textarea( $posted['bi_gc_message'] ?? '' ); ?></textarea></label>
			<p class="bi-gc__note">We’ll mail the card to the shipping address you enter at checkout. Sending it as a gift? Use the recipient’s address there. Mailing is free.</p>
			<button type="submit" class="bi-btn bi-gc__btn">Add to cart &amp; check out <span aria-hidden="true">&#8594;</span></button>
		</form>
		<?php
		echo '</div>';
	}
}

/** Header cart: bag icon + item count linking to the cart page; shown only when the cart has items. */
class BI_Cart_Link_Widget extends \Elementor\Widget_Base {

	public function get_name() { return 'bi-cart-link'; }
	public function get_title() { return 'Cart Icon'; }
	public function get_icon() { return 'eicon-cart-medium'; }
	public function get_categories() { return array( 'bayfield' ); }
	public function get_style_depends() { return array( 'bi-front' ); }

	protected function render() {
		echo bi_cart_link_html(); // phpcs:ignore -- escaped inside
	}
}
