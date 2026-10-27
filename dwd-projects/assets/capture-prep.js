/* DWD Projects: loaded by the screenshot service before capture. Forces lazy-loaded images and
   backgrounds (WP Rocket, SiteGround, native lazy loading, Elementor) to load, scrolls the page,
   and keeps watching for images that sliders or scripts add later, until the screenshot is taken. */
(function () {
	var d = document;
	function each(sel, fn) { [].forEach.call(d.querySelectorAll(sel), fn); }
	function fix() {
		each('img,source,iframe', function (e) {
			var s = e.getAttribute('data-lazy-src') || e.getAttribute('data-src') || e.getAttribute('data-original');
			var ss = e.getAttribute('data-lazy-srcset') || e.getAttribute('data-srcset');
			var sz = e.getAttribute('data-lazy-sizes') || e.getAttribute('data-sizes');
			if (s && e.getAttribute('src') !== s) { e.setAttribute('src', s); }
			if (ss && e.getAttribute('srcset') !== ss) { e.setAttribute('srcset', ss); }
			if (sz && sz !== 'auto') { e.setAttribute('sizes', sz); }
			if (e.loading === 'lazy') { e.loading = 'eager'; }
			if (e.classList) { e.classList.remove('lazyload', 'rocket-lazyload'); e.classList.add('lazyloaded'); }
		});
		each('[data-bg],[data-lazy-background],[data-background-image],[data-bg-image]', function (e) {
			var b = e.getAttribute('data-bg') || e.getAttribute('data-lazy-background') || e.getAttribute('data-background-image') || e.getAttribute('data-bg-image');
			if (b) { e.style.backgroundImage = /^url/.test(b) ? b : 'url("' + b + '")'; }
		});
		each('.e-con,.elementor-section,.elementor-element', function (e) { e.classList.add('e-lazyloaded'); });
	}
	function scrollThrough() {
		var y = 0;
		var t = setInterval(function () {
			y += 600;
			window.scrollTo(0, y);
			fix();
			if (y > d.documentElement.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); fix(); }
		}, 80);
	}
	fix();
	if (d.readyState === 'loading') { d.addEventListener('DOMContentLoaded', function () { fix(); scrollThrough(); }); } else { scrollThrough(); }
	window.addEventListener('load', function () { fix(); scrollThrough(); });
	// Catch images added or reset later by sliders and lazy-load scripts.
	var start = Date.now();
	var keep = setInterval(function () { fix(); if (Date.now() - start > 12000) { clearInterval(keep); } }, 250);
	if (window.MutationObserver) {
		var queued = false;
		new MutationObserver(function () {
			if (queued) { return; }
			queued = true;
			setTimeout(function () { queued = false; fix(); }, 150);
		}).observe(d.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });
	}
})();
