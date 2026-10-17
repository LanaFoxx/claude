// How to Become a CTEC Tax Preparer (page 84) – Claude Design "How to Become a CTEC Tax Preparer". Text verbatim from the design.
const { URL } = require('../lib.cjs');
const { guidePage } = require('./_guide.cjs');

const STEPS = [
 {
  "num": "01",
  "title": "New Preparer Application with the California Tax Education Council (CTEC)",
  "paragraphs": [
   "The very first step to becoming a CTEC Registered Tax Preparer (CRTP) is to complete a New Preparer Application with the California Tax Education Council (CTEC). There are three (3) steps to this process:"
  ],
  "sub": [
   {
    "label": "STEP 1 –",
    "text": "Complete the New Preparer Application online at the California Tax Education Council (CTEC) website.",
    "href": "https://www.ctec.org/App/Preparer/NewApplication/index",
    "linkText": "Click here to go to the application page."
   },
   {
    "label": "STEP 2 –",
    "text": "Complete the Live Scans Process. You must pass a background check and undergo a fingerprinting scan (Live Scan Process) in order to register with CTEC.",
    "href": "https://www.ctec.org/App/Preparer/NewApplication/index",
    "linkText": "Click here for more information on this step."
   },
   {
    "label": "STEP 3 –",
    "text": "CTEC Notification of Live Scan Approval or Denial.",
    "href": "https://www.ctec.org/App/Preparer/NewApplication/index",
    "linkText": "Click here for more information on this step."
   }
  ],
  "note": "You have the option to start your required 60-Hour Qualifying Education (QE) Course before beginning the New Preparer Online Application; however, if you take the 60-Hour QE Course but do NOT pass the new CTEC requirements of a background check and fingerprinting procedure (Live Scan), you will not be able to register with CTEC. If you purchase the 60 hour QE course with California Tax Courses, but do NOT pass your background check, we will issue you a full refund as long as proof of CTEC Denial is provided to us."
 },
 {
  "num": "02",
  "title": "Complete a CTEC Approved 60 Hour Qualifying Education Tax Course",
  "paragraphs": [
   "After you’ve completed the first step of applying to CTEC as a new preparer and have received your CTEC Notification of Live Scan Approval, you’re ready for the second step which is to enroll in and complete a CTEC 60 hour qualifying education course. This course teaches you everything you need to know to prepare Federal and California tax returns. You can enroll in this course any time of the year, and take it at your own pace."
  ],
  "ctaHref": URL.c60,
  "ctaLabel": "Click here To View CTEC 60 Hour Course"
 },
 {
  "num": "03",
  "title": "Obtain a PTIN (Preparer Tax Identification Number) from the IRS",
  "paragraphs": [
   "The second step in becoming a CRTP is to obtain your PTIN (Preparer Tax Identification Number) with the IRS. Your PTIN number is issued by the IRS to paid tax return preparers. It is used as the tax return preparer’s identification number and, when applicable, must be placed in the Paid Preparer section of a tax return that the tax return preparer prepared for compensation. You can obtain a PTIN number for free by going to the IRS website. You can apply for your PTIN at anytime before, during, or after taking the CTEC 60 Hour course."
  ],
  "ctaHref": "https://rpr.irs.gov/datamart/mainMenuUSIRS.do",
  "ctaLabel": "Get your PTIN"
 },
 {
  "num": "04",
  "title": "Purchase a $5,000 Tax Preparer Bond",
  "paragraphs": [
   "To become a CTEC Registered Tax Preparer, you must have a Tax Preparer Bond that gives you coverage up to and including $5000. This is a legal requirement in California, so it is essential that you maintain your coverage. California Tax Preparer Bonds typically cost anywhere from $20-$30 a year.",
   "Think of a bond as the equivalent to insurance; a form of protection for the local community, should your actions cause specific problems or issues.",
   "Simply go to google.com and type the keyword “California Tax Preparer Bond” and shop around!"
  ]
 },
 {
  "num": "05",
  "title": "Register with the California Tax Education Council and pay the $100 Registration Fee",
  "paragraphs": [
   "Once you’ve completed the first three steps, you can then go online to ctec.org and register as a CRTP (CTEC Registered Tax Preparer). You must also pay the $100 Registration fee online while registering. You must register within 18 months from the time you’ve completed the 60 hour qualifying education course. If you wait until after 18 months, you’ll be required to retake the CTEC 60 hour qualifying education course."
  ]
 }
];

module.exports = {
  slug: 'new-become', title: 'How to Become a CTEC Tax Preparer (new design preview)', liveId: 84, kind: 'page',
  build: guidePage({ thin: "How to Become a", bold: "Tax Preparer in California", steps: STEPS }),
};
