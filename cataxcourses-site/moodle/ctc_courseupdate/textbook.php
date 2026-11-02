<?php
// Course textbook (AI): upload the slide PDFs, the browser reads their text, Claude writes each chapter, Moodle builds the PDF.
require_once(__DIR__ . '/../../config.php');
require_once(__DIR__ . '/lib.php');
require_login();
$sys = context_system::instance();
require_capability('block/ctc_courseupdate:manage', $sys);
core_php_time_limit::raise(900);
raise_memory_limit(MEMORY_HUGE);
$id = required_param('id', PARAM_INT);
$action = optional_param('action', '', PARAM_ALPHA);
$course = get_course($id);
$self = new moodle_url('/blocks/ctc_courseupdate/textbook.php', ['id' => $id]);

// Small JSON endpoints used by the page's script.
if (in_array($action, ['pdf', 'refpdf', 'ref', 'text', 'start', 'status'], true)) {
    require_sesskey();
    $job = required_param('job', PARAM_ALPHANUM);
    $data = block_ctccu_tb_job($id, $job) ?: [];
    $dir = block_ctccu_tb_dir($id, $job);
    if ($action === 'pdf' || $action === 'refpdf') {
        $f = $action === 'refpdf' ? $dir . '/ref.pdf' : $dir . '/pdf_' . required_param('i', PARAM_INT) . '.pdf';
        if (!is_readable($f)) { throw new moodle_exception('filenotfound'); }
        header('Content-Type: application/pdf');
        readfile($f);
        die;
    }
    header('Content-Type: application/json');
    try {
        if ($action === 'ref') {
            $pages = json_decode((string) file_get_contents('php://input'), true) ?: [];
            file_put_contents($dir . '/ref_pages.json', json_encode($pages));
            echo json_encode(['ok' => true, 'pages' => count($pages), 'chapters' => count(block_ctccu_tb_old_chapters($pages))]);
        } else if ($action === 'text') {
            $i = required_param('i', PARAM_INT);
            file_put_contents($dir . '/in_' . $i . '.txt', (string) file_get_contents('php://input'));
            echo json_encode(['ok' => true]);
        } else if ($action === 'start') {
            $ranges = [];
            if (is_readable($dir . '/ref_pages.json')) {
                $ranges = block_ctccu_tb_split_reference($id, $job, json_decode(file_get_contents($dir . '/ref_pages.json'), true) ?: [], array_column($data['pdfs'] ?? [], 'title'));
                $data['refranges'] = $ranges;
                block_ctccu_tb_save($id, $job, $data);
            }
            block_ctccu_tb_start($id, $job, array_column($data['pdfs'] ?? [], 'title'));
            $pairs = [];
            foreach (array_column($data['pdfs'] ?? [], 'title') as $i => $t) {
                $pairs[] = $t . ' ← ' . (isset($ranges[$i]) ? 'last year\'s chapter ' . $ranges[$i]['chapter'] . ' "' . $ranges[$i]['heading'] . '" (pages ' . implode('–', $ranges[$i]['pages']) . ')' : 'no matching chapter last year (written from the slides)');
            }
            echo json_encode(['ok' => true, 'pairs' => $pairs]);
        } else {
            echo json_encode(['ok' => true, 'chapters' => block_ctccu_tb_status($id, $job), 'file' => (bool) block_ctccu_tb_file($id)]);
        }
    } catch (Throwable $e) {
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
    }
    die;
}

