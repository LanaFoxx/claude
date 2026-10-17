// Refund Policy (page 126) – Claude Design "Refund Policy". Text verbatim from the design.
const { legalPage } = require('./_legal.cjs');

const SECTIONS = [
 {
  "title": "",
  "ps": [
   "If you are not completely satisfied with our course, we will offer you a full refund within thirty days of purchasing. No refunds given for group orders or to students who have completed more than one quiz or any final exams. NO REFUNDS ARE ISSUED AFTER THE JANUARY 15TH CTEC RENEWAL DEADLINE, IT IS UP TO YOU TO COMPLETE YOUR COURSE ONTIME. If you ordered the Online Course Physical Book Package, a refund can only be given once the physical book has been returned to us. You are responsible for paying the return shipping. All physical book returns can be shipped back to the following address:",
   "Vervante Returns, 400 N. Geneva Road STE C, Lindon, UT 84042"
  ]
 },
 {
  "title": "20 Hour Course Customers",
  "ps": [
   "Refunds will not be given to customers of the 20 hour continuing education course who missed the CTEC Renewal Deadline and are unable to renew."
  ]
 },
 {
  "title": "60 Hour Course Customers Notice",
  "ps": [
   "The CTEC 60 Hour Qualifying Education Course is valid for 1 year after purchase date. This means you have up to 1 year to complete the course for valid CTEC credit. The course will expire 1 year after the time of purchase and will no longer be valid for CTEC credit, which means we cannot report your course completion to CTEC if you took more than 1 year to finish the course. You are not entitled to a refund or a new course if your course has expired. You will need to re purchase the latest version of the 60 hour course."
  ]
 },
 {
  "title": "Requesting a Refund",
  "ps": [
   "If you are requesting a refund please call us at (888) 229-1994"
  ]
 }
];

module.exports = {
  slug: 'new-refund', title: 'Refund Policy (new design preview)', liveId: 126, kind: 'page',
  build: legalPage({ thin: "Full refund within thirty days of purchasing.", bold: "Refund Policy", sections: SECTIONS }),
};
