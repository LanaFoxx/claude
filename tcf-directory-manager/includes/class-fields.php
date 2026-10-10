<?php
defined('ABSPATH') || exit;

/**
 * Field schema for provider listings. Field keys/names match the original Data Manager
 * so existing provider data keeps working; course features are new in 2.0.
 */
final class TCFD_Fields {

    /** Directory filter groups => [meta key => label]. Keys match the front-end filters. */
    const FEATURES = [
        'Delivery / Format' => [
            'online_course_available' => 'Online Course',
            'in_person_course_available' => 'In-Person Course',
            'self_paced' => 'Self-Paced',
            'live_instruction_available' => 'Live Instruction',
        ],
        'Course Materials' => [
            'physical_book_available' => 'Physical Book',
            'digital_book_available' => 'Digital Book',
            'downloadable_materials' => 'Downloadable Materials',
        ],
        'Video / Learning Format' => [
            'video_lessons_available' => 'Video Lessons',
            'text_based_course_available' => 'Text-Based Course',
            'audio_content_available' => 'Audio Content',
        ],
        'Support' => [
            'phone_support' => 'Phone Support',
            'email_support' => 'Email Support',
            'live_chat_support' => 'Live Chat Support',
        ],
        'Study Features' => [
            'practice_exams' => 'Practice Exams',
            'progress_tracking' => 'Progress Tracking',
        ],
        'Device / Access' => [
            'mobile_friendly' => 'Mobile Friendly',
            'desktop_access' => 'Desktop Access',
        ],
    ];

    const CE_PRICE_TYPES = [
        'package' => 'Complete Package', 'package_sale' => 'Complete Package Sale', 'bundle_non_ctec_specific' => 'Non-CTEC-Specific Bundle',
        'per_unit' => 'Per Unit', 'membership' => 'Membership', 'membership_benefit' => 'Membership Benefit', 'event_partial_ce' => 'Partial CE Event',
        'credit_package' => 'Credit Package', 'credit_package_sale' => 'Credit Package Sale', 'subscription_non_ctec_specific' => 'General CPE Subscription',
        'free_partial_ce' => 'Free / Partial CE', 'custom_quote' => 'Custom Quote', 'not_public' => 'No Public Price', 'other' => 'Other',
    ];

    const QE_PRICE_TYPES = [
        'package' => 'Complete Package', 'package_sale' => 'Complete Package Sale', 'per_unit' => 'Per Unit', 'membership' => 'Membership',
        'career_program' => 'Broader Career Program', 'free_tuition_materials' => 'Free Tuition / Materials Extra',
        'free_course_materials' => 'Free Course / Materials Extra', 'location_variable' => 'Varies by Location', 'custom_quote' => 'Custom Quote',
        'not_public' => 'No Public Price', 'other' => 'Other',
    ];

    const PRICE_STATUS = ['VERIFIED' => 'VERIFIED', 'REVIEW' => 'REVIEW', 'NEEDS_RESCAN' => 'NEEDS_RESCAN'];
    const OFFER_TYPES = ['Coupon Code' => 'Coupon Code', 'Sale' => 'Sale', 'Special Offer' => 'Special Offer', 'Member Offer' => 'Member Offer'];
    const OFFER_SCOPES = ['20-Hour CE' => '20-Hour CE', '60-Hour QE' => '60-Hour QE', 'Both' => 'Both', 'Other' => 'Other'];
    const DISCOUNT_TYPES = ['Percent' => 'Percent', 'Dollar' => 'Dollar', 'Sale Price' => 'Sale Price', 'Text Offer' => 'Text Offer'];
    const OFFER_STATUSES = [
        'VERIFIED PUBLIC CODE' => 'VERIFIED PUBLIC CODE (shown on site)',
        'VERIFIED PUBLIC OFFER' => 'VERIFIED PUBLIC OFFER (shown on site)',
        'VERIFIED MEMBER OFFER' => 'VERIFIED MEMBER OFFER (shown on site)',
        'VERIFIED MEMBER CODE' => 'VERIFIED MEMBER CODE (shown on site)',
        'VERIFIED' => 'VERIFIED (shown on site)',
        'NEEDS REVIEW' => 'NEEDS REVIEW (hidden until verified)',
        'REVIEW' => 'REVIEW (hidden until verified)',
        'EXPIRED' => 'EXPIRED (hidden)',
    ];
    const GOOGLE_STATUS = ['Verified' => 'Verified', 'Manual Review' => 'Manual Review', 'Do Not Display' => 'Do Not Display'];

