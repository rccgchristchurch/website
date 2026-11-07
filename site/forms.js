// Sends the website's forms to Supabase and emails a copy to forms.notifyEmail in site-config.js.
// Used by the page component in index.html through window.CCE_FORMS.
(function () {
  var cfg = window.CCE_CONFIG || {};
  var sb = cfg.supabase || {};
  var notify = (cfg.forms && cfg.forms.notifyEmail) || '';
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function insert(table, row) {
    if (!sb.url || !sb.anonKey) return Promise.resolve({ ok: false, message: 'Online forms are not connected yet.' });
    return fetch(sb.url.replace(/\/$/, '') + '/rest/v1/' + table, {
      method: 'POST',
      headers: { 'apikey': sb.anonKey, 'Authorization': 'Bearer ' + sb.anonKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(row)
    }).then(function (r) {
      if (r.ok) return { ok: true };
      return r.json().catch(function () { return {}; }).then(function (j) {
        return { ok: false, status: r.status, code: j.code, message: j.message };
      });
    }).catch(function () { return { ok: false, message: 'We could not reach the server. Check your connection and try again.' }; });
  }

  // Copy to the project inbox (testing). Never blocks or fails the submission.
  function emailCopy(subject, fields) {
    if (!notify) return;
    try {
      fetch('https://formsubmit.co/ajax/' + encodeURIComponent(notify), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(Object.assign({ _subject: subject, _template: 'table', _captcha: 'false' }, fields))
      }).catch(function () {});
    } catch (e) {}
  }

  function textOf(label) {
    var t = '';
    label.childNodes.forEach(function (n) { if (n.nodeType === 3) t += n.textContent; });
    return t.trim();
  }

  // Reads every labelled field in a form: { fields: {label: value}, checks: [{label, checked}] }.
  function readForm(form) {
    var fields = {}, checks = [];
    form.querySelectorAll('label').forEach(function (label) {
      var box = label.querySelector('input[type=checkbox]');
      if (box) { checks.push({ label: label.textContent.replace(/\s+/g, ' ').trim(), checked: box.checked }); return; }
      var ctl = label.querySelector('input, textarea, select');
      if (!ctl) return;
      var v = (ctl.value || '').trim();
      if (!v || v === 'Select') return;
      fields[textOf(label) || ctl.name || 'Field'] = v;
    });
    return { fields: fields, checks: checks };
  }

  function pick(answers, test) {
    var keys = Object.keys(answers);
    for (var i = 0; i < keys.length; i++) if (test(keys[i].toLowerCase())) return answers[keys[i]];
    return '';
  }

  function submitForm(formType, answers) {
    var first = pick(answers, function (k) { return k === 'first name'; });
    var last = pick(answers, function (k) { return k.indexOf('last name') === 0; });
    var name = (first ? (first + ' ' + last).trim() : '') ||
      pick(answers, function (k) { return k === 'name' || k.indexOf("parent") === 0; }) ||
      pick(answers, function (k) { return k.indexOf('name') !== -1 && k.indexOf('child') === -1; });
    var email = pick(answers, function (k) { return k.indexOf('email') === 0; });
    var phone = pick(answers, function (k) { return k.indexOf('phone') === 0; });

    if (!Object.keys(answers).length) return Promise.resolve({ ok: false, message: 'Please fill in the form first.' });
    if (email && !EMAIL_RE.test(email)) return Promise.resolve({ ok: false, message: 'Please check the email address.' });

    return insert('form_submissions', {
      form_type: formType,
      name: name ? name.slice(0, 200) : null,
      email: email || null,
      phone: phone ? phone.slice(0, 40) : null,
      answers: answers,
      page_url: location.href.slice(0, 500),
      user_agent: (navigator.userAgent || '').slice(0, 400)
    }).then(function (res) {
      if (res.ok) emailCopy('[Website form] ' + formType + (name ? ' from ' + name : ''), Object.assign({ Form: formType }, answers));
      else if (!res.message || res.code) res.message = 'Something went wrong saving this form. Please try again, or email info@rccgchristchurch.ca.';
      return res;
    });
  }

  function business(answers) {
    var bizName = pick(answers, function (k) { return k === 'business name'; });
    if (!bizName) return Promise.resolve({ ok: false, message: 'Please enter the business name.' });
    var contact = pick(answers, function (k) { return k.indexOf('contact') === 0; });
    var email = '', website = '', phone = [];
    contact.split(/[\s,;]+/).forEach(function (t) {
      if (!t) return;
      if (t.indexOf('@') !== -1) email = email || t;
      else if (/^https?:\/\//i.test(t) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(t)) website = website || t;
      else phone.push(t);
    });
    if (email && !EMAIL_RE.test(email)) return Promise.resolve({ ok: false, message: 'Please check the email address.' });
    var row = {
      business_name: bizName.slice(0, 200),
      category: pick(answers, function (k) { return k === 'category'; }) || null,
      owner_name: pick(answers, function (k) { return k === 'owner name'; }) || null,
      email: email || null,
      phone: phone.join(' ').slice(0, 40) || null,
      website: website || null,
      description: pick(answers, function (k) { return k.indexOf('description') !== -1; }) || null
    };
    return insert('business_directory', row).then(function (res) {
      if (res.ok) emailCopy('[Website form] Business listing: ' + bizName, Object.assign({ Form: 'Christian Business' }, answers));
      else res.message = 'Something went wrong saving this listing. Please try again.';
      return res;
    });
  }

  function newsletter(email) {
    email = (email || '').trim();
    if (!EMAIL_RE.test(email)) return Promise.resolve({ ok: false, message: 'Please enter a valid email address.' });
    return insert('newsletter_subscribers', { email: email, source: 'home page' }).then(function (res) {
      if (res.ok) { emailCopy('[Website form] Newsletter sign-up', { Email: email }); return res; }
      if (res.status === 409) return { ok: true, note: 'You were already on the list.' };
      res.message = 'Something went wrong. Please try again.';
      return res;
    });
  }

  window.CCE_FORMS = { readForm: readForm, submitForm: submitForm, business: business, newsletter: newsletter };
})();
