// CTEC 15 Hour In Lieu of Experience Course (WooCommerce simple product 93) – Claude Design "CTEC 15 Hour In Lieu of Experience Course".
const { URL } = require('../lib.cjs');
const { coursePage } = require('./_course.cjs');

module.exports = coursePage({
  productImage: { id: 9296, url: 'https://cataxcourses.com/wp-content/uploads/2022/03/15-Hour-In-Lieu-Of-Experience.png', alt: 'CTEC 15 Hour In Lieu of Experience Course' },
  slug: 'new-course-15', title: 'CTEC 15 Hour In Lieu of Experience Course (new design preview)', liveId: 93,
  pill: 'In Lieu Of Experience - 15 Hours',
  h1: 'CTEC In Lieu Of Experience <span class="ctc-thin">Course</span><span class="ctc-thin ctc-block" style="font-size:.6em;margin-top:8px">15 Hours</span>',
  intro: [
    ['For those interestested in becoming a CTEC Registered Tax Preparer and are exempt from taking the CTEC 60 Hour QE Course.'],
    ['All earned credits will be reported to CTEC.', true],
    ['The CTEC in Lieu of Experience Tax Preparation Course is for anyone who has had a CPA, EA, or Attorney License for the last two years; anyone who was employed by one of those three for the last two years; or anyone moving to CA from out of state with 2 years experience, may apply to receive an exemption from having to take the full 60-hour qualifying course. Contact CTEC to receive an Experience In Lieu of Education Application before enrolling in this course.'],
    ['This course is an online “Take at your own pace” interactive video and reading course. You can watch the videos online at your own pace, or if you prefer reading, you can download the PDF which can be read online or printed and read while away from the computer.'],
  ],
  heroCta: 'Enroll Now — $79.95 →',
  caption: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.',
  enrollTitle: '<span class="ctc-thin">Enroll</span> today.',
  packages: [
    { name: 'Online Video Course', price: '79.95', desc: '24/7 Online Access to our video courses from your Computer, Laptop, Tablet, or even your smartphone. All Exams are Included. Additional Course PDF at no extra cost.', label: 'Order Now →', url: URL.order(93) },
  ],
  features: [
    ["CTEC Approved", "California Tax Courses is Approved by the California Tax Education Council (CTEC) offer In Lieu Education. Our CTEC Provider number is 6280."],
    ["Updated with the Latest Tax Laws", "All of our courses are updated each year to reflect all of the latest tax law changes."],
    ["Instant Reporting To CTEC", "We know how important it is that your hours are reported to CTEC in order for you to renew your CTEC Registration. There is no delay: our system automatically reports your completion to CTEC instantly upon your completion."],
    ["Fully Online Video Course", "Includes 24/7 access to the online courses and exam."],
    ["Access from computer or smartphone", "Our CTEC Approved courses can all be accessed online via a computer, laptop, tablet, or even smartphone. As long as you have internet access on your device, you can access your course! Courses are available 24/7 to be taken at your own pace. All progress is tracked and saved, so you can log off and return to where you left off."],
    ["Instant Enrollment, Instant Test Results", "After purchase, you will immediately be given access to the course so you can start right away. All test are automatically graded with instant results, so you're not waiting around for anyone. And don't worry, if you don't pass, you can retake the exam as many times as needed."],
    ["Unlimited Attempts At Exam!", "Don’t worry if you don’t pass your exam first try, you can re-take it as many times as needed."],
  ],
  after: ['What To Do After Completing the 60 Hour Qualifying Education Course', URL.TODO_after60],
  finalSmall: 'CTEC 15 Hour Course — $79.95',
});
