<?php
// GLEC theme: Boost child styled to match the new georgialicenseexam.com.
// Students get a redesigned course page and a video playlist; everything else is Boost with GLEC tokens.
defined('MOODLE_INTERNAL') || die();
require_once(__DIR__ . '/lib.php');

$THEME->name = 'glec';
$THEME->parents = ['boost'];
$THEME->sheets = [];
$THEME->editor_sheets = [];
$THEME->editor_scss = ['editor'];
$THEME->usefallback = true;
$THEME->scss = function($theme) { return theme_glec_get_main_scss_content($theme); };
$THEME->prescsscallback = 'theme_glec_get_pre_scss';
$THEME->extrascsscallback = 'theme_glec_get_extra_scss';
$THEME->rendererfactory = 'theme_overridden_renderer_factory';
$THEME->requiredblocks = '';
$THEME->addblockposition = BLOCK_ADDBLOCK_POSITION_FLATNAV;
$THEME->iconsystem = \core\output\icon_system::FONTAWESOME;
$THEME->enable_dock = false;
$THEME->yuicssmodules = [];

$side = ['file' => 'columns2.php', 'regions' => ['side-pre'], 'defaultregion' => 'side-pre'];
$THEME->layouts = [
    'base' => ['file' => 'columns2.php', 'regions' => []],
    'standard' => $side,
    'course' => ['file' => 'course.php', 'regions' => ['side-pre'], 'defaultregion' => 'side-pre', 'options' => ['langmenu' => true]],
    'coursecategory' => $side,
    'incourse' => ['file' => 'incourse.php', 'regions' => ['side-pre'], 'defaultregion' => 'side-pre'],
    'frontpage' => $side + ['options' => ['nonavbar' => true]],
    'admin' => $side,
    'mydashboard' => $side + ['options' => ['nonavbar' => true, 'langmenu' => true, 'nocontextheader' => true]],
    'mypublic' => $side,
    'login' => ['file' => 'login.php', 'regions' => [], 'options' => ['langmenu' => true]],
    'popup' => ['file' => 'columns1.php', 'regions' => [], 'options' => ['nofooter' => true, 'nonavbar' => true]],
    'frametop' => ['file' => 'columns1.php', 'regions' => [], 'options' => ['nofooter' => true, 'nocoursefooter' => true]],
    'embedded' => ['file' => 'embedded.php', 'regions' => ['side-pre'], 'defaultregion' => 'side-pre'],
    'maintenance' => ['file' => 'maintenance.php', 'regions' => []],
    'print' => ['file' => 'columns1.php', 'regions' => [], 'options' => ['nofooter' => true, 'nonavbar' => false]],
    'redirect' => ['file' => 'embedded.php', 'regions' => []],
    'report' => $side,
    'secure' => ['file' => 'secure.php', 'regions' => ['side-pre'], 'defaultregion' => 'side-pre'],
];
