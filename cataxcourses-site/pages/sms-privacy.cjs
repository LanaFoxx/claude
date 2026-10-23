// SMS Privacy Policy (new page, /sms-privacy-policy/) – standalone privacy policy for the texting program (SMS 10DLC registration): no consent-based sharing language.
const { legalPage } = require('./_legal.cjs');

const SECTIONS = [
 {
  "title": "",
  "ps": [
   "This SMS Privacy Policy explains how California Tax Courses (https://cataxcourses.com) collects, uses and protects information in connection with our text messaging program. It applies to everyone who opts in to receive text messages from us at https://cataxcourses.com/sms-opt-in/."
  ]
 },
 {
  "title": "INFORMATION WE COLLECT",
  "ps": [
   "When you opt in to text messages, we collect your mobile phone number, your first and last name (if provided), your email address (if provided), and a record of your SMS consent, including the date and time you opted in."
  ]
 },
 {
  "title": "HOW WE USE YOUR INFORMATION",
  "ps": [
   "We use your mobile phone number only to send the text messages you agreed to receive from California Tax Courses: replies to your questions, course and enrollment support, and CTEC deadline reminders. Message frequency varies. Message and data rates may apply."
  ]
 },
 {
  "title": "NO SHARING OF MOBILE INFORMATION",
  "ps": [
   "No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.",
   "We do not sell, rent, lease or share your mobile phone number or SMS opt-in data and consent with anyone. This applies in all cases, including if you give consent: SMS opt-in data and consent are never shared."
  ]
 },
 {
  "title": "HOW TO OPT OUT",
  "ps": [
   "You can stop receiving text messages at any time by replying STOP to any message from California Tax Courses. You will receive one final message confirming you have been unsubscribed, and no further messages will be sent. For help, reply HELP, call (888) 229-1994 (Monday – Friday, 9am – 4pm PST), or email help@cataxcourses.com."
  ]
 },
 {
  "title": "HOW WE PROTECT YOUR INFORMATION",
  "ps": [
   "Your information is stored on our secured website systems and is accessible only to California Tax Courses staff who need it to respond to you and support your course."
  ]
 },
 {
  "title": "RELATED TERMS",
  "ps": [
   "SMS Terms & Conditions: https://cataxcourses.com/sms-terms-and-conditions/",
   "Opt-in form: https://cataxcourses.com/sms-opt-in/"
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
  slug: 'sms-privacy-policy', title: 'SMS Privacy Policy', kind: 'newpage',
  build: legalPage({ thin: 'How we handle your information for text messages.', bold: 'SMS Privacy Policy', sections: SECTIONS }),
};
