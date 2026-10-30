/**
 * CTC Vervante book orders (Code Snippets, scope: global).
 *
 * Vervante prints and ships the course books on demand. They used to get a "Hi Vervante, You have received an order"
 * email from a dropshipping plugin that is no longer installed. This sends the same email to Vervante's order inbox
 * once an order with a book is paid (processing/completed), listing only the book lines with Vervante's item codes and
 * the address to ship to. Sent once per order (order meta _ctc_vervante_sent) and logged as an order note.
 */
if ( ! defined( 'CTC_VERVANTE_TO' ) ) define( 'CTC_VERVANTE_TO', 'myorders@vervante.com' );
// WooCommerce product/variation id => Vervante item code
if ( ! defined( 'CTC_VERVANTE_ITEMS' ) ) define( 'CTC_VERVANTE_ITEMS', array(
	9294  => 'V4081904346', // CTEC 20 Hour course + book
	14174 => 'V4081904346', // 20 Hour Book Addon
	9291  => 'V4081906467', // CTEC 60 Hour course + book
	21204 => 'V4081906467', // 60 Hour Book Addon
) );

function ctc_vervante_send( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order || $order->get_meta( '_ctc_vervante_sent' ) ) return;
	$lines = array();
	foreach ( $order->get_items() as $item ) {
		$id   = $item->get_variation_id() ?: $item->get_product_id();
		$code = CTC_VERVANTE_ITEMS[ $id ] ?? '';
		if ( $code ) $lines[] = sprintf( '%s (#%s) X %d', $item->get_name(), $code, $item->get_quantity() );
	}
	if ( ! $lines ) return;

	$ship = $order->has_shipping_address();
	$addr = array_filter( array(
		trim( ( $ship ? $order->get_shipping_first_name() . ' ' . $order->get_shipping_last_name() : $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ) ),
		$ship ? $order->get_shipping_company() : $order->get_billing_company(),
		$ship ? $order->get_shipping_address_1() : $order->get_billing_address_1(),
		$ship ? $order->get_shipping_address_2() : $order->get_billing_address_2(),
		trim( ( $ship ? $order->get_shipping_city() . ', ' . $order->get_shipping_state() . ' ' . $order->get_shipping_postcode() : $order->get_billing_city() . ', ' . $order->get_billing_state() . ' ' . $order->get_billing_postcode() ), ' ,' ),
		$order->get_billing_phone(),
		$order->get_billing_email(),
	) );
	$rule = str_repeat( '=', 60 );
	$body = "Hi Vervante,\n\nYou have received an order from " . trim( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ) . ":\n\n"
		. "$rule\nOrder: " . $order->get_order_number() . "\n" . wc_format_datetime( $order->get_date_created(), 'jS F Y' ) . "\n$rule\n"
		. implode( "\n", $lines ) . "\n$rule\n\nSHIPPING ADDRESS\n" . implode( "\n", $addr ) . "\n\nRegards,\nCalifornia Tax Courses\n";
	$sent = wp_mail( CTC_VERVANTE_TO, sprintf( '[California Tax Courses] New Order (%s)', $order->get_order_number() ), $body,
		array( 'Bcc: ' . get_option( 'admin_email' ) ) );

	if ( $sent ) {
		$order->update_meta_data( '_ctc_vervante_sent', current_time( 'mysql' ) );
		$order->add_order_note( 'Book order sent to Vervante (' . CTC_VERVANTE_TO . '): ' . implode( '; ', $lines ) );
	} else {
		$order->add_order_note( 'Could not email the book order to Vervante (' . CTC_VERVANTE_TO . '). Please forward it manually.' );
	}
	$order->save();
}
add_action( 'woocommerce_order_status_processing', 'ctc_vervante_send', 20 );
add_action( 'woocommerce_order_status_completed', 'ctc_vervante_send', 20 );