$PAGE->set_context($sys);
$PAGE->set_url($self);
$PAGE->set_pagelayout('admin');
$PAGE->set_title('Course textbook');
$PAGE->set_heading('Course textbook');
$msg = '';
$extract = null;
try {
    if ($action === 'upload') {
        require_sesskey();
        $job = random_string(12);
        $dir = block_ctccu_tb_dir($id, $job);
        $pdfs = [];
        $link = optional_param('link', '', PARAM_RAW_TRIMMED);
        if ($link !== '') {
            $tmp = $dir . '/download';
            $kind = block_ctccu_fetch_link($link, $tmp);
            if ($kind === 'pdf') {
                $pdfs['Slides.pdf'] = $tmp;
            } else {
                $zip = new ZipArchive();
                $zip->open($tmp);
                for ($j = 0; $j < $zip->numFiles; $j++) {
                    $entry = $zip->getNameIndex($j);
                    $base = basename($entry);
                    if (preg_match('/\.pdf$/i', $base) && strpos($entry, '__MACOSX') === false && strpos($base, '.') !== 0) {
                        $dest = $dir . '/z' . $j . '.pdf';
                        file_put_contents($dest, $zip->getFromIndex($j));
                        $pdfs[$base] = $dest;
                    }
                }
                $zip->close();
            }
        } else {
            $pdfs = block_ctccu_uploaded('slides', ['pdf']);
        }
        if (!$pdfs) {
            throw new moodle_exception('No slide PDFs found. Upload the PDFs, a .zip of them, or paste a share link.');
        }
        ksort($pdfs, SORT_NATURAL);
        $list = [];
        $i = 0;
        foreach ($pdfs as $name => $path) {
            rename($path, $dir . '/pdf_' . $i . '.pdf');
            $list[] = ['name' => $name, 'title' => block_ctccu_tb_title($name)];
            $i++;
        }
        $refname = block_ctccu_tb_reference($id, $dir . '/ref.pdf');
        block_ctccu_tb_save($id, $job, ['pdfs' => $list, 'ref' => $refname]);
        $extract = ['job' => $job, 'pdfs' => $list, 'ref' => $refname];
    } else if ($action === 'retry') {
        require_sesskey();
        $n = block_ctccu_tb_retry($id, required_param('job', PARAM_ALPHANUM));
        $msg = html_writer::div($n . ' chapter(s) queued again.', 'alert alert-success');
    } else if ($action === 'usepdf') {
        require_sesskey();
        $msg = html_writer::div(s(block_ctccu_tb_use($id)), 'alert alert-success');
    }
} catch (Throwable $e) {
    $msg = html_writer::div(s($e->getMessage()), 'alert alert-danger');
}

