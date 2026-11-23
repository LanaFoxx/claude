<?php
/**
 * Settings → PTA Student Area.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

class PTA_SA_Settings {

    const OPTION = 'pta_sa_settings';

    /** Defaults for every setting. */
    public static function defaults(): array {
        return [
            'moodle_url'   => 'https://course.pacifictaxacademy.com',
            'secret_path'  => '',
            'phone'        => '(844) 443-4797',
            'email'        => 'info@pacifictaxacademy.com',
            'hours'        => 'Mon–Fri, 9am–6pm PT',
            'report_days'  => '',
            'browse_url'   => '/single-courses/',
            'renewal_url'  => '/20-hour-ctec-renewal/',
            'qe_url'       => '/60-hour-qualifying-course/',
            'refund_url'   => '/refund-policy/',
            'terms_url'    => '/terms/',
            'privacy_url'  => '/privacy-policy-2/',
            'questions_url' => '/questions/',
        ];
    }

    public static function get(string $key): string {
        $options = get_option(self::OPTION, []);
        $value = is_array($options) && isset($options[$key]) && $options[$key] !== '' ? $options[$key] : (self::defaults()[$key] ?? '');
        return (string) $value;
    }

    /** A site URL setting, made absolute. */
    public static function url(string $key): string {
        $value = self::get($key);
        return str_starts_with($value, '/') ? home_url($value) : $value;
    }

    public static function init(): void {
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('admin_init', [__CLASS__, 'register']);
    }

    public static function menu(): void {
        add_options_page('PTA Student Area', 'PTA Student Area', 'manage_options', 'pta-student-area', [__CLASS__, 'page']);
    }

    public static function register(): void {
        register_setting('pta_sa', self::OPTION, [
            'type' => 'array',
            'sanitize_callback' => static function ($input) {
                $clean = [];
                foreach (array_keys(self::defaults()) as $key) {
                    $clean[$key] = isset($input[$key]) ? sanitize_text_field(wp_unslash($input[$key])) : '';
                }
                return $clean;
            },
        ]);
    }

    public static function page(): void {
        $labels = [
            'moodle_url'  => 'Moodle URL',
            'secret_path' => 'Shared secret file (leave empty for automatic)',
            'phone'       => 'Support phone',
            'email'       => 'Support email',
            'hours'       => 'Support hours',
            'report_days' => 'Business days to report hours (shown on the dashboard; leave empty to hide)',
            'browse_url'  => 'Browse courses link',
            'renewal_url' => '20-Hour Renewal page',
            'qe_url'      => '60-Hour Qualifying page',
            'refund_url'  => 'Refund Policy page',
            'terms_url'   => 'Terms page',
            'privacy_url' => 'Privacy page',
            'questions_url' => 'Questions page',
        ];
        $status = PTA_SA_Bridge::status();
        ?>
        <div class="wrap">
            <h1>PTA Student Area</h1>
            <p><strong>Moodle connection:</strong> <?php echo esc_html($status['message']); ?></p>
            <form method="post" action="options.php">
                <?php settings_fields('pta_sa'); ?>
                <table class="form-table" role="presentation">
                    <?php foreach ($labels as $key => $label) : ?>
                        <tr>
                            <th scope="row"><label for="pta-<?php echo esc_attr($key); ?>"><?php echo esc_html($label); ?></label></th>
                            <td><input class="regular-text" id="pta-<?php echo esc_attr($key); ?>" name="<?php echo esc_attr(self::OPTION . '[' . $key . ']'); ?>"
                                value="<?php echo esc_attr(get_option(self::OPTION, [])[$key] ?? ''); ?>"
                                placeholder="<?php echo esc_attr(self::defaults()[$key]); ?>"></td>
                        </tr>
                    <?php endforeach; ?>
                </table>
                <?php submit_button(); ?>
            </form>
            <h2>Course codes</h2>
            <p>Moodle course short names use a code and the CE year, for example <code>FTL-2027</code>. Put the short names a product enrolls in on the product's General tab (field "Moodle courses").</p>
            <ul>
                <?php foreach (PTA_SA_Catalog::all() as $code => $item) : ?>
                    <li><code><?php echo esc_html($code); ?></code> — <?php echo esc_html($item['label'] . ' (' . $item['hours'] . ' hours)'); ?></li>
                <?php endforeach; ?>
            </ul>
            <p>Admins can preview the dashboard with sample data: <a href="<?php echo esc_url(add_query_arg('pta_preview', '1', wc_get_page_permalink('myaccount'))); ?>">open preview</a>.</p>
        </div>
        <?php
    }
}
