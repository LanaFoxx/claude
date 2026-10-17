// How to Renew Your CTEC Registration (page 81) – Claude Design "How to Renew Your CTEC Registration". Text verbatim from the design.
const { URL } = require('../lib.cjs');
const { guidePage } = require('./_guide.cjs');

const STEPS = [
 {
  "num": "01",
  "title": "Complete a CTEC 20 Hour Continuing Education Course from a CTEC Approved Education Provider.",
  "paragraphs": [
   "The course should include 15 hours of federal tax law topics and 5 hours of California tax law topics. We offer this course in a bundle that includes all 20 hours."
  ],
  "ctaHref": URL.c20,
  "ctaLabel": "Click Here to view CTEC 20 HR Course"
 },
 {
  "num": "02",
  "title": "Renew your PTIN (Preparer Tax Identification Number) Number with the IRS each year.",
  "paragraphs": [
   "You can renew your PTIN number for free on the IRS website."
  ],
  "ctaHref": "https://rpr.irs.gov/datamart/mainMenuUSIRS.do",
  "ctaLabel": "Renew your PTIN"
 },
 {
  "num": "03",
  "title": "Maintain a $5,000 Tax Preparer Bond",
  "paragraphs": [
   "You can purchase tax preparer bonds from many different places online, and they typically cost anywhere in between $25 and $40."
  ]
 },
 {
  "num": "04",
  "title": "Renew your registration and pay the $33 annual registration before October 31 of each year.",
  "paragraphs": [
   "You can renew your CTEC Registration by going to CTEC.org. You cannot renew your registration until the first three steps have been completed."
  ],
  "note": "If you renew your registration after October 31st, a $55 dollar late fee will be applied and you will have until January 15th to renew. If you fail to renew by January 15th, your CTEC Registration will be revoked."
 }
];

module.exports = {
  slug: 'new-renew', title: 'How to Renew Your CTEC Registration (new design preview)', liveId: 81, kind: 'page',
  build: guidePage({ thin: "How To Renew Your", bold: "CTEC Registration", steps: STEPS }),
};