    /** All feature keys, flat. */
    public static function feature_keys(): array {
        $out = [];
        foreach (self::FEATURES as $items) {
            foreach ($items as $k => $l) $out[$k] = $l;
        }
        return $out;
    }

    /**
     * Scalar (non-repeater) fields: name => [key, type, label].
     * type: text|url|textarea|number|bool|date|select|datetime|image
     */
    public static function scalars(): array {
        static $out = null;
        if ($out !== null) return $out;
        $out = [
            'provider_display_name' => ['field_tcf_provider_display_name', 'text', 'Provider Display Name'],
            'provider_logo' => ['field_tcf_provider_logo', 'image', 'Provider Logo'],
            'provider_website' => ['field_tcf_provider_website', 'url', 'Provider Website'],
            'provider_ctec_number' => ['field_tcf_provider_ctec_number', 'text', 'CTEC Provider Number'],
            'ctec_offering' => ['field_tcf_ctec_offering', 'select', 'CTEC Offering'],
            'offers_20_hour_ce' => ['field_tcf_offers_20_hour_ce', 'bool', 'Offers 20-Hour CE'],
            'offers_60_hour_qe' => ['field_tcf_offers_60_hour_qe', 'bool', 'Offers 60-Hour QE'],
            'provider_verified' => ['field_tcf_provider_verified', 'bool', 'Provider Verified'],
            'provider_data_last_checked' => ['field_tcf_provider_data_last_checked', 'date', 'Overall Data Last Checked'],
        ];
        foreach (['ce' => 'CE', 'qe' => 'QE'] as $p => $L) {
            $out[$p . '_current_price'] = ['field_tcf_' . $p . '_current_price', 'number', $L . ' Current Price'];
            $out[$p . '_regular_price'] = ['field_tcf_' . $p . '_regular_price', 'number', $L . ' Regular Price'];
            $out[$p . '_price_display_text'] = ['field_tcf_' . $p . '_price_display_text', 'text', $L . ' Display Price'];
            $out[$p . '_price_type'] = ['field_tcf_' . $p . '_price_type', 'select', $L . ' Price Type'];
            $out[$p . '_price_status'] = ['field_tcf_' . $p . '_price_status', 'select', $L . ' Price Status'];
            $out[$p . '_price_notes'] = ['field_tcf_' . $p . '_price_notes', 'textarea', $L . ' Price Notes'];
            $out[$p . '_price_source_url'] = ['field_tcf_' . $p . '_price_source_url', 'url', $L . ' Price Source URL'];
            $out[$p . '_price_last_checked'] = ['field_tcf_' . $p . '_price_last_checked', 'date', $L . ' Price Last Checked'];
            $out[$p . '_course_url'] = ['field_tcf_' . $p . '_course_url', 'url', $L . ' Course URL'];
        }
        foreach (self::feature_keys() as $k => $l) {
            $out[$k] = ['field_tcfd_feat_' . $k, 'bool', $l];
        }
        $out += [
            'features_source_url' => ['field_tcfd_features_source_url', 'url', 'Features Source URL'],
            'features_last_checked' => ['field_tcfd_features_last_checked', 'date', 'Features Last Checked'],
            'google_rating' => ['field_tcf_google_rating', 'number', 'Google Rating'],
            'google_review_count' => ['field_tcf_google_review_count', 'number', 'Google Review Count'],
            'google_business_profile_name' => ['field_tcf_google_business_profile_name', 'text', 'Google Business Profile Name'],
            'google_maps_url' => ['field_tcf_google_maps_url', 'url', 'Google Maps URL'],
            'google_rating_status' => ['field_tcf_google_rating_status', 'select', 'Google Rating Status'],
            'google_rating_scope' => ['field_tcf_google_rating_scope', 'text', 'Google Rating Scope'],
            'google_match_confidence' => ['field_tcf_google_match_confidence', 'select', 'Google Match Confidence'],
            'google_rating_last_checked' => ['field_tcf_google_rating_last_checked', 'date', 'Google Rating Last Checked'],
            'google_rating_notes' => ['field_tcf_google_rating_notes', 'textarea', 'Google Rating Notes'],
            'provider_claimed' => ['field_tcf_provider_claimed', 'bool', 'Provider Claimed'],
            'provider_verified_date' => ['field_tcf_provider_verified_date', 'date', 'Provider Verified Date'],
            'provider_verification_notes' => ['field_tcf_provider_verification_notes', 'textarea', 'Verification Notes'],
            'provider_affiliate_url' => ['field_tcf_provider_affiliate_url', 'url', 'Provider Default Affiliate URL'],
            'ce_affiliate_url' => ['field_tcf_ce_affiliate_url', 'url', 'CE Affiliate URL'],
            'qe_affiliate_url' => ['field_tcf_qe_affiliate_url', 'url', 'QE Affiliate URL'],
            'affiliate_notes' => ['field_tcf_affiliate_notes', 'textarea', 'Affiliate Notes'],
            'research_notes' => ['field_tcfd_research_notes', 'textarea', 'Research Notes (from imports)'],
            'last_chat_scan_at' => ['field_tcf_last_chat_scan_at', 'datetime', 'Last Import Applied'],
            'admin_notes' => ['field_tcf_admin_notes', 'textarea', 'Admin Notes'],
        ];
        return $out;
    }

