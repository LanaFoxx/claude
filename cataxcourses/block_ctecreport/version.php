<?php
// Dashboard list of CTEC completion reports that need an admin.

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'block_ctecreport';
$plugin->version   = 2026102903;
$plugin->requires  = 2019052000; // Moodle 3.7.
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
$plugin->dependencies = ['local_ctecreport' => 2026102901];
