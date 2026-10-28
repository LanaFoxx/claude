"""Generate new guide pages in the site's design language (same inline-style components as the existing guides)."""
import json, html, os
S = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad'
e = html.escape

def hero(eyebrow, h1a, h1b, lead, img, cta1, cta2):
    return f'''<div style="position:relative;overflow:hidden;color:#fff;padding:110px 56px 100px">
<img alt="" src="/assets/{img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/><div style="position:absolute;inset:0;background:linear-gradient(100deg,rgba(11,46,64,.96) 0%,rgba(11,46,64,.88) 55%,rgba(11,46,64,.78) 100%)"></div>
<div style="position:absolute;inset:0;background-image:linear-gradient(135deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,0) 55%);"></div>
<div style="position:relative;max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:20px">
<div style="font:700 22px Manrope,sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#95AB3B">{e(eyebrow)}</div>
<h1 style="margin:0;font:300 52px/1.05 'Source Serif 4',Georgia,serif;max-width:900px">{e(h1a)} <span style="display:block;font-weight:300">{e(h1b)}</span></h1>
<p style="margin:0;font-size:22px;line-height:1.6;color:rgba(255,255,255,.88);max-width:660px;text-wrap:pretty">{lead}</p>
<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px"><a data-hv="4" href="{cta1[1]}" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 19px Manrope,sans-serif;letter-spacing:0;border-radius:999px;white-space:nowrap;text-decoration:none;cursor:pointer;transition:background .15s,border-color .15s,color .15s;line-height:1.2;background:#95AB3B;color:#fff;padding:14px 28px;border:1.5px solid #95AB3B">{e(cta1[0])}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-left:2px"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg></a><a data-hv="17" href="{cta2[1]}" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 19px Manrope,sans-serif;letter-spacing:0;border-radius:999px;white-space:nowrap;text-decoration:none;cursor:pointer;transition:background .15s,border-color .15s,color .15s;line-height:1.2;background:transparent;color:#fff;padding:14px 28px;border:1.5px solid rgba(255,255,255,.5)">{e(cta2[0])}</a></div>
</div>
</div>
<div style="height:6px;background:linear-gradient(90deg,#95AB3B,#7E9330)"></div>'''

def steps(anchor, eyebrow, h2a, h2b, intro, items, bg='#fff'):
    rows = ''.join(f'''<div style="display:grid;grid-template-columns:64px 1fr;gap:22px;padding:24px 0;border-top:1px solid #E3E9EB;align-items:start">
<div style="font:300 52px/1 Manrope,sans-serif;letter-spacing:-.03em;color:#7E9330">{i+1:02d}</div>
<div><h3 style="margin:0;font:800 26px Manrope,sans-serif;letter-spacing:-.01em">{e(t)}</h3><p style="margin:6px 0 0;font-size:22px;line-height:1.6;color:#2F4652;max-width:760px;text-wrap:pretty">{b}</p></div>
</div>''' for i, (t, b) in enumerate(items))
    return f'''<div id="{anchor}" style="padding:80px 56px;background:{bg};scroll-margin-top:var(--tcf-head,110px)">
<div style="max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:30px">
<div style="max-width:760px;display:flex;flex-direction:column;gap:12px">
<div style="font:700 19px Manrope,sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#7E9330">{e(eyebrow)}</div>
<h2 style="margin:0;font:300 52px/1.12 'Source Serif 4',Georgia,serif;">{e(h2a)} <span style="font-weight:300">{e(h2b)}</span></h2>
<p style="margin:0;font-size:22px;line-height:1.65;color:#2F4652;text-wrap:pretty">{intro}</p>
</div>
<div style="display:flex;flex-direction:column">{rows}</div>
</div>
</div>'''

def dark(eyebrow, h2, text, link, total, rows):
    r = ''.join(f'''<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 24px;{'' if i == 0 else 'border-top:1px solid rgba(255,255,255,.1)'}"><span style="font-size:22px;color:rgba(255,255,255,.9)">{e(a)}</span><span style="font:800 22px Manrope,sans-serif;color:#fff;white-space:nowrap">{e(b)}</span></div>''' for i, (a, b) in enumerate(rows))
    return f'''<div style="padding:80px 56px;background:#0B2E40;color:#fff">
<div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:1fr 1.1fr;gap:56px;align-items:center">
<div style="display:flex;flex-direction:column;gap:14px">
<div style="font:700 19px Manrope,sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#95AB3B">{e(eyebrow)}</div>
<h2 style="margin:0;font:300 52px/1.12 'Source Serif 4',Georgia,serif;color:#fff">{e(h2)}</h2>
<p style="margin:0;font-size:22px;line-height:1.65;color:rgba(255,255,255,.88);text-wrap:pretty">{text}</p>
<a href="{link[1]}" style="align-self:flex-start;font:700 22px Manrope,sans-serif;color:#95AB3B;margin-top:2px">{e(link[0])} →</a>
</div>
<div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:16px;overflow:hidden">
<div style="display:flex;justify-content:space-between;align-items:baseline;padding:18px 24px;background:rgba(108,190,69,.18);border-bottom:1px solid rgba(255,255,255,.14)"><span style="font:700 19px Manrope,sans-serif;letter-spacing:1.4px;text-transform:uppercase;color:#fff">{e(total[0])}</span><span style="font:800 26px Manrope,sans-serif">{e(total[1])}</span></div>
{r}
</div>
</div>
</div>'''

