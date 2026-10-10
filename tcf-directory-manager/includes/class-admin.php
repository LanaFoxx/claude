<?php
defined('ABSPATH') || exit;

final class TCFD_Admin {
    const PARENT = 'edit.php?post_type=tcf_provider';
    const CAP = 'manage_options';

    public static function boot(): void {
        add_action('admin_menu', [__CLASS__, 'menu']);
        add_action('admin_enqueue_scripts', [__CLASS__, 'assets']);
        add_action('admin_post_tcfd_preview', [__CLASS__, 'handle_preview']);
        add_action('admin_post_tcfd_apply', [__CLASS__, 'handle_apply']);
        add_action('admin_post_tcfd_undo', [__CLASS__, 'handle_undo']);
        add_action('admin_post_tcfd_export', [__CLASS__, 'handle_export']);
        add_action('admin_post_tcfd_sample', [__CLASS__, 'handle_sample']);
        add_action('admin_init', [__CLASS__, 'maybe_upgrade']);
        add_filter('manage_tcf_provider_posts_columns', [__CLASS__, 'columns']);
        add_action('manage_tcf_provider_posts_custom_column', [__CLASS__, 'column'], 10, 2);
        add_action('restrict_manage_posts', [__CLASS__, 'filters']);
        add_action('pre_get_posts', [__CLASS__, 'apply_filters']);
        add_action('add_meta_boxes_tcf_provider', [__CLASS__, 'meta_boxes']);
        add_filter('enter_title_here', fn($t, $p) => $p->post_type === TCFD_Plugin::POST_TYPE ? 'Exact CTEC provider name' : $t, 10, 2);
    }

    public static function maybe_upgrade(): void {
        if (get_option('tcfd_db_version') !== TCFD_VERSION) TCFD_Importer::install_tables();
        if (!get_option('tcfd_migrated_offer_choices') && function_exists('update_field')) self::migrate_offer_choices();
    }

    /**
     * Legacy imports stored free-text offer scopes/statuses. Map them onto the dropdown choices so
     * saving a listing by hand never blanks them; keep any extra wording in the offer terms.
     */
    private static function migrate_offer_choices(): void {
        $ids = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids']);
        foreach ($ids as $id) {
            $rows = TCFD_Store::offers((int) $id);
            if (!$rows) continue;
            $changed = false;
            foreach ($rows as &$o) {
                $scope = (string) ($o['offer_course_scope'] ?? '');
                if ($scope !== '' && !isset(TCFD_Fields::OFFER_SCOPES[$scope])) {
                    $o['offer_course_scope'] = ['ce' => '20-Hour CE', 'qe' => '60-Hour QE', 'both' => 'Both', 'other' => 'Other'][TCFD_Store::scope_code($scope)];
                    if (!preg_match('/^(20|60)-hour (ce|qe)$/i', $scope)) $o['offer_description'] = trim('Applies to: ' . $scope . '. ' . ($o['offer_description'] ?? ''));
                    $changed = true;
                }
                $st = (string) ($o['offer_import_status'] ?? '');
                if ($st !== '' && !isset(TCFD_Fields::OFFER_STATUSES[$st])) {
                    $o['offer_import_status'] = str_starts_with(strtoupper($st), 'VERIFIED') ? (str_contains(strtoupper($st), 'MEMBER') ? 'VERIFIED MEMBER OFFER' : 'VERIFIED') : 'NEEDS REVIEW';
                    $changed = true;
                }
                foreach (['offer_start_date', 'offer_expiration_date', 'offer_last_verified'] as $k) {
                    if (!empty($o[$k])) $o[$k] = TCFD_Normalizer::date($o[$k]) ?? $o[$k];
                }
            }
            unset($o);
            if ($changed) TCFD_Store::set((int) $id, 'provider_offers', $rows);
        }
        update_option('tcfd_migrated_offer_choices', 1);
        TCFD_Store::flush_cache();
    }

    public static function menu(): void {
        add_submenu_page(self::PARENT, 'Import Provider Data', 'Import Data', self::CAP, 'tcfd-import', [__CLASS__, 'page_import']);
        add_submenu_page(self::PARENT, 'ChatGPT Research Prompt', 'ChatGPT Prompt', self::CAP, 'tcfd-prompt', [__CLASS__, 'page_prompt']);
        add_submenu_page(self::PARENT, 'Import History', 'Import History', self::CAP, 'tcfd-history', [__CLASS__, 'page_history']);
        add_submenu_page(self::PARENT, 'Export Provider Data', 'Export', self::CAP, 'tcfd-export', [__CLASS__, 'page_export']);
    }

    public static function assets($hook): void {
        $screen = get_current_screen();
        if (!$screen || ($screen->post_type !== TCFD_Plugin::POST_TYPE && strpos((string) $hook, 'tcfd') === false)) return;
        wp_enqueue_style('tcfd-admin', TCFD_URL . 'assets/admin.css', [], TCFD_VERSION);
        wp_enqueue_script('tcfd-admin', TCFD_URL . 'assets/admin.js', [], TCFD_VERSION, true);
    }

