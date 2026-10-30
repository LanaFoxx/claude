/* Provider Profile Form: renders the design from window.TCF_PROFILE and posts submissions to the review queue.
   Drafts save in this browser (per link); files stay in their inputs until submit. Needs the site runtime (TCF.mount). */
(function () {
  var D = window.TCF_PROFILE, root = document.getElementById('tcf-profile-root'), tpl = document.getElementById('tcf-profile-tpl');
  if (!D || !root || !tpl || !window.TCF || !TCF.mount) return;
  var KEY = 'tcf_profile_form' + (D.token ? ':' + D.token : '');
  var FORMATS = ['Video lessons', 'Online reading', 'Downloadable PDF', 'Physical textbook', 'Live online classes', 'Classroom instruction', 'Audio'];
  var ACCESS = ['Captions', 'Mobile compatible', 'Printable materials'];
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
    clear: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };

  class Profile extends DCLogic {
    constructor(props) {
      super(props);
      var pre = D.prefill || {};
      this.state = { v: pre.v || {}, ce: pre.ce || {}, qe: pre.qe || {}, tab: 'ce', submitted: false, savedAt: null, sending: false, error: '' };
      var s = store.get();
      if (s) Object.assign(this.state, { v: s.v || {}, ce: s.ce || {}, qe: s.qe || {}, tab: s.tab === 'qe' ? 'qe' : 'ce' });
    }
    persist(next) {
      this.setState(next, () => {
        var st = this.state;
        store.set({ v: st.v, ce: st.ce, qe: st.qe, tab: st.tab });
        this.setState({ savedAt: new Date() });
      });
    }
    send(ev) {
      ev.preventDefault();
      if (this.state.sending) return;
      var form = ev.target, st = this.state, fd = new FormData();
      var logo = form.querySelector('input[name=logo]'), shots = form.querySelector('input[name=screenshots]');
      var files = shots && shots.files ? Array.prototype.slice.call(shots.files, 0, 3) : [];
      var big = [].concat(logo && logo.files[0] ? [logo.files[0]] : [], files).filter(function (f) { return f.size > D.maxBytes; });
      if (big.length) { this.setState({ error: big[0].name + ' is larger than 5 MB. Please choose a smaller image.' }); return; }
      fd.append('action', 'tcfd_profile_submit');
      fd.append('token', D.token || '');
      fd.append('payload', JSON.stringify({ v: st.v, ce: st.ce, qe: st.qe }));
      fd.append('notify', form.querySelector('input[name=notify]') && form.querySelector('input[name=notify]').checked ? '1' : '');
      fd.append('company_fax', (form.querySelector('input[name=company_fax]') || {}).value || '');
      fd.append('started', String(D.started || ''));
      if (logo && logo.files[0]) fd.append('logo', logo.files[0]);
      files.forEach(function (f) { fd.append('screenshots[]', f); });
      this.setState({ sending: true, error: '' });
      fetch(D.ajax, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
        .then((res) => {
          if (res && res.success) { store.clear(); this.setState({ submitted: true, sending: false }); window.scrollTo(0, 0); return; }
          var msg = res && res.data && res.data.message ? res.data.message : 'Something went wrong sending your details. Your draft is saved; please try again or email providers@taxcoursefinder.com.';
          this.setState({ sending: false, error: msg });
        })
        .catch(() => this.setState({ sending: false, error: 'Could not reach the server. Your draft is saved in this browser; please try again.' }));
    }
    renderVals() {
      var st = this.state, v = st.v, tab = st.tab, c = st[tab] || {};
      var pill = function (on) { return { bg: on ? '#FFF1EE' : '#fff', border: on ? '#23272A' : '#D9D4CC', color: on ? '#23272A' : '#23272A' }; };
      var toggleOpt = (key, label) => () => { var set = new Set(c[key] || []); set.has(label) ? set.delete(label) : set.add(label); this.persist({ [tab]: Object.assign({}, c, { [key]: Array.from(set) }) }); };
      var opts = (key, labels) => labels.map(function (l) { return Object.assign({ label: l, toggle: toggleOpt(key, l) }, pill((c[key] || []).indexOf(l) >= 0)); });
      var tabStyle = function (t) { return tab === t ? { bg: '#23272A', color: '#fff', border: '#23272A' } : { bg: '#fff', color: '#23272A', border: '#D9D4CC' }; };
      var stl = function (o) { return o.offered ? 'Offered' : 'Not set'; };
      var ts = tabStyle('ce'), tq = tabStyle('qe');
      return {
        sections: [['school', 'School & approval'], ['courses', 'Course details'], ['support', 'Student support'], ['media', 'Logo, media & FAQs'], ['confirm', 'Confirm & submit']].map(function (x, i) { return { id: x[0], label: x[1], n: i + 1 }; }),
        v: v, c: c, submitted: st.submitted, pending: !st.submitted, forName: D.provider_name || '',
        set: (ev) => this.persist({ v: Object.assign({}, v, { [ev.target.name]: ev.target.value }) }),
        setC: (ev) => this.persist({ [tab]: Object.assign({}, c, { [ev.target.name]: ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value }) }),
        pickCE: () => this.persist({ tab: 'ce' }), pickQE: () => this.persist({ tab: 'qe' }),
        ceBg: ts.bg, ceColor: ts.color, ceBorder: ts.border, qeBg: tq.bg, qeColor: tq.color, qeBorder: tq.border,
        ceState: stl(st.ce), qeState: stl(st.qe), courseOpacity: c.offered ? 1 : .45,
        formatOpts: opts('formats', FORMATS), accessOpts: opts('access', ACCESS),
        savedNote: st.sending ? 'Sending…' : (st.savedAt ? 'Draft saved ' + st.savedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Your draft saves automatically in this browser.'),
        submitLabel: st.sending ? 'Sending…' : 'Submit school details',
        error: st.error,
        submit: (ev) => this.send(ev)
      };
    }
  }
  root.innerHTML = '';
  TCF.mount(root, tpl, Profile, {});
})();
