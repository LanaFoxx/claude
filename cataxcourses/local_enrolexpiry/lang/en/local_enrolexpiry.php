<?php
defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = '60 Hour one-year exam access';
$string['taskname'] = 'Close 60 Hour exams after one year and send reminders';
$string['enabled'] = 'Apply the one-year rule';
$string['enabled_desc'] = 'For enrolments in courses whose name contains the text below, close every exam one year after the enrolment date and email reminders 30, 14 and 3 days before.';
$string['coursematch'] = 'Course name contains';
$string['coursematch_desc'] = 'Applies to every course whose full name contains this text.';
$string['startdate'] = 'Only enrolments on or after';
$string['startdate_desc'] = 'Students who enrolled before this date are not affected.';
$string['purchaseurl'] = 'Where to buy the current course';
$string['purchaseurl_desc'] = 'Link included in the reminder emails.';
$string['privacy:metadata'] = 'Records which reminder emails were sent to each student.';
