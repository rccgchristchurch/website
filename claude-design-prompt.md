# Claude Design prompt — RCCG Christ Church Edmonton website

How to use: open Claude Design, upload the files listed under "Attach these files", then paste everything below the line into the prompt box. The prompt is self-contained; it carries the real copy, the brand tokens, and the full site map so Claude Design does not have to guess.

Attach these files (from the Drive folder, download them first):
- New Logo/NEW LOGO - RCCG CHRIST CHURCH - MAIN.svg
- New Logo/NEW LOGO - RCCG CHRIST CHURCH - COLOURED WHITE FONT.svg
- New Logo/NEW LOGO - RCCG CHRIST CHURCH - WHITE.svg
- New Logo/Colour Pallette.pdf
- New Logo/Typography.pdf
- Lighthouse/Lighthouse Logo.png and Lighthouse Logo - White Text.png
- DC/DC Logo.png and DC Logo - White.png
- Genesis/Genesis Logo.png and Genesis Logo - white.png
- Optional: docs/archived-site-content.md from this repo (full old-site copy)

Decisions baked into this prompt:
1. Master brand = the Aug 2026 "New Logo" system (Covenant Navy / Sanctuary Violet / Radiant Amber, Montserrat + Source Sans 3 + Cormorant Garamond). Confirmed by Precious on 2026-10-15. The Feb 2026 "Gracepoint" navy/gold system is treated as superseded for the parent church, but its three sub-brand palettes are kept for the Lighthouse, Discovery Centre and Genesis pages.
2. Site map = the "Proposed Site Map" from the Navigation structure document, with HOME and I'M NEW added and SERVICES renamed WORSHIP.
3. The "four ministries" named in the project charter are read as Lighthouse (young adults), Discovery Centre (teens), Genesis (children) and the adult fellowships grouped together (Men of Impact, Women of Zion, Couples, Seniors).

---------------------------------------------------------------- PROMPT STARTS BELOW ----------------------------------------------------------------

You are the lead UX and visual designer for the full redesign of the website of RCCG Christ Church Edmonton, a parish of The Redeemed Christian Church of God in Edmonton, Alberta, Canada. I am the project manager and web designer taking the project over. The previous site was a Wix site that is now offline (the domain shows a parking page), so we are starting from scratch. Design a complete, high-fidelity, responsive website prototype that a developer can build from in WordPress or a similar CMS.

## 1. Who the site is for and what it must do

Primary audiences, in priority order:
1. First-time visitors and people searching for a church in south Edmonton (many are Nigerian or West African newcomers to Canada, but the church is for everyone). They want to know when and where services are, what to expect, and whether their children are looked after.
2. Existing members who want events, sermons, giving, house fellowships, forms and ministry info quickly, mostly on a phone.
3. Leadership and volunteers who will maintain the content themselves after launch, so every page must be a simple, repeatable template.

The old site was organization-centric (how the church is structured). The new site must be visitor-centric (what a new person wants to do). The project charter says the site must:
- reflect the church's mission and values;
- give clear visibility to the ministries, each with its own branded presence;
- be the central hub for events, online giving and community connection;
- work as a digital evangelism tool: measurable growth in prayer requests, first-time-visitor connections and content sharing.

Top-level calls to action that should be reachable from every page: Plan Your Visit, Watch Online, Give, Prayer Request.

## 2. Brand system (follow exactly)

Master brand: "Christ Church Edmonton". The logo (attached SVGs) is a hand-painted violet cross with amber sun rays radiating from the top left, the circular RCCG seal on the lower-left arm, and the wordmark CHRIST CHURCH in heavy navy geometric capitals with EDMONTON beneath. Use MAIN on light backgrounds, COLOURED WHITE FONT on navy or violet backgrounds, WHITE where the background is a photo. Never stretch or recolour it; keep clear space of 20% of the logo width on all sides.

