/*
 * Onboarding form: move freely between steps and keep answers.
 * - Next/Back never get stuck on an empty field; the step dots jump straight to any step.
 * - Everything typed or chosen is saved in this browser as you go (for 60 days) and filled back in
 *   when the page is opened again, on the step you were last on. Cleared once the form is sent.
 * - If the final submit finds a required answer missing (including a checkbox question with nothing ticked),
 *   it jumps to the step with that question.
 */
(function () {
	'use strict';
	var form = document.getElementById('onboarding');
	if (!form) { return; }
	var KEY = 'dwd_onboarding_v1', DAYS = 60;

	var steps = function () { return [].slice.call(form.querySelectorAll('.e-form__step')); };
	var current = function () { var s = steps(); for (var i = 0; i < s.length; i++) { if (!s[i].classList.contains('elementor-hidden')) { return i; } } return 0; };
	var store = {
		get: function () { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); return d && Date.now() - d.t < DAYS * 864e5 ? d : null; } catch (e) { return null; } },
		set: function (d) { try { d.t = Date.now(); localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} },
		clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
	};

	/* ---------- moving between steps ---------- */

	// Let a step be left with empty required fields: drop `required` just while the Next click is handled.
	function relaxed(fn) {
		var req = [].slice.call(form.querySelectorAll('[required]'));
		req.forEach(function (f) { f.removeAttribute('required'); f.setAttribute('data-dw-req', ''); });
		try { fn(); } finally {
			setTimeout(function () { form.querySelectorAll('[data-dw-req]').forEach(function (f) { f.setAttribute('required', 'required'); f.removeAttribute('data-dw-req'); }); }, 0);
		}
	}

	function clickIn(step, dir) {
		var b = step && step.querySelector('.e-form__buttons__wrapper__button-' + dir);
		if (b) { b.click(); }
		return !!b;
	}

	// Elementor switches steps a moment after the click, so wait for each switch before the next.
	var moving = false;
	function goTo(n, scroll) {
		if (moving) { return; }
		moving = true;
		var guard = 20;
		(function move() {
			var c = current();
			if (c === n || !guard--) {
				moving = false;
				save();
				if (scroll) { form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
				return;
			}
			if (!clickIn(steps()[c], c < n ? 'next' : 'previous')) { moving = false; return; }
			var waited = 0;
			(function wait() {
				if (current() !== c || waited > 1500) { setTimeout(move, 30); return; }
				waited += 30; setTimeout(wait, 30);
			})();
		})();
	}

	// Next buttons: never blocked by empty fields (the real check happens on submit).
	form.addEventListener('click', function (e) {
		if (!(e.target.closest && e.target.closest('.e-form__buttons__wrapper__button-next'))) { return; }
		relaxed(function () {});
		setTimeout(save, 0);
	}, true);

	// Step dots at the top are clickable (Elementor redraws them on every step, so listen on the form).
	function dotIndex(t) {
		var dot = t.closest && t.closest('.e-form__indicators__indicator');
		return dot ? [].indexOf.call(form.querySelectorAll('.e-form__indicators__indicator'), dot) : -1;
	}
	form.addEventListener('click', function (e) { var i = dotIndex(e.target); if (i > -1) { e.preventDefault(); goTo(i, true); } });
	form.addEventListener('keydown', function (e) { var i = dotIndex(e.target); if (i > -1 && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); goTo(i, true); } });
	function labelDots() {
		form.querySelectorAll('.e-form__indicators__indicator').forEach(function (d) { if (!d.hasAttribute('tabindex')) { d.setAttribute('tabindex', '0'); d.setAttribute('role', 'button'); d.setAttribute('title', 'Go to this step'); } });
	}
	labelDots();
	if (window.MutationObserver) { new MutationObserver(labelDots).observe(form, { childList: true, subtree: true }); }
	form.addEventListener('click', function (e) {
		if (e.target.closest && e.target.closest('.e-form__buttons__wrapper__button-previous')) { setTimeout(save, 0); }
	});

	/* ---------- saving answers ---------- */

	function fields() {
		return [].slice.call(form.querySelectorAll('input[name^="form_fields"], textarea[name^="form_fields"], select[name^="form_fields"]'))
			.filter(function (f) { return f.type !== 'file' && f.type !== 'hidden' && f.type !== 'submit'; });
	}

	var timer;
	function save() {
		clearTimeout(timer);
		timer = setTimeout(function () {
			var v = {};
			fields().forEach(function (f) {
				if (f.type === 'checkbox' || f.type === 'radio') {
					if (!v[f.name]) { v[f.name] = []; }
					if (f.checked) { v[f.name].push(f.value); }
				} else if (f.multiple) {
					v[f.name] = [].slice.call(f.selectedOptions).map(function (o) { return o.value; });
				} else {
					v[f.name] = f.value;
				}
			});
			store.set({ v: v, step: current() });
			note(true);
		}, 250);
	}

	function restore() {
		var d = store.get();
		if (!d || !d.v) { return false; }
		var any = false;
		fields().forEach(function (f) {
			var val = d.v[f.name];
			if (val === undefined) { return; }
			if (f.type === 'checkbox' || f.type === 'radio') {
				f.checked = Array.isArray(val) && val.indexOf(f.value) > -1;
				any = any || f.checked;
			} else if (f.multiple && Array.isArray(val)) {
				[].forEach.call(f.options, function (o) { o.selected = val.indexOf(o.value) > -1; });
			} else if (val !== '') {
				f.value = val; any = true;
			}
			f.dispatchEvent(new Event('change', { bubbles: true }));
		});
		if (d.step) { goTo(d.step, false); }
		return any;
	}

	form.addEventListener('input', save);
	form.addEventListener('change', save);

	/* ---------- the note above the form ---------- */

	var box = document.createElement('div');
	box.className = 'dw-ob-note';
	box.innerHTML = '<span class="dw-ob-ic" aria-hidden="true"></span><span class="dw-ob-t">Your answers save automatically on this device, so you can come back later to finish. Every question needs an answer: if one doesn’t apply, just write N/A. File uploads are optional.</span><button type="button" class="dw-ob-clear" hidden>Start over</button>';
	form.parentNode.insertBefore(box, form);
	var clearBtn = box.querySelector('.dw-ob-clear');
	function note(saved) { clearBtn.hidden = !saved; }
	clearBtn.addEventListener('click', function () {
		if (!window.confirm('Clear all your saved answers and start the form over?')) { return; }
		store.clear(); form.reset(); goTo(0, true); note(false);
	});

	/* ---------- uploads ---------- */

	// Check each picked file straight away (the form itself only checks at the very end, with a vague error):
	// wrong type, too big for the box, or too much in total. Bad files are taken out and the client is pointed
	// to the shared-folder link box (Google Drive / Dropbox / WeTransfer) instead.
	var TYPES = 'jpg,jpeg,png,gif,webp,heic,svg,ai,eps,psd,pdf,doc,docx,txt,rtf,pages,odt,xls,xlsx,csv,ppt,pptx,key,ttf,otf,woff,woff2,zip,mp4,mov,webm,m4v'.split(','),
		TOTAL_MB = 200;
	var mb = function (b) { return (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB'; };
	var uploads = function () { return [].slice.call(form.querySelectorAll('input[type="file"]')); };
	uploads().forEach(function (inp) { inp.setAttribute('accept', TYPES.map(function (t) { return '.' + t; }).join(',')); });
	function linkField() { return form.querySelector('[name="form_fields[shared_folder]"]'); }
	function upMsg(inp, html) {
		var g = inp.closest('.elementor-field-group'), m = g && g.querySelector('.dw-upmsg');
		if (!g) { return; }
		if (!html) { if (m) { m.remove(); } return; }
		if (!m) { m = document.createElement('div'); m.className = 'dw-upmsg'; m.setAttribute('role', 'alert'); g.appendChild(m); }
		m.innerHTML = html + (linkField() ? ' <button type="button" class="dw-uplink">Paste a link instead</button>' : '');
	}
	form.addEventListener('click', function (e) {
		var b = e.target.closest && e.target.closest('.dw-uplink');
		if (!b) { return; }
		var lf = linkField(), s = steps();
		if (!lf) { return; }
		for (var i = 0; i < s.length; i++) { if (s[i].contains(lf)) { if (i !== current()) { goTo(i, true); } break; } }
		setTimeout(function () { lf.scrollIntoView({ block: 'center', behavior: 'smooth' }); lf.focus(); }, 320);
	});
	form.addEventListener('change', function (e) {
		var inp = e.target;
		if (!inp || inp.type !== 'file') { return; }
		var max = parseFloat(inp.getAttribute('data-maxsize')) || 50, keep = [], bad = [], big = [];
		[].slice.call(inp.files || []).forEach(function (f) {
			var ext = String(f.name.split('.').pop() || '').toLowerCase();
			if (TYPES.indexOf(ext) < 0) { bad.push(f.name); } else if (f.size > max * 1048576) { big.push(f.name + ' (' + mb(f.size) + ')'); } else { keep.push(f); }
		});
		// Everything picked across all the boxes has to go up in one send.
		var others = 0;
		uploads().forEach(function (o) { if (o !== inp) { [].slice.call(o.files || []).forEach(function (f) { others += f.size; }); } });
		var sum = others, over = [];
		keep = keep.filter(function (f) { if (sum + f.size > TOTAL_MB * 1048576) { over.push(f.name); return false; } sum += f.size; return true; });
		if (bad.length || big.length || over.length) {
			try { var dt = new DataTransfer(); keep.forEach(function (f) { dt.items.add(f); }); inp.files = dt.files; } catch (er) { if (!keep.length) { inp.value = ''; } }
			var parts = [];
			if (big.length) { parts.push('<b>Too big to upload here</b> (over ' + max + ' MB): ' + big.join(', ') + '.'); }
			if (over.length) { parts.push('<b>Too much to send at once</b> (over ' + TOTAL_MB + ' MB in total): ' + over.join(', ') + '.'); }
			if (bad.length) { parts.push('<b>This file type can’t be uploaded:</b> ' + bad.join(', ') + '. Zip it, or share it with a link.'); }
			parts.push('Put these in a Google Drive, Dropbox or WeTransfer folder and paste the link in the “Link to a Google Drive…” box on the Content step.');
			upMsg(inp, parts.join('<br>'));
			// Elementor adds its own "exceeds the maximum size" note; the file's gone now, so drop it.
			setTimeout(function () { var g2 = inp.closest('.elementor-field-group'); if (g2) { g2.classList.remove('elementor-error'); g2.querySelectorAll('.elementor-form-help-inline').forEach(function (x) { x.remove(); }); } inp.removeAttribute('aria-invalid'); }, 0);
		} else {
			upMsg(inp, '');
		}
	});

	/* ---------- submit ---------- */

	// Before sending: any required answer still empty on another step? Go there and point at it.
	form.addEventListener('click', function (e) {
		var b = e.target.closest && e.target.closest('button[type="submit"]');
		if (!b) { return; }
		var s = steps(), cur = current();
		for (var i = 0; i < s.length; i++) {
			var miss = [].slice.call(s[i].querySelectorAll('[required]')).filter(function (f) { return !String(f.value || '').trim(); })[0];
			if (miss && i !== cur) {
				e.preventDefault(); e.stopImmediatePropagation();
				goTo(i, true);
				setTimeout(function () { miss.reportValidity(); miss.focus(); }, 300);
				return;
			}
		}
		// Checkbox questions are required too (the browser can't check a group): at least one box each.
		for (var j = 0; j < s.length; j++) {
			var grp = [].slice.call(s[j].querySelectorAll('.elementor-field-type-checkbox')).filter(function (g) { return !g.querySelector('input[type="checkbox"]:checked'); })[0];
			if (grp) {
				e.preventDefault(); e.stopImmediatePropagation();
				var box = grp.querySelector('input[type="checkbox"]');
				if (j !== cur) { goTo(j, true); }
				setTimeout(function () {
					box.setCustomValidity('Please choose at least one option.');
					box.reportValidity(); box.focus();
					grp.addEventListener('change', function clr() { box.setCustomValidity(''); grp.removeEventListener('change', clr); });
				}, j !== cur ? 300 : 0);
				return;
			}
		}
	}, true);


	// Sent: forget the saved answers.
	if (window.jQuery) {
		jQuery(form).on('submit_success', function () { store.clear(); note(false); });
		// Missing required answers: jump to the first step that has one.
		jQuery(document).ajaxComplete(function (e, xhr, opt) {
			if (!opt || !opt.data || String(opt.data).indexOf('elementor_pro_forms_send_form') < 0) { return; }
			var r = xhr.responseJSON;
			if (!r || r.success || !r.data || !r.data.errors) { return; }
			Object.keys(r.data.errors).forEach(function (k) {
				var fi = form.querySelector('input[type="file"][name="form_fields[' + k + '][]"]');
				if (fi) { upMsg(fi, '<b>' + r.data.errors[k] + '</b> Remove that file, or share it with a Google Drive, Dropbox or WeTransfer link on the Content step.'); }
			});
			var ids = Object.keys(r.data.errors), s = steps();
			for (var i = 0; i < s.length; i++) {
				for (var k = 0; k < ids.length; k++) {
					if (s[i].querySelector('.elementor-field-group-' + ids[k])) { goTo(i, true); return; }
				}
			}
		});
	}

	// Wait for Elementor to finish setting up the steps before filling answers back in.
	var tries = 0;
	(function ready() {
		if (form.querySelector('.e-form__indicators__indicator') || tries++ > 100) { if (restore()) { note(true); } return; }
		setTimeout(ready, 50);
	})();
})();
