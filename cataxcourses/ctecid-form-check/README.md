# CTEC ID check on the "Enter Your CTEC ID and PTIN" forms

`ctecid-check.html` is appended to Site administration → Appearance → Additional HTML → "Before BODY is closed".
On any feedback form with a "CTEC ID" question it:
- tidies the entry (uppercase, removes spaces/dashes),
- blocks submission unless it is a letter + 6 digits, with the message
  "Invalid CTEC ID. It must be the letter A followed by 6 digits, for example A123456.",
- checks the ID with CTEC's public lookup (provider.ctec.org/api/CTECIDLookup) and blocks IDs CTEC has no
  record of; shows the preparer name for valid IDs. If CTEC's lookup is down, the student is not blocked.

`footer-before.html` is the footer setting before this was added (restore it to remove the check).
This is a browser-side check; the CTEC reporting plugin still flags any bad ID at completion.
