#!/usr/bin/env python3
"""Convert the .dc.html design prototypes into static HTML page bodies for WordPress."""
import json, re, sys, html
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

MEDIA = json.loads(Path(sys.argv[3]).read_text()) if len(sys.argv) > 3 else {}

hover_rules = {}   # style -> class
focus_rules = {}

def cls_for(table, prefix, style):
    if style not in table:
        table[style] = f"{prefix}{len(table)+1}"
    return table[style]

def add_class(tag, cls):
    if re.search(r'\sclass="', tag):
        return re.sub(r'\sclass="([^"]*)"', lambda m: f' class="{m.group(1)} {cls}"', tag, count=1)
    end = 2 if tag.endswith('/>') else 1
    return tag[:-end] + f' class="{cls}"' + tag[-end:]

def convert_states(s):
    def tagfix(m):
        tag = m.group(0)
        for attr, table, prefix in (("style-hover", hover_rules, "drh"), ("style-focus", focus_rules, "drf")):
            mm = re.search(rf'\s{attr}="([^"]*)"', tag)
            if mm:
                c = cls_for(table, prefix, mm.group(1))
                tag = tag.replace(mm.group(0), "")
                tag = add_class(tag, c)
        return tag
    return re.sub(r'<[a-zA-Z][^<>]*\sstyle-(?:hover|focus)="[^"]*"[^<>]*>', tagfix, s)

def resolve_ifs(s, values):
    pat = re.compile(r'<sc-if value="\{\{ ([\w.]+) \}\}"[^>]*>((?:(?!<sc-if).)*?)</sc-if>', re.S)
    while True:
        m = pat.search(s)
        if not m:
            return s
        key, body = m.group(1), m.group(2)
        if key not in values:
            raise SystemExit(f"unhandled sc-if {key}")
        v = values[key]
        rep = body if v is True else "" if v is False else v.replace("%s", body)
        s = s[:m.start()] + rep + s[m.end():]

def replace_for(s, listname, rep):
    pat = re.compile(r'<sc-for list="\{\{ ' + re.escape(listname) + r' \}\}"[^>]*>.*?</sc-for>', re.S)
    assert pat.search(s), listname
    return pat.sub(lambda m: rep, s, count=1)

def links(s):
    rep = [
        ('href="Home.dc.html#', 'href="/#'), ('href="Home.dc.html"', 'href="/"'),
        ('href="Schedule.dc.html#', 'href="/schedule/#'), ('href="Schedule.dc.html"', 'href="/schedule/"'),
        ('href="MediationCenter.dc.html"', 'href="/mediation-center/"'),
        ('href="Payments.dc.html"', 'href="/payments/"'),
        ('href="#terms"', 'href="/terms/"'), ('href="#privacy"', 'href="/privacy-policy/"'),
        ('href="#accessibility"', 'href="/accessibility/"'),
    ]
    for a, b in rep:
        s = s.replace(a, b)
    for name, url in MEDIA.items():
        s = s.replace(f'src="assets/{name}"', f'src="{url}"')
    return s

def slots(s):
    return re.sub(r'<image-slot id="([^"]+)"[^>]*placeholder="([^"]*)"[^>]*></image-slot>',
                  lambda m: f'<div class="dr-photo" data-slot="{m.group(1)}" role="img" aria-label="{m.group(2)}"></div>', s)

def strip_events(s):
    return re.sub(r'\s(?:onClick|onSubmit|onChange)="\{\{[^}]*\}\}"', '', s)

def main_of(name):
    t = (SRC / name).read_text()
    return t[t.index("<main>") + 6: t.index("</main>")]

def slug(label):
    label = re.sub(r'<[^>]+>', '', label)
    return re.sub(r'[^a-z0-9]+', '_', label.lower()).strip('_')[:40]

def name_labeled_inputs(s, required=()):
    """Give every <label>Text<input|select|textarea> a name derived from the text."""
    def f(m):
        text, ctl = m.group(1), m.group(2)
        n = slug(text)
        extra = f' name="{n}"'
        if n in required:
            extra += ' required'
        return f'{text}<{ctl}{extra}'
    return re.sub(r'(?<=>)([^<>]+(?:<span[^>]*>[^<]*</span>)?)<(input|select|textarea)(?![^>]*\sname=)', f, s)

