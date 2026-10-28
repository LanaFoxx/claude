<?php
defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Stripe dispute lockout';
$string['reportname'] = 'Stripe disputes';
$string['enabled'] = 'Suspend accounts automatically';
$string['enabled_desc'] = 'When Stripe reports a new dispute, suspend the Moodle account with the buyer\'s email. When off, disputes are recorded but nobody is suspended.';
$string['webhooksecret'] = 'Stripe webhook signing secret';
$string['webhooksecret_desc'] = 'Starts with whsec_. Shown in Stripe → Developers → Webhooks after adding the endpoint {$a}';
$string['apikey'] = 'Stripe restricted API key';
$string['apikey_desc'] = 'A restricted key (rk_live_...) with read access to Charges and Customers, used to find the buyer\'s email.';
$string['privacy:metadata'] = 'Stores the email, name and Stripe dispute details of buyers who dispute a payment.';
