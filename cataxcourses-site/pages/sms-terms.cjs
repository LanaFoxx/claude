// SMS Terms & Conditions (new page, /sms-terms/) – the SMS section of the Terms & Conditions on its own page, for the
// SMS (10DLC) registration's "Terms & Conditions URL" (a fresh URL the reviewer's checker has no older copy of).
const { legalPage } = require('./_legal.cjs');

const SECTIONS = [
 {
  "title": "",
  "ps": [
   "These SMS Terms & Conditions apply to text messages sent by California Tax Courses (https://cataxcourses.com). They are part of our full Terms and Conditions at https://cataxcourses.com/terms-and-conditions/."
  ]
 },
 {
  "title": "SMS / TEXT MESSAGING TERMS",
  "ps": [
   "California Tax Courses offers a text messaging program for customers and students who opt in at https://cataxcourses.com/text-alerts/. By opting in, you agree to receive text messages from California Tax Courses at the mobile number you provide.",
   "Types of messages: replies to your questions, course and enrollment support (such as login help and course access), and CTEC deadline reminders. These messages help you complete your course and stay on track with your CTEC registration.",
   "Message frequency varies. Message and data rates may apply. Consent to receive text messages is not a condition of purchase.",
   "To stop receiving text messages, reply STOP at any time. After you reply STOP, you will receive one final message confirming that you have been unsubscribed, and no further messages will be sent. To opt back in, reply START.",
   "For help, reply HELP, call (888) 229-1994 (Monday – Friday, 9am – 4pm PST), or email help@cataxcourses.com.",
   "Carriers are not liable for delayed or undelivered messages. For details on how we handle your information, see our Privacy Policy at https://cataxcourses.com/privacy-policy/. Mobile phone numbers and SMS opt-in data and consent are never shared with or sold to third parties."
  ]
 },
 {
  "title": "SMS PRIVACY",
  "ps": [
   "No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties, even with your consent.",
   "Full Privacy Policy: https://cataxcourses.com/privacy-policy/"
  ]
 }
];

module.exports = {
  slug: 'sms-terms', title: 'SMS Terms & Conditions', kind: 'newpage',
  build: legalPage({ thin: 'Text messaging program terms.', bold: 'SMS Terms &amp; Conditions', sections: SECTIONS }),
};