def faq(items, bg='#F4F6F7'):
    cards = ''.join(f'''<div style="background:#fff;border:1px solid #E3E9EB;border-radius:14px;padding:22px 26px"><h3 style="margin:0 0 7px;font:800 22px Manrope,sans-serif">{e(q)}</h3><p style="margin:0;font-size:22px;line-height:1.62;color:#2F4652">{a}</p></div>''' for q, a in items)
    return f'''<div style="padding:80px 56px;background:{bg}">
<div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:300px 1fr;gap:56px;align-items:start">
<div><div style="font:700 19px Manrope,sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:#7E9330;margin-bottom:10px">Questions</div><h2 style="margin:0;font:300 34px/1.12 'Source Serif 4',Georgia,serif;">Common questions</h2></div>
<div style="display:flex;flex-direction:column;gap:12px">{cards}</div>
</div>
</div>'''

def cta(h, p, btn):
    return f'''<div style="position:relative;overflow:hidden;padding:56px 56px;background:#fff;border-top:1px solid #E3E9EB">
<div style="position:relative;max-width:1200px;margin:0 auto;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:18px;color:#0B2E40">
<div><h2 style="margin:0;font:300 34px/1.15 'Source Serif 4',Georgia,serif;color:#0B2E40">{e(h)}</h2><p style="margin:8px 0 0;font-size:22px;color:#0B2E40">{p}</p></div>
<a data-hv="4" href="{btn[1]}" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;font:700 19px Manrope,sans-serif;letter-spacing:0;border-radius:999px;white-space:nowrap;text-decoration:none;cursor:pointer;transition:background .15s,border-color .15s,color .15s;line-height:1.2;background:#95AB3B;color:#fff;padding:14px 28px;border:1.5px solid #95AB3B;flex:none">{e(btn[0])}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-left:2px"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg></a>
</div>
</div>'''

def source_note(links):
    l = ' · '.join(f'<a href="{u}" rel="noopener" target="_blank" style="color:#7E9330;font-weight:700">{e(t)}</a>' for t, u in links)
    return f'<div style="padding:0 56px 48px;background:#fff"><p style="max-width:1200px;margin:0 auto;font-size:17px;line-height:1.6;color:#5A6E78">Rules summarized from the California Tax Education Council. Requirements and fees can change, so confirm with CTEC before you apply: {l}.</p></div>'

A = 'https://ctec.org/media-room/how-to-become-a-tax-preparer-in-california/'
B = 'https://ctec.org/wp-content/uploads/2025/01/Experience-in-Lieu.pdf'

pages = {}

