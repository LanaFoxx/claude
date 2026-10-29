/* DWD Projects — homepage browser carousel. */
(function () {
	function init(root) {
		var slides = [].slice.call(root.querySelectorAll('.dw-bscreen > a'));
		if (slides.length < 2) {
			[].forEach.call(root.querySelectorAll('.dw-snav'), function (b) { b.style.display = 'none'; });
			return;
		}
		var i = 0, timer;
		function show(n) {
			i = (n + slides.length) % slides.length;
			slides.forEach(function (s, k) { s.classList.toggle('on', k === i); });
		}
		function auto() {
			clearInterval(timer);
			timer = setInterval(function () { show(i + 1); }, 4000);
		}
		root.querySelector('.dw-prev').addEventListener('click', function () { show(i - 1); auto(); });
		root.querySelector('.dw-next').addEventListener('click', function () { show(i + 1); auto(); });
		auto();
	}
	/* Up/down hero slider: one design at a time; the frame resizes to each hero. */
	function initVertical(root) {
		var view = root.querySelector('.dwdp-vview'), track = root.querySelector('.dwdp-vtrack');
		var items = [].slice.call(track.children), i = 0;
		if (items.length < 2) { root.querySelector('.dwdp-vnav').style.display = 'none'; }
		function place(animate) {
			if (!animate) { view.style.transition = track.style.transition = 'none'; }
			track.style.transform = 'translateY(' + (-items[i].offsetTop) + 'px)';
			view.style.height = items[i].offsetHeight + 'px';
			if (!animate) { void view.offsetHeight; view.style.transition = track.style.transition = ''; }
		}
		function go(n) { i = (n + items.length) % items.length; place(true); }
		root.querySelector('.dwdp-up').addEventListener('click', function () { go(i - 1); });
		root.querySelector('.dwdp-down').addEventListener('click', function () { go(i + 1); });
		root.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowUp') { e.preventDefault(); go(i - 1); }
			if (e.key === 'ArrowDown') { e.preventDefault(); go(i + 1); }
		});
		// Re-measure as images load and when the window resizes.
		[].forEach.call(track.querySelectorAll('img'), function (im) { if (!im.complete) { im.addEventListener('load', function () { place(false); }); } });
		window.addEventListener('resize', function () { place(false); });
		place(false);
	}
	/* Portfolio carousel: each button moves one card; at either end it wraps around. */
	function initCarousel(root) {
		var track = root.querySelector('.dwdp-ptrack');
		function step() {
			var c = track.children[0], gap = parseFloat(getComputedStyle(track).columnGap) || 0;
			return c ? c.getBoundingClientRect().width + gap : track.clientWidth;
		}
		function go(dir) {
			var max = track.scrollWidth - track.clientWidth;
			if (dir > 0 && track.scrollLeft >= max - 4) { track.scrollTo({ left: 0 }); return; }
			if (dir < 0 && track.scrollLeft <= 4) { track.scrollTo({ left: max }); return; }
			track.scrollBy({ left: dir * step() });
		}
		root.querySelector('.dwdp-prev').addEventListener('click', function () { go(-1); });
		root.querySelector('.dwdp-next').addEventListener('click', function () { go(1); });
		track.addEventListener('keydown', function (e) {
			if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
			if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
		});
		function fits() { root.querySelector('.dwdp-pnav').style.visibility = track.scrollWidth > track.clientWidth + 4 ? '' : 'hidden'; }
		window.addEventListener('resize', fits);
		fits();
	}
	function boot() {
		[].forEach.call(document.querySelectorAll('.dwdp-slider'), init);
		[].forEach.call(document.querySelectorAll('.dwdp-vslider'), initVertical);
		[].forEach.call(document.querySelectorAll('.dwdp-pcarousel'), initCarousel);
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