    public static function key(string $name): string {
        $s = self::scalars();
        if (isset($s[$name])) return $s[$name][0];
        if ($name === 'provider_offers') return 'field_tcf_provider_offers';
        if ($name === 'provider_aliases') return 'field_tcf_provider_aliases';
        return $name;
    }

    public static function type(string $name): string {
        $s = self::scalars();
        return $s[$name][1] ?? 'text';
    }

    private static function tab(string $key, string $label): array {
        return ['key' => $key, 'label' => $label, 'name' => '', 'type' => 'tab', 'placement' => 'top', 'endpoint' => 0];
    }

    private static function date(string $key, string $label, string $name, array $extra = []): array {
        return array_merge(['key' => $key, 'label' => $label, 'name' => $name, 'type' => 'date_picker', 'display_format' => 'm/d/Y', 'return_format' => 'Y-m-d', 'first_day' => 0], $extra);
    }

    private static function bool(string $key, string $label, string $name, array $extra = []): array {
        return array_merge(['key' => $key, 'label' => $label, 'name' => $name, 'type' => 'true_false', 'ui' => 1], $extra);
    }

    public static function register(): void {
        if (!function_exists('acf_add_local_field_group')) return;
        acf_add_local_field_group([
            'key' => 'group_tcf_provider_data',
            'title' => 'Provider Listing',
            'fields' => self::acf_fields(),
            'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => TCFD_Plugin::POST_TYPE]]],
            'position' => 'acf_after_title',
            'style' => 'seamless',
            'label_placement' => 'top',
            'instruction_placement' => 'label',
            'active' => true,
            'show_in_rest' => false,
        ]);
    }

