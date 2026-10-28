// CTEC 20 Hour Course (WooCommerce product 48) – Claude Design "CTEC 20 Hour Course".
const { URL } = require('../lib.cjs');
const { coursePage } = require('./_course.cjs');

module.exports = coursePage({
  slug: 'new-course-20', title: 'CTEC 20 Hour Course (new design preview)', liveId: 48,
  pill: 'Continuing Education',
  h1: 'CTEC 20 Hour Course<span class="ctc-block" style="font-size:.6em;margin-top:8px;color:#B8901F">Course Is Now Available To Start Today!</span>',
  intro: [
    ['All CTEC Registered Tax Preparers are required to complete 20 Hours of CTEC Continuing Education and renew their registration by October 31st. Our 20 Hour CTEC Renewal Course (20 hour continuing education) is fully updated with all of the latest federal and state tax laws and is good for both CTEC CE and IRS AFSP CE Credit.'],
    ['All earned credits will be reported to CTEC and the IRS.', true],
    ['This course is an online “Take at your own pace” interactive video and reading course. You can watch the videos online at your own pace, or if you prefer reading, you can download the PDF which can be read online or printed and read while away from the computer.'],
  ],
  heroCta: 'Enroll Now — from $69.95 →',
  laptop: '20-v3', // same laptop explainer as home / 60 hour, with 20 Hour CE Course screens
  caption: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.',
  enrollTitle: '<span class="ctc-thin">Two ways to</span> enroll.',
  packages: [
    { name: 'Online Video Course', price: '69.95', was: '79.95', desc: '24/7 Online Access to our courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.', label: 'Order Now →', url: URL.order(9293), variant: 'navy' },
    { book: true, name: 'Online Video Course + Book Package', price: '149.95', was: '199.95', desc: 'Access to the online course and exams, plus a physical book will be shipped to you that includes all of the same content in the online course. This is great for taking physical notes, highlighting certain topics, and studying while away from the computer.', label: 'Order With Book →', url: URL.order(9294) },
  ],
  features: [
    ["CTEC &amp; IRS Approved", "California Tax Courses is Approved by the California Tax Education Council (CTEC) and the IRS to offer Continuing Education. Our CTEC Provider number is 6280. Our IRS Provider number is HPKCW."],
    ["Updated with the Latest Tax Laws", "All of our courses are updated each year to reflect all of the latest tax law changes."],
    ["Instant Reporting To CTEC", "We know how important it is that your hours are reported to CTEC in order for you to renew your CTEC Registration. There is no delay: our system automatically reports your completion to CTEC instantly upon your completion."],
    ["Fully Online Video Course, Optional Book", "Students can purchase the Physical Book Package which includes 24/7 access to the online courses and exam, plus an additional book that is shipped to you that includes all of the online course content, except in physical book format. This is great for taking physical notes, highlighting certain topics, and studying while away from the computer."],
    ["Access from computer or smartphone", "Our CTEC Approved courses can all be accessed online via a computer, laptop, tablet, or even smartphone. As long as you have internet access on your device, you can access your course! Courses are available 24/7 to be taken at your own pace. All progress is tracked and saved, so you can log off and return to where you left off."],
    ["Instant Enrollment, Instant Test Results", "When you purchase the CTEC 20 Hour Course, you will immediately be given access to the course so you can start right away. All exams are automatically graded with instant results, so you're not waiting around for anyone. And don't worry, if you don't pass, you can retake the exam as many times as needed."],
    ["Unlimited Attempts At Exam!", "Don’t worry if you don’t pass your exam first try, you can re-take it as many times as needed."],
  ],
  after: ['What To Do After Completing the 20 Hour Continuing Education Course', URL.TODO_after20],
  finalSmall: 'CTEC 20 Hour Course from $69.95',
});
