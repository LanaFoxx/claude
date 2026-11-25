<?php
/**
 * Checkout: billing address warning + required acknowledgement, cancellation policy.
 * Source: Word doc "REGISTRATION: WARNING: BILLING ADDRESS" and "CANCELLATION POLICY" (Garrison asked for a checkbox before billing).
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

/* Required checkbox in the block checkout (WooCommerce Additional Checkout Fields API, WC 8.9+). */
add_action( 'woocommerce_init', function () {
	if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) { return; }
	woocommerce_register_additional_checkout_field( [
		'id'       => 'glec/billing-ack',
		'label'    => 'I confirm my billing address is the mailing address on my credit card statement.',
		'location' => 'order',
		'type'     => 'checkbox',
		'required' => true,
		'error_message' => 'Please confirm your billing address matches your credit card statement.',
	] );
	/* MarkUp #63: required agreement to Terms and Conditions, Cancellation Policy, Hold Harmless Policy. */
	woocommerce_register_additional_checkout_field( [
		'id'       => 'glec/terms-agree',
		'label'    => 'I have read and agree to the Terms and Conditions, the Cancellation Policy and the Hold Harmless Policy.',
		'location' => 'order',
		'type'     => 'checkbox',
		'required' => true,
		'error_message' => 'Please agree to the Terms and Conditions, Cancellation Policy and Hold Harmless Policy.',
	] );
} );
/* MarkUp #64: no coupon codes. */
add_filter( 'woocommerce_coupons_enabled', '__return_false' );

/* Classic checkout fallback (if the classic shortcode checkout is ever used). */
add_action( 'woocommerce_review_order_before_submit', function () {
	echo '<p class="form-row validate-required"><label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox"><input type="checkbox" class="woocommerce-form__input woocommerce-form__input-checkbox input-checkbox" name="glec_billing_ack" value="1"> <span>I confirm my billing address is the mailing address on my credit card statement.</span>&nbsp;<abbr class="required" title="required">*</abbr></label></p>';
	echo '<p class="form-row validate-required"><label class="woocommerce-form__label woocommerce-form__label-for-checkbox checkbox"><input type="checkbox" class="woocommerce-form__input woocommerce-form__input-checkbox input-checkbox" name="glec_terms_agree" value="1"> <span>I have read and agree to the Terms and Conditions, the Cancellation Policy and the Hold Harmless Policy.</span>&nbsp;<abbr class="required" title="required">*</abbr></label></p>';
} );
add_action( 'woocommerce_checkout_process', function () {
	if ( isset( $_POST['woocommerce-process-checkout-nonce'] ) && empty( $_POST['glec_terms_agree'] ) ) { wc_add_notice( 'Please agree to the Terms and Conditions, Cancellation Policy and Hold Harmless Policy.', 'error' ); } // phpcs:ignore
	if ( empty( $_POST['glec_billing_ack'] ) ) { wc_add_notice( 'Please confirm your billing address matches your credit card statement.', 'error' ); } // phpcs:ignore
} );

function glec_billing_warning_html() {
	return '<section class="glec-billwarn" aria-labelledby="glec-billwarn-t">'
		. '<div class="glec-billwarn__head"><span class="glec-billwarn__ico" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/></svg></span>'
		. '<h2 id="glec-billwarn-t">Check your billing address before you pay</h2></div>'
		. '<p>Your billing address must be the <b>mailing address on the monthly statement of the credit card</b> you are using. When it does not match, our credit card processor puts a hold on the payment.</p>'
		. '<p class="glec-billwarn__sub">Common mistakes</p><ol>'
		. '<li>You type your current home address, but the bank still has your previous home address on the card.</li>'
		. '<li>With a company credit card, the billing address could be the office, a post office box, or sometimes the owner&rsquo;s home address.</li></ol>'
		. '<p>As of November 11, 2026, we no longer track down customers to get the correct billing address. If your payment is held, you will not have access to the class videos until you call, text or email us the correct billing address.</p>'
		. '<p class="glec-billwarn__sig">Thank you for your understanding. Garrison Michael</p></section>';
}
function glec_agreement_html() {
	$p = home_url( '/policies/' );
	return '<section class="glec-agree"><h2>Before you buy</h2><p>At the bottom of this page you must agree to these policies. Each link opens in a new tab.</p><ul>'
		. '<li><a href="' . esc_url( $p . '#terms' ) . '" target="_blank" rel="noopener">Terms and Conditions</a></li>'
		. '<li><a href="' . esc_url( $p . '#cancellation' ) . '" target="_blank" rel="noopener">Cancellation Policy</a></li>'
		. '<li><a href="' . esc_url( $p . '#hold-harmless' ) . '" target="_blank" rel="noopener">Hold Harmless Policy</a></li></ul></section>';
}
function glec_cancellation_html() {
	return '<section class="glec-cancel"><h2>Cancellation policy</h2><p><b>Online classes are non-refundable.</b> Design and exam prep classes include unlimited 24/7 access for up to one year after purchase, or until you pass your exam, whichever comes first (extensions are available for a fair fee). CEU classes include unlimited 24/7 access for up to 4 months after purchase. <a href="' . esc_url( home_url( '/policies/' ) ) . '">Read our policies</a>.</p></section>';
}
add_filter( 'the_content', function ( $c ) {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() || is_wc_endpoint_url( 'order-received' ) || ! in_the_loop() ) { return $c; }
	return glec_billing_warning_html() . glec_agreement_html() . $c . glec_cancellation_html();
}, 5 );
