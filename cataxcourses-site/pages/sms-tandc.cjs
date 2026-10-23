// SMS Terms & Conditions (new page, /sms-terms-and-conditions/) – texting program terms for the SMS (10DLC) registration.
const { legalPage } = require('./_legal.cjs');

const SECTIONS = [
 {
  "title": "",
  "ps": [
   "These SMS Terms & Conditions apply to the text messaging program of California Tax Courses (https://cataxcourses.com)."
  ]
 },
 {
  "title": "PROGRAM DESCRIPTION",
  "ps": [
   "California Tax Courses offers a text messaging program for customers and students who opt in at https://cataxcourses.com/sms-opt-in/. By opting in, you agree to receive text messages from California Tax Courses at the mobile number you provide.",
   "Types of messages: replies to your questions, course and enrollment support (such as login help and course access), and CTEC deadline reminders. These messages help you complete your course and stay on track with your CTEC registration."
  ]
 },
 {
  "title": "MESSAGE FREQUENCY AND RATES",
  "ps": [
   "Message frequency varies. Message and data rates may apply. Consent to receive text messages is not a condition of purchase."
  ]
 },
 {
  "title": "OPT OUT (STOP)",
  "ps": [
   "To stop receiving text messages, reply STOP at any time. After you reply STOP, you will receive one final message confirming that you have been unsubscribed, and no further messages will be sent. To opt back in, reply START."
  ]
 },
 {
  "title": "HELP",
  "ps": [
   "For help, reply HELP, call (888) 229-1994 (Monday – Friday, 9am – 4pm PST), or email help@cataxcourses.com."
  ]
 },
 {
  "title": "CARRIERS",
  "ps": [
   "Carriers are not liable for delayed or undelivered messages."
  ]
 },
 {
  "title": "PRIVACY",
  "ps": [
   "No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties. See our SMS Privacy Policy: https://cataxcourses.com/sms-privacy-policy/"
  ]
 },
 {
  "title": "CONTACT US",
  "ps": [
   "California Tax Courses · help@cataxcourses.com · (888) 229-1994"
  ]
 }
];

module.exports = {
  slug: 'sms-terms-and-conditions', title: 'SMS Terms and Conditions', kind: 'newpage',
  build: legalPage({ thin: 'Text messaging program terms.', bold: 'SMS Terms &amp; Conditions', sections: SECTIONS }),
};
