<?php
defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'CTEC completion reporting';
$string['reportname'] = 'CTEC reporting log';
$string['tasksendpending'] = 'Send pending completions to CTEC';
$string['enabled'] = 'Report completions to CTEC';
$string['enabled_desc'] = 'When a student completes a course listed below, send the completion to CTEC automatically.';
$string['mode'] = 'CTEC address';
$string['mode_desc'] = 'Test sends to CTEC\'s test address, which checks the record but does not add it to the roster. Switch to Live to report for real.';
$string['modetest'] = 'Test (nothing is recorded)';
$string['modelive'] = 'Live (adds students to the CTEC roster)';
$string['username'] = 'CTEC API username';
$string['username_desc'] = 'A provider user account from the CTEC Provider Admin Main Menu, Provider User Accounts tab.';
$string['password'] = 'CTEC API password';
$string['coursemap'] = 'Courses to report';
$string['coursemap_desc'] = 'One per line: Moodle course id = CTEC course number, for example 42=6280-QE-00007. QE start date and exam scores are sent for course numbers containing -QE-.';
$string['statequiz'] = 'State exam name contains';
$string['federalquiz'] = 'Federal exam name contains';
$string['ethicsquiz'] = 'Ethics exam name contains';
$string['quiz_desc'] = 'For QE courses: the quiz in the course whose name contains this text supplies the score.';
$string['privacy:metadata'] = 'Stores each student\'s course completion report sent to CTEC.';
