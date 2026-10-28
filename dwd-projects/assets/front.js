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
	function boot() {
		[].forEach.call(document.querySelectorAll('.dwdp-slider'), init);
		[].forEach.call(document.querySelectorAll('.dwdp-vslider'), initVertical);
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
