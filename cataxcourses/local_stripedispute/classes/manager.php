<?php
namespace local_stripedispute;

defined('MOODLE_INTERNAL') || die();

/**
 * Handles Stripe dispute events: finds the buyer's Moodle account by email and suspends it.
 */
class manager {

    /** Seconds a webhook signature stays valid (Stripe's recommended tolerance). */
    const TOLERANCE = 300;

    /**
     * Check a Stripe-Signature header against the raw body. Returns '' if valid, otherwise the reason.
     */
    public static function verify_signature($payload, $header, $secret, $now = null) {
        if ($secret === '') {
            return 'No webhook signing secret is configured.';
        }
        $timestamp = null;
        $signatures = [];
        foreach (explode(',', (string)$header) as $part) {
            $kv = explode('=', trim($part), 2);
            if (count($kv) !== 2) {
                continue;
            }
            if ($kv[0] === 't') {
                $timestamp = (int)$kv[1];
            } else if ($kv[0] === 'v1') {
                $signatures[] = $kv[1];
            }
        }
        if (!$timestamp || !$signatures) {
            return 'Missing or malformed Stripe-Signature header.';
        }
        if (abs(($now ?: time()) - $timestamp) > self::TOLERANCE) {
            return 'Signature timestamp is too old.';
        }
        $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
        foreach ($signatures as $sig) {
            if (hash_equals($expected, $sig)) {
                return '';
            }
        }
        return 'Signature does not match.';
    }

    /** GET a Stripe API object. Returns the decoded array, or null. */
    public static function stripe_get($path) {
        global $CFG;
        $key = (string)get_config('local_stripedispute', 'apikey');
        if ($key === '') {
            return null;
        }
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl(['ignoresecurity' => true]);
        $curl->setHeader(['Authorization: Bearer ' . $key]);
        $body = $curl->get('https://api.stripe.com/v1/' . $path, [], ['CURLOPT_TIMEOUT' => 20]);
        $info = $curl->get_info();
        if ($curl->get_errno() || empty($info['http_code']) || $info['http_code'] != 200) {
            return null;
        }
        $data = json_decode($body, true);
        return is_array($data) ? $data : null;
    }

    /**
     * Buyer details for a charge: emails (most trusted first), name and WooCommerce order number.
     * WooCommerce's Stripe gateway stores customer_email, customer_name and order_id in the charge metadata.
     */
    public static function buyer_from_charge(array $charge) {
        $meta = isset($charge['metadata']) && is_array($charge['metadata']) ? $charge['metadata'] : [];
        $billing = isset($charge['billing_details']) && is_array($charge['billing_details']) ? $charge['billing_details'] : [];
        $customer = isset($charge['customer']) && is_array($charge['customer']) ? $charge['customer'] : [];
        $emails = [];
        // This store's WooCommerce Stripe gateway labels it "Billing Email"; newer versions use customer_email.
        foreach ([$meta['Billing Email'] ?? null, $meta['customer_email'] ?? null, $billing['email'] ?? null,
                  $charge['receipt_email'] ?? null, $customer['email'] ?? null] as $email) {
            $email = \core_text::strtolower(trim((string)$email));
            if ($email !== '' && validate_email($email) && !in_array($email, $emails)) {
                $emails[] = $email;
            }
        }
        $name = '';
        foreach ([$meta['customer_name'] ?? null, $billing['name'] ?? null, $customer['name'] ?? null] as $candidate) {
            if (trim((string)$candidate) !== '') {
                $name = trim((string)$candidate);
                break;
            }
        }
        $order = trim((string)($meta['order_id'] ?? ''));
        $products = trim((string)($meta['Products'] ?? ''));
        return ['emails' => $emails, 'name' => $name, 'orderid' => $order, 'products' => $products];
    }

    /** Moodle accounts (not deleted) with any of these emails, keyed by id. */
    public static function find_users(array $emails) {
        global $DB;
        if (!$emails) {
            return [];
        }
        list($insql, $params) = $DB->get_in_or_equal($emails);
        return $DB->get_records_select('user', "deleted = 0 AND LOWER(email) $insql", $params, 'id',
            'id, username, email, suspended, firstname, lastname');
    }

    /** Suspend an account and sign it out everywhere. */
    public static function suspend($user) {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/user/lib.php');
        $DB->set_field('user', 'suspended', 1, ['id' => $user->id]);
        $DB->set_field('user', 'timemodified', time(), ['id' => $user->id]);
        \core\session\manager::kill_user_sessions($user->id);
        \core\event\user_updated::create_from_userid($user->id)->trigger();
    }

    public static function unsuspend($userid) {
        global $DB;
        $DB->set_field('user', 'suspended', 0, ['id' => $userid]);
        $DB->set_field('user', 'timemodified', time(), ['id' => $userid]);
        \core\event\user_updated::create_from_userid($userid)->trigger();
    }

    /**
     * Handle a verified Stripe event. Returns a short description of what happened.
     */
    public static function handle_event(array $event) {
        global $DB;
        $type = $event['type'] ?? '';
        $dispute = $event['data']['object'] ?? null;
        if (!is_array($dispute) || strpos($type, 'charge.dispute.') !== 0 || empty($dispute['id'])) {
            return 'ignored ' . $type;
        }
        $now = time();
        $rec = $DB->get_record('local_stripedispute', ['disputeid' => $dispute['id']]);
        if ($rec) {
            // Later events (updated, closed, funds withdrawn...) only update the dispute status.
            $rec->status = (string)($dispute['status'] ?? $rec->status);
            $rec->timemodified = $now;
            $DB->update_record('local_stripedispute', $rec);
            return 'updated ' . $rec->disputeid . ' status ' . $rec->status;
        }
        $rec = self::new_record($dispute);
        $rec->id = $DB->insert_record('local_stripedispute', $rec);
        return self::process($rec);
    }

