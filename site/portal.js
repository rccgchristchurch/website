/* Member portal prototype. All data lives in localStorage under cce.portal.* */
(function () {
  'use strict';

  var PREFIX = 'cce.portal.';
  var UNITS = ['Prayer', 'Choir (Living Stone Voices)', 'Evangelism', 'Welcome', 'Media', 'Drama',
    'Hospitality', 'Sanctuary Keepers', 'Ushering', 'Sunday School', 'Transportation', 'Beautification'];
  var GROUPS = ['Men of Impact', 'Women of Zion', 'Couples', 'Christ Church Seniors',
    'Lighthouse (young adults)', 'House Fellowship'];
  var YEARS = [2023, 2024, 2025];
  var PROFILE_FIELDS = ['first', 'preferred', 'last', 'email', 'phone', 'address', 'birthday', 'since', 'gender'];

  // ---- storage helpers (every access wrapped) ----
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }
  function remove(key) {
    try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
  }
  // Per-member keys so two reviewers on one machine do not overwrite each other.
  function memberKey(name) { return 'member.' + (session || 'anon') + '.' + name; }

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function flash(id, text, tone) {
    var el = $(id);
    el.textContent = text;
    if (tone) el.setAttribute('data-tone', tone); else el.removeAttribute('data-tone');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.textContent = ''; }, 3500);
  }

  var session = load('session', null);

  // ---- screens ----
  function showScreen(signedIn) {
    $('screen-auth').hidden = signedIn;
    $('screen-dash').hidden = !signedIn;
    $('signout').hidden = !signedIn;
    if (signedIn) {
      $('who').textContent = session;
      loadProfile();
      loadTeams();
      renderHousehold();
      setStatementLink();
      showSection('profile');
    }
  }

  function signIn(email) {
    session = String(email || '').trim().toLowerCase();
    save('session', session);
    showScreen(true);
  }

  function showSection(name) {
    var panels = document.querySelectorAll('[data-section]');
    for (var i = 0; i < panels.length; i++) {
      var el = panels[i];
      var match = el.getAttribute('data-section') === name;
      if (el.tagName === 'BUTTON') {
        if (match) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
      } else {
        el.hidden = !match;
      }
    }
    var heading = document.querySelector('#sec-' + name + ' h2');
    if (heading && window.innerWidth < 860) heading.scrollIntoView({ block: 'start' });
  }

  // ---- auth forms ----
  $('form-signin').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('si-email').value.trim();
    if (!email) { flash('auth-note', 'Please enter your email.', 'warn'); $('si-email').focus(); return; }
    signIn(email);
  });

  $('form-create').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('cr-email').value.trim();
    if (!email) { $('cr-email').focus(); return; }
    var parts = $('cr-name').value.trim().split(/\s+/);
    session = email.toLowerCase();
    save('session', session);
    save(memberKey('profile'), {
      first: parts[0] || '', last: parts.slice(1).join(' '), email: email,
      phone: $('cr-phone').value.trim()
    });
    showScreen(true);
  });

  $('to-create').addEventListener('click', function () {
    $('form-signin').hidden = true;
    $('form-create').hidden = false;
    $('auth-title').textContent = 'Create your profile';
    $('cr-name').focus();
  });
  $('to-signin').addEventListener('click', function () {
    $('form-create').hidden = true;
    $('form-signin').hidden = false;
    $('auth-title').textContent = 'Sign in';
    $('si-email').focus();
  });
  $('forgot').addEventListener('click', function () {
    var email = $('si-email').value.trim();
    flash('auth-note', email
      ? 'A password reset email would be sent to ' + email + '. (Prototype: no email is sent.)'
      : 'Enter your email above and a password reset link would be sent to it. (Prototype: no email is sent.)');
  });
  $('signout').addEventListener('click', function () {
    remove('session');
    session = null;
    $('si-pass').value = '';
    showScreen(false);
    $('si-email').focus();
  });

  // ---- section nav ----
  $('side-nav').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-section]');
    if (btn) showSection(btn.getAttribute('data-section'));
  });

  // ---- profile ----
  function loadProfile() {
    var data = load(memberKey('profile'), {});
    if (!data.email) data.email = session;
    var form = $('sec-profile');
    PROFILE_FIELDS.forEach(function (f) { form.elements[f].value = data[f] || ''; });
  }
  $('sec-profile').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target, data = {};
    PROFILE_FIELDS.forEach(function (f) { data[f] = form.elements[f].value.trim(); });
    var ok = save(memberKey('profile'), data);
    flash('profile-status', ok ? 'Saved' : 'Could not save in this browser', ok ? '' : 'warn');
  });

  // ---- teams ----
  function renderChecks(containerId, items, prefix, chosen) {
    var html = '';
    items.forEach(function (name, i) {
      var id = prefix + i;
      var on = chosen.indexOf(name) !== -1 ? ' checked' : '';
      html += '<label class="check" for="' + id + '"><input type="checkbox" id="' + id + '" value="' + esc(name) + '"' + on + '>' + esc(name) + '</label>';
    });
    $(containerId).innerHTML = html;
  }
  function checked(containerId) {
    var boxes = $(containerId).querySelectorAll('input:checked'), out = [];
    for (var i = 0; i < boxes.length; i++) out.push(boxes[i].value);
    return out;
  }
  function updateUnitsWarning() {
    $('units-warn').hidden = checked('units-list').length <= 2;
  }
  function loadTeams() {
    var data = load(memberKey('teams'), { units: [], groups: [] });
    renderChecks('units-list', UNITS, 'unit-', data.units || []);
    renderChecks('groups-list', GROUPS, 'group-', data.groups || []);
    updateUnitsWarning();
  }
  $('units-list').addEventListener('change', updateUnitsWarning);
  $('sec-teams').addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = save(memberKey('teams'), { units: checked('units-list'), groups: checked('groups-list') });
    flash('teams-status', ok ? 'Saved' : 'Could not save in this browser', ok ? '' : 'warn');
  });

  // ---- giving receipts (static until online giving is connected) ----
  (function renderGiving() {
    var html = '';
    YEARS.forEach(function (y) {
      html += '<tr><th scope="row" style="font:600 16px \'Source Sans 3\',system-ui;color:#2B3540;text-transform:none;letter-spacing:0">' + y + '</th>' +
        '<td>&mdash;</td>' +
        '<td><button type="button" class="btn secondary small" disabled title="Available once online giving is connected">Download PDF</button></td></tr>';
    });
    $('giving-rows').innerHTML = html;
  })();
  function setStatementLink() {
    var subject = 'Giving statement request' + (session ? ' - ' + session : '');
    var body = 'Hello,\n\nPlease send me a statement of my giving for the years: \n\nThank you.';
    $('request-statement').href = 'mailto:info@rccgchristchurch.ca?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  // ---- household ----
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  function renderHousehold() {
    var list = load(memberKey('household'), []);
    var html = '';
    list.forEach(function (m, i) {
      html += '<li><div class="meta"><strong>' + esc(m.name) + '</strong><span class="muted">' + esc(m.relationship) +
        (m.birthday ? ' · Birthday ' + esc(fmtDate(m.birthday)) : '') + '</span></div>' +
        '<button type="button" class="btn secondary small" data-remove="' + i + '" aria-label="Remove ' + esc(m.name) + '">Remove</button></li>';
    });
    $('hh-list').innerHTML = html;
    $('hh-empty').hidden = list.length > 0;
  }
  $('form-hh').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('hh-name').value.trim();
    if (!name) { flash('hh-status', 'Please enter a name.', 'warn'); $('hh-name').focus(); return; }
    var list = load(memberKey('household'), []);
    list.push({ name: name, relationship: $('hh-rel').value, birthday: $('hh-bday').value });
    var ok = save(memberKey('household'), list);
    renderHousehold();
    $('hh-name').value = ''; $('hh-bday').value = ''; $('hh-rel').selectedIndex = 0;
    flash('hh-status', ok ? 'Added' : 'Could not save in this browser', ok ? '' : 'warn');
    $('hh-name').focus();
  });
  $('hh-list').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-remove]');
    if (!btn) return;
    var list = load(memberKey('household'), []);
    list.splice(Number(btn.getAttribute('data-remove')), 1);
    save(memberKey('household'), list);
    renderHousehold();
  });

  // ---- boot ----
  showScreen(!!session);
})();
