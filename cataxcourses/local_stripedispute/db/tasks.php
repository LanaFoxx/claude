<?php
defined('MOODLE_INTERNAL') || die();

$tasks = [
    [
        'classname' => '\local_stripedispute\task\sync_disputes',
        'blocking' => 0,
        'minute' => '17',
        'hour' => '5',
        'day' => '*',
        'month' => '*',
        'dayofweek' => '*',
    ],
];