    /**
     * Load disputes that already exist in Stripe (before the webhook was set up). Nobody is suspended.
     * Returns the number imported.
     */
    public static function import_existing() {
        global $DB;
        $count = 0;
        $after = null;
        do {
            $page = self::stripe_get('disputes?limit=100' . ($after ? '&starting_after=' . rawurlencode($after) : ''));
            if (!$page || empty($page['data'])) {
                break;
            }
            foreach ($page['data'] as $dispute) {
                $after = $dispute['id'];
                if ($DB->record_exists('local_stripedispute', ['disputeid' => $dispute['id']])) {
                    continue;
                }
                $rec = self::new_record($dispute);
                $rec->id = $DB->insert_record('local_stripedispute', $rec);
                self::process($rec, true);
                $count++;
            }
        } while (!empty($page['has_more']));
        return $count;
    }

    /** A new dispute row from a Stripe dispute object (dated by Stripe's creation time). */
    public static function new_record(array $dispute) {
        return (object)[
            'disputeid' => $dispute['id'],
            'chargeid' => is_string($dispute['charge'] ?? null) ? $dispute['charge'] : ($dispute['charge']['id'] ?? null),
            'amount' => $dispute['amount'] ?? null,
            'currency' => $dispute['currency'] ?? null,
            'reason' => $dispute['reason'] ?? null,
            'status' => $dispute['status'] ?? null,
            'outcome' => 'pending',
            'timecreated' => !empty($dispute['created']) ? (int)$dispute['created'] : time(),
            'timemodified' => time(),
        ];
    }

    /**
     * The standing rule: suspend for disputes opened within the last N days (default 120, about 4 months),
     * except disputes the business won. Returns '' when the rule allows suspension, otherwise why not.
     */
    public static function rule_blocks($rec) {
        $days = (int)get_config('local_stripedispute', 'maxagedays') ?: 120;
        if ($rec->timecreated < time() - $days * DAYSECS) {
            return "Dispute is older than $days days, so the account was not suspended.";
        }
        if ($rec->status === 'won') {
            return 'Dispute was won, so the account was not suspended.';
        }
        return '';
    }

    /**
     * Daily check: add any Stripe dispute the webhook missed and apply the rule to it.
     * Disputes already recorded are never re-processed, so restored accounts stay restored.
     */
    public static function sync_new() {
        global $DB;
        $count = 0;
        $since = time() - ((int)get_config('local_stripedispute', 'maxagedays') ?: 120) * DAYSECS;
        $after = null;
        do {
            $page = self::stripe_get('disputes?limit=100&created[gte]=' . $since . ($after ? '&starting_after=' . rawurlencode($after) : ''));
            if (!$page || empty($page['data'])) {
                break;
            }
            foreach ($page['data'] as $dispute) {
                $after = $dispute['id'];
                if ($DB->record_exists('local_stripedispute', ['disputeid' => $dispute['id']])) {
                    continue;
                }
                $rec = self::new_record($dispute);
                $rec->id = $DB->insert_record('local_stripedispute', $rec);
                self::process($rec);
                $count++;
            }
        } while (!empty($page['has_more']));
        return $count;
    }

    /** Find the buyer for a recorded dispute and suspend their account if exactly one match. */
    public static function process($rec, $dryrun = false) {
        global $DB;
        $charge = $rec->chargeid ? self::stripe_get('charges/' . rawurlencode($rec->chargeid) . '?expand[]=customer') : null;
        if (!$charge) {
            $rec->outcome = 'error';
            $rec->note = 'Could not read the payment from Stripe (check the restricted API key). Review this dispute by hand.';
        } else {
            $buyer = self::buyer_from_charge($charge);
            $rec->email = $buyer['emails'] ? $buyer['emails'][0] : null;
            $rec->name = $buyer['name'];
            $rec->orderid = $buyer['orderid'];
            $products = $buyer['products'] !== '' ? ' Order: ' . $buyer['products'] . '.' : '';
            $users = self::find_users($buyer['emails']);
            if (!$users) {
                $rec->outcome = 'nomatch';
                $rec->note = 'No Moodle account uses ' . ($buyer['emails'] ? implode(' or ', $buyer['emails']) : 'the payment email') .
                    '. Nobody was suspended.';
            } else if (count($users) > 1) {
                $rec->outcome = 'multiple';
                $rec->note = count($users) . ' Moodle accounts match ' . implode(' / ', $buyer['emails']) . '. Nobody was suspended.';
            } else {
                $user = reset($users);
                $rec->userid = $user->id;
                if (is_siteadmin($user)) {
                    $rec->outcome = 'admin';
                    $rec->note = 'The matching account is a site administrator, so it was not suspended.';
                } else if ($user->suspended) {
                    $rec->outcome = 'alreadysuspended';
                    $rec->note = 'Account was already suspended.';
                } else if (!$dryrun && ($blocked = self::rule_blocks($rec)) !== '') {
                    $rec->outcome = 'dryrun';
                    $rec->note = $blocked . $products;
                } else if ($dryrun || !get_config('local_stripedispute', 'enabled')) {
                    $rec->outcome = 'dryrun';
                    $rec->note = ($dryrun ? 'Imported from Stripe; not suspended. Use Remove access to suspend.'
                        : 'Automatic suspension is off, so the account was not suspended.') . $products;
                } else {
                    self::suspend($user);
                    $rec->outcome = 'suspended';
                    $rec->note = 'Account suspended automatically.' . $products;
                }
            }
        }
        $rec->timemodified = time();
        $DB->update_record('local_stripedispute', $rec);
        return $rec->outcome;
    }
}
