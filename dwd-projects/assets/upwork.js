/* DWD Projects — Upwork portfolio export: character counts, copy buttons, and the images. */
(function ($) {
	'use strict';
	if (!window.DWDPUP) { return; }

	// Live character counts against Upwork's limits.
	function count($t) {
		var $c = $t.closest('.dwdp-up-field').find('.dwdp-up-count'), max = +$c.data('max'), n = $t.val().length;
		$c.text(n + ' / ' + max).toggleClass('is-over', n > max);
	}
	$('.dwdp-up-text').each(function () { count($(this)); }).on('input', function () { count($(this)); });

	$(document).on('click', '.dwdp-up-copy', function () {
		var $b = $(this), el = document.getElementById($b.data('target'));
		var done = function () { $b.text('Copied ✓'); setTimeout(function () { $b.text('Copy'); }, 1500); };
		if (navigator.clipboard) { navigator.clipboard.writeText(el.value).then(done); } else { el.select(); document.execCommand('copy'); done(); }
	});

	function load(url) {
		return new Promise(function (resolve, reject) {
			var im = new Image();
			im.onload = function () { resolve(im); };
			im.onerror = function () { reject('Could not load ' + url); };
			im.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'up=' + Date.now();
		});
	}
	function canvas(w, h) {
		var c = document.createElement('canvas');
		c.width = w; c.height = h;
		var x = c.getContext('2d');
		x.imageSmoothingEnabled = true;
		x.imageSmoothingQuality = 'high';
		return c;
	}
	function rr(x, px, py, w, h, r) {
		x.beginPath();
		x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
		x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
	}
	// Draw img into the box, filling it from the top (like object-fit: cover; object-position: top).
	function coverTop(x, img, sx, sy, sw, sh, dx, dy, dw, dh) {
		var s = Math.max(dw / sw, dh / sh), cw = dw / s, ch = dh / s;
		x.drawImage(img, sx + (sw - cw) / 2, sy, cw, ch, dx, dy, dw, dh);
	}

	/*
	 * The thumbnail is always the same template (assets/upwork-thumb.png, 1000 x 750): the site's
	 * hero goes on the laptop screen and the phone view on the phone screen. Screen positions are
	 * measured from the template. The output is the template's exact size.
	 */
	var T = { w: 1000, h: 750, scale: 1,
		laptop: { x: 135, y: 179, w: 596, h: 373 },
		phone: { x: 749, y: 253, w: 154, h: 320, r: 20 },
		island: { x: 804, y: 258, w: 45, h: 13 } };

	function thumbnail(frame, cover, mockup) {
		var k = T.scale, c = canvas(T.w * k, T.h * k), x = c.getContext('2d');
		x.scale(k, k);
		x.drawImage(frame, 0, 0, T.w, T.h);
		var L = T.laptop;
		coverTop(x, cover, 0, 0, cover.naturalWidth, cover.naturalHeight, L.x, L.y, L.w, L.h);
		if (mockup) {
			// The phone mockup already has a frame; use only its screen area (inset ~4.2% / 2.1%).
			var P = T.phone, mw = mockup.naturalWidth, mh = mockup.naturalHeight;
			var ix = Math.round(mw * 30 / 720), iy = Math.round(mh * 30 / 1432);
			x.save(); rr(x, P.x, P.y, P.w, P.h, P.r); x.clip();
			coverTop(x, mockup, ix, iy, mw - 2 * ix, mh - 2 * iy, P.x, P.y, P.w, P.h);
			x.restore();
			var I = T.island;
			rr(x, I.x, I.y, I.w, I.h, I.h / 2); x.fillStyle = '#000'; x.fill();
		}
		return c;
	}

	// The full homepage, top to bottom: the full-page capture, or the section images stacked.
	function fullPage(imgs) {
		var W = Math.min(2000, Math.max.apply(null, imgs.map(function (i) { return i.naturalWidth; })));
		var H = imgs.reduce(function (s, i) { return s + Math.round(i.naturalHeight * W / i.naturalWidth); }, 0);
		var c = canvas(W, H), x = c.getContext('2d'), y = 0;
		imgs.forEach(function (i) { var h = Math.round(i.naturalHeight * W / i.naturalWidth); x.drawImage(i, 0, y, W, h); y += h; });
		return c;
	}
	function half(page, n) {
		var h = Math.ceil(page.height / 2), top = n ? page.height - h : 0, c = canvas(page.width, h);
		c.getContext('2d').drawImage(page, 0, top, page.width, h, 0, 0, page.width, h);
		return c;
	}

	function addResult(name, c, type, q) {
		return new Promise(function (resolve) {
			c.toBlob(function (b) {
				var url = URL.createObjectURL(b), kb = Math.round(b.size / 1024);
				$('#dwdp-up-list').append(
					$('<li>').append($('<img alt="">').attr('src', url))
						.append($('<a class="button">').attr({ href: url, download: name }).text('Download (' + kb + ' KB)'))
						.append($('<small>').text(name))
				);
				resolve();
			}, type, q);
		});
	}

	$('#dwdp-up-build').on('click', function () {
		var $b = $(this).prop('disabled', true), $s = $('#dwdp-up-status').text('Building…');
		$('#dwdp-up-list').empty();
		var d = window.DWDPUP, slug = d.slug || 'project';
		if (!d.cover) { $s.text('Add a cover image first.'); $b.prop('disabled', false); return; }
		var pages = d.fullshot ? [d.fullshot] : d.sections;
		Promise.all([load(window.DWDP_UP_FRAME), load(d.cover), d.mockup ? load(d.mockup) : null, Promise.all(pages.map(load))])
			.then(function (r) {
				var page = r[3].length ? fullPage(r[3]) : null;
				var jobs = [addResult(slug + '-upwork-thumbnail.png', thumbnail(r[0], r[1], r[2]), 'image/png')];
				if (page) {
					jobs.push(addResult(slug + '-homepage-1.jpg', half(page, 0), 'image/jpeg', 0.9));
					jobs.push(addResult(slug + '-homepage-2.jpg', half(page, 1), 'image/jpeg', 0.9));
				}
				return Promise.all(jobs).then(function () { $s.text(page ? 'Ready: thumbnail plus the homepage in two halves.' : 'Ready: thumbnail (no homepage screenshots on this project yet).'); });
			})
			.catch(function (e) { $s.text('Stopped: ' + e); })
			.then(function () { $b.prop('disabled', false).text('Rebuild Upwork images'); });
	});
})(jQuery);
