/* Demo-only behavior: links that would leave the dashboard (log out, WordPress settings,
 * public forms, signed waivers…) explain themselves instead of going anywhere. */
(function () {
	function note(msg) {
		var t = document.createElement('div'); t.className = 'mjd-demotoast'; t.textContent = msg;
		document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
	}
	var MSG = {
		'demo-logout': 'This is a demo, so there’s nothing to log out of.',
		'demo-profile': 'Account settings live in WordPress — not part of the demo.',
		'demo-settings': 'Settings (GroupMe, email, Monday.com) are turned off in the demo.',
		'demo-booking-page': 'In the live system this opens the public booking page.',
		'demo-attendance-form': 'In the live system this opens the phone-friendly attendance form.',
		'demo-waiver-link': 'In the live system this is the student’s private waiver link.',
		'demo-rsvp-link': 'In the live system this is the student’s private RSVP link.'
	};
	document.addEventListener('click', function (e) {
		var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
		var h = a.getAttribute('href') || '';
		if (/^(mailto:|tel:|sms:)/i.test(h)) { e.preventDefault(); note('Contact buttons are disabled in the demo (sample contacts).'); return; }
		if (/^https?:/i.test(h) && !/zoom\.us\/rec\/share\/sample/.test(h)) { if (/zoom\.us|instagram|facebook/i.test(h)) { e.preventDefault(); note('External links are disabled in the demo.'); } return; }
		if (/^#(home|[a-z]+)$/.test(h) && !/^#demo/.test(h)) return; // normal in-app tabs
		if (h.charAt(0) === '#' && h.indexOf('#demo') !== 0) return;
		e.preventDefault(); e.stopPropagation();
		var key = (h.match(/#(demo-[a-z-]+)/) || [])[1];
		if (/#demo\/waiver\//.test(h)) note('In the live system this opens the signed waiver (with signature and audit trail).');
		else note(MSG[key] || 'That page lives outside the Flight Desk, so it’s not part of the demo.');
	}, true);
	/* Some hosts (embedded previews) block browser pop-ups, which would make delete buttons do
	 * nothing. When the demo is framed, accept confirmations and show alerts as a toast instead. */
	var framed = false; try { framed = window.top !== window; } catch (e) { framed = true; }
	if (framed) { window.confirm = function () { return true; }; window.alert = function (m) { note(String(m)); }; }

	/* Reset button: click twice to confirm (works everywhere, no pop-up needed). */
	var rb = document.querySelector('.mjd-demobar__reset'), armed = 0;
	if (rb) rb.addEventListener('click', function () {
		if (armed) { window.MJDDemoReset(); return; }
		armed = setTimeout(function () { armed = 0; rb.textContent = 'Reset'; }, 3000);
		rb.textContent = 'Click again to reset';
	});
})();
