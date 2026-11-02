<?php
// CTC Disputes block: Stripe dispute list + evidence packets (from cataxcourses.com) on the Moodle dashboard,
// and the student activity feed the WordPress evidence packets use.
defined('MOODLE_INTERNAL') || die();
$plugin->component = 'block_ctc_disputes';
$plugin->version   = 2026110219;
$plugin->requires  = 2019052000; // Moodle 3.7
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.19';