    private static function acf_fields(): array {
        $f = [];
        $f[] = self::tab('field_tcf_tab_overview', 'Overview');
        $f[] = ['key' => 'field_tcf_provider_display_name', 'label' => 'Display Name (optional)', 'name' => 'provider_display_name', 'type' => 'text', 'instructions' => 'Shown on the site instead of the title. Leave blank to use the title (the exact CTEC provider name).', 'wrapper' => ['width' => '50']];
        $f[] = ['key' => 'field_tcf_provider_ctec_number', 'label' => 'CTEC Provider Number', 'name' => 'provider_ctec_number', 'type' => 'text', 'wrapper' => ['width' => '25']];
        $f[] = self::date('field_tcf_provider_data_last_checked', 'Data Last Checked', 'provider_data_last_checked', ['wrapper' => ['width' => '25']]);
        $f[] = ['key' => 'field_tcf_provider_website', 'label' => 'Website', 'name' => 'provider_website', 'type' => 'url', 'wrapper' => ['width' => '50']];
        $f[] = ['key' => 'field_tcf_provider_logo', 'label' => 'Logo', 'name' => 'provider_logo', 'type' => 'image', 'return_format' => 'id', 'preview_size' => 'thumbnail', 'library' => 'all', 'instructions' => 'Square or wide PNG/SVG. A graduation-cap placeholder is shown when empty.', 'wrapper' => ['width' => '50']];
        $f[] = self::bool('field_tcf_offers_20_hour_ce', 'Offers 20-Hour CE', 'offers_20_hour_ce', ['wrapper' => ['width' => '25']]);
        $f[] = self::bool('field_tcf_offers_60_hour_qe', 'Offers 60-Hour QE', 'offers_60_hour_qe', ['wrapper' => ['width' => '25']]);
        $f[] = ['key' => 'field_tcf_ctec_offering', 'label' => 'CTEC Offering', 'name' => 'ctec_offering', 'type' => 'select', 'choices' => ['QE + CE' => 'QE + CE', 'QE' => 'QE', 'CE' => 'CE'], 'allow_null' => 1, 'ui' => 0, 'instructions' => 'Set automatically from the two switches when saved.', 'wrapper' => ['width' => '25']];
        $f[] = self::bool('field_tcf_provider_verified', 'Verified by Provider', 'provider_verified', ['instructions' => 'Profile claimed and confirmed by the provider. Not an endorsement.', 'wrapper' => ['width' => '25']]);
        $f[] = ['key' => 'field_tcf_provider_aliases', 'label' => 'Other Names (aliases)', 'name' => 'provider_aliases', 'type' => 'repeater', 'layout' => 'table', 'button_label' => 'Add Alias',
            'instructions' => 'Other names this provider goes by. Used to match imported data to this listing.',
            'sub_fields' => [['key' => 'field_tcf_provider_alias', 'label' => 'Alias', 'name' => 'alias', 'type' => 'text']]];

        foreach (['ce' => ['20-Hour CE', 'offers_20_hour_ce', self::CE_PRICE_TYPES], 'qe' => ['60-Hour QE', 'offers_60_hour_qe', self::QE_PRICE_TYPES]] as $p => [$label, $flag, $types]) {
            $f[] = self::tab('field_tcf_tab_' . $p, $label . ' Pricing');
            $f[] = ['key' => 'field_tcfd_' . $p . '_msg', 'label' => '', 'name' => '', 'type' => 'message', 'message' => 'Only <strong>VERIFIED</strong> prices with a <em>Complete Package</em> type sort as flat prices in the directory. Use “No Public Price” when the provider does not publish one.'];
            $f[] = ['key' => 'field_tcf_' . $p . '_current_price', 'label' => 'Current Price ($)', 'name' => $p . '_current_price', 'type' => 'number', 'min' => 0, 'step' => '0.01', 'wrapper' => ['width' => '25']];
            $f[] = ['key' => 'field_tcf_' . $p . '_regular_price', 'label' => 'Regular Price ($)', 'name' => $p . '_regular_price', 'type' => 'number', 'min' => 0, 'step' => '0.01', 'wrapper' => ['width' => '25']];
            $f[] = ['key' => 'field_tcf_' . $p . '_price_display_text', 'label' => 'Price Shown on Site', 'name' => $p . '_price_display_text', 'type' => 'text', 'instructions' => 'e.g. $69.95 · $46/unit + fees · Contact provider', 'wrapper' => ['width' => '50']];
            $f[] = ['key' => 'field_tcf_' . $p . '_price_type', 'label' => 'Price Type', 'name' => $p . '_price_type', 'type' => 'select', 'ui' => 1, 'allow_null' => 1, 'choices' => $types, 'wrapper' => ['width' => '25']];
            $f[] = ['key' => 'field_tcf_' . $p . '_price_status', 'label' => 'Price Status', 'name' => $p . '_price_status', 'type' => 'select', 'ui' => 0, 'allow_null' => 1, 'choices' => self::PRICE_STATUS, 'wrapper' => ['width' => '25']];
            $f[] = self::date('field_tcf_' . $p . '_price_last_checked', 'Price Last Checked', $p . '_price_last_checked', ['wrapper' => ['width' => '25']]);
            $f[] = ['key' => 'field_tcf_' . $p . '_course_url', 'label' => 'Course Page URL', 'name' => $p . '_course_url', 'type' => 'url', 'instructions' => '“View course” button target.', 'wrapper' => ['width' => '25']];
            $f[] = ['key' => 'field_tcf_' . $p . '_price_source_url', 'label' => 'Price Source URL', 'name' => $p . '_price_source_url', 'type' => 'url', 'wrapper' => ['width' => '50']];
            $f[] = ['key' => 'field_tcf_' . $p . '_price_notes', 'label' => 'Price Notes', 'name' => $p . '_price_notes', 'type' => 'textarea', 'rows' => 2, 'wrapper' => ['width' => '50']];
        }

        $f[] = self::tab('field_tcfd_tab_features', 'Course Features');
        $f[] = ['key' => 'field_tcfd_features_msg', 'label' => '', 'name' => '', 'type' => 'message', 'message' => 'These switches drive the directory filters (Delivery, Materials, Format, Support, Study features, Device). Turn on only what the provider actually offers.'];
        foreach (self::FEATURES as $group => $items) {
            $f[] = ['key' => 'field_tcfd_grp_' . sanitize_key($group), 'label' => $group, 'name' => '', 'type' => 'message', 'message' => '', 'wrapper' => ['class' => 'tcfd-feature-group']];
            foreach ($items as $k => $l) {
                $f[] = self::bool('field_tcfd_feat_' . $k, $l, $k, ['wrapper' => ['width' => '25']]);
            }
        }
        $f[] = ['key' => 'field_tcfd_features_source_url', 'label' => 'Features Source URL', 'name' => 'features_source_url', 'type' => 'url', 'wrapper' => ['width' => '50']];
        $f[] = self::date('field_tcfd_features_last_checked', 'Features Last Checked', 'features_last_checked', ['wrapper' => ['width' => '25']]);

        $f[] = self::tab('field_tcf_tab_offers', 'Coupons & Sales');
        $f[] = ['key' => 'field_tcf_provider_offers', 'label' => 'Offers', 'name' => 'provider_offers', 'type' => 'repeater', 'layout' => 'block', 'button_label' => 'Add Offer', 'collapsed' => 'field_tcf_offer_title',
            'instructions' => 'Only active offers with a VERIFIED status that have not expired appear on the site. Never enter a coupon code you have not confirmed.',
            'sub_fields' => [
                self::bool('field_tcf_offer_active', 'Active', 'offer_active', ['default_value' => 1, 'wrapper' => ['width' => '15']]),
                ['key' => 'field_tcf_offer_type', 'label' => 'Type', 'name' => 'offer_type', 'type' => 'select', 'choices' => self::OFFER_TYPES, 'wrapper' => ['width' => '20']],
                ['key' => 'field_tcf_offer_course_scope', 'label' => 'Applies To', 'name' => 'offer_course_scope', 'type' => 'select', 'choices' => self::OFFER_SCOPES, 'wrapper' => ['width' => '20']],
                ['key' => 'field_tcf_offer_import_status', 'label' => 'Status', 'name' => 'offer_import_status', 'type' => 'select', 'choices' => self::OFFER_STATUSES, 'default_value' => 'NEEDS REVIEW', 'allow_null' => 0, 'wrapper' => ['width' => '45']],
                ['key' => 'field_tcf_offer_title', 'label' => 'Title', 'name' => 'offer_title', 'type' => 'text', 'wrapper' => ['width' => '40']],
                ['key' => 'field_tcf_coupon_code', 'label' => 'Coupon Code', 'name' => 'coupon_code', 'type' => 'text', 'wrapper' => ['width' => '20']],
                ['key' => 'field_tcf_discount_type', 'label' => 'Discount Type', 'name' => 'discount_type', 'type' => 'select', 'allow_null' => 1, 'choices' => self::DISCOUNT_TYPES, 'wrapper' => ['width' => '20']],
                ['key' => 'field_tcf_discount_amount', 'label' => 'Discount Amount', 'name' => 'discount_amount', 'type' => 'number', 'step' => '0.01', 'wrapper' => ['width' => '20']],
                ['key' => 'field_tcf_offer_regular_price', 'label' => 'Regular Price ($)', 'name' => 'offer_regular_price', 'type' => 'number', 'min' => 0, 'step' => '0.01', 'wrapper' => ['width' => '20']],
                ['key' => 'field_tcf_offer_sale_price', 'label' => 'Price With Offer ($)', 'name' => 'offer_sale_price', 'type' => 'number', 'min' => 0, 'step' => '0.01', 'wrapper' => ['width' => '20']],
                self::date('field_tcf_offer_start_date', 'Starts', 'offer_start_date', ['wrapper' => ['width' => '20']]),
                self::date('field_tcf_offer_expiration_date', 'Expires', 'offer_expiration_date', ['wrapper' => ['width' => '20']]),
                self::date('field_tcf_offer_last_verified', 'Last Verified', 'offer_last_verified', ['wrapper' => ['width' => '20']]),
                ['key' => 'field_tcf_offer_source_url', 'label' => 'Source URL', 'name' => 'offer_source_url', 'type' => 'url', 'wrapper' => ['width' => '50']],
                ['key' => 'field_tcf_offer_description', 'label' => 'Description / Terms', 'name' => 'offer_description', 'type' => 'textarea', 'rows' => 2, 'wrapper' => ['width' => '50']],
            ]];

        $f[] = self::tab('field_tcf_tab_google', 'Google Rating');
        $f[] = ['key' => 'field_tcf_google_rating_status', 'label' => 'Display Status', 'name' => 'google_rating_status', 'type' => 'select', 'ui' => 0, 'allow_null' => 1, 'choices' => self::GOOGLE_STATUS, 'instructions' => 'The rating shows on the site only when this is “Verified”.', 'wrapper' => ['width' => '25']];
        $f[] = ['key' => 'field_tcf_google_rating', 'label' => 'Rating (1–5)', 'name' => 'google_rating', 'type' => 'number', 'min' => 1, 'max' => 5, 'step' => '0.1', 'wrapper' => ['width' => '25']];
        $f[] = ['key' => 'field_tcf_google_review_count', 'label' => 'Review Count', 'name' => 'google_review_count', 'type' => 'number', 'min' => 0, 'step' => '1', 'wrapper' => ['width' => '25']];
        $f[] = self::date('field_tcf_google_rating_last_checked', 'Last Checked', 'google_rating_last_checked', ['wrapper' => ['width' => '25']]);
        $f[] = ['key' => 'field_tcf_google_business_profile_name', 'label' => 'Business Profile Name', 'name' => 'google_business_profile_name', 'type' => 'text', 'wrapper' => ['width' => '50']];
        $f[] = ['key' => 'field_tcf_google_maps_url', 'label' => 'Google Maps URL', 'name' => 'google_maps_url', 'type' => 'url', 'wrapper' => ['width' => '50']];
        $f[] = ['key' => 'field_tcf_google_rating_scope', 'label' => 'Rating Scope', 'name' => 'google_rating_scope', 'type' => 'text', 'wrapper' => ['width' => '50']];
        $f[] = ['key' => 'field_tcf_google_match_confidence', 'label' => 'Match Confidence', 'name' => 'google_match_confidence', 'type' => 'select', 'allow_null' => 1, 'choices' => ['HIGH' => 'HIGH', 'MEDIUM' => 'MEDIUM', 'LOW' => 'LOW'], 'wrapper' => ['width' => '50']];
        $f[] = ['key' => 'field_tcf_google_rating_notes', 'label' => 'Notes', 'name' => 'google_rating_notes', 'type' => 'textarea', 'rows' => 2];

        $f[] = self::tab('field_tcf_tab_verification', 'Verification & Links');
        $f[] = self::bool('field_tcf_provider_claimed', 'Profile Claimed', 'provider_claimed', ['wrapper' => ['width' => '25']]);
        $f[] = self::date('field_tcf_provider_verified_date', 'Verified Date', 'provider_verified_date', ['wrapper' => ['width' => '25']]);
        $f[] = ['key' => 'field_tcf_provider_verification_notes', 'label' => 'Verification Notes', 'name' => 'provider_verification_notes', 'type' => 'textarea', 'rows' => 2, 'wrapper' => ['width' => '50']];
        $f[] = ['key' => 'field_tcf_provider_affiliate_url', 'label' => 'Default Affiliate URL', 'name' => 'provider_affiliate_url', 'type' => 'url', 'wrapper' => ['width' => '34']];
        $f[] = ['key' => 'field_tcf_ce_affiliate_url', 'label' => 'CE Affiliate URL', 'name' => 'ce_affiliate_url', 'type' => 'url', 'wrapper' => ['width' => '33']];
        $f[] = ['key' => 'field_tcf_qe_affiliate_url', 'label' => 'QE Affiliate URL', 'name' => 'qe_affiliate_url', 'type' => 'url', 'wrapper' => ['width' => '33']];
        $f[] = ['key' => 'field_tcf_affiliate_notes', 'label' => 'Affiliate Notes', 'name' => 'affiliate_notes', 'type' => 'textarea', 'rows' => 2];

        $f[] = self::tab('field_tcf_tab_admin_notes', 'Notes');
        $f[] = ['key' => 'field_tcf_admin_notes', 'label' => 'Admin Notes', 'name' => 'admin_notes', 'type' => 'textarea', 'rows' => 4];
        $f[] = ['key' => 'field_tcfd_research_notes', 'label' => 'Research Notes (from imports)', 'name' => 'research_notes', 'type' => 'textarea', 'rows' => 4];
        $f[] = ['key' => 'field_tcf_last_chat_scan_at', 'label' => 'Last Import Applied', 'name' => 'last_chat_scan_at', 'type' => 'date_time_picker', 'display_format' => 'm/d/Y g:i a', 'return_format' => 'Y-m-d H:i:s', 'readonly' => 1];
        return $f;
    }
}