echo $OUTPUT->header();
echo $OUTPUT->heading(s($course->fullname) . ' — textbook');
echo html_writer::div(html_writer::link(new moodle_url('/blocks/ctc_courseupdate/update.php', ['id' => $id]), '← Back to the course update'), 'mb-3');
echo $msg;
if (!get_config('block_ctc_courseupdate', 'anthropickey')) {
    echo html_writer::div('Add the Anthropic API key first: ' . html_writer::link(new moodle_url('/admin/settings.php', ['section' => 'blocksettingctc_courseupdate']), 'plugin settings'), 'alert alert-warning');
}
if ($extract) {
    // Read each PDF's text in the browser (pdf.js), send it to the server, then start the chapter tasks.
    echo '<div class="card"><div class="card-body"><h5>Reading last year\'s textbook and ' . count($extract['pdfs']) . ' slide files…</h5>'
        . '<p class="small" id="tb-ref">' . ($extract['ref'] ? 'Last year\'s textbook: ' . s($extract['ref']) . ' — <span>reading</span>' : '<span class="text-warning">Last year\'s textbook was not found in the previous course, so the chapters are written from the slides alone.</span>') . '</p><ol id="tb-list" class="small">';
    foreach ($extract['pdfs'] as $p) {
        echo '<li>' . s($p['title']) . ' <span class="text-muted">— waiting</span></li>';
    }
    echo '</ol><div id="tb-done"></div></div></div>';
    $cfg = json_encode(['base' => $self->out(false), 'sesskey' => sesskey(), 'job' => $extract['job'], 'n' => count($extract['pdfs']), 'ref' => (bool) $extract['ref']]);
    echo '<script type="module">
const C = ' . $cfg . ';
const lib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs");
lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs";
const items = document.querySelectorAll("#tb-list li");
const url = (a, extra) => C.base + "&action=" + a + "&job=" + C.job + "&sesskey=" + C.sesskey + (extra || "");
const pageTexts = async (src) => {
  const doc = await lib.getDocument(src).promise, out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    out.push(tc.items.map(t => t.str + (t.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+\n/g, "\n").trim());
  }
  return out;
};
for (let i = 0; i < C.n; i++) {
  const note = items[i].querySelector("span");
  try {
    note.textContent = "— reading";
    const doc = await lib.getDocument(url("pdf", "&i=" + i)).promise;
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      out += "--- Slide " + p + " ---\n" + tc.items.map(t => t.str + (t.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+\n/g, "\n").trim() + "\n\n";
    }
    await fetch(url("text", "&i=" + i), { method: "POST", body: out, credentials: "same-origin" });
    note.textContent = "— " + doc.numPages + " slides read";
  } catch (e) { note.textContent = "— could not read: " + e.message; note.className = "text-danger"; }
}
if (C.ref) {
  const note = document.querySelector("#tb-ref span");
  try {
    const pages = await pageTexts(url("refpdf"));
    const r = await (await fetch(url("ref"), { method: "POST", body: JSON.stringify(pages), credentials: "same-origin" })).json();
    note.textContent = pages.length + " pages read, " + r.chapters + " chapters found";
  } catch (e) { note.textContent = "could not read it (" + e.message + ") — chapters will be written from the slides alone"; note.className = "text-warning"; }
}
const r = await (await fetch(url("start"), { method: "POST", credentials: "same-origin" })).json();
document.getElementById("tb-done").innerHTML = r.ok
  ? (r.pairs && r.pairs.length ? "<p class=\"small\"><strong>Each new chapter updates:</strong><br>" + r.pairs.map(p => p.replace(/</g, "&lt;")).join("<br>") + "</p>" : "") + "<div class=\"alert alert-success\">All slides read. Claude is now writing the chapters in the background (a few minutes per chapter). You can close this page — <a href=\"" + C.base + "\">see progress</a>.</div>"
  : "<div class=\"alert alert-danger\">" + r.error + "</div>";
</script>';
} else {
    $job = (string) get_config('block_ctc_courseupdate', 'tbjob_' . $id);
    $file = block_ctccu_tb_file($id);
    if ($file) {
        $url = moodle_url::make_pluginfile_url($file->get_contextid(), 'block_ctc_courseupdate', 'textbook', $id, '/', $file->get_filename(), true);
        echo '<div class="card mb-3"><div class="card-body"><h5>✅ Textbook ready</h5><p>' . html_writer::link($url, s($file->get_filename()), ['class' => 'btn btn-primary']) . ' <span class="small text-muted">' . display_size($file->get_filesize()) . ' · built ' . userdate($file->get_timecreated()) . '</span></p>'
            . '<p class="small">This is already the PDF students download in this course. Download it here to send to Vervante for printing the books. If you edit the course PDF by hand later, this button puts the textbook back:</p>'
            . '<form method="post"><input type="hidden" name="sesskey" value="' . sesskey() . '"><input type="hidden" name="action" value="usepdf"><button class="btn btn-secondary">Use the textbook as the course PDF again</button></form></div></div>';
    }
    if ($job && ($st = block_ctccu_tb_status($id, $job))) {
        $done = count(array_filter($st, function ($s) { return $s['status'] === 'done'; }));
        $err = array_filter($st, function ($s) { return $s['status'] === 'error'; });
        echo '<div class="card mb-3"><div class="card-body"><h5>Chapters: ' . $done . ' of ' . count($st) . ' written</h5><ol class="small">';
        foreach ($st as $s) {
            echo '<li>' . s($s['title']) . ' — ' . ($s['status'] === 'done' ? '✅ written' : ($s['status'] === 'error' ? '<span class="text-danger">failed: ' . s($s['error']) . '</span>' : '⏳ waiting for its turn')) . '</li>';
        }
        echo '</ol>' . ($err ? '<form method="post"><input type="hidden" name="sesskey" value="' . sesskey() . '"><input type="hidden" name="action" value="retry"><input type="hidden" name="job" value="' . s($job) . '"><button class="btn btn-secondary">Try the failed chapters again</button></form>' : '')
            . ($done === count($st) && !$file ? '<p>All chapters written — the PDF is being put together (refresh in a minute).</p>' : '') . '<p class="small text-muted">Chapters are written by the server\'s scheduled tasks (cron). Refresh this page to see progress.</p></div></div>';
    }
    echo '<div class="card"><div class="card-body"><h5>Build a new textbook from the slides</h5><p class="small">Upload the slide PDFs (select them all, or a .zip of the folder), or paste a Dropbox / Google Drive link to the .zip. Claude rewrites each chapter as textbook text — keeping every figure exactly — and the book gets a title page with the ' . s($course->fullname) . ' year and a clickable table of contents.</p>'
        . '<form method="post" enctype="multipart/form-data"><input type="hidden" name="sesskey" value="' . sesskey() . '"><input type="hidden" name="action" value="upload">'
        . '<p><input type="file" name="slides[]" accept=".pdf,.zip" multiple></p><p class="small">— or a share link —</p><p><input type="url" class="form-control" name="link" placeholder="https://www.dropbox.com/… or https://drive.google.com/file/d/…"></p>'
        . '<button class="btn btn-primary">Read the slides and start writing</button></form></div></div>';
}
echo $OUTPUT->footer();