Colours (HEX is authoritative for screen):
- Covenant Navy #042F48 (brand 1, dominant: headers, footers, primary text)
- Sanctuary Violet #403486 (brand 2: accents, section backgrounds, hover states)
- Radiant Amber #EF8C34 (brand 3: primary buttons and the single accent per screen)
- Dawn Violet #7373B5 (support: tints, secondary buttons, icons)
- Mist #E4E4EF (support: dividers, subtle card backgrounds)
- Parchment #F5F2EC (support: warm page background instead of pure white)
- Graphite #2B3540 (support: body text on light backgrounds)
Recommended proportions across a page: Navy 40%, Parchment 24%, Violet 15%, Mist 10%, Amber 7%, other 4%. Amber is the only colour that may be used for the primary button. Do not introduce any other hue on master-brand pages.

Typography (all open licence, load from Google Fonts):
- Montserrat for all headings. Weights 600, 700, 800 only. Display: 800 at 40-56px, tracking -2%. Heading: 700 at 24-32px, tracking -1%. Subheading: 600 at 14-18px sentence case. Eyebrow labels: 700 at 11-12px, all caps, tracking +28%.
- Source Sans 3 for all body text. 400 at 16px minimum, line height 1.65. 300 only for large intro paragraphs. 600 for labels and form fields. Captions: 400 at 13-14px in 70% navy.
- Cormorant Garamond Italic for scripture verses and pull quotes only, 20-28px. Never for headings, labels or body.
- CSS stack: Montserrat, "Source Sans 3", system-ui. Never substitute Inter, Arial or Calibri.

Visual rules:
- Buttons: rectangular with 4px corner radius. Primary = Amber fill with Navy text. Secondary = Navy outline. Tertiary = text link in Violet with underline on hover.
- Icons: linear/outline style, consistent 2px stroke, one icon set across the whole site.
- Photography: candid over staged, real congregation in natural bright light. Any text on a photo sits on a 20% navy tint overlay. Use clearly labelled placeholder photo blocks (no stock imagery) with a note of what the shot should be.
- The amber "ray" motif from the logo may be used sparingly as a decorative element behind hero headings.
- Accessibility: WCAG 2.1 AA. 4.5:1 contrast minimum, visible focus states, 44px minimum tap targets, semantic headings, skip link, reduced-motion respected.
- Mobile first. Design every page at 390px and 1440px; show tablet where layout changes.

