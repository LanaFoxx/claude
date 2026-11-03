# Snow Bentley Realty: Design Reference (for Claude Design)

Source: https://snowbentley.com/ (Luxury Presence "Visionary" theme). Captured 2026-11-03.
Screenshots: `screenshot-desktop.png` (1440w), `screenshot-mobile.png` (390w). Raw page: `index.html`.

## Fonts (Google Fonts)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
```
- **Headings:** Cormorant Garamond (serif), weight 300–400, UPPERCASE, letter-spacing 2px
- **Body / UI:** Jost (sans), body weight 300; labels and buttons 500–600, uppercase

## Color tokens
```css
:root {
  --accent:        #3A2C26; /* espresso brown: primary text, buttons, dark panels */
  --accent-2:      #937C5C; /* bronze/taupe: eyebrow labels, rules, hover */
  --ink:           #261E17; /* footer text */
  --bg-cream:      #F5EFE7; /* main section background */
  --bg-sand:       #EDE5DA; /* side panels / alt blocks */
  --bg-stone:      #EEEDE9; /* testimonials backdrop */
  --bg-white:      #FFFFFF;
  --bg-dark:       #1A1A1A;
  --overlay:       rgba(0,0,0,.30); /* image/video overlay */
  --link-on-dark:  rgba(255,255,255,.7);
}
```

## Type scale (desktop)
| Element | Font | Size / line-height | Weight | Notes |
|---|---|---|---|---|
| H1 (hero) | Cormorant Garamond | 58 / 1.03 | 400 | uppercase, ls 2px, white |
| H2 (section) | Cormorant Garamond | 48 / 1.15 | 400 | uppercase, ls 2px, #3A2C26 |
| H3 | Cormorant Garamond | 40 / 1.14 | 400 | uppercase, ls 2px |
| H4 (card overlay) | Cormorant Garamond | 32 / 1.12 | 300 | uppercase, ls 2px |
| H5 | Cormorant Garamond | 24 / 1.17 | 300 | uppercase |
| Body | Jost | 18 / 1.38 | 300 | rgba(0,0,0,.8) or #3A2C26 |
| Eyebrow / label | Jost | 12 / 1.33 | 400–600 | uppercase, ls .5px, #937C5C |
| Nav links | Jost | ~13–14 | 300–400 | uppercase, white over hero |

## Components
- **Buttons:** pill shape (`border-radius: 999px`), Jost 12px, 600, uppercase, padding ~14px 28px.
  - Primary: bg #3A2C26, white text
  - Secondary: transparent, 1px #3A2C26 border
  - On dark/photo: white bg, dark text
- **Inputs:** pill (`border-radius: 28px`), 1px #3A2C26 border, transparent bg, padding 16px 26px, Jost 16px 300
- **Eyebrow pattern:** small uppercase bronze label (e.g. "MEET", "LOCAL EXPERTISE") with a short 1px bronze rule (~80px) to its left, or centered above the heading with a small rule under it
- **Image cards:** full-bleed photos, no radius, large serif uppercase label bottom-left in white
- **Dark info box:** #3A2C26 panel overlapping an image ("EXPLORE ATHERTON" + "READ MORE >")
- **Round icon buttons:** 40px circles (dark brown, or white on photos) for carousel arrows and social icons
- **Corners:** square everywhere except pills and circles. No shadows. Lots of whitespace.
- **Section padding:** 96px desktop / 64px mobile. Content max width about 1300px.

## Page structure (homepage, top to bottom)
1. **Header:** transparent over the hero. Logo (compass mark + "SNOW BENTLEY / REALTY") on the left; uppercase nav on the right (Home Search, Home Valuation, What We're Looking For, Let's Connect, phone, Language), then a round menu button.
2. **Hero:** full-viewport video/photo of the SF skyline at dusk with a dark overlay. Centered eyebrow, H1, two subtitle lines, then a pill search input next to a white "SEARCH" pill.
3. **My Vision:** cream bg, centered H2 and one-line mission, three tall image cards (Buy / Let's Connect / Sell).
4. **Home Valuation:** photo bg with overlay, H2 "How much is your home worth?", three checkmark bullets, wide pill address input and a "HOME VALUATION" button.
5. **Meet Snow:** cream bg. Portrait on the left (~45%); on the right an eyebrow, H2 name, bold Jost subheads, bio paragraphs, license line, and Primary + Secondary buttons.
6. **Testimonials:** photo bg with a large white card on top. Square brown quote-icon tile, serif quote text (~28px), "Read more", the author's name, round arrows, and a "VIEW ALL" white pill.
7. **Search Listings:** cream, centered H2. One large tile on the left and two stacked tiles on the right (Commercial Sales / Commercial Leasing / Luxury Residential).
8. **Neighborhoods:** an eyebrow and H2 with round arrows on the right. A list of areas on the left (uppercase, divider lines, chevron on the active one) and a large image on the right with an overlapping dark box. Ends with a "VIEW ALL" dark pill.
9. **Newsletter + Work With Snow:** white bg with two columns. Left: cream card with a centered eyebrow, H2, text, pill email input, consent checkbox and "SUBSCRIBE". Right: eyebrow, H2, text, "LET'S CONNECT" button, an "or" divider and the phone number.
10. **Footer:** cream. Brokerage logo, name, contact and address columns, a vertical divider, round social icons, and inline nav rows with underlined links separated by pipes. Small legal text, Realtor/EHO logos, and "Powered by" plus copyright at the bottom.

## Mood
Quiet luxury, warm neutrals (cream, sand, espresso, bronze), editorial serif headlines, airy light-weight sans body, big photography with dark overlays.
