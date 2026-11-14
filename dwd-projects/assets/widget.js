/* Dream Desk To-dos widget: a small window with the Work and Personal lists. */
(function () {
	'use strict';
	function parseWhen(raw, todayIso) {
		var T = todayIso || DWDC.today, text = ' ' + String(raw || '') + ' ', due = '', time = '';
		var base = new Date(T + 'T12:00:00');
		var iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
		var add = function (n) { var d = new Date(base); d.setDate(d.getDate() + n); return iso(d); };
		var cut = function (re) { text = text.replace(re, ' '); };
		var MON = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
		var DAY = { sunday: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4, friday: 5, fri: 5, saturday: 6 };
		var monRe = '(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\\.?';
		var ord = '(\\d{1,2})(?:st|nd|rd|th)?';
		var pre = '(?:\\b(?:on|by|due|for|this coming)\\s+)?';
		var ymd = function (y, m, d) {
			var dt = new Date(y, m, d, 12); if (dt.getMonth() !== m) { return ''; }
			if (iso(dt) < T && y === base.getFullYear()) { dt = new Date(y + 1, m, d, 12); }
			return iso(dt);
		};
		var m;
		// --- time ---
		var setTime = function (h, mi, ap) {
			h = +h; mi = +(mi || 0); ap = String(ap || '').toLowerCase().replace(/\./g, '');
			if (h > 23 || mi > 59) { return false; }
			if (ap === 'pm' || ap === 'p') { if (h < 12) { h += 12; } } else if (ap === 'am' || ap === 'a') { if (h === 12) { h = 0; } }
			else if (h >= 1 && h <= 7) { h += 12; } // "at 4" means 4 PM; 8–11 stay morning
			var hh = h % 12 || 12; time = hh + ':' + ('0' + mi).slice(-2) + ' ' + (h < 12 ? 'AM' : 'PM'); return true;
		};
		if ((m = /\b(?:at\s+)?(noon|midday)\b/i.exec(text))) { time = '12:00 PM'; cut(m[0]); }
		else if ((m = /\b(?:at\s+)?midnight\b/i.exec(text))) { time = '12:00 AM'; cut(m[0]); }
		else if ((m = /\b(?:at|@)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|a|p)?(?:\s*o'?\s?clock)?(?=\W)/i.exec(text)) && setTime(m[1], m[2], m[3])) { cut(m[0]); }
		else if ((m = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=\W)/i.exec(text)) && setTime(m[1], m[2], m[3])) { cut(m[0]); }
		else if ((m = /\b(\d{1,2})(?::(\d{2}))?\s*o'?\s?clock\b/i.exec(text)) && setTime(m[1], m[2], '')) { cut(m[0]); }
		else if ((m = /\b(\d{1,2}):(\d{2})\b/.exec(text)) && setTime(m[1], m[2], +m[1] > 12 ? 'x' : '')) { cut(m[0]); }
		if ((m = /\b(?:in the\s+)?(morning)\b/i.exec(text)) && !time) { time = '9:00 AM'; cut(m[0]); }
		else if ((m = /\b(?:in the\s+)?(afternoon)\b/i.exec(text)) && !time) { time = '2:00 PM'; cut(m[0]); }
		else if ((m = /\b(?:in the\s+)?(evening)\b/i.exec(text)) && !time) { time = '6:00 PM'; cut(m[0]); }
		// --- date ---
		if ((m = new RegExp(pre + '\\b(?:the\\s+)?day after tomorrow\\b', 'i').exec(text))) { due = add(2); cut(m[0]); }
		else if ((m = new RegExp(pre + '\\b(tomorrow|tmrw|tmr|tmw)\\b', 'i').exec(text))) { due = add(1); cut(m[0]); }
		else if ((m = new RegExp(pre + '\\b(today|tonight|this evening)\\b', 'i').exec(text))) { due = T; if (/tonight|evening/i.test(m[1]) && !time) { time = '8:00 PM'; } cut(m[0]); }
		else if ((m = new RegExp(pre + '\\bin\\s+(\\d{1,3}|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(day|week|month)s?\\b', 'i').exec(text))) {
			var nw = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 }[m[1].toLowerCase()] || +m[1];
			if (/month/i.test(m[2])) { var dm = new Date(base); dm.setMonth(dm.getMonth() + nw); due = iso(dm); } else { due = add(nw * (/week/i.test(m[2]) ? 7 : 1)); }
			cut(m[0]);
		}
		else if ((m = new RegExp(pre + '\\b(next|this)\\s+(week|month)\\b', 'i').exec(text))) {
			if (/week/i.test(m[2])) { due = /next/i.test(m[1]) ? add(7 - ((base.getDay() + 6) % 7)) : add(Math.max(0, 4 - ((base.getDay() + 6) % 7))); }
			else { var nm = new Date(base.getFullYear(), base.getMonth() + (/next/i.test(m[1]) ? 1 : 0), 1, 12); due = /next/i.test(m[1]) ? iso(nm) : T; }
			cut(m[0]);
		}
		else if ((m = new RegExp(pre + '\\b(?:(next|this)\\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|mon|tues|tue|wed|thurs|thur|thu|fri)\\b\\.?', 'i').exec(text))) {
			var want = DAY[m[2].toLowerCase()], dow = base.getDay(), diff = (want - dow + 7) % 7;
			if (m[1] && /next/i.test(m[1])) { var monOff = (dow + 6) % 7; diff = 7 - monOff + ((want + 6) % 7); }
			else if (diff === 0) { diff = 7; }
			due = add(diff); cut(m[0]);
		}
		else if ((m = new RegExp(pre + '\\b(?:the\\s+)?' + ord + '\\s+of\\s+' + monRe + '(?:,?\\s+(\\d{4}))?\\b', 'i').exec(text))) { due = ymd(m[3] ? +m[3] : base.getFullYear(), MON[m[2].toLowerCase()], +m[1]); if (due) { cut(m[0]); } }
		else if ((m = new RegExp(pre + '\\b' + monRe + '\\s+' + ord + '(?:,?\\s+(\\d{4}))?\\b', 'i').exec(text))) { due = ymd(m[3] ? +m[3] : base.getFullYear(), MON[m[1].toLowerCase()], +m[2]); if (due) { cut(m[0]); } }
		else if ((m = new RegExp(pre + '\\b' + ord + '\\s+' + monRe + '(?:,?\\s+(\\d{4}))?\\b', 'i').exec(text))) { due = ymd(m[3] ? +m[3] : base.getFullYear(), MON[m[2].toLowerCase()], +m[1]); if (due) { cut(m[0]); } }
		else if ((m = new RegExp(pre + '\\b(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?\\b').exec(text))) { var yy = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : base.getFullYear(); due = ymd(yy, +m[1] - 1, +m[2]); if (due) { cut(m[0]); } }
		else if ((m = new RegExp(pre + '\\bthe\\s+' + ord + '\\b(?!\\s*(?:%|minutes?|hours?|pages?))', 'i').exec(text))) {
			var dn = +m[1], cand = new Date(base.getFullYear(), base.getMonth(), dn, 12);
			if (dn >= 1 && dn <= 31) { if (iso(cand) < T) { cand = new Date(base.getFullYear(), base.getMonth() + 1, dn, 12); } due = iso(cand); cut(m[0]); }
		}
		if (time && !due) { due = T; } // a time with no day means today
		text = text.replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim().replace(/^[,;:\-–]\s*|\s*[,;:\-–]$/g, '').replace(/\s+(?:on|by|at|due|for)$/i, '').trim();
		if (!text) { text = String(raw || '').trim(); }
		return { text: text, due: due, time: time };
	}
	function calAdd(ds, n) { var d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
	var W = document.getElementById('w'), S = { lane: 'work', tasks: [], contacts: {}, pers: [], q: '', busy: false };
	try { S.lane = localStorage.getItem('dreamdesk-widget-lane') || 'work'; } catch (e) {}
	function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function api(path, method, body) {
		return fetch(DWDC.api + path, { method: method || 'GET', credentials: 'same-origin', headers: { 'X-WP-Nonce': DWDC.nonce, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
			.then(function (r) { if (r.status === 401 || r.status === 403) { location.href = DWDC.desk; } return r.json().then(function (j) { if (!r.ok) { throw new Error(j && j.message || 'Something went wrong'); } return j; }); });
	}
	function fmt(d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
	function today() { var d = new Date(); return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); }
	function due(t) {
		var T = today(); if (!t.due) { return ''; }
		if (t.due < T) { return '<em class="late">' + Math.round((Date.parse(T) - Date.parse(t.due)) / 864e5) + 'd late</em>'; }
		if (t.due === T) { return '<em class="today">Today' + (t.time ? ' ' + esc(t.time.replace(':00 ', ' ')) : '') + '</em>'; }
		if (t.due === calAdd(T, 1)) { return '<em>Tomorrow' + (t.time ? ' ' + esc(t.time.replace(':00 ', ' ')) : '') + '</em>'; }
		return '<em>' + fmt(t.due) + (t.time ? ' ' + esc(t.time.replace(':00 ', ' ')) : '') + '</em>';
	}
	function load() {
		return Promise.all([api(''), api('/personal')]).then(function (r) {
			S.tasks = (r[0].tasks || []).filter(Boolean); S.contacts = {}; (r[0].contacts || []).forEach(function (c) { if (c) { S.contacts[c.id] = c.name; } });
			S.pers = ((r[1] && r[1].todos) || []).filter(function (t) { return !t.gevent; });
			S.at = new Date(); draw();
		}).catch(function (e) { W.innerHTML = '<p class="w-load">Couldn’t load: ' + esc(e.message) + '</p>'; });
	}
	function list() { return (S.lane === 'work' ? S.tasks : S.pers).filter(function (t) { return !t.done; }); }
	function draw() {
		var T = today(), L = list(), q = S.q.toLowerCase();
		if (q) { L = L.filter(function (t) { return String(t.text).toLowerCase().indexOf(q) > -1; }); }
		var g = [['Overdue', 'late', L.filter(function (t) { return t.due && t.due < T; })], ['Today', 'today', L.filter(function (t) { return t.due === T; })], ['Upcoming', 'up', L.filter(function (t) { return t.due > T; })], ['No date', 'nd', L.filter(function (t) { return !t.due; })]];
		var by = function (a, b) { return (a.due || '9') < (b.due || '9') ? -1 : (a.due || '9') > (b.due || '9') ? 1 : String(a.time || '').localeCompare(String(b.time || '')); };
		var wN = S.tasks.filter(function (t) { return !t.done; }).length, pN = S.pers.filter(function (t) { return !t.done; }).length;
		var keep = document.activeElement && document.activeElement.id === 'w-in' ? { v: document.activeElement.value, s: document.activeElement.selectionStart } : null;
		W.innerHTML = '<header class="w-top"><div class="w-seg"><button type="button" class="' + (S.lane === 'work' ? 'on' : '') + '" data-lane="work">Work <i>' + wN + '</i></button><button type="button" class="' + (S.lane === 'personal' ? 'on' : '') + '" data-lane="personal">Personal <i>' + pN + '</i></button></div>'
			+ '<button type="button" class="w-ic" data-refresh title="Refresh">↻</button><a class="w-ic" href="' + esc(DWDC.desk) + '#todos" target="_blank" rel="noopener" title="Open Dream Desk">↗</a></header>'
			+ '<form class="w-add" id="w-form"><input id="w-in" name="text" placeholder="Add a ' + (S.lane === 'work' ? 'work' : 'personal') + ' to-do… e.g. Call Shane Friday at 2" autocomplete="off" required><button>Add</button></form><div class="w-hint" id="w-hint"></div>'
			+ '<main class="w-list">' + g.map(function (x) {
				if (!x[2].length) { return ''; }
				return '<div class="w-gh ' + x[1] + '">' + x[0] + ' <i>' + x[2].length + '</i></div>' + x[2].sort(by).map(function (t) {
					var proj = S.lane === 'work' && t.contact && S.contacts[t.contact] ? '<small>' + esc(S.contacts[t.contact]) + '</small>' : '';
					return '<div class="w-row"><button type="button" class="w-chk" data-done="' + esc(t.id) + '" aria-label="Mark done"></button><span class="w-t"><b>' + esc(t.text) + '</b>' + proj + '</span>' + due(t) + '</div>';
				}).join('');
			}).join('') + (L.length ? '' : '<p class="w-empty">' + (q ? 'No matches.' : 'All clear ✓') + '</p>') + '</main>'
			+ '<footer class="w-foot">Updated ' + (S.at ? S.at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '') + '</footer>';
		if (keep) { var i = document.getElementById('w-in'); i.value = keep.v; i.focus(); try { i.setSelectionRange(keep.s, keep.s); } catch (e) {} hint(); }
	}
	function hint() {
		var i = document.getElementById('w-in'), h = document.getElementById('w-hint'); if (!i || !h) { return; }
		var w = parseWhen(i.value, today());
		h.textContent = w.due ? '📅 ' + (w.due === today() ? 'Today' : new Date(w.due + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })) + (w.time ? ' · ' + w.time : '') : '';
	}
	W.addEventListener('click', function (e) {
		var t = e.target, el;
		if ((el = t.closest('[data-lane]'))) { S.lane = el.getAttribute('data-lane'); try { localStorage.setItem('dreamdesk-widget-lane', S.lane); } catch (er) {} draw(); return; }
		if (t.closest('[data-refresh]')) { load(); return; }
		if ((el = t.closest('[data-done]'))) {
			var id = el.getAttribute('data-done'), row = el.closest('.w-row'); row.classList.add('gone');
			var p = S.lane === 'work' ? api('/task/' + id, 'POST', { done: true }).then(function () { S.tasks.forEach(function (x) { if (String(x.id) === id) { x.done = true; } }); })
				: api('/personal', 'POST', { kind: 'todos', item: { id: id, done: true } }).then(function (d) { S.pers = (d.todos || []).filter(function (x) { return !x.gevent; }); });
			p.then(function () { setTimeout(draw, 250); }).catch(function (er) { row.classList.remove('gone'); alert(er.message); });
		}
	});
	W.addEventListener('input', function (e) { if (e.target.id === 'w-in') { hint(); } });
	W.addEventListener('submit', function (e) {
		e.preventDefault(); var i = document.getElementById('w-in'); if (!i.value.trim() || S.busy) { return; }
		var w = parseWhen(i.value, today()); S.busy = true;
		var p = S.lane === 'work' ? api('/task', 'POST', { text: w.text, contact: 0, due: w.due, time: w.time }).then(function (x) { S.tasks.unshift(x); })
			: api('/personal', 'POST', { kind: 'todos', item: { text: w.text, due: w.due, time: w.time } }).then(function (d) { S.pers = (d.todos || []).filter(function (x) { return !x.gevent; }); });
		p.then(function () { i.value = ''; S.busy = false; draw(); var n = document.getElementById('w-in'); if (n) { n.focus(); } }).catch(function (er) { S.busy = false; alert(er.message); });
	});
	load();
	setInterval(function () { if (!document.hidden && !(document.activeElement && document.activeElement.id === 'w-in' && document.activeElement.value)) { load(); } }, 120000);
	document.addEventListener('visibilitychange', function () { if (!document.hidden && S.at && Date.now() - S.at > 60000) { load(); } });
})();
