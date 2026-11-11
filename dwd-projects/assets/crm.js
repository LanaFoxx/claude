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
	try { S.psort = JSON.parse(localStorage.getItem('dwdc-psort') || '{}') || {}; } catch (er) { S.psort = {}; }

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
	function allIncome() { return S.contacts.filter(function (c) { return ['active', 'hold', 'limbo', 'complete'].indexOf(c.list) > -1; }).reduce(function (a, c) { return a + num(c.billed) + num(c.stripe) + num(c.paypal) + num(c.manual); }, 0); }
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
		mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/>',
		star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
		grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
		user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
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
		down: '<path d="m6 9 6 6 6-6"/>',
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
	// Lists Mike reorders by dragging: saved ids first in his order, anything new on top.
	// Price sort for the Active and Leads lists: click the Price header → high to low → low to high → back to your order.
	function psort(key, list) { var d = (S.psort || {})[key]; if (!d) { return list; } return list.slice().sort(function (a, b) { var x = num(a.price) - num(b.price); return d === 'asc' ? x : -x; }); }
	function phead(key, label) { var d = (S.psort || {})[key]; return '<button type="button" class="dwdc-sorth' + (d ? ' on' : '') + '" data-psort="' + key + '" title="Sort by price">' + label + ' <i>' + (d === 'asc' ? '↑' : d === 'desc' ? '↓' : '↕') + '</i></button>'; }
	function inOrder(key, list) {
		var ids = (S.order && S.order[key]) || [], pos = {};
		ids.forEach(function (id, i) { pos[id] = i; });
		var fresh = list.filter(function (c) { return !(c.id in pos); }), kept = list.filter(function (c) { return c.id in pos; }).sort(function (a, b) { return pos[a.id] - pos[b.id]; });
		return fresh.concat(kept);
	}
	// Paid = the rest of the balance came in today: logged as a payment so it counts in "Made in <month>".
	// Upwork money is stored after Upwork's 10% fee (like the Upwork file), and the whole balance is cleared.
	function markPaid(id, btn) {
		var c = S.full[id] || contact(id), gross = c ? num(c.balance) : 0;
		if (!gross) { save(id, { balance: '0', paymark: '' }, 'Marked paid'); return; }
		var pm = ['Upwork', 'Stripe', 'PayPal'].indexOf(c.pay_method) > -1 ? c.pay_method : 'Other', up = pm === 'Upwork';
		var amt = up ? Math.round(gross * 90) / 100 : gross;
		if (btn) { btn.disabled = true; }
		api('/contact/' + id + '/payment', 'POST', { amount: amt, method: pm, date: DWDC.today, note: 'Marked paid' + (up ? ' · after Upwork fee (' + money(gross) + ' gross)' : '') })
			.then(function () { return api('/contact/' + id, 'POST', { balance: '0', paymark: '' }); })
			.then(function (x) { upsert(x); S.full[x.id] = x; return reload(); })
			.then(function () { render(); toast(money(amt) + ' paid · added to this month'); })
			.catch(function (er) { if (btn) { btn.disabled = false; } fail(er); });
	}
	// What a project will actually deposit: Upwork money arrives after Upwork's 10% fee.
	function netOf(c) { var b = num(c.balance); return c.pay_method === 'Upwork' ? Math.round(b * 90) / 100 : b; }
	function pendDeposit(list) { return list.filter(function (c) { return c.paymark === 'pending'; }).reduce(function (a, c) { return a + netOf(c); }, 0); }
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
		return api('').then(function (r) { S.contacts = r.contacts.filter(Boolean); S.tasks = r.tasks.filter(Boolean); S.clients = (r.clients || []).filter(Boolean); S.money = r.money || {}; S.costs = r.costs || {}; S.trends = r.trends || null; S.wins = r.wins || { list: [], undated: 0 }; S.ads = r.ads || null; S.meet = r.meetings || null; S.order = r.order || {}; });
	}

	/* ---------- routing ---------- */
	var TITLES = {
		home: ['', '', 'Dream Web Digital'], leads: ['Clients', 'All', 'Leads'], onboarding: ['Clients', 'Onboarding', 'Forms'],
		todos: ['Everything open', 'To-Do', 'List'], hosting: ['Clients', 'Hosting', 'Clients'], archive: ['More', 'Archive', ''],
		search: ['Search', 'Search', 'Results'], personal: ['Personal', 'To-Do', 'List'], money: ['Finances', 'Money', 'Stats'], reviews: ['Clients', 'Get', 'Reviews'], clients: ['Clients', 'All', 'Clients'], projects: ['Projects', 'All', 'Projects']
	};
	var OLD = { dashboard: 'home', jobs: 'projects/active', completed: 'projects/complete', forms: 'leads', todos: 'home' };
	function route() {
		var h = location.hash.replace(/^#/, '').replace(/^clients\/active$/, 'projects/active').split('/'); // Clients → Active opens the active projects list
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
	// Display-only tidy-up of calendar titles synced from ClickUp (Google keeps the original).
	function ptx(s) { var m = /^🔄\s*(.+?)\s*::.*Hosting Client List\s*$/.exec(String(s || '')); return m ? 'Hosting renewal: ' + m[1] : String(s || ''); }
	// Google sync health: connected, or stopped (no sync for 2+ hours).
	function gStale(GL) { if (!GL || !GL.at) { return false; } var t = new Date(GL.at.replace(' ', 'T') + 'Z').getTime(); return Date.now() - t > 2 * 3600 * 1000; }
	/* ---------- Personal: bank spending, subscriptions, connections ---------- */
	var PTAGS = { urgent: 'Urgent', important: 'Important', errand: 'Errand', birthday: 'Birthday', home: 'Home', work: 'Work', health: 'Health', bills: 'Bills' };
	function isFlight(t) { return /\bflights?\b|✈|\bairlines?\b|\bairways\b|\b(AA|DL|UA|WN|B6|AS|NK|F9|G4)\s?\d{2,4}\b/.test(String(t || '')); }
	function tagOf(x) { return x.tag || (/birthday|bday/i.test(x.text || '') ? 'birthday' : ''); }
	function money2(v) { return '$' + (+v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
	function bData() {
		if (!S.bank && !S.bankLoading) { S.bankLoading = true; api('/bank').then(function (d) { S.bank = d; S.bankLoading = false; render(); }).catch(function () { S.bankLoading = false; }); }
		return S.bank;
	}
	function plData() {
		if (!S.plaid && !S.plaidLoading) { S.plaidLoading = true; api('/plaid').then(function (d) { S.plaid = d; S.plaidLoading = false; render(); }).catch(function () { S.plaidLoading = false; }); }
		return S.plaid;
	}
	function bankUpload(file) {
		var rd = new FileReader();
		rd.onload = function () {
			toast('Reading ' + file.name + '…');
			api('/bank', 'POST', { csv: String(rd.result || ''), name: file.name, account: /credit|card|visa|mastercard/i.test(file.name) ? 'Bank of America · Credit card' : 'Bank of America' })
				.then(function (d) { S.bank = d; render(); toast(d.added + ' new transactions added (' + d.read + ' read)'); }).catch(fail);
		};
		rd.readAsText(file);
	}
	function plaidConnect() {
		toast('Opening Plaid…');
		var go = function () {
			api('/plaid', 'POST', { action: 'link' }).then(function (x) {
				var h = window.Plaid.create({
					token: x.link_token,
					onSuccess: function (pt, meta) {
						toast('Connected — pulling your transactions…');
						api('/plaid', 'POST', { action: 'exchange', public_token: pt, institution: (meta && meta.institution && meta.institution.name) || 'Bank' })
							.then(function (s) { S.plaid = s; S.bank = null; render(); toast((s.sync && s.sync.added || 0) + ' transactions imported'); }).catch(fail);
					},
					onExit: function (err) { if (err) { toast(err.display_message || err.error_message || 'Plaid closed', true); } }
				});
				h.open();
			}).catch(fail);
		};
		if (window.Plaid) { go(); return; }
		var sc = document.createElement('script'); sc.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js'; sc.onload = go; sc.onerror = function () { toast('Couldn’t load Plaid', true); }; document.head.appendChild(sc);
	}
	function spendingView() {
		var B = bData();
		if (!B) { return emptyRow('Loading…'); }
		var months = Object.keys(B.months || {});
		var upl = '<label class="dwdc-btn2 dwdc-upbtn sm">' + ic('plus', 13) + 'Upload Bank of America CSV<input type="file" accept=".csv,text/csv" data-bankcsv hidden></label>';
		if (!B.count) {
			return '<section class="dwdc-card pad dwdc-bankempty"><div class="dwdc-cardh"><h2>Connect your bank</h2></div><p>No bank transactions yet. Connect Bank of America through Plaid (automatic, daily) or upload a download from bankofamerica.com. Steps are in <a href="#personal" data-openconn>Personal → Connections</a>.</p><div class="dwdc-farow">' + upl + '<button class="dwdc-btn" data-openconn>' + ic('link', 14) + 'See connection steps</button></div></section>';
		}
		var ym = S.bMonth && B.months[S.bMonth] ? S.bMonth : months[0], mo = B.months[ym] || { in: 0, out: 0, cats: {} };
		var idx = months.indexOf(ym), prev = B.months[months[idx + 1]];
		var MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		var label = function (k) { return MN[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); };
		var diff = prev ? mo.out - prev.out : 0;
		var cats = Object.keys(mo.cats || {});
		var maxC = cats.length ? mo.cats[cats[0]] : 1;
		var tx = (B.tx || []).filter(function (t) { return t.date.slice(0, 7) === ym && (!S.bCat || t.cat === S.bCat); });
		var trend = months.slice(0, 12).reverse(), maxT = Math.max.apply(null, trend.map(function (k) { return B.months[k].out; }).concat([1]));
		return '<div class="dwdc-pmonth"><button class="dwdc-btn2 sm" data-bmonth="' + (months[idx + 1] || '') + '"' + (months[idx + 1] ? '' : ' disabled') + '>‹</button><b>' + label(ym) + '</b><button class="dwdc-btn2 sm" data-bmonth="' + (months[idx - 1] || '') + '"' + (idx > 0 ? '' : ' disabled') + '>›</button></div>'
			+ (function () {
				// 1. Total balance across the bank accounts (live from Plaid). 2. Money in this month. 3. Ad spend.
				var BL = (B.balances && B.balances.accounts ? B.balances.accounts : []).filter(function (x) { return x.type === 'checking'; }), bv = function (x) { return x.available != null ? x.available : (x.current || 0); }, tot = BL.reduce(function (a, x) { return a + bv(x); }, 0);
				var bname = function (x) { return (x.business ? 'Business' : 'Personal') + ' ••' + esc(x.mask); };
				var bal = '<div class="dwdc-kpi navy"><small>Total balance · available</small><strong>' + (BL.length ? money2(tot) : '—') + '</strong><span>' + (BL.length ? BL.slice().sort(function (a, b) { return (b.business ? 1 : 0) - (a.business ? 1 : 0); }).map(function (x) { return bname(x) + ' ' + money2(bv(x)); }).join(' · ') + (B.balances.at ? '<br>Updated ' + fmt(B.balances.at.slice(0, 10)) + ' ' + B.balances.at.slice(11, 16) : '') : 'Balances show once Bank of America syncs through Plaid') + '</span></div>';
				var inBox = '<div class="dwdc-kpi"><small>Money in</small><strong>' + money(mo.in) + '</strong><span>Deposits &amp; income in ' + label(ym).split(' ')[0] + ' (not transfers between accounts)</span></div>';
				var AS = (B.adspend && B.adspend.months && B.adspend.months[ym]) || {}, cn = AS.connects || 0, gg = AS.google || 0;
				var ads = '<div class="dwdc-kpi coral wide"><small>Advertising spend · ' + label(ym) + '</small><strong>' + money(cn + gg) + '</strong><span>Upwork Connects ' + money(cn) + ' · Google Ads ' + (B.adspend && B.adspend.google_on ? money(gg) : 'not connected') + '</span></div>';
				return '<div class="dwdc-kpis two">' + bal + inBox + '</div><div class="dwdc-kpis one">' + ads + '</div>';
			})()
			+ '<div class="dwdc-prow2 top">'
			+ '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Where it went</h2>' + (S.bCat ? '<button class="dwdc-lnk sm2" data-bcat="">Show all</button>' : '') + '</div><div class="dwdc-pcats">' + (cats.length ? cats.map(function (c) { return '<div class="' + (S.bCat === c ? 'on' : '') + '" data-bcat="' + esc(c) + '"><span>' + esc(c) + '</span><i style="width:' + Math.max(3, Math.round(mo.cats[c] / maxC * 100)) + '%"></i><b>' + money(mo.cats[c]) + '</b></div>'; }).join('') : '<p class="dwdc-mutp">No spending this month.</p>') + '</div></section>'
			+ '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Spending by month</h2><button class="dwdc-askbtn sm" data-askai="personal">' + ic('bolt', 13) + 'Ask AI</button></div><div class="dwdc-btrend">' + trend.map(function (k) { return '<button class="' + (k === ym ? 'on' : '') + '" data-bmonth="' + k + '" title="' + label(k) + ': ' + money(B.months[k].out) + '"><i style="height:' + Math.max(4, Math.round(B.months[k].out / maxT * 100)) + '%"></i><small>' + MN[+k.slice(5, 7) - 1].slice(0, 3) + '</small></button>'; }).join('') + '</div></section>'
			+ '</div>'
			+ '<section class="dwdc-card"><div class="dwdc-cardh pad2 split"><h2>' + (S.bCat ? esc(S.bCat) + ' · ' : '') + label(ym) + ' transactions</h2>' + upl + '</div>' + (tx.length ? tx.map(function (t) {
				return '<div class="dwdc-prow"><span class="d">' + fmt(t.date) + '</span><span class="w"><b>' + esc(t.desc) + '</b><small>' + esc(t.cat) + ' · ' + esc(t.acct) + '</small></span><span class="a ' + (t.amt > 0 ? 'in' : 'out') + '">' + (t.amt > 0 ? '+' : '−') + money(Math.abs(t.amt)) + '</span><span></span></div>';
			}).join('') : emptyRow('No transactions here.')) + '</section>'
			+ '<p class="dwdc-mutp sm">' + B.count + ' transactions on file · latest ' + (B.last ? fmt(B.last) : '—') + '</p>';
	}
	function subsView() {
		var B = bData();
		if (!B) { return emptyRow('Loading…'); }
		var subs = (B.subs || []).filter(function (s) { return s.status !== 'ignore'; });
		if (!B.count) { return spendingView(); }
		var act = subs.filter(function (s) { return !s.stopped; }), mo = act.reduce(function (a, s) { return a + s.monthly; }, 0);
		var cancel = act.filter(function (s) { return s.status === 'cancel'; }), save = cancel.reduce(function (a, s) { return a + s.yearly; }, 0);
		var raised = act.filter(function (s) { return s.raised > 0; });
		var row = function (s) {
			return '<div class="dwdc-subr' + (s.status ? ' ' + s.status : '') + (s.stopped ? ' stopped' : '') + '"><div class="w"><b>' + esc(s.name) + '</b><small>' + money(s.amount) + ' ' + s.cycle + ' · ' + s.count + ' charges since ' + fmt(s.first, true) + (s.stopped ? ' · <em>looks stopped</em>' : ' · next ~' + fmt(s.next)) + (s.raised ? ' · <em class="up">price up ' + money(s.raised) + '</em>' : '') + '</small></div>'
				+ '<span class="a">' + money(s.monthly) + '<small>/mo</small></span>'
				+ '<div class="dwdc-subact"><button class="' + (s.status === 'keep' ? 'on' : '') + '" data-sub="' + esc(s.merchant) + '" data-st="keep">Keep</button><button class="' + (s.status === 'cancel' ? 'on bad' : '') + '" data-sub="' + esc(s.merchant) + '" data-st="cancel">Cancel</button><button data-sub="' + esc(s.merchant) + '" data-st="ignore" title="Not a subscription">' + ic('x', 12) + '</button></div></div>';
		};
		return '<div class="dwdc-kpis"><div class="dwdc-kpi navy"><small>Recurring charges</small><strong>' + money(mo) + '<small>/mo</small></strong><span>' + act.length + ' active · ' + money(mo * 12) + ' a year</span></div><div class="dwdc-kpi coral"><small>Marked to cancel</small><strong>' + money(save) + '<small>/yr</small></strong><span>' + cancel.length + ' subscription' + (cancel.length === 1 ? '' : 's') + '</span></div><div class="dwdc-kpi"><small>Price increases</small><strong>' + raised.length + '</strong><span>' + (raised.length ? raised.map(function (s) { return esc(s.name); }).slice(0, 3).join(', ') : 'None spotted') + '</span></div></div>'
			+ '<section class="dwdc-card"><div class="dwdc-cardh pad2 split"><h2>Recurring charges &amp; subscriptions</h2><button class="dwdc-askbtn sm" data-askai="personal">' + ic('bolt', 13) + 'Ask AI what to cut</button></div>'
			+ (act.length ? act.map(row).join('') : emptyRow('No repeating charges found yet — they show up after two or more months of transactions.')) + '</section>'
			+ (subs.filter(function (s) { return s.stopped; }).length ? '<section class="dwdc-card"><div class="dwdc-cardh pad2"><h2>Stopped or paused</h2></div>' + subs.filter(function (s) { return s.stopped; }).map(row).join('') + '</section>' : '')
			+ '<p class="dwdc-mutp sm">Found by looking for the same merchant charging a similar amount on a regular schedule. Tap ✕ on anything that isn’t a subscription. Dream Desk can’t cancel for you — “Cancel” is your reminder list.</p>';
	}
	function connPanel() {
		var G = S.pGoogle, GL = G && G.last, P = plData(), B = S.bank;
		if (!G && !S.pGoogleLoading) { S.pGoogleLoading = true; api('/personal/google').then(function (x) { S.pGoogle = x; render(); }).catch(function () {}); }
		var st = function (on, txt) { return '<span class="dwdc-conn-st ' + (on ? 'on' : 'off') + '">' + (txt || (on ? 'Connected' : 'Not set up')) + '</span>'; };
		var banks = P && P.banks && P.banks.length;
		var google = '<div class="dwdc-conn"><h3>' + ic('todo', 16) + 'Google Tasks &amp; Calendar' + st(!!GL && !gStale(GL), GL && gStale(GL) ? 'Stopped syncing' : '') + '</h3>' + (GL ? '<small class="dwdc-conn-last">Last synced ' + fmt(GL.at, true) + ' ' + esc(GL.at.slice(11, 16)) + ' UTC · every 15 minutes</small>' : '') + (gStale(GL) ? '<p class="dwdc-warn">No sync for over 2 hours. Open the script at script.google.com and press Run on <b>setup</b> again (it re-creates the 15-minute timer).</p>' : '')
			+ '<p>Two-way: to-dos ↔ Google Tasks, and your Google Calendar ↔ the Personal calendar (edits and deletes included).</p>'
			+ '<ol><li>Open <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener"><b>script.google.com → New project</b></a> as mike@dreamwebdigital.com.</li><li>Click <b>Services +</b> on the left, add <b>Google Tasks API</b>, then click <b>Services +</b> again and add <b>Google Calendar API</b>.</li><li>Delete what’s in the editor and paste the script:' + (G ? '<div class="dwdc-conn-url"><code>Dream Desk personal sync script</code><button class="dwdc-lnk sm2" data-copy="' + esc(G.script) + '">Copy script</button></div>' : ' <i>loading…</i>') + '</li><li>Save, choose <b>setup</b> next to Run, press <b>Run</b>, and allow access.</li></ol></div>';
		var bank = '<div class="dwdc-conn"><h3>' + ic('dollar', 16) + 'Bank of America' + st(banks || (B && B.count), banks ? 'Connected via Plaid' : (B && B.count ? 'CSV uploads' : '')) + '</h3>'
			+ (banks ? '<ul class="dwdc-files">' + P.banks.map(function (b) { return '<li><span><b>' + esc(b.institution) + '</b><small>' + esc((b.accounts || []).join(', ') || 'Accounts') + (b.synced ? ' · synced ' + fmt(b.synced, true) : '') + (b.error ? ' · <em class="bad">' + esc(b.error) + '</em>' : '') + '</small></span><button class="dwdc-lnk sm2" data-plremove="' + esc(b.id) + '">Disconnect</button></li>'; }).join('') + '</ul><div class="dwdc-farow"><button class="dwdc-btn2 sm" data-plsync>' + ic('refresh', 13) + 'Sync now</button><button class="dwdc-btn2 sm" data-plconnect>' + ic('plus', 13) + 'Add another account</button></div>' : '')
			+ '<p><b>Option 1 — automatic (Plaid), like Rocket Money.</b> Plaid is the service banks use to share transactions with apps. It syncs daily. Your bank login happens on Plaid’s own screen; Dream Desk never sees it.</p>'
			+ '<ol><li>Create a free account at <a href="https://dashboard.plaid.com/signup" target="_blank" rel="noopener"><b>dashboard.plaid.com</b></a> (choose “personal / building for myself”).</li><li>In the Plaid dashboard go to <b>Developers → Keys</b> and copy your <b>client_id</b> and your <b>Production secret</b>. If Production isn’t available yet, click <b>Request access</b> (Plaid’s free/limited production is enough for one person). Bank of America also needs Plaid’s <b>OAuth</b> registration, which the dashboard walks you through.</li><li>Paste them here and save:<div class="dwdc-conn-f col"><input placeholder="Plaid client_id" data-plk="client_id" autocomplete="off"><input type="password" placeholder="Plaid Production secret" data-plk="secret" autocomplete="off"><button class="dwdc-btn sm" data-plkeys>Save Plaid keys</button></div>' + (P && P.ready ? '<small class="dwdc-ok">Keys saved (' + esc(P.env) + ').</small>' : '') + '</li><li>Click <button class="dwdc-btn sm coral" data-plconnect' + (P && P.ready ? '' : ' disabled') + '>' + ic('link', 13) + 'Connect Bank of America</button>, pick Bank of America and sign in.</li></ol>'
			+ '<p><b>Option 2 — upload a file (works today).</b> On bankofamerica.com open your account → <b>Download</b> → pick a date range (up to 18 months) → <b>File type: Microsoft Excel (.csv)</b>. Do it for checking and for each credit card, then add the files here. Re-uploading overlaps is fine — duplicates are skipped.</p>'
			+ '<label class="dwdc-btn2 dwdc-upbtn sm">' + ic('plus', 13) + 'Upload Bank of America CSV<input type="file" accept=".csv,text/csv" data-bankcsv hidden></label>'
			+ (B && B.files && B.files.length ? '<ul class="dwdc-files">' + B.files.slice().reverse().slice(0, 6).map(function (f) { return '<li><span><b>' + esc(f.name) + '</b><small>' + fmt(f.from, true) + ' – ' + fmt(f.to, true) + ' · ' + f.rows + ' rows · ' + f.new + ' new · added ' + fmt(f.uploaded, true) + '</small></span></li>'; }).join('') + '</ul>' : '')
			+ '<p class="dwdc-mutp sm">ChatGPT’s link to your bank belongs to OpenAI’s account, so Dream Desk can’t borrow it — but it’s the same kind of connection as Option 1.</p></div>';
		var ai = '<div class="dwdc-conn"><h3>' + ic('bolt', 16) + 'Claude AI (finance chatbot)' + st(!CHAT.needKey) + '</h3><p>Powers “Ask AI” on your Personal pages: spending trends, subscriptions to cut, “how much did I spend on dining last month?”, upcoming bills. It uses the same Claude key as the business Ask AI.</p>'
			+ (CHAT.needKey ? '<ol><li>Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener"><b>console.anthropic.com → API Keys</b></a>.</li><li>Click <b>Ask AI</b> below and paste it in the box that appears (it’s stored on your server only).</li></ol>' : '') + '<button class="dwdc-btn sm" data-askai="personal">' + ic('bolt', 13) + 'Ask AI about my money</button></div>';
		return '<section class="dwdc-card pad dwdc-mcard wide dwdc-collapse dwdc-pconn' + (S.pConnOpen ? ' open' : '') + '"><button class="dwdc-cardh dwdc-colh" data-pconnopen aria-expanded="' + !!S.pConnOpen + '"><h2>Connections</h2><span class="dwdc-pconn-sum">' + [GL ? 'Google ✓' : 'Google —', banks ? 'Bank ✓' : (B && B.count ? 'Bank (CSV)' : 'Bank —'), CHAT.needKey ? 'AI —' : 'AI ✓'].join(' · ') + '</span>' + ic('right', 16) + '</button>'
			+ (S.pConnOpen ? '<div class="dwdc-conns">' + google + bank + ai + '</div>' : '') + '</section>';
	}

	/* ---------- Personal: to-dos, finances, bills (Mike's own, not the business) ---------- */
	function pData() {
		if (!S.pers && !S.persLoading) { S.persLoading = true; api('/personal').then(function (d) { S.pers = d; S.persLoading = false; render(); }).catch(function (e) { S.persLoading = false; fail(e); }); }
		return S.pers;
	}
	function pSave(kind, item, msg) {
		return api('/personal', 'POST', { kind: kind, item: item }).then(function (d) { S.pers = d; render(); if (msg) { toast(msg); } }).catch(fail);
	}
	function pDel(kind, id, msg) {
		return api('/personal', 'POST', { kind: kind, 'delete': id }).then(function (d) { S.pers = d; render(); if (msg) { toast(msg); } }).catch(fail);
	}
	function pMonthKey(d) { return (d || DWDC.today).slice(0, 7); }
	// Next due date of a bill on/after today, and whether this period is paid.
	function billNext(b) {
		var t = DWDC.today, y = +t.slice(0, 4), m = +t.slice(5, 7);
		var pad = function (n) { return ('0' + n).slice(-2); };
		var dim = function (yy, mm) { return new Date(yy, mm, 0).getDate(); };
		var due, key;
		if (b.freq === 'yearly') {
			due = y + '-' + pad(b.month) + '-' + pad(Math.min(b.day, dim(y, b.month)));
			key = String(y);
			if (due < t && b.paid && b.paid[key]) { due = (y + 1) + '-' + pad(b.month) + '-' + pad(Math.min(b.day, dim(y + 1, b.month))); key = String(y + 1); }
		} else if (b.freq === 'weekly') {
			var dt = new Date(t + 'T12:00:00'), wd = (b.day - 1) % 7; // day 1 = Monday
			var diff = (wd + 1 - dt.getDay() + 7) % 7; dt.setDate(dt.getDate() + diff);
			due = dt.toISOString().slice(0, 10); key = due;
		} else {
			due = y + '-' + pad(m) + '-' + pad(Math.min(b.day, dim(y, m)));
			key = y + '-' + pad(m);
			if (due < t && b.paid && b.paid[key]) { var ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1; due = ny + '-' + pad(nm) + '-' + pad(Math.min(b.day, dim(ny, nm))); key = ny + '-' + pad(nm); }
		}
		var paid = !!(b.paid && b.paid[key]);
		return { due: due, key: key, paid: paid, late: !paid && !b.autopay && due < t };
	}
	function billMonthly(b) { return b.freq === 'yearly' ? b.amount / 12 : b.freq === 'weekly' ? b.amount * 52 / 12 : b.amount; }
	function ptSend() {
		var m = S.modal; if (!m || m.type !== 'paddtask' || m.busy) { return; }
		var q = String(m.draft || '').trim(); if (!q) { return; }
		m.msgs.push({ role: 'user', content: q }); m.draft = ''; m.busy = true; render();
		api('/personal/plan', 'POST', { messages: m.msgs.concat(m.tasks && m.tasks.length ? [] : []) }).then(function (r) {
			if (S.modal !== m) { return; }
			m.msgs.push({ role: 'assistant', content: r.reply || (r.tasks.length ? 'Here’s what I’ll add.' : 'Got it.') });
			if (r.tasks && r.tasks.length) { m.tasks = r.tasks; }
		}).catch(function (e) { m.msgs.push({ role: 'assistant', content: 'Sorry — ' + e.message }); }).then(function () { m.busy = false; render(); setTimeout(function () { var x = document.querySelector('.dwdc-addlog'); if (x) { x.scrollTop = x.scrollHeight; } var ta = document.querySelector('[data-ptdraft]'); if (ta && window.innerWidth > 768) { ta.focus(); } }, 30); });
	}
	function ptMic() {
		var m = S.modal, SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!m || !SR) { return; }
		if (m.rec) { m.rec.stop(); return; }
		var rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
		var base = (m.draft ? m.draft + ' ' : '');
		rec.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) { t += e.results[i][0].transcript; } m.draft = base + t; var ta = document.querySelector('[data-ptdraft]'); if (ta) { ta.value = m.draft; } };
		rec.onend = function () { m.rec = null; m.listening = false; render(); if (String(m.draft || '').trim()) { ptSend(); } };
		rec.onerror = function (e) { m.rec = null; m.listening = false; render(); if (e.error === 'not-allowed') { toast('Allow the microphone to talk to it', true); } };
		m.rec = rec; m.listening = true; render(); rec.start();
	}
	function pTodoRow(t) {
		var src = t.source ? '<span class="dwdc-psrc ' + (t.source === 'Google Calendar' ? 'cal' : 'gt') + '">' + esc(t.source === 'Google Calendar' ? 'Calendar' : 'Google Tasks') + '</span>' : '';
		var meta = [t.due ? (t.due === DWDC.today ? 'Today' : fmt(t.due)) + (t.time ? ' · ' + t.time : '') : '', t.note ? 'Has notes' : ''].filter(Boolean).join(' · ');
		return '<div class="dwdc-todo' + (t.done ? ' done' : '') + (t.due && t.due < DWDC.today && !t.done ? ' late' : '') + '" data-ptask="' + t.id + '"><span class="dwdc-chk" data-ptoggle="' + t.id + '">' + ic('check', 12) + '</span>'
			+ '<span class="dwdc-tt"><b>' + esc(ptx(t.text)) + '</b><small>' + src + esc(meta) + '</small></span>'
			+ '<button class="dwdc-del" data-pdel="todos:' + t.id + '" title="Delete">' + ic('x', 14) + '</button></div>';
	}
	function personalView(r) {
		var D = pData(), tab = r.arg || 'home';
		if (!D) { return emptyRow('Loading…'); }
		var kpi = function (label, val, sub, tone) { return '<div class="dwdc-kpi' + (tone ? ' ' + tone : '') + '"><small>' + label + '</small><strong>' + val + '</strong>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>'; };
		if (tab === 'finances') {
			var ym = S.pMonth || pMonthKey(), MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			var rows = D.money.filter(function (x) { return x.date.slice(0, 7) === ym; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
			var inc = rows.filter(function (x) { return x.type === 'income'; }).reduce(function (a, x) { return a + x.amount; }, 0);
			var out = rows.filter(function (x) { return x.type !== 'income'; }).reduce(function (a, x) { return a + x.amount; }, 0);
			var billsMo = D.bills.reduce(function (a, b) { return a + billMonthly(b); }, 0);
			var yy = +ym.slice(0, 4), mm = +ym.slice(5, 7), shift = function (n) { var d = new Date(yy, mm - 1 + n, 1); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); };
			var cats = {}; rows.filter(function (x) { return x.type !== 'income'; }).forEach(function (x) { var c = x.cat || 'Other'; cats[c] = (cats[c] || 0) + x.amount; });
			var catList = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; });
			return '<div class="dwdc-pmonth"><button class="dwdc-btn2 sm" data-pmonth="' + shift(-1) + '">‹</button><b>' + MN[mm - 1] + ' ' + yy + '</b><button class="dwdc-btn2 sm" data-pmonth="' + shift(1) + '">›</button></div>'
				+ '<div class="dwdc-kpis">' + kpi('Money in', money(inc), rows.filter(function (x) { return x.type === 'income'; }).length + ' entries', 'navy') + kpi('Money out', money(out), rows.filter(function (x) { return x.type !== 'income'; }).length + ' entries', 'coral') + kpi('Left over', money(inc - out), 'Bills run about ' + money(billsMo) + ' / month') + '</div>'
				+ '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Add money in or out</h2></div>'
				+ '<form class="dwdc-pform" data-pform="money"><select name="type"><option value="expense">Money out</option><option value="income">Money in</option></select><input name="label" placeholder="What was it? (e.g. Groceries)" required><input name="amount" inputmode="decimal" placeholder="$0.00" required><input name="cat" placeholder="Category" list="dwdc-pcats"><input name="date" type="date" value="' + (ym === pMonthKey() ? DWDC.today : ym + '-01') + '"><button class="dwdc-btn">' + ic('plus', 14) + 'Add</button></form>'
				+ '<datalist id="dwdc-pcats">' + ['Groceries', 'Dining', 'Gas', 'Car', 'Home', 'Health', 'Shopping', 'Travel', 'Fun', 'Gifts', 'Paycheck', 'Side job', 'Other'].map(function (c) { return '<option value="' + c + '">'; }).join('') + '</datalist></section>'
				+ (catList.length ? '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Where it went</h2></div><div class="dwdc-pcats">' + catList.map(function (c) { return '<div><span>' + esc(c) + '</span><i style="width:' + Math.max(4, Math.round(cats[c] / out * 100)) + '%"></i><b>' + money(cats[c]) + '</b></div>'; }).join('') + '</div></section>' : '')
				+ '<section class="dwdc-card"><div class="dwdc-cardh pad2"><h2>' + MN[mm - 1] + ' entries</h2></div>' + (rows.length ? rows.map(function (x) {
					return '<div class="dwdc-prow"><span class="d">' + fmt(x.date) + '</span><span class="w"><b>' + esc(x.label || (x.type === 'income' ? 'Money in' : 'Money out')) + '</b>' + (x.cat ? '<small>' + esc(x.cat) + '</small>' : '') + '</span><span class="a ' + (x.type === 'income' ? 'in' : 'out') + '">' + (x.type === 'income' ? '+' : '−') + money(x.amount) + '</span><button class="dwdc-del" data-pdel="money:' + x.id + '" title="Delete">' + ic('x', 14) + '</button></div>';
				}).join('') : emptyRow('Nothing logged this month yet.')) + '</section>';
		}
		if (tab === 'bills') {
			var bl = D.bills.map(function (b) { return { b: b, n: billNext(b) }; }).sort(function (a, b) { return a.n.paid - b.n.paid || (a.n.due < b.n.due ? -1 : 1); });
			var mo = D.bills.reduce(function (a, b) { return a + billMonthly(b); }, 0);
			var dueSoon = bl.filter(function (x) { return !x.n.paid && x.n.due <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10); });
			var late = bl.filter(function (x) { return x.n.late; });
			return '<div class="dwdc-kpis">' + kpi('Bills per month', money(mo), D.bills.length + ' bills · ' + money(mo * 12) + ' a year', 'navy') + kpi('Due in 7 days', String(dueSoon.length), money(dueSoon.reduce(function (a, x) { return a + x.b.amount; }, 0)), dueSoon.length ? 'coral' : '') + kpi('Late', String(late.length), late.length ? 'Mark them paid once done' : 'All caught up') + '</div>'
				+ '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Add a bill</h2></div>'
				+ '<form class="dwdc-pform" data-pform="bills"><input name="name" placeholder="Bill (e.g. Rent, Phone)" required><input name="amount" inputmode="decimal" placeholder="$0.00" required><select name="freq"><option value="monthly">Monthly</option><option value="yearly">Yearly</option><option value="weekly">Weekly</option></select><label class="dwdc-pday"><span>Due day</span><input name="day" type="number" min="1" max="31" value="1"></label><label class="dwdc-pchk"><input type="checkbox" name="autopay"> Autopay</label><button class="dwdc-btn">' + ic('plus', 14) + 'Add</button></form>'
				+ '<p class="dwdc-mutp sm">Yearly bills use the due day of the month you add them in; weekly bills use 1 = Monday … 7 = Sunday.</p></section>'
				+ '<section class="dwdc-card">' + (bl.length ? bl.map(function (x) {
					var b = x.b, n = x.n;
					return '<div class="dwdc-prow bill' + (n.paid ? ' paid' : '') + (n.late ? ' late' : '') + '"><span class="dwdc-chk" data-pbillpaid="' + b.id + '" title="' + (n.paid ? 'Mark not paid' : 'Mark paid') + '">' + ic('check', 12) + '</span><span class="w"><b>' + esc(b.name) + '</b><small>' + (b.freq === 'yearly' ? 'Yearly' : b.freq === 'weekly' ? 'Weekly' : 'Monthly') + (b.autopay ? ' · Autopay' : '') + '</small></span><span class="d2">' + (n.paid ? 'Paid' : n.late ? 'Late · ' + fmt(n.due) : 'Due ' + fmt(n.due)) + '</span><span class="a">' + money(b.amount) + '</span><button class="dwdc-del" data-pdel="bills:' + b.id + '" title="Delete">' + ic('x', 14) + '</button></div>';
				}).join('') : emptyRow('No bills yet. Add your first one above.')) + '</section>';
		}
		if (tab === 'spending') { return spendingView(); }
		if (tab === 'subs') { return subsView(); }
		if (tab === 'home') {
			var today = DWDC.today, addD = function (n) { var d = new Date(today + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
			var tmin = function (x) { if (!x.time) { return -1; } var q = /^(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(x.time) || [0, 0, 0]; return (+q[1] % 12 + (/p/i.test(q[3] || '') ? 12 : 0)) * 60 + +q[2]; };
			var openT = D.todos.filter(function (x) { return !x.done; });
			var late = openT.filter(function (x) { return x.due && x.due < today && !x.gevent; });
			var todayT = openT.filter(function (x) { return x.due === today || (!x.due && !x.gevent); }).sort(function (a, b) { return tmin(a) - tmin(b); });
			var nodate = openT.filter(function (x) { return !x.due; });
			var soon = openT.filter(function (x) { return x.due > today && x.due <= addD(14); }).sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : tmin(a) - tmin(b); });
			var bdays = D.todos.filter(function (x) { return /birthday/i.test(x.text) && x.due >= today && x.due <= addD(60); }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
			var mk = pMonthKey(), mrows = D.money.filter(function (x) { return x.date.slice(0, 7) === mk; });
			var inc = mrows.filter(function (x) { return x.type === 'income'; }).reduce(function (a, x) { return a + x.amount; }, 0), out = mrows.filter(function (x) { return x.type !== 'income'; }).reduce(function (a, x) { return a + x.amount; }, 0);
			var BK = bData(), bm = BK && BK.months && BK.months[mk];
			if (bm) { inc += bm.in; out += bm.out; }
			var subsMo = BK && BK.subs ? BK.subs.filter(function (x) { return !x.stopped && x.status !== 'ignore'; }).reduce(function (a, x) { return a + x.monthly; }, 0) : 0;
			var bl = D.bills.map(function (b) { return { b: b, n: billNext(b) }; }).filter(function (x) { return !x.n.paid; }).sort(function (a, b) { return a.n.due < b.n.due ? -1 : 1; });
			var billsMo = D.bills.reduce(function (a, b) { return a + billMonthly(b); }, 0);
			var row = function (x, showDate) {
				var when = showDate ? (x.due === addD(1) ? 'Tomorrow' : new Date(x.due + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })) : (x.time || (x.gevent ? 'All day' : ''));
				return '<button type="button" class="dwdc-ph-row ' + (x.gevent ? 'ev' : 'td') + (isFlight(x.text) ? ' flight' : '') + '" data-ptask="' + x.id + '">' + (x.gevent ? '<i class="dot"></i>' : '<span class="dwdc-chk" data-ptoggle="' + x.id + '">' + ic('check', 11) + '</span>') + '<span class="tx"><b>' + esc(ptx(x.text)) + '</b>' + (when ? '<small>' + esc(when) + (showDate && x.time ? ' · ' + esc(x.time) : '') + '</small>' : '') + '</span></button>';
			};
			// this week strip
			var wk = '', start = new Date(today + 'T12:00:00'); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
			for (var wi = 0; wi < 7; wi++) {
				var wd = new Date(start); wd.setDate(start.getDate() + wi); var ws = wd.toISOString().slice(0, 10);
				var its = D.todos.filter(function (x) { return x.due === ws && !x.done; });
				wk += '<div class="dwdc-wk-d' + (ws === today ? ' today' : '') + (ws < today ? ' past' : '') + '" data-pday="' + ws + '"><small>' + wd.toLocaleDateString('en-US', { weekday: 'short' }) + '</small><b>' + wd.getDate() + '</b>' + its.slice(0, 3).map(function (x) { return '<span class="' + (x.gevent ? 'ev' : 'td') + '">' + esc(ptx(x.text)) + '</span>'; }).join('') + (its.length > 3 ? '<em>+' + (its.length - 3) + ' more</em>' : '') + '</div>';
			}
			var greet = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
			// Combined checking balance (business + personal), live from Plaid (refreshed at most every 30 min).
			var bbox = (function () {
				var BA = BK && BK.balances && BK.balances.accounts ? BK.balances.accounts.filter(function (x) { return x.type === 'checking'; }) : [];
				var bv = function (x) { return x.available != null ? x.available : (x.current || 0); }, tot = BA.reduce(function (a, x) { return a + bv(x); }, 0);
				if (!BK) { return '<a class="dwdc-pbal" href="#personal/spending"><small>Bank balance today</small><strong>…</strong></a>'; }
				if (!BA.length) { return '<a class="dwdc-pbal" href="#personal/spending"><small>Bank balance today</small><strong>—</strong><span>Connect your bank in Personal → Spending to see it here.</span></a>'; }
				return '<a class="dwdc-pbal" href="#personal/spending"><div><small>Bank balance today · business + personal</small><strong>' + money2(tot) + '</strong><span>Available in checking' + (BK.balances.at ? (function () { var u = new Date(BK.balances.at.replace(' ', 'T') + 'Z'), sameDay = u.toDateString() === new Date().toDateString(); return ' · updated ' + (sameDay ? '' : u.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ') + u.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); })() : '') + '</span></div>'
					+ '<ul>' + BA.slice().sort(function (a, b) { return (b.business ? 1 : 0) - (a.business ? 1 : 0); }).map(function (x) { return '<li><small>' + (x.business ? 'Business' : 'Personal') + ' ••' + esc(x.mask) + '</small><b>' + money2(bv(x)) + '</b></li>'; }).join('') + '</ul></a>';
			})();
			// One to-do list, in order: Today → Overdue → To-do (no date) → Upcoming. Filter by category pill.
			var ftag = S.pTag || '', okTag = function (x) { return !ftag || tagOf(x) === ftag; };
			var trow = function (x, showDate) { var tg = tagOf(x); return row(x, showDate).replace('</b>', '</b>' + (tg ? '<em class="dwdc-ptag t-' + tg + '">' + PTAGS[tg] + '</em>' : '')); };
			// Sections: Overdue → Today → Tomorrow → This week (to Sunday) → This month → No date.
			var isoOf = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
			var t0 = new Date(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
			var tmr = isoOf(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + 1));
			var wkEnd = isoOf(new Date(t0.getFullYear(), t0.getMonth(), t0.getDate() + (7 - (t0.getDay() || 7))));
			var byDue = function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : tmin(a) - tmin(b); };
			var secs = [
				['Overdue', late.slice().sort(function (a, b) { return a.due < b.due ? 1 : -1; }), true],
				['Today', todayT.filter(function (x) { return x.due === today; }), false],
				['Tomorrow', openT.filter(function (x) { return x.due === tmr; }).sort(byDue), false],
				['This week', openT.filter(function (x) { return x.due > tmr && x.due <= wkEnd; }).sort(byDue), true],
				['This month', openT.filter(function (x) { return x.due > wkEnd && x.due > tmr && x.due.slice(0, 7) === today.slice(0, 7); }).sort(byDue).slice(0, 80), true],
				['No date', openT.filter(function (x) { return !x.due && !x.gevent; }), false]
			];
			var allOpen = openT.filter(function (x) { return !x.gevent; });
			var pills = '<div class="dwdc-ptagf"><button type="button" class="' + (!ftag ? 'on' : '') + '" data-ptagf="">All <b>' + allOpen.length + '</b></button>' + Object.keys(PTAGS).map(function (k) { var n = allOpen.filter(function (x) { return tagOf(x) === k; }).length; return n || ftag === k ? '<button type="button" class="t-' + k + (ftag === k ? ' on' : '') + '" data-ptagf="' + k + '">' + PTAGS[k] + ' <b>' + n + '</b></button>' : ''; }).join('') + '</div>';
			var listHtml = secs.map(function (sc) {
				var its = sc[1].filter(okTag);
				return its.length ? '<p class="dwdc-ptl-h' + (sc[0] === 'Overdue' ? ' late' : '') + '">' + sc[0] + ' <b>' + its.length + '</b></p>' + its.map(function (x) { return trow(x, sc[2]); }).join('') : '';
			}).join('');
			var todoCard = card('cd-ptodo1', '<header class="dwdc-dhead"><span class="dwdc-dic">' + ic('todo', 18) + '</span><h2>To-Do List <span class="dwdc-cnt">' + allOpen.length + '</span></h2><button type="button" class="dwdc-btn coral sm dwdc-addtask" data-addtask>' + ic('plus', 14) + 'Add task</button></header>',
				pills + '<div class="dwdc-ptl">' + (listHtml || emptyRow(ftag ? 'Nothing tagged ' + PTAGS[ftag] + '.' : 'Nothing on your list. Nice.')) + '</div>');
			// Right side: bank balance, then the month calendar (day squares; clicking a day opens that day).
			var calHtml = personalView({ view: 'personal', arg: 'calendar' });
			return '<p class="dwdc-pgreet">' + greet + ', Michael. Here’s your day.</p>'
				+ '<div class="dwdc-phome"><div class="dwdc-phl">' + todoCard + '</div><div class="dwdc-phr">'
				+ bbox
				+ '<div class="dwdc-phcal">' + calHtml + '</div>'
				+ '</div></div>' + connPanel();
		}
		if (tab === 'calendar') {
			var today = DWDC.today, MNs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MNf = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			var cm = S.pCal || pMonthKey(), cy = +cm.slice(0, 4), cmo = +cm.slice(5, 7), F = S.pCalF || { td: true, ev: true, bill: true };
			var sel = S.pSel || today;
			var iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
			var short = function (tm) { var q = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(String(tm || '').trim()); return q ? (+q[1]) + (q[2] === '00' ? '' : ':' + q[2]) + q[3].toLowerCase() : String(tm || ''); };
			var tmin = function (x) { if (!x.time) { return -1; } var q = /^(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(x.time) || [0, 0, 0]; return (+q[1] % 12 + (/p/i.test(q[3] || '') ? 12 : 0)) * 60 + +q[2]; };
			var billsOn = function (ds) {
				var dd = new Date(ds + 'T12:00:00'), dim = new Date(dd.getFullYear(), dd.getMonth() + 1, 0).getDate();
				return D.bills.filter(function (b) {
					if (b.freq === 'weekly') { return ((dd.getDay() + 6) % 7) + 1 === b.day; }
					if (b.freq === 'yearly' && b.month !== dd.getMonth() + 1) { return false; }
					return Math.min(b.day, dim) === dd.getDate();
				}).map(function (b) { var key = b.freq === 'yearly' ? ds.slice(0, 4) : b.freq === 'weekly' ? ds : ds.slice(0, 7); return { kind: 'bill', text: b.name + ' · ' + money(b.amount), done: !!(b.paid && b.paid[key]), b: b }; });
			};
			var itemsOn = function (ds, all) {
				var list = D.todos.filter(function (x) { return x.due === ds; }).map(function (x) { return { kind: x.gevent ? 'ev' : 'td', fl: isFlight(x.text), text: ptx(x.text), time: x.time, done: x.done, id: x.id, src: x.gevent ? 'Google Calendar' : (x.source === 'Google Tasks' ? 'Google Tasks' : 'Personal') }; });
				list = list.concat(billsOn(ds));
				if (!all) { list = list.filter(function (x) { return F[x.kind]; }); }
				return list.sort(function (a, b) { return a.done - b.done || tmin(a) - tmin(b); });
			};
			// counts for the visible month (chips)
			var cnt = { td: 0, ev: 0, bill: 0 }, dimM = new Date(cy, cmo, 0).getDate();
			for (var dc = 1; dc <= dimM; dc++) { itemsOn(cm + '-' + ('0' + dc).slice(-2), true).forEach(function (x) { cnt[x.kind]++; }); }
			var first = new Date(cy, cmo - 1, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
			var weeks = Math.ceil((((first.getDay() + 6) % 7) + dimM) / 7), cells = '';
			for (var ci = 0; ci < weeks * 7; ci++) {
				var cd = new Date(start); cd.setDate(start.getDate() + ci); var ds = iso(cd), inM = cd.getMonth() === cmo - 1;
				var its = itemsOn(ds), lbl = cd.getDate() === 1 && !inM ? MNs[cd.getMonth()] + ' 1' : String(cd.getDate());
				cells += '<div class="dwdc-c2-d' + (inM ? '' : ' out') + (ds === today ? ' today' : '') + (ds === sel ? ' sel' : '') + '" data-psel="' + ds + '">'
					+ '<div class="dwdc-c2-n">' + (ds === today ? '<b>' + cd.getDate() + '</b><span>Today</span>' : lbl) + '</div>'
					+ its.slice(0, 3).map(function (x) { return '<button type="button" class="dwdc-c2-i ' + x.kind + (x.fl ? ' flight' : '') + (x.done ? ' done' : '') + '"' + (x.id ? ' data-ptask="' + x.id + '"' : ' data-gobills') + '>' + (x.time ? '<em>' + esc(short(x.time)) + '</em> ' : '') + esc(x.text) + '</button>'; }).join('')
					+ (its.length > 3 ? '<span class="dwdc-c2-more">+' + (its.length - 3) + ' more</span>' : '') + '</div>';
			}
			var shift = function (n) { var d = new Date(cy, cmo - 1 + n, 1); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); };
			var chip = function (k, label) { return '<button type="button" class="dwdc-c2-chip ' + k + (F[k] ? ' on' : '') + '" data-pcalf="' + k + '"><i></i>' + label + '<b>' + cnt[k] + '</b></button>'; };
			// side: selected day
			var sd = new Date(sel + 'T12:00:00'), sitems = itemsOn(sel, true);
			var kindLbl = { td: 'To-do', ev: 'Event', bill: 'Bill' };
			var side = '<section class="dwdc-c2-day"><header><div class="dwdc-c2-badge"><small>' + MNs[sd.getMonth()].toUpperCase() + '</small><b>' + sd.getDate() + '</b></div><div><small>' + (sel === today ? 'Today · ' : '') + sd.toLocaleDateString('en-US', { weekday: 'long' }) + '</small><h3>' + MNf[sd.getMonth()] + ' ' + sd.getDate() + '</h3></div><span class="dwdc-c2-cnt">' + sitems.length + ' item' + (sitems.length === 1 ? '' : 's') + '</span></header>'
				+ '<div class="dwdc-c2-list">' + (sitems.length ? sitems.map(function (x) {
					return '<div class="dwdc-c2-row ' + x.kind + (x.fl ? ' flight' : '') + (x.done ? ' done' : '') + '"' + (x.id ? ' data-ptask="' + x.id + '"' : ' data-gobills') + '><div><p><b>' + esc(x.time ? short(x.time) : 'All day') + '</b><span>' + kindLbl[x.kind] + '</span></p><h4>' + esc(x.text) + '</h4><small>' + esc(x.src || 'Bills') + '</small></div>'
						+ (x.kind === 'td' ? '<span class="dwdc-chk' + (x.done ? ' on' : '') + '" data-ptoggle="' + x.id + '">' + ic('check', 12) + '</span>' : '') + '</div>';
				}).join('') : '<p class="dwdc-c2-empty">Nothing on this day.</p>') + '</div>'
				+ '<form class="dwdc-c2-add" data-pform="pdayadd"><input type="hidden" name="due" value="' + sel + '"><input name="text" placeholder="Add a to-do for ' + MNs[sd.getMonth()] + ' ' + sd.getDate() + '…" autocomplete="off" required><button class="dwdc-btn">Add</button></form></section>';
			// side: coming up 7 days
			var up = [];
			for (var ui = 0; ui < 7; ui++) { var ud = new Date(today + 'T12:00:00'); ud.setDate(ud.getDate() + ui + 1); var us = iso(ud); itemsOn(us, true).filter(function (x) { return !x.done; }).forEach(function (x) { up.push({ d: ud, x: x }); }); }
			var soon = '<section class="dwdc-c2-up"><header><h3>Coming up</h3><span>Next 7 days</span></header>' + (up.length ? up.slice(0, 12).map(function (u) {
				var x = u.x; return '<div class="dwdc-c2-urow"' + (x.id ? ' data-ptask="' + x.id + '"' : ' data-gobills') + '><div class="d"><small>' + u.d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() + '</small><b>' + u.d.getDate() + '</b></div><i class="' + x.kind + (x.fl ? ' flight' : '') + '"></i><div class="t"><b>' + esc(x.text) + '</b><small>' + esc(x.time ? short(x.time) : 'All day') + ' · ' + (x.kind === 'ev' ? 'Google Calendar' : kindLbl[x.kind]) + '</small></div></div>';
			}).join('') : '<p class="dwdc-c2-empty">Nothing in the next week.</p>') + '</section>';
			return '<div class="dwdc-c2-top"><div class="dwdc-c2-nav"><button type="button" data-pcal="' + shift(-1) + '" aria-label="Previous month">' + ic('left', 16) + '</button><button type="button" data-pcaltoday>Today</button><button type="button" data-pcal="' + shift(1) + '" aria-label="Next month">' + ic('right', 16) + '</button></div><h2 class="dwdc-c2-month">' + MNf[cmo - 1] + ' ' + cy + '</h2><div class="dwdc-c2-chips">' + chip('td', 'To-dos') + chip('ev', 'Google Calendar') + chip('bill', 'Bills') + '</div></div>'
				+ '<div class="dwdc-c2"><section class="dwdc-c2-cal"><div class="dwdc-c2-h">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="dwdc-c2-g">' + cells + '</div></section><aside class="dwdc-c2-side">' + side + soon + '</aside></div>';
		}
		if (tab === 'done') {
			var dn = D.todos.filter(function (t) { return t.done; }).sort(function (a, b) { return (b.done_at || '') < (a.done_at || '') ? -1 : 1; });
			return '<section class="dwdc-card">' + (dn.length ? '<div class="dwdc-todos donelist">' + dn.map(pTodoRow).join('') + '</div>' : emptyRow('Nothing completed yet.')) + '</section>';
		}
		// To-do
		var open = D.todos.filter(function (t) { return !t.done; }).sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : 1; });
		var done = D.todos.filter(function (t) { return t.done; }).sort(function (a, b) { return (b.done_at || '') < (a.done_at || '') ? -1 : 1; });
		var G = S.pGoogle, GL = G && G.last;
		if (!G && !S.pGoogleLoading) { S.pGoogleLoading = true; api('/personal/google').then(function (x) { S.pGoogle = x; render(); }).catch(function () {}); }
		return '<section class="dwdc-card dwdc-ptodo"><div class="dwdc-cardh pad2"><h2>My To-Dos <span class="dwdc-cnt">' + open.length + '</span></h2></div><div class="dwdc-ptadd btnonly"><button type="button" class="dwdc-btn coral dwdc-addtask" data-addtask>' + ic('plus', 16) + 'Add task</button><span>Tell it what to add — “call mom Sunday at 5” — by typing or talking.</span></div>'
			+ (open.length ? '<div class="dwdc-todos">' + open.map(pTodoRow).join('') + '</div>' : emptyRow('Nothing on your list.'))
			+ (done.length ? '<button class="dwdc-donebtn" data-pshowdone>' + (S.pShowDone ? 'Hide' : 'Show') + ' completed <b>' + done.length + '</b></button>' + (S.pShowDone ? '<div class="dwdc-todos donelist">' + done.slice(0, 40).map(pTodoRow).join('') + '</div>' : '') : '')
			+ '</section>'
			+ '<p class="dwdc-mutp sm dwdc-pgnote">' + (GL ? 'Google Tasks &amp; Calendar connected · last synced ' + fmt(GL.at, true) : 'Connect Google Tasks &amp; Calendar in <a href="#personal" data-openconn>Personal → Connections</a>.') + '</p>';
	}

	/* ---------- Quote of the day (non-dual teachers) — same quote all day, a new one each morning ---------- */
	var QUOTES = [
		['We’re all just walking each other home.', 'Ram Dass'],
		['The quieter you become, the more you can hear.', 'Ram Dass'],
		['Treat everyone you meet like God in drag.', 'Ram Dass'],
		['If you think you’re enlightened, go spend a week with your family.', 'Ram Dass'],
		['I would like my life to be a statement of love and compassion — and where it isn’t, that’s where my work lies.', 'Ram Dass'],
		['Love everyone, serve everyone, remember God.', 'Neem Karoli Baba (Maharaj-ji)'],
		['It is better to see God in everything than to try to figure it out.', 'Neem Karoli Baba (Maharaj-ji)'],
		['Wisdom tells me I am nothing. Love tells me I am everything. Between the two my life flows.', 'Sri Nisargadatta Maharaj'],
		['The mind creates the abyss, the heart crosses it.', 'Sri Nisargadatta Maharaj'],
		['All you need is already within you, only you must approach your self with reverence and love.', 'Sri Nisargadatta Maharaj'],
		['To know that you are a prisoner of your mind, that you live in an imaginary world of your own creation, is the dawn of wisdom.', 'Sri Nisargadatta Maharaj'],
		['This is the real secret of life — to be completely engaged with what you are doing in the here and now.', 'Alan Watts'],
		['The only way to make sense out of change is to plunge into it, move with it, and join the dance.', 'Alan Watts'],
		['You are an aperture through which the universe is looking at and exploring itself.', 'Alan Watts'],
		['Muddy water is best cleared by leaving it alone.', 'Alan Watts'],
		['Trying to define yourself is like trying to bite your own teeth.', 'Alan Watts'],
		['Nature loves courage. You make the commitment and nature will respond to that commitment by removing impossible obstacles.', 'Terence McKenna'],
		['The cost of sanity in this society is a certain level of alienation.', 'Terence McKenna'],
		['You are a divine being. You matter, you count. You come from realms of unimaginable power and light.', 'Terence McKenna'],
		['Enlightenment is a destructive process. It has nothing to do with becoming better or being happier.', 'Adyashanti'],
		['The present moment is filled with joy and happiness. If you are attentive, you will see it.', 'Thich Nhat Hanh'],
		['Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.', 'Thich Nhat Hanh'],
		['Walk as if you are kissing the Earth with your feet.', 'Thich Nhat Hanh'],
		['Because you are alive, everything is possible.', 'Thich Nhat Hanh'],
		['Smile, breathe, and go slowly.', 'Thich Nhat Hanh'],
		['Happiness is your nature. It is not wrong to desire it. What is wrong is seeking it outside when it is inside.', 'Ramana Maharshi'],
		['Your own Self-Realization is the greatest service you can render the world.', 'Ramana Maharshi'],
		['Realize deeply that the present moment is all you have.', 'Eckhart Tolle'],
		['Life is the dancer and you are the dance.', 'Eckhart Tolle']
	];
	// One quote a day: random, never repeating until every quote has been shown. X (or a swipe) hides it until tomorrow.
	function quoteBar() {
		var d = DWDC.today || new Date().toISOString().slice(0, 10), st = {};
		try { if (localStorage.getItem('dwdcQuoteHide') === d) { return ''; } st = JSON.parse(localStorage.getItem('dwdcQuote') || '{}') || {}; } catch (e) { st = {}; }
		if (st.day !== d || typeof st.i !== 'number' || !QUOTES[st.i]) {
			var used = (st.used || []).filter(function (i) { return i < QUOTES.length; });
			if (used.length >= QUOTES.length) { used = typeof st.i === 'number' ? [st.i] : []; }
			var left = QUOTES.map(function (q, i) { return i; }).filter(function (i) { return used.indexOf(i) < 0 && i !== st.i; });
			st = { day: d, i: left[Math.floor(Math.random() * left.length)], used: used.concat([]) };
			st.used.push(st.i);
			try { localStorage.setItem('dwdcQuote', JSON.stringify(st)); } catch (e) {}
		}
		var q = QUOTES[st.i];
		return '<div class="dwdc-quote" data-quote><span class="dwdc-quote-q">“' + esc(q[0]) + '”</span><span class="dwdc-quote-a">— ' + esc(q[1]) + '</span><button type="button" class="dwdc-quote-x" data-quotex aria-label="Hide until tomorrow" title="Hide until tomorrow">' + ic('x', 14) + '</button></div>';
	}
	function hideQuote(el) {
		try { localStorage.setItem('dwdcQuoteHide', DWDC.today || new Date().toISOString().slice(0, 10)); } catch (e) {}
		if (el) { el.classList.add('gone'); setTimeout(function () { render(); }, 260); } else { render(); }
	}

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
	// Phone / app only: a sticky tab bar at the bottom (hidden on desktop by CSS).
	function tabBar(r) {
		var pers = r.view === 'personal', a = r.arg || '';
		var tabs = pers
			? [['personal/todo', 'todo', 'To-Do', 'c1', a === 'todo' || a === 'calendar' || a === 'done'], ['personal/spending', 'dollar', 'Finances', 'c3', a === 'spending' || a === 'subs' || a === 'finances'], ['personal/bills', 'card', 'Bills', 'c4', a === 'bills']]
			: [['home', 'home', 'Home', 'c1', r.view === 'home' || r.view === ''], ['projects/active', 'brief', 'Projects', 'c0', r.view === 'projects' || r.view === 'client'], ['money', 'dollar', 'Finances', 'c3', r.view === 'money']];
		if (window.innerWidth > 768) { return ''; }
		return '<nav class="dwdc-tabbar' + (pers ? ' pers' : '') + '" aria-label="Quick menu" style="position:fixed;left:0;right:0;bottom:0;z-index:9990">' + tabs.map(function (x) { return '<a class="' + x[3] + (x[4] ? ' on' : '') + '" href="#' + x[0] + '">' + ic(x[1], 20) + '<span>' + x[2] + '</span></a>'; }).join('') + '</nav>';
	}
	function sidebar(r) {
		var cur = r.view === 'client' || r.view === 'cl' ? S.back : r.view + (r.arg ? '/' + r.arg : '');
		var nav = function (h, icon, label, count) {
			var on = cur === h || (h === 'projects/active' && (cur === 'projects' || cur === 'projects/all'));
			return '<a class="dwdc-nav' + (on ? ' on' : '') + '" href="#' + h + '">' + ic(icon) + '<span>' + label + '</span>' + (count ? '<b>' + count + '</b>' : '') + '</a>';
		};
		var proj = S.contacts.filter(isProject);
		return '<aside class="dwdc-side">'
			+ '<a class="dwdc-brand" href="#home"><span class="dwdc-mark"><img src="' + esc(DWDC.mark) + '" alt=""></span><span><strong>Dream Desk</strong><small>Dream Web Digital</small></span></a>'
			+ (true ? '' : '<label class="dwdc-ssearch">' + ic('search', 16) + '<input type="search" placeholder="Search..." value="' + esc(S.q) + '"><kbd>Ctrl K</kbd></label>')
			+ '<nav>' + nav('home', 'brief', 'Business') + '<a class="dwdc-nav dwdc-pswitch' + (r.view === 'personal' ? ' on' : '') + '" href="#personal">' + ic('user', 18) + '<span>Personal</span></a>'
			+ (r.view === 'personal' ? '<div class="dwdc-navh"><i class="b2"></i>To-Do</div>' + nav('personal/todo', 'todo', 'My To-Dos', S.pers ? S.pers.todos.filter(function (x) { return !x.done; }).length : '') + nav('personal/calendar', 'clock', 'Calendar') + nav('personal/done', 'done', 'Completed', S.pers ? S.pers.todos.filter(function (x) { return x.done; }).length : '')
				+ '<div class="dwdc-navh fin"><i class="b4"></i>Finances</div>' + nav('personal/spending', 'card', 'Spending') + nav('personal/subs', 'refresh', 'Subscriptions') + nav('personal/finances', 'dollar', 'Money In &amp; Out') + '<div class="dwdc-navh pb"><i class="b5"></i>Bills</div>' + nav('personal/bills', 'card', 'Upcoming Bills') + '</nav><a class="dwdc-me" href="' + esc(DWDC.logout) + '" title="Sign out"><span class="dwdc-me-av">MT</span><span><strong>' + esc(DWDC.user || 'Michael Tarr') + '</strong><small>Owner · Sign out</small></span>' + ic('logout', 17) + '</a></aside>' : '')
			+ (r.view === 'personal' ? '' : '<div class="dwdc-navh"><i class="b1"></i>Projects</div>'
			+ nav('projects/active', 'bolt', 'Active', by('active').length) + nav('leads', 'user', 'Leads', leadList().length) + nav('onboarding', 'filter', 'Onboarding', onboardList().length)
			+ nav('projects/hold', 'pause', 'On Hold', by('hold').length)
			+ nav('projects/limbo', 'clock', 'Limbo', by('limbo').length) + nav('projects/complete', 'done', 'Completed', by('complete').length)
			+ '<div class="dwdc-navh"><i class="b2"></i>Clients</div>'
			+ nav('clients', 'users', 'All Clients', S.clients.length) + nav('hosting', 'server', 'Hosting', hosting().length) + nav('reviews', 'mail', 'Get Reviews')
			+ '<div class="dwdc-navh fin"><i class="b4"></i>Finances</div>' + nav('money', 'dollar', 'Money Stats')
			+ '<div class="dwdc-navh"><i class="b3"></i>More</div>'
			+ '<a class="dwdc-nav" href="' + esc(DWDC.wp) + '">' + ic('wp') + '<span>WordPress Admin</span></a>'
			+ '</nav><a class="dwdc-me" href="' + esc(DWDC.logout) + '" title="Sign out"><span class="dwdc-me-av">MT</span><span><strong>' + esc(DWDC.user || 'Michael Tarr') + '</strong><small>Owner · Sign out</small></span>' + ic('logout', 17) + '</a></aside>');
	}
	function top(r, t) {
		var SEC = { Projects: 'projects/active', Project: 'projects/active', Clients: 'clients', Client: 'clients', Finances: 'money', 'Website Hosted': 'hosting', Search: 'home' };
		var page = [t[1], t[2]].filter(Boolean).join(' ').toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); });
		var crumb = r.view === 'home'
			? '<a href="#home">Dream Desk</a><span aria-hidden="true">/</span><strong>' + esc(t[0]) + '</strong>'
			: '<a href="#' + (SEC[t[0]] || 'home') + '">' + esc(t[0] || 'Dream Desk') + '</a><span aria-hidden="true">/</span><strong>' + esc(page) + '</strong>';
		var plus = ic('plus', 14), menuOpen = !!S.newOpen;
		if (r.view === 'client') { // project page: back link, search, New (no big title)
			var bk = { home: 'Home', leads: 'Leads', forms: 'Form entries', todos: 'To-dos', hosting: 'Hosting', projects: 'Projects', clients: 'Clients', archive: 'Archive', search: 'Search', onboarding: 'Onboarding', cl: 'Client' }[(S.back || 'projects').split('/')[0]] || 'Projects';
			return '<header class="dwdc-ph pv3-tb" data-view="client"><button class="dwdc-burger" data-menu aria-label="Menu">' + ic('menu', 20) + '</button>'
				+ '<a class="pv3-back" href="#' + (S.back || 'projects/active') + '">' + ic('left', 14) + bk + '</a>'
				+ '<label class="dwdc-ssearch dwdc-ph-search">' + ic('search', 16) + '<input type="search" name="dwdc-find" placeholder="Search clients…" aria-label="Search clients" value="" autocomplete="off" readonly data-lpignore="true" data-1p-ignore data-form-type="other"><kbd>Ctrl K</kbd></label>'
				+ '<span class="dwdc-ph-sp"></span>' + newMenu() + '</header>';
		}
		return '<header class="dwdc-ph" data-view="' + r.view + '">'
			+ '<div class="dwdc-ph-id"><button class="dwdc-burger" data-menu aria-label="Menu">' + ic('menu', 20) + '</button><div>'
			+ '<p class="dwdc-ph-crumb">' + crumb + '</p>'
			+ '<h1 class="dwdc-ph-title">' + esc(t[1]) + (t[2] ? (t[1] ? ' ' : '') + '<b>' + esc(t[2]) + '</b>' : '') + '</h1></div></div>'
			+ (r.view === 'personal' ? '</header>' : '<div class="dwdc-ph-tools">'
			+ '<label class="dwdc-ssearch dwdc-ph-search">' + ic('search', 16) + '<input type="search" name="dwdc-find" placeholder="Search clients…" aria-label="Search clients" value="" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" readonly data-lpignore="true" data-1p-ignore data-form-type="other"><kbd>Ctrl K</kbd></label>'
			+ '<span class="dwdc-ph-sp"></span>'
			+ (r.view === 'client' ? '' : '<div class="dwdc-ph-menu' + (menuOpen ? ' open' : '') + '"><button class="dwdc-ph-btn outline" type="button" data-newmenu aria-haspopup="menu" aria-expanded="' + menuOpen + '">' + plus + 'New' + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>'
			+ '<ul role="menu"><li><button role="menuitem" type="button" data-act="job">' + plus + 'Project</button></li><li><button role="menuitem" type="button" data-act="newclient">' + plus + 'Client</button></li><li><button role="menuitem" type="button" data-act="hosting">' + plus + 'Website Hosting</button></li></ul></div>'
			+ (r.view === 'money' ? '<button class="dwdc-ph-btn coral" type="button" data-refresh' + (S.refreshRes && S.refreshRes.busy ? ' disabled' : '') + '>' + ic('refresh', 14) + (S.refreshRes && S.refreshRes.busy ? 'Updating…' : '<span class="lg">Update Finances</span><span class="sm">Update</span>') + '</button>' : '')
			+ '<button class="dwdc-ph-btn primary" type="button" data-act="pay">' + ic('card', 14) + '<span class="lg">Log Payment</span><span class="sm">Payment</span></button>')
			+ '</div></header>');
	}

	function syncWpMenu(r) {
		document.body.classList.toggle('dwd-pmode', r.view === 'personal');
		if (r.view === 'personal' && S.pers) {
			var pc = { 'personal/todo': S.pers.todos.filter(function (x) { return !x.done; }).length, 'personal/done': S.pers.todos.filter(function (x) { return x.done; }).length, 'personal/bills': S.pers.bills.filter(function (b) { var n = billNext(b); return !n.paid && n.due <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10); }).length };
			Object.keys(pc).forEach(function (h) { var li = document.getElementById('dwd-dd-' + h.replace('/', '-')); if (!li) { return; } var nm = li.querySelector('.wp-menu-name'), b = nm && nm.querySelector('.dwdc-mcount'); if (!nm) { return; } if (!b) { b = document.createElement('span'); b.className = 'dwdc-mcount'; nm.appendChild(b); } b.textContent = pc[h]; });
		}
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
			if (counts[h] !== undefined && name) { if (!b) { b = document.createElement('span'); b.className = 'dwdc-mcount'; name.appendChild(b); } b.textContent = counts[h]; b.hidden = !counts[h]; }
			if (on) { var sec = li.previousElementSibling; while (sec && !sec.classList.contains('dwd-msec')) { sec = sec.previousElementSibling; } if (sec && sec.classList.contains('dwd-closed')) { sec.click(); } }
		});
	}
	// Projects box on Home: show only the rows that fit beside the other boxes; the rest are one click away.
	function fitProjects() {
		var wrap = app.querySelector('.dwdc-pl-wrap'); if (!wrap) { return; }
		var rows = [].slice.call(wrap.querySelectorAll('.dwdc-pl-row')), h = wrap.clientHeight, shown = 0;
		// All rows stay in the list (it scrolls); just count how many fit for the "View all" link.
		rows.forEach(function (r) { r.style.display = ''; if (r.offsetTop + r.offsetHeight <= h + 1) { shown++; } });
		var all = app.querySelector('[data-plall]');
		if (all) { all.closest('footer').style.display = rows.length > shown ? '' : 'none'; }
	}
	window.addEventListener('resize', function () { fitProjects(); });
	// On phones every table becomes stacked cards; each cell gets its column name as a small label.
	function labelTables() {
		app.querySelectorAll('.dwdc-tbl').forEach(function (tb) {
			var head = tb.querySelector('.dwdc-grid.head'); if (!head) { return; }
			var names = [].map.call(head.children, function (h) { return h.textContent.trim(); });
			tb.querySelectorAll('.dwdc-grid.row').forEach(function (row) {
				[].forEach.call(row.children, function (cell, i) { if (names[i] && i > 0) { cell.setAttribute('data-l', names[i]); } });
			});
		});
	}
	function render(anim) {
		var r = route(), t = (TITLES[r.view] || ['', '', '']).slice(), body;
		if (r.view === 'home') { t[0] = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
		if (r.view === 'projects') {
			var pl = { active: ['Active', 'Projects'], limbo: ['Limbo', 'Projects'], hold: ['On Hold', 'Projects'], complete: ['Completed', 'Projects'] }[r.arg];
			if (pl) { t = ['Projects', pl[0], pl[1]]; }
		}
		if (r.view === 'personal') { t = ['Personal'].concat(!r.arg ? ['Personal', 'Dashboard'] : { finances: ['Money In &', 'Out'], bills: ['Upcoming', 'Bills'], done: ['Completed', 'To-Dos'], calendar: ['My', 'Calendar'], spending: ['My', 'Spending'], subs: ['My', 'Subscriptions'] }[r.arg] || ['My', 'To-Dos']); if (!r.arg) { t = ['Personal', 'Personal', 'Dashboard']; } }
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
			body = r.view === 'personal' ? personalView(r) : ({ home: home, clients: clientsView, projects: projectsView, leads: leadsList, onboarding: onboardView, todos: todosView, hosting: hostingView, money: moneyView, reviews: reviewsView, archive: archiveView, search: searchView }[r.view] || home)();
		}
		app.setAttribute('data-view', r.view);
		app.innerHTML = sidebar(r) + '<div class="dwdc-shade-m" data-menu></div><main class="dwdc-main">' + quoteBar() + appBanner() + top(r, t) + '<div class="dwdc-screen' + (anim ? ' in' : '') + '">' + body + '</div></main>' + tabBar(r) + modal();
		S.prev = r.view + r.arg;
		syncWpMenu(r);
		fitProjects();
		labelTables();
		if (S.focusSearch) { var q = app.querySelector('.dwdc-ssearch input'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } S.focusSearch = false; }
		if (S.cardTodo) { var ti = app.querySelector('.dwdc-cardtodo input'); if (ti) { ti.focus(); } }
	}

	/* ---------- Money: where the money came from ---------- */
	function busyMonths(MY, ylist) {
		var MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		var all = [];
		ylist.forEach(function (y) { (MY[y].m || []).forEach(function (v) { all.push(Math.max(0, +v || 0)); }); });
		var mx = Math.max.apply(null, all.concat([1]));
		var k = function (v) { return v >= 1000 ? '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : '$' + Math.round(v); };
		var head = '<div class="dwdc-bm-row head"><span></span>' + MN.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '<span>Best month</span></div>';
		var rows = ylist.map(function (y) {
			var m = (MY[y].m || []).map(function (v) { return Math.max(0, +v || 0); });
			var top = m.indexOf(Math.max.apply(null, m)), tot = m.reduce(function (a, b) { return a + b; }, 0);
			return '<div class="dwdc-bm-row"><b class="dwdc-bm-y">' + y + '</b>' + m.map(function (v, i) {
				var h = v ? Math.max(3, Math.round(v / mx * 100)) : 0, best = i === top && v;
				return '<div class="dwdc-bm-c' + (best ? ' best' : '') + '" data-month="' + y + '-' + ('0' + (i + 1)).slice(-2) + '" role="button" tabindex="0" title="' + MN[i] + ' ' + y + ': ' + money(v) + ' · click to see every payment">' + (best ? '<em>' + k(v) + '</em>' : '') + '<i style="height:' + h + '%"></i></div>';
			}).join('') + '<div class="dwdc-bm-best">' + (m[top] ? '<b>' + MN[top] + '</b><span>' + money(m[top]) + ' · ' + Math.round(m[top] / Math.max(1, tot) * 100) + '% of the year</span>' : '—') + '</div></div>';
		}).join('');
		return rows ? '<div class="dwdc-bm">' + head + rows + '</div>' : emptyRow('No dated payments yet.');
	}

	function connSummary() {
		var C = S.costs || {}, t = 0, q = 0;
		Object.keys(C).forEach(function (y) { t += C[y].connects; q += C[y].qty; });
		return t ? money(t) + ' spent · ' + q.toLocaleString() + ' Connects' : '';
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
			+ '</div>'
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
		var FL = X.upwork.files || [];
		var up = '<div class="dwdc-conn"><h3><i class="upw"></i>Upwork</h3><p>In Upwork go to <b>Reports → Transaction History</b>, pick a date range, <b>Download CSV</b> and add it here. Overlapping files are fine; nothing is counted twice.</p>'
			+ '<label class="dwdc-btn dwdc-upbtn">' + ic('plus', 14) + 'Add Upwork CSV<input type="file" accept=".csv,text/csv" data-upcsv hidden></label>'
			+ (FL.length ? '<ul class="dwdc-files">' + FL.slice().sort(function (a, b) { return a.from < b.from ? 1 : -1; }).map(function (f) {
				return '<li><span><b>' + esc(f.name) + '</b><small>' + fmt(f.from, true) + ' – ' + fmt(f.to, true) + ' · ' + f.payments + ' payments · ' + f.costs + ' Connects charges · added ' + fmt(f.uploaded, true) + '</small></span><button class="dwdc-lnk sm2 red" data-updel="' + f.id + '" data-upname="' + esc(f.name) + '">Delete</button></li>';
			}).join('') + '</ul>' : '<p class="dwdc-mutp sm">No Upwork files yet.</p>')
			+ (U ? '<div class="dwdc-conn-res">' + (U.error ? esc(U.error) : '<b>' + U.payments + ' Upwork payments</b> across ' + U.projects + ' projects, from ' + (U.files ? U.files.length : FL.length) + ' file' + ((U.files ? U.files.length : FL.length) === 1 ? '' : 's') + '.') + '</div>' : '')
			+ (U && U.unmatched && U.unmatched.length ? '<div class="dwdc-conn-map"><p><b>Which project is each of these?</b> Pick one, then save. Dream Desk remembers your picks.</p>' + U.unmatched.map(function (x) { return '<label><span>' + esc(x.team || '(no name)') + ' · ' + money(x.amount) + '</span><select data-upmap="' + esc(x.team) + '">' + pick() + '</select></label>'; }).join('') + '<button class="dwdc-btn" data-upagain>Save</button></div>' : '')
			+ '</div>';
		var stripe = '<div class="dwdc-conn"><h3><i class="str"></i>Stripe' + st(X.stripe.ready, X.stripe.last) + '</h3>'
			+ '<ol><li>In Stripe, go to <b>Developers → Webhooks → Add endpoint</b>.</li><li>Paste this link as the endpoint URL:' + copy(X.stripe.url) + '</li><li>Choose the events <b>invoice.paid</b> and <b>charge.succeeded</b>, then save.</li><li>Click <b>Reveal</b> under Signing secret and paste it here:</li></ol>'
			+ '<div class="dwdc-conn-f col"><input type="password" placeholder="Signing secret: whsec_…" data-sk="stripe_whsec"><input type="password" placeholder="Read-only key for Update Finances: rk_live_…" data-sk="stripe_key"><small class="dwdc-conn-last">For the key: <b>Developers → API keys → Create restricted key</b>, give it <b>Read</b> access to Charges, Customers and Invoices.' + (X.stripe.key ? ' <b>Key saved.</b>' : '') + '</small><button class="dwdc-btn" data-synsave="stripe">Save</button></div></div>';
		var pp = '<div class="dwdc-conn"><h3><i class="ppl"></i>PayPal' + st(X.paypal.ready, X.paypal.last) + '</h3>'
			+ '<ol><li>Go to <b>developer.paypal.com → Apps &amp; Credentials</b>, switch to <b>Live</b>, and <b>Create App</b>.</li><li>In the app, under <b>Live Webhooks</b>, add this link:' + copy(X.paypal.url) + 'with the events <b>Invoicing invoice paid</b> and <b>Payment capture completed</b>.</li><li>Under the app’s <b>Features</b>, tick <b>Transaction search</b> (used by Update Finances).</li><li>Paste the app’s Client ID, Secret and the Webhook ID here:</li></ol>'
			+ '<div class="dwdc-conn-f col"><input placeholder="Client ID" data-sk="paypal_id"><input type="password" placeholder="Secret" data-sk="paypal_secret"><input placeholder="Webhook ID" data-sk="paypal_hook"><button class="dwdc-btn" data-synsave="paypal">Save</button></div></div>';
		var R = S.refreshRes;
		var bar = '<div class="dwdc-refbar"><div><b>Update Finances</b><span>Re-reads your Upwork files, pulls every paid Stripe and PayPal payment, keeps the payments you logged by hand, then re-checks trends.' + (X.refreshed ? ' Last run ' + fmt(String(X.refreshed).slice(0, 10), true) + '.' : '') + '</span></div><button class="dwdc-btn dwdc-refbtn" data-refresh>' + ic('refresh', 15) + 'Update Finances</button></div>'
			+ (R ? '<div class="dwdc-conn-res big">' + refreshText(R) + '</div>' : '');
		if (!S.mail && !S.mailLoading) { S.mailLoading = true; api('/upwork-mail').then(function (x) { S.mail = x; S.mailLoading = false; if (route().view === 'money') { render(); } }).catch(function () { S.mailLoading = false; }); }
		var M = S.mail, ML = M && M.last;
		var mail = '<div class="dwdc-conn"><h3><i class="upw"></i>Upwork emails' + '<span class="dwdc-conn-st ' + (ML ? 'on' : 'off') + '">' + (ML ? 'Connected' : 'Not set up') + '</span>' + (ML ? '<small class="dwdc-conn-last">Last checked ' + fmt(ML.at, true) + ' · ' + (ML.created + ML.reopened + ML.completed + ML.check) + ' sent for your review</small>' : '') + '</h3>'
			+ '<p>Twice a week (Monday and Thursday mornings) your Gmail sends new Upwork “hired you”, offer and “contract ended” emails here. New contracts become Active projects (never duplicates), returning clients are reopened, and ended contracts move to Completed. Money still comes from the Upwork CSV.</p>'
			+ '<ol><li>Open <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener"><b>script.google.com → New project</b></a> while signed in as mike@dreamwebdigital.com.</li><li>Delete what’s there, then paste this script:' + (M ? '<div class="dwdc-conn-url"><code>Dream Desk Upwork sync script</code><button class="dwdc-lnk sm2" data-copy="' + esc(M.script) + '">Copy script</button></div>' : ' <i>loading…</i>') + '</li><li>Pick <b>setup</b> in the function menu and press <b>Run</b>. Allow access to Gmail when Google asks.</li></ol></div>';
		return bar + '<div class="dwdc-conns">' + up + mail + stripe + pp + '</div><p class="dwdc-mutp sm">Payments are matched to clients by email. Anything that doesn’t match becomes a to-do on your dashboard so you can assign it. Keys are saved on your server and never shown again.</p>';
	}
	function refreshText(R) {
		if (R.busy) { return 'Updating… this can take up to a minute.'; }
		if (R.error) { return esc(R.error); }
		var src = function (x, name) { return !x ? '' : x.error ? esc(x.error) : x.skipped ? name + ': ' + esc(x.skipped) + ' (connect it below)' : name + ': ' + x.added + ' new · ' + x.already + ' already in Dream Desk' + (x.unmatched ? ' · ' + x.unmatched + ' older payments didn’t match a client' : ''); };
		return '<b>Finances updated.</b><ul><li>Upwork: ' + R.upwork.payments + ' payments across ' + R.upwork.projects + ' projects' + (R.upwork.unmatched.length ? ' · ' + R.upwork.unmatched.length + ' Upwork names need a project (see below)' : '') + '</li><li>' + src(R.stripe, 'Stripe') + '</li><li>' + src(R.paypal, 'PayPal') + '</li><li>Logged by hand (Zelle, checks, other): ' + money(R.manual.total) + ' kept and counted</li></ul>';
	}
	function runRefresh() {
		S.refreshRes = { busy: true }; render(); toast('Updating finances… this can take up to a minute');
		api('/refresh', 'POST', {}).then(function (r) { S.refreshRes = r; if (r.upwork && r.upwork.unmatched && r.upwork.unmatched.length) { S.upRes = r.upwork; S.syncOpen = true; } return Promise.all([reload(), api('/sync').then(function (x) { S.sync = x; })]); })
			.then(function () { render(); toast('Finances updated'); })
			.catch(function (e) { S.refreshRes = { error: e.message }; render(); });
	}
	function upImport(file, map) {
		var send = function (name, text) {
			S.upRes = { error: 'Working…' }; render();
			api('/upwork-files', 'POST', { name: name || '', csv: text || '', map: map || {} }).then(function (r) { S.upRes = r; if (!r.error) { DWDC.upLast = DWDC.today; } return Promise.all([reload(), api('/sync').then(function (x) { S.sync = x; })]); })
				.then(function () { render(); toast('Upwork updated'); })
				.catch(function (e) { S.upRes = { error: e.message }; render(); });
		};
		if (file) { var fr = new FileReader(); fr.onload = function () { send(file.name, String(fr.result)); }; fr.readAsText(file); } else { send('', ''); }
	}

	/* ---------- Jobs won: per week and per month, from hire emails, first payments and onboarding forms ---------- */
	function dIso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
	function weekStart(iso) { var d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
	function winsIn(from, to) { return ((S.wins && S.wins.list) || []).filter(function (w) { return w.date >= from && w.date <= to; }); }
	function winVal(l) { return l.reduce(function (a, w) { return a + (+w.value || 0); }, 0); }
	function shortD(iso) { var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return M[+iso.slice(5, 7) - 1] + ' ' + (+iso.slice(8, 10)); }
	function winsCard() {
		var MNf = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		var t = DWDC.today, ws = weekStart(t), y = +t.slice(0, 4), mo = +t.slice(5, 7) - 1;
		var wk = function (n) { var a = new Date(ws); a.setDate(a.getDate() - 7 * n); var b = new Date(a); b.setDate(b.getDate() + 6); return { from: dIso(a), to: dIso(b) }; };
		var mon = function (n) { var a = new Date(y, mo - n, 1), b = new Date(y, mo - n + 1, 0); return { from: dIso(a), to: dIso(b), label: MNf[a.getMonth()] + (a.getFullYear() !== y ? ' ' + a.getFullYear() : '') }; };
		var tile = function (label, r, sub, tone) {
			var l = winsIn(r.from, r.to);
			return '<div class="dwdc-kpi click' + (tone ? ' ' + tone : '') + '" role="button" tabindex="0" data-wins="' + r.from + '|' + r.to + '|' + esc(label) + '"><small>' + label + '</small><strong>' + l.length + '<i> job' + (l.length === 1 ? '' : 's') + '</i></strong><span>' + sub + (winVal(l) ? ' · ' + money(winVal(l)) : '') + '</span></div>';
		};
		var w0 = wk(0), w1 = wk(1), w2 = wk(2), m0 = mon(0), m1 = mon(1);
		var rows = function (list) {
			var max = Math.max.apply(null, list.map(function (r) { return r.n; }).concat([1]));
			return list.map(function (r) {
				return '<button type="button" class="dwdc-wrow" data-wins="' + r.from + '|' + r.to + '|' + esc(r.label) + '"><span>' + (r.html || r.label) + '</span><i><b style="width:' + Math.round(r.n / max * 100) + '%"></b></i><strong>' + r.n + '</strong><em>' + (r.v ? money(r.v) : '—') + '</em></button>';
			}).join('');
		};
		var weeks = [], months = [];
		for (var i = 0; i < 12; i++) { var r = wk(i), l = winsIn(r.from, r.to); weeks.push({ from: r.from, to: r.to, n: l.length, v: winVal(l), label: (i === 0 ? 'This week' : i === 1 ? 'Last week' : 'Week of ' + shortD(r.from)), html: i > 1 ? '<em class="dwdc-wof">Week of </em>' + shortD(r.from) : '' }); }
		for (var j = 0; j < 12; j++) { var q = mon(j), ml = winsIn(q.from, q.to); months.push({ from: q.from, to: q.to, n: ml.length, v: winVal(ml), label: q.label }); }
		var avgW = weeks.slice(1).reduce(function (a, r) { return a + r.n; }, 0) / 11, avgM = months.slice(1).reduce(function (a, r) { return a + r.n; }, 0) / 11;
		var head = '<div class="dwdc-whead"><span>Period</span><span></span><span>Jobs</span><span>Paid / price</span></div>';
		return '<section class="dwdc-card pad dwdc-wins"><div class="dwdc-cardh"><h2>Jobs won</h2></div>'
			+ '<div class="dwdc-kpis k5">' + tile('This week', w0, shortD(w0.from) + '–' + shortD(w0.to), 'coralfill') + tile('Last week', w1, shortD(w1.from) + '–' + shortD(w1.to)) + tile('Week before', w2, shortD(w2.from) + '–' + shortD(w2.to))
			+ tile(MNf[mo] + ' so far', m0, 'Month to date', 'navy') + tile(m1.label, m1, 'Last month') + '</div>'
			+ '<button type="button" class="dwdc-more" data-winsmore>' + (S.winsMore ? 'Hide' : 'Show') + ' by week &amp; month ' + ic('down', 15) + '</button>'
			+ (S.winsMore ? '<div class="dwdc-wgrid"><div><h3>By week <small>avg ' + avgW.toFixed(1) + ' a week</small></h3>' + head + rows(weeks) + '</div><div><h3>By month <small>avg ' + avgM.toFixed(1) + ' a month</small></h3>' + head + rows(months) + '</div></div>' : '')
			+ (S.winsMore && S.wins && S.wins.undated ? '<p class="dwdc-wins-foot">' + S.wins.undated + ' older project' + (S.wins.undated === 1 ? '' : 's') + ' have no payment, hire email or onboarding date, so they aren’t counted.</p>' : '')
			+ '</section>';
	}
	/* ---------- Connects spending: this month, last month, the month before, the last 12 months and every year ---------- */
	function connMonth(y, m) { var o = (S.costs || {})[String(y)]; return { v: o && o.m ? +o.m[m] || 0 : 0, q: o && o.mq ? +o.mq[m] || 0 : 0 }; }
	function upJobs(from, to) { return winsIn(from, to).filter(function (w) { return /Upwork/.test(w.how); }).length; }
	function connSpend() {
		var MNf = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		var t = DWDC.today, y = +t.slice(0, 4), mo = +t.slice(5, 7) - 1, C = S.costs || {};
		var mons = [];
		for (var i = 0; i < 12; i++) {
			var d = new Date(y, mo - i, 1), e = new Date(y, mo - i + 1, 0), c = connMonth(d.getFullYear(), d.getMonth()), j = upJobs(dIso(d), dIso(e));
			mons.push({ label: MNf[d.getMonth()] + (d.getFullYear() !== y ? ' ' + d.getFullYear() : ''), v: c.v, q: c.q, jobs: j });
		}
		var tile = function (label, x, tone) { return '<div class="dwdc-kpi' + (tone ? ' ' + tone : '') + '"><small>' + label + '</small><strong>' + money(x.v) + '</strong><span>' + x.label + (x.q ? ' · ' + x.q.toLocaleString() + ' Connects' : '') + (x.jobs ? ' · ' + x.jobs + ' Upwork job' + (x.jobs === 1 ? '' : 's') : '') + '</span></div>'; };
		var max = Math.max.apply(null, mons.map(function (x) { return x.v; }).concat([1]));
		var tot12 = mons.reduce(function (a, x) { return a + x.v; }, 0), jobs12 = mons.reduce(function (a, x) { return a + x.jobs; }, 0);
		var rows = mons.map(function (x) {
			return '<div class="dwdc-crow"><span>' + x.label + '</span><i><b style="width:' + Math.round(x.v / max * 100) + '%"></b></i><strong>' + (x.v ? money(x.v) : '—') + '</strong><em>' + (x.q ? x.q.toLocaleString() : '—') + '</em><em>' + (x.jobs || '—') + '</em><em>' + (x.v && x.jobs ? money(x.v / x.jobs) : '—') + '</em></div>';
		}).join('');
		var years = Object.keys(C).sort().reverse();
		var yrows = years.map(function (yy) {
			var o = C[yy], n = yy === String(y) ? mo + 1 : 12, j = upJobs(yy + '-01-01', yy + '-12-31');
			return '<div class="dwdc-crow yr"><span>' + yy + '</span><i><b style="width:' + Math.round(o.connects / Math.max.apply(null, years.map(function (k) { return C[k].connects; }).concat([1])) * 100) + '%"></b></i><strong>' + money(o.connects) + '</strong><em>' + o.qty.toLocaleString() + '</em><em>' + (j || '—') + '</em><em>' + money(o.connects / n) + '/mo</em></div>';
		}).join('');
		var head = function (a) { return '<div class="dwdc-crow head"><span>' + a + '</span><span></span><span>Spent</span><span>Connects</span><span>Upwork jobs</span><span>' + (a === 'Year' ? 'Average' : 'Per job') + '</span></div>'; };
		if (!years.length) { return emptyRow('No Connects spending imported yet. Upload your Upwork transactions file in Connections.'); }
		return '<div class="dwdc-kpis k3">' + tile('This month', mons[0], 'coralfill') + tile('Last month', mons[1]) + tile('Month before', mons[2]) + '</div>'
			+ '<button type="button" class="dwdc-more" data-connmore>' + (S.connMore ? 'Hide' : 'Show') + ' month &amp; year history ' + ic('down', 15) + '</button>'
			+ (!S.connMore ? '' : '<h3 class="dwdc-ch3">Last 12 months <small>' + money(tot12) + ' spent' + (jobs12 ? ' · ' + jobs12 + ' Upwork jobs · ' + money(tot12 / jobs12) + ' per job' : '') + '</small></h3>' + head('Month') + rows
			+ '<h3 class="dwdc-ch3">Every year</h3>' + head('Year') + yrows
			+ '<p class="dwdc-wins-foot">From your Upwork transactions file' + (DWDC.upLast ? ', last uploaded ' + fmt(DWDC.upLast.slice(0, 10)) : '') + '. Upwork jobs are the jobs won that month that came through Upwork. Membership fees aren’t included.</p>');
	}
	// The four numbers that matter most right now, at the top of Money Stats.
	function moneySnap(MY) {
		var MNf = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		var t = DWDC.today, y = +t.slice(0, 4), mo = +t.slice(5, 7) - 1, lm = new Date(y, mo - 1, 1);
		var mv = function (yy, m) { var o = MY[String(yy)]; return o && o.m ? Math.max(0, +o.m[m] || 0) : 0; };
		var cur = mv(y, mo), prev = mv(lm.getFullYear(), lm.getMonth());
		var ol = owingList(), owe = owed(ol), pend = pendDeposit(ol);
		var ws = weekStart(t), we = new Date(ws); we.setDate(we.getDate() + 6);
		var wl = winsIn(dIso(ws), dIso(we)), cm = connMonth(y, mo);
		var tile = function (attr, cls, label, val, sub) { return '<div class="dwdc-snap ' + cls + '" role="button" tabindex="0" ' + attr + '><small>' + label + '</small><strong>' + val + '</strong><span>' + sub + '</span></div>'; };
		return '<div class="dwdc-snaps">'
			+ tile('data-owed', 'owe', 'Owed to you', money(owe), pend ? money(pend) + ' pending deposit' : ol.length + ' project' + (ol.length === 1 ? '' : 's'))
			+ tile('data-month="' + t.slice(0, 7) + '"', 'made', 'Made in ' + MNf[mo].slice(0, 3), money(cur), MNf[lm.getMonth()].slice(0, 3) + ': ' + money(prev))
			+ tile('data-wins="' + dIso(ws) + '|' + dIso(we) + '|This week"', 'jobs', 'Jobs this week', wl.length + '', winVal(wl) ? money(winVal(wl)) : 'None yet')
			+ tile('data-connmore', 'conn', 'Connects in ' + MNf[mo].slice(0, 3), money(cm.v), cm.q ? cm.q.toLocaleString() + ' Connects' : 'Upwork spend')
			+ '</div>';
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
		var open = working(), owe = owed(owingList());
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
		return moneySnap(MY) + winsCard() + '<section class="dwdc-card pad dwdc-wins dwdc-conn"><div class="dwdc-cardh"><h2>Connects spending</h2></div>' + connSpend() + '</section>' + '<div class="dwdc-kpis k3 dwdc-mkpis">'
			+ kpi('All-time income', money(total), 'Every payment since you started · ' + paid.length + ' projects', 'navy')
			+ kpi('Average project', money(avg), 'Middle project ' + money(mid))
			+ kpi('Top project', top ? money(lifetime(top)) : '—', top ? esc(top.name) : '')
			+ '</div>'
			+ '<div class="dwdc-mgrid">'
			+ mcard('Patterns &amp; Trends <button class="dwdc-askbtn" data-askai>' + ic('bolt', 14) + 'Ask AI</button>', trendsBox(), 'trends')
			+ mcard('Where it came from', '<div class="dwdc-chanbar">' + chan.map(function (x) { return x[1] ? '<i class="' + x[2] + '" style="width:' + Math.max(1, pct(x[1])) + '%"></i>' : ''; }).join('') + '</div>'
				+ '<ul class="dwdc-chans">' + chan.map(function (x) { return '<li><i class="' + x[2] + '"></i><span>' + x[0] + '</span><b>' + money(x[1]) + '</b><em>' + pct(x[1]) + '%</em></li>'; }).join('') + '</ul>')
			+ mcard('By year', (ylist.length ? '<ul class="dwdc-years2">' + ylist.map(function (y) { var o = MY[y], t = ytot(y); return '<li><span>' + y + '</span><div>' + [['Upwork', 'upw'], ['Stripe', 'str'], ['PayPal', 'ppl'], ['Other', 'oth']].map(function (x) { return o[x[0]] > 0 ? '<i class="' + x[1] + '" style="width:' + Math.max(1, Math.round(o[x[0]] / ymax * 100)) + '%" title="' + x[0] + ' ' + money(o[x[0]]) + '"></i>' : ''; }).join('') + '</div><b>' + money(t) + '</b></li>'; }).join('') + '</ul>' : emptyRow('No dated payments yet.'))
				+ '<div class="dwdc-ylegend"><span><i class="upw"></i>Upwork</span><span><i class="str"></i>Stripe</span><span><i class="ppl"></i>PayPal</span><span><i class="oth"></i>Zelle & other</span></div>'
				)
			+ mcard('Busiest months <small class="dwdc-bm-sub">Click any month to see every payment · after Upwork fees</small>', busyMonths(MY, ylist), 'wide bm')
			+ '<section class="dwdc-card pad dwdc-mcard wide dwdc-collapse' + (S.connOpen ? ' open' : '') + '"><button class="dwdc-cardh dwdc-colh" data-connopen aria-expanded="' + !!S.connOpen + '"><h2>Upwork Connects</h2><span class="dwdc-colsum">' + connSummary() + '</span>' + ic('right', 16) + '</button>' + (S.connOpen ? connectsCard(MY) : '') + '</section>'
			+ mcard('Top projects', rowsP || emptyRow('No payments yet.'))
			+ mcard('Top clients', rowsC || emptyRow('No payments yet.'))
			+ mcard('Repeat clients <span class="dwdc-cnt">' + repeat.length + '</span>', rowsR || emptyRow('No repeat clients yet.'))
			+ '<section class="dwdc-card pad dwdc-mcard wide dwdc-collapse' + (S.syncOpen ? ' open' : '') + '"><button class="dwdc-cardh dwdc-colh" data-syncopen aria-expanded="' + !!S.syncOpen + '"><h2>Connections</h2><span class="dwdc-colsum">Upwork files, Stripe &amp; PayPal sync, Update Finances</span>' + ic('right', 16) + '</button>' + (S.syncOpen ? connCard() : '') + '</section>'
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
	var CHAT = { msgs: [], busy: false, needKey: !DWDC.aiReady, scope: '' };
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
		var sugg = CHAT.scope === 'desk' ? ['Who owes me money right now?', 'What to-dos are overdue or due this week?', 'Which leads need a follow-up?', 'Add a to-do to follow up with my newest lead tomorrow'] : CHAT.scope === 'personal' ? ['Where did my money go last month?', 'Which subscriptions should I cancel?', 'Am I spending more on dining than usual?', 'What bills and charges are coming up?'] : ['How much did I make in October vs September?', 'Who were my top 5 clients this year?', 'What were my slowest months in 2025?', 'Is my Upwork Connects spending paying off?'];
		if (CHAT.needKey) {
			log.innerHTML = '<div class="dwdc-chat-key"><b>Connect Claude</b><p>Paste your Claude API key to turn on Ask AI. It’s saved on your server and never shown in the browser.</p><p class="sm">Get one at console.anthropic.com → API Keys.</p><input type="password" placeholder="sk-ant-..." data-chatkey><button class="dwdc-btn" data-chatkeysave>Save key</button></div>';
			return;
		}
		log.innerHTML = (CHAT.msgs.length ? '' : '<div class="dwdc-chat-hi"><p>' + (CHAT.scope === 'desk' ? 'Ask about your clients, leads, projects, money, to-dos or past actions, or tell me to do something (log a payment or Connects, add a note or to-do, update a lead).' : CHAT.scope === 'personal' ? 'Ask me anything about your personal spending, subscriptions and bills.' : 'Ask me anything about your money, projects and trends.') + '</p>' + sugg.map(function (q) { return '<button class="dwdc-chat-sug" data-chatsug>' + esc(q) + '</button>'; }).join('') + '</div>')
			+ CHAT.msgs.map(function (m) { return '<div class="dwdc-chat-m ' + m.role + '">' + (m.role === 'assistant' ? mdLite(m.content) : esc(m.content)) + '</div>'; }).join('')
			+ (CHAT.busy ? '<div class="dwdc-chat-m assistant typing"><i></i><i></i><i></i></div>' : '');
		log.scrollTop = log.scrollHeight;
	}
	function chatSend(q) {
		q = String(q || '').trim(); if (!q || CHAT.busy) { return; }
		CHAT.msgs.push({ role: 'user', content: q }); CHAT.busy = true; chatPaint();
		api('/ask', 'POST', { messages: CHAT.msgs, scope: CHAT.scope }).then(function (r) {
			CHAT.msgs.push({ role: 'assistant', content: r.answer });
			if (r.changed) { if (route().id) { delete S.full[route().id]; } reload().then(render); }
		}).catch(function (e) {
			if (e.data && e.data.needs_key) { CHAT.needKey = true; CHAT.msgs.pop(); toast(e.message, true); }
			else { CHAT.msgs.push({ role: 'assistant', content: 'Sorry, that didn’t work: ' + e.message }); }
		}).then(function () { CHAT.busy = false; chatPaint(); });
	}
	function chatOpen(scope) {
		scope = scope || '';
		if (scope !== CHAT.scope) { CHAT.scope = scope; CHAT.msgs = []; }
		var box = chatEl();
		if (!box) {
			box = document.createElement('div'); box.id = 'dwdc-chat'; box.className = 'dwdc-chat';
			box.innerHTML = '<header><span class="dwdc-chat-ic">' + ic('bolt', 16) + '</span><div><b>Ask AI</b><small>About your money, projects &amp; trends</small></div><button data-chatclose aria-label="Close">' + ic('x', 18) + '</button></header>'
				+ '<div class="dwdc-chat-log"></div><form class="dwdc-chat-f"><textarea rows="1" placeholder="Ask a question…"></textarea><button class="dwdc-btn" aria-label="Send">' + ic('right', 16) + '</button></form>';
			document.body.appendChild(box);
			box.addEventListener('click', function (e) {
				var t = e.target;
				if (t.closest('[data-chatclose]')) { box.classList.remove('open'); var lb = document.getElementById('dwdc-askfab'); if (lb) { lb.classList.remove('on'); } return; }
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
		var hd = box.querySelector('header div'); box.classList.toggle('dwdc-chat-left', CHAT.scope === 'desk'); var lb = document.getElementById('dwdc-askfab'); if (lb) { lb.classList.add('on'); }
		if (hd) { hd.innerHTML = CHAT.scope === 'desk' ? '<b>Ask Dream Desk</b><small>Clients, projects, money, to-dos &amp; history</small>' : CHAT.scope === 'personal' ? '<b>Ask AI · Personal money</b><small>Spending, subscriptions, bills &amp; trends</small>' : '<b>Ask AI</b><small>About your money, projects &amp; trends</small>'; }
		box.classList.add('open'); chatPaint();
		setTimeout(function () { var ta = box.querySelector('textarea'); if (ta && !CHAT.needKey) { ta.focus(); } }, 50);
	}
	/* Floating "Ask" launcher, bottom-left on every Dream Desk page. */
	(function askFab() {
		if (!document.body) { document.addEventListener('DOMContentLoaded', askFab); return; }
		if (document.getElementById('dwdc-askfab')) { return; }
		var b = document.createElement('button'); b.id = 'dwdc-askfab'; b.type = 'button'; b.className = 'dwdc-askfab'; b.setAttribute('aria-label', 'Ask Dream Desk');
		b.innerHTML = '<span class="i">' + ic('bolt', 18) + '</span><span class="t">Ask</span>';
		document.body.appendChild(b);
		b.addEventListener('click', function () {
			var box = chatEl(), sc = route().view === 'personal' ? 'personal' : 'desk';
			if (box && box.classList.contains('open') && CHAT.scope === sc) { box.classList.remove('open'); b.classList.remove('on'); return; }
			chatOpen(sc);
		});
	})();
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
	// Home to-do list items: a project's to-dos fold into one row (when it has 2+), in your drag order.
	function todoItems(td) {
		var items = [], grp = {};
		td.forEach(function (t) {
			var n = t.contact ? td.filter(function (x) { return x.contact === t.contact; }).length : 0;
			if (n > 1) { if (!grp[t.contact]) { grp[t.contact] = { id: t.contact, tasks: [] }; items.push(grp[t.contact]); } grp[t.contact].tasks.push(t); }
			else { items.push({ id: t.id, task: t }); }
		});
		return inOrder('todos', items);
	}
	function todoRow(t, small) {
		var c = t.contact ? contact(t.contact) : null;
		var k = c ? clientOf(c) : null, cn = k ? k.name : (c ? c.person : '');
		var tag = c ? '<a class="dwdc-ttag" href="#client/' + c.id + '">' + ic('brief', 12) + '<b>' + esc(c.name) + '</b>' + (cn && cn !== c.name ? '<span>' + esc(cn) + '</span>' : '') + '</a>' : '';
		var meta = [t.due ? 'Due ' + fmt(t.due) : '', 'Added by Michael'].filter(Boolean).join(' · ');
		return '<div class="dwdc-todo' + (t.done ? ' done' : '') + (small ? ' sm' : '') + '" data-task="' + t.id + '"><span class="dwdc-chk" data-toggle="' + t.id + '" title="' + (t.done ? 'Mark not done' : 'Mark done') + '">' + ic('check', 12) + '</span>'
			+ '<span class="dwdc-tt"><b>' + esc(t.text) + '</b>' + (small ? '' : tag + '<small>' + meta + '</small>') + '</span>'
			+ due(t) + '<button class="dwdc-del" data-del-task="' + t.id + '" title="Delete to-do">' + ic('x', 14) + '</button></div>';
	}

	function setDone(tid, val) {
		var task = S.tasks.find(function (x) { return x.id === tid; });
		if (!task) { return; }
		task.done = val === undefined ? !task.done : val;
		task.done_at = task.done ? new Date().toISOString().slice(0, 19).replace('T', ' ') : '';
		render();
		api('/task/' + tid, 'POST', { done: task.done }).catch(fail);
		if (task.done) { undoToast('To-do done', function () { setDone(tid, false); }); }
	}
	function undoToast(msg, fn) {
		var old = document.querySelector('.dwdc-toast.undo'); if (old) { old.remove(); }
		var t = document.createElement('div'); t.className = 'dwdc-toast undo'; t.innerHTML = '<span>' + esc(msg) + '</span><button type="button">Undo</button>';
		t.querySelector('button').onclick = function () { t.remove(); fn(); };
		document.body.appendChild(t); setTimeout(function () { t.classList.add('out'); }, 6000); setTimeout(function () { t.remove(); }, 6500);
	}
	function doneTasks() { return S.tasks.filter(function (t) { return t.done; }).sort(function (a, b) { return (b.done_at || b.created || '') < (a.done_at || a.created || '') ? -1 : 1; }); }
	function reviewSend(what) {
		var items = S.pending || [], off = (S.modal && S.modal.off) || {};
		var pick = items.filter(function (x) { return !off[x.id]; }).map(function (x) { return x.id; });
		if (!pick.length) { toast('Nothing selected', true); return; }
		var body = what === 'approve' ? { approve: pick } : { dismiss: pick };
		S.modal.busy = true; render();
		api('/pending', 'POST', body).then(function (r) {
			S.pending = items.filter(function (x) { return pick.indexOf(x.id) < 0; });
			S.modal = S.pending.length ? { type: 'review', vals: {}, off: {} } : null;
			toast(what === 'approve' ? r.approved + ' added to Dream Desk' + (r.errors.length ? ' · ' + r.errors.length + ' failed' : '') : r.dismissed + ' dismissed');
			return reload();
		}).then(render).catch(function (e) { if (S.modal) { S.modal.busy = false; } fail(e); });
	}
	// Twice a month (1st and 15th) remind Mike to upload a fresh Upwork CSV, until he does.
	function csvRemind() {
		var d = DWDC.today || new Date().toISOString().slice(0, 10), start = d.slice(0, 8) + (+d.slice(8, 10) >= 15 ? '15' : '01');
		var snooze = ''; try { snooze = localStorage.getItem('dwdcCsvSnooze') || ''; } catch (e) {}
		if ((DWDC.upLast || '') >= start || snooze >= d || S.modal) { return; }
		S.modal = { type: 'csvremind', vals: {} }; render();
	}
	function loadPending(auto) {
		return api('/pending').then(function (x) {
			S.pending = x.items || [];
			var seen = ''; try { seen = sessionStorage.getItem('dwdcRevSeen') || ''; } catch (e) {}
			var sig = S.pending.map(function (i) { return i.id; }).join(',');
			if (auto && S.pending.length && seen !== sig && !S.modal) { try { sessionStorage.setItem('dwdcRevSeen', sig); } catch (e) {} S.modal = { type: 'review', vals: {}, off: {} }; }
			render();
			if (auto) { csvRemind(); }
		}).catch(function () {});
	}
	function reviewBar() {
		var n = (S.pending || []).length;
		return n ? '<button class="dwdc-revbar" data-review><span class="dwdc-revdot">' + n + '</span><span><b>' + n + ' new update' + (n === 1 ? '' : 's') + ' from your email</b><small>Review and approve before they’re added to Dream Desk</small></span>' + ic('right', 16) + '</button>' : '';
	}

	/* ---------- Dream Desk: helpers ---------- */
	function isProject(c) { return c.list === 'active' || c.list === 'limbo' || c.list === 'hold' || c.list === 'complete'; }
	// Everything with money still owed: open projects, plus completed ones you set an amount owed on after finishing.
	function owingList() { return S.contacts.filter(function (c) { return (isOpen(c) || (c.list === 'complete' && c.owedopen)) && num(c.balance) > 0; }); }
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

	/* ---------- Home: today's client meetings (first thing on the page) ---------- */
	function meetBar() {
		var M = S.meet, now = Date.now() / 1000;
		var hi = new Date().getHours(), greet = hi < 12 ? 'Good morning' : hi < 17 ? 'Good afternoon' : 'Good evening';
		if (!M) {
			return '<section class="dwdc-meet off"><div class="dwdc-meet-h"><span class="dwdc-meet-ic">' + ic('clock', 20) + '</span><div><b>' + greet + ', Michael.</b><small>Connect your Google inbox: booked calls, Upwork invites and client messages then show up here, as leads and on your to-do lists, by themselves.</small></div><button type="button" class="dwdc-btn sm" data-meetconnect>Connect Google</button></div></section>';
		}
		// Dates and times in this browser's time zone (the site itself runs on UTC).
		var lt = new Date(), tdy = lt.getFullYear() + '-' + ('0' + (lt.getMonth() + 1)).slice(-2) + '-' + ('0' + lt.getDate()).slice(-2);
		M.list.forEach(function (m) { var d = new Date(m.ts * 1000); m.date = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); m.time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); });
		M.today = tdy;
		var today = M.list.filter(function (m) { return m.date === M.today; }), later = M.list.filter(function (m) { return m.date > M.today; });
		var tm = new Date(lt.getFullYear(), lt.getMonth(), lt.getDate() + 1), tmd = tm.getFullYear() + '-' + ('0' + (tm.getMonth() + 1)).slice(-2) + '-' + ('0' + tm.getDate()).slice(-2);
		var tomorrow = later.filter(function (m) { return m.date === tmd; });
		var left = today.filter(function (m) { return m.te > now; }), next = left[0];
		if (!left.length && tomorrow.length) { // nothing left today: show tomorrow's calls
			return '<section class="dwdc-meet"><div class="dwdc-meet-h"><span class="dwdc-meet-ic"><strong>' + tomorrow.length + '</strong></span><div><b>' + greet + ', Michael. ' + (today.length ? 'All done for today. ' : 'No more meetings today. ') + 'Tomorrow you have ' + tomorrow.length + ' meeting' + (tomorrow.length === 1 ? '' : 's') + '.</b><small>First: ' + esc(tomorrow[0].who || tomorrow[0].title) + ' at ' + esc(tomorrow[0].time) + '</small></div>'
				+ (M.fresh ? '' : '<button type="button" class="dwdc-btn2 sm" data-meetconnect>Inbox not connected: connect Google</button>') + '</div>'
				+ '<p class="dwdc-mt-day">Tomorrow</p><div class="dwdc-mt-list">' + tomorrow.map(function (m) { return item(m); }).join('') + '</div></section>';
		}
		if (!left.length) { // no meetings today, or they're all done: no box (unless the inbox isn't connected)
			return M.fresh ? '' : '<section class="dwdc-meet off slim"><div class="dwdc-meet-h"><span class="dwdc-meet-ic">' + ic('mail', 18) + '</span><div><b>Google inbox not connected' + (M.at ? ' · last update ' + esc(fmt(String(M.at).slice(0, 10))) : '') + '</b><small>Booked calls, Upwork invites and client messages aren’t coming in automatically.</small></div><button type="button" class="dwdc-btn sm" data-meetconnect>Connect Google</button></div></section>';
		}
		var until = function (m) { var d = Math.round((m.ts - now) / 60); return m.ts <= now ? 'Happening now' : d < 60 ? 'in ' + d + ' min' : d < 600 ? 'in ' + Math.floor(d / 60) + ' h' + (d % 60 ? ' ' + d % 60 + ' min' : '') : ''; };
		function item(m) {
			var past = m.te <= now, live = m.ts <= now && !past, isNext = m === next;
			return '<div class="dwdc-mt' + (past ? ' past' : '') + (isNext ? ' next' : '') + '"><span class="dwdc-mt-time">' + esc(m.time) + '</span><span class="dwdc-mt-who"><b>' + esc(m.who || m.title) + '</b><small>' + esc([m.kind, m.source && m.source !== m.kind ? 'via ' + m.source : '', m.about].filter(Boolean).join(' · ')) + '</small></span>'
				+ (past ? '<span class="dwdc-mt-done">Done</span>' : (isNext || live ? '<span class="dwdc-mt-in">' + until(m) + '</span>' : '') + (m.link ? '<a class="dwdc-btn sm' + (isNext || live ? '' : ' ghost') + '" href="' + esc(m.link) + '" target="_blank" rel="noopener">Join</a>' : '')) + '</div>';
		}
		var head = today.length
			? '<b>' + greet + ', Michael. You have ' + today.length + ' meeting' + (today.length === 1 ? '' : 's') + ' today.</b><small>' + (next ? 'Next: ' + esc(next.who || next.title) + ' at ' + esc(next.time) + (until(next) ? ' (' + until(next) + ')' : '') : 'All done for today.') + '</small>'
			: '<b>' + greet + ', Michael. No meetings today.</b><small>' + (later[0] ? 'Next: ' + esc(later[0].who || later[0].title) + ' on ' + fmt(later[0].date) + ' at ' + esc(later[0].time) : 'Nothing booked in the next two weeks.') + '</small>';
		var stale = !M.fresh;
		return '<section class="dwdc-meet"><div class="dwdc-meet-h"><span class="dwdc-meet-ic"><strong>' + today.length + '</strong></span><div>' + head + '</div>'
			+ (stale ? '<button type="button" class="dwdc-btn2 sm" data-meetconnect>Inbox not connected: connect Google</button>' : '') + '</div>'
			+ (today.length ? '<div class="dwdc-mt-list">' + today.map(item).join('') + '</div>' : '')
			+ (tomorrow.length ? '<p class="dwdc-mt-day">Tomorrow</p><div class="dwdc-mt-list">' + tomorrow.map(function (m) { return item(m); }).join('') + '</div>' : '')
			+ (later.filter(function (m) { return m.date > tmd; }).length ? '<p class="dwdc-mt-later">Coming up: ' + later.filter(function (m) { return m.date > tmd; }).slice(0, 4).map(function (m) { return '<span>' + esc(new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })) + ' ' + esc(m.time) + ' · ' + esc(m.who || m.title) + '</span>'; }).join('') + '</p>' : '')
			+ '</section>';
	}
	/* ---------- Home ---------- */
	function home() {
		var types = S.clients.map(function (k) { return clientType(k.id); });
		var nP = types.filter(function (x) { return x === 'Project'; }).length, nH = types.filter(function (x) { return x === 'Hosting'; }).length, nPast = types.filter(function (x) { return x === 'Past client'; }).length, tot = S.clients.length || 1;
		var open = S.contacts.filter(isOpen), active = by('active'), host = hosting();
		var annual = host.reduce(function (s, c) { return s + num(c.hosting); }, 0);
		var nextH = host.filter(function (c) { return c.renewal && c.renewal >= DWDC.today; }).sort(function (a, b) { return a.renewal < b.renewal ? -1 : 1; })[0];
		var nextDue = open.filter(function (c) { return c.deadline; }).sort(function (a, b) { return a.deadline < b.deadline ? -1 : 1; })[0];
		var owing = owingList();
		var billed = S.contacts.reduce(function (s, c) { return s + lifetime(c); }, 0);
		var lastPay = S.contacts.filter(function (c) { return c.last_pay; }).sort(function (a, b) { return a.last_pay.date < b.last_pay.date ? 1 : -1; })[0];
		var seg = function (n, cls) { return n ? '<i class="' + cls + '" style="flex:' + n + '"></i>' : ''; };
		var adsRow = '', adsG = null, adsK = {};
		var c1 = (function () {
			var A = S.ads || {}, G = A.google, K = A.connects || {}, LD = A.leads || {};
			var ago = function (at) { var m = Math.round((Date.now() - new Date(String(at).replace(' ', 'T')).getTime()) / 60000); return m < 90 ? Math.max(1, m) + ' min ago' : m < 2880 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
			var gpart = G
				? '<button type="button" class="dwdc-mnow dwdc-adg" data-adsmodal><span class="dwdc-lbl">Google Ads · this week</span><strong>' + money(G.week.cost) + '</strong><small>' + G.week.clicks + ' clicks · ' + Math.round(G.week.conv) + ' conversion' + (Math.round(G.week.conv) === 1 ? '' : 's') + ' · ' + money(G.month.cost) + ' this month</small></button>'
				: '<div class="dwdc-adg off"><span class="dwdc-lbl">Google Ads</span><p>Not connected yet. One copy-and-paste in Google Ads and your spend, clicks and conversions show up here.</p><button type="button" class="dwdc-btn sm" data-adsconnect>Connect Google Ads</button></div>';
			var kpart = '<button type="button" class="dwdc-mnow dwdc-adk" data-connmodal><span class="dwdc-lbl">Connects · this week</span><strong>' + money(K.week || 0) + '</strong><small>' + money(K.month || 0) + ' this month · ' + money(K.lastmonth || 0) + ' last month</small></button>';
			var total = (G ? G.month.cost : 0) + (K.month || 0);
			adsRow = '<div class="dwdc-mjobs dwdc-madsrow">' + gpart + kpart + '</div>';
			adsG = G; adsK = K;
			return card('cd-clients cd-ads', chead('bolt', 'Advertising', ''),
				'<div class="dwdc-mtop">' + gpart + kpart + '</div>'
				+ (K.last ? '<p class="dwdc-adnote">Connects from your Upwork file, last purchase ' + fmt(K.last) + (G ? ' · Google Ads updated ' + ago(G.at) : '') + '</p>' : ''),
				'<footer>' + '<a class="dwdc-frow" href="#money" data-connmodal><span>Connects spent this month</span><b>' + money(K.month || 0) + ' <small class="dwdc-frow-sub">last month ' + money(K.lastmonth || 0) + '</small></b>' + ic('right', 12) + '</a>'
				+ '<a class="dwdc-frow" href="#money" data-adsmodal><span>Total ad spend this month</span><b>' + money(total) + '</b>' + ic('right', 12) + '</a>'
				+ '<a class="dwdc-frow" href="#leads"><span>Leads from Google Ads</span><b>' + (LD.month || 0) + ' <small class="dwdc-frow-sub">this month · ' + (LD.lastmonth || 0) + ' last</small></b>' + ic('right', 12) + '</a>'
				+ '</footer>');
		})();
		var plist = psort('active', inOrder('active', active.slice().sort(function (x, y) { return num(y.price) - num(x.price) || (x.name < y.name ? -1 : 1); })));
		var c2 = card('cd-projects cd-plist', chead('brief', 'Projects <span class="dwdc-hcnt">(' + active.length + ')</span>', 'projects/active'),
			'<div class="dwdc-pl-head"><span>Project · Client</span><span>' + phead('active', 'Price') + '</span><span>Owed</span></div>'
			+ '<div class="dwdc-pl-wrap"><div class="dwdc-pl"' + ((S.psort || {}).active ? '' : ' data-sort="active"') + '>' + (plist.length ? plist.map(function (c) {
				var k = clientOf(c), ow = num(c.balance);
				return '<a class="dwdc-pl-row" data-sid="' + c.id + '" href="#client/' + c.id + '"><span><b>' + esc(c.name) + '</b><small>' + esc(k ? k.name : (c.person || '')) + '</small></span><span>' + (num(c.price) ? money(c.price) : '—') + '</span><span class="' + (ow ? 'ow' : 'pd') + '">' + (ow ? money(ow) : 'Paid') + '</span></a>';
			}).join('') : '<p class="dwdc-mutp">No active projects right now.</p>') + '</div></div>',
			'<footer class="dwdc-pl-foot"><a class="dwdc-pl-all" href="#projects/active" data-plall>View all ' + active.length + ' ' + ic('right', 12) + '</a></footer>');
		// Money card (option 1b): a grid of tiles. Owed to you is the hero; short labels on a narrow card, full ones when it's wide.
		var c3 = card('cd-money money-card', chead('dollar', 'Money', 'money'),
			(function () {
				var t = DWDC.today, ym = t.slice(0, 7), MY = S.money || {}, yo = MY[t.slice(0, 4)], mi = +t.slice(5, 7) - 1;
				var cur = yo && yo.m ? Math.max(0, +yo.m[mi] || 0) : 0, prevD = new Date(+t.slice(0, 4), mi - 1, 1), py = MY[String(prevD.getFullYear())];
				var prev = py && py.m ? Math.max(0, +py.m[prevD.getMonth()] || 0) : 0;
				var MNf = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
				var ws = weekStart(t), we = new Date(ws); we.setDate(we.getDate() + 6);
				var ls = new Date(ws); ls.setDate(ls.getDate() - 7); var le = new Date(ws); le.setDate(le.getDate() - 1);
				var L = function (long, short) { return '<span class="lg">' + long + '</span><span class="sh">' + short + '</span>'; };
				var tile = function (attrs, label, value, meta, cls) { return '<button type="button" class="tile' + (cls ? ' ' + cls : '') + '" ' + attrs + '><span class="label">' + label + '</span><span class="value">' + value + '</span><span class="meta">' + meta + '</span></button>'; };
				var jobs = function (label, a, b) { var l = winsIn(dIso(a), dIso(b)); return tile('data-wins="' + dIso(a) + '|' + dIso(b) + '|' + label + '"', label, l.length + ' <span class="unit">job' + (l.length === 1 ? '' : 's') + '</span>', shortD(dIso(a)) + '–' + shortD(dIso(b)) + (winVal(l) ? ' · ' + money(winVal(l)) : '')); };
				var pd = pendDeposit(owing);
				var G = adsG, K = adsK || {};
				var gTile = G
					? (function () { var d0 = (G.daily || [])[0] || G.today || { cost: 0, clicks: 0 }, d1 = (G.daily || [])[1] || { cost: 0, clicks: 0 }; return tile('data-adsmodal', 'Google Ads · Today', money(d0.cost), d0.clicks + ' clicks · ' + L('Yesterday', 'Yest.') + ' ' + money(d1.cost) + ' (' + d1.clicks + ' clicks) · ' + money(G.week.cost) + ' this week'); })()
					: tile('data-adsconnect', 'Google Ads', '—', 'Not connected · connect →');
				return '<div class="money-grid">'
					+ tile('data-owed', 'Owed to you', money(owed(owing)), (pd ? money(pd) + ' pending deposit · ' : '') + owing.length + ' project' + (owing.length === 1 ? '' : 's') + ' · see list →', 'tile--hero')
					+ tile('data-month="' + ym + '"', L('Made in ' + MNf[mi], 'Made in ' + MNf[mi].slice(0, 3) + '.'), money(cur), L(MNf[prevD.getMonth()], MNf[prevD.getMonth()].slice(0, 3)) + ': ' + money(prev) + ' · ' + L('see payments →', 'payments →'))
					+ jobs('Jobs this week', ws, we) + jobs('Jobs last week', ls, le)
					+ gTile
					+ tile('data-connmodal', L('Connects · This week', 'Connects · Week'), money(K.week || 0), money(K.month || 0) + ' this month · ' + money(K.lastmonth || 0) + ' last month')
					+ '<a class="tile tile--plain" href="#hosting"><span class="label">Hosting revenue</span><span class="value">' + money(annual) + ' <span class="suffix">/ yr</span></span><span class="meta">see clients →</span></a>'
					+ '<a class="tile tile--plain" href="#money"><span class="label">All-time income</span><span class="value">' + money(allIncome()) + '</span><span class="meta">see history →</span></a>'
					+ '</div>';
			})());
		var tv = active.reduce(function (s, c) { return s + num(c.price); }, 0);
		var ap = card('cd-plain cd-apnavy', '<header class="dwdc-dhead"><h2>Active Projects <span class="dwdc-cnt">' + active.length + '</span></h2><a href="#projects/active">View all</a></header>',
			'<div class="dwdc-mini-t"><div class="g-ap head"><span>Project · Client</span><span>Price</span><span>Due</span><span class="r">Owed</span></div>'
			+ (active.length ? active.filter(match).map(function (c) {
				var late = c.deadline && c.deadline < DWDC.today, ow = c.balance === '' && num(c.price) ? Math.max(0, num(c.price) - lifetime(c)) : num(c.balance);
				return '<div class="g-ap row" data-go="client/' + c.id + '"><span><b class="dwdc-pname">' + esc(c.name) + '</b>' + (site(c) ? siteLine(c) : '') + '<small>' + esc([clientName(c), c.job].filter(Boolean).join(' · ')) + '</small></span><span class="b">' + (num(c.price) ? money(c.price) : '—') + '</span><span class="' + (late ? 'deep b' : '') + '">' + (c.deadline ? fmt(c.deadline) : '—') + '</span><span class="r b ' + (ow ? 'deep' : 'sec') + '">' + (ow ? money(ow) : 'Paid') + '</span></div>';
			}).join('') : emptyRow('No active projects.')) + '</div>',
			'<footer class="dwdc-totals one"><div><small>Total amount due</small><strong class="deep">' + money(owed(active)) + '</strong></div></footer>');
		var td = openTasks().sort(function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : 1; });
		var tl = card('cd-plain cd-todo', '<header class="dwdc-dhead"><h2>To-Do List <span class="dwdc-cnt">' + td.length + '</span></h2></header>',
			'<form class="dwdc-addbar home"><input name="text" placeholder="Add something we need to do..." autocomplete="off" required><button class="dwdc-btn">Add</button></form>'
			+ (td.length ? '<div class="dwdc-todos" data-sort="todos">' + todoItems(td).map(function (it) {
				if (!it.tasks) { return todoRow(it.task).replace('<div class="dwdc-todo', '<div data-sid="' + it.id + '" class="dwdc-todo'); }
				var c = contact(it.id), open = S.tgOpen && S.tgOpen[it.id], first = it.tasks[0];
				return '<div class="dwdc-tgrp' + (open ? ' open' : '') + '" data-sid="' + it.id + '"><div class="dwdc-tgrp-h" data-tgrp="' + it.id + '"><span class="dwdc-tgrp-n">' + it.tasks.length + '</span>'
					+ '<span class="dwdc-tt"><b>' + esc(c ? c.name : 'Project') + '</b><small>' + esc(it.tasks.length + ' to-dos · next: ' + first.text) + '</small></span>' + due(first) + '<span class="dwdc-tgrp-c">' + ic('down', 16) + '</span></div>'
					+ (open ? '<div class="dwdc-tgrp-b">' + it.tasks.map(function (t) { return todoRow(t, true); }).join('') + '</div>' : '') + '</div>';
			}).join('') + '</div>' : emptyRow('Nothing on the list. Nice.'))
			+ (doneTasks().length ? '<button class="dwdc-donebtn" data-showdone>' + (S.showDone ? 'Hide' : 'Show') + ' completed <b>' + doneTasks().length + '</b></button>'
				+ (S.showDone ? '<div class="dwdc-todos donelist">' + doneTasks().slice(0, 25).map(function (t) { return todoRow(t); }).join('') + '</div>' : '') : ''));
		var lds = psort('leads', inOrder('leads', S.contacts.filter(function (c) { return c.list === 'leads'; }).sort(function (a, b) { return (a.followup || '9') < (b.followup || '9') ? -1 : 1; })));
		var lb = card('cd-plain cd-leadsb', '<header class="dwdc-dhead"><h2>Leads <span class="dwdc-cnt">' + lds.length + '</span></h2>' + phead('leads', 'Price') + '<a href="#leads">View all</a></header>',
			lds.length ? '<div class="dwdc-hleads"' + ((S.psort || {}).leads ? '' : ' data-sort="leads"') + '>' + lds.map(function (c) {
				var due = c.followup && c.followup <= DWDC.today;
				return '<a class="dwdc-hlead" data-sid="' + c.id + '" href="#client/' + c.id + '"><span class="w"><b>' + esc(c.name) + '</b><small>' + esc([c.person && c.person !== c.name ? c.person : '', c.source || c.lead_source].filter(Boolean).join(' · ')) + '</small></span>'
					+ '<span class="v"><b>' + (num(c.price) ? money(c.price) : '—') + '</b><small class="' + (due ? 'deep' : '') + '">' + (c.followup ? (due ? 'Follow up ' + (c.followup < DWDC.today ? fmt(c.followup) : 'today') : 'Follow up ' + fmt(c.followup)) : 'No follow-up') + '</small></span></a>';
			}).join('') + '</div>' : emptyRow('No open leads.'),
			lds.length ? '<footer class="dwdc-totals one"><div><small>Estimated value</small><strong class="deep">' + money(lds.reduce(function (a, c) { return a + num(c.price); }, 0)) + '</strong></div></footer>' : '');
		return meetBar() + reviewBar() + '<div class="dwdc-row3 dwdc-top2">' + c2 + lb + '</div><div class="dwdc-moneywide">' + c3 + '</div><div class="dwdc-row2c">' + card('cd-plain cd-trends', '<header class="dwdc-dhead"><h2>Patterns &amp; Trends</h2><button class="dwdc-askbtn light" data-askai>' + ic('bolt', 14) + 'Ask AI</button><a href="#money">Money Stats ' + ic('right', 14) + '</a></header>', trendsBox()) + tl + '</div>';
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
		return '<div class="dwdc-chips">' + chip('all', 'All', 'all') + chip('projects', 'Projects', 'Project') + chip('hosting', 'Hosting', 'Hosting') + chip('past', 'Past', 'Past client') + '</div>'
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
		if (f === 'active') { rows = psort('active', rows); }
		var cap = S.more['p' + f] || S.q ? rows.length : 50;
		var empties = { active: 'No active projects right now.', limbo: 'Nothing in limbo. Clients you haven’t heard back from in a while go here.', hold: 'No projects on hold. Paused or waiting projects go here.', complete: 'No completed projects yet.', all: 'No projects match.' };
		var ylist = Object.keys(years).filter(function (y) { return y !== 'none'; }).sort().reverse();
		var yearBar = f === 'complete' ? '<div class="dwdc-years"><span>Finished in</span><select class="dwdc-yearsel" data-year>'
			+ '<option value="">All years (' + all.filter(function (c) { return c.list === 'complete'; }).length + ')</option>'
			+ ylist.map(function (y) { return '<option value="' + y + '"' + (yr === y ? ' selected' : '') + '>' + y + ' (' + years[y] + ')</option>'; }).join('')
			+ (years.none ? '<option value="none"' + (yr === 'none' ? ' selected' : '') + '>No date yet (' + years.none + ')</option>' : '') + '</select></div>' : '';
		return (yearBar ? '<div class="dwdc-chips">' + yearBar + '</div>' : '')
			+ '<div class="dwdc-card dwdc-tbl">' + (rows.length ? '<div class="dwdc-grid g-projects head"><span>Project</span><span>Client</span><span>' + (f === 'complete' ? 'Total' : phead('active', 'Price')) + '</span><span>Owed</span><span>' + (f === 'complete' ? 'Finished' : 'Due') + '</span><span>Status</span><span>Next step</span></div>'
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
	// Same order as the Leads box on Home (follow-up date, then your drag order).
	function leadList() { return inOrder('leads', S.contacts.filter(function (c) { return c.list === 'leads' && !c.onboarded; }).sort(function (a, b) { return (a.followup || '9') < (b.followup || '9') ? -1 : 1; })); }
	// Only people who actually sent in the onboarding form (not just projects at the onboarding stage).
	function onboardList() { return S.contacts.filter(function (c) { return !!c.onboarded && c.list !== 'archive'; }).sort(function (a, b) { return received(a) < received(b) ? 1 : -1; }); }
	var LSTAGES = [['new', 'New'], ['contacted', 'Contacted'], ['active', 'Won → Active'], ['lost', 'Lost']];
	function leadsList() {
		var rows = psort('leads', leadList().filter(match));
		return '<div class="dwdc-ltop"><p>People you’re talking to who haven’t hired you yet. When one signs up, click <b>Start project</b> and they become a client with an active project.</p><button type="button" class="dwdc-btn" data-act="lead">' + ic('plus', 15) + 'Add lead</button></div>'
			+ '<div class="dwdc-card dwdc-tbl"><div class="dwdc-grid g-leads2 head"><span>Name</span><span>Contact</span><span>Source</span><span>' + phead('leads', 'Price') + '</span><span>Stage</span><span>Received</span><span>Follow up</span><span></span></div>'
			+ (rows.length ? rows.map(function (c) {
				var st = c.stage && c.stage !== 'onboarding' ? c.stage : 'new', fu = c.followup;
				return '<div class="dwdc-grid g-leads2 row" data-go="client/' + c.id + '"><span><b>' + esc(clientName(c) || c.name) + '</b>' + (c.company || (clientName(c) && clientName(c) !== c.name) ? '<small>' + esc(c.company || c.name) + '</small>' : '') + '</span>'
					+ '<span class="dwdc-nm"><span><b class="nm2">' + esc(c.email || '—') + '</b><small>' + esc(c.phone || '') + '</small></span></span>'
					+ '<span class="sec ell">' + esc(c.last_entry || String(c.source || 'Added by hand').replace(/^Website form: /, '')) + '</span>'
					+ '<span><input class="dwdc-lprice" type="text" inputmode="decimal" data-lprice="' + c.id + '" value="' + (num(c.price) ? money(c.price) : '') + '" placeholder="Add $" title="Estimated price"></span>'
					+ '<span><select class="dwdc-stage t-' + ({ new: 'blue', contacted: 'deep', active: 'navy', lost: 'steel' }[st] || 'blue') + '" data-stage-of="' + c.id + '">' + LSTAGES.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === st ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></span>'
					+ '<span class="mut">' + ago(received(c)) + '</span>'
					+ '<span>' + (fu && fu >= DWDC.today ? '<span class="dwdc-fu">' + ic('clock', 13) + fmt(fu) + '</span>' : '<button class="dwdc-btn3" data-followup="' + c.id + '">' + ic('clock', 13) + ' Follow up</button>') + '</span>'
					+ '<span class="r dwdc-lacts"><button class="dwdc-btn3 dwdc-lstart" data-lstart="' + c.id + '">Start project</button><button class="dwdc-del show" data-arch="' + c.id + '" title="Archive">' + ic('archive', 15) + '</button><button class="dwdc-del show red" data-purge="' + c.id + '" title="Delete lead for good">' + ic('x', 15) + '</button></span></div>';
			}).join('') : emptyRow('No leads yet. Click “Add lead” to add someone you’re talking to.')) + '</div>';
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
	// "Request a review" button for a client (used on project and client pages).
	function reviewBtn(cid) {
		var k = cid ? clientRec(cid) : null;
		if (!k) { return ''; }
		var sent = k.review_sent;
		return '<button class="dwdc-btn2 dwdc-revbtn" data-askreview="' + k.id + '" title="Email ' + esc(k.name) + ' the Google review request">' + ic('star', 14) + (sent ? 'Review asked ' + fmt(String(sent).slice(0, 10), true) + ' · Send again' : 'Request review') + '</button>';
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
		var acts = reviewBtn(k.id) + (first ? btn('', 'data-act="pay" data-project="' + first.id + '"', 'Log payment')
			+ (first.list === 'limbo' ? btn('', 'data-pset="active" data-pid="' + first.id + '"', 'Back to active') : btn('', 'data-pset="limbo" data-pid="' + first.id + '"', 'Move to limbo'))
			+ (first.list === 'hold' ? btn('', 'data-pset="active" data-pid="' + first.id + '"', 'Resume') : btn('', 'data-pset="hold" data-pid="' + first.id + '"', 'Put on hold'))
			+ btn('solid navy', 'data-pset="complete" data-pid="' + first.id + '"', 'Mark complete')
			: (pp.length ? '' : btn('red', 'data-delclient="' + k.id + '"', 'Delete client')) + btn('solid navy', 'data-act="job" data-client="' + k.id + '"', '+ New project'));
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
	// Wrap a project-page box so phones can reorder it.
	function pw(name, html) { return html ? '<div class="pw pw-' + name + '">' + html + '</div>' : ''; }
	function clientView(id) {
		var c = S.full[id] || contact(id);
		if (!c) { return '<div class="dwdc-card">' + emptyRow('Loading…') + '</div>'; }
		var full = !!S.full[id], st = c.list, ow = num(c.balance), price = num(c.price), late = c.deadline && c.deadline < DWDC.today;
		// No owed amount set yet on an open job: it's the price minus what actually came in, not "paid".
		if (c.balance === '' && price && st !== 'complete') { ow = Math.max(0, price - lifetime(c)); }
		var backName = { home: 'home', leads: 'leads & onboarding', forms: 'form entries', todos: 'to-do list', hosting: 'hosting', projects: 'projects', clients: 'clients', archive: 'archive', search: 'search' }[(S.back || 'home').split('/')[0]] || 'home';
		var tasks = S.tasks.filter(function (t) { return t.contact === c.id; }).sort(function (a, b) { return a.done - b.done; }), openN = tasks.filter(function (t) { return !t.done; }).length;
		var btn = function (cls, attr, label) { return '<button class="dwdc-btn2 ' + cls + '" ' + attr + '>' + label + '</button>'; };
		var acts = '';
		if (st === 'active' || st === 'hold' || st === 'limbo') {
			acts = (ow ? btn('', 'data-paid', 'Mark paid') : '') + (st !== 'active' ? btn('', 'data-set="active"', 'Back to active') : '')
				+ (st !== 'hold' ? btn('greenl', 'data-set="hold"', 'Put on hold') : '') + (st !== 'limbo' ? btn('', 'data-set="limbo"', 'Move to limbo') : '') + btn('solid green', 'data-complete', 'Mark complete');
		} else if (st === 'leads') {
			acts = btn('red', 'data-purge="' + c.id + '"', 'Delete lead') + btn('', 'data-set="archive"', 'Archive') + btn('', 'data-leadinvite="' + c.id + '"', ic('mail', 14) + 'Send onboarding form') + btn('solid blue', 'data-set="active"', 'Start the job');
		} else if (st === 'archive') {
			acts = btn('', 'data-set="leads"', 'Restore to leads') + btn('red', 'data-trash="' + c.id + '"', 'Delete');
		} else {
			acts = (ow ? btn('', 'data-paid', 'Mark paid') : '') + btn('solid blue', 'data-act="job" data-client="' + (c.client || 0) + '"', '+ New project for this client');
		}
		var mail = c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '';
		var kc = clientOf(c);
		var line = [(kc ? 'Client: <a href="#cl/' + kc.id + '"><b>' + esc(kc.name) + '</b></a>' : esc(c.person || 'No client linked')) + ' <button class="dwdc-lnk sm2" data-moveclient="' + c.id + '">Change</button>', mail, c.phone ? '<a href="tel:' + esc(c.phone.replace(/[^\d+]/g, '')) + '">' + esc(c.phone) + '</a>' : '', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : ''].filter(Boolean).join('<i>·</i>');
		return projectPage(c, full, st, ow, price, late, tasks, openN);
	}
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.plog) { S.plog = null; render(); } });
	/* ---------- Project page (v2 handoff): header, money card, two columns of boxes ---------- */
	function projectPage(c, full, st, ow, price, late, tasks, openN) {
		var nm = String(c.name || ''), sp = nm.lastIndexOf(' ');
		var title = sp > 0 ? '<span class="lt">' + esc(nm.slice(0, sp)) + '</span> <strong>' + esc(nm.slice(sp + 1)) + '</strong>' : '<strong>' + esc(nm) + '</strong>';
		var stLabel = st === 'leads' ? (STAGES.filter(function (x) { return x[0] === stageOf(c); })[0] || ['', 'Lead'])[1] : ({ active: 'Active', hold: 'On hold', limbo: 'Limbo', complete: 'Complete', archive: 'Archived' }[st] || LABEL[st]);
		var daysTo2 = function (iso) { return Math.round((new Date(iso + 'T00:00:00') - new Date(DWDC.today + 'T00:00:00')) / 864e5); };
		var rel = function (n) { return n > 1 ? 'In ' + n + ' days' : n === 1 ? 'Tomorrow' : n === 0 ? 'Today' : n === -1 ? 'Yesterday' : -n + ' days ago'; };
		var sb = function (attr, label, cls) { return '<button type="button" class="pv3-btn' + (cls ? ' ' + cls : '') + '" ' + attr + '>' + label + '</button>'; };
		var svg = function (d, w) { return '<svg width="' + (w || 15) + '" height="' + (w || 15) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
		var I = { check: '<path d="m5 12 5 5L20 7"/>', star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>', more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>', ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', plus: '<path d="M12 5v14M5 12h14"/>', send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>' };
		var band = function (h, cnt, right) { return '<header class="pv3-band"><h2>' + h + (cnt !== undefined && cnt !== null ? ' <span class="pv3-cnt">' + cnt + '</span>' : '') + '</h2>' + (right || '') + '</header>'; };
		var card = function (cls, head, body) { return '<section class="pv3-card ' + cls + '">' + head + '<div class="pv3-body">' + body + '</div></section>'; };
		var k = clientOf(c) || {}, em = c.email || k.email, ph = c.phone || k.phone;
		// header
		var meta = (k.id ? 'Client <a href="#cl/' + k.id + '"><b>' + esc(k.name) + '</b></a> <button class="pv3-lnk sm" data-moveclient="' + c.id + '">Change</button>' : 'No client linked <button class="pv3-lnk sm" data-moveclient="' + c.id + '">Link one</button>')
			+ ([em ? '<a href="mailto:' + esc(em) + '">' + esc(em) + '</a>' : '', ph ? '<a href="tel:' + esc(String(ph).replace(/[^\d+]/g, '')) + '">' + esc(ph) + '</a>' : '', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : ''].filter(Boolean).length ? '<span class="bar">|</span>' + [em ? '<a href="mailto:' + esc(em) + '">' + esc(em) + '</a>' : '', ph ? '<a href="tel:' + esc(String(ph).replace(/[^\d+]/g, '')) + '">' + esc(ph) + '</a>' : '', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : ''].filter(Boolean).join('<i>·</i>') : '');
		var rv = reviewBtn(c.client).replace('class="dwdc-btn2 dwdc-revbtn"', 'class="pv3-btn"').replace(/<svg[\s\S]*?<\/svg>/, svg(I.star, 14));
		var mi = function (attr, label) { return '<button type="button" role="menuitem" ' + attr + '>' + label + '</button>'; };
		var main, menu;
		if (st === 'active' || st === 'hold' || st === 'limbo') {
			main = rv + sb('data-complete', svg(I.check, 14) + 'Mark complete', 'primary');
			menu = mi(st === 'hold' ? 'data-set="active"' : 'data-set="hold"', st === 'hold' ? 'Resume project' : 'Put on hold') + mi(st === 'limbo' ? 'data-set="active"' : 'data-set="limbo"', st === 'limbo' ? 'Take out of limbo' : 'Move to limbo') + mi('data-act="job" data-client="' + (c.client || 0) + '"', 'New project for this client');
		} else if (st === 'complete') {
			main = rv + sb('data-set="active"', 'Reopen', 'primary');
			menu = mi('data-act="job" data-client="' + (c.client || 0) + '"', 'New project for this client');
		} else if (st === 'leads') {
			main = sb('data-leadinvite="' + c.id + '"', svg(I.send, 14) + 'Send onboarding form') + sb('data-set="active"', 'Start the job', 'primary');
			menu = mi('data-set="archive"', 'Archive lead') + mi('data-purge="' + c.id + '"', 'Delete lead');
		} else {
			main = sb('data-set="leads"', 'Restore to leads', 'primary');
			menu = mi('data-trash="' + c.id + '"', 'Delete');
		}
		var head = '<div class="pv3-head"><div class="pv3-ht"><div class="pv3-h1row"><h1>' + title + '</h1><span class="pv3-pill s-' + st + '">' + esc(stLabel) + '</span>' + (num(c.hosting) ? '<span class="pv3-pill s-host">Hosting</span>' : '') + '</div><div class="pv3-meta">' + meta + '</div></div>'
			+ '<div class="pv3-ha"><button type="button" class="pv3-lnk tall" data-edit>' + (S.edit ? 'Close edit' : 'Edit') + '</button>' + main
			+ '<div class="pv3-more"><button type="button" class="pv3-btn icon" data-pmore aria-haspopup="menu" aria-label="More actions">' + svg(I.more, 18) + '</button><div class="pv3-menu" role="menu">' + menu + '</div></div></div></div>';
		// money card
		var money3;
		if (st === 'leads') {
			money3 = '<div class="pv3-money">' + '<div class="pv3-stat"><span class="l">Estimated value</span><span class="v">' + (price ? money(price) : '—') + '</span><span class="s">If they sign</span></div>'
				+ '<div class="pv3-stat"><span class="l">Follow up</span><span class="v' + (c.followup && c.followup < DWDC.today ? ' red' : '') + '">' + (c.followup ? fmt(c.followup) : '—') + '</span><span class="s">' + (c.followup ? rel(daysTo2(c.followup)) : 'No date set') + '</span></div>'
				+ '<div class="pv3-stat"><span class="l">Source</span><span class="v sm">' + esc(String(c.source || '—').replace(/^Website form: /, '')) + '</span><span class="s">Stage: ' + esc(stLabel) + '</span></div></div>';
		} else {
			var paid = price ? Math.max(0, price - ow) : 0, pct = price ? Math.max(0, Math.min(100, Math.round(paid / price * 100))) : (ow ? 0 : 100);
			var via = c.pay_method ? ' · via ' + esc(c.pay_method) : '';
			money3 = '<div class="pv3-money">'
				+ '<div class="pv3-stat"><span class="l">Owed</span><span class="v ' + (ow ? 'orange' : 'green') + '">' + money(ow) + '</span><span class="s">' + (ow ? (paid ? 'Partially paid' : 'Unpaid') + via + (c.paymark === 'pending' ? ' · pending deposit' : '') : 'Paid in full') + '</span></div>'
				+ (st === 'complete'
					? '<div class="pv3-stat"><span class="l">Completed</span><span class="v">' + (doneDate(c) ? fmt(doneDate(c)) : '—') + '</span><span class="s">' + (c.created ? 'Started ' + fmt(String(c.created).slice(0, 10)) : '') + '</span></div>'
					: '<div class="pv3-stat"><span class="l">Due</span><span class="v' + (late ? ' red' : '') + '">' + (c.deadline ? fmt(c.deadline) : '—') + '</span><span class="s">' + [c.deadline ? rel(daysTo2(c.deadline)) : 'No due date', c.created ? 'started ' + fmt(String(c.created).slice(0, 10)) : ''].filter(Boolean).join(' · ') + '</span></div>')
				+ '<div class="pv3-stat"><span class="l">Paid</span><span class="v green">' + money(paid) + (price ? ' <em>of ' + money(price) + '</em>' : '') + '</span><span class="pv3-prog"><i><b style="width:' + pct + '%"></b></i><small>' + pct + '%</small></span></div>'
				+ '<div class="pv3-mact">' + (ow ? sb('data-paid', 'Mark paid') : '') + sb('data-plog="' + c.id + '"', svg(I.card, 15) + 'Log payment', 'pay') + '</div></div>';
		}
		// to-dos
		var dueTxt = function (t) {
			if (t.done) { return '<span class="du g">Done</span>'; }
			if (!t.due) { return '<span class="du">No date</span>'; }
			var n = daysTo2(t.due);
			return n < 0 ? '<span class="du r">' + -n + 'd overdue</span>' : n === 0 ? '<span class="du a">Due today</span>' : '<span class="du">Due in ' + n + 'd</span>';
		};
		var lateN = tasks.filter(function (t) { return !t.done && t.due && t.due < DWDC.today; }).length;
		var todos = card('pv3-todos', band('To-dos', openN, lateN ? '<span class="pv3-late">' + lateN + ' overdue</span>' : ''),
			tasks.map(function (t) { return '<div class="pv3-todo' + (t.done ? ' done' : '') + '"><button type="button" class="pv3-chk" data-toggle="' + t.id + '" aria-label="' + (t.done ? 'Mark not done' : 'Mark done') + '">' + svg(I.check, 13) + '</button><span class="tx">' + esc(t.text) + '</span>' + dueTxt(t) + '<button type="button" class="pv3-x" data-del-task="' + t.id + '" title="Delete to-do" aria-label="Delete to-do">×</button></div>'; }).join('')
			+ '<form class="dwdc-inlineadd pv3-addrow" data-contact="' + c.id + '">' + svg(I.plus, 18) + '<input name="text" placeholder="Add a to-do…" autocomplete="off"><input type="date" name="due" title="Due date"><button class="pv3-btn">Add</button></form>');
		// notes
		var notes = full ? (c.notes || []).slice().sort(function (a, b) { return (d(a.date) || 0) < (d(b.date) || 0) ? 1 : -1; }) : [];
		var notesBox = card('pv3-notes', band('Notes', notes.length),
			'<form class="dwdc-notef pv3-notef"><textarea name="text" rows="3" placeholder="Add a note: what they need, call recap, budget, next step…" required></textarea><div class="pv3-nrow"><span>' + (full && !notes.length ? 'No notes yet.' : '') + '</span><button class="pv3-btn">Add note</button></div></form>'
			+ (full && notes.length ? '<button type="button" class="pv3-lnk pv3-ntog" data-notestog="' + c.id + '">' + ((S.notesOpen || {})[c.id] ? 'Hide notes' : 'View all notes (' + notes.length + ')') + '</button>' : '')
			+ (full ? ((S.notesOpen || {})[c.id] ? notes : []).map(function (n) { var dt = d(n.date); return '<div class="pv3-note"><p>' + esc(n.text).replace(/\n/g, '<br>') + '</p><time>' + (dt ? dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '') + '</time></div>'; }).join('') : '<p class="pv3-mut">Loading…</p>'));
		// onboarding
		var obl = full ? (c.files || []).filter(function (e) { return /onboard/i.test(e.form || ''); }) : [], obn = obl.reduce(function (s2, e) { return s2 + (e.fields || []).length; }, 0);
		// What they filled out on a website form (Quote, Contact…): shown in full, above the to-dos.
		var fe = full ? (c.files || []).filter(function (e) { return !/onboard/i.test(e.form || '') && (e.fields || []).length; })[0] : null;
		var fval = function (v) { v = String(v == null ? '' : v); return /^\S+@\S+\.\S+$/.test(v) ? '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>' : /^[\d\s().+-]{7,}$/.test(v) ? '<a href="tel:' + esc(v.replace(/[^\d+]/g, '')) + '">' + esc(v) + '</a>' : /^https?:\/\//i.test(v) ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(v) + '</a>' : esc(v).replace(/\n/g, '<br>'); };
		var formBox = fe ? card('pv3-form', band(esc(fe.form || 'Website form') + ' form', null, '<span class="pv3-hmeta">Submitted ' + fmt(fe.date) + '</span>'),
			fe.fields.filter(function (f) { return String(f.value || '').trim() !== ''; }).map(function (f) { return '<div class="pv3-dr"><span>' + esc(f.label || f.id) + '</span><div>' + fval(f.value) + '</div></div>'; }).join('')
			+ (st === 'leads' || !obl.length ? '<div class="pv3-btns pv3-formacts">' + sb('data-leadinvite="' + c.id + '"', svg(I.send, 14) + (c.stage === 'onboarding' ? 'Resend onboarding form' : 'Send onboarding form'), 'primary') + '</div>' : '')) : '';
		var obBox = obl.length ? card('pv3-ob', band('Onboarding', obn + ' answers', '<span class="pv3-hmeta">' + esc(obl[0].form || 'Form') + ' · submitted ' + fmt(obl[0].date) + '</span>'),
			'<div class="pv3-btns">' + sb('data-viewob', svg(I.list, 15) + 'View answers') + sb('data-copyob', svg(I.copy, 15) + 'Copy answers') + '</div>') : '';
		// markup review
		var mem = em || '';
		var mkBox = card('pv3-mk', band('Markup review', null, '<a class="pv3-btn" href="' + esc(DWDC.markupHome) + '" target="_blank" rel="noopener">Open Markup ' + svg(I.ext, 14) + '</a>'),
			(DWDC.mkReady
				? '<div class="pv3-mkauto"><label class="pv3-lab">Staging site URL</label><div class="pv3-row"><input data-mkurl type="url" placeholder="https://staging.example.com"><button type="button" class="pv3-btn pv3-btn-pri" data-mkcreate>' + svg(I.plus, 14) + (c.markup ? 'Create new link' : 'Create markup link') + '</button></div></div>'
				: '<div class="pv3-mkauto"><label class="pv3-lab">Connect Markup once to create review links automatically</label><div class="pv3-row"><input data-mkkey type="password" placeholder="Markup API key"><button type="button" class="pv3-btn" data-mkkeysave>Connect</button></div><p class="pv3-mut">In Markup: Workspace settings → Developer Settings → create an API key, then paste it here. It’s saved on your server only.</p></div>')
			+ '<form class="dwdc-markupf pv3-mkf"><label class="pv3-lab">Client’s Markup link</label><div class="pv3-row"><input name="markup" type="url" value="' + esc(c.markup) + '" placeholder="https://app.markup.io/…"><button class="pv3-btn">Save</button></div>'
			+ (mem ? '' : '<label class="pv3-lab">Client’s email</label><div class="pv3-row"><input name="email" type="email" placeholder="Needed to send the link"></div>')
			+ (c.markup ? '<div class="pv3-btns">' + '<a class="pv3-btn" href="' + esc(url(c.markup)) + '" target="_blank" rel="noopener">Open their link</a>' + sb('data-mksend', svg(I.send, 14) + 'Email link to client') + '</div>' : '')
			+ (c.markup_sent ? '<p class="pv3-mut ok">' + svg(I.check, 14) + 'Sent to ' + esc(mem) + ' on ' + fmt(c.markup_sent, true) + '</p>' : '') + '</form>');
		// details
		var opt = function (list, cur) { return (cur && list.indexOf(cur) < 0 ? ['<option selected>' + esc(cur) + '</option>'] : ['<option value="">—</option>']).concat(list.map(function (o) { return '<option' + (o === cur ? ' selected' : '') + '>' + o + '</option>'; })).join(''); };
		var drow = function (kk, v, sel) { return '<div class="pv3-dr' + (sel ? ' sel' : '') + '"><span>' + kk + '</span><div>' + (v || '<span class="pv3-mut">—</span>') + '</div></div>'; };
		var isel = function (field, list, cur) { return '<span class="pv3-isel"><select data-field="' + field + '">' + opt(list, cur) + '</select>' + svg('<path d="m6 9 6 6 6-6"/>', 14) + '</span>'; };
		var details = S.edit ? editCard(c) : card('pv3-det', band('Details', null, '<button type="button" class="pv3-lnk" data-edit>Edit</button>'),
			drow('Main contact', esc(c.person || k.name)) + drow('Email', em ? '<a href="mailto:' + esc(em) + '">' + esc(em) + '</a>' : '') + drow('Phone', ph ? '<a href="tel:' + esc(String(ph).replace(/[^\d+]/g, '')) + '">' + esc(ph) + '</a>' : '')
			+ drow('Company', esc(c.company)) + drow('Website', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : '') + drow('Project', esc(c.job))
			+ drow('Lead source', isel('lead_source', SOURCES, c.lead_source), true) + drow('Pays via', isel('pay_method', PAYS, c.pay_method), true)
			+ drow('Started', imported(c) || !c.created ? '' : fmt(String(c.created).slice(0, 10), true)));
		// contacts
		var ppl = peopleOf(c), pform = (peopleCard(c).match(/<form class="dwdc-pplf"[\s\S]*?<\/form>/) || [''])[0];
		var contacts = card('pv3-ppl', band('Contacts', ppl.length || null, '<button type="button" class="pv3-lnk" data-ppladd="1">+ Add</button>'),
			ppl.map(function (x, i) {
				var bits = [x.email ? '<a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a>' : '', x.phone ? '<a href="tel:' + esc(String(x.phone).replace(/[^\d+]/g, '')) + '">' + esc(x.phone) + '</a>' : ''].filter(Boolean).join('<i>·</i>');
				return '<div class="pv3-pr"><div><b>' + esc(x.name || x.email) + '</b>' + (x.role ? '<small>' + esc(x.role) + '</small>' : '') + (bits ? '<span>' + bits + '</span>' : '') + '</div>'
					+ (x.main ? '<em>Main contact</em>' : '<div class="pv3-pa"><button type="button" class="pv3-lnk sm" data-pplmain="' + i + '">Make main</button><button type="button" class="pv3-lnk sm mute" data-pplrm="' + i + '">Remove</button></div>') + '</div>';
			}).join('') + (ppl.length ? '' : '<p class="pv3-mut top">No contacts yet.</p>') + pform);
		// payments
		var pays = full ? (c.payments || []) : [];
		var plogOpen = S.plog === c.id, PM = ['Upwork', 'Stripe', 'Bank transfer', 'Check', 'PayPal'].concat(PAYS.filter(function (x) { return ['Upwork', 'Stripe', 'Bank transfer', 'Check', 'PayPal'].indexOf(x) < 0; }));
		var logf = plogOpen ? '<form class="pv3-logf"><div class="pv3-lg"><label><span>Amount</span><span class="pv3-dol"><i>$</i><input name="amount" type="number" step="0.01" min="0.01" value="' + (ow ? ow : '') + '" required></span></label><label><span>Date</span><input name="date" type="date" value="' + DWDC.today + '" required></label><label><span>Method</span><select name="method">' + PM.map(function (x) { return '<option' + (x === (c.pay_method || 'Upwork') ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label></div>'
			+ '<label><span>Note</span><input name="note" placeholder="e.g. 50% deposit, final payment…"></label><div class="pv3-btns end"><button type="button" class="pv3-btn" data-plogx>Cancel</button><button class="pv3-btn pay">Save payment</button></div></form>' : '';
		var paidSum = price ? Math.max(0, price - ow) : 0;
		var paysBox = card('pv3-pay', band('Payments', pays.length || null, '<button type="button" class="pv3-lnk" data-plog="' + c.id + '">+ Log payment</button>'),
			logf + (!full ? '<p class="pv3-mut top">Loading…</p>' : pays.length ? pays.map(function (x, i) {
				return '<div class="pv3-py"><span class="dt">' + (x.date ? fmt(String(x.date).slice(0, 10)) : '—') + '</span><div><b>' + money2(x.amount).replace('.00', '') + ' <small>' + esc(x.source || '') + (x.status && x.status !== 'paid' ? ' · ' + esc(x.status) : '') + '</small></b>' + (x.note || (x.ref && x.ref !== 'Logged in Dream Desk') ? '<span>' + esc([x.note, x.ref && x.ref !== 'Logged in Dream Desk' ? x.ref : ''].filter(Boolean).join(' · ')) + '</span>' : '') + '</div><button type="button" class="pv3-rm" data-payrm="' + i + '">Remove</button></div>';
			}).join('') : '<p class="pv3-mut top">No payments logged yet.</p>')
			+ (price ? '<p class="pv3-pfoot">' + money(paidSum) + ' of ' + money(price) + ' paid · ' + money(ow) + ' remaining</p>' : ''));
		var hosting = num(c.hosting) ? hostCard(c) : '';
		return '<div class="pv3">' + head + money3
			+ '<div class="pv3-cols"><div class="pv3-col">' + formBox + todos + notesBox + obBox + mkBox + '</div><div class="pv3-col">' + details + (S.edit ? peopleCard(c) : contacts) + (st === 'leads' ? '' : paysBox) + hosting + '</div></div></div>';
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
	var SOURCES = ['Upwork', 'Google Ads', 'Google', 'Referral', 'Reference', 'Repeat client', 'Website', 'Social media', 'Other'];
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
	// "New" menu (Project / Client / Website Hosting): the toolbar's, also on the project page header.
	function newMenu() {
		var plus = ic('plus', 14), open = !!S.newOpen;
		return '<div class="dwdc-ph-menu' + (open ? ' open' : '') + '"><button class="dwdc-ph-btn outline" type="button" data-newmenu aria-haspopup="menu" aria-expanded="' + open + '">' + plus + 'New<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>'
			+ '<ul role="menu"><li><button role="menuitem" type="button" data-act="job">' + plus + 'Project</button></li><li><button role="menuitem" type="button" data-act="newclient">' + plus + 'Client</button></li><li><button role="menuitem" type="button" data-act="hosting">' + plus + 'Website Hosting</button></li></ul></div>';
	}
	// Project page toolbar: the onboarding answers buttons (in place of New / Log Payment).
	function obTools(id) {
		var c = S.full[id], list = c ? onboardEntries(c) : [];
		if (!list.length) { return ''; }
		var n = list.reduce(function (s, e) { return s + (e.fields || []).length; }, 0);
		return '<span class="pv2-obn">' + esc(list[0].form || 'Onboarding') + ' · ' + n + ' answers</span><button class="dwdc-ph-btn outline" type="button" data-copyob>' + ic('todo', 14) + 'Copy answers</button><button class="dwdc-ph-btn coral" type="button" data-viewob>' + ic('list', 14) + 'View answers</button>';
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
	function peopleCard(c, inner) {
		var ppl = peopleOf(c);
		var rows = ppl.map(function (x, i) {
			var bits = [x.email ? '<a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a>' : '', x.phone ? '<a href="tel:' + esc(x.phone.replace(/[^\d+]/g, '')) + '">' + esc(x.phone) + '</a>' : ''].filter(Boolean).join('<i>·</i>');
			return '<li class="dwdc-ppl' + (x.main ? ' main' : '') + '"><div><b>' + esc(x.name || x.email) + '</b>' + (x.role ? '<em>' + esc(x.role) + '</em>' : '') + (bits ? '<span>' + bits + '</span>' : '') + '</div>'
				+ (x.main ? '<strong class="dwdc-mainpill">Main contact</strong>' : '<div class="dwdc-pplact"><button class="dwdc-btn2 sm" data-pplmain="' + i + '">Make main</button><button class="dwdc-lnk sm2" data-pplrm="' + i + '" title="Remove">Remove</button></div>') + '</li>';
		}).join('');
		var form = S.addPpl === c.id ? '<form class="dwdc-pplf"><input name="name" placeholder="Name"><input name="email" type="email" placeholder="Email"><input name="phone" placeholder="Phone"><input name="role" placeholder="Role (e.g. office manager)"><div class="dwdc-pplfa"><button type="button" class="dwdc-btn2" data-ppladd="0">Cancel</button><button class="dwdc-btn">Add contact</button></div></form>' : '';
		return (inner ? '<div class="dwdc-pplin dwdc-pplcard' + ((S.pplOpen || {})[c.id] || S.addPpl === c.id ? ' open' : '') + '"><div class="dwdc-cardh sub"><h3 data-ppltoggle="' + c.id + '" role="button" tabindex="0">' + ic('right', 13) + 'Contacts' + (ppl.length ? ' <span class="dwdc-cnt">' + ppl.length + '</span>' : '') : '<section class="dwdc-card pad dwdc-pplcard"><div class="dwdc-cardh"><h2>Contacts') + (!inner && ppl.length > 1 ? ' <span class="dwdc-cnt">' + ppl.length + '</span>' : '') + (inner ? '</h3>' : '</h2>') + '<button class="dwdc-lnk" data-ppladd="1">+ Add</button></div>'
			+ (ppl.length ? '<ul class="dwdc-ppll">' + rows + '</ul>' : '<p class="dwdc-mutp">No contacts yet.</p>')
			+ (ppl.length > 1 ? '<p class="dwdc-mutp sm">Everyone on this project’s emails. Pick who’s the main contact.</p>' : '') + form + (inner ? '</div>' : '</section>');
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
	function detailsCard(c, extra) {
		var row = function (k, v) { return '<dt>' + k + '</dt><dd>' + (v || '<span class="mut">—</span>') + '</dd>'; };
		var k = clientOf(c) || {}, em = c.email || k.email, ph = c.phone || k.phone;
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Details</h2><button class="dwdc-lnk" data-edit>Edit</button></div><dl class="dwdc-dl">'
			+ row('Main contact', esc(c.person || k.name)) + row('Email', em ? '<a href="mailto:' + esc(em) + '">' + esc(em) + '</a>' : '') + row('Phone', esc(ph))
			+ row('Company', esc(c.company)) + row('Website', site(c) ? '<a href="https://' + esc(site(c)) + '" target="_blank" rel="noopener">' + esc(site(c)) + '</a>' : '')
			+ row('Project', esc(c.job)) + '</dl>' + (extra || '') + '</section>';
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
	// Notes: their own box near the top of every lead/project (add a note, see them all, newest first).
	function notesCard(c, full) {
		var notes = full ? (c.notes || []).slice().sort(function (a, b) { return (d(a.date) || 0) < (d(b.date) || 0) ? 1 : -1; }) : [];
		return '<section class="dwdc-card pad dwdc-notescard"><div class="dwdc-cardh"><h2>Notes</h2><span class="dwdc-cnt">' + notes.length + '</span></div>'
			+ '<form class="dwdc-notef"><textarea name="text" rows="3" placeholder="Add a note: what they need, call recap, budget, next step…" required></textarea><button class="dwdc-btn sm">Add note</button></form>'
			+ (full ? (notes.length ? '<div class="dwdc-notelist">' + notes.map(function (n) { return '<div class="dwdc-note"><p>' + esc(n.text).replace(/\n/g, '<br>') + '</p><time>' + fmt(n.date, true) + '</time></div>'; }).join('') + '</div>' : '<p class="dwdc-mutp">No notes yet.</p>') : '<p class="dwdc-mutp">Loading…</p>')
			+ '</section>';
	}
	function activityCard(c, full) {
		var items = [];
		if (full) {
			(c.files || []).forEach(function (e, i) { items.push({ date: e.date, tone: 'orange', title: (e.form || 'Form') + ' received', entry: e, open: false }); });
		}
		if (c.completed) { items.push({ date: c.completed, tone: 'green', title: 'Marked complete' }); }
		if (!imported(c)) { items.push({ date: c.created, tone: 'gray', title: 'Added to Dream Desk' + (c.source && !c.entry_count ? ' (' + c.source + ')' : '') }); }
		items.sort(function (a, b) { return (d(a.date) || 0) < (d(b.date) || 0) ? 1 : -1; });
		return '<section class="dwdc-card pad"><div class="dwdc-cardh"><h2>Activity</h2></div>'
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
		if (m.type === 'wins') {
			var wl = winsIn(m.from, m.to);
			var wbody = wl.length ? '<div class="dwdc-mo-sum"><span>Jobs<b>' + wl.length + '</b></span><span>Paid / price<b>' + money(winVal(wl)) + '</b></span></div>'
				+ wl.map(function (w) {
					return '<a class="dwdc-mo-r" href="#client/' + w.id + '" data-close-modal><span class="d">' + fmt(w.date) + '</span><span class="w"><b>' + esc(w.name) + '</b><small>' + esc([w.title, w.how].filter(Boolean).join(' · ')) + '</small></span><strong>' + (w.value ? money(w.value) : '—') + '</strong></a>';
				}).join('') : emptyRow('No jobs found in this period.');
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide">' + head('Jobs won', esc(m.label), shortD(m.from) + (m.to !== m.from ? '–' + shortD(m.to) : '')) + wbody + '</div>';
		}
		if (m.type === 'ads') {
			var G2 = (S.ads || {}).google;
			if (!G2) { S.modal = { type: 'adsconnect' }; return modal(); }
			var dayL = function (d, i) { return i === 0 ? 'Today' : i === 1 ? 'Yesterday' : new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
			var days = (G2.daily || []).map(function (x, i) { return [dayL(x.date, i), x]; });
			var per = [['This week', G2.week], ['Last week', G2.lastweek], ['This month', G2.month], ['Last month', G2.lastmonth], ['Last 30 days', G2.last30]];
			var prow = function (l, x) { return '<div class="dwdc-arow"><span>' + l + '</span><strong>' + money(x.cost) + '</strong><em>' + x.clicks.toLocaleString() + '</em><em>' + (x.impr ? (x.clicks / x.impr * 100).toFixed(1) + '%' : '—') + '</em><em>' + (x.clicks ? money(x.cost / x.clicks) : '—') + '</em><em>' + (+x.conv).toFixed(x.conv % 1 ? 1 : 0) + '</em><em>' + (x.conv ? money(x.cost / x.conv) : '—') + '</em></div>'; };
			var ahead = '<div class="dwdc-arow head"><span></span><span>Spend</span><span>Clicks</span><span>CTR</span><span>Avg CPC</span><span>Conv.</span><span>Per conv.</span></div>';
			var camps = (G2.campaigns || []).slice().sort(function (a, b) { return b.cost - a.cost; });
			var crow = function (c) { return '<div class="dwdc-arow"><span><b>' + esc(c.name) + '</b><small>' + esc(String(c.status).toLowerCase()) + (c.budget ? ' · ' + money(c.budget) + '/day' : '') + '</small></span><strong>' + money(c.cost) + '</strong><em>' + c.clicks.toLocaleString() + '</em><em>' + (c.impr ? (c.clicks / c.impr * 100).toFixed(1) + '%' : '—') + '</em><em>' + (c.clicks ? money(c.cost / c.clicks) : '—') + '</em><em>' + (+c.conv).toFixed(c.conv % 1 ? 1 : 0) + '</em><em>' + (c.conv ? money(c.cost / c.conv) : '—') + '</em></div>'; };
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide">' + head('Advertising', 'Google', 'Ads')
				+ (days.length ? '<h3 class="dwdc-ch3">Last 7 days</h3>' + ahead + days.map(function (x) { return prow(x[0], x[1]); }).join('') + '<h3 class="dwdc-ch3">Totals</h3>' : '')
				+ ahead + per.map(function (x) { return prow(x[0], x[1]); }).join('')
				+ '<h3 class="dwdc-ch3">Campaigns this month</h3>' + (camps.length ? ahead.replace('<span></span>', '<span>Campaign</span>') + camps.map(crow).join('') : emptyRow('No campaign activity this month.'))
				+ '<p class="dwdc-wins-foot">' + esc(G2.account || 'Google Ads') + ' · updated ' + fmt(String(G2.at).slice(0, 10)) + ' ' + String(G2.at).slice(11, 16) + '. Conversions are the leads, calls and bookings the website reports to Google Ads.</p></div>';
		}
		if (m.type === 'adsconnect') {
			var steps = ['In Google Ads, open <b>Tools</b> (wrench icon) → <b>Bulk actions</b> → <b>Scripts</b>.', 'Click the blue <b>+</b> → <b>New script</b>. Name it <b>Dream Desk report</b>.', 'Delete what’s in the editor, then paste the script below (use <b>Copy script</b>).', 'Click <b>Authorize</b> and allow access (it only reads reports), then <b>Preview</b>. The log should end with <b>200</b>.', 'Click <b>Save</b>, close the editor, and in the <b>Frequency</b> column choose <b>Hourly</b>.'];
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide">' + head('Advertising', 'Connect', 'Google Ads')
				+ '<ol class="dwdc-adsteps">' + steps.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>'
				+ (m.script ? '<textarea class="dwdc-adscript" readonly rows="10">' + esc(m.script) + '</textarea><div class="dwdc-farow end"><button type="button" class="dwdc-btn" data-adscopy>Copy script</button></div>' : emptyRow('Loading the script…'))
				+ '<p class="dwdc-wins-foot">The script runs inside your Google Ads account and only reads spend, clicks, impressions and conversions. It never changes campaigns or billing. Your numbers appear here within the hour.</p></div>';
		}
		if (m.type === 'meetconnect') {
			var msteps = ['Open <b>script.google.com</b> (signed in as mike@dreamwebdigital.com) and click <b>New project</b>. Name it <b>Dream Desk inbox</b> (or open your old <b>Dream Desk meetings</b> project and replace its code).', 'Delete what’s in the editor and paste the script below (use <b>Copy script</b>), then click <b>Save</b>.', 'In the function menu at the top choose <b>setup</b> and click <b>Run</b>. Allow access to your calendar and Gmail when Google asks (it only reads them).', 'The log should end with <b>200</b>. That’s it: it updates every 15 minutes from now on.'];
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide">' + head('Inbox', 'Connect', 'Google')
				+ '<ol class="dwdc-adsteps">' + msteps.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>'
				+ (m.script ? '<textarea class="dwdc-adscript" readonly rows="10">' + esc(m.script) + '</textarea><div class="dwdc-farow end"><button type="button" class="dwdc-btn" data-adscopy>Copy script</button></div>' : emptyRow('Loading the script…'))
				+ '<p class="dwdc-wins-foot">Every 15 minutes the script reads the next two weeks of your Google Calendar and the last 3 days of Upwork emails. Booked calls go on the lead, your Business to-dos and your Personal to-dos; Upwork interview invites and client messages become leads (or notes on the existing one); hires become active projects. It never changes your calendar or email.</p></div>';
		}
		if (m.type === 'connects') {
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide">' + head('Upwork', 'Connects', 'spending') + connSpend() + '<div class="dwdc-farow end"><a class="dwdc-btn2" href="#money" data-close-modal>Open in Money Stats</a></div></div>';
		}
		if (m.type === 'owed') {
			var ol = owingList().sort(function (a, b) { return num(b.balance) - num(a.balance); });
			var pdep = pendDeposit(ol), pN = ol.filter(function (c) { return c.paymark === 'pending'; }).length;
			var obody = ol.length ? '<div class="dwdc-mo-sum"><span>Projects<b>' + ol.length + '</b></span><span>Total owed<b>' + money(owed(ol)) + '</b></span>' + (pdep ? '<span class="pend" title="Projects marked Pending: paid, waiting to be transferred to your bank (Upwork after its 10% fee)">Next deposit · ' + pN + ' pending<b>' + money(pdep) + '</b></span>' : '') + '</div>'
				+ ol.map(function (c) {
					var k = clientOf(c), pm = c.paymark || '';
					var tb = function (v, label) { return '<button type="button" class="dwdc-btn2 sm' + (pm === v ? ' on-' + v : '') + '" data-owmark="' + c.id + '" data-v="' + (pm === v ? '' : v) + '">' + label + '</button>'; };
					return '<div class="dwdc-mo-r dwdc-owr" data-owgo="client/' + c.id + '"><span class="d">' + (c.deadline ? 'Due ' + fmt(c.deadline) : '') + '</span><span class="w"><b>' + esc(c.name) + (pm === 'pending' ? ' <em class="dwdc-pendtag pending">Pending</em>' : '') + '</b><small>' + esc([k ? k.name : c.person, num(c.price) ? 'Price ' + money(c.price) : '', c.list === 'complete' ? 'Completed' : ''].filter(Boolean).join(' · ')) + '</small></span><strong>' + money(c.balance) + '</strong>'
						+ '<span class="dwdc-owacts">' + tb('pending', 'Pending') + '<button type="button" class="dwdc-btn sm" data-owpaid="' + c.id + '">Paid</button></span></div>';
				}).join('') : emptyRow('Nothing is owed on open projects.');
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide">' + head('Projects', 'Owed', money(owed(ol))) + obody + '</div>';
		}
		if (m.type === 'month') {
			var MNL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
			var yy = +m.ym.slice(0, 4), mo = +m.ym.slice(5, 7), title = MNL[mo - 1] + ' ' + yy;
			var shift = function (n) { var d = new Date(yy, mo - 1 + n, 1); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); };
			var body;
			if (!m.rows) { body = emptyRow('Loading payments…'); }
			else if (!m.rows.length) { body = emptyRow('No payments this month.'); }
			else {
				var tot = m.rows.reduce(function (a, x) { return a + x.amount; }, 0);
				var groups = [['Upwork', 'upw', 'Upwork (after fees)'], ['Stripe', 'str', 'Stripe'], ['PayPal', 'ppl', 'PayPal'], ['Other', 'oth', 'Zelle, check & other']];
				body = '<div class="dwdc-mo-sum">' + groups.map(function (g) { var t = m.rows.filter(function (x) { return x.source === g[0]; }).reduce(function (a, x) { return a + x.amount; }, 0); return t ? '<span><i class="' + g[1] + '"></i>' + g[2] + '<b>' + money(t) + '</b></span>' : ''; }).join('') + '<span class="all">Total<b>' + money(tot) + '</b></span></div>'
					+ groups.map(function (g) {
						var list = m.rows.filter(function (x) { return x.source === g[0]; });
						if (!list.length) { return ''; }
						var t = list.reduce(function (a, x) { return a + x.amount; }, 0);
						return '<section class="dwdc-mo-g"><h4><i class="' + g[1] + '"></i>' + g[2] + '<small>' + list.length + ' payment' + (list.length === 1 ? '' : 's') + '</small><b>' + money(t) + '</b></h4>'
							+ list.map(function (x) {
								var pc = contact(x.pid), ptot = pc ? num(pc.price) : 0;
								var fin = pc && !x.refund && !num(pc.balance) && ptot && paidIn(pc) - Math.abs(x.amount) < ptot && (!pc.last_paid || String(x.date).slice(0, 10) >= String(pc.last_paid).slice(0, 10));
								return '<a class="dwdc-mo-r' + (x.refund ? ' ref' : '') + (ptot ? ' tot' : '') + '" href="#client/' + x.pid + '" data-close-modal><span class="d">' + fmt(x.date) + '</span><span class="w"><b>' + esc(x.client || x.project) + (fin ? ' <em class="dwdc-final">Final payment</em>' : '') + '</b><small>' + esc(x.project + (x.note ? ' · ' + x.note.replace(/ · after Upwork fee.*$/, '') : '') + (g[0] === 'Other' && x.method ? ' · ' + x.method : '')) + '</small></span><span class="a">' + (x.refund ? '−' : '') + money(Math.abs(x.amount)) + (ptot ? '<small>of ' + money(ptot) + ' project</small>' : '') + '</span></a>';
							}).join('') + '</section>';
					}).join('');
			}
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide">' + head('Payments', MNL[mo - 1], String(yy))
				+ '<div class="dwdc-mo-nav"><button class="dwdc-btn2 sm" data-month="' + shift(-1) + '">‹ ' + MNL[(mo + 10) % 12].slice(0, 3) + '</button><button class="dwdc-btn2 sm" data-month="' + shift(1) + '">' + MNL[mo % 12].slice(0, 3) + ' ›</button></div>'
				+ body + '</div>';
		}
		if (m.type === 'task') {
			var tk = S.tasks.find(function (x) { return x.id === m.id; });
			if (!tk) { S.modal = null; return ''; }
			var tc = tk.contact ? contact(tk.contact) : null, tcl = tc ? clientOf(tc) : null;
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal dwdc-taskm">' + head(tk.done ? 'Completed to-do' : 'To-do', 'Task', 'details')
				+ '<p class="dwdc-taskm-t' + (tk.done ? ' done' : '') + '">' + esc(tk.text).replace(/\n/g, '<br>') + '</p>'
				+ '<dl class="dwdc-taskm-d">'
				+ (tc ? '<dt>Project</dt><dd><a href="#client/' + tc.id + '" data-close-modal>' + esc(tc.name) + '</a>' + (tcl ? ' · ' + esc(tcl.name) : '') + '</dd>' : '')
				+ '<dt>Due</dt><dd>' + (tk.due ? fmt(tk.due) : 'No date') + '</dd>'
				+ '<dt>Added</dt><dd>' + (tk.created ? fmt(tk.created.slice(0, 10)) : '—') + '</dd>'
				+ (tk.done ? '<dt>Completed</dt><dd>' + (tk.done_at ? fmt(tk.done_at.slice(0, 10)) : 'Yes') + '</dd>' : '')
				+ '</dl><div class="dwdc-farow end"><button type="button" class="dwdc-btn2 danger" data-del-task="' + tk.id + '">Delete</button>'
				+ '<button type="button" class="dwdc-btn" data-toggle="' + tk.id + '">' + ic('check', 14) + (tk.done ? 'Mark not done' : 'Mark done') + '</button></div></div>';
		}
		if (m.type === 'paddtask') {
			var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
			var dfmt = function (t) { return t.due ? new Date(t.due + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + (t.time ? ' · ' + t.time : '') : 'No date'; };
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal dwdc-addm">' + head('Personal', 'Add a', 'task')
				+ '<div class="dwdc-addlog">' + (m.msgs.length ? '' : '<p class="dwdc-addhi">Just say what you need to do and when. For example: <i>“Dentist next Tuesday at 3pm, bring the insurance card”</i> or <i>“Pay rent on the 1st and call Mom Sunday evening.”</i></p>')
				+ m.msgs.map(function (x) { return '<div class="dwdc-chat-m ' + x.role + '">' + esc(x.content) + '</div>'; }).join('')
				+ (m.busy ? '<div class="dwdc-chat-m assistant typing"><i></i><i></i><i></i></div>' : '') + '</div>'
				+ (m.tasks && m.tasks.length ? '<div class="dwdc-addprop"><p class="dwdc-lbl">Ready to add</p>' + m.tasks.map(function (t, i) { return '<div class="dwdc-addcard"><span class="dwdc-chk on">' + ic('check', 11) + '</span><div><b>' + esc(t.text) + '</b><small>' + esc(dfmt(t)) + (t.note ? ' · ' + esc(t.note) : '') + '</small></div><button type="button" data-ptrm="' + i + '" aria-label="Remove">' + ic('x', 13) + '</button></div>'; }).join('')
					+ '<button type="button" class="dwdc-btn coral full" data-ptconfirm>' + ic('check', 14) + 'Add ' + (m.tasks.length === 1 ? 'task' : m.tasks.length + ' tasks') + '</button><p class="dwdc-mutp sm">Want to change something? Just say it below.</p></div>' : '')
				+ '<div class="dwdc-addin">' + (SR ? '<button type="button" class="dwdc-mic' + (m.listening ? ' on' : '') + '" data-ptmic aria-label="Talk">' + ic('mic', 18) + '</button>' : '')
				+ '<textarea rows="1" data-ptdraft placeholder="' + (m.listening ? 'Listening…' : 'Type or tap the mic…') + '">' + esc(m.draft || '') + '</textarea><button type="button" class="dwdc-btn" data-ptsend aria-label="Send"' + (m.busy ? ' disabled' : '') + '>' + ic('right', 16) + '</button></div></div>';
		}
		if (m.type === 'pday') {
			var PD = S.pers || { todos: [], bills: [] }, day = m.day;
			var dayItems = PD.todos.filter(function (x) { return x.due === day; }).sort(function (a, b) {
				var tm = function (x) { if (!x.time) { return -1; } var q = /^(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(x.time) || [0, 0, 0]; return (+q[1] % 12 + (/p/i.test(q[3] || '') ? 12 : 0)) * 60 + +q[2]; };
				return tm(a) - tm(b);
			});
			var dayBills = PD.bills.filter(function (b) { var dd = new Date(day + 'T12:00:00'); if (b.freq === 'weekly') { return ((dd.getDay() + 6) % 7) + 1 === b.day; } if (b.freq === 'yearly' && b.month !== dd.getMonth() + 1) { return false; } return Math.min(b.day, new Date(dd.getFullYear(), dd.getMonth() + 1, 0).getDate()) === dd.getDate(); });
			var long = new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).split(', ');
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal dwdc-daym">' + head(long[0], long[1].split(' ')[0], long[1].split(' ')[1] + (long[2] ? ', ' + long[2] : ''))
				+ (dayItems.length || dayBills.length ? '<div class="dwdc-daylist">' + dayItems.map(function (x) {
					return '<button type="button" class="dwdc-dayi ' + (x.gevent ? 'ev' : 'td') + (isFlight(x.text) ? ' flight' : '') + (x.done ? ' done' : '') + '" data-ptask="' + x.id + '"><span class="tm">' + esc(x.time || (x.gevent ? 'All day' : 'To-do')) + '</span><span class="tx"><b>' + esc(ptx(x.text)) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : '') + '</span>' + ic('right', 14) + '</button>';
				}).join('') + dayBills.map(function (b) {
					return '<a class="dwdc-dayi bill" href="#personal/bills" data-close-modal><span class="tm">Bill</span><span class="tx"><b>' + esc(b.name) + ' · ' + money(b.amount) + '</b><small>' + (b.autopay ? 'Autopay' : 'Pay manually') + '</small></span>' + ic('right', 14) + '</a>';
				}).join('') + '</div>' : emptyRow('Nothing on this day yet.'))
				+ '<form class="dwdc-ptadd daym" data-pform="pdayadd"><input type="hidden" name="due" value="' + day + '"><input name="text" placeholder="Add something on this day…" autocomplete="off" required><button class="dwdc-btn">' + ic('plus', 14) + 'Add</button></form></div>';
		}
		if (m.type === 'ptask') {
			var pt = ((S.pers || {}).todos || []).find(function (x) { return x.id === m.id; });
			if (!pt) { S.modal = null; return ''; }
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal dwdc-taskm">' + head(pt.gevent ? 'Google Calendar' : pt.done ? 'Completed · Personal' : 'Personal to-do', pt.gevent ? 'Event' : 'Task', 'details')
				+ (pt.source ? '<p class="dwdc-mutp">From ' + esc(pt.source) + (pt.gevent ? ' · edits and deletes also update your Google Calendar' : pt.gtask ? ' · changes also update Google Tasks' : '') + '</p>' : '')
				+ '<form class="dwdc-fgrid dwdc-pedit" data-pform="ptask"><input type="hidden" name="id" value="' + esc(pt.id) + '"><label class="wide"><span>' + (pt.gevent ? 'Event' : 'To-do') + '</span><input name="text" value="' + esc(pt.text) + '" required></label><label><span>' + (pt.gevent ? 'Date' : 'Due') + '</span><input type="date" name="due" value="' + esc(pt.due || '') + '"></label>'
				+ (pt.gevent ? '<label><span>Time</span><input name="time" value="' + esc(pt.time || '') + '" placeholder="All day, or e.g. 7:00 PM"></label>' : '')
				+ (pt.gevent ? '' : '<div class="wide dwdc-tagpick"><span>Category</span><input type="hidden" name="tag" value="' + esc(pt.tag || '') + '"><div>' + Object.keys(PTAGS).map(function (k) { return '<button type="button" class="t-' + k + (pt.tag === k ? ' on' : '') + '" data-tagpick="' + k + '">' + PTAGS[k] + '</button>'; }).join('') + '</div></div>')
				+ '<label class="wide"><span>Notes</span><textarea name="note" rows="4" placeholder="Anything to remember…">' + esc(pt.note || '') + '</textarea></label>'
				+ '<div class="dwdc-farow end wide"><button type="button" class="dwdc-btn2 danger" data-pdel="todos:' + pt.id + '">Delete</button><button type="button" class="dwdc-btn2" data-ptoggle="' + pt.id + '">' + (pt.done ? 'Mark not done' : 'Mark done') + '</button><button class="dwdc-btn">Save</button></div></form></div>';
		}
		if (m.type === 'csvremind') {
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal dwdc-csvm">' + head('Reminder', 'Update your', 'finances')
				+ '<p>It’s time to upload a fresh <b>Upwork CSV</b> so your Money Stats stay current.' + (DWDC.upLast ? ' Your last upload was <b>' + fmt(DWDC.upLast, true) + '</b>.' : '') + '</p>'
				+ '<ol><li>In Upwork, open <a href="https://www.upwork.com/nx/payments/reports/transaction-history" target="_blank" rel="noopener"><b>Reports → Transaction History</b></a>.</li><li>Pick the date range since your last upload and click <b>Download CSV</b>.</li><li>Add it under <b>Money Stats → Connections → Upwork</b>.</li></ol>'
				+ '<div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-csvsnooze>Remind me tomorrow</button><button type="button" class="dwdc-btn coral" data-csvgo>' + ic('plus', 14) + 'Upload CSV now</button></div></div>';
		}
		if (m.type === 'review') {
			var its = S.pending || [], off = m.off || {}, nOn = its.filter(function (x) { return !off[x.id]; }).length;
			var KIND = { new_project: ['New project', 'blue'], update: ['Update', 'deep'], completed: ['Completed', 'navy'], note: ['Check', 'steel'], email: ['Client email', 'deep'], markup: ['Markup link', 'deep'] };
			return '<div class="dwdc-overlay" data-close-modal></div><div class="dwdc-modal wide dwdc-revm">' + head('Found in your email', 'Review', 'updates')
				+ '<p class="dwdc-mutp">Nothing is added until you approve it. Untick anything you don’t want.</p>'
				+ (its.length ? '<div class="dwdc-revlist">' + its.map(function (x) {
					var k = KIND[x.kind] || ['Update', 'deep'], on = !off[x.id];
					return '<div class="dwdc-revi' + (on ? ' on' : '') + '" data-revpick="' + x.id + '"><span class="dwdc-chk">' + ic('check', 12) + '</span><div><span class="dwdc-pill t-' + k[1] + '">' + k[0] + '</span><b>' + esc(x.title) + '</b>'
						+ '<ul>' + (x.lines || []).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul><small>' + esc(x.source || '') + '</small></div></div>';
				}).join('') + '</div>' : emptyRow('All caught up — nothing waiting for review.'))
				+ (its.length ? '<div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-revgo="dismiss"' + (m.busy ? ' disabled' : '') + '>Dismiss ' + nOn + '</button><button type="button" class="dwdc-btn" data-revgo="approve"' + (m.busy ? ' disabled' : '') + '>' + ic('check', 14) + 'Approve ' + nOn + '</button></div>' : '')
				+ '</div>';
		}
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
				+ inp('source', 'Source', 'e.g. Referral, phone call, Upwork') + inp('website', 'Website') + inp('price', 'Estimated value ($)', 'e.g. 3500') + inp('followup', 'Follow up on', '', 'date')
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
					+ (mv ? '<button type="button" class="dwdc-lnk" data-newc>' + ic('plus', 14) + 'New client</button>' : m.hosting ? '<button type="button" class="dwdc-btn2 wide" data-newc>' + ic('plus', 15) + 'Add new client</button>' : '<button type="button" class="dwdc-btn2 wide" data-newinvite>' + ic('plus', 15) + 'Add new client</button>');
			}
			if (mv) {
				var pj = contact(m.project);
				body = '<form class="dwdc-modal dwdc-moveform">' + head('Project', 'Change', 'client')
					+ '<p class="dwdc-mutp">Which client does <b>' + esc(pj ? pj.name : 'this project') + '</b> belong to?</p><h3 class="dwdc-mh">Client</h3>' + who
					+ '<div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Save</button></div></form>';
			} else {
				if (m.hosting) {
					var ny = new Date(DWDC.today + 'T12:00:00'); ny.setFullYear(ny.getFullYear() + 1);
					body = '<form class="dwdc-modal dwdc-hostform">' + head('Hosting', 'New website', 'hosting')
						+ '<h3 class="dwdc-mh">Client</h3>' + who
						+ (!picked && !m.newc ? '</form>' : '<h3 class="dwdc-mh">Website hosting</h3><div class="dwdc-fgrid">'
							+ inp('website', 'Website', 'e.g. denningerlaw.com', '', true) + inp('hosting', 'Price per year ($)', 'e.g. 250')
							+ '<label><span>Renews on</span><input name="renewal" type="date" value="' + esc(v.renewal || ny.toISOString().slice(0, 10)) + '"></label>'
							+ '<label class="wide dwdc-chkl"><input type="checkbox" name="sendlink" value="1"' + (v.sendlink ? ' checked' : '') + '> Email them the hosting payment link now</label>'
							+ '</div><div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Add website hosting</button></div></form>');
				} else {
				body = '<form class="dwdc-modal dwdc-jobform">' + head('New project', 'Add a', 'project')
					+ '<h3 class="dwdc-mh">Client</h3>' + who
					+ (!picked && !m.newc ? '</form>' : '<h3 class="dwdc-mh">The project</h3><div class="dwdc-fgrid">' + inp('name', 'Project name', 'The website or business, e.g. Denninger Law', '', true) + inp('title', 'What they hired you for', 'e.g. New website and logo', '', true)
					+ inp('price', 'Price ($)', '3000') + inp('balance', 'Still owed ($)', 'e.g. 1500 after deposit') + inp('deadline', 'Due date', '', 'date') + inp('website', 'Website', 'e.g. denningerlaw.com') + inp('next', 'Next step', 'e.g. Send wireframes', '', true) + '</div>'
					+ '<div class="dwdc-farow end"><button type="button" class="dwdc-btn2" data-close-modal>Cancel</button><button class="dwdc-btn">Add to active projects</button></div></form>');
				}
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
	/* ---------- drag to reorder (home Leads + Projects): mouse drag, or press-and-hold on touch ---------- */
	(function () {
		var D = null, eatClick = false;
		function pt(e) { var t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }
		function begin(e) {
			var it = e.target.closest('[data-sort] [data-sid]');
			if (!it || (e.button !== undefined && e.button !== 0)) { return; }
			var p = pt(e);
			D = { it: it, list: it.closest('[data-sort]'), x: p.x, y: p.y, on: false, touch: !!e.touches };
			if (D.touch) { D.timer = setTimeout(function () { if (D) { start(); if (navigator.vibrate) { navigator.vibrate(15); } } }, 320); }
		}
		function start() { D.on = true; D.it.classList.add('dwdc-dragging'); D.list.classList.add('dwdc-sorting'); }
		function move(e) {
			if (!D) { return; }
			var p = pt(e);
			if (!D.on) {
				if (D.touch) { if (Math.abs(p.y - D.y) > 8 || Math.abs(p.x - D.x) > 8) { clearTimeout(D.timer); D = null; } return; }
				if (Math.abs(p.y - D.y) < 6) { return; }
				start();
			}
			e.preventDefault();
			var sib = [].slice.call(D.list.querySelectorAll('[data-sid]')).filter(function (x) { return x !== D.it; });
			var before = null;
			for (var i = 0; i < sib.length; i++) { var r = sib[i].getBoundingClientRect(); if (p.y < r.top + r.height / 2) { before = sib[i]; break; } }
			if (before) { if (D.it.nextElementSibling !== before) { D.list.insertBefore(D.it, before); } } else if (sib.length && D.list.lastElementChild !== D.it) { D.list.appendChild(D.it); }
			var lr = D.list.getBoundingClientRect(); // nudge a scrolling list along
			if (p.y > lr.bottom - 24) { D.list.scrollTop += 10; } else if (p.y < lr.top + 24) { D.list.scrollTop -= 10; }
		}
		function end() {
			if (!D) { return; }
			clearTimeout(D.timer);
			if (D.on) {
				var key = D.list.getAttribute('data-sort'), ids = [].map.call(D.list.querySelectorAll('[data-sid]'), function (x) { return +x.getAttribute('data-sid'); });
				D.it.classList.remove('dwdc-dragging'); D.list.classList.remove('dwdc-sorting');
				S.order = S.order || {}; S.order[key] = ids; eatClick = true; setTimeout(function () { eatClick = false; }, 400);
				api('/home-order', 'POST', { key: key, ids: ids }).then(function () { toast('Order saved'); }).catch(fail);
			}
			D = null;
		}
		app.addEventListener('mousedown', function (e) { if (e.target.closest('[data-sort] [data-sid]')) { e.preventDefault(); begin(e); } });
		document.addEventListener('mousemove', move);
		document.addEventListener('mouseup', end);
		app.addEventListener('touchstart', begin, { passive: true });
		document.addEventListener('touchmove', function (e) { if (D && D.on) { move(e); } else if (D) { move(e); } }, { passive: false });
		document.addEventListener('touchend', end);
		document.addEventListener('touchcancel', end);
		app.addEventListener('contextmenu', function (e) { if (D && D.touch) { e.preventDefault(); } });
		app.addEventListener('click', function (e) { if (eatClick && e.target.closest('[data-sort]')) { e.preventDefault(); e.stopPropagation(); eatClick = false; } }, true);
	})();
	app.addEventListener('click', function (e) {
		var t = e.target, el;
		if ((el = t.closest('[data-notestog]'))) { var nid = el.getAttribute('data-notestog'); S.notesOpen = S.notesOpen || {}; S.notesOpen[nid] = !S.notesOpen[nid]; render(); return; }
		// project page: ⋯ menu, payment log form, remove a payment
		if ((el = t.closest('[data-pmore]'))) { var mw = el.closest('.pv3-more'); mw.classList.toggle('open'); return; }
		if (!t.closest('.pv3-more')) { app.querySelectorAll('.pv3-more.open').forEach(function (m) { m.classList.remove('open'); }); }
		if ((el = t.closest('[data-plog]'))) { S.plog = +el.getAttribute('data-plog'); render(); setTimeout(function () { var a = app.querySelector('.pv3-logf [name=amount]'); if (a) { a.focus(); a.select(); a.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 30); return; }
		if (t.closest('[data-plogx]')) { S.plog = null; render(); return; }
		if ((el = t.closest('[data-payrm]'))) {
			var prid = route().id, pidx = +el.getAttribute('data-payrm'), pc2 = S.full[prid], px = pc2 && (pc2.payments || [])[pidx];
			if (!px || !confirm('Remove the ' + money(px.amount) + ' payment from ' + fmt(String(px.date).slice(0, 10)) + '? It goes back into what’s owed.')) { return; }
			api('/contact/' + prid + '/payment/' + pidx, 'DELETE').then(function (x) { upsert(x); S.full[x.id] = x; return reload(); }).then(function () { render(); toast('Payment removed'); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-ppltoggle]'))) { var pid = el.getAttribute('data-ppltoggle'); S.pplOpen = S.pplOpen || {}; S.pplOpen[pid] = !S.pplOpen[pid]; el.closest('.dwdc-pplin').classList.toggle('open', !!S.pplOpen[pid]); return; }
		if ((el = t.closest('[data-owgo]')) && !t.closest('button')) { S.modal = null; go(el.getAttribute('data-owgo')); return; }
		if ((el = t.closest('[data-owpaid]'))) { e.preventDefault(); e.stopPropagation(); markPaid(+el.getAttribute('data-owpaid'), el); return; }
		if ((el = t.closest('[data-owmark]'))) {
			// Just a label on the Owed list: nothing is logged, moved or totalled.
			e.preventDefault(); e.stopPropagation();
			var mid = +el.getAttribute('data-owmark'), mv = el.getAttribute('data-v');
			api('/contact/' + mid, 'POST', { paymark: mv }).then(function (x) { upsert(x); S.full[mid] = x; render(); }).catch(fail);
			return;
		}
		if (t.closest('[data-menu]')) { document.body.classList.toggle('dwdc-menu-open'); return; }
		if (t.closest('[data-newmenu]')) { S.newOpen = !S.newOpen; var mm = app.querySelector('.dwdc-ph-menu'); if (mm) { mm.classList.toggle('open', S.newOpen); mm.querySelector('[data-newmenu]').setAttribute('aria-expanded', S.newOpen); } return; }
		if (S.newOpen && !t.closest('.dwdc-ph-menu')) { S.newOpen = false; var m2 = app.querySelector('.dwdc-ph-menu'); if (m2) { m2.classList.remove('open'); } }
		if (t.closest('.dwdc-ph-menu [role=menuitem]')) { S.newOpen = false; }
		if (t.closest('[data-close-modal]')) { S.modal = null; render(); return; }
		if ((el = t.closest('[data-pick]'))) { keepVals(); S.modal.client = +el.getAttribute('data-pick'); render(); focusIn(S.modal.hosting ? '[name=website]' : '[name=name]'); return; }
		if (t.closest('[data-unpick]')) { keepVals(); S.modal.client = 0; render(); focusIn('.dwdc-pick'); return; }
		if (t.closest('[data-newc]')) { keepVals(); S.modal.newc = true; S.modal.vals.client_name = S.modal.vals.client_name || S.modal.q || ''; render(); focusIn('[name=client_name]'); return; }
		if ((el = t.closest('[data-moveclient]'))) { S.modal = { type: 'move', project: +el.getAttribute('data-moveclient'), client: 0, q: '', vals: {} }; render(); focusIn('.dwdc-pick'); return; }
		if (t.closest('[data-oldc]')) { keepVals(); S.modal.newc = false; S.modal.invite = false; S.modal.textMsg = ''; render(); focusIn('.dwdc-pick'); return; }
		if (t.closest('[data-newinvite]')) { keepVals(); S.modal.invite = true; S.modal.newc = false; var qq = S.modal.q || ''; if (/@|\d{3}/.test(qq)) { S.modal.vals.invite_to = qq; } render(); focusIn('[name=invite_to]'); return; }
		if ((el = t.closest('[data-leadinvite]'))) {
			var lc = S.full[+el.getAttribute('data-leadinvite')] || contact(+el.getAttribute('data-leadinvite'));
			var lto = lc.email || window.prompt('Email or phone number to send ' + (lc.person || lc.name) + ' the onboarding form:', lc.phone || '');
			if (!lto || !String(lto).trim()) { return; }
			lto = String(lto).trim(); el.disabled = true;
			api('/invite', 'POST', { to: lto, project: lc.id }).then(function (x) {
				upsert(x.project); S.full[lc.id] = x.project; el.disabled = false; render();
				if (x.sent) { toast('Onboarding form emailed to ' + lto); }
				else if (/@/.test(lto)) { toast('The email didn’t send. Try again, or text them the link.', true); }
				else {
					var done = function () { toast('Text copied: paste it into a message to ' + lto); };
					if (navigator.clipboard) { navigator.clipboard.writeText(x.text).then(done, function () { window.prompt('Copy this and text it to ' + lto + ':', x.text); }); } else { window.prompt('Copy this and text it to ' + lto + ':', x.text); }
				}
			}).catch(function (er) { el.disabled = false; fail(er); });
			return;
		}
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
			S.modal = a === 'pay' ? { type: 'pay', renew: !!el.getAttribute('data-renew'), project: +el.getAttribute('data-project') || (route().view === 'client' || route().view === 'host' ? route().id : 0), vals: el.getAttribute('data-renew') ? { note: 'Hosting renewal' } : {} } : a === 'lead' ? { type: 'lead', vals: {} } : a === 'newclient' ? { type: 'newclient', vals: {} } : a === 'hosting' ? { type: 'job', hosting: true, client: +el.getAttribute('data-client') || 0, q: '', vals: {} } : { type: 'job', client: +el.getAttribute('data-client') || 0, q: '', vals: {} };
			render(); focusIn((a === 'job' || a === 'hosting') && !S.modal.client ? '.dwdc-pick' : (a === 'hosting' ? '[name=website]' : '[name=name]')); return;
		}
		if (t.closest('select, input, textarea, summary, label')) { return; }
		if ((el = t.closest('[data-del-task]'))) {
			e.stopPropagation();
			var id = +el.getAttribute('data-del-task');
			if (S.modal && S.modal.type === 'task') { S.modal = null; }
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
			e.stopPropagation();
			if (S.modal && S.modal.type === 'task') { S.modal = null; }
			setDone(+el.getAttribute('data-toggle'));
			return;
		}
		if ((el = t.closest('[data-task]')) && !t.closest('a, button')) {
			S.modal = { type: 'task', id: +el.getAttribute('data-task'), vals: {} }; render();
			return;
		}
		if (t.closest('[data-csvsnooze]')) { try { localStorage.setItem('dwdcCsvSnooze', DWDC.today); } catch (e2) {} S.modal = null; render(); return; }
		if (t.closest('[data-csvgo]')) { S.modal = null; S.syncOpen = true; go('money'); setTimeout(function () { var u = document.querySelector('.dwdc-upbtn'); if (u) { u.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 400); return; }
		if ((el = t.closest('[data-ptoggle]'))) {
			e.stopPropagation();
			var ptd = (S.pers.todos || []).find(function (x) { return x.id === el.getAttribute('data-ptoggle'); });
			if (ptd) { var was = ptd.done; ptd.done = !was; render(); pSave('todos', { id: ptd.id, done: !was }); if (!was) { undoToast('Done', function () { pSave('todos', { id: ptd.id, done: false }); }); } }
			if (S.modal && S.modal.type === 'ptask') { S.modal = null; }
			return;
		}
		if ((el = t.closest('[data-pdel]'))) {
			e.stopPropagation();
			var pd = el.getAttribute('data-pdel').split(':'), pdt = pd[0] === 'todos' && S.pers ? S.pers.todos.find(function (x) { return x.id === pd[1]; }) : null;
			if (pd[0] !== 'todos' && !confirm('Delete this for good?')) { return; }
			if (pdt && pdt.gevent && !confirm('Delete “' + pdt.text + '”? It will also be removed from your Google Calendar.')) { return; }
			if (S.modal) { S.modal = null; }
			pDel(pd[0], pd[1], 'Deleted');
			return;
		}
		if ((el = t.closest('[data-ptagf]'))) { S.pTag = el.getAttribute('data-ptagf'); render(); return; }
		if ((el = t.closest('[data-tagpick]'))) {
			var tf = el.closest('form'), hv = tf.querySelector('input[name=tag]'), tv = el.getAttribute('data-tagpick'), on = hv.value === tv;
			hv.value = on ? '' : tv; [].forEach.call(tf.querySelectorAll('[data-tagpick]'), function (b) { b.classList.toggle('on', !on && b === el); });
			return;
		}
		if ((el = t.closest('[data-ptask]')) && !t.closest('a') && (!t.closest('button') || t.closest('button') === el)) { S.modal = { type: 'ptask', id: el.getAttribute('data-ptask'), back: S.modal && S.modal.type === 'pday' ? S.modal.day : '', vals: {} }; render(); return; }
		if ((el = t.closest('[data-pshowdone]'))) { S.pShowDone = !S.pShowDone; render(); return; }
		if ((el = t.closest('[data-pcal]'))) { S.pCal = el.getAttribute('data-pcal'); render(); return; }
		if (t.closest('[data-pcaltoday]')) { S.pCal = DWDC.today.slice(0, 7); S.pSel = DWDC.today; render(); return; }
		if ((el = t.closest('[data-pcalf]'))) { var fk = el.getAttribute('data-pcalf'); S.pCalF = S.pCalF || { td: true, ev: true, bill: true }; S.pCalF[fk] = !S.pCalF[fk]; render(); return; }
		if (t.closest('[data-gobills]') && !t.closest('[data-ptask]')) { location.hash = 'personal/bills'; return; }
		if ((el = t.closest('.dwdc-phcal [data-psel]')) && !t.closest('[data-ptask], [data-gobills], a')) { S.modal = { type: 'pday', day: el.getAttribute('data-psel'), vals: {} }; render(); return; }
		if ((el = t.closest('[data-psel]')) && !t.closest('[data-ptask], [data-gobills], a')) { S.pSel = el.getAttribute('data-psel'); var pm = S.pSel.slice(0, 7); if (pm !== (S.pCal || DWDC.today.slice(0, 7))) { S.pCal = pm; } render(); if (window.innerWidth <= 1100) { setTimeout(function () { var dd = document.querySelector('.dwdc-c2-day'); if (dd) { dd.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 50); } return; }
		if (t.closest('[data-addtask]')) { S.modal = { type: 'paddtask', msgs: [], tasks: [], draft: '', vals: {} }; render(); setTimeout(function () { var ta = document.querySelector('[data-ptdraft]'); if (ta) { ta.focus(); } }, 60); return; }
		if (t.closest('[data-ptsend]')) { var ta0 = document.querySelector('[data-ptdraft]'); if (ta0 && S.modal) { S.modal.draft = ta0.value; } ptSend(); return; }
		if (t.closest('[data-ptmic]')) { var ta1 = document.querySelector('[data-ptdraft]'); if (ta1 && S.modal) { S.modal.draft = ta1.value; } ptMic(); return; }
		if ((el = t.closest('[data-ptrm]'))) { S.modal.tasks.splice(+el.getAttribute('data-ptrm'), 1); render(); return; }
		if (t.closest('[data-ptconfirm]')) {
			var list = (S.modal.tasks || []).slice(); S.modal = null; render();
			list.reduce(function (pr, x) { return pr.then(function () { return api('/personal', 'POST', { kind: 'todos', item: x }).then(function (d) { S.pers = d; }); }); }, Promise.resolve())
				.then(function () { render(); toast(list.length === 1 ? 'Task added' : list.length + ' tasks added'); }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-pday]')) && !t.closest('[data-ptask], a')) { S.modal = { type: 'pday', day: el.getAttribute('data-pday'), vals: {} }; render(); setTimeout(function () { var x = document.querySelector('.dwdc-daym input[name=text]'); if (x) { x.focus(); } }, 50); return; }
		if ((el = t.closest('[data-caladd]'))) { var cd = el.getAttribute('data-caladd'), txt = prompt('Add a to-do for ' + fmt(cd) + ':'); if (txt && txt.trim()) { pSave('todos', { text: txt.trim(), due: cd }, 'Added'); } return; }
		if ((el = t.closest('[data-pmonth]'))) { S.pMonth = el.getAttribute('data-pmonth'); render(); return; }
		if ((el = t.closest('[data-pbillpaid]'))) {
			var pb = (S.pers.bills || []).find(function (x) { return x.id === el.getAttribute('data-pbillpaid'); });
			if (pb) { var nx = billNext(pb), pp = {}; Object.keys(pb.paid || {}).forEach(function (k) { pp[k] = pb.paid[k]; }); if (nx.paid) { delete pp[nx.key]; } else { pp[nx.key] = DWDC.today; } pSave('bills', { id: pb.id, paid: pp }, nx.paid ? 'Marked not paid' : pb.name + ' paid'); }
			return;
		}
		if ((el = t.closest('[data-quotex]'))) { hideQuote(el.closest('[data-quote]')); return; }
		if ((el = t.closest('[data-askreview]'))) {
			var rk = clientRec(+el.getAttribute('data-askreview'));
			if (!rk || !confirm('Send ' + rk.name + ' the review request email?' + (rk.review_sent ? '\n\nYou already asked on ' + fmt(String(rk.review_sent).slice(0, 10), true) + '.' : ''))) { return; }
			el.disabled = true; el.textContent = 'Sending…';
			api('/reviews', 'POST', { ids: [rk.id] }).then(function (r) {
				if ((r.sent || []).length) { toast('Review request sent to ' + rk.name); }
				else { toast('Couldn’t send — ' + (((r.failed || [])[0] || {}).why === 'no email' ? 'no email address on file for ' + rk.name : 'the email didn’t go out'), true); }
				return reload();
			}).then(render).catch(fail);
			return;
		}
		if ((el = t.closest('[data-psort]'))) { e.preventDefault(); e.stopPropagation(); var pk = el.getAttribute('data-psort'); S.psort = S.psort || {}; S.psort[pk] = { '': 'desc', desc: 'asc', asc: '' }[S.psort[pk] || '']; try { localStorage.setItem('dwdc-psort', JSON.stringify(S.psort)); } catch (er) {} render(); return; }
		if (t.closest('[data-winsmore]')) { S.winsMore = !S.winsMore; render(); return; }
		if (t.closest('[data-connmore]')) { S.connMore = !S.connMore; render(); if (S.connMore) { setTimeout(function () { var c = document.querySelector('.dwdc-conn'); if (c) { c.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 50); } return; }
		if ((el = t.closest('[data-tgrp]'))) { var gid = +el.getAttribute('data-tgrp'); S.tgOpen = S.tgOpen || {}; S.tgOpen[gid] = !S.tgOpen[gid]; render(); return; }
		if ((el = t.closest('[data-showdone]'))) { S.showDone = !S.showDone; render(); return; }
		if ((el = t.closest('[data-review]'))) { S.modal = { type: 'review', vals: {}, off: {} }; render(); return; }
		if ((el = t.closest('[data-revpick]'))) { var rid = el.getAttribute('data-revpick'); S.modal.off[rid] = !S.modal.off[rid]; render(); return; }
		if ((el = t.closest('[data-revgo]'))) { reviewSend(el.getAttribute('data-revgo')); return; }
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
		if ((el = t.closest('[data-wins]'))) {
			var wp = el.getAttribute('data-wins').split('|');
			S.modal = { type: 'wins', from: wp[0], to: wp[1], label: wp[2] }; render();
			return;
		}
		if ((el = t.closest('[data-purge]'))) {
			e.preventDefault(); e.stopPropagation();
			var pid = +el.getAttribute('data-purge'), pc = contact(pid);
			if (!confirm('Delete ' + (pc ? (clientName(pc) || pc.name) : 'this lead') + ' completely?\n\nThis removes the lead, its notes and to-dos, its client record and the website form messages they sent. It can’t be undone.')) { return; }
			api('/lead/' + pid, 'DELETE').then(function () { drop(pid); return reload(); }).then(function () { toast('Lead deleted'); if (route().view !== 'leads') { go('leads'); } else { render(); } }).catch(fail);
			return;
		}
		if ((el = t.closest('[data-lstart]'))) {
			e.preventDefault(); e.stopPropagation();
			var lid = +el.getAttribute('data-lstart');
			api('/contact/' + lid, 'POST', { list: 'active', stage: 'active' }).then(function (x) { upsert(x); return reload(); }).then(function () { S.back = 'leads'; go('client/' + lid); toast('Project started: now in Active'); }).catch(fail);
			return;
		}
		if (t.closest('[data-adsconnect]') || (t.closest('[data-adsmodal]') && !(S.ads && S.ads.google))) {
			e.preventDefault(); S.modal = { type: 'adsconnect' }; render();
			api('/ads-script').then(function (x) { if (S.modal && S.modal.type === 'adsconnect') { S.modal.script = x.script; render(); } }).catch(fail);
			return;
		}
		if (t.closest('[data-meetconnect]')) {
			e.preventDefault(); S.modal = { type: 'meetconnect' }; render();
			api('/meetings').then(function (x) { if (S.modal && S.modal.type === 'meetconnect') { S.modal.script = x.script; render(); } }).catch(fail);
			return;
		}
		if (t.closest('[data-adsmodal]')) { e.preventDefault(); S.modal = { type: 'ads' }; render(); return; }
		if (t.closest('[data-adscopy]')) { var ta = app.querySelector('.dwdc-adscript'); if (ta) { ta.select(); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(function () { toast('Script copied'); }, function () { document.execCommand('copy'); toast('Script copied'); }); } return; }
		if (t.closest('[data-connmodal]')) { e.preventDefault(); S.modal = { type: 'connects' }; render(); return; }
		if (t.closest('[data-owed]')) { S.modal = { type: 'owed' }; render(); return; }
		if ((el = t.closest('[data-month]'))) {
			var ym = el.getAttribute('data-month');
			S.modal = { type: 'month', ym: ym, vals: {} }; render();
			api('/month?ym=' + ym).then(function (x) { if (S.modal && S.modal.type === 'month' && S.modal.ym === ym) { S.modal.rows = x.rows; render(); } }).catch(fail);
			return;
		}
		if (t.closest('[data-refresh]')) { runRefresh(); return; }
		if ((el = t.closest('[data-updel]'))) {
			if (!confirm('Delete ' + el.getAttribute('data-upname') + '? Its Upwork payments come out of your totals, unless another file covers them.')) { return; }
			api('/upwork-files/' + el.getAttribute('data-updel'), 'DELETE').then(function (r) { S.upRes = r; if (!r.error) { DWDC.upLast = DWDC.today; } return Promise.all([reload(), api('/sync').then(function (x) { S.sync = x; })]); }).then(function () { render(); toast('File deleted and totals updated'); }).catch(fail);
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
		if ((el = t.closest('[data-askai]'))) { chatOpen(el.getAttribute('data-askai') === 'personal' || route().view === 'personal' ? 'personal' : ''); return; }
		if (t.closest('[data-pconnopen]')) { S.pConnOpen = !S.pConnOpen; render(); return; }
		if (t.closest('[data-openconn]')) { e.preventDefault(); S.pConnOpen = true; if (location.hash !== '#personal') { location.hash = 'personal'; } else { render(); } setTimeout(function () { var c = document.querySelector('.dwdc-pconn'); if (c) { c.scrollIntoView({ behavior: 'smooth' }); } }, 300); return; }
		if ((el = t.closest('[data-bmonth]'))) { if (el.getAttribute('data-bmonth')) { S.bMonth = el.getAttribute('data-bmonth'); S.bCat = ''; render(); } return; }
		if ((el = t.closest('[data-bcat]'))) { var bc = el.getAttribute('data-bcat'); S.bCat = S.bCat === bc ? '' : bc; render(); return; }
		if ((el = t.closest('[data-sub]'))) { var sst = el.getAttribute('data-st'), sm = el.getAttribute('data-sub'), scur = ((S.bank && S.bank.subs) || []).find(function (x) { return x.merchant === sm; }); api('/bank', 'POST', { sub: sm, status: scur && scur.status === sst ? '' : sst }).then(function (d) { S.bank = d; render(); }).catch(fail); return; }
		if (t.closest('[data-plkeys]')) { var plk = {}; app.querySelectorAll('[data-plk]').forEach(function (x) { plk[x.getAttribute('data-plk')] = x.value.trim(); }); api('/plaid', 'POST', { action: 'keys', client_id: plk.client_id, secret: plk.secret }).then(function (d) { S.plaid = d; render(); toast('Plaid keys saved'); }).catch(fail); return; }
		if (t.closest('[data-plconnect]')) { plaidConnect(); return; }
		if (t.closest('[data-plsync]')) { toast('Syncing…'); api('/plaid', 'POST', { action: 'sync' }).then(function (d) { S.plaid = d; S.bank = null; render(); toast((d.sync && d.sync.added || 0) + ' new transactions'); }).catch(fail); return; }
		if ((el = t.closest('[data-plremove]'))) { if (!confirm('Disconnect this bank from Dream Desk? Transactions already imported stay.')) { return; } api('/plaid', 'POST', { action: 'remove', id: el.getAttribute('data-plremove') }).then(function (d) { S.plaid = d; render(); }).catch(fail); return; }
		if ((el = t.closest('[data-trendsnow]'))) { el.textContent = 'Checking…'; api('/trends', 'POST', {}).then(function (x) { S.trends = x; render(); toast('Trends updated'); }).catch(fail); return; }
		if (t.closest('[data-syncopen]')) { S.syncOpen = !S.syncOpen; render(); return; }
		if (t.closest('[data-connopen]')) { S.connOpen = !S.connOpen; render(); return; }
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
		if (t.closest('[data-paid]')) { markPaid(r.id); return; }
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
		if ((el = t.closest('[data-mkkeysave]'))) {
			var kv = (document.querySelector('[data-mkkey]') || {}).value || '';
			if (!kv.trim()) { toast('Paste your Markup API key first', true); return; }
			el.disabled = true;
			api('/markup-key', 'POST', { key: kv.trim() }).then(function () { DWDC.mkReady = true; render(); toast('Markup connected'); }).catch(function (er) { el.disabled = false; fail(er); });
			return;
		}
		if ((el = t.closest('[data-mkcreate]'))) {
			var su = ((document.querySelector('[data-mkurl]') || {}).value || '').trim();
			if (!su) { toast('Paste the staging site URL first', true); return; }
			if (!/^https?:\/\//i.test(su)) { su = 'https://' + su; }
			var rid2 = route().id;
			el.disabled = true; el.textContent = 'Creating…';
			api('/contact/' + rid2 + '/markup-create', 'POST', { url: su }).then(function (x) { upsert(x); S.full[x.id] = x; render(); toast('Markup link created'); })
				.catch(function (er) { if (er.data && er.data.needs_key) { DWDC.mkReady = false; render(); } else { el.disabled = false; el.textContent = 'Create markup link'; } fail(er); });
			return;
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
		if ((el = t.closest('[data-go]')) && !t.closest('a, button, input, select, textarea, label')) { go(el.getAttribute('data-go')); }
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
	// The search box starts read-only so browsers don't autofill a saved email into it; unlock it on focus.
	app.addEventListener('focusin', function (e) { var t = e.target; if (t.matches && t.matches('.dwdc-ssearch input') && t.hasAttribute('readonly')) { t.removeAttribute('readonly'); } });
	app.addEventListener('mousedown', function (e) { var t = e.target.closest && e.target.closest('.dwdc-ssearch'); if (t) { var i = t.querySelector('input'); if (i) { i.removeAttribute('readonly'); } } });
	app.addEventListener('input', function (e) {
		var t = e.target;
		if (t.closest('.dwdc-ssearch')) {
			// Only react to real typing (browser autofill fills unfocused fields).
			if (document.activeElement !== t) { t.value = ''; return; }
			searchDrop(t.closest('.dwdc-ssearch'), t.value);
		} else if (t.classList.contains('dwdc-pick')) {
			S.modal.q = t.value; app.querySelector('.dwdc-picks').innerHTML = pickList(S.modal.q);
		}
	});

	(function () {
		var sx = 0, sy = 0, qel = null;
		app.addEventListener('touchstart', function (e) { qel = e.target.closest && e.target.closest('[data-quote]'); if (qel) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; } }, { passive: true });
		app.addEventListener('touchmove', function (e) { if (!qel) { return; } var dx = e.touches[0].clientX - sx; if (Math.abs(dx) > Math.abs(e.touches[0].clientY - sy)) { qel.style.transform = 'translateX(' + dx + 'px)'; qel.style.opacity = String(Math.max(0.2, 1 - Math.abs(dx) / 260)); } }, { passive: true });
		app.addEventListener('touchend', function (e) { if (!qel) { return; } var dx = (e.changedTouches[0] || {}).clientX - sx; if (Math.abs(dx) > 90) { hideQuote(qel); } else { qel.style.transform = ''; qel.style.opacity = ''; } qel = null; });
	})();
	document.addEventListener('input', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-ptdraft') && S.modal) { S.modal.draft = e.target.value; e.target.style.height = ''; e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px'; } });
	document.addEventListener('keydown', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-ptdraft') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (S.modal) { S.modal.draft = e.target.value; } ptSend(); } });
	app.addEventListener('change', function (e) {
		var t = e.target;
		if (t.hasAttribute('data-revpick')) { S.revSel = S.revSel || {}; S.revSel[t.getAttribute('data-revpick')] = t.checked; render(); return; }
		if (t.hasAttribute('data-revall')) { S.revSel = S.revSel || {}; app.querySelectorAll('[data-revpick]').forEach(function (x) { S.revSel[x.getAttribute('data-revpick')] = t.checked; }); render(); return; }
		if (t.hasAttribute('data-upcsv') && t.files && t.files[0]) { upImport(t.files[0]); return; }
		if (t.hasAttribute('data-bankcsv') && t.files && t.files[0]) { [].forEach.call(t.files, bankUpload); t.value = ''; return; }
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
		if (t.hasAttribute('data-lprice')) {
			var lpid = +t.getAttribute('data-lprice'), lv = String(t.value).replace(/[^0-9.]/g, '');
			api('/contact/' + lpid, 'POST', { price: lv }).then(function (x) { upsert(x); render(); toast(lv ? 'Price saved' : 'Price cleared'); }).catch(fail);
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
		if (f.classList.contains('pv3-logf')) {
			var lid = route().id, lb = f.querySelector('.pay'); lb.disabled = true;
			api('/contact/' + lid + '/payment', 'POST', { amount: data.amount, date: data.date, method: data.method, note: data.note })
				.then(function (x) { upsert(x); S.full[x.id] = x; S.plog = null; return reload(); })
				.then(function () { render(); toast(money(data.amount) + ' payment saved'); }).catch(function (er) { lb.disabled = false; fail(er); });
			return;
		}
		if (f.hasAttribute('data-pform')) {
			var pk = f.getAttribute('data-pform');
			if (pk === 'bills') { data.autopay = !!f.querySelector('[name=autopay]:checked'); data.month = +DWDC.today.slice(5, 7); }
			if (pk === 'ptask') { pk = 'todos'; S.modal = S.modal && S.modal.back ? { type: 'pday', day: S.modal.back, vals: {} } : null; }
			if (pk === 'pdayadd') { pk = 'todos'; }
			pSave(pk, data, pk === 'todos' ? (data.id ? 'Saved' : 'Added') : pk === 'bills' ? 'Bill added' : 'Added').then(function () { var x = document.querySelector('[data-pform="' + pk + '"] input[name=text], [data-pform="' + pk + '"] input[name=label], [data-pform="' + pk + '"] input[name=name]'); if (x) { x.focus(); } });
			return;
		}
		var r = route();
		if (f.classList.contains('dwdc-pplf')) {
			if (!String(data.name || '').trim() && !String(data.email || '').trim()) { toast('Add a name or email', true); return; }
			var ac = S.full[r.id] || contact(r.id), al = peopleOf(ac); al.push(data); S.addPpl = 0;
			savePeople(ac, al, al.length === 1 ? data : null); return;
		}
		if (f.classList.contains('dwdc-hostform')) {
			var hm = S.modal, dom = String(data.website || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').toLowerCase();
			if (!hm.client && !hm.newc) { toast('Pick the client first, or add a new one', true); return; }
			if (hm.newc && !String(data.client_name || '').trim()) { toast('Add the client’s name', true); return; }
			if (!dom) { toast('Add the website', true); return; }
			var hb = f.querySelector('.dwdc-farow .dwdc-btn'); hb.disabled = true;
			api('/job', 'POST', { client: hm.client || 0, client_name: data.client_name, email: data.email, phone: data.phone, name: dom, title: 'Website hosting', website: dom })
				.then(function (x) { return api('/contact/' + x.id, 'POST', { list: 'complete', completed: DWDC.today, hosting: String(num(data.hosting) || ''), renewal: data.renewal || '', source: 'Added in Dream Desk', job: 'Website hosting' }); })
				.then(function (x) { return (data.sendlink ? api('/contact/' + x.id + '/paylink', 'POST', {}).then(function () { toast('Payment link emailed'); }, function (er) { toast('Hosting added, but the link didn’t send: ' + er.message, true); }) : Promise.resolve()).then(function () { return x; }); })
				.then(function (x) { return reload().then(function () { S.modal = null; location.hash = 'host/' + x.id; toast('Website hosting added'); }); })
				.catch(function (er) { hb.disabled = false; fail(er); });
			return;
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

	// When the app comes back to the front (or every 10 minutes), reload if Dream Desk was updated.
	(function () {
		var last = 0;
		var check = function () {
			if (Date.now() - last < 60000 || !DWDC.ver) { return; }
			last = Date.now();
			api('/version').then(function (x) { if (x && x.ver && x.ver !== DWDC.ver && !S.modal) { location.reload(); } }).catch(function () {});
		};
		document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { check(); } });
		window.addEventListener('focus', check);
		setInterval(check, 600000);
	})();
	/* ---------- start ---------- */
	document.body.classList.add('dwdc-app-on');
	api('').then(function (r) {
		S.contacts = r.contacts.filter(Boolean); S.tasks = r.tasks.filter(Boolean); S.clients = (r.clients || []).filter(Boolean); S.money = r.money || {}; S.costs = r.costs || {}; S.trends = r.trends || null; S.wins = r.wins || { list: [], undated: 0 }; S.ads = r.ads || null; S.meet = r.meetings || null; S.order = r.order || {};
		var m = /[?&]contact=(\d+)/.exec(location.search), em = /[?&]email=([^&]+)/.exec(location.search);
		var who = m ? contact(+m[1]) : em ? S.contacts.find(function (c) { return c.email && c.email.toLowerCase() === decodeURIComponent(em[1]).toLowerCase(); }) : null;
		if (who) { location.hash = 'client/' + who.id; }
		var rr = route(); if (rr.view === 'client' || rr.view === 'host') { load(rr.id); }
		render(true);
		loadPending(true);
	}).catch(function (e) { app.innerHTML = '<p class="dwdc-loading">Couldn’t load Client Desk: ' + esc(e.message) + '</p>'; });
})();
