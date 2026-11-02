<?php
// CTC Pre-orders: the 20 Hour pre-order lists (this year's on top, previous years below) on the admin dashboard.
defined('MOODLE_INTERNAL') || die();
$plugin->component = 'block_ctc_preorders';
$plugin->version   = 2026110201;
$plugin->requires  = 2019052000;
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.1';
$plugin->dependencies = ['block_ctc_courseupdate' => 2026110215];
