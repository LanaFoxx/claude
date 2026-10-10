<?php
defined('ABSPATH') || exit;

final class TCFD_Rest {
    public static function register(): void {
        register_rest_route('tcf/v1', '/providers', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [__CLASS__, 'providers'],
            'permission_callback' => '__return_true',
        ]);
    }

    public static function providers(): WP_REST_Response {
        $res = rest_ensure_response(TCFD_Store::all_payload());
        $res->header('Cache-Control', 'public, max-age=300');
        return $res;
    }
}
