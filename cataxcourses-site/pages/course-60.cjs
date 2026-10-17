// CTEC 60 Hour Course (WooCommerce product 76) – Claude Design "CTEC 60 Hour Course".
const { URL } = require('../lib.cjs');
const { coursePage } = require('./_course.cjs');

module.exports = coursePage({
  slug: 'new-course-60', title: 'CTEC 60 Hour Course (new design preview)', liveId: 76,
  pill: 'Qualifying Education',
  h1: 'CTEC 60 Hour Course',
  intro: [
    ['For those who wish to prepare tax returns for compensation in the state of California, you are required to first complete a CTEC 60 Hour Qualifying Education Course in order to become a CTEC Registered Tax Preparer. Our 60 hour qualifying education course teaches you everything you need to know about preparing California State and Federal tax returns and is approved by the California Tax Education Council.'],
    ['All earned credits will be reported to CTEC.', true],
    ['This course is an online “Take at your own pace” interactive video and reading course. You can watch the videos online at your own pace, or if you prefer reading, you can download the PDF which can be read online or printed and read while away from the computer.'],
  ],
  heroCta: 'Enroll Now — from $179.95 →',
  caption: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.',
  enrollTitle: '<span class="ctc-thin">Two ways to</span> enroll.',
  packages: [
    { name: 'Online Video Course', price: '179.95', desc: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.', label: 'Order Now →', url: URL.order(9290), variant: 'navy' },
    { book: true, name: 'Online Video Course + Book Package', price: '279.95', desc: 'Access to the online course and exams, plus a physical book will be shipped to you that includes all of the same content in the online course. This is great for taking physical notes, highlighting certain topics, and studying while away from the computer.', label: 'Order With Book →', url: URL.order(9291) },
  ],
  features: [
    ["CTEC Approved", "California Tax Courses is Approved by the California Tax Education Council (CTEC) to offer Qualifying Education. Our CTEC Provider number is 6280."],
    ["Completion Reported To CTEC In 24 Hours", "We know how important it is that your hours are reported to CTEC in order for you to renew your CTEC Registration. We make sure all students course completions are reported directly to CTEC within 3 days. Typically your hours will be reported within 24 hours, but can take up to three (3) days. You can request for your hours to be reported quicker by reaching out to our support team via email, phone, or live chat."],
    ["Unlimited Attempts At Exam!", "Don’t worry if you don’t pass your exam first try, you can re-take it as many times as needed."],
    ["Fully Online Video Course, Optional Book", "Students can purchase the Physical Book Package which includes 24/7 access to the online courses and exam, plus an additional book that is shipped to you that includes all of the online course content, except in physical book format. This is great for taking physical notes, highlighting certain topics, and studying while away from the computer."],
    ["Access from computer or smartphone", "Our CTEC Approved courses can all be accessed online via a computer, laptop, tablet, or even smartphone. As long as you have internet access on your device, you can access your course! Courses are available 24/7 to be taken at your own pace. All progress is tracked and saved, so you can log off and return to where you left off."],
    ["Instant Enrollment, Instant Test Results", "When you purchase the CTEC 60 Hour Course, you will immediately be given access to the course so you can start right away. All test are automatically graded with instant results, so you're not waiting around for anyone. And don't worry, if you don't pass, you can retake the exam as many times as needed."],
  ],
  after: ['What To Do After Completing the 60 Hour Qualifying Education Course', URL.TODO_after60],
  finalSmall: 'CTEC 60 Hour Course from $179.95',
});
