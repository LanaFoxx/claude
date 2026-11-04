/* Mojo's Flight Desk — portfolio demo backend.
 * Everything here is SAMPLE data generated in the browser. Nothing is sent anywhere:
 * every Flight Desk request is answered by this file, and changes are kept in this
 * visitor's browser only (localStorage) until they press "Reset demo".
 */
(function () {
	'use strict';
	var DB_KEY = 'mjdDemoDB_v1';
	var TEAM = ['Alex', 'Jordan', 'Taylor', 'Casey'];
	var ME = 'Alex';
	var FIELDS = ['Monarch', 'Laney’s Airport'];
	var HOURCATS = ['Gear / maintenance', 'Intros & student calls', 'Admin / office', 'Event / fly-in', 'Other'];

	/* ── seeded random so every visitor starts from the same sample data ── */
	var seed = 20261104;
	function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
	function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
	function pick(a) { return a[Math.floor(rnd() * a.length)]; }
	function chance(p) { return rnd() < p; }

	/* ── dates (relative to today, so the demo always looks current) ── */
	function pad(n) { return String(n).padStart(2, '0'); }
	function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
	function stamp(d) { return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
	function daysAgo(n, h) { var d = new Date(); d.setDate(d.getDate() - n); d.setHours(h == null ? ri(8, 20) : h, ri(0, 59), ri(0, 59), 0); return d; }
	function now() { return stamp(new Date()); }
	function today() { return ymd(new Date()); }
	function nextDow(dow, weeks) { var d = new Date(); d.setHours(12, 0, 0, 0); var add = (dow - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + add + 7 * (weeks || 0)); return d; }
	function prevDow(dow, weeksBack) { var d = new Date(); d.setHours(12, 0, 0, 0); var sub = (d.getDay() - dow + 7) % 7 || 7; d.setDate(d.getDate() - sub - 7 * (weeksBack || 0)); return d; }

	/* ── sample people: placeholder names only ── */
	var FIRST_M = ['John', 'James', 'Jack', 'Jake', 'Jim', 'Joe', 'Jesse', 'Josh', 'Jason', 'Jeff', 'Jerry', 'Joel', 'Jonah', 'Jared', 'Jay', 'Justin', 'Jordan', 'Jeremy', 'Julian', 'Jamie', 'Mark', 'Matt', 'Chris', 'Dan', 'Dave', 'Eric', 'Greg', 'Kevin', 'Luke', 'Nate', 'Paul', 'Ryan', 'Sam', 'Scott', 'Steve', 'Tom', 'Tony', 'Will', 'Zack'];
	var FIRST_F = ['Jane', 'Jill', 'Julie', 'Jenny', 'Jess', 'Joan', 'June', 'Josie', 'Jade', 'Jana', 'Joy', 'Jodi', 'Jolene', 'Janet', 'Jasmine', 'Judy', 'Juliet', 'Jean', 'Jocelyn', 'Joanna', 'Amy', 'Anna', 'Beth', 'Carla', 'Dana', 'Emily', 'Grace', 'Holly', 'Kate', 'Laura', 'Lisa', 'Megan', 'Nina', 'Rachel', 'Sara', 'Tara', 'Tina', 'Wendy'];
	var LAST = ['Doe', 'Doe', 'Doe', 'Roe', 'Doe', 'Roe'];
	var LOCS = ['Maiden, NC', 'Maiden, NC', 'Mocksville, NC', 'Mocksville, NC', 'Yadkinville, NC', 'Laurens, SC', ''];
	var LAUNCH = ['Foot launch', 'Foot launch', 'Wheel launch', 'Trike', 'Help me choose', ''];
	var LEAD_NOTES = ['', '', '', 'Saw us at the fly-in. Wants to try an intro day.', 'Asked about weekend availability.', 'Former hang glider pilot.', 'Interested in wheel launch — bad knee.', 'Wants to train with a friend.', 'Asked about gear packages.', 'Prefers text over calls.', 'Following up after the holidays.', 'Lives about an hour from the field.'];

	function makeDB() {
		seed = 20261104;
		var db = { seq: { people: 0, payments: 0, quotes: 0, sessions: 0, att: 0, orders: 0, todos: 0, waivers: 0 } };
		var id = function (k) { return ++db.seq[k]; };
		var used = {};
		function name(i) {
			for (var n = 0; n < 200; n++) { var f = i % 2 ? pick(FIRST_F) : pick(FIRST_M), l = pick(LAST); if (!used[f + l]) { used[f + l] = 1; return [f, l]; } }
			return [i % 2 ? 'Jane' : 'John', 'Doe ' + i];
		}
		db.people = []; db.payments = []; db.quotes = [];
		function person(status, i, extra) {
			var nm = name(i), created = daysAgo(extra && extra.age != null ? extra.age : ri(1, 520));
			var p = {
				id: id('people'), first: nm[0], last: nm[1],
				email: (nm[0] + '.' + nm[1].split(' ')[0]).toLowerCase() + (i > 40 ? i : '') + '@example.com',
				phone: '55501' + String(ri(10, 99)) + String(ri(100, 999)), // fictional 555-01xx numbers
				location: pick(LOCS), launch: pick(LAUNCH), interest: chance(.3) ? 'Intro Day' : '', source: pick(['Website', 'Website', 'Website', 'Manual']),
				taken_by: '', notes: pick(LEAD_NOTES), status: status, stage: '',
				intro_date: null, enrolled_date: null, first_flight_date: null, first_flight_image: '0', ground_school_date: null, gs_reminded_at: null,
				graduated_date: null, invited_at: null, invite_event: '', created_at: stamp(created), updated_at: stamp(created),
				flown: '0', gs1_date: null, ppg: null
			};
			db.people.push(p);
			return p;
		}
		function pay(p, cat, amount, date, desc, method) {
			db.payments.push({ id: String(id('payments')), person_id: String(p.id), pay_date: date, category: cat, description: desc || ({ intro: 'Intro Day', training: 'Premium Training', 'day-rate': 'Day Rate Training', conversion: 'Launch Conversion', gear: 'Gear', merch: 'Merch', other: 'Other' })[cat], amount: amount.toFixed(2), method: method || pick(['Cash', 'Venmo', 'Zelle', 'Card', 'Check', 'PayPal', '']), placed_by: '', created_at: date + ' 12:00:00' });
		}
		var GEAR = [['Wing — beginner 25', 3600], ['Wing — intermediate 23', 3950], ['Paramotor — 140cm frame', 7900], ['Paramotor — 151cm frame', 8350], ['Reserve parachute', 850], ['Helmet with headset', 420], ['Harness — size M', 1150], ['Spare prop', 340], ['Trike conversion kit', 2900], ['Risers + trimmers', 260], ['Flight bag', 120], ['Radio kit', 180]];
		var i = 0, k;
		/* leads */
		for (k = 0; k < 58; k++) { var L = person('lead', i++); if (chance(.12)) { var iv = daysAgo(ri(2, 20)); L.invited_at = stamp(iv); L.invite_event = ymd(nextDow(6, 0)) + ' 9:00 AM'; } }
		/* intro done */
		for (k = 0; k < 9; k++) { var I = person('intro', i++, { age: ri(15, 200) }); var idt = ymd(daysAgo(ri(5, 120))); I.intro_date = idt; pay(I, 'intro', 250, idt); if (chance(.4)) I.flown = '0'; }
		/* active students */
		var stages = ['kiting', 'kiting', 'kiting', 'close-first', 'close-first', 'flying', 'flying', 'flying', 'almost-done', 'paused', 'kiting', 'flying', 'close-first'];
		stages.forEach(function (st, n) {
			var A = person('active', i++, { age: ri(40, 300) }); A.stage = st;
			var en = daysAgo(ri(10, 200)); A.enrolled_date = ymd(en); A.intro_date = ymd(daysAgo(ri(201, 260)));
			A.launch = pick(['Foot launch', 'Foot launch', 'Wheel launch', 'Trike']);
			pay(A, 'intro', 250, A.intro_date); pay(A, n % 4 === 0 ? 'day-rate' : 'training', n % 4 === 0 ? 600 : 3500, A.enrolled_date);
			if (st === 'flying' || st === 'almost-done') { A.flown = '1'; A.first_flight_date = ymd(daysAgo(ri(3, 60))); }
			if (n % 3 !== 2) A.gs1_date = ymd(daysAgo(ri(5, 90)));
			if (n % 3 === 0) A.ground_school_date = ymd(daysAgo(ri(1, 4)));
			var ppg = {}; var items = ['p1g1', 'p1g2', 'p1g3', 'p1g4', 'p1g5', 'p1g6', 'p1f1', 'p1f2', 'p1f3', 'p2g1', 'p2g2', 'p2g3', 'p2f1', 'p2f2'];
			var upto = st === 'kiting' ? ri(1, 4) : st === 'close-first' ? ri(5, 7) : ri(8, items.length);
			items.slice(0, upto).forEach(function (it) { ppg[it] = { d: ymd(daysAgo(ri(1, 80))), by: pick(TEAM) }; });
			A.ppg = JSON.stringify(ppg);
			if (chance(.5)) { var g = pick(GEAR); pay(A, 'gear', g[1], ymd(daysAgo(ri(1, 150))), g[0]); }
			if (n === 2) A.notes = 'Needs a smaller harness — order before next training day.';
		});
		/* graduates */
		for (k = 0; k < 8; k++) { var G = person('graduated', i++, { age: ri(200, 700) }); G.enrolled_date = ymd(daysAgo(ri(200, 400))); G.intro_date = ymd(daysAgo(ri(401, 480))); G.graduated_date = ymd(daysAgo(ri(5, 190))); G.flown = '1'; G.first_flight_date = ymd(daysAgo(ri(191, 300))); G.gs1_date = G.ground_school_date = ymd(daysAgo(ri(301, 380))); pay(G, 'intro', 250, G.intro_date); pay(G, 'training', 3500, G.enrolled_date); pay(G, 'gear', pick(GEAR)[1], ymd(daysAgo(ri(150, 300))), pick(GEAR)[0]); }
		/* gear customers */
		for (k = 0; k < 14; k++) { var C = person('customer', i++, { age: ri(20, 500) }); var n2 = ri(1, 3); for (var j = 0; j < n2; j++) { var gg = pick(GEAR); pay(C, 'gear', gg[1], ymd(daysAgo(ri(2, 330))), gg[0]); } if (chance(.3)) pay(C, 'merch', pick([25, 35, 60]), ymd(daysAgo(ri(2, 200))), pick(['T-shirt', 'Hat', 'Hoodie'])); }
		/* archived */
		for (k = 0; k < 7; k++) person('archived', i++, { age: ri(200, 600) });

		/* quotes */
		var qp = db.people.filter(function (p) { return p.status === 'active' || p.status === 'intro' || p.status === 'customer'; });
		[['Starter gear package', [['Wing — beginner 25', 1, 3600], ['Paramotor — 140cm frame', 1, 7900], ['Reserve parachute', 1, 850]], 'sent'],
			['Wing upgrade', [['Wing — intermediate 23', 1, 3950]], 'draft'],
			['Helmet + radio', [['Helmet with headset', 1, 420], ['Radio kit', 1, 180]], 'purchased'],
			['Trike setup', [['Trike conversion kit', 1, 2900], ['Spare prop', 2, 340]], 'sent'],
			['Harness swap', [['Harness — size M', 1, 1150]], 'declined']].forEach(function (q, n) {
			var p = qp[n * 3 % qp.length], items = q[1].map(function (x) { return { desc: x[0], qty: x[1], price: x[2] }; });
			var sub = items.reduce(function (s, x) { return s + x.qty * x.price; }, 0), disc = n === 0 ? 400 : 0, base = sub - disc, tax = Math.round(base * 7) / 100;
			var made = daysAgo(ri(3, 60));
			db.quotes.push({ id: String(id('quotes')), person_id: String(p.id), title: q[0], items: items, discount: disc.toFixed(2), sales_tax: '7', aviation_tax: '0', notes: n === 0 ? 'Includes a free first-tank fill and gear setup day.' : '', valid_until: ymd(daysAgo(-30)), total: (base + tax).toFixed(2), status: q[2], archived: '0', sent_at: q[2] === 'draft' ? null : stamp(made), created_at: stamp(made), updated_at: stamp(made) });
			if (q[2] === 'purchased') pay(p, 'gear', base + tax, ymd(made), q[0], 'Card');
		});

		/* training days + ground school */
		var act = db.people.filter(function (p) { return p.status === 'active'; }), intros = db.people.filter(function (p) { return p.status === 'intro'; });
		function rsv(list, n) {
			var out = [], used2 = {};
			out.push({ key: 'i' + ri(1e5, 9e5), person_id: 0, name: pick(TEAM), status: 'yes', launch: '', role: 'instructor', gear: '', source: 'Manual', note: '', edited: 0 });
			for (var x = 0; x < n; x++) { var p = pick(list); if (used2[p.id]) continue; used2[p.id] = 1; out.push({ key: 'g' + ri(1e8, 9e8).toString(16), person_id: p.id, name: p.first + ' ' + p.last, status: pick(['yes', 'yes', 'yes', 'maybe', 'no']), launch: /wheel|trike/i.test(p.launch) ? 'wheel' : 'foot', role: 'student', gear: pick(['school', 'school', 'own']), source: pick(['GroupMe RSVP', 'RSVP link', 'Manual']), note: '', edited: 0 }); }
			return out;
		}
		db.sessions = [];
		function sess(date, time, field, kind, rs) {
			var c = stamp(daysAgo(ri(10, 30)));
			db.sessions.push({ id: id('sessions'), sess_date: ymd(date), start_time: time, field: field, notes: kind === 'gs' ? 'Ground school — Zoom' : '', gm_event_id: '', rsvps: rs, created_at: c, updated_at: c, kind: kind, zoom: kind === 'gs' ? 'https://zoom.us/j/0000000000' : '', gm_events: [], recording: '' });
		}
		sess(nextDow(6, 0), '08:30', 'Monarch', 'training', rsv(act.concat(intros), 6));
		sess(nextDow(0, 0), '14:00', 'Laney’s Airport', 'training', rsv(act, 4));
		sess(nextDow(2, 0), '19:00', 'Zoom', 'gs', rsv(act, 5));
		sess(prevDow(4, 0), '19:00', 'Zoom', 'gs', rsv(act, 6));
		[[6, 0, 'Monarch', '09:00'], [0, 0, 'Laney’s Airport', '14:00'], [6, 1, 'Monarch', '08:00'], [3, 1, 'Monarch', '17:30'], [6, 2, 'Laney’s Airport', '09:00'], [0, 3, 'Monarch', '15:00'], [6, 4, 'Monarch', '07:30'], [6, 5, 'Laney’s Airport', '10:00']].forEach(function (s) { sess(prevDow(s[0], s[1]), s[3], s[2], 'training', rsv(act.concat(intros), ri(3, 7))); });
		db.sessions[3].recording = 'https://zoom.us/rec/share/sample-recording';

		/* waivers */
		db.waivers = []; db.waiverArchive = [];
		act.concat(intros).forEach(function (p, n) {
			var st = n % 5 === 4 ? 'sent' : n % 4 === 3 ? 'paper' : 'signed';
			var sent = daysAgo(ri(5, 120));
			var w = { id: String(id('waivers')), person_id: String(p.id), token: 'demo' + p.id, status: st, sent_at: stamp(sent), sent_to: st === 'paper' ? '' : p.email, opened_at: st === 'signed' ? stamp(sent) : null, signed_at_local: st === 'sent' ? null : stamp(sent) };
			db.waivers.push(w);
			if (st === 'signed') db.waiverArchive.push({ id: w.id, person_id: w.person_id, token: w.token, doc_version: 'v1-2026-11', signer_name: p.first + ' ' + p.last, signer_email: p.email, signed_at_local: w.signed_at_local, ip: '203.0.113.' + ri(2, 250), sent_by: ME, place: pick(['Maiden, NC', 'Mocksville, NC']) });
		});

		/* attendance */
		db.att = [];
		db.sessions.filter(function (s) { return s.kind === 'training' && s.sess_date < today(); }).forEach(function (s) {
			TEAM.forEach(function (t) { if (chance(.55)) db.att.push({ id: String(id('att')), name: t, field: s.field, att_date: s.sess_date, comments: pick(['Good kiting session.', 'Two students did forward launches.', 'Windy — ground handling only.', 'First flights for two students!', 'Gear check and reserve repack.']), created_at: s.sess_date + ' 18:00:00', kind: 'field', hours: '0.00', category: '' }); });
		});
		for (k = 0; k < 9; k++) db.att.push({ id: String(id('att')), name: pick(TEAM), field: '', att_date: ymd(daysAgo(ri(2, 70))), comments: pick(['Fixed trimmers on school wing', 'Called three new leads', 'Booked fly-in booth', 'Updated website schedule', 'Inspected school motors']), created_at: stamp(daysAgo(1)), kind: 'hours', hours: pick(['1.50', '2.00', '3.00', '4.00']), category: pick(HOURCATS) });
		db.attSum = {}; db.attHidden = {}; db.hpd = 6;

		/* school orders */
		db.orders = [
			{ id: String(id('orders')), order_date: ymd(daysAgo(12)), dealer: 'APCO', category: 'Wing', item: 'School wing — size 25', qty: '1', cost: '2900.00', status: 'shipped', received_date: null, notes: 'Tracking sent by email.', ordered_by: 'Jordan', created_by: 'Jordan', created_at: stamp(daysAgo(12)) },
			{ id: String(id('orders')), order_date: ymd(daysAgo(30)), dealer: 'Kangook', category: 'Parts', item: 'Spare props (x2)', qty: '2', cost: '480.00', status: 'received', received_date: ymd(daysAgo(20)), notes: '', ordered_by: 'Alex', created_by: 'Alex', created_at: stamp(daysAgo(30)) },
			{ id: String(id('orders')), order_date: ymd(daysAgo(4)), dealer: 'MacFly', category: 'Reserve / safety', item: 'Reserve repack kit', qty: '1', cost: '95.00', status: 'ordered', received_date: null, notes: '', ordered_by: 'Taylor', created_by: 'Taylor', created_at: stamp(daysAgo(4)) },
			{ id: String(id('orders')), order_date: null, dealer: '', category: 'Other', item: 'Brake lines for the orange school wing', qty: '1', cost: '0.00', status: 'needed', received_date: null, notes: 'For repair: orange school wing', ordered_by: 'Casey', created_by: 'Alex', created_at: stamp(daysAgo(1)) }
		];

		/* to-dos */
		db.todos = [];
		[['Call back new leads from the website', 'Alex', 1], ['Post this weekend’s training day in the group chat', 'Jordan', 2], ['Repair: orange school wing', 'Taylor', 3], ['Order parts: Brake lines for the orange school wing', 'Casey', 4], ['Update the ground school slides', '', 5]].forEach(function (t, n) {
			db.todos.push({ id: String(id('todos')), title: t[0], who: t[1], due: n === 0 ? ymd(daysAgo(-2)) : null, done: '0', done_at: null, done_by: '', created_by: ME, created_at: stamp(daysAgo(n + 1)), sort: String(t[2]) });
		});
		db.todos.push({ id: String(id('todos')), title: 'Renew field insurance', who: 'Alex', due: null, done: '1', done_at: stamp(daysAgo(3)), done_by: 'Alex', created_by: ME, created_at: stamp(daysAgo(9)), sort: '0' });

		/* gear inventory */
		db.inv = { seq: 0, items: { wings: [], motors: [], trikes: [], harnesses: [], helmets: [], bibles: [] }, repairs: [] };
		var iv = function (cat, nm, q, cond, notes) { db.inv.items[cat].push({ id: ++db.inv.seq, name: nm, qty: q, cond: cond, notes: notes || '', by: pick(TEAM), at: stamp(daysAgo(ri(1, 40))) }); };
		iv('wings', 'School wing 25 — orange', 2, 'good', 'Training wings'); iv('wings', 'School wing 23 — blue', 1, 'fair'); iv('wings', 'Kiting wing (small)', 3, 'worn', 'Ground handling only');
		iv('motors', 'School motor — 140cm', 2, 'good'); iv('motors', 'School motor — 151cm', 1, 'new');
		iv('trikes', 'Trainer trike', 1, 'fair');
		iv('harnesses', 'Training harness — M', 3, 'good'); iv('harnesses', 'Training harness — L', 2, 'fair');
		iv('helmets', 'Helmet with headset', 6, 'good'); iv('helmets', 'Open-face helmet', 2, 'worn');
		iv('bibles', 'PPG Bible', 8, 'new', 'For new students');
		db.inv.repairs.push({ id: ++db.inv.seq, kind: 'repair', what: 'School wing 25 — orange', cat: 'wings', issue: 'Two broken brake lines', who: 'Taylor', order: 1, order_by: 'Casey', order_item: 'Brake lines for the orange school wing', order_id: 4, todo_id: 3, otodo_id: 4, by: ME, at: stamp(daysAgo(1)), done: 0, done_by: '', done_at: '' });
		db.inv.repairs.push({ id: ++db.inv.seq, kind: 'maint', what: 'School motor — 140cm', cat: 'motors', issue: 'Oil change and new spark plug', who: '', order: 0, order_by: '', order_item: '', order_id: 0, todo_id: 0, otodo_id: 0, by: 'Jordan', at: stamp(daysAgo(6)), done: 0, done_by: '', done_at: '' });

		/* saved logins (all fake) */
		db.creds = [
			{ id: 'c1', service: 'Instagram', username: 'flightdesk.demo', password: 'demo-password', url: 'https://instagram.com', notes: 'School account', updated: stamp(daysAgo(20)), by: ME },
			{ id: 'c2', service: 'Facebook page', username: 'demo@example.com', password: 'demo-password', url: 'https://facebook.com', notes: '', updated: stamp(daysAgo(40)), by: 'Jordan' },
			{ id: 'c3', service: 'Weather station', username: 'demo', password: 'demo-password', url: '', notes: 'Field anemometer login', updated: stamp(daysAgo(70)), by: 'Taylor' }
		];
		return db;
	}

	/* ── gear pricing: sample catalog with made-up prices ── */
	function pricing() {
		function it(nm, d) { return { name: nm, dealer: '$' + d.toLocaleString('en-US') + '.00', retail: '$' + Math.round(d * 1.22).toLocaleString('en-US') + '.00', notes: '', link: '' }; }
		var up = ymd(daysAgo(6));
		return {
			tabs: [
				{ tab: 'Kangook paramotors', updated: up, sections: [
					{ title: 'Complete Ready to Fly Paramotors', items: [it('Explorer 140cm', 5200), it('Explorer Ti 140cm', 5850), it('Explorer XD 151cm', 5500), it('Classic 146cm', 4990), it('Classic HD 146cm', 5150)] },
					{ title: 'Trainer Paramotors', items: [it('Trainer 130cm', 4500), it('Trainer Lite 130cm', 4300)] },
					{ title: 'Accessories', items: [it('Spare prop 125cm', 310), it('Throttle assembly', 165), it('Fuel tank 12L', 140)] }] },
				{ tab: 'Engines', updated: up, sections: [{ title: 'Engines', items: [it('Engine 185cc', 2600), it('Engine 125cc', 2200), it('Electric start kit', 240)] }] },
				{ tab: 'Trikes & kuads', updated: up, sections: [{ title: 'Trikes', items: [it('Solo trike', 2700), it('Tandem kuad', 4900)] }] },
				{ tab: 'APCO wings', updated: up, sections: [
					{ title: 'School & beginner wings', items: [it('Beginner wing 23', 2950), it('Beginner wing 25', 3050), it('Beginner wing 27', 3150)] },
					{ title: 'Intermediate wings', items: [it('Cruiser wing 22', 3400), it('Cruiser wing 24', 3500)] },
					{ title: 'Reserves', items: [it('Reserve 100', 700), it('Reserve 120', 760)] }] }
			],
			checked: stamp(daysAgo(1, 10)), source: '#', changed: 0, next: stamp(daysAgo(-6, 10))
		};
	}

	/* ── weather: a plausible 7-day forecast, generated ── */
	function weather(field) {
		var f = field === 'laneys' ? { field: 'laneys', name: 'Laney’s Airport', place: 'Maiden, NC', lat: 35.58, lon: -81.21 } : { field: 'monarch', name: 'Monarch', place: 'Mocksville, NC', lat: 35.89, lon: -80.56 };
		var s0 = seed; seed = field === 'laneys' ? 77 : 33;
		var start = new Date(); start.setHours(0, 0, 0, 0);
		var H = { time: [], temperature_2m: [], wind_speed_10m: [], wind_gusts_10m: [], wind_direction_10m: [], precipitation_probability: [], cloud_cover: [], wind_speed_80m: [] }, D = { time: [], sunrise: [], sunset: [] };
		var stamp16 = function (d) { return ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
		for (var day = 0; day < 7; day++) {
			var windy = rnd() * 10, base = 48 + rnd() * 16, dd = new Date(start); dd.setDate(dd.getDate() + day);
			D.time.push(ymd(dd)); var sr = new Date(dd); sr.setHours(6, 50); var ss = new Date(dd); ss.setHours(17, 25); D.sunrise.push(stamp16(sr)); D.sunset.push(stamp16(ss));
			for (var h = 0; h < 24; h++) {
				var t = new Date(dd); t.setHours(h);
				var diurnal = Math.sin((h - 9) / 24 * Math.PI * 2);
				var w = Math.max(0, 2 + windy * (0.5 + 0.5 * diurnal) + rnd() * 2);
				H.time.push(stamp16(t)); H.temperature_2m.push(Math.round((base + diurnal * 10) * 10) / 10);
				H.wind_speed_10m.push(Math.round(w * 10) / 10); H.wind_gusts_10m.push(Math.round((w * 1.5 + rnd() * 3) * 10) / 10);
				H.wind_direction_10m.push(Math.round(200 + windy * 8 + rnd() * 20) % 360); H.precipitation_probability.push(day === 3 ? Math.round(30 + rnd() * 50) : Math.round(rnd() * 15));
				H.cloud_cover.push(Math.round(rnd() * (day === 3 ? 100 : 50))); H.wind_speed_80m.push(Math.round(w * 1.6 * 10) / 10);
			}
		}
		seed = s0;
		return Object.assign(f, { hourly: H, daily: D, fetched: now() });
	}

	/* ── persistence ── */
	var db;
	function load() { try { var j = localStorage.getItem(DB_KEY); if (j) { db = JSON.parse(j); return; } } catch (e) {} db = makeDB(); save(); }
	function save() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
	load();
	window.MJDDemoReset = function () { try { localStorage.removeItem(DB_KEY); } catch (e) {} location.reload(); };

	/* ── helpers mirroring the real server ── */
	function err(m) { var e = new Error(m); e.demo = 1; throw e; }
	function P(id) { return db.people.find(function (p) { return +p.id === +id; }); }
	function dateOrNull(v) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; }
	function paysOf(pid) { return db.payments.filter(function (y) { return +y.person_id === +pid; }); }
	var TRAIN = ['training', 'day-rate', 'conversion'];
	var CATS = { intro: 'Intro Day', training: 'Premium Training', 'day-rate': 'Day Rate Training', conversion: 'Launch Conversion', gear: 'Gear', merch: 'Merch', other: 'Other' };
	function personOut(p, pays) {
		var o = Object.assign({}, p); pays = pays || paysOf(p.id);
		o.total = pays.reduce(function (s, y) { return s + (+y.amount); }, 0);
		o.paid_intro = pays.filter(function (y) { return y.category === 'intro'; }).length;
		o.paid_training = pays.filter(function (y) { return TRAIN.indexOf(y.category) > -1; }).length;
		o.paid_gear = pays.filter(function (y) { return y.category === 'gear'; }).length;
		o.ff_img = ''; return o;
	}
	function personFull(id) {
		var p = P(id); if (!p) err('Not found');
		var pays = paysOf(id).slice().sort(function (a, b) { return (b.pay_date || '').localeCompare(a.pay_date || '') || b.id - a.id; });
		var q = db.quotes.filter(function (x) { return +x.person_id === +id; }).sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
		return { person: personOut(p, pays), payments: pays, quotes: JSON.parse(JSON.stringify(q)) };
	}
	function sessOut(s) { return JSON.parse(JSON.stringify(s)); }
	function S(id) { return db.sessions.find(function (s) { return +s.id === +id; }); }
	function todoList() { return db.todos.slice().sort(function (a, b) { return (+a.done - +b.done) || (+a.sort - +b.sort) || (b.id - a.id); }); }
	function orderList() { return db.orders.slice().sort(function (a, b) { if (!a.order_date !== !b.order_date) return a.order_date ? 1 : -1; return (b.order_date || '').localeCompare(a.order_date || '') || b.id - a.id; }); }
	function invOut() { return { cats: { wings: 'Wings', motors: 'Motors', trikes: 'Trikes', harnesses: 'Harnesses', helmets: 'Helmets', bibles: 'PPG Bibles' }, items: db.inv.items, repairs: db.inv.repairs }; }
	function quoteTotal(items, disc, st, at) { var s = items.reduce(function (a, i) { return a + i.qty * i.price; }, 0), base = Math.max(0, s - disc); return Math.round((base + Math.round(base * st) / 100 + Math.round(base * at) / 100) * 100) / 100; }
	function cleanItems(items) { return (items || []).filter(function (i) { return String(i.desc || '').trim(); }).map(function (i) { return { desc: String(i.desc).trim(), qty: Math.max(0, +i.qty || 1), price: Math.round((+i.price || 0) * 100) / 100 }; }); }
	function addTodo(title, who) { var min = Math.min.apply(null, [0].concat(db.todos.filter(function (t) { return t.done === '0'; }).map(function (t) { return +t.sort; }))); var t = { id: String(++db.seq.todos), title: title, who: who || '', due: null, done: '0', done_at: null, done_by: '', created_by: ME, created_at: now(), sort: String(min - 1) }; db.todos.push(t); return +t.id; }
	function payAdd(d) {
		var p = P(d.person_id); if (!p) err('Person not found');
		var cat = CATS[d.category] ? d.category : 'other', amt = Math.round((+d.amount || 0) * 100) / 100; if (amt <= 0) err('Enter an amount.');
		var date = d.date_unknown ? null : (dateOrNull(d.pay_date) || today());
		db.payments.push({ id: String(++db.seq.payments), person_id: String(p.id), pay_date: date, category: cat, description: String(d.description || '').trim() || CATS[cat], amount: amt.toFixed(2), method: d.method || '', placed_by: TEAM.indexOf(d.placed_by) > -1 ? d.placed_by : '', created_at: now() });
		if (cat === 'intro' && (p.status === 'lead' || p.status === 'archived')) { p.status = 'intro'; if (!p.intro_date) p.intro_date = date; }
		if (TRAIN.indexOf(cat) > -1 && p.status !== 'graduated') { p.status = 'active'; if (!p.enrolled_date) p.enrolled_date = date; if (!p.stage) p.stage = 'kiting'; }
		p.updated_at = now();
		return personFull(p.id);
	}

	/* ── email previews (sample templates, demo contact details) ── */
	function fmtDate(v) { if (!v) return ''; var d = new Date(v + 'T12:00:00'); return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
	function fmtTime(v) { if (!v) return ''; var p = v.split(':'), h = +p[0]; return (h % 12 || 12) + ':' + p[1] + ' ' + (h < 12 ? 'AM' : 'PM'); }
	function money(n) { return '$' + (+n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
	function escH(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
	function fill(tpl, map) { var h = tpl; Object.keys(map).forEach(function (k) { h = h.split(k).join(map[k]); }); return h; }
	function previewInvite(d) {
		var T = window.MJD_DEMO_TPL.inv;
		return { html: fill(T, { 'ZZDATE': escH(fmtDate(d.date)), 'ZZTIME': escH(fmtTime(d.start) + (d.end ? ' – ' + fmtTime(d.end) : '')), 'ZZLOC': escH(d.location || ''), 'ZZDETAILS': escH(d.details || ''), 'ZZNOTE': escH(d.note || ''), 'ZZSUBJ': escH(d.subject || 'You’re invited: Intro Day') }), subject: d.subject || 'You’re invited: Intro Day at Mojo’s Flight School' };
	}
	function previewGs(d) {
		var T = window.MJD_DEMO_TPL.gs;
		return { html: fill(T, { 'ZZDATE': escH(fmtDate(d.date)), 'ZZTIME': escH(fmtTime(d.start) + (d.end ? ' – ' + fmtTime(d.end) : '') + ' (Eastern)'), 'ZZZOOMURL': escH(d.zoom || 'https://zoom.us/j/0000000000'), 'ZZMEET': escH(d.meeting || ''), 'ZZPASS': escH(d.passcode || ''), 'ZZTOPIC': escH(d.topic || ''), 'ZZNOTE': escH(d.note || ''), 'ZZSUBJ': escH(d.subject || 'Ground school on Zoom') }), subject: d.subject || 'Ground school on Zoom — Mojo’s Flight School' };
	}
	function previewQuote(d) {
		var T = window.MJD_DEMO_TPL.q, items = cleanItems(d.items), disc = +d.discount || 0, st = +d.sales_tax || 0, at = +d.aviation_tax || 0;
		var sub = items.reduce(function (s, i) { return s + i.qty * i.price; }, 0), base = Math.max(0, sub - disc), stx = Math.round(base * st) / 100, atx = Math.round(base * at) / 100;
		var row = function (i) { return '<tr><td style="padding:10px 0;border-bottom:1px solid #EADFCB;font:15px Arial,sans-serif;color:#16303A">' + escH(i.desc) + (i.qty !== 1 ? ' <span style="color:#7A939C">× ' + i.qty + '</span>' : '') + '</td><td align="right" style="padding:10px 0;border-bottom:1px solid #EADFCB;font:700 15px Arial,sans-serif;color:#16303A;white-space:nowrap">' + money(i.qty * i.price) + '</td></tr>'; };
		var line = function (l, v, c) { return '<tr><td style="padding:4px 0;font:15px Arial,sans-serif;color:' + c + '">' + l + '</td><td align="right" style="padding:4px 0;font:15px Arial,sans-serif;color:' + c + '">' + v + '</td></tr>'; };
		var tots = line('Subtotal', money(sub), '#44606B') + (disc ? line('Student discount', '−' + money(disc), '#1E7B3C') : '') + (st ? line('Sales tax (' + st + '%)', money(stx), '#44606B') : '') + (at ? line('Aviation tax (' + at + '%)', money(atx), '#44606B') : '') +
			'<tr><td style="padding:12px 0 0;font:900 18px Arial,sans-serif;color:#16303A;text-transform:uppercase">Total</td><td align="right" style="padding:12px 0 0;font:900 24px Arial,sans-serif;color:#F1854E">' + money(base + stx + atx) + '</td></tr>';
		var vu = dateOrNull(d.valid_until) ? new Date(d.valid_until + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
		return { html: fill(T, { 'ZZITEMS': items.map(row).join('') || row({ desc: 'Add an item', qty: 1, price: 0 }), 'ZZTOTALS': tots, 'ZZTITLE': escH(d.title || 'Gear Quote'), 'ZZQNOTES': escH(d.notes || ''), 'ZZVALID': vu }) };
	}

	/* ── the ops: same names and return shapes as the real WordPress endpoint ── */
	var OPS = {
		list: function () {
			var y = String(new Date().getFullYear());
			return { people: db.people.slice().sort(function (a, b) { return b.created_at.localeCompare(a.created_at); }).map(function (p) { return personOut(p); }), stats: { rev_year: db.payments.filter(function (x) { return (x.pay_date || '').slice(0, 4) === y; }).reduce(function (s, x) { return s + (+x.amount); }, 0), rev_all: db.payments.reduce(function (s, x) { return s + (+x.amount); }, 0), year: y } };
		},
		person: function (d) { return personFull(d.id); },
		person_save: function (d) {
			var id = +d.id || 0, p = id ? P(id) : null, row = {};
			['first', 'last', 'phone', 'location', 'launch', 'interest', 'email', 'notes'].forEach(function (f) { if (f in d) row[f] = String(d[f] == null ? '' : d[f]).trim(); });
			if ('status' in d && ['lead', 'intro', 'active', 'graduated', 'archived', 'customer'].indexOf(d.status) > -1) row.status = d.status;
			if ('stage' in d) row.stage = window.MJD.stages[d.stage] ? d.stage : '';
			['intro_date', 'enrolled_date', 'first_flight_date', 'gs1_date', 'ground_school_date', 'graduated_date'].forEach(function (f) { if (f in d) row[f] = dateOrNull(d[f]); });
			if ('flown' in d) row.flown = d.flown ? '1' : '0';
			if (row.first_flight_date) row.flown = '1';
			if (row.status === 'graduated' && !row.graduated_date) row.graduated_date = today();
			if (row.status === 'active' && !row.stage && !(p && p.stage)) row.stage = 'kiting';
			row.updated_at = now();
			if (id && d.restore) row.created_at = now();
			if (p) Object.assign(p, row);
			else {
				if (!row.first && !row.last) err('Please enter a name.');
				p = Object.assign({ id: ++db.seq.people, first: '', last: '', email: '', phone: '', location: '', launch: '', interest: '', source: 'Manual', taken_by: '', notes: '', status: 'lead', stage: '', intro_date: null, enrolled_date: null, first_flight_date: null, first_flight_image: '0', ground_school_date: null, gs_reminded_at: null, graduated_date: null, invited_at: null, invite_event: '', created_at: now(), updated_at: now(), flown: '0', gs1_date: null, ppg: null }, row);
				p.source = 'Manual'; db.people.push(p);
			}
			return personFull(p.id);
		},
		person_delete: function (d) { db.payments = db.payments.filter(function (y) { return +y.person_id !== +d.id; }); db.quotes = db.quotes.filter(function (q) { return +q.person_id !== +d.id; }); db.people = db.people.filter(function (p) { return +p.id !== +d.id; }); return true; },
		payment_add: payAdd,
		payment_update: function (d) { var y = db.payments.find(function (x) { return +x.id === +d.id; }); if (!y) err('Payment not found'); var amt = +d.amount || 0; if (amt <= 0) err('Enter an amount.'); var cat = CATS[d.category] ? d.category : 'other'; Object.assign(y, { pay_date: d.date_unknown ? null : (dateOrNull(d.pay_date) || today()), category: cat, description: String(d.description || '').trim() || CATS[cat], amount: amt.toFixed(2), method: d.method || '' }); return personFull(y.person_id); },
		payment_delete: function (d) { var y = db.payments.find(function (x) { return +x.id === +d.id; }); db.payments = db.payments.filter(function (x) { return +x.id !== +d.id; }); return personFull(y ? y.person_id : 0); },
		step_back: function (d) {
			var p = P(d.id); if (!p) err('Not found');
			if (p.status === 'graduated') { p.status = 'active'; p.graduated_date = null; }
			else if (p.status === 'active') { if (d.drop_payments) db.payments = db.payments.filter(function (y) { return !(+y.person_id === +p.id && TRAIN.indexOf(y.category) > -1); }); var hi = paysOf(p.id).some(function (y) { return y.category === 'intro'; }) || p.intro_date; p.status = hi ? 'intro' : 'lead'; p.enrolled_date = null; p.stage = ''; }
			else if (p.status === 'intro') { if (d.drop_payments) db.payments = db.payments.filter(function (y) { return !(+y.person_id === +p.id && y.category === 'intro'); }); p.status = 'lead'; p.intro_date = null; }
			else err('Already on Leads.');
			p.updated_at = now(); return personFull(p.id);
		},
		merge: function (d) { var k = P(d.keep), r = P(d.remove); if (!k || !r || k === r) err('Pick two different people.'); ['first', 'last', 'email', 'phone', 'location', 'launch', 'interest', 'source'].forEach(function (f) { if (!String(k[f] || '').trim() && String(r[f] || '').trim()) k[f] = r[f]; }); db.payments.forEach(function (y) { if (+y.person_id === +r.id) y.person_id = String(k.id); }); db.quotes.forEach(function (q) { if (+q.person_id === +r.id) q.person_id = String(k.id); }); db.people = db.people.filter(function (p) { return p !== r; }); return personFull(k.id); },
		ppg_set: function (d) { var p = P(d.id); if (!p) err('Bad checklist item'); var cur = {}; try { cur = JSON.parse(p.ppg || '{}') || {}; } catch (e) {} if (d.on) cur[d.item] = { d: today(), by: ME }; else delete cur[d.item]; p.ppg = Object.keys(cur).length ? JSON.stringify(cur) : ''; return { ppg: p.ppg }; },
		feature_pilot: function () { err('Featuring a pilot on the website is turned off in this demo.'); },

		quotes: function () { return db.quotes.slice().sort(function (a, b) { return b.created_at.localeCompare(a.created_at); }).map(function (q) { var p = P(q.person_id) || {}; return { id: q.id, person_id: q.person_id, title: q.title, total: q.total, status: q.status, archived: q.archived, sent_at: q.sent_at, created_at: q.created_at, first: p.first || '', last: p.last || '' }; }); },
		quote_save: function (d) {
			var items = cleanItems(d.items); if (!items.length) err('Add at least one item.');
			var q = +d.id ? db.quotes.find(function (x) { return +x.id === +d.id; }) : null;
			var row = { person_id: String(+d.person_id || 0), title: String(d.title || '').trim() || 'Gear Quote', items: items, discount: (+d.discount || 0).toFixed(2), sales_tax: String(+d.sales_tax || 0), aviation_tax: String(+d.aviation_tax || 0), notes: d.notes || '', valid_until: dateOrNull(d.valid_until), updated_at: now() };
			row.total = quoteTotal(items, +row.discount, +row.sales_tax, +row.aviation_tax).toFixed(2);
			if (q) Object.assign(q, row); else { q = Object.assign({ id: String(++db.seq.quotes), status: 'draft', archived: '0', sent_at: null, created_at: now() }, row); db.quotes.push(q); }
			return JSON.parse(JSON.stringify(q));
		},
		quote_preview: previewQuote,
		quote_test: function (d) { if (!cleanItems(d.items).length) err('Add at least one item.'); return { to: 'you@example.com (demo — nothing was sent)' }; },
		quote_send: function (d) { var q = OPS.quote_save(d), p = P(q.person_id); if (!p || !p.email) err('This person has no email address on file.'); var x = db.quotes.find(function (z) { return z.id === q.id; }); x.status = 'sent'; x.sent_at = now(); return personFull(p.id); },
		quote_status: function (d) { var q = db.quotes.find(function (x) { return +x.id === +d.id; }); if (!q) err('Quote not found'); var was = q.status; q.status = ['draft', 'sent', 'purchased', 'declined'].indexOf(d.status) > -1 ? d.status : q.status; if (q.status === 'purchased' && was !== 'purchased') return payAdd({ person_id: q.person_id, category: 'gear', amount: q.total, description: q.title, method: d.method, pay_date: d.pay_date }); return personFull(q.person_id); },
		quote_delete: function (d) { var q = db.quotes.find(function (x) { return +x.id === +d.id; }); db.quotes = db.quotes.filter(function (x) { return x !== q; }); return personFull(q ? q.person_id : 0); },
		quote_archive: function (d) { var q = db.quotes.find(function (x) { return +x.id === +d.id; }); if (q) q.archived = d.archived ? '1' : '0'; return true; },
		gear_sales: function () { return db.payments.filter(function (y) { return y.category === 'gear'; }).sort(function (a, b) { return (b.pay_date || '').localeCompare(a.pay_date || '') || b.id - a.id; }).map(function (y) { var p = P(y.person_id) || {}; return Object.assign({}, y, { first: p.first || '', last: p.last || '' }); }); },

		invite_preview: previewInvite,
		gs_preview: previewGs,
		invite_send: function (d) { var out = []; (d.ids || []).slice(0, 10).forEach(function (id) { var p = P(id); if (!p || !p.email) { out.push({ id: id, email: p ? p.email : '', ok: false }); return; } p.invited_at = now(); p.invite_event = fmtDate(d.date) + ' ' + fmtTime(d.start); out.push({ id: id, email: p.email, ok: true }); }); if (d.test) return [{ email: 'you@example.com', ok: true }]; return out; },
		gs_send: function (d) { if (d.test) return [{ email: 'you@example.com', ok: true }]; return (d.ids || []).slice(0, 10).map(function (id) { var p = P(id); if (p) p.gs_reminded_at = now(); return { id: id, email: p ? p.email : '', ok: !!(p && p.email) }; }); },
		welcome_preview: function () { return { html: window.MJD_DEMO_TPL.wel, subject: 'Thanks for your interest in an Intro Day, here’s what happens next' }; },
		rsvp_link: function () { return { url: location.href.split('#')[0] + '#demo-rsvp-link' }; },

		sess_list: function () { return { sessions: db.sessions.slice().sort(function (a, b) { return b.sess_date.localeCompare(a.sess_date); }).map(sessOut), groupme: false, gm_group: '', gm_by_field: {}, invited: {} }; },
		sess_save: function (d) {
			var date = dateOrNull(d.sess_date); if (!date) err('Pick a date.');
			var s = +d.id ? S(d.id) : null, row = { sess_date: date, start_time: /^\d{1,2}:\d{2}$/.test(d.start_time || '') ? d.start_time : '', field: d.field || '', notes: d.notes || '', updated_at: now() };
			if ('kind' in d) row.kind = d.kind === 'gs' ? 'gs' : 'training';
			if ('zoom' in d) row.zoom = String(d.zoom || '').trim();
			if ('recording' in d) row.recording = String(d.recording || '').trim();
			if ('rsvps' in d) row.rsvps = d.rsvps || [];
			if (s) Object.assign(s, row); else { s = Object.assign({ id: ++db.seq.sessions, gm_event_id: '', rsvps: [], created_at: now(), kind: 'training', zoom: '', gm_events: [], recording: '' }, row); db.sessions.push(s); }
			return sessOut(s);
		},
		sess_create_gm: function (d) { return { session: OPS.sess_save(d), groupme: null, gm_error: d.post_gm ? 'GroupMe posting is turned off in this demo.' : '' }; },
		sess_rsvps: function (d) { var s = S(d.id); if (!s) err('Not found'); if (d.rsvps) { s.rsvps = d.rsvps; s.updated_at = now(); } return sessOut(s); },
		sess_recording: function (d) { var s = S(d.id); if (!s) err('Missing session.'); var u = String(d.recording || '').trim(); if (u && !/^https?:\/\//i.test(u)) u = 'https://' + u; s.recording = u; return sessOut(s); },
		sess_delete: function (d) { db.sessions = db.sessions.filter(function (s) { return +s.id !== +d.id; }); return true; },
		gm_sync: function () { err('GroupMe isn’t connected in this demo.'); },
		gm_import: function () { return { new: 0, updated: 0 }; },
		gm_rebuild: function () { return { new: 0, updated: 0 }; },

		waivers: function () { var o = {}; db.waivers.forEach(function (w) { var k = +w.person_id; if (o[k] && (o[k].status === 'signed' || o[k].status === 'paper') && w.status === 'sent') return; o[k] = { person_id: w.person_id, token: w.token, status: w.status, sent_at: w.sent_at, sent_to: w.sent_to, opened_at: w.opened_at, signed_at_local: w.signed_at_local }; }); return o; },
		waiver_archive: function () { return db.waiverArchive.slice().reverse(); },
		waiver_send: function (d) { var p = P(d.id); if (!p) err('Student not found'); var w = db.waivers.find(function (x) { return +x.person_id === +p.id && x.status === 'sent'; }); if (!w) { w = { id: String(++db.seq.waivers), person_id: String(p.id), token: 'demo' + p.id + 'x' + db.seq.waivers, status: 'sent', sent_at: now(), sent_to: '', opened_at: null, signed_at_local: null }; db.waivers.push(w); } if (!d.copy_only) { if (!/@/.test(d.email || '')) err('Add a valid email address first (or use Copy link).'); w.sent_at = now(); w.sent_to = d.email; } return { url: location.href.split('#')[0] + '#demo-waiver-link', sent: !d.copy_only }; },
		waiver_paper: function (d) { if (db.waivers.some(function (w) { return +w.person_id === +d.id && (w.status === 'signed' || w.status === 'paper'); })) return true; db.waivers.push({ id: String(++db.seq.waivers), person_id: String(d.id), token: 'paper' + d.id, status: 'paper', sent_at: now(), sent_to: '', opened_at: null, signed_at_local: now() }); return true; },

		att_list: function () { return db.att.slice().sort(function (a, b) { return b.att_date.localeCompare(a.att_date) || a.name.localeCompare(b.name); }); },
		att_save: function (d) {
			var x = +d.id ? db.att.find(function (a) { return +a.id === +d.id; }) : null;
			if (d.kind === 'hours') {
				var h = Math.round((+d.hours || 0) * 100) / 100; if (h <= 0 || h > 24 || HOURCATS.indexOf(d.category) < 0 || !dateOrNull(d.att_date) || !String(d.comments || '').trim()) err('Check the hours, category, date and description.');
				var row = { name: d.name, att_date: d.att_date, hours: h.toFixed(2), category: d.category, comments: d.comments };
				if (x) Object.assign(x, row); else db.att.push(Object.assign({ id: String(++db.seq.att), field: '', created_at: now(), kind: 'hours' }, row));
				return true;
			}
			if (TEAM.indexOf(d.name) < 0 || FIELDS.indexOf(d.field) < 0 || !dateOrNull(d.att_date)) err('Check the name, field and date.');
			var r2 = { name: d.name, field: d.field, att_date: d.att_date, comments: d.comments || '' };
			if (x) Object.assign(x, r2); else db.att.push(Object.assign({ id: String(++db.seq.att), created_at: now(), kind: 'field', hours: '0.00', category: '' }, r2));
			return true;
		},
		att_delete: function (d) { db.att = db.att.filter(function (a) { return +a.id !== +d.id; }); return true; },
		att_summaries: function () { return db.attSum; },
		att_summary_save: function (d) { if (!/^\d{4}-Q[1-4]$/.test(d.key || '')) err('Bad quarter'); if (d.clear) { delete db.attSum[d.key]; return db.attSum; } var c = {}; TEAM.forEach(function (n) { c[n] = Math.max(0, parseInt((d.counts || {})[n], 10) || 0); }); db.attSum[d.key] = { total: Math.max(1, parseInt(d.total, 10) || 1, Math.max.apply(null, TEAM.map(function (n) { return c[n]; }))), counts: c }; return db.attSum; },
		att_hpd: function (d) { if ('hours_per_day' in d) db.hpd = Math.max(1, Math.min(24, +d.hours_per_day || 6)); return { hours_per_day: db.hpd }; },
		att_hidden: function () { return db.attHidden; },
		att_hide: function (d) { var k = String(d.key || '').toLowerCase().replace(/[^a-z0-9\-]/g, ''); if (k) db.attHidden[k] = +d.sig || 0; return db.attHidden; },
		att_unhide: function (d) { delete db.attHidden[String(d.key || '').toLowerCase().replace(/[^a-z0-9\-]/g, '')]; return db.attHidden; },

		order_list: orderList,
		order_save: function (d) {
			if (!String(d.item || '').trim()) err('Say what was ordered.'); if (TEAM.indexOf(d.ordered_by) < 0) err('Pick who is ordering.');
			var st = ['needed', 'ordered', 'shipped', 'received'].indexOf(d.status) > -1 ? d.status : 'ordered', cat = (window.MJD.orderCats || []).indexOf(d.category) > -1 ? d.category : 'Other';
			var row = { order_date: dateOrNull(d.order_date), dealer: d.dealer || '', category: cat, item: String(d.item).trim(), qty: String(Math.max(1, parseInt(d.qty, 10) || 1)), cost: (Math.round(parseFloat(String(d.cost || 0).replace(/[^0-9.\-]/g, '')) * 100) / 100 || 0).toFixed(2), status: st, received_date: st === 'received' ? (dateOrNull(d.received_date) || today()) : null, notes: d.notes || '', ordered_by: d.ordered_by };
			var o = +d.id ? db.orders.find(function (x) { return +x.id === +d.id; }) : null;
			if (o) Object.assign(o, row); else db.orders.push(Object.assign({ id: String(++db.seq.orders), created_by: ME, created_at: now() }, row));
			return orderList();
		},
		order_status: function (d) { if (['needed', 'ordered', 'shipped', 'received'].indexOf(d.status) < 0) err('Bad status'); var o = db.orders.find(function (x) { return +x.id === +d.id; }); if (o) { o.status = d.status; o.received_date = d.status === 'received' ? today() : null; } return orderList(); },
		order_delete: function (d) { db.orders = db.orders.filter(function (x) { return +x.id !== +d.id; }); return orderList(); },

		todo_list: todoList,
		todo_save: function (d) { var title = String(d.title || '').trim(); if (!title) err('Type what needs to get done.'); var t = +d.id ? db.todos.find(function (x) { return +x.id === +d.id; }) : null; if (t) Object.assign(t, { title: title, who: d.who || '', due: dateOrNull(d.due) }); else { var nid = addTodo(title, d.who || ''); db.todos.find(function (x) { return +x.id === nid; }).due = dateOrNull(d.due); } return todoList(); },
		todo_toggle: function (d) { var t = db.todos.find(function (x) { return +x.id === +d.id; }); if (t) { t.done = d.done ? '1' : '0'; t.done_at = d.done ? now() : null; t.done_by = d.done ? ME : ''; } return todoList(); },
		todo_delete: function (d) { db.todos = db.todos.filter(function (x) { return +x.id !== +d.id; }); return todoList(); },
		todo_order: function (d) { (d.ids || []).forEach(function (id, i) { var t = db.todos.find(function (x) { return +x.id === +id; }); if (t) t.sort = String(i); }); return todoList(); },

		inv_get: invOut,
		inv_save: function (d) {
			if (!db.inv.items[d.cat]) err('Pick a category.'); var nm = String(d.name || '').trim(); if (!nm) err('Give the item a name, e.g. "Training wing 25".');
			var row = { name: nm, qty: Math.max(0, parseInt(d.qty, 10) || 0), cond: ['new', 'good', 'fair', 'worn', 'out'].indexOf(d.cond) > -1 ? d.cond : '', notes: d.notes || '', by: ME, at: now() };
			var it = +d.id ? db.inv.items[d.cat].find(function (x) { return +x.id === +d.id; }) : null;
			if (it) Object.assign(it, row); else db.inv.items[d.cat].push(Object.assign({ id: ++db.inv.seq }, row));
			return invOut();
		},
		inv_qty: function (d) { var it = (db.inv.items[d.cat] || []).find(function (x) { return +x.id === +d.id; }); if (it) { it.qty = Math.max(0, +it.qty + (+d.delta || 0)); it.by = ME; it.at = now(); } return invOut(); },
		inv_delete: function (d) { if (db.inv.items[d.cat]) db.inv.items[d.cat] = db.inv.items[d.cat].filter(function (x) { return +x.id !== +d.id; }); return invOut(); },
		repair_add: function (d) {
			var what = String(d.what || '').trim(), kind = d.kind === 'maint' ? 'maint' : 'repair'; if (!what) err('What needs ' + (kind === 'maint' ? 'maintenance' : 'repair') + '?');
			var who = TEAM.indexOf(d.who) > -1 ? d.who : '', need = !!d.order, oby = TEAM.indexOf(d.order_by) > -1 ? d.order_by : '', oi = String(d.order_item || '').trim();
			if (need && !oby) err('Pick who is placing the order.'); if (need && !oi) oi = 'Parts for ' + what;
			var label = (kind === 'maint' ? 'Maintenance: ' : 'Repair: ') + what, tid = 0, oid = 0, otid = 0;
			if (who) tid = addTodo(label, who);
			if (need) { db.orders.push({ id: String(++db.seq.orders), order_date: null, dealer: '', category: 'Other', item: oi, qty: '1', cost: '0.00', status: 'needed', received_date: null, notes: 'For ' + label.toLowerCase(), ordered_by: oby, created_by: ME, created_at: now() }); oid = db.seq.orders; otid = addTodo('Order parts: ' + oi, oby); }
			db.inv.repairs.push({ id: ++db.inv.seq, kind: kind, what: what, cat: db.inv.items[d.cat] ? d.cat : '', issue: d.issue || '', who: who, order: need ? 1 : 0, order_by: oby, order_item: need ? oi : '', order_id: oid, todo_id: tid, otodo_id: otid, by: ME, at: now(), done: 0, done_by: '', done_at: '' });
			return invOut();
		},
		repair_done: function (d) { var done = d.undo ? 0 : 1; db.inv.repairs.forEach(function (r) { if (+r.id === +d.id) { r.done = done; r.done_by = done ? ME : ''; r.done_at = done ? now() : ''; if (r.todo_id) OPS.todo_toggle({ id: r.todo_id, done: done }); } }); return invOut(); },
		repair_delete: function (d) { db.inv.repairs = db.inv.repairs.filter(function (r) { return +r.id !== +d.id; }); return invOut(); },

		pricing: pricing,
		pricing_refresh: pricing,
		wx: function (d) { return weather(d.field); },
		creds: function () { return db.creds; },
		creds_save: function (d) { if (!String(d.service || '').trim()) err('Name the account (e.g. Instagram).'); var item = { id: d.id || 'c' + Date.now().toString(36), service: d.service, username: d.username || '', password: d.password || '', url: d.url || '', notes: d.notes || '', updated: now(), by: ME }; var i = db.creds.findIndex(function (c) { return c.id === item.id; }); if (i > -1) db.creds[i] = item; else db.creds.push(item); return db.creds; },
		creds_delete: function (d) { db.creds = db.creds.filter(function (c) { return c.id !== d.id; }); return db.creds; }
	};

	/* ── answer every Flight Desk request locally ── */
	var realFetch = window.fetch.bind(window);
	window.fetch = function (url, opts) {
		if (String(url) !== window.MJD.ajax) return realFetch(url, opts);
		var fd = opts && opts.body, op = fd && fd.get ? fd.get('op') : '', data = {};
		try { data = JSON.parse((fd && fd.get && fd.get('data')) || '{}') || {}; } catch (e) {}
		var body;
		try {
			if (!OPS[op]) throw new Error('That action isn’t available in the demo.');
			var res = OPS[op](data);
			save();
			body = { success: true, data: JSON.parse(JSON.stringify(res)) };
		} catch (e) { body = { success: false, data: e.message || 'Something went wrong' }; }
		return new Promise(function (ok) { setTimeout(function () { ok(new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })); }, 120 + Math.random() * 180); });
	};

	/* wp.media isn't available outside WordPress — explain instead of failing */
	window.wp = window.wp || {};
	window.wp.media = function () { var h = { on: function () { return h; }, open: function () { alert('Photo uploads are turned off in this demo.'); return h; }, state: function () { return { get: function () { return { first: function () { return { toJSON: function () { return {}; } }; } }; } }; } }; return h; };
})();
