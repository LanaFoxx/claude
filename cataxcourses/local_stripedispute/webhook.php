<?php
// Stripe webhook endpoint: Stripe → Developers → Webhooks → add this URL for charge.dispute.* events.

define('NO_MOODLE_COOKIES', true);
define('NO_DEBUG_DISPLAY', true);
require_once(__DIR__ . '/../../config.php');

use local_stripedispute\manager;

$payload = file_get_contents('php://input');
$header = isset($_SERVER['HTTP_STRIPE_SIGNATURE']) ? $_SERVER['HTTP_STRIPE_SIGNATURE'] : '';
$problem = manager::verify_signature($payload, $header, (string)get_config('local_stripedispute', 'webhooksecret'));
if ($problem !== '') {
    http_response_code(400);
    echo $problem;
    exit;
}
$event = json_decode($payload, true);
if (!is_array($event)) {
    http_response_code(400);
    echo 'Invalid JSON.';
    exit;
}
try {
    $result = manager::handle_event($event);
} catch (\Throwable $e) {
    // Tell Stripe to retry later.
    http_response_code(500);
    echo 'Error';
    exit;
}
http_response_code(200);
echo $result;
