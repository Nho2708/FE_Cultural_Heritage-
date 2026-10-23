import type { PrivacyPolicy } from './types';

// Bản tiếng Anh của Chính sách quyền riêng tư, dịch sát bản tiếng Việt (vi.ts); bản tiếng Việt là bản áp dụng khi có khác biệt.

export const en: PrivacyPolicy = {
  title: 'Privacy policy',
  description: 'What data DiViet collects, what it is used for, who it is shared with, how long it is kept and what rights you have over your data.',
  updatedLabel: 'Last updated',
  translationNote: 'This is a translation of the Vietnamese privacy policy. If the two versions differ, the Vietnamese version applies.',
  intro: [
    'DiViet is a platform that helps schools and teachers create lessons and quizzes about Vietnamese heritage, and lets everyone explore that heritage. This policy explains what data DiViet collects, what it is used for, who it is shared with, how long it is kept and what rights you have over your data.',
    'The policy covers the learning website https://diviet.id.vn, the administration website https://quantri.diviet.id.vn and the DiViet app for Android.',
  ],
  contentsLabel: 'Contents',
  sections: [
    {
      id: 'ben-chiu-trach-nhiem',
      heading: '1. Who is responsible for your data',
      body: [
        'DiViet is built and run by the DiViet development team, a group of students working on their graduation project. The team decides the purposes and means of processing the personal data described in this policy.',
        'Please send any question or request about personal data to support@diviet.id.vn.',
      ],
    },
    {
      id: 'du-lieu-thu-thap',
      heading: '2. Data we collect',
      body: [
        'What we collect depends on how you use DiViet:',
        [
          'Visitors (no account needed): an anonymous device code generated at random by the browser or the app; the device type (web, Android, iOS); the language in use; whether you turned on "Near you"; your history of searches, views, narration and 3D model views; and the summaries you unlocked by watching an ad. We do not ask visitors for a name, email address or phone number, and we never link a device code to a student account.',
          'Students: accounts are created by a teacher or the school and hold the student code (used as the username), full name, class, school level and school; passwords are stored only as hashes. While students learn, the system stores their quiz attempts, answers, scores, progress and last sign-in time. Students do not have to give an email address or phone number.',
          'Teachers, school administrators and system administrators: full name, email address, username and school; a phone number and profile photo if you add them yourself; the lessons, questions and content you create; and a log of important actions (for example creating accounts, resetting passwords, payments) together with the IP address.',
          'Schools: the school name, address, phone number and email address; the plans purchased, invoices and the transaction results returned by VNPay (transaction code, amount, status). DiViet never receives or stores card numbers or bank account details.',
          'The contact form on the For schools page: the school name, province, contact person, position, email address, phone number and message you enter. This information is emailed to the development team so we can reply and is not stored in the DiViet database.',
          'Location: only when you turn on "Near you" or use Directions and allow the browser or app to use your location. For "Near you", the coordinates are rounded to about 110 m, used only to work out distances to heritage sites and then discarded, never stored. For directions, your location goes straight from your device to the routing service (section 5), not through DiViet servers.',
          'Technical data: like any website, the server keeps access logs with the IP address, time, requested path and browser type, to operate the service, fix errors and prevent abuse.',
        ],
      ],
    },
    {
      id: 'muc-dich',
      heading: '3. How we use data',
      body: [
        [
          'To provide the features: signing in, studying lessons, taking and marking quizzes, progress reports for teachers, and history and heritage suggestions for visitors.',
          'To send necessary emails to adult accounts: setting a first password, resetting a forgotten password, replying to schools that contact us.',
          'To process plan purchases made by schools.',
          'To unlock summaries and narration after Google confirms that a visitor watched the whole ad.',
          'To keep the system safe: access control, protection against password guessing and abuse, and incident investigation.',
          'To produce aggregate statistics that are not tied to any person (for example how many times a heritage site was viewed) to improve the content.',
        ],
        'We do not sell personal data, we do not use student data for advertising and we do not build advertising profiles of students.',
      ],
    },
    {
      id: 'quang-cao',
      heading: '4. Advertising',
      body: [
        'Signed-in students never see ads. Visitors may choose to watch a short Google ad to unlock the summary and narration of one heritage site for 24 hours; everything else is free and needs no ad.',
        [
          'In the Android app, ads are provided by Google AdMob. Because students and children also use the app, every ad request is marked as directed to children: Google shows only non-personalized ads with content suitable for all ages, and the app does not read the device advertising ID. Google may still use technical information about the device to deliver and measure ads and to prevent fraud.',
          'On the website, Google ad code (Google Ad Manager) is loaded only when you choose to watch an ad, and DiViet requests non-personalized ads.',
          'To unlock the right device, DiViet sends Google the anonymous device code and the heritage code; Google sends back a confirmation that you watched to the end. DiViet does not receive the device advertising ID and does not store ad content.',
        ],
        'How Google uses data when you use its partners’ sites or apps: https://policies.google.com/technologies/partner-sites',
      ],
    },
    {
      id: 'chia-se',
      heading: '5. Sharing data with third parties',
      body: [
        'We share data only with the providers DiViet needs in order to work:',
        [
          'Google Cloud: servers, database and backups, located in the Singapore region.',
          'Google AdMob and Google Ad Manager: ads for visitors (section 4).',
          'Google Gemini: the AI service used to translate and summarize heritage content and to help teachers draft lessons and questions. Only heritage content, lesson content and lesson requests are sent; student names and answers are never sent. Under the terms of this service, Google may use the content it receives to improve Google products.',
          'Google Gmail: sending system emails.',
          'VNPay: processing payments when a school buys a plan; payment details are entered directly on VNPay’s page.',
          'OpenStreetMap: maps (tile.openstreetmap.org, tile.openstreetmap.de) and routing (routing.openstreetmap.de). Your device loads map tiles directly from these servers; when you ask for directions, your location and the location of the heritage site are sent to the routing service. The button that opens Google Maps passes those two locations to Google Maps.',
          'Wikimedia Commons, Google Fonts and Cloudinary: heritage photos, fonts and the intro video are loaded directly from these services, so they receive your IP address and browser information.',
        ],
        'Because the servers are in Singapore and many providers are abroad, your data may be stored and processed outside Viet Nam. We may also disclose data when a competent state authority requires it under the law.',
      ],
    },
    {
      id: 'thoi-gian-luu',
      heading: '6. How long we keep data',
      body: [
        [
          'Visitor history: at most 90 days and the latest 500 entries per device; older entries are deleted automatically and permanently. You can delete single entries or everything at any time under My history.',
          'Ad unlocks: 12 months, then deleted automatically and permanently.',
          'Location used for "Near you": not stored.',
          'Accounts, lessons and learning results: for as long as the school uses DiViet, or until deletion is requested (section 8).',
          'Password links sent by email: expire after 48 hours (new accounts) or 30 minutes (forgotten passwords) and are stored only as hashes.',
          'Database backups: made every night and deleted automatically after 30 days.',
          'Server access logs: deleted automatically after 30 days.',
          'Invoices and payment transactions: for the period required by accounting and tax law.',
        ],
      ],
    },
    {
      id: 'bao-mat',
      heading: '7. Security',
      body: [
        'All connections to DiViet are encrypted with HTTPS. Passwords are hashed (salted PBKDF2), so no one, including the development team, can read the original password. Access is limited by role: teachers only see students in their own classes and school administrators only see their own school’s data. On the learning website, a student’s session ends when the browser tab is closed, because students often share school computers.',
        'No system is perfectly secure. If a data breach happens, we will notify the school, the affected users and the competent authorities as required by law.',
      ],
    },
    {
      id: 'quyen-cua-ban',
      heading: '8. Your rights',
      body: [
        'Under Vietnamese personal data protection law, you have the right to be informed about the processing of your data, to give or withdraw consent, and to access, correct, request deletion of and restrict the processing of your data, and to lodge complaints. How to exercise them:',
        [
          'Visitors: delete your history under My history; turn off "Near you" or the location permission; clear the website data or the app data to start again with a new device code.',
          'Students: see your information under "Hồ sơ của em" (My profile); ask your teacher to correct it, reset your password or delete your account.',
          'Teachers and school administrators: edit your own profile in the administration website; school administrators manage the teacher accounts of their school.',
          'Everyone: send a request to support@diviet.id.vn. To protect you, we may need to verify that you own the account, for example through the account’s email address or through the school.',
        ],
        'When an account is deleted on request, we delete or anonymize the personal data attached to it, except data the law requires us to keep; copies in backups disappear automatically after 30 days.',
      ],
    },
    {
      id: 'hoc-sinh-va-tre-em',
      heading: '9. Students and children',
      body: [
        'Many students who use DiViet are children. That is why:',
        [
          'Students cannot create accounts themselves; only teachers or the school create student accounts. The school is responsible for obtaining the consent of parents or guardians, and of the students where the law requires it, before creating accounts, in line with the Law on Personal Data Protection and its implementing regulations.',
          'We only collect the student data needed for learning; we do not ask for a student’s email address, phone number or home address.',
          'Signed-in students do not see ads, and student data is never used for advertising.',
          'Parents or guardians can ask to see, correct or delete their child’s data through the teacher, the school or the email address in section 11.',
        ],
      ],
    },
    {
      id: 'thay-doi',
      heading: '10. Changes to this policy',
      body: [
        'When this policy changes, we update this page and the "Last updated" date at the top. Important changes will be highlighted at the top of the page for a while.',
      ],
    },
    {
      id: 'lien-he',
      heading: '11. Contact',
      body: ['The DiViet development team. Email: support@diviet.id.vn. Website: https://diviet.id.vn'],
    },
  ],
};
