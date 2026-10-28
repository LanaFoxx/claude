<?php
defined('MOODLE_INTERNAL') || die();

$observers = [
    [
        'eventname' => '\core\event\course_completed',
        'callback'  => '\local_ctecreport\observer::course_completed',
        'internal'  => false, // Run after the completion is committed.
    ],
];