FORM_HIDDEN = ('<input type="hidden" name="action" value="{a}">'
               '<input type="hidden" name="dr_page" value="{p}">'
               '<div class="dr-hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="dr_website" tabindex="-1" autocomplete="off"></label></div>')

def form_open(s, n, action, page, extra=""):
    """Turn the n-th <form ...> into a real POST form."""
    idx = [m for m in re.finditer(r'<form([^>]*)>', s)][n]
    new = f'<form method="post" action="/wp-admin/admin-post.php" data-dr-form="{action}"{extra}{idx.group(1)}>' + FORM_HIDDEN.format(a=action, p=page)
    return s[:idx.start()] + new + s[idx.end():]

def finish(s):
    s = strip_events(slots(links(convert_states(s))))
    assert "{{" not in s, re.findall(r'.{60}\{\{.{60}', s)[:5]
    assert "<sc-" not in s
    return s.strip()

# ---------------- Home ----------------
h = main_of("Home.dc.html")
h = resolve_ifs(h, {"hlA": True, "hlB": False, "hlC": False, "mentionFirm": False,
                    "showForm": True, "showFormButton": False,
                    "isWide": '<div class="dr-wide">%s</div>', "isNarrow": '<div class="dr-narrow">%s</div>'})
h = h.replace('{{ copyLabel }}', '<span data-dr-copy-label>Copy my details</span>')
h = h.replace('<button type="button" onClick="{{ copyDetails }}"', '<button type="button" data-dr-copy="Copy my details"')
h = re.sub(r'(<input type="text" name="name")', r'\1 required', h)
h = re.sub(r'(<input type="email" name="email")', r'\1 required', h)
h = form_open(h, 0, "dr_inquiry", "home")
(OUT / "home.html").write_text(finish(h))

# ---------------- Mediation center ----------------
c = main_of("MediationCenter.dc.html")
c = resolve_ifs(c, {"hybrid": False})
c = c.replace("{{ caucusLabel }}", "Two private caucus rooms")
(OUT / "mediation-center.html").write_text(finish(c))

# ---------------- Payments ----------------
p = main_of("Payments.dc.html")
p = p.replace("{{ processor }}'s", "LawPay’s").replace("{{ processor }}", "LawPay")
p = p.replace('value="{{ amount }}" onChange="{{ setAmount }}"', 'name="amount" id="dr-amount" data-dr-amount')
seg_btn = ('<button type="button" data-dr-method="{v}" aria-pressed="{on}" style="flex:1;min-height:48px;padding:0 12px;border:1px solid #24394A;'
           'border-radius:8px;background:{bg};color:{fg};font:500 15px \'IBM Plex Sans\',system-ui,sans-serif;cursor:pointer">{l}</button>')
p = replace_for(p, "methods",
    seg_btn.format(v="card", on="true", bg="#24394A", fg="#F7F5F0", l="Card") +
    seg_btn.format(v="ach", on="false", bg="#fff", fg="#24394A", l="Bank transfer (ACH)") +
    '<input type="hidden" name="method" value="card" data-dr-method-input>')
p = p.replace('>{{ feeNote }}</p>', ' data-dr-feenote>A 3% card processing fee is added to card payments, as DRC Advisory Opinion 44 permits. Choose bank transfer to avoid it.</p>')
p = resolve_ifs(p, {"hasAmount": '<div data-dr-summary hidden style="grid-column:1 / -1">%s</div>',
                    "paid": '<div data-dr-paystatus hidden style="grid-column:1 / -1">%s</div>'})
p = p.replace("{{ share }}", '<span data-dr-share>$0.00</span>').replace("{{ feeLine }}", '<span data-dr-fee>None</span>').replace("{{ total }}", '<span data-dr-total>$0.00</span>')
p = p.replace('>{{ payLabel }}</button>', ' data-dr-paylabel>Pay a mediation fee</button>')
p = re.sub(r'<p role="status"([^>]*)>.*?</p>', r'<p role="status"\1 data-dr-paymsg></p>', p, flags=re.S)
p = name_labeled_inputs(p, required=("payer_name", "case_caption", "receipt_email"))
p = form_open(p, 0, "dr_payment", "payments", ' data-dr-payment')
p = p.replace('href="/schedule/#kit" style="display:inline-flex;align-items:center;gap:8px;font-size:15px">Form W-9', 'href="mailto:David@DenningerResolutions.com?subject=Request%3A%20Form%20W-9" style="display:inline-flex;align-items:center;gap:8px;font-size:15px">Form W-9')
(OUT / "payments.html").write_text(finish(p))

