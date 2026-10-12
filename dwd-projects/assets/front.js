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
	function boot() {
		[].forEach.call(document.querySelectorAll('.dwdp-slider'), init);
	}
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
