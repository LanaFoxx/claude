<?php
// CTC Student: the student dashboard (current course, past courses, certificates by year, CTEC reporting status,
// CTEC ID / PTIN) and the simple email-only "forgot password" box.
defined('MOODLE_INTERNAL') || die();
$plugin->component = 'block_ctc_student';
$plugin->version   = 2026110209;
$plugin->requires  = 2019052000; // Moodle 3.7
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
