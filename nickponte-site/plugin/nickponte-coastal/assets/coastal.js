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
