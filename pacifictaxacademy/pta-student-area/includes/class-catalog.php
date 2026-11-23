<?php
/**
 * The courses the academy sells and what CTEC requires of each.
 *
 * @package PTA_Student_Area
 */

defined('ABSPATH') || exit;

class PTA_SA_Catalog {

    /** Course codes (the start of each Moodle short name), in the order CTEC lists them. */
    public static function all(): array {
        return [
            'FTL'  => ['label' => 'Federal Tax Law', 'hours' => 10, 'irs' => true, 'group' => 'renewal'],
            'UPD'  => ['label' => 'Federal Tax Law Update', 'hours' => 3, 'irs' => true, 'group' => 'renewal'],
            'ETH'  => ['label' => 'Ethics', 'hours' => 2, 'irs' => true, 'group' => 'renewal'],
            'CA'   => ['label' => 'California Tax Law', 'hours' => 5, 'irs' => false, 'group' => 'renewal'],
            'QE60' => ['label' => '60-Hour Qualifying Education', 'hours' => 60, 'irs' => false, 'group' => 'qe'],
        ];
    }

    /** Course code and CE year from a Moodle short name such as "FTL-2027". */
    public static function parse(string $shortname): array {
        if (preg_match('/^([A-Z0-9]+)[-_ ]?(\d{4})?$/i', trim($shortname), $m)) {
            $code = strtoupper($m[1]);
            if (isset(self::all()[$code])) {
                return ['code' => $code, 'year' => isset($m[2]) ? (int) $m[2] : self::current_year()];
            }
        }
        return ['code' => '', 'year' => self::current_year()];
    }

    /** The CE year runs November 1 to October 31 and is named for the year it ends. */
    public static function current_year(): int {
        $now = current_datetime();
        $year = (int) $now->format('Y');
        return (int) $now->format('n') >= 11 ? $year + 1 : $year;
    }

    /** Renewal hours required each year. */
    public static function renewal_hours(): int {
        $total = 0;
        foreach (self::all() as $item) {
            if ($item['group'] === 'renewal') {
                $total += $item['hours'];
            }
        }
        return $total;
    }
}
