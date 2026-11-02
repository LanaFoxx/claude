// How To Get a Professional Website For Your Tax Business (new page, /how-to-get-a-professional-website-for-your-tax-business/).
// Helpful Guides article; calls to action go to Tax Pro Design.
const L = require('../lib.cjs');
const { C, box, container, cls, band, eyebrow, H2, text, button, row } = L;
const { hero, steps } = require('./_guide.cjs');

const TPD = 'https://taxprodesign.com/';
const TPD_PORTFOLIO = 'https://taxprodesign.com/portfolio/';

const STEPS = [
  {
    num: '01',
    title: '"If you build it, they will come" only works in the movies',
    paragraphs: [
      'Before most people trust someone with their taxes, they look them up online. They search for "tax preparer near me," compare a few names, and click through to the websites. If your business doesn\'t show up, or shows up with an outdated page or just a social media profile, they move on to the next name on the list.',
      'A website only brings in clients if it is <strong>built properly</strong>: people have to be able to find it, it has to look trustworthy when they land on it, and it has to make contacting you easy. Get those three things right and the clients really will come.',
    ],
  },
  {
    num: '02',
    title: 'Make a professional first impression',
    paragraphs: [
      'Your website is often the first time a potential client "meets" you. A clean, modern design tells them you are organized, careful and current, which is exactly what they want in a tax preparer. A dated or cluttered site sends the opposite message, even if your work is excellent.',
      'Show who you are: a real photo of you or your team, your credentials (CTEC Registered Tax Preparer, Enrolled Agent, IRS AFSP), the services you offer and the areas you serve. And because most people search on their phones, the site has to look and work perfectly on mobile.',
    ],
    ctaHref: TPD_PORTFOLIO,
    ctaLabel: 'See examples of tax business websites',
  },
  {
    num: '03',
    title: 'Make it easy to get in touch',
    paragraphs: [
      'Every page should make the next step obvious. Visitors who have to hunt for your phone number usually call someone else.',
    ],
    sub: [
      { label: 'Click-to-call:', text: 'your phone number at the top of every page, tappable on phones.', href: TPD, linkText: '' },
      { label: 'Online booking or contact form:', text: 'so people can reach you after hours, during your busiest season.', href: TPD, linkText: '' },
      { label: 'Hours, address and a map:', text: 'clients want to know where you are and when you are open.', href: TPD, linkText: '' },
      { label: 'Secure document upload:', text: 'a safe way to send W-2s and 1099s instead of email attachments.', href: TPD, linkText: '' },
    ],
  },
  {
    num: '04',
    title: 'Get found on Google',
    paragraphs: [
      'A beautiful website that nobody sees won\'t bring in clients. Being found takes a site that is built for search from the start: each service has its own page, page titles mention your city and "tax preparation," the site loads fast, and it is connected to your Google Business Profile so you appear in the map results.',
      'Reviews matter here too. Ask happy clients to leave a Google review after their return is filed. More good reviews help you rank higher and give new visitors a reason to choose you.',
    ],
    note: 'Most people never scroll past the first few results on Google. Showing up there for "tax preparer" plus your city is worth more than any flyer or ad.',
  },
  {
    num: '05',
    title: 'Build trust that turns visitors into clients',
    paragraphs: [
      'People are handing you their Social Security numbers and income details, so trust is everything. Show client testimonials, explain how you protect their information, keep the site secure (the padlock in the browser), and include a short "About" section so they know the person behind the business. A clear list of what to bring to their appointment and answers to common questions save you phone calls too.',
    ],
  },
  {
    num: '06',
    title: 'Keep it current every tax season',
    paragraphs: [
      'An old copyright year or last season\'s deadlines make visitors wonder if you are still in business. Update your hours, deadlines, prices and services before each season, and announce anything new, like Spanish-language services, bookkeeping or small business returns.',
    ],
  },
  {
    num: '07',
    title: 'Do it yourself, or have it done right',
    paragraphs: [
      'Website builders look easy, but a do-it-yourself site takes many hours to get right and often ends up looking like a generic template that is hard to find on Google. Your time is better spent with clients, especially during tax season.',
      'A professional designer who works with tax businesses knows what your clients are looking for and builds the site to be found, trusted and easy to contact from day one. <strong>Tax Pro Design</strong> builds websites made specifically for tax preparers.',
    ],
    ctaHref: TPD,
    ctaLabel: 'Get a professional website from Tax Pro Design',
  },
];

// Final call to action: Tax Pro Design.
function tpdBand() {
  return band(C.navy, [
    eyebrow('Tax Pro Design', C.gold, 'center'),
    H2('<span class="ctc-thin">Ready for a website that</span><br>brings in clients?', C.white, 'center', { sizes: [52, 44, 34], lh: 1.1, settings: { _margin: box(14, 0, 18, 0) } }),
    text('Professional websites built for tax businesses: designed to make a great first impression, found on Google, and easy for clients to contact you.',
      { color: C.light, size: [19, 19, 17], lh: 1.6, maxW: 760, align: 'center', settings: { _margin: box(0, 0, 28, 0) } }),
    row([
      button('Get started at TaxProDesign.com →', TPD, { size: [21, 20, 18], pad: box(16, 28, 16, 28) }),
      button('See our portfolio →', TPD_PORTFOLIO, { variant: 'navy', size: [21, 20, 18], pad: box(16, 28, 16, 28), settings: { border_border: 'solid', border_width: box(1), border_color: C.gold } }),
    ], { justify: 'center', gap: 14, wrap: true }),
  ], { pad: [88, 88], align: 'center', cls: 'ctc-dots-dark' });
}

module.exports = {
  slug: 'how-to-get-a-professional-website-for-your-tax-business', title: 'How To Get a Professional Website For Your Tax Business', kind: 'newpage',
  build: () => [container({ content_width: 'full', padding: box(0), flex_gap: gap0(), ...cls('ctc-page') }, [
    hero('How To Get a Professional Website For', 'Your Tax Business', {
      label: 'Grow Your Business', dark: true,
      intro: 'You have done the work to become a tax preparer. Now you need clients. Here is how a properly built website helps people find you, trust you and choose you, and what to look for when you get one made.',
    }),
    steps(STEPS),
    tpdBand(),
  ], false)],
};
function gap0() { return L.gap(0); }
