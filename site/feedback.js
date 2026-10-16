// Floating "Feedback" button shown on every page of the review draft.
// Reads window.CCE_CONFIG.feedback. Sends to a Google Form when one is configured,
// otherwise opens the reviewer's email client with the message filled in.
(function () {
  const cfg = (window.CCE_CONFIG && window.CCE_CONFIG.feedback) || {};
  if (cfg.enabled === false) return;

  const css = `
    #cce-fb-btn{position:fixed;right:16px;bottom:16px;z-index:9999;display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:0 18px;background:#EF8C34;color:#042F48;border:2px solid #042F48;border-radius:4px;font:700 14px Montserrat,system-ui;cursor:pointer;box-shadow:0 4px 14px rgba(4,47,72,.25)}
    #cce-fb-btn:hover{background:#403486;color:#F5F2EC;border-color:#403486}
    #cce-fb-btn:focus-visible,#cce-fb-panel button:focus-visible,#cce-fb-panel input:focus-visible,#cce-fb-panel textarea:focus-visible{outline:2px solid #EF8C34;outline-offset:2px}
    #cce-fb-panel{position:fixed;right:16px;bottom:76px;z-index:9999;width:min(360px,calc(100vw - 32px));background:#F5F2EC;color:#2B3540;border:2px solid #042F48;border-radius:4px;box-shadow:0 10px 30px rgba(4,47,72,.3);font:400 15px/1.5 'Source Sans 3',system-ui;display:none}
    #cce-fb-panel[data-open]{display:block}
    #cce-fb-panel header{background:#042F48;color:#F5F2EC;padding:12px 16px;font:700 13px Montserrat,system-ui;letter-spacing:.08em;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center}
    #cce-fb-panel header button{background:none;border:0;color:#F5F2EC;font-size:20px;cursor:pointer;line-height:1}
    #cce-fb-panel form{display:grid;gap:10px;padding:14px 16px 16px}
    #cce-fb-panel label{display:grid;gap:4px;font:600 13px 'Source Sans 3',system-ui;color:#042F48}
    #cce-fb-panel input,#cce-fb-panel textarea{width:100%;border:2px solid #042F48;border-radius:4px;background:#fff;padding:8px 10px;font:400 15px 'Source Sans 3',system-ui;color:#2B3540}
    #cce-fb-panel textarea{min-height:110px;resize:vertical}
    #cce-fb-panel .cce-fb-page{font-size:13px;color:#403486}
    #cce-fb-panel .cce-fb-send{min-height:44px;background:#EF8C34;color:#042F48;border:2px solid #042F48;border-radius:4px;font:700 14px Montserrat,system-ui;cursor:pointer}
    #cce-fb-panel .cce-fb-send:hover{background:#403486;color:#F5F2EC;border-color:#403486}
    #cce-fb-panel .cce-fb-done{padding:20px 16px;display:none}
    #cce-fb-panel[data-done] form{display:none}
    #cce-fb-panel[data-done] .cce-fb-done{display:block}
    @media (prefers-reduced-motion:no-preference){#cce-fb-panel[data-open]{animation:cce-fb-in .18s ease-out}}
    @keyframes cce-fb-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function currentPage() {
    // The prototype keeps the open page in localStorage and in the toolbar select.
    const sel = document.querySelector('select');
    const label = sel && sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent.trim() : '';
    let key = '';
    try { key = localStorage.getItem('cce.page') || ''; } catch (e) {}
    const vp = (function () { try { return localStorage.getItem('cce.viewport') || 'desktop'; } catch (e) { return 'desktop'; } })();
    return (label || key || 'Home') + ' (' + vp + ')';
  }

  const btn = document.createElement('button');
  btn.id = 'cce-fb-btn';
  btn.type = 'button';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Feedback';

  const panel = document.createElement('div');
  panel.id = 'cce-fb-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Send feedback on this page');
  panel.innerHTML = `
    <header><span>Feedback on this draft</span><button type="button" aria-label="Close">&times;</button></header>
    <form>
      <div class="cce-fb-page">Page: <strong data-page></strong></div>
      <label>Your name<input name="name" autocomplete="name" required></label>
      <label>Department / ministry<input name="department" placeholder="e.g. Media, Genesis, Welcome"></label>
      <label>What should change?<textarea name="message" required placeholder="What works, what is missing, what is wrong"></textarea></label>
      <button class="cce-fb-send" type="submit">Send feedback</button>
    </form>
    <div class="cce-fb-done"><strong>Thank you.</strong> Your feedback has been recorded for this page.<br><br><button type="button" class="cce-fb-send" data-again>Send another</button></div>
  `;

  const form = panel.querySelector('form');
  const pageEl = panel.querySelector('[data-page]');
  const closeBtn = panel.querySelector('header button');

  function open() {
    pageEl.textContent = currentPage();
    panel.setAttribute('data-open', '');
    panel.removeAttribute('data-done');
    form.querySelector('[name=name]').focus();
  }
  function close() { panel.removeAttribute('data-open'); btn.focus(); }
  btn.addEventListener('click', () => (panel.hasAttribute('data-open') ? close() : open()));
  closeBtn.addEventListener('click', close);
  panel.querySelector('[data-again]').addEventListener('click', () => { form.reset(); panel.removeAttribute('data-done'); pageEl.textContent = currentPage(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.hasAttribute('data-open')) close(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      page: pageEl.textContent,
      name: form.name.value.trim(),
      department: form.department.value.trim(),
      message: form.message.value.trim(),
      url: location.href
    };
    const gf = cfg.googleForm || {};
    if (gf.action && gf.entries && gf.entries.message) {
      // Post silently to the Google Form through a hidden iframe (Google Forms allow cross-site posts).
      let frame = document.getElementById('cce-fb-frame');
      if (!frame) {
        frame = document.createElement('iframe');
        frame.id = 'cce-fb-frame';
        frame.name = 'cce-fb-frame';
        frame.style.display = 'none';
        document.body.appendChild(frame);
      }
      const f = document.createElement('form');
      f.method = 'POST';
      f.action = gf.action;
      f.target = 'cce-fb-frame';
      f.style.display = 'none';
      const add = (k, v) => { if (!k) return; const i = document.createElement('input'); i.name = k; i.value = v; f.appendChild(i); };
      add(gf.entries.page, data.page);
      add(gf.entries.name, data.name);
      add(gf.entries.department, data.department);
      add(gf.entries.message, data.message);
      document.body.appendChild(f);
      f.submit();
      f.remove();
    } else {
      const subject = (cfg.subjectPrefix || '[Website feedback]') + ' ' + data.page;
      const body = 'Page: ' + data.page + '\nFrom: ' + data.name + (data.department ? ' (' + data.department + ')' : '') + '\n\n' + data.message + '\n\n' + data.url;
      window.location.href = 'mailto:' + (cfg.mailto || '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }
    panel.setAttribute('data-done', '');
  });

  document.body.appendChild(btn);
  document.body.appendChild(panel);
})();
