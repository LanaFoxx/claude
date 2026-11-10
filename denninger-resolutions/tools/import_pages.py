#!/usr/bin/env python3
"""Create/update the site's pages via the WP REST API using the logged-in cookie jar."""
import http.cookiejar, json, ssl, sys, urllib.request
from pathlib import Path

BASE, NONCE, JAR, CONTENT = sys.argv[1], sys.argv[2], sys.argv[3], Path(sys.argv[4])
cj = http.cookiejar.MozillaCookieJar(JAR); cj.load(ignore_discard=True, ignore_expires=True)
ctx = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt")
op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj), urllib.request.HTTPSHandler(context=ctx))

def api(method, path, data=None):
    req = urllib.request.Request(BASE + "/wp-json/" + path, method=method,
                                 data=json.dumps(data).encode() if data is not None else None,
                                 headers={"X-WP-Nonce": NONCE, "Content-Type": "application/json"})
    try:
        return json.load(op.open(req))
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path}: {e.code} {e.read()[:500]}")

def block(html):
    return "<!-- wp:html -->\n" + html + "\n<!-- /wp:html -->"

def simple(eyebrow, h1, paras, buttons=(), extra=""):
    ps = "".join(f'<p style="margin:0">{p}</p>' for p in paras)
    bs = "".join(f'<a class="dr-btn dr-btn-{k}" href="{h}">{t}</a>' for k, h, t in buttons)
    return (f'<section style="background:#F7F5F0"><div class="dr-wrap" style="padding-top:clamp(56px,8vw,112px);padding-bottom:clamp(56px,8vw,112px)">'
            f'<div style="max-width:720px;display:flex;flex-direction:column;gap:20px">'
            f'<p class="dr-eyebrow">{eyebrow}</p><h1 class="dr-h1">{h1}</h1>{ps}'
            + (f'<div style="display:flex;flex-wrap:wrap;gap:12px;padding-top:8px">{bs}</div>' if bs else "") + extra +
            '</div></div></section>')

EMAIL = '<a href="mailto:David@DenningerResolutions.com">David@DenningerResolutions.com</a>'
PAGES = [
    dict(slug="home", title="Home", body=(CONTENT / "home.html").read_text(),
         seo="David Denninger | Superior Court Mediator, Asheville NC",
         desc="NCDRC Certified Superior Court Mediator in Asheville, NC. Mediated settlement conferences for civil cases, in person on Pack Square or by Zoom. Book one date for every party."),
    dict(slug="schedule", title="Schedule a Mediation", body=(CONTENT / "schedule.html").read_text(),
         seo="Schedule a Mediation | Denninger Resolutions",
         desc="Request a half-day or full-day Superior Court mediation in Asheville or by Zoom. Fees and policies, the paralegal kit and answers to common questions."),
    dict(slug="mediation-center", title="Mediation Center", body=(CONTENT / "mediation-center.html").read_text(),
         seo="Mediation Center in Downtown Asheville | Denninger Resolutions",
         desc="A quiet mediation suite at 9 SW Pack Square: joint session room, private caucus rooms, parking nearby and Zoom with private breakout rooms."),
    dict(slug="payments", title="Payments", body=(CONTENT / "payments.html").read_text(),
         seo="Pay a Mediation Fee | Denninger Resolutions",
         desc="Pay your party's share of a mediation fee online by card or bank transfer, referenced to your case. Card fees are disclosed before payment."),
    dict(slug="thank-you", title="Thank you", noindex=True, seo="Thank you | Denninger Resolutions",
         body=simple("Inquiry received", "Thank you. Your message is in.",
                     ["I reply within one business day. If your matter is time-sensitive, call or email " + EMAIL + "."],
                     [("primary", "/schedule/", "Check available dates"), ("secondary", "/", "Back to the home page")])),
    dict(slug="booking-confirmed", title="Booking request received", noindex=True, seo="Booking request received | Denninger Resolutions",
         body=simple("Booking request received", "Your date request is in.",
                     ["I confirm within one business day after a conflicts check. Everyone you listed receives the confirmation.",
                      "Send mediation summaries by email five business days before the conference. No payment is due to book; fees are due at the conclusion."],
                     [("secondary", "/schedule/#kit", "Paralegal kit"), ("secondary", "/", "Back to the home page")])),
    dict(slug="payment-received", title="Payment received", noindex=True, seo="Payment received | Denninger Resolutions",
         body=simple("Payment received", "Thank you. Your payment is complete.",
                     ["Your receipt arrives by email from the payment processor. Questions about an invoice: " + EMAIL + "."],
                     [("secondary", "/", "Back to the home page")])),
    dict(slug="privacy-policy", title="Privacy Policy", id=3, seo="Privacy Policy | Denninger Resolutions",
         body=simple("Privacy", "Privacy policy.",
                     ["This policy is being finalized and will be posted here before launch.",
                      "Information you send through this site's forms is used only to respond to you and to schedule and administer mediations. Card and bank details are entered on the payment processor's secure form and never reach this website.",
                      "Questions: " + EMAIL + "."])),
    dict(slug="terms", title="Terms", seo="Payment and Cancellation Terms | Denninger Resolutions",
         body=simple("Terms", "Payment and cancellation terms.",
                     ["Fees, when they are due, how they are split, and postponement and cancellation terms are set out in <a href=\"/schedule/#fees\">Fees and policies</a>.",
                      "Full terms of use for this website will be posted here before launch. Questions: " + EMAIL + "."],
                     [("secondary", "/schedule/#fees", "Fees and policies")])),
    dict(slug="accessibility", title="Accessibility", seo="Accessibility | Denninger Resolutions",
         body=simple("Accessibility", "Accessibility.",
                     ["I want this website, and every mediation, to be usable by everyone. The site is built to meet WCAG 2.2 Level AA: readable contrast, visible focus, keyboard navigation and descriptive labels.",
                      "If anything on the site is hard to use, or a party needs an accommodation for the conference itself, email " + EMAIL + " or call and I will help directly."],
                     [("secondary", "/mediation-center/", "Accommodations at the suite")])),
]

existing = {p["slug"]: p["id"] for p in api("GET", "wp/v2/pages?per_page=100&status=any&_fields=id,slug")}
ids = {}
for p in PAGES:
    data = {"title": p["title"], "slug": p["slug"], "status": "publish", "content": block(p["body"]),
            "template": "dr-full-width.php", "comment_status": "closed", "ping_status": "closed",
            "meta": {"_dr_seo_title": p["seo"], "_dr_seo_desc": p.get("desc", ""), "_dr_noindex": bool(p.get("noindex"))}}
    pid = p.get("id") or existing.get(p["slug"])
    r = api("POST", f"wp/v2/pages/{pid}" if pid else "wp/v2/pages", data)
    ids[p["slug"]] = r["id"]
    raw_len = len(p["body"]); saved = r["content"]["raw"] if "raw" in r["content"] else ""
    print(p["slug"], r["id"], r["link"], "template=", r.get("template"), "stored_ok=", p["body"][:200] in saved if saved else "n/a")
json.dump(ids, open(Path(JAR).with_name("page_ids.json"), "w"))
