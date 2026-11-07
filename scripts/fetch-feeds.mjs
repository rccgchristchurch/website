// Pulls the latest YouTube videos, the live-stream status and the public Google
// Calendar into site/data/feeds.json. No API keys needed.
//
//   node scripts/fetch-feeds.mjs
//
// Runs locally and inside the GitHub Actions deploy workflow (hourly), so the
// published site stays current without anyone editing the website.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site', 'data', 'feeds.json');

// site-config.js is a browser file; evaluate it in a tiny sandbox to reuse the same settings.
const cfgSrc = readFileSync(join(ROOT, 'site', 'site-config.js'), 'utf8');
const win = {};
new Function('window', cfgSrc)(win);
const CFG = win.CCE_CONFIG;

const UA = 'Mozilla/5.0 (compatible; ChristChurchSiteBot/1.0)';
const get = async (url) => {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-CA,en', 'accept': 'application/atom+xml, application/xml, text/html;q=0.9, */*;q=0.8' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
};
const unescapeXml = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function youtube() {
  const { channelId, classify } = CFG.youtube;
  const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
    id: e.match(/<yt:videoId>([^<]+)/)[1],
    title: unescapeXml(e.match(/<title>([^<]+)/)[1]),
    published: e.match(/<published>([^<]+)/)[1],
    thumbnail: `https://i.ytimg.com/vi/${e.match(/<yt:videoId>([^<]+)/)[1]}/hqdefault.jpg`
  }));
  const pick = (re) => videos.find((v) => new RegExp(re, 'i').test(v.title)) || null;

  // Live status. The channel's /live page points at the current broadcast OR the next scheduled one,
  // so the candidate's own watch page is checked: only "isLiveNow":true counts as on air.
  let live = { isLive: false, videoId: null, upcoming: null };
  try {
    const html = await get(`https://www.youtube.com/channel/${channelId}/live`);
    const id = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/)?.[1]
      || html.match(/"videoId":"([A-Za-z0-9_-]{11})"/)?.[1] || null;
    if (id) {
      const page = await get(`https://www.youtube.com/watch?v=${id}`);
      const isLiveNow = /"isLiveNow":true/.test(page);
      const isUpcoming = /"isUpcoming":true/.test(page);
      const start = page.match(/"scheduledStartTime":"(\d+)"/)?.[1];
      const title = unescapeXml(page.match(/<title>(.*?) - YouTube<\/title>/)?.[1] || '');
      live = {
        isLive: isLiveNow,
        videoId: isLiveNow ? id : null,
        upcoming: !isLiveNow && isUpcoming ? { videoId: id, title, scheduledStart: start ? new Date(Number(start) * 1000).toISOString() : null } : null
      };
    }
  } catch (e) {
    console.warn('live check failed:', e.message);
  }

  return {
    channelId,
    live,
    latest: videos[0] || null,
    sunday: pick(classify.sunday),
    midweek: pick(classify.midweek),
    lighthouse: pick(classify.lighthouse),
    vigil: classify.vigil ? pick(classify.vigil) : null,
    recent: videos.slice(0, 12)
  };
}

// ICS reader for the next 90 days: single events, plus DAILY / WEEKLY / MONTHLY / YEARLY
// repeats with INTERVAL, COUNT, UNTIL, BYDAY (incl. "3TU", "-1SU"), BYMONTHDAY, EXDATE,
// moved or cancelled single occurrences. Times are worked out in the calendar's own
// time zone, so results are the same on a laptop in Edmonton and on GitHub's UTC servers.
const DAY = 86400000;
const DOW = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// Zones whose VTIMEZONE in the calendar file has one fixed offset (Google sends Edmonton as
// UTC-6 all year). These win over Node's own time-zone data, which can lag behind law changes.
const FIXED = {};
function tzOffset(utcMs, tz) {
  if (tz in FIXED) return FIXED[tz];
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}
// Wall-clock time in tz -> UTC milliseconds.
function wallToUtc(dayNum, secs, tz) {
  const guess = dayNum * DAY + secs * 1000;
  const first = guess - tzOffset(guess, tz);
  return guess - tzOffset(first, tz);
}

function parseIcs(ics, defaultTz) {
  const unfold = ics.replace(/\r?\n[ \t]/g, '');
  const now = Date.now();
  const from = now - DAY;
  const horizon = now + 90 * DAY;
  for (const [, z] of unfold.matchAll(/BEGIN:VTIMEZONE([\s\S]*?)END:VTIMEZONE/g)) {
    const id = (z.match(/^TZID:(.*)$/m) || [])[1]?.trim();
    const parts = [...z.matchAll(/BEGIN:(STANDARD|DAYLIGHT)([\s\S]*?)END:(?:STANDARD|DAYLIGHT)/g)];
    const to = parts.length === 1 && !/RRULE/.test(parts[0][2]) && parts[0][2].match(/^TZOFFSETTO:([+-])(\d\d)(\d\d)/m);
    if (id && to) FIXED[id] = (to[1] === '-' ? -1 : 1) * (to[2] * 3600000 + to[3] * 60000);
  }
  const clean = (v) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();

  // "DTSTART;TZID=America/Edmonton:20260915T190000" -> { dayNum, secs, tz, allDay, utc }
  const when = (line) => {
    if (!line) return null;
    const m = line.match(/^[A-Z-]+((?:;[^:]*)?):(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?/);
    if (!m) return null;
    const tz = (m[1].match(/TZID=([^;:]+)/) || [])[1] || defaultTz;
    const dayNum = Date.UTC(+m[2], m[3] - 1, +m[4]) / DAY;
    if (!m[5]) return { dayNum, secs: 0, tz, allDay: true, utc: wallToUtc(dayNum, 0, tz) };
    const secs = m[5] * 3600 + m[6] * 60 + +m[7];
    if (m[8] === 'Z') {
      // Convert UTC to the calendar's wall clock so repeats keep their local time across DST.
      const utc = dayNum * DAY + secs * 1000;
      const local = utc + tzOffset(utc, defaultTz);
      return { dayNum: Math.floor(local / DAY), secs: Math.round((local % DAY) / 1000), tz: defaultTz, allDay: false, utc };
    }
    return { dayNum, secs, tz, allDay: false, utc: wallToUtc(dayNum, secs, tz) };
  };

  const events = [];
  for (const [, block] of unfold.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)) {
    const line = (k) => (block.match(new RegExp(`^${k}[;:].*$`, 'm')) || [''])[0];
    const field = (k) => { const l = line(k); return l ? l.slice(l.indexOf(':') + 1).trim() : ''; };
    const exdates = new Set();
    for (const [l] of block.matchAll(/^EXDATE[;:].*$/gm)) {
      const params = l.slice(0, l.indexOf(':'));
      for (const v of l.slice(l.indexOf(':') + 1).split(',')) { const w = when(params + ':' + v.trim()); if (w) exdates.add(w.utc); }
    }
    events.push({
      uid: field('UID'), start: when(line('DTSTART')), rrule: field('RRULE'), recurrenceId: when(line('RECURRENCE-ID')),
      cancelled: /CANCELLED/i.test(field('STATUS')), exdates,
      base: { title: clean(field('SUMMARY')), location: clean(field('LOCATION')), description: clean(field('DESCRIPTION')).slice(0, 600) }
    });
  }

  // Occurrences that were moved or cancelled one at a time replace the generated ones.
  const overridden = new Set(events.filter((e) => e.recurrenceId).map((e) => e.uid + '|' + e.recurrenceId.utc));

  const out = [];
  // "local" is the Edmonton wall-clock time, so the page can show it without its own time-zone data.
  const add = (e, utc) => {
    if (utc < from || utc > horizon) return;
    const local = new Date(utc + tzOffset(utc, defaultTz)).toISOString().slice(0, 16);
    out.push({ ...e.base, allDay: e.start.allDay, start: new Date(utc).toISOString(), local });
  };

  for (const e of events) {
    if (!e.start || e.cancelled) continue;
    const freq = (e.rrule.match(/FREQ=(\w+)/) || [])[1];
    if (e.recurrenceId || !freq) { add(e, e.start.utc); continue; }

    const r = (k) => (e.rrule.match(new RegExp(`${k}=([^;]+)`)) || [])[1];
    const interval = Number(r('INTERVAL') || 1);
    const count = r('COUNT') ? Number(r('COUNT')) : Infinity;
    const until = r('UNTIL') ? when('UNTIL:' + r('UNTIL')).utc : Infinity;
    const byday = (r('BYDAY') || '').split(',').filter(Boolean).map((t) => { const m = t.match(/^([+-]?\d+)?(\w\w)$/); return { n: m[1] ? Number(m[1]) : 0, dow: DOW.indexOf(m[2]) }; });
    const bymonthday = (r('BYMONTHDAY') || '').split(',').filter(Boolean).map(Number);
    const s0 = new Date(e.start.dayNum * DAY);
    const startDow = s0.getUTCDay();
    const wkst = DOW.indexOf(r('WKST') || 'MO');
    const startWeek = Math.floor((e.start.dayNum - ((startDow - wkst + 7) % 7)) / 7);

    const matches = (dn) => {
      const d = new Date(dn * DAY);
      const y = d.getUTCFullYear(), mo = d.getUTCMonth(), dom = d.getUTCDate(), dow = d.getUTCDay();
      const months = (y - s0.getUTCFullYear()) * 12 + mo - s0.getUTCMonth();
      if (freq === 'DAILY') return (dn - e.start.dayNum) % interval === 0;
      if (freq === 'WEEKLY') {
        const week = Math.floor((dn - ((dow - wkst + 7) % 7)) / 7);
        return (week - startWeek) % interval === 0 && (byday.length ? byday.some((b) => b.dow === dow) : dow === startDow);
      }
      if (freq === 'MONTHLY') {
        if (months % interval !== 0) return false;
        if (bymonthday.length) return bymonthday.includes(dom);
        if (byday.length) {
          const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
          return byday.some((b) => b.dow === dow && (b.n === 0 || b.n === Math.ceil(dom / 7) || b.n === -(Math.floor((daysInMonth - dom) / 7) + 1)));
        }
        return dom === s0.getUTCDate();
      }
      if (freq === 'YEARLY') return months % (12 * interval) === 0 && dom === s0.getUTCDate();
      return dn === e.start.dayNum;
    };

    let n = 0;
    const lastDay = Math.floor(Math.min(horizon, until) / DAY) + 1;
    for (let dn = e.start.dayNum; dn <= lastDay && n < count; dn++) {
      if (!matches(dn)) continue;
      const utc = wallToUtc(dn, e.start.secs, e.start.tz);
      if (utc > until) break;
      n++;
      if (e.exdates.has(utc) || overridden.has(e.uid + '|' + utc)) continue;
      add(e, utc);
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 30);
}

async function calendar() {
  const id = CFG.calendar.googleCalendarId;
  if (!id) return { configured: false, events: [] };
  const ics = await get(`https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`);
  return { configured: true, events: parseIcs(ics, CFG.calendar.timeZone || 'America/Edmonton') };
}

// Never fail the build: if a source cannot be reached (YouTube sometimes answers 404 to
// GitHub's runners), keep that section from the previously committed feeds.json.
let previous = {};
try { previous = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) {}

const attempt = async (name, fn, fallback) => {
  for (let i = 1; i <= 3; i++) {
    try { return await fn(); } catch (e) {
      console.warn(`${name} attempt ${i} failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  console.warn(`${name}: keeping previous data`);
  return fallback;
};

const data = {
  generatedAt: new Date().toISOString(),
  youtube: await attempt('youtube', youtube, previous.youtube || { channelId: CFG.youtube.channelId, live: { isLive: false, videoId: null }, latest: null, sunday: null, midweek: null, lighthouse: null, vigil: null, recent: [] }),
  calendar: await attempt('calendar', calendar, previous.calendar || { configured: !!CFG.calendar.googleCalendarId, events: [] })
};
if (data.youtube === previous.youtube) data.youtubeStale = previous.generatedAt || true;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log(`wrote ${OUT}`);
console.log(`live: ${data.youtube.live.isLive}  sunday: ${data.youtube.sunday?.title}  midweek: ${data.youtube.midweek?.title}  events: ${data.calendar.events.length}`);
