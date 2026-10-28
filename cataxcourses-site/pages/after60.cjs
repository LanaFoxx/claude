// What To Do After Completing the 60 Hour Qualifying Education Course (new page, /what-to-do-after-completing-the-60-hour-course/) – Claude Design "What To Do After Completing the 60 Hour Course". Text verbatim from the design.
const { URL } = require('../lib.cjs');
const { guidePage } = require('./_guide.cjs');

const STEPS = [
 {
  "num": "01",
  "title": "Confirm your hours were reported to CTEC",
  "paragraphs": [
   "Our system automatically reports your completion to CTEC instantly upon your completion, with no delay. You can also download your completion certificate at any time from your student account.",
   "Log in to your CTEC account at ctec.org to confirm your 60 hours of Qualifying Education are showing. If you need your hours reported sooner, reach out to our support team by email, phone, or live chat."
  ],
  "ctaHref": URL.login,
  "ctaLabel": "Log in to download your certificate"
 },
 {
  "num": "02",
  "title": "Make sure your New Preparer Application and Live Scan are approved",
  "paragraphs": [
   "If you have not already done so, complete the New Preparer Application with the California Tax Education Council (CTEC) and pass the Live Scan Process (background check and fingerprinting). You must receive CTEC Notification of Live Scan Approval before you can register as a CTEC Registered Tax Preparer (CRTP)."
  ],
  "ctaHref": "https://www.ctec.org/App/Preparer/NewApplication/index",
  "ctaLabel": "Go to the CTEC New Preparer Application",
  "note": "If you completed the 60-Hour QE Course but do NOT pass the CTEC background check and fingerprinting (Live Scan), you will not be able to register with CTEC. If you purchased the 60 hour QE course with California Tax Courses and do NOT pass your background check, we will issue you a full refund as long as proof of CTEC Denial is provided to us."
 },
 {
  "num": "03",
  "title": "Obtain a PTIN (Preparer Tax Identification Number) from the IRS",
  "paragraphs": [
   "Your PTIN is issued by the IRS to paid tax return preparers and must be placed in the Paid Preparer section of every tax return you prepare for compensation. You can obtain a PTIN for free on the IRS website."
  ],
  "ctaHref": "https://rpr.irs.gov/datamart/mainMenuUSIRS.do",
  "ctaLabel": "Get your PTIN"
 },
 {
  "num": "04",
  "title": "Purchase a $5,000 Tax Preparer Bond",
  "paragraphs": [
   "To become a CTEC Registered Tax Preparer, you must have a Tax Preparer Bond that gives you coverage up to and including $5000. This is a legal requirement in California, so it is essential that you maintain your coverage. California Tax Preparer Bonds typically cost anywhere from $20-$30 a year.",
   "Simply go to google.com and type the keyword “California Tax Preparer Bond” and shop around!"
  ]
 },
 {
  "num": "05",
  "title": "Register with CTEC and pay the $100 Registration Fee",
  "paragraphs": [
   "With your hours reported, Live Scan approved, PTIN issued, and bond in hand, go online to ctec.org and register as a CRTP (CTEC Registered Tax Preparer). You must also pay the $100 Registration fee online while registering.",
   "You must register within 18 months from the time you’ve completed the 60 hour qualifying education course. If you wait until after 18 months, you’ll be required to retake the CTEC 60 hour qualifying education course."
  ],
  "ctaHref": "https://www.ctec.org/",
  "ctaLabel": "Register at ctec.org"
 },
 {
  "num": "06",
  "title": "Stay registered: complete 20 hours of continuing education every year",
  "paragraphs": [
   "Once you are a CRTP, you must complete 20 hours of CTEC Continuing Education and renew your registration with CTEC by October 31st each year. Our CTEC 20 Hour Continuing Education Course is updated annually with the latest federal and state tax laws and is good for both CTEC CE and IRS AFSP CE credit."
  ],
  "ctaHref": URL.c20,
  "ctaLabel": "View the CTEC 20 Hour Course"
 }
];

module.exports = {
  slug: 'what-to-do-after-completing-the-60-hour-course', title: 'What To Do After Completing the 60 Hour Qualifying Education Course', kind: 'newpage',
  build: guidePage({
    thin: 'What To Do After Completing the', bold: '60 Hour Qualifying Education Course', steps: STEPS,
    label: 'Next Steps', dark: true,
    intro: "Congratulations on finishing your CTEC 60 Hour Qualifying Education Course! Your hours are reported to CTEC instantly, with no delay. Here is what to do next to finish your CTEC registration and start preparing tax returns in California.",
    callThin: 'Still have questions about your next steps?', callPlain: true,
  }),
};
