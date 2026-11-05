<?php
namespace local_ctctutor\privacy;
defined('MOODLE_INTERNAL') || die();
use core_privacy\local\metadata\collection;
class provider implements \core_privacy\local\metadata\provider, \core_privacy\local\request\data_provider {
    public static function get_metadata(collection $collection) : collection {
        $collection->add_external_location_link('anthropic', ['question' => 'privacy:metadata:anthropic:question',
            'course' => 'privacy:metadata:anthropic:course'], 'privacy:metadata:anthropic');
        return $collection;
    }
}
