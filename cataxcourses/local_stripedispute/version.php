<?php
// Suspends Moodle accounts when Stripe reports a payment dispute (WooCommerce Stripe checkout).

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_stripedispute';
$plugin->version   = 2026102901;
$plugin->requires  = 2019052000; // Moodle 3.7.
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
