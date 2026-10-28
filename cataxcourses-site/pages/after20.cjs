// What To Do After Completing the 20 Hour Continuing Education Course (new page, /what-to-do-after-completing-the-20-hour-course/) – Claude Design "What To Do After Completing the 20 Hour Course". Text verbatim from the design.
const { URL } = require('../lib.cjs');
const { guidePage } = require('./_guide.cjs');

const STEPS = [
 {
  "num": "01",
  "title": "Confirm your hours were reported to CTEC and the IRS",
  "paragraphs": [
   "Our system automatically reports your completion to CTEC instantly upon your completion, with no delay. Your completion is also reported to the IRS. You can also download your completion certificate at any time from your student account.",
   "Log in to your CTEC account at ctec.org to confirm your 20 hours of Continuing Education are showing. Make sure your PTIN, CTEC ID, or last six SSN digits are on your student profile, as we cannot report your completion without that information. If you need your hours reported sooner, reach out to our support team by email, phone, or live chat."
  ],
  "ctaHref": URL.login,
  "ctaLabel": "Log in to download your certificate"
 },
 {
  "num": "02",
  "title": "Renew your PTIN with the IRS",
  "paragraphs": [
   "Your Preparer Tax Identification Number (PTIN) must be renewed each year. PTIN renewal opens in mid-October for the upcoming tax season. You can renew your PTIN for free on the IRS website."
  ],
  "ctaHref": "https://rpr.irs.gov/datamart/mainMenuUSIRS.do",
  "ctaLabel": "Renew your PTIN"
 },
 {
  "num": "03",
  "title": "Make sure your $5,000 Tax Preparer Bond is current",
  "paragraphs": [
   "To stay registered with CTEC you must maintain a Tax Preparer Bond that gives you coverage up to and including $5000. Check the expiration date on your bond and renew it with your bond provider if it has lapsed. California Tax Preparer Bonds typically cost anywhere from $20-$30 a year."
  ]
 },
 {
  "num": "04",
  "title": "Renew your CTEC registration and pay the renewal fee",
  "paragraphs": [
   "With your 20 hours reported, your PTIN renewed, and your bond current, log in to ctec.org and complete your registration renewal. The deadline to renew is October 31st. You must have your 20 Hour Continuing Education course completed and CTEC fees paid by this date in order to complete your registration renewal.",
   "If you miss the October 31st deadline, CTEC allows a late renewal through January 15th with a late fee. If you do not renew by January 15th, you will be required to retake the 60 Hour Qualifying Education course and register as a new preparer."
  ],
  "ctaHref": "https://www.ctec.org/",
  "ctaLabel": "Renew at ctec.org"
 },
 {
  "num": "05",
  "title": "Stay on schedule for next year",
  "paragraphs": [
   "CTEC Registered Tax Preparers must complete 20 hours of Continuing Education and renew their registration every year by October 31st. Our CTEC 20 Hour Continuing Education Course is updated annually with the latest federal and state tax laws and is good for both CTEC CE and IRS AFSP CE credit."
  ],
  "ctaHref": URL.c20,
  "ctaLabel": "View the CTEC 20 Hour Course"
 }
];

module.exports = {
  slug: 'what-to-do-after-completing-the-20-hour-course', title: 'What To Do After Completing the 20 Hour Continuing Education Course', kind: 'newpage',
  build: guidePage({
    thin: 'What To Do After Completing the', bold: '20 Hour Continuing Education Course', steps: STEPS,
    label: 'Next Steps', dark: true,
    intro: "Congratulations on finishing your CTEC 20 Hour Continuing Education Course! Your hours are reported to CTEC instantly, with no delay, and to the IRS. Here is what to do next to complete your CTEC registration renewal before the October 31st deadline.",
    callThin: 'Still have questions about your next steps?', callPlain: true,
  }),
};