    private static function url(string $page, array $args = []): string {
        return add_query_arg(array_merge(['post_type' => TCFD_Plugin::POST_TYPE, 'page' => $page], $args), admin_url('edit.php'));
    }

    private static function guard(string $nonce): void {
        if (!current_user_can(self::CAP)) wp_die('You do not have permission to do this.');
        check_admin_referer($nonce);
    }

    private static function flash(string $msg, string $type = 'error'): void {
        set_transient('tcfd_flash_' . get_current_user_id(), ['msg' => $msg, 'type' => $type], 120);
    }

    private static function show_flash(): void {
        $f = get_transient('tcfd_flash_' . get_current_user_id());
        if (!$f) return;
        delete_transient('tcfd_flash_' . get_current_user_id());
        printf('<div class="notice notice-%s"><p>%s</p></div>', esc_attr($f['type']), wp_kses_post($f['msg']));
    }

    /* ================= Import ================= */

    public static function handle_preview(): void {
        self::guard('tcfd_preview');
        $raw = isset($_POST['tcfd_raw']) ? (string) wp_unslash($_POST['tcfd_raw']) : '';
        $label = sanitize_text_field(wp_unslash($_POST['tcfd_label'] ?? ''));
        if (!empty($_FILES['tcfd_file']['tmp_name']) && is_uploaded_file($_FILES['tcfd_file']['tmp_name'])) {
            if ($_FILES['tcfd_file']['size'] > 10 * MB_IN_BYTES) { self::flash('That file is larger than 10 MB.'); wp_safe_redirect(self::url('tcfd-import')); exit; }
            $raw = (string) file_get_contents($_FILES['tcfd_file']['tmp_name']);
            if ($label === '') $label = sanitize_file_name($_FILES['tcfd_file']['name']);
        }
        if ($label === '') $label = 'Import ' . current_time('M j, Y g:i a');
        $opts = [
            'mode' => ($_POST['tcfd_mode'] ?? '') === 'fill_empty' ? 'fill_empty' : 'overwrite',
            'create' => !empty($_POST['tcfd_create']),
            'draft_missing' => !empty($_POST['tcfd_draft_missing']),
        ];
        $r = TCFD_Importer::preview($raw, $label, $opts);
        if (!empty($r['errors'])) {
            self::flash(implode('<br>', array_map('esc_html', $r['errors'])));
            set_transient('tcfd_last_raw_' . get_current_user_id(), $raw, HOUR_IN_SECONDS);
            wp_safe_redirect(self::url('tcfd-import'));
            exit;
        }
        wp_safe_redirect(self::url('tcfd-import', ['batch' => $r['batch']]));
        exit;
    }

    public static function handle_apply(): void {
        self::guard('tcfd_apply');
        $batch = sanitize_key($_POST['batch'] ?? '');
        $targets = [];
        foreach ((array) ($_POST['target'] ?? []) as $i => $t) {
            if (empty($_POST['include'][$i])) { $targets[(int) $i] = 'skip'; continue; }
            $t = sanitize_text_field(wp_unslash($t));
            $targets[(int) $i] = in_array($t, ['new', 'skip'], true) ? $t : (string) absint($t);
        }
        $r = TCFD_Importer::apply($batch, $targets);
        if (!empty($r['error'])) { self::flash(esc_html($r['error'])); wp_safe_redirect(self::url('tcfd-import')); exit; }
        $msg = sprintf('<strong>Import applied.</strong> %d providers updated, %d added, %d hidden, %d changes in total, %d skipped. The live directory is already showing the new data. <a href="%s">Review or undo this import</a>.',
            $r['updated'], $r['created'], $r['drafted'], $r['changes'], $r['skipped'], esc_url(self::url('tcfd-history', ['batch' => $r['batch']])));
        self::flash($msg, 'success');
        wp_safe_redirect(self::url('tcfd-import'));
        exit;
    }