# ---------------- Schedule ----------------
s = main_of("Schedule.dc.html")
FAQS = json.loads(Path(sys.argv[0]).with_name("faqs.json").read_text())
s = s.replace("Open dates · {{ monthLabel }}", 'Open dates · <span data-dr-month></span>')
s = s.replace("Scheduling embed preview ({{ toolName }}), styled to the brand. Dates shown {{ horizon }} days out.",
              "Choose a weekday to request a block. Dates shown up to 90 days out.")
# month navigation next to the legend
nav_btn = ('<button type="button" data-dr-cal="{d}" aria-label="{l}" style="width:36px;height:36px;border:1px solid #ECEEEA;border-radius:8px;background:#fff;display:grid;place-items:center;cursor:pointer">'
           '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#24394A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="{p}"/></svg></button>')
s = s.replace('<div style="display:flex;gap:14px;font-size:13px;color:#5E6670">',
              '<div style="display:flex;align-items:center;gap:14px;font-size:13px;color:#5E6670">' +
              nav_btn.format(d="prev", l="Previous month", p="m15 18-6-6 6-6") + nav_btn.format(d="next", l="Next month", p="m9 18 6-6-6-6"), 1)
s = replace_for(s, "cells", "")
s = s.replace('<div role="grid" style=', '<div role="grid" data-dr-grid aria-label="Available dates" style=', 1)
s = s.replace("My court calendar blocks these dates automatically.", "I confirm each request after a conflicts check.")
s = re.sub(r'<sc-if value="\{\{ f.open \}\}">(.*?)</sc-if>', r'<x-faqa>\1</x-faqa>', s, flags=re.S)
s = resolve_ifs(s, {"showPanel": '<div data-dr-panel hidden>%s</div>', "requested": ""})
s = s.replace("{{ selDate }}", '<span data-dr-seldate></span>')
seg = ('<button type="button" data-dr-seg="{g}" data-value="{v}" aria-pressed="false" style="min-height:44px;padding:0 16px;border:1px solid #24394A;border-radius:8px;'
       'background:#fff;color:#24394A;font:500 15px \'IBM Plex Sans\',system-ui,sans-serif;cursor:pointer">{l}</button>')
s = replace_for(s, "blockOpts", "".join(seg.format(g="block", v=v, l=v) for v in ("AM", "PM", "Full day")))
s = replace_for(s, "modes", "".join(seg.format(g="mode", v=v, l=v) for v in ("In person", "Zoom")))
# counsel rows -> template rendered by JS
m = re.search(r'<sc-for list="\{\{ counsel \}\}"[^>]*>(.*?)</sc-for>', s, re.S)
row = m.group(1).strip()
row = row.replace('<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))', '<div data-dr-counsel-row style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr))', 1)
row = row.replace('placeholder="Name" aria-label="Counsel name"', 'name="counsel_name[]" placeholder="Name" aria-label="Counsel name"')
row = row.replace('placeholder="Firm" aria-label="Counsel firm"', 'name="counsel_firm[]" placeholder="Firm" aria-label="Counsel firm"')
row = row.replace('placeholder="Email" aria-label="Counsel email"', 'name="counsel_email[]" placeholder="Email" aria-label="Counsel email"')
row = row.replace('onClick="{{ k.remove }}" aria-label="Remove counsel"', 'data-dr-counsel-remove aria-label="Remove counsel"')
s = s[:m.start()] + f'<div data-dr-counsel-list style="display:flex;flex-direction:column;gap:10px"></div><template data-dr-counsel-tpl>{row}</template>' + s[m.end():]
s = s.replace('<button type="button" onClick="{{ addCounsel }}"', '<button type="button" data-dr-counsel-add', 1)
s = s.replace("{{ reserveLabel }}", "Request this date")
s = s.replace('<p style="grid-column:1 / -1;margin:0;font-size:13px;line-height:1.5;color:#5E6670">No settlement',
              '<p data-dr-error role="alert" hidden style="grid-column:1 / -1;margin:0;font-size:14px;line-height:1.5;color:#6B4F32"></p>'
              '<p style="grid-column:1 / -1;margin:0;font-size:13px;line-height:1.5;color:#5E6670">No settlement', 1)
