// California Tax Law – 5 Hours (WooCommerce simple product 89) – Claude Design "California Tax Law 5 Hours".
const { URL } = require('../lib.cjs');
const { coursePage } = require('./_course.cjs');

module.exports = coursePage({
  productImage: { id: 9297, url: 'https://cataxcourses.com/wp-content/uploads/2022/03/California-Tax-Law-5-Hours.png', alt: 'California Tax Law - 5 Hours' },
  slug: 'new-course-calaw', title: 'California Tax Law 5 Hours (new design preview)', liveId: 89,
  pill: 'Continuing Education Course',
  h1: 'California Tax Law<span class="ctc-thin ctc-block" style="font-size:.6em;margin-top:8px">5 Hours Continuing Education</span>',
  intro: [
    ['For CTEC Registered Tax Preparers who need only 5 hours of CE in California Tax Law Category.'],
    ['All earned credits will be reported to CTEC.', true],
    ['This course is an online “Take at your own pace” interactive video and reading course. You can watch the videos online at your own pace, or if you prefer reading, you can download the PDF which can be read online or printed and read while away from the computer.'],
  ],
  heroCta: 'Enroll Now — $29.95 →',
  caption: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.',
  enrollTitle: '<span class="ctc-thin">Enroll</span> today.',
  packages: [
    { name: 'Online Video Course', price: '29.95', desc: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.', label: 'Order Now →', url: URL.order(89) },
  ],
  features: [
    ["CTEC &amp; IRS Approved", "California Tax Courses is Approved by the California Tax Education Council (CTEC) to offer Continuing Education. Our CTEC Provider number is 6280."],
    ["Updated with Latest 2022 Tax Laws", "All of our courses are updated each year to reflect all of the latest tax law changes."],
    ["Completion Reported To CTEC In 24 Hours", "We know how important it is that your hours are reported to CTEC in order for you to renew your CTEC Registration. We make sure all students course completions are reported directly to CTEC within 3 days. Typically your hours will be reported within 24 hours, but can take up to three (3) days. You can request for your hours to be reported quicker by reaching out to our support team via email, phone, or live chat."],
    ["Fully Online Video Course", "Includes 24/7 access to the online courses and exam."],
    ["Access from computer or smartphone", "Our CTEC Approved courses can all be accessed online via a computer, laptop, tablet, or even smartphone. As long as you have internet access on your device, you can access your course! Courses are available 24/7 to be taken at your own pace. All progress is tracked and saved, so you can log off and return to where you left off."],
    ["Instant Enrollment, Instant Test Results", "After purchase, you will immediately be given access to the course so you can start right away. All test are automatically graded with instant results, so you're not waiting around for anyone. And don't worry, if you don't pass, you can retake the exam as many times as needed."],
    ["Unlimited Attempts At Exam!", "Don’t worry if you don’t pass your exam first try, you can re-take it as many times as needed."],
  ],
  after: ['What To Do After Completing the 60 Hour Qualifying Education Course', URL.TODO_after60],
  finalSmall: 'California Tax Law 5 Hours — $29.95',
});
