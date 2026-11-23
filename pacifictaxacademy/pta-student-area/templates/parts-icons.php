<?php
/**
 * Small inline icons.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

if (!function_exists('pta_sa_check_icon')) {
    /** The academy check mark: short navy stroke, long coral stroke. */
    function pta_sa_check_icon(int $size = 18): string {
        return '<svg class="pta-sa-check" width="' . $size . '" height="' . $size . '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
            . '<path d="M3 13.5 8.5 19" stroke="#04243F" stroke-width="3.2" stroke-linecap="round" fill="none"/>'
            . '<path d="M8.5 19 21 5" stroke="#FB5A35" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg>';
    }

    /** Short date like "Nov 12" (adds the year when it isn't this year). */
    function pta_sa_date($value): string {
        $ts = is_numeric($value) ? (int) $value : strtotime((string) $value);
        if (!$ts) {
            return '';
        }
        return wp_date(wp_date('Y', $ts) === wp_date('Y') ? 'M j' : 'M j, Y', $ts);
    }
}
