<?php
defined('MOODLE_INTERNAL') || die();
if ($ADMIN->fulltree) {
    $settings->add(new admin_setting_configpasswordunmask('block_ctc_courseupdate/anthropickey', 'Anthropic API key',
        'Used only by the textbook builder (Course update > Course textbook). Billed to your Anthropic account.', ''));
    $settings->add(new admin_setting_configtext('block_ctc_courseupdate/model', 'Claude model', 'Model that writes the textbook chapters.', 'claude-sonnet-5-5', PARAM_ALPHANUMEXT));
    $settings->add(new admin_setting_configtextarea('block_ctc_courseupdate/style', 'Textbook style notes',
        'Extra instructions for every chapter (tone, layout, what to leave out).',
        "Write for new and returning California tax preparers. Plain, clear sentences. Keep every number, threshold, date, form and line reference from the slides exactly. Turn slide bullets into readable paragraphs, keep lists where a list is clearer, and use tables for figures and limits. Leave out the slide preamble about phone numbers, refund policy and course numbers."));
}
