/*
 * Client Desk: the CRM screen in the WordPress admin (design: "CRM Redesign" handoff).
 * Screens: Dashboard, Leads & Onboarding, Active Jobs, To-dos, Hosting, Completed, Archive and a
 * full Client page. Everything is saved through the dwd/v1/crm REST routes in includes/crm.php.
 */
(function () {
	'use strict';
	var app = document.getElementById('dwdc-app');
	if (!app || !window.DWDC) { return; }

	var S = { contacts: [], tasks: [], clients: [], full: {}, q: '', leadFilter: 'all', back: 'home', modal: null, edit: false, more: {}, cardTodo: 0, prev: '' };

	/* ---------- helpers ---------- */
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function api(path, method, body) {
		return fetch(DWDC.api + path, {
			method: method || 'GET', credentials: 'same-origin',
			headers: { 'X-WP-Nonce': DWDC.nonce, 'Content-Type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined
		}).then(function (r) { return r.json().then(function (j) { if (!r.ok) { var er = new Error(j.message || 'Something went wrong'); er.code = j.code; er.data = j.data || {}; throw er; } return j; }); });
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
	// Upwork, Stripe and PayPal are separate payment channels, so they add up; jobs logged by hand overlap them.
	function paidIn(c) { return num(c.billed) + num(c.stripe) + num(c.paypal) + num(c.manual); }
	function lifetime(c) { return Math.max(logged(c), paidIn(c)); }
	function paidPct(c) { var p = num(c.price); return p ? Math.max(0, Math.min(100, Math.round((p - num(c.balance)) / p * 100))) : (num(c.balance) ? 0 : 100); }
	function url(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? u : 'https://' + u; }
	// The project's website under its name, as a link (falls back to what the job is).
	function siteLine(c) {
		var w = site(c);
		return w ? '<a class="dwdc-url" href="https://' + esc(w) + '" target="_blank" rel="noopener">' + esc(w) + '</a>' : (c.job ? '<small>' + esc(c.job) + '</small>' : '');
	}
	function site(c) { return String(c.website || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); }
	function toast(msg, bad) {
		var t = document.createElement('div'); t.className = 'dwdc-toast' + (bad ? ' bad' : ''); t.textContent = msg;
		document.body.appendChild(t); setTimeout(function () { t.classList.add('out'); }, 2200); setTimeout(function () { t.remove(); }, 2700);
	}
	function fail(e) { toast(e.message || 'Something went wrong', true); }

	var ICON = {
		link: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
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
		home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
		filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
		mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
		bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
		clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
		pause: '<circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>',
		card: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
		dollar: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
		refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
		list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
		wp: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
	};
	function ic(n, size) { return '<svg class="dwdc-ic" width="' + (size || 18) + '" height="' + (size || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }

	// Status colors: blue active, violet limbo, green done/paid, teal hosting, orange leads/owed, red overdue.
	// Dream Desk statuses: "Pending" is the old "In limbo" (waiting on the client).
	var TONE = { active: 'blue', limbo: 'red', hold: 'steel', complete: 'green', leads: 'deep', archive: 'steel', hosting: 'navy' };
	var LABEL = { active: 'Active', limbo: 'Limbo', hold: 'On hold', complete: 'Completed', leads: 'Lead', archive: 'Archived' };
	function avatar() { return ''; } // client avatars removed: names carry the rows
	function avatarOld(c, size, tone) { return '<span class="dwdc-av t-' + (tone || TONE[c.list] || 'blue') + (size ? ' s' + size : '') + '">' + esc(initials(c.name)) + '</span>'; }
	var STATUS = [['active', 'Active'], ['hold', 'On hold'], ['limbo', 'Limbo'], ['complete', 'Completed']];
	function statusSelect(c) {
		return '<select class="dwdc-stage t-' + (TONE[c.list] || 'gray') + '" data-status-of="' + c.id + '" title="Change status">' + STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === c.list ? ' selected' : '') + '>' + s[1] + '</option>'; }).join('') + '</select>';
	}
	function pill(text, tone) { return '<span class="dwdc-pill t-' + tone + '">' + esc(text) + '</span>'; }

	/* ---------- derived ---------- */
	function by(list) { return S.contacts.filter(function (c) { return c.list === list; }); }
	function hosting() { return S.contacts.filter(function (c) { return num(c.hosting) > 0 && c.list !== 'archive'; }); }
	// When a completed job finished: the date it was marked complete, else the last payment, else the latest dated job.
	function doneDate(c) {
		if (c.completed) { return c.completed; }
		var best = c.last_paid || '';
		(c.jobs || []).forEach(function (j) { var t = j.date ? new Date(/^\d{4}-/.test(j.date) ? j.date : '1 ' + j.date) : null; if (t && !isNaN(t)) { var iso = t.toISOString().slice(0, 10); if (iso > best) { best = iso; } } });
		if (!best && c.deadline) { best = c.deadline; }
		return best;
	}
	function byDone(a, b) { var x = doneDate(a), y = doneDate(b); return x === y ? (a.name < b.name ? -1 : 1) : (x < y ? 1 : -1); }
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
		return !q || [c.name, c.person, clientName(c), c.email, c.phone, c.company, c.website, c.job].join(' ').toLowerCase().indexOf(q) > -1;
	}
	/* clients (people) and their projects */
	function clientRec(id) { for (var i = 0; i < S.clients.length; i++) { if (S.clients[i].id === id) { return S.clients[i]; } } return null; }
	function clientOf(c) { return c && c.client ? clientRec(c.client) : null; }
	function clientName(c) { var k = clientOf(c); return k ? k.name : (c.person || ''); }
	function projectsOf(cid) { return S.contacts.filter(function (c) { return c.client === cid; }); }
	function clientCell(c) {
		var k = clientOf(c), em = (k && k.email) || c.email;
		return '<span class="dwdc-nm"><span>' + (k ? '<a class="dwdc-clink" href="#cl/' + k.id + '">' + esc(k.name) + '</a>' : '<b class="nm2">' + esc(c.person || '—') + '</b>') + (em ? '<small>' + esc(em) + '</small>' : '') + '</span></span>';
	}
	function reload() {
		return api('').then(function (r) { S.contacts = r.contacts.filter(Boolean); S.tasks = r.tasks.filter(Boolean); S.clients = (r.clients || []).filter(Boolean); S.money = r.money || {}; S.costs = r.costs || {}; S.trends = r.trends || null; });
	}

	/* ---------- routing ---------- */
	var TITLES = {
		home: ['', 'Today at', 'Dream Web'], leads: ['Clients', 'All', 'Leads'], onboarding: ['Clients', 'Onboarding', 'Forms'],
		todos: ['Everything open', 'To-Do', 'List'], hosting: ['Clients', 'Hosting', 'Clients'], archive: ['More', 'Archive', ''],
		search: ['Search', 'Search', 'Results'], money: ['Finances', 'Money', 'Stats'], reviews: ['Clients', 'Get', 'Reviews'], clients: ['Clients', 'All', 'Clients'], projects: ['Projects', 'All', 'Projects']
	};
	var OLD = { dashboard: 'home', jobs: 'projects/active', completed: 'projects/complete', forms: 'leads', todos: 'home' };
	function route() {
		var h = location.hash.replace(/^#/, '').split('/');
		if (OLD[h[0]]) { return { view: OLD[h[0]].split('/')[0], arg: OLD[h[0]].split('/')[1] || '', id: 0 }; }
		return { view: TITLES[h[0]] || h[0] === 'client' || h[0] === 'cl' || h[0] === 'host' ? h[0] : 'home', arg: h[1] || '', id: +h[1] || 0 };
	}
	window.addEventListener('hashchange', function () {
		var r = route();
		if (r.view !== 'search' && S.prev !== r.view + r.arg) { S.q = ''; }
		if (r.view !== 'client' && r.view !== 'search' && r.view !== 'cl' && r.view !== 'host') { S.back = r.view + (r.arg ? '/' + r.arg : ''); }
		S.edit = false; S.cardTodo = 0; document.body.classList.remove('dwdc-menu-open');
		if ((r.view === 'client' || r.view === 'host') && !S.full[r.id]) { load(r.id); }
		render(true); window.scrollTo(0, 0);
	});
	function go(h) { if (location.hash === '#' + h) { render(true); } else { location.hash = h; } }

	/* ---------- Get-the-app notice (hidden inside the installed app) ---------- */
	var INSTALL = null;
	window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); INSTALL = e; if (S.contacts.length) { render(); } });
	window.addEventListener('appinstalled', function () { INSTALL = null; try { localStorage.setItem('dwdcAppOff', '1'); } catch (er) {} render(); });
	function isInstalled() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
	function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
	function isPhone() { return /android|iphone|ipod|mobile/i.test(navigator.userAgent); }
	function appBanner() {
		if (isInstalled()) { return ''; }
		try { if (localStorage.getItem('dwdcAppOff')) { return ''; } } catch (e) {}
		var btn = INSTALL ? '<button class="dwdc-appb-go" data-appinstall>Install app</button>'
			: '<button class="dwdc-appb-go" data-appinfo>' + (isPhone() ? 'How to install' : 'Get it on your phone') + '</button>';
		return '<div class="dwdc-appb"><img src="' + esc(DWDC.appIcon) + '" alt=""><div><b>Get the Dream Desk app</b><span>Open your clients, projects and payments from your phone’s home screen.</span></div>' + btn + '<button class="dwdc-appb-x" data-appoff aria-label="Hide">' + ic('x', 16) + '</button></div>';
	}
	function appModal() {
		var ios = '<li><b>iPhone:</b> open <a href="' + esc(DWDC.app) + '">' + esc(DWDC.app.replace(/^https?:\/\//, '')) + '</a> in <b>Safari</b>, tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</li>';
		var and = '<li><b>Android:</b> open the link in <b>Chrome</b>, tap the <b>⋮</b> menu, then <b>Install app</b> (or <b>Add to Home screen</b>).</li>';
		return '<div class="dwdc-appm">'
			+ (isPhone() ? '' : '<div class="dwdc-appqr"><img src="' + esc(DWDC.appQr) + '" alt="QR code for the Dream Desk app"><small>Scan with your phone camera</small></div>')
			+ '<div><ol>' + (isPhone() ? (isIOS() ? ios : and) : ios + and) + '<li>Sign in once. Dream Desk keeps you signed in.</li></ol>'
			+ '<p class="dwdc-mutp">App link: <a href="' + esc(DWDC.app) + '" target="_blank" rel="noopener">' + esc(DWDC.app) + '</a></p></div></div>';
	}
	/* ---------- shell ---------- */
	function sidebar(r) {
		var cur = r.view === 'client' || r.view === 'cl' ? S.back : r.view + (r.arg ? '/' + r.arg : '');
		var nav = function (h, icon, label, count) {
			var on = cur === h || (h === 'projects/active' && (cur === 'projects' || cur === 'projects/all'));
			return '<a class="dwdc-nav' + (on ? ' on' : '') + '" href="#' + h + '">' + ic(icon) + '<span>' + label + '</span>' + (count !== undefined && count !== '' ? '<b>' + count + '</b>' : '') + '</a>';
		};
		var proj = S.contacts.filter(isProject);
		return '<aside class="dwdc-side">'
			+ '<a class="dwdc-brand" href="#home"><span class="dwdc-mark"><img src="' + esc(DWDC.mark) + '" alt=""></span><span><strong>Dream Desk</strong><small>Dream Web Digital</small></span></a>'
			+ (true ? '' : '<label class="dwdc-ssearch">' + ic('search', 16) + '<input type="search" placeholder="Search..." value="' + esc(S.q) + '"><kbd>Ctrl K</kbd></label>')
			+ '<nav>' + nav('home', 'home', 'Home')
			+ '<div class="dwdc-navh"><i class="b1"></i>Projects</div>'
			+ nav('projects/active', 'bolt', 'Active', by('active').length) + nav('projects/hold', 'pause', 'On Hold', by('hold').length)
			+ nav('projects/limbo', 'clock', 'Limbo', by('limbo').length) + nav('projects/complete', 'done', 'Completed', by('complete').length)
			+ '<div class="dwdc-navh"><i class="b2"></i>Clients</div>'
			+ nav('onboarding', 'filter', 'Onboarding', onboardList().length) + nav('hosting', 'server', 'Hosting', hosting().length)
			+ nav('clients', 'users', 'All Clients', S.clients.length) + nav('reviews', 'mail', 'Get Reviews')
			+ '<div class="dwdc-navh fin"><i class="b4"></i>Finances</div>' + nav('money', 'dollar', 'Money Stats')
			+ '<div class="dwdc-navh"><i class="b3"></i>More</div>'
			+ '<a class="dwdc-nav" href="' + esc(DWDC.wp) + '">' + ic('wp') + '<span>WordPress Admin</span></a>'
			+ '</nav><a class="dwdc-me" href="' + esc(DWDC.logout) + '" title="Sign out"><span class="dwdc-me-av">MT</span><span><strong>' + esc(DWDC.user || 'Michael Tarr') + '</strong><small>Owner · Sign out</small></span>' + ic('logout', 17) + '</a></aside>';
	}
	function top(r, t) {
		var SEC = { Projects: 'projects/active', Project: 'projects/active', Clients: 'clients', Client: 'clients', Finances: 'money', 'Website Hosted': 'hosting', Search: 'home' };
		var page = [t[1], t[2]].filter(Boolean).join(' ').toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); });
		var crumb = r.view === 'home'
			? '<a href="#home">Dream Desk</a><span aria-hidden="true">/</span><strong>' + esc(t[0]) + '</strong>'
			: '<a href="#' + (SEC[t[0]] || 'home') + '">' + esc(t[0] || 'Dream Desk') + '</a><span aria-hidden="true">/</span><strong>' + esc(page) + '</strong>';
		var plus = ic('plus', 14), menuOpen = !!S.newOpen;
		return '<header class="dwdc-ph">'
			+ '<div class="dwdc-ph-id"><button class="dwdc-burger" data-menu aria-label="Menu">' + ic('menu', 20) + '</button><div>'
			+ '<p class="dwdc-ph-crumb">' + crumb + '</p>'
			+ '<h1 class="dwdc-ph-title">' + esc(t[1]) + (t[2] ? ' <b>' + esc(t[2]) + '</b>' : '') + '</h1></div></div>'
			+ '<div class="dwdc-ph-tools">'
			+ '<label class="dwdc-ssearch dwdc-ph-search">' + ic('search', 16) + '<input type="search" placeholder="Search clients…" aria-label="Search clients" value="' + esc(S.q) + '"><kbd>Ctrl K</kbd></label>'
			+ '<span class="dwdc-ph-sp"></span>'
			+ '<div class="dwdc-ph-menu' + (menuOpen ? ' open' : '') + '"><button class="dwdc-ph-btn outline" type="button" data-newmenu aria-haspopup="menu" aria-expanded="' + menuOpen + '">' + plus + 'New' + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>'
			+ '<ul role="menu"><li><button role="menuitem" type="button" data-act="job">' + plus + 'Project</button></li><li><button role="menuitem" type="button" data-act="newclient">' + plus + 'Client</button></li><li><button role="menuitem" type="button" data-goto="hosting">' + ic('server', 14) + 'Hosting</button></li></ul></div>'
			+ '<button class="dwdc-ph-btn primary" type="button" data-act="pay">' + ic('card', 14) + 'Log Payment</button>'
			+ '</div></header>';
	}

	function syncWpMenu(r) {
		var menu = document.getElementById('adminmenu');
		if (!menu) { return; }
		var cur = r.view === 'client' || r.view === 'cl' ? S.back : r.view + (r.arg ? '/' + r.arg : '');
		if (cur === 'projects' || cur === 'projects/all') { cur = 'projects/active'; }
		var counts = { 'projects/active': by('active').length, 'projects/hold': by('hold').length, 'projects/limbo': by('limbo').length, 'projects/complete': by('complete').length, onboarding: onboardList().length, hosting: hosting().length, leads: leadList().length, clients: S.clients.length };
		var home = document.getElementById('toplevel_page_client-desk');
		if (home) { var onHome = cur === 'home' || cur === ''; home.classList.toggle('current', onHome); home.classList.toggle('wp-has-current-submenu', onHome); var ha = home.querySelector('a.menu-top'); if (ha) { ha.classList.toggle('current', onHome); ha.classList.toggle('wp-has-current-submenu', onHome); } }
		menu.querySelectorAll('li.dwd-dd').forEach(function (li) {
			var a = li.querySelector('a'); if (!a) { return; }
			var h = (a.getAttribute('href') || '').split('#')[1] || '';
			var on = h === cur;
			li.classList.toggle('current', on); a.classList.toggle('current', on);
			var name = a.querySelector('.wp-menu-name'), b = a.querySelector('.dwdc-mcount');
			if (counts[h] !== undefined && name) { if (!b) { b = document.createElement('span'); b.className = 'dwdc-mcount'; name.appendChild(b); } b.textContent = counts[h]; }
			if (on) { var sec = li.previousElementSibling; while (sec && !sec.classList.contains('dwd-msec')) { sec = sec.previousElementSibling; } if (sec && sec.classList.contains('dwd-closed')) { sec.click(); } }
		});
	}
	// Projects box on Home: show only the rows that fit beside the other boxes; the rest are one click away.
	function fitProjects() {
		var wrap = app.querySelector('.dwdc-pl-wrap'); if (!wrap) { return; }
		var rows = [].slice.call(wrap.querySelectorAll('.dwdc-pl-row')), h = wrap.clientHeight, shown = 0;
		rows.forEach(function (r) { r.style.display = ''; });
		rows.forEach(function (r) { if (r.offsetTop + r.offsetHeight <= h + 1) { shown++; } else { r.style.display = 'none'; } });
		var all = app.querySelector('[data-plall]');
		if (all) { all.closest('footer').style.display = rows.length > shown ? '' : 'none'; }
	}
	window.addEventListener('resize', function () { fitProjects(); });
	function render(anim) {
		var r = route(), t = (TITLES[r.view] || ['', '', '']).slice(), body;
		if (r.view === 'home') { t[0] = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
		if (r.view === 'projects') {
			var pl = { active: ['Active', 'Projects'], limbo: ['Limbo', 'Projects'], hold: ['On Hold', 'Projects'], complete: ['Completed', 'Projects'] }[r.arg];
			if (pl) { t = ['Projects', pl[0], pl[1]]; }
		}
		if (r.view === 'client') {
			var c = contact(r.id), words = String(c ? c.name : 'Project').split(' ');
			t = ['Project', words.slice(0, Math.max(1, words.length - 1)).join(' '), words.length > 1 ? words[words.length - 1] : ''];
			body = clientView(r.id);
		} else if (r.view === 'host') {
			var hc = contact(r.id);
			t = ['Website Hosted', '', hc ? (site(hc) || hc.name) : 'Website'];
			body = hostView(r.id);
		} else if (r.view === 'cl') {
			var k = clientRec(r.id), kw = String(k ? k.name : 'Client').split(' ');
			t = ['Client', kw[0], kw.slice(1).join(' ')];
			body = personView(r.id);
		} else {
			body = ({ home: home, clients: clientsView, projects: projectsView, leads: leadsList, onboarding: onboardView, todos: todosView, hosting: hostingView, money: moneyView, reviews: reviewsView, archive: archiveView, search: searchView }[r.view] || home)();
		}
		app.innerHTML = sidebar(r) + '<div class="dwdc-shade-m" data-menu></div><main class="dwdc-main">' + appBanner() + top(r, t) + '<div class="dwdc-screen' + (anim ? ' in' : '') + '">' + body + '</div></main>' + modal();
		S.prev = r.view + r.arg;
		syncWpMenu(r);
		fitProjects();
		if (S.focusSearch) { var q = app.querySelector('.dwdc-ssearch input'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } S.focusSearch = false; }
		if (S.cardTodo) { var ti = app.querySelector('.dwdc-cardtodo input'); if (ti) { ti.focus(); } }
	}

	/* ---------- Money: where the money came from ---------- */
	function busyMonths(MY, ylist) {
		var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		var all = [];
		ylist.forEach(function (y) { (MY[y].m || []).forEach(function (v) { all.push(Math.max(0, +v || 0)); }); });
		var mx = Math.max.apply(null, all.concat([1]));
		var k = function (v) { return v >= 1000 ? '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : (v ? '$' + Math.round(v) : ''); };
		var head = '<div class="dwdc-hm-row head"><span></span>' + MN.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '<span>Best month</span></div>';
		var rows = ylist.map(function (y) {
			var m = (MY[y].m || []).map(function (v) { return Math.max(0, +v || 0); });
			var top = m.indexOf(Math.max.apply(null, m));
			return '<div class="dwdc-hm-row"><b>' + y + '</b>' + m.map(function (v, i) {
				var t = v / mx, bg = v ? 'rgba(19,166,238,' + (0.12 + t * 0.88).toFixed(2) + ')' : '#F4F6F9';
				return '<span class="dwdc-hm-c' + (i === top && v ? ' top' : '') + '" style="background:' + bg + ';color:' + (t > 0.5 ? '#fff' : '#0B203D') + '" title="' + MN[i] + ' ' + y + ': ' + money(v) + '">' + k(v) + '</span>';
			}).join('') + '<span class="dwdc-hm-best">' + (m[top] ? MN[top] + ' · ' + money(m[top]) : '—') + '</span></div>';
		}).join('');
		return (rows ? '<div class="dwdc-hm">' + head + rows + '</div>' : emptyRow('No dated payments yet.')) + '<p class="dwdc-mutp sm">Money received each month, after Upwork fees. Darker means more money, on the same scale for every year. Each year’s best month is outlined.</p>';
	}
	function connectsCard(MY) {
		var C = S.costs || {}, years = Object.keys(C).sort().reverse();
		if (!years.length) { return emptyRow('No Connects spending imported yet.'); }
		var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		var sel = S.cYear && C[S.cYear] ? S.cYear : 'all';
		var nowY = DWDC.today.slice(0, 4), nowM = +DWDC.today.slice(5, 7);
		var monthsIn = function (y) { // months that count toward the average: from the first purchase month (first year) to now (this year)
			var first = years[years.length - 1], m = C[y].m, start = 0, end = 11;
			if (y === first) { start = m.findIndex(function (v) { return v > 0; }); if (start < 0) { start = 0; } }
			if (y === nowY) { end = nowM - 1; }
			return Math.max(1, end - start + 1);
		};
		var pick = sel === 'all' ? years : [sel];
		var spent = 0, qty = 0, buys = 0, mem = 0, months = 0, earned = 0;
		pick.forEach(function (y) { var o = C[y]; spent += o.connects; qty += o.qty; buys += o.buys; mem += o.membership; months += monthsIn(y); earned += MY[y] ? (+MY[y].Upwork || 0) : 0; });
		var kpi = function (l, v, sub) { return '<div class="dwdc-ckpi"><small>' + l + '</small><strong>' + v + '</strong>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; };
		var chips = '<div class="dwdc-cchips"><button class="dwdc-fchip' + (sel === 'all' ? ' on' : '') + '" data-cyear="all">All years</button>' + years.map(function (y) { return '<button class="dwdc-fchip' + (sel === y ? ' on' : '') + '" data-cyear="' + y + '">' + y + '</button>'; }).join('') + '</div>';
		// bars: by month for one year, by year for all years
		var bars;
		if (sel === 'all') {
			var vals = years.slice().reverse().map(function (y) { return { l: y, v: C[y].connects, t: C[y].qty.toLocaleString() + ' Connects' }; });
			var mx = Math.max.apply(null, vals.map(function (x) { return x.v; }).concat([1]));
			bars = '<div class="dwdc-cbars yrs">' + vals.map(function (x) { return '<div class="dwdc-busy-col" title="' + x.l + ': ' + money(x.v) + ' · ' + x.t + '"><b>' + money(x.v) + '</b><i style="height:' + Math.max(4, Math.round(x.v / mx * 100)) + '%"></i><small>' + x.l + '</small></div>'; }).join('') + '</div>';
		} else {
			var o = C[sel], mx2 = Math.max.apply(null, o.m.concat([1])), top = o.m.indexOf(Math.max.apply(null, o.m));
			bars = '<div class="dwdc-cbars">' + o.m.map(function (v, i) { return '<div class="dwdc-busy-col' + (i === top && v ? ' top' : '') + '" title="' + MN[i] + ' ' + sel + ': ' + money(v) + ' · ' + (o.mq[i] || 0).toLocaleString() + ' Connects"><b>' + (v ? money(v) : '') + '</b><i style="height:' + (v ? Math.max(4, Math.round(v / mx2 * 100)) : 0) + '%"></i><small>' + MN[i] + '</small></div>'; }).join('') + '</div>';
		}
		var rows = years.map(function (y) {
			var o = C[y], up = MY[y] ? (+MY[y].Upwork || 0) : 0, mi = monthsIn(y), tm = o.m.indexOf(Math.max.apply(null, o.m));
			return '<tr><td><b>' + y + '</b></td><td>' + money(o.connects) + '</td><td>' + o.qty.toLocaleString() + '</td><td>' + money(o.connects / mi) + '</td><td>' + (o.m[tm] ? MN[tm] + ' · ' + money(o.m[tm]) : '—') + '</td><td>' + (o.membership ? money(o.membership) : '—') + '</td><td>' + money(up) + '</td><td class="g">' + (o.connects ? '$' + (up / o.connects).toFixed(0) : '—') + '</td></tr>';
		}).join('');
		return chips
			+ '<div class="dwdc-ckpis">'
			+ kpi('Spent on Connects', money(spent), buys + ' purchases')
			+ kpi('Connects bought', qty.toLocaleString(), qty ? '$' + (spent / qty).toFixed(2) + ' each' : '')
			+ kpi('Average per month', money(spent / Math.max(1, months)), months + ' month' + (months === 1 ? '' : 's'))
			+ kpi('Average per year', money(spent / pick.length), pick.length + ' year' + (pick.length === 1 ? '' : 's'))
			+ kpi('Membership fees', money(mem), 'Freelancer Plus')
			+ kpi('Earned per $1 on Connects', spent ? '$' + (earned / spent).toFixed(0) : '—', money(earned) + ' from Upwork')
			+ '</div>' + bars
			+ '<div class="dwdc-ctbl"><table><thead><tr><th>Year</th><th>Connects spend</th><th>Connects</th><th>Avg / month</th><th>Biggest month</th><th>Membership</th><th>Upwork earned</th><th>Per $1</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
			+ '<p class="dwdc-mutp sm">From your Upwork transaction history. Upwork earned is after fees. "Per $1" is how much Upwork paid you for every dollar spent on Connects that year.</p>';
	}
	function trendsBox() {
		var T = S.trends;
		if (!T || !T.items) { return emptyRow('Checking your numbers…'); }
		var icon = { up: '▲', down: '▼', flat: '●', info: '●' };
		var next = new Date(DWDC.today + 'T12:00:00'); do { next.setDate(next.getDate() + 1); } while (next.getDay() !== 1);
		return '<ul class="dwdc-trends">' + T.items.map(function (x) {
			return '<li class="' + x.tone + (x.alert ? ' alert' : '') + '"><i>' + icon[x.tone] + '</i><span>' + esc(x.text) + '</span></li>';
		}).join('') + '</ul>'
			+ '<p class="dwdc-trends-foot">Checked ' + fmt(T.generated) + ' · next check Monday, ' + fmt(next.toISOString().slice(0, 10)) + ' · <button class="dwdc-lnk sm2" data-trendsnow>Check now</button></p>'
			+ '<p class="dwdc-mutp sm">Bold lines are big moves (about 20% or more, or a long downward slide). When one shows up, you get an email.</p>';
	}
	/* ---------- Connections: Stripe & PayPal live sync, Upwork CSV import ---------- */
	function connCard() {
		if (!S.sync) { if (!S.syncLoading) { S.syncLoading = true; api('/sync').then(function (x) { S.sync = x; S.syncLoading = false; if (route().view === 'money') { render(); } }).catch(function () { S.syncLoading = false; }); } return emptyRow('Loading…'); }
		var X = S.sync, U = S.upRes;
		var st = function (ok, last) { return '<span class="dwdc-conn-st ' + (ok ? 'on' : 'off') + '">' + (ok ? 'Connected' : 'Not set up') + '</span>' + (last ? '<small class="dwdc-conn-last">Last payment synced ' + fmt(String(last).slice(0, 10), true) + '</small>' : ''); };
		var copy = function (u) { return '<div class="dwdc-conn-url"><code>' + esc(u) + '</code><button class="dwdc-lnk sm2" data-copy="' + esc(u) + '">Copy</button></div>'; };
		var pick = function () { return '<option value="">Pick the project…</option>' + S.contacts.filter(function (c) { return c.list !== 'archive'; }).sort(function (a, b) { return a.name.localeCompare(b.name); }).map(function (c) { var k = clientOf(c); return '<option value="' + c.id + '">' + esc(c.name + (k && k.name !== c.name ? ' (' + k.name + ')' : '')) + '</option>'; }).join(''); };
		var up = '<div class="dwdc-conn"><h3><i class="upw"></i>Upwork</h3><p>Upwork has no live connection, so import its report: in Upwork go to <b>Reports → Transaction History</b>, pick a date range, then <b>Download CSV</b> and drop it here. Only new payments are added, after fees, and Connects costs update too.</p>'
			+ '<label class="dwdc-btn dwdc-upbtn">' + ic('plus', 14) + 'Import Upwork CSV<input type="file" accept=".csv,text/csv" data-upcsv hidden></label>'
			+ (X.upwork.last ? '<small class="dwdc-conn-last">Last import ' + fmt(String(X.upwork.last).slice(0, 10), true) + '</small>' : '')
			+ (U ? '<div class="dwdc-conn-res">' + (U.error ? esc(U.error) : '<b>' + U.added + ' new payment' + (U.added === 1 ? '' : 's') + '</b> added (' + money(U.amount) + ' after fees)' + (U.already ? ' · ' + U.already + ' already in Dream Desk' : '') + (U.costs ? ' · ' + U.costs + ' Connects charges' : '')) + '</div>' : '')
			+ (U && U.unmatched && U.unmatched.length ? '<div class="dwdc-conn-map"><p><b>Which project is each of these?</b> Pick one, then import again. Dream Desk remembers your picks.</p>' + U.unmatched.map(function (x) { return '<label><span>' + esc(x.team || '(no name)') + ' · ' + money(x.amount) + '</span><select data-upmap="' + esc(x.team) + '">' + pick() + '</select></label>'; }).join('') + '<button class="dwdc-btn" data-upagain>Import again</button></div>' : '')
			+ '</div>';
		var stripe = '<div class="dwdc-conn"><h3><i class="str"></i>Stripe' + st(X.stripe.ready, X.stripe.last) + '</h3>'
			+ '<ol><li>In Stripe, go to <b>Developers → Webhooks → Add endpoint</b>.</li><li>Paste this link as the endpoint URL:' + copy(X.stripe.url) + '</li><li>Choose the events <b>invoice.paid</b> and <b>charge.succeeded</b>, then save.</li><li>Click <b>Reveal</b> under Signing secret and paste it here:</li></ol>'
			+ '<div class="dwdc-conn-f"><input type="password" placeholder="whsec_…" data-sk="stripe_whsec"><button class="dwdc-btn" data-synsave="stripe">Save</button></div></div>';
		var pp = '<div class="dwdc-conn"><h3><i class="ppl"></i>PayPal' + st(X.paypal.ready, X.paypal.last) + '</h3>'
			+ '<ol><li>Go to <b>developer.paypal.com → Apps &amp; Credentials</b>, switch to <b>Live</b>, and <b>Create App</b>.</li><li>In the app, under <b>Live Webhooks</b>, add this link:' + copy(X.paypal.url) + 'with the events <b>Invoicing invoice paid</b> and <b>Payment capture completed</b>.</li><li>Paste the app’s Client ID, Secret and the Webhook ID here:</li></ol>'
			+ '<div class="dwdc-conn-f col"><input placeholder="Client ID" data-sk="paypal_id"><input type="password" placeholder="Secret" data-sk="paypal_secret"><input placeholder="Webhook ID" data-sk="paypal_hook"><button class="dwdc-btn" data-synsave="paypal">Save</button></div></div>';
		return '<div class="dwdc-conns">' + up + stripe + pp + '</div><p class="dwdc-mutp sm">Payments are matched to clients by email. Anything that doesn’t match becomes a to-do on your dashboard so you can assign it. Keys are saved on your server and never shown again.</p>';
	}
	function upImport(file, map) {
		var go = function (text) {
			S.upCsv = text;
			api('/upwork-import', 'POST', { csv: text, map: map || {} }).then(function (r) { S.upRes = r; return reload(); }).then(function () { render(); toast('Upwork import done'); })
				.catch(function (e) { S.upRes = { error: e.message }; render(); });
		};
		if (file) { var fr = new FileReader(); fr.onload = function () { go(String(fr.result)); }; fr.readAsText(file); } else if (S.upCsv) { go(S.upCsv); }
	}
	function moneyView() {
		var projs = S.contacts.filter(function (c) { return ['active', 'hold', 'limbo', 'complete'].indexOf(c.list) > -1; });
		var sum = function (f) { return projs.reduce(function (s, c) { return s + num(c[f]); }, 0); };
		var up = sum('billed'), st = sum('stripe'), pp = sum('paypal'), ot = sum('manual'), total = up + st + pp + ot;
		var paid = projs.filter(function (c) { return lifetime(c) > 0; }).sort(function (a, b) { return lifetime(b) - lifetime(a); });
		var avg = paid.length ? paid.reduce(function (s, c) { return s + lifetime(c); }, 0) / paid.length : 0;
		var mid = paid.length ? lifetime(paid[Math.floor(paid.length / 2)]) : 0;
		var top = paid[0];
		var hostYr = hosting().reduce(function (s, c) { return s + num(c.hosting); }, 0);
		var open = working(), owe = owed(open);
		// clients
		var byClient = {};
		projs.forEach(function (c) { var k = c.client || ('p' + c.id); (byClient[k] = byClient[k] || { id: c.client, list: [], total: 0 }).list.push(c); byClient[k].total += lifetime(c); });
		var cl = Object.keys(byClient).map(function (k) { return byClient[k]; });
		var repeat = cl.filter(function (x) { return x.list.length > 1; }).sort(function (a, b) { return b.total - a.total; });
		var repeatRev = repeat.reduce(function (s, x) { return s + x.total; }, 0);
		var topClients = cl.slice().sort(function (a, b) { return b.total - a.total; }).slice(0, 10);
		var cname = function (x) { var k = x.id ? clientRec(x.id) : null; return k ? k.name : (x.list[0].person || x.list[0].name); };
		// by year: only payments that carry a real date (Stripe, PayPal, logged by hand)
		var MY = S.money || {}, ylist = Object.keys(MY).sort().reverse();
		var ytot = function (y) { var o = MY[y]; return (+o.Stripe || 0) + (+o.PayPal || 0) + (+o.Upwork || 0) + (+o.Other || 0); };
		var ymax = Math.max.apply(null, ylist.map(ytot).concat([1]));
		// lead sources
		var src = {};
		projs.forEach(function (c) { var s = c.lead_source || (num(c.billed) ? 'Upwork' : 'Not set'); (src[s] = src[s] || { n: 0, v: 0 }); src[s].n++; src[s].v += lifetime(c); });
		var slist = Object.keys(src).sort(function (a, b) { return src[b].v - src[a].v; });
		var pct = function (v) { return total ? Math.round(v / total * 100) : 0; };
		var kpi = function (label, val, sub, tone) { return '<div class="dwdc-kpi' + (tone ? ' ' + tone : '') + '"><small>' + label + '</small><strong>' + val + '</strong>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; };
		var chan = [['Upwork (after fees)', up, 'upw'], ['Stripe', st, 'str'], ['PayPal', pp, 'ppl'], ['Zelle, check & other', ot, 'oth']];
		var rowsP = paid.slice(0, 10).map(function (c, i) { var k = clientOf(c); return '<a class="dwdc-mrow" href="#client/' + c.id + '"><em>' + (i + 1) + '</em><span><b>' + esc(c.name) + '</b><small>' + esc(k ? k.name : (c.person || '')) + '</small></span><strong>' + money(lifetime(c)) + '</strong></a>'; }).join('');
		var rowsC = topClients.map(function (x, i) { return '<a class="dwdc-mrow" href="' + (x.id ? '#cl/' + x.id : '#client/' + x.list[0].id) + '"><em>' + (i + 1) + '</em><span><b>' + esc(cname(x)) + '</b><small>' + x.list.length + ' project' + (x.list.length === 1 ? '' : 's') + '</small></span><strong>' + money(x.total) + '</strong></a>'; }).join('');
		var rowsR = repeat.slice(0, 12).map(function (x) { return '<a class="dwdc-mrow" href="' + (x.id ? '#cl/' + x.id : '#client/' + x.list[0].id) + '"><span><b>' + esc(cname(x)) + '</b><small>' + x.list.map(function (c) { return esc(c.name); }).join(' · ') + '</small></span><strong>' + money(x.total) + '</strong></a>'; }).join('');
		var mcard = function (title, inner, extra) { return '<section class="dwdc-card pad dwdc-mcard' + (extra ? ' ' + extra : '') + '"><div class="dwdc-cardh"><h2>' + title + '</h2></div>' + inner + '</section>'; };
		return '<div class="dwdc-kpis">'
			+ kpi('Total received', money(total), paid.length + ' paying projects', 'navy')
			+ kpi('Average project', money(avg), 'Middle project ' + money(mid))
			+ kpi('Top project', top ? money(lifetime(top)) : '—', top ? esc(top.name) : '')
			+ kpi('Owed right now', money(owe), open.filter(function (c) { return num(c.balance) > 0; }).length + ' open invoices', owe ? 'coral' : '')
			+ kpi('Hosting', money(hostYr) + '<i>/yr</i>', hosting().length + ' hosted sites')
			+ kpi('Repeat clients', repeat.length, money(repeatRev) + ' · ' + (cl.length ? Math.round(repeat.length / cl.length * 100) : 0) + '% of clients')
			+ '</div>'
			+ '<div class="dwdc-mgrid">'
			+ mcard('Patterns &amp; Trends <button class="dwdc-askbtn" data-askai>' + ic('bolt', 14) + 'Ask AI</button>', trendsBox(), 'trends')
			+ mcard('Where it came from', '<div class="dwdc-chanbar">' + chan.map(function (x) { return x[1] ? '<i class="' + x[2] + '" style="width:' + Math.max(1, pct(x[1])) + '%"></i>' : ''; }).join('') + '</div>'
				+ '<ul class="dwdc-chans">' + chan.map(function (x) { return '<li><i class="' + x[2] + '"></i><span>' + x[0] + '</span><b>' + money(x[1]) + '</b><em>' + pct(x[1]) + '%</em></li>'; }).join('') + '</ul>')
			+ mcard('By year', (ylist.length ? '<ul class="dwdc-years2">' + ylist.map(function (y) { var o = MY[y], t = ytot(y); return '<li><span>' + y + '</span><div>' + [['Upwork', 'upw'], ['Stripe', 'str'], ['PayPal', 'ppl'], ['Other', 'oth']].map(function (x) { return o[x[0]] > 0 ? '<i class="' + x[1] + '" style="width:' + Math.max(1, Math.round(o[x[0]] / ymax * 100)) + '%" title="' + x[0] + ' ' + money(o[x[0]]) + '"></i>' : ''; }).join('') + '</div><b>' + money(t) + '</b></li>'; }).join('') + '</ul>' : emptyRow('No dated payments yet.'))
				+ '<div class="dwdc-ylegend"><span><i class="upw"></i>Upwork</span><span><i class="str"></i>Stripe</span><span><i class="ppl"></i>PayPal</span><span><i class="oth"></i>Zelle & other</span></div>'
				+ '<p class="dwdc-mutp sm">Hover a bar to see each amount. Every payment on the day it was paid: Upwork (from your transaction history, after Upwork’s fees), Stripe, PayPal and payments you log. Refunds come off the year they happened.</p>')
			+ mcard('Busiest months', busyMonths(MY, ylist), 'wide')
			+ mcard('Upwork Connects', connectsCard(MY), 'wide')
			+ mcard('Top projects', rowsP || emptyRow('No payments yet.'))
			+ mcard('Top clients', rowsC || emptyRow('No payments yet.'))
			+ mcard('Repeat clients <span class="dwdc-cnt">' + repeat.length + '</span>', rowsR || emptyRow('No repeat clients yet.'))
			+ mcard('Connections <small class="dwdc-conn-sub">Keep Money Stats up to date automatically</small>', connCard(), 'wide')
			+ '</div>';
	}
	/* ---------- Get Reviews: pick past clients and email them a Google review request ---------- */
	var REV_PER = 25;
	function revEmail(k) { if (k.email) { return k.email; } var p = projectsOf(k.id).filter(function (c) { return c.email; })[0]; return p ? p.email : ''; }
	function revBiz(k) { if (k.company) { return k.company; } var p = projectsOf(k.id).filter(function (c) { return c.name !== k.name; })[0]; return p ? p.name : ''; }
	function reviewsView() {
		S.revSel = S.revSel || {};
		var list = S.clients.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
		var pages = Math.max(1, Math.ceil(list.length / REV_PER)), pg = Math.min(Math.max(1, S.revPage || 1), pages);
		var rows = list.slice((pg - 1) * REV_PER, pg * REV_PER);
		var nSel = Object.keys(S.revSel).filter(function (k) { return S.revSel[k]; }).length;
		var pageIds = rows.filter(function (k) { return revEmail(k); }).map(function (k) { return k.id; });
		var allOn = pageIds.length && pageIds.every(function (id) { return S.revSel[id]; });
		var pager = '';
		if (pages > 1) {
			pager = '<nav class="dwdc-pager">' + (pg > 1 ? '<button data-revpage="' + (pg - 1) + '">‹ Prev</button>' : '<span></span>');
			for (var i = 1; i <= pages; i++) { pager += '<button class="' + (i === pg ? 'on' : '') + '" data-revpage="' + i + '">' + i + '</button>'; }
			pager += (pg < pages ? '<button data-revpage="' + (pg + 1) + '">Next ›</button>' : '') + '</nav>';
		}
		return '<div class="dwdc-revbar"><div><b>' + nSel + '</b> selected' + (nSel ? ' <button class="dwdc-lnk sm2" data-revclear>Clear</button>' : '') + '<small>Check the clients you want to ask, on any page. Your picks stay checked as you move between pages.</small></div>'
			+ '<a class="dwdc-lnk dwdc-revprev" href="' + esc(DWDC.api + '/reviews/preview?_wpnonce=' + DWDC.nonce) + '" target="_blank" rel="noopener">Preview email</a><button class="dwdc-btn coral" data-revsend' + (nSel ? '' : ' disabled') + '>' + ic('mail', 15) + 'Send mass review request email' + (nSel ? ' (' + nSel + ')' : '') + '</button></div>'
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-rev head"><span>Name</span><span>Business</span><span>Email</span><span class="r"><label class="dwdc-revall"><input type="checkbox" data-revall' + (allOn ? ' checked' : '') + '> Select page</label></span></div>'
			+ rows.map(function (k) {
				var em = revEmail(k), on = !!S.revSel[k.id];
				return '<div class="dwdc-grid g-rev row' + (on ? ' sel' : '') + '"><span><a class="dwdc-clink" href="#cl/' + k.id + '">' + esc(k.name) + '</a></span><span class="sec ell">' + esc(revBiz(k) || '—') + '</span><span class="sec ell">' + esc(em || 'No email on file') + '</span>'
					+ '<span class="r">' + (em ? '<label class="dwdc-revchk"><input type="checkbox" data-revpick="' + k.id + '"' + (on ? ' checked' : '') + '><span>Email review request</span></label>' : '<em class="mut">Add an email first</em>')
					+ (k.review_sent ? '<small class="dwdc-revsent">Asked ' + fmt(k.review_sent, true) + '</small>' : '') + '</span></div>';
			}).join('') + '</div>'
			+ '<div class="dwdc-revfoot"><span class="mut">Showing ' + ((pg - 1) * REV_PER + 1) + '–' + Math.min(pg * REV_PER, list.length) + ' of ' + list.length + ' clients</span>' + pager + '</div>';
	}
	function sendReviews(btn) {
		var ids = Object.keys(S.revSel).filter(function (k) { return S.revSel[k]; }).map(Number);
		if (!ids.length) { return; }
		if (!confirm('Send the review request email to ' + ids.length + ' client' + (ids.length === 1 ? '' : 's') + '?')) { return; }
		btn.disabled = true; btn.textContent = 'Sending…';
		var sent = 0, failed = 0, chunks = [];
		for (var i = 0; i < ids.length; i += 20) { chunks.push(ids.slice(i, i + 20)); }
		chunks.reduce(function (p, ch) { return p.then(function () { return api('/reviews', 'POST', { ids: ch }).then(function (r) { sent += (r.sent || []).length; failed += (r.failed || []).length; }); }); }, Promise.resolve())
			.then(function () { S.revSel = {}; return reload(); })
			.then(function () { render(); toast('Review request sent to ' + sent + ' client' + (sent === 1 ? '' : 's') + (failed ? ' · ' + failed + ' didn’t send' : ''), !!failed); })
			.catch(function (e) { render(); fail(e); });
	}
	/* ---------- Ask AI: a small chat window about money, projects and trends ---------- */
	var CHAT = { msgs: [], busy: false, needKey: !DWDC.aiReady };
	function mdLite(t) {
		var h = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
		var out = [], list = [];
		h.split('\n').forEach(function (l) {
			var m = l.match(/^\s*[-*•]\s+(.*)/) || l.match(/^\s*\d+[.)]\s+(.*)/);
			if (m) { list.push('<li>' + m[1] + '</li>'); return; }
			if (list.length) { out.push('<ul>' + list.join('') + '</ul>'); list = []; }
			if (l.trim()) { out.push('<p>' + l.replace(/^#+\s*/, '') + '</p>'); }
		});
		if (list.length) { out.push('<ul>' + list.join('') + '</ul>'); }
		return out.join('');
	}
	function chatEl() { return document.getElementById('dwdc-chat'); }
	function chatPaint() {
		var box = chatEl(); if (!box) { return; }
		var log = box.querySelector('.dwdc-chat-log');
		var sugg = ['How much did I make in October vs September?', 'Who were my top 5 clients this year?', 'What were my slowest months in 2025?', 'Is my Upwork Connects spending paying off?'];
		if (CHAT.needKey) {
			log.innerHTML = '<div class="dwdc-chat-key"><b>Connect Claude</b><p>Paste your Claude API key to turn on Ask AI. It’s saved on your server and never shown in the browser.</p><p class="sm">Get one at console.anthropic.com → API Keys.</p><input type="password" placeholder="sk-ant-..." data-chatkey><button class="dwdc-btn" data-chatkeysave>Save key</button></div>';
			return;
		}
		log.innerHTML = (CHAT.msgs.length ? '' : '<div class="dwdc-chat-hi"><p>Ask me anything about your money, projects and trends.</p>' + sugg.map(function (q) { return '<button class="dwdc-chat-sug" data-chatsug>' + esc(q) + '</button>'; }).join('') + '</div>')
			+ CHAT.msgs.map(function (m) { return '<div class="dwdc-chat-m ' + m.role + '">' + (m.role === 'assistant' ? mdLite(m.content) : esc(m.content)) + '</div>'; }).join('')
			+ (CHAT.busy ? '<div class="dwdc-chat-m assistant typing"><i></i><i></i><i></i></div>' : '');
		log.scrollTop = log.scrollHeight;
	}
	function chatSend(q) {
		q = String(q || '').trim(); if (!q || CHAT.busy) { return; }
		CHAT.msgs.push({ role: 'user', content: q }); CHAT.busy = true; chatPaint();
		api('/ask', 'POST', { messages: CHAT.msgs }).then(function (r) {
			CHAT.msgs.push({ role: 'assistant', content: r.answer });
		}).catch(function (e) {
			if (e.data && e.data.needs_key) { CHAT.needKey = true; CHAT.msgs.pop(); toast(e.message, true); }
			else { CHAT.msgs.push({ role: 'assistant', content: 'Sorry, that didn’t work: ' + e.message }); }
		}).then(function () { CHAT.busy = false; chatPaint(); });
	}
	function chatOpen() {
		var box = chatEl();
		if (!box) {
			box = document.createElement('div'); box.id = 'dwdc-chat'; box.className = 'dwdc-chat';
			box.innerHTML = '<header><span class="dwdc-chat-ic">' + ic('bolt', 16) + '</span><div><b>Ask AI</b><small>About your money, projects &amp; trends</small></div><button data-chatclose aria-label="Close">' + ic('x', 18) + '</button></header>'
				+ '<div class="dwdc-chat-log"></div><form class="dwdc-chat-f"><textarea rows="1" placeholder="Ask a question…"></textarea><button class="dwdc-btn" aria-label="Send">' + ic('right', 16) + '</button></form>';
			document.body.appendChild(box);
			box.addEventListener('click', function (e) {
				var t = e.target;
				if (t.closest('[data-chatclose]')) { box.classList.remove('open'); return; }
				var sg = t.closest('[data-chatsug]'); if (sg) { chatSend(sg.textContent); return; }
				if (t.closest('[data-chatkeysave]')) {
					var k = box.querySelector('[data-chatkey]').value;
					api('/ask/key', 'POST', { key: k }).then(function () { CHAT.needKey = false; chatPaint(); toast('Claude connected'); }).catch(fail);
				}
			});
			var ta = box.querySelector('textarea');
			box.querySelector('form').addEventListener('submit', function (e) { e.preventDefault(); var v = ta.value; ta.value = ''; ta.style.height = ''; chatSend(v); });
			ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); box.querySelector('form').requestSubmit(); } });
			ta.addEventListener('input', function () { ta.style.height = ''; ta.style.height = Math.min(120, ta.scrollHeight) + 'px'; });
		}
		box.classList.add('open'); chatPaint();
		setTimeout(function () { var ta = box.querySelector('textarea'); if (ta && !CHAT.needKey) { ta.focus(); } }, 50);
	}
	/* ---------- shared pieces ---------- */
	function tile(tone, label, n, sub, href, attrs) {
		return '<a class="dwdc-tile t-' + tone + '"' + (href ? ' href="#' + href + '"' : '') + (attrs || '') + '><span class="dwdc-tile-h">' + label + '<i></i></span><strong>' + n + '</strong><small>' + sub + '</small></a>';
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
		if (n < 0 && !t.done) { return '<span class="dwdc-due deep">' + (-n) + 'd overdue</span>'; }
		if (n === 0) { return '<span class="dwdc-due blue">Today</span>'; }
		return '<span class="dwdc-due ' + (n > 0 && n <= 7 ? 'navy' : 'mut') + '">' + fmt(t.due) + '</span>';
	}
	function todoRow(t, small) {
		var c = t.contact ? contact(t.contact) : null;
		var meta = [c ? '<a href="#client/' + c.id + '">' + esc(c.name) + '</a>' : '', t.due ? 'Due ' + fmt(t.due) : '', 'Added by Michael'].filter(Boolean).join(' · ');
		return '<div class="dwdc-todo' + (t.done ? ' done' : '') + (small ? ' sm' : '') + '" data-toggle="' + t.id + '"><span class="dwdc-chk">' + ic('check', 12) + '</span>'
			+ '<span class="dwdc-tt"><b>' + esc(t.text) + '</b>' + (small ? '' : '<small>' + meta + '</small>') + '</span>'
			+ due(t) + '<button class="dwdc-del" data-del-task="' + t.id + '" title="Delete to-do">' + ic('x', 14) + '</button></div>';
	}

	/* ---------- Dream Desk: helpers ---------- */
	function isProject(c) { return c.list === 'active' || c.list === 'limbo' || c.list === 'hold' || c.list === 'complete'; }
	function isOpen(c) { return c.list === 'active' || c.list === 'limbo' || c.list === 'hold'; }
	// Client type: Project (an open project), Hosting, Lead, else Past client.
	function clientType(cid) {
		var pp = projectsOf(cid);
		if (pp.some(isOpen)) { return 'Project'; }
		if (pp.some(function (c) { return num(c.hosting) > 0 && c.list !== 'archive'; })) { return 'Hosting'; }
		if (pp.length && pp.every(function (c) { return c.list === 'leads'; })) { return 'Lead'; }
		return 'Past client';
	}
	var CTYPE_TONE = { Project: 'blue', Hosting: 'navy', Lead: 'deep', 'Past client': 'steel' };
	function formRows() { return S.contacts.filter(function (c) { return c.entry_count; }).sort(function (a, b) { return (a.last_entry_date || '') < (b.last_entry_date || '') ? 1 : -1; }); }
	function formStatus(c) { return c.list === 'archive' ? 'Archived' : c.list === 'leads' ? (c.stage && c.stage !== 'new' ? 'Lead' : 'New') : 'Linked'; }
	function card(cls, head, body, foot) { return '<section class="dwdc-dcard ' + (cls || '') + '">' + head + '<div class="dwdc-dbody">' + body + '</div>' + (foot || '') + '</section>'; }
	function chead(icon, title, href) { return '<header class="dwdc-dhead">' + (icon ? '<span class="dwdc-dic">' + ic(icon, 18) + '</span>' : '') + '<h2>' + title + '</h2>' + (href ? '<a href="#' + href + '">Open ' + ic('right', 14) + '</a>' : '') + '</header>'; }
	function frow(label, val, href) { return '<a class="dwdc-frow" href="#' + href + '"><span>' + label + '</span><b>' + val + '</b>' + ic('right', 12) + '</a>'; }
	function statusPill(c) { return pill(LABEL[c.list] || c.list, TONE[c.list] || 'steel'); }
	function dot(c) { return '<i class="dwdc-sdot t-' + (TONE[c.list] || 'steel') + '"></i>'; }

	/* ---------- Home ---------- */
	function home() {
		var types = S.clients.map(function (k) { return clientType(k.id); });
		var nP = types.filter(function (x) { return x === 'Project'; }).length, nH = types.filter(function (x) { return x === 'Hosting'; }).length, nPast = types.filter(function (x) { return x === 'Past client'; }).length, tot = S.clients.length || 1;
		var open = S.contacts.filter(isOpen), active = by('active'), host = hosting();
		var annual = host.reduce(function (s, c) { return s + num(c.hosting); }, 0);
		var nextH = host.filter(function (c) { return c.renewal && c.renewal >= DWDC.today; }).sort(function (a, b) { return a.renewal < b.renewal ? -1 : 1; })[0];
		var nextDue = open.filter(function (c) { return c.deadline; }).sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; })[0];
		var owing = open.filter(function (c) { return num(c.balance) > 0; });
		var billed = S.contacts.reduce(function (s, c) { return s + lifetime(c); }, 0);
		var lastPay = S.contacts.filter(function (c) { return c.last_pay; }).sort(function (a, b) { return a.last_pay.date < b.last_pay.date ? 1 : -1; })[0];
		var seg = function (n, cls) { return n ? '<i class="' + cls + '" style="flex:' + n + '"></i>' : ''; };
		var c1 = card('cd-clients', chead('users', 'Clients', 'clients'),
			'<p class="dwdc-hero"><strong>' + S.clients.length + '</strong> clients on file</p><div class="dwdc-segbar">' + seg(nP, 's1') + seg(nH, 's2') + seg(nPast, 's3') + '</div>'
			+ '<a class="dwdc-seg" href="#clients"><i class="s1"></i>Project clients<b>' + nP + '</b></a><a class="dwdc-seg" href="#clients"><i class="s2"></i>Hosting only<b>' + nH + '</b></a><a class="dwdc-seg" href="#clients"><i class="s3"></i>Past clients<b>' + nPast + '</b></a>',
			'<footer class="dwdc-grid4">' + frow('Active Projects', active.length, 'projects/active') + frow('Onboarding', onboardList().length, 'onboarding') + frow('Hosting', host.length, 'hosting') + frow('All Clients', S.clients.length, 'clients') + '</footer>');
		var plist = active.slice().sort(function (x, y) { return num(y.price) - num(x.price) || (x.name < y.name ? -1 : 1); });
		var c2 = card('cd-projects cd-plist', chead('brief', 'Projects', 'projects/active'),
			'<div class="dwdc-pl-head"><span>Project · Client</span><span>Price</span><span>Owed</span></div>'
			+ '<div class="dwdc-pl-wrap"><div class="dwdc-pl">' + (plist.length ? plist.map(function (c) {
				var k = clientOf(c), ow = num(c.balance);
				return '<a class="dwdc-pl-row" href="#client/' + c.id + '"><span><b>' + esc(c.name) + '</b><small>' + esc(k ? k.name : (c.person || '')) + '</small></span><span>' + (num(c.price) ? money(c.price) : '—') + '</span><span class="' + (ow ? 'ow' : 'pd') + '">' + (ow ? money(ow) : 'Paid') + '</span></a>';
			}).join('') : '<p class="dwdc-mutp">No active projects right now.</p>') + '</div></div>',
			'<footer class="dwdc-pl-foot"><a class="dwdc-pl-all" href="#projects/active" data-plall>View all ' + active.length + ' ' + ic('right', 12) + '</a></footer>');
		var c3 = card('cd-money', chead('dollar', 'Money', 'money'),
			'<p class="dwdc-lbl">Owed on open projects</p><p class="dwdc-hero big"><strong>' + money(owed(open)) + '</strong></p><p class="dwdc-sub">' + owing.length + ' invoice' + (owing.length === 1 ? '' : 's') + ' open · ' + active.length + ' active projects</p>'
			+ '<div class="dwdc-tint-space" aria-hidden="true"></div>',
			'<footer>' + frow('Hosting Revenue', money(annual) + ' / yr', 'hosting') + frow('Next Renewal', nextH ? fmt(nextH.renewal) + ' · ' + esc(nextH.name) : '—', 'hosting') + '<div class="dwdc-frow"><span>All-time billed</span><b>' + money(billed) + '</b></div></footer>');
		var tv = active.reduce(function (s, c) { return s + num(c.price); }, 0);
		var ap = card('cd-plain cd-apnavy', '<header class="dwdc-dhead"><h2>Active Projects <span class="dwdc-cnt">' + active.length + '</span></h2><a href="#projects/active">View all</a></header>',
			'<div class="dwdc-mini-t"><div class="g-ap head"><span>Project · Client</span><span>Price</span><span>Due</span><span class="r">Owed</span></div>'
			+ (active.length ? active.filter(match).map(function (c) {
				var late = c.deadline && c.deadline < DWDC.today, ow = num(c.balance);
				return '<div class="g-ap row" data-go="client/' + c.id + '"><span><b class="dwdc-pname">' + esc(c.name) + '</b>' + (site(c) ? siteLine(c) : '') + '<small>' + esc([clientName(c), c.job].filter(Boolean).join(' · ')) + '</small></span><span class="b">' + (num(c.price) ? money(c.price) : '—') + '</span><span class="' + (late ? 'deep b' : '') + '">' + (c.deadline ? fmt(c.deadline) : '—') + '</span><span class="r b ' + (ow ? 'deep' : 'sec') + '">' + (ow ? money(ow) : 'Paid') + '</span></div>';
			}).join('') : emptyRow('No active projects.')) + '</div>',
			'<footer class="dwdc-totals one"><div><small>Total amount due</small><strong class="deep">' + money(owed(active)) + '</strong></div></footer>');
		var td = openTasks().sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : 1; });
		var tl = card('cd-plain', '<header class="dwdc-dhead plain"><h2>To-Do List <span class="dwdc-cnt">' + td.length + '</span></h2></header>',
			'<form class="dwdc-addbar home"><input name="text" placeholder="Add something we need to do..." autocomplete="off" required><button class="dwdc-btn">Add</button></form>'
			+ (td.length ? '<div class="dwdc-todos">' + td.map(function (t) { return todoRow(t); }).join('') + '</div>' : emptyRow('Nothing on the list. Nice.')));
		return '<div class="dwdc-row3">' + c2 + c3 + c1 + '</div><div class="dwdc-row2c">' + card('cd-plain cd-trends', '<header class="dwdc-dhead"><h2>Patterns &amp; Trends</h2><button class="dwdc-askbtn light" data-askai>' + ic('bolt', 14) + 'Ask AI</button><a href="#money">Money Stats ' + ic('right', 14) + '</a></header>', trendsBox()) + tl + '</div>';
	}

	/* ---------- All Clients ---------- */
	function clientsView() {
		var f = S.clientFilter || 'all', q = S.q.toLowerCase().trim();
		var rows = S.clients.map(function (k) { return { k: k, t: clientType(k.id), pp: projectsOf(k.id) }; })
			.filter(function (x) { return !q || [x.k.name, x.k.email, x.k.company, x.pp.map(function (c) { return c.name + ' ' + c.website; }).join(' ')].join(' ').toLowerCase().indexOf(q) > -1; });
		var cnt = function (t) { return rows.filter(function (x) { return t === 'all' || x.t === t; }).length; };
		var chip = function (k, l, t) { return '<button class="dwdc-fchip' + (f === k ? ' on' : '') + '" data-cfilter="' + k + '">' + l + ' <b>' + cnt(t) + '</b></button>'; };
		var list = rows.filter(function (x) { return f === 'all' || x.t === { projects: 'Project', hosting: 'Hosting', past: 'Past client', leads: 'Lead' }[f]; })
			.sort(function (a, b) { var o = ['Project', 'Hosting', 'Lead', 'Past client']; return o.indexOf(a.t) - o.indexOf(b.t) || a.k.name.localeCompare(b.k.name); });
		var cap = S.more.clients || q ? list.length : 50;
		return '<div class="dwdc-chips">' + chip('all', 'All', 'all') + chip('projects', 'Projects', 'Project') + chip('hosting', 'Hosting', 'Hosting') + chip('leads', 'Leads', 'Lead') + chip('past', 'Past', 'Past client') + '</div>'
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-clients head"><span>Client</span><span>Business</span><span>Email</span><span>Type</span><span>Projects</span><span>Hosting</span><span>Last activity</span></div>'
			+ (list.length ? list.slice(0, cap).map(function (x) {
				var k = x.k, biz = k.company || (x.pp[0] ? x.pp[0].name : ''), host = x.pp.some(function (c) { return num(c.hosting) > 0; });
				// Only open projects have real recent activity; imported records were all touched on import day.
				var last = x.pp.filter(isOpen).reduce(function (m, c) { return c.updated > m ? c.updated : m; }, '');
				return '<div class="dwdc-grid g-clients row" data-go="cl/' + k.id + '"><span><b>' + esc(k.name) + '</b></span><span class="ell sec">' + esc(biz === k.name ? '—' : biz || '—') + '</span><span class="ell sec">' + esc(k.email || 'No email on file') + '</span>'
					+ '<span>' + pill(x.t, CTYPE_TONE[x.t]) + '</span><span class="b">' + x.pp.length + '</span><span class="sec">' + (host ? 'Yes' : 'No') + '</span><span class="mut">' + ago(last) + '</span></div>';
			}).join('') : emptyRow('No clients match.')) + moreFoot('clients', cap, list.length) + '</div>';
	}

	/* ---------- All Projects ---------- */
	function projectsView() {
		var f = route().arg || 'active';
		if (['active', 'limbo', 'hold', 'complete'].indexOf(f) < 0) { f = 'active'; }
		var all = S.contacts.filter(isProject).filter(match);
		var chip = function (k, l) { var n = all.filter(function (c) { return k === 'all' || c.list === k; }).length; return '<a class="dwdc-fchip' + (f === k ? ' on' : '') + '" href="#projects/' + k + '">' + (k === 'all' ? '' : '<i class="dwdc-sdot t-' + TONE[k] + '"></i>') + l + ' <b>' + n + '</b></a>'; };
		var order = ['active', 'hold', 'limbo', 'complete'];
		var yr = S.year || '', years = {};
		if (f === 'complete') { all.filter(function (c) { return c.list === 'complete'; }).forEach(function (c) { var y = (doneDate(c) || '').slice(0, 4); years[y || 'none'] = (years[y || 'none'] || 0) + 1; }); }
		var rows = all.filter(function (c) { return f === 'all' || c.list === f; }).filter(function (c) { if (f !== 'complete' || !yr) { return true; } var y = (doneDate(c) || '').slice(0, 4); return yr === 'none' ? !y : y === yr; }).sort(function (a, b) { return order.indexOf(a.list) - order.indexOf(b.list) || (a.list === 'complete' ? byDone(a, b) : (a.deadline || '9') < (b.deadline || '9') ? -1 : 1); });
		var cap = S.more['p' + f] || S.q ? rows.length : 50;
		var empties = { active: 'No active projects right now.', limbo: 'Nothing in limbo. Clients you haven’t heard back from in a while go here.', hold: 'No projects on hold. Paused or waiting projects go here.', complete: 'No completed projects yet.', all: 'No projects match.' };
		var ylist = Object.keys(years).filter(function (y) { return y !== 'none'; }).sort().reverse();
		var yearBar = f === 'complete' ? '<div class="dwdc-years"><span>Finished in</span><select class="dwdc-yearsel" data-year>'
			+ '<option value="">All years (' + all.filter(function (c) { return c.list === 'complete'; }).length + ')</option>'
			+ ylist.map(function (y) { return '<option value="' + y + '"' + (yr === y ? ' selected' : '') + '>' + y + ' (' + years[y] + ')</option>'; }).join('')
			+ (years.none ? '<option value="none"' + (yr === 'none' ? ' selected' : '') + '>No date yet (' + years.none + ')</option>' : '') + '</select></div>' : '';
		return '<div class="dwdc-chips">' + chip('active', 'Active') + chip('hold', 'On hold') + chip('limbo', 'Limbo') + chip('complete', 'Completed') + yearBar + '</div>'
			+ '<div class="dwdc-card dwdc-tbl">' + (rows.length ? '<div class="dwdc-grid g-projects head"><span>Project</span><span>Client</span><span>' + (f === 'complete' ? 'Total' : 'Price') + '</span><span>Owed</span><span>' + (f === 'complete' ? 'Finished' : 'Due') + '</span><span>Status</span><span>Next step</span></div>'
				+ rows.slice(0, cap).map(function (c) {
					var k = clientOf(c), ow = num(c.balance), done = c.list === 'complete', dd = done ? doneDate(c) : c.deadline, late = !done && c.deadline && c.deadline < DWDC.today, amt = done ? lifetime(c) : num(c.price);
					return '<div class="dwdc-grid g-projects row" data-go="client/' + c.id + '"><span class="dwdc-pn">' + dot(c) + '<span><b class="dwdc-pname">' + esc(c.name) + '</b><span class="dwdc-subl">' + siteLine(c) + (c.markup ? '<a class="dwdc-mkpill" href="' + esc(url(c.markup)) + '" target="_blank" rel="noopener">Markup</a>' : '') + '</span></span></span>'
						+ '<span class="dwdc-nm"><span>' + (k ? '<a class="dwdc-clink" href="#cl/' + k.id + '">' + esc(k.name) + '</a>' : '<b>' + esc(c.person || '—') + '</b>') + '<small>' + esc((k && k.email) || c.email || 'No email on file') + '</small></span></span>'
						+ '<span class="b">' + (amt ? money(amt) : '—') + '</span><span class="b ' + (ow ? 'deep' : 'sec') + '">' + (ow ? money(ow) : 'Paid') + '</span>'
						+ '<span class="' + (late ? 'deep b' : 'b') + '">' + (dd ? fmt(dd, done) : '—') + '</span><span>' + statusSelect(c) + '</span><span class="sec ell">' + esc(c.next || '—') + '</span></div>';
				}).join('') : emptyRow(S.q ? 'No matches.' : empties[f])) + moreFoot('p' + f, cap, rows.length) + '</div>';
	}

	/* ---------- Leads (website forms other than onboarding, plus leads added by hand) ---------- */
	// Records brought in from ClickUp, Upwork, Stripe or PayPal: their created/updated dates are just the import day.
	function imported(c) { return /ClickUp import|^Upwork$|^Stripe$|^PayPal$/.test(c.source || ''); }
	function isOnboard(c) { return !!(c.onboarded || c.stage === 'onboarding'); }
	function leadList() { return S.contacts.filter(function (c) { return c.list === 'leads' && !isOnboard(c); }).sort(function (a, b) { return received(a) < received(b) ? 1 : -1; }); }
	function onboardList() { return S.contacts.filter(function (c) { return isOnboard(c) && c.list !== 'archive'; }).sort(function (a, b) { return received(a) < received(b) ? 1 : -1; }); }
	var LSTAGES = [['new', 'New'], ['contacted', 'Contacted'], ['active', 'Won → Active'], ['lost', 'Lost']];
	function leadsList() {
		var rows = leadList().filter(match);
		return '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-leads2 head"><span>Name</span><span>Contact</span><span>Source</span><span>Stage</span><span>Received</span><span>Follow up</span><span></span></div>'
			+ (rows.length ? rows.map(function (c) {
				var st = c.stage && c.stage !== 'onboarding' ? c.stage : 'new', fu = c.followup;
				return '<div class="dwdc-grid g-leads2 row" data-go="client/' + c.id + '"><span><b>' + esc(clientName(c) || c.name) + '</b>' + (c.company || (clientName(c) && clientName(c) !== c.name) ? '<small>' + esc(c.company || c.name) + '</small>' : '') + '</span>'
					+ '<span class="dwdc-nm"><span><b class="nm2">' + esc(c.email || '—') + '</b><small>' + esc(c.phone || '') + '</small></span></span>'
					+ '<span class="sec ell">' + esc(c.last_entry || String(c.source || 'Added by hand').replace(/^Website form: /, '')) + '</span>'
					+ '<span><select class="dwdc-stage t-' + ({ new: 'blue', contacted: 'deep', active: 'navy', lost: 'steel' }[st] || 'blue') + '" data-stage-of="' + c.id + '">' + LSTAGES.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === st ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></span>'
					+ '<span class="mut">' + ago(received(c)) + '</span>'
					+ '<span>' + (fu && fu >= DWDC.today ? '<span class="dwdc-fu">' + ic('clock', 13) + fmt(fu) + '</span>' : '<button class="dwdc-btn3" data-followup="' + c.id + '">' + ic('clock', 13) + ' Follow up</button>') + '</span>'
					+ '<span class="r"><button class="dwdc-del show" data-arch="' + c.id + '" title="Archive">' + ic('archive', 15) + '</button></span></div>';
			}).join('') : emptyRow('No leads yet. Website form entries and leads you add with “+ Lead” show up here.')) + '</div>';
	}
	/* ---------- Onboarding (everyone who sent the onboarding form) ---------- */
	function onboardView() {
		var rows = onboardList().filter(match);
		return '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-onb head"><span>Client</span><span>Project</span><span>Email</span><span>Status</span><span>Received</span><span></span></div>'
			+ (rows.length ? rows.map(function (c) {
				return '<div class="dwdc-grid g-onb row" data-go="client/' + c.id + '"><span><b>' + esc(clientName(c) || c.person || c.name) + '</b>' + (c.phone ? '<small>' + esc(c.phone) + '</small>' : '') + '</span>'
					+ '<span><b class="dwdc-pname">' + esc(c.name) + '</b>' + (site(c) ? siteLine(c) : '') + '</span><span class="sec ell">' + esc(c.email || '—') + '</span>'
					+ '<span>' + (c.list === 'leads' ? pill('Onboarding', 'deep') : statusPill(c)) + '</span><span class="mut">' + ago(received(c)) + '</span>'
					+ '<span class="r"><a class="dwdc-btn3" href="#client/' + c.id + '">View answers</a></span></div>';
			}).join('') : emptyRow('No onboarding forms yet. Use + Project → Add new client to send one.')) + '</div>';
	}

	/* ---------- Form Entries ---------- */
	function formsView() {
		var rows = formRows().filter(match), tone = { New: 'blue', Lead: 'deep', Linked: 'navy', Archived: 'steel' };
		return '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-forms head"><span>Name</span><span>Email</span><span>Form</span><span>Status</span><span>Received</span><span></span></div>'
			+ (rows.length ? rows.map(function (c) {
				var st = formStatus(c);
				return '<div class="dwdc-grid g-forms row" data-go="client/' + c.id + '"><span><b>' + esc(clientName(c) || c.name) + '</b>' + (clientName(c) && clientName(c) !== c.name ? '<small>' + esc(c.name) + '</small>' : '') + '</span><span class="sec ell">' + esc(c.email || '—') + '</span><span class="sec">' + esc(c.last_entry) + '</span>'
					+ '<span>' + pill(st, tone[st]) + '</span><span class="mut">' + ago(c.last_entry_date) + '</span><span class="r dwdc-acts2">'
					+ (st === 'New' ? '<button class="dwdc-btn3" data-mklead="' + c.id + '">Make lead</button><button class="dwdc-btn3 mut" data-arch="' + c.id + '">Archive</button>' : st === 'Archived' ? '<button class="dwdc-btn3" data-restore="' + c.id + '">Restore</button>' : '<a class="dwdc-btn3" href="#client/' + c.id + '">View</a>') + '</span></div>';
			}).join('') : emptyRow('No form entries yet.')) + '</div>';
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
		var stop = function (id) { return ' data-scroll="sec-' + id + '"'; };
		return '<div class="dwdc-card pad dwdc-tilebox"><div class="dwdc-tiles">'
			+ tile('green', 'Active jobs', active.length, money(owed(working())) + ' owed on open jobs', '', stop('active'))
			+ tile('blue', 'Completed', done.length, money(billed) + ' billed all-time', '', stop('complete'))
			+ tile('teal', 'Hosting clients', host.length, money(annual) + '/yr' + (next ? ' · next renewal ' + fmt(next.renewal) : ''), 'hosting')
			+ '</div></div>'
			+ jobTable('active', 'Active jobs', 'Nothing in progress right now.', '<div class="dwdc-sechr">' + (nLeads ? '<a class="dwdc-lnk" href="#leads">' + nLeads + ' new lead' + (nLeads === 1 ? '' : 's') + ' / onboarding ' + ic('right', 14) + '</a>' : '') + '<button class="dwdc-btn sm" data-act="job">' + ic('plus', 14) + 'Add job</button></div>')
			+ jobTable('hold', 'On hold', 'No jobs on hold. Paused jobs go here.')
			+ jobTable('limbo', 'In limbo', 'No jobs in limbo. Clients you haven’t heard back from go here.')
			+ jobTable('complete', 'Completed', 'No completed jobs yet.', '<a class="dwdc-lnk" href="#completed">All completed jobs ' + ic('right', 14) + '</a>', 10)
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
			+ (c.markup ? '<div class="dwdc-mk"><a class="dwdc-mklink" href="' + esc(url(c.markup)) + '" target="_blank" rel="noopener">' + ic('wp', 14) + 'Open Markup</a><button class="dwdc-lnk sm2" data-markup="' + c.id + '">Change</button></div>'
				: '<div class="dwdc-mk"><button class="dwdc-lnk sm2" data-markup="' + c.id + '">' + ic('plus', 13) + 'Add Markup link</button></div>')
			+ (todos.length ? '<div class="dwdc-todos mini">' + todos.slice(0, 4).map(function (t) { return todoRow(t, true); }).join('') + (todos.length > 4 ? '<a class="dwdc-lnk sm" href="#client/' + c.id + '">+' + (todos.length - 4) + ' more</a>' : '') + '</div>' : '')
			+ '<footer>' + (S.cardTodo === c.id
				? '<form class="dwdc-cardtodo" data-contact="' + c.id + '"><input name="text" placeholder="What needs doing? Press Enter" autocomplete="off"></form>'
				: '<button class="dwdc-ghost" data-cardtodo="' + c.id + '">' + ic('plus', 14) + 'Add a to-do</button>') + '</footer></article>';
	}

	/* ---------- leads & onboarding ---------- */
	var STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['onboarding', 'Onboarding'], ['active', 'Won → Active'], ['lost', 'Lost']];
	var STAGE_TONE = { new: 'blue', contacted: 'blue', onboarding: 'deep', active: 'navy', lost: 'steel' };
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
	// One status section on the dashboard: Job | Client | Price | Owed | Due | Status | Next step.
	function jobTable(list, title, empty, right, cap) {
		var rows = by(list).filter(match), done = list === 'complete';
		if (done) { rows.sort(byDone); }
		var key = 'dash-' + list, limit = cap && !S.more[key] && !S.q ? cap : rows.length;
		return '<section id="sec-' + list + '">' + secHead(title, rows.length, right || '')
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-jobs head tint-' + (TONE[list] || 'blue') + '"><span>Job</span><span>Client</span><span>' + (done ? 'Billed' : 'Price') + '</span><span>Owed</span><span>' + (done ? 'Completed' : 'Due') + '</span><span>Status</span><span>Next step</span></div>'
			+ (rows.length ? rows.slice(0, limit).map(function (c) {
				var ow = num(c.balance), late = !done && c.deadline && c.deadline < DWDC.today, amt = done ? lifetime(c) : num(c.price);
				return '<div class="dwdc-grid g-jobs row" data-go="client/' + c.id + '"><span class="dwdc-nm"><span><b>' + esc(c.name) + (c.markup ? ' <a class="dwdc-mkpill" href="' + esc(url(c.markup)) + '" target="_blank" rel="noopener">Markup</a>' : '') + '</b>' + (c.job ? '<small>' + esc(c.job) + '</small>' : '') + '</span></span>'
					+ clientCell(c)
					+ '<span class="b">' + (amt ? money(amt) : '—') + '</span><span class="b ' + (ow ? 'orange' : 'green') + '">' + (ow ? money(ow) : (amt ? 'Paid' : '—')) + '</span>'
					+ '<span class="' + (late ? 'red b' : '') + '">' + (done ? (doneDate(c) ? fmt(doneDate(c), true) : '—') : (c.deadline ? fmt(c.deadline) : '—')) + '</span><span>' + statusSelect(c) + '</span><span class="sec ell">' + esc(c.next || '—') + '</span></div>';
			}).join('') : emptyRow(S.q ? 'No matches.' : empty)) + (cap ? moreFoot(key, limit, rows.length) : '') + '</div></section>';
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
				return '<div class="dwdc-grid g-host row" data-go="host/' + c.id + '"><span class="dwdc-nm"><span><b>' + esc(c.name) + '</b><small>' + esc(site(c) || '') + '</small></span></span>'
					+ clientCell(c)
					+ '<span>' + (on ? '<b class="green">Active</b>' + (c.sub.method ? '<small class="dwdc-sm">&nbsp;· ' + esc(c.sub.method) + '</small>' : '') : (c.sub ? '<span class="mut">' + esc(c.sub.status) + '</span>' : '<span class="mut">None</span>')) + '</span>'
					+ '<span class="b">' + money(on && num(c.sub.amount) ? c.sub.amount : c.hosting) + '</span>'
					+ '<span class="b ' + (on ? '' : n === null ? 'mut' : n < 0 ? 'red' : n <= 30 ? 'orange' : '') + '">' + (when ? fmt(when, true) : '—') + '</span><span>' + pill(st[0], st[1]) + '</span></div>';
			}).join('') : emptyRow('No hosting clients match.')) + moreFoot('hosting', cap, list.length) + '</div>';
	}

	/* ---------- completed ---------- */
	function completedView() {
		var rows = by('complete').sort(byDone);
		var billed = rows.reduce(function (s, c) { return s + lifetime(c); }, 0), priced = rows.filter(function (c) { return lifetime(c) > 0; }).length;
		var list = rows.filter(match), cap = S.more.completed || S.q ? list.length : 25;
		return '<div class="dwdc-minis">' + mini('green', 'Completed jobs', rows.length) + mini('navy', 'Billed all-time', money(billed)) + mini('navy', 'Average job', priced ? money(billed / priced) : '—') + mini('teal', 'Now hosting', hosting().length) + '</div>'
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-done head"><span>Client</span><span>Project</span><span>Billed</span><span>Completed</span><span>Hosting</span></div>'
			+ (list.length ? list.slice(0, cap).map(function (c) {
				var proj = c.job || ((c.jobs || []).length ? c.jobs[c.jobs.length - 1].title : '') || (c.source === 'Stripe' ? 'Stripe client' : c.source === 'PayPal' ? 'PayPal client' : num(c.billed) || c.source === 'Upwork' ? 'Upwork client' : '');
				return '<div class="dwdc-grid g-done row" data-go="client/' + c.id + '"><span class="dwdc-nm">' + avatar(c, 34, 'green') + '<span><b>' + esc(c.name) + '</b><small>' + esc(c.person || c.email || site(c) || 'No contact on file') + '</small></span></span>'
					+ '<span class="sec ell">' + esc(proj || '—') + ((c.jobs || []).length > 1 ? ' <small class="mut">+' + (c.jobs.length - 1) + ' more</small>' : '') + '</span>'
					+ '<span class="b">' + (lifetime(c) ? money(lifetime(c)) : '—') + '</span><span class="mut">' + (doneDate(c) ? fmt(doneDate(c), true) : '—') + '</span>'
					+ '<span>' + (num(c.hosting) > 0 ? pill('Hosting', 'teal') : pill('No', 'gray')) + '</span></div>';
			}).join('') : emptyRow('No completed jobs match.')) + moreFoot('completed', cap, list.length) + '</div>';
	}

	/* ---------- archive & search ---------- */
	function archiveView() {
		var list = by('archive').filter(match);
		return '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-arch head"><span>Name</span><span>Type</span><span>Reason</span><span>Archived</span><span></span></div>'
			+ (list.length ? list.map(function (c) {
				var type = c.entry_count && !c.price ? 'Form entry' : c.price || c.job ? 'Project' : 'Lead';
				return '<div class="dwdc-grid g-arch row" data-go="client/' + c.id + '"><span><b>' + esc(c.name) + '</b><small>' + esc(c.email || '') + '</small></span><span>' + pill(type, type === 'Project' ? 'navy' : type === 'Lead' ? 'deep' : 'blue') + '</span>'
					+ '<span class="sec">Removed from lists</span><span class="mut">' + fmt(c.updated, true) + '</span>'
					+ '<span class="r dwdc-acts2"><button class="dwdc-lnk" data-restore="' + c.id + '">Restore</button><button class="dwdc-del show" data-quickdel="' + c.id + '" title="Delete for good">' + ic('x', 15) + '</button></span></div>';
			}).join('') : emptyRow('Nothing archived. Anything you remove shows up here, and you can restore it.')) + '</div>';
	}
	function searchView() {
		var list = S.contacts.filter(match);
		return simpleTable(S.q ? list : [], false, S.q ? 'No one matches “' + esc(S.q) + '”.' : 'Type a name, email or company.');
	}
	function simpleTable(list, del, empty) {
		return '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-simple head"><span>Name</span><span>Email</span><span>List</span><span class="r">Last activity</span><span></span></div>'
			+ (list.length ? list.map(function (c) {
				return '<div class="dwdc-grid g-simple row" data-go="client/' + c.id + '"><span class="dwdc-nm">' + avatar(c, 34) + '<span><b>' + esc(c.name) + '</b><small>' + esc(c.person || site(c) || '') + '</small></span></span>'
					+ '<span class="sec ell">' + esc(c.email || '—') + '</span><span>' + pill(LABEL[c.list] || c.list, TONE[c.list] || 'gray') + '</span><span class="r mut">' + (isOpen(c) ? ago(c.updated) : '') + '</span>'
					+ '<span class="r">' + (del ? '<button class="dwdc-del show" data-quickdel="' + c.id + '" title="Delete">' + ic('x', 15) + '</button>' : '') + '</span></div>';
			}).join('') : emptyRow(empty)) + '</div>';
	}

	/* ---------- clients & projects ---------- */
	function spentBy(cid) { return projectsOf(cid).reduce(function (s, c) { return s + lifetime(c); }, 0); }
	function clientsViewOld() {
		var list = S.clients.filter(function (k) { var q = S.q.toLowerCase().trim(); return !q || [k.name, k.email, k.phone, k.company, projectsOf(k.id).map(function (c) { return c.name + ' ' + c.website; }).join(' ')].join(' ').toLowerCase().indexOf(q) > -1; });
		var cap = S.more.clients || S.q ? list.length : 50;
		return '<div class="dwdc-minis">' + mini('navy', 'Clients', S.clients.length) + mini('green', 'With more than one project', S.clients.filter(function (k) { return projectsOf(k.id).length > 1; }).length) + mini('teal', 'Hosting with you', S.clients.filter(function (k) { return projectsOf(k.id).some(function (c) { return num(c.hosting) > 0; }); }).length) + '</div>'
			+ secHead('Clients', list.length, '<button class="dwdc-btn sm" data-act="newclient">' + ic('plus', 14) + 'New client</button>')
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-clients head tint-navy"><span>Client</span><span>Projects</span><span>Hosting</span><span>Total spent</span><span class="r">Last activity</span></div>'
			+ (list.length ? list.slice(0, cap).map(function (k) {
				var pp = projectsOf(k.id), host = pp.filter(function (c) { return num(c.hosting) > 0; });
				var last = pp.reduce(function (m, c) { return c.updated > m ? c.updated : m; }, '');
				return '<div class="dwdc-grid g-clients row" data-go="cl/' + k.id + '"><span class="dwdc-nm"><span><b>' + esc(k.name) + '</b><small>' + esc([k.email, k.phone].filter(Boolean).join(' · ') || ' ') + '</small></span></span>'
					+ '<span class="ell sec">' + (pp.length > 1 ? '<b class="dwdc-cnt">' + pp.length + '</b> ' : '') + esc(pp.map(function (c) { return c.name; }).join(', ') || '—') + '</span>'
					+ '<span>' + (host.length ? host.length + ' site' + (host.length > 1 ? 's' : '') + ' · ' + money(host.reduce(function (s, c) { return s + num(c.hosting); }, 0)) + '/yr' : '<span class="mut">—</span>') + '</span>'
					+ '<span class="b">' + (spentBy(k.id) ? money(spentBy(k.id)) : '—') + '</span><span class="r mut">' + ago(last) + '</span></div>';
			}).join('') : emptyRow('No clients match.')) + moreFoot('clients', cap, list.length) + '</div>';
	}
	function projectsViewOld() {
		var f = S.projFilter || 'all';
		var all = S.contacts.filter(function (c) { return c.list !== 'archive'; }).filter(match);
		var chip = function (k, l) { var n = all.filter(function (c) { return k === 'all' || c.list === k; }).length; return '<button class="dwdc-fchip' + (f === k ? ' on' : '') + '" data-pfilter="' + k + '">' + l + ' <b>' + n + '</b></button>'; };
		var rows = all.filter(function (c) { return f === 'all' || c.list === f; }).sort(function (a, b) { return a.list === b.list ? byDone(a, b) : ['active', 'hold', 'limbo', 'leads', 'complete'].indexOf(a.list) - ['active', 'hold', 'limbo', 'leads', 'complete'].indexOf(b.list); });
		var cap = S.more.projects || S.q ? rows.length : 50;
		return '<div class="dwdc-chips">' + chip('all', 'All') + chip('active', 'Active') + chip('hold', 'On hold') + chip('limbo', 'In limbo') + chip('leads', 'Leads') + chip('complete', 'Completed') + '</div>'
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-projects head tint-navy"><span>Project</span><span>Client</span><span>Status</span><span>Billed</span><span>Hosting</span><span class="r">Last activity</span></div>'
			+ (rows.length ? rows.slice(0, cap).map(function (c) {
				return '<div class="dwdc-grid g-projects row" data-go="client/' + c.id + '"><span class="dwdc-nm"><span><b>' + esc(c.name) + '</b><small>' + esc([c.job || site(c), c.lead_source && 'via ' + c.lead_source].filter(Boolean).join(' · ')) + '</small></span></span>' + clientCell(c)
					+ '<span>' + pill(c.list === 'leads' ? 'Lead' : LABEL[c.list] || c.list, c.list === 'leads' ? 'orange' : TONE[c.list] || 'gray') + '</span><span class="b">' + (lifetime(c) ? money(lifetime(c)) : '—') + '</span>'
					+ '<span>' + (num(c.hosting) ? money(c.hosting) + '/yr' : '<span class="mut">—</span>') + '</span><span class="r mut">' + ago(c.updated) + '</span></div>';
			}).join('') : emptyRow('No projects match.')) + moreFoot('projects', cap, rows.length) + '</div>';
	}
	function personView(id) {
		var k = clientRec(id);
		if (!k) { return '<div class="dwdc-card">' + emptyRow('Client not found.') + '</div>'; }
		var order = ['active', 'limbo', 'hold', 'leads', 'complete', 'archive'];
		var pp = projectsOf(id).sort(function (a, b) { return order.indexOf(a.list) - order.indexOf(b.list) || byDone(a, b); });
		var type = clientType(id), first = pp.filter(isOpen)[0], host = pp.filter(function (c) { return num(c.hosting) > 0; });
		var paid = pp.reduce(function (s, c) { return s + lifetime(c); }, 0), ow = owed(pp);
		var ids = pp.map(function (c) { return c.id; }), tasks = S.tasks.filter(function (t) { return ids.indexOf(t.contact) > -1; }).sort(function (a, b) { return a.done - b.done; });
		var biz = k.company || (pp[0] && pp[0].name !== k.name ? pp[0].name : '');
		var btn = function (cls, attr, label) { return '<button class="dwdc-btn2 ' + cls + '" ' + attr + '>' + label + '</button>'; };
		var acts = first ? btn('', 'data-act="pay" data-project="' + first.id + '"', 'Log payment')
			+ (first.list === 'limbo' ? btn('', 'data-pset="active" data-pid="' + first.id + '"', 'Back to active') : btn('', 'data-pset="limbo" data-pid="' + first.id + '"', 'Move to limbo'))
			+ (first.list === 'hold' ? btn('', 'data-pset="active" data-pid="' + first.id + '"', 'Resume') : btn('', 'data-pset="hold" data-pid="' + first.id + '"', 'Put on hold'))
			+ btn('solid navy', 'data-pset="complete" data-pid="' + first.id + '"', 'Mark complete')
			: (pp.length ? '' : btn('red', 'data-delclient="' + k.id + '"', 'Delete client')) + btn('solid navy', 'data-act="job" data-client="' + k.id + '"', '+ New project');
		var f = function (n, label, t) { return '<label><span>' + label + '</span><input name="' + n + '" type="' + (t || 'text') + '" value="' + esc(k[n]) + '"></label>'; };
		var tl = [];
		pp.forEach(function (c) {
			if (c.last_entry_date) { tl.push({ d: c.last_entry_date, t: c.last_entry + ' form received', tone: 'blue' }); }
			if (c.last_pay) { tl.push({ d: c.last_pay.date, t: 'Payment of ' + money(c.last_pay.amount) + ' recorded · ' + c.name, tone: 'deep' }); }
			if (c.completed) { tl.push({ d: c.completed, t: 'Completed: ' + c.name, tone: 'navy' }); }
			if (!imported(c)) { tl.push({ d: c.created, t: 'Project added: ' + c.name, tone: 'navy' }); }
		});
		tl.sort(function (a, b) { return (d(a.d) || 0) < (d(b.d) || 0) ? 1 : -1; });
		var bk = S.back || 'clients', bn = { home: 'home', leads: 'leads & onboarding', forms: 'form entries', todos: 'to-do list', hosting: 'hosting', projects: 'projects', clients: 'clients', archive: 'archive', search: 'search' }[bk.split('/')[0]] || 'clients';
		return '<a class="dwdc-back" href="#' + bk + '">' + ic('left', 14) + 'Back to ' + bn + '</a>'
			+ '<div class="dwdc-card dwdc-chead"><div class="dwdc-chead-t"><h2>' + esc(k.name) + ' ' + pill(type, CTYPE_TONE[type]) + '</h2><p>' + [biz ? '<b class="navy">' + esc(biz) + '</b>' : '', k.email ? '<a href="mailto:' + esc(k.email) + '">' + esc(k.email) + '</a>' : '', k.phone ? '<a href="tel:' + esc(k.phone.replace(/[^\d+]/g, '')) + '">' + esc(k.phone) + '</a>' : ''].filter(Boolean).join('<i>·</i>') + '</p></div>'
			+ '<div class="dwdc-chead-a">' + acts + '</div></div>'
			+ (S.edit ? '<form class="dwdc-card pad dwdc-clientf"><div class="dwdc-cardh"><h2>Edit client</h2></div><div class="dwdc-fgrid">' + f('name', 'Name') + f('company', 'Business') + f('email', 'Email', 'email') + f('phone', 'Phone')
				+ '<label class="wide"><span>Notes</span><textarea name="notes" rows="3">' + esc(k.notes) + '</textarea></label></div><div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-edit>Cancel</button><button class="dwdc-btn">Save</button></div></form>' : '')
			+ '<div class="dwdc-minis">' + mini('navy', 'Contract value', money(paid + ow)) + mini('deep', 'Paid', money(paid)) + mini(ow ? 'deep' : 'navy', 'Owed', money(ow)) + mini('navy', 'Projects', pp.length) + '</div>'
			+ '<div class="dwdc-two"><div class="dwdc-col">'
			+ '<section class="dwdc-card"><div class="dwdc-cardh pad2"><h2>Projects</h2><button class="dwdc-lnk" data-act="job" data-client="' + k.id + '">' + ic('plus', 13) + 'New project</button></div>'
			+ (pp.length ? pp.map(function (c) {
				var o = num(c.balance), late = c.deadline && c.deadline < DWDC.today && isOpen(c);
				return '<div class="dwdc-pcard" data-go="client/' + c.id + '"><div class="dwdc-pcard-h">' + dot(c) + '<span><b>' + esc(c.name) + '</b>' + (site(c) ? siteLine(c) : '') + (c.job ? '<small>' + esc(c.job) + '</small>' : '') + '</span>' + statusPill(c) + '</div>'
					+ '<div class="dwdc-pstats"><span><small>' + (c.list === 'complete' ? 'Billed' : 'Price') + '</small><b>' + (lifetime(c) || num(c.price) ? money(c.list === 'complete' ? lifetime(c) : c.price || lifetime(c)) : '—') + '</b></span><span><small>Owed</small><b class="' + (o ? 'deep' : '') + '">' + (o ? money(o) : 'Paid') + '</b></span><span><small>' + (c.list === 'complete' ? 'Completed' : 'Due') + '</small><b class="' + (late ? 'deep' : '') + '">' + (c.list === 'complete' ? (doneDate(c) ? fmt(doneDate(c), true) : '—') : (c.deadline ? fmt(c.deadline) : '—')) + '</b></span>'
					+ (num(c.hosting) ? '<span><small>Hosting</small><b>' + money(c.hosting) + '/yr</b></span>' : '') + '</div>'
					+ (c.next && isOpen(c) ? '<div class="dwdc-nextp"><small>Next</small> ' + esc(c.next) + '</div>' : '') + '</div>';
			}).join('') : emptyRow('No projects yet.')) + '</section>'
			+ '<section class="dwdc-card"><div class="dwdc-cardh pad2"><h2>Details</h2><button class="dwdc-lnk" data-edit>' + (S.edit ? 'Close' : 'Edit') + '</button></div><dl class="dwdc-dl pad2">'
			+ '<dt>Client</dt><dd>' + esc(k.name) + '</dd><dt>Business</dt><dd>' + esc(biz || '—') + '</dd><dt>Email</dt><dd>' + (k.email ? '<a href="mailto:' + esc(k.email) + '">' + esc(k.email) + '</a>' : '—') + '</dd><dt>Phone</dt><dd>' + esc(k.phone || '—') + '</dd>'
			+ '<dt>Hosting</dt><dd>' + (host.length ? host.length + ' site' + (host.length > 1 ? 's' : '') + ' · ' + money(host.reduce(function (s, c) { return s + num(c.hosting); }, 0)) + '/yr' : 'No') + '</dd>'
			+ '<dt>Source</dt><dd>' + esc((pp.filter(function (c) { return c.lead_source; })[0] || {}).lead_source || sourceOf(pp[0] || {}) || '—') + '</dd><dt>Client since</dt><dd>' + (pp.length && pp.every(imported) ? '—' : fmt(k.created, true)) + '</dd>'
			+ (k.notes ? '<dt>Notes</dt><dd>' + esc(k.notes).replace(/\n/g, '<br>') + '</dd>' : '') + '</dl></section>'
			+ '</div><div class="dwdc-col">'
			+ '<section class="dwdc-card"><div class="dwdc-cardh pad2"><h2>To-Dos <span class="dwdc-cnt">' + tasks.filter(function (t) { return !t.done; }).length + '</span></h2></div><div class="pad2">'
			+ (tasks.length ? '<div class="dwdc-todos">' + tasks.map(function (t) { return todoRow(t); }).join('') + '</div>' : '')
			+ (pp.length ? '<form class="dwdc-addbar home" data-contact="' + (first || pp[0]).id + '"><input name="text" placeholder="Add a to-do for ' + esc((first || pp[0]).name) + '..." autocomplete="off" required><button class="dwdc-btn">Add</button></form>' : '') + '</div></section>'
			+ '<section class="dwdc-card"><div class="dwdc-cardh pad2"><h2>Activity</h2></div><ol class="dwdc-tl pad2">' + tl.slice(0, 12).map(function (x) { return '<li class="t-' + x.tone + '"><i></i><div><p>' + esc(x.t) + '</p><time>' + ago(x.d) + '</time></div></li>'; }).join('') + '</ol></section>'
			+ '</div></div>';
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
		var backName = { home: 'home', leads: 'leads & onboarding', forms: 'form entries', todos: 'to-do list', hosting: 'hosting', projects: 'projects', clients: 'clients', archive: 'archive', search: 'search' }[(S.back || 'home').split('/')[0]] || 'home';
		var tasks = S.tasks.filter(function (t) { return t.contact === c.id; }).sort(function (a, b) { return a.done - b.done; }), openN = tasks.filter(function (t) { return !t.done; }).length;
		var btn = function (cls, attr, label) { return '<button class="dwdc-btn2 ' + cls + '" ' + attr + '>' + label + '</button>'; };
		var acts = '';
		if (st === 'active' || st === 'hold' || st === 'limbo') {
			acts = (ow ? btn('', 'data-paid', 'Mark paid') : '') + (st !== 'active' ? btn('', 'data-set="active"', 'Back to active') : '')
				+ (st !== 'hold' ? btn('greenl', 'data-set="hold"', 'Put on hold') : '') + (st !== 'limbo' ? btn('', 'data-set="limbo"', 'Move to limbo') : '') + btn('solid green', 'data-complete', 'Mark complete');
		} else if (st === 'leads') {
			acts = btn('', 'data-set="archive"', 'Archive') + btn('solid blue', 'data-set="active"', 'Start the job');
		} else if (st === 'archive') {
			acts = btn('', 'data-set="leads"', 'Restore to leads') + btn('red', 'data-trash="' + c.id + '"', 'Delete');
		} else {
			acts = (ow ? btn('', 'data-paid', 'Mark paid') : '') + btn('solid blue', 'data-act="job" data-client="' + (c.client || 0) + '"', '+ New project for this client');
		}
		var mail = c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '';
		var kc = clientOf(c);
		var line = [(kc ? 'Client: <a href="#cl/' + kc.id + '"><b>' + esc(kc.name) + '</b></a>' : esc(c.person || 'No client linked')) + ' <button class="dwdc-lnk sm2" data-moveclient="' + c.id + '">Change</button>', mail, c.phone ? '<a href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>' : '', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : ''].filter(Boolean).join('<i>·</i>');
		var tone = st === 'leads' ? 'orange' : TONE[st];
		return '<a class="dwdc-back" href="#' + S.back + '">' + ic('left', 14) + 'Back to ' + backName + '</a>'
			+ '<div class="dwdc-card dwdc-chead">' + avatar(c, 64, tone) + '<div class="dwdc-chead-t"><h2>' + esc(c.name) + ' ' + pill(st === 'leads' ? (STAGES.filter(function (s) { return s[0] === stageOf(c); })[0] || ['', 'Lead'])[1] : LABEL[st], st === 'leads' ? STAGE_TONE[stageOf(c)] : tone) + (num(c.hosting) ? ' ' + pill('Hosting', 'teal') : '') + '</h2><p>' + line + '</p></div>'
			+ '<div class="dwdc-chead-a">' + btn('', 'data-edit', S.edit ? 'Close edit' : 'Edit') + acts + '</div></div>'
			+ '<div class="dwdc-minis">' + mini('navy', 'Price', price ? money(price) : '—') + mini('green', 'Paid', price ? money(Math.max(0, price - ow)) : '—')
			+ '<div class="dwdc-mini"><small>Owed</small><strong class="' + (ow ? 'orange' : 'green') + '">' + (ow ? money(ow) : 'Paid') + '</strong></div>'
			+ (st === 'complete' ? mini('navy', 'Total spent', money(lifetime(c))) : '<div class="dwdc-mini"><small>Due</small><strong class="' + (late ? 'red' : '') + '">' + (c.deadline ? fmt(c.deadline) : '—') + '</strong></div>') + '</div>'
			+ '<div class="dwdc-two">'
			+ '<div class="dwdc-col">'
			+ onboardCard(c, full)
			+ markupCard(c)
			+ sourceCard(c)
			+ (num(c.hosting) ? hostCard(c) : '')
			+ (S.edit ? editCard(c) : detailsCard(c))
			+ peopleCard(c)
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
	// Where the project came from, and (unless it came through Upwork) how they pay.
	var SOURCES = ['Upwork', 'Google', 'Referral', 'Reference', 'Repeat client', 'Website', 'Social media', 'Other'];
	var PAYS = ['Upwork', 'Stripe', 'PayPal', 'Zelle', 'Check', 'Cash', 'Bank transfer', 'Venmo', 'Other'];
	// Payment method colors: Upwork green, PayPal blue, Stripe bright blue.
	function payClass(m) { return m ? ' pm-' + String(m).toLowerCase().replace(/[^a-z]/g, '') : ''; }
	function sourceCard(c) {
		var opt = function (list, cur, ph) { return '<option value="">' + ph + '</option>' + list.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + o + '</option>'; }).join(''); };
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Lead source &amp; payment</h2></div><div class="dwdc-srcrow">'
			+ '<label><span>Where they came from</span><select class="dwdc-sel' + payClass(c.lead_source === 'Upwork' ? 'Upwork' : '') + '" data-field="lead_source">' + opt(SOURCES, c.lead_source, 'Select a source…') + '</select></label>'
			+ '<label><span>How they pay</span><select class="dwdc-sel' + payClass(c.pay_method) + '" data-field="pay_method">' + opt(PAYS, c.pay_method, c.lead_source === 'Upwork' ? 'Through Upwork, or outside it?' : 'Select a payment method…') + '</select></label>'
			+ '</div></section>';
	}
	// Markup: open the workspace, paste the client's review link, and email it to them.
	function markupCard(c) {
		var em = c.email || ((clientOf(c) || {}).email) || '';
		return '<section class="dwdc-card pad dwdc-mkcard"><div class="dwdc-cardh"><h2>Markup review</h2><a class="dwdc-mklink" href="' + esc(DWDC.markupHome) + '" target="_blank" rel="noopener">' + ic('wp', 14) + 'Open Markup</a></div>'
			+ '<p class="dwdc-mutp">1. Open Markup and add the staging link. 2. Paste the review link Markup gives you below. 3. Email it to the client.</p>'
			+ '<form class="dwdc-markupf"><label><span>Client’s Markup link</span><input name="markup" type="url" value="' + esc(c.markup) + '" placeholder="https://app.markup.io/…"></label>'
			+ (em ? '' : '<label><span>Client’s email</span><input name="email" type="email" placeholder="Needed to send the link"></label>')
			+ '<div class="dwdc-mkacts"><button class="dwdc-btn2">Save link</button>'
			+ (c.markup ? '<a class="dwdc-btn2" href="' + esc(url(c.markup)) + '" target="_blank" rel="noopener">Open their link</a>' : '')
			+ '<button type="button" class="dwdc-btn" data-mksend>' + ic('right', 14) + 'Email link to client</button></div>'
			+ (c.markup_sent ? '<p class="dwdc-mksent">' + ic('check', 14) + 'Sent to ' + esc(em) + ' on ' + fmt(c.markup_sent, true) + '</p>' : '')
			+ '</form></section>';
	}
	function onboardCard(c, full) {
		var list = full ? onboardEntries(c) : [], ob = list.some(function (e) { return /onboard/i.test(e.form || ''); });
		var n = list.reduce(function (s, e) { return s + (e.fields || []).length; }, 0);
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>' + (ob || !list.length ? 'Onboarding' : 'Form answers') + '</h2>' + (list.length ? '<span class="dwdc-cnt">' + n + ' answers</span>' : '') + '</div>'
			+ (!full ? '<p class="dwdc-mutp">Loading…</p>' : list.length
				? '<p class="dwdc-mutp">' + esc(list[0].form || 'Form') + ' · ' + fmt(list[0].date, true) + (list.length > 1 ? ' (+' + (list.length - 1) + ' more)' : '') + '</p><div class="dwdc-obbtns"><button class="dwdc-btn dwdc-copyob" data-copyob>' + ic('todo', 15) + 'Copy answers</button><button class="dwdc-btn2 dwdc-viewob" data-viewob>' + ic('list', 15) + 'View answers</button></div>'
				: '<p class="dwdc-mutp">No onboarding form from this client yet.</p>') + '</section>';
	}
	function peopleOf(c) {
		var list = (c.contacts || []).slice(), key = function (x) { return String(x.email || x.name || '').toLowerCase(); };
		var mk = String(c.email || c.person || '').toLowerCase();
		if ((c.person || c.email) && !list.some(function (x) { return key(x) === mk || (c.person && x.name === c.person && (!x.email || !c.email)); })) {
			list.unshift({ name: c.person || '', email: c.email || '', phone: c.phone || '', role: '' });
		}
		list.forEach(function (x) { x.main = !!mk && (key(x) === mk || (!c.email && x.name === c.person)); });
		list.sort(function (a, b) { return b.main - a.main; });
		return list;
	}
	function peopleCard(c) {
		var ppl = peopleOf(c);
		var rows = ppl.map(function (x, i) {
			var bits = [x.email ? '<a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a>' : '', x.phone ? '<a href="tel:' + esc(x.phone.replace(/[^\d+]/g, '')) + '">' + esc(x.phone) + '</a>' : ''].filter(Boolean).join('<i>·</i>');
			return '<li class="dwdc-ppl' + (x.main ? ' main' : '') + '"><div><b>' + esc(x.name || x.email) + '</b>' + (x.role ? '<em>' + esc(x.role) + '</em>' : '') + (bits ? '<span>' + bits + '</span>' : '') + '</div>'
				+ (x.main ? '<strong class="dwdc-mainpill">Main contact</strong>' : '<div class="dwdc-pplact"><button class="dwdc-btn2 sm" data-pplmain="' + i + '">Make main</button><button class="dwdc-lnk sm2" data-pplrm="' + i + '" title="Remove">Remove</button></div>') + '</li>';
		}).join('');
		var form = S.addPpl === c.id ? '<form class="dwdc-pplf"><input name="name" placeholder="Name"><input name="email" type="email" placeholder="Email"><input name="phone" placeholder="Phone"><input name="role" placeholder="Role (e.g. office manager)"><div class="dwdc-pplfa"><button type="button" class="dwdc-btn2" data-ppladd="0">Cancel</button><button class="dwdc-btn">Add contact</button></div></form>' : '';
		return '<section class="dwdc-card pad dwdc-pplcard"><div class="dwdc-cardh"><h2>Contacts' + (ppl.length > 1 ? ' <span class="dwdc-cnt">' + ppl.length + '</span>' : '') + '</h2><button class="dwdc-lnk" data-ppladd="1">+ Add</button></div>'
			+ (ppl.length ? '<ul class="dwdc-ppll">' + rows + '</ul>' : '<p class="dwdc-mutp">No contacts yet.</p>')
			+ (ppl.length > 1 ? '<p class="dwdc-mutp sm">Everyone on this project’s emails. Pick who’s the main contact.</p>' : '') + form + '</section>';
	}
	function savePeople(c, ppl, main) {
		var data = { contacts: ppl.map(function (x) { return { name: x.name, email: x.email, phone: x.phone, role: x.role }; }) };
		if (main) { data.person = main.name; data.email = main.email; data.phone = main.phone || ''; }
		return save(c.id, data, main ? (main.name || main.email) + ' is now the main contact' : 'Contacts saved').then(function (x) {
			var k = clientOf(c);
			if (main && k && S.contacts.filter(function (p) { return p.client === k.id; }).length === 1 && main.name) {
				return api('/client/' + k.id, 'POST', { name: main.name, email: main.email, phone: main.phone || k.phone }).then(reload).then(render);
			}
			return x;
		});
	}
	function linkify(t) {
		return esc(t).replace(/(https?:\/\/[^\s<]+)/g, function (u) { var d = u.replace(/^https?:\/\/(www\.)?/, '').replace(/[/?#].*$/, ''); return '<a href="' + u + '" target="_blank" rel="noopener">' + d + ic('link', 12) + '</a>'; });
	}
	function answersHtml(fields) {
		var tiles = [], blocks = [];
		fields.forEach(function (x) {
			var v = String(x.value || '').trim(), lab = String(x.label || '');
			if (!v) { return; }
			var low = lab.toLowerCase(), lines = v.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
			if (/social|links?$/.test(low) || lines.every(function (l) { return /https?:\/\//.test(l); }) && lines.length > 1) {
				blocks.push('<section class="dwdc-ans"><h4>' + esc(lab) + '</h4><div class="dwdc-ans-chips">' + lines.map(function (l) {
					var mm = l.match(/^([^:]{2,24}):\s*(https?:\/\/\S+)/), u = mm ? mm[2] : (l.match(/https?:\/\/\S+/) || [''])[0], name = mm ? mm[1] : u.replace(/^https?:\/\/(www\.)?/, '').replace(/[/?#].*$/, '');
					return u ? '<a class="dwdc-ans-chip" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(name) + ic('link', 12) + '</a>' : '<span class="dwdc-ans-chip">' + esc(l) + '</span>';
				}).join('') + '</div></section>');
				return;
			}
			if (v.length <= 60 && lines.length <= 2) {
				var val = /@/.test(v) && /email/.test(low) ? '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>'
					: /phone/.test(low) ? '<a href="tel:' + esc(v.replace(/[^\d+]/g, '')) + '">' + esc(v.replace(/^\+?1?(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3')) + '</a>'
					: lines.map(linkify).join('<br>');
				tiles.push('<div class="dwdc-ans-tile"><small>' + esc(lab) + '</small><b>' + val + '</b></div>');
				return;
			}
			// long answer: paragraphs; runs of short lines become a bullet list
			var html = '', run = [];
			var flush = function () { if (run.length > 1) { html += '<ul>' + run.map(function (l) { return '<li>' + linkify(l) + '</li>'; }).join('') + '</ul>'; } else if (run.length) { html += '<p>' + linkify(run[0]) + '</p>'; } run = []; };
			v.split(/\n\s*\n/).forEach(function (para) {
				var ls = para.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
				if (ls.length > 1 && ls[0].length < 40 && !/[.:]$/.test(ls[0]) && ls.slice(1).every(function (l) { return l.length < 90; })) { html += '<h5>' + esc(ls[0]) + '</h5>'; ls = ls.slice(1); }
				ls.forEach(function (l) { if (l.length < 90 && !/[.!?]$/.test(l)) { run.push(l); } else { flush(); html += '<p>' + linkify(l) + '</p>'; } });
				flush();
			});
			blocks.push('<section class="dwdc-ans"><h4>' + esc(lab) + '</h4><div class="dwdc-ans-body">' + html + '</div></section>');
		});
		return (tiles.length ? '<div class="dwdc-ans-grid">' + tiles.join('') + '</div>' : '') + blocks.join('');
	}
	function detailsCard(c) {
		var row = function (k, v) { return '<dt>' + k + '</dt><dd>' + (v || '<span class="mut">—</span>') + '</dd>'; };
		var k = clientOf(c) || {}, em = c.email || k.email, ph = c.phone || k.phone;
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Details</h2><button class="dwdc-lnk" data-edit>Edit</button></div><dl class="dwdc-dl">'
			+ row('Main contact', esc(c.person || k.name)) + row('Email', em ? '<a href="mailto:' + esc(em) + '">' + esc(em) + '</a>' : '') + row('Phone', esc(ph))
			+ row('Company', esc(c.company)) + row('Website', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : '')
			+ row('Project', esc(c.job)) + row('Markup', c.markup ? '<a href="' + esc(url(c.markup)) + '" target="_blank" rel="noopener">Open Markup link</a>' : '<button class="dwdc-lnk" data-markup="' + c.id + '">Add link</button>') + row('Source', esc(sourceOf(c))) + row('Started', imported(c) ? '' : fmt(c.created, true)) + '</dl></section>';
	}
	function editCard(c) {
		var f = function (k, label, type, ph) { return '<label><span>' + label + '</span><input name="' + k + '" type="' + (type || 'text') + '" value="' + esc(c[k]) + '" placeholder="' + esc(ph || '') + '"></label>'; };
		return '<form class="dwdc-card pad dwdc-editf"><div class="dwdc-cardh"><h2>Edit details</h2></div><div class="dwdc-fgrid">'
			+ f('name', 'Client / business') + f('person', 'Contact person') + f('email', 'Email', 'email') + f('phone', 'Phone') + f('company', 'Company') + f('website', 'Website')
			+ '<label class="wide"><span>Project (current job)</span><input name="job" value="' + esc(c.job) + '" placeholder="e.g. Booking site redesign"></label>'
			+ '<label class="wide"><span>Markup link</span><input name="markup" value="' + esc(c.markup) + '" placeholder="Paste the markup.io link"></label>'
			+ '<label class="wide"><span>Next step (shows on the job card)</span><input name="next" value="' + esc(c.next) + '" placeholder="e.g. Send wireframes Friday"></label>'
			+ f('price', 'Price ($)') + f('balance', 'Still owed ($)') + f('deadline', 'Due date', 'date') + f('source', 'Source', 'text', 'e.g. Referral, Upwork')
			+ f('hosting', 'Hosting ($/yr)') + f('renewal', 'Hosting renews', 'date') + f('billed', 'Paid on Upwork, lifetime ($)') + f('stripe', 'Paid by Stripe ($)') + f('paypal', 'Paid by PayPal ($)')
			+ '</div><div class="dwdc-farow"><button type="button" class="dwdc-lnk red" data-trash="' + c.id + '">Delete client</button><span><button type="button" class="dwdc-btn2" data-edit>Cancel</button><button class="dwdc-btn">Save</button></span></div></form>';
	}
	function jobsCard(c) {
		var all = (num(c.price) || c.job ? [{ title: c.job || 'Current job', price: c.price, date: c.list === 'active' || c.list === 'hold' || c.list === 'limbo' ? 'In progress' : (c.completed ? fmt(c.completed, true) : ''), cur: true }] : [])
			.concat((c.jobs || []).map(function (j, i) { return { title: j.title, price: j.price, date: j.date, i: i }; }).reverse());
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Jobs &amp; spend</h2><span class="dwdc-total">' + money(lifetime(c)) + ' total</span></div>'
			+ [['billed', 'Paid on Upwork'], ['stripe', 'Paid by Stripe'], ['paypal', 'Paid by PayPal']].filter(function (k) { return num(c[k[0]]); }).map(function (k) { return '<div class="dwdc-upw"><span>' + k[1] + '</span><b>' + money(c[k[0]]) + '</b></div>'; }).join('')
			+ ((c.payments || []).length ? '<details class="dwdc-pays"><summary>Payment history (' + c.payments.length + ')</summary><div>' + c.payments.map(function (x) {
				return '<div class="dwdc-pay"><span>' + fmt(x.date, true) + '<small>' + esc([x.source, x.ref, x.note].filter(Boolean).join(' · ')) + '</small></span><b class="' + (x.status === 'paid' ? 'green' : x.status === 'open' ? 'orange' : 'mut') + '">' + money(x.amount) + (x.status && x.status !== 'paid' ? ' <em>' + esc(x.status) + '</em>' : '') + '</b></div>';
			}).join('') + '</div></details>' : '')
			+ (all.length ? '<div class="dwdc-jobs">' + all.map(function (j) {
				return '<div class="dwdc-jobrow"><span><b>' + esc(j.title) + '</b>' + (j.date ? '<small>' + esc(j.date) + '</small>' : '') + '</span><strong>' + (num(j.price) ? money(j.price) : '—') + '</strong>'
					+ (j.cur ? '<i></i>' : '<button class="dwdc-del" data-del-job="' + j.i + '" title="Remove">' + ic('x', 14) + '</button>') + '</div>';
			}).join('') + '</div>' : '<p class="dwdc-mutp">No jobs logged yet.</p>')
			+ '<form class="dwdc-logjob"><input name="title" placeholder="Log an older job" required><input name="price" placeholder="$" inputmode="decimal"><input name="date" placeholder="When"><button class="dwdc-btn2">Log</button></form></section>';
	}
	/* ---------- hosting profile (one hosted website) ---------- */
	function hostPays(c) {
		var list = (c.payments || []).filter(function (x) { return x.status === 'paid' && /host|renew/i.test([x.note, x.ref].join(' ')); }).map(function (x) {
			return { date: x.date, amount: x.amount, by: x.source, what: x.note || x.ref || 'Hosting payment' };
		});
		(c.files || []).forEach(function (e) {
			if (!/hosting/i.test(e.form || '')) { return; }
			var ord = (e.fields || []).filter(function (f) { return f.id === 'order'; })[0];
			var amt = ord ? (String(ord.value).match(/\$([\d.,]+)/) || [])[1] : '';
			list.push({ date: e.date, amount: amt, by: 'WooCommerce', what: (e.form || 'Hosting order') + (ord ? ' · ' + String(ord.value).split(' ')[0] : '') });
		});
		return list.sort(function (a, b) { return (d(a.date) || 0) < (d(b.date) || 0) ? 1 : -1; });
	}
	function hostView(id) {
		var c = S.full[id] || contact(id);
		if (!c) { return '<div class="dwdc-card">' + emptyRow('Loading…') + '</div>'; }
		var full = !!S.full[id], k = clientOf(c), on = subActive(c), n = c.renewal ? daysTo(c.renewal) : null;
		var pays = full ? hostPays(c) : [], dom = site(c) || c.name;
		var st = on ? ['Auto-renew', 'blue', 'Charged automatically' + (c.sub.next ? ' · next ' + fmt(c.sub.next, true) : '')]
			: n === null ? ['No date', 'steel', 'Set the renewal date in Details']
			: n < 0 ? ['Overdue', 'deep', 'Was due ' + fmt(c.renewal, true)]
			: n <= 30 ? ['Due soon', 'blue', 'Due ' + fmt(c.renewal, true)]
			: ['Paid', 'navy', 'Paid through ' + fmt(c.renewal, true)];
		var btn = function (cls, attr, label) { return '<button class="dwdc-btn2 ' + cls + '" ' + attr + '>' + label + '</button>'; };
		return '<a class="dwdc-back" href="#hosting">' + ic('left', 14) + 'Back to hosting</a>'
			+ '<div class="dwdc-card dwdc-chead"><div class="dwdc-chead-t"><h2>' + esc(dom) + ' ' + pill(st[0], st[1]) + '</h2><p>'
			+ [k ? 'Client: <a href="#cl/' + k.id + '"><b>' + esc(k.name) + '</b></a>' : esc(c.person || ''), c.website ? '<a href="' + esc(url(c.website)) + '" target="_blank" rel="noopener">Visit site</a>' : '', '<a href="#client/' + c.id + '">Project: ' + esc(c.name) + '</a>'].filter(Boolean).join('<i>·</i>') + '</p></div>'
			+ '<div class="dwdc-chead-a">' + btn('', 'data-edit', S.edit ? 'Close edit' : 'Edit') + btn('solid navy', 'data-act="pay" data-project="' + c.id + '" data-renew="1"', 'Log renewal payment') + '</div></div>'
			+ '<div class="dwdc-minis">' + mini('navy', 'Price', money(c.hosting) + ' / year')
			+ mini('deep', 'Years paid', pays.length || (on ? 1 : 0))
			+ '<div class="dwdc-mini"><small>Status</small><strong class="' + (n !== null && n < 0 && !on ? 'deep' : '') + '">' + esc(st[0]) + '</strong><span class="dwdc-mini-sub">' + esc(st[2]) + '</span></div></div>'
			+ '<div class="dwdc-two"><div class="dwdc-col">' + hostCard(c) + '</div><div class="dwdc-col">' + (S.edit ? editCard(c) : detailsCard(c)) + '</div></div>'
			+ '<section class="dwdc-card"><div class="dwdc-cardh pad2"><h2>Payments <span class="dwdc-cnt">' + pays.length + '</span></h2></div>'
			+ (!full ? emptyRow('Loading…') : pays.length ? '<div class="pad2">' + pays.map(function (x) {
				return '<div class="dwdc-pay"><span><b>' + fmt(x.date, true) + '</b><small>' + esc([x.what, x.by].filter(Boolean).join(' · ')) + '</small></span><b>' + (num(x.amount) ? money(x.amount) : '—') + '</b></div>';
			}).join('') + '</div>' : emptyRow('No hosting payments recorded yet. Payments through the website (Stripe/WooCommerce) show up here automatically, or use “Log renewal payment”.'))
			+ '</section>';
	}
	function hostCard(c) {
		var on = subActive(c), n = c.renewal ? daysTo(c.renewal) : null;
		var box = on
			? '<div class="dwdc-subbox ok"><span>' + ic('check', 18) + '</span><div><strong>Annual subscription active</strong><small>' + money(num(c.sub.amount) || c.hosting) + '/yr' + (c.sub.method ? ' · ' + esc(c.sub.method) : '') + (c.sub.next ? ' · next charge ' + fmt(c.sub.next, true) : '') + '</small></div></div>'
			: '<div class="dwdc-subbox no"><span>!</span><div><strong>No active subscription</strong><small>' + (c.sub ? 'Their subscription is ' + esc(c.sub.status) + '. ' : '') + (c.renewal ? (n < 0 ? 'Renewal was due ' : 'Renews ') + fmt(c.renewal, true) + '. ' : '') + 'Send a link to pay ' + money(c.hosting) + ' and turn on yearly auto-renew.</small></div></div>'
				+ '<form class="dwdc-payf">' + (c.email ? '' : '<input name="email" type="email" placeholder="Client’s email (needed to send the link)" required>')
				+ '<button class="dwdc-btn">' + ic('right', 14) + 'Email payment link</button><button type="button" class="dwdc-btn2" data-copy>Copy link</button></form>';
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Hosting</h2>' + (on ? pill('Auto-renew', 'green') : pill('Not on auto-pay', 'amber')) + '</div>' + box
			+ '<form class="dwdc-hostprice"><label><span>Price per year</span><span class="dwdc-pricein">$<input name="hosting" inputmode="decimal" value="' + esc(num(c.hosting) || '') + '"></span></label><label><span>Renews</span><input name="renewal" type="date" value="' + esc(c.renewal || '') + '"></label><button class="dwdc-btn2">Save</button></form>'
			+ '<p class="dwdc-mutp">The payment link charges this price and sets up a yearly subscription at the same amount.</p>'
			+ '<dl class="dwdc-dl">'
			+ (c.email ? '<dt>Payments</dt><dd><a href="' + esc(DWDC.orders + encodeURIComponent(c.email)) + '" target="_blank">View orders in WooCommerce</a></dd>' : '') + '</dl></section>';
	}
	function activityCard(c, full) {
		var items = [];
		if (full) {
			(c.notes || []).forEach(function (n) { items.push({ date: n.date, tone: 'blue', title: n.text, note: true }); });
			(c.files || []).forEach(function (e, i) { items.push({ date: e.date, tone: 'orange', title: (e.form || 'Form') + ' received', entry: e, open: false }); });
		}
		if (c.completed) { items.push({ date: c.completed, tone: 'green', title: 'Marked complete' }); }
		if (!imported(c)) { items.push({ date: c.created, tone: 'gray', title: 'Added to Dream Desk' + (c.source && !c.entry_count ? ' (' + c.source + ')' : '') }); }
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
		if (m.type === 'app') {
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal">' + head('Dream Desk', 'Get the', 'app') + appModal()
				+ '<div class="dwdc-farow end"><button type="button" class="dwdc-btn" data-close-modal>Done</button></div></div>';
		}
		if (m.type === 'answers') {
			var oc = S.full[m.project] || {}, ents = onboardEntries(oc);
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide">' + head('Onboarding', esc(oc.name || ''), 'answers')
				+ ents.map(function (e) { return '<p class="dwdc-mutp">' + esc(e.form || 'Form') + ' · ' + fmt(e.date, true) + '</p>' + answersHtml(e.fields || []); }).join('')
				+ '<div class="dwdc-farow end"><button type="button" class="dwdc-btn" data-copyob>' + ic('todo', 15) + 'Copy answers</button><button type="button" class="dwdc-btn2" data-close-modal>Close</button></div></div>';
		}
		if (m.type === 'pay') {
			var opts = S.contacts.filter(function (c) { return c.list !== 'archive'; }).sort(function (a, b) { return (isOpen(b) - isOpen(a)) || (num(b.balance) - num(a.balance)) || a.name.localeCompare(b.name); });
			body = '<form class="dwdc-modal dwdc-payform">' + head('Money', 'Log', 'payment') + '<div class="dwdc-fgrid">'
				+ '<label class="wide"><span>Project</span><select name="project" class="dwdc-sel" required><option value="">Choose a project…</option>' + opts.map(function (c) { return '<option value="' + c.id + '"' + (c.id === m.project ? ' selected' : '') + '>' + esc(c.name + (clientName(c) && clientName(c) !== c.name ? ' · ' + clientName(c) : '') + (num(c.balance) ? ' · ' + money(c.balance) + ' owed' : '')) + '</option>'; }).join('') + '</select></label>'
				+ inp('amount', 'Amount ($)', 'e.g. 1500') + '<label><span>Date</span><input name="date" type="date" value="' + esc(v.date || DWDC.today) + '"></label>'
				+ '<label><span>Paid by</span><select name="method" class="dwdc-sel">' + ['Stripe', 'PayPal', 'Zelle', 'Upwork', 'Check', 'Cash', 'Bank transfer', 'Venmo', 'Other'].map(function (o) { return '<option>' + o + '</option>'; }).join('') + '</select></label>'
				+ inp('note', 'Note', 'e.g. Deposit, final payment, hosting', '', false)
				+ '<label class="wide dwdc-chkl"><input type="checkbox" name="renew" value="1"' + (m.renew ? ' checked' : '') + '> This is a hosting renewal (moves the renewal date a year ahead)</label>'
				+ '</div><p class="dwdc-mutp">It’s added to the project’s payment history and taken off what they owe.</p><div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Log payment</button></div></form>';
		} else if (m.type === 'newclient') {
			body = '<form class="dwdc-modal dwdc-newclientf">' + head('Clients', 'New', 'client') + '<div class="dwdc-fgrid">'
				+ inp('name', 'Name', 'e.g. David Denninger', '', true) + inp('email', 'Email', '', 'email') + inp('phone', 'Phone') + inp('company', 'Company', '', '', true)
				+ '</div><div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Add client</button></div></form>';
		} else if (m.type === 'lead') {
			body = '<form class="dwdc-modal dwdc-leadform">' + head('Pipeline', 'New', 'lead') + '<div class="dwdc-fgrid">'
				+ inp('name', 'Name or business', 'e.g. Lakeside Dental', '', true) + inp('person', 'Contact person') + inp('email', 'Email', '', 'email') + inp('phone', 'Phone') + inp('company', 'Company')
				+ inp('source', 'Source', 'e.g. Referral, phone call, Upwork') + inp('website', 'Website')
				+ '<label class="wide"><span>Note</span><textarea name="note" rows="2" placeholder="What are they looking for?">' + esc(v.note || '') + '</textarea></label>'
				+ '</div><div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Add lead</button></div></form>';
		} else {
			var picked = m.client ? clientRec(m.client) : null, who, mv = m.type === 'move';
			if (picked) {
				var pp = projectsOf(picked.id);
				who = '<div class="dwdc-picked"><span><b>' + esc(picked.name) + '</b><small>' + esc([picked.email, pp.length + ' project' + (pp.length === 1 ? '' : 's')].filter(Boolean).join(' · ')) + '</small></span><button type="button" class="dwdc-lnk" data-unpick>Change</button></div>';
			} else if (m.newc) {
				who = '<div class="dwdc-fgrid">' + inp('client_name', 'Client’s name', 'e.g. David Denninger') + inp('email', 'Email', '', 'email') + inp('phone', 'Phone') + '</div>'
					+ '<button type="button" class="dwdc-lnk" data-oldc>' + ic('left', 14) + 'Pick an existing client instead</button>';
			} else if (m.invite && !mv) {
				who = '<div class="dwdc-invite"><p><b class="navy">New client.</b> Enter their email or phone number and send them the onboarding form. When they fill it out, their client profile and project are created automatically.</p>'
					+ '<label><span>Email or phone number</span><input name="invite_to" placeholder="name@business.com or (555) 555-5555" autocomplete="off" value="' + esc(v.invite_to || '') + '"></label>'
					+ (m.textMsg ? '<p>No email for a phone number, so text them this message:</p><textarea class="dwdc-sms" rows="4" readonly>' + esc(m.textMsg) + '</textarea><div class="dwdc-mkacts"><button type="button" class="dwdc-btn" data-copysms>Copy message</button><a class="dwdc-btn2" href="sms:' + esc((v.invite_to || '').replace(/[^\d+]/g, '')) + '?&body=' + encodeURIComponent(m.textMsg) + '">Open in Messages</a></div>'
						: '<button type="button" class="dwdc-btn wide" data-invite>' + ic('mail', 16) + 'Send them the onboarding form</button>')
					+ '</div><div class="dwdc-farow"><button type="button" class="dwdc-lnk" data-oldc>' + ic('left', 14) + 'Back to search</button><button type="button" class="dwdc-lnk" data-newc>Enter their details myself instead</button></div>';
			} else {
				who = '<label class="dwdc-search wide">' + ic('search', 16) + '<input class="dwdc-pick" placeholder="Start typing a client’s name, business or email…" autocomplete="off" value="' + esc(m.q || '') + '"></label><div class="dwdc-picks">' + pickList(m.q || '') + '</div>'
					+ (mv ? '<button type="button" class="dwdc-lnk" data-newc>' + ic('plus', 14) + 'New client</button>' : '<button type="button" class="dwdc-btn2 wide" data-newinvite>' + ic('plus', 15) + 'Add new client</button>');
			}
			if (mv) {
				var pj = contact(m.project);
				body = '<form class="dwdc-modal dwdc-moveform">' + head('Project', 'Change', 'client')
					+ '<p class="dwdc-mutp">Which client does <b>' + esc(pj ? pj.name : 'this project') + '</b> belong to?</p><h3 class="dwdc-mh">Client</h3>' + who
					+ '<div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Save</button></div></form>';
			} else {
				body = '<form class="dwdc-modal dwdc-jobform">' + head('New project', 'Add a', 'project')
					+ '<h3 class="dwdc-mh">Client</h3>' + who
					+ (!picked && !m.newc ? '</form>' : '<h3 class="dwdc-mh">The project</h3><div class="dwdc-fgrid">' + inp('name', 'Project name', 'The website or business, e.g. Denninger Law', '', true) + inp('title', 'What they hired you for', 'e.g. New website and logo', '', true)
					+ inp('price', 'Price ($)', '3000') + inp('balance', 'Still owed ($)', 'e.g. 1500 after deposit') + inp('deadline', 'Due date', '', 'date') + inp('website', 'Website', 'e.g. denningerlaw.com') + inp('next', 'Next step', 'e.g. Send wireframes', '', true) + '</div>'
					+ '<div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Add to active projects</button></div></form>');
			}
		}
		return '<div class="dwdc-overlay" data-close-modal></div>' + body;
	}
	function pickList(q) {
		q = q.toLowerCase().trim();
		if (!q) { return ''; }
		var r = S.clients.filter(function (k) { return !q || [k.name, k.email, k.company, projectsOf(k.id).map(function (c) { return c.name; }).join(' ')].join(' ').toLowerCase().indexOf(q) > -1; })
			.sort(function (a, b) { return a.name.localeCompare(b.name); }).slice(0, q ? 12 : 6);
		return r.length ? r.map(function (k) {
			var pp = projectsOf(k.id);
			return '<div class="dwdc-pickrow" data-pick="' + k.id + '"><span><b>' + esc(k.name) + '</b><small>' + esc([k.email, pp.map(function (c) { return c.name; }).slice(0, 3).join(', ')].filter(Boolean).join(' · ')) + '</small></span><em class="dwdc-cnt">' + pp.length + '</em></div>';
		}).join('') : '<div class="dwdc-none">No client matches “' + esc(q) + '”. Add them as a new client below.</div>';
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
		if (t.closest('[data-newmenu]')) { S.newOpen = !S.newOpen; var mm = app.querySelector('.dwdc-ph-menu'); if (mm) { mm.classList.toggle('open', S.newOpen); mm.querySelector('[data-newmenu]').setAttribute('aria-expanded', S.newOpen); } return; }
		if (S.newOpen && !t.closest('.dwdc-ph-menu')) { S.newOpen = false; var m2 = app.querySelector('.dwdc-ph-menu'); if (m2) { m2.classList.remove('open'); } }
		if (t.closest('.dwdc-ph-menu [role=menuitem]')) { S.newOpen = false; }
		if (t.closest('[data-close-modal]')) { S.modal = null; render(); return; }
		if ((el = t.closest('[data-pick]'))) { keepVals(); S.modal.client = +el.getAttribute('data-pick'); render(); focusIn('[name=name]'); return; }
		if (t.closest('[data-unpick]')) { keepVals(); S.modal.client = 0; render(); focusIn('.dwdc-pick'); return; }
		if (t.closest('[data-newc]')) { keepVals(); S.modal.newc = true; S.modal.vals.client_name = S.modal.vals.client_name || S.modal.q || ''; render(); focusIn('[name=client_name]'); return; }
		if ((el = t.closest('[data-moveclient]'))) { S.modal = { type: 'move', project: +el.getAttribute('data-moveclient'), client: 0, q: '', vals: {} }; render(); focusIn('.dwdc-pick'); return; }
		if (t.closest('[data-oldc]')) { keepVals(); S.modal.newc = false; S.modal.invite = false; S.modal.textMsg = ''; render(); focusIn('.dwdc-pick'); return; }
		if (t.closest('[data-newinvite]')) { keepVals(); S.modal.invite = true; S.modal.newc = false; var qq = S.modal.q || ''; if (/@|\d{3}/.test(qq)) { S.modal.vals.invite_to = qq; } render(); focusIn('[name=invite_to]'); return; }
		if ((el = t.closest('[data-invite]'))) {
			keepVals();
			var to = String(S.modal.vals.invite_to || '').trim();
			if (!to) { toast('Enter their email or phone number', true); return; }
			el.disabled = true;
			api('/invite', 'POST', { to: to }).then(function (x) {
				return reload().then(function () {
					if (x.sent) { S.modal = null; render(); toast('Onboarding form sent to ' + to); }
					else if (/@/.test(to)) { el.disabled = false; toast('The email didn’t send. Try again, or text them the link.', true); }
					else { S.modal.textMsg = x.text; render(); }
				});
			}).catch(function (er) { el.disabled = false; fail(er); });
			return;
		}
		if (t.closest('[data-copysms]')) {
			var sm = S.modal.textMsg;
			(navigator.clipboard ? navigator.clipboard.writeText(sm) : Promise.reject()).then(function () { toast('Message copied'); }, function () { prompt('Copy this message:', sm); });
			return;
		}
		if ((el = t.closest('[data-act]'))) {
			var a = el.getAttribute('data-act');
			S.modal = a === 'pay' ? { type: 'pay', renew: !!el.getAttribute('data-renew'), project: +el.getAttribute('data-project') || (route().view === 'client' || route().view === 'host' ? route().id : 0), vals: el.getAttribute('data-renew') ? { note: 'Hosting renewal' } : {} } : a === 'lead' ? { type: 'lead', vals: {} } : a === 'newclient' ? { type: 'newclient', vals: {} } : { type: 'job', client: +el.getAttribute('data-client') || 0, q: '', vals: {} };
			render(); focusIn(a === 'job' && !S.modal.client ? '.dwdc-pick' : '[name=name]'); return;
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
		if ((el = t.closest('[data-markup]'))) {
			e.stopPropagation();
			var mid = +el.getAttribute('data-markup'), mc = contact(mid), v = prompt('Paste the Markup link for ' + (mc ? mc.name : 'this job') + ':', mc && mc.markup || '');
			if (v === null) { return; }
			save(mid, { markup: v.trim() }, v.trim() ? 'Markup link saved' : 'Markup link removed');
			return;
		}
		if ((el = t.closest('[data-cardtodo]'))) { e.stopPropagation(); S.cardTodo = +el.getAttribute('data-cardtodo'); render(); return; }
		if (t.closest('.dwdc-cardtodo')) { return; }
		if ((el = t.closest('[data-scroll]'))) { e.preventDefault(); var tg = document.getElementById(el.getAttribute('data-scroll')); if (tg) { tg.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
		if ((el = t.closest('[data-goto]'))) { go(el.getAttribute('data-goto')); return; }
		if ((el = t.closest('[data-cfilter]'))) { S.clientFilter = el.getAttribute('data-cfilter'); render(); return; }
		if (t.closest('[data-reload]')) { reload().then(function () { render(); toast('Up to date'); }).catch(fail); return; }
		if ((el = t.closest('[data-followup]'))) {
			e.stopPropagation();
			var fid = +el.getAttribute('data-followup'); el.disabled = true;
			api('/contact/' + fid + '/followup', 'POST', { days: 7 }).then(function (x) { upsert(x); return reload(); }).then(function () { render(); toast('Reminder set. You’ll get an email in a week.'); }).catch(function (er) { el.disabled = false; fail(er); });
			return;
		}
		if ((el = t.closest('[data-mklead]'))) { e.stopPropagation(); save(+el.getAttribute('data-mklead'), { stage: 'contacted' }, 'Moved to leads'); return; }
		if ((el = t.closest('[data-arch]'))) { e.stopPropagation(); save(+el.getAttribute('data-arch'), { list: 'archive' }, 'Archived'); return; }
		if ((el = t.closest('[data-restore]'))) {
			e.stopPropagation();
			var rc = contact(+el.getAttribute('data-restore'));
			save(rc.id, { list: num(rc.price) || num(rc.billed) || num(rc.stripe) || num(rc.paypal) ? 'complete' : 'leads' }, 'Restored');
			return;
		}
		if ((el = t.closest('[data-pset]'))) {
			var ps = el.getAttribute('data-pset'), pd = { list: ps };
			if (ps === 'complete') { pd.completed = DWDC.today; }
			save(+el.getAttribute('data-pid'), pd, ps === 'complete' ? 'Marked complete' : 'Moved to ' + LABEL[ps]);
			return;
		}
		if ((el = t.closest('[data-pfilter]'))) { S.projFilter = el.getAttribute('data-pfilter'); render(); return; }
		if ((el = t.closest('[data-filter]'))) { S.leadFilter = el.getAttribute('data-filter'); render(); return; }
		if ((el = t.closest('[data-more]'))) { S.more[el.getAttribute('data-more')] = true; render(); return; }
		if ((el = t.closest('[data-delclient]'))) {
			var dk = clientRec(+el.getAttribute('data-delclient'));
			if (dk && confirm('Delete ' + dk.name + '? They have no projects. (It goes to the WordPress trash and can be restored.)')) {
				api('/client/' + dk.id, 'DELETE').then(function () { return reload(); }).then(function () { location.hash = 'clients'; toast(dk.name + ' deleted'); }).catch(fail);
			}
			return;
		}
		if (t.closest('[data-upagain]')) { var mp = {}; app.querySelectorAll('[data-upmap]').forEach(function (x) { if (x.value) { mp[x.getAttribute('data-upmap')] = +x.value; } }); upImport(null, mp); return; }
		if ((el = t.closest('[data-copy]'))) { var cv = el.getAttribute('data-copy'); (navigator.clipboard ? navigator.clipboard.writeText(cv) : Promise.reject()).then(function () { toast('Link copied'); }, function () { prompt('Copy this link:', cv); }); return; }
		if ((el = t.closest('[data-synsave]'))) {
			var box = el.closest('.dwdc-conn'), body = {};
			box.querySelectorAll('[data-sk]').forEach(function (x) { if (x.value.trim()) { body[x.getAttribute('data-sk')] = x.value.trim(); } });
			if (!Object.keys(body).length) { toast('Paste the details first', true); return; }
			el.disabled = true; el.textContent = 'Saving…';
			api('/sync', 'POST', body).then(function () { return api('/sync'); }).then(function (x) { S.sync = x; render(); toast('Saved'); }).catch(function (e) { el.disabled = false; el.textContent = 'Save'; fail(e); });
			return;
		}
		if (t.closest('[data-askai]')) { chatOpen(); return; }
		if ((el = t.closest('[data-trendsnow]'))) { el.textContent = 'Checking…'; api('/trends', 'POST', {}).then(function (x) { S.trends = x; render(); toast('Trends updated'); }).catch(fail); return; }
		if ((el = t.closest('[data-cyear]'))) { S.cYear = el.getAttribute('data-cyear'); render(); return; }
		if ((el = t.closest('[data-revpage]'))) { S.revPage = +el.getAttribute('data-revpage'); render(); window.scrollTo(0, 0); return; }
		if (t.closest('[data-revclear]')) { S.revSel = {}; render(); return; }
		if ((el = t.closest('[data-revsend]'))) { sendReviews(el); return; }
		if (t.closest('[data-appinstall]')) { if (INSTALL) { INSTALL.prompt(); INSTALL.userChoice.then(function () { INSTALL = null; render(); }); } return; }
		if (t.closest('[data-appinfo]')) { S.modal = { type: 'app', vals: {} }; render(); return; }
		if (t.closest('[data-appoff]')) { try { localStorage.setItem('dwdcAppOff', '1'); } catch (er) {} render(); return; }
		if ((el = t.closest('[data-ppladd]'))) { S.addPpl = el.getAttribute('data-ppladd') === '1' ? route().id : 0; render(); setTimeout(function () { var x = app.querySelector('.dwdc-pplf [name=name]'); if (x) { x.focus(); } }, 0); return; }
		if ((el = t.closest('[data-pplmain]'))) { var pc = S.full[route().id] || contact(route().id), pl = peopleOf(pc); savePeople(pc, pl, pl[+el.getAttribute('data-pplmain')]); return; }
		if ((el = t.closest('[data-pplrm]'))) { var rc = S.full[route().id] || contact(route().id), rl = peopleOf(rc), gone = rl[+el.getAttribute('data-pplrm')]; if (confirm('Remove ' + (gone.name || gone.email) + ' from this project?')) { rl.splice(+el.getAttribute('data-pplrm'), 1); savePeople(rc, rl); } return; }
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
		if ((el = t.closest('[data-mksend]'))) {
			var mf = el.closest('form'), md = {}; new FormData(mf).forEach(function (v, k) { md[k] = String(v).trim(); });
			if (!md.markup) { toast('Paste the client’s Markup link first', true); return; }
			if (mf.querySelector('[name=email]') && !md.email) { toast('Add the client’s email first', true); return; }
			var rid = route().id, c0 = S.full[rid] || contact(rid);
			if (!confirm('Email the Markup link to ' + (md.email || c0.email || (clientOf(c0) || {}).email) + '?')) { return; }
			el.disabled = true;
			api('/contact/' + rid + '/markup-email', 'POST', md).then(function (x) { upsert(x); S.full[x.id] = x; render(); toast('Markup link emailed'); }).catch(function (er) { el.disabled = false; fail(er); });
			return;
		}
		if (t.closest('[data-viewob]')) { S.modal = { type: 'answers', project: route().id, vals: {} }; render(); return; }
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
		if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); var si = app.querySelector('.dwdc-ssearch input'); if (si) { si.focus(); si.select(); } return; }
		if (e.key !== 'Escape') { return; }
		if (S.modal) { S.modal = null; render(); } else if (S.cardTodo) { S.cardTodo = 0; render(); } else if (S.edit) { S.edit = false; render(); }
	});

	/* ---------- quick search: a dropdown of matching clients and projects, no page change ---------- */
	function searchDrop(box, q) {
		var dd = box.querySelector('.dwdc-sdrop');
		q = String(q || '').toLowerCase().trim();
		if (!q) { if (dd) { dd.remove(); } return; }
		if (!dd) { dd = document.createElement('div'); dd.className = 'dwdc-sdrop'; box.appendChild(dd); }
		var has = function (arr) { return arr.join(' ').toLowerCase().indexOf(q) > -1; };
		var ks = S.clients.filter(function (k) { return has([k.name, k.email, k.phone, k.company]); }).slice(0, 4);
		var ps = S.contacts.filter(function (c) { return c.list !== 'archive' && has([c.name, c.person, clientName(c), c.email, c.phone, c.company, c.website, c.job]); }).slice(0, 6);
		var row = function (href, title, sub, tag, tone) { return '<a class="dwdc-sitem" href="' + href + '"><span><b>' + esc(title) + '</b><small>' + esc(sub) + '</small></span>' + (tag ? pill(tag, tone || 'gray') : '') + '</a>'; };
		var html = (ks.length ? '<p>Clients</p>' + ks.map(function (k) { var n = projectsOf(k.id).length; return row('#cl/' + k.id, k.name, [k.company, k.email, n + ' project' + (n === 1 ? '' : 's')].filter(Boolean).join(' · '), '', ''); }).join('') : '')
			+ (ps.length ? '<p>Projects</p>' + ps.map(function (c) { return row('#client/' + c.id, c.name, [clientName(c), site(c)].filter(Boolean).join(' · '), c.list === 'leads' ? 'Lead' : LABEL[c.list], c.list === 'leads' ? 'orange' : TONE[c.list]); }).join('') : '');
		dd.innerHTML = html || '<div class="dwdc-snone">No clients or projects match “' + esc(q) + '”.</div>';
		var first = dd.querySelector('.dwdc-sitem'); if (first) { first.classList.add('on'); }
	}
	function closeDrops() { app.querySelectorAll('.dwdc-sdrop').forEach(function (x) { x.remove(); }); app.querySelectorAll('.dwdc-ssearch input').forEach(function (i) { i.value = ''; }); }
	app.addEventListener('keydown', function (e) {
		var box = e.target.closest && e.target.closest('.dwdc-ssearch'); if (!box) { return; }
		var dd = box.querySelector('.dwdc-sdrop'); if (!dd) { if (e.key === 'Escape') { e.target.blur(); } return; }
		var items = [].slice.call(dd.querySelectorAll('.dwdc-sitem')), i = items.findIndex(function (x) { return x.classList.contains('on'); });
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) { return; } if (i > -1) { items[i].classList.remove('on'); } i = (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items[i].classList.add('on'); items[i].scrollIntoView({ block: 'nearest' }); }
		else if (e.key === 'Enter') { e.preventDefault(); if (items[i > -1 ? i : 0]) { var h = items[i > -1 ? i : 0].getAttribute('href'); closeDrops(); e.target.blur(); location.hash = h.slice(1); } }
		else if (e.key === 'Escape') { closeDrops(); e.target.blur(); }
	});
	document.addEventListener('click', function (e) {
		var it = e.target.closest && e.target.closest('.dwdc-sitem');
		if (it) { setTimeout(closeDrops, 0); return; }
		if (!(e.target.closest && e.target.closest('.dwdc-ssearch'))) { closeDrops(); }
	});
	app.addEventListener('input', function (e) {
		var t = e.target;
		if (t.closest('.dwdc-ssearch')) {
			searchDrop(t.closest('.dwdc-ssearch'), t.value);
		} else if (t.classList.contains('dwdc-pick')) {
			S.modal.q = t.value; app.querySelector('.dwdc-picks').innerHTML = pickList(S.modal.q);
		}
	});

	app.addEventListener('change', function (e) {
		var t = e.target;
		if (t.hasAttribute('data-revpick')) { S.revSel = S.revSel || {}; S.revSel[t.getAttribute('data-revpick')] = t.checked; render(); return; }
		if (t.hasAttribute('data-revall')) { S.revSel = S.revSel || {}; app.querySelectorAll('[data-revpick]').forEach(function (x) { S.revSel[x.getAttribute('data-revpick')] = t.checked; }); render(); return; }
		if (t.hasAttribute('data-upcsv') && t.files && t.files[0]) { S.upRes = { added: 0, amount: 0, error: 'Importing…' }; render(); upImport(t.files[0]); return; }
		if (t.hasAttribute('data-year')) { S.year = t.value; render(); return; }
		if (t.hasAttribute('data-field')) {
			var fd = {}; fd[t.getAttribute('data-field')] = t.value;
			save(route().id, fd, 'Saved');
			return;
		}
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
		if (f.classList.contains('dwdc-pplf')) {
			if (!String(data.name || '').trim() && !String(data.email || '').trim()) { toast('Add a name or email', true); return; }
			var ac = S.full[r.id] || contact(r.id), al = peopleOf(ac); al.push(data); S.addPpl = 0;
			savePeople(ac, al, al.length === 1 ? data : null); return;
		}
		if (f.classList.contains('dwdc-jobform')) {
			var m = S.modal;
			if (!m.client && !m.newc) { toast('Pick the client first, or add a new one', true); return; }
			if (m.newc && !String(data.client_name || '').trim()) { toast('Add the client’s name', true); return; }
			if (!String(data.title || '').trim() && !String(data.name || '').trim()) { toast('Name the project', true); return; }
			data.client = m.client || 0;
			var b = f.querySelector('.dwdc-farow .dwdc-btn'); b.disabled = true;
			api('/job', 'POST', data).then(function (x) {
				return reload().then(function () { S.full[x.id] = x; S.modal = null; go('home'); toast('Added to active projects'); });
			}).catch(function (er) { b.disabled = false; fail(er); });
		} else if (f.classList.contains('dwdc-payform')) {
			if (!data.project) { toast('Choose the project', true); return; }
			if (!num(data.amount)) { toast('Enter the amount', true); return; }
			var pb = f.querySelector('.dwdc-farow .dwdc-btn'); pb.disabled = true;
			api('/contact/' + data.project + '/payment', 'POST', data).then(function (x) { upsert(x); if (S.full[x.id]) { S.full[x.id] = x; } S.modal = null; render(); toast('Payment of ' + money(data.amount) + ' logged'); }).catch(function (er) { pb.disabled = false; fail(er); });
		} else if (f.classList.contains('dwdc-moveform')) {
			var mm = S.modal;
			if (!mm.client && !(mm.newc && String(data.client_name || '').trim())) { toast('Pick a client or add a new one', true); return; }
			api('/contact/' + mm.project + '/client', 'POST', mm.client ? { client: mm.client } : { name: data.client_name }).then(function () {
				return reload().then(function () { delete S.full[mm.project]; S.modal = null; load(mm.project); toast('Client updated'); });
			}).catch(fail);
		} else if (f.classList.contains('dwdc-clientf')) {
			api('/client/' + r.id, 'POST', data).then(function () { return reload(); }).then(function () { S.edit = false; render(); toast('Saved'); }).catch(fail);
		} else if (f.classList.contains('dwdc-newclientf')) {
			if (!String(data.name || '').trim()) { toast('Add a name', true); return; }
			api('/client', 'POST', data).then(function (k) { return reload().then(function () { S.modal = null; go('cl/' + k.id); toast('Client added'); }); }).catch(fail);
		} else if (f.classList.contains('dwdc-leadform')) {
			if (!String(data.name || '').trim()) { toast('Add a name', true); return; }
			var note = data.note; delete data.note;
			data.list = 'leads'; data.stage = 'new'; data.source = data.source || 'Manual';
			api('/contact', 'POST', data).then(function (x) {
				upsert(x);
				return (note ? api('/contact/' + x.id + '/note', 'POST', { text: note }).then(upsert) : Promise.resolve()).then(reload).then(function () { S.modal = null; S.back = 'leads'; go('leads'); toast('Lead added'); });
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
		} else if (f.classList.contains('dwdc-hostprice')) {
			if (!num(data.hosting)) { toast('Enter the yearly price', true); return; }
			save(r.id, { hosting: String(num(data.hosting)), renewal: data.renewal || '' }, 'Hosting price saved: ' + money(data.hosting) + '/yr');
		} else if (f.classList.contains('dwdc-markupf')) {
			save(r.id, { markup: (data.markup || '').trim() }, data.markup ? 'Markup link saved' : 'Markup link removed');
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
		S.contacts = r.contacts.filter(Boolean); S.tasks = r.tasks.filter(Boolean); S.clients = (r.clients || []).filter(Boolean); S.money = r.money || {}; S.costs = r.costs || {}; S.trends = r.trends || null;
		var m = /[?&]contact=(\d+)/.exec(location.search), em = /[?&]email=([^&]+)/.exec(location.search);
		var who = m ? contact(+m[1]) : em ? S.contacts.find(function (c) { return c.email && c.email.toLowerCase() === decodeURIComponent(em[1]).toLowerCase(); }) : null;
		if (who) { location.hash = 'client/' + who.id; }
		var rr = route(); if (rr.view === 'client' || rr.view === 'host') { load(rr.id); }
		render(true);
	}).catch(function (e) { app.innerHTML = '<p class="dwdc-loading">Couldn’t load Client Desk: ' + esc(e.message) + '</p>'; });
})();
