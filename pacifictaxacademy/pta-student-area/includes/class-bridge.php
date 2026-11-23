<?php
/**
 * Signed connection to the Moodle plugin local_pta_bridge.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

class PTA_SA_Bridge {

    /** The secret both sites read from one file outside the web roots. */
    public static function secret(): string {
        $path = PTA_SA_Settings::get('secret_path') ?: dirname(untrailingslashit(ABSPATH)) . '/.pta-bridge-secret';
        if (!is_readable($path)) {
            return '';
        }
        $value = trim((string) file_get_contents($path));
        return strlen($value) >= 64 ? $value : '';
    }

    public static function moodle_url(string $path = ''): string {
        return untrailingslashit(PTA_SA_Settings::get('moodle_url')) . $path;
    }

    public static function moodle_host(): string {
        return (string) wp_parse_url(self::moodle_url(), PHP_URL_HOST);
    }

    private static function b64(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /** Signed single-use token for sso.php or logout.php. */
    public static function token(string $purpose, array $claims = []): string {
        $secret = self::secret();
        if ($secret === '') {
            return '';
        }
        $payload = array_merge($claims, [
            'act' => $purpose,
            'exp' => time() + 60,
            'nonce' => bin2hex(random_bytes(16)),
        ]);
        $body = self::b64(wp_json_encode($payload));
        return $body . '.' . self::b64(hash_hmac('sha256', $body, $secret, true));
    }

    /** Identity claims for a WordPress user. */
    public static function identity(WP_User $user): array {
        return [
            'wpid' => (int) $user->ID,
            'email' => $user->user_email,
            'firstname' => $user->first_name ?: get_user_meta($user->ID, 'billing_first_name', true),
            'lastname' => $user->last_name ?: get_user_meta($user->ID, 'billing_last_name', true),
        ];
    }

    /**
     * Call the Moodle API. Returns the decoded response, or null on any failure.
     */
    public static function call(string $action, array $data = []): ?array {
        $secret = self::secret();
        if ($secret === '') {
            return null;
        }
        $body = wp_json_encode(array_merge($data, ['action' => $action]));
        $time = (string) time();
        $response = wp_remote_post(self::moodle_url('/local/pta_bridge/api.php'), [
            'timeout' => 8,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-PTA-Time' => $time,
                'X-PTA-Sign' => hash_hmac('sha256', $time . "\n" . $body, $secret),
            ],
            'body' => $body,
        ]);
        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200) {
            return null;
        }
        $decoded = json_decode(wp_remote_retrieve_body($response), true);
        return is_array($decoded) && !empty($decoded['ok']) ? $decoded : null;
    }

    /** Connection status for the settings page. */
    public static function status(): array {
        if (self::secret() === '') {
            return ['ok' => false, 'message' => 'Waiting for the shared secret file. Install the Moodle plugin "Pacific Tax Academy bridge"; it creates the file.'];
        }
        $ping = self::call('ping');
        return $ping
            ? ['ok' => true, 'message' => 'Connected to Moodle ' . ($ping['release'] ?? '') . '.']
            : ['ok' => false, 'message' => 'The secret file exists, but Moodle did not answer. Check the Moodle URL and that the bridge plugin is installed.'];
    }
}
