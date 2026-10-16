// Christ Church Edmonton site configuration.
// Everything the site needs from outside services lives here so non-developers
// can change an ID without touching the page code.
window.CCE_CONFIG = {
  youtube: {
    // From the old site's footer links (youtube.com/channel/...). Verified 2026-10-15.
    channelId: 'UCoqF4wZyvVON6lmCtC2Jzdw',
    // How video titles are matched to a service type. Case-insensitive regex strings.
    // Media team: keep titling uploads "Sunday Service | ...", "Midweek Bible Study | ..." etc.
    classify: {
      sunday: 'sunday service|thanksgiving sunday|shiloh sunday',
      midweek: 'midweek|bible study|holy communion',
      lighthouse: 'lighthouse service',
      vigil: 'night vigil|vigil|hour of victory'
    }
  },

  calendar: {
    // Public Google Calendar ID, e.g. "abc123@group.calendar.google.com".
    // Leave empty until the church creates one; the Events page then shows a note instead.
    googleCalendarId: '',
    timeZone: 'America/Edmonton'
  },

  feedback: {
    // Shown on every page of the draft while HODs review it. Remove or set enabled:false for launch.
    enabled: true,
    // Option A (recommended): a Google Form. Create a form with four short-answer questions
    // (Page, Name, Department, Feedback), open its "Get pre-filled link", and copy the
    // formResponse URL plus the entry.NNNN ids here. Leave action empty to use Option B.
    googleForm: {
      action: '',          // e.g. 'https://docs.google.com/forms/d/e/XXXX/formResponse'
      entries: { page: '', name: '', department: '', message: '' }   // e.g. 'entry.123456'
    },
    // Option B (works today): feedback opens the reviewer's email client with everything filled in.
    mailto: 'precie2010.pd@gmail.com',   // project manager's inbox during the HOD review; switch to the church office later
    subjectPrefix: '[Website draft feedback]'
  },

  // Emergency / service-change notice shown in an amber bar under the header on every page.
  // Leave text empty to hide it. Example: text: 'Sunday 2 Feb: services cancelled due to the snowstorm. Join us online at 10:00 AM.'
  notice: {
    text: '',
    link: '',        // optional, e.g. '#watch' or a full URL
    linkLabel: ''    // optional, e.g. 'Watch online'
  },

  social: {
    facebook: 'https://www.facebook.com/ChristChurchEdmonton',
    instagram: 'https://www.instagram.com/christchurchRCCG',
    youtube: 'https://www.youtube.com/channel/UCoqF4wZyvVON6lmCtC2Jzdw'
  }
};
