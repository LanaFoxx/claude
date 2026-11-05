/*
 * Client Desk: the CRM screen in the WordPress admin (design: "CRM Redesign" handoff).
 * Screens: Dashboard, Leads & Onboarding, Active Jobs, To-dos, Hosting, Completed, Archive and a
 * full Client page. Everything is saved through the dwd/v1/crm REST routes in includes/crm.php.
 */
(function () {
	'use strict';
	var app = document.getElementById('dwdc-app');
	if (!app || !window.DWDC) { return; }

	var S = { contacts: [], tasks: [], full: {}, q: '', leadFilter: 'all', back: 'dashboard', modal: null, edit: false, more: {}, cardTodo: 0, prev: '' };

	/* ---------- helpers ---------- */
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function api(path, method, body) {
		return fetch(DWDC.api + path, {
			method: method || 'GET', credentials: 'same-origin',
			headers: { 'X-WP-Nonce': DWDC.nonce, 'Content-Type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined
		}).then(function (r) { return r.json().then(function (j) { if (!r.ok) { throw new Error(j.message || 'Something went wrong'); } return j; }); });
	}
	function num(v) { return parseFloat(String(v || '').replace(/[^\d.]/g, '')) || 0; }
	function money(n) { return '$' + Math.round(num(n)).toLocaleString(); }
	function d(s) { return s ? new Date(/T|Z/.test(s) ? s : (s.length === 10 ? s + 'T12:00:00' : s.replace(' ', 'T') + 'Z')) : null; }
	function ago(s) {
		var t = d(s); if (!t || isNaN(t)) { return ''; }
		var m = Math.round((Date.now() - t) / 60000);
		if (m < 1) { return 'just now'; } if (m < 60) { return m + 'm ago'; }
		var h = Math.round(m / 60); if (h < 24) { return h + 'h ago'; }
		var dd = Math.round(h / 24); if (dd === 1) { return 'Yesterday'; } if (dd < 30) { return dd + 'd ago'; }
		return fmt(s, true);
	}
	function fmt(s, year) {
		var t = d(s); if (!t || isNaN(t)) { return s || ''; }
		var o = { month: 'short', day: 'numeric' }; if (year && t.getFullYear() !== new Date().getFullYear()) { o.year = 'numeric'; }
		return t.toLocaleDateString('en-US', o);
	}
	function daysTo(s) { return Math.round((new Date(s + 'T12:00:00') - new Date(DWDC.today + 'T12:00:00')) / 864e5); }
	function initials(n) { return String(n || '?').replace(/[^\w\s'-]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase() || '?'; }
	function contact(id) { for (var i = 0; i < S.contacts.length; i++) { if (S.contacts[i].id === id) { return S.contacts[i]; } } return null; }
	// Total billed: the jobs logged here, or the Upwork lifetime total if that's higher (it already includes those jobs).
	function logged(c) { return num(c.price) + (c.jobs || []).reduce(function (s, j) { return s + num(j.price); }, 0); }
	function lifetime(c) { return Math.max(logged(c), num(c.billed)); }
	function paidPct(c) { var p = num(c.price); return p ? Math.max(0, Math.min(100, Math.round((p - num(c.balance)) / p * 100))) : (num(c.balance) ? 0 : 100); }
	function site(c) { return String(c.website || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); }
	function toast(msg, bad) {
		var t = document.createElement('div'); t.className = 'dwdc-toast' + (bad ? ' bad' : ''); t.textContent = msg;
		document.body.appendChild(t); setTimeout(function () { t.classList.add('out'); }, 2200); setTimeout(function () { t.remove(); }, 2700);
	}
	function fail(e) { toast(e.message || 'Something went wrong', true); }

	var ICON = {
		grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
		users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
		brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
		todo: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
		server: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><line x1="6" y1="7" x2="6.01" y2="7"/><line x1="6" y1="17" x2="6.01" y2="17"/>',
		done: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
		archive: '<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5" rx="1"/><line x1="10" y1="12" x2="14" y2="12"/>',
		search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
		plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
		logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
		check: '<polyline points="20 6 9 17 4 12"/>',
		right: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
		left: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
		menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
		x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
		wp: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
	};
	function ic(n, size) { return '<svg class="dwdc-ic" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }

	// Status colors: blue active, violet limbo, green done/paid, teal hosting, orange leads/owed, red overdue.
	var TONE = { active: 'blue', hold: 'amber', limbo: 'red', complete: 'green', leads: 'orange', archive: 'gray', hosting: 'teal' };
	var LABEL = { active: 'Active', hold: 'On hold', limbo: 'In limbo', complete: 'Completed', leads: 'Lead', archive: 'Archived' };
	function avatar() { return ''; } // client avatars removed: names carry the rows
	function avatarOld(c, size, tone) { return '<span class="dwdc-av t-' + (tone || TONE[c.list] || 'blue') + (size ? ' s' + size : '') + '">' + esc(initials(c.name)) + '</span>'; }
	var STATUS = [['active', 'Active'], ['hold', 'On hold'], ['limbo', 'In limbo'], ['complete', 'Completed']];
	function statusSelect(c) {
		return '<select class="dwdc-stage t-' + (TONE[c.list] || 'gray') + '" data-status-of="' + c.id + '" title="Change status">' + STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === c.list ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select>';
	}
	function pill(text, tone) { return '<span class="dwdc-pill t-' + tone + '">' + esc(text) + '</span>'; }

	/* ---------- derived ---------- */
	function by(list) { return S.contacts.filter(function (c) { return c.list === list; }); }
	function hosting() { return S.contacts.filter(function (c) { return num(c.hosting) > 0 && c.list !== 'archive'; }); }
	function working() { return S.contacts.filter(function (c) { return c.list === 'active' || c.list === 'hold' || c.list === 'limbo'; }); }
	function stageOf(c) { return c.list === 'leads' ? (c.stage || 'new') : (c.stage === 'onboarding' && c.list !== 'complete' ? 'onboarding' : 'active'); }
	function leadRows() {
		return S.contacts.filter(function (c) { return c.list === 'leads' || ((c.onboarded || c.stage === 'onboarding') && (c.list === 'active' || c.list === 'hold' || c.list === 'limbo')); })
			.sort(function (a, b) { return (received(a) < received(b)) ? 1 : -1; });
	}
	function received(c) { return c.onboarded || c.last_entry_date || c.created; }
	function openLeads() { return leadRows().filter(function (c) { var s = stageOf(c); return s !== 'lost' && s !== 'active'; }); }
	function owed(list) { return list.reduce(function (s, c) { return s + num(c.balance); }, 0); }
	function openTasks() { return S.tasks.filter(function (t) { return !t.done; }); }
	function match(c) {
		var q = S.q.toLowerCase().trim();
		return !q || [c.name, c.person, c.email, c.phone, c.company, c.website, c.job].join(' ').toLowerCase().indexOf(q) > -1;
	}

	/* ---------- routing ---------- */
	var TITLES = {
		dashboard: ['', 'Good morning,', 'Michael'], leads: ['Pipeline', 'Leads &', 'onboarding'], jobs: ['In progress', 'Active', 'jobs'],
		todos: ['Everything open', 'All', 'to-dos'], hosting: ['Recurring', 'Hosting', 'clients'], completed: ['Delivered', 'Completed', 'jobs'],
		archive: ['Out of the way', 'Archived', 'contacts'], search: ['Search', 'Search', 'results']
	};
	function route() { var h = location.hash.replace(/^#/, '').split('/'); return { view: TITLES[h[0]] || h[0] === 'client' ? h[0] : 'dashboard', id: +h[1] || 0 }; }
	window.addEventListener('hashchange', function () {
		var r = route();
		if (r.view !== 'search' && S.prev !== r.view) { S.q = ''; }
		if (r.view !== 'client' && r.view !== 'search') { S.back = r.view; }
		S.edit = false; S.cardTodo = 0; document.body.classList.remove('dwdc-menu-open');
		if (r.view === 'client' && !S.full[r.id]) { load(r.id); }
		render(true); window.scrollTo(0, 0);
	});
	function go(h) { if (location.hash === '#' + h) { render(true); } else { location.hash = h; } }

	/* ---------- shell ---------- */
	function sidebar(r) {
		var leadsN = openLeads().length, act = by('active').length, todo = openTasks().length;
		var nav = function (h, icon, label, count, badge) {
			var on = r.view === h || (r.view === 'client' && S.back === h);
			return '<a class="dwdc-nav' + (on ? ' on' : '') + '" href="#' + h + '">' + ic(icon) + '<span>' + label + '</span>' + (count ? '<b class="' + (badge || '') + '">' + count + '</b>' : '') + '</a>';
		};
		var all = S.contacts.filter(function (c) { return c.list !== 'archive'; }), ow = owed(all), owN = all.filter(function (c) { return num(c.balance) > 0; }).length;
		return '<aside class="dwdc-side">'
			+ '<a class="dwdc-logo" href="#dashboard"><img src="' + esc(DWDC.logo) + '" alt="Dream Web Digital"></a>'
			+ '<div class="dwdc-navh">Workspace</div><nav>'
			+ nav('dashboard', 'grid', 'Dashboard') + nav('leads', 'users', 'Leads &amp; Onboarding', leadsN, 'orange')
			+ nav('jobs', 'brief', 'Active Jobs', act) + nav('todos', 'todo', 'To-dos', todo)
			+ nav('hosting', 'server', 'Hosting') + nav('completed', 'done', 'Completed') + nav('archive', 'archive', 'Archive')
			+ '</nav><div class="dwdc-sidefoot">'
			+ '<div class="dwdc-owed"><small>Still owed</small><strong>' + money(ow) + '</strong><span>across ' + owN + ' job' + (owN === 1 ? '' : 's') + '</span></div>'
			+ '<a class="dwdc-wp" href="' + esc(DWDC.wp) + '">' + ic('wp', 15) + 'WordPress admin</a>'
			+ '<a class="dwdc-me" href="' + esc(DWDC.logout) + '" title="Sign out"><span class="dwdc-av t-blue s34">MT</span><span><strong>' + esc(DWDC.user || 'Michael Tarr') + '</strong><small>Owner</small></span>' + ic('logout', 17) + '</a>'
			+ '</div></aside>';
	}
	function top(r, t) {
		return '<header class="dwdc-top"><button class="dwdc-burger" data-menu aria-label="Menu">' + ic('menu', 20) + '</button>'
			+ '<div class="dwdc-title"><p class="dwdc-eyebrow">' + esc(t[0]) + '</p><h1><span>' + esc(t[1]) + '</span> <em>' + esc(t[2]) + '</em></h1></div>'
			+ '<div class="dwdc-topr"><label class="dwdc-search">' + ic('search', 16) + '<input type="search" placeholder="Search name, email, company…" value="' + esc(S.q) + '"></label>'
			+ '<button class="dwdc-btn" data-act="lead">' + ic('plus', 14) + 'New lead</button></div></header>';
	}

	function render(anim) {
		var r = route(), t = (TITLES[r.view] || ['', '', '']).slice(), body;
		if (r.view === 'dashboard') {
			var h = new Date().getHours();
			t = [new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,', 'Michael'];
		}
		if (r.view === 'client') {
			var c = contact(r.id), words = String(c ? c.name : 'Client').split(' ');
			t = ['Client', words[0], words.slice(1).join(' ')];
			body = clientView(r.id);
		} else {
			body = ({ dashboard: dashboard, leads: leadsView, jobs: jobsView, todos: todosView, hosting: hostingView, completed: completedView, archive: archiveView, search: searchView }[r.view] || dashboard)();
		}
		app.innerHTML = sidebar(r) + '<div class="dwdc-shade-m" data-menu></div><main class="dwdc-main">' + top(r, t) + '<div class="dwdc-screen' + (anim ? ' in' : '') + '">' + body + '</div></main>' + modal();
		S.prev = r.view;
		if (S.focusSearch) { var q = app.querySelector('.dwdc-search input'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } S.focusSearch = false; }
		if (S.cardTodo) { var ti = app.querySelector('.dwdc-cardtodo input'); if (ti) { ti.focus(); } }
	}

	/* ---------- shared pieces ---------- */
	function tile(tone, label, n, sub, href) {
		return '<a class="dwdc-tile t-' + tone + '"' + (href ? ' href="#' + href + '"' : '') + '><span class="dwdc-tile-h">' + label + '<i></i></span><strong>' + n + '</strong><small>' + sub + '</small></a>';
	}
	function mini(tone, label, n) { return '<div class="dwdc-mini t-' + tone + '"><small>' + label + '</small><strong>' + n + '</strong></div>'; }
	function secHead(title, count, right) { return '<div class="dwdc-sech"><h2>' + title + (count != null ? ' <span class="dwdc-cnt">' + count + '</span>' : '') + '</h2>' + (right || '') + '</div>'; }
	function emptyRow(t) { return '<div class="dwdc-none">' + t + '</div>'; }
	function moreFoot(key, shown, total) {
		return total > shown || S.more[key] ? '<div class="dwdc-tfoot"><span>Showing ' + Math.min(shown, total) + ' of ' + total + '</span>' + (total > shown ? '<button class="dwdc-lnk" data-more="' + key + '">Show all ' + ic('right', 14) + '</button>' : '') + '</div>' : '';
	}
	function due(t) {
		if (!t.due) { return '<span class="dwdc-due mut">No date</span>'; }
		var n = daysTo(t.due);
		if (n < 0 && !t.done) { return '<span class="dwdc-due red">' + (-n) + 'd overdue</span>'; }
		if (n === 0) { return '<span class="dwdc-due blue">Today</span>'; }
		return '<span class="dwdc-due ' + (n > 0 && n <= 7 ? 'navy' : 'mut') + '">' + fmt(t.due) + '</span>';
	}
	function todoRow(t, small) {
		var c = t.contact ? contact(t.contact) : null;
		return '<div class="dwdc-todo' + (t.done ? ' done' : '') + (small ? ' sm' : '') + '" data-toggle="' + t.id + '"><span class="dwdc-chk">' + ic('check', 12) + '</span>'
			+ '<span class="dwdc-tt">' + esc(t.text) + '</span>'
			+ (c && !small ? '<a class="dwdc-chip" href="#client/' + c.id + '">' + esc(c.name) + '</a>' : '')
			+ due(t) + '<button class="dwdc-del" data-del-task="' + t.id + '" title="Delete to-do">' + ic('x', 14) + '</button></div>';
	}

	/* ---------- dashboard ---------- */
	function dashboard() {
		var active = by('active'), hold = by('hold'), limbo = by('limbo'), done = by('complete'), host = hosting();
		var billed = S.contacts.reduce(function (s, c) { return s + lifetime(c); }, 0);
		var annual = host.reduce(function (s, c) { return s + num(c.hosting); }, 0);
		var next = host.filter(function (c) { return c.renewal && c.renewal >= DWDC.today; }).sort(function (a, b) { return a.renewal < b.renewal ? -1 : 1; })[0];
		var jobs = active.filter(match), nLeads = openLeads().length;
		var todayT = openTasks().filter(function (t) { return t.due === DWDC.today; });
		var overdue = openTasks().filter(function (t) { return t.due && t.due < DWDC.today; }).length;
		var entries = S.contacts.filter(function (c) { return c.entry_count && c.list !== 'archive'; }).sort(function (a, b) { return a.last_entry_date < b.last_entry_date ? 1 : -1; }).slice(0, 6);
		return '<div class="dwdc-tiles">'
			+ tile('blue', 'Active jobs', active.length, money(owed(S.contacts.filter(function (c) { return c.list !== 'archive'; }))) + ' still owed overall', 'jobs')
			+ tile('red', 'On hold &amp; limbo', hold.length + limbo.length, hold.length + ' on hold · ' + limbo.length + ' in limbo', 'jobs')
			+ tile('green', 'Completed', done.length, money(billed) + ' billed all-time', 'completed')
			+ tile('teal', 'Hosting clients', host.length, money(annual) + '/yr' + (next ? ' · next ' + fmt(next.renewal) : ''), 'hosting')
			+ '</div>'
			+ '<section>' + secHead('Active jobs', active.length, '<div class="dwdc-sechr">' + (nLeads ? '<a class="dwdc-lnk" href="#leads">' + nLeads + ' new lead' + (nLeads === 1 ? '' : 's') + ' / onboarding ' + ic('right', 14) + '</a>' : '') + '<button class="dwdc-btn sm" data-act="job">' + ic('plus', 14) + 'Add job</button></div>')
			+ (jobs.length ? '<div class="dwdc-cards">' + jobs.map(jobCard).join('') + '</div>' : '<div class="dwdc-card">' + emptyRow(S.q ? 'No active jobs match.' : 'No active jobs right now.') + '</div>') + '</section>'
			+ '<div class="dwdc-two">'
			+ '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Due today</h2><a class="dwdc-lnk" href="#todos">All to-dos ' + ic('right', 14) + '</a></div>'
			+ (todayT.length ? '<div class="dwdc-todos">' + todayT.map(function (t) { return todoRow(t); }).join('') + '</div>'
				: '<div class="dwdc-allclear"><span>' + ic('check', 18) + '</span><div><strong>Nothing due today.</strong><small>' + (overdue ? overdue + ' overdue item' + (overdue === 1 ? '' : 's') + ' still open' : 'Nothing overdue either. Nice.') + '</small></div></div>')
			+ '</section>'
			+ '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Latest form entries</h2><a class="dwdc-lnk" href="#leads">Leads ' + ic('right', 14) + '</a></div>'
			+ (entries.length ? '<div class="dwdc-entries">' + entries.map(function (c) {
				var lead = c.list === 'leads';
				return '<a class="dwdc-entry" href="#client/' + c.id + '">' + avatar(c, 36, lead ? 'orange' : TONE[c.list]) + '<span class="dwdc-who"><strong>' + esc(c.name) + '</strong><small>' + esc(c.last_entry) + '</small></span>'
					+ pill(lead ? 'Leads' : c.list === 'active' ? 'Active jobs' : (LABEL[c.list] || ''), lead ? 'orange' : (TONE[c.list] || 'gray')) + '<time>' + ago(c.last_entry_date) + '</time></a>';
			}).join('') + '</div>' : emptyRow('Website form entries show up here.'))
			+ '</section></div>';
	}
	function jobCard(c) {
		var p = paidPct(c), late = c.deadline && c.deadline < DWDC.today, ow = num(c.balance);
		var todos = S.tasks.filter(function (t) { return t.contact === c.id && !t.done; });
		return '<article class="dwdc-job" data-go="client/' + c.id + '">'
			+ '<header><div><h3>' + esc(c.name) + '</h3><small>' + esc(c.person || 'No contact on file') + '</small></div>' + statusSelect(c) + '</header>'
			+ (c.job ? '<p class="dwdc-proj">' + esc(c.job) + '</p>' : '')
			+ '<div class="dwdc-strip"><span><small>Price</small><b>' + (num(c.price) ? money(c.price) : '—') + '</b></span>'
			+ '<span><small>Owed</small><b class="' + (ow ? 'orange' : 'green') + '">' + (ow ? money(ow) : 'Paid') + '</b></span>'
			+ '<span><small>Due</small><b class="' + (late ? 'red' : '') + '">' + (c.deadline ? fmt(c.deadline) : '—') + '</b></span></div>'
			+ '<div class="dwdc-paid"><div><span>Paid</span><b class="' + (p >= 100 ? 'green' : 'orange') + '">' + p + '%</b></div><i><u class="' + (p >= 100 ? 'full' : '') + '" style="width:' + p + '%"></u></i></div>'
			+ '<p class="dwdc-next"><b>Next</b> ' + esc(c.next || 'No next step set') + '</p>'
			+ (todos.length ? '<div class="dwdc-todos mini">' + todos.slice(0, 4).map(function (t) { return todoRow(t, true); }).join('') + (todos.length > 4 ? '<a class="dwdc-lnk sm" href="#client/' + c.id + '">+' + (todos.length - 4) + ' more</a>' : '') + '</div>' : '')
			+ '<footer>' + (S.cardTodo === c.id
				? '<form class="dwdc-cardtodo" data-contact="' + c.id + '"><input name="text" placeholder="What needs doing? Press Enter" autocomplete="off"></form>'
				: '<button class="dwdc-ghost" data-cardtodo="' + c.id + '">' + ic('plus', 14) + 'Add a to-do</button>') + '</footer></article>';
	}

	/* ---------- leads & onboarding ---------- */
	var STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['onboarding', 'Onboarding'], ['active', 'Won → Active'], ['lost', 'Lost']];
	var STAGE_TONE = { new: 'orange', contacted: 'blue', onboarding: 'violet', active: 'green', lost: 'gray' };
	function leadsView() {
		var rows = leadRows().filter(match), f = S.leadFilter;
		var count = function (k) { return rows.filter(function (c) { return k === 'all' || stageOf(c) === k; }).length; };
		var chip = function (k, l) { return '<button class="dwdc-fchip' + (f === k ? ' on' : '') + '" data-filter="' + k + '">' + l + ' <b>' + count(k) + '</b></button>'; };
		var shown = rows.filter(function (c) { return f === 'all' || stageOf(c) === f; });
		return '<div class="dwdc-chips">' + chip('all', 'All') + chip('new', 'New') + chip('contacted', 'Contacted') + chip('onboarding', 'Onboarding') + chip('lost', 'Lost') + '</div>'
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-leads head"><span>Name</span><span>Email</span><span>Company</span><span>Source</span><span>Stage</span><span class="r">Received</span><span></span></div>'
			+ (shown.length ? shown.map(function (c) {
				var st = stageOf(c), lead = c.list === 'leads';
				return '<div class="dwdc-grid g-leads row" data-go="client/' + c.id + '"><span class="dwdc-nm">' + avatar(c, 34, lead ? 'orange' : 'blue') + '<b>' + esc(c.name) + '</b></span>'
					+ '<span class="sec">' + esc(c.email || '—') + '</span><span class="ell">' + esc(c.company || (c.person && c.person !== c.name ? c.person : '') || '—') + '</span><span class="ell">' + esc(sourceOf(c)) + '</span>'
					+ '<span><select class="dwdc-stage t-' + STAGE_TONE[st] + '" data-stage-of="' + c.id + '">' + STAGES.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === st ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select></span>'
					+ '<span class="r mut">' + ago(received(c)) + '</span>'
					+ '<span class="r">' + (lead ? '<button class="dwdc-del show" data-quickdel="' + c.id + '" title="Delete lead">' + ic('x', 15) + '</button>' : '') + '</span></div>';
			}).join('') : emptyRow('No leads match.')) + '</div>';
	}
	function sourceOf(c) {
		if (c.last_entry) { return c.last_entry; }
		return String(c.source || 'Manual').replace(/^Website form: /, '');
	}

	/* ---------- active jobs ---------- */
	function jobsView() {
		var all = working(), value = all.reduce(function (s, c) { return s + num(c.price); }, 0);
		var sec = function (list, title, empty, btn) {
			var rows = by(list).filter(match);
			return '<section>' + secHead(title, rows.length, btn || '')
				+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-jobs head"><span>Client</span><span>Price</span><span>Owed</span><span>Due</span><span>Status</span><span>Next step</span></div>'
				+ (rows.length ? rows.map(function (c) {
					var ow = num(c.balance), late = c.deadline && c.deadline < DWDC.today;
					return '<div class="dwdc-grid g-jobs row" data-go="client/' + c.id + '"><span class="dwdc-nm"><span><b>' + esc(c.name) + '</b><small>' + esc([c.person, c.job].filter(Boolean).join(' · ') || 'No contact on file') + '</small></span></span>'
						+ '<span class="b">' + (num(c.price) ? money(c.price) : '—') + '</span><span class="b ' + (ow ? 'orange' : 'green') + '">' + (ow ? money(ow) : 'Paid') + '</span>'
						+ '<span class="' + (late ? 'red b' : '') + '">' + (c.deadline ? fmt(c.deadline) : '—') + '</span><span>' + statusSelect(c) + '</span><span class="sec ell">' + esc(c.next || '—') + '</span></div>';
				}).join('') : emptyRow(S.q ? 'No matches.' : empty)) + '</div></section>';
		};
		return '<div class="dwdc-minis">' + mini('blue', 'Active', by('active').length) + mini('navy', 'Contract value', money(value)) + mini('orange', 'Owed on these', money(owed(all))) + mini('amber', 'On hold', by('hold').length) + mini('red', 'In limbo', by('limbo').length) + '</div>'
			+ sec('active', 'Active jobs', 'Nothing in progress right now.', '<button class="dwdc-btn sm" data-act="job">' + ic('plus', 14) + 'Add job</button>')
			+ sec('hold', 'On hold', 'No jobs on hold. Paused jobs go here.')
			+ sec('limbo', 'In limbo', 'No jobs in limbo. Clients you haven’t heard back from go here.');
	}

	/* ---------- to-dos ---------- */
	function todosView() {
		var open = openTasks(), done = S.tasks.filter(function (t) { return t.done; });
		var groups = [
			['Overdue', 'red', open.filter(function (t) { return t.due && t.due < DWDC.today; }).sort(byDue)],
			['Today', 'blue', open.filter(function (t) { return t.due === DWDC.today; })],
			['Upcoming', 'navy', open.filter(function (t) { return t.due > DWDC.today; }).sort(byDue)],
			['No date', 'mut', open.filter(function (t) { return !t.due; })],
			['Done', 'green', done]
		];
		var clients = S.contacts.filter(function (c) { return c.list !== 'archive'; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
		return '<div class="dwdc-narrow"><form class="dwdc-addbar">' + ic('plus', 18) + '<input name="text" placeholder="Add a to-do and press Enter…" autocomplete="off" required>'
			+ '<select name="contact" title="Client"><option value="0">No client</option>' + clients.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select>'
			+ '<input type="date" name="due" title="Due date"><button class="dwdc-btn">Add</button></form>'
			+ groups.filter(function (g) { return g[2].length; }).map(function (g) {
				return '<section class="dwdc-group"><h3><i class="t-' + g[1] + '"></i>' + g[0] + ' <b>' + g[2].length + '</b></h3><div class="dwdc-card dwdc-todos p6">' + g[2].map(function (t) { return todoRow(t); }).join('') + '</div></section>';
			}).join('')
			+ (S.tasks.length ? '' : '<div class="dwdc-card">' + emptyRow('No to-dos yet. Add one above, or from any client’s page.') + '</div>') + '</div>';
	}
	function byDue(a, b) { return a.due < b.due ? -1 : 1; }

	/* ---------- hosting ---------- */
	function subActive(c) { return !!(c.sub && c.sub.status === 'active'); }
	function hostingView() {
		var rows = hosting().sort(function (a, b) { return (a.renewal || '9') < (b.renewal || '9') ? -1 : 1; });
		var annual = rows.reduce(function (s, c) { return s + num(c.hosting); }, 0);
		var next = rows.filter(function (c) { return c.renewal && c.renewal >= DWDC.today; })[0];
		var soon = rows.filter(function (c) { return c.renewal && daysTo(c.renewal) >= 0 && daysTo(c.renewal) <= 30; }).length;
		var auto = rows.filter(subActive).length;
		var list = rows.filter(match), cap = S.more.hosting || S.q ? list.length : 15;
		return '<div class="dwdc-minis">' + mini('teal', 'Hosting clients', rows.length) + mini('navy', 'Annual recurring', money(annual)) + mini('green', 'On auto-renew', auto + ' of ' + rows.length) + mini('orange', 'Renewing in 30 days', soon) + '</div>'
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-host head"><span>Website</span><span>Client</span><span>Subscription</span><span>Per year</span><span>Renews</span><span>Status</span></div>'
			+ (list.length ? list.slice(0, cap).map(function (c) {
				var on = subActive(c), n = c.renewal ? daysTo(c.renewal) : null;
				var st = on ? ['Auto-renew', 'green'] : n === null ? ['No date', 'gray'] : n < 0 ? ['Past due', 'red'] : n <= 30 ? ['Renewing soon', 'orange'] : ['Not on auto-pay', 'amber'];
				var when = on && c.sub.next ? c.sub.next : c.renewal;
				return '<div class="dwdc-grid g-host row" data-go="client/' + c.id + '"><span class="dwdc-nm"><span><b>' + esc(c.name) + '</b><small>' + esc(site(c) || '') + '</small></span></span>'
					+ '<span class="dwdc-nm"><span><b class="nm2">' + esc(c.person || '—') + '</b><small>' + esc(c.email || '') + '</small></span></span>'
					+ '<span>' + (on ? '<b class="green">Active</b>' + (c.sub.method ? '<small class="dwdc-sm">&nbsp;· ' + esc(c.sub.method) + '</small>' : '') : (c.sub ? '<span class="mut">' + esc(c.sub.status) + '</span>' : '<span class="mut">None</span>')) + '</span>'
					+ '<span class="b">' + money(on && num(c.sub.amount) ? c.sub.amount : c.hosting) + '</span>'
					+ '<span class="b ' + (on ? '' : n === null ? 'mut' : n < 0 ? 'red' : n <= 30 ? 'orange' : '') + '">' + (when ? fmt(when, true) : '—') + '</span><span>' + pill(st[0], st[1]) + '</span></div>';
			}).join('') : emptyRow('No hosting clients match.')) + moreFoot('hosting', cap, list.length) + '</div>';
	}

	/* ---------- completed ---------- */
	function completedView() {
		var rows = by('complete').sort(function (a, b) { return (b.completed || '') > (a.completed || '') ? 1 : (b.completed || '') < (a.completed || '') ? -1 : (a.updated < b.updated ? 1 : -1); });
		var billed = rows.reduce(function (s, c) { return s + lifetime(c); }, 0), priced = rows.filter(function (c) { return lifetime(c) > 0; }).length;
		var list = rows.filter(match), cap = S.more.completed || S.q ? list.length : 25;
		return '<div class="dwdc-minis">' + mini('green', 'Completed jobs', rows.length) + mini('navy', 'Billed all-time', money(billed)) + mini('navy', 'Average job', priced ? money(billed / priced) : '—') + mini('teal', 'Now hosting', hosting().length) + '</div>'
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-done head"><span>Client</span><span>Project</span><span>Billed</span><span>Completed</span><span>Hosting</span></div>'
			+ (list.length ? list.slice(0, cap).map(function (c) {
				var proj = c.job || ((c.jobs || []).length ? c.jobs[c.jobs.length - 1].title : '') || (num(c.billed) || c.source === 'Upwork' ? 'Upwork client' : '');
				return '<div class="dwdc-grid g-done row" data-go="client/' + c.id + '"><span class="dwdc-nm">' + avatar(c, 34, 'green') + '<span><b>' + esc(c.name) + '</b><small>' + esc(c.person || c.email || site(c) || 'No contact on file') + '</small></span></span>'
					+ '<span class="sec ell">' + esc(proj || '—') + ((c.jobs || []).length > 1 ? ' <small class="mut">+' + (c.jobs.length - 1) + ' more</small>' : '') + '</span>'
					+ '<span class="b">' + (lifetime(c) ? money(lifetime(c)) : '—') + '</span><span class="mut">' + (c.completed ? fmt(c.completed, true) : '—') + '</span>'
					+ '<span>' + (num(c.hosting) > 0 ? pill('Hosting', 'teal') : pill('No', 'gray')) + '</span></div>';
			}).join('') : emptyRow('No completed jobs match.')) + moreFoot('completed', cap, list.length) + '</div>';
	}

	/* ---------- archive & search ---------- */
	function archiveView() {
		var list = by('archive').filter(match);
		return '<p class="dwdc-hint">Old leads and contacts you don’t need on any list. Click × to delete one for good.</p>'
			+ simpleTable(list, true, 'Nothing in the archive.');
	}
	function searchView() {
		var list = S.contacts.filter(match);
		return simpleTable(S.q ? list : [], false, S.q ? 'No one matches “' + esc(S.q) + '”.' : 'Type a name, email or company.');
	}
	function simpleTable(list, del, empty) {
		return '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-simple head"><span>Name</span><span>Email</span><span>List</span><span class="r">Last activity</span><span></span></div>'
			+ (list.length ? list.map(function (c) {
				return '<div class="dwdc-grid g-simple row" data-go="client/' + c.id + '"><span class="dwdc-nm">' + avatar(c, 34) + '<span><b>' + esc(c.name) + '</b><small>' + esc(c.person || site(c) || '') + '</small></span></span>'
					+ '<span class="sec ell">' + esc(c.email || '—') + '</span><span>' + pill(LABEL[c.list] || c.list, TONE[c.list] || 'gray') + '</span><span class="r mut">' + ago(c.updated) + '</span>'
					+ '<span class="r">' + (del ? '<button class="dwdc-del show" data-quickdel="' + c.id + '" title="Delete">' + ic('x', 15) + '</button>' : '') + '</span></div>';
			}).join('') : emptyRow(empty)) + '</div>';
	}

	/* ---------- client page ---------- */
	function load(id) {
		api('/contact/' + id).then(function (c) { S.full[id] = c; upsert(c); render(); }).catch(fail);
	}
	function upsert(c) {
		var i = S.contacts.findIndex(function (x) { return x.id === c.id; });
		if (i > -1) { S.contacts[i] = c; } else { S.contacts.unshift(c); }
		if (S.full[c.id] || c.notes) { S.full[c.id] = c; }
	}
	function save(id, data, msg) {
		return api('/contact/' + id, 'POST', data).then(function (c) { upsert(c); S.full[id] = c; render(); if (msg) { toast(msg); } return c; }).catch(fail);
	}
	function clientView(id) {
		var c = S.full[id] || contact(id);
		if (!c) { return '<div class="dwdc-card">' + emptyRow('Loading…') + '</div>'; }
		var full = !!S.full[id], st = c.list, ow = num(c.balance), price = num(c.price), late = c.deadline && c.deadline < DWDC.today;
		var backName = { dashboard: 'dashboard', leads: 'leads & onboarding', jobs: 'jobs', todos: 'to-dos', hosting: 'hosting', completed: 'completed', archive: 'archive' }[S.back] || 'dashboard';
		var tasks = S.tasks.filter(function (t) { return t.contact === c.id; }).sort(function (a, b) { return a.done - b.done; }), openN = tasks.filter(function (t) { return !t.done; }).length;
		var btn = function (cls, attr, label) { return '<button class="dwdc-btn2 ' + cls + '" ' + attr + '>' + label + '</button>'; };
		var acts = '';
		if (st === 'active' || st === 'hold' || st === 'limbo') {
			acts = (ow ? btn('', 'data-paid', 'Mark paid') : '') + (st !== 'active' ? btn('', 'data-set="active"', 'Back to active') : '')
				+ (st !== 'hold' ? btn('amber', 'data-set="hold"', 'Put on hold') : '') + (st !== 'limbo' ? btn('red', 'data-set="limbo"', 'Move to limbo') : '') + btn('solid green', 'data-complete', 'Mark complete');
		} else if (st === 'leads') {
			acts = btn('', 'data-set="archive"', 'Archive') + btn('solid blue', 'data-act="job" data-contact="' + c.id + '"', 'Start a job');
		} else if (st === 'archive') {
			acts = btn('', 'data-set="leads"', 'Restore to leads') + btn('red', 'data-trash="' + c.id + '"', 'Delete');
		} else {
			acts = (ow ? btn('', 'data-paid', 'Mark paid') : '') + btn('solid blue', 'data-act="job" data-contact="' + c.id + '"', '+ New job');
		}
		var mail = c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '';
		var line = [esc(c.person || 'No contact on file'), mail, c.phone ? '<a href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>' : '', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : ''].filter(Boolean).join('<i>·</i>');
		var tone = st === 'leads' ? 'orange' : TONE[st];
		return '<a class="dwdc-back" href="#' + S.back + '">' + ic('left', 14) + 'Back to ' + backName + '</a>'
			+ '<div class="dwdc-card dwdc-chead">' + avatar(c, 64, tone) + '<div class="dwdc-chead-t"><h2>' + esc(c.name) + ' ' + pill(st === 'leads' ? (STAGES.filter(function (s) { return s[0] === stageOf(c); })[0] || ['', 'Lead'])[1] : LABEL[st], st === 'leads' ? STAGE_TONE[stageOf(c)] : tone) + (num(c.hosting) ? ' ' + pill('Hosting', 'teal') : '') + '</h2><p>' + line + '</p></div>'
			+ '<div class="dwdc-chead-a">' + btn('', 'data-edit', S.edit ? 'Close edit' : 'Edit') + acts + '</div></div>'
			+ '<div class="dwdc-minis">' + mini('navy', 'Price', price ? money(price) : '—') + mini('green', 'Paid', price ? money(Math.max(0, price - ow)) : '—')
			+ '<div class="dwdc-mini"><small>Owed</small><strong class="' + (ow ? 'orange' : 'green') + '">' + (ow ? money(ow) : 'Paid') + '</strong></div>'
			+ (st === 'complete' ? mini('navy', 'Total spent', money(lifetime(c))) : '<div class="dwdc-mini"><small>Due</small><strong class="' + (late ? 'red' : '') + '">' + (c.deadline ? fmt(c.deadline) : '—') + '</strong></div>') + '</div>'
			+ '<div class="dwdc-two">'
			+ '<div class="dwdc-col">'
			+ (num(c.hosting) ? hostCard(c) : '')
			+ onboardCard(c, full)
			+ (S.edit ? editCard(c) : detailsCard(c))
			+ jobsCard(c)
			+ '</div><div class="dwdc-col">'
			+ '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>To-dos</h2><span class="dwdc-cnt">' + openN + '</span></div>'
			+ (tasks.length ? '<div class="dwdc-todos">' + tasks.map(function (t) { return todoRow(t, true); }).join('') + '</div>' : '')
			+ '<form class="dwdc-inlineadd" data-contact="' + c.id + '">' + ic('plus', 16) + '<input name="text" placeholder="Add a to-do for ' + esc(c.name) + '…" autocomplete="off"><input type="date" name="due" title="Due date"></form></section>'
			+ activityCard(c, full)
			+ '</div></div>';
	}
	// Onboarding answers as plain text, ready to paste into Claude.
	function onboardEntries(c) {
		var files = c.files || [], ob = files.filter(function (e) { return /onboard/i.test(e.form || ''); });
		return ob.length ? ob : files;
	}
	function onboardText(c) {
		var list = onboardEntries(c);
		if (!list.length) { return ''; }
		var lines = ['Client: ' + c.name];
		[c.person && 'Contact: ' + c.person, c.email && 'Email: ' + c.email, c.phone && 'Phone: ' + c.phone, site(c) && 'Website: ' + site(c)].forEach(function (x) { if (x) { lines.push(x); } });
		list.forEach(function (e) {
			lines.push('', '=== ' + (e.form || 'Form') + ' (' + fmt(e.date, true) + ') ===', '');
			(e.fields || []).forEach(function (x) { lines.push(x.label + ':', String(x.value).trim(), ''); });
		});
		return lines.join('\n').trim();
	}
	function onboardCard(c, full) {
		var list = full ? onboardEntries(c) : [], ob = list.some(function (e) { return /onboard/i.test(e.form || ''); });
		var n = list.reduce(function (s, e) { return s + (e.fields || []).length; }, 0);
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>' + (ob || !list.length ? 'Onboarding' : 'Form answers') + '</h2>' + (list.length ? '<span class="dwdc-cnt">' + n + ' answers</span>' : '') + '</div>'
			+ (!full ? '<p class="dwdc-mutp">Loading…</p>' : list.length
				? '<p class="dwdc-mutp">' + esc(list[0].form || 'Form') + ' · ' + fmt(list[0].date, true) + (list.length > 1 ? ' (+' + (list.length - 1) + ' more)' : '') + '</p><button class="dwdc-btn dwdc-copyob" data-copyob>' + ic('todo', 15) + 'Copy onboarding text</button>'
				: '<p class="dwdc-mutp">No onboarding form from this client yet.</p>') + '</section>';
	}
	function detailsCard(c) {
		var row = function (k, v) { return '<dt>' + k + '</dt><dd>' + (v || '<span class="mut">—</span>') + '</dd>'; };
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Details</h2><button class="dwdc-lnk" data-edit>Edit</button></div><dl class="dwdc-dl">'
			+ row('Contact', esc(c.person)) + row('Email', c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '') + row('Phone', esc(c.phone))
			+ row('Company', esc(c.company)) + row('Website', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : '')
			+ row('Project', esc(c.job)) + row('Source', esc(sourceOf(c))) + row('Started', fmt(c.created, true)) + '</dl></section>';
	}
	function editCard(c) {
		var f = function (k, label, type, ph) { return '<label><span>' + label + '</span><input name="' + k + '" type="' + (type || 'text') + '" value="' + esc(c[k]) + '" placeholder="' + esc(ph || '') + '"></label>'; };
		return '<form class="dwdc-card pad dwdc-editf"><div class="dwdc-cardh"><h2>Edit details</h2></div><div class="dwdc-fgrid">'
			+ f('name', 'Client / business') + f('person', 'Contact person') + f('email', 'Email', 'email') + f('phone', 'Phone') + f('company', 'Company') + f('website', 'Website')
			+ '<label class="wide"><span>Project (current job)</span><input name="job" value="' + esc(c.job) + '" placeholder="e.g. Booking site redesign"></label>'
			+ '<label class="wide"><span>Next step (shows on the job card)</span><input name="next" value="' + esc(c.next) + '" placeholder="e.g. Send wireframes Friday"></label>'
			+ f('price', 'Price ($)') + f('balance', 'Still owed ($)') + f('deadline', 'Due date', 'date') + f('source', 'Source', 'text', 'e.g. Referral, Upwork')
			+ f('hosting', 'Hosting ($/yr)') + f('renewal', 'Hosting renews', 'date') + f('billed', 'Billed on Upwork, lifetime ($)')
			+ '</div><div class="dwdc-farow"><button type="button" class="dwdc-lnk red" data-trash="' + c.id + '">Delete client</button><span><button type="button" class="dwdc-btn2" data-edit>Cancel</button><button class="dwdc-btn">Save</button></span></div></form>';
	}
	function jobsCard(c) {
		var all = (num(c.price) || c.job ? [{ title: c.job || 'Current job', price: c.price, date: c.list === 'active' || c.list === 'hold' || c.list === 'limbo' ? 'In progress' : (c.completed ? fmt(c.completed, true) : ''), cur: true }] : [])
			.concat((c.jobs || []).map(function (j, i) { return { title: j.title, price: j.price, date: j.date, i: i }; }).reverse());
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Jobs &amp; spend</h2><span class="dwdc-total">' + money(lifetime(c)) + ' total</span></div>'
			+ (num(c.billed) ? '<div class="dwdc-upw"><span>Billed on Upwork (lifetime)</span><b>' + money(c.billed) + '</b></div>' : '')
			+ (all.length ? '<div class="dwdc-jobs">' + all.map(function (j) {
				return '<div class="dwdc-jobrow"><span><b>' + esc(j.title) + '</b>' + (j.date ? '<small>' + esc(j.date) + '</small>' : '') + '</span><strong>' + (num(j.price) ? money(j.price) : '—') + '</strong>'
					+ (j.cur ? '<i></i>' : '<button class="dwdc-del" data-del-job="' + j.i + '" title="Remove">' + ic('x', 14) + '</button>') + '</div>';
			}).join('') + '</div>' : '<p class="dwdc-mutp">No jobs logged yet.</p>')
			+ '<form class="dwdc-logjob"><input name="title" placeholder="Log an older job" required><input name="price" placeholder="$" inputmode="decimal"><input name="date" placeholder="When"><button class="dwdc-btn2">Log</button></form></section>';
	}
	function hostCard(c) {
		var on = subActive(c), n = c.renewal ? daysTo(c.renewal) : null;
		var box = on
			? '<div class="dwdc-subbox ok"><span>' + ic('check', 18) + '</span><div><strong>Annual subscription active</strong><small>' + money(num(c.sub.amount) || c.hosting) + '/yr' + (c.sub.method ? ' · ' + esc(c.sub.method) : '') + (c.sub.next ? ' · next charge ' + fmt(c.sub.next, true) : '') + '</small></div></div>'
			: '<div class="dwdc-subbox no"><span>!</span><div><strong>No active subscription</strong><small>' + (c.sub ? 'Their subscription is ' + esc(c.sub.status) + '. ' : '') + (c.renewal ? (n < 0 ? 'Renewal was due ' : 'Renews ') + fmt(c.renewal, true) + '. ' : '') + 'Send a link to pay ' + money(c.hosting) + ' and turn on yearly auto-renew.</small></div></div>'
				+ '<form class="dwdc-payf">' + (c.email ? '' : '<input name="email" type="email" placeholder="Client’s email (needed to send the link)" required>')
				+ '<button class="dwdc-btn">' + ic('right', 14) + 'Email payment link</button><button type="button" class="dwdc-btn2" data-copy>Copy link</button></form>';
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Hosting</h2>' + (on ? pill('Auto-renew', 'green') : pill('Not on auto-pay', 'amber')) + '</div>' + box
			+ '<dl class="dwdc-dl"><dt>Plan</dt><dd>' + money(c.hosting) + ' / year</dd><dt>Renews</dt><dd class="' + (!on && n !== null && n < 0 ? 'red' : !on && n !== null && n <= 30 ? 'orange' : '') + '">' + ((on && c.sub.next) || c.renewal ? fmt((on && c.sub.next) || c.renewal, true) : '—') + '</dd>'
			+ (c.email ? '<dt>Payments</dt><dd><a href="' + esc(DWDC.orders + encodeURIComponent(c.email)) + '" target="_blank">View orders in WooCommerce</a></dd>' : '') + '</dl></section>';
	}
	function activityCard(c, full) {
		var items = [];
		if (full) {
			(c.notes || []).forEach(function (n) { items.push({ date: n.date, tone: 'blue', title: n.text, note: true }); });
			(c.files || []).forEach(function (e, i) { items.push({ date: e.date, tone: 'orange', title: (e.form || 'Form') + ' received', entry: e, open: false }); });
		}
		if (c.completed) { items.push({ date: c.completed, tone: 'green', title: 'Marked complete' }); }
		items.push({ date: c.created, tone: 'gray', title: 'Added to Client Desk' + (c.source && !c.entry_count ? ' (' + c.source + ')' : '') });
		items.sort(function (a, b) { return (d(a.date) || 0) < (d(b.date) || 0) ? 1 : -1; });
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Activity</h2></div>'
			+ '<form class="dwdc-notef"><textarea name="text" rows="2" placeholder="Add a note: call recap, decisions…" required></textarea><button class="dwdc-btn sm">Add note</button></form>'
			+ (full ? '' : '<p class="dwdc-mutp">Loading…</p>')
			+ '<ol class="dwdc-tl">' + items.map(function (it) {
				return '<li class="t-' + it.tone + '"><i></i><div>' + (it.entry
					? '<details' + (it.open ? ' open' : '') + '><summary>' + esc(it.title) + ' <span class="dwdc-view">View answers</span></summary><dl class="dwdc-qa">' + (it.entry.fields || []).map(function (x) { return '<dt>' + esc(x.label) + '</dt><dd>' + esc(x.value).replace(/\n/g, '<br>') + '</dd>'; }).join('') + '</dl></details>'
					: '<p class="' + (it.note ? 'note' : '') + '">' + esc(it.title).replace(/\n/g, '<br>') + '</p>') + '<time>' + fmt(it.date, true) + (it.note ? ' · note' : '') + '</time></div></li>';
			}).join('') + '</ol></section>';
	}

	/* ---------- modals: new lead, add job ---------- */
	function modal() {
		var m = S.modal;
		if (!m) { return ''; }
		var v = m.vals || {};
		var inp = function (k, label, ph, type, wide) { return '<label' + (wide ? ' class="wide"' : '') + '><span>' + label + '</span><input name="' + k + '" type="' + (type || 'text') + '" value="' + esc(v[k] || '') + '" placeholder="' + esc(ph || '') + '"></label>'; };
		var head = function (eb, a, b) { return '<button type="button" class="dwdc-mx" data-close-modal>' + ic('x', 20) + '</button><p class="dwdc-eyebrow">' + eb + '</p><h2><span>' + a + '</span> <em>' + b + '</em></h2>'; };
		var body;
		if (m.type === 'lead') {
			body = '<form class="dwdc-modal dwdc-leadform">' + head('Pipeline', 'New', 'lead') + '<div class="dwdc-fgrid">'
				+ inp('name', 'Name or business', 'e.g. Lakeside Dental', '', true) + inp('person', 'Contact person') + inp('email', 'Email', '', 'email') + inp('phone', 'Phone') + inp('company', 'Company')
				+ inp('source', 'Source', 'e.g. Referral, phone call, Upwork') + inp('website', 'Website')
				+ '<label class="wide"><span>Note</span><textarea name="note" rows="2" placeholder="What are they looking for?">' + esc(v.note || '') + '</textarea></label>'
				+ '</div><div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Add lead</button></div></form>';
		} else {
			var picked = m.contact ? contact(m.contact) : null, who;
			if (picked) {
				who = '<div class="dwdc-picked">' + avatar(picked, 40) + '<span><b>' + esc(picked.name) + '</b><small>' + esc([picked.person, picked.email].filter(Boolean).join(' · ')) + (lifetime(picked) ? ' · ' + money(lifetime(picked)) + ' so far' : '') + '</small></span><button type="button" class="dwdc-lnk" data-unpick>Change</button></div>';
			} else if (m.newc) {
				who = '<div class="dwdc-fgrid">' + inp('name', 'Client / business', 'e.g. Bayfield Inn') + inp('person', 'Contact person') + inp('email', 'Email', '', 'email') + inp('phone', 'Phone') + '</div>'
					+ '<button type="button" class="dwdc-lnk" data-oldc>' + ic('left', 14) + 'Pick an existing client instead</button>';
			} else {
				who = '<label class="dwdc-search wide">' + ic('search', 16) + '<input class="dwdc-pick" placeholder="Search your clients and leads…" autocomplete="off" value="' + esc(m.q || '') + '"></label><div class="dwdc-picks">' + pickList(m.q || '') + '</div>'
					+ '<button type="button" class="dwdc-lnk" data-newc>' + ic('plus', 14) + 'New client (not in Client Desk yet)</button>';
			}
			body = '<form class="dwdc-modal dwdc-jobform">' + head('Active jobs', 'Add a', 'job')
				+ '<h3 class="dwdc-mh">Who hired you</h3>' + who
				+ '<h3 class="dwdc-mh">The job</h3><div class="dwdc-fgrid">' + inp('title', 'What they hired you for', 'e.g. Website redesign, 3 new pages, logo', '', true)
				+ inp('price', 'Price ($)', '3000') + inp('balance', 'Still owed ($)', 'e.g. 1500 after deposit') + inp('deadline', 'Due date', '', 'date') + inp('next', 'Next step', 'e.g. Send wireframes') + '</div>'
				+ (picked && (num(picked.price) || picked.job) ? '<p class="dwdc-mutp">Their last job (' + esc(picked.job || 'Earlier job') + (num(picked.price) ? ', ' + money(picked.price) : '') + ') moves into their job history.</p>' : '')
				+ '<div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Add to active jobs</button></div></form>';
		}
		return '<div class="dwdc-overlay" data-close-modal></div>' + body;
	}
	function pickList(q) {
		q = q.toLowerCase().trim();
		var r = S.contacts.filter(function (c) { return c.list !== 'archive' && (!q || [c.name, c.person, c.email, c.company, c.website].join(' ').toLowerCase().indexOf(q) > -1); })
			.sort(function (a, b) { return a.name.localeCompare(b.name); }).slice(0, q ? 12 : 6);
		return r.length ? r.map(function (c) {
			return '<div class="dwdc-pickrow" data-pick="' + c.id + '">' + avatar(c, 34) + '<span><b>' + esc(c.name) + '</b><small>' + esc([c.person, c.email || site(c)].filter(Boolean).join(' · ')) + '</small></span>' + pill(LABEL[c.list] || '', TONE[c.list] || 'gray') + '</div>';
		}).join('') : '<div class="dwdc-none">No match. Add them as a new client below.</div>';
	}
	function keepVals() {
		var f = app.querySelector('.dwdc-modal'); if (!f || !S.modal) { return; }
		S.modal.vals = S.modal.vals || {};
		new FormData(f).forEach(function (val, k) { S.modal.vals[k] = val; });
	}
	function focusIn(sel) { setTimeout(function () { var x = app.querySelector('.dwdc-modal ' + sel); if (x) { x.focus(); } }, 0); }

	/* ---------- events ---------- */
	app.addEventListener('click', function (e) {
		var t = e.target, el;
		if (t.closest('[data-menu]')) { document.body.classList.toggle('dwdc-menu-open'); return; }
		if (t.closest('[data-close-modal]')) { S.modal = null; render(); return; }
		if ((el = t.closest('[data-pick]'))) { keepVals(); S.modal.contact = +el.getAttribute('data-pick'); render(); focusIn('[name=title]'); return; }
		if (t.closest('[data-unpick]')) { keepVals(); S.modal.contact = 0; render(); focusIn('.dwdc-pick'); return; }
		if (t.closest('[data-newc]')) { keepVals(); S.modal.newc = true; S.modal.vals.name = S.modal.vals.name || S.modal.q || ''; render(); focusIn('[name=name]'); return; }
		if (t.closest('[data-oldc]')) { keepVals(); S.modal.newc = false; render(); focusIn('.dwdc-pick'); return; }
		if ((el = t.closest('[data-act]'))) {
			var a = el.getAttribute('data-act');
			S.modal = a === 'lead' ? { type: 'lead', vals: {} } : { type: 'job', contact: +el.getAttribute('data-contact') || 0, q: '', vals: {} };
			render(); focusIn(a === 'lead' ? '[name=name]' : (S.modal.contact ? '[name=title]' : '.dwdc-pick')); return;
		}
		if (t.closest('select, input, textarea, summary, label')) { return; }
		if ((el = t.closest('[data-del-task]'))) {
			e.stopPropagation();
			var id = +el.getAttribute('data-del-task');
			api('/task/' + id, 'DELETE').then(function () { S.tasks = S.tasks.filter(function (x) { return x.id !== id; }); render(); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-quickdel]'))) {
			e.stopPropagation();
			var qid = +el.getAttribute('data-quickdel'), row = el.closest('.row'); if (row) { row.style.opacity = '.3'; }
			api('/contact/' + qid, 'DELETE').then(function () { drop(qid); render(); toast('Deleted'); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-trash]'))) {
			if (!confirm('Delete this client for good? Their notes, form entries and to-dos go with them.')) { return; }
			var cid = +el.getAttribute('data-trash');
			api('/contact/' + cid, 'DELETE').then(function () { drop(cid); toast('Deleted'); go(S.back); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-toggle]')) && !t.closest('a')) {
			var tid = +el.getAttribute('data-toggle'), task = S.tasks.find(function (x) { return x.id === tid; });
			if (!task) { return; }
			task.done = !task.done; el.classList.toggle('done', task.done);
			api('/task/' + tid, 'POST', { done: task.done }).then(function () { setTimeout(render, 220); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-cardtodo]'))) { e.stopPropagation(); S.cardTodo = +el.getAttribute('data-cardtodo'); render(); return; }
		if (t.closest('.dwdc-cardtodo')) { return; }
		if ((el = t.closest('[data-filter]'))) { S.leadFilter = el.getAttribute('data-filter'); render(); return; }
		if ((el = t.closest('[data-more]'))) { S.more[el.getAttribute('data-more')] = true; render(); return; }
		if (t.closest('[data-edit]')) { S.edit = !S.edit; render(); return; }
		var r = route();
		if (t.closest('[data-paid]')) { save(r.id, { balance: '0' }, 'Marked paid'); return; }
		if ((el = t.closest('[data-set]'))) {
			var to = el.getAttribute('data-set');
			save(r.id, { list: to }, { limbo: 'Moved to limbo', hold: 'Put on hold', active: 'Back in active jobs', archive: 'Archived', leads: 'Restored to leads' }[to]);
			return;
		}
		if (t.closest('[data-complete]')) {
			save(r.id, { list: 'complete', balance: '0', completed: DWDC.today }, 'Marked complete').then(function () { S.back = 'completed'; go('completed'); });
			return;
		}
		if ((el = t.closest('[data-del-job]'))) {
			var c = S.full[r.id], jobs = (c.jobs || []).slice(); jobs.splice(+el.getAttribute('data-del-job'), 1);
			save(r.id, { jobs: jobs }); return;
		}
		if (t.closest('[data-copyob]')) {
			var txt = onboardText(S.full[r.id] || {});
			(navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Onboarding answers copied'); }, function () {
				var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
				try { document.execCommand('copy'); toast('Onboarding answers copied'); } catch (er) { prompt('Copy:', txt); } ta.remove();
			});
			return;
		}
		if (t.closest('[data-copy]')) {
			var link = (S.full[r.id] && S.full[r.id].paylink) || DWDC.pay;
			(navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { toast('Payment link copied'); }, function () { prompt('Copy this payment link:', link); });
			return;
		}
		if ((el = t.closest('[data-go]')) && !t.closest('a, button')) { go(el.getAttribute('data-go')); }
	});
	function drop(id) { S.contacts = S.contacts.filter(function (x) { return x.id !== id; }); S.tasks = S.tasks.filter(function (x) { return x.contact !== id; }); delete S.full[id]; }

	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Escape') { return; }
		if (S.modal) { S.modal = null; render(); } else if (S.cardTodo) { S.cardTodo = 0; render(); } else if (S.edit) { S.edit = false; render(); }
	});

	app.addEventListener('input', function (e) {
		var t = e.target;
		if (t.closest('.dwdc-top .dwdc-search')) {
			S.q = t.value; S.focusSearch = true;
			var v = route().view;
			if (v === 'client' || v === 'todos') { if (S.q) { location.hash = 'search'; return; } }
			render();
		} else if (t.classList.contains('dwdc-pick')) {
			S.modal.q = t.value; app.querySelector('.dwdc-picks').innerHTML = pickList(S.modal.q);
		}
	});

	app.addEventListener('change', function (e) {
		var t = e.target;
		if (t.hasAttribute('data-status-of')) {
			var sid = +t.getAttribute('data-status-of'), to = t.value, sd = { list: to };
			if (to === 'complete') { sd.completed = DWDC.today; }
			api('/contact/' + sid, 'POST', sd).then(function (x) { upsert(x); render(); toast('Moved to ' + (LABEL[to] || to)); }).catch(fail);
			return;
		}
		if (t.hasAttribute('data-stage-of')) {
			var id = +t.getAttribute('data-stage-of'), c = contact(id), v = t.value, data = { stage: v };
			if (v === 'active') { data.list = 'active'; } else if (c.list === 'archive') { data.list = 'leads'; }
			api('/contact/' + id, 'POST', data).then(function (x) { upsert(x); render(); toast(v === 'active' ? 'Moved to active jobs' : 'Stage updated'); }).catch(fail);
		}
	});

	app.addEventListener('submit', function (e) {
		var f = e.target, data = {}; e.preventDefault();
		new FormData(f).forEach(function (val, k) { data[k] = val; });
		var r = route();
		if (f.classList.contains('dwdc-jobform')) {
			var m = S.modal;
			if (!m.contact && !m.newc) { toast('Pick the client first, or add a new one', true); return; }
			if (m.newc && !String(data.name || '').trim()) { toast('Add the client’s name', true); return; }
			if (!String(data.title || '').trim()) { toast('Say what they hired you for', true); return; }
			data.contact = m.contact || 0;
			var b = f.querySelector('.dwdc-farow .dwdc-btn'); b.disabled = true;
			api('/job', 'POST', data).then(function (x) {
				upsert(x); S.full[x.id] = x;
				var rest = data.next ? api('/contact/' + x.id, 'POST', { next: data.next }).then(upsert) : Promise.resolve();
				return rest.then(function () { S.modal = null; go('dashboard'); toast('Added to active jobs'); });
			}).catch(function (er) { b.disabled = false; fail(er); });
		} else if (f.classList.contains('dwdc-leadform')) {
			if (!String(data.name || '').trim()) { toast('Add a name', true); return; }
			var note = data.note; delete data.note;
			data.list = 'leads'; data.stage = 'new'; data.source = data.source || 'Manual';
			api('/contact', 'POST', data).then(function (x) {
				upsert(x);
				return (note ? api('/contact/' + x.id + '/note', 'POST', { text: note }).then(upsert) : Promise.resolve()).then(function () { S.modal = null; S.back = 'leads'; go('leads'); toast('Lead added'); });
			}).catch(fail);
		} else if (f.classList.contains('dwdc-cardtodo') || f.classList.contains('dwdc-inlineadd') || f.classList.contains('dwdc-addbar')) {
			if (!String(data.text || '').trim()) { return; }
			var cid = +f.getAttribute('data-contact') || +data.contact || 0;
			api('/task', 'POST', { text: data.text, contact: cid, due: data.due || '' }).then(function (x) {
				S.tasks.unshift(x); if (f.classList.contains('dwdc-cardtodo')) { S.cardTodo = 0; } render();
				var again = app.querySelector(f.classList.contains('dwdc-addbar') ? '.dwdc-addbar [name=text]' : '.dwdc-inlineadd [name=text]'); if (again && !f.classList.contains('dwdc-cardtodo')) { again.focus(); }
			}).catch(fail);
		} else if (f.classList.contains('dwdc-payf')) {
			var pb = f.querySelector('.dwdc-btn'); pb.disabled = true;
			api('/contact/' + r.id + '/paylink', 'POST', data).then(function (x) { upsert(x); S.full[x.id] = x; render(); toast('Payment link emailed to ' + x.email); }).catch(function (er) { pb.disabled = false; fail(er); });
		} else if (f.classList.contains('dwdc-nextf')) {
			save(r.id, { next: data.next }, 'Next step saved');
		} else if (f.classList.contains('dwdc-editf')) {
			save(r.id, data, 'Saved').then(function () { S.edit = false; render(); });
		} else if (f.classList.contains('dwdc-logjob')) {
			var c = S.full[r.id] || contact(r.id);
			save(r.id, { jobs: (c.jobs || []).concat([data]) }, 'Job logged');
		} else if (f.classList.contains('dwdc-notef')) {
			api('/contact/' + r.id + '/note', 'POST', data).then(function (x) { upsert(x); S.full[x.id] = x; render(); }).catch(fail);
		}
	});
	// Esc on the job card's to-do input cancels it; blur with nothing typed closes it too.
	app.addEventListener('focusout', function (e) {
		if (e.target.closest && e.target.closest('.dwdc-cardtodo') && !e.target.value) { setTimeout(function () { if (S.cardTodo) { S.cardTodo = 0; render(); } }, 150); }
	});

	/* ---------- start ---------- */
	document.body.classList.add('dwdc-app-on');
	api('').then(function (r) {
		S.contacts = r.contacts.filter(Boolean); S.tasks = r.tasks.filter(Boolean);
		var m = /[?&]contact=(\d+)/.exec(location.search), em = /[?&]email=([^&]+)/.exec(location.search);
		var who = m ? contact(+m[1]) : em ? S.contacts.find(function (c) { return c.email && c.email.toLowerCase() === decodeURIComponent(em[1]).toLowerCase(); }) : null;
		if (who) { location.hash = 'client/' + who.id; }
		var rr = route(); if (rr.view === 'client') { load(rr.id); }
		render(true);
	}).catch(function (e) { app.innerHTML = '<p class="dwdc-loading">Couldn’t load Client Desk: ' + esc(e.message) + '</p>'; });
})();
