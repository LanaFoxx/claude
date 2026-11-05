<?php
// TaxPro: chat popup on course learning pages, answered by Claude.
defined('MOODLE_INTERNAL') || die();

/** Pages where students study: the course page and the lesson / video / reading activities. Never exams (quiz). */
function local_ctctutor_page_ok() {
    global $PAGE, $COURSE;
    if (!get_config('local_ctctutor', 'enabled') || !isloggedin() || isguestuser() || during_initial_install()) {
        return false;
    }
    if (empty($COURSE->id) || $COURSE->id == SITEID) {
        return false;
    }
    $type = (string) $PAGE->pagetype;
    if (strpos($type, 'mod-quiz') === 0 || !preg_match('/^(course-view|mod-(page|hvp|h5pactivity|url|resource|book|lesson|scorm|folder|label|glossary))-/', $type)) {
        return false;
    }
    $ctx = context_course::instance($COURSE->id);
    return is_enrolled($ctx, null, '', true) || has_capability('moodle/course:update', $ctx);
}

/** The chat popup, printed at the bottom of allowed pages (Moodle 3.7 calls before_footer and ignores its return value). */
function local_ctctutor_before_footer() {
    echo local_ctctutor_widget();
}
function local_ctctutor_widget() {
    global $COURSE;
    static $done = false;
    if ($done || !local_ctctutor_page_ok()) {
        return '';
    }
    $done = true;
    $cfg = json_encode(['url' => (new moodle_url('/local/ctctutor/chat.php'))->out(false), 'sesskey' => sesskey(), 'course' => (int) $COURSE->id]);
    ob_start();
    ?>
<div id="ctctp" class="ctctp" aria-live="polite">
  <button type="button" class="ctctp-fab" aria-expanded="false" aria-controls="ctctp-panel"><span class="ctctp-fab-i">💬</span><span class="ctctp-fab-t">Ask TaxPro</span></button>
  <section id="ctctp-panel" class="ctctp-panel" role="dialog" aria-label="TaxPro study assistant" hidden>
    <header class="ctctp-head">
      <div><strong>TaxPro</strong><span>AI study assistant</span></div>
      <button type="button" class="ctctp-x" aria-label="Close">&times;</button>
    </header>
    <div class="ctctp-note">TaxPro is AI. It's usually right, but it can make mistakes. Use it as a study tool to ask questions and confirm what you're learning, and check important details against your course material or IRS / FTB sources.</div>
    <div class="ctctp-log" role="log"></div>
    <form class="ctctp-form">
      <textarea rows="2" maxlength="1500" placeholder="Ask a tax law question…" aria-label="Your question"></textarea>
      <button type="submit" class="ctctp-send" aria-label="Send">➤</button>
    </form>
    <div class="ctctp-foot"><button type="button" class="ctctp-clear">New conversation</button></div>
  </section>
</div>
<style>
.ctctp{position:fixed;right:20px;bottom:20px;z-index:1200;font-family:inherit;font-size:15px}
.ctctp-fab{display:flex;align-items:center;gap:8px;background:#1d2939;color:#fff;border:0;border-radius:999px;padding:12px 18px;font-weight:700;box-shadow:0 8px 24px rgba(16,24,40,.25);cursor:pointer}
.ctctp-fab:hover{background:#344054}.ctctp-fab-i{font-size:18px}
.ctctp-panel{position:absolute;right:0;bottom:62px;width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 110px);background:#fff;border-radius:16px;box-shadow:0 20px 48px rgba(16,24,40,.28);display:flex;flex-direction:column;overflow:hidden;border:1px solid #e4e7ec}
.ctctp-panel[hidden]{display:none}
.ctctp-head{display:flex;justify-content:space-between;align-items:center;background:#1d2939;color:#fff;padding:12px 16px}
.ctctp-head strong{font-size:1.05rem;margin-right:8px}.ctctp-head span{font-size:.8rem;color:#d4a72c;font-weight:600}
.ctctp-x{background:none;border:0;color:#fff;font-size:1.6rem;line-height:1;cursor:pointer;padding:0 4px}
.ctctp-note{background:#fff6e5;color:#7a2e0e;font-size:.78rem;line-height:1.4;padding:8px 14px;border-bottom:1px solid #fedf89}
.ctctp-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#f9fafb}
.ctctp-m{max-width:88%;padding:10px 13px;border-radius:14px;line-height:1.45;white-space:normal;word-wrap:break-word}
.ctctp-m p{margin:0 0 8px}.ctctp-m p:last-child{margin:0}.ctctp-m ul,.ctctp-m ol{margin:4px 0 8px 18px;padding:0}
.ctctp-u{align-self:flex-end;background:#1d2939;color:#fff;border-bottom-right-radius:4px}
.ctctp-a{align-self:flex-start;background:#fff;border:1px solid #e4e7ec;color:#1d2939;border-bottom-left-radius:4px}
.ctctp-e{align-self:center;background:#fef0ee;color:#912018;font-size:.85rem}
.ctctp-typing{color:#667085;font-size:.85rem;align-self:flex-start}
.ctctp-form{display:flex;gap:8px;padding:10px;border-top:1px solid #e4e7ec;background:#fff}
.ctctp-form textarea{flex:1;resize:none;border:1px solid #d0d5dd;border-radius:10px;padding:9px 11px;font:inherit;font-size:.95rem}
.ctctp-send{background:#d4a72c;color:#fff;border:0;border-radius:10px;width:44px;font-size:1.1rem;cursor:pointer}
.ctctp-send[disabled]{opacity:.5}
.ctctp-foot{padding:0 12px 8px;background:#fff;text-align:right}.ctctp-clear{background:none;border:0;color:#667085;font-size:.78rem;cursor:pointer;text-decoration:underline}
@media (max-width:600px){.ctctp{right:12px;bottom:12px}.ctctp-fab-t{display:none}.ctctp-fab{padding:14px}.ctctp-panel{position:fixed;right:8px;left:8px;bottom:76px;width:auto;height:auto;top:118px;max-height:none}}
@media print{.ctctp{display:none}}
</style>
<script>
(function () {
  var C = <?php echo $cfg; ?>, root = document.getElementById('ctctp'); if (!root) return;
  var fab = root.querySelector('.ctctp-fab'), panel = root.querySelector('.ctctp-panel'), log = root.querySelector('.ctctp-log'),
      form = root.querySelector('.ctctp-form'), ta = form.querySelector('textarea'), send = form.querySelector('.ctctp-send');
  var KEY = 'ctctp-' + C.course, hist = [];
  try { hist = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch (e) {}
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  // Light markdown: paragraphs, **bold**, bullet / numbered lists. Everything is escaped first.
  function md(t) {
    var out = [], list = null;
    esc(t).split(/\n/).forEach(function (line) {
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      var b = line.match(/^\s*[-*•]\s+(.*)/), n = line.match(/^\s*\d+[.)]\s+(.*)/);
      if (b || n) { var tag = b ? 'ul' : 'ol'; if (!list || list.tag !== tag) { if (list) out.push('</' + list.tag + '>'); list = {tag: tag}; out.push('<' + tag + '>'); } out.push('<li>' + (b || n)[1] + '</li>'); return; }
      if (list) { out.push('</' + list.tag + '>'); list = null; }
      if (line.trim()) out.push('<p>' + line.replace(/^#+\s*/, '') + '</p>');
    });
    if (list) out.push('</' + list.tag + '>');
    return out.join('');
  }
  function add(role, text) {
    var d = document.createElement('div'); d.className = 'ctctp-m ' + (role === 'user' ? 'ctctp-u' : role === 'error' ? 'ctctp-e' : 'ctctp-a');
    d.innerHTML = role === 'assistant' ? md(text) : esc(text); log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
  }
  function render() {
    log.innerHTML = '';
    if (!hist.length) add('assistant', "Hi! I'm TaxPro. Ask me anything about the tax topics in your course, for example \"What's the difference between a credit and a deduction?\" or \"Who qualifies as a dependent?\"");
    hist.forEach(function (m) { add(m.role, m.content); });
  }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(hist.slice(-20))); } catch (e) {} }
  function open(o) { panel.hidden = !o; fab.setAttribute('aria-expanded', o ? 'true' : 'false'); if (o) { render(); setTimeout(function () { ta.focus(); }, 50); } }
  fab.addEventListener('click', function () { open(panel.hidden); });
  root.querySelector('.ctctp-x').addEventListener('click', function () { open(false); });
  root.querySelector('.ctctp-clear').addEventListener('click', function () { hist = []; save(); render(); });
  ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); } });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = ta.value.trim(); if (!q || send.disabled) return;
    ta.value = ''; hist.push({role: 'user', content: q}); save(); add('user', q);
    var typing = document.createElement('div'); typing.className = 'ctctp-typing'; typing.textContent = 'TaxPro is thinking…'; log.appendChild(typing); log.scrollTop = log.scrollHeight;
    send.disabled = true;
    fetch(C.url, {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({sesskey: C.sesskey, course: C.course, messages: hist.slice(-12)})})
      .then(function (r) { return r.json(); })
      .then(function (j) {
        typing.remove();
        if (j.answer) { hist.push({role: 'assistant', content: j.answer}); save(); add('assistant', j.answer); }
        else { hist.pop(); save(); add('error', j.error || 'Sorry, something went wrong. Please try again.'); }
      })
      .catch(function () { typing.remove(); hist.pop(); save(); add('error', 'Could not reach TaxPro. Check your connection and try again.'); })
      .then(function () { send.disabled = false; ta.focus(); });
  });
})();
</script>
    <?php
    return ob_get_clean();
}

/** The API key: TaxPro's own, else the one saved for the Course update tool. */
function local_ctctutor_key() {
    $k = trim((string) get_config('local_ctctutor', 'apikey'));
    return $k !== '' ? $k : trim((string) get_config('block_ctc_courseupdate', 'anthropickey'));
}

function local_ctctutor_system($coursename) {
    return "You are TaxPro, the study assistant for California Tax Courses (cataxcourses.com), a CTEC- and IRS-approved provider of "
        . "continuing education (20 Hour) and qualifying education (60 Hour) for California tax preparers.\n\n"
        . "The student is studying the course: {$coursename}.\n\n"
        . "Help the student understand and review federal and California tax law and tax preparation topics: filing status, dependents, "
        . "income, deductions, credits, retirement, business income, depreciation, ethics and Circular 230, recent tax law changes, "
        . "California conformity differences, and CTEC / IRS preparer requirements.\n\n"
        . "How to answer:\n"
        . "- Plain language, accurate and concise: usually under 200 words. Lead with the direct answer, then a short explanation or example.\n"
        . "- When a dollar amount, limit, threshold or phase-out matters, say which tax year it applies to. If you are not sure of the "
        . "current-year figure, say so and point to the source (the IRS publication or form instructions, or the California FTB) rather than guessing.\n"
        . "- Point out where California rules differ from federal rules when it matters.\n"
        . "- It's fine to help the student check their understanding of practice questions and explain why an answer is right or wrong.\n"
        . "- This is study help, not legal or tax advice for a specific client; for a real client situation, suggest confirming with the official guidance.\n"
        . "- Stay on tax and course topics. Politely steer other requests back to studying.\n"
        . "- Never ask for Social Security numbers or other personal or client details; if the student shares them, remind them not to.\n"
        . "- For account, login, certificate, book or CTEC reporting questions, refer the student to California Tax Courses support: "
        . "help@cataxcourses.com or (888) 229-1994.\n"
        . "- Use simple formatting only: short paragraphs, **bold** for key terms, and '-' bullet lists. No tables or headings.";
}

/**
 * Ask Claude. $messages: [['role' => 'user'|'assistant', 'content' => string], ...] ending with a user turn.
 * Returns ['answer' => string] or ['error' => string].
 */
function local_ctctutor_ask($coursename, array $messages) {
    global $CFG;
    require_once($CFG->libdir . '/filelib.php');
    $key = local_ctctutor_key();
    if ($key === '') {
        return ['error' => 'TaxPro is not connected yet. Please try again later.'];
    }
    $model = get_config('local_ctctutor', 'model') ?: 'claude-opus-5-5';
    $body = [
        'model' => $model,
        'max_tokens' => 8000,
        'system' => local_ctctutor_system($coursename),
        'messages' => $messages,
        'output_config' => ['effort' => 'low'], // chat: quick answers
        'cache_control' => ['type' => 'ephemeral'],
    ];
    $headers = ['x-api-key: ' . $key, 'anthropic-version: 2026-10-21', 'content-type: application/json'];
    if ($model !== 'claude-haiku-5-5') {
        // If a safety classifier declines, the API retries on a fallback model in the same call.
        $body['fallbacks'] = 'default';
        $headers[] = 'anthropic-beta: server-side-fallback-2026-07-01';
    }
    $curl = new curl(['ignoresecurity' => true]);
    $curl->setHeader($headers);
    $raw = $curl->post('https://api.anthropic.com/v1/messages', json_encode($body), ['CURLOPT_TIMEOUT' => 120, 'CURLOPT_CONNECTTIMEOUT' => 15]);
    $code = (int) ($curl->get_info()['http_code'] ?? 0);
    $res = json_decode((string) $raw, true);
    if ($code !== 200 || !is_array($res)) {
        $msg = is_array($res) ? ($res['error']['message'] ?? '') : '';
        debugging('local_ctctutor: Claude API HTTP ' . $code . ' ' . $msg, DEBUG_DEVELOPER);
        return ['error' => $code === 429 || $code === 529 ? 'TaxPro is busy right now. Please try again in a minute.' : 'TaxPro could not answer just now. Please try again.', 'status' => $code, 'detail' => $msg];
    }
    if (($res['stop_reason'] ?? '') === 'refusal') {
        return ['error' => "TaxPro can't help with that one. Try asking about a tax topic from your course."];
    }
    $text = '';
    foreach ((array) ($res['content'] ?? []) as $block) {
        if (($block['type'] ?? '') === 'text') {
            $text .= $block['text'];
        }
    }
    local_ctctutor_usage_add((int) ($res['usage']['input_tokens'] ?? 0) + (int) ($res['usage']['cache_read_input_tokens'] ?? 0) + (int) ($res['usage']['cache_creation_input_tokens'] ?? 0),
        (int) ($res['usage']['output_tokens'] ?? 0));
    $text = trim($text);
    return $text !== '' ? ['answer' => $text] : ['error' => 'TaxPro could not answer just now. Please try again.'];
}

/** Monthly usage counters (questions, tokens) shown on the settings page. */
function local_ctctutor_usage_add($in, $out) {
    $k = 'usage_' . date('Ym');
    $u = json_decode((string) get_config('local_ctctutor', $k), true) ?: ['q' => 0, 'in' => 0, 'out' => 0];
    $u['q']++; $u['in'] += $in; $u['out'] += $out;
    set_config($k, json_encode($u), 'local_ctctutor');
}
function local_ctctutor_usage_text() {
    $u = json_decode((string) get_config('local_ctctutor', 'usage_' . date('Ym')), true) ?: ['q' => 0, 'in' => 0, 'out' => 0];
    $price = ['claude-opus-5-5' => [4, 20], 'claude-sonnet-5-5' => [2, 10], 'claude-haiku-5-5' => [0.10, 0.50]];
    $p = $price[get_config('local_ctctutor', 'model') ?: 'claude-opus-5-5'] ?? [4, 20];
    $cost = $u['in'] / 1e6 * $p[0] + $u['out'] / 1e6 * $p[1];
    return 'This month: <strong>' . (int) $u['q'] . '</strong> questions answered, about <strong>$' . number_format($cost, 2) . '</strong> in Claude usage (estimate).';
}

/** Daily per-student limit. Returns true when the student may ask another question (and counts it). */
function local_ctctutor_take_quota($userid) {
    $limit = (int) get_config('local_ctctutor', 'dailylimit') ?: 40;
    $today = date('Y-m-d');
    list($d, $n) = array_pad(explode(':', (string) get_user_preferences('local_ctctutor_quota', '', $userid), 2), 2, 0);
    $n = $d === $today ? (int) $n : 0;
    if ($n >= $limit) {
        return false;
    }
    set_user_preference('local_ctctutor_quota', $today . ':' . ($n + 1), $userid);
    return true;
}