    public static function page_import(): void {
        if (!current_user_can(self::CAP)) return;
        $batch = sanitize_key($_GET['batch'] ?? '');
        echo '<div class="wrap tcfd"><h1>Import Provider Data</h1>';
        self::show_flash();
        if ($batch) {
            $pv = TCFD_Importer::load_preview($batch);
            if ($pv) { self::render_preview($batch, $pv); echo '</div>'; return; }
            echo '<div class="notice notice-warning"><p>That preview expired. Paste the data again.</p></div>';
        }
        $last = (string) get_transient('tcfd_last_raw_' . get_current_user_id());
        delete_transient('tcfd_last_raw_' . get_current_user_id());
        ?>
        <div class="tcfd-steps">
            <div><b>1</b> Copy the <a href="<?php echo esc_url(self::url('tcfd-prompt')); ?>">ChatGPT prompt</a> into ChatGPT.</div>
            <div><b>2</b> Paste ChatGPT's reply below (or upload the .json / .csv file it gives you).</div>
            <div><b>3</b> Check the preview, then apply. Every import can be undone.</div>
        </div>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" enctype="multipart/form-data" class="tcfd-card">
            <?php wp_nonce_field('tcfd_preview'); ?>
            <input type="hidden" name="action" value="tcfd_preview">
            <p><label for="tcfd_raw"><strong>Paste data from ChatGPT</strong> <span class="description">JSON (preferred) or CSV. Extra text and ``` fences around the data are fine.</span></label></p>
            <textarea id="tcfd_raw" name="tcfd_raw" rows="16" class="large-text code" placeholder='{ "schema_version": "2.0", "providers": [ ... ] }'><?php echo esc_textarea($last); ?></textarea>
            <p><strong>…or upload a file:</strong> <input type="file" name="tcfd_file" accept=".json,.csv,.txt,.tsv,application/json,text/csv"></p>
            <p><label>Name this import (optional) <input type="text" name="tcfd_label" class="regular-text" placeholder="e.g. October rescan – batch 1"></label></p>
            <fieldset class="tcfd-opts">
                <legend><strong>Options</strong></legend>
                <label><input type="radio" name="tcfd_mode" value="overwrite" checked> <strong>Update</strong> – replace existing values with the new research (blank/unknown values never erase anything)</label><br>
                <label><input type="radio" name="tcfd_mode" value="fill_empty"> <strong>Fill gaps only</strong> – only add values where the listing is currently empty</label><br>
                <label><input type="checkbox" name="tcfd_create" value="1" checked> Add providers that are not in the directory yet</label><br>
                <label><input type="checkbox" name="tcfd_draft_missing" value="1"> Hide (set to draft) published providers that are <em>not</em> in this import <span class="description">– only use with a complete, full-list import</span></label>
            </fieldset>
            <?php submit_button('Preview Import', 'primary large'); ?>
        </form>
        </div>
        <?php
    }

    private static function render_preview(string $batch, array $pv): void {
        $idx = TCFD_Importer::index();
        $titles = $idx['titles'];
        $opts = $pv['opts'];
        $rows = [];
        $sum = ['update' => 0, 'new' => 0, 'same' => 0, 'check' => 0, 'changes' => 0];
        foreach ($pv['items'] as $i => $it) {
            $m = $it['match'];
            $pid = (int) $m['post_id'];
            $d = TCFD_Importer::diff($it['rec'], $pid, $opts);
            $n = TCFD_Importer::count_changes($d);
            if ($m['status'] === 'matched') { $n ? $sum['update']++ : $sum['same']++; }
            elseif ($m['status'] === 'new') $sum['new']++;
            else $sum['check']++;
            $sum['changes'] += $n;
            $rows[] = [$i, $it, $d, $n];
        }
        printf('<p class="tcfd-meta">Import: <strong>%s</strong> · %d providers in the data · mode: %s</p>', esc_html($pv['label']), count($pv['items']), $opts['mode'] === 'fill_empty' ? 'fill gaps only' : 'update');
        echo '<div class="tcfd-summary">';
        printf('<div><b>%d</b>to update</div><div><b>%d</b>new providers</div><div><b>%d</b>already up to date</div><div class="%s"><b>%d</b>need your choice</div><div><b>%d</b>changes</div>',
            $sum['update'], $sum['new'], $sum['same'], $sum['check'] ? 'warn' : '', $sum['check'], $sum['changes']);
        echo '</div>';
        if (!empty($pv['warnings'])) echo '<div class="notice notice-warning inline"><p>' . implode('<br>', array_map('esc_html', $pv['warnings'])) . '</p></div>';
        if ($opts['draft_missing']) echo '<div class="notice notice-warning inline"><p><strong>Heads up:</strong> every published provider that is not in this import will be hidden.</p></div>';

        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('tcfd_apply');
        echo '<input type="hidden" name="action" value="tcfd_apply"><input type="hidden" name="batch" value="' . esc_attr($batch) . '">';
        echo '<script type="application/json" id="tcfd-providers">' . wp_json_encode(array_map(null, array_keys($titles), array_values($titles))) . '</script>';
        echo '<p class="tcfd-tools"><label><input type="checkbox" id="tcfd-only-changes" checked> Show only rows with changes</label> <button type="button" class="button" id="tcfd-expand">Expand all</button></p>';
        echo '<table class="widefat tcfd-preview"><thead><tr><th class="check"><input type="checkbox" id="tcfd-all" checked></th><th>Provider (from import)</th><th>Goes to</th><th>What changes</th></tr></thead><tbody>';
        foreach ($rows as [$i, $it, $d, $n]) {
            $rec = $it['rec'];
            $m = $it['match'];
            $status = $m['status'];
            $default = $status === 'matched' ? (string) $m['post_id'] : ($status === 'new' ? ($opts['create'] ? 'new' : 'skip') : 'skip');
            $include = $status !== 'duplicate' && $default !== 'skip' && ($n > 0 || $status === 'new');
            $cls = 'st-' . $status . ($n === 0 && $status === 'matched' ? ' nochange' : '');
            echo '<tr class="' . esc_attr($cls) . '">';
            printf('<td class="check"><input type="checkbox" name="include[%d]" value="1" %s %s></td>', $i, checked($include, true, false), $status === 'duplicate' ? 'disabled' : '');
            echo '<td><strong>' . esc_html($rec['name'] ?: $rec['website']) . '</strong>';
            if ($rec['website']) echo '<br><span class="description">' . esc_html(TCFD_Importer::domain($rec['website'])) . '</span>';
            echo '</td><td>';
            $badge = ['matched' => 'Existing', 'new' => 'New', 'ambiguous' => 'Choose', 'duplicate' => 'Duplicate'][$status] ?? $status;
            echo '<span class="tcfd-badge b-' . esc_attr($status) . '">' . esc_html($badge) . '</span> <span class="description">' . esc_html($m['method']) . '</span><br>';
            if ($status !== 'duplicate') {
                printf('<select name="target[%d]" class="tcfd-target" data-default="%s" data-candidates="%s">', $i, esc_attr($default), esc_attr(implode(',', $m['candidates'] ?? [])));
                echo '<option value="skip"' . selected($default, 'skip', false) . '>Skip</option>';
                echo '<option value="new"' . selected($default, 'new', false) . '>➕ Add as new provider</option>';
                if ($status === 'matched') echo '<option value="' . esc_attr($m['post_id']) . '" selected>' . esc_html($titles[$m['post_id']] ?? ('#' . $m['post_id'])) . '</option>';
                foreach (($m['candidates'] ?? []) as $c) echo '<option value="' . esc_attr($c) . '">' . esc_html($titles[$c] ?? ('#' . $c)) . '</option>';
                echo '</select>';
            }
            echo '</td><td>';
            if ($status === 'new') {
                echo '<em>New listing with ' . count($rec['fields']) . ' fields' . (is_array($rec['offers']) && $rec['offers'] ? ' and ' . count($rec['offers']) . ' offer(s)' : '') . '.</em>';
            } elseif (!$n) {
                echo '<span class="description">No changes</span>';
            } else {
                echo '<details' . ($n <= 4 ? ' open' : '') . '><summary>' . $n . ' change' . ($n === 1 ? '' : 's') . '</summary><table class="tcfd-diff">';
                foreach ($d['fields'] as $c) {
                    printf('<tr><th>%s</th><td class="old">%s</td><td class="arrow">→</td><td class="new">%s</td></tr>', esc_html($c['label']), esc_html(TCFD_Importer::display($c['field'], $c['old'])), esc_html(TCFD_Importer::display($c['field'], $c['new'])));
                }
                if ($d['offers']) {
                    $o = $d['offers'];
                    $codes = $o['codes'] ? ' – codes: ' . implode(', ', $o['codes']) : '';
                    printf('<tr><th>Coupons &amp; sales</th><td colspan="3">%d new, %d updated%s%s</td></tr>', $o['added'], $o['updated'], $o['removed'] ? ', ' . $o['removed'] . ' removed' : '', esc_html($codes));
                }
                if ($d['aliases']) printf('<tr><th>Also known as</th><td colspan="3">%s</td></tr>', esc_html(implode(', ', $d['aliases'])));
                if ($d['status']) echo '<tr><th>Listing</th><td colspan="3">Hide (no longer on CTEC list)</td></tr>';
                echo '</table></details>';
            }
            if ($rec['warnings']) echo '<div class="tcfd-warn">⚠ ' . implode('<br>⚠ ', array_map('esc_html', array_unique($rec['warnings']))) . '</div>';
            echo '</td></tr>';
        }
        echo '</tbody></table>';
        echo '<p class="submit"><button type="submit" class="button button-primary button-hero" onclick="return confirm(\'Apply the checked rows to the live directory? You can undo this from Import History.\')">Apply Checked Rows</button> <a class="button button-hero" href="' . esc_url(self::url('tcfd-import')) . '">Cancel</a></p>';
        echo '</form>';
    }

    /* ================= History / undo ================= */

    public static function handle_undo(): void {
        self::guard('tcfd_undo');
        $batch = sanitize_key($_POST['batch'] ?? '');
        $r = TCFD_Importer::undo($batch);
        self::flash(sprintf('Import undone – %d changes reverted. Providers that this import added were moved to the Trash.', $r['reverted']), 'success');
        wp_safe_redirect(self::url('tcfd-history'));
        exit;
    }

    public static function page_history(): void {
        if (!current_user_can(self::CAP)) return;
        $batch = sanitize_key($_GET['batch'] ?? '');
        echo '<div class="wrap tcfd"><h1>Import History</h1>';
        self::show_flash();
        if ($batch) {
            echo '<p><a href="' . esc_url(self::url('tcfd-history')) . '">← All imports</a></p>';
            $rows = TCFD_Importer::batch_rows($batch);
            echo '<table class="widefat striped"><thead><tr><th>Provider</th><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>';
            foreach (array_reverse($rows) as $r) {
                $f = $r->field_name;
                $label = ['__created' => 'Listing added', '__status' => 'Listing status', 'provider_offers' => 'Coupons & sales', 'provider_aliases' => 'Aliases'][$f] ?? (TCFD_Fields::scalars()[$f][2] ?? $f);
                $fmt = function ($v) use ($f) {
                    if (in_array($f, ['provider_offers', 'provider_aliases'], true)) { $a = json_decode((string) $v, true); return is_array($a) ? count($a) . ' item(s)' : '—'; }
                    if ($f === '__created') return $v ? 'new' : '—';
                    return isset(TCFD_Fields::scalars()[$f]) ? TCFD_Importer::display($f, $v) : ((string) $v ?: '—');
                };
                printf('<tr><td><a href="%s">%s</a></td><td>%s</td><td>%s</td><td>%s</td></tr>', esc_url(get_edit_post_link((int) $r->provider_id)), esc_html($r->provider_name), esc_html($label), esc_html($fmt($r->old_value)), esc_html($fmt($r->new_value)));
            }
            echo '</tbody></table></div>';
            return;
        }
        $list = TCFD_Importer::batches();
        if (!$list) { echo '<p>No imports yet.</p></div>'; return; }
        echo '<table class="widefat striped"><thead><tr><th>Date</th><th>Import</th><th>Updated</th><th>Added</th><th>Changes</th><th>Status</th><th></th></tr></thead><tbody>';
        foreach ($list as $b) {
            echo '<tr><td>' . esc_html(mysql2date('M j, Y g:i a', $b->created_at)) . '</td><td><a href="' . esc_url(self::url('tcfd-history', ['batch' => $b->batch_id])) . '">' . esc_html($b->label ?: $b->batch_id) . '</a></td>';
            echo '<td>' . (int) $b->providers_updated . '</td><td>' . (int) $b->providers_created . '</td><td>' . (int) $b->changes . '</td><td>' . esc_html(ucfirst($b->status)) . '</td><td>';
            if ($b->status === 'applied') {
                echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '" onsubmit="return confirm(\'Undo this import? Values changed by it go back to what they were before.\')">';
                wp_nonce_field('tcfd_undo');
                echo '<input type="hidden" name="action" value="tcfd_undo"><input type="hidden" name="batch" value="' . esc_attr($b->batch_id) . '"><button class="button">Undo</button></form>';
            }
            echo '</td></tr>';
        }
        echo '</tbody></table><p class="description">Undo works best newest-first: undoing an older import puts back the values from before it, even if a later import changed them again.</p></div>';
    }

    /* ================= Prompt ================= */

    public static function prompt_text(string $scope): string {
        $t = (string) file_get_contents(TCFD_DIR . 'templates/chatgpt-prompt.txt');
        $scopes = [
            'full' => 'Research every provider on that list. Do not skip any.',
            'update' => 'I have attached a file with the providers already in my directory. Re-check every one of them, return the full updated record for each (keep the same provider_name), and add any provider on CTEC\'s list that is missing from my file.',
            'missing' => 'I have attached a file with the providers already in my directory. Only return providers that are on CTEC\'s list but NOT in my file.',
        ];
        return strtr($t, ['{{DATE}}' => current_time('Y-m-d'), '{{SCOPE}}' => $scopes[$scope] ?? $scopes['full']]);
    }

    public static function page_prompt(): void {
        if (!current_user_can(self::CAP)) return;
        echo '<div class="wrap tcfd"><h1>ChatGPT Research Prompt</h1>';
        echo '<p>Copy a prompt into ChatGPT (use a model with web browsing / “Search” turned on), then paste its reply into <a href="' . esc_url(self::url('tcfd-import')) . '">Import Data</a>.</p>';
        $tabs = [
            'full' => ['Research all providers', 'Use this the first time, or for a complete fresh scan.'],
            'update' => ['Update my existing listings', 'First download your current data (button below) and attach it in ChatGPT with this prompt.'],
            'missing' => ['Find providers I am missing', 'Attach your current data; ChatGPT returns only providers you do not have yet.'],
        ];
        echo '<div class="tcfd-prompts">';
        foreach ($tabs as $k => [$title, $help]) {
            echo '<div class="tcfd-card"><h2>' . esc_html($title) . '</h2><p class="description">' . esc_html($help) . '</p>';
            echo '<textarea readonly rows="12" class="large-text code tcfd-prompt" id="tcfd-prompt-' . esc_attr($k) . '">' . esc_textarea(self::prompt_text($k)) . '</textarea>';
            echo '<p><button type="button" class="button button-primary tcfd-copy" data-target="tcfd-prompt-' . esc_attr($k) . '">Copy prompt</button>';
            if ($k !== 'full') echo ' <a class="button" href="' . esc_url(wp_nonce_url(admin_url('admin-post.php?action=tcfd_export&format=json&for=chatgpt'), 'tcfd_export')) . '">Download current data to attach</a>';
            echo '</p></div>';
        }
        echo '</div>';
        echo '<h2>Tips</h2><ul class="ul-disc">';
        echo '<li>ChatGPT works through about 15 providers per reply. Import each reply as it arrives (the preview shows exactly what changes), or say “continue” and collect them all first.</li>';
        echo '<li>Unknown values come back as <code>null</code> and never erase what you already have.</li>';
        echo '<li>Coupon codes without a source link are saved as <em>Needs review</em> and stay hidden until you check them on the provider listing.</li>';
        echo '<li>Prefer a spreadsheet? Download the <a href="' . esc_url(wp_nonce_url(admin_url('admin-post.php?action=tcfd_sample&format=csv'), 'tcfd_sample')) . '">CSV template</a> and ask ChatGPT to fill it in with the same rules. A <a href="' . esc_url(wp_nonce_url(admin_url('admin-post.php?action=tcfd_sample&format=json'), 'tcfd_sample')) . '">sample JSON file</a> is also available.</li>';
        echo '</ul></div>';
    }

    /* ================= Export ================= */

    public static function page_export(): void {
        if (!current_user_can(self::CAP)) return;
        $j = wp_nonce_url(admin_url('admin-post.php?action=tcfd_export&format=json'), 'tcfd_export');
        $c = wp_nonce_url(admin_url('admin-post.php?action=tcfd_export&format=csv'), 'tcfd_export');
        echo '<div class="wrap tcfd"><h1>Export Provider Data</h1><p>Download every listing (including hidden ones). Both files can be edited and imported again.</p>';
        echo '<p><a class="button button-primary" href="' . esc_url($j) . '">Download JSON</a> <a class="button" href="' . esc_url($c) . '">Download CSV (Excel / Google Sheets)</a></p></div>';
    }

    public static function csv_columns(): array {
        $cols = ['provider_name', 'display_name', 'aliases', 'ctec_provider_number', 'website', 'listing_status', 'offers_20_hour_ce', 'offers_60_hour_qe'];
        foreach (['ce', 'qe'] as $p) foreach (['price', 'regular_price', 'display_price', 'price_type', 'price_status', 'course_url', 'source_url', 'notes', 'last_checked'] as $k) $cols[] = $p . '_' . $k;
        foreach (array_keys(TCFD_Fields::feature_keys()) as $k) $cols[] = $k;
        $cols[] = 'features_source_url';
        foreach (['rating', 'review_count', 'maps_url', 'profile_name', 'status', 'last_checked'] as $k) $cols[] = 'google_' . $k;
        for ($i = 1; $i <= 5; $i++) foreach (['type', 'scope', 'title', 'coupon_code', 'discount_type', 'discount_amount', 'regular_price', 'sale_price', 'start_date', 'expires', 'description', 'source_url', 'last_verified', 'verified', 'status', 'active'] as $k) $cols[] = 'offer' . $i . '_' . $k;
        $cols[] = 'last_checked';
        $cols[] = 'notes';
        return $cols;
    }

    private static function to_csv_row(array $r): array {
        $yn = fn($v) => $v === null ? '' : ($v ? 'yes' : 'no');
        $row = [
            'provider_name' => $r['provider_name'], 'display_name' => $r['display_name'], 'aliases' => implode(' | ', $r['aliases']),
            'ctec_provider_number' => $r['ctec_provider_number'], 'website' => $r['website'], 'listing_status' => $r['listing_status'],
            'offers_20_hour_ce' => $yn($r['offers_20_hour_ce']), 'offers_60_hour_qe' => $yn($r['offers_60_hour_qe']),
            'last_checked' => $r['last_checked'], 'notes' => '',
        ];
        foreach (['ce', 'qe'] as $p) foreach ($r[$p] as $k => $v) $row[$p . '_' . $k] = $v;
        foreach ($r['features'] as $k => $v) $row[$k] = $yn($v);
        foreach ($r['google'] as $k => $v) $row['google_' . $k] = $v;
        foreach (array_slice($r['offers'], 0, 5) as $i => $o) {
            foreach (['type', 'scope', 'title', 'coupon_code', 'discount_type', 'discount_amount', 'regular_price', 'sale_price', 'start_date', 'expires', 'description', 'source_url', 'last_verified', 'status'] as $k) $row['offer' . ($i + 1) . '_' . $k] = $o[$k];
            $row['offer' . ($i + 1) . '_verified'] = str_starts_with((string) $o['status'], 'VERIFIED') ? 'yes' : 'no';
            $row['offer' . ($i + 1) . '_active'] = $o['active'] ? 'yes' : 'no';
        }
        $out = [];
        foreach (self::csv_columns() as $c) $out[] = isset($row[$c]) ? (string) $row[$c] : '';
        return $out;
    }

    private static function send_csv(string $name, array $rows): void {
        nocache_headers();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=' . $name);
        $fh = fopen('php://output', 'w');
        fwrite($fh, "\xEF\xBB\xBF");
        fputcsv($fh, self::csv_columns(), ',', '"', '\\');
        foreach ($rows as $r) fputcsv($fh, self::to_csv_row($r), ',', '"', '\\');
        fclose($fh);
        exit;
    }

    private static function send_json(string $name, array $records): void {
        nocache_headers();
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename=' . $name);
        echo wp_json_encode(['schema_version' => '2.0', 'generated_at' => current_time('Y-m-d'), 'providers' => $records], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function handle_export(): void {
        if (!current_user_can(self::CAP)) wp_die('You do not have permission to do this.');
        check_admin_referer('tcfd_export');
        $records = TCFD_Importer::export_records(($_GET['for'] ?? '') !== 'chatgpt');
        $base = 'TaxCourseFinder_Providers_' . current_time('Y-m-d');
        if (($_GET['format'] ?? '') === 'csv') self::send_csv($base . '.csv', $records);
        self::send_json($base . '.json', $records);
    }

    public static function handle_sample(): void {
        if (!current_user_can(self::CAP)) wp_die('You do not have permission to do this.');
        check_admin_referer('tcfd_sample');
        $sample = json_decode((string) file_get_contents(TCFD_DIR . 'templates/sample.json'), true);
        if (($_GET['format'] ?? '') === 'csv') {
            nocache_headers();
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename=TaxCourseFinder_Import_Template.csv');
            $fh = fopen('php://output', 'w');
            fwrite($fh, "\xEF\xBB\xBF");
            fputcsv($fh, self::csv_columns(), ',', '"', '\\');
            fclose($fh);
            exit;
        }
        self::send_json('TaxCourseFinder_Import_Sample.json', $sample['providers'] ?? []);
    }

    /* ================= Provider list ================= */

    public static function columns(array $cols): array {
        $out = [];
        foreach ($cols as $k => $v) {
            if ($k === 'date') continue;
            $out[$k] = $v;
            if ($k === 'title') {
                $out['tcfd_courses'] = 'Courses';
                $out['tcfd_ce'] = '20-hr price';
                $out['tcfd_qe'] = '60-hr price';
                $out['tcfd_offers'] = 'Offers';
                $out['tcfd_features'] = 'Features';
                $out['tcfd_google'] = 'Google';
                $out['tcfd_checked'] = 'Checked';
            }
        }
        return $out;
    }

    public static function column(string $col, int $id): void {
        $r = fn($n) => TCFD_Store::raw($id, $n);
        switch ($col) {
            case 'tcfd_courses':
                $c = [];
                if ($r('offers_20_hour_ce')) $c[] = '<span class="tcfd-pill">20 CE</span>';
                if ($r('offers_60_hour_qe')) $c[] = '<span class="tcfd-pill qe">60 QE</span>';
                echo $c ? implode(' ', $c) : '—';
                if ($r('provider_verified')) echo ' <span class="dashicons dashicons-yes-alt" title="Verified by provider"></span>';
                break;
            case 'tcfd_ce':
            case 'tcfd_qe':
                $p = $col === 'tcfd_ce' ? 'ce' : 'qe';
                if (!$r($col === 'tcfd_ce' ? 'offers_20_hour_ce' : 'offers_60_hour_qe')) { echo '<span class="description">n/a</span>'; break; }
                $t = $r($p . '_price_display_text') ?: ($r($p . '_current_price') !== '' && $r($p . '_current_price') !== null ? '$' . $r($p . '_current_price') : '');
                echo $t ? esc_html($t) : '<span class="tcfd-missing">missing</span>';
                $s = $r($p . '_price_status');
                if ($s && $s !== 'VERIFIED') echo '<br><span class="description">' . esc_html($s) . '</span>';
                break;
            case 'tcfd_offers':
                $live = 0; $review = 0;
                foreach (TCFD_Store::offers($id) as $o) {
                    if (empty($o['offer_active'])) continue;
                    str_starts_with((string) ($o['offer_import_status'] ?? ''), 'VERIFIED') ? $live++ : $review++;
                }
                echo $live ? '<strong>' . $live . ' live</strong>' : '—';
                if ($review) echo '<br><span class="tcfd-missing">' . $review . ' to review</span>';
                break;
            case 'tcfd_features':
                $all = TCFD_Fields::feature_keys();
                $on = 0;
                foreach ($all as $k => $l) if ($r($k)) $on++;
                echo $on ? $on . ' / ' . count($all) : '<span class="tcfd-missing">none set</span>';
                break;
            case 'tcfd_google':
                echo $r('google_rating_status') === 'Verified' && $r('google_rating') ? esc_html($r('google_rating')) . ' ★ <span class="description">(' . (int) $r('google_review_count') . ')</span>' : '—';
                break;
            case 'tcfd_checked':
                echo esc_html(TCFD_Importer::display('provider_data_last_checked', $r('provider_data_last_checked')));
                break;
        }
    }

    public static function filters(string $post_type): void {
        if ($post_type !== TCFD_Plugin::POST_TYPE) return;
        $v = sanitize_key($_GET['tcfd_filter'] ?? '');
        $opts = ['' => 'All listings', 'ce' => 'Offers 20-hour CE', 'qe' => 'Offers 60-hour QE', 'no_features' => 'No features set', 'no_price' => 'Missing a price', 'has_offer' => 'Has an offer', 'review_offer' => 'Offer needs review'];
        echo '<select name="tcfd_filter">';
        foreach ($opts as $k => $l) echo '<option value="' . esc_attr($k) . '"' . selected($v, $k, false) . '>' . esc_html($l) . '</option>';
        echo '</select>';
    }

    public static function apply_filters(WP_Query $q): void {
        if (!is_admin() || !$q->is_main_query() || $q->get('post_type') !== TCFD_Plugin::POST_TYPE) return;
        $v = sanitize_key($_GET['tcfd_filter'] ?? '');
        if (!$v) return;
        // Few hundred listings at most: evaluate in PHP rather than with many-join meta queries.
        remove_action('pre_get_posts', [__CLASS__, 'apply_filters']);
        $ids = get_posts(['post_type' => TCFD_Plugin::POST_TYPE, 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids']);
        add_action('pre_get_posts', [__CLASS__, 'apply_filters']);
        $keep = [];
        foreach ($ids as $id) {
            $id = (int) $id;
            $r = fn($n) => TCFD_Store::raw($id, $n);
            switch ($v) {
                case 'ce': $ok = (bool) $r('offers_20_hour_ce'); break;
                case 'qe': $ok = (bool) $r('offers_60_hour_qe'); break;
                case 'no_features':
                    $ok = true;
                    foreach (TCFD_Fields::feature_keys() as $k => $l) if ($r($k)) { $ok = false; break; }
                    break;
                case 'no_price':
                    $ok = ($r('offers_20_hour_ce') && !$r('ce_price_display_text')) || ($r('offers_60_hour_qe') && !$r('qe_price_display_text'));
                    break;
                case 'has_offer':
                case 'review_offer':
                    $ok = false;
                    foreach (TCFD_Store::offers($id) as $o) {
                        if (empty($o['offer_active'])) continue;
                        $verified = str_starts_with((string) ($o['offer_import_status'] ?? ''), 'VERIFIED');
                        if ($v === 'has_offer' ? $verified : !$verified) { $ok = true; break; }
                    }
                    break;
                default: $ok = true;
            }
            if ($ok) $keep[] = $id;
        }
        $q->set('post__in', $keep ?: [0]);
    }

    /* ================= Edit screen ================= */

    public static function meta_boxes(): void {
        add_meta_box('tcfd-health', 'Listing Checklist', [__CLASS__, 'box_health'], TCFD_Plugin::POST_TYPE, 'side', 'high');
    }

    public static function box_health(WP_Post $post): void {
        $id = (int) $post->ID;
        $r = fn($n) => TCFD_Store::raw($id, $n);
        $items = [];
        $items[] = [(bool) $r('provider_website'), 'Website'];
        $items[] = [$r('offers_20_hour_ce') || $r('offers_60_hour_qe'), 'Course offered (20-hr and/or 60-hr)'];
        if ($r('offers_20_hour_ce')) $items[] = [(bool) $r('ce_price_display_text'), '20-hour price'];
        if ($r('offers_60_hour_qe')) $items[] = [(bool) $r('qe_price_display_text'), '60-hour price'];
        $on = 0; foreach (TCFD_Fields::feature_keys() as $k => $l) if ($r($k)) $on++;
        $items[] = [$on > 0, 'Course features (' . $on . ' set)'];
        $items[] = [(bool) $r('provider_logo'), 'Logo'];
        $items[] = [(bool) $r('provider_data_last_checked'), 'Last checked date'];
        echo '<ul class="tcfd-health">';
        foreach ($items as [$ok, $label]) echo '<li class="' . ($ok ? 'ok' : 'no') . '"><span class="dashicons dashicons-' . ($ok ? 'yes' : 'minus') . '"></span>' . esc_html($label) . '</li>';
        echo '</ul><p class="description">Changes show in the directory as soon as you click Update.</p>';
    }
}
