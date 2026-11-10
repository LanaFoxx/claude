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

	// Sends to the site's existing Elementor Pro off-market form, so the same email action and submissions log apply.
	document.querySelectorAll('.npc-offmarket__form').forEach(function (form) {
		var msg = form.querySelector('.npc-offmarket__msg');
		var input = form.querySelector('input[type=email]');
		var btn = form.querySelector('button');
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			msg.className = 'npc-offmarket__msg';
			if (!input.value || !input.checkValidity()) { msg.textContent = 'Enter a valid email address.'; msg.classList.add('is-err'); input.focus(); return; }
			var fd = new FormData();
			fd.append('action', 'elementor_pro_forms_send_form');
			fd.append('post_id', form.dataset.postId);
			fd.append('form_id', form.dataset.formId);
			fd.append('queried_id', form.dataset.queriedId);
			fd.append('referer_title', document.title);
			fd.append('form_fields[email]', input.value);
			btn.disabled = true; msg.textContent = 'Sending…';
			fetch(window.npcForm.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
				.then(function (r) { return r.json(); })
				.then(function (j) {
					if (j && j.success) { msg.textContent = 'Thanks. Nick will be in touch about off-market properties.'; msg.classList.add('is-ok'); form.reset(); }
					else { msg.textContent = (j && j.data && j.data.message) || 'That didn’t go through. Try again, or email nponte@careyandgiampa.com.'; msg.classList.add('is-err'); }
				})
				.catch(function () { msg.textContent = 'That didn’t go through. Try again, or email nponte@careyandgiampa.com.'; msg.classList.add('is-err'); })
				.finally(function () { btn.disabled = false; });
		});
	});
})();
