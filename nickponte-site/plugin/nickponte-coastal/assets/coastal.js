/* Coastal Light preview: FAQ accordion (one open at a time) and the off-market email form. */
(function () {
	document.querySelectorAll('.npc-faq__list').forEach(function (list) {
		var items = list.querySelectorAll('.npc-faq__item');
		items.forEach(function (item) {
			var btn = item.querySelector('button');
			btn.addEventListener('click', function () {
				var open = btn.getAttribute('aria-expanded') === 'true';
				items.forEach(function (o) {
					var b = o.querySelector('button');
					b.setAttribute('aria-expanded', 'false');
					o.querySelector('.npc-faq__sign').textContent = '+';
					o.querySelector('.npc-faq__a').hidden = true;
				});
				if (!open) {
					btn.setAttribute('aria-expanded', 'true');
					item.querySelector('.npc-faq__sign').textContent = '−';
					item.querySelector('.npc-faq__a').hidden = false;
				}
			});
		});
	});

	// Town guide tabs (arrow keys move between tabs) and "Read more"
	document.querySelectorAll('[data-npc-tabs]').forEach(function (box) {
		var tabs = [].slice.call(box.querySelectorAll('[role=tab]'));
		function show(t) {
			tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
		}
		tabs.forEach(function (t, i) {
			t.addEventListener('click', function () { show(t); });
			t.addEventListener('keydown', function (e) {
				var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
				if (n === null) return; e.preventDefault(); var x = tabs[(n + tabs.length) % tabs.length]; show(x); x.focus();
			});
		});
	});
	// Long guide cards: show 5 lines with a More toggle
	document.querySelectorAll('.npc-gcard__b').forEach(function (b) {
		if (b.textContent.trim().split(/\s+/).length < 60) return;
		b.classList.add('is-clamped');
		var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'npc-gcard__more'; btn.textContent = 'More'; btn.setAttribute('aria-expanded', 'false');
		btn.addEventListener('click', function () { var open = b.classList.toggle('is-clamped'); btn.textContent = open ? 'More' : 'Less'; btn.setAttribute('aria-expanded', String(!open)); });
		b.after(btn);
	});
	document.querySelectorAll('.npc-readmore').forEach(function (b) {
		b.addEventListener('click', function () {
			var el = document.getElementById(b.getAttribute('aria-controls')), open = b.getAttribute('aria-expanded') === 'true';
			el.hidden = open; b.setAttribute('aria-expanded', !open); b.textContent = open ? 'Read more' : 'Show less';
		});
	});

	// Seller net sheet calculator
	document.querySelectorAll('[data-npc-net]').forEach(function (box) {
		var price = box.querySelector('#npc-net-price'), comm = box.querySelector('#npc-net-comm');
		var fmt = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
		function calc() {
			var p = parseFloat(String(price.value).replace(/[^0-9.]/g, '')) || 0, c = parseFloat(String(comm.value).replace(/[^0-9.]/g, '')) || 0;
			var cm = p * c / 100, tax = p / 100 * 0.75, deed = 175;
			box.querySelector('[data-net=comm]').textContent = '− ' + fmt(cm);
			box.querySelector('[data-net=tax]').textContent = '− ' + fmt(tax);
			box.querySelector('[data-net=net]').textContent = fmt(Math.max(0, p - cm - tax - deed));
		}
		price.addEventListener('input', calc); comm.addEventListener('input', calc);
		price.addEventListener('blur', function () { var p = parseFloat(String(price.value).replace(/[^0-9.]/g, '')) || 0; price.value = p.toLocaleString('en-US'); });
		calc();
	});

	// Rotating reviews: advance every 8s, pause on hover/focus, dots to pick one.
	document.querySelectorAll('.npc-quote').forEach(function (box) {
		var slides = box.querySelectorAll('.npc-quote__slide'), dots = box.querySelectorAll('.npc-quote__dot'), cur = 0, timer = null, paused = false;
		if (slides.length < 2) return;
		function show(n) {
			cur = (n + slides.length) % slides.length;
			slides.forEach(function (s, i) { s.hidden = i !== cur; s.classList.toggle('is-on', i === cur); });
			dots.forEach(function (d, i) { d.setAttribute('aria-current', i === cur ? 'true' : 'false'); });
		}
		dots.forEach(function (d, i) { d.addEventListener('click', function () { show(i); }); });
		box.addEventListener('mouseenter', function () { paused = true; });
		box.addEventListener('mouseleave', function () { paused = false; });
		box.addEventListener('focusin', function () { paused = true; });
		box.addEventListener('focusout', function () { paused = false; });
		if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { if (!paused) show(cur + 1); }, 8000);
	});

	// Featured sales: load a video only when the visitor clicks play.
	document.querySelectorAll('.npc-fs__play').forEach(function (btn) {
		btn.addEventListener('click', function () {
			var box = btn.parentElement, el;
			if (btn.dataset.yt) {
				el = document.createElement('iframe');
				el.src = 'https://www.youtube-nocookie.com/embed/' + btn.dataset.yt + '?autoplay=1&rel=0';
				el.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
				el.title = btn.getAttribute('aria-label');
			} else {
				el = document.createElement('video');
				el.src = btn.dataset.mp4; el.controls = true; el.autoplay = true; el.playsInline = true;
			}
			el.className = 'npc-fs__video';
			box.appendChild(el);
			btn.remove();
		});
	});

	// Both forms send to the site's existing Elementor Pro forms, so the same email actions and submission logs apply.
	document.querySelectorAll('.npc-eform').forEach(function (form) {
		var msg = form.querySelector('.npc-eform__msg');
		var inputs = form.querySelectorAll('[data-field]');
		var btn = form.querySelector('button[type=submit]');
		var fail = 'That didn’t go through. Try again, or email nponte@careyandgiampa.com.';
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			msg.className = 'npc-eform__msg';
			for (var i = 0; i < inputs.length; i++) {
				if (inputs[i].type === 'checkbox') continue;
				if ((inputs[i].required && !inputs[i].value.trim()) || !inputs[i].checkValidity()) {
					var lab = form.querySelector('label[for="' + inputs[i].id + '"]');
					msg.textContent = 'Enter ' + (inputs[i].type === 'email' ? 'a valid email address' : 'your ' + (lab ? lab.textContent.toLowerCase() : 'details')) + '.';
					msg.classList.add('is-err'); inputs[i].focus(); return;
				}
			}
			var fd = new FormData();
			fd.append('action', 'elementor_pro_forms_send_form');
			fd.append('post_id', form.dataset.postId);
			fd.append('form_id', form.dataset.formId);
			fd.append('queried_id', form.dataset.queriedId);
			fd.append('referer_title', document.title);
			inputs.forEach(function (el) {
				if (el.type === 'checkbox') { if (el.checked) fd.append('form_fields[' + el.dataset.field + ']', 'on'); }
				else fd.append('form_fields[' + el.dataset.field + ']', el.value.trim());
			});
			btn.disabled = true; msg.textContent = 'Sending…';
			fetch(window.npcForm.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
				.then(function (r) { return r.json(); })
				.then(function (j) {
					if (j && j.success) { msg.textContent = form.dataset.success || (form.dataset.formId === '4acdcf3' ? 'Thanks. Nick will be in touch with your valuation.' : 'Thanks. Nick will be in touch about off-market properties.'); msg.classList.add('is-ok'); form.reset(); }
					else { msg.textContent = (j && j.data && j.data.message) || fail; msg.classList.add('is-err'); }
				})
				.catch(function () { msg.textContent = fail; msg.classList.add('is-err'); })
				.finally(function () { btn.disabled = false; });
		});
	});
})();
