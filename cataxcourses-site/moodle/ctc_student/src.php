<?php
// Site admin: list/download the source of the store enrollment plugin (local_mdl_course_enroll).
require_once(__DIR__ . '/../../config.php');
require_login();
if (!is_siteadmin()) { throw new moodle_exception('nopermissions', 'error', '', 'site admin'); }
$plug = optional_param('p', 'local/mdl_course_enroll', PARAM_PATH);
if (!in_array($plug, ['local/mdl_course_enroll', 'local/ctecreport', 'blocks/ctecreport', 'blocks/studenttools', 'theme/space/layout', 'theme/space/templates'], true)) die('no');
$dir = $CFG->dirroot . '/' . $plug;
$f = optional_param('f', '', PARAM_PATH);
if ($f !== '') { $p = realpath($dir . '/' . $f); if (strpos($p, realpath($dir)) !== 0) die('no'); header('Content-Type: application/octet-stream'); readfile($p); die; }
header('Content-Type: text/plain; charset=utf-8');
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
foreach ($it as $file) { $rel = substr($file->getPathname(), strlen($dir) + 1); if (optional_param('all', 0, PARAM_INT) && preg_match('/\.(php|mustache|js)$/', $rel) && strpos($rel, 'amd/build') === false) { echo "\n===== $rel\n" . file_get_contents($file->getPathname()) . "\n"; continue; }
    echo $rel . "\t" . $file->getSize() . "\t" . date('Y-m-d', $file->getMTime()) . "\n"; }
echo "writable:" . (is_writable($dir) ? 1 : 0) . " " . (is_writable($dir . '/enrollcourse.php') ? 1 : 0) . "\n";