live_faq = [
    ('Do I need a Live Scan to renew my CTEC registration?', 'No. CTEC requires the background check and fingerprinting (Live Scan) for new applicants. Registered preparers renew each year by completing the <a href="/ctec-20-hour-course/" style="color:#7E9330;font-weight:700">20 hour CTEC course</a>, keeping their PTIN and bond current and paying the renewal fee by October 31.'),
    ('Can I take the 60 hour CTEC course before my Live Scan?', 'Yes. You can complete the 60 hour qualifying education course before you apply, but you cannot become registered until you pass the background check. If you are unsure about your history, start the application and Live Scan early.'),
    ('What do I have to disclose on the background questionnaire?', 'CTEC asks you to report criminal history in full, including offenses that were dismissed or expunged and ones that happened more than 10 years ago. Leaving something out is treated more seriously than the offense itself.'),
    ('How long does the CTEC background check take?', 'After the California Department of Justice sends your results, CTEC’s review typically takes 2 to 8 weeks. Answer any email from CTEC quickly; an unanswered request can lead to a proposed denial.'),
    ('Do I mail my Live Scan form to CTEC?', 'No. The Live Scan location sends your fingerprints electronically to the Department of Justice. Keep your copy of the form for your records.'),
    ('How much does Live Scan cost?', 'The CTEC application fee is $100 plus a $2 processing fee and is non-refundable. Live Scan locations set their own fingerprinting fees, so ask the location before your appointment.'),
]
pages['ctec-live-scan-background-check'] = dict(
    title='CTEC Live Scan Background Check',
    seo=['CTEC Live Scan Background Check for Tax Preparers (2026)', 'How the CTEC Live Scan fingerprint and background check works for new California tax preparers: the $100 application, the Live Scan form, 2-8 week review and next steps.', 'CTEC Live Scan'],
    img='photos/ctec-org-desktop.webp',
    alt='CTEC.org application page used to start the CTEC Live Scan background check',
    faq=live_faq,
    html=hero('For new preparers', 'CTEC Live Scan and', 'Background Check',
              'Every new California tax preparer must pass a criminal background check and submit fingerprints through Live Scan before CTEC will approve their registration. Here is how the process works, step by step.',
              'photos/ctec-org-desktop.webp', ('Compare 60-hour courses', '/ctec-60-hour-course/#find-schools'), ('See the steps', '#steps'))
    + steps('steps', 'The process', 'How the CTEC', 'background check works',
            'You can study for the 60 hour CTEC course at the same time, but CTEC will not approve your registration until your background check is cleared.',
            [('Start the CTEC new preparer application', 'Apply on CTEC’s website and pay the <strong>$100 non-refundable application fee plus a $2 processing fee</strong>. Use your full Social Security number and your name exactly as it appears on your Social Security card.'),
             ('Answer the background questionnaire', 'Disclose any criminal history, even offenses that were dismissed, expunged or happened more than 10 years ago. Complete, honest answers keep your application moving.'),
             ('Complete your Live Scan fingerprints', 'Download the Live Scan form from your CTEC account and take it to a Live Scan location. The location sends your fingerprints electronically to the California Department of Justice (DOJ). Keep your copy of the form; do not mail it to CTEC.'),
             ('Wait for CTEC’s review', 'The DOJ sends your results to CTEC, and review typically takes <strong>2 to 8 weeks</strong>. CTEC may email you for more information; reply promptly, because an unanswered request can lead to a proposed denial.'),
             ('Finish your registration', 'Once CTEC emails your approval, log in, complete the registration and pay the registration fee. Make sure your <a href="/ctec-60-hour-course/" style="color:#7E9330;font-weight:700">60 hour CTEC course</a>, IRS PTIN and $5,000 bond are in place. You then become a CTEC Registered Tax Preparer (CRTP).')])
    + dark('Key facts', 'The CTEC Live Scan at a glance', 'Only new applicants go through the background check. Registered preparers renew each year with the 20 hour CTEC course instead.', ('How to become a CTEC tax preparer', '/how-to-become-a-ctec-registered-tax-preparer/'),
           ('Who needs it', 'New applicants'), [('Application fee', '$100 + $2'), ('CTEC review after DOJ results', '2–8 weeks'), ('Register after your 60 hour course', 'Within 18 months'), ('Fingerprint form', 'From your CTEC account'), ('Mail the form to CTEC?', 'No')])
    + faq(live_faq)
    + cta('Studying while you wait?', 'Compare every CTEC-approved 60 hour course by price, format and current offers.', ('Compare 60-hour courses', '/ctec-60-hour-course/#find-schools'))
    + source_note([('How to become a tax preparer in California (CTEC)', A)])
)

