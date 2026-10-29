/* DWD Projects — project editor: capture, cut into sections, review, save. */
(function ($) {
	'use strict';

	var MIN_SECTION = 180; // px; anything shorter is a strip/divider and stays with the section above it
	var state = {
		full: DWDP.fullshot,     // {id,url,width,height}
		mobile: DWDP.mobile,     // {id,url}
		img: null,               // loaded full-page <img>
		mobileImg: null,
		heroImg: null,           // first screen at 2x, for a sharp cover
		detected: [],            // cuts found automatically
		cuts: [],                // current cuts (px from top)
		skipped: {},             // section start y -> true
		useCover: true,
		useMockup: true
	};

	/* ---------- helpers ---------- */

	function post(action, data) {
		data = $.extend({ action: action, nonce: DWDP.nonce, post_id: DWDP.postId }, data || {});
		return $.post(DWDP.ajax, data).then(function (r) {
			if (r && r.success) { return r.data; }
			return $.Deferred().reject((r && r.data && r.data.message) || 'Something went wrong.').promise();
		}, function (xhr) {
			var msg = 'Request failed (' + xhr.status + ').';
			if (xhr.status === 504 || xhr.status === 524) { msg = 'The server timed out waiting for the screenshot. Please try again.'; }
			return $.Deferred().reject(msg).promise();
		});
	}

	function projectName() {
		var t = $.trim($('#title').val());
		if (t) { return t; }
		try { return new URL($('#dwdp-url').val()).hostname.replace(/^www\./, ''); } catch (e) { return 'Project'; }
	}

	function loadImage(url) {
		return new Promise(function (resolve, reject) {
			var im = new Image();
			im.onload = function () { resolve(im); };
			im.onerror = function () { reject('Could not load ' + url); };
			im.src = url + (url.indexOf('?') > -1 ? '&' : '?') + 'v=' + Date.now();
		});
	}

	function canvasFor(w, h) {
		var c = document.createElement('canvas');
		c.width = Math.max(1, Math.round(w));
		c.height = Math.max(1, Math.round(h));
		var ctx = c.getContext('2d');
		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = 'high';
		return c;
	}

	function toBlob(canvas, type, q) {
		return new Promise(function (resolve) { canvas.toBlob(resolve, type, q); });
	}

	function upload(blob, filename, title, alt) {
		var fd = new FormData();
		fd.append('action', 'dwdp_upload');
		fd.append('nonce', DWDP.nonce);
		fd.append('post_id', DWDP.postId);
		fd.append('title', title);
		fd.append('alt', alt);
		fd.append('file', blob, filename);
		return $.ajax({ url: DWDP.ajax, type: 'POST', data: fd, processData: false, contentType: false }).then(function (r) {
			if (r && r.success) { return r.data; }
			return $.Deferred().reject((r && r.data && r.data.message) || 'Upload failed.').promise();
		});
	}

	function slug(s) {
		return String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';
	}

	/* ---------- where to cut ---------- */

	/**
	 * Cut points from the page structure measured in the browser:
	 * header joins the first section, footer joins the last, and thin strips
	 * (dividers, colour bars) stay attached to the section above them.
	 */
	function cutsFromSections(data, imgH) {
		var sorted = (data.s || []).map(function (a) { return { y: a[0], h: a[1], t: String(a[2] || '') }; })
			.filter(function (s) { return s.h > 0 && !/loop-item|popup/.test(s.t); })
			.sort(function (a, b) { return a.y - b.y || b.h - a.h; });
		// Ignore anything nested inside a section already counted (e.g. repeated cards in a grid).
		var list = [];
		sorted.forEach(function (s) {
			var inside = list.some(function (p) { return s.y >= p.y && s.y + s.h <= p.y + p.h + 1; });
			if (!inside) { list.push(s); }
		});
		var body = list.filter(function (s) { return s.t !== 'header' && s.t !== 'footer'; });
		var big = body.filter(function (s) { return s.h >= MIN_SECTION; });
		if (big.length < 2) { return null; }
		var scale = data.H && Math.abs(data.H - imgH) > 2 ? imgH / data.H : 1;
		var cuts = [];
		big.slice(1).forEach(function (s) {
			var y = Math.round(s.y * scale);
			if (y > 40 && y < imgH - 40 && cuts.indexOf(y) === -1) { cuts.push(y); }
		});
		return cuts.sort(function (a, b) { return a - b; });
	}

	/** Fallback: find section edges from background colour changes in the image itself. */
	function cutsFromImage(img) {
		var W = img.naturalWidth, H = img.naturalHeight, aw = 360, s = W / aw, ah = Math.floor(H / s);
		var c = canvasFor(aw, ah), ctx = c.getContext('2d');
		ctx.drawImage(img, 0, 0, aw, ah);
		var px = ctx.getImageData(0, 0, aw, ah).data, m = Math.max(4, Math.round(aw * 0.04));
		var marg = [], act = [];
		for (var y = 0; y < ah; y++) {
			var r = 0, g = 0, b = 0, n = 0, a = 0;
			for (var x = 0; x < aw; x++) {
				var i = (y * aw + x) * 4;
				if (x < m || x >= aw - m) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
				if (x) { a += Math.abs(px[i] - px[i - 4]) + Math.abs(px[i + 1] - px[i - 3]) + Math.abs(px[i + 2] - px[i - 2]); }
			}
			marg.push([r / n, g / n, b / n]);
			act.push(a / aw);
		}
		function avg(from, to) {
			var o = [0, 0, 0];
			for (var k = from; k < to; k++) { o[0] += marg[k][0]; o[1] += marg[k][1]; o[2] += marg[k][2]; }
			return o.map(function (v) { return v / (to - from); });
		}
		function dist(p, q) { return Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2) + Math.pow(p[2] - q[2], 2)); }
		var k = 5, score = new Array(ah).fill(0), cuts = [];
		for (y = k; y < ah - k; y++) { score[y] = dist(avg(y - k, y), avg(y, y + k)); }
		for (y = k; y < ah - k; y++) {
			if (score[y] <= 14) { continue; }
			var isMax = true;
			for (var j = Math.max(0, y - 8); j <= Math.min(ah - 1, y + 8); j++) { if (score[j] > score[y]) { isMax = false; break; } }
			if (!isMax) { continue; }
			var best = y, bestD = -1;
			for (j = Math.max(1, y - k); j < Math.min(ah - 1, y + k); j++) {
				var d = dist(marg[j], marg[j - 1]);
				if (d > bestD) { bestD = d; best = j; }
			}
			var cy = Math.round(best * s);
			if (cuts.indexOf(cy) === -1) { cuts.push(cy); }
		}
		cuts.sort(function (a, b) { return a - b; });
		// merge sections that are too short
		var changed = true;
		while (changed && cuts.length) {
			changed = false;
			var b2 = [0].concat(cuts, [H]);
			for (var q = 0; q < b2.length - 1; q++) {
				if (b2[q + 1] - b2[q] >= MIN_SECTION * 1.8) { continue; }
				if (q === 0) { cuts.shift(); } else if (q === b2.length - 2) { cuts.pop(); } else {
					var prev = b2[q] - b2[q - 1], next = b2[q + 2] - b2[q + 1];
					cuts.splice(cuts.indexOf(prev <= next ? b2[q] : b2[q + 1]), 1);
				}
				changed = true;
				break;
			}
		}
		// split very tall areas at the quietest row
		var extra = [], bounds = [0].concat(cuts, [H]);
		for (q = 0; q < bounds.length - 1; q++) {
			var t = bounds[q], bt = bounds[q + 1];
			while (bt - t > 1600) {
				var parts = Math.ceil((bt - t) / 1600), target = t + (bt - t) / parts;
				var lo = Math.floor((target - 200) / s), hi = Math.floor((target + 200) / s), quiet = lo;
				for (j = lo; j < hi; j++) { if (act[j] < act[quiet]) { quiet = j; } }
				t = Math.round(quiet * s);
				extra.push(t);
			}
		}
		return cuts.concat(extra).sort(function (a, b) { return a - b; });
	}

	function segments() {
		var H = state.img.naturalHeight, b = [0].concat(state.cuts, [H]), out = [];
		for (var i = 0; i < b.length - 1; i++) {
			if (b[i + 1] - b[i] > 4) { out.push({ y: b[i], h: b[i + 1] - b[i] }); }
		}
		return out;
	}

	/* ---------- editor UI ---------- */

	var $page, scale = 1, previewTimer;

	function openEditor() {
		$('#dwdp-editor').prop('hidden', false);
		$page = $('#dwdp-page').empty().append($('<img>', { src: state.img.src, alt: '' }));
		$page.find('img').on('load', layoutPage);
		layoutPage();
		renderExtras();
		$('html, body').animate({ scrollTop: $('#dwdp-editor').offset().top - 60 }, 300);
	}

	function layoutPage() {
		scale = $page.width() / state.img.naturalWidth || 1;
		renderLines();
		schedulePreviews();
	}

	function renderLines() {
		$page.find('.dwdp-cut').remove();
		state.cuts.forEach(function (y, i) {
			var $l = $('<div class="dwdp-cut"><span class="dwdp-cut-grip"></span><button type="button" class="dwdp-cut-x" title="Remove this cut" aria-label="Remove cut">&times;</button></div>')
				.css('top', Math.round(y * scale) + 'px').attr('data-i', i);
			$page.append($l);
		});
	}

	function setCuts(cuts) {
		var H = state.img.naturalHeight;
		state.cuts = cuts.map(Math.round).filter(function (y) { return y > 8 && y < H - 8; })
			.sort(function (a, b) { return a - b; })
			.filter(function (y, i, a) { return !i || y - a[i - 1] > 8; });
		renderLines();
		schedulePreviews();
	}

	function schedulePreviews() {
		clearTimeout(previewTimer);
		previewTimer = setTimeout(renderPreviews, 120);
	}

	function renderPreviews() {
		var segs = segments(), $ul = $('#dwdp-previews').empty(), W = state.img.naturalWidth, kept = 0;
		segs.forEach(function (sg, n) {
			var tw = 300, th = Math.max(1, Math.round(sg.h * tw / W)), c = canvasFor(tw, Math.min(th, 900));
			c.getContext('2d').drawImage(state.img, 0, sg.y, W, Math.min(sg.h, Math.round(900 * W / tw)), 0, 0, tw, Math.min(th, 900));
			var skip = !!state.skipped[sg.y];
			if (!skip) { kept++; }
			var $li = $('<li class="dwdp-prev">').toggleClass('is-skipped', skip).attr('data-y', sg.y);
			$li.append($('<div class="dwdp-prev-img">').append(c));
			$li.append($('<div class="dwdp-prev-bar">')
				.append($('<span>').text('Section ' + (n + 1) + ' · ' + W + '×' + sg.h))
				.append($('<button type="button" class="button button-small dwdp-skip">').text(skip ? 'Use' : 'Skip')));
			$ul.append($li);
		});
		$('#dwdp-count').text(kept + ' of ' + segs.length + ' sections selected');
		renderExtras();
	}

	/** Height of the hero (header + first section): everything above the first cut. */
	function heroHeight() {
		var H = state.img.naturalHeight, W = state.img.naturalWidth;
		return state.cuts.length ? state.cuts[0] : Math.min(H, Math.round(W * 0.75));
	}

	function renderExtras() {
		var $x = $('#dwdp-extras').empty();
		var W = state.img.naturalWidth, hh = heroHeight(), cov = canvasFor(300, Math.round(hh * 300 / W));
		cov.getContext('2d').drawImage(state.img, 0, 0, W, hh, 0, 0, 300, Math.round(hh * 300 / W));
		$x.append($('<label class="dwdp-extra">').append(
			$('<input type="checkbox" id="dwdp-use-cover">').prop('checked', state.useCover),
			$('<span>').text(' Hero image (homepage carousel + portfolio card)'),
			$('<div class="dwdp-extra-img">').append(cov)
		));
		if (state.mobileImg) {
			var m = drawPhone(state.mobileImg, 150, domainOf());
			$x.append($('<label class="dwdp-extra">').append(
				$('<input type="checkbox" id="dwdp-use-mockup">').prop('checked', state.useMockup),
				$('<span>').text(' Phone mockup'),
				$('<div class="dwdp-extra-img dwdp-extra-phone">').append(m)
			));
		}
	}

	/* drag / add / remove cut lines */
	var justDragged = false;
	$(document).on('pointerdown', '.dwdp-cut', function (e) {
		if ($(e.target).is('.dwdp-cut-x')) { return; }
		e.preventDefault();
		var $l = $(this), i = +$l.attr('data-i'), top = $page.offset().top, moved = false;
		$l.addClass('is-drag');
		function move(ev) {
			moved = true;
			var y = Math.max(0, Math.min($page.height(), ev.pageY - top));
			$l.css('top', y + 'px');
			state.cuts[i] = Math.round(y / scale);
		}
		function up() {
			$(document).off('pointermove', move).off('pointerup', up);
			justDragged = moved;
			setTimeout(function () { justDragged = false; }, 50);
			setCuts(state.cuts.slice());
		}
		$(document).on('pointermove', move).on('pointerup', up);
	});

	$(document).on('click', '.dwdp-cut-x', function (e) {
		e.stopPropagation();
		var i = +$(this).closest('.dwdp-cut').attr('data-i');
		var c = state.cuts.slice();
		c.splice(i, 1);
		setCuts(c);
	});

	$(document).on('click', '#dwdp-page', function (e) {
		if (justDragged || $(e.target).closest('.dwdp-cut').length) { return; }
		var y = Math.round((e.pageY - $page.offset().top) / scale);
		setCuts(state.cuts.concat([y]));
	});

	$(document).on('click', '.dwdp-skip', function () {
		var y = +$(this).closest('.dwdp-prev').attr('data-y');
		state.skipped[y] = !state.skipped[y];
		renderPreviews();
	});

	$(document).on('change', '#dwdp-use-cover', function () { state.useCover = this.checked; });
	$(document).on('change', '#dwdp-use-mockup', function () { state.useMockup = this.checked; });

	$('#dwdp-reset').on('click', function () {
		state.skipped = {};
		setCuts(state.detected.slice());
	});

	$(window).on('resize', function () { if (state.img && !$('#dwdp-editor').prop('hidden')) { layoutPage(); } });

	/* ---------- phone mockup ---------- */

	/** Site domain shown in the phone mockup's Safari address bar. */
	function domainOf(u) {
		try { return new URL(u || $('#dwdp-url').val()).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
	}

	/**
	 * Draws an iPhone with the mobile screenshot inside, laid out like Safari:
	 * status bar, the page (390x680 capture), then Safari's bottom address bar.
	 * width = output width in px.
	 */
	function drawPhone(shot, width, domain) {
		var k = width / 720, W = 720, H = 1432;
		var c = canvasFor(W * k, H * k), x = c.getContext('2d');
		x.scale(k, k);
		function rr(px, py, w, h, r) {
			x.beginPath();
			x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
			x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
		}
		// side buttons
		x.fillStyle = '#2b2b2f';
		[[-3, 270, 7, 60], [-3, 360, 7, 100], [-3, 480, 7, 100], [W - 4, 400, 7, 150]].forEach(function (b) { rr(b[0], b[1], b[2], b[3], 3); x.fill(); });
		// body
		rr(4, 4, W - 8, H - 8, 108); x.fillStyle = '#1b1b1d'; x.fill();
		x.lineWidth = 6; x.strokeStyle = '#4a4a50'; x.stroke();
		rr(16, 16, W - 32, H - 32, 98); x.fillStyle = '#000'; x.fill();
		// screen
		var sx = 30, sy = 30, sw = W - 60, sh = H - 60;
		x.save(); rr(sx, sy, sw, sh, 86); x.clip();
		var scale = sw / shot.naturalWidth;          // page pixels -> mockup pixels
		var bar = 80;                                  // iOS status bar (47pt)
		var tool = 142;                                // Safari bottom bar (84pt)
		var page = sh - bar - tool;                    // visible page area (680pt)
		// status bar takes the colour of the top of the page
		var probe = canvasFor(1, 1).getContext('2d');
		probe.drawImage(shot, 0, 0, shot.naturalWidth, 4, 0, 0, 1, 1);
		var p = probe.getImageData(0, 0, 1, 1).data, light = (p[0] * 299 + p[1] * 587 + p[2] * 114) / 1000 > 150;
		x.fillStyle = 'rgb(' + p[0] + ',' + p[1] + ',' + p[2] + ')';
		x.fillRect(sx, sy, sw, bar);
		// the page itself
		var srcH = Math.min(shot.naturalHeight, Math.round(page / scale));
		x.drawImage(shot, 0, 0, shot.naturalWidth, srcH, sx, sy + bar, sw, srcH * scale);
		// Safari bottom bar with the address pill
		var ty = sy + bar + page;
		x.fillStyle = '#F2F2F4'; x.fillRect(sx, ty, sw, tool + 10);
		x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(sx, ty, sw, 1.5);
		rr(sx + 26, ty + 14, sw - 52, 60, 18); x.fillStyle = '#fff'; x.fill();
		x.font = '500 27px -apple-system, "SF Pro Text", Helvetica, Arial, sans-serif';
		x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#111';
		var label = domain || domainOf();
		x.fillText(label, W / 2 + 12, ty + 45);
		// padlock before the domain
		var lw = x.measureText(label).width, lx = W / 2 + 12 - lw / 2 - 26, ly = ty + 45;
		x.fillStyle = '#555'; rr(lx - 8, ly - 3, 16, 13, 3); x.fill();
		x.beginPath(); x.lineWidth = 3; x.strokeStyle = '#555'; x.arc(lx, ly - 4, 5.5, Math.PI, 0); x.stroke();
		x.textAlign = 'left';
		// status bar content
		x.fillStyle = light ? '#111' : '#fff';
		x.font = '600 30px -apple-system, "SF Pro Text", Helvetica, Arial, sans-serif';
		x.textBaseline = 'middle';
		x.fillText('9:41', sx + 62, sy + 46);
		var bx = sx + sw - 150, by = sy + 46;
		[10, 16, 22, 28].forEach(function (h, i) { x.fillRect(bx + i * 9, by + 11 - h * 0.5 - 3, 6, h * 0.5 + 3); });
		x.beginPath(); x.arc(bx + 58, by + 8, 14, Math.PI * 1.25, Math.PI * 1.75); x.lineWidth = 4; x.strokeStyle = x.fillStyle; x.stroke();
		x.beginPath(); x.arc(bx + 58, by + 8, 7, Math.PI * 1.25, Math.PI * 1.75); x.stroke();
		rr(bx + 82, by - 10, 46, 22, 6); x.lineWidth = 2.5; x.stroke();
		rr(bx + 86, by - 6, 36, 14, 3); x.fill();
		// dynamic island
		rr(W / 2 - 104, sy + 16, 208, 58, 29); x.fillStyle = '#000'; x.fill();
		// home indicator
		rr(W / 2 - 110, H - 50, 220, 9, 5); x.fillStyle = '#111'; x.fill();
		x.restore();
		return c;
	}

	/* ---------- capture ---------- */

	function progress(steps) {
		var $p = $('#dwdp-progress').prop('hidden', false).empty();
		steps.forEach(function (s) { $p.append($('<li>').attr('data-k', s[0]).text(s[1])); });
	}
	function mark(k, cls, note) {
		var $li = $('#dwdp-progress li[data-k="' + k + '"]').removeClass('is-run is-ok is-err').addClass(cls);
		$li.find('em').remove();
		if (note) { $li.append($('<em>').text(' — ' + note)); }
	}

	/* Fill the project name, industry and short description from the client's site (empty fields only). */
	function setIfEmpty($el, val) {
		if (val && !$.trim($el.val())) { $el.val(val).trigger('input'); }
	}
	function autofill(url) {
		var host = '';
		try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) {}
		post('dwdp_site_info', { url: url }).then(function (info) {
			setIfEmpty($('#title'), info.name || host);
			setIfEmpty($('#dwdp-industry'), info.industry);
			setIfEmpty($('#dwdp-summary'), info.summary);
		}, function () {
			setIfEmpty($('#title'), host);
		}).always(function () {
			if ($.trim($('#title').val())) { $('#title-prompt-text').addClass('screen-reader-text'); }
		});
	}

	$('#dwdp-capture').on('click', function () {
		var url = $.trim($('#dwdp-url').val());
		if (!/^https?:\/\/[^.\s]+\.[^\s]+/i.test(url)) {
			if (/^[^\s]+\.[^\s]+$/.test(url)) { url = 'https://' + url; $('#dwdp-url').val(url); } else { alert('Please enter the website address, like https://clientsite.com'); return; }
		}
		autofill(url);
		var $btn = $(this).prop('disabled', true).text('Capturing…');
		progress([['desk', 'Full-page desktop screenshot'], ['sec', 'Finding the page sections'], ['mob', 'Phone screenshot'], ['hero', 'High-resolution hero']]);
		['desk', 'sec', 'mob', 'hero'].forEach(function (k) { mark(k, 'is-run'); });

		var desk = post('dwdp_capture', { step: 'desktop', url: url }).then(function (d) { mark('desk', 'is-ok'); return d; }, function (m) { mark('desk', 'is-err', m); return $.Deferred().reject(m); });
		var sec = post('dwdp_capture', { step: 'sections', url: url }).then(function (d) { mark('sec', 'is-ok'); return d; }, function (m) { mark('sec', 'is-err', m); return null; });
		var mob = post('dwdp_capture', { step: 'mobile', url: url }).then(function (d) { mark('mob', 'is-ok'); return d; }, function (m) { mark('mob', 'is-err', m); return null; });
		// Optional: without it the cover is cut from the full-page screenshot as before.
		state.heroImg = null;
		post('dwdp_capture', { step: 'hero', url: url }).then(function (d) {
			return loadImage(d.url).then(function (im) { state.heroImg = im; mark('hero', 'is-ok'); });
		}).fail(function (m) { mark('hero', 'is-err', (m || 'not available') + ' (cover uses the regular screenshot)'); });

		$.when(desk, sec, mob).always(function () { $btn.prop('disabled', false).text('Capture again'); });
		$.when(desk, sec, mob).done(function (d, s, m) {
			state.full = d;
			state.mobile = m;
			Promise.all([loadImage(d.url), m ? loadImage(m.url) : Promise.resolve(null)]).then(function (imgs) {
				state.img = imgs[0];
				state.mobileImg = imgs[1];
				var cuts = s ? cutsFromSections(s, state.img.naturalHeight) : null;
				if (!cuts) {
					if (s) { mark('sec', 'is-ok', 'used image detection'); }
					cuts = cutsFromImage(state.img);
				}
				state.detected = cuts.slice();
				state.skipped = {};
				state.useCover = true;
				state.useMockup = !!state.mobileImg;
				openEditor();
				setCuts(cuts);
			}).catch(function (e) { alert(e); });
		});
	});

	/* re-open the editor for an earlier capture */
	function addRecutButton() {
		if (!state.full || !state.full.url) { return; }
		var $b = $('<button type="button" class="button" id="dwdp-recut">Re-cut the saved screenshot</button>');
		$('#dwdp-capture').after($b);
		$b.on('click', function () {
			$b.prop('disabled', true);
			Promise.all([loadImage(state.full.url), state.mobile ? loadImage(state.mobile.url) : Promise.resolve(null)]).then(function (imgs) {
				state.img = imgs[0];
				state.mobileImg = imgs[1];
				state.detected = (Array.isArray(DWDP.cuts) && DWDP.cuts.length) ? DWDP.cuts.slice() : cutsFromImage(state.img);
				state.skipped = {};
				state.useCover = false;
				state.useMockup = false;
				openEditor();
				setCuts(state.detected.slice());
				$b.prop('disabled', false);
			});
		});
	}

	/* ---------- save generated images ---------- */

	$('#dwdp-save-sections').on('click', function () {
		var $btn = $(this), name = projectName(), base = slug(name), W = state.img.naturalWidth;
		var segs = segments().filter(function (sg) { return !state.skipped[sg.y]; });
		var existing = $('#dwdp-gallery li').length;
		var replace = true;
		if (existing) {
			replace = window.confirm('This project already has ' + existing + ' image(s).\n\nOK = replace them with the new sections\nCancel = add the new sections after them');
		}
		var total = segs.length + (state.useCover ? 1 : 0) + (state.useMockup && state.mobileImg ? 1 : 0), done = 0;
		if (!total) { alert('Nothing selected to save.'); return; }
		$btn.prop('disabled', true);
		function tick() { $btn.text('Saving ' + (++done) + ' of ' + total + '…'); }
		$btn.text('Saving 1 of ' + total + '…');

		var newIds = [], chain = Promise.resolve();
		segs.forEach(function (sg, n) {
			chain = chain.then(function () {
				var c = canvasFor(W, sg.h);
				c.getContext('2d').drawImage(state.img, 0, sg.y, W, sg.h, 0, 0, W, sg.h);
				return toBlob(c, 'image/jpeg', 0.88).then(function (b) {
					return upload(b, base + '-section-' + (n + 1) + '.jpg', name + ' section ' + (n + 1), name + ' website design, section ' + (n + 1));
				}).then(function (r) { newIds.push(r); tick(); });
			});
		});
		var cover = null, mockup = null;
		if (state.useCover) {
			chain = chain.then(function () {
				// The complete hero exactly as cut, never a fixed crop that could clip it.
				var hh = heroHeight(), hi = state.heroImg, c;
				if (hi && hi.naturalWidth >= W) {
					// Same layout at 2x: crop the hero (up to the captured first screen) at full sharpness.
					var k = hi.naturalWidth / W, sh = Math.min(Math.round(hh * k), hi.naturalHeight);
					c = canvasFor(hi.naturalWidth, sh);
					c.getContext('2d').drawImage(hi, 0, 0, hi.naturalWidth, sh, 0, 0, hi.naturalWidth, sh);
				} else {
					var ch = Math.round(hh * 1200 / W);
					c = canvasFor(1200, ch);
					c.getContext('2d').drawImage(state.img, 0, 0, W, hh, 0, 0, 1200, ch);
				}
				return toBlob(c, 'image/jpeg', 0.9).then(function (b) {
					return upload(b, base + '-cover.jpg', name + ' cover', name + ' website');
				}).then(function (r) { cover = r; tick(); });
			});
		}
		if (state.useMockup && state.mobileImg) {
			chain = chain.then(function () {
				return toBlob(drawPhone(state.mobileImg, 720, domainOf()), 'image/png').then(function (b) {
					return upload(b, base + '-mobile-mockup.png', name + ' mobile mockup', name + ' website on mobile');
				}).then(function (r) { mockup = r; tick(); });
			});
		}
		chain.then(function () {
			if (replace) { $('#dwdp-gallery').empty(); }
			newIds.forEach(function (r) { $('#dwdp-gallery').append(thumbLi(r.id, r.thumb)); });
			syncGallery();
			if (cover) { setSlot('cover', cover.id, cover.thumb); }
			if (mockup) { setSlot('mockup', mockup.id, mockup.thumb); }
			persist();
			$btn.text('Saved ✓');
			$('#dwdp-editor').prop('hidden', true);
			$('html, body').animate({ scrollTop: $('.dwdp-gallery-box').offset().top - 60 }, 300);
			setTimeout(function () { $btn.prop('disabled', false).text('Save selected images'); }, 1500);
		}).catch(function (e) {
			alert('Saving stopped: ' + e);
			$btn.prop('disabled', false).text('Save selected images');
		});
	});

	/* ---------- gallery & slots ---------- */

	function thumbLi(id, url) {
		return $('<li class="dwdp-thumb">').attr('data-id', id)
			.append($('<img alt="">').attr('src', url))
			.append('<button type="button" class="dwdp-x" title="Remove from this project" aria-label="Remove">&times;</button>');
	}

	function syncGallery() {
		var ids = $('#dwdp-gallery li').map(function () { return $(this).data('id'); }).get();
		$('#dwdp-sections').val(ids.join(','));
		$('#dwdp-gallery-count').text(ids.length);
	}

	var persistTimer;
	function persist() {
		clearTimeout(persistTimer);
		persistTimer = setTimeout(function () {
			post('dwdp_set_media', {
				sections: $('#dwdp-sections').val(),
				cover: $('.dwdp-slot[data-key="cover"] input').val(),
				mockup: $('.dwdp-slot[data-key="mockup"] input').val(),
				cuts: JSON.stringify(state.cuts || [])
			});
		}, 300);
	}

	$('#dwdp-gallery').sortable({ items: '> li', tolerance: 'pointer', update: function () { syncGallery(); persist(); } });

	$(document).on('click', '.dwdp-thumb .dwdp-x', function () {
		$(this).closest('li').remove();
		syncGallery();
		persist();
	});

	$('#dwdp-add-images').on('click', function () {
		var frame = wp.media({ title: 'Add images to this project', multiple: 'add', library: { type: 'image' }, button: { text: 'Add to project' } });
		frame.on('select', function () {
			frame.state().get('selection').each(function (a) {
				var j = a.toJSON(), u = (j.sizes && j.sizes.medium) ? j.sizes.medium.url : j.url;
				$('#dwdp-gallery').append(thumbLi(j.id, u));
			});
			syncGallery();
			persist();
		});
		frame.open();
	});

	function setSlot(key, id, url) {
		var $s = $('.dwdp-slot[data-key="' + key + '"]');
		$s.find('input').val(id || '');
		$s.find('.dwdp-slot-img').html(id ? '<img src="' + url + '" alt="">' : '<span>None yet</span>');
		$s.find('.dwdp-slot-clear').prop('hidden', !id);
	}

	$(document).on('click', '.dwdp-slot-pick', function () {
		var key = $(this).closest('.dwdp-slot').data('key');
		var frame = wp.media({ title: 'Choose image', multiple: false, library: { type: 'image' } });
		frame.on('select', function () {
			var j = frame.state().get('selection').first().toJSON();
			setSlot(key, j.id, (j.sizes && j.sizes.medium) ? j.sizes.medium.url : j.url);
			persist();
		});
		frame.open();
	});

	$(document).on('click', '.dwdp-slot-clear', function () {
		setSlot($(this).closest('.dwdp-slot').data('key'), '', '');
		persist();
	});

	// Enter in the URL box starts the capture instead of submitting the post form.
	$('#dwdp-url').on('keydown', function (e) {
		if (e.key === 'Enter') { e.preventDefault(); $('#dwdp-capture').trigger('click'); }
	});

	addRecutButton();

	// exposed for testing
	window.DWDPTest = { cutsFromSections: cutsFromSections, cutsFromImage: cutsFromImage, drawPhone: drawPhone, state: state };
})(jQuery);
