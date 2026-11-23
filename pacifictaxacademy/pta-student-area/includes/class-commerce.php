<?php
/**
 * WooCommerce: which Moodle courses a product enrolls in, and enrollment when an order is paid.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

class PTA_SA_Commerce {

    const META = '_pta_moodle_courses';

    public static function init(): void {
        add_action('woocommerce_product_options_general_product_data', [__CLASS__, 'product_field']);
        add_action('woocommerce_admin_process_product_object', [__CLASS__, 'save_product_field']);
        add_action('woocommerce_order_status_processing', [__CLASS__, 'enrol_order']);
        add_action('woocommerce_order_status_completed', [__CLASS__, 'enrol_order']);
    }

    public static function product_field(): void {
        woocommerce_wp_text_input([
            'id' => self::META,
            'label' => 'Moodle courses',
            'description' => 'Moodle course short names this product enrolls the buyer in, separated by commas. Example for the 20-Hour Renewal: FTL-2027, UPD-2027, ETH-2027, CA-2027',
            'desc_tip' => false,
            'placeholder' => 'FTL-2027, UPD-2027, ETH-2027, CA-2027',
        ]);
    }

    public static function save_product_field(WC_Product $product): void {
        // phpcs:ignore WordPress.Security.NonceVerification -- WooCommerce verifies the product form nonce.
        $raw = sanitize_text_field(wp_unslash($_POST[self::META] ?? ''));
        $codes = array_filter(array_map('trim', explode(',', $raw)));
        $product->update_meta_data(self::META, implode(', ', $codes));
    }

    /** Short names for one product (variations fall back to their parent). */
    public static function courses_for(WC_Product $product): array {
        $value = (string) $product->get_meta(self::META);
        if ($value === '' && $product->get_parent_id()) {
            $parent = wc_get_product($product->get_parent_id());
            $value = $parent ? (string) $parent->get_meta(self::META) : '';
        }
        return array_values(array_filter(array_map('trim', explode(',', $value))));
    }

    /** Enroll the buyer in every Moodle course on the order. Safe to run twice. */
    public static function enrol_order(int $order_id): void {
        $order = wc_get_order($order_id);
        if (!$order || $order->get_meta('_pta_enrolled')) {
            return;
        }
        $user = $order->get_user();
        if (!$user) {
            $order->add_order_note('Moodle enrollment skipped: the order has no customer account. Turn off guest checkout so every buyer gets an account.');
            return;
        }
        $courses = [];
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            if ($product) {
                $courses = array_merge($courses, self::courses_for($product));
            }
        }
        $courses = array_values(array_unique($courses));
        if (!$courses) {
            return;
        }
        $response = PTA_SA_Bridge::call('enrol', PTA_SA_Bridge::identity($user) + ['courses' => $courses]);
        if ($response === null) {
            $order->add_order_note('Moodle enrollment failed (no answer from Moodle). It will retry when the order status is saved again. Courses: ' . implode(', ', $courses));
            return;
        }
        $done = array_keys(array_filter((array) ($response['enrolled'] ?? [])));
        $missing = array_diff($courses, $done);
        $order->add_order_note('Enrolled in Moodle: ' . ($done ? implode(', ', $done) : 'none') . ($missing ? '. Not found in Moodle: ' . implode(', ', $missing) : '.'));
        if (!$missing) {
            $order->update_meta_data('_pta_enrolled', time());
            $order->save();
        }
        PTA_SA_Student::forget($user->ID);
    }
}
