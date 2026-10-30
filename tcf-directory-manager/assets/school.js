/* School page: renders the School Page design from window.TCF_SCHOOL (built by TCFD_School::data).
   Empty fields show "Not confirmed" – nothing is guessed. Needs the site runtime (TCF.mount / TCF.decorate). */
(function () {
  var D = window.TCF_SCHOOL, root = document.getElementById('tcf-school-root'), tpl = document.getElementById('tcf-school-tpl');
  if (!D || !root || !tpl || !window.TCF || !TCF.mount || !TCF.mapProvider) return;
  var NC = 'Not confirmed', L = D.labels, S = D.school;
  var p = TCF.mapProvider(D.provider);
  var esc = function (s) { return String(s == null ? '' : s); };
  var has = function (v) { return v !== undefined && v !== null && String(v).trim() !== ''; };
  var or = function (v, d) { return has(v) ? v : (d === undefined ? NC : d); };
  var fmt = function (s) { return s ? new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : NC; };
  var OFFICIAL = { ce: ['10 hrs Federal tax law', '3 hrs Federal tax law updates', '2 hrs Ethics', '5 hrs California tax law'], qe: ['45 hrs Federal tax law (incl. 2 hrs ethics)', '15 hrs California tax law'] };

  function initialCourse() {
    var q = new URLSearchParams(location.search).get('course');
    var want = q === '60-hour' ? 'qe' : (q === '20-hour' ? 'ce' : null);
    if (want === 'qe' && p.qe) return 'qe';
    if (want === 'ce' && p.ce) return 'ce';
    return p.ce ? 'ce' : 'qe';
  }

  class School extends DCLogic {
    constructor(props) { super(props); this.state = { course: initialCourse() }; }
    pick(c) {
      if ((c === 'qe' && !p.qe) || (c === 'ce' && !p.ce)) return;
      this.setState({ course: c });
      var u = new URL(location.href); u.searchParams.set('course', c === 'qe' ? '60-hour' : '20-hour'); history.replaceState(null, '', u);
    }
    renderVals() {
      var self = this, course = this.state.course, qe = course === 'qe', C = D.courses[course] || {};
      var dec = TCF.decorate([p], qe)[0] || TCF.decorate([p], !qe)[0] || {};
      var shortName = p.name.replace(/\s*\(.*\)\s*/, '').split(' dba ')[0];
      var F = function (k) { return p.features && p.features[k]; };
      var fchip = function (label, on) { return { on: !!on, label: on ? label : label + ' · not confirmed', bg: on ? '#FFF1EE' : '#fff', border: on ? '#D9D4CC' : '#D9D4CC', color: on ? '#23272A' : '#4B4F54' }; };
      var fm = C.formats || [];
      var formats = fm.length
        ? Object.keys(L.formats).map(function (k) { return fchip(L.formats[k], fm.indexOf(k) >= 0); })
        : [fchip('Video lessons', F('video_lessons_available')), fchip('Online reading', F('text_based_course_available')), fchip('Downloadable PDF', F('downloadable_materials')),
           fchip('Physical textbook', F('physical_book_available')), fchip('Live online classes', F('live_instruction_available')), fchip('Classroom', F('in_person_course_available'))];
      var video = fm.length ? fm.indexOf('video') >= 0 : F('video_lessons_available');
      var book = fm.length ? (fm.indexOf('textbook') >= 0 || fm.indexOf('pdf') >= 0 || fm.indexOf('reading') >= 0) : (F('physical_book_available') || F('digital_book_available'));
      var online = fm.length ? fm.some(function (k) { return ['video', 'reading', 'pdf', 'live_online', 'audio'].indexOf(k) >= 0; }) : F('online_course_available');
      var pace = has(C.pace) ? L.pace[C.pace] : '';
      var formatShort = (online || fm.indexOf('classroom') >= 0 || pace) ? [online ? 'Online' : (fm.indexOf('classroom') >= 0 ? 'Classroom' : ''), pace ? pace.toLowerCase() : ''].filter(Boolean).join(' · ') : NC;
      var sup = function (channel, value, hours, verified) {
        var listed = has(value);
        return { channel: channel, value: listed ? value : NC, hours: listed ? (verified ? (hours || 'Hours not confirmed') : 'Listed contact method; staffed support not verified.') : 'Not confirmed',
                 status: listed && verified ? 'Confirmed' : 'Not confirmed', bg: listed && verified ? '#FFF1EE' : '#FAF7F2', color: listed && verified ? '#23272A' : '#4B4F54' };
      };
      var hrs = has(S.support_hours) ? S.support_hours + (has(S.support_tz) ? ' ' + S.support_tz : '') : '';
      var supportChannels = [sup('Phone', S.support_phone, hrs, S.support_phone_verified),
                             sup('Email', S.support_email, S.email_response_time ? 'Replies ' + S.email_response_time.replace(/^replies\s*/i, '') : hrs, S.support_email_verified),
                             sup('Live chat', S.live_chat && S.live_chat !== 'none' ? L.chat[S.live_chat] : '', hrs, S.live_chat_verified)];
      var rep = has(C.reporting_time) ? L.reporting[C.reporting_time] : null;
      var price = qe ? p.qePrice : p.cePrice;
      var kind = C.package_kind === 'complete' ? 'Complete package' : (C.package_kind === 'partial' ? 'Partial package' : (dec.priceCaptured ? (dec.sortable != null ? 'Complete package' : 'See provider') : 'Price not published'));
      var label = qe ? '60-hour qualifying' : '20-hour continuing';
      var refund = [C.refund_window ? 'Refund window: ' + C.refund_window + '.' : '', C.refund_conditions || ''].filter(Boolean).join(' ');
      var access = [has(C.start_now) ? L.start[C.start_now] + '.' : '', has(C.access_period) ? 'Access for ' + C.access_period + '.' : ''].filter(Boolean).join(' ');
      var acc = [has(C.languages) ? C.languages + '.' : ''].concat((C.accessibility || []).map(function (k) { return { captions: 'Video captions', mobile: 'Mobile-friendly', printable: 'Printable lessons' }[k] + '.'; })).filter(Boolean).join(' ');
      var passing = [C.passing_score ? C.passing_score + ' to pass.' : '', C.attempts ? 'Attempts: ' + C.attempts + '.' : ''].filter(Boolean).join(' ');
      var extras = [{ label: 'Printed textbook', value: or(C.extra_book) }, { label: 'Exam retake', value: or(C.extra_retake) }, { label: 'Certificate', value: or(C.extra_cert) }];
      return {
        name: p.name, shortName: shortName, website: p.website, domain: dec.domain || '', courseUrl: (price && price.sourceUrl) || D.provider[course] && D.provider[course].course_url || p.website,
        logoEl: p.logoUrl ? React.createElement('img', { src: p.logoUrl, alt: p.name + ' logo', style: { width: '100%', height: '100%', objectFit: 'contain', padding: 10, boxSizing: 'border-box' } }) : null, noLogo: !p.logoUrl,
        offeringLabel: p.offering === 'QE + CE' ? 'CE + QE provider' : (p.qe ? 'QE provider' : 'CE provider'),
        googleShown: dec.googleShown, googleRating: dec.googleRating, googleCount: dec.googleCount, googleUrl: dec.googleUrl,
        ctecNumber: or(D.provider.ctec_number), approvedTypes: p.ce && p.qe ? 'qualifying and continuing education' : (p.qe ? 'qualifying education' : 'continuing education'),
        intro: has(S.intro) ? S.intro : shortName + ' is a CTEC-approved education provider. Details below are recorded per course; anything we have not verified is marked "Not confirmed".',
        pickCE: function () { self.pick('ce'); }, pickQE: function () { self.pick('qe'); }, noCE: !p.ce, noQE: !p.qe,
        ceBg: !qe ? '#FAF7F2' : 'transparent', ceColor: !qe ? '#23272A' : '#fff', ceBorder: !qe ? '#FAF7F2' : 'rgba(255,255,255,.5)', ceOpacity: p.ce ? 1 : .4,
        qeBg: qe ? '#FAF7F2' : 'transparent', qeColor: qe ? '#23272A' : '#fff', qeBorder: qe ? '#FAF7F2' : 'rgba(255,255,255,.5)', qeOpacity: p.qe ? 1 : .4,
        tabHint: p.ce && p.qe ? (qe ? 'Qualifying education: required before your first CTEC registration.' : 'Continuing education: required every year to renew an existing registration.') : (p.qe ? 'This school offers the 60-hour qualifying course only.' : 'This school offers the 20-hour continuing education course only.'),
        courseLabel: qe ? '60-Hour QE Course' : '20-Hour CE Course', packageKind: kind,
        packageExplain: kind === 'Complete package' ? 'A complete ' + label + ' education package. One price covers all required hours for ' + (qe ? 'first-time CTEC registration' : 'annual renewal') + '.' : (dec.priceCaptured ? dec.priceText + '. ' + (dec.priceNote || '') : 'Price not published. Confirm package scope on the school website.'),
        priceText: dec.priceText || 'Price not published', priceNote: dec.priceNote || (dec.priceCaptured ? 'Published price' : 'Check provider site'), priceWeight: dec.priceMuted ? 500 : 800, priceColor: dec.priceMuted ? '#4B4F54' : '#23272A',
        priceChecked: fmt(C.price_last_checked || p.lastChecked),
        hasCoupon: !!dec.hasCoupon, coupon: dec.coupon, couponLabel: dec.couponLabel,
        formatShort: formatShort, supportShort: supportChannels.filter(function (c) { return c.status === 'Confirmed'; }).map(function (c) { return c.channel; }).join(' · ') || NC,
        materialsShort: [video && 'Video', book && 'Book'].filter(Boolean).join(' + ') || NC, reportingShort: rep ? rep[0] : NC, accessShort: or(C.access_period),
        edition: or(C.edition), hours: (C.hours_breakdown && C.hours_breakdown.length) ? C.hours_breakdown : OFFICIAL[course], syllabus: or(C.syllabus), attemptsKnown: has(C.attempts), unlimitedAttempts: /unlimited|^yes$/i.test(String(C.attempts || '')) ? 'Yes' : 'No',
        beginnerNote: C.beginner_friendly === 'yes' ? 'Beginner-friendly: written for people new to tax preparation.' : (C.beginner_friendly === 'no' ? 'Assumes prior tax preparation knowledge.' : ''),
        included: (C.included && C.included.length) ? C.included : [NC], extras: extras, refund: refund || NC, refundUrl: C.refund_url || p.website,
        formats: formats.filter(function (x) { return x.on; }), noFormats: !formats.some(function (x) { return x.on; }), pace: or(pace), access: access || NC, afterCompletion: has(C.after_completion) ? L.after[C.after_completion] + '.' : NC, liveSessions: or(C.live_sessions), accessibility: acc || NC,
        supportChannels: supportChannels.filter(function (c) { return c.value !== NC; }), hasSupport: supportChannels.some(function (c) { return c.value !== NC; }), creditsQ: supportChannels.some(function (c) { return c.value !== NC; }) ? 4 : 3, instructionalHelp: or(S.instructional_help), accountHelp: or(S.account_help), instructors: or(S.instructors),
        reportingHeadline: rep ? 'Reported to CTEC ' + (/^within/i.test(rep[0]) ? rep[0].toLowerCase() : 'in ' + rep[0].toLowerCase()) : 'Reporting timeframe not confirmed',
        reportingDetail: has(C.weekend_note) ? C.weekend_note : 'Ask the school how quickly it reports completions, especially near the Oct 31 deadline.',
        reportingStat: rep ? rep[1] : '?', reportingStatLabel: rep ? rep[2] : 'not confirmed',
        exams: has(C.exam_structure) ? L.exams[C.exam_structure] + '.' : NC, passing: passing || NC, timers: has(C.timers) ? L.timers[C.timers] + '.' : NC,
        whoReports: has(C.who_reports) ? L.who[C.who_reports] : NC, certificate: has(C.certificate) ? L.cert[C.certificate] + '.' : NC,
        about: has(S.about) ? S.about : 'No school description on file yet. Schools can add one by verifying their profile.',
        faqs: (S.faqs && S.faqs.length) ? S.faqs : [{ q: 'School-specific FAQs', a: 'Not confirmed. Schools can supply these when they verify their profile.' }],
        shots: S.screenshots || [], hasShots: !!(S.screenshots && S.screenshots.length),
        photo: S.photo || { src: '', alt: '' }, hasPhoto: !!(S.photo && S.photo.src), aboutCols: S.photo && S.photo.src ? 'minmax(0,1fr) 300px' : 'minmax(0,1fr)',
        lastChecked: fmt(C.last_checked || p.lastChecked)
      };
    }
  }
  TCF.mount(root, tpl, School, {});
})();
