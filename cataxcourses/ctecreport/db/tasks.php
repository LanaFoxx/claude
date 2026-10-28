<?php
defined('MOODLE_INTERNAL') || die();

$tasks = [
    [
        'classname' => '\local_ctecreport\task\send_pending',
        'blocking'  => 0,
        'minute'    => '*/15',
        'hour'      => '*',
        'day'       => '*',
        'month'     => '*',
        'dayofweek' => '*',
    ],
];
