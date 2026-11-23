<?php
/**
 * My Account: student-area layout and menu, extra tabs, one-click course login, logout of both
 * sites, CTEC ID / PTIN fields and the "Log In / My Account" menu label.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

class PTA_SA_Account {

    const ENDPOINTS = [
        'my-courses' => 'My Courses',
        'certificates' => 'Certificates',
        'study-materials' => 'Study Materials',
    ];

    private static ?array $model = null;

    public static function init(): void {
        add_action('init', [__CLASS__, 'add_endpoints']);
        add_filter('woocommerce_get_query_vars', [__CLASS__, 'query_vars']);
        add_filter('woocommerce_account_menu_items', [__CLASS__, 'menu_items'], 99);
        foreach (array_keys(self::ENDPOINTS) as $endpoint) {
            add_action('woocommerce_account_' . $endpoint . '_endpoint', static function () use ($endpoint) {
                self::template($endpoint);
            });
            add_filter('woocommerce_endpoint_' . $endpoint . '_title', static fn() => self::ENDPOINTS[$endpoint]);
        }
        add_filter('woocommerce_locate_template', [__CLASS__, 'locate_template'], 20, 2);
        add_filter('template_include', [__CLASS__, 'shell'], 99999);
        add_action('wp_enqueue_scripts', [__CLASS__, 'assets'], 99);
        add_action('template_redirect', [__CLASS__, 'handle_requests'], 1);
        add_filter('allowed_redirect_hosts', [__CLASS__, 'allowed_hosts']);
        add_filter('logout_redirect', [__CLASS__, 'logout_redirect'], 99);
        add_filter('woocommerce_logout_default_redirect_url', [__CLASS__, 'logout_redirect'], 99);
        add_action('woocommerce_edit_account_form_start', [__CLASS__, 'account_intro']);
        add_action('woocommerce_edit_account_form', [__CLASS__, 'account_fields']);
        add_action('woocommerce_save_account_details_errors', [__CLASS__, 'validate_account'], 10, 2);
        add_action('woocommerce_save_account_details', [__CLASS__, 'save_account']);
        add_filter('wp_nav_menu_objects', [__CLASS__, 'menu_label']);
    }

    public static function add_endpoints(): void {
        foreach (array_keys(self::ENDPOINTS) as $endpoint) {
            add_rewrite_endpoint($endpoint, EP_ROOT | EP_PAGES);
        }
    }

    public static function query_vars(array $vars): array {
        foreach (array_keys(self::ENDPOINTS) as $endpoint) {
            $vars[$endpoint] = $endpoint;
        }
        return $vars;
    }

    /** Student menu, in the order of the approved design. */
    public static function menu_items(array $items): array {
        $menu = [
            'dashboard' => 'Dashboard',
            'my-courses' => 'My Courses',
            'certificates' => 'Certificates',
            'study-materials' => 'Study Materials',
            'orders' => 'Order History',
        ];
        if (isset($items['payment-methods'])) {
            $menu['payment-methods'] = 'Saved Cards';
        }
        if (isset($items['team-seats'])) {
            $menu['team-seats'] = 'Team Seats';
        }
        $menu['edit-account'] = 'Account Settings';
        $menu['customer-logout'] = 'Log out';
        return $menu;
    }

    /** Use our templates for the account wrapper and the dashboard. */
    public static function locate_template(string $template, string $name): string {
        $ours = ['myaccount/my-account.php' => 'my-account.php', 'myaccount/dashboard.php' => 'dashboard.php'];
        if (isset($ours[$name])) {
            return PTA_SA_DIR . 'templates/' . $ours[$name];
        }
        return $template;
    }

    public static function template(string $name, array $args = []): void {
        $file = PTA_SA_DIR . 'templates/' . $name . '.php';
        if (is_readable($file)) {
            extract($args, EXTR_SKIP); // phpcs:ignore WordPress.PHP.DontExtract
            include $file;
        }
    }

    /** True on any My Account page for a logged-in user (the student area). */
    public static function in_student_area(): bool {
        return function_exists('is_account_page') && is_account_page() && is_user_logged_in();
    }

    /** Replace the theme's header, menu and footer with the student-area layout. */
    public static function shell(string $template): string {
        return self::in_student_area() ? PTA_SA_DIR . 'templates/shell.php' : $template;
    }

    /** The dashboard model, built once per request. */
    public static function model(): array {
        if (self::$model === null) {
            self::$model = PTA_SA_Student::model(wp_get_current_user());
        }
        return self::$model;
    }

    public static function assets(): void {
        if (!function_exists('is_account_page') || !is_account_page()) {
            return;
        }
        wp_enqueue_style('pta-student-area', PTA_SA_URL . 'assets/student-area.css', [], PTA_SA_VERSION);
        if (self::in_student_area()) {
            wp_enqueue_script('pta-student-area', PTA_SA_URL . 'assets/student-area.js', [], PTA_SA_VERSION, true);
        }
    }

    public static function logo_url(): string {
        $id = (int) get_theme_mod('custom_logo');
        $url = $id ? wp_get_attachment_image_url($id, 'medium') : '';
        if (!$url && file_exists(WP_CONTENT_DIR . '/uploads/2026/11/pta-logo.webp')) {
            $url = content_url('/uploads/2026/11/pta-logo.webp');
        }
        return (string) apply_filters('pta_sa_logo_url', $url);
    }

    /** Title shown in the top bar. */
    public static function page_title(): string {
        foreach (self::menu_items([]) as $endpoint => $label) {
            if ($endpoint !== 'dashboard' && is_wc_endpoint_url($endpoint)) {
                return $label;
            }
        }
        if (is_wc_endpoint_url('view-order')) {
            return 'Order details';
        }
        if (is_wc_endpoint_url('add-payment-method')) {
            return 'Add a card';
        }
        return 'Dashboard';
    }

    /** Preview toggle, one-click course login, logout from Moodle, expired-link notice. */
    public static function handle_requests(): void {
        if (isset($_GET['pta_logout'])) {
            if (is_user_logged_in()) {
                wp_logout();
            }
            wp_safe_redirect(home_url('/'));
            exit;
        }
        if (!is_user_logged_in()) {
            return;
        }
        $account = wc_get_page_permalink('myaccount');

        if (isset($_GET['pta_preview']) && current_user_can('manage_woocommerce')) {
            update_user_meta(get_current_user_id(), 'pta_preview', $_GET['pta_preview'] === '1' ? 1 : 0);
            wp_safe_redirect($account);
            exit;
        }

        if (isset($_GET['pta_sso']) && function_exists('wc_add_notice')) {
            wc_add_notice('That course link expired before it opened. Please click the button again.', 'notice');
            wp_safe_redirect($account);
            exit;
        }

        if (isset($_GET['pta_go'])) {
            if (!wp_verify_nonce(sanitize_text_field(wp_unslash($_GET['_wpnonce'] ?? '')), 'pta_go')) {
                wp_safe_redirect($account);
                exit;
            }
            $moodle = PTA_SA_Bridge::moodle_url();
            $target = esc_url_raw((string) wp_unslash($_GET['to'] ?? ''));
            if (!str_starts_with($target, $moodle . '/')) {
                $target = $moodle . '/course/view.php?id=' . absint($_GET['pta_go']);
            }
            if (PTA_SA_Student::is_preview()) {
                wp_safe_redirect($account);
                exit;
            }
            $user = wp_get_current_user();
            PTA_SA_Student::forget($user->ID);
            $token = PTA_SA_Bridge::token('sso', PTA_SA_Bridge::identity($user) + ['wantsurl' => $target]);
            $url = $token ? $moodle . '/local/pta_bridge/sso.php?token=' . rawurlencode($token) : $target;
            wp_redirect($url); // phpcs:ignore WordPress.Security.SafeRedirect -- Moodle host only.
            exit;
        }
    }

    public static function allowed_hosts(array $hosts): array {
        $host = PTA_SA_Bridge::moodle_host();
        if ($host) {
            $hosts[] = $host;
        }
        return $hosts;
    }

    /** After logging out of WordPress, log out of Moodle too, then come back to the home page. */
    public static function logout_redirect($url) {
        $token = PTA_SA_Bridge::token('logout');
        return $token ? PTA_SA_Bridge::moodle_url('/local/pta_bridge/logout.php?token=' . rawurlencode($token)) : $url;
    }

    public static function account_intro(): void {
        echo '<p class="pta-sa-form-intro">Use your legal name exactly as it appears on your CTEC and PTIN accounts. We use these details to report your hours and print your certificate.</p>';
    }

    public static function account_fields(): void {
        $user = wp_get_current_user();
        $ctec = get_user_meta($user->ID, 'pta_ctec_id', true);
        $ptin = get_user_meta($user->ID, 'pta_ptin', true);
        $phone = get_user_meta($user->ID, 'billing_phone', true);
        ?>
        <fieldset class="pta-sa-fieldset">
            <legend>CTEC and IRS details</legend>
            <p class="woocommerce-form-row form-row form-row-first">
                <label for="pta_ctec_id">CTEC ID</label>
                <input type="text" class="woocommerce-Input input-text" name="pta_ctec_id" id="pta_ctec_id" autocomplete="off"
                       value="<?php echo esc_attr($ctec); ?>" placeholder="A123456" maxlength="7">
                <span class="pta-sa-field-help">The letter A and six numbers, from your CTEC account.</span>
            </p>
            <p class="woocommerce-form-row form-row form-row-last">
                <label for="pta_ptin">PTIN</label>
                <input type="text" class="woocommerce-Input input-text" name="pta_ptin" id="pta_ptin" autocomplete="off"
                       value="<?php echo esc_attr($ptin); ?>" placeholder="P12345678" maxlength="9">
                <span class="pta-sa-field-help">The letter P and eight numbers, from your IRS PTIN account.</span>
            </p>
            <p class="woocommerce-form-row form-row form-row-wide">
                <label for="billing_phone">Phone</label>
                <input type="tel" class="woocommerce-Input input-text" name="billing_phone" id="billing_phone" autocomplete="tel"
                       value="<?php echo esc_attr($phone); ?>">
            </p>
        </fieldset>
        <?php
    }

    public static function validate_account(WP_Error $errors): void {
        // phpcs:disable WordPress.Security.NonceVerification -- WooCommerce verifies the form nonce.
        $ctec = strtoupper(sanitize_text_field(wp_unslash($_POST['pta_ctec_id'] ?? '')));
        $ptin = strtoupper(sanitize_text_field(wp_unslash($_POST['pta_ptin'] ?? '')));
        // phpcs:enable
        if ($ctec !== '' && !preg_match('/^A\d{6}$/', $ctec)) {
            $errors->add('pta_ctec_id', 'Your CTEC ID should be the letter A followed by six numbers, like A123456.');
        }
        if ($ptin !== '' && !preg_match('/^P\d{8}$/', $ptin)) {
            $errors->add('pta_ptin', 'Your PTIN should be the letter P followed by eight numbers, like P12345678.');
        }
    }

    public static function save_account(int $user_id): void {
        // phpcs:disable WordPress.Security.NonceVerification -- WooCommerce verifies the form nonce.
        update_user_meta($user_id, 'pta_ctec_id', strtoupper(sanitize_text_field(wp_unslash($_POST['pta_ctec_id'] ?? ''))));
        update_user_meta($user_id, 'pta_ptin', strtoupper(sanitize_text_field(wp_unslash($_POST['pta_ptin'] ?? ''))));
        update_user_meta($user_id, 'billing_phone', sanitize_text_field(wp_unslash($_POST['billing_phone'] ?? '')));
        // phpcs:enable
        $user = get_userdata($user_id);
        if ($user) {
            PTA_SA_Bridge::call('profile', PTA_SA_Bridge::identity($user));
        }
    }

    /** The site menu's account link reads "Log In" when logged out and "My Account" when logged in. */
    public static function menu_label(array $items): array {
        $account = untrailingslashit((string) wc_get_page_permalink('myaccount'));
        foreach ($items as $item) {
            if (untrailingslashit((string) $item->url) === $account) {
                $item->title = is_user_logged_in() ? 'My Account' : 'Log In';
            }
        }
        return $items;
    }
}