s = s.replace("{{ holdTitle }}", "How confirmation works")
s = s.replace("{{ holdNote }}", "Your request holds the date. I confirm within one business day after a conflicts check, and everyone listed receives the confirmation.")
s = s.replace('<p style="margin:0;font-size:15px;line-height:1.5;color:#26292C">Reminders go to everyone 7 days and 1 day before, with reschedule and cancellation links.</p>', '')
# booking form fields
bm = re.search(r'<form onSubmit="\{\{ submitRequest \}\}".*?</form>', s, re.S)
bf = name_labeled_inputs(bm.group(0), required=("case_caption", "county", "file_number", "completion_deadline_in_the_order", "booking_attorney", "email"))
bf = bf.replace('<form onSubmit="{{ submitRequest }}"', '<form', 1)
bf = re.sub(r'^<form([^>]*)>', lambda mm: f'<form data-dr-booking{mm.group(1)}>' +
            '<input type="hidden" name="date" data-dr-in="date"><input type="hidden" name="block" data-dr-in="block"><input type="hidden" name="format" data-dr-in="mode">', bf)
s = s[:bm.start()] + bf + s[bm.end():]
# FAQ, statically expanded
fm = re.search(r'<sc-for list="\{\{ faqs \}\}"[^>]*>(.*?)</sc-for>', s, re.S)
tpl = fm.group(1).strip()
items = []
for i, f in enumerate(FAQS):
    it = tpl.replace("{{ f.q }}", html.escape(f["q"])).replace("{{ f.a }}", html.escape(f["a"]))
    it = it.replace('onClick="{{ f.toggle }}" aria-expanded="{{ f.open }}"', f'data-dr-faq aria-expanded="{"true" if i == 0 else "false"}" aria-controls="dr-faq-{i}"')
    it = it.replace("transform:{{ f.chev }};", f"transform:{'rotate(180deg)' if i == 0 else 'none'};")
    it = it.replace('<x-faqa><p ', f'<p id="dr-faq-{i}"{"" if i == 0 else " hidden"} ').replace("</p></x-faqa>", "</p>")
    items.append(it)
s = s[:fm.start()] + "\n".join(items) + s[fm.end():]
# copy details
s = s.replace('<button type="button" onClick="{{ copyDetails }}"', '<button type="button" data-dr-copy="Copy mediator details"')
s = s.replace(">{{ copyLabel }}</button>", "><span data-dr-copy-label>Copy mediator details</span></button>")
# downloads: no files yet -> request by email
s = s.replace('href="#w9"', 'href="mailto:David@DenningerResolutions.com?subject=Request%3A%20Form%20W-9"')
s = s.replace('href="#fees-pdf"', 'href="mailto:David@DenningerResolutions.com?subject=Request%3A%20Fees%20and%20policies"')
s = s.replace('href="#kit" style', 'href="#kit" data-dr-print style')
# inquiry form at the bottom
im = re.search(r'(<section id="inquiry-form".*?)(<form onSubmit="\{\{ preventSubmit \}\}".*?</form>)', s, re.S)
inq = name_labeled_inputs(im.group(2), required=("name", "email")).replace('<form onSubmit="{{ preventSubmit }}"', '<form', 1)
s = s[:im.start(2)] + inq + s[im.end(2):]
s = s.replace('<form data-dr-booking', '<form data-dr-booking', 1)
# make both forms real
forms = list(re.finditer(r'<form([^>]*)>', s))
assert len(forms) == 2
s = form_open(s, 1, "dr_inquiry", "schedule")
s = form_open(s, 0, "dr_booking", "schedule")
(OUT / "schedule.html").write_text(finish(s))

# ---------------- generated CSS for hover/focus ----------------
css = []
for style, c in hover_rules.items():
    css.append(f".{c}:hover{{{';'.join(x.strip() + ' !important' for x in style.split(';') if x.strip())}}}")
for style, c in focus_rules.items():
    css.append(f".{c}:focus-visible,.{c}:focus{{{';'.join(x.strip() + ' !important' for x in style.split(';') if x.strip())}}}")
(OUT / "states.css").write_text("\n".join(css) + "\n")
print("hover", len(hover_rules), "focus", len(focus_rules))
