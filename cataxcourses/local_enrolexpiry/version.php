<?php
// 60 Hour courses: exams close one year after enrolment (new purchases from 29 Oct 2026), with reminder emails.

defined('MOODLE_INTERNAL') || die();

$plugin->component = 'local_enrolexpiry';
$plugin->version   = 2026102900;
$plugin->requires  = 2019052000; // Moodle 3.7.
$plugin->maturity  = MATURITY_STABLE;
$plugin->release   = '1.0';