Ministry sub-brands (used only inside that ministry's section; each page must still show the master logo in the header and the line "A Ministry of RCCG Christ Church Edmonton" in the footer):
- Lighthouse Christ Church (young adults): concept "Guidance and Warmth". Gold #D4AF37 ring accent, Lighthouse Black #1A1A1B text, Champagne Cream #F9F7F2 backgrounds. Playfair Display headings, Montserrat Light spaced-out secondary, Open Sans body. Minimalist, lots of white space, subtle gold-to-yellow gradient "glow". Tagline: "The Young Adult Expression of RCCG Christ Church, Edmonton."
- Discovery Centre (teens, grades 7-12): concept "Focus and Purpose". Obsidian Black #1A1A1B backgrounds, Foundation White text, Focus Cyan #00CEC9 highlights, Action Slate #636E72 secondary. Montserrat Extra Bold all-caps headings, Montserrat body. Subtle grid-paper overlay, crosshair/broken-circle photo frames, duotone navy-to-cyan photos. A single thin gold line at the very bottom of the page. Tagline: "A Youth Expression of RCCG Christ Church, Edmonton."
- Genesis Christ Church (children): concept "Joy and Revelation". White base only, never dark. Genesis Red #E72F24 for primary action, Orange #F39221, Blue #21A9E1, Purple #6E3996, Gold #D4AF37 accent. Fredoka One headings, Montserrat Medium secondary, Open Sans body. All corners at least 20px radius, pill buttons, dot/wave/star patterns at 10% opacity, sun-ray "pointers" toward key buttons. Tagline: "The Children's Ministry of RCCG Christ Church, Edmonton."
- Adult fellowships (Men of Impact, Women of Zion, Couples, Christ Church Seniors) use the master brand with Violet as the section colour.

## 3. Site map and navigation

Header: logo left; primary nav; a persistent Amber "Give" button and a "Plan Your Visit" button on the right; on mobile a full-screen menu with the four CTAs pinned at the bottom. Include an explicit HOME item.

- HOME
- I'M NEW: Plan Your Visit, What to Expect, Service Times & Location, Children & Youth
- ABOUT: Our Story (history), Values, Priorities, Leadership, About RCCG
- WORSHIP: Sunday Services, Midweek Services, House Fellowships
- MINISTRIES: Genesis Church (children), Discovery Centre (youth), Lighthouse Christ Church (young adults), Men of Impact, Women of Zion, Couples, Christ Church Seniors, Church Units (serving teams)
- EVENTS: Upcoming Events, Church Calendar, event detail page with registration
- MEDIA: Watch (Sermons, Monthly Greeting Videos), Listen (Podcasts), Gallery (Recent, Historical), Special Programs (A Time of Refreshing)
- GIVE: Give Now, Specific Giving, Recurring Giving, Why We Give
- CONNECT: Contact Us, Membership, Prayer Request, Volunteer / Join Workforce, Christian Business (Business Directory, Register Business)

Footer on every page: logo (white version) on Navy; address 2331 90B Street SW, Edmonton AB T6X 1V6; phone (587) 598-0316; email info@rccgchristchurch.ca; service times; quick links; social icons (Facebook, Instagram, YouTube placeholders); a one-line scripture in Cormorant Garamond italic; "A parish of The Redeemed Christian Church of God"; copyright.

## 4. Pages to design, with the real copy to use

Use the copy below verbatim where given. Where content is missing, write a short placeholder in square brackets that tells the content manager what to supply.

### Home
- Hero: full-width photo placeholder of the congregation; eyebrow "RCCG Christ Church Edmonton"; headline "Habitation of God's glory and the expression of His person"; sub-line "A Pentecostal church family in south Edmonton, in person and online."; buttons Plan Your Visit (primary), Watch Online (secondary).
- Service times strip directly under the hero: Sunday Service 10:00 AM at 2331 90B Street SW [confirm times and add midweek]; link to directions.
- Welcome block, use this text: "Welcome to Christ Church Edmonton, a blessed Christian community center and a parish of the Redeemed Christian Church of God (RCCG). We joyfully hold prayer and worship services both in the sacred house of God and online, uniting hearts in praise and adoration. Our doors and hearts are wide open to receive you, no matter who you are or where you come from. If you've been thinking, praying, or searching for a church family to belong to, we believe the Holy Spirit has led you here—you are in the right place."
- "Next steps" row of four cards: I'm New, Join a House Fellowship, Request Prayer, Give.
- Upcoming events: three event cards pulled from the calendar, with a "See all events" link.
- Latest sermon: video embed placeholder with title, date, speaker, and "Watch more".
- Ministries grid of seven cards, each tinted with its sub-brand colour, using this copy:
  - Lighthouse Christ Church: "Supporting young adults in their faith journey, fostering fellowship and spiritual growth."
  - Genesis Church: "A fun, faith-based environment for children to learn about Jesus through interactive activities."
  - Discovery Centre: "Empowering teens to grow in faith, leadership, and service, while building strong connections with peers."
  - Men of Impact: "A supportive environment where men come together for Bible study, prayer, and fellowship, fostering deeper relationships with God and each other."
  - Women of Zion: "A nurturing environment where women come together for Bible study, prayer, and shared experiences, deepening their relationship with God and each other."
  - Christ Church Seniors: "A unique space for lifelong learning, sharing wisdom, and continuing to serve others, through mentorship, prayer, and community outreach."
  - Couples: [one-line description].
- Verse of the day block in Cormorant Garamond italic.
- Newsletter / "Stay connected" email capture.

### I'm New / Plan Your Visit
- Hero with warm photo; headline "We'd love to meet you."
- What to expect: three short steps (Arrive and park, Worship with us, Connect after service) with icons.
- Service times and location with embedded map placeholder, parking note, accessibility note.
- Children & youth: short blurbs pointing to Genesis (children), Discovery Centre (grades 7-12), Lighthouse (young adults) with sub-brand accents.
- FAQ accordion: What should I wear? How long is the service? Is there something for my kids? Do I need to be Nigerian or RCCG to attend? Can I watch online?
- "Let us know you're coming" form: first name, last name, email, phone, number of guests, planned date, message. Submit button "I'm coming".

### About
Landing page with cards to Our Story, Values, Priorities, Leadership, About RCCG. Intro text: "We are a Christian Community Centre, a parish of the Redeemed Christian Church of God (RCCG), we are a pentecostal Church with weekly worship and prayer services in-person and online."

Our Story page, use this history (editable timeline component with photo placeholders): "The first Redeemed Christian Church (RCCG) in Edmonton, Rhema Chapel, was inaugurated in February 2004. In 2008 the leaders were led to plant new parishes across Edmonton to reach the various communities and neighbourhoods; four parishes were founded that year, one of which was Christ Church Edmonton, officially inaugurated on August 24th, 2008, with the first service held on August 1st at 3238 Parson Road. Two families were sent out from Rhema Chapel to start Christ Church in the south side of the city with David Oladipo as the Parish Pastor and John Adigun as the Assistant. The church later met at the Sandman Hotel on Ellerslie Road, then moved to 2936 Ellwood Drive, its first owned property. In 2016 the church moved to its present location at 2327-2331 90B Street SW to accommodate its expanding membership and the children and youth. The church also ministers weekly at the Rutherford Retirement Centre (since October 2013), at Hope Mission Edmonton (since fall 2017), fortnightly at MacTaggart Place, and planted Mount Zion in Camrose on November 12, 2017." Timeline milestones: 2004, 2008, 2016, 2013, 2017.

About RCCG block: "The Redeemed Christian Church of God (RCCG) has the vision to spread the Word of God to the ends of the earth. It is a Bible believing church. The General Overseer of the church is Pastor E.A. Adeboye. Christ Church Parish, Edmonton is one of over 5,000 RCCG parishes around the world." Mission list: "To make heaven. To take as many people with us. To have a member of RCCG in every family of all nations. To accomplish No. 1 above, holiness will be our lifestyle. To accomplish No. 2 and 3 above, we will plant churches within five minutes walking distance in every city and town of developing countries and within five minutes driving distance in every city and town of developed countries."

Values page: a grid of 14 value cards, each with a title, a one-sentence description and the scripture references in Cormorant italic. Titles: Pursuit of God; Christlikeness; Godly Family Life; Marital Fidelity; Purposeful Singleness; Church of God as the Body of Christ; Individual Members of the Church; Mercy of God; Servant Leadership; Giving; Personal and Corporate Integrity; Unity in the Body of Christ; Simplicity; Modesty in our Lifestyle. Example card: "Pursuit of God — We thirst for His presence and to know more of Him through private and public worship, the Word and prayer. Psalm 42:1-2, 63:1-3; Matt 5:23; Luke 6:21."

Priorities page: eight numbered statements in the same card pattern, e.g. "We desire to worship God in spirit and in truth in our private and public worship. The LORD only shall be the object of our worship. 1 Kings 8:11; 1 Chronicles 16:29; Psalm 96:6; John 4:23-24; Revelation 22:9." Others: live holy, sanctified lives; be led all the time by the Spirit of God; teach and learn the Word of God; be active in proclaiming the Good News; honour God and bring glory to His name; build the Church of God with our spiritual gifts; develop one another through interpersonal ministry.

Leadership page: headshot grid (square photo placeholders, name, role, one-line bio). Pastor David Oladipo, Parish Pastor; Pastor John Adigun, Assistant Pastor; [other pastors and deacons to be supplied]. Each card opens a short bio.

### Worship
Sunday Services and Midweek Services: time, what happens, who it is for, livestream link, "Add to calendar". [Content manager to confirm all service times; old site listed only "Sundays 10am".]

House Fellowships page, use this copy: "At Christ Church, we have small groups that we fondly call 'House Fellowships'. They are intentional gatherings where people (typically 8-12 adults) connect with others who share common interests regularly. Our House Fellowships allow us to do life together! We study, pray, share life experiences and learnings, celebrate, brainstorm, and troubleshoot in a safe and welcoming space." Then a "Find a fellowship near you" component: a list or map of Edmonton neighbourhoods with the contact for each: Summerside (Deacon Popoola); Millwoods / Meadows (Deaconess Tunrayo); Windermere (Pastor Ademola); Walker Lake (Sister Fisayo); Charlesworth (Brother Ojelabi); Callaghan / Rutherford (Sister Olaide Balogun); Orchards; Chappelle / Paisley (Brother Akinjagunla). Show names only; phone numbers go behind a "Contact" button that opens a form, not in plain text. Overall contact: Deacon Yomi Popoola. Button "I'd like to join a House Fellowship".

### Ministries
Ministries landing: the seven ministry cards plus a "Church Units" section.

Each ministry page follows one template: hero in the sub-brand, one-paragraph purpose, who it is for, when and where it meets, leaders, photo gallery strip, upcoming events filtered to that ministry, a "Join" or "Contact" button, and the master-brand footer line. Design the full template three times to show the three sub-brands:
- Genesis Church (children): [purpose text to be supplied]. Include a "Check-in and safety" block for parents.
- Discovery Centre (teens): use this copy. "Creating an environment for teenagers to encounter God and grow in their pursuit of Him. Grades 7 to 12. Our goal: to equip youths with the gospel of Jesus Christ as they pursue a personal relationship with God, develop caring relationships with one another through service, and share the gospel with others." Five pillars as a row of icons: Disciple = Equip; Worship = Pursue; Fellowship = Care; Ministry = Serve; Evangelism = Share. Meeting info: Sunday Service, Sundays 10am; Small Groups, third Friday of every month; other programs as announced.
- Lighthouse Christ Church (young adults): [purpose text to be supplied].
Show Men of Impact, Women of Zion, Couples and Seniors as the same template in the master brand (one example is enough).

Church Units page (serving teams), card grid with an email button each: Prayer ("Offers prayer and support to the members and attendees of Christ Church, with a particular focus on praying for our church, neighbourhood, city, and country."); Choir, Living Stone Voices ("Creating an atmosphere of worship by singing spiritual songs."); Evangelism; Welcome ("We ensure a uniquely warm and welcoming environment for every person entering the church."); Media ("Winning souls for the kingdom of God through sights and sounds."); Drama; Hospitality ("Feeding, Helping, Caring."); Sanctuary Keepers ("Responsible for the appearance, maintenance, and security of the building and grounds."); Ushering; Sunday School; Transportation; Beautification.

### Events
Upcoming Events: filterable card list (All, Church-wide, Genesis, Discovery Centre, Lighthouse, Men, Women, Couples, Seniors), each card with date badge, title, time, location, ministry tag.
Church Calendar: month view with the same filters, mobile falls back to a list.
Event detail template: hero, date/time/location, description, "What to expect" list, registration details and fee, FAQ accordion, "Register" primary button, organiser contact button, share buttons. Use the 2025 Couples Retreat as the sample content: "Need a break to reconnect and refocus? Join us November 28-29 at Best Western Plus Airport Hotel Leduc for two days designed to strengthen your marriage through intimacy, bonding, spiritual renewal, and vision planning with your spouse." Fee $200 per couple, includes accommodation, meals, grand luncheon and bonding activities. Show four FAQ items from the retreat.

### Media
Watch: featured latest sermon video, then a grid of sermons with series filter, speaker, date, and search. Separate tab for Monthly Greeting Videos.
Listen: podcast episode list with inline player and links to Spotify / Apple placeholders.
Gallery: masonry grid with Recent and Historical tabs; album view.
Special Programs: A Time of Refreshing page with programme description placeholder, past editions, next date.

### Give
Give landing, use this copy: "Thank you for considering a gift of any amount to the Ministry of RCCG Christ Church Edmonton. May it be a sweet smelling savor to our God yielding bountiful blessings to you and yours in the name of Jesus! Amen." Toggle One-time / Recurring at the top, amount quick-picks, fund selector (General, Tithe, Building, Missions, Specific Giving), then the payment provider embed placeholder. Below: "Ways to Give" three cards: In Person ("Give during a church service or through a visit to the church office."), Give Online, Cheque ("Mail cheques to: RCCG Christ Church, 2331 90B Street SW, Edmonton, AB T6X 1V6"). Why We Give: short scripture-led page. Add a note about Canadian tax receipts [content manager to confirm wording].

### Connect
Contact Us: headline "Get in touch"; intro "We'd love to hear from you, please contact us by completing any of the forms below."; address, phone, email, office hours, map; a tabbed or card-selected form hub with these forms, each its own short form: Contact Us; First Timer ("Complete this form if this is your first time attending our service either in-person or online."); New Believer ("Complete this form if you just accepted Jesus Christ as your Lord and Savior."); Prayer Request (with "Do you want a Pastor to reach out to you? Yes / No"); Ask Pastor (with "Who is this question for? Pastor David / Pastor John / Either"); Join Workforce (multi-select of church units); Baby Dedication; Special Thanksgiving; Praise Report (share in church or read my testimony, optional video upload). Show the Prayer Request and First Timer forms in full; the others as the same pattern.
Membership: three-step registration form with progress indicator (Personal details; Household; Church background). Fields on step one: first name, preferred first name, last name, gender, birthday, email, phone, address, member since.
Christian Business: Business Directory as a searchable card list (business name, category, owner, contact), and Register Business form.
Prayer Request also gets a standalone short page reachable from the header CTA.

### Utility pages
404, search results, generic content page template, privacy policy placeholder.

## 5. Components to document

Produce a small design system page: colour tokens with contrast ratios, type scale, buttons (primary, secondary, tertiary, disabled, loading), form fields with error and success states, cards (event, sermon, ministry, person, value), accordion, tabs, date badge, ministry tag, hero variants (photo, colour, sub-brand), section header with eyebrow, footer, cookie/consent bar, and the mobile menu.

## 6. Deliverables and format

1. Desktop (1440px) and mobile (390px) high-fidelity screens for: Home, Plan Your Visit, About landing, Our Story, Values, Leadership, House Fellowships, Ministries landing, Genesis page, Discovery Centre page, Lighthouse page, Events list, Event detail, Watch, Give, Contact hub with Prayer Request form open, Membership step 1.
2. The design system page.
3. A clickable prototype linking the header, footer, CTAs and the ministry cards.
4. Annotations on each screen: which copy is final, which is placeholder, and any content the content manager must supply.
5. Export-ready CSS variables for the colour tokens and type scale so the developer can drop them into the theme.

Keep the overall feel warm, clear and uncluttered: large photography, generous Parchment space, Navy anchors, one Amber action per screen, scripture set in Cormorant italic as the only decorative flourish. It should look like a confident modern church in Canada while remaining unmistakably RCCG.

---------------------------------------------------------------- PROMPT ENDS ----------------------------------------------------------------
