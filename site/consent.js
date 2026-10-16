// Cookie / consent bar. Records the visitor's choice in localStorage and exposes it as
// window.CCE_CONSENT ('all' | 'essential') so analytics can be gated on it later.
(function () {
  var KEY = 'cce.consent';
  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) {}
  window.CCE_CONSENT = choice;
  if (choice) return;

  var style = document.createElement('style');
  style.textContent =
    '#cce-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:9998;max-width:720px;margin:0 auto;background:#042F48;color:#F5F2EC;border:2px solid #403486;border-radius:4px;padding:16px 20px;display:grid;gap:12px;font:400 15px/1.5 "Source Sans 3",system-ui;box-shadow:0 10px 30px rgba(4,47,72,.35)}' +
    '#cce-consent a{color:#EF8C34}' +
    '#cce-consent .row{display:flex;flex-wrap:wrap;gap:10px}' +
    '#cce-consent button{min-height:44px;padding:0 16px;border-radius:4px;font:700 13px Montserrat,system-ui;cursor:pointer}' +
    '#cce-consent .all{background:#EF8C34;color:#042F48;border:2px solid #EF8C34}' +
    '#cce-consent .ess{background:transparent;color:#F5F2EC;border:2px solid #F5F2EC}' +
    '#cce-consent button:focus-visible{outline:2px solid #EF8C34;outline-offset:2px}' +
    '@media (max-width:600px){#cce-consent{bottom:76px}}';
  document.head.appendChild(style);

  var bar = document.createElement('div');
  bar.id = 'cce-consent';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Cookie choices');
  bar.innerHTML =
    '<div><strong>Cookies.</strong> We use essential cookies to keep the site and the livestream working. With your OK we would also count visits anonymously. No advertising trackers. See the <a href="#privacy" data-privacy>privacy policy</a>.</div>' +
    '<div class="row"><button type="button" class="all">Accept all</button><button type="button" class="ess">Essential only</button></div>';

  function choose(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    window.CCE_CONSENT = v;
    bar.remove();
  }
  bar.querySelector('.all').addEventListener('click', function () { choose('all'); });
  bar.querySelector('.ess').addEventListener('click', function () { choose('essential'); });
  bar.querySelector('[data-privacy]').addEventListener('click', function (e) {
    e.preventDefault();
    try { localStorage.setItem('cce.page', 'privacy'); } catch (err) {}
    location.reload();
  });
  document.body.appendChild(bar);
})();
