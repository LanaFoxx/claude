// Federal Tax Law Updates - 3 Hours (WooCommerce simple product 105) – same layout as the CA Tax Law 5 Hours design (no separate design); text from the live page.
const { URL } = require('../lib.cjs');
const { coursePage } = require('./_course.cjs');

module.exports = coursePage({
  productImage: { id: 9302, url: 'https://cataxcourses.com/wp-content/uploads/2022/03/Federal-Tax-Law-Updates-3-Hours.png', alt: 'Federal Tax Law Updates - 3 Hours' },
  slug: 'new-course-fedupd', title: 'Federal Tax Law Updates 3 Hours (new design preview)', liveId: 105,
  pill: 'Continuing Education Course',
  h1: 'Federal Tax Law Updates<span class="ctc-thin ctc-block" style="font-size:.6em;margin-top:8px">3 Hours Continuing Education</span>',
  intro: [
    ['For CTEC Registered Tax Preparers who need only 3 hours of CE in Federal Tax Law Updates Category.'],
    ['All earned credits will be reported to CTEC and the IRS.', true],
    ['This course is an online “Take at your own pace” interactive video and reading course. You can watch the videos online at your own pace, or if you prefer reading, you can download the PDF which can be read online or printed and read while away from the computer.'],
  ],
  heroCta: 'Enroll Now — $29.95 →',
  caption: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.',
  enrollTitle: '<span class="ctc-thin">Enroll</span> today.',
  packages: [
    { name: 'Online Video Course', price: '29.95', desc: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.', label: 'Order Now →', url: URL.order(105), soldOut: true }, // out of stock in WooCommerce
  ],
  features: [
    ["CTEC &amp; IRS Approved", "California Tax Courses is Approved by the California Tax Education Council (CTEC) and the IRS to offer Continuing Education. Our CTEC Provider number is 6280. Our IRS Provider number is HPKCW."],
    ["Updated with the Latest Tax Laws", "All of our courses are updated each year to reflect all of the latest tax law changes."],
    ["Instant Reporting To CTEC", "We know how important it is that your hours are reported to CTEC in order for you to renew your CTEC Registration. There is no delay: our system automatically reports your completion to CTEC instantly upon your completion."],
    ["Fully Online Video Course", "Includes 24/7 access to the online courses and exam."],
    ["Access from computer or smartphone", "Our CTEC Approved courses can all be accessed online via a computer, laptop, tablet, or even smartphone. As long as you have internet access on your device, you can access your course! Courses are available 24/7 to be taken at your own pace. All progress is tracked and saved, so you can log off and return to where you left off."],
    ["Instant Enrollment, Instant Test Results", "After purchase, you will immediately be given access to the course so you can start right away. All test are automatically graded with instant results, so you're not waiting around for anyone. And don't worry, if you don't pass, you can retake the exam as many times as needed."],
    ["Unlimited Attempts At Exam!", "Don’t worry if you don’t pass your exam first try, you can re-take it as many times as needed."],
  ],
  after: ['What To Do After Completing the 20 Hour Continuing Education Course', URL.TODO_after20],
  finalSmall: 'Federal Tax Law Updates 3 Hours — $29.95',
});
