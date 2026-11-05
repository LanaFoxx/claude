/*
 * Client Desk: the CRM screen in the WordPress admin.
 * Home, To-Do and one view per list; a contact opens in a panel on the right with its details,
 * notes, form entries ("Files") and to-dos. Everything is saved through the dwd/v1/crm REST routes.
 */
(function () {
	'use strict';
	var app = document.getElementById('dwdc-app');
	if (!app || !window.DWDC) { return; }

	var S = { lists: [], contacts: [], tasks: [], open: null, tab: 'notes', q: '' };

	/* ---------- helpers ---------- */
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function api(path, method, body) {
		return fetch(DWDC.api + path, {
			method: method || 'GET', credentials: 'same-origin',
			headers: { 'X-WP-Nonce': DWDC.nonce, 'Content-Type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined
		}).then(function (r) { return r.json().then(function (j) { if (!r.ok) { throw new Error(j.message || 'Something went wrong'); } return j; }); });
	}
	function list(id) { if (VIRTUAL[id]) { return VIRTUAL[id]; } for (var i = 0; i < S.lists.length; i++) { if (S.lists[i].id === id) { return S.lists[i]; } } return { id: id, name: id || 'No list', color: '#A7B1C2' }; }
	function contact(id) { for (var i = 0; i < S.contacts.length; i++) { if (S.contacts[i].id === id) { return S.contacts[i]; } } return null; }
	// Views that aren't stages: everyone who sent the onboarding form, and everyone paying for hosting.
	var ONBOARD = { id: 'onboarding', name: 'Onboarding forms', color: '#E2A93B' };
	var HOSTING = { id: 'hosting', name: 'Hosting clients', color: '#3BB4D8' };
	var VIRTUAL = { onboarding: ONBOARD, hosting: HOSTING };
	function num(v) { return parseFloat(String(v || '').replace(/[^\d.]/g, '')) || 0; }
	function inList(id) {
		if (id === 'onboarding') { return S.contacts.filter(function (c) { return c.onboarded; }).sort(function (a, b) { return a.onboarded < b.onboarded ? 1 : -1; }); }
		return S.contacts.filter(function (c) { return id === 'hosting' ? num(c.hosting) > 0 : c.list === id; });
	}
	function lifetime(c) { return num(c.price) + (c.jobs || []).reduce(function (s, j) { return s + num(j.price); }, 0); }
	function quiet(c) { var t = d(c.updated); return t && Date.now() - t > 21 * 864e5; }
	function openTasks() { return S.tasks.filter(function (t) { return !t.done; }); }
	function d(s) { return s ? new Date(/T|Z/.test(s) ? s : s.replace(' ', 'T') + 'Z') : null; }
	function ago(s) {
		var t = d(s); if (!t) { return ''; }
		var m = Math.round((Date.now() - t) / 60000);
		if (m < 1) { return 'just now'; } if (m < 60) { return m + 'm ago'; }
		var h = Math.round(m / 60); if (h < 24) { return h + 'h ago'; }
		var dd = Math.round(h / 24); if (dd < 30) { return dd + 'd ago'; }
		return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}
	function day(s) { if (!s) { return ''; } var t = new Date(s + 'T12:00:00'); return isNaN(t) ? s : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
	function due(t) {
		if (!t.due) { return ''; }
		var cls = t.due < DWDC.today ? 'late' : (t.due === DWDC.today ? 'today' : '');
		return '<span class="dwdc-due ' + cls + '">' + (t.due === DWDC.today ? 'Today' : day(t.due)) + '</span>';
	}
	function money(n) { return '$' + Math.round(num(n)).toLocaleString(); }
	function initials(n) { return String(n || '?').split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }
	function avatar(c) { return '<span class="dwdc-av" style="background:' + list(c.list).color + '">' + esc(initials(c.name)) + '</span>'; }
	function listSelect(cur, attr) {
		return '<select ' + attr + '>' + S.lists.map(function (l) { return '<option value="' + l.id + '"' + (l.id === cur ? ' selected' : '') + '>' + esc(l.name) + '</option>'; }).join('') + '</select>';
	}
	function toast(msg, bad) {
		var t = document.createElement('div'); t.className = 'dwdc-toast' + (bad ? ' bad' : ''); t.textContent = msg;
		document.body.appendChild(t); setTimeout(function () { t.classList.add('out'); }, 2200); setTimeout(function () { t.remove(); }, 2700);
	}
	function fail(e) { toast(e.message || 'Something went wrong', true); }

	/* ---------- routing ---------- */
	function route() { var h = location.hash.replace(/^#/, '').split('/'); return { view: h[0] || 'home', arg: h[1] || '' }; }
	window.addEventListener('hashchange', render);

	/* ---------- layout ---------- */
	function sidebar(r) {
		var nav = function (href, label, count, color, on) {
			return '<a class="dwdc-nav' + (on ? ' on' : '') + '" href="#' + href + '">' + (color ? '<i style="background:' + color + '"></i>' : '') + '<span>' + esc(label) + '</span>' + (count !== '' ? '<b>' + count + '</b>' : '') + '</a>';
		};
		return '<aside class="dwdc-side">'
			+ '<div class="dwdc-brand"><img src="' + esc(DWDC.logo) + '" alt=""><div><strong>Client Desk</strong><small>Dream Web Digital</small></div></div>'
			+ '<nav>' + nav('home', 'Home', '', '', r.view === 'home')
			+ nav('todo', 'To-Do', openTasks().length, '', r.view === 'todo')
			+ nav('all', 'All contacts', S.contacts.length, '', r.view === 'all')
			+ '<div class="dwdc-navh">Lists</div>'
			+ [S.lists[0], ONBOARD].concat(S.lists.slice(1), [HOSTING]).map(function (l) { return nav('list/' + l.id, l.name, inList(l.id).length, l.color, r.view === 'list' && r.arg === l.id); }).join('')
			+ '</nav><button class="dwdc-btn dwdc-add" data-act="job">+ Add job</button><button class="dwdc-btn dwdc-add ghost" data-act="new" data-stage="leads">+ Add lead</button></aside>';
	}

	function render() {
		var r = route(), main;
		if (r.view === 'todo') { main = todoView(); }
		else if (r.view === 'list') { main = listView(r.arg); }
		else if (r.view === 'all') { main = listView(''); }
		else { main = homeView(); }
		app.innerHTML = sidebar(r) + '<main class="dwdc-main">' + main + '</main>' + panel() + modal();
		var q = app.querySelector('.dwdc-search');
		if (q && S.focusSearch) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); S.focusSearch = false; }
	}

	/* ---------- home ---------- */
	function homeView() {
		var h = new Date().getHours(), hi = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
		var active = inList('active'), hosting = inList('hosting');
		var owed = S.contacts.reduce(function (s, c) { return s + (c.list === 'archive' ? 0 : num(c.balance)); }, 0);
		var annual = hosting.reduce(function (s, c) { return s + num(c.hosting); }, 0);
		var earned = S.contacts.reduce(function (s, c) { return s + lifetime(c); }, 0);
		var soon = hosting.filter(function (c) { return c.renewal; }).sort(function (a, b) { return a.renewal < b.renewal ? -1 : 1; })[0];
		var card = function (id, big, sub) {
			var l = list(id);
			return '<a class="dwdc-card" href="#list/' + id + '" style="--c:' + l.color + '"><span class="dwdc-card-h">' + esc(l.name) + '</span><strong>' + big + '</strong><small>' + sub + '</small></a>';
		};
		var todayTasks = openTasks().filter(function (t) { return t.due && t.due <= DWDC.today; });
		var recent = S.contacts.filter(function (c) { return c.entry_count; }).slice(0, 6);
		return '<header class="dwdc-top"><div><p class="dwdc-eyebrow">' + new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + '</p><h1>' + hi + ', <em>Michael</em></h1></div>'
			+ searchBox() + '</header>'
			+ (S.q ? results() : '<div class="dwdc-cards">'
				+ card('active', active.length, owed ? money(owed) + ' still owed overall' : 'Nothing owed')
				+ card('limbo', inList('limbo').length, 'Waiting on the client')
				+ card('complete', inList('complete').length, money(earned) + ' billed all-time')
				+ card('hosting', hosting.length, money(annual) + '/yr' + (soon ? ' · next ' + day(soon.renewal) : ''))
				+ '</div>'
				+ '<div class="dwdc-box-h dwdc-sech"><h2>Active jobs</h2><button class="dwdc-btn" data-act="job">+ Add job</button></div>'
				+ (active.length ? '<div class="dwdc-jobs">' + active.map(jobCard).join('') + '</div>' : '<div class="dwdc-box"><p class="dwdc-empty">No active jobs. Move a client to Active jobs to see it here.</p></div>')
				+ '<div class="dwdc-cols">'
				+ '<section class="dwdc-box"><div class="dwdc-box-h"><h2>Due today</h2><a href="#todo">All to-dos →</a></div>'
				+ (todayTasks.length ? '<ul class="dwdc-tasks">' + todayTasks.map(taskRow).join('') + '</ul>' : '<p class="dwdc-empty">Nothing due. Nice.</p>')
				+ '</section>'
				+ '<section class="dwdc-box"><div class="dwdc-box-h"><h2>Latest form entries</h2><a href="#list/leads">Leads →</a></div>'
				+ (recent.length ? '<ul class="dwdc-rows">' + recent.map(function (c) {
					return '<li data-open="' + c.id + '">' + avatar(c) + '<span class="dwdc-who"><strong>' + esc(c.name) + '</strong><small>' + esc(c.last_entry || c.email) + '</small></span><span class="dwdc-pill" style="--c:' + list(c.list).color + '">' + esc(list(c.list).name) + '</span><time>' + ago(c.updated) + '</time></li>';
				}).join('') + '</ul>' : '<p class="dwdc-empty">Form entries from the website will show up here.</p>')
				+ '</section></div>');
	}
	// One active job on the home screen: money, deadline and its own to-do list.
	function jobCard(c) {
		var tasks = S.tasks.filter(function (t) { return t.contact === c.id && !t.done; });
		var late = c.deadline && c.deadline < DWDC.today;
		return '<article class="dwdc-job">'
			+ '<header data-open="' + c.id + '">' + avatar(c) + '<div><h3>' + esc(c.name) + '</h3><small>' + esc([c.job, c.person].filter(Boolean).join(' · ') || c.email || c.website || '') + '</small></div>'
			+ (quiet(c) ? '<span class="dwdc-quiet" title="No activity in 3+ weeks">Quiet ' + ago(c.updated).replace(' ago', '') + '</span>' : '') + '</header>'
			+ '<div class="dwdc-money"><span><small>Price</small><b>' + (num(c.price) ? money(c.price) : '—') + '</b></span><span><small>Owed</small><b class="' + (num(c.balance) ? 'owe' : '') + '">' + (num(c.balance) ? money(c.balance) : '$0') + '</b></span><span><small>Due</small><b class="' + (late ? 'late' : '') + '">' + (c.deadline ? day(c.deadline) : '—') + '</b></span></div>'
			+ (c.next ? '<p class="dwdc-next">Next: ' + esc(c.next) + '</p>' : '')
			+ '<ul class="dwdc-tasks">' + tasks.map(taskRow).join('') + '</ul>'
			+ '<form class="dwdc-qt mini" data-contact="' + c.id + '"><input name="text" placeholder="+ Add a to-do for ' + esc(c.name) + '" required><input type="hidden" name="due" value=""></form>'
			+ '</article>';
	}
	function searchBox() { return '<input class="dwdc-search" type="search" placeholder="Search name, email, company…" value="' + esc(S.q) + '">'; }
	function match(c) {
		var q = S.q.toLowerCase();
		return !q || [c.name, c.email, c.phone, c.company, c.website].join(' ').toLowerCase().indexOf(q) > -1;
	}
	function results() { var r = S.contacts.filter(match); return r.length ? table(r, '') : '<p class="dwdc-empty">No contacts match “' + esc(S.q) + '”.</p>'; }

	/* ---------- list ---------- */
	function listView(id) {
		var l = id ? list(id) : { name: 'All contacts', color: '#12293E' };
		var rows = (id ? inList(id) : S.contacts).filter(match);
		if (id === 'hosting') { rows.sort(function (a, b) { return (a.renewal || '9') < (b.renewal || '9') ? -1 : 1; }); }
		return '<header class="dwdc-top"><div><p class="dwdc-eyebrow"><i style="background:' + l.color + '"></i>List</p><h1>' + esc(l.name) + ' <span class="dwdc-count">' + rows.length + '</span></h1></div>'
			+ '<div class="dwdc-acts">' + searchBox() + addBtn(id) + '</div></header>'
			+ (id === 'onboarding' ? '<p class="dwdc-src dwdc-hint">Everyone who has sent the onboarding form, newest first. Open one and go to Files to read their answers.</p>' : '')
			+ (id === 'hosting' ? '<p class="dwdc-src dwdc-hint">Soonest renewal first. <b>Auto-pay</b> means they pay yearly through the website (Stripe) and the date moves on by itself. Send the others the payment link from their page.</p>' : '')
			+ (rows.length ? table(rows, id) : '<div class="dwdc-box"><p class="dwdc-empty">' + (S.q ? 'No matches.' : 'No one here yet.') + '</p></div>');
	}
	function addBtn(id) {
		if (id === 'active') { return '<button class="dwdc-btn" data-act="job">+ Add job</button>'; }
		if (id === 'leads') { return '<button class="dwdc-btn" data-act="new" data-stage="leads">+ Add lead</button>'; }
		if (id === 'onboarding' || id === 'hosting' || !id) { return ''; }
		return '<button class="dwdc-btn" data-act="new" data-stage="' + id + '">+ Add contact</button>';
	}
	function table(rows, view) {
		var hosting = view === 'hosting', del = view === 'archive' || view === 'leads';
		var sum = rows.reduce(function (s, c) { return s + (hosting ? num(c.hosting) : lifetime(c)); }, 0);
		return '<div class="dwdc-box dwdc-table"><table><thead><tr><th>Client / job</th><th>Contact</th>'
			+ (hosting ? '<th>Hosting</th><th class="m">Renews</th>' : '<th>Price</th><th class="m">Owed</th>')
			+ '<th class="m">' + (view === 'onboarding' ? 'Form sent' : 'Last activity') + '</th><th>Stage</th>' + (del ? '<th></th>' : '') + '</tr></thead><tbody>'
			+ rows.map(function (c) {
				var site = String(c.website).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
				var sub = [c.person, site].filter(Boolean).join(' · ');
				var renewSoon = c.renewal && c.renewal < new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
				return '<tr data-open="' + c.id + '"><td><div class="dwdc-name">' + avatar(c) + '<span><strong>' + esc(c.name) + '</strong>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></div></td>'
					+ '<td><small>' + esc(c.email) + (c.phone ? '<br>' + esc(c.phone) : '') + '</small></td>'
					+ (hosting
						? '<td><small><b>' + money(c.hosting) + '</b>/yr</small>' + (c.autopay ? '<span class="dwdc-auto">Auto-pay</span>' : '') + '</td><td class="m"><small class="' + (renewSoon ? 'dwdc-soon' : '') + '">' + (c.renewal ? day(c.renewal) + ' ’' + c.renewal.slice(2, 4) : '') + '</small></td>'
						: '<td><small><b>' + (lifetime(c) ? money(lifetime(c)) : '') + '</b>' + ((c.jobs || []).length ? ' · ' + (c.jobs.length + (num(c.price) ? 1 : 0)) + ' jobs' : '') + '</small></td><td class="m"><small class="' + (num(c.balance) ? 'dwdc-owe' : '') + '">' + (num(c.balance) ? money(c.balance) : '') + '</small></td>')
					+ '<td class="m"><small>' + (view === 'onboarding' ? ago(c.onboarded) : ago(c.updated)) + (c.entry_count ? ' · ' + c.entry_count + ' form' + (c.entry_count > 1 ? 's' : '') : '') + '</small></td>'
					+ '<td>' + listSelect(c.list, 'data-move="' + c.id + '" class="dwdc-move" style="--c:' + list(c.list).color + '"') + '</td>'
					+ (del ? '<td class="dwdc-xc"><button class="dwdc-x" data-quickdel="' + c.id + '" title="Delete">×</button></td>' : '') + '</tr>';
			}).join('') + '</tbody><tfoot><tr><td colspan="2"><small>' + rows.length + ' total</small></td><td colspan="' + (del ? 5 : 4) + '"><small><b>' + money(sum) + '</b>' + (hosting ? '/yr' : ' billed') + '</small></td></tr></tfoot></table></div>';
	}

	/* ---------- to-dos ---------- */
	function taskRow(t) {
		var c = t.contact ? contact(t.contact) : null;
		return '<li class="dwdc-task' + (t.done ? ' done' : '') + '"><label><input type="checkbox" data-done="' + t.id + '"' + (t.done ? ' checked' : '') + '><span></span></label>'
			+ '<span class="dwdc-tt" contenteditable="true" data-text="' + t.id + '">' + esc(t.text) + '</span>'
			+ (c ? '<button class="dwdc-chip" data-open="' + c.id + '">' + esc(c.name) + '</button>' : '')
			+ due(t) + '<button class="dwdc-x" data-del-task="' + t.id + '" title="Delete">×</button></li>';
	}
	function quickTask(cid) {
		return '<form class="dwdc-qt" data-contact="' + cid + '"><input name="text" placeholder="Add a to-do…" required>'
			+ (cid ? '' : '<select name="contact"><option value="0">No contact</option>' + S.contacts.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>')
			+ '<input type="date" name="due" value="' + DWDC.today + '"><button class="dwdc-btn">Add</button></form>';
	}
	function todoView() {
		var open = openTasks(), done = S.tasks.filter(function (t) { return t.done; });
		var groups = [
			['Overdue', open.filter(function (t) { return t.due && t.due < DWDC.today; })],
			['Today', open.filter(function (t) { return t.due === DWDC.today; })],
			['Upcoming', open.filter(function (t) { return t.due > DWDC.today; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; })],
			['Anytime', open.filter(function (t) { return !t.due; })]
		];
		return '<header class="dwdc-top"><div><p class="dwdc-eyebrow">Everything on your plate</p><h1>To-<em>Do</em> <span class="dwdc-count">' + open.length + '</span></h1></div></header>'
			+ '<section class="dwdc-box">' + quickTask(0)
			+ groups.filter(function (g) { return g[1].length; }).map(function (g) { return '<h3 class="dwdc-gh">' + g[0] + '</h3><ul class="dwdc-tasks">' + g[1].map(taskRow).join('') + '</ul>'; }).join('')
			+ (open.length ? '' : '<p class="dwdc-empty">All clear.</p>')
			+ (done.length ? '<details class="dwdc-done"><summary>Done (' + done.length + ')</summary><ul class="dwdc-tasks">' + done.map(taskRow).join('') + '</ul></details>' : '')
			+ '</section>';
	}

	/* ---------- contact panel ---------- */
	function panel() {
		var c = S.open;
		if (!c) { return ''; }
		var l = list(c.list);
		var f = function (k, label, type) { return '<label><span>' + label + '</span><input name="' + k + '" type="' + (type || 'text') + '" value="' + esc(c[k]) + '"></label>'; };
		var tasks = S.tasks.filter(function (t) { return t.contact === c.id; });
		var link = function (href, label) { return href ? '<a class="dwdc-ql" href="' + esc(href) + '" target="_blank" rel="noopener">' + label + '</a>' : ''; };
		var site = c.website ? (/^https?:/.test(c.website) ? c.website : 'https://' + c.website) : '';
		var tabs = { notes: 'Notes', jobs: 'Jobs (' + ((c.jobs || []).length + (num(c.price) ? 1 : 0)) + ')', files: 'Files (' + (c.files || []).length + ')', todos: 'To-dos (' + tasks.filter(function (t) { return !t.done; }).length + ')' };
		var body;
		if (S.tab === 'jobs') {
			var all = (num(c.price) || c.job || c.list === 'active' ? [{ title: (c.job || 'Current job') + (c.list === 'active' ? ' (in progress)' : ''), price: c.price, date: c.deadline, cur: true }] : []).concat((c.jobs || []).map(function (j, i) { j.i = i; return j; }));
			body = '<div class="dwdc-jobacts"><button class="dwdc-btn" data-act="job" data-contact="' + c.id + '">+ New job for ' + esc(c.name) + '</button>'
				+ (c.list === 'active' ? '<button class="dwdc-btn ghost" data-complete="' + c.id + '">Mark job complete</button>' : '') + '</div>'
				+ '<p class="dwdc-src">Every job you’ve done for ' + esc(c.name) + '. Total spent with you: <b>' + money(lifetime(c)) + '</b></p>'
				+ (all.length ? '<ul class="dwdc-joblist">' + all.map(function (j) {
					return '<li><span>' + esc(j.title) + (j.date ? ' <small>' + esc(j.cur ? 'due ' + day(j.date) : j.date) + '</small>' : '') + '</span><b>' + (num(j.price) ? money(j.price) : '—') + '</b>'
						+ (j.cur ? '' : '<button class="dwdc-x" data-del-job="' + j.i + '" title="Remove">×</button>') + '</li>';
				}).join('') + '</ul>' : '<p class="dwdc-empty">No jobs logged yet.</p>')
				+ '<form class="dwdc-addjob"><input name="title" placeholder="Log an older job, e.g. Homepage redesign" required><input name="price" placeholder="$" inputmode="decimal"><input name="date" placeholder="When (optional)"><button class="dwdc-btn">Add job</button></form>';
		} else if (S.tab === 'files') {
			body = (c.files || []).length ? c.files.map(function (e, i) {
				return '<details class="dwdc-file"' + (i ? '' : ' open') + '><summary><strong>' + esc(e.form || 'Form') + '</strong><time>' + ago(e.date) + '</time></summary><dl>'
					+ (e.fields || []).map(function (x) { return '<dt>' + esc(x.label) + '</dt><dd>' + esc(x.value).replace(/\n/g, '<br>') + '</dd>'; }).join('') + '</dl></details>';
			}).join('') : '<p class="dwdc-empty">No form entries yet.</p>';
		} else if (S.tab === 'todos') {
			body = quickTask(c.id) + (tasks.length ? '<ul class="dwdc-tasks">' + tasks.map(taskRow).join('') + '</ul>' : '<p class="dwdc-empty">No to-dos for ' + esc(c.name) + '.</p>');
		} else {
			body = '<form class="dwdc-note"><textarea name="text" rows="3" placeholder="Add a note: call recap, decisions, next steps…" required></textarea><button class="dwdc-btn">Save note</button></form>'
				+ ((c.notes || []).length ? '<ul class="dwdc-notes">' + c.notes.map(function (n) { return '<li><time>' + ago(n.date) + '</time><p>' + esc(n.text).replace(/\n/g, '<br>') + '</p></li>'; }).join('') + '</ul>' : '<p class="dwdc-empty">No notes yet.</p>');
		}
		return '<div class="dwdc-shade" data-close></div><aside class="dwdc-panel" style="--c:' + l.color + '">'
			+ '<div class="dwdc-ph"><button class="dwdc-x big" data-close title="Close">×</button>' + avatar(c)
			+ '<div><h2>' + esc(c.name) + '</h2><p>' + esc([c.person, c.company].filter(Boolean).join(' · ') || c.email) + '</p></div></div>'
			+ (c.id ? '<div class="dwdc-stats"><span><small>Total spent</small><b>' + money(lifetime(c)) + '</b></span><span><small>Jobs</small><b>' + ((c.jobs || []).length + (num(c.price) || c.job ? 1 : 0)) + '</b></span><span><small>Owed</small><b class="' + (num(c.balance) ? 'owe' : '') + '">' + money(c.balance) + '</b></span>'
				+ (num(c.hosting) ? '<span><small>Hosting</small><b>' + money(c.hosting) + '/yr</b></span>' : '') + '</div>' : '')
			+ (num(c.hosting) ? '<div class="dwdc-hostbar">' + (c.autopay ? '<span class="dwdc-auto">Auto-pay on</span> Renews ' + day(c.renewal) + ' ’' + String(c.renewal).slice(2, 4) + ', charged automatically.'
				: '<span class="dwdc-auto off">Not on auto-pay</span> Renews ' + (c.renewal ? day(c.renewal) + ' ’' + String(c.renewal).slice(2, 4) : '—') + '. <button class="dwdc-link blue" data-copy>Copy payment link</button>')
				+ (c.email ? ' <a href="' + esc(DWDC.orders + encodeURIComponent(c.email)) + '" target="_blank">Payments →</a>' : '') + '</div>' : '')
			+ '<div class="dwdc-qls">' + link(c.email ? 'mailto:' + c.email : '', 'Email') + link(c.phone ? 'tel:' + c.phone.replace(/[^\d+]/g, '') : '', 'Call') + link(site, 'Website') + '</div>'
			+ '<form class="dwdc-fields">' + f('name', 'Client') + f('person', 'Contact person') + f('email', 'Email', 'email') + f('phone', 'Phone') + f('company', 'Company') + f('website', 'Website')
			+ f('job', 'Current job') + '<label><span>Stage</span>' + listSelect(c.list, 'name="list"') + '</label>'
			+ f('deadline', 'Deadline', 'date')
			+ f('price', 'Job price ($)') + f('balance', 'Still owed ($)') + '<span></span>'
			+ f('hosting', 'Hosting ($/yr)') + f('renewal', 'Hosting renews', 'date')
			+ '<label class="wide"><span>Next step</span><input name="next" value="' + esc(c.next) + '" placeholder="e.g. Send proposal Friday"></label>'
			+ (c.source ? '<p class="dwdc-src wide">Came in from ' + esc(c.source) + ' · ' + ago(c.created) + '</p>' : '')
			+ '<div class="wide dwdc-fa"><button class="dwdc-btn">Save changes</button><button type="button" class="dwdc-link" data-trash="' + c.id + '">Delete contact</button></div></form>'
			+ '<div class="dwdc-tabs">' + Object.keys(tabs).map(function (k) { return '<button data-tab="' + k + '"' + (S.tab === k ? ' class="on"' : '') + '>' + tabs[k] + '</button>'; }).join('') + '</div>'
			+ '<div class="dwdc-tabbody">' + body + '</div></aside>';
	}
	/* ---------- add a job (new or returning client) ---------- */
	function modal() {
		var m = S.modal;
		if (!m) { return ''; }
		var v = m.vals || {}, picked = m.contact ? contact(m.contact) : null;
		var inp = function (k, label, ph, type) { return '<label><span>' + label + '</span><input name="' + k + '" type="' + (type || 'text') + '" value="' + esc(v[k] || '') + '" placeholder="' + esc(ph || '') + '"></label>'; };
		var who;
		if (picked) {
			who = '<div class="dwdc-picked">' + avatar(picked) + '<span><strong>' + esc(picked.name) + '</strong><small>' + esc([picked.person, picked.email].filter(Boolean).join(' · ')) + (lifetime(picked) ? ' · ' + money(lifetime(picked)) + ' so far' : '') + '</small></span><button type="button" class="dwdc-link blue" data-unpick>Change</button></div>';
		} else if (m.newc) {
			who = '<div class="dwdc-grid2">' + inp('name', 'Client / business', 'e.g. Bayfield Inn') + inp('person', 'Contact person') + inp('email', 'Email', '', 'email') + inp('phone', 'Phone') + inp('website', 'Website') + '</div>'
				+ '<button type="button" class="dwdc-link blue" data-oldc>← Pick an existing client instead</button>';
		} else {
			who = '<input class="dwdc-pick" placeholder="Search your clients and leads…" autocomplete="off" value="' + esc(m.q || '') + '"><ul class="dwdc-picks">' + pickList(m.q || '') + '</ul>'
				+ '<button type="button" class="dwdc-link blue" data-newc>+ New client (not in Client Desk yet)</button>';
		}
		return '<div class="dwdc-shade top" data-close-modal></div><form class="dwdc-modal dwdc-jobform"><button type="button" class="dwdc-x big" data-close-modal>×</button>'
			+ '<p class="dwdc-eyebrow">Active jobs</p><h2>Add a <em>job</em></h2>'
			+ '<h3 class="dwdc-gh">Who hired you</h3>' + who
			+ '<h3 class="dwdc-gh">The job</h3><div class="dwdc-grid2">' + '<label class="wide"><span>What they hired you for</span><input name="title" required value="' + esc(v.title || '') + '" placeholder="e.g. Website redesign, 3 new pages, logo"></label>'
			+ inp('price', 'Price ($)', '3000') + inp('balance', 'Still owed ($)', 'e.g. 1500 after deposit') + inp('deadline', 'Deadline', '', 'date') + '</div>'
			+ (picked && (num(picked.price) || picked.job) ? '<p class="dwdc-src">Their last job (' + esc(picked.job || 'Earlier job') + (num(picked.price) ? ', ' + money(picked.price) : '') + ') moves into their job history.</p>' : '')
			+ '<div class="dwdc-fa"><button class="dwdc-btn">Add to active jobs</button></div></form>';
	}
	function pickList(q) {
		q = q.toLowerCase().trim();
		var r = S.contacts.filter(function (c) { return !q || [c.name, c.person, c.email, c.company, c.website].join(' ').toLowerCase().indexOf(q) > -1; })
			.sort(function (a, b) { return a.name.localeCompare(b.name); }).slice(0, q ? 12 : 8);
		return r.length ? r.map(function (c) {
			return '<li data-pick="' + c.id + '">' + avatar(c) + '<span><strong>' + esc(c.name) + '</strong><small>' + esc([c.person, c.email || c.website].filter(Boolean).join(' · ')) + '</small></span><em class="dwdc-pill" style="--c:' + list(c.list).color + '">' + esc(list(c.list).name) + '</em></li>';
		}).join('') : '<li class="none">No match. Add them as a new client below.</li>';
	}
	function keepVals() {
		var f = app.querySelector('.dwdc-jobform'); if (!f || !S.modal) { return; }
		S.modal.vals = S.modal.vals || {};
		new FormData(f).forEach(function (val, k) { S.modal.vals[k] = val; });
	}

	function openContact(id) {
		api('/contact/' + id).then(function (c) { S.open = c; render(); }).catch(fail);
	}
	function refreshContact(c) {
		S.open = c;
		var i = S.contacts.findIndex(function (x) { return x.id === c.id; });
		if (i > -1) { S.contacts[i] = c; } else { S.contacts.unshift(c); }
		render();
	}

	/* ---------- events ---------- */
	app.addEventListener('click', function (e) {
		var t = e.target, el;
		if (t.closest('select, input, textarea, label, [contenteditable]')) { return; }
		if (t.closest('[data-close-modal]')) { S.modal = null; render(); return; }
		if ((el = t.closest('[data-pick]'))) { keepVals(); S.modal.contact = +el.getAttribute('data-pick'); render(); focusIn('[name=title]'); return; }
		if (t.closest('[data-unpick]')) { keepVals(); S.modal.contact = 0; render(); focusIn('.dwdc-pick'); return; }
		if (t.closest('[data-newc]')) { keepVals(); S.modal.newc = true; S.modal.vals = S.modal.vals || {}; S.modal.vals.name = S.modal.q || ''; render(); focusIn('[name=name]'); return; }
		if (t.closest('[data-oldc]')) { keepVals(); S.modal.newc = false; render(); focusIn('.dwdc-pick'); return; }
		if ((el = t.closest('[data-act="job"]'))) {
			S.modal = { contact: +el.getAttribute('data-contact') || 0, q: '', vals: {} }; S.open = null; render();
			focusIn(S.modal.contact ? '[name=title]' : '.dwdc-pick'); return;
		}
		if ((el = t.closest('[data-quickdel]'))) {
			var qid = +el.getAttribute('data-quickdel'), row = el.closest('tr');
			if (row) { row.style.opacity = '.3'; }
			api('/contact/' + qid, 'DELETE').then(function () { S.contacts = S.contacts.filter(function (x) { return x.id !== qid; }); S.tasks = S.tasks.filter(function (x) { return x.contact !== qid; }); render(); toast('Deleted'); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-complete]'))) {
			api('/contact/' + el.getAttribute('data-complete'), 'POST', { list: 'complete', deadline: '' }).then(function (x) { refreshContact(x); toast('Moved to Completed'); }).catch(fail);
			return;
		}
		if (t.closest('[data-copy]')) {
			(navigator.clipboard ? navigator.clipboard.writeText(DWDC.pay) : Promise.reject()).then(function () { toast('Payment link copied'); }, function () { prompt('Copy this payment link:', DWDC.pay); });
			return;
		}
		if ((el = t.closest('[data-close]'))) { S.open = null; render(); return; }
		if ((el = t.closest('[data-open]'))) { e.preventDefault(); S.tab = 'notes'; openContact(+el.getAttribute('data-open')); return; }
		if ((el = t.closest('[data-tab]'))) { S.tab = el.getAttribute('data-tab'); render(); return; }
		if ((el = t.closest('[data-del-task]'))) {
			var id = +el.getAttribute('data-del-task');
			api('/task/' + id, 'DELETE').then(function () { S.tasks = S.tasks.filter(function (x) { return x.id !== id; }); render(); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-del-job]'))) {
			var jobs = (S.open.jobs || []).slice(); jobs.splice(+el.getAttribute('data-del-job'), 1);
			api('/contact/' + S.open.id, 'POST', { jobs: jobs }).then(refreshContact).catch(fail);
			return;
		}
		if ((el = t.closest('[data-trash]'))) {
			if (!confirm('Delete this contact? It goes to the WordPress trash.')) { return; }
			var cid = +el.getAttribute('data-trash');
			api('/contact/' + cid, 'DELETE').then(function () { S.contacts = S.contacts.filter(function (x) { return x.id !== cid; }); S.open = null; render(); toast('Contact deleted'); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-act="new"]'))) {
			var r = route(), stage = el.getAttribute('data-stage');
			S.tab = 'notes';
			S.open = { id: 0, name: '', person: '', email: '', phone: '', company: '', website: '', list: stage || (r.view === 'list' && !VIRTUAL[r.arg] ? r.arg : 'leads'), job: '', price: '', balance: '', deadline: '', hosting: '', renewal: '', next: '', jobs: [], notes: [], files: [] };
			render();
			var n = app.querySelector('.dwdc-fields [name=name]'); if (n) { n.focus(); }
		}
	});
	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Escape') { return; }
		if (S.modal) { S.modal = null; render(); } else if (S.open) { S.open = null; render(); }
	});
	function focusIn(sel) { var x = app.querySelector('.dwdc-modal ' + sel) || app.querySelector(sel); if (x) { x.focus(); } }

	app.addEventListener('input', function (e) {
		if (e.target.classList.contains('dwdc-search')) { S.q = e.target.value; S.focusSearch = true; render(); }
		if (e.target.classList.contains('dwdc-pick')) { S.modal.q = e.target.value; app.querySelector('.dwdc-picks').innerHTML = pickList(S.modal.q); }
	});

	app.addEventListener('change', function (e) {
		var t = e.target;
		if (t.hasAttribute('data-move')) {
			var id = +t.getAttribute('data-move');
			api('/contact/' + id, 'POST', { list: t.value }).then(function (c) {
				var i = S.contacts.findIndex(function (x) { return x.id === id; }); S.contacts[i] = c; render(); toast('Moved to ' + list(c.list).name);
			}).catch(fail);
		} else if (t.hasAttribute('data-done')) {
			var tid = +t.getAttribute('data-done');
			api('/task/' + tid, 'POST', { done: t.checked }).then(function (x) {
				S.tasks = S.tasks.map(function (y) { return y.id === tid ? x : y; }); setTimeout(render, 250);
			}).catch(fail);
		}
	});

	// Edit a to-do's text in place; saved when you click away or press Enter.
	app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.hasAttribute('data-text')) { e.preventDefault(); e.target.blur(); } });
	app.addEventListener('focusout', function (e) {
		var t = e.target; if (!t.hasAttribute || !t.hasAttribute('data-text')) { return; }
		var id = +t.getAttribute('data-text'), txt = t.textContent.trim(), cur = S.tasks.find(function (x) { return x.id === id; });
		if (!txt || !cur || cur.text === txt) { return; }
		api('/task/' + id, 'POST', { text: txt }).then(function (x) { cur.text = x.text; }).catch(fail);
	});

	app.addEventListener('submit', function (e) {
		var f = e.target; e.preventDefault();
		var data = {}; new FormData(f).forEach(function (v, k) { data[k] = v; });
		if (f.classList.contains('dwdc-jobform')) {
			var m = S.modal;
			if (!m.contact && !m.newc) { toast('Pick the client first, or add a new one', true); return; }
			if (m.newc && !String(data.name || '').trim()) { toast('Add the client’s name', true); return; }
			data.contact = m.contact || 0;
			var btn = f.querySelector('.dwdc-fa .dwdc-btn'); btn.disabled = true;
			api('/job', 'POST', data).then(function (x) {
				var i = S.contacts.findIndex(function (y) { return y.id === x.id; }); if (i > -1) { S.contacts[i] = x; } else { S.contacts.unshift(x); }
				S.modal = null; location.hash = '#home'; render(); toast('Added to active jobs');
			}).catch(function (er) { btn.disabled = false; fail(er); });
		} else if (f.classList.contains('dwdc-fields')) {
			var c = S.open;
			(c.id ? api('/contact/' + c.id, 'POST', data) : api('/contact', 'POST', data)).then(function (x) { refreshContact(x); toast(c.id ? 'Saved' : 'Contact added'); }).catch(fail);
		} else if (f.classList.contains('dwdc-addjob')) {
			if (!S.open.id) { toast('Save the contact first', true); return; }
			api('/contact/' + S.open.id, 'POST', { jobs: (S.open.jobs || []).concat([data]) }).then(refreshContact).catch(fail);
		} else if (f.classList.contains('dwdc-note')) {
			api('/contact/' + S.open.id + '/note', 'POST', data).then(refreshContact).catch(fail);
		} else if (f.classList.contains('dwdc-qt')) {
			var cid = +f.getAttribute('data-contact') || +data.contact || 0;
			if (S.open && !S.open.id) { toast('Save the contact first', true); return; }
			api('/task', 'POST', { text: data.text, contact: cid, due: data.due }).then(function (x) { S.tasks.unshift(x); render(); }).catch(fail);
		}
	});

	/* ---------- start ---------- */
	api('').then(function (r) {
		S.lists = r.lists; S.contacts = r.contacts.filter(Boolean); S.tasks = r.tasks.filter(Boolean);
		render();
		var m = /[?&]contact=(\d+)/.exec(location.search), em = /[?&]email=([^&]+)/.exec(location.search);
		if (m) { openContact(+m[1]); }
		else if (em) { var who = S.contacts.find(function (c) { return c.email && c.email.toLowerCase() === decodeURIComponent(em[1]).toLowerCase(); }); if (who) { openContact(who.id); } }
	}).catch(function (e) { app.innerHTML = '<p class="dwdc-loading">Couldn’t load Client Desk: ' + esc(e.message) + '</p>'; });
})();