eil_faq = [
    ('Who qualifies for CTEC experience in lieu?', 'Former California CPAs, attorneys and enrolled agents who held that status for the most recent two years; employees of a CPA, attorney or EA who prepared returns in that job in the two most recent years; out-of-state CPAs, attorneys and EAs; and out-of-state employees of those professionals who have relocated to California.'),
    ('Do I still need a Live Scan, PTIN and bond?', 'Yes. Experience in lieu only replaces the 60 hour qualifying education. You still complete the <a href="/ctec-live-scan-background-check/" style="color:#7E9330;font-weight:700">Live Scan background check</a>, get an IRS PTIN, buy a $5,000 surety bond and register with CTEC.'),
    ('How many returns must I have prepared?', 'You sign, under penalty of perjury, that you prepared at least 100 tax returns for compensation in the two years before your application.'),
    ('How long do I have to finish?', 'Complete the 15 hour California tax course within 18 months, and finish all initial registration requirements within 3 years of starting your application.'),
    ('What happens after I register?', 'Like every CRTP you renew by October 31 each year: complete the <a href="/ctec-20-hour-course/" style="color:#7E9330;font-weight:700">20 hour CTEC course</a> (10 hours federal tax law, 3 hours federal updates, 2 hours ethics, 5 hours California tax law), keep your PTIN and bond current and pay the renewal fees.'),
    ('I moved to California from another state. Does this apply to me?', 'It can. CTEC says preparers who relocated to California after preparing returns in another state for the most recent two years complete a 15 hour qualifying California tax course. Contact CTEC to confirm your eligibility before you apply.'),
]
pages['ctec-experience-in-lieu-15-hour-course'] = dict(
    title='CTEC Experience in Lieu: 15 Hour Course',
    seo=['CTEC Experience in Lieu: 15 Hour California Tax Course', 'Experienced preparers can skip the 60 hour CTEC course with experience in lieu: who qualifies, the 15 hour California tax law course, 100-return rule and deadlines.', 'CTEC experience in lieu'],
    img='photos/04-tax-forms-calculator-closeup.webp',
    alt='Experienced tax preparer reviewing returns before taking the CTEC 15 hour experience in lieu course',
    faq=eil_faq,
    html=hero('For experienced preparers', 'CTEC Experience in Lieu:', 'The 15 Hour California Tax Course',
              'California law lets certain experienced tax preparers skip the 60 hour qualifying course. Instead they complete a 15 hour California tax law course from a CTEC-approved provider and meet every other registration requirement.',
              'photos/04-tax-forms-calculator-closeup.webp', ('Find CTEC-approved providers', '/#find-schools'), ('Who qualifies', '#qualify'))
    + steps('qualify', 'Eligibility', 'Who qualifies for', 'experience in lieu',
            'CTEC policy TP-04 lists six groups. Each applicant also signs, under penalty of perjury, that they prepared at least <strong>100 tax returns for compensation</strong> in the two years before applying.',
            [('Former California CPAs', 'Licensed as a California CPA for the last two years but no longer holding CPA status with the California Board of Accountancy.'),
             ('Former California attorneys', 'Licensed for the most recent two years but no longer an active member of the State Bar of California.'),
             ('Former enrolled agents', 'Held enrolled agent (EA) status for the most recent two years but no longer hold the designation.'),
             ('Employees of a CPA, attorney or EA', 'Prepared tax returns within the scope of that employment during the two most recent years.'),
             ('Out-of-state CPAs, attorneys and EAs', 'Professionals licensed or enrolled in another state who now prepare California returns.'),
             ('Relocated out-of-state employees', 'Prepared returns under an exempt preparer’s scope in another state during the two most recent years and have moved to California.')])
    + dark('Compare the courses', '15 hours instead of 60', 'Experience in lieu replaces the qualifying education only. Everyone else starts with the 60 hour CTEC course, and every registered preparer renews with 20 hours a year.', ('Compare 60 hour CTEC courses', '/ctec-60-hour-course/'),
           ('Experience in lieu', '15 hours'), [('California tax law course', '15 hrs'), ('Standard 60 hour CTEC course', '60 hrs'), ('Complete the 15 hour course within', '18 months'), ('Finish initial registration within', '3 years'), ('Annual renewal (20 hour CTEC course)', 'By Oct 31')])
    + steps('requirements', 'Still required', 'Everything else you', 'must complete',
            'Experienced preparers are subject to all of CTEC’s other registration requirements.',
            [('Live Scan and background check', 'Submit fingerprints and pass the criminal background check. <a href="/ctec-live-scan-background-check/" style="color:#7E9330;font-weight:700">How the CTEC Live Scan works</a>.'),
             ('IRS PTIN', 'Obtain a Preparer Tax Identification Number from the IRS and renew it each year.'),
             ('$5,000 surety bond', 'Buy a $5,000 tax preparer surety bond and keep it current.'),
             ('Register with CTEC and pay the fees', 'Complete registration and pay the required fees. Then renew every year by October 31.')], bg='#F4F6F7')
    + faq(eil_faq, bg='#fff')
    + cta('Looking for a 15 hour course?', 'Many CTEC-approved schools offer one. Check the provider directory, then confirm the 15 hour course with the school.', ('Browse CTEC-approved providers', '/#find-schools'))
    + source_note([('CTEC Experience in Lieu webinar (PDF)', B), ('How to become a tax preparer in California (CTEC)', A)])
)

for slug, p in pages.items():
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": html.unescape(__import__('re').sub(r'<[^>]+>', '', a))}} for q, a in p['faq']]}
    json.dump(ld, open(f'{S}/build/{slug}-ld.json', 'w'))
    widget = f'<div class="tcf-page tcf-scope tcf-p-{slug}"><div id="tcf-{slug}-root" class="tcf-root">@@SSR@@</div></div>'
    json.dump({'name': p['title'], 'slug': slug, 'url': f'/{slug}/', 'title': p['title'], 'runtime': False, 'rid': f'tcf-{slug}', 'widget': widget,
               'ssr': '<div data-screen-label="' + e(p['title']) + '" class="tcf-screen">' + p['html'] + '</div>', 'css': '', 'code': '', 'props': {}, 'seo': p['seo'], 'alt': p['alt'], 'img': p['img']},
              open(f'{S}/build/pages/{slug}.json', 'w'), indent=1)
    print('built', slug, len(p['html']))
