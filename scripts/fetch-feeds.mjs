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
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-CA,en' } });
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

// Minimal ICS reader: single events plus simple WEEKLY repeats, next 90 days.
function parseIcs(ics) {
  const unfold = ics.replace(/\r?\n[ \t]/g, '');
  const now = Date.now();
  const horizon = now + 90 * 86400000;
  const out = [];
  for (const [, block] of unfold.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)) {
    const field = (k) => block.match(new RegExp(`^${k}[^:]*:(.*)$`, 'm'))?.[1]?.trim() ?? '';
    const dt = (v) => {
      const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
      if (!m) return null;
      return m[4] ? new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${v.endsWith('Z') ? 'Z' : ''}`)
                  : new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    };
    const start = dt(field('DTSTART'));
    if (!start) continue;
    const allDay = !/T/.test(field('DTSTART'));
    const base = {
      title: field('SUMMARY').replace(/\\,/g, ',').replace(/\\n/g, ' '),
      location: field('LOCATION').replace(/\\,/g, ','),
      description: field('DESCRIPTION').replace(/\\,/g, ',').replace(/\\n/g, '\n').slice(0, 600),
      allDay
    };
    const rrule = field('RRULE');
    if (/FREQ=WEEKLY/.test(rrule)) {
      const interval = Number(rrule.match(/INTERVAL=(\d+)/)?.[1] || 1);
      const until = rrule.match(/UNTIL=(\d{8}T?\d{0,6}Z?)/)?.[1];
      const untilMs = until ? dt(until).getTime() : horizon;
      for (let t = start.getTime(); t <= Math.min(horizon, untilMs); t += interval * 7 * 86400000) {
        if (t >= now - 86400000) out.push({ ...base, start: new Date(t).toISOString() });
      }
    } else if (start.getTime() >= now - 86400000 && start.getTime() <= horizon) {
      out.push({ ...base, start: start.toISOString() });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 30);
}

async function calendar() {
  const id = CFG.calendar.googleCalendarId;
  if (!id) return { configured: false, events: [] };
  const ics = await get(`https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics`);
  return { configured: true, events: parseIcs(ics) };
}

const data = {
  generatedAt: new Date().toISOString(),
  youtube: await youtube(),
  calendar: await calendar().catch((e) => ({ configured: true, events: [], error: e.message }))
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log(`wrote ${OUT}`);
console.log(`live: ${data.youtube.live.isLive}  sunday: ${data.youtube.sunday?.title}  midweek: ${data.youtube.midweek?.title}  events: ${data.calendar.events.length}`);
