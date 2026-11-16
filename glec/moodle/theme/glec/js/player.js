/* GLEC lesson player: keep the current lesson in view in the playlist, and offer auto-advance when a video ends. */
(function () {
  var list = document.querySelector('[data-playlist]');
  var cur = list && list.querySelector('.gp-item.is-current');
  if (list && cur) { list.scrollTop = Math.max(0, cur.offsetTop - list.offsetTop - list.clientHeight / 3); }

  var panel = document.querySelector('.gp-upnext');
  if (!panel) return;
  var countEl = panel.querySelector('[data-count]'), go = panel.querySelector('[data-autonext]'), cancel = panel.querySelector('[data-cancel]');
  var timer = null, left = 6, armed = false;
  function stop() { clearInterval(timer); timer = null; panel.hidden = true; }
  function start() {
    if (timer) return;
    left = 6; countEl.textContent = left; panel.hidden = false; go.focus({ preventScroll: true });
    timer = setInterval(function () { left--; countEl.textContent = left; if (left <= 0) { clearInterval(timer); window.location.href = go.href; } }, 1000);
  }
  cancel.addEventListener('click', stop);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) stop(); });
  function bind() {
    var v = document.querySelector('.gp-content video');
    if (!v || armed) return !!v;
    armed = true;
    v.addEventListener('ended', start);
    v.addEventListener('play', stop);
    return true;
  }
  if (!bind()) { var tries = 0, t = setInterval(function () { if (bind() || ++tries > 40) clearInterval(t); }, 250); }
})();
