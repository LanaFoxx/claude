/* Mojo's Flight Desk */
(function () {
	'use strict';
	var root = document.getElementById('mjd');
	if (!root || !window.MJD) return;

	/* ── helpers ── */
	var S = { sess: null, sessId: 0, stuView: (function () { try { return localStorage.getItem('mjdStuView2') || 'list'; } catch (x) { return 'list'; } })(), stOpen: {}, attSum: {}, flyF: '', flash: {}, people: [], stats: {}, quotes: [], att: [], gear: [], attMonth: '', attWho: '', tab: (function () { var h = (location.hash || '').slice(1); return h || 'home'; })(), stageF: '', leadF: 'recent', gsF: 'need', sel: {}, gsSel: {}, selInit: false, gsInit: false };
	function $(s, el) { return (el || document).querySelector(s); }
	function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function money(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
	function dt(d) { if (!d) return ''; var t = new Date(String(d).replace(' ', 'T') + (String(d).length === 10 ? 'T12:00' : '')); return isNaN(t) ? d : t.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
	function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
	function age(d) { return d ? (Date.now() - new Date(String(d).replace(' ', 'T'))) / 864e5 : 9999; }
	function ago(d) { var n = Math.floor((new Date(today() + 'T12:00') - new Date(String(d).slice(0, 10) + 'T12:00')) / 864e5); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'; }
	function name(p) { return ((p.first || '') + ' ' + (p.last || '')).trim() || p.email || '—'; }
	function api(op, data) {
		var fd = new FormData();
		fd.append('action', 'mjd'); fd.append('nonce', MJD.nonce); fd.append('op', op); fd.append('data', JSON.stringify(data || {}));
		return fetch(MJD.ajax, { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (r) {
			if (!r || !r.success) throw new Error((r && r.data) || 'Something went wrong');
			return r.data;
		});
	}
	function toast(msg, bad) {
		var t = document.createElement('div');
		t.textContent = msg;
		t.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:100001;background:' + (bad ? '#B42318' : '#16303A') + ';color:#fff;padding:12px 18px;border-radius:10px;font-weight:700;box-shadow:4px 4px 0 rgba(0,0,0,.25)';
		document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
	}
	function contact(p) {
		return (p.email ? '<a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '') +
			(p.phone ? '<div class="mjd-m"><a href="tel:' + esc(String(p.phone).replace(/[^0-9+]/g, '')) + '">' + esc(p.phone) + '</a></div>' : '');
	}
	function srcTag(s) { return s === 'Website' ? '<span class="mjd-tag web">Website</span>' : ''; }
	function isStudent(p) { return p.status === 'active' || p.status === 'graduated'; }
	function qBtn(done, label, attrs, doneAttrs) {
		return done ? '<button class="mjd-btn sm mjd-paid"' + (doneAttrs || '') + '>✓ ' + label + '</button>' : '<button class="mjd-btn sm mjd-unpaid" ' + attrs + '>' + label + '?</button>';
	}
	function introBtn(p) { return qBtn(+p.paid_intro || p.status === 'intro' || +p.paid_training, 'Intro Paid', 'data-pay="' + p.id + '" data-cat="intro"', ' disabled'); }
	function courseBtn(p) { return qBtn(+p.paid_training, 'Full Course Paid', 'data-pay="' + p.id + '" data-cat="training"', ' disabled'); }
	function stuBtn(p) { return (isStudent(p) || !(+p.paid_intro || p.status === 'intro')) ? '' : '<button class="mjd-btn sm pri" data-mkstu="' + p.id + '">+ Student</button>'; }
	function gearBtn(p) { return qBtn(+p.paid_gear, 'Gear Purchased', 'data-pay="' + p.id + '" data-cat="gear"', ' data-pay="' + p.id + '" data-cat="gear" title="Add another purchase"'); }
	function ffBtn(p) { return qBtn(+p.flown, 'First Flight', 'data-ff="' + p.id + '"', ' data-open="' + p.id + '" title="Open profile"'); }
	function gsN(p) { return p.ground_school_date ? 2 : p.gs1_date ? 1 : 0; }
	function gsDots(n) { return '<span class="mjd-gsd s' + n + '"><b></b><b></b></span>'; }
	function gsBtn(p) { var n = gsN(p); return n === 2 ? qBtn(true, 'Ground School Finished', '', ' data-gsundo="' + p.id + '" title="Click to undo"') : '<button class="mjd-btn sm mjd-unpaid mjd-gsb" data-gsdone="' + p.id + '" title="' + (n ? 'Mark 2nd session attended' : 'Mark 1st session attended') + '">Ground School ' + gsDots(n) + n + '/2?</button>'; }
	function gsMark(p) { var n = gsN(p); return n === 1 ? '<span class="mjd-gs1" title="1 of 2 ground school sessions">' + gsDots(1) + '1/2</span>' : n === 2 ? '<span class="ck on" title="Ground school">✓</span>' : '<span class="ck" title="Ground school — not yet">—</span>'; }
	function introList() { return S.people.filter(function (p) { return p.status === 'intro' || S.flash[p.id]; }); }
	function backBtn(p) { return '<button class="mjd-back" data-back="' + p.id + '" title="Move back to the previous list" aria-label="Move ' + esc(name(p)) + ' back">×</button>'; }
	function inLeadArchive(p) { return p.status === 'archived' || (p.status === 'lead' && age(p.created_at) >= 183); }
	function stageOpts(cur) { var o = ''; for (var k in MJD.stages) o += '<option value="' + k + '"' + (k === cur ? ' selected' : '') + '>' + esc(MJD.stages[k][0]) + '</option>'; return o; }
	function opts(list, cur) { return list.map(function (v) { var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v; return '<option value="' + esc(val) + '"' + (val === cur ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join(''); }
	function catOpts(cur) { return opts(Object.keys(MJD.categories).map(function (k) { return [k, MJD.categories[k]]; }), cur); }
	function byStatus(s) { return S.people.filter(function (p) { return p.status === s; }); }

	/* ── HQ shell: icons, sidebar, page header, mobile tab bar, global search ── */
	var IC = {
		logo: '<path d="M3 8c5-4.5 13-4.5 18 0"/><path d="M3 8l9 10l9-10"/><path d="M12 4.6V18"/><circle cx="12" cy="20" r="1.6"/>',
		home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
		sched: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
		gs: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
		att: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
		active: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
		leads: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
		intro: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-5.2A8.4 8.4 0 1 1 21 11.5z"/>',
		graduated: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
		waivers: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 15c1.5-2 2.5-2 3 0s1.5 2 3 0"/>',
		archived: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
		gear: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
		quotes: '<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2z"/><path d="M8 9h8M8 13h6"/>',
		settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		chev: '<path d="m9 18 6-6-6-6"/>',
		down: '<path d="m6 9 6 6 6-6"/>',
		phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
		text: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
		mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
		dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
		grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
		list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
		user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
		key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
		file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
		star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
		ext: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
		refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
		wp: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
		dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
		cap: '<path d="M22 10 12 5 2 10l10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
		orders: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
		inventory: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
		wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
		todo: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
		pricing: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
		weather: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
		cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
		alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
	};
	function ic(k, sz) { return '<svg class="mj-ic" width="' + (sz || 18) + '" height="' + (sz || 18) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[k] || '') + '</svg>'; }
	var PAGE = {
		home: ['', 'Today at Mojo’s', ''],
		sched: ['Training', 'Training Schedule', ''], weather: ['Training', 'Weather', ''], gs: ['Training', 'Ground School', ''], att: ['Training', 'Instructor Attendance', ''],
		active: ['Students', 'Active Students', ''], leads: ['Students', 'Leads', ''], intro: ['Students', 'Intros Done', ''], graduated: ['Students', 'Graduates', ''], archived: ['Students', 'Lead Archive', ''], waivers: ['Students', 'Waiver Archive', ''],
		gear: ['Sales', 'Student Orders', ''], orders: ['Sales', 'School Orders', ''], quotes: ['Sales', 'Quotes', ''], pricing: ['Sales', 'Gear Pricing', ''], inventory: ['Sales', 'Inventory', ''], todo: ['', 'To-Do List', '']
	};
	var SUF = { inventory: 'open', sched: 'upcoming', gs: 'need it', att: 'this qtr', gear: 'this yr', orders: 'open', quotes: 'open', todo: 'open' };
	function cntSuf(k) { return SUF[k] ? ' ' + SUF[k] : ''; }
	function secOf(tab) { return SECTIONS.find(function (x) { return x.tabs.indexOf(tab) > -1; }); }
	function shellNav(T) {
		var item = function (k, c) { var n = T[k][2](); return '<button class="mj-ni' + (S.tab === k ? ' on' : '') + '" data-tab="' + k + '"' + (S.tab === k ? ' aria-current="page"' : '') + '>' + ic(k) + '<span>' + esc(T[k][1]) + '</span><i>' + n + (n !== '' ? cntSuf(k) : '') + '</i></button>'; };
		$('#mj-nav').innerHTML = '<button class="mj-ni mj-home' + (S.tab === 'home' ? ' on' : '') + '" data-tab="home"' + (S.tab === 'home' ? ' aria-current="page"' : '') + '>' + ic('home') + '<span>Home</span></button>' + item('todo') +
			SECTIONS.map(function (x) { return '<div class="mj-ng mjd-c-' + x.c + '"><div class="mj-ngl"><b></b>' + esc(x.name) + '</div>' + x.tabs.map(function (k) { return item(k, x.c); }).join('') + '</div>'; }).join('');
		var sec = secOf(S.tab);
		$('#mj-tabbar').innerHTML = [['home', 'Today', 'home', ''], ['active', 'Students', 'cap', 'orange'], ['sched', 'Training', 'sched', 'sky'], ['gear', 'Sales', 'dollar', 'gold']].map(function (b) {
			var on = b[0] === 'home' ? S.tab === 'home' : sec && sec.c === b[3];
			return '<button class="mj-tb' + (on ? ' on' : '') + ' mjd-c-' + (b[3] || 'ink') + '" data-tab="' + (on && sec && b[0] !== 'home' ? S.tab : b[0]) + '"' + (on ? ' aria-current="page"' : '') + '><span>' + ic(b[2], 20) + '</span>' + b[1] + '</button>';
		}).join('') + '<button class="mj-tb mj-tbmore" data-act="msheet"><span>' + ic('dots', 20) + '</span>More</button>';
		var pg = PAGE[S.tab] || ['', '', ''];
		$('#mj-phead').innerHTML = (pg[0] ? '<nav class="mj-crumb" aria-label="Breadcrumb"><button data-tab="' + secOf(S.tab).tabs[0] + '">' + esc(pg[0]) + '</button>' + ic('chev', 14) + '<span>' + esc(pg[1]) + '</span></nav>' : '<div class="mj-crumb"><span>' + esc(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })) + '</span></div>') +
			'<div class="mj-ph"><div class="mj-tt"><h1>' + (S.tab === 'home' ? '<span class="mj-h1d">' + esc(pg[1]) + '</span><span class="mj-h1m">Today<small class="mj-h1date">' + (function () { var d = new Date(); return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0'); })() + '</small></span>' : esc(pg[1])) + '</h1></div><div class="mj-appbar__actions"><button class="mj-iconbtn mj-iconbtn--outline mj-iconbtn--36" data-act="msearch" aria-label="Search">' + ic('search', 16) + '</button>' + ({ home: '<button class="mj-btn mj-btn--orange mj-btn--sm" data-act="logatt">Log Attendance</button>', active: '<button class="mj-btn mj-btn--dark mj-btn--sm" data-act="add">+ Add</button>', leads: '<button class="mj-btn mj-btn--dark mj-btn--sm" data-act="add">+ Add</button>', sched: '<button class="mj-btn mj-btn--dark mj-btn--sm" data-act="newsess">' + ic('plus', 14) + 'Schedule</button>', gs: '<button class="mj-btn mj-btn--dark mj-btn--sm" data-act="newgs">' + ic('plus', 14) + 'Schedule</button>', quotes: '<button class="mj-btn mj-btn--dark mj-btn--sm" data-act="newquote">+ Quote</button>', gear: '<button class="mj-btn mj-btn--dark mj-btn--sm" data-act="newsorder">+ Order</button>', orders: '<button class="mj-btn mj-btn--dark mj-btn--sm" data-act="neworder">+ Order</button>', todo: '<button class="mj-btn mj-btn--dark mj-btn--sm" data-act="tdfocus">+ To-do</button>' }[S.tab] || '') + '</div>' + (S.tab === 'home' ? '<div class="mj-dash__actions"><div class="mj-dash__btns"><button class="mj-btn mj-btn--dark" data-act="newsess">' + ic('plus', 16) + 'Training Day</button><button class="mj-btn" data-act="add">' + ic('plus', 16) + 'Student</button><button class="mj-btn" data-act="newquote">' + ic('plus', 16) + 'Quote</button><button class="mj-btn mj-btn--orange" data-act="logatt">' + ic('att', 16) + 'Log Attendance</button></div>' +
				'<nav class="mj-dash__links"><button data-act="wxpop">' + ic('cloud', 16) + 'Weather</button><button data-act="attpop">' + ic('list', 16) + 'View Attendance</button><button data-tab="pricing">' + ic('file', 16) + 'Gear Pricing</button><button data-tab="inventory">' + ic('inventory', 16) + 'Inventory</button></nav></div>' : '') + '</div>' +
			(sec && sec.tabs.length > 1 ? '<div class="mj-subnav mjd-c-' + sec.c + '" role="tablist">' + sec.tabs.map(function (k) { return '<button data-tab="' + k + '"' + (S.tab === k ? ' class="on" aria-current="page"' : '') + '>' + esc(T[k][1]) + (String(T[k][2]()) !== '' ? '<i' + (k === 'gs' && parseInt(T[k][2](), 10) > 0 ? ' class="warn"' : '') + '>' + T[k][2]() + cntSuf(k) + '</i>' : '') + '</button>'; }).join('') + '</div>' : '');
	}
	function gSearch(q) {
		var box = $('#mj-gres'); if (!box) return;
		q = (q || '').trim().toLowerCase();
		if (q.length < 2) { box.innerHTML = ''; box.hidden = true; return; }
		var ppl = S.people.filter(function (p) { return (name(p) + ' ' + (p.email || '') + ' ' + (p.phone || '')).toLowerCase().indexOf(q) > -1; }).slice(0, 8);
		var gear = S.gear.filter(function (g) { return (((g.first || '') + ' ' + (g.last || '')) + ' ' + g.description).toLowerCase().indexOf(q) > -1; }).slice(0, 5);
		var lab = { lead: 'Lead', intro: 'Intro done', active: 'Active student', graduated: 'Graduate', archived: 'Archived', customer: 'Customer' };
		box.innerHTML = (ppl.length ? '<div class="h">People</div>' + ppl.map(function (p) { return '<button data-open="' + p.id + '"><b>' + esc(name(p)) + '</b><span>' + esc(lab[p.status] || '') + '</span></button>'; }).join('') : '') +
			(gear.length ? '<div class="h">Gear sales</div>' + gear.map(function (g) { return '<button data-open="' + g.person_id + '"><b>' + esc(g.description) + '</b><span>' + esc(((g.first || '') + ' ' + (g.last || '')).trim()) + ' · ' + money(g.amount) + '</span></button>'; }).join('') : '') +
			(ppl.length || gear.length ? '' : '<div class="none">No matches for “' + esc(q) + '”</div>');
		box.hidden = false;
	}


	/* automatic reminders computed from the data */
	function autoAttn() {
		var act = byStatus('active'), leads = byStatus('lead').filter(function (p) { return age(p.created_at) < 183; });
		var up = (S.sess || []).filter(function (x) { return x.kind !== 'gs' && x.sess_date >= today(); });
		var noContact = act.filter(function (p) { return !p.phone || !p.email; }), notFlown = act.filter(function (p) { return !hasFlown(p); }), notInv = leads.filter(function (p) { return !p.invited_at; });
		var att = [];
		var dow = new Date().getDay(), soon = new Date(); soon.setDate(soon.getDate() + 6); soon = soon.toISOString().slice(0, 10);
		if (dow >= 1 && dow <= 5) up.filter(function (x) { return x.sess_date <= soon && !(S.invited || {})[x.id]; }).slice(0, 2).forEach(function (x) {
			att.push(['mail', 'Send intro invites for ' + new Date(x.sess_date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' training', (x.field || 'Training day') + ' · tap Intro invite next to each lead', 'See leads', 'data-invsess="' + x.id + '"', 'inv-' + x.id, 1]);
		});
		if (notInv.length) att.push(['leads', notInv.length + ' lead' + (notInv.length === 1 ? '' : 's') + ' waiting on an intro invite', 'Students › Leads', 'Review', 'data-tab="leads"', 'leads', notInv.length]);
		noContact.slice(0, 3).forEach(function (p) { att.push(['phone', name(p) + ' has no ' + (!p.phone && !p.email ? 'phone or email' : !p.phone ? 'phone number' : 'email'), 'Active student' + (p.enrolled_date ? ' · enrolled ' + dt(p.enrolled_date) : ''), 'Add contact', 'data-open="' + p.id + '"', 'contact-' + p.id, (p.phone ? 1 : 0) + (p.email ? 2 : 0)]); });
		var noWv = act.filter(function (p) { var w = wvOf(p); return !(w && (w.status === 'signed' || w.status === 'paper')); });
		if (noWv.length) att.push(['file', noWv.length + ' active student' + (noWv.length === 1 ? ' hasn’t' : 's haven’t') + ' signed a waiver', noWv.slice(0, 3).map(function (p) { return p.first || name(p); }).join(', ') + (noWv.length > 3 ? '…' : ''), 'Send', 'data-wvsend="' + noWv[0].id + '"', 'waiver', noWv.length]);
		var nGS = act.filter(function (p) { return !p.ground_school_date; }).length;
		if (nGS) att.push(['gs', nGS + ' active student' + (nGS === 1 ? '' : 's') + ' still need ground school', 'Training › Ground School', 'See who', 'data-tab="gs"', 'gs', nGS]);
		if (notFlown.length) att.push(['logo', notFlown.length + ' active student' + (notFlown.length === 1 ? ' hasn’t' : 's haven’t') + ' flown yet', 'Students › Not flown yet', 'See who', 'data-nflown="1"', 'flown', notFlown.length]);
		S.hiddenAtt = att.filter(function (r) { return attHidden(r); });
		return att.filter(function (r) { return !attHidden(r); });
	}
	/* a hidden reminder stays hidden until its number goes up (or, for a person, until what's missing changes) */
	function attHidden(r) { var h = (S.attHide || {})[r[5]]; if (h == null) return false; return r[5].indexOf('contact-') === 0 ? +h === +r[6] : +r[6] <= +h; }
	function attRow(r, hidden) { return '<div class="mj-reminder' + (hidden ? ' hid' : '') + '"><span class="mj-reminder__icon">' + ic(r[0], 16) + '</span><div class="mj-reminder__text"><div class="mj-item__title">' + esc(r[1]) + '</div><div class="mj-item__sub">' + esc(r[2]) + '</div></div><div class="mj-reminder__actions"><button class="mj-btn mj-btn--xs mj-btn--outline" ' + r[4] + '>' + esc(r[3]) + '</button>' +
		(hidden ? '<button class="mj-btn mj-btn--xs mj-btn--ghost" data-atshow="' + esc(r[5]) + '" title="Show this reminder again">Show</button>' : '<button class="mj-btn mj-btn--xs mj-btn--ghost" data-athide="' + esc(r[5]) + '" data-sig="' + esc(r[6]) + '" title="Mark done — hides it until the number goes up" aria-label="Mark done">Done</button>') + '</div></div>'; }
	function tdMeta(t) {
		var late = !+t.done && t.due && t.due < today();
		return [t.who ? '👤 ' + esc(t.who) : '', t.due ? (late ? '<b class="late">Overdue · ' + esc(dt(t.due)) + '</b>' : 'Due ' + esc(dt(t.due))) : '', +t.done ? 'Done' + (t.done_by ? ' by ' + esc(t.done_by) : '') + (t.done_at ? ' · ' + esc(dt(t.done_at)) : '') : (t.created_by ? 'Added by ' + esc(t.created_by) : '')].filter(Boolean).join(' · ');
	}
	/* Home: To-Do quick view (manual items first, then automatic reminders) */
	function homeTodo(att) {
		var open = (S.todos || []).filter(function (t) { return !+t.done; }), top = open.slice(0, 5);
		return '<section class="mj-card"><div class="mj-card__head mj-card__head--bordered"><div class="mj-card__name">To-do list <em class="mj-pill">' + open.length + '</em></div><a href="#todo" data-tab="todo">View all</a></div>' +
			'<div class="mj-todo__add"><input type="text" id="tdh-title" placeholder="Add something we need to do…" aria-label="New to-do"><button class="mj-btn mj-btn--dark mj-btn--md" id="tdh-add">Add</button></div>' +
			top.map(function (t) { var m = tdMeta(t); return '<div class="mj-todo__item"><input type="checkbox" class="mj-check" data-tdtog="' + t.id + '" aria-label="Mark done"><div class="mj-todo__text"><div class="mj-item__title">' + esc(t.title) + '</div>' + (m ? '<div class="mj-item__sub">' + m + '</div>' : '') + '</div><button class="mj-iconbtn mj-iconbtn--xs" data-tddel="' + t.id + '" aria-label="Remove">✕</button></div>'; }).join('') +
			(open.length > top.length ? '<a class="mj-card__more" href="#todo" data-tab="todo">+ ' + (open.length - top.length) + ' more on the To-Do List</a>' : '') +
			(!open.length ? '<div class="mj-card__empty">Nothing on the list. 🎉</div>' : '') + '</section>' +
			'<section class="mj-card"><div class="mj-card__head mj-card__head--bordered"><div class="mj-card__name">Automatic reminders <em class="mj-pill">' + att.length + '</em></div></div>' +
			(att.length ? att.map(function (r) { return attRow(r); }).join('') : '<div class="mj-card__empty">All caught up. 🎉</div>') + '</section>';
	}

	/* ── HOME ── */
	function vHome() {
		var act = byStatus('active'), leads = byStatus('lead').filter(function (p) { return age(p.created_at) < 183; });
		var order = Object.keys(MJD.stages), cnt = {}; act.forEach(function (p) { cnt[p.stage] = (cnt[p.stage] || 0) + 1; });
		var up = (S.sess || []).filter(function (x) { return x.kind !== 'gs' && x.sess_date >= today(); }).sort(function (a, b) { return a.sess_date < b.sess_date ? -1 : 1; });
		var past = (S.sess || []).filter(function (x) { return x.kind !== 'gs' && x.sess_date < today(); }).length;
		var nxt = up[0], yr = String(new Date().getFullYear());
		var gY = S.gear.filter(function (g) { return String(g.pay_date || '').slice(0, 4) === yr; }), tY = 0, tAll = 0, buyers = {};
		gY.forEach(function (g) { tY += +g.amount; buyers[g.person_id] = 1; }); S.gear.forEach(function (g) { tAll += +g.amount; });
		var recent = S.gear.filter(function (g) { return g.pay_date; }).sort(function (a, b) { return a.pay_date < b.pay_date ? 1 : -1; }).slice(0, 3);
		var T = {}; TABS.forEach(function (t) { T[t[0]] = t; });
		var lnk = function (k, lab) { return '<button class="mj-hl" data-tab="' + k + '"><span>' + esc(lab || T[k][1]) + '</span><i>' + T[k][2]() + cntSuf(k) + '</i>' + ic('chev', 16) + '</button>'; };
		var tm = function (t) { return t ? new Date('2000-01-01T' + t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''; };
		var going = function (x) { return (x.rsvps || []).filter(function (r) { return r.status === 'yes' || r.status === 'maybe'; }).length; };
		var bar = act.length ? '<div class="mj-dist" aria-hidden="true">' + order.map(function (k) { return cnt[k] ? '<span style="flex:' + cnt[k] + ';background:' + MJD.stages[k][1] + '"></span>' : ''; }).join('') + '</div>' : '';
		var noContact = act.filter(function (p) { return !p.phone || !p.email; }), notFlown = act.filter(function (p) { return !hasFlown(p); }), notInv = leads.filter(function (p) { return !p.invited_at; });
		var att = autoAttn();
		var oq = S.quotes.filter(function (q) { return !+q.archived && (q.status === 'sent' || q.status === 'draft'); }).length;
		var foot = function (k, lab, warn) { var v = T[k][2]() + cntSuf(k); return '<a href="#' + k + '" data-tab="' + k + '"><span>' + esc(lab || T[k][1]) + '</span><span class="mj-card__meta">' + (warn && parseInt(v, 10) > 0 ? '<em class="mj-pill mj-pill--warn">' + esc(v) + '</em>' : esc(v)) + ' ›</span></a>'; };
		var gridA = function (k) { return '<a href="#' + k + '" data-tab="' + k + '"><span>' + esc(T[k][1]) + '</span><b>' + T[k][2]() + '</b></a>'; };
		var stCol = function (k) { return MJD.stages[k][1]; };
		return '<div class="mj-quick"><button class="mj-btn mj-btn--dark" data-act="newsess">+ Training Day</button><button class="mj-btn" data-act="add">+ Student</button><button class="mj-btn" data-act="newquote">+ Quote</button></div>' + appBanner() + '<div class="mj-cards">' +
			'<section class="mj-card mj-card--students"><div class="mj-card__head"><div class="mj-card__name"><span class="mj-card__icon">' + ic('cap', 16) + '</span>Students</div><a href="#active" data-tab="active">Open →</a></div><div class="mj-card__body">' +
			'<div class="mj-kpi"><span class="mj-kpi__num">' + act.length + '</span><span class="mj-kpi__unit">active student' + (act.length === 1 ? '' : 's') + '</span></div>' +
			(act.length ? '<div class="mj-bar" aria-hidden="true">' + order.map(function (k) { return cnt[k] ? '<span style="flex:' + cnt[k] + ';background:' + stCol(k) + '"></span>' : ''; }).join('') + '</div>' : '') +
			'<ul class="mj-legend">' + order.filter(function (k) { return k !== 'paused' || cnt[k]; }).map(function (k) { return '<li data-stagego="' + k + '"><i style="background:' + stCol(k) + '"></i><span>' + esc(MJD.stages[k][0]) + '</span><b>' + (cnt[k] || 0) + '</b></li>'; }).join('') + '</ul></div>' +
			'<div class="mj-card__foot mj-card__foot--grid">' + gridA('active') + gridA('leads') + gridA('intro') + gridA('graduated') + '</div></section>' +
			'<section class="mj-card mj-card--training"><div class="mj-card__head"><div class="mj-card__name"><span class="mj-card__icon">' + ic('logo', 16) + '</span>Training</div><a href="#sched" data-tab="sched">Open →</a></div><div class="mj-card__body">' +
			'<div class="mj-callout mj-callout--static"><div class="mj-label">Next training day</div>' + (nxt ? '<div class="mj-card__h">' + esc(new Date(nxt.sess_date + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })) + '</div><p class="mj-card__p">' + esc([tm(nxt.start_time), nxt.field].filter(Boolean).join(' · ')) + (going(nxt) ? ' · <b>' + going(nxt) + ' going</b>' : '') + '</p>' : '<div class="mj-card__h">Nothing on the calendar yet</div><p class="mj-card__p">Days announced in GroupMe show up here on their own.</p>') + '</div>' +
			'<div class="mj-row-actions"><button class="mj-btn mj-btn--dark mj-btn--md" data-act="newsess">Schedule Training Day</button>' + (S.gmOn ? '<button class="mj-iconbtn mj-iconbtn--outline" data-act="gmsync" title="Check GroupMe" aria-label="Check GroupMe">' + ic('refresh', 16) + '</button>' : '') + '</div></div>' +
			'<div class="mj-card__foot"><a href="#sched" data-tab="sched" data-past="1"><span>Past Training Days</span><span class="mj-card__meta"><b>' + past + '</b> ›</span></a>' + foot('gs', '', true) + foot('att') + '</div></section>' +
			'<section class="mj-card mj-card--sales"><div class="mj-card__head"><div class="mj-card__name"><span class="mj-card__icon">' + ic('dollar', 16) + '</span>Sales</div><a href="#gear" data-tab="gear">Open →</a></div><div class="mj-card__body">' +
			'<div class="mj-label">Gear sales · ' + yr + '</div><div class="mj-kpi"><span class="mj-kpi__num">' + money(tY) + '</span></div><div class="mj-card__sub">' + gY.length + ' item' + (gY.length === 1 ? '' : 's') + ' sold · ' + Object.keys(buyers).length + ' buyer' + (Object.keys(buyers).length === 1 ? '' : 's') + '</div>' +
			(recent[0] ? '<div class="mj-callout" data-open="' + recent[0].person_id + '"><div class="mj-label mj-label--xs">Latest sale · ' + esc(dt(recent[0].pay_date).replace(/, \d{4}$/, '')) + '</div><div class="mj-callout__row"><span><b>' + esc(((recent[0].first || '') + ' ' + (recent[0].last || '')).trim()) + '</b> <span class="mj-muted">· ' + esc(recent[0].description) + '</span></span><b>' + money(recent[0].amount) + '</b></div></div>' : '') + '</div>' +
			'<div class="mj-card__foot">' + foot('gear') + foot('quotes') + '<div class="mj-card__foot-static"><span>All-time gear sales</span><b>' + money(tAll) + '</b></div></div></section></div>' +
			'<div class="mj-cards mj-cards--two">' + homeTodo(att) + '</div>';
	}

	/* ── compact student card (HQ) ── */
	function hqCard(p) {
		var st = MJD.stages[p.stage] || ['—', '#8A979C'];
		var ini = (String(p.first || '?').charAt(0) + String(p.last || '').charAt(0)).toUpperCase();
		var tel = String(p.phone || '').replace(/[^0-9+]/g, '');
		var a = ppgCount(p, 0), b = ppgCount(p, 1), w = wvOf(p);
		var chips = '<button type="button" class="mj-chip" data-ppgopen="' + p.id + '">PPG1 ' + a[0] + '/' + a[1] + '</button><button type="button" class="mj-chip" data-ppgopen="' + p.id + '">PPG2 ' + b[0] + '/' + b[1] + '</button>' +
			(gsN(p) < 2 ? '<span class="mj-chip">Ground school ' + gsN(p) + '/2</span>' : '') + (isWheel(p) ? '<span class="mj-chip mj-chip--wheel">Wheel launch</span>' : '') + (hasFlown(p) ? '<span class="mj-chip mj-chip--flown">🪂 Has flown</span>' : '');
		var wv = w && w.status === 'paper' ? '<span class="mj-ok">✓ Waiver on file</span>' : w && w.status === 'signed' ? '<a class="mj-ok" href="' + esc(MJD.siteUrl + 'waiver/' + w.token) + '" target="_blank" rel="noopener">✓ Waiver signed</a>' : '<button type="button" class="mj-btn mj-btn--xs mj-btn--warn" data-wvsend="' + p.id + '">' + (w ? 'Resend waiver' : 'Send waiver') + '</button>';
		var stage = S.stOpen[p.id] ? stagePick(p) : '<div class="mj-student__stage"><span class="mj-stagepill" style="--dot:' + st[1] + ';--bg:#fff"><i></i>' + esc(st[0]) + '</span><button type="button" class="mj-change" data-stopen="' + p.id + '" aria-expanded="false">Change ▾</button></div>';
		var foot = '<footer class="mj-student__foot">' + (p.phone ? '<a href="tel:' + esc(tel) + '">' + ic('phone', 15) + 'Call</a><a href="sms:' + esc(tel) + '">' + ic('text', 15) + 'Text</a>' : '<a href="#" class="is-missing" data-open="' + p.id + '">+ Phone</a>') +
			(p.email ? '<a href="mailto:' + esc(p.email) + '">' + ic('mail', 15) + 'Email</a>' : '<a href="#" class="is-missing" data-open="' + p.id + '">+ Email</a>') + '</footer>';
		return '<article class="mj-student" style="--sc:' + st[1] + '" data-stage="' + esc(p.stage || '') + '"><header class="mj-student__head"><span class="mj-avatar">' + (p.ff_img ? '<img src="' + esc(p.ff_img) + '" alt="">' : esc(ini)) + '</span><div class="mj-student__who" data-open="' + p.id + '"><div class="mj-item__title">' + esc(name(p)) + '</div><div class="mj-item__sub">' + esc([p.enrolled_date ? 'Enrolled ' + dt(p.enrolled_date) : 'Enrolled —', p.launch].filter(Boolean).join(' · ')) + '</div></div>' +
			'<button class="mj-iconbtn mj-iconbtn--xs" data-back="' + p.id + '" title="Move back to the previous list" aria-label="Move ' + esc(name(p)) + ' back">✕</button></header>' +
			'<div class="mj-student__body">' + stage + '<div class="mj-student__chips">' + chips + '</div><div class="mj-student__waiver">' + wv + '</div></div>' + foot + '</article>';
	}

	/* ── shell ── */
	root.innerHTML =
		'<div class="mj-app"><aside class="mj-side"><button class="mj-sheetx" data-act="msheet" aria-label="Close menu">✕</button><div class="mj-acct"><button class="mj-logo mj-logo2" data-act="acct" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu"><span class="sq"><img src="' + esc(MJD.logo) + '" alt="" width="60" height="32"></span><span class="nm"><b>Flight Desk</b><small>Mojo’s Flight School</small></span></button><div class="mj-acm" id="mj-acm" role="menu" hidden><div class="mj-acmh">Signed in as<b>' + esc(MJD.me || '') + '</b></div><a role="menuitem" href="' + esc(MJD.profileUrl) + '">' + ic('user', 16) + 'Edit my account</a><a role="menuitem" href="' + esc(MJD.profileUrl) + '#password">' + ic('key', 16) + 'Change password</a><button role="menuitem" data-tab="home">' + ic('home', 16) + 'Flight Desk home</button><a role="menuitem" href="' + esc(MJD.ajax.replace('admin-ajax.php', 'edit.php?post_type=page')) + '">' + ic('wp', 16) + 'Website admin</a><a role="menuitem" class="out" href="' + esc(MJD.logout) + '">' + ic('ext', 16) + 'Log out</a></div></div>' +
		'<div class="mj-gs"><label>' + ic('search') + '<input type="search" id="mj-gq" placeholder="Search…" aria-label="Search people and gear sales" autocomplete="off"><kbd>Ctrl K</kbd></label><div id="mj-gres" class="mj-gres" hidden></div></div>' +
		'<nav id="mj-nav" class="mj-nav" aria-label="Main navigation"></nav>' +
		'<div class="mj-sfoot"><a class="mj-ni" href="' + esc(MJD.settingsUrl.split('#')[0]) + '">' + ic('settings') + '<span>Settings</span></a><button class="mj-ni" data-act="creds">' + ic('key') + '<span>Login Credentials</span></button><a class="mj-ni" href="' + esc(MJD.ajax.replace('admin-ajax.php', 'edit.php?post_type=page')) + '">' + ic('wp') + '<span>Website admin</span></a><a class="mj-ni" href="' + esc(MJD.logout) + '">' + ic('ext') + '<span>Log out</span></a></div></aside>' +
		'<main class="mj-main"><div id="mj-phead" class="mj-phead"></div><div id="mjd-view"></div></main><nav class="mj-tabbar" id="mj-tabbar" aria-label="Sections"></nav></div>' +
		'<div class="mjd-modal wide" id="mjd-pm"><div class="mjd-card" id="mjd-pm-body"></div></div>' +
		'<div class="mjd-modal" id="mjd-sm"><div class="mjd-card" id="mjd-sm-body"></div></div>';

	var SECTIONS = [
		{ name: 'Training', icon: '🪂', tabs: ['sched', 'weather', 'gs', 'att'], badge: 'sched', c: 'sky' },
		{ name: 'Students', icon: '🎓', tabs: ['active', 'leads', 'intro', 'graduated', 'archived', 'waivers'], badge: 'active', c: 'orange' },
		{ name: 'Sales', icon: '💰', tabs: ['gear', 'orders', 'quotes', 'pricing', 'inventory'], badge: 'quotes', c: 'gold' }
	];
	var TABS = [
		['sched', 'Training Schedule', function () { var u = (S.sess || []).filter(function (x) { return x.kind !== 'gs' && x.sess_date >= today(); }); return u.length; }],
		['leads', 'Leads', function () { return byStatus('lead').filter(function (p) { return age(p.created_at) < 183; }).length; }],
		['intro', 'Intros Done', function () { return introList().length; }],
		['active', 'Active Students', function () { return byStatus('active').length; }],
		['gs', 'Ground School', function () { return S.people.filter(needsGS).length; }],
		['quotes', 'Quotes', function () { return S.quotes.filter(function (q) { return !+q.archived && (q.status === 'sent' || q.status === 'draft'); }).length; }],
		['weather', 'Weather', function () { return ''; }],
		['waivers', 'Waiver Archive', function () { var n = 0, w = S.waivers || {}; for (var k in w) if (w[k].status === 'signed') n++; return n; }],
		['pricing', 'Gear Pricing', function () { return ''; }],
		['inventory', 'Inventory', function () { var r = S.inv ? S.inv.repairs.filter(function (x) { return !+x.done; }).length : 0; return r ? r : ''; }],
		['orders', 'School Orders', function () { return (S.orders || []).filter(function (o) { return o.status !== 'received'; }).length; }],
		['todo', 'To-Do List', function () { return (S.todos || []).filter(function (t) { return !+t.done; }).length; }],
		['gear', 'Student Orders', function () { var y = String(new Date().getFullYear()); return S.gear.filter(function (g) { return String(g.pay_date || '').slice(0, 4) === y; }).length; }],
		['graduated', 'Graduates', function () { return byStatus('graduated').length; }],
		['archived', 'Lead Archive', function () { return S.people.filter(inLeadArchive).length; }],
		['att', 'Instructor Attendance', function () { var c = today(), y = c.slice(0, 4), q = Math.floor((+c.slice(5, 7) - 1) / 3), a0 = y + '-' + String(q * 3 + 1).padStart(2, '0'), a1 = y + '-' + String(q * 3 + 3).padStart(2, '0'); return S.att.filter(function (a) { var mm = a.att_date.slice(0, 7); return mm >= a0 && mm <= a1; }).length; }]
	];
	function needsGS(p) { return (p.status === 'active' || p.status === 'intro') && !p.ground_school_date; }

	function load() {
		return Promise.all([api('list'), api('quotes'), api('att_list'), api('gear_sales'), api('att_summaries'), loadSess().catch(function () {}), api('order_list').catch(function () { return []; }), api('todo_list').catch(function () { return []; }), api('att_hidden').catch(function () { return {}; }), api('waivers').catch(function () { return {}; })]).then(function (r) {
			S.waivers = r[9] || {}; S.wvArch = null;
			S.attHide = r[8] || {};
			S.orders = r[6] || []; S.todos = r[7] || [];
			S.people = r[0].people; S.stats = r[0].stats; S.quotes = r[1]; S.att = r[2] || []; S.gear = r[3] || []; S.attSum = r[4] || {};
			if (!S.selInit) { S.selInit = true; S.people.forEach(function (p) { if (p.status === 'lead' && !p.invited_at && p.email && age(p.created_at) < 183) S.sel[p.id] = true; }); }
			if (!S.gsInit) { S.gsInit = true; S.people.forEach(function (p) { if (needsGS(p) && p.email) S.gsSel[p.id] = true; }); }
			render();
		}).catch(function (e) { $('#mjd-view').innerHTML = '<div class="mjd-card mjd-empty">Could not load: ' + esc(e.message) + '</div>'; });
	}

	function render() {
		var T = {}; TABS.forEach(function (t) { T[t[0]] = t; });
		if (!PAGE[S.tab]) S.tab = 'home';
		try { if (location.hash.slice(1) !== S.tab) history.replaceState(null, '', '#' + S.tab); } catch (x) {}
		shellNav(T);
		var son = $('.mj-subnav button.on'); if (son) { var sn = son.parentNode; sn.scrollLeft = son.offsetLeft - sn.offsetLeft - 14; }
		var v = { inventory: vInventory, home: vHome, waivers: vWaivers, weather: vWeather, pricing: vPricing, orders: vOrders, todo: vTodo, leads: vLeads, intro: vIntro, active: vActive, gs: vGS, quotes: vQuotes, graduated: vGrads, archived: vArch, att: vAtt, gear: vGear, sched: vSched }[S.tab];
		var keep = captureForm(), html;
		try { html = v(); } catch (err) { html = '<div class="mjd-card mjd-empty">Something went wrong showing this page (' + esc(err.message) + '). Try refreshing.</div>'; if (window.console) console.error(err); }
		$('#mjd-view').innerHTML = html; $('#mjd-view').setAttribute('data-view', S.tab);
		restoreForm(keep);
		decorate($('#mjd-view'));
		if ($('#mj-attbox') && $('#mjd-sm').classList.contains('open')) attBox(true);
		var dh = $('#mjd-view .mjd-card .mjd-ch h3'); if (dh && PAGE[S.tab] && dh.textContent.trim().toLowerCase() === PAGE[S.tab][1].toLowerCase()) dh.classList.add('mj-dup');
		afterRender();
	}
	/* Give every list/form box a clear header band. */
	function decorate(scope) {
		$$('.mjd-card', scope).forEach(function (card) {
			if (card.dataset.dec) return;
			var first = card.firstElementChild;
			if (first && first.classList.contains('mjd-x')) first = first.nextElementSibling;
			if (!first) return;
			var head;
			if (first.tagName === 'H3') {
				head = document.createElement('div');
				card.insertBefore(head, first);
				head.appendChild(first);
				var nx = head.nextElementSibling;
				if (nx && nx.classList.contains('mjd-sub')) head.appendChild(nx);
			} else if (first.tagName === 'DIV' && first.querySelector(':scope > div > h3, :scope > h3')) {
				head = first;
			} else return;
			head.classList.add('mjd-ch');
			card.dataset.dec = 1;
		});
	}
	function tile(tab, cls, n, lab, sub) { return '<div class="mjd-stat ' + cls + '" data-tab="' + tab + '"><span class="l">' + esc(lab) + '</span><b>' + n + '</b><span class="s">' + esc(sub) + '</span></div>'; }

	/* keep composer inputs when re-rendering */
	function captureForm() { var o = {}; $$('#mjd-view [data-keep]').forEach(function (el) { o[el.id] = el.value; }); return o; }
	function restoreForm(o) { for (var id in o) { var el = document.getElementById(id); if (el) el.value = o[id]; } }

	/* ── LEADS ── */
	function leadRows() {
		var q = ($('#mjd-lq') ? $('#mjd-lq').value : S.lq || '').toLowerCase();
		return S.people.filter(function (p) { return p.status === 'lead' || S.flash[p.id]; }).filter(function (p) {
			if (!q && S.leadPeriod !== 'all' && age(p.created_at) >= 183) return false;
			if (S.leadLt && !(S.leadLt === 'wheel' ? /wheel|trike/i.test(p.launch || '') : /foot/i.test(p.launch || ''))) return false;
			if (S.leadF === 'notinv' && p.invited_at) return false;
			if (S.leadF === 'new' && age(p.created_at) >= 7) return false;
			if (S.leadF === 'inv' && !p.invited_at) return false;
			if (S.leadLoc && String(p.location || '').indexOf(S.leadLoc) !== 0) return false;
			return !q || (name(p) + ' ' + p.email + ' ' + p.phone + ' ' + p.location + ' ' + p.notes).toLowerCase().indexOf(q) > -1;
		});
	}
	function vLeads() {
		var list = leadRows();
		var rows = list.map(function (p) {
			var isNew = age(p.created_at) < 7, meta = [esc(dt(p.created_at)) + ' <span class="mj-ago">· ' + esc(ago(p.created_at)) + '</span>'];
			if (p.interest && p.interest !== 'Intro Day') meta.push(esc(p.interest));
			var ini = (String(p.first || '?').charAt(0) + String(p.last || '').charAt(0)).toUpperCase();
			var town = String(p.location || ''), tcls = /maiden/i.test(town) ? 'sky' : /mocks/i.test(town) ? 'orange' : 'grey';
			var lt = /wheel|trike/i.test(p.launch) ? 'Wheel' : /foot/i.test(p.launch) ? 'Foot' : p.launch ? 'Not sure' : '';
			return '<tr class="mjd-lead' + (isNew ? ' is-new' : '') + (S.flash[p.id] ? ' mjd-leaving' : '') + '" data-row="' + p.id + '">' +
				'<td class="c-name"><div class="mj-lwho"><div><div class="mj-ln"><span class="mjd-name" data-open="' + p.id + '">' + esc(name(p)) + '</span>' + (isNew ? '<span class="mj-new">NEW</span>' : '') + '</div><div class="mj-meta">' + meta.join(' · ') + '</div></div></div></td>' +
				'<td class="c-contact">' + cBtns(p) + '</td>' +
				'<td class="c-loc">' + (town ? '<span class="mj-town mj-town--' + tcls + '">' + esc(town.replace(/, ?NC$/i, '')) + '</span>' : '') + (lt ? '<span class="mj-chip">' + lt + '</span>' : '') + '</td>' +
				'<td class="c-note">' + (p.notes ? '<div class="mj-note" title="' + esc(p.notes) + '">“' + esc(p.notes.replace(/^\[[^\]]*\]\s*/, '')) + '”</div>' : '<span class="mj-nonote">No notes</span>') + '</td>' +
				'<td class="c-act"><div class="mj-st">' + (p.email ? '<button class="mjd-btn sm pri" data-inv="' + p.id + '">' + (p.invited_at ? 'Invite again' : 'Intro invite') + '</button>' : '<button class="mjd-noemail" data-open="' + p.id + '" title="No email on file — click to add one">+ Add email</button>') + introBtn(p) +
				'<button class="mj-iconbtn mj-iconbtn--xs mj-lx" data-arch="' + p.id + '" title="Not interested — move to Lead Archive" aria-label="Not interested">✕</button></div>' +
				'<div class="mj-inv">' + (p.invited_at ? '<span class="mj-invok">✓ Invited ' + esc(dt(p.invited_at)) + '</span>' : 'Not invited yet') + '</div></td></tr>';
		});
		var all = S.people.filter(function (p) { return p.status === 'lead' && (S.leadPeriod === 'all' || age(p.created_at) < 183); });
		var cNew = all.filter(function (p) { return age(p.created_at) < 7; }).length, cNot = all.filter(function (p) { return !p.invited_at; }).length, cInv = all.length - cNot;
		var cMa = all.filter(function (p) { return /^maiden/i.test(p.location || ''); }).length, cMo = all.filter(function (p) { return /^mocks/i.test(p.location || ''); }).length;
		var cFo = all.filter(function (p) { return /foot/i.test(p.launch || ''); }).length, cWh = all.filter(function (p) { return /wheel|trike/i.test(p.launch || ''); }).length;
		var F = S.leadF && S.leadF !== 'recent' && S.leadF !== 'all' ? S.leadF : '';
		var tile = function (f, n, lab, acc) { var on = F === f; return '<button class="mj-stage' + (on ? ' is-active' : '') + '" data-lfset="' + (f || 'recent') + '" style="--accent:' + acc + '" aria-pressed="' + on + '"><b>' + n + '</b><span>' + lab + '</span></button>'; };
		var tiles = '<div class="mj-stages mj-ltiles">' + tile('', all.length, 'All leads', 'var(--navy)') + tile('new', cNew, 'New this week', 'var(--orange)') + tile('notinv', cNot, 'Not invited yet', '#E3A72F') + tile('inv', cInv, 'Invited', '#1E7D4F') + '</div>';
		var fb = function (attr, val, cur, n, lab) { var on = cur === val; return '<button class="mj-filter' + (on ? ' is-active' : '') + '" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + lab + ' <span>' + n + '</span></button>'; };
		var filters = '<div class="mj-filters"><span class="mj-label">Also filter by</span>' + fb('data-lloct', 'Maiden', S.leadLoc, cMa, 'Maiden') + fb('data-lloct', 'Mocks', S.leadLoc, cMo, 'Mocksville') + fb('data-llt', 'foot', S.leadLt, cFo, 'Foot launch') + fb('data-llt', 'wheel', S.leadLt, cWh, 'Wheel launch') + '</div>';
		var head = '<thead><tr><th>Lead</th><th>Contact</th><th>Where · launch</th><th>Notes</th><th>Invite</th></tr></thead>';
		var rowOf = {}; list.forEach(function (p, k) { rowOf[p.id] = rows[k]; });
		var groups = [['New this week', 'var(--orange)', list.filter(function (p) { return age(p.created_at) < 7; })], ['Not invited yet', '#E3A72F', list.filter(function (p) { return age(p.created_at) >= 7 && !p.invited_at; })], ['Invited', '#1E7D4F', list.filter(function (p) { return age(p.created_at) >= 7 && p.invited_at; })]];
		var body = groups.map(function (g) { return g[2].length ? '<div class="mjd-sg" style="--sc:' + g[1] + '"><div class="mjd-sg-h"><i></i>' + g[0] + '<b>' + g[2].length + '</b></div><div class="mjd-tw"><table class="mjd-t mj-leadt">' + head + '<tbody>' + g[2].map(function (p) { return rowOf[p.id]; }).join('') + '</tbody></table></div></div>' : ''; }).join('');
		var per = S.leadPeriod === 'all' ? 'all' : '6mo';
		return '<section class="mj-lcard mj-stucard mj-leadcard"><div class="mj-lcard__head"><p class="mj-lcard__desc">' + all.length + ' lead' + (all.length === 1 ? '' : 's') + (per === 'all' ? ' in total' : ' from the last 6 months') + '. Tap Intro invite to email someone.</p>' +
			'<label class="mj-search">' + ic('search', 16) + '<input type="search" id="mjd-lq" placeholder="Search leads" aria-label="Search leads" value="' + esc(S.lq || '') + '"></label>' +
			'<div class="mj-viewseg" role="group" aria-label="Time period"><button class="' + (per === '6mo' ? 'is-active' : '') + '" data-lperiod="6mo">6 months</button><button class="' + (per === 'all' ? 'is-active' : '') + '" data-lperiod="all">All time</button></div>' +
			'<button class="mj-btn mj-btn--dark" data-act="add">' + ic('plus', 16) + 'Add Lead</button></div>' +
			'<div class="mj-lcard__body"><div class="mj-stages mj-ltiles" style="margin-top:0">' + tiles.replace('<div class="mj-stages mj-ltiles">', '') + filters +
			'<div class="mjd-card mjd-stulist mj-leadlist">' + (body || '<div class="mjd-empty">No leads match. New website form entries show up here automatically.</div>') + '</div></div></section>';
	}
	function invModal(p) {
		var d = invDays();
		if (!d.length) { sm('<h3>Intro invite</h3><p class="mjd-sub">There’s no training day on the schedule yet. Schedule one first, then send ' + esc(p.first || name(p)) + ' an invite.</p><div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" data-tab="sched" data-close="sm">Go to Training Schedule</button></div>'); return; }
		var cur = d.some(function (x) { return x.id === +S.invSess; }) ? +S.invSess : d[0].id;
		var lbl = function (x) { return new Date(x.sess_date + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + (x.start_time ? ' · ' + new Date('2000-01-01T' + x.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '') + ' · ' + x.field; };
		sm('<h3>Intro invite</h3><p class="mjd-sub">Emails <b>' + esc(name(p)) + '</b> (' + esc(p.email) + ') an invite with a “Yes, I’ll be there — RSVP” button.' + (p.invited_at ? ' Last invited ' + esc(dt(p.invited_at)) + '.' : '') + '</p>' +
			'<div class="mjd-f"><label>Training day</label><select id="iv-s">' + d.map(function (x) { return '<option value="' + x.id + '"' + (x.id === cur ? ' selected' : '') + '>' + esc(lbl(x)) + '</option>'; }).join('') + '</select></div>' +
			'<div class="mjd-f"><label>Where to meet (optional)</label><input type="text" id="iv-d" placeholder="Only goes in the email, never on the website"></div>' +
			'<div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="iv-go">Send invite</button></div><div class="mjd-status" id="iv-st"></div>');
		S.invWhere = S.invWhere || {};
		var sel = $('#iv-s'), wh = $('#iv-d'), fillWh = function () { wh.value = S.invWhere[sel.value] || ''; };
		sel.onchange = fillWh; fillWh();
		$('#iv-go').onclick = function () {
			var btn = this, x = d.find(function (q) { return q.id === +sel.value; });
			S.invSess = x.id; S.invWhere[x.id] = wh.value;
			btn.disabled = true; $('#iv-st').textContent = 'Sending…';
			api('invite_send', { sess_id: x.id, date: x.sess_date, start: x.start_time, end: '', location: /laney/i.test(x.field) ? 'Maiden, NC' : /monarch/i.test(x.field) ? 'Mocksville, NC' : x.field, details: wh.value, note: '', subject: '', ids: [p.id] }).then(function (r) {
				if (r[0] && r[0].ok) { smClose(); toast('Invite sent to ' + (p.first || name(p)) + ' ✓'); load(); }
				else { btn.disabled = false; $('#iv-st').innerHTML = '<span class="bad">Couldn’t send. Check the email address.</span>'; }
			}).catch(function (e) { btn.disabled = false; $('#iv-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
	}
	function invDays() { return (S.sess || []).filter(function (x) { return x.kind !== 'gs' && x.sess_date >= today(); }).sort(function (a, b) { return (a.sess_date + a.start_time) < (b.sess_date + b.start_time) ? -1 : 1; }); }
	function invSessOpts() {
		var d = invDays();
		if (S.invSess == null && d.length) S.invSess = d[0].id;
		return d.map(function (x) { return '<option value="' + x.id + '"' + (+S.invSess === x.id ? ' selected' : '') + '>' + esc(new Date(x.sess_date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + (x.start_time ? ' · ' + new Date('2000-01-01T' + x.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '') + ' · ' + x.field) + ((S.invited || {})[x.id] ? ' ✓ invited' : '') + '</option>'; }).join('') +
			'<option value="0"' + (S.invSess === 0 || !d.length ? ' selected' : '') + '>' + (d.length ? 'Not linked to a training day (no RSVP button)' : 'No training days scheduled — no RSVP button') + '</option>';
	}
	function invFill() {
		var x = (S.sess || []).find(function (q) { return q.id === +S.invSess; }); if (!x) return;
		var town = /laney/i.test(x.field) ? 'Maiden, NC' : /monarch/i.test(x.field) ? 'Mocksville, NC' : '';
		$('#inv-date').value = x.sess_date; if (x.start_time) $('#inv-start').value = x.start_time;
		if (town && $('#inv-loc')) { $('#inv-loc').value = town; $('#inv-loc').dispatchEvent(new Event('change')); }
		$('#inv-date').dispatchEvent(new Event('change'));
	}
	function composer(k, title, sub, n, fields) {
		return '<div class="mjd-card"><h3>' + title + '</h3><p class="mjd-sub">' + sub + '</p>' + fields +
			'<div class="mjd-f"><label>Email subject</label><input type="text" id="' + k + '-subject" data-keep><div class="hint">Fills in from the date and time. You can edit it.</div></div>' +
			'<div class="mjd-tools"><button class="mjd-btn" data-prev="' + k + '">👁 Preview</button><button class="mjd-btn" data-test="' + k + '">✉ Send test to me</button>' +
			'<button class="mjd-btn pri" data-send="' + k + '"' + (n ? '' : ' disabled') + '>Send to ' + n + ' selected</button></div>' +
			'<div class="mjd-status" id="' + k + '-status"></div><div class="mjd-prog" id="' + k + '-prog"><i></i></div><iframe class="mjd-frame" id="' + k + '-frame" style="display:none" title="Email preview"></iframe></div>';
	}

	/* ── INTRO DONE ── */
	function vIntro() {
		var rows = introList().map(function (p) {
			return '<tr class="' + (S.flash[p.id] ? 'mjd-leaving' : '') + '" data-row="' + p.id + '"><td><div class="mjd-name" data-open="' + p.id + '">' + esc(name(p)) + '</div><div class="mjd-m">' + esc(p.location) + '</div></td><td>' + contact(p) + '</td>' +
				'<td>' + esc(dt(p.intro_date)) + (p.intro_date ? '<div class="mjd-m">' + ago(p.intro_date) + '</div>' : '') + '</td>' +
				'<td class="r"><b>' + money(p.total) + '</b></td><td><div class="mjd-acts">' + courseBtn(p) + stuBtn(p) + (p.status === 'intro' ? '<button class="mjd-link" data-arch="' + p.id + '">Didn’t continue</button>' : '') + '</div></td><td class="c-x">' + (p.status === 'intro' ? backBtn(p) : '') + '</td></tr>';
		}).join('');
		return '<div class="mjd-card"><h3>Intros Done</h3><p class="mjd-sub">People who did their intro but haven’t signed up yet. Click <b>Full Course Paid?</b> when they pay — or <b>+ Student</b> — and they move to Students.</p>' +
			'<div class="mjd-tw"><table class="mjd-t"><thead><tr><th>Name</th><th>Contact</th><th>Intro</th><th class="r">Paid</th><th></th><th></th></tr></thead><tbody>' +
			(rows || '<tr><td colspan="6" class="mjd-empty">Nobody waiting. When someone pays for an intro, mark “Intro Paid” on the Leads tab.</td></tr>') + '</tbody></table></div></div>';
	}

	/* ── STUDENTS ── */
	function isWheel(p) { return /wheel|trike/i.test(p.launch || ''); }
	function wheelTag(p) { return isWheel(p) ? '<span class="mjd-wheel" title="' + esc(p.launch) + '">◉ Wheel Launch</span>' : ''; }
	function stagePick(p) {
		return '<div class="mjd-stagepick' + (S.stOpen[p.id] ? ' open' : '') + '">' + Object.keys(MJD.stages).filter(function (k) { return S.stOpen[p.id] || k === p.stage; }).map(function (k) { var on = k === p.stage; return '<button type="button" class="sp' + (on ? ' on' : '') + '" style="--c:' + MJD.stages[k][1] + '" data-setstage="' + p.id + '" data-v="' + k + '"' + (on ? ' aria-pressed="true"' : '') + '><i></i>' + esc(MJD.stages[k][0]) + '</button>'; }).join('') +
					(S.stOpen[p.id] ? '<div class="sp-wheel"><button type="button" class="mjd-wheeltog' + (isWheel(p) ? ' on' : '') + '" data-wheel="' + p.id + '">◉ Wheel Launch ' + (isWheel(p) ? '✓' : '— off') + '</button></div>' : wheelTag(p)) +
					'<button type="button" class="sp-more" data-stopen="' + p.id + '" aria-expanded="' + (S.stOpen[p.id] ? 'true' : 'false') + '">' + (S.stOpen[p.id] ? 'Close ▴' : 'Change ▾') + '</button></div>';
	}
	function stuList(shown) {
		if (!shown.length) return '';
		var yes = function (v, t) { return v ? '<span class="ck on" title="' + t + '">✓</span>' : '<span class="ck" title="' + t + ' — not yet">—</span>'; };
		return Object.keys(MJD.stages).map(function (k) {
			var g = shown.filter(function (p) { return p.stage === k; }); if (!g.length) return '';
			return '<div class="mjd-sg" style="--sc:' + MJD.stages[k][1] + '"><div class="mjd-sg-h"><i></i>' + esc(MJD.stages[k][0]) + '<b>' + g.length + '</b></div>' +
				'<div class="mjd-tw"><table class="mjd-t"><thead><tr><th>Student</th><th>Contact</th><th class="r">Paid</th><th class="c">First flight</th><th class="c">Ground school</th><th class="c">Gear</th><th>Status</th><th></th></tr></thead><tbody>' +
				g.map(function (p) {
					return '<tr><td><div class="mjd-name" data-open="' + p.id + '">' + esc(name(p)) + '</div><div class="mjd-m">' + esc([p.enrolled_date ? 'Enrolled ' + dt(p.enrolled_date) : '', p.launch].filter(Boolean).join(' · ')) + '</div></td>' +
						'<td class="c-contact">' + cBtns(p) + '</td>' +
						'<td class="r"><b class="paidl">' + money(p.total) + '</b></td>' +
						'<td class="c" data-l="First flight ">' + yes(hasFlown(p), 'First flight') + '</td><td class="c" data-l="Ground school ">' + gsMark(p) + '</td><td class="c" data-l="Gear ">' + yes(+p.paid_gear, 'Gear purchased') + '</td>' +
						'<td class="st">' + stagePick(p) + '</td><td class="c-x">' + backBtn(p) + '</td></tr>';
				}).join('') + '</tbody></table></div></div>';
		}).join('');
	}
	function cBtns(p) {
		var tel = String(p.phone || '').replace(/[^0-9+]/g, '');
		var b = function (href, icon, lab, tip, on) { return on ? '<a class="mj-cb" href="' + href + '" title="' + esc(tip) + '" aria-label="' + esc(lab + ' ' + name(p)) + '">' + ic(icon, 16) + '<span>' + lab + '</span></a>' : '<a class="mj-cb is-missing" href="#" data-open="' + p.id + '" title="No ' + (icon === 'mail' ? 'email' : 'phone') + ' on file — tap to add">' + ic(icon, 16) + '<span>' + lab + '</span></a>'; };
		return '<div class="mj-cbtns">' + b('tel:' + esc(tel), 'phone', 'Call', 'Call ' + (p.phone || ''), !!p.phone) + b('sms:' + esc(tel), 'text', 'Text', 'Text ' + (p.phone || ''), !!p.phone) + b('mailto:' + esc(p.email || ''), 'mail', 'Email', 'Email ' + (p.email || ''), !!p.email) + '</div>' +
			'<div class="mj-cmeta">' + (p.phone ? esc(p.phone) : '<span class="mj-cmiss">No phone</span>') + (p.email ? '<span class="mj-cmail" title="' + esc(p.email) + '">' + esc(p.email) + '</span>' : '') + '</div>';
	}
	/* ── INVENTORY: counts per gear type + needs-repair list ── */
	var INVC = [['wings', 'orange', 'Wings'], ['motors', 'sky', 'Motors'], ['trikes', 'gold', 'Trikes'], ['harnesses', 'green', 'Harnesses'], ['helmets', 'orange', 'Helmets'], ['bibles', 'sky', 'PPG Bibles']];
	function vInventory() {
		if (!S.inv) { api('inv_get').then(function (r) { S.inv = r; render(); }).catch(function (e) { S.inv = { error: e.message }; render(); }); return '<div class="mj-empty">Loading inventory…</div>'; }
		if (S.inv.error) return '<div class="mj-empty">' + esc(S.inv.error) + '</div>';
		var I = S.inv;
		var cards = INVC.map(function (c) {
			var items = I.items[c[0]] || [], tot = items.reduce(function (a, it) { return a + (+it.qty || 0); }, 0);
			var rows = items.map(function (it) {
				return '<div class="mj-invrow"><div class="mj-invrow__who" data-invedit="' + c[0] + ':' + it.id + '"><div class="mj-item__title">' + esc(it.name) + (condOf(it.cond) ? ' <span class="mj-condchip" style="--cc:' + condOf(it.cond)[3] + '">' + condOf(it.cond)[1] + '</span>' : '') + '</div>' + (it.notes ? '<div class="mj-item__sub">' + esc(it.notes) + '</div>' : '') + '</div>' +
					'<div class="mj-step"><button data-invq="' + c[0] + ':' + it.id + ':-1" aria-label="One less"' + (+it.qty ? '' : ' disabled') + '>−</button><b>' + (+it.qty || 0) + '</b><button data-invq="' + c[0] + ':' + it.id + ':1" aria-label="One more">+</button></div></div>';
			}).join('');
			return '<section class="mj-card mj-invc mj-invc--' + c[1] + '"><div class="mj-card__head"><div class="mj-card__name"><span class="mj-card__icon">' + ic('inventory', 16) + '</span>' + esc(c[2]) + '</div><span class="mj-invtot">' + tot + '</span></div>' +
				'<div class="mj-invlist">' + (rows || '<div class="mj-card__empty">No ' + esc(c[0] === 'bibles' ? 'PPG Bibles' : c[2].toLowerCase()) + ' added yet.</div>') + '</div>' +
				'<div class="mj-card__foot"><button class="mj-invadd" data-invadd="' + c[0] + '">' + ic('plus', 15) + 'Add ' + esc({ wings: 'wing', motors: 'motor', trikes: 'trike', harnesses: 'harness', helmets: 'helmet', bibles: 'PPG Bible' }[c[0]]) + '</button></div></section>';
		}).join('');
		var rep = function (r, done) {
			var cat = (INVC.find(function (c) { return c[0] === r.cat; }) || [])[2];
			return '<div class="mj-reprow' + (done ? ' is-done' : '') + '"><span class="mj-repdot"></span><div class="mj-reprow__main"><div class="mj-item__title">' + esc(r.what) + (cat ? ' <em class="mj-pill mj-pill--grey">' + esc(cat) + '</em>' : '') + '</div>' + (r.issue ? '<div class="mj-reprow__issue">' + esc(r.issue) + '</div>' : '') + ((r.who || +r.order) ? '<div class="mj-reprow__tags">' + (r.who ? '<span class="mj-chip">👤 ' + esc(r.who) + '</span>' : '') + (+r.order ? '<span class="mj-chip mj-chip--wheel">Parts: ' + esc(r.order_item) + (r.order_by ? ' · ordering: ' + esc(r.order_by) : '') + '</span>' : '') + '</div>' : '') +
				'<div class="mj-item__sub">' + (done ? ((r.kind || 'repair') === 'maint' ? 'Done' : 'Fixed') + (r.done_by ? ' by ' + esc(r.done_by) : '') + (r.done_at ? ' · ' + esc(dt(r.done_at)) : '') : 'Reported' + (r.by ? ' by ' + esc(r.by) : '') + (r.at ? ' · ' + esc(dt(r.at)) : '')) + '</div></div>' +
				'<div class="mj-reprow__acts">' + (done ? '<button class="mj-btn mj-btn--xs mj-btn--ghost" data-repundo="' + r.id + '">Undo</button>' : '<button class="mj-btn mj-btn--xs mj-btn--outline" data-repdone="' + r.id + '">✓ ' + ((r.kind || 'repair') === 'maint' ? 'Done' : 'Fixed') + '</button>') + '<button class="mj-iconbtn mj-iconbtn--xs" data-repdel="' + r.id + '" aria-label="Remove">✕</button></div></div>';
		};
		var box = function (kind, title, icon, doneWord) {
			var all = I.repairs.filter(function (r) { return (r.kind || 'repair') === kind; }), open = all.filter(function (r) { return !+r.done; }), fixed = all.filter(function (r) { return +r.done; });
			var key = 'repFixed_' + kind;
			return '<section class="mj-card mj-invrep mj-invrep--' + kind + '"><div class="mj-card__head"><div class="mj-card__name"><span class="mj-card__icon">' + ic(icon, 16) + '</span>' + title + '</div><span class="mj-invtot">' + open.length + '</span></div>' +
				'<div class="mj-invlist">' + (open.length ? open.map(function (r) { return rep(r, false); }).join('') : '<div class="mj-card__empty">' + (kind === 'maint' ? 'No maintenance due right now.' : 'Nothing needs fixing right now. 🎉') + '</div>') + '</div>' +
				(fixed.length ? '<button class="mj-invfixedtog" data-repfixed="' + kind + '">' + (S[key] ? 'Hide' : 'Show') + ' ' + fixed.length + ' ' + doneWord + '</button>' + (S[key] ? '<div class="mj-invlist mj-invlist--fixed">' + fixed.slice().reverse().map(function (r) { return rep(r, true); }).join('') + '</div>' : '') : '') +
				'<div class="mj-card__foot"><button class="mj-invadd" data-repadd="' + kind + '">' + ic('plus', 15) + (kind === 'maint' ? 'Add maintenance needed' : 'Add something that needs repair') + '</button></div></section>';
		};
		var repairs = '<div class="mj-cards mj-cards--two mj-invreps">' + box('repair', 'Needs repair', 'wrench', 'fixed') + box('maint', 'Needs maintenance', 'settings', 'done') + '</div>';
		return '<div class="mj-tbar"><p class="mj-desc">The school’s gear. Tap <b>+ / −</b> to change a count, tap a name to edit it, and log anything that needs fixing.</p><div class="mj-invbtns"><button class="mj-b mjd-c-gold" data-repadd="repair">' + ic('wrench') + 'Report a repair</button><button class="mj-b" data-repadd="maint">' + ic('settings') + 'Maintenance needed</button></div></div>' +
			(window.innerWidth <= 782 ? '<div class="mj-cards mj-invgrid">' + cards + '</div>' + repairs : repairs + '<div class="mj-cards mj-invgrid">' + cards + '</div>');
	}
	var COND = [['new', 'Brand new', 'Never used', '#1E7D4F'], ['good', 'Good', 'Flies fine', '#2A6FB0'], ['fair', 'Fair', 'Well used', '#C99A2E'], ['worn', 'Worn', 'Needs attention', '#E07B39'], ['out', 'Out of service', 'Do not use', '#6B7280']];
	var condOf = function (k) { return COND.find(function (c) { return c[0] === k; }); };
	function invItemModal(cat, id) {
		var c = INVC.find(function (x) { return x[0] === cat; }), it = id ? (S.inv.items[cat] || []).find(function (x) { return +x.id === +id; }) : null;
		sm('<section class="mj-form2 mj-lg2"><div class="mj-label">Inventory · ' + esc(c[2]) + '</div><h1 class="mj-lg2__title">' + (it ? 'Edit item' : 'Add ' + esc({ wings: 'wing', motors: 'motor', trikes: 'trike', harnesses: 'harness', helmets: 'helmet', bibles: 'PPG Bible' }[cat])) + '</h1>' +
			'<div class="mj-lg2__fields"><fieldset class="mj-lg2__f"><legend class="mj-label">Name / model</legend><input class="mj-in2" id="iv-n" value="' + esc(it ? it.name : '') + '" placeholder="' + esc({ wings: 'e.g. APCO Lift EZ 25', motors: 'e.g. Moster 185 Plus', trikes: 'e.g. Kangook trike', harnesses: 'e.g. Kangook harness, size M', helmets: 'e.g. Icaro helmet with headset', bibles: 'e.g. PPG Bible, 6th edition' }[cat] || '') + '"></fieldset>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label">How many?</legend><div class="mj-step mj-step--lg"><button type="button" id="iv-m">−</button><input type="number" id="iv-q" min="0" inputmode="numeric" value="' + (it ? +it.qty : 1) + '"><button type="button" id="iv-p">+</button></div></fieldset>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label mj-lg2__split"><span>Condition</span><small>Optional</small></legend><div class="mj-conds">' + COND.map(function (c) { return '<label class="mj-cond" style="--cc:' + c[3] + '"><input type="radio" name="iv-c" value="' + c[0] + '"' + (it && it.cond === c[0] ? ' checked' : '') + '><span><b>' + c[1] + '</b><small>' + c[2] + '</small></span></label>'; }).join('') + '</div></fieldset>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label mj-lg2__split"><span>Notes</span><small>Optional</small></legend><input class="mj-in2" id="iv-no" value="' + esc(it ? it.notes : '') + '" placeholder="e.g. sizes, colors, where it’s stored"></fieldset></div>' +
			'<div class="mj-lg2__foot">' + (it ? '<button class="mj-btn mj-btn--ghost" id="iv-del">Delete</button>' : '') + '<div class="mj-lg2__sum"></div><button class="mj-btn mj-btn--orange mj-lg2__go" id="iv-go">Save</button></div><div class="mjd-status" id="iv-st"></div></section>');
		$('#mjd-sm').classList.add('mj-lgmodal');
		var q = $('#iv-q'); $('#iv-m').onclick = function () { q.value = Math.max(0, (+q.value || 0) - 1); }; $('#iv-p').onclick = function () { q.value = (+q.value || 0) + 1; };
		$('#iv-go').onclick = function () { var b = this; b.disabled = true; api('inv_save', { cat: cat, id: it ? it.id : 0, name: $('#iv-n').value, qty: q.value, cond: (($('input[name="iv-c"]:checked') || {}).value || ''), notes: $('#iv-no').value }).then(function (r) { S.inv = r; smClose(); render(); toast('Saved ✓'); }).catch(function (e) { b.disabled = false; $('#iv-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }); };
		var dl = $('#iv-del'); if (dl) dl.onclick = function () { if (!confirm('Delete ' + it.name + ' from inventory?')) return; api('inv_delete', { cat: cat, id: it.id }).then(function (r) { S.inv = r; smClose(); render(); }); };
		setTimeout(function () { $('#iv-n').focus(); }, 50);
	}
	function repairModal(kind) {
		kind = kind === 'maint' ? 'maint' : 'repair'; var M = kind === 'maint';
		var opts2 = [['', 'Other / not listed']].concat(INVC.map(function (c) { return [c[0], c[2]]; }));
		var known = []; INVC.forEach(function (c) { (S.inv.items[c[0]] || []).forEach(function (it) { known.push(it.name); }); });
		sm('<section class="mj-form2 mj-lg2"><div class="mj-label">Inventory</div><h1 class="mj-lg2__title">' + (M ? 'Maintenance needed' : 'Needs repair') + '</h1><p class="mj-lg2__sub">' + (M ? 'Log routine upkeep that’s due so everyone can see it.' : 'Log a piece of gear that needs fixing so everyone can see it.') + '</p>' +
			'<div class="mj-lg2__fields"><fieldset class="mj-lg2__f"><legend class="mj-label">' + (M ? 'What needs maintenance?' : 'What needs repair?') + '</legend><input class="mj-in2" id="rp-w" list="rp-known" placeholder="e.g. Lift EZ 25 — orange wing"><datalist id="rp-known">' + known.map(function (k) { return '<option value="' + esc(k) + '">'; }).join('') + '</datalist></fieldset>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label">Type of gear</legend><select class="mj-in2" id="rp-c">' + opts(opts2, '') + '</select></fieldset>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label">Who’s doing it?</legend><div class="mj-choices">' + MJD.team.map(function (n) { return '<label class="mj-choice"><input type="radio" name="rp-who" value="' + esc(n) + '"><span>' + esc(n) + '</span></label>'; }).join('') + '</div></fieldset>' +
			'<fieldset class="mj-lg2__f"><label class="mj-rpchk"><input type="checkbox" id="rp-o"><span>Parts need to be ordered</span></label></fieldset>' +
			'<div class="rp-ord" hidden><fieldset class="mj-lg2__f"><legend class="mj-label">Who’s placing the order?</legend><div class="mj-choices mj-choices--ord">' + MJD.team.map(function (n) { return '<label class="mj-choice"><input type="radio" name="rp-oby" value="' + esc(n) + '"><span>' + esc(n) + '</span></label>'; }).join('') + '</div></fieldset>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label">What needs ordering?</legend><input class="mj-in2" id="rp-oi" placeholder="e.g. 2 A-lines and a riser for the Lift EZ"></fieldset></div>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label">' + (M ? 'What needs doing?' : 'What’s wrong?') + '</legend><textarea class="mj-in2 mj-in2--ta" id="rp-i" rows="3" placeholder="' + (M ? 'e.g. Oil change and new spark plug, check the belt' : 'e.g. Torn cell on the left tip, two broken A-lines') + '"></textarea></fieldset></div>' +
			'<div class="mj-lg2__foot"><div class="mj-lg2__sum"></div><button class="mj-btn mj-btn--orange mj-lg2__go" id="rp-go">' + (M ? 'Add to maintenance list' : 'Add to repair list') + '</button></div><div class="mjd-status" id="rp-st"></div></section>');
		$('#mjd-sm').classList.add('mj-lgmodal');
		$('#rp-o').onchange = function () { $('.rp-ord').hidden = !this.checked; };
		var rv = function (n) { var x = $('input[name="' + n + '"]:checked'); return x ? x.value : ''; };
		$('#rp-go').onclick = function () { var b = this; b.disabled = true; var ord = $('#rp-o').checked; api('repair_add', { kind: kind, what: $('#rp-w').value, cat: $('#rp-c').value, issue: $('#rp-i').value, who: rv('rp-who'), order: ord ? 1 : 0, order_by: rv('rp-oby'), order_item: $('#rp-oi').value }).then(function (r) { S.inv = r; smClose(); render(); toast('Added to the ' + (M ? 'maintenance' : 'repair') + ' list' + (rv('rp-who') ? ' + To-Do for ' + rv('rp-who') : '') + (ord ? ' + parts order' : '') + ' ✓'); load(); }).catch(function (e) { b.disabled = false; $('#rp-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }); };
		setTimeout(function () { $('#rp-w').focus(); }, 50);
	}
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-invq],[data-invedit],[data-invadd],[data-repadd],[data-repdone],[data-repundo],[data-repdel],[data-repfixed]'); if (!t) return;
		var g = function (n) { return t.getAttribute(n); };
		if (t.hasAttribute('data-invq')) { var q = g('data-invq').split(':'); t.disabled = true; return api('inv_qty', { cat: q[0], id: q[1], delta: q[2] }).then(function (r) { S.inv = r; render(); }); }
		if (t.hasAttribute('data-invedit')) { var ed = g('data-invedit').split(':'); return invItemModal(ed[0], ed[1]); }
		if (t.hasAttribute('data-invadd')) return invItemModal(g('data-invadd'), 0);
		if (t.hasAttribute('data-repadd')) { if (!S.inv) return; return repairModal(g('data-repadd')); }
		if (t.hasAttribute('data-repfixed')) { var fk = 'repFixed_' + g('data-repfixed'); S[fk] = !S[fk]; return render(); }
		if (t.hasAttribute('data-repdone')) return api('repair_done', { id: g('data-repdone') }).then(function (r) { S.inv = r; render(); toast('Done ✓'); load(); });
		if (t.hasAttribute('data-repundo')) return api('repair_done', { id: g('data-repundo'), undo: 1 }).then(function (r) { S.inv = r; render(); });
		if (t.hasAttribute('data-repdel')) { if (!confirm('Remove this from the repair list?')) return; return api('repair_delete', { id: g('data-repdel') }).then(function (r) { S.inv = r; render(); }); }
	});
	function stTint(c) { return 'color-mix(in srgb, ' + c + ' 16%, #fff)'; }
	function vActive() {
		var list = byStatus('active'), counts = {};
		list.forEach(function (p) { counts[p.stage] = (counts[p.stage] || 0) + 1; });
		var q = (S.sq || '').toLowerCase(), order = Object.keys(MJD.stages);
		var nFlown = list.filter(function (p) { return hasFlown(p); }).length, nWheel = list.filter(isWheel).length;
		var tiles = '<button class="mj-stage' + (S.stageF ? '' : ' is-active') + '" data-stagef="" style="--accent:var(--navy)" aria-pressed="' + !S.stageF + '"><b>' + list.length + '</b><span>All active</span></button>' +
			order.map(function (k) { return '<button class="mj-stage' + (S.stageF === k ? ' is-active' : '') + '" data-stagef="' + k + '" style="--accent:' + MJD.stages[k][1] + '" aria-pressed="' + (S.stageF === k) + '"><b>' + (counts[k] || 0) + '</b><span>' + esc(MJD.stages[k][0]) + '</span></button>'; }).join('');
		var filters = '<div class="mj-filters"><span class="mj-label">Also filter by</span><button class="mj-filter' + (S.wheelF ? ' is-active' : '') + '" data-wheelf="1" aria-pressed="' + !!S.wheelF + '">Wheel launch <span>' + nWheel + '</span></button>' +
			'<button class="mj-filter' + (S.flyF === 'yes' ? ' is-active' : '') + '" data-flyf="yes" aria-pressed="' + (S.flyF === 'yes') + '">Has flown <span>' + nFlown + '</span></button><button class="mj-filter' + (S.flyF === 'no' ? ' is-active' : '') + '" data-flyf="no" aria-pressed="' + (S.flyF === 'no') + '">Not flown yet <span>' + (list.length - nFlown) + '</span></button></div>';
		var shown = list.filter(function (p) { return (!S.wheelF || isWheel(p)) && (!S.flyF || (S.flyF === 'yes') === !!hasFlown(p)) && (!S.stageF || p.stage === S.stageF) && (!q || (name(p) + ' ' + p.email + ' ' + p.phone + ' ' + p.notes).toLowerCase().indexOf(q) > -1); })
			.sort(function (a, b) { return order.indexOf(a.stage) - order.indexOf(b.stage) || name(a).localeCompare(name(b)); });
		var view = (window.innerWidth || 1000) <= 640 ? 'cards' : (S.stuView || 'list');
		var body = view === 'list' ? '<div class="mjd-card mjd-stulist" style="margin-top:22px">' + (stuList(shown) || '<div class="mjd-empty">No students match.</div>') + '</div>' : (shown.length ? '<div class="mj-students">' + shown.map(hqCard).join('') + '</div>' : '<div class="mj-empty">No students match these filters.</div>');
		return '<section class="mj-lcard mj-stucard"><div class="mj-lcard__head"><p class="mj-lcard__desc">' + list.length + ' pilot' + (list.length === 1 ? '' : 's') + ' in training. Tap a stage to move someone along.</p>' +
			'<label class="mj-search">' + ic('search', 16) + '<input type="search" id="mjd-sq" placeholder="Search students" aria-label="Search students" value="' + esc(S.sq || '') + '"></label>' +
			'<div class="mj-viewseg" role="group" aria-label="View"><button class="' + (view === 'cards' ? 'is-active' : '') + '" data-stuview="cards" aria-pressed="' + (view === 'cards') + '">' + ic('grid', 16) + 'Cards</button><button class="' + (view === 'list' ? 'is-active' : '') + '" data-stuview="list" aria-pressed="' + (view === 'list') + '">' + ic('list', 16) + 'List</button></div>' +
			'<button class="mj-btn mj-btn--dark" data-act="add">' + ic('plus', 16) + 'Add Student</button></div>' +
			'<div class="mj-lcard__body"><div class="mj-stages" style="margin-top:0">' + tiles + '</div>' + filters + body + '</div></section>';
	}

	/* ── GROUND SCHOOL ── */
	function gsRows() {
		return S.people.filter(function (p) {
			if (S.gsF === 'need') return needsGS(p);
			if (S.gsF === 'students') return p.status === 'active' || p.status === 'intro';
			return p.status !== 'archived';
		});
	}
	function gsItem(x) {
		var R = x.rsvps, yes = R.filter(function (r) { return r.status === 'yes'; }), maybe = R.filter(function (r) { return r.status === 'maybe'; }), no = R.filter(function (r) { return r.status === 'no'; });
		var open = S.sessId === x.id;
		var names = function (l, cls) { return l.length ? l.map(function (r) { var p = r.person_id ? S.people.find(function (q) { return q.id === r.person_id; }) : null; return '<span class="mjd-gsn ' + cls + '"' + (p ? ' data-open="' + p.id + '"' : '') + '>' + esc(r.name) + (p && p.ground_school_date ? ' ✓' : p && p.gs1_date ? ' ½' : '') + '</span>'; }).join('') : '<span class="mjd-m">—</span>'; };
		var d = new Date(x.sess_date + 'T12:00'), up = x.sess_date >= today(), tm = x.start_time ? new Date('2000-01-01T' + x.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
		return '<div class="mj-dayw' + (open ? ' is-open' : '') + (up ? ' is-up' : '') + '"><div class="mj-day" data-sess="' + x.id + '"><div class="mj-date" style="--accent:' + (up ? '#1E7D4F' : 'var(--border)') + '"><small>' + d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() + '</small><b>' + d.getDate() + '</b><small>' + d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() + '</small></div>' +
			'<div class="mj-day__main"><div class="mj-day__title">Ground School on Zoom' + (up ? ' <em class="mj-pill mj-pill--up">Upcoming</em>' : '') + (x.recording ? ' <em class="mj-pill mj-pill--rec">▶ Recording</em>' : (!up ? ' <em class="mj-pill mj-pill--grey">No recording yet</em>' : '')) + (x.gm_events && x.gm_events.length ? ' <em class="mj-pill mj-pill--grey">GroupMe</em>' : '') + '</div><div class="mj-item__sub">' + esc([tm, x.notes].filter(Boolean).join(' · ')) + '</div></div>' +
			'<div class="mj-day__stats"><span><b>' + yes.length + '</b> ' + (up ? 'expected' : 'went') + '</span>' + (maybe.length ? '<span>' + maybe.length + ' maybe</span>' : '') + '</div>' +
			'<div class="mj-day__actions"><button class="mj-linkbtn" data-sess="' + x.id + '" aria-expanded="' + open + '">' + (open ? 'Hide ↑' : 'View ↓') + '</button></div></div>' +
			(open ? '<div class="mjd-sdetail mj-gsdet"><div class="mjd-sdh"><div class="mjd-m">' + (x.notes ? esc(x.notes) + '<br>' : '') + (x.zoom ? '🔗 <a href="' + esc(x.zoom) + '" target="_blank" rel="noopener">' + esc(x.zoom) + '</a>' : 'No Zoom link yet') + '</div>' +
				'<div class="mjd-acts">' + (S.gmOn ? '<button class="mjd-btn mj-gmi" data-act="gmsync" title="Check GroupMe" aria-label="Check GroupMe">' + ic('refresh', 18) + '</button>' : '') + '<button class="mjd-btn sm" data-act="editgs">Edit</button></div></div>' +
				(x.sess_date < today() ? '<div class="mj-recbox"><label for="gs-rec-' + x.id + '">🎥 Zoom recording link</label>' + (x.recording ? '<div class="mj-recnow"><a class="mjd-btn pri" href="' + esc(x.recording) + '" target="_blank" rel="noopener">▶ Watch recording</a><button class="mjd-btn" data-reccopy="' + esc(x.recording) + '">Copy link</button></div>' : '') +
					'<div class="mj-recrow"><input type="url" id="gs-rec-' + x.id + '" value="' + esc(x.recording || '') + '" placeholder="Paste the Zoom recording link, e.g. https://zoom.us/rec/share/…"><button class="mjd-btn" data-recsave="' + x.id + '">Save</button></div>' +
					'<div class="mjd-m">Include the passcode in the notes if the recording has one. Copy the link to send it to students who missed class.</div></div>' : '') +
				'<div class="mjd-gsl"><div><h5>Going <b>' + yes.length + '</b></h5>' + names(yes, 'y') + '</div><div><h5>Maybe <b>' + maybe.length + '</b></h5>' + names(maybe, 'm') + '</div><div><h5>Not going <b>' + no.length + '</b></h5>' + names(no, 'n') + '</div></div>' +
				'<p class="mjd-m" style="margin:12px 0 0">✓ = already finished ground school · ½ = 1 of 2 sessions. Click a name to open their profile.</p></div>' : '') + '</div>';
	}
	function vGS() {
		if (!S.sess) { loadSess().then(render); return '<div class="mjd-card mjd-empty">Loading…</div>'; }
		var gs = S.sess.filter(function (x) { return x.kind === 'gs'; });
		var up = gs.filter(function (x) { return x.sess_date >= today(); }).sort(function (a, b) { return a.sess_date < b.sess_date ? -1 : 1; });
		var past = gs.filter(function (x) { return x.sess_date < today(); }).sort(function (a, b) { return a.sess_date < b.sess_date ? 1 : -1; });
		var need = gsRows().map(function (p) {
			var n = gsN(p), ini = (String(p.first || '?').charAt(0) + String(p.last || '').charAt(0)).toUpperCase();
			var sub = [({ lead: 'Lead', intro: 'Intro done', active: 'Student', graduated: 'Graduate' }[p.status] || '')].concat(p.phone ? ['<a href="tel:' + esc(String(p.phone).replace(/[^0-9+]/g, '')) + '">' + esc(p.phone) + '</a>'] : []).filter(Boolean).join(' · ');
			var prog = '<div class="mj-gsprog n' + n + '"><span class="dots"><i></i><i></i></span><b>' + n + ' of 2</b>' + (p.gs1_date && n === 1 ? '<small>' + esc(dt(p.gs1_date).replace(/, \d{4}$/, '')) + '</small>' : p.ground_school_date ? '<small>' + esc(dt(p.ground_school_date).replace(/, \d{4}$/, '')) + '</small>' : '') + '</div>';
			var acts = p.ground_school_date ? '<span class="mj-ok">✓ Finished</span><button class="mj-iconbtn mj-iconbtn--xs mj-gsx" data-gsundo="' + p.id + '" title="Undo" aria-label="Undo">↺</button>'
				: '<button class="mj-btn mj-btn--xs mj-btn--outline" data-gsdone="' + p.id + '">' + (p.gs1_date ? 'Mark 2nd ✓' : 'Mark 1st ✓') + '</button>' + (p.gs1_date ? '<button class="mj-iconbtn mj-iconbtn--xs mj-gsx" data-gsundo="' + p.id + '" title="Undo session 1" aria-label="Undo">↺</button>' : '');
			return '<div class="mj-gsrow"><span class="mj-avatar">' + esc(ini) + '</span><div class="mj-gsrow__who"><div class="mj-item__title" data-open="' + p.id + '">' + esc(name(p)) + '</div><div class="mj-item__sub">' + sub + '</div></div>' + prog + '<div class="mj-gsrow__acts">' + acts + '</div></div>';
		}).join('');
		return '<div class="mj-toolbar"><div class="mj-toolbar__help">Usually Tuesdays &amp; Thursdays on Zoom. Scheduling one posts an RSVP event to both GroupMe chats.</div><button class="mj-btn mj-btn--dark" data-act="newgs">' + ic('plus', 16) + 'Schedule Ground School</button></div>' +
			'<section class="mj-card" style="margin-top:22px"><div class="mj-card__head' + (up.length ? ' mj-card__head--bordered' : '') + '"><div class="mj-card__name">Upcoming ground school <em class="mj-pill mj-pill--grey">' + up.length + '</em></div>' + (S.gmOn ? '<button class="mj-refresh" data-act="gmsync" title="Check GroupMe for new ground school classes" aria-label="Check GroupMe">' + ic('refresh', 22) + '</button>' : '') + '</div>' + (up.length ? up.map(gsItem).join('')
				: '<div class="mj-card__emptywrap"><div class="mj-empty">Nothing scheduled. Click <b>Schedule Ground School</b>' + (S.gmOn ? ', or classes announced in GroupMe show up here on their own.' : '.') + '</div></div>') + '</section>' +
			'<section class="mj-card mj-card--past" style="margin-top:18px"><div class="mj-card__head' + (S.gsPast ? ' mj-card__head--bordered' : ' mj-card__head--solo') + '" data-act="gspast" role="button" aria-expanded="' + !!S.gsPast + '"><div class="mj-card__name">Past ground school <em class="mj-pill mj-pill--grey">' + past.length + '</em></div><button class="mj-linkbtn" data-act="gspast">' + (S.gsPast ? 'Collapse ↑' : 'Show ↓') + '</button></div>' +
			(S.gsPast ? (past.length ? past.map(gsItem).join('') : '<div class="mj-card__empty">No past ground school yet.</div>') : '') + '</section>' +
			'<div class="mjd-card" style="margin-top:18px"><div class="mjd-ch"><div><h3>Who Still Needs Ground School</h3><p class="mjd-sub">Everyone attends 2 sessions. Mark each session as they attend — 2 of 2 = finished.</p></div>' +
			'<select id="mjd-gsf">' + opts([['need', 'Still needs ground school'], ['students', 'All intro + students'], ['all', 'Everyone']], S.gsF) + '</select></div>' +
			'<div class="mj-gslist">' + (need || '<div class="mj-card__empty">Everyone’s caught up on ground school. 🎉</div>') + '</div></div>';
	}

	/* ── QUOTES / GRADS / ARCHIVED ── */
	var QST = { draft: ['Draft', 'man'], sent: ['Sent', 'web'], purchased: ['Purchased', 'ok'], declined: ['Declined', 'no'] };
	function vQuotes() {
		var row = function (q) {
			var st = QST[q.status] || ['', 'man'], arch = +q.archived;
			return '<tr><td><div class="mjd-name" data-open="' + q.person_id + '">' + esc(((q.first || '') + ' ' + (q.last || '')).trim()) + '</div></td><td>' + esc(q.title) + '</td><td class="r"><b>' + money(q.total) + '</b></td>' +
				'<td><span class="mjd-tag ' + st[1] + '">' + st[0] + '</span></td><td>' + esc(dt(q.sent_at || q.created_at)) + '</td>' +
				'<td style="white-space:nowrap"><button class="mjd-btn sm" data-open="' + q.person_id + '">Open</button> <button class="mjd-btn sm" data-qarch="' + q.id + '" data-v="' + (arch ? 0 : 1) + '">' + (arch ? '↩ Restore' : '🗂 Archive') + '</button></td></tr>';
		};
		var active = S.quotes.filter(function (q) { return !+q.archived; }), arch = S.quotes.filter(function (q) { return +q.archived; });
		var head = '<thead><tr><th>Student</th><th>Quote</th><th class="r">Total</th><th>Status</th><th>Date</th><th></th></tr></thead>';
		return '<div class="mj-tbar"><p class="mj-desc">Build a quote for any student or customer and email it to them. When they buy, mark it Purchased and it’s added to their history.</p><button class="mj-b mjd-c-gold" data-act="newquote">' + ic('plus') + 'New Quote</button></div>' +
			'<section class="mj-card"><div class="mj-card__head mj-card__head--bordered"><div class="mj-card__name">Active quotes <em class="mj-pill">' + active.length + '</em></div></div><div class="mj-qbody mj-flush"><div class="mjd-tw"><table class="mjd-t">' + head + '<tbody>' + (active.map(row).join('') || '<tr><td colspan="6" class="mjd-empty">No active quotes. Click <b>New Quote</b> to make one.</td></tr>') + '</tbody></table></div></div></section>' +
			'<section class="mj-card" style="margin-top:18px"><div class="mj-card__head' + (S.qArchOpen ? ' mj-card__head--bordered' : ' mj-card__head--solo') + '" data-act="qarchtog" role="button" aria-expanded="' + !!S.qArchOpen + '"><div class="mj-card__name">Archived quotes <em class="mj-pill mj-pill--grey">' + arch.length + '</em></div><button class="mj-linkbtn" data-act="qarchtog">' + (S.qArchOpen ? 'Collapse ↑' : 'Show ↓') + '</button></div>' +
			(S.qArchOpen ? '<div class="mj-qbody mj-flush"><div class="mjd-tw"><table class="mjd-t">' + head + '<tbody>' + (arch.map(row).join('') || '<tr><td colspan="6" class="mjd-empty">Nothing archived yet.</td></tr>') + '</tbody></table></div></div>' : '') + '</section>';
	}
	function simpleTable(title, sub, list, cols) {
		var rows = list.map(function (p) { return '<tr><td><div class="mjd-name" data-open="' + p.id + '">' + esc(name(p)) + '</div></td><td>' + contact(p) + '</td>' + cols(p) + '</tr>'; }).join('');
		return '<div class="mjd-card"><h3>' + title + '</h3><p class="mjd-sub">' + sub + '</p><div class="mjd-tw"><table class="mjd-t"><tbody>' + (rows || '<tr><td class="mjd-empty">Nobody here yet.</td></tr>') + '</tbody></table></div></div>';
	}
	function vGrads() {
		return simpleTable('Graduates', 'Pilots who finished training with Mojo’s.', byStatus('graduated'), function (p) {
			return '<td>🎓 ' + esc(dt(p.graduated_date)) + '</td><td>' + (p.first_flight_date ? '🪂 First flight ' + esc(dt(p.first_flight_date)) : '') + '</td><td class="r"><b>' + money(p.total) + '</b><div class="mjd-m">total spent</div></td><td class="c-x">' + backBtn(p) + '</td>';
		});
	}
	function vArch() {
		var q = (S.aq || '').toLowerCase();
		var list = S.people.filter(inLeadArchive).filter(function (p) { return !q || (name(p) + ' ' + p.email + ' ' + p.phone + ' ' + p.notes).toLowerCase().indexOf(q) > -1; });
		var rows = list.map(function (p) {
			return '<tr><td><div class="mjd-name" data-open="' + p.id + '">' + esc(name(p)) + '</div><div class="mjd-m">' + esc(dt(p.created_at)) + '</div>' + (p.notes ? '<div class="mjd-m">“' + esc(p.notes.length > 80 ? p.notes.slice(0, 80) + '…' : p.notes) + '”</div>' : '') + '</td><td>' + contact(p) + '</td>' +
				'<td>' + (p.status === 'archived' ? '<span class="mjd-tag no">Not interested</span>' : '<span class="mjd-tag man">6+ months old</span>') + '</td>' +
				'<td class="r"><button class="mjd-btn sm" data-restore="' + p.id + '">Restore to Leads</button></td></tr>';
		}).join('');
		return '<div class="mjd-card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><h3>Lead Archive</h3><p class="mjd-sub">Leads older than 6 months move here automatically, along with anyone marked “not interested.” Students are never archived. Restore anyone, any time.</p></div>' +
			'<input type="search" id="mjd-aq" placeholder="Search archived leads…" value="' + esc(S.aq || '') + '" style="height:36px"></div>' +
			'<div class="mjd-tw"><table class="mjd-t"><thead><tr><th>Name</th><th>Contact</th><th>Why</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="4" class="mjd-empty">The archive is empty.</td></tr>') + '</tbody></table></div></div>';
	}

	/* ── TRAINING SCHEDULE ── */
	var INSTR = { 'alex': 1, 'jordan': 1, 'taylor': 1, 'casey': 1 };
	function normN(s) { return String(s || '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); }
	function matchPerson(nm) {
		var n = normN(nm); if (!n) return null;
		var pool = S.people.filter(function (p) { return p.status !== 'archived'; });
		var full = pool.filter(function (p) { return normN(p.first + ' ' + p.last) === n; }); if (full.length) return full[0];
		var parts = n.split(' ');
		if (parts.length > 1) { var fi = pool.filter(function (p) { var a = normN(p.first), b = normN(p.last); return a === parts[0] && b && b.charAt(0) === parts[parts.length - 1].charAt(0); }); if (fi.length === 1) return fi[0]; }
		var act = pool.filter(function (p) { return (p.status === 'active' || p.status === 'intro') && normN(p.first) === parts[0]; });
		return act.length === 1 ? act[0] : null;
	}
	function isInstr(nm) { var f = normN(nm).split(' ')[0]; return !!INSTR[f] && !matchPerson(nm); }
	function mkRsvp(nm, status, source, note) {
		var p = matchPerson(nm), ins = !p && isInstr(nm);
		return { key: 'r' + Math.random().toString(36).slice(2, 10), person_id: p ? p.id : 0, name: p ? name(p) : nm, status: status, launch: p && isWheel(p) ? 'wheel' : 'foot', role: ins ? 'instructor' : 'student', gear: p && +p.paid_gear ? 'own' : 'school', source: source, note: note || '' };
	}
	function curSess() { return S.sess.find(function (x) { return x.id === S.sessId; }); }
	function sessLabel(x, long) { var d = new Date(x.sess_date + 'T12:00'); return d.toLocaleDateString('en-US', long ? { weekday: 'long', month: 'long', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric' }) + (x.start_time ? ' · ' + new Date('2000-01-01T' + x.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''); }
	function loadSess() { return api('sess_list').then(function (r) { S.sess = r.sessions; S.gmOn = r.groupme; S.gmGroup = r.gm_group; S.gmBF = r.gm_by_field || {}; S.invited = r.invited || {}; if (S.sessId && !curSess()) S.sessId = 0; }); }
	function saveRsvps(x) { return api('sess_rsvps', { id: x.id, rsvps: x.rsvps }).then(function (r) { var i = S.sess.findIndex(function (q) { return q.id === r.id; }); if (i > -1) S.sess[i] = r; render(); }); }
	function vSched() {
		if (!S.sess) { loadSess().then(render); return '<div class="mj-empty">Loading training days…</div>'; }
		var tr = S.sess.filter(function (x) { return x.kind !== 'gs'; });
		var up = tr.filter(function (x) { return x.sess_date >= today(); }).sort(function (a, b) { return a.sess_date < b.sess_date ? -1 : 1; });
		var past = tr.filter(function (x) { return x.sess_date < today(); }).sort(function (a, b) { return a.sess_date < b.sess_date ? 1 : -1; });
		var tool = '<div class="mj-toolbar"><div class="mj-toolbar__help">Plan training days, see who’s coming, and know how much gear to bring.</div>' +
			(S.gmOn ? '' : '<a class="mj-btn" href="' + esc(MJD.settingsUrl) + '">Connect GroupMe</a>') +
			'<button class="mj-btn mj-btn--dark" data-act="newsess">' + ic('plus', 16) + 'Schedule Training Day</button></div>';
		return tool +
			'<section class="mj-card" style="margin-top:22px"><div class="mj-card__head' + (up.length ? ' mj-card__head--bordered' : '') + '"><div class="mj-card__name">Upcoming training days <em class="mj-pill mj-pill--grey">' + up.length + '</em></div>' + (S.gmOn ? '<button class="mj-refresh" data-act="gmsync" title="Check GroupMe for new training days" aria-label="Check GroupMe">' + ic('refresh', 22) + '</button>' : '') + '</div>' + (up.length ? up.map(dayRow).join('')
				: '<div class="mj-card__emptywrap"><div class="mj-empty">Nothing scheduled. Click <b>Schedule Training Day</b>' + (S.gmOn ? ', or days announced in GroupMe show up here on their own.' : '.') + '</div></div>') + '</section>' +
			'<section class="mj-card" style="margin-top:18px"><div class="mj-card__head' + (S.pastOpen ? ' mj-card__head--bordered' : ' mj-card__head--solo') + '" data-act="pasttog" role="button" aria-expanded="' + !!S.pastOpen + '"><div class="mj-card__name">Past training days <em class="mj-pill">' + past.length + '</em></div><button class="mj-linkbtn" data-act="pasttog" aria-expanded="' + !!S.pastOpen + '">' + (S.pastOpen ? 'Collapse ↑' : 'Show ↓') + '</button></div>' +
			(S.pastOpen ? (past.length ? past.map(dayRow).join('') : '<div class="mj-card__empty">No past training days yet.</div>') : '') + '</section>';
	}
	function dayRow(x) {
		var R = x.rsvps || [], stu = R.filter(function (r) { return r.role !== 'instructor'; }), yes = stu.filter(function (r) { return r.status === 'yes'; }), maybe = stu.filter(function (r) { return r.status === 'maybe'; });
		var w = yes.filter(function (r) { return r.launch === 'wheel'; }).length, open = S.sessId === x.id, d = new Date(x.sess_date + 'T12:00');
		var acc = /laney/i.test(x.field) ? 'var(--sky)' : /monarch/i.test(x.field) ? 'var(--orange)' : 'var(--navy)';
		var off = String(x.notes || '').indexOf('❌') === 0;
		var tm = x.start_time ? new Date('2000-01-01T' + x.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
		var isUp = x.sess_date >= today();
		return '<div class="mj-dayw' + (open ? ' is-open' : '') + (isUp ? ' is-up' : '') + '"><div class="mj-day" data-sess="' + x.id + '"><div class="mj-date" style="--accent:' + acc + '"><small>' + d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() + '</small><b>' + d.getDate() + '</b><small>' + d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() + '</small></div>' +
			'<div class="mj-day__main"><div class="mj-day__title">' + esc(x.field || '—') + (isUp && !off ? ' <em class="mj-pill mj-pill--up">Upcoming</em>' : '') + (off ? ' <em class="mj-pill mj-pill--warn">Called off</em>' : x.gm_event_id ? ' <em class="mj-pill mj-pill--grey">GroupMe</em>' : '') + '</div><div class="mj-item__sub">' + esc([tm, x.notes].filter(Boolean).join(' · ')) + '</div></div>' +
			'<div class="mj-day__stats"><span><b>' + yes.length + '</b> going</span><span>' + (yes.length - w) + ' foot</span><span>' + w + ' wheel</span>' + (maybe.length ? '<span>' + maybe.length + ' maybe</span>' : '') + '</div>' +
			'<div class="mj-day__actions">' + (open ? (S.gmOn ? '<button class="mj-iconbtn mj-iconbtn--outline mj-iconbtn--36" data-act="gmsync" title="Check GroupMe" aria-label="Check GroupMe">' + ic('refresh', 16) + '</button>' : '') + '<button class="mj-btn mj-btn--xs mj-btn--outline" data-act="addppl">+ Add people</button><button class="mj-btn mj-btn--xs mj-btn--outline" data-act="qtext">Text</button><button class="mj-btn mj-btn--xs mj-btn--ghost" data-act="editsess">Edit</button>' : '') +
			'<button class="mj-linkbtn" data-sess="' + x.id + '" aria-expanded="' + open + '">' + (open ? 'Hide ↑' : 'View ↓') + '</button></div></div>' + (open ? sessDetail(x) : '') + '</div>';
	}
	function sessDetail(x) {
		var R = x.rsvps.filter(function (r) { return r.role !== 'instructor'; }), yes = R.filter(function (r) { return r.status === 'yes'; }), maybe = R.filter(function (r) { return r.status === 'maybe'; }), no = R.filter(function (r) { return r.status === 'no'; });
		var ins = x.rsvps.filter(function (r) { return r.role === 'instructor'; });
		var foot = yes.filter(function (r) { return r.launch === 'foot'; }), wheel = yes.filter(function (r) { return r.launch === 'wheel'; });
		var sf = foot.filter(function (r) { return r.gear === 'school'; }).length, sw = wheel.filter(function (r) { return r.gear === 'school'; }).length;
		var flyers = foot.filter(function (r) { if (r.gear !== 'school') return false; var p = r.person_id ? S.people.find(function (q) { return q.id === r.person_id; }) : null; return p && (+p.flown || ['close-first', 'flying', 'almost-done'].indexOf(p.stage) > -1); });
		var motors = flyers.length ? 1 : 0;
		var row = function (r) {
			var p = r.person_id ? S.people.find(function (q) { return q.id === r.person_id; }) : null, isI = r.role === 'instructor';
			return '<div class="mj-attend__row"><div><div class="mj-item__title mj-item__title--15"' + (p ? ' data-open="' + p.id + '"' : '') + '>' + esc(r.name) + (isI ? ' <em class="mj-pill">Instructor</em>' : '') + '</div><div class="mj-item__sub">' + esc(r.source) + (p || isI ? '' : ' · not on your list') + (r.note ? ' · “' + esc(r.note) + '”' : '') + '</div></div>' +
				'<div>' + (isI ? '' : '<button class="mj-chip" data-rl="' + r.key + '" title="Tap to switch">' + (r.launch === 'wheel' ? 'Wheel' : 'Foot') + '</button>') + '</div>' +
				'<div>' + (isI ? '' : '<button class="mj-chip' + (r.gear === 'own' ? ' mj-chip--own' : '') + '" data-rg="' + r.key + '" title="Tap to switch">' + (r.gear === 'own' ? 'Own gear' : 'School gear') + '</button>') + '</div>' +
				'<div class="mj-rsvp">' + [['yes', 'Going'], ['maybe', 'Maybe'], ['no', 'Not going']].map(function (o) { return '<button class="' + (r.status === o[0] ? 'is-active' : '') + '" data-rs="' + r.key + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
				'<button class="mj-iconbtn mj-iconbtn--xs" data-rdel="' + r.key + '" aria-label="Remove">✕</button></div>';
		};
		var grp = function (title, list, cls) { return list.length ? '<div class="mj-group mj-group--' + cls + '"><i></i>' + title + ' <em class="mj-pill">' + list.length + '</em></div>' + list.map(row).join('') : ''; };
		var all = x.rsvps.length;
		return '<div class="mj-day__summary"><div class="mj-tile" style="--accent:var(--sky)"><div class="mj-label">Students going</div><div class="mj-kpi"><span class="mj-kpi__num mj-kpi__num--40">' + yes.length + '</span><span class="mj-kpi__unit">' + foot.length + ' foot · ' + wheel.length + ' wheel' + (maybe.length ? ' · ' + maybe.length + ' maybe' : '') + '</span></div></div>' +
			'<div class="mj-tile" style="--accent:var(--orange)"><div class="mj-label">Gear to bring</div><div class="mj-gear"><span><b>' + (sf + sw + 2) + '</b><small>WINGS</small></span><span class="' + (motors ? '' : 'is-zero') + '" title="' + esc(flyers.map(function (r) { return r.name; }).join(', ')) + '"><b>' + motors + '</b><small>MOTOR</small></span><span class="' + (sw ? '' : 'is-zero') + '"><b>' + sw + '</b><small>TRIKES</small></span><em>School-gear students · wings include 2 spares' + (motors ? ' · motor for ' + esc(flyers.map(function (r) { return r.name.split(' ')[0]; }).join(', ')) : '') + '</em></div></div></div>' +
			(all ? '<div class="mj-attend"><div class="mj-attend__head"><div>Name</div><div>Launch</div><div>Gear</div><div>RSVP</div><div></div></div>' + grp('Going', yes, 'going') + grp('Maybe', maybe, 'maybe') + grp('Not going', no, 'no') + grp('Instructors', ins, 'ins') + '</div>'
				: '<div class="mj-empty" style="margin:0 20px 20px">Nobody added yet. Click <b>+ Add people</b>' + (S.gmOn ? ' or check GroupMe.' : '.') + '</div>');
	}
	function gsModal(x) {
		x = x || { sess_date: '', start_time: '19:00', notes: '', zoom: '' };
		sm('<h3>' + (x.id ? 'Edit Ground School' : 'Schedule Ground School') + '</h3><p class="mjd-sub">Zoom class — usually Tuesday or Thursday evening.</p>' +
			'<div class="mjd-3"><div class="mjd-f"><label>Date</label><input type="date" id="gx-d" value="' + esc(x.sess_date) + '"></div><div class="mjd-f"><label>Start time</label><input type="time" id="gx-t" value="' + esc(x.start_time) + '"></div>' + (x.id ? '<div></div>' : '<div class="mjd-f"><label>End time</label><input type="time" id="gx-e" value="20:30"></div>') + '</div>' +
			'<div class="mjd-f"><label>Zoom link</label><input type="url" id="gx-z" value="' + esc(x.zoom || '') + '" placeholder="https://zoom.us/j/…"></div>' +
			(x.id ? '<div class="mjd-f"><label>Zoom recording link (after class)</label><input type="url" id="gx-r" value="' + esc(x.recording || '') + '" placeholder="https://zoom.us/rec/share/…"></div>' : '') +
			'<div class="mjd-f"><label>Topic / notes (optional)</label><input type="text" id="gx-n" value="' + esc(x.notes || '') + '" placeholder="e.g. Weather & airspace"></div>' +
			(!x.id && S.gmOn ? '<div class="mjd-gmpost"><label class="mjd-check"><input type="checkbox" id="gx-gm" checked> Post as a GroupMe RSVP event in both chats</label><div class="mjd-f" style="margin:8px 0 0"><label>Event name</label><input type="text" id="gx-en" value="Ground School (Zoom)"></div><div class="mjd-m" style="margin-top:6px">Posts to <b>' + esc(Object.keys(S.gmBF || {}).map(function (f) { return S.gmBF[f]; }).join('</b> and <b>')) + '</b> with the Zoom link, date and time. Members get Going / Not Going buttons.</div></div>' : '') +
			'<div class="mjd-tools" style="justify-content:flex-end">' + (x.id ? '<button class="mjd-btn danger" id="gx-del">Delete</button>' : '') + '<button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="gx-go">Save</button></div><div class="mjd-status" id="gx-st"></div>');
		$('#gx-go').onclick = function () {
			var btn = this, post = !x.id && $('#gx-gm') && $('#gx-gm').checked;
			var d = { id: x.id || 0, kind: 'gs', field: 'Zoom', sess_date: $('#gx-d').value, start_time: $('#gx-t').value, zoom: $('#gx-z').value, notes: $('#gx-n').value };
			if (x.id) { d.rsvps = x.rsvps; if ($('#gx-r')) d.recording = $('#gx-r').value.trim(); }
			if (!d.sess_date || !d.start_time) { $('#gx-st').innerHTML = '<span class="bad">Pick a date and start time.</span>'; return; }
			if (post) { d.post_gm = 1; d.event_name = $('#gx-en').value; d.end_time = $('#gx-e').value; }
			btn.disabled = true; $('#gx-st').textContent = post ? 'Saving and posting to GroupMe…' : 'Saving…';
			api(x.id ? 'sess_save' : 'sess_create_gm', d).then(function (r) {
				var sess = r.session || r; smClose(); S.sessId = sess.id; loadSess().then(render);
				if (r.gm_error) toast('Saved, but GroupMe didn’t take it: ' + r.gm_error, true);
				else toast(r.groupme ? 'Posted to ' + r.groupme.group + ' ✓' : 'Ground school saved');
				if (r.groupme && r.groupme.errors && r.groupme.errors.length) toast(r.groupme.errors.join(' · '), true);
			}).catch(function (e) { btn.disabled = false; $('#gx-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
		var dl = $('#gx-del'); if (dl) dl.onclick = function () { if (!confirm('Delete this ground school session?')) return; api('sess_delete', { id: x.id }).then(function () { smClose(); S.sessId = 0; loadSess().then(render); }); };
	}
	/* Text everyone on a training day through Quo (weather calls, time changes...) */
	function quoTextModal(x) {
		if (!x) return;
		if (!+MJD.quo) { sm('<h2>Text students</h2><p class="mj-desc">Connect your Quo number first, then you can text everyone going with one tap.</p><div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Close</button><a class="mjd-btn pri" href="' + esc(MJD.quoUrl) + '">Connect Quo</a></div>'); return; }
		var R = (x.rsvps || []).filter(function (r) { return r.role !== 'instructor'; }), yes = R.filter(function (r) { return r.status === 'yes'; }).length, maybe = R.filter(function (r) { return r.status === 'maybe'; }).length;
		var d = new Date(x.sess_date + 'T12:00'), day = d.toLocaleDateString('en-US', { weekday: 'long' }), tm = x.start_time ? new Date('2000-01-01T' + x.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
		var T = [['Weather call-off', 'Hi {first}, Mojo’s here. We’re calling off ' + day + '’s training because of the weather. We’ll text you about the next one. Sorry!'],
			['Still on', 'Hi {first}, ' + day + '’s training is still ON' + (tm ? ', see you at ' + tm : '') + ' at ' + (x.field || 'the field') + '!'],
			['Time change', 'Hi {first}, heads up: ' + day + '’s training now starts at __:__ (new time). Same place, ' + (x.field || 'the field') + '.'],
			['Custom', 'Hi {first}, ']];
		sm('<h2>Text students</h2><p class="mj-desc">Sends from your Quo number. Each person gets their own text, and replies come back to Quo. <b>{first}</b> becomes their first name.</p>' +
			'<div class="mjd-f" style="margin-top:16px"><label>Send to</label><div class="mj-viewseg mj-qseg" role="group"><button class="is-active" data-qw="yes">Going (' + yes + ')</button><button data-qw="yesmaybe">Going + Maybe (' + (yes + maybe) + ')</button></div></div>' +
			'<div class="mjd-f"><label>Start from</label><div class="mj-filters" style="margin:0">' + T.map(function (t, i) { return '<button class="mj-filter' + (i === 0 ? ' is-active' : '') + '" data-qt="' + i + '">' + t[0] + '</button>'; }).join('') + '</div></div>' +
			'<div class="mjd-f"><label for="qx">Message</label><textarea id="qx" rows="4" maxlength="1500">' + esc(T[0][1]) + '</textarea><small id="qx-n" style="color:#6B8690"></small></div>' +
			'<div class="mjd-status" id="qx-st"></div><div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="qx-go">Send texts</button></div>');
		var who = 'yes', ta = $('#qx'), cnt = function () { $('#qx-n').textContent = ta.value.length + ' characters' + (ta.value.length > 160 ? ' · sends as ' + Math.ceil(ta.value.length / 153) + ' segments' : ''); };
		ta.oninput = cnt; cnt();
		var qw = document.querySelectorAll('#mjd-sm [data-qw]'), qt = document.querySelectorAll('#mjd-sm [data-qt]');
		[].forEach.call(qw, function (b) { b.onclick = function () { [].forEach.call(qw, function (z) { z.classList.toggle('is-active', z === b); }); who = b.getAttribute('data-qw'); }; });
		[].forEach.call(qt, function (b) { b.onclick = function () { [].forEach.call(qt, function (z) { z.classList.toggle('is-active', z === b); }); ta.value = T[+b.getAttribute('data-qt')][1]; cnt(); ta.focus(); }; });
		$('#qx-go').onclick = function () {
			var b = this, n = who === 'yes' ? yes : yes + maybe; if (!n) { $('#qx-st').innerHTML = '<span class="bad">Nobody on that list yet.</span>'; return; }
			if (!confirm('Text ' + n + ' ' + (n === 1 ? 'person' : 'people') + ' now?')) return;
			b.disabled = true; $('#qx-st').textContent = 'Sending…';
			api('quo_text_day', { id: x.id, text: ta.value, who: who === 'yes' ? ['yes'] : ['yes', 'maybe'] }).then(function (r) {
				var msg = '✓ Texted ' + r.sent + (r.sent === 1 ? ' person' : ' people');
				if (r.skipped.length) msg += ' · no mobile number for ' + r.skipped.join(', ');
				if (r.failed.length) msg += ' · failed: ' + r.failed.join('; ');
				if (r.failed.length || r.skipped.length) { $('#qx-st').innerHTML = '<span class="' + (r.sent ? 'ok' : 'bad') + '">' + esc(msg) + '</span>'; b.disabled = false; } else { smClose(); toast(msg); }
			}).catch(function (e) { b.disabled = false; $('#qx-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
	}
	function sessModal(x) {
		x = x || { sess_date: '', start_time: '09:00', field: MJD.fields[0], notes: '' };
		sm('<h3>' + (x.id ? 'Edit Training Day' : 'Schedule Training Day') + '</h3><p class="mjd-sub">Pick the day and field.</p>' +
			'<div class="mjd-3"><div class="mjd-f"><label>Date</label><input type="date" id="ss-d" value="' + esc(x.sess_date) + '"></div><div class="mjd-f"><label>Start time</label><input type="time" id="ss-t" value="' + esc(x.start_time) + '"></div>' + (x.id ? '<div></div>' : '<div class="mjd-f"><label>End time</label><input type="time" id="ss-e" value="12:00"></div>') + '</div>' +
			'<div class="mjd-f"><label>Field</label><select id="ss-f">' + opts(MJD.fields, x.field) + '</select></div>' +
			'<div class="mjd-f"><label>Notes (optional)</label><input type="text" id="ss-n" value="' + esc(x.notes || '') + '" placeholder="e.g. Kiting at 3, flying at 5 if calm"></div>' +
			(!x.id && S.gmOn ? '<div class="mjd-gmpost"><label class="mjd-check"><input type="checkbox" id="ss-gm" checked> Post as a GroupMe RSVP event</label><div class="mjd-f" style="margin:8px 0 0"><label>Event name</label><input type="text" id="ss-en" value="Kiting Practice"></div><div class="mjd-m" id="ss-gmto" style="margin-top:6px"></div></div>' : '') +
			'<div class="mjd-tools" style="justify-content:flex-end">' + (x.id ? '<button class="mjd-btn danger" id="ss-del">Delete day</button>' : '') + '<button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="ss-go">Save</button></div><div class="mjd-status" id="ss-st"></div>');
		var gmTo = function () { var el = $('#ss-gmto'); if (el) { var g = (S.gmBF || {})[$('#ss-f').value]; el.innerHTML = g ? 'Members of <b>' + esc(g) + '</b> will get a notification with Going / Not Going buttons.' : '<span class="bad">No GroupMe group is set for this field.</span>'; } };
		$('#ss-f').addEventListener('change', gmTo); gmTo();
		$('#ss-go').onclick = function () {
			var btn = this, post = !x.id && $('#ss-gm') && $('#ss-gm').checked;
			var d = { id: x.id || 0, sess_date: $('#ss-d').value, start_time: $('#ss-t').value, field: $('#ss-f').value, notes: $('#ss-n').value };
			if (x.id) d.rsvps = x.rsvps;
			if (post) { if (!d.sess_date || !d.start_time) { $('#ss-st').innerHTML = '<span class="bad">Pick a date and start time.</span>'; return; } d.post_gm = 1; d.event_name = $('#ss-en').value; d.end_time = $('#ss-e').value; }
			btn.disabled = true; $('#ss-st').textContent = post ? 'Saving and posting to GroupMe…' : 'Saving…';
			api(x.id ? 'sess_save' : 'sess_create_gm', d).then(function (r) {
				var sess = r.session || r; smClose(); S.sessId = sess.id; loadSess().then(render);
				if (r.gm_error) toast('Saved, but GroupMe didn’t take it: ' + r.gm_error, true);
				else toast(r.groupme ? 'Saved and posted to ' + r.groupme.group + ' ✓' : 'Training day saved');
			}).catch(function (e) { btn.disabled = false; $('#ss-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
		var dl = $('#ss-del'); if (dl) dl.onclick = function () { if (!confirm('Delete this training day and its RSVP list?')) return; api('sess_delete', { id: x.id }).then(function () { smClose(); S.sessId = 0; loadSess().then(render); }); };
	}
	function addPeopleModal() {
		var x = curSess(), have = {}; x.rsvps.forEach(function (r) { if (r.person_id) have[r.person_id] = 1; });
		var cand = S.people.filter(function (p) { return (p.status === 'active' || p.status === 'intro') && !have[p.id]; }).sort(function (a, b) { return name(a).localeCompare(name(b)); });
		sm('<h3>Add People</h3><p class="mjd-sub">Check who’s coming, or type any name.</p>' +
			'<div class="mjd-addlist">' + (cand.map(function (p) { return '<label class="mjd-check"><input type="checkbox" data-ap="' + p.id + '"> ' + esc(name(p)) + ' <span class="mjd-m">' + (p.status === 'intro' ? 'Intro done' : 'Student') + (isWheel(p) ? ' · ◉ wheel' : '') + '</span></label>'; }).join('') || '<span class="mjd-m">Everyone’s already on the list.</span>') + '</div>' +
			'<div class="mjd-f" style="margin-top:12px"><label>Or type names (one per line)</label><textarea id="ap-x" rows="2" placeholder="e.g. Jordan&#10;Sam"></textarea></div>' +
			'<div class="mjd-2"><div class="mjd-f"><label>Mark as</label><select id="ap-s">' + opts([['yes', 'Going'], ['maybe', 'Maybe'], ['no', 'Not going']]) + '</select></div><div></div></div>' +
			'<div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="ap-go">Add</button></div>');
		$('#ap-go').onclick = function () {
			var st = $('#ap-s').value;
			$$('[data-ap]').forEach(function (c) { if (c.checked) { var p = S.people.find(function (q) { return q.id === +c.getAttribute('data-ap'); }); x.rsvps.push(mkRsvp(name(p), st, 'Added')); } });
			$('#ap-x').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (n) { x.rsvps.push(mkRsvp(n, st, 'Added')); });
			smClose(); saveRsvps(x).then(function () { toast('Added'); });
		};
	}
	function gmSync() {
		var x = curSess(); toast('Checking GroupMe…');
		api('gm_sync', { id: x.id }).then(function (g) {
			var known = {}; x.rsvps.forEach(function (r) { known[normN(r.name)] = r; });
			var evRows = g.going.map(function (n) { return [n, 'yes'] }).concat(g.not_going.map(function (n) { return [n, 'no'] }));
			var row = function (n, guess, txt, at, i) { var p = matchPerson(n), k = known[normN(p ? name(p) : n)];
				return '<tr><td><b>' + esc(n) + '</b>' + (p && name(p) !== n ? ' <span class="mjd-m">→ ' + esc(name(p)) + '</span>' : '') + (!p && !isInstr(n) ? ' <span class="mjd-m">(not on your list)</span>' : '') + (txt ? '<div class="mjd-m">“' + esc(txt) + '” · ' + esc(at) + '</div>' : '') + (k ? '<div class="mjd-m">Already listed as ' + esc({ yes: 'Going', maybe: 'Maybe', no: 'Not going' }[k.status]) + '</div>' : '') + '</td>' +
					'<td><select data-gm="' + i + '" data-n="' + esc(n) + '" data-t="' + esc(txt || '') + '" data-src="' + (txt ? 'GroupMe chat' : 'GroupMe RSVP') + '"><option value="">Skip</option>' + opts([['yes', 'Going'], ['maybe', 'Maybe'], ['no', 'Not going']], k ? '' : guess) + '</select></td></tr>'; };
			var i = 0, html = '';
			html += '<h4 class="mjd-gmh">GroupMe event ' + (g.event ? '— ' + esc(g.event.name) : '') + '</h4>' + (g.event ? (evRows.length ? '<table class="mjd-t"><tbody>' + evRows.map(function (e) { return row(e[0], e[1], '', '', i++); }).join('') + '</tbody></table>' : '<p class="mjd-m">No RSVPs on the event yet.</p>') : '<p class="mjd-m">No GroupMe calendar event found on ' + esc(sessLabel(x)) + '.</p>');
			html += '<h4 class="mjd-gmh">Chat replies (last 10 days) — please double-check</h4>' + (g.chat.length ? '<table class="mjd-t"><tbody>' + g.chat.map(function (c) { return row(c.name, c.guess, c.text, c.at, i++); }).join('') + '</tbody></table>' : '<p class="mjd-m">No yes/no replies found in the chat.</p>');
			if (g.errors && g.errors.length) html += '<div class="mjd-warn">' + esc(g.errors.join(' · ')) + '</div>';
			sm('<h3>From GroupMe' + (g.group ? ' — ' + esc(g.group) : '') + '</h3><p class="mjd-sub">Nothing is added until you click Apply. Chat guesses can be wrong — change any to Skip.</p>' + html +
				'<div class="mjd-tools" style="justify-content:flex-end;margin-top:14px"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="gm-go">Apply</button></div>');
			$('#gm-go').onclick = function () {
				$$('[data-gm]').forEach(function (s) { if (!s.value) return; var n = s.getAttribute('data-n'), p = matchPerson(n), k = known[normN(p ? name(p) : n)];
					if (k) { k.status = s.value; k.source = s.getAttribute('data-src'); if (s.getAttribute('data-t')) k.note = s.getAttribute('data-t'); }
					else x.rsvps.push(mkRsvp(n, s.value, s.getAttribute('data-src'), s.getAttribute('data-t'))); });
				smClose(); saveRsvps(x).then(function () { toast('Updated from GroupMe'); });
			};
		}).catch(function (e) { toast(e.message, true); });
	}

	/* ── GEAR SALES ── */
	function vGear() {
		var q = (S.gq || '').toLowerCase(), yr = String(new Date().getFullYear()), Y = S.gearY || yr;
		var years = {}; S.gear.forEach(function (g) { years[g.pay_date ? String(g.pay_date).slice(0, 4) : 'Unknown'] = 1; }); years[yr] = 1;
		var inY = function (g) { var gy = g.pay_date ? String(g.pay_date).slice(0, 4) : 'Unknown'; return Y === 'all' || gy === Y; };
		var list = S.gear.filter(function (g) { return inY(g) && (!q || ((g.first || '') + ' ' + (g.last || '') + ' ' + g.description).toLowerCase().indexOf(q) > -1); });
		var tY = 0, nY = 0, tAll = 0, buyers = {}; S.gear.forEach(function (g) { tAll += +g.amount; if (inY(g)) { tY += +g.amount; nY++; buyers[g.person_id] = 1; } });
		var rows = list.map(function (g) {
			var nm = ((g.first || '') + ' ' + (g.last || '')).trim(), ini = (String(g.first || '?').charAt(0) + String(g.last || '').charAt(0)).toUpperCase();
			var meta = [g.pay_date ? esc(dt(g.pay_date)) : 'Date unknown', g.method ? esc(g.method) : '', g.placed_by ? 'by ' + esc(g.placed_by) : ''].filter(Boolean).join(' · ');
			return '<div class="mj-orow"><span class="mj-avatar">' + esc(ini) + '</span><div class="mj-orow__main"><div class="mj-orow__top"><span class="mj-item__title" data-open="' + g.person_id + '">' + esc(nm) + '</span><b class="mj-orow__amt">' + money(g.amount) + '</b></div><div class="mj-orow__gear">' + esc(g.description || '—') + '</div><div class="mj-item__sub">' + meta + '</div></div></div>';
		}).join('');
		var yOpts = [[yr, yr + ' (this year)']].concat(Object.keys(years).filter(function (k) { return k !== yr; }).sort().reverse().map(function (k) { return [k, k === 'Unknown' ? 'No date' : k + ' — archive']; })).concat([['all', 'All years']]);
		var lbl = Y === 'all' ? 'All years' : Y === 'Unknown' ? 'No date' : Y;
		var nb = Object.keys(buyers).length;
		return '<div class="mj-tbar"><p class="mj-desc">Gear students buy through us. Each order is saved to that student’s profile.</p><button class="mj-b mjd-c-gold" data-act="newsorder">' + ic('plus') + 'New Student Order</button></div>' +
			'<div class="mj-cards mj-kcards"><section class="mj-card mj-card--students"><div class="mj-card__head"><div class="mj-card__name"><span class="mj-card__icon">' + ic('dollar', 16) + '</span>Gear sales · ' + esc(lbl) + '</div></div><div class="mj-card__body"><div class="mj-kpi"><span class="mj-kpi__num">' + money(tY) + '</span></div><div class="mj-card__sub">' + nY + ' item' + (nY === 1 ? '' : 's') + ' sold</div></div></section>' +
			'<section class="mj-card mj-card--training"><div class="mj-card__head"><div class="mj-card__name"><span class="mj-card__icon">' + ic('orders', 16) + '</span>All-time gear sales</div></div><div class="mj-card__body"><div class="mj-kpi"><span class="mj-kpi__num">' + money(tAll) + '</span></div><div class="mj-card__sub">' + S.gear.length + ' items</div></div></section>' +
			'<section class="mj-card mj-card--sales"><div class="mj-card__head"><div class="mj-card__name"><span class="mj-card__icon">' + ic('active', 16) + '</span>Buyers · ' + esc(lbl) + '</div></div><div class="mj-card__body"><div class="mj-kpi"><span class="mj-kpi__num">' + nb + '</span><span class="mj-kpi__unit">buyer' + (nb === 1 ? '' : 's') + '</span></div><div class="mj-card__sub">Tap a name to see their history</div></div></section></div>' +
			'<section class="mj-card" style="margin-top:18px"><div class="mj-card__head mj-card__head--bordered mj-ohead"><div class="mj-card__name">Student orders <em class="mj-pill">' + list.length + '</em></div><div class="mj-ohead__tools"><select id="mjd-gy" class="mj-sel" aria-label="Year">' + opts(yOpts, Y) + '</select><label class="mj-search">' + ic('search', 16) + '<input type="search" id="mjd-gq" placeholder="Search gear or buyer…" value="' + esc(S.gq || '') + '"></label></div></div>' +
			'<div class="mj-olist">' + (rows || '<div class="mj-card__empty">No gear sales for ' + esc(lbl) + '.</div>') + '</div></section>';
	}

	/* ── ATTENDANCE ── */
	function monthLabel(m) { return new Date(m + '-15T12:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
	function attCredits(list, n) {
		var mine = list.filter(function (a) { return a.name === n; });
		var days = mine.filter(function (a) { return a.kind !== 'hours'; }).length, hrs = mine.filter(function (a) { return a.kind === 'hours'; }).reduce(function (t, a) { return t + (+a.hours || 0); }, 0);
		return { days: days, hrs: Math.round(hrs * 100) / 100, credit: days + hrs / (+MJD.hpd || 6) };
	}
	function fmtH(h) { return (Math.round(h * 100) / 100) + ' hr' + (h === 1 ? '' : 's'); }
	function vAtt() {
		var ps = periods(), m = S.attMonth || 'q', per = ps.find(function (x) { return x[0] === m; }) || ps[0];
		var inPeriod = function (d) { var mm = d.slice(0, 7); return mm >= per[2] && mm <= per[3]; };
		var all = S.att.filter(function (a) { return inPeriod(a.att_date); });
		var rows = all.filter(function (a) { return !S.attWho || a.name === S.attWho; });
		var sum = per[4] && S.attSum[per[4]];
		var plabel = per[0] === 'q' ? 'this quarter' : per[0] === 'lq' ? 'last quarter' : per[0] === 'all' ? 'all time' : per[1].replace(/ \(.*$/, '').replace(/^.*— /, '');
		var cards = MJD.team.map(function (n, i) {
			var c = ['sky', 'gold', 'orange', 'teal'][i % 4], x = attCredits(all, n), d = sum ? Math.max(x.days, +(sum.counts[n] || 0)) : x.days;
			return '<div class="mjd-stat ' + c + '" data-attwho="' + esc(n) + '"' + (S.attWho === n ? ' style="outline:4px solid #16303A;outline-offset:2px"' : '') + '><span class="l">' + esc(n) + '</span><b>' + d + '</b><span class="s">field day' + (d === 1 ? '' : 's') + (x.hrs ? ' + ' + fmtH(x.hrs) + ' other' : '') + ' · ' + esc(plabel) + '</span></div>';
		}).join('');
		var list = rows.map(function (a) {
			var hrs = a.kind === 'hours';
			return '<tr><td style="white-space:nowrap"><b>' + esc(dt(a.att_date)) + '</b><div class="mjd-m">' + esc(new Date(a.att_date + 'T12:00').toLocaleDateString('en-US', { weekday: 'long' })) + '</div></td><td><b>' + esc(a.name) + '</b></td>' +
				'<td>' + (hrs ? '<span class="mjd-tag gold">⏱ ' + esc(fmtH(+a.hours)) + '</span><div class="mjd-m">' + esc(a.category) + '</div>' : '<span class="mjd-tag web">🪂 Field day</span><div class="mjd-m">' + esc(a.field) + '</div>') + '</td><td>' + esc(a.comments || '') + '</td>' +
				'<td style="white-space:nowrap"><button class="mjd-link" data-attedit="' + a.id + '">Edit</button> · <button class="mjd-link" data-attdel="' + a.id + '">✕</button></td></tr>';
		}).join('');
		var mOpts = ps.map(function (x) { return [x[0], x[1]]; });
		return '<div class="mjd-stats">' + cards + '</div>' +
			'<div class="mjd-grid"><div class="mjd-card"><h3>Instructor Attendance</h3><p class="mjd-sub">Field days and other logged hours. Every ' + (+MJD.hpd || 6) + ' hours of other work counts as one attendance day. Click a name above to filter.</p>' +
			'<div class="mjd-tools"><select id="att-m">' + opts(mOpts, m) + '</select>' + (S.attWho ? '<button class="mjd-btn sm" data-attwho="">Show everyone</button>' : '') + '</div>' +
			(sum ? '<div class="mjd-warn">The field-day counts above use the totals you entered for ' + esc(per[4].replace('-', ' ')) + '. Entries below are only the ones logged with dates.</div>' : '') +
			'<div class="mjd-tw"><table class="mjd-t"><thead><tr><th>Date</th><th>Who</th><th>Type</th><th>What happened</th><th></th></tr></thead><tbody>' + (list || '<tr><td colspan="5" class="mjd-empty">Nothing logged for this period.</td></tr>') + '</tbody></table></div></div>' +
			'<div class="mjd-card"><h3>Log Attendance</h3><p class="mjd-sub">Instructors use <a href="' + esc(MJD.logUrl) + '" target="_blank">' + esc(MJD.logUrl) + '</a> on their phones — no login needed. You can also add one here.</p>' + attForm({}) + '</div></div>';
	}
	function attForm(a) {
		var hrs = a.kind === 'hours';
		return '<div class="mjd-f"><label>Name</label><select id="at-name">' + opts(MJD.team, a.name) + '</select></div>' +
			(a.id ? '<input type="hidden" id="at-kind" value="' + (hrs ? 'hours' : 'field') + '">' : '<div class="mjd-f"><label>Type</label><select id="at-kind">' + opts([['field', '🪂 Field day'], ['hours', '⏱ Other hours']], hrs ? 'hours' : 'field') + '</select></div>') +
			'<div class="mjd-2"><div class="mjd-f at-fld"' + (hrs ? ' style="display:none"' : '') + '><label>Field</label><select id="at-field">' + opts(MJD.fields, a.field) + '</select></div>' +
			'<div class="mjd-f at-hrs"' + (hrs ? '' : ' style="display:none"') + '><label>Hours</label><input type="number" id="at-hours" min="0.25" max="24" step="0.25" value="' + esc(a.hours ? +a.hours : '') + '"></div>' +
			'<div class="mjd-f"><label>Date</label><input type="date" id="at-date" value="' + esc(a.att_date || today()) + '"></div></div>' +
			'<div class="mjd-f at-hrs"' + (hrs ? '' : ' style="display:none"') + '><label>What was the time for?</label><select id="at-cat">' + opts(MJD.hourCats, a.category) + '</select></div>' +
			'<div class="mjd-f"><label id="at-cl">' + (hrs ? 'Exactly what did you do?' : 'What happened') + '</label><textarea id="at-c" rows="3">' + esc(a.comments || '') + '</textarea></div>' +
			'<div class="mjd-tools"><button class="mjd-btn pri" id="at-save" data-attid="' + (a.id || 0) + '">' + (a.id ? 'Save Changes' : 'Log It') + '</button><span class="mjd-status" id="at-st" style="margin:0"></span></div>';
	}
	/* ── LOG ATTENDANCE pop-up (same as the /log page, without leaving the desk) ── */
	function logModal() {
		var radios = function (nm, list, cls, cur) { return '<div class="' + cls + '">' + list.map(function (v) { var val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v; return '<label' + (cls.indexOf('mj-choices') === 0 ? ' class="mj-choice"' : '') + '><input type="radio" name="' + nm + '" value="' + esc(val) + '"' + (val === cur ? ' checked' : '') + '><span>' + esc(lab) + '</span></label>'; }).join('') + '</div>'; };
		var yest = (function () { var d = new Date(); d.setDate(d.getDate() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
		sm('<form class="mj-lg2" id="lg2" onsubmit="return false"><div class="mj-label">Instructors</div><h1 class="mj-lg2__title">Log Attendance</h1><p class="mj-lg2__sub">Log a day in the field, or other hours you put in.</p><div class="mj-lg2__fields">' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label">Your name</legend>' + radios('lg-name', MJD.team, 'mj-choices', '') + '</fieldset>' +
			'<div class="mj-lg2__pair"><fieldset class="mj-lg2__f"><legend class="mj-label">What are you logging?</legend>' + radios('lg-kind', [['field', 'Field day'], ['hours', 'Other hours']], 'mj-segin', 'field') + '</fieldset>' +
			'<fieldset class="mj-lg2__f lg-fld"><legend class="mj-label">Field</legend>' + radios('lg-field', MJD.fields, 'mj-segin', '') + '</fieldset>' +
			'<fieldset class="mj-lg2__f lg-hrs" hidden><legend class="mj-label">How many hours?</legend><input type="number" class="mj-in2" id="lg-h" min="0.25" max="24" step="0.25" inputmode="decimal" placeholder="e.g. 2.5"></fieldset></div>' +
			'<fieldset class="mj-lg2__f lg-hrs" hidden><legend class="mj-label">What was the time for?</legend>' + radios('lg-cat', MJD.hourCats, 'mj-choices mj-choices--auto', '') + '</fieldset>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label">Date</legend><div class="mj-lg2__date"><button type="button" class="mj-quick2 is-active" data-d="' + today() + '">Today</button><button type="button" class="mj-quick2" data-d="' + yest + '">Yesterday</button><input type="date" class="mj-in2" id="lg-date" value="' + today() + '" max="' + today() + '"></div></fieldset>' +
			'<fieldset class="mj-lg2__f"><legend class="mj-label mj-lg2__split"><span id="lg-cl">What happened today?</span><small>Optional</small></legend><textarea id="lg-c" rows="3" class="mj-in2 mj-in2--ta"></textarea></fieldset></div>' +
			'<div class="mj-lg2__foot"><div class="mj-lg2__sum" id="lg-sum"></div><button type="button" class="mj-btn mj-btn--orange mj-lg2__go" id="lg-go" disabled><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg><span>Log my day</span></button></div>' +
			'<div class="mjd-status" id="lg-st"></div><div class="mj-lg2__hint">Instructors can also log from their phone at <a href="' + esc(MJD.logUrl) + '" target="_blank" rel="noopener">' + esc(MJD.logUrl.replace(/^https?:\/\//, '')) + '</a></div></form>');
		$('#mjd-sm').classList.add('mj-lgmodal');
		var val = function (n) { var r = $('input[name="' + n + '"]:checked'); return r ? r.value : ''; };
		var dlab = function () { var v = $('#lg-date').value; return v === today() ? 'today' : v === yest ? 'yesterday' : (v ? new Date(v + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''); };
		var sync = function () {
			var h = val('lg-kind') === 'hours', who = val('lg-name'), fld = val('lg-field'), hrs = $('#lg-h').value;
			$$('.lg-hrs').forEach(function (x) { x.hidden = !h; }); $('.lg-fld').hidden = h;
			$('#lg-cl').textContent = h ? 'Exactly what did you do?' : 'What happened today?';
			$('#lg-c').placeholder = h ? 'e.g. Rebuilt the trike cage and replaced a prop.' : 'e.g. Calm morning — first flight for a student, 4 kiting.';
			$('#lg-go span').textContent = h ? 'Log my hours' : 'Log my day';
			var ready = !!who && (h ? +hrs > 0 : !!fld) && !!$('#lg-date').value;
			$('#lg-go').disabled = !ready;
			var what = h ? 'other hours' : 'field day';
			$('#lg-sum').innerHTML = !who ? 'Pick your name' + (h ? ' and hours' : ' and field') + ' to log a <b>' + what + '</b> · ' + dlab()
				: (!h && !fld) ? '<b>' + esc(who) + '</b> · pick a field · ' + dlab() : (h && !(+hrs > 0)) ? '<b>' + esc(who) + '</b> · how many hours? · ' + dlab()
				: 'Logging <b>' + esc(who) + '</b> · ' + (h ? esc(hrs) + ' hr' + (+hrs === 1 ? '' : 's') : 'field day at <b>' + esc(fld) + '</b>') + ' · ' + dlab();
		};
		$('#lg2').addEventListener('change', sync); $('#lg-h').addEventListener('input', sync);
		$$('.mj-quick2').forEach(function (b) { b.onclick = function () { $('#lg-date').value = b.getAttribute('data-d'); $$('.mj-quick2').forEach(function (x) { x.classList.toggle('is-active', x === b); }); sync(); }; });
		$('#lg-date').addEventListener('input', function () { $$('.mj-quick2').forEach(function (x) { x.classList.toggle('is-active', x.getAttribute('data-d') === $('#lg-date').value); }); sync(); });
		sync();
		$('#lg-go').onclick = function () {
			var b = this, h = val('lg-kind') === 'hours';
			if (b.disabled) return; b.disabled = true;
			api('att_save', { kind: h ? 'hours' : 'field', name: val('lg-name'), field: val('lg-field'), hours: $('#lg-h').value, category: val('lg-cat'), att_date: $('#lg-date').value, comments: $('#lg-c').value })
				.then(function () { smClose(); toast((h ? 'Hours logged' : 'Field day logged') + ' for ' + val('lg-name') + ' ✓'); load(); })
				.catch(function (e) { b.disabled = false; $('#lg-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
	}

	function attBox(noAfter) {
		var b = $('#mj-attbox'); if (!b) return;
		b.innerHTML = vAtt(); decorate(b);
		var am = $('#att-m', b); if (am) am.onchange = function () { S.attMonth = am.value; render(); };
	}
	function attSave(btn) {
		var kind = $('#at-kind') ? $('#at-kind').value : 'field';
		api('att_save', { id: +btn.getAttribute('data-attid'), kind: kind, name: $('#at-name').value, field: $('#at-field').value, hours: $('#at-hours').value, category: $('#at-cat').value, att_date: $('#at-date').value, comments: $('#at-c').value })
			.then(function () { if ($('#mjd-sm').classList.contains('open')) smClose(); toast(kind === 'hours' ? 'Hours logged ✓' : 'Field day logged ✓'); load(); })
			.catch(function (e) { $('#at-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
	}

	/* ── ATTENDANCE REPORT (percentages) ── */
	function periods() {
		var c = today(), y = +c.slice(0, 4), q = Math.floor((+c.slice(5, 7) - 1) / 3), out = [];
		function qr(yy, qq) { var a = yy + '-' + String(qq * 3 + 1).padStart(2, '0'), b = yy + '-' + String(qq * 3 + 3).padStart(2, '0'); return [a, b]; }
		var t = qr(y, q); out.push(['q', 'This quarter — Q' + (q + 1) + ' ' + y, t[0], t[1], y + '-Q' + (q + 1)]);
		var pq = q - 1, py = y; if (pq < 0) { pq = 3; py--; } var l = qr(py, pq); out.push(['lq', 'Last quarter — Q' + (pq + 1) + ' ' + py, l[0], l[1], py + '-Q' + (pq + 1)]);
		var p2 = pq - 1, p2y = py; if (p2 < 0) { p2 = 3; p2y--; } var l2 = qr(p2y, p2); out.push(['pq2', 'Quarter before — Q' + (p2 + 1) + ' ' + p2y, l2[0], l2[1], p2y + '-Q' + (p2 + 1)]);
		out.forEach(function (o) { if (o[4]) o[1] += ' (' + monthLabel(o[2]).slice(0, 3) + '–' + monthLabel(o[3]).slice(0, 3) + ')'; });
		Object.keys(S.attSum || {}).sort().reverse().forEach(function (k) { if (out.some(function (o) { return o[4] === k; })) return; var yy = +k.slice(0, 4), qq = +k.slice(-1) - 1, rr = qr(yy, qq); out.push([k, 'Q' + (qq + 1) + ' ' + yy + ' (entered totals)', rr[0], rr[1], k]); });
		out.push(['y', 'This year — ' + y, y + '-01', y + '-12']);
		out.push(['all', 'All time', '0000-00', '9999-99']);
		var months = {}; S.att.forEach(function (a) { months[a.att_date.slice(0, 7)] = 1; });
		Object.keys(months).sort().reverse().forEach(function (m) { out.push([m, monthLabel(m), m, m]); });
		return out;
	}
	function attReport(key) {
		var ps = periods(), per = ps.find(function (x) { return x[0] === key; }) || ps[0];
		var allRows = S.att.filter(function (a) { var m = a.att_date.slice(0, 7); return m >= per[2] && m <= per[3]; });
		var rows = allRows.filter(function (a) { return a.kind !== 'hours'; }), HPD = +MJD.hpd || 6;
		var days = {}; rows.forEach(function (a) { days[a.att_date] = 1; });
		var total = Object.keys(days).length, sum = per[4] && S.attSum[per[4]];
		if (sum) total = Math.max(total, +sum.total);
		var stats = MJD.team.map(function (n) {
			var mine = rows.filter(function (a) { return a.name === n; }), byField = {};
			mine.forEach(function (a) { byField[a.field] = (byField[a.field] || 0) + 1; });
			var dcount = sum ? Math.max(mine.length, +(sum.counts[n] || 0)) : mine.length;
			var hrs = allRows.filter(function (a) { return a.name === n && a.kind === 'hours'; }).reduce(function (t, a) { return t + (+a.hours || 0); }, 0);
			var credit = dcount + hrs / HPD;
			return { n: n, d: dcount, hrs: Math.round(hrs * 100) / 100, credit: credit, pct: total ? Math.round(credit / total * 100) : 0, f: sum ? {} : byField, last: mine.length ? mine.map(function (a) { return a.att_date; }).sort().pop() : '' };
		}).sort(function (a, b) { return b.pct - a.pct || a.n.localeCompare(b.n); });
		var cols = ['#40BEE2', '#F9D085', '#F1854E', '#9FD9DA'];
		var cards = stats.map(function (x, i) {
			return '<div class="mjd-ar"><div class="top"><b>' + esc(x.n) + '</b><span class="pct">' + x.pct + '%</span></div>' +
				'<div class="bar"><i style="width:' + Math.min(100, x.pct) + '%;background:' + cols[MJD.team.indexOf(x.n) % 4] + '"></i></div>' +
				'<div class="mjd-m">' + x.d + ' of ' + total + ' training day' + (total === 1 ? '' : 's') + (x.hrs ? ' + <b>' + esc(fmtH(x.hrs)) + '</b> other (= ' + (Math.round(x.hrs / HPD * 10) / 10) + ' day' + (x.hrs / HPD === 1 ? '' : 's') + ')' : '') + (Object.keys(x.f).length ? ' · ' + Object.keys(x.f).map(function (k) { return esc(k) + ' ' + x.f[k]; }).join(' · ') : '') + (x.last ? ' · last out ' + esc(dt(x.last)) : '') + '</div></div>';
		}).join('');
		$('#mjd-pm-body').innerHTML = '<button class="mjd-x" data-close="pm">×</button>' +
			'<div class="mjd-card" style="border:0;box-shadow:none;padding:0"><div class="mjd-ch" style="margin:0 0 18px;border:2px solid var(--ink);border-radius:12px"><div><h3>Instructor Attendance</h3><p class="mjd-sub">Each person’s share of the days we trained, plus other logged hours (<span class="mjd-hpd">every <input type="number" id="ar-hpd" min="1" max="24" step="0.5" value="' + HPD + '"> hrs = 1 day</span>). A training day is any date someone logged a field day at <b>' + esc(MJD.logUrl.replace(/^https?:\/\//, '')) + '</b>.</p></div>' +
			'<select id="ar-p" style="flex:0 1 300px">' + opts(ps.map(function (x) { return [x[0], x[1]]; }), per[0]) + '</select></div>' +
			(sum ? '<div class="mjd-warn" style="margin-bottom:14px">These are totals you entered for ' + esc(per[4].replace('-', ' ')) + ' (no individual dates).</div>' : '') +
			'<div class="mjd-arsum"><div><span>Training days</span><b>' + total + '</b></div><div><span>Days logged</span><b>' + stats.reduce(function (a, x) { return a + x.d; }, 0) + '</b></div><div><span>Average attendance</span><b>' + (stats.length ? Math.round(stats.reduce(function (a, x) { return a + x.pct; }, 0) / stats.length) : 0) + '%</b></div></div>' +
			(total ? '<div class="mjd-arlist">' + cards + '</div>' : '<div class="mjd-empty">No field days logged for this period yet.</div>') +
			'<div class="mjd-tools" style="margin-top:18px">' + (per[4] ? '<button class="mjd-btn" id="ar-edit">✎ ' + (sum ? 'Edit' : 'Enter') + ' totals for ' + esc(per[4].replace('-', ' ')) + '</button>' : '') + '<button class="mjd-btn" data-tab="att" data-close="pm">See every logged day →</button><a class="mjd-btn mjd-log" href="' + esc(MJD.logUrl) + '" style="margin-left:0">📋 Log Attendance</a></div></div>';
		$('#mjd-pm').classList.add('open');
		$('#ar-p').onchange = function () { attReport(this.value); };
		var hp = $('#ar-hpd'); if (hp) hp.onchange = function () { var v = +hp.value; if (!(v >= 1)) return; api('att_hpd', { hours_per_day: v }).then(function (r) { MJD.hpd = r.hours_per_day; attReport(per[0]); render(); toast('Now ' + r.hours_per_day + ' hours = 1 attendance day'); }); };
		var ed = $('#ar-edit');
		if (ed) ed.onclick = function () {
			var k = per[4], cur = S.attSum[k] || { total: total, counts: {} };
			sm('<h3>Totals for ' + esc(k.replace('-', ' ')) + '</h3><p class="mjd-sub">Use this for a quarter you tracked somewhere else. Percentages = each person’s days ÷ training days.</p>' +
				'<div class="mjd-f"><label>Training days in the quarter</label><input type="number" min="1" id="as-total" value="' + esc(cur.total || '') + '"></div><div class="mjd-2">' +
				MJD.team.map(function (n) { return '<div class="mjd-f"><label>' + esc(n) + ' — days</label><input type="number" min="0" data-asn="' + esc(n) + '" value="' + esc(cur.counts[n] != null ? cur.counts[n] : '') + '"></div>'; }).join('') + '</div>' +
				'<div class="mjd-tools" style="justify-content:flex-end">' + (S.attSum[k] ? '<button class="mjd-btn danger" id="as-clear">Remove totals</button>' : '') + '<button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="as-save">Save</button></div>');
			$('#as-save').onclick = function () { var c = {}; $$('[data-asn]').forEach(function (i) { c[i.getAttribute('data-asn')] = i.value; });
				api('att_summary_save', { key: k, total: $('#as-total').value, counts: c }).then(function (r) { S.attSum = r; smClose(); attReport(per[0]); toast('Totals saved'); }); };
			var cl = $('#as-clear'); if (cl) cl.onclick = function () { api('att_summary_save', { key: k, clear: 1 }).then(function (r) { S.attSum = r; smClose(); attReport(per[0]); }); };
		};
	}

	/* ── after render: wire inputs that re-render ── */
	function afterRender() {
		var lq = $('#mjd-lq'); if (lq) lq.oninput = function () { S.lq = lq.value; var pos = lq.selectionStart; render(); var n = $('#mjd-lq'); n.focus(); n.setSelectionRange(pos, pos); };
		var lf = $('#mjd-lf'); if (lf) lf.onchange = function () { S.leadF = lf.value; render(); };
		var sq = $('#mjd-sq'); if (sq) sq.oninput = function () { S.sq = sq.value; var pos = sq.selectionStart; render(); var n = $('#mjd-sq'); n.focus(); n.setSelectionRange(pos, pos); };
		var gy = $('#mjd-gy'); if (gy) gy.onchange = function () { S.gearY = gy.value; render(); };
		var gq = $('#mjd-gq'); if (gq) gq.oninput = function () { S.gq = gq.value; var pos = gq.selectionStart; render(); var n = $('#mjd-gq'); n.focus(); n.setSelectionRange(pos, pos); };
		var aq = $('#mjd-aq'); if (aq) aq.oninput = function () { S.aq = aq.value; var pos = aq.selectionStart; render(); var n = $('#mjd-aq'); n.focus(); n.setSelectionRange(pos, pos); };
		var am = $('#att-m'); if (am) am.onchange = function () { S.attMonth = am.value; render(); };
		var gf = $('#mjd-gsf'); if (gf) gf.onchange = function () { S.gsF = gf.value; render(); };
		var isx = $('#inv-sess'); if (isx) {
			if (!S.sess) loadSess().then(render);
			isx.onchange = function () { S.invSess = +isx.value; var st = $('#inv-subject'); if (st) delete st.dataset.touched; S.invTouched = 0; invFill(); };
			if (S.invSess && S.invFilled !== S.invSess) { S.invFilled = S.invSess; setTimeout(invFill, 0); }
		}
		var loc = $('#inv-loc'); if (loc) { var sync = function () { $('#inv-loc2').style.display = loc.value === '__other' ? 'block' : 'none'; }; loc.onchange = sync; sync(); }
		['inv', 'gs'].forEach(function (k) {
			var subj = $('#' + k + '-subject'); if (!subj) return;
			var auto = function () {
				if (subj.dataset.touched) return;
				var d = $('#' + k + '-date').value, t = $('#' + k + '-start').value, s = k === 'inv' ? 'Intro Class Coming Up' : 'Ground School on Zoom';
				if (d) s += ' — ' + new Date(d + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
				if (t) s += ' at ' + new Date('2000-01-01T' + t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
				subj.value = s;
			};
			if (S[k + 'Touched']) subj.dataset.touched = 1;
			subj.oninput = function () { subj.dataset.touched = 1; S[k + 'Touched'] = 1; };
			['-date', '-start'].forEach(function (x) { $('#' + k + x).addEventListener('change', auto); });
			if (!subj.value) auto();
		});
	}

	/* ── composers: preview / test / send ── */
	function invData() {
		var loc = $('#inv-loc').value === '__other' ? $('#inv-loc2').value : $('#inv-loc').value;
		return { sess_id: $('#inv-sess') ? +$('#inv-sess').value : 0, date: $('#inv-date').value, start: $('#inv-start').value, end: $('#inv-end').value, location: loc, details: $('#inv-details').value, note: $('#inv-note').value, subject: $('#inv-subject').value };
	}
	function gsData() {
		return { date: $('#gs-date').value, start: $('#gs-start').value, end: $('#gs-end').value, zoom: $('#gs-zoom').value, meeting: $('#gs-meeting').value, passcode: $('#gs-passcode').value, topic: $('#gs-topic').value, note: $('#gs-note').value, subject: $('#gs-subject').value };
	}
	function cdata(k) { return k === 'inv' ? invData() : gsData(); }
	function cstatus(k, html) { $('#' + k + '-status').innerHTML = html; }
	function preview(k) {
		api(k === 'inv' ? 'invite_preview' : 'gs_preview', cdata(k)).then(function (r) {
			var f = $('#' + k + '-frame'); f.style.display = 'block'; f.srcdoc = r.html; cstatus(k, 'Preview — subject: <em>' + esc(r.subject) + '</em>');
		});
	}
	function testSend(k) {
		var d = cdata(k); d.test = 1; cstatus(k, 'Sending test…');
		api(k === 'inv' ? 'invite_send' : 'gs_send', d).then(function (r) {
			cstatus(k, r[0] && r[0].ok ? '<span class="ok">✓ Test sent to ' + esc(r[0].email) + '</span>' : '<span class="bad">Test failed — check the site’s email settings.</span>');
		}).catch(function (e) { cstatus(k, '<span class="bad">' + esc(e.message) + '</span>'); });
	}
	function bulkSend(k) {
		var sel = k === 'inv' ? S.sel : S.gsSel, d = cdata(k);
		var ids = Object.keys(sel).filter(function (i) { return sel[i]; }).map(Number);
		if (!ids.length) return;
		if (!confirm('Send "' + d.subject + '" to ' + ids.length + (ids.length === 1 ? ' person' : ' people') + '?')) return;
		var btn = $('[data-send="' + k + '"]'), prog = $('#' + k + '-prog'), i = 0, ok = 0, bad = [];
		btn.disabled = true; prog.style.display = 'block';
		(function next() {
			if (i >= ids.length) {
				cstatus(k, '<span class="ok">✓ Sent ' + ok + ' of ' + ids.length + '.</span>' + (bad.length ? ' <span class="bad">Failed: ' + esc(bad.join(', ')) + '</span>' : ''));
				if (k === 'inv') S.sel = {}; else S.gsSel = {};
				var keepStatus = $('#' + k + '-status').innerHTML; load().then(function () { var s = $('#' + k + '-status'); if (s) s.innerHTML = keepStatus; });
				return;
			}
			var batch = ids.slice(i, i + 5), dd = Object.assign({}, d, { ids: batch });
			api(k === 'inv' ? 'invite_send' : 'gs_send', dd).then(function (r) { r.forEach(function (x) { x.ok ? ok++ : bad.push(x.email || ('#' + x.id)); }); })
				.catch(function (e) { cstatus(k, '<span class="bad">' + esc(e.message) + '</span>'); i = ids.length; })
				.then(function () { i += batch.length; $('i', prog).style.width = Math.min(100, Math.round(i / ids.length * 100)) + '%'; if (i < ids.length) cstatus(k, 'Sending… ' + i + ' / ' + ids.length); next(); });
		})();
	}

	/* ── small modal: payment ── */
	function sm(html) { $('#mjd-sm').classList.remove('wide', 'mj-wxmodal', 'mj-lgmodal'); var b = $('#mjd-sm-body'); b.innerHTML = '<button class="mjd-x" data-close="sm">×</button>' + html; delete b.dataset.dec; decorate($('#mjd-sm')); $('#mjd-sm').classList.add('open'); }
	function smClose() { $('#mjd-sm').classList.remove('open'); }
	var DEF = { intro: 250, training: 3000, 'day-rate': 400, conversion: 500 };
	function payModal(pid, cat, edit) {
		var p = S.people.find(function (x) { return x.id === pid; }) || S.cur && S.cur.person || {};
		var title = edit ? 'Edit Payment' : cat === 'intro' ? 'Intro Paid' : cat === 'training' ? 'Full Course Paid' : cat === 'gear' ? 'Gear Purchased' : 'Record a Payment';
		edit = edit || {};
		sm('<h3>' + title + '</h3><p class="mjd-sub">' + esc(name(p)) + '</p>' +
			'<div class="mjd-2"><div class="mjd-f"><label>What for</label><select id="py-cat">' + catOpts(cat) + '</select></div><div class="mjd-f"><label>Amount ($)</label><input type="number" step="0.01" id="py-amt" value="' + esc(edit.amount != null ? edit.amount : (DEF[cat] || '')) + '"></div></div>' +
			'<div class="mjd-2"><div class="mjd-f"><label>Paid with</label><select id="py-method">' + opts(MJD.methods, edit.method || 'Cash') + '</select></div><div class="mjd-f"><label>Date</label><input type="date" id="py-date" value="' + esc(edit.id && !edit.pay_date ? '' : (edit.pay_date || today())) + '"><label class="mjd-check" style="margin-top:6px;font-size:12px"><input type="checkbox" id="py-unk"' + (edit.id && !edit.pay_date ? ' checked' : '') + '> Date unknown</label></div></div>' +
			'<div class="mjd-f"><label>' + (cat === 'gear' ? 'What gear did they buy?' : 'Description (optional)') + '</label><input type="text" id="py-desc" placeholder="e.g. Ozone Roadster 4 wing" value="' + esc(edit.description || '') + '"></div>' +
			(edit.id ? '' : cat === 'training' ? '<p class="mjd-m">They’ll move to <b>Students</b> as “Kiting / Ground Work”.</p>' : cat === 'intro' ? '<p class="mjd-m">They’ll move to <b>Intro Done</b>.</p>' : '') +
			'<div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button>' + (cat === 'gear' && !edit.id ? '<button class="mjd-btn" id="py-more">Save &amp; Add Another Item</button>' : '') + '<button class="mjd-btn pri" id="py-save">Save</button></div><div class="mjd-status" id="py-st"></div>');
		if (cat === 'gear' && !edit.id) $('#py-desc').focus();
		$('#py-cat').onchange = function () { if (DEF[this.value]) $('#py-amt').value = DEF[this.value]; };
		var more = $('#py-more');
		if (more) more.onclick = function () {
			if (!$('#py-desc').value) { $('#py-st').innerHTML = '<span class="bad">Enter what they bought.</span>'; return; }
			api('payment_add', { person_id: pid, category: 'gear', amount: $('#py-amt').value, method: $('#py-method').value, pay_date: $('#py-date').value, description: $('#py-desc').value })
				.then(function (r) { $('#py-st').innerHTML = '<span class="ok">✓ Saved ' + esc($('#py-desc').value) + ' — add the next item.</span>'; $('#py-desc').value = ''; $('#py-amt').value = ''; $('#py-desc').focus(); if (S.cur && S.cur.person.id === pid) { S.cur = r; renderPerson(); } load(); })
				.catch(function (e) { $('#py-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
		$('#py-save').onclick = function () {
			if ($('#py-cat').value === 'gear' && !$('#py-desc').value) { $('#py-st').innerHTML = '<span class="bad">Enter what they bought.</span>'; return; }
			var d = { id: edit.id, person_id: pid, category: $('#py-cat').value, amount: $('#py-amt').value, method: $('#py-method').value, pay_date: $('#py-date').value, date_unknown: $('#py-unk').checked ? 1 : 0, description: $('#py-desc').value };
			if (!(+d.amount > 0)) { $('#py-st').innerHTML = '<span class="bad">Enter an amount.</span>'; return; }
			var isCourse = ['training', 'day-rate', 'conversion'].indexOf(d.category) > -1;
			var fast = !edit.id && ((d.category === 'intro' && S.tab === 'leads') || (isCourse && S.tab === 'intro')), lp = S.people.find(function (x) { return x.id === pid; }), undo = lp ? { s: lp.status, p: lp.paid_intro, t: lp.paid_training } : null;
			if (fast) {
				/* Turn the button green right away, then slide them over to the next list. */
				S.flash[pid] = 1;
				if (lp && d.category === 'intro') { lp.paid_intro = 1; lp.status = 'intro'; }
				if (lp && isCourse) { lp.paid_training = 1; lp.status = 'active'; }
				smClose(); render(); toast(d.category === 'intro' ? 'Intro paid ✓ — moving to Intro Done' : 'Full course paid ✓ — moving to Students');
			} else { this.disabled = true; }
			var started = Date.now();
			api(edit.id ? 'payment_update' : 'payment_add', d)
				.then(function (r) {
					if (fast) {
						setTimeout(function () {
							var row = $('[data-row="' + pid + '"]'); if (row) row.classList.add('mjd-gone');
							setTimeout(function () { delete S.flash[pid]; refreshAfter(r); }, 450);
						}, Math.max(0, 2500 - (Date.now() - started)));
						return;
					}
					smClose(); toast('Payment saved — ' + money(d.amount)); refreshAfter(r);
				})
				.catch(function (e) {
					if (fast) { delete S.flash[pid]; if (lp && undo) { lp.status = undo.s; lp.paid_intro = undo.p; lp.paid_training = undo.t; } render(); toast('Couldn’t save: ' + e.message, true); return; }
					$('#py-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; $('#py-save').disabled = false;
				});
		};
	}
	function refreshAfter(personData) { load(); if (personData && personData.person && $('#mjd-pm').classList.contains('open')) { S.cur = personData; renderPerson(); } }

	/* ── quote modal ── */
	function quoteModal(pid, q) {
		q = q || { title: 'Gear Quote', items: [{ desc: '', qty: 1, price: '' }], discount: 0, notes: '', valid_until: '' };
		var row = function (it) { return '<div class="row"><input type="text" class="qi-d" placeholder="Item — e.g. Scout Carbon paramotor" value="' + esc(it.desc) + '"><input type="number" class="qi-q" min="0" step="1" value="' + esc(it.qty) + '"><input type="number" class="qi-p" step="0.01" placeholder="Price" value="' + esc(it.price) + '"><button class="mjd-link qi-x" title="Remove">✕</button></div>'; };
		var pool = S.people.filter(function (x) { return x.status !== 'archived'; }).sort(function (a, b) { return name(a).localeCompare(name(b)); });
		var pick = !pid;
		var who = pick ? '<div class="mjd-f"><label>Student / customer</label><input type="text" id="q-who" list="q-wholist" placeholder="Start typing a name…" autocomplete="off"><datalist id="q-wholist">' + pool.map(function (x) { return '<option value="' + esc(name(x)) + (x.email ? ' — ' + esc(x.email) : '') + '"></option>'; }).join('') + '</datalist><div class="hint" id="q-email">Pick someone so the quote goes to their email.</div></div>'
			: '<p class="mjd-sub">' + esc(name(S.cur ? S.cur.person : {})) + (S.cur && S.cur.person.email ? ' · ' + esc(S.cur.person.email) : '') + '</p>';
		sm('<h3>' + (q.id ? 'Edit Quote' : 'New Gear Quote') + '</h3>' + who +
			'<div class="mjd-f"><label>Title</label><input type="text" id="q-title" value="' + esc(q.title) + '"></div>' +
			'<div class="mjd-f mjd-items"><label>Items — description · qty · price each</label><div id="q-items">' + q.items.map(row).join('') + '</div><button class="mjd-btn sm" id="q-add">+ Add item</button></div>' +
			'<div class="mjd-2"><div class="mjd-f"><label>Discount ($)</label><input type="number" step="0.01" id="q-disc" value="' + esc(q.discount || 0) + '"></div><div class="mjd-f"><label>Good through</label><input type="date" id="q-valid" value="' + esc(q.valid_until || '') + '"></div></div>' +
			'<div class="mjd-2"><div class="mjd-f"><label>Sales tax (%)</label><input type="number" step="0.001" min="0" id="q-stax" value="' + esc(+q.sales_tax || 0) + '" placeholder="e.g. 7"></div><div class="mjd-f"><label>Aviation tax (%)</label><input type="number" step="0.001" min="0" id="q-atax" value="' + esc(+q.aviation_tax || 0) + '"></div></div>' +
			'<div class="mjd-m" id="q-break" style="text-align:right"></div>' +
			'<div class="mjd-f"><label>Notes (optional)</label><textarea id="q-notes" rows="3">' + esc(q.notes || '') + '</textarea></div>' +
			'<div style="display:flex;justify-content:space-between;align-items:center"><span class="mjd-m">Total</span><span class="mjd-total" id="q-total"></span></div>' +
			'<div class="mjd-tools" style="justify-content:flex-end;margin-top:10px"><button class="mjd-btn" id="q-prev">👁 Preview</button><button class="mjd-btn" id="q-test">✉ Send test to me</button><button class="mjd-btn" id="q-save">Save Draft</button><button class="mjd-btn pri" id="q-send">Save &amp; Email</button></div>' +
			'<div class="mjd-status" id="q-st"></div><iframe class="mjd-frame" id="q-frame" style="display:none" title="Quote preview"></iframe>');
		var box = $('#q-items');
		function pickedId() { var el = $('#q-who'); if (!el) return 0; var v = el.value.split(' — ')[0].trim().toLowerCase(); var m = pool.find(function (x) { return name(x).toLowerCase() === v; }); return m ? m.id : 0; }
		var whoEl = $('#q-who');
		if (whoEl) whoEl.addEventListener('input', function () { var id = pickedId(), x = pool.find(function (y) { return y.id === id; }); $('#q-email').innerHTML = x ? (x.email ? '✉ Quote will be emailed to <b>' + esc(x.email) + '</b>' : '<span class="bad">' + esc(name(x)) + ' has no email on file — add one on their profile to email the quote.</span>') : 'Pick someone so the quote goes to their email.'; if (x) whoEl.value = name(x); });
		var needWho = function () { if (pid || pickedId()) return false; $('#q-st').innerHTML = '<span class="bad">Pick a student or customer first.</span>'; return true; };
		function data() {
			var items = $$('.row', box).map(function (r) { return { desc: $('.qi-d', r).value, qty: $('.qi-q', r).value || 1, price: $('.qi-p', r).value || 0 }; });
			return { id: q.id || 0, person_id: pid || pickedId(), title: $('#q-title').value, items: items, discount: $('#q-disc').value, sales_tax: $('#q-stax').value, aviation_tax: $('#q-atax').value, valid_until: $('#q-valid').value, notes: $('#q-notes').value };
		}
		function total() {
			var d = data(), s = 0; d.items.forEach(function (i) { if (i.desc) s += (+i.qty) * (+i.price); });
			var base = Math.max(0, s - (+d.discount || 0)), st = Math.round(base * (+d.sales_tax || 0)) / 100, av = Math.round(base * (+d.aviation_tax || 0)) / 100;
			$('#q-total').textContent = money(base + st + av);
			$('#q-break').textContent = (st || av) ? 'Subtotal ' + money(s) + ((+d.discount) ? ' − discount ' + money(d.discount) : '') + (st ? ' + sales tax ' + money(st) : '') + (av ? ' + aviation tax ' + money(av) : '') : '';
		}
		$('#q-add').onclick = function () { box.insertAdjacentHTML('beforeend', row({ desc: '', qty: 1, price: '' })); };
		box.addEventListener('click', function (e) { if (e.target.classList.contains('qi-x')) { e.target.parentNode.remove(); total(); } });
		$('#mjd-sm-body').addEventListener('input', total); total();
		$('#q-prev').onclick = function () { api('quote_preview', data()).then(function (r) { var f = $('#q-frame'); f.style.display = 'block'; f.srcdoc = r.html; }); };
		$('#q-test').onclick = function () { $('#q-st').textContent = 'Sending a test to you…'; api('quote_test', data()).then(function (r) { $('#q-st').innerHTML = '<span class="ok">✓ Test sent to ' + esc(r.to) + ' — check your inbox.</span>'; }).catch(function (e) { $('#q-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }); };
		$('#q-save').onclick = function () { if (needWho()) return; var who = pid || pickedId(); api('quote_save', data()).then(function () { smClose(); toast('Quote saved'); if (!S.tab || S.tab !== 'quotes' || pid) openPerson(who); load(); }).catch(function (e) { $('#q-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }); };
		$('#q-send').onclick = function () {
			if (needWho()) return;
			var btn = this; btn.disabled = true; $('#q-st').textContent = 'Sending…';
			api('quote_send', data()).then(function (r) { smClose(); toast('Quote emailed'); S.cur = r; renderPerson(); load(); })
				.catch(function (e) { $('#q-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; btn.disabled = false; });
		};
	}

	/* ── person profile ── */
	function openPerson(id) {
		$('#mjd-pm-body').innerHTML = '<div class="mjd-empty">Loading…</div>'; $('#mjd-pm').classList.add('open');
		return api('person', { id: id }).then(function (r) { S.cur = r; renderPerson(); });
	}
	function pmClose() { $('#mjd-pm').classList.remove('open'); S.cur = null; }
	var STL = { customer: ['Customer', 'man'], lead: ['Lead', 'web'], intro: ['Intro Done', 'gold'], active: ['Active Student', 'ok'], graduated: ['Graduate', 'mon'], archived: ['Archived', 'man'] };
	function renderPerson() {
		var r = S.cur, p = r.person, s = STL[p.status] || ['', 'man'];
		var f = function (k, lab, type, ph) { return '<div class="mjd-f"><label>' + lab + '</label><input type="' + (type || 'text') + '" data-pf="' + k + '" value="' + esc(p[k] || '') + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + '></div>'; };
		var pays = r.payments.map(function (y) {
			return '<tr><td>' + (y.pay_date ? esc(dt(y.pay_date)) : '<span class="mjd-m">Date unknown</span>') + '</td><td>' + esc(y.description || MJD.categories[y.category]) + '<div class="mjd-m">' + esc(MJD.categories[y.category] || '') + (y.method ? ' · ' + esc(y.method) : '') + '</div></td><td class="r"><b>' + money(y.amount) + '</b></td><td style="white-space:nowrap"><button class="mjd-link" data-payedit="' + y.id + '">Edit</button> · <button class="mjd-link" data-paydel="' + y.id + '" title="Delete">✕</button></td></tr>';
		}).join('');
		var quotes = r.quotes.map(function (q) {
			var qs = QST[q.status] || ['', 'man'];
			return '<tr><td>' + esc(q.title) + '<div class="mjd-m">' + esc(dt(q.sent_at || q.created_at)) + '</div></td><td><span class="mjd-tag ' + qs[1] + '">' + qs[0] + '</span></td><td class="r"><b>' + money(q.total) + '</b></td>' +
				'<td style="white-space:nowrap">' + (q.status !== 'purchased' ? '<button class="mjd-link" data-qedit="' + q.id + '">Edit</button> · <button class="mjd-link" data-qbuy="' + q.id + '">Purchased</button> · <button class="mjd-link" data-qno="' + q.id + '">Declined</button> · ' : '') + '<button class="mjd-link" data-qdel="' + q.id + '">✕</button></td></tr>';
		}).join('');
		$('#mjd-pm-body').innerHTML = '<button class="mjd-x" data-close="pm">×</button>' +
			'<div class="mjd-phead"><div class="who">' +
			'<h3>' + esc(name(p)) + '</h3><div class="info">' + [p.email ? '✉ <a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a>' : '', p.phone ? '☎ <a href="tel:' + esc(String(p.phone).replace(/[^0-9+]/g, '')) + '">' + esc(p.phone) + '</a>' : '', p.location ? '📍 ' + esc(p.location) : ''].filter(Boolean).map(function (x) { return '<span class="it">' + x + '</span>'; }).join('<span class="sep">|</span>') + '</div>' +
			'<div class="dates">' + [['Added', p.created_at], ['Intro', p.intro_date], ['Enrolled', p.enrolled_date], ['Ground school 1/2', p.gs1_date], ['Ground school done', p.ground_school_date], ['First flight', p.first_flight_date], ['Graduated', p.graduated_date]].filter(function (x) { return x[1]; }).map(function (x) { return '<span><b>' + x[0] + '</b> ' + esc(dt(x[1])) + '</span>'; }).join('') + '</div>' +
			'<div class="tags"><span class="mjd-tag ' + s[1] + '">' + s[0] + '</span>' + wvTag(p) + srcTag(p.source) + (p.stage && p.status === 'active' ? '<span class="mjd-tag gold">' + esc((MJD.stages[p.stage] || [''])[0]) + '</span>' : '') + '</div></div>' +
			'<div class="money"><span>Total spent</span><b>' + money(p.total) + '</b></div></div>' +
			'<div class="mjd-pacts">' +
			introBtn(p) + courseBtn(p) + (isStudent(p) ? gearBtn(p) + gsBtn(p) : '') +
			'<button class="mjd-btn sm" data-pay="' + p.id + '" data-cat="other">+ Payment</button><button class="mjd-btn sm" data-quote="' + p.id + '">+ Quote</button>' +
			wvBtn(p) +
			(isStudent(p) && !hasFlown(p) ? '<button class="mjd-btn sm mj-npb" id="pf-np">⭐ Newest Pilot</button>' : '') +
			(isStudent(p) || p.status === 'intro' ? '<button class="mjd-btn sm mj-ppgb" data-ppgopen="' + p.id + '">🎓 PPG Checklist · ' + ppgCount(p, 0)[0] + '/' + ppgCount(p, 0)[1] + ' · ' + ppgCount(p, 1)[0] + '/' + ppgCount(p, 1)[1] + '</button>' : '') +
			stuBtn(p) +
			(p.status === 'active' ? '<button class="mjd-btn sm" data-grad="' + p.id + '">🎓 Graduate</button>' : '') + '</div>' +
			'<div class="mjd-pgrid"><div>' +
			'<div class="mjd-2">' + f('first', 'First name') + f('last', 'Last name') + '</div><div class="mjd-2">' + f('email', 'Email', 'email') + f('phone', 'Phone', 'tel') + '</div>' +
			'<div class="mjd-3">' + f('location', 'Location') + f('launch', 'Launch type', 'text', 'Foot / Wheel') + f('interest', 'Interested in') + '</div>' +
			'<div class="mjd-2"><div class="mjd-f"><label>Status</label><select data-pf="status">' + opts([['lead', 'Lead'], ['intro', 'Intro Done'], ['active', 'Active Student'], ['graduated', 'Graduate'], ['customer', 'Customer (gear only)'], ['archived', 'Archived']], p.status) + '</select></div>' +
			'<div class="mjd-f"><label>Training stage</label><select data-pf="stage"><option value="">—</option>' + stageOpts(p.stage) + '</select></div></div>' +
			'<div class="mjd-3">' + f('intro_date', 'Intro day', 'date') + f('enrolled_date', 'Enrolled', 'date') + f('graduated_date', 'Graduated', 'date') + '</div>' +
			'<div class="mjd-sec"><h4>Ground School <span class="mjd-gs1">' + gsDots(gsN(p)) + gsN(p) + '/2</span></h4><div class="mjd-2"><label class="mjd-check"><input type="checkbox" id="pf-gs1"' + (p.gs1_date || p.ground_school_date ? ' checked' : '') + '> Attended session 1</label>' +
			'<input type="date" data-pf="gs1_date" value="' + esc(p.gs1_date || '') + '"></div><div class="mjd-2" style="margin-top:8px"><label class="mjd-check"><input type="checkbox" id="pf-gs"' + (p.ground_school_date ? ' checked' : '') + '> Attended session 2 — finished</label>' +
			'<input type="date" data-pf="ground_school_date" value="' + esc(p.ground_school_date || '') + '"></div></div>' +
			'<div class="mjd-sec"><h4>🪂 First Flight</h4><label class="mjd-check" style="margin-bottom:10px"><input type="checkbox" data-pfcheck="flown"' + (+p.flown ? ' checked' : '') + '> Has done their first flight</label><input type="hidden" data-pf="flown" value="' + (+p.flown ? 1 : 0) + '"><div class="mjd-ff"><div class="pic' + (p.ff_img ? ' has' : '') + '" id="pf-pic" style="' + (p.ff_img ? 'background-image:url(' + esc(p.ff_img) + ')' : '') + '">' + (p.ff_img ? '' : 'Add photo') + '</div>' +
			'<div style="flex:1"><div class="mjd-f"><label>Date</label><input type="date" data-pf="first_flight_date" value="' + esc(p.first_flight_date || '') + '"></div>' +
			'<input type="hidden" data-pf="first_flight_image" value="' + esc(p.first_flight_image || 0) + '">' +
			(hasFlown(p) ? '' : '<button class="mjd-btn sm" id="pf-feature">⭐ Feature on homepage</button>') + '</div></div></div>' +
			'<div class="mjd-sec"><div class="mjd-f"><label>Notes</label><textarea data-pf="notes" rows="4">' + esc(p.notes || '') + '</textarea></div></div>' +
			'<div class="mjd-tools"><button class="mjd-btn pri" id="pf-save">Save Changes</button><span class="mjd-status" id="pf-st" style="margin:0"></span><button class="mjd-btn sm danger" id="pf-del" style="margin-left:auto">Delete person</button></div>' +
			'</div><div>' +
			'<div class="mjd-sec" style="border:0;margin:0;padding:0"><h4>Payments &amp; Purchases</h4><div class="mjd-tw" style="max-height:300px"><table class="mjd-t"><tbody>' + (pays || '<tr><td class="mjd-empty">No payments yet.</td></tr>') + '</tbody></table></div></div>' +
			'<div class="mjd-sec"><h4>Gear Quotes</h4><div class="mjd-tw" style="max-height:260px"><table class="mjd-t"><tbody>' + (quotes || '<tr><td class="mjd-empty">No quotes yet.</td></tr>') + '</tbody></table></div></div>' +
			(p.invited_at ? '<div class="mjd-sec mjd-m">Intro invite sent ' + esc(dt(p.invited_at)) + ' — ' + esc(p.invite_event) + '</div>' : '') +
			(p.gs_reminded_at ? '<div class="mjd-m">Last ground school reminder ' + esc(dt(p.gs_reminded_at)) + '</div>' : '') +
			'</div></div>';

		var fc = $('[data-pfcheck="flown"]'); if (fc) fc.onchange = function () { $('[data-pf="flown"]').value = this.checked ? 1 : 0; };
		$('#pf-gs').onchange = function () { var d = $('[data-pf="ground_school_date"]'); d.value = this.checked ? (d.value || today()) : ''; if (this.checked && !$('#pf-gs1').checked) { $('#pf-gs1').checked = true; } };
		$('#pf-gs1').onchange = function () { var d = $('[data-pf="gs1_date"]'); d.value = this.checked ? (d.value || today()) : ''; if (!this.checked) { $('#pf-gs').checked = false; $('[data-pf="ground_school_date"]').value = ''; } };
		$('#pf-pic').onclick = function () {
			var fr = wp.media({ title: 'First flight photo', button: { text: 'Use this photo' }, library: { type: 'image' }, multiple: false });
			fr.on('select', function () { var a = fr.state().get('selection').first().toJSON(), u = a.sizes && a.sizes.medium ? a.sizes.medium.url : a.url;
				$('[data-pf="first_flight_image"]').value = a.id; var pic = $('#pf-pic'); pic.classList.add('has'); pic.style.backgroundImage = 'url(' + u + ')'; pic.textContent = '';
				if (!$('[data-pf="first_flight_date"]').value) $('[data-pf="first_flight_date"]').value = today(); $('#pf-st').innerHTML = '<span class="mjd-m">Click Save Changes to keep the photo.</span>'; });
			fr.open();
		};
		$('#pf-save').onclick = function () {
			var d = { id: p.id }; $$('[data-pf]', $('#mjd-pm-body')).forEach(function (el) { d[el.getAttribute('data-pf')] = el.value; });
			api('person_save', d).then(function (r) { S.cur = r; renderPerson(); $('#pf-st').innerHTML = '<span class="ok">✓ Saved</span>'; load(); })
				.catch(function (e) { $('#pf-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
		$('#pf-del').onclick = function () { if (!confirm('Delete ' + name(p) + ' and all their payments and quotes? This can’t be undone.')) return; api('person_delete', { id: p.id }).then(function () { pmClose(); toast('Deleted'); load(); }); };
		if ($('#pf-feature')) $('#pf-feature').onclick = function () { newestPilotModal(p); };
		if ($('#pf-np')) $('#pf-np').onclick = function () { newestPilotModal(p); };
	}


	/* ── Newest Pilot: photo + first-flight date + message → homepage slider ── */
	function newestPilotModal(p) {
		var img = +p.first_flight_image || 0, imgUrl = p.ff_img || '';
		var msg = 'Big congratulations to {name} on their first flight! From kiting the wing to feet leaving the ground — we couldn’t be prouder. Welcome to the sky, {name}!';
		sm('<section class="mj-log"><header><span class="mj-lk">Homepage</span><h3>Newest Pilot</h3><p class="mjd-sub">Put ' + esc(p.first || name(p)) + ' in the “Newest Pilot” spot on the homepage. Only their first name is shown.</p></header>' +
			'<label class="mj-ll">First-flight photo</label><button type="button" class="mj-nppic' + (imgUrl ? ' has' : '') + '" id="np-pic"' + (imgUrl ? ' style="background-image:url(' + esc(imgUrl) + ')"' : '') + '>' + (imgUrl ? '<span>Change photo</span>' : '<span>＋ Add photo</span>') + '</button>' +
			'<label class="mj-ll" for="np-date">First-flight date</label><input type="date" id="np-date" value="' + esc(p.first_flight_date || today()) + '" max="' + today() + '">' +
			'<label class="mj-ll" for="np-msg">Message <span class="mjd-m" style="text-transform:none;letter-spacing:0;font-weight:500">— {name} becomes their first name</span></label><textarea id="np-msg" rows="4">' + esc(msg) + '</textarea>' +
			'<div class="mjd-status" id="np-st"></div><button class="mj-b mjd-c-gold mj-lgo" id="np-go">⭐ Put On Homepage</button></section>');
		$('#np-pic').onclick = function () {
			var fr = wp.media({ title: 'First flight photo', button: { text: 'Use this photo' }, library: { type: 'image' }, multiple: false });
			fr.on('select', function () { var a = fr.state().get('selection').first().toJSON(), u = a.sizes && a.sizes.medium ? a.sizes.medium.url : a.url; img = a.id; var b = $('#np-pic'); b.classList.add('has'); b.style.backgroundImage = 'url(' + u + ')'; b.innerHTML = '<span>Change photo</span>'; });
			fr.open();
		};
		$('#np-go').onclick = function () {
			var b = this;
			if (!img) { $('#np-st').innerHTML = '<span class="bad">Add their first-flight photo.</span>'; return; }
			b.disabled = true; $('#np-st').innerHTML = '<span class="mjd-m">Saving…</span>';
			api('person_save', { id: p.id, first_flight_image: img, first_flight_date: $('#np-date').value, flown: 1 })
				.then(function (r) { if (S.cur && S.cur.person.id === p.id) { S.cur = r; renderPerson(); } return api('feature_pilot', { id: p.id, message: $('#np-msg').value, date: $('#np-date').value }); })
				.then(function () { smClose(); toast('⭐ ' + (p.first || name(p)) + ' is the Newest Pilot on the homepage!'); load(); })
				.catch(function (e) { b.disabled = false; $('#np-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
	}

	/* ── NEW STUDENT ORDER (gear a student buys through us → saved on their profile) ── */
	function studentOrderModal() {
		var pool = S.people.filter(function (x) { return x.status !== 'archived'; }).sort(function (a, b) { return name(a).localeCompare(name(b)); });
		sm('<section class="mj-log"><header><span class="mj-lk">Student gear</span><h3>New Student Order</h3><p class="mjd-sub">Gear a student is buying through us. It’s saved to their profile and the Student Orders list.</p></header>' +
			'<label class="mj-ll">Who’s placing the order?</label><div class="mj-chips">' + MJD.team.map(function (n, i) { return '<input type="radio" name="so-by" id="so-by' + i + '" value="' + esc(n) + '"><label for="so-by' + i + '">' + esc(n) + '</label>'; }).join('') + '</div>' +
			'<label class="mj-ll" for="so-who">Student</label><input type="text" id="so-who" list="so-wholist" placeholder="Start typing a name…" autocomplete="off"><datalist id="so-wholist">' + pool.map(function (x) { return '<option value="' + esc(name(x)) + (x.email ? ' — ' + esc(x.email) : '') + '"></option>'; }).join('') + '</datalist><div class="mjd-m" id="so-hint" style="margin-top:6px">Pick someone from the list.</div>' +
			'<label class="mj-ll" for="so-item">Gear</label><input type="text" id="so-item" placeholder="e.g. APCO F5 wing, Scout Carbon motor">' +
			'<div class="mjd-2"><div><label class="mj-ll" for="so-amt">Price</label><input type="text" id="so-amt" inputmode="decimal" placeholder="$"></div><div><label class="mj-ll" for="so-m">Paid with</label><select id="so-m"><option value="">—</option>' + opts(MJD.methods, 'Cash') + '</select></div></div>' +
			'<label class="mj-ll" for="so-date">Date</label><input type="date" id="so-date" value="' + today() + '">' +
			'<div class="mjd-status" id="so-st"></div><button class="mj-b mjd-c-gold mj-lgo" id="so-go">Add Student Order</button></section>');
		var picked = function () { var v = $('#so-who').value.split(' — ')[0].trim().toLowerCase(); var m = pool.find(function (x) { return name(x).toLowerCase() === v; }); return m || null; };
		$('#so-who').addEventListener('input', function () { var m = picked(); $('#so-hint').innerHTML = m ? '✓ ' + esc(name(m)) + ({ lead: ' · Lead', intro: ' · Intro done', active: ' · Active student', graduated: ' · Graduate', customer: ' · Customer' }[m.status] || '') : 'Pick someone from the list.'; });
		$('#so-who').focus();
		$('#so-go').onclick = function () {
			var b = this, by = $('input[name="so-by"]:checked'), m = picked(), st = $('#so-st');
			if (!by) { st.innerHTML = '<span class="bad">Pick who’s placing the order.</span>'; return; }
			if (!m) { st.innerHTML = '<span class="bad">Pick the student from the list.</span>'; return; }
			if (!$('#so-item').value.trim()) { st.innerHTML = '<span class="bad">Say what gear they’re buying.</span>'; return; }
			b.disabled = true;
			api('payment_add', { person_id: m.id, category: 'gear', description: $('#so-item').value, amount: String($('#so-amt').value).replace(/[^0-9.]/g, ''), method: $('#so-m').value, pay_date: $('#so-date').value, placed_by: by.value })
				.then(function () { smClose(); toast('Order added to ' + name(m) + '’s profile ✓'); load(); })
				.catch(function (e) { b.disabled = false; st.innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
	}
	function addPersonModal() {
		sm('<h3>Add Person</h3><p class="mjd-sub">Add a lead or student by hand.</p>' +
			'<div class="mjd-2"><div class="mjd-f"><label>First name</label><input type="text" id="ap-first"></div><div class="mjd-f"><label>Last name</label><input type="text" id="ap-last"></div></div>' +
			'<div class="mjd-2"><div class="mjd-f"><label>Email</label><input type="email" id="ap-email"></div><div class="mjd-f"><label>Phone</label><input type="tel" id="ap-phone"></div></div>' +
			'<div class="mjd-2"><div class="mjd-f"><label>Location</label><select id="ap-loc"><option value="">—</option>' + opts(MJD.locations) + '</select></div><div class="mjd-f"><label>Add as</label><select id="ap-status">' + opts([['lead', 'Lead'], ['intro', 'Intro Done'], ['active', 'Active Student'], ['graduated', 'Graduate']]) + '</select></div></div>' +
			'<div class="mjd-f"><label>Notes</label><textarea id="ap-notes" rows="3"></textarea></div>' +
			'<div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="ap-save">Add</button></div><div class="mjd-status" id="ap-st"></div>');
		$('#ap-first').focus();
		$('#ap-save').onclick = function () {
			api('person_save', { first: $('#ap-first').value, last: $('#ap-last').value, email: $('#ap-email').value, phone: $('#ap-phone').value, location: $('#ap-loc').value, status: $('#ap-status').value, notes: $('#ap-notes').value })
				.then(function (r) { smClose(); load(); openPerson(r.person.id); })
				.catch(function (e) { $('#ap-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
	}

	/* ── one click handler for everything ── */
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-lperiod],[data-lloct],[data-llt],[data-lfset],[data-inv],[data-invsess],[data-recsave],[data-reccopy],[data-tab],[data-act],[data-open],[data-pay],[data-arch],[data-restore],[data-quote],[data-grad],[data-stagef],[data-prev],[data-test],[data-send],[data-gsdone],[data-gsundo],[data-back],[data-qarch],[data-setstage],[data-stopen],[data-stuview],[data-wheel],[data-wheelf],[data-sess],[data-rs],[data-rl],[data-rg],[data-rdel],[data-ff],[data-flyf],[data-mkstu],[data-close],[data-attwho],[data-attedit],[data-attdel],[data-payedit],#at-save,[data-paydel],[data-qedit],[data-qbuy],[data-qno],[data-qdel],[data-nflown],[data-stagego]');
		if (!t) { if (e.target.id === 'mjd-pm') pmClose(); if (e.target.id === 'mjd-sm') smClose(); return; }
		var a = function (n) { return t.getAttribute(n); }, id = function (n) { return +a(n); };
		if (t.hasAttribute('data-tab')) { root.classList.remove('mj-sheet-open'); if (t.hasAttribute('data-close')) { if (a('data-close') === 'sm') smClose(); else pmClose(); } if (t.hasAttribute('data-past')) S.pastOpen = true; if (a('data-tab')) { S.tab = a('data-tab'); render(); window.scrollTo(0, 0); } return; }
		if (t.hasAttribute('data-lfset')) { S.leadF = a('data-lfset'); render(); return; }
		if (t.hasAttribute('data-lperiod')) { S.leadPeriod = a('data-lperiod'); render(); return; }
		if (t.hasAttribute('data-lloct')) { S.leadLoc = S.leadLoc === a('data-lloct') ? '' : a('data-lloct'); render(); return; }
		if (t.hasAttribute('data-llt')) { S.leadLt = S.leadLt === a('data-llt') ? '' : a('data-llt'); render(); return; }
		if (t.hasAttribute('data-inv')) { var ip = S.people.find(function (q) { return q.id === +a('data-inv'); }); if (ip) invModal(ip); return; }
		if (t.hasAttribute('data-invsess')) { S.invSess = +a('data-invsess'); S.leadF = 'notinv'; S.tab = 'leads'; render(); window.scrollTo(0, 0); return; }
		if (t.hasAttribute('data-nflown')) { S.flyF = 'no'; S.stageF = ''; S.tab = 'active'; render(); window.scrollTo(0, 0); return; }
		if (t.hasAttribute('data-stagego')) { S.stageF = a('data-stagego'); S.flyF = ''; S.tab = 'active'; render(); window.scrollTo(0, 0); return; }
		if (t.hasAttribute('data-close')) { a('data-close') === 'pm' ? pmClose() : smClose(); return; }
		if (t.hasAttribute('data-open')) return openPerson(id('data-open'));
		if (t.hasAttribute('data-pay')) return payModal(id('data-pay'), a('data-cat'));
		if (t.hasAttribute('data-quote')) { var pid = id('data-quote'); (S.cur && S.cur.person.id === pid ? Promise.resolve() : api('person', { id: pid }).then(function (r) { S.cur = r; })).then(function () { quoteModal(pid); }); return; }
		if (t.hasAttribute('data-stagef')) { S.stageF = a('data-stagef'); render(); return; }
		if (t.hasAttribute('data-prev')) return preview(a('data-prev'));
		if (t.hasAttribute('data-test')) return testSend(a('data-test'));
		if (t.hasAttribute('data-send')) return bulkSend(a('data-send'));
		if (t.hasAttribute('data-arch')) return api('person_save', { id: id('data-arch'), status: 'archived' }).then(function () { toast('Moved to Archived'); load(); });
		if (t.hasAttribute('data-restore')) return api('person_save', { id: id('data-restore'), status: 'lead', restore: 1 }).then(function () { toast('Back on Leads'); load(); });
		if (t.hasAttribute('data-grad')) { if (!confirm('Mark as graduated? 🎓')) return; return api('person_save', { id: id('data-grad'), status: 'graduated' }).then(function (r) { toast('Congrats, ' + r.person.first + '! 🎓'); if (S.cur) { S.cur = r; renderPerson(); } load(); }); }
		if (t.id === 'at-save') return attSave(t);
		if (t.hasAttribute('data-attwho')) { S.attWho = S.attWho === a('data-attwho') ? '' : a('data-attwho'); render(); return; }
		if (t.hasAttribute('data-attedit')) { var at = S.att.find(function (x) { return +x.id === id('data-attedit'); }); sm('<h3>Edit Field Day</h3>' + attForm(at)); return; }
		if (t.hasAttribute('data-attdel')) { if (!confirm('Delete this field day?')) return; return api('att_delete', { id: id('data-attdel') }).then(load); }
		if (t.hasAttribute('data-payedit')) { var py = S.cur.payments.find(function (x) { return +x.id === id('data-payedit'); }); return payModal(S.cur.person.id, py.category, py); }
		if (t.hasAttribute('data-mkstu')) {
			var mid = id('data-mkstu'), mp = S.people.find(function (x) { return x.id === mid; }), wasSt = mp ? mp.status : '', inList = S.tab === 'intro' && !$('#mjd-pm').classList.contains('open');
			if (inList && mp) { S.flash[mid] = 1; mp.status = 'active'; render(); toast(name(mp) + ' added to Students ✓'); }
			var t0 = Date.now();
			return api('person_save', { id: mid, status: 'active' }).then(function (r) {
				if (!inList) { toast(name(r.person) + ' added to Students ✓'); if (S.cur) { S.cur = r; renderPerson(); } load(); return; }
				setTimeout(function () { var row = $('[data-row="' + mid + '"]'); if (row) row.classList.add('mjd-gone'); setTimeout(function () { delete S.flash[mid]; load(); }, 450); }, Math.max(0, 2500 - (Date.now() - t0)));
			}).catch(function (e) { delete S.flash[mid]; if (mp) mp.status = wasSt; render(); toast('Couldn’t save: ' + e.message, true); });
		}
		if (t.hasAttribute('data-gsdone')) { var gp = S.people.find(function (x) { return x.id === id('data-gsdone'); }) || {}; var g1 = !gp.gs1_date && !gp.ground_school_date; return api('person_save', g1 ? { id: id('data-gsdone'), gs1_date: today() } : { id: id('data-gsdone'), ground_school_date: today() }).then(function (r) { delete S.gsSel[id('data-gsdone')]; toast(g1 ? 'Ground school 1 of 2 ✓ — one more to go' : 'Ground school finished ✓ (2 of 2)'); if (S.cur && S.cur.person.id === r.person.id) { S.cur = r; renderPerson(); } load(); }); }
		if (t.hasAttribute('data-setstage')) {
			var sid = id('data-setstage'), v = a('data-v'), sp = S.people.find(function (x) { return x.id === sid; });
			if (!sp) return;
			if (sp.stage === v) { S.stOpen[sid] = !S.stOpen[sid]; render(); return; }
			var prev = sp.stage; sp.stage = v; delete S.stOpen[sid]; render();
			api('person_save', { id: sid, stage: v }).then(function () { toast(name(sp) + ' → ' + MJD.stages[v][0]); load(); })
				.catch(function (e) { sp.stage = prev; render(); toast('Couldn’t save: ' + e.message, true); });
			return;
		}
		if (t.hasAttribute('data-sess')) { S.sessId = S.sessId === id('data-sess') ? 0 : id('data-sess'); render(); return; }
		if (t.hasAttribute('data-rs') || t.hasAttribute('data-rl') || t.hasAttribute('data-rg') || t.hasAttribute('data-rdel')) {
			var cs = curSess(); if (!cs) return;
			var key = a('data-rs') || a('data-rl') || a('data-rg') || a('data-rdel'), rr = cs.rsvps.find(function (q) { return q.key === key; }); if (!rr) return;
			rr.edited = 1;
			if (t.hasAttribute('data-rs')) rr.status = a('data-v');
			if (t.hasAttribute('data-rl')) rr.launch = rr.launch === 'wheel' ? 'foot' : 'wheel';
			if (t.hasAttribute('data-rg')) rr.gear = rr.gear === 'own' ? 'school' : 'own';
			if (t.hasAttribute('data-rdel')) cs.rsvps = cs.rsvps.filter(function (q) { return q.key !== key; });
			render(); saveRsvps(cs); return;
		}
		if (t.hasAttribute('data-wheelf')) { S.wheelF = !S.wheelF; render(); return; }
		if (t.hasAttribute('data-wheel')) {
			var wid = id('data-wheel'), wp = S.people.find(function (x) { return x.id === wid; }); if (!wp) return;
			var prevL = wp.launch, nv = isWheel(wp) ? 'Foot launch' : (/trike/i.test(prevL || '') ? prevL : 'Wheel launch');
			wp.launch = nv; render();
			api('person_save', { id: wid, launch: nv }).then(function () { toast(name(wp) + ' → ' + nv); load(); }).catch(function (e) { wp.launch = prevL; render(); toast('Couldn’t save: ' + e.message, true); });
			return;
		}
		if (t.hasAttribute('data-stuview')) { S.stuView = a('data-stuview'); try { localStorage.setItem('mjdStuView2', S.stuView); } catch (x) {} render(); return; }
		if (t.hasAttribute('data-stopen')) { var so = id('data-stopen'); S.stOpen[so] = !S.stOpen[so]; render(); return; }
		if (t.hasAttribute('data-qarch')) { var qa = id('data-qarch'), qv = +a('data-v'), qq = S.quotes.find(function (x) { return +x.id === qa; }); if (qq) qq.archived = qv; render(); return api('quote_archive', { id: qa, archived: qv }).then(function () { toast(qv ? 'Quote archived' : 'Quote restored'); }); }
		if (t.hasAttribute('data-back')) {
			var bp = S.people.find(function (x) { return x.id === id('data-back'); }); if (!bp) return;
			var to = bp.status === 'graduated' ? 'Students' : bp.status === 'active' ? ((+bp.paid_intro || bp.intro_date) ? 'Intros Done' : 'Leads') : 'Leads';
			var what = bp.status === 'active' ? 'full-course / training payment' : bp.status === 'intro' ? 'intro payment' : '';
			var hasPay = bp.status === 'active' ? +bp.paid_training : bp.status === 'intro' ? +bp.paid_intro : 0;
			sm('<h3>Move ' + esc(name(bp)) + ' back?</h3><p class="mjd-sub">They’ll go back to <b>' + to + '</b>. Use this to fix a mistake.</p>' +
				(hasPay ? '<label class="mjd-check" style="margin-bottom:14px"><input type="checkbox" id="bk-drop" checked> Also delete their ' + what + (hasPay > 1 ? 's' : '') + '</label>' : '') +
				'<div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="bk-go">Move Back to ' + to + '</button></div>');
			$('#bk-go').onclick = function () { api('step_back', { id: bp.id, drop_payments: $('#bk-drop') && $('#bk-drop').checked ? 1 : 0 }).then(function () { smClose(); toast(name(bp) + ' moved back to ' + to); load(); }).catch(function (e) { toast(e.message, true); }); };
			return;
		}
		if (t.hasAttribute('data-flyf')) { S.flyF = S.flyF === a('data-flyf') ? '' : a('data-flyf'); render(); return; }
		if (t.hasAttribute('data-ff')) {
			var fp = id('data-ff');
			sm('<h3>First Flight! 🪂</h3><p class="mjd-sub">Nice! When did they fly?</p><div class="mjd-f"><label>Date</label><input type="date" id="ff-d" value="' + today() + '"></div>' +
				'<label class="mjd-check" style="margin-bottom:12px"><input type="checkbox" id="ff-u"> Date unknown</label>' +
				'<div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="ff-go">✓ Mark First Flight</button></div>');
			$('#ff-go').onclick = function () { api('person_save', { id: fp, flown: 1, first_flight_date: $('#ff-u').checked ? '' : $('#ff-d').value, stage: 'flying' }).then(function (r) { smClose(); toast('First flight logged 🪂'); if (S.cur && S.cur.person.id === fp) { S.cur = r; renderPerson(); } load(); }); };
			return;
		}
		if (t.hasAttribute('data-gsundo')) { var up = S.people.find(function (x) { return x.id === id('data-gsundo'); }) || (S.cur && S.cur.person) || {}; var two = !!up.ground_school_date; if (!confirm(two ? 'Undo session 2? (back to 1 of 2)' : 'Undo session 1? (back to 0 of 2)')) return; return api('person_save', two ? { id: id('data-gsundo'), ground_school_date: '' } : { id: id('data-gsundo'), gs1_date: '' }).then(function (r) { if (S.cur && S.cur.person.id === r.person.id) { S.cur = r; renderPerson(); } load(); }); }
		if (t.hasAttribute('data-paydel')) { if (!confirm('Delete this payment?')) return; return api('payment_delete', { id: id('data-paydel') }).then(function (r) { S.cur = r; renderPerson(); load(); }); }
		if (t.hasAttribute('data-qedit')) { var q = S.cur.quotes.find(function (x) { return +x.id === id('data-qedit'); }); return quoteModal(S.cur.person.id, q); }
		if (t.hasAttribute('data-qbuy')) {
			var qq = S.cur.quotes.find(function (x) { return +x.id === id('data-qbuy'); });
			sm('<h3>Mark Purchased</h3><p class="mjd-sub">' + esc(qq.title) + ' — <b>' + money(qq.total) + '</b> will be added to their purchase history.</p><div class="mjd-2"><div class="mjd-f"><label>Paid with</label><select id="qb-m">' + opts(MJD.methods, 'Cash') + '</select></div><div class="mjd-f"><label>Date</label><input type="date" id="qb-d" value="' + today() + '"></div></div>' +
				'<div class="mjd-tools" style="justify-content:flex-end"><button class="mjd-btn" data-close="sm">Cancel</button><button class="mjd-btn pri" id="qb-go">Mark Purchased</button></div>');
			$('#qb-go').onclick = function () { api('quote_status', { id: qq.id, status: 'purchased', method: $('#qb-m').value, pay_date: $('#qb-d').value }).then(function (r) { smClose(); S.cur = r; renderPerson(); load(); toast('Purchase recorded'); }); };
			return;
		}
		if (t.hasAttribute('data-qno')) return api('quote_status', { id: id('data-qno'), status: 'declined' }).then(function (r) { S.cur = r; renderPerson(); load(); });
		if (t.hasAttribute('data-qdel')) { if (!confirm('Delete this quote?')) return; return api('quote_delete', { id: id('data-qdel') }).then(function (r) { S.cur = r; renderPerson(); load(); }); }
		if (t.hasAttribute('data-recsave')) { var rid = +t.getAttribute('data-recsave'), rin = $('#gs-rec-' + rid); t.disabled = true;
			return api('sess_recording', { id: rid, recording: rin ? rin.value : '' }).then(function (r) { S.sess = (S.sess || []).map(function (q) { return q.id === r.id ? r : q; }); toast(r.recording ? 'Recording link saved ✓' : 'Recording link removed'); render(); }).catch(function (e) { t.disabled = false; toast(e.message, true); }); }
		if (t.hasAttribute('data-reccopy')) { var u = t.getAttribute('data-reccopy'); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { toast('Link copied ✓'); }).catch(function () { prompt('Copy this link:', u); }); return; }
		var act = a('data-act');
		if (act === 'msheet' || act === 'msearch') { var on = !root.classList.contains('mj-sheet-open'); root.classList.toggle('mj-sheet-open', on); if (on && act === 'msearch') setTimeout(function () { var g = $('#mj-gq'); if (g) g.focus(); }, 30); return; }
		if (act === 'add') return addPersonModal();
		if (act === 'logatt') return logModal();
		if (act === 'attpop') { sm('<section class="mj-log mj-attm"><header><span class="mj-lk">Instructors</span><h3>Instructor Attendance</h3><p class="mjd-sub">Field days and other logged hours this quarter.</p></header><div id="mj-attbox"></div></section>'); $('#mjd-sm').classList.add('wide'); attBox(); return; }
		if (act === 'newsorder') return studentOrderModal();
		if (act === 'viewatt') return attReport('q');
		if (act === 'qarchtog') { S.qArchOpen = !S.qArchOpen; render(); return; }
		if (act === 'newquote') { S.cur = null; return quoteModal(0); }
		if (act === 'newgs') return gsModal();
		if (act === 'editgs') return gsModal(curSess());
		if (act === 'gspast') { S.gsPast = !S.gsPast; render(); return; }
		if (act === 'pasttog') { S.pastOpen = !S.pastOpen; render(); return; }
		if (act === 'newsess') return sessModal();
		if (act === 'editsess') return sessModal(curSess());
		if (act === 'addppl') return addPeopleModal();
		if (act === 'qtext') return quoTextModal(curSess());
		if (act === 'gmsync') { toast('Checking GroupMe…'); return api('gm_import', { force: 1 }).then(function (r) { return loadSess().then(function () { render(); toast(r.new ? r.new + ' new training day' + (r.new === 1 ? '' : 's') + ' from GroupMe' : r.updated ? 'RSVPs updated from GroupMe' : 'Up to date with GroupMe'); if (r.errors && r.errors.length) toast(r.errors.join(' · '), true); }); }).catch(function (e) { toast(e.message, true); }); }
		if (act === 'copylog') { navigator.clipboard && navigator.clipboard.writeText(MJD.logUrl); toast('Log link copied'); return; }
		if (act === 'copybook') { navigator.clipboard && navigator.clipboard.writeText(MJD.bookUrl); toast('Link copied — text it to the caller'); return; }
		if (act === 'selall') { leadRows().forEach(function (p) { if (p.email) S.sel[p.id] = true; }); render(); return; }
		if (act === 'selnone') { S.sel = {}; render(); return; }
		if (act === 'gsall') { gsRows().forEach(function (p) { if (p.email) S.gsSel[p.id] = true; }); render(); return; }
		if (act === 'gsnone') { S.gsSel = {}; render(); return; }
	});
	root.addEventListener('change', function (e) {
		var t = e.target;
		if (t.hasAttribute('data-sel')) { S.sel[+t.getAttribute('data-sel')] = t.checked; render(); }
		if (t.hasAttribute('data-gssel')) { S.gsSel[+t.getAttribute('data-gssel')] = t.checked; render(); }
		if (t.id === 'at-kind') { var h = t.value === 'hours'; $$('.at-hrs').forEach(function (e) { e.style.display = h ? '' : 'none'; }); $$('.at-fld').forEach(function (e) { e.style.display = h ? 'none' : ''; }); $('#at-cl').textContent = h ? 'Exactly what did you do?' : 'What happened'; }
		if (t.hasAttribute('data-stage')) { api('person_save', { id: +t.getAttribute('data-stage'), stage: t.value }).then(function () { toast('Stage updated'); load(); }); }
	});
	document.addEventListener('click', function (e) { $$('details.mjd-dd[open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if ($('#mjd-sm').classList.contains('open')) smClose(); else if ($('#mjd-pm').classList.contains('open')) pmClose(); } });

	/* ── SCHOOL ORDERS (gear we buy for the school) ── */
	var OST = { needed: ['To order', '#F1854E'], ordered: ['Ordered', '#E8B54A'], shipped: ['Shipped', '#36B2CF'], received: ['Received', '#1E7B3C'] };
	function vOrders() {
		var all = S.orders || [], open = all.filter(function (o) { return o.status !== 'received'; }), past = all.filter(function (o) { return o.status === 'received'; });
		var yr = String(new Date().getFullYear()), spentY = 0; all.forEach(function (o) { if (String(o.order_date || '').slice(0, 4) === yr) spentY += +o.cost; });
		var row = function (o) {
			var st = OST[o.status] || OST.ordered;
			return '<div class="mj-or"><div class="d">' + (o.order_date ? esc(dt(o.order_date)) : '<span class="mjd-m">No date</span>') + '</div>' +
				'<div class="w"><b>' + esc(o.item) + (+o.qty > 1 ? ' <span class="q">× ' + (+o.qty) + '</span>' : '') + '</b><span>' + esc([o.ordered_by ? 'Ordered by ' + o.ordered_by : '', o.dealer, o.category].filter(Boolean).join(' · ')) + (o.notes ? ' — ' + esc(o.notes) : '') + '</span></div>' +
				'<div class="c">' + money(o.cost) + '</div>' +
				'<div class="s"><span class="mj-ost" style="--oc:' + st[1] + '">' + st[0] + (o.status === 'received' && o.received_date ? ' ' + esc(dt(o.received_date).replace(/, \d{4}$/, '')) : '') + '</span></div>' +
				'<div class="a">' + (o.status === 'needed' ? '<button class="mj-b sm" data-ost="' + o.id + '" data-v="ordered">Ordered ✓</button>' : '') + (o.status === 'ordered' ? '<button class="mj-b sm" data-ost="' + o.id + '" data-v="shipped">Shipped</button>' : '') + (o.status !== 'received' ? '<button class="mj-b sm" data-ost="' + o.id + '" data-v="received">Received ✓</button>' : '') +
				'<button class="mjd-link" data-oedit="' + o.id + '">Edit</button><button class="mjd-link" data-odel="' + o.id + '" aria-label="Delete order">✕</button></div></div>';
		};
		return '<div class="mj-tbar"><p class="mj-desc">Gear we buy from dealers for the school — motors, wings for kiting, risers, parts. ' + money(spentY) + ' spent in ' + yr + '.</p><button class="mj-b mjd-c-gold" data-act="neworder">' + ic('plus') + 'New School Order</button></div>' +
			'<section class="mj-card mj-olist2"><div class="mj-card__head mj-card__head--bordered"><div class="mj-card__name">Open orders <em class="mj-pill">' + open.length + '</em></div></div>' + (open.length ? open.map(row).join('') : '<div class="mj-card__empty">Nothing on order right now. Click <b>New School Order</b> to add one.</div>') + '</section>' +
			'<section class="mj-card mj-olist2" style="margin-top:18px"><div class="mj-card__head' + (S.oPast && past.length ? ' mj-card__head--bordered' : ' mj-card__head--solo') + '" data-oppast="1" role="button"><div class="mj-card__name">Past orders <em class="mj-pill mj-pill--grey">' + past.length + '</em></div><button class="mj-linkbtn" data-oppast="1">' + (S.oPast ? 'Collapse ↑' : 'Show ↓') + '</button></div>' + (S.oPast ? (past.length ? past.map(row).join('') : '<div class="mj-card__empty">No past orders yet.</div>') : '') + '</section>';
	}
	function orderModal(o) {
		o = o || { status: 'ordered', order_date: today(), qty: 1 };
		sm('<section class="mj-log"><header><span class="mj-lk">School gear</span><h3>' + (o.id ? 'Edit School Order' : 'New School Order') + '</h3><p class="mjd-sub">Gear we’re buying for the school.</p></header>' +
			'<label class="mj-ll">Who’s ordering?</label><div class="mj-chips">' + MJD.team.map(function (n, i) { return '<input type="radio" name="or-who" id="or-who' + i + '" value="' + esc(n) + '"' + (o.ordered_by === n ? ' checked' : '') + '><label for="or-who' + i + '">' + esc(n) + '</label>'; }).join('') + '</div>' +
			'<label class="mj-ll" for="or-item">What are we ordering?</label><input type="text" id="or-item" value="' + esc(o.item || '') + '" placeholder="e.g. Gin riser set, new kiting wing">' +
			'<div class="mjd-2"><div><label class="mj-ll" for="or-dealer">Dealer</label><input type="text" id="or-dealer" list="or-dl" value="' + esc(o.dealer || '') + '" placeholder="e.g. APCO"><datalist id="or-dl">' + MJD.dealers.concat((S.orders || []).map(function (x) { return x.dealer; })).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).map(function (d) { return '<option value="' + esc(d) + '">'; }).join('') + '</datalist></div>' +
			'<div><label class="mj-ll" for="or-cat">Category</label><select id="or-cat">' + opts(MJD.orderCats, o.category || 'Other') + '</select></div></div>' +
			'<div class="mjd-2"><div><label class="mj-ll" for="or-qty">Qty</label><input type="number" id="or-qty" min="1" step="1" value="' + esc(o.qty || 1) + '"></div><div><label class="mj-ll" for="or-cost">Total cost</label><input type="text" id="or-cost" inputmode="decimal" value="' + (o.cost && +o.cost ? esc(+o.cost) : '') + '" placeholder="$"></div></div>' +
			'<div class="mjd-2"><div><label class="mj-ll" for="or-date">Order date</label><input type="date" id="or-date" value="' + esc(o.order_date || '') + '"></div><div><label class="mj-ll" for="or-st">Status</label><select id="or-st">' + opts([['ordered', 'Ordered'], ['shipped', 'Shipped'], ['received', 'Received']], o.status) + '</select></div></div>' +
			'<label class="mj-ll" for="or-notes">Notes</label><textarea id="or-notes" rows="2" placeholder="Order #, tracking, who it’s for…">' + esc(o.notes || '') + '</textarea>' +
			'<div class="mjd-status" id="or-stat"></div><button class="mj-b mjd-c-gold mj-lgo" id="or-go">' + (o.id ? 'Save Order' : 'Add Order') + '</button></section>');
		$('#or-item').focus();
		$('#or-go').onclick = function () {
			var b = this; b.disabled = true;
			var who = $('input[name="or-who"]:checked'); if (!who) { b.disabled = false; $('#or-stat').innerHTML = '<span class="bad">Pick who’s ordering.</span>'; return; }
			api('order_save', { id: o.id || 0, ordered_by: who.value, item: $('#or-item').value, dealer: $('#or-dealer').value, category: $('#or-cat').value, qty: $('#or-qty').value, cost: $('#or-cost').value, order_date: $('#or-date').value, status: $('#or-st').value, notes: $('#or-notes').value })
				.then(function (r) { S.orders = r; smClose(); toast(o.id ? 'Order saved ✓' : 'Order added ✓'); render(); })
				.catch(function (e) { b.disabled = false; $('#or-stat').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
	}

	/* ── TEAM TO-DO LIST ── */
	function vTodo() {
		var all = S.todos || [], open = all.filter(function (t) { return !+t.done; }), done = all.filter(function (t) { return +t.done; });
		var row = function (t, k, n) {
			var m = tdMeta(t), op = !+t.done;
			return '<div class="mj-td' + (op ? '' : ' done') + '" data-tdid="' + t.id + '">' + (op ? '<span class="mj-grip" title="Drag to reorder" aria-hidden="true">⠿</span>' : '') +
				'<label><input type="checkbox" data-tdtog="' + t.id + '"' + (op ? '' : ' checked') + ' aria-label="Mark done"><span><b>' + esc(t.title) + '</b>' + (m ? '<em>' + m + '</em>' : '') + '</span></label>' +
				(op ? '<span class="mj-mv"><button data-tdmv="' + t.id + '" data-d="-1" aria-label="Move up"' + (k === 0 ? ' disabled' : '') + '>▲</button><button data-tdmv="' + t.id + '" data-d="1" aria-label="Move down"' + (k === n - 1 ? ' disabled' : '') + '>▼</button></span>' : '') +
				'<button class="mjd-link" data-tdedit="' + t.id + '">Edit</button><button class="mjd-link mj-tdx" data-tddel="' + t.id + '" aria-label="Remove">✕</button></div>';
		};
		return '<p class="mj-desc" style="margin:0 0 18px">Things the team needs to get done — ordering gear, buying or selling equipment, anything we shouldn’t forget. Everyone sees the same list. Drag ⠿ (or use ▲▼) to put the most important at the top.</p>' +
			'<section class="mjd-card mj-tdadd"><div class="mj-tdf"><input type="text" id="td-title" placeholder="Add something we need to do…" aria-label="New to-do"><select id="td-who" aria-label="Who">' + opts([['', 'Anyone']].concat(MJD.team.map(function (n) { return [n, n]; })), '') + '</select><input type="date" id="td-due" aria-label="Due date"><button class="mj-b mjd-c-orange" id="td-add">' + ic('plus') + 'Add</button></div></section>' +
			'<section class="mjd-card mj-tdl"><div class="mjd-ch"><h3>To do</h3><span class="mj-cnt">' + open.length + '</span></div>' + (open.length ? '<div id="mj-tdsort">' + open.map(function (t, k) { return row(t, k, open.length); }).join('') + '</div>' : '<div class="mjd-empty">Nothing left to do. 🎉</div>') + '</section>' +
			(function () { var att = autoAttn(), hid = S.hiddenAtt || []; return (att.length || hid.length) ? '<section class="mjd-card mj-tdl"><div class="mjd-ch"><h3>Automatic reminders</h3><span class="mj-cnt">' + att.length + '</span></div>' + (att.length ? att.map(function (r) { return attRow(r); }).join('') : '<div class="mjd-empty">No reminders right now.</div>') +
				(hid.length ? '<button class="mj-more" data-athtog="1">' + (S.attHidOpen ? 'Hide' : 'Show') + ' ' + hid.length + ' reminder' + (hid.length === 1 ? '' : 's') + ' marked done</button>' + (S.attHidOpen ? hid.map(function (r) { return attRow(r, true); }).join('') : '') : '') + '</section>' : ''; })() +
			(done.length ? '<button class="mjd-pasth" data-tddone="1" style="margin-top:22px"><span>✓ Done <b>' + done.length + '</b></span><span class="v">' + (S.tdDone ? 'Close ▴' : 'Open ▾') + '</span></button>' + (S.tdDone ? '<section class="mjd-card mj-tdl" style="margin-top:12px">' + done.map(function (t) { return row(t, 0, 0); }).join('') + '</section>' : '') : '');
	}
	function todoModal(t) {
		sm('<section class="mj-log"><header><span class="mj-lk">To-Do</span><h3>Edit To-Do</h3></header>' +
			'<label class="mj-ll" for="te-title">What needs to get done?</label><input type="text" id="te-title" value="' + esc(t.title) + '">' +
			'<div class="mjd-2"><div><label class="mj-ll" for="te-who">Who</label><select id="te-who">' + opts([['', 'Anyone']].concat(MJD.team.map(function (n) { return [n, n]; })), t.who || '') + '</select></div><div><label class="mj-ll" for="te-due">Due</label><input type="date" id="te-due" value="' + esc(t.due || '') + '"></div></div>' +
			'<div class="mjd-status" id="te-st"></div><button class="mj-b mjd-c-orange mj-lgo" id="te-go">Save</button></section>');
		$('#te-go').onclick = function () {
			api('todo_save', { id: t.id, title: $('#te-title').value, who: $('#te-who').value, due: $('#te-due').value }).then(function (r) { S.todos = r; smClose(); render(); }).catch(function (e) { $('#te-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; });
		};
	}
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-athide],[data-atshow],[data-athtog],[data-act="neworder"],[data-oedit],[data-ost],[data-odel],[data-oppast],#td-add,#tdh-add,[data-tdmv],[data-tdtog],[data-tdedit],[data-tddel],[data-tddone]');
		if (!t) return;
		var a = function (n) { return t.getAttribute(n); };
		if (t.hasAttribute('data-athide')) return api('att_hide', { key: a('data-athide'), sig: a('data-sig') }).then(function (r) { S.attHide = r || {}; toast('Marked done ✓ — it’ll come back if the number goes up'); render(); });
		if (t.hasAttribute('data-atshow')) return api('att_unhide', { key: a('data-atshow') }).then(function (r) { S.attHide = r || {}; render(); });
		if (t.hasAttribute('data-athtog')) { S.attHidOpen = !S.attHidOpen; render(); return; }
		if (a('data-act') === 'neworder') return orderModal();
		if (t.hasAttribute('data-oedit')) return orderModal((S.orders || []).find(function (o) { return +o.id === +a('data-oedit'); }));
		if (t.hasAttribute('data-ost')) return api('order_status', { id: +a('data-ost'), status: a('data-v') }).then(function (r) { S.orders = r; toast(a('data-v') === 'received' ? 'Marked received ✓' : 'Marked shipped'); render(); });
		if (t.hasAttribute('data-odel')) { if (!confirm('Delete this order?')) return; return api('order_delete', { id: +a('data-odel') }).then(function (r) { S.orders = r; render(); }); }
		if (t.hasAttribute('data-oppast')) { S.oPast = !S.oPast; render(); return; }
		if (t.id === 'td-add') {
			var ti = $('#td-title'); if (!ti.value.trim()) { ti.focus(); return; }
			t.disabled = true;
			return api('todo_save', { title: ti.value, who: $('#td-who').value, due: $('#td-due').value }).then(function (r) { S.todos = r; render(); var n = $('#td-title'); if (n) n.focus(); }).catch(function (er) { t.disabled = false; toast(er.message, true); });
		}
		if (t.hasAttribute('data-tdtog')) return api('todo_toggle', { id: +a('data-tdtog'), done: t.checked ? 1 : 0 }).then(function (r) { S.todos = r; if (t.checked) toast('Nice — done ✓'); render(); });
		if (t.hasAttribute('data-tdedit')) return todoModal((S.todos || []).find(function (x) { return +x.id === +a('data-tdedit'); }));
		if (t.hasAttribute('data-tddel')) { if (!confirm('Delete this to-do?')) return; return api('todo_delete', { id: +a('data-tddel') }).then(function (r) { S.todos = r; render(); }); }
		if (t.hasAttribute('data-tddone')) { S.tdDone = !S.tdDone; render(); return; }
		if (t.id === 'tdh-add') {
			var hi = $('#tdh-title'); if (!hi.value.trim()) { hi.focus(); return; }
			t.disabled = true;
			return api('todo_save', { title: hi.value }).then(function (r) { S.todos = r; toast('Added to the To-Do List ✓'); render(); }).catch(function (er) { t.disabled = false; toast(er.message, true); });
		}
		if (t.hasAttribute('data-tdmv')) {
			var ids = (S.todos || []).filter(function (x) { return !+x.done; }).map(function (x) { return +x.id; }), k = ids.indexOf(+a('data-tdmv')), d = +a('data-d');
			if (k < 0 || k + d < 0 || k + d >= ids.length) return;
			ids.splice(k + d, 0, ids.splice(k, 1)[0]);
			return saveTdOrder(ids);
		}
	});
	root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.target.id === 'td-title' || e.target.id === 'tdh-title')) { e.preventDefault(); var b = $(e.target.id === 'td-title' ? '#td-add' : '#tdh-add'); if (b) b.click(); } });
	function saveTdOrder(ids) {
		var pos = {}; ids.forEach(function (id, i) { pos[id] = i; });
		S.todos.sort(function (x, y) { return (+x.done - +y.done) || ((pos[+x.id] == null ? 1e9 : pos[+x.id]) - (pos[+y.id] == null ? 1e9 : pos[+y.id])); });
		render();
		return api('todo_order', { ids: ids }).then(function (r) { S.todos = r; }).catch(function (er) { toast('Couldn’t save the order: ' + er.message, true); });
	}
	/* drag to reorder (mouse + touch) using the ⠿ handle */
	root.addEventListener('pointerdown', function (e) {
		var g = e.target.closest('.mj-grip'); if (!g) return;
		var item = g.closest('.mj-td'), list = $('#mj-tdsort'); if (!item || !list) return;
		e.preventDefault(); item.classList.add('drag');
		var move = function (ev) {
			var sibs = $$('.mj-td', list).filter(function (x) { return x !== item; });
			var after = sibs.find(function (x) { var r = x.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
			if (after) list.insertBefore(item, after); else list.appendChild(item);
		};
		var upf = function () {
			window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', upf); window.removeEventListener('pointercancel', upf);
			item.classList.remove('drag');
			saveTdOrder($$('.mj-td', list).map(function (x) { return +x.getAttribute('data-tdid'); }));
		};
		window.addEventListener('pointermove', move); window.addEventListener('pointerup', upf); window.addEventListener('pointercancel', upf);
	});

	/* ── WEATHER: 7-day field forecast + flyability for the evening training window ── */
	S.wx = {}; S.wxField = (function () { try { return localStorage.getItem('mjdWxField') || 'monarch'; } catch (x) { return 'monarch'; } })(); S.wxDay = null; S.wxWin = 'pm';
	var WXF = [['monarch', 'Monarch', 'Mocksville'], ['laneys', 'Laney’s Airport', 'Maiden']];
	function wxLoad(f, fresh) {
		if (S.wx[f] && !fresh) return Promise.resolve(S.wx[f]);
		return api('wx', { field: f, fresh: fresh ? 1 : 0 }).then(function (r) { S.wx[f] = r; return r; });
	}
	function compass(d) { return ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(((+d % 360) / 22.5)) % 16]; }
	function hm(iso) { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
	/* Rate one hour: 3 great · 2 good · 1 marginal · 0 no-fly (paramotor training limits) */
	function wxHour(h) {
		var w = h.wind, g = h.gust, gf = Math.max(0, g - w), why = [];
		var s = w <= 6 ? 3 : w <= 9 ? 2 : w <= 12 ? 1 : 0;
		if (w > 12) why.push('wind ' + Math.round(w) + ' mph');
		if (gf >= 10 || g > 18) { s = 0; why.push('gusty'); } else if (gf >= 6 || g > 14) { s = Math.min(s, 1); why.push('gust factor ' + Math.round(gf)); } else if (gf >= 4) s = Math.min(s, 2);
		if (h.pop > 50) { s = 0; why.push(h.pop + '% rain'); } else if (h.pop > 25) { s = Math.min(s, 1); why.push(h.pop + '% rain'); } else if (h.pop > 15) s = Math.min(s, 2);
		if (h.w80 > 20) { s = Math.min(s, 1); why.push('strong winds aloft'); }
		return { s: s, why: why };
	}
	function wxDays(d) {
		var H = d.hourly, days = [];
		d.daily.time.forEach(function (day, i) {
			var sunset = new Date(d.daily.sunset[i]), RNG = { pm: ['13', '19'], am: ['09', '13'], all: ['07', '20'] }[S.wxWin], pm = !!RNG;
			var start = pm ? new Date(day + 'T' + RNG[0] + ':00') : new Date(sunset.getTime() - S.wxWin * 3600e3), end = pm ? new Date(day + 'T' + RNG[1] + ':00') : sunset;
			var hrs = [];
			H.time.forEach(function (t, k) {
				var tt = new Date(t); if (t.slice(0, 10) !== day || tt < new Date(start.getTime() - (pm ? 0 : 1800e3)) || tt > end) return;
				var h = { t: t, temp: H.temperature_2m[k], wind: H.wind_speed_10m[k], gust: H.wind_gusts_10m[k], dir: H.wind_direction_10m[k], pop: H.precipitation_probability[k] || 0, cloud: H.cloud_cover[k], w80: H.wind_speed_80m[k] };
				h.dark = tt > sunset; h.r = h.dark ? { s: null, why: [] } : wxHour(h); hrs.push(h);
			});
			if (!hrs.length) return;
			var all = hrs; hrs = all.filter(function (h) { return !h.dark; }); if (!hrs.length) hrs = all.slice(0, 1);
			var avg = function (k) { return hrs.reduce(function (a, h) { return a + h[k]; }, 0) / hrs.length; }, mx = function (k) { return Math.max.apply(null, hrs.map(function (h) { return h[k]; })); }, mn = function (k) { return Math.min.apply(null, hrs.map(function (h) { return h[k]; })); };
			var score = hrs.reduce(function (a, h) { return a + h.r.s; }, 0) / hrs.length, worst = Math.min.apply(null, hrs.map(function (h) { return h.r.s; }));
			var rating = Math.round(score); if (worst === 0 && score < 1.8) rating = Math.min(rating, 1);
			var reasons = []; hrs.forEach(function (h) { h.r.why.forEach(function (w) { if (reasons.indexOf(w.replace(/\d+/g, '#')) < 0) reasons.push(w.replace(/\d+/g, '#')); }); });
			var x = { day: day, sunset: d.daily.sunset[i], start: start, end: end, hrs: hrs, all: all, score: score, rating: rating, wmin: mn('wind'), wmax: mx('wind'), gmax: mx('gust'), gf: Math.max.apply(null, hrs.map(function (h) { return h.gust - h.wind; })), temp: avg('temp'), pop: mx('pop'), dir: compass(hrs[Math.floor(hrs.length / 2)].dir), cloud: avg('cloud') };
			var lbl = ['No-fly', 'Marginal', 'Good', 'Great'][rating];
			x.note = rating === 3 ? 'Calm and smooth — ideal for students.' : rating === 2 ? 'Flyable. Watch the gusts and keep an eye on the sky.' : rating === 1 ? 'Marginal — experienced pilots only, or kiting practice.' : 'Not a training day.';
			if (rating < 3) { var bad = []; if (x.wmax > 9) bad.push('wind up to ' + Math.round(x.wmax) + ' mph'); if (x.gf >= 6) bad.push('gusts ' + Math.round(x.gf) + ' mph over the wind'); if (x.pop > 25) bad.push(x.pop + '% chance of rain'); if (hrs.some(function (h) { return h.w80 > 20; })) bad.push('strong winds aloft'); if (bad.length) x.note = bad.join(', ').replace(/^./, function (c) { return c.toUpperCase(); }) + '. ' + (rating === 2 ? 'Flyable with care.' : rating === 1 ? 'Experienced pilots / kiting only.' : 'Skip it.'); }
			x.lbl = lbl; days.push(x);
		});
		return days;
	}
	function wxHtml() {
		var f = S.wxField, d = S.wx[f], RC = ['nofly', 'marginal', 'good', 'great'];
		var ctl = '<div class="mj-wx__controls"><div class="mj-viewseg mj-wx__sites" role="group" aria-label="Field">' + WXF.map(function (x) { return '<button data-wxf="' + x[0] + '" class="' + (f === x[0] ? 'is-active' : '') + '" aria-pressed="' + (f === x[0]) + '">' + esc(x[1]) + ' <small>' + esc(x[2]) + '</small></button>'; }).join('') + '</div>' +
			'<select class="mj-sel mj-wx__winsel" id="wx-win" aria-label="Hours">' + opts([['pm', 'Hours · 1 PM – 7 PM'], ['am', 'Hours · 9 AM – 1 PM'], ['all', 'Hours · All day'], ['3', 'Last 3 hrs before sunset'], ['2', 'Last 2 hrs before sunset']], String(S.wxWin)) + '</select>' + '<div class="mj-viewseg mj-wx__win" role="group" aria-label="Hours">' + [['pm', '1–7 PM'], ['am', '9 AM–1 PM'], ['all', 'All day'], ['3', 'Last 3 hrs'], ['2', 'Last 2 hrs']].map(function (o) { var on = String(S.wxWin) === o[0]; return '<button data-wxwin="' + o[0] + '" class="' + (on ? 'is-active' : '') + '" aria-pressed="' + on + '"' + (/\d/.test(o[0]) ? ' title="Before sunset"' : '') + '>' + o[1] + '</button>'; }).join('') + '</div>' +
			(d && d.fetched ? '<div class="mj-wx__meta">Updated ' + esc(new Date(d.fetched.replace(' ', 'T')).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })) + ' · <a href="https://ppg.report/' + d.lat + ',' + d.lon + '" target="_blank" rel="noopener">Full report on ppg.report ↗</a></div>' : '') + '</div>';
		if (!d) return ctl + '<div class="mj-empty">Loading the forecast…</div>';
		if (d.error) return ctl + '<div class="mj-empty">' + esc(d.error) + '</div>';
		var days = wxDays(d), best = days.slice().sort(function (a, b) { return b.score - a.score; })[0], good = best && best.rating >= 2;
		var dn = function (x) { var t = new Date(x.day + 'T12:00'); return x.day === today() ? 'Today' : t.toLocaleDateString('en-US', { weekday: 'long' }); };
		var md = function (x) { return new Date(x.day + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
		var top = '<div class="mj-wx__best' + (good ? '' : ' is-bad') + '"><div class="mj-wx__best-main"><div class="mj-wx__best-label">' + (good ? '★ Best day to fly this week' : 'This week') + '</div>' +
			(best ? '<div class="mj-wx__best-day"><b>' + esc(good ? dn(best) : 'No great days') + '</b><span>' + esc(good ? md(best) : 'Least-bad: ' + dn(best) + ', ' + md(best)) + '</span></div><p>' + esc(best.note) + '</p>' : '') + '</div>' +
			(best ? '<div class="mj-wx__best-stats"><div><small>Wind</small><b>' + Math.round(best.wmin) + '–' + Math.round(best.wmax) + '</b><span>mph ' + best.dir + '</span></div><div><small>Gusts</small><b>' + Math.round(best.gmax) + '</b><span>mph</span></div><div><small>Rain</small><b>' + best.pop + '%</b></div></div>' : '') + '</div>';
		var cards = days.map(function (x) {
			var open = S.wxDay === x.day;
			return '<button class="mj-wx-day is-' + RC[x.rating] + (open ? ' is-open' : '') + (good && x === best ? ' is-best' : '') + '" data-wxday="' + x.day + '" aria-expanded="' + open + '"><div class="mj-wx-day__head"><b>' + esc(dn(x)) + '</b><span>' + esc(md(x)) + '</span></div>' +
				'<em class="mj-wx-rating">' + x.lbl + '</em><div class="mj-wx-day__wind"><b>' + Math.round(x.wmin) + '–' + Math.round(x.wmax) + '</b><span>mph ' + x.dir + '</span></div>' +
				'<div class="mj-wx-day__rows">Gusts ' + Math.round(x.gmax) + ' · GF ' + Math.round(x.gf) + '<br>' + Math.round(x.temp) + '°F · ' + x.pop + '% rain<br>Sunset ' + esc(hm(x.sunset)) + '</div></button>';
		}).join('');
		var det = '', od = days.find(function (x) { return x.day === S.wxDay; });
		if (od) det = '<div class="mj-wx__hours"><div class="mj-wx__hours-head"><div class="mj-wx__hours-title"><span class="mj-label">Hour by hour</span><b>' + esc(dn(od) + ', ' + md(od)) + '</b><span class="mj-wx__hours-note">' + esc(od.note) + '</span></div><button class="mj-btn mj-btn--xs mj-btn--ghost" data-wxday="' + od.day + '">Hide</button></div>' +
			'<div class="mj-wx-table"><div class="mj-wx-table__head"><div>Time</div><div>Rating</div><div>Wind</div><div>Gusts</div><div>Dir</div><div>Temp</div><div>Rain</div><div>Aloft</div></div>' +
			od.all.map(function (h) { var gw = (h.gust - h.wind) > 6, rw = h.pop > 25; return '<div class="mj-wx-row' + (h.dark ? ' is-unrated' : '') + '"><div class="t">' + esc(hm(h.t)) + (h.dark ? ' <small>· after sunset</small>' : '') + '</div>' +
				'<div class="r">' + (h.dark ? '<span class="ok">—</span>' : '<em class="mj-wx-rating is-' + RC[h.r.s] + '">' + ['No-fly', 'Marginal', 'Good', 'Great'][h.r.s] + '</em>') + '</div>' +
				'<div class="w">' + Math.round(h.wind) + '<small>mph</small></div><div class="g ' + (gw ? 'warn' : 'ok') + '">' + Math.round(h.gust) + '<small> mph</small>' + (gw ? ' ▲' : '') + '</div><div class="d">' + compass(h.dir) + '</div><div class="tp">' + Math.round(h.temp) + '°F</div><div class="rn ' + (rw ? 'warn' : 'ok') + '">' + h.pop + '%</div><div class="a ' + (h.w80 > 20 ? 'warn' : 'ok') + '">' + Math.round(h.w80) + ' mph</div></div>'; }).join('') + '</div></div>';
		return ctl + top + '<div class="mj-wx__grid">' + cards + '</div>' + det +
			'<div class="mj-wx__legend"><span><i style="background:#1E7D4F"></i>Great · wind ≤ 6 mph</span><span><i style="background:#0F6E79"></i>Good · ≤ 9</span><span><i style="background:#E8A23C"></i>Marginal · ≤ 12</span><span><i style="background:#8A9BA3"></i>No-fly</span><p>Gusts more than 6 mph over the wind, rain over 25%, or strong winds aloft pull a day down. Ratings cover the hours you picked; hours after sunset are shown but not rated. Always make the final call at the field.</p></div>';
	}
	function wxRender() {
		var box = $('#mj-wxbox'), g0 = $('.mj-wx__grid'), sl = g0 ? g0.scrollLeft : 0; if (box) box.innerHTML = wxHtml(); var g1 = $('.mj-wx__grid'); if (g1 && sl) g1.scrollLeft = sl;
		var w = $('#wx-win'); if (w) w.onchange = function () { S.wxWin = /^\d+$/.test(w.value) ? +w.value : w.value; wxRender(); };
		if (!S.wx[S.wxField]) wxLoad(S.wxField).then(wxRender).catch(function (e) { S.wx[S.wxField] = { error: e.message }; wxRender(); });
	}
	function vWeather() { setTimeout(wxRender, 0); return '<section class="mj-wx2"><div id="mj-wxbox"></div></section>'; }
	function wxModal() { sm('<section class="mj-wx2 is-modal"><div class="mj-label">Field weather</div><h1 class="mj-wx__title">Weather</h1><div id="mj-wxbox"></div></section>'); $('#mjd-sm').classList.add('wide', 'mj-wxmodal'); wxRender(); }
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-wxf],[data-wxday],[data-wxwin],[data-act="wxpop"]'); if (!t) return;
		if (t.hasAttribute('data-wxwin')) { var wv = t.getAttribute('data-wxwin'); S.wxWin = /^\d+$/.test(wv) ? +wv : wv; return wxRender(); }
		if (t.getAttribute('data-act') === 'wxpop') { e.preventDefault(); return wxModal(); }
		if (t.hasAttribute('data-wxf')) { S.wxField = t.getAttribute('data-wxf'); S.wxDay = null; try { localStorage.setItem('mjdWxField', S.wxField); } catch (x) {} return wxRender(); }
		if (t.hasAttribute('data-wxday')) { var dd = t.getAttribute('data-wxday'); S.wxDay = S.wxDay === dd ? null : dd; return wxRender(); }
	});

	/* ── GEAR PRICING (Kangook dealer sheet, checked weekly) ── */
	S.price = null; S.pq = ''; S.pBrand = 'Kangook';
	function vPricing() {
		if (!S.price) { api('pricing').then(function (r) { S.price = r; render(); }).catch(function (e) { S.price = { error: e.message }; render(); }); return '<div class="mj-empty">Loading dealer prices…</div>'; }
		if (S.price.error) return '<div class="mj-empty">' + esc(S.price.error) + '</div>';
		var q = (S.pq || '').toLowerCase(), d = S.price, n = 0;
		var num = function (v) { return parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0; };
		var BR = [['Kangook', function (t) { return t.tab !== 'APCO wings'; }], ['APCO', function (t) { return t.tab === 'APCO wings'; }], ['MacFly', null], ['PAP', 'static'], ['Gin', null]];
		var br = BR.find(function (x) { return x[0] === S.pBrand; }) || BR[0];
		var gMeta = '';
		var brandBar = function () { return '<div class="mj-gear__brands"><div class="mj-viewseg mj-seg--lg" role="group" aria-label="Brand">' + BR.map(function (x) { return '<button data-pbrand="' + x[0] + '" class="' + (x[0] === br[0] ? 'is-active' : '') + '" aria-pressed="' + (x[0] === br[0]) + '">' + x[0] + '</button>'; }).join('') + '</div>' + (gMeta ? '<div class="mj-gear__meta">' + gMeta + '</div>' : '') + '</div>'; };
		var gTool = function (help, ph, btn) { return '<div class="mj-toolbar"><div class="mj-toolbar__help mj-gear__help">' + help + '</div><label class="mj-search mj-search--300">' + ic('search', 16) + '<input type="search" id="mjd-pq" placeholder="' + esc(ph) + '" aria-label="Search gear pricing" value="' + esc(S.pq) + '"></label>' + (btn || '') + '</div>'; };
		var gCard = function (title, cnt, head, rows, foot, cls) { return '<section class="mj-card mj-gear' + (cls ? ' ' + cls : '') + '"><div class="mj-card__head mj-card__head--bordered"><div class="mj-card__name">' + esc(title) + ' <em class="mj-pill">' + cnt + '</em></div>' + (cls ? '' : '<span class="mj-gear__hint">Margin = retail − dealer</span>') + '</div><div class="mj-gear__grid mj-gear__head">' + head + '</div>' + rows + '<div class="mj-gear__foot"><span>' + foot + '</span></div></section>'; };
		var link = function (word) { var l = MJD.links.pricing.find(function (x) { return x[0].toLowerCase().indexOf(word.toLowerCase()) === 0; }); return l ? l[1] : ''; };
		if (br[1] === 'static') {
			var PAP = { updated: 'sample prices', src: '#demo', sections: [
				{ title: 'PAP Tinox V2 1400 — complete paramotors', items: [
					['P80', 'PAP Tinox V2 1400 · Vittorazi Atom 80 MY25 (red. 3.80)', '€4,410'],
					['P125', 'PAP Tinox V2 1400 · Onyx 125', '€4,090'],
					['P185', 'PAP Tinox V2 1400 · Vittorazi Moster Plus MY25 (red. 2.87)', '€5,030'],
					['P185D', 'PAP Tinox V2 1400 · Vittorazi Moster Dual MY25 (red. 2.87)', '€5,070'],
					['P185R', 'PAP Tinox V2 1400 · Vittorazi Moster Factory R MY25 (red. 2.87)', '€5,250'],
					['P185E', 'PAP Tinox V2 1400 · Vittorazi Moster EFI MY25', '€7,100'],
					['P202', 'PAP Tinox V2 1400 · Polini Thor 202 (Tryton carb, red. 2.8)', '€4,540'],
					['P260', 'PAP Tinox V2 1400 · Polini Thor 260 E (Tryton carb, red. 2.8)', '€5,900'] ] },
				{ title: 'Paramotor options', items: [
					['OP09', '10 liter fuel tank', '€40'], ['OP010', '17 liter fuel tank', '€40'], ['OP039', '1500 cage', '€120'], ['OP040', 'Black cage', '€50'],
					['OP042', 'Off Grid throttle', '€170'], ['OP042E', 'Off Grid throttle — electric starter', '€180'], ['OP042F', 'Off Grid throttle — EFI', '€170'] ] } ] };
			var qq = (S.pq || '').toLowerCase();
			var secs = PAP.sections.map(function (sec) { var it = sec.items.filter(function (x) { return !qq || (x[0] + ' ' + x[1]).toLowerCase().indexOf(qq) > -1; }); if (!it.length) return '';
				return gCard(sec.title, it.length, '<div>Code</div><div>Item</div><div class="num">Dealer (EUR)</div>', it.map(function (x) { return '<div class="mj-gear__grid mj-gear__row"><div class="mj-gear__code">' + esc(x[0]) + '</div><div class="mj-gear__name">' + esc(x[1]) + '</div><div class="num mj-gear__retail">' + esc(x[2]) + '</div></div>'; }).join(''), 'PAP USA dealer price list, ' + esc(PAP.updated) + ' · euros, without VAT and shipping', 'mj-gear--pap'); }).join('');
			gMeta = '<span>Dealer sheet <b>' + esc(PAP.updated) + '</b> · PDF, update by hand</span><i class="mj-gear__sep"></i><a href="' + esc(PAP.src) + '" target="_blank" rel="noopener">Open the PDF ↗</a>';
			return gTool('PAP USA dealer price list — prices in euros, <b>without VAT and shipping</b>. Send the new PDF when PAP updates it.', 'Search PAP, e.g. Moster, Thor, cage') + brandBar() +
				(secs || '<div class="mj-empty">No PAP items match “' + esc(S.pq) + '”.</div>');
		}
		if (!br[1]) {
			var lk = link(br[0]);
			return gTool('Pick a brand to see its dealer prices. <b>Dealer prices are confidential.</b>', 'Search gear') + brandBar() +
				'<div class="mj-empty" style="margin-top:18px"><b>' + esc(br[0]) + ' prices aren’t connected yet.</b><br>' + (lk ? 'Their dealer sheet is a private file the website can’t read automatically. <a href="' + esc(lk) + '" target="_blank" rel="noopener">Open the ' + esc(br[0]) + ' dealer sheet ↗</a>' : 'There’s no ' + esc(br[0]) + ' dealer sheet linked yet.') + '<br>Share it as “anyone with the link can view” (a Google Sheet works best) and it can be pulled in weekly like Kangook.</div>';
		}
		var allSecs = []; d.tabs.filter(br[1]).forEach(function (t) { t.sections.forEach(function (sec) { allSecs.push({ tab: t, sec: sec, key: t.tab + '|' + sec.title }); }); });
		var matches = function (x) { return x.sec.items.filter(function (it) { return !q || (it.name + ' ' + it.notes + ' ' + x.sec.title + ' ' + x.tab.tab).toLowerCase().indexOf(q) > -1; }); };
		if (!q && !allSecs.some(function (x) { return x.key === S.pCat; })) S.pCat = allSecs.length ? allSecs[0].key : '';
		var chips = '<div class="mj-gear__cats">' + allSecs.map(function (x) { var c = matches(x).length; return (q && !c) ? '' : '<button class="mj-filter' + (!q && x.key === S.pCat ? ' is-active' : '') + '" data-pcat="' + esc(x.key) + '">' + esc(x.sec.title.replace(/^Complete /i, '')) + ' <span>' + c + '</span></button>'; }).join('') + '</div>';
		var row = function (it) {
			if (it.dealer && it.dealer.indexOf('$') < 0) { it = Object.assign({}, it, { name: it.name + ' — ' + it.dealer, dealer: '' }); }
			var m = it.dealer ? num(it.retail) - num(it.dealer) : 0, eol = /discontinu/i.test(it.notes || ''), note = String(it.notes || '');
			var tag = eol ? '<em class="mj-tag mj-tag--warn">Discontinued</em>' : /baseline/i.test(note) ? '<em class="mj-tag">Baseline</em>' : '';
			var noteTxt = note.replace(/discontinued[.,:;–—-]*\s*/i, '');
			return '<div class="mj-gear__grid mj-gear__row' + (eol ? ' is-eol' : '') + (it.changed || it.new ? ' is-chg' : '') + '"><div class="mj-gear__name">' + (it.link ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.name) + '</a>' : esc(it.name)) + (it.changed ? '<span class="mj-prchg">was ' + esc(it.changed[0]) + ' / ' + esc(it.changed[1]) + '</span>' : it.new ? '<span class="mj-prchg">new</span>' : '') + '</div>' +
				'<div class="num mj-gear__dealer' + (it.dealer ? '' : ' is-empty') + '">' + esc(it.dealer || '—') + '</div><div class="num mj-gear__retail">' + esc(it.retail || '—') + '</div><div class="num mj-gear__margin' + (m > 0 ? '' : ' is-empty') + '">' + (m > 0 ? '$' + Math.round(m).toLocaleString('en-US') : '—') + '</div>' +
				'<div class="mj-gear__notes">' + tag + (noteTxt ? '<span title="' + esc(noteTxt) + '">' + esc(noteTxt) + '</span>' : '') + '</div></div>';
		};
		var shown = allSecs.filter(function (x) { return q ? matches(x).length : x.key === S.pCat; });
		var cards = shown.map(function (x) { var items = matches(x); n += items.length; return gCard(x.sec.title, items.length, '<div>Item</div><div class="num">Dealer</div><div class="num">Retail (MSRP)</div><div class="num">Margin</div><div>Notes</div>', items.map(row).join(''), 'Prices from ' + esc(x.tab.tab) + (x.tab.updated ? ' · sheet updated ' + esc(x.tab.updated) : '')); }).join('');
		var upd = (d.tabs.filter(br[1])[0] || {}).updated;
		gMeta = (upd ? '<span>Sheet updated <b>' + esc(upd) + '</b>' : '<span>') + (d.checked ? ' · checked ' + esc(dt(d.checked).replace(/, \d{4}$/, '')) : '') + (d.next ? ' · next check ' + esc(dt(d.next).replace(/, \d{4}$/, '')) : '') + (d.changed ? ' · <b>' + d.changed + ' price change' + (d.changed === 1 ? '' : 's') + '</b>' : '') + '</span><i class="mj-gear__sep"></i>' + MJD.links.pricing.map(function (l) { return '<a href="' + esc(l[1]) + '" target="_blank" rel="noopener">' + esc(l[0].replace(/ dealer.*$/i, '')) + ' ↗</a>'; }).join('');
		return gTool('Kangook America dealer sheet — paramotors, engines, trikes and APCO gear. <b>Dealer prices are confidential.</b>', 'Search gear, e.g. F5, Moster', '<button class="mj-btn mj-btn--outline mj-prref" data-act="prref" title="Check the dealer sheet for new prices now" aria-label="Check for new prices now">' + ic('refresh', 16) + '<span>Check now</span></button>') + brandBar() + chips +
			(cards || '<div class="mj-empty">No gear matches “' + esc(S.pq) + '”.</div>');
	}
	/* ── LOGIN CREDENTIALS (encrypted on the server, team only) ── */
	function credsModal() {
		sm('<section class="mj-log"><header><span class="mj-lk">Team only</span><h3>Login Credentials</h3><p class="mjd-sub">Shared Mojo’s accounts. Stored encrypted — tap Show to reveal a password, Copy to copy it.</p></header><div id="mj-crbox"><div class="mjd-empty">Loading…</div></div></section>');
		$('#mjd-sm').classList.add('wide');
		api('creds').then(function (r) { S.creds = r || []; credsRender(); }).catch(function (e) { $('#mj-crbox').innerHTML = '<div class="mjd-empty">' + esc(e.message) + '</div>'; });
	}
	function credsRender() {
		var b = $('#mj-crbox'); if (!b) return;
		b.innerHTML = '<div class="mj-crl">' + (S.creds.length ? S.creds.map(function (c) {
			return '<div class="mj-cr"><div class="mj-crh"><b>' + esc(c.service) + '</b>' + (c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">Open ↗</a>' : '') + '<button class="mjd-link" data-cred="' + esc(c.id) + '">Edit</button></div>' +
				(c.username ? '<div class="mj-crf2"><span>Login</span><code>' + esc(c.username) + '</code><button class="mj-crb" data-ccopy="u:' + esc(c.id) + '">Copy</button></div>' : '') +
				(c.password ? '<div class="mj-crf2"><span>Password</span><code class="pw" data-pw="' + esc(c.id) + '">••••••••••</code><button class="mj-crb" data-cshow="' + esc(c.id) + '">Show</button><button class="mj-crb" data-ccopy="p:' + esc(c.id) + '">Copy</button></div>' : '') +
				(c.notes ? '<p class="mj-crn">' + esc(c.notes).replace(/\n/g, '<br>') + '</p>' : '') + '</div>';
		}).join('') : '<div class="mjd-empty">No accounts saved yet.</div>') + '</div><button class="mj-b mjd-c-gold mj-lgo" data-cred="">' + ic('plus') + 'Add an account</button>';
	}
	function credEdit(c) {
		c = c || {};
		var b = $('#mj-crbox');
		b.innerHTML = '<label class="mj-ll" for="cr-s">Account</label><input type="text" id="cr-s" value="' + esc(c.service || '') + '" placeholder="e.g. Instagram">' +
			'<label class="mj-ll" for="cr-u">Login / email</label><input type="text" id="cr-u" value="' + esc(c.username || '') + '" autocomplete="off">' +
			'<label class="mj-ll" for="cr-p">Password</label><input type="text" id="cr-p" value="' + esc(c.password || '') + '" autocomplete="off">' +
			'<label class="mj-ll" for="cr-l">Website (optional)</label><input type="text" id="cr-l" value="' + esc(c.url || '') + '" placeholder="https://">' +
			'<label class="mj-ll" for="cr-n">Notes</label><textarea id="cr-n" rows="3">' + esc(c.notes || '') + '</textarea>' +
			'<div class="mjd-status" id="cr-st"></div><div class="mj-crbtns"><button class="mj-b mjd-c-gold" id="cr-go">Save</button><button class="mj-b" id="cr-cancel">Cancel</button>' + (c.id ? '<button class="mj-b mj-redl" id="cr-del">Delete</button>' : '') + '</div>';
		$('#cr-cancel').onclick = credsRender;
		$('#cr-go').onclick = function () { api('creds_save', { id: c.id || '', service: $('#cr-s').value, username: $('#cr-u').value, password: $('#cr-p').value, url: $('#cr-l').value, notes: $('#cr-n').value }).then(function (r) { S.creds = r; toast('Saved ✓'); credsRender(); }).catch(function (e) { $('#cr-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }); };
		if ($('#cr-del')) $('#cr-del').onclick = function () { if (!confirm('Delete ' + c.service + '?')) return; api('creds_delete', { id: c.id }).then(function (r) { S.creds = r; credsRender(); }); };
	}
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-cred],[data-cshow],[data-ccopy]'); if (!t) return;
		var find = function (id) { return (S.creds || []).find(function (x) { return x.id === id; }); };
		if (t.hasAttribute('data-cred')) return credEdit(find(t.getAttribute('data-cred')));
		if (t.hasAttribute('data-cshow')) { var id = t.getAttribute('data-cshow'), el = $('[data-pw="' + id + '"]'), c = find(id); var shown = t.textContent === 'Hide'; el.textContent = shown ? '••••••••••' : c.password; t.textContent = shown ? 'Show' : 'Hide'; return; }
		if (t.hasAttribute('data-ccopy')) { var v = t.getAttribute('data-ccopy'), cc = find(v.slice(2)); var txt = v[0] === 'u' ? cc.username : cc.password; (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Copied ✓'); }).catch(function () { toast('Couldn’t copy — tap Show and copy it by hand', true); }); }
	});
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-act="prref"],[data-act="creds"],[data-pbrand],[data-pcat]'); if (!t) return;
		if (t.hasAttribute('data-pbrand')) { S.pBrand = t.getAttribute('data-pbrand'); S.pCat = ''; render(); return; }
		if (t.hasAttribute('data-pcat')) { e.preventDefault(); S.pCat = t.getAttribute('data-pcat'); render(); return; }
		if (t.getAttribute('data-act') === 'creds') { e.preventDefault(); return credsModal(); }
		t.disabled = true; toast('Checking the dealer sheet…');
		api('pricing_refresh').then(function (r) { S.price = r; toast(r.changed ? r.changed + ' price change(s) found' : 'Prices are up to date ✓'); render(); }).catch(function (er) { t.disabled = false; toast(er.message, true); });
	});
	root.addEventListener('input', function (e) { if (e.target.id === 'mjd-pq') { S.pq = e.target.value; var pos = e.target.selectionStart; render(); var n = $('#mjd-pq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });

	/* ── Install the Mojo's app (Add to Home Screen) ── */
	var isApp = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
	var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent), deferredInstall = null;
	deferredInstall = window.__mjdBIP || null;
	document.addEventListener('mjd-bip', function () { deferredInstall = window.__mjdBIP || null; if (S.tab === 'home') render(); });
	function appBanner() {
		if (isApp) return '';
		try { if (localStorage.getItem('mjdAppHide')) return ''; } catch (x) {}
		return '<div class="mj-banner"><span class="mj-banner__icon">' + ic('phone', 16) + '</span><p><b>Get the Mojo’s app.</b> Put Mojo’s on your home screen — one tap, opens full-screen, stays signed in.</p><div class="mj-banner__actions"><button class="mj-btn mj-btn--dark mj-btn--sm" data-act="appinstall">Install</button><button class="mj-iconbtn" data-act="apphide" aria-label="Dismiss">✕</button></div></div>';
	}
	function appInstall() {
		deferredInstall = deferredInstall || window.__mjdBIP || null;
		if (window.__mjdInstalled) { toast('Installed ✓ — open Mojo’s from your home screen'); return; }
		if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.then(function (c) { window.__mjdBIP = null; deferredInstall = null; if (c && c.outcome === 'accepted') toast('Installing Mojo’s… ✓'); render(); }); return; }
		sm('<section class="mj-log"><header><span class="mj-lk">Mojo’s app</span><h3>Add to Home Screen</h3><p class="mjd-sub">Takes 10 seconds. After this, just tap the Mojo’s icon.</p></header>' +
			(isIOS ? '<ol class="mj-steps"><li>Open this page in <b>Safari</b> (mojosflightschool.com/hq).</li><li>Tap the <b>Share</b> button <span class="k">⬆︎</span> at the bottom of the screen.</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>. The Mojo’s icon appears on your home screen.</li></ol>'
				: '<ol class="mj-steps"><li>Open this page in <b>Chrome</b> (mojosflightschool.com/hq).</li><li>Tap the <b>⋮</b> menu in the top-right corner.</li><li>Tap <b>Add to Home screen</b> → <b>Install</b>.</li><li>The Mojo’s icon appears on your home screen and in your apps.</li></ol>') +
			'<p class="mjd-m">Already installed it? Open Mojo’s from your home screen or app drawer. Chrome only shows its one-tap Install when the app isn’t on this phone yet. On a computer, click the install icon at the right end of the Chrome or Edge address bar.</p></section>');
	}
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-act="appinstall"],[data-act="apphide"]'); if (!t) return;
		if (t.getAttribute('data-act') === 'apphide') { try { localStorage.setItem('mjdAppHide', '1'); } catch (x) {} render(); return; }
		appInstall();
	});
	if (isApp) document.documentElement.classList.add('mj-isapp');

	/* ── USPPA PPG 1 / PPG 2 rating checklist (USPPA Solo Ratings Program) ── */
	var PPG = [
		{ r: 'PPG 1', sub: 'First solo — the pilot’s first two flights under instructor supervision.', groups: [
			{ t: 'Ground requirements', items: [
				['p1g1', 'Proper layout and pre-flight check of canopy and motor (including harness)'],
				['p1g2', 'Has successfully completed a basic ground school'],
				['p1g3', 'Understands proper canopy packing, storage and care'],
				['p1g4', 'Site analysis: wind direction & velocity, terrain shape, obstructions and engine-out planning'],
				['p1g5', 'Proper canopy handling and kiting skills'],
				['p1g6', 'Explains motor, propeller and fueling safety'],
				['p1g7', 'Understands basic motor operation, at least two ways to shut it off, and what to look for on the preflight run-up'],
				['p1g8', 'Explains effects of center of gravity and wing connection location on the harness or cart frame'],
				['p1g9', 'Explains the cause and cure of rollover-type accidents', 'WL'],
				['p1g10', 'Passed the USPPA PPG 1 written exam']
			] },
			{ t: 'Flight requirements', items: [
				['p1f1', 'Two controlled forward inflations with a visual canopy check each time'],
				['p1f2', 'Two controlled reverse inflations with proper surge dampening', 'FL'],
				['p1f3', 'Half a minute of controlled kiting overhead in a steady wind', 'FL'],
				['p1f4', '15 seconds of controlled taxiing without lifting off', 'WL'],
				['p1f5', 'Establishes proper connection to the wing (cleared lines & risers) just before inflation'],
				['p1f6', 'Two unassisted flights (other than radio)']
			] }
		] },
		{ r: 'PPG 2', sub: 'Novice pilot — can fly on their own within the PPG 2 limits.', groups: [
			{ t: 'Ground requirements', items: [
				['p2g1', 'Uses good judgment and maturity appropriate for the rating'],
				['p2g2', 'Attended at least 8 hours of ground school'],
				['p2g3', 'Explains correct canopy maintenance'],
				['p2g4', 'Sets up and preflights glider, harness and reserve (reserve may be explained)'],
				['p2g5', 'Verbal site analysis with a flight plan (flight path, avoidance areas, obstacles, wind effects)'],
				['p2g6', 'Demonstrates proper, effective PLF technique'],
				['p2g7', 'Reserve deployment while hanging in a harness (simulated turbulence/malfunction)'],
				['p2g8', 'Explains airspace for PPG, finding legal areas on sectionals, and how to get a weather briefing'],
				['p2g9', 'Explains strong-wind landing procedures and how to avoid being dragged'],
				['p2g10', 'Trained in collapses, stalls, spins & turbulence; knows the canopy manual and USPPA incident reports'],
				['p2g11', 'Explains how to shorten and lengthen the flight path with no power'],
				['p2g12', 'Explains speedbar and trimmers — use, risks and limits (incl. reflex wings)'],
				['p2g13', 'Explains right-of-way traffic rules'],
				['p2g14', 'Explains keeping directional control through a 25% asymmetric wing fold'],
				['p2g15', 'Passed the USPPA PPG 2 written exam and reviewed incorrect answers']
			] },
			{ t: 'Flight requirements', items: [
				['p2f1', 'Consistently succeeds at no-wind (0–2 mph) inflations'],
				['p2f2', 'Consistently succeeds at reverse inflations with proper surge dampening', 'FL'],
				['p2f3', 'Two minutes of controlled kiting overhead', 'FL'],
				['p2f4', '30 seconds of controlled taxiing without lifting off', 'WL'],
				['p2f5', 'Two cross-wind launches (> 15° cross) in light wind (≤ 5 mph)'],
				['p2f6', 'Consistently (3 of 4) lands power-on within 15 ft of a target, into the wind'],
				['p2f7', 'Briefs and instructs ground crew for an assisted launch', 'WL'],
				['p2f8', 'Smooth airspeed & throttle changes in level flight, from just above min sink to fast, on a constant heading'],
				['p2f9', 'Alternating S-turns (≥ 90° heading change) along a planned path'],
				['p2f10', 'Hands-off flying, smooth climb and descent using throttle only'],
				['p2f11', 'Hands-off flying with weight-shift (if available) and rear-riser turns'],
				['p2f12', 'Optional PPG 2 PL: consistently lands within 40 ft of a target, no thrust below 300 ft AGL', 'PL']
			] },
			{ t: 'Minimum logged experience', items: [
				['p2x1', 'At least 25 logged flights (USHPA P2+ pilots may count 15 unpowered flights)'],
				['p2x2', 'At least 5 flying days']
			] }
		] }
	];
	function ppgItems(p, ri) { var wl = isWheel(p); var out = []; PPG[ri].groups.forEach(function (g) { g.items.forEach(function (it) { if (it[2] === 'PL') return; if (it[2] === 'WL' && !wl) return; if (it[2] === 'FL' && wl) return; out.push(it[0]); }); }); return out; }
	function ppgData(p) { try { return JSON.parse(p.ppg || '{}') || {}; } catch (x) { return {}; } }
	function ppgCount(p, ri) { var d = ppgData(p), ids = ppgItems(p, ri); return [ids.filter(function (k) { return d[k]; }).length, ids.length]; }
	function ppgModal(p) {
		var d = ppgData(p), wl = isWheel(p);
		var body = PPG.map(function (R, ri) {
			var c = ppgCount(p, ri), pct = c[1] ? Math.round(c[0] / c[1] * 100) : 0;
			return '<section class="mj-ppgr"><div class="mj-ppgh"><h4>' + R.r + '</h4><span>' + c[0] + ' of ' + c[1] + (c[0] === c[1] ? ' · ready to rate ✓' : '') + '</span></div><div class="mj-ppgbar"><i style="width:' + pct + '%"></i></div><p class="mjd-m">' + esc(R.sub) + '</p>' +
				R.groups.map(function (g) {
					return '<h5>' + esc(g.t) + '</h5>' + g.items.filter(function (it) { return !(it[2] === 'WL' && !wl) && !(it[2] === 'FL' && wl); }).map(function (it) {
						var x = d[it[0]];
						return '<label class="mj-ppgi' + (x ? ' on' : '') + '"><input type="checkbox" data-ppg="' + it[0] + '"' + (x ? ' checked' : '') + '><span>' + esc(it[1]) + (it[2] === 'PL' ? ' <em class="opt">optional</em>' : '') + (x ? '<small>✓ ' + esc(x.by || '') + (x.d ? ' · ' + esc(dt(x.d)) : '') + '</small>' : '') + '</span></label>';
					}).join('');
				}).join('') + '</section>';
		}).join('');
		sm('<section class="mj-log"><header><span class="mj-lk">USPPA ratings</span><h3>' + esc(p.first || name(p)) + '’s PPG Checklist</h3><p class="mjd-sub">' + (wl ? 'Wheel launch' : 'Foot launch') + ' requirements from the USPPA Solo Ratings Program. Tick each item when the student completes it — your name and the date are saved.</p></header><div class="mj-ppg">' + body + '</div></section>');
		$('#mjd-sm').classList.add('wide');
		$$('#mjd-sm [data-ppg]').forEach(function (cb) {
			cb.onchange = function () {
				var k = cb.getAttribute('data-ppg'), on = cb.checked;
				api('ppg_set', { id: p.id, item: k, on: on ? 1 : 0 }).then(function (r) {
					p.ppg = r.ppg; var sp = S.people.find(function (x) { return x.id === p.id; }); if (sp) sp.ppg = r.ppg; if (S.cur && S.cur.person.id === p.id) S.cur.person.ppg = r.ppg;
					var top = $('#mjd-sm-body').scrollTop; ppgModal(p); $('#mjd-sm-body').scrollTop = top;
				}).catch(function (e) { cb.checked = !on; toast(e.message, true); });
			};
		});
	}
	function ppgChip(p) { var a = ppgCount(p, 0), b = ppgCount(p, 1); return '<button type="button" class="mj-ppgchip" data-ppgopen="' + p.id + '">PPG 1 ' + a[0] + '/' + a[1] + ' · PPG 2 ' + b[0] + '/' + b[1] + '</button>'; }
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-ppgopen]'); if (!t) return;
		e.preventDefault(); e.stopPropagation();
		var id = +t.getAttribute('data-ppgopen'), p = (S.cur && S.cur.person.id === id) ? S.cur.person : S.people.find(function (x) { return x.id === id; });
		if (p) ppgModal(p);
	}, true);

	/* account menu on the logo */
	document.addEventListener('click', function (e) {
		var m = $('#mj-acm'), btn = $('.mj-acct .mj-logo2'); if (!m) return;
		if (e.target.closest('[data-act="acct"]')) { e.preventDefault(); var open = m.hidden; m.hidden = !open; btn.setAttribute('aria-expanded', open); return; }
		if (!m.hidden && (!e.target.closest('#mj-acm') || e.target.closest('[data-tab]'))) { m.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
	});
	document.addEventListener('keydown', function (e) { var m = $('#mj-acm'); if (e.key === 'Escape' && m && !m.hidden) m.hidden = true; });

	/* ── Electronic waivers ── */
	function hasFlown(p) { return +p.flown || p.stage === 'flying' || p.stage === 'almost-done' || p.status === 'graduated'; }
	function wvOf(p) { return (S.waivers || {})[p.id] || null; }
	function wvTag(p) {
		var w = wvOf(p);
		if (w && w.status === 'paper') return '<span class="mj-wv ok" title="Paper waiver on file">✓ Waiver on file</span>';
		if (w && w.status === 'signed') return '<span class="mj-wv ok" title="Waiver signed">✓ Waiver signed' + (w.signed_at_local ? ' · ' + esc(dt(w.signed_at_local).replace(/, \d{4}$/, '')) : '') + '</span>';
		if (w) return '<span class="mj-wv sent" title="Waiver sent, not signed yet">Waiver sent' + (w.opened_at ? ' · opened' : '') + '</span>';
		return '<span class="mj-wv no">No waiver</span>';
	}
	function wvCardChip(p) {
		var w = wvOf(p);
		if (w && w.status === 'paper') return '<span class="mj-wvc ok" title="Paper waiver on file">✓ Waiver</span>';
		if (w && w.status === 'signed') return '<a class="mj-wvc ok" href="' + esc(MJD.siteUrl + 'waiver/' + w.token) + '" target="_blank" rel="noopener" title="View signed waiver">✓ Waiver</a>';
		return '<button type="button" class="mj-wvc no" data-wvsend="' + p.id + '">' + (w ? 'Resend waiver' : 'Send waiver') + '</button>';
	}
	function wvBtn(p) {
		var w = wvOf(p);
		if (w && w.status === 'paper') return '<span class="mjd-btn sm mj-wvb ok">✓ Waiver on file</span>';
		if (w && w.status === 'signed') return '<a class="mjd-btn sm mj-wvb ok" href="' + esc(MJD.siteUrl + 'waiver/' + w.token) + '" target="_blank" rel="noopener">✓ Waiver signed · View</a>';
		return '<button class="mjd-btn sm mj-wvb" data-wvsend="' + p.id + '">📝 ' + (w ? 'Resend Waiver' : 'Send Waiver') + '</button>';
	}
	function wvModal(p) {
		var w = wvOf(p);
		sm('<section class="mj-log"><header><span class="mj-lk">Electronic signature</span><h3>Send Waiver</h3><p class="mjd-sub">' + esc(name(p)) + ' gets a private link to read the waiver, fill in their details and sign with their typed name. It’s saved permanently with a full audit record.</p></header>' +
			(w ? '<p class="mjd-m">' + (w.status === 'signed' ? 'Already signed.' : 'Link sent ' + esc(dt(w.sent_at)) + (w.sent_to ? ' to ' + esc(w.sent_to) : '') + (w.opened_at ? ' · opened ' + esc(dt(w.opened_at)) : ' · not opened yet') + '. Sending again reuses the same link.') + '</p>' : '') +
			'<label class="mj-ll" for="wv-em">Email</label><input type="text" id="wv-em" value="' + esc(p.email || (w && w.sent_to) || '') + '" placeholder="student@email.com">' +
			'<div class="mjd-status" id="wv-st"></div><div class="mj-crbtns"><button class="mj-b mjd-c-gold" id="wv-go">' + ic('mail', 16) + 'Email the waiver</button><button class="mj-b" id="wv-copy">' + ic('text', 16) + 'Copy link to text</button></div>' +
			'<p class="mjd-m" style="margin-top:16px">Already has a signed paper waiver? <button class="mjd-link" id="wv-paper">Mark waiver on file</button></p></section>');
		$('#wv-paper').onclick = function () { api('waiver_paper', { id: p.id }).then(function () { smClose(); toast('Waiver marked on file ✓'); load(); }); };
		var done = function (r, how) { S.waivers = S.waivers || {}; load(); if (how === 'copy') { (navigator.clipboard ? navigator.clipboard.writeText(r.url) : Promise.reject()).then(function () { toast('Link copied — paste it into a text ✓'); }).catch(function () { $('#wv-st').innerHTML = '<span class="mjd-m">Copy this link:</span><br><code>' + esc(r.url) + '</code>'; }); } else { smClose(); toast('Waiver emailed to ' + $('#wv-em').value + ' ✓'); } };
		$('#wv-go').onclick = function () { var b = this; b.disabled = true; api('waiver_send', { id: p.id, email: $('#wv-em').value }).then(function (r) { done(r, 'mail'); }).catch(function (e) { b.disabled = false; $('#wv-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }); };
		$('#wv-copy').onclick = function () { api('waiver_send', { id: p.id, email: $('#wv-em').value, copy_only: 1 }).then(function (r) { done(r, 'copy'); }).catch(function (e) { $('#wv-st').innerHTML = '<span class="bad">' + esc(e.message) + '</span>'; }); };
	}
	root.addEventListener('click', function (e) {
		var t = e.target.closest('[data-wvsend]'); if (!t) return;
		e.preventDefault(); e.stopPropagation();
		var id = +t.getAttribute('data-wvsend'), p = (S.cur && S.cur.person.id === id) ? S.cur.person : S.people.find(function (x) { return x.id === id; });
		if (p) wvModal(p);
	}, true);

	/* ── Waiver Archive ── */
	S.wvArch = null; S.wvq = '';
	function vWaivers() {
		if (!S.wvArch) { api('waiver_archive').then(function (r) { S.wvArch = r || []; render(); }).catch(function (e) { S.wvArch = []; toast(e.message, true); }); return '<div class="mj-empty">Loading signed waivers…</div>'; }
		var q = (S.wvq || '').toLowerCase();
		var list = S.wvArch.filter(function (w) { return !q || (w.signer_name + ' ' + w.signer_email).toLowerCase().indexOf(q) > -1; });
		var unsigned = byStatus('active').filter(function (p) { var w = wvOf(p); return !(w && (w.status === 'signed' || w.status === 'paper')); });
		return '<div class="mj-tbar"><p class="mj-desc">Every signed waiver, stored permanently with its signature certificate and audit trail. ' + S.wvArch.length + ' on file.' + (unsigned.length ? ' <b>' + unsigned.length + ' active student' + (unsigned.length === 1 ? '' : 's') + ' still need one.</b>' : '') + '</p>' +
			'<label class="mj-in">' + ic('search') + '<input type="search" id="mjd-wvq" placeholder="Search name or email" aria-label="Search waivers" value="' + esc(S.wvq) + '"></label></div>' +
			'<section class="mj-card" style="margin-top:18px"><div class="mj-card__head mj-card__head--bordered"><div class="mj-card__name">Signed waivers <em class="mj-pill">' + list.length + '</em></div></div>' +
			(list.length ? list.map(function (w) {
				var stillHere = S.people.some(function (p) { return +p.id === +w.person_id; });
				var nm = String(w.signer_name || ''), parts = nm.split(/\s+/), ini = ((parts[0] || '?').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
				var when = esc(dt(w.signed_at_local)) + ' · ' + esc(new Date(String(w.signed_at_local).replace(' ', 'T')).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
				return '<div class="mj-wvrow"><span class="mj-avatar mj-avatar--ok">✓</span><div class="mj-wvrow__main"><div class="mj-wvrow__top"><span class="mj-item__title"' + (stillHere ? ' data-open="' + w.person_id + '"' : '') + '>' + esc(nm) + '</span><em class="mj-pill mj-pill--ok">Signed</em></div>' +
					'<div class="mj-item__sub">' + when + (w.place ? ' · ' + esc(w.place) : '') + '</div>' +
					'<div class="mj-wvrow__meta">' + esc(w.signer_email || '') + ' · Record #' + w.id + ' · ' + esc(w.doc_version) + '</div></div>' +
					'<a class="mj-btn mj-btn--xs mj-btn--outline mj-wvrow__btn" href="' + esc(MJD.siteUrl + 'waiver/' + w.token) + '" target="_blank" rel="noopener">' + ic('file', 15) + 'View</a></div>';
			}).join('') : '<div class="mj-card__empty">' + (q ? 'No signed waivers match “' + esc(S.wvq) + '”.' : 'No signed waivers yet.') + '</div>') + '</section>';
	}
	root.addEventListener('input', function (e) { if (e.target.id === 'mjd-wvq') { S.wvq = e.target.value; var pos = e.target.selectionStart; render(); var n = $('#mjd-wvq'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } });

	/* global search + hash nav */
	var gq = $('#mj-gq');
	gq.addEventListener('input', function () { gSearch(gq.value); });
	gq.addEventListener('focus', function () { gSearch(gq.value); });
	document.addEventListener('click', function (e) { var box = $('#mj-gres'); if (!box || box.hidden) return; if (!e.target.closest('.mj-gs')) box.hidden = true; else if (e.target.closest('#mj-gres [data-open]')) { box.hidden = true; gq.value = ''; } });
	document.addEventListener('click', function (e) { $$('details.mj-dd[open]').forEach(function (d) { if (!d.contains(e.target)) d.removeAttribute('open'); }); });
	document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); gq.focus(); gq.select(); } if (e.key === 'Escape' && document.activeElement === gq) { gq.value = ''; gSearch(''); gq.blur(); } });
	window.addEventListener('hashchange', function () { var h = location.hash.slice(1); if (h && h !== S.tab && PAGE[h]) { S.tab = h; render(); } });
	load();
})();
