// Member portal on Supabase: accounts, profile, teams, household, giving receipts, and a staff area.
// Permissions are enforced by row-level security in the database (supabase/002_church_database.sql);
// this script only shows staff screens to people whose staff_roles allow them.
(function () {
  'use strict';

  var cfg = window.CCE_CONFIG || {};
  var sbc = cfg.supabase || {};
  var PORTAL_URL = location.origin + location.pathname;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function say(el, text, tone) {
    el = typeof el === 'string' ? $(el) : el;
    if (!el) return;
    el.textContent = text || '';
    if (tone) el.setAttribute('data-tone', tone); else el.removeAttribute('data-tone');
  }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function orNull(v) { return v === '' ? null : v; }
  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return iso; }
  }
  function fmtWhen(iso) {
    try { return new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return iso; }
  }
  function money(cents) { return (Number(cents || 0) / 100).toLocaleString('en-CA', { style: 'currency', currency: 'CAD' }); }
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function niceErr(err) {
    var m = (err && (err.message || err.error_description || err.msg)) || 'Something went wrong. Please try again.';
    if (/invalid login credentials/i.test(m)) return 'That email and password do not match.';
    if (/email not confirmed/i.test(m)) return 'Please confirm your email first. Open the link we sent you, then sign in.';
    if (/rate limit|too many/i.test(m)) return 'Too many emails have been sent just now. Please wait a few minutes and try again.';
    if (/already registered/i.test(m)) return 'An account with that email already exists. Sign in, or reset your password.';
    if (/password should be/i.test(m)) return 'That password is too weak. Use at least 8 characters.';
    if (/duplicate key/i.test(m)) return 'That already exists.';
    if (/row-level security|permission denied/i.test(m)) return 'You do not have permission to do that.';
    return m;
  }

  if (!window.supabase || !sbc.url || !sbc.anonKey) {
    say('auth-note', 'The member portal could not connect. Please try again later.', 'error');
    return;
  }
  var db = window.supabase.createClient(sbc.url, sbc.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  var state = { user: null, roles: [], member: null, recovering: false, loaded: {} };
  function hasRole(list) { return state.roles.some(function (r) { return list.indexOf(r) !== -1; }); }

  // ------------------------------------------------------------------ auth screens
  var authForms = { signin: 'form-signin', create: 'form-create', forgot: 'form-forgot', reset: 'form-reset' };
  var authTitles = { signin: 'Sign in', create: 'Create your account', forgot: 'Reset your password', reset: 'Choose a new password' };
  function showAuth(which, note, tone) {
    Object.keys(authForms).forEach(function (k) { $(authForms[k]).hidden = k !== which; });
    $('auth-title').textContent = authTitles[which];
    say('auth-note', note || '', tone);
    $('screen-auth').hidden = false;
    $('screen-dash').hidden = true;
    $('signout').hidden = true;
  }
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { showAuth(b.getAttribute('data-go')); });
  });

  $('form-signin').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = val('si-email'), pass = $('si-pass').value;
    if (!EMAIL_RE.test(email) || !pass) { say('auth-note', 'Enter your email and password.', 'error'); return; }
    say('auth-note', 'Signing in…', 'busy');
    db.auth.signInWithPassword({ email: email, password: pass }).then(function (res) {
      if (res.error) say('auth-note', niceErr(res.error), 'error');
    });
  });

  $('form-create').addEventListener('submit', function (e) {
    e.preventDefault();
    var first = val('cr-first'), last = val('cr-last'), email = val('cr-email'), phone = val('cr-phone');
    var pass = $('cr-pass').value, pass2 = $('cr-pass2').value;
    if (!first || !last) return say('auth-note', 'Please enter your first and last name.', 'error');
    if (!EMAIL_RE.test(email)) return say('auth-note', 'Please enter a valid email address.', 'error');
    if (pass.length < 8) return say('auth-note', 'Your password needs at least 8 characters.', 'error');
    if (pass !== pass2) return say('auth-note', 'The two passwords do not match.', 'error');
    if (!$('cr-privacy').checked) return say('auth-note', 'Please agree to the privacy policy.', 'error');
    say('auth-note', 'Creating your account…', 'busy');
    db.auth.signUp({
      email: email,
      password: pass,
      options: { emailRedirectTo: PORTAL_URL, data: { first_name: first, last_name: last, phone: phone } }
    }).then(function (res) {
      if (res.error) return say('auth-note', niceErr(res.error), 'error');
      var u = res.data && res.data.user;
      if (u && Array.isArray(u.identities) && u.identities.length === 0) {
        return showAuth('signin', 'An account with that email already exists. Sign in, or use Forgot password.', 'error');
      }
      if (res.data && res.data.session) return; // signed in straight away (email confirmation is off)
      $('form-create').reset();
      showAuth('signin', 'Almost done. We sent a confirmation link to ' + email + '. Open it, then sign in here.');
    });
  });

  $('form-forgot').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = val('fg-email');
    if (!EMAIL_RE.test(email)) return say('auth-note', 'Please enter a valid email address.', 'error');
    say('auth-note', 'Sending…', 'busy');
    db.auth.resetPasswordForEmail(email, { redirectTo: PORTAL_URL }).then(function (res) {
      if (res.error) return say('auth-note', niceErr(res.error), 'error');
      showAuth('signin', 'If an account exists for ' + email + ', a reset link is on its way. Check your inbox.');
    });
  });

  $('form-reset').addEventListener('submit', function (e) {
    e.preventDefault();
    var pass = $('rs-pass').value, pass2 = $('rs-pass2').value;
    if (pass.length < 8) return say('auth-note', 'Your password needs at least 8 characters.', 'error');
    if (pass !== pass2) return say('auth-note', 'The two passwords do not match.', 'error');
    say('auth-note', 'Saving…', 'busy');
    db.auth.updateUser({ password: pass }).then(function (res) {
      if (res.error) return say('auth-note', niceErr(res.error), 'error');
      state.recovering = false;
      $('form-reset').reset();
      db.auth.getSession().then(function (s) { if (s.data.session) enter(s.data.session.user); });
    });
  });

  $('signout').addEventListener('click', function () { db.auth.signOut(); });

  db.auth.onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY') { state.recovering = true; showAuth('reset'); return; }
    if (state.recovering) return;
    if (session && session.user) {
      if (!state.user || state.user.id !== session.user.id) setTimeout(function () { enter(session.user); }, 0);
    } else if (event === 'SIGNED_OUT') {
      state.user = null; state.roles = []; state.member = null; state.loaded = {};
      showAuth('signin', 'You are signed out.');
    }
  });

  var hashError = /error_description=([^&]+)/.exec(location.hash);
  db.auth.getSession().then(function (res) {
    var session = res.data && res.data.session;
    if (state.recovering) return;
    if (session) enter(session.user);
    else if (hashError) showAuth('signin', decodeURIComponent(hashError[1].replace(/\+/g, ' ')) + '. Please request a new link.', 'error');
    else showAuth('signin');
  });

  // ------------------------------------------------------------------ dashboard
  function enter(user) {
    if (state.user && state.user.id === user.id && !$('screen-dash').hidden) return;
    state.user = user; state.loaded = {};
    $('screen-auth').hidden = true;
    $('screen-dash').hidden = false;
    $('signout').hidden = false;
    $('who').textContent = user.email;
    if (location.hash) history.replaceState(null, '', PORTAL_URL);

    db.from('staff_roles').select('role').eq('user_id', user.id).then(function (r) {
      state.roles = (r.data || []).map(function (x) { return x.role; });
      $('role-badges').innerHTML = state.roles.map(function (x) { return ' <span class="badge">' + esc(x.replace('_', ' ')) + '</span>'; }).join('');
      document.querySelectorAll('.staff-only').forEach(function (el) {
        var need = (el.getAttribute('data-roles') || '').split(' ').filter(Boolean);
        el.hidden = need.length ? !hasRole(need) : state.roles.length === 0;
      });
    });
    loadProfile();
    showSection('profile');
  }

  var loaders = {};
  function showSection(name) {
    document.querySelectorAll('#side-nav button[data-section]').forEach(function (b) {
      if (b.getAttribute('data-section') === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.panel[data-section]').forEach(function (p) { p.hidden = p.getAttribute('data-section') !== name; });
    if (loaders[name] && !state.loaded[name]) { state.loaded[name] = true; loaders[name](); }
  }
  $('side-nav').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-section]');
    if (b) showSection(b.getAttribute('data-section'));
  });

  // ------------------------------------------------------------------ profile
  var PROFILE = [['p-first', 'first_name'], ['p-pref', 'preferred_name'], ['p-last', 'last_name'], ['p-email', 'email'], ['p-phone', 'phone'], ['p-address', 'address'], ['p-birthday', 'birthday'], ['p-gender', 'gender']];
  function fillProfile(m) {
    state.member = m;
    PROFILE.forEach(function (p) { $(p[0]).value = m[p[1]] || ''; });
    $('p-since').value = m.member_since ? String(m.member_since).slice(0, 7) : '';
    var st = m.membership_status || 'pending';
    $('p-status').textContent = st;
    $('p-status').className = 'badge' + (st === 'member' ? ' member' : '');
  }
  function loadProfile() {
    var u = state.user;
    db.from('members').select('*').eq('id', u.id).maybeSingle().then(function (r) {
      if (r.error) return say('profile-status', niceErr(r.error), 'error');
      if (r.data) return fillProfile(r.data);
      var meta = u.user_metadata || {};
      db.from('members').insert({ id: u.id, email: u.email, first_name: meta.first_name || null, last_name: meta.last_name || null, phone: meta.phone || null })
        .then(function () { return db.from('members').select('*').eq('id', u.id).maybeSingle(); })
        .then(function (r2) { if (r2 && r2.data) fillProfile(r2.data); });
    });
  }
  $('sec-profile').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = val('p-email');
    if (email && !EMAIL_RE.test(email)) return say('profile-status', 'Please check the contact email.', 'error');
    var row = {};
    PROFILE.forEach(function (p) { row[p[1]] = orNull(val(p[0])); });
    var since = val('p-since');
    row.member_since = since ? since + '-01' : null;
    say('profile-status', 'Saving…', 'busy');
    db.from('members').update(row).eq('id', state.user.id).select().maybeSingle().then(function (r) {
      if (r.error) return say('profile-status', niceErr(r.error), 'error');
      if (r.data) fillProfile(r.data);
      say('profile-status', 'Saved.');
    });
  });

  // ------------------------------------------------------------------ teams
  var myUnits = [];
  loaders.teams = function () {
    Promise.all([
      db.from('serving_units').select('id,name,kind,sort_order').order('sort_order'),
      db.from('member_units').select('unit_id').eq('member_id', state.user.id)
    ]).then(function (res) {
      if (res[0].error) return say('teams-status', niceErr(res[0].error), 'error');
      myUnits = (res[1].data || []).map(function (x) { return x.unit_id; });
      var box = function (u) {
        return '<label class="check"><input type="checkbox" value="' + u.id + '" data-kind="' + u.kind + '"' + (myUnits.indexOf(u.id) !== -1 ? ' checked' : '') + '>' + esc(u.name) + '</label>';
      };
      var units = res[0].data || [];
      $('units-list').innerHTML = units.filter(function (u) { return u.kind === 'unit'; }).map(box).join('');
      $('groups-list').innerHTML = units.filter(function (u) { return u.kind === 'fellowship'; }).map(box).join('');
      checkUnitWarning();
    });
  };
  function checkUnitWarning() {
    $('units-warn').hidden = $('units-list').querySelectorAll('input:checked').length <= 2;
  }
  $('units-list').addEventListener('change', checkUnitWarning);
  $('sec-teams').addEventListener('submit', function (e) {
    e.preventDefault();
    var picked = Array.prototype.map.call($('sec-teams').querySelectorAll('input[type=checkbox]:checked'), function (i) { return Number(i.value); });
    var add = picked.filter(function (id) { return myUnits.indexOf(id) === -1; });
    var remove = myUnits.filter(function (id) { return picked.indexOf(id) === -1; });
    say('teams-status', 'Saving…', 'busy');
    var jobs = [];
    if (remove.length) jobs.push(db.from('member_units').delete().eq('member_id', state.user.id).in('unit_id', remove));
    if (add.length) jobs.push(db.from('member_units').insert(add.map(function (id) { return { member_id: state.user.id, unit_id: id }; })));
    Promise.all(jobs).then(function (res) {
      var bad = res.filter(function (r) { return r.error; })[0];
      if (bad) return say('teams-status', niceErr(bad.error), 'error');
      myUnits = picked;
      say('teams-status', 'Saved.');
    });
  });

  // ------------------------------------------------------------------ giving receipts (member)
  loaders.giving = function () {
    db.from('giving_receipts').select('id,tax_year,amount_cents,receipt_number,file_path').eq('member_id', state.user.id).order('tax_year', { ascending: false }).then(function (r) {
      if (r.error) return say('giving-status', niceErr(r.error), 'error');
      var rows = r.data || [];
      $('giving-empty').hidden = rows.length > 0;
      $('giving-rows').innerHTML = rows.map(function (x) {
        return '<tr><td>' + esc(x.tax_year) + '</td><td>' + esc(money(x.amount_cents)) + '</td><td>' + esc(x.receipt_number || '') + '</td><td>' +
          (x.file_path ? '<button type="button" class="btn small secondary" data-receipt="' + esc(x.file_path) + '">Download PDF</button>' : '<span class="muted">Not uploaded</span>') + '</td></tr>';
      }).join('');
    });
  };
  $('giving-rows').addEventListener('click', function (e) {
    var b = e.target.closest('[data-receipt]');
    if (!b) return;
    say('giving-status', 'Preparing your receipt…', 'busy');
    db.storage.from('receipts').createSignedUrl(b.getAttribute('data-receipt'), 120).then(function (r) {
      if (r.error) return say('giving-status', niceErr(r.error), 'error');
      say('giving-status', '');
      window.open(r.data.signedUrl, '_blank', 'noopener');
    });
  });

  // ------------------------------------------------------------------ household
  loaders.household = function () {
    db.from('household_members').select('id,name,relationship,birthday').eq('member_id', state.user.id).order('created_at').then(function (r) {
      if (r.error) return say('hh-status', niceErr(r.error), 'error');
      var rows = r.data || [];
      $('hh-empty').hidden = rows.length > 0;
      $('hh-list').innerHTML = rows.map(function (x) {
        return '<li><div class="meta"><strong>' + esc(x.name) + '</strong><span class="muted">' + esc(x.relationship || '') + (x.birthday ? ' · born ' + esc(fmtDate(x.birthday)) : '') + '</span></div>' +
          '<button type="button" class="btn small danger" data-hh-remove="' + x.id + '">Remove</button></li>';
      }).join('');
    });
  };
  $('hh-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-hh-remove]');
    if (!b) return;
    db.from('household_members').delete().eq('id', Number(b.getAttribute('data-hh-remove'))).then(function (r) {
      if (r.error) return say('hh-status', niceErr(r.error), 'error');
      say('hh-status', 'Removed.');
      loaders.household();
    });
  });
  $('form-hh').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = val('hh-name');
    if (!name) return say('hh-status', 'Please enter a name.', 'error');
    say('hh-status', 'Saving…', 'busy');
    db.from('household_members').insert({ member_id: state.user.id, name: name, relationship: val('hh-rel') || null, birthday: orNull(val('hh-bday')) }).then(function (r) {
      if (r.error) return say('hh-status', niceErr(r.error), 'error');
      $('form-hh').reset();
      say('hh-status', 'Added.');
      loaders.household();
    });
  });

  // ------------------------------------------------------------------ staff: shared item renderer
  var STATUSES = ['new', 'in progress', 'done', 'declined', 'spam'];
  function statusSelect(current, list) {
    return '<select data-field="status">' + (list || STATUSES).map(function (s) { return '<option' + (s === current ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>';
  }
  function answersList(obj) {
    var keys = Object.keys(obj || {});
    if (!keys.length) return '';
    return '<dl class="answers">' + keys.map(function (k) { return '<dt>' + esc(k) + '</dt><dd>' + esc(obj[k]) + '</dd>'; }).join('') + '</dl>';
  }
  function applyStatusFilter(q, value) {
    if (value === 'open') return q.in('status', ['new', 'in progress']);
    if (value) return q.eq('status', value);
    return q;
  }

  // ------------------------------------------------------------------ staff: form submissions
  loaders.submissions = function () {
    var sel = $('sub-type');
    if (sel.options.length === 1) {
      db.from('form_types').select('code').order('code').then(function (r) {
        (r.data || []).forEach(function (t) { var o = document.createElement('option'); o.textContent = t.code; sel.appendChild(o); });
      });
    }
    say('sub-status-msg', 'Loading…', 'busy');
    var q = db.from('form_submissions').select('id,created_at,form_type,name,email,phone,answers,status,assigned_to,notes,confidential').order('created_at', { ascending: false }).limit(200);
    if (val('sub-type')) q = q.eq('form_type', val('sub-type'));
    q = applyStatusFilter(q, val('sub-status'));
    q.then(function (r) {
      if (r.error) return say('sub-status-msg', niceErr(r.error), 'error');
      var rows = r.data || [];
      say('sub-status-msg', rows.length + (rows.length === 1 ? ' submission' : ' submissions'));
      $('sub-list').innerHTML = rows.length ? rows.map(function (x) {
        var contact = [x.email ? '<a href="mailto:' + esc(x.email) + '">' + esc(x.email) + '</a>' : '', x.phone ? '<a href="tel:' + esc(x.phone) + '">' + esc(x.phone) + '</a>' : ''].filter(Boolean).join(' · ');
        return '<details class="item" data-id="' + x.id + '"><summary><span class="when">' + esc(fmtWhen(x.created_at)) + '</span><span class="badge">' + esc(x.form_type) + '</span>' +
          (x.confidential ? '<span class="badge conf">Confidential</span>' : '') + '<span class="who">' + esc(x.name || 'No name') + '</span><span class="badge ' + esc(x.status === 'new' ? 'new' : (x.status === 'done' ? 'done' : '')) + '">' + esc(x.status) + '</span></summary>' +
          '<div class="body">' + (contact ? '<div>' + contact + '</div>' : '') + answersList(x.answers) +
          '<div class="grid three"><label>Status' + statusSelect(x.status) + '</label><label>Assigned to<input data-field="assigned_to" value="' + esc(x.assigned_to || '') + '"></label></div>' +
          '<label>Notes<textarea data-field="notes">' + esc(x.notes || '') + '</textarea></label>' +
          '<div class="row"><button type="button" class="btn small" data-save-sub>Save</button><span class="status" role="status"></span></div></div></details>';
      }).join('') : '<p class="empty">Nothing here.</p>';
    });
  };
  $('sub-refresh').addEventListener('click', function () { loaders.submissions(); });
  $('sub-type').addEventListener('change', function () { loaders.submissions(); });
  $('sub-status').addEventListener('change', function () { loaders.submissions(); });
  $('sub-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-save-sub]');
    if (!b) return;
    var item = b.closest('.item'), note = b.parentNode.querySelector('.status');
    var status = item.querySelector('[data-field=status]').value;
    say(note, 'Saving…', 'busy');
    db.from('form_submissions').update({
      status: status,
      assigned_to: orNull(item.querySelector('[data-field=assigned_to]').value.trim()),
      notes: orNull(item.querySelector('[data-field=notes]').value.trim()),
      handled_at: status === 'done' || status === 'declined' ? new Date().toISOString() : null
    }).eq('id', Number(item.getAttribute('data-id'))).then(function (r) {
      say(note, r.error ? niceErr(r.error) : 'Saved.', r.error ? 'error' : '');
    });
  });

  // ------------------------------------------------------------------ staff: feedback
  loaders.feedback = function () {
    say('fb-status-msg', 'Loading…', 'busy');
    var q = applyStatusFilter(db.from('feedback').select('id,created_at,page,name,department,message,url,status,notes').order('created_at', { ascending: false }).limit(300), val('fb-status'));
    q.then(function (r) {
      if (r.error) return say('fb-status-msg', niceErr(r.error), 'error');
      var rows = r.data || [];
      say('fb-status-msg', rows.length + ' comments');
      $('fb-list').innerHTML = rows.length ? rows.map(function (x) {
        return '<details class="item" data-id="' + x.id + '"><summary><span class="when">' + esc(fmtWhen(x.created_at)) + '</span><span class="badge">' + esc(x.page) + '</span><span class="who">' + esc(x.name) + (x.department ? ' · ' + esc(x.department) : '') + '</span><span class="badge ' + (x.status === 'new' ? 'new' : (x.status === 'done' ? 'done' : '')) + '">' + esc(x.status) + '</span></summary>' +
          '<div class="body"><p style="white-space:pre-wrap">' + esc(x.message) + '</p>' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">Open the page they were on</a>' : '') +
          '<div class="grid two"><label>Status' + statusSelect(x.status, ['new', 'in progress', 'done', 'declined']) + '</label></div>' +
          '<label>Notes<textarea data-field="notes">' + esc(x.notes || '') + '</textarea></label>' +
          '<div class="row"><button type="button" class="btn small" data-save-fb>Save</button><span class="status" role="status"></span></div></div></details>';
      }).join('') : '<p class="empty">Nothing here.</p>';
    });
  };
  $('fb-refresh').addEventListener('click', function () { loaders.feedback(); });
  $('fb-status').addEventListener('change', function () { loaders.feedback(); });
  $('fb-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-save-fb]');
    if (!b) return;
    var item = b.closest('.item'), note = b.parentNode.querySelector('.status');
    say(note, 'Saving…', 'busy');
    db.from('feedback').update({ status: item.querySelector('[data-field=status]').value, notes: orNull(item.querySelector('[data-field=notes]').value.trim()) })
      .eq('id', Number(item.getAttribute('data-id'))).then(function (r) { say(note, r.error ? niceErr(r.error) : 'Saved.', r.error ? 'error' : ''); });
  });

  // ------------------------------------------------------------------ staff: members
  var allMembers = [];
  function renderMembers() {
    var q = val('mem-search').toLowerCase();
    var rows = allMembers.filter(function (m) {
      return !q || [m.first_name, m.preferred_name, m.last_name, m.email, m.phone].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    $('mem-rows').innerHTML = rows.map(function (m) {
      var name = [m.preferred_name || m.first_name, m.last_name].filter(Boolean).join(' ') || '(no name yet)';
      var canEdit = hasRole(['admin', 'office']);
      return '<tr data-id="' + esc(m.id) + '"><td>' + esc(name) + '</td><td>' + (m.email ? '<a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' : '') + '</td><td>' + esc(m.phone || '') + '</td><td>' + esc(fmtDate(m.created_at)) + '</td><td>' +
        (canEdit ? '<select data-mem-status>' + ['pending', 'member', 'inactive'].map(function (s) { return '<option' + (s === m.membership_status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' : '<span class="badge">' + esc(m.membership_status) + '</span>') + '</td></tr>';
    }).join('');
    say('mem-status-msg', rows.length + ' of ' + allMembers.length + ' accounts');
  }
  loaders.members = function () {
    say('mem-status-msg', 'Loading…', 'busy');
    db.from('members').select('id,first_name,preferred_name,last_name,email,phone,created_at,membership_status').order('created_at', { ascending: false }).limit(1000).then(function (r) {
      if (r.error) return say('mem-status-msg', niceErr(r.error), 'error');
      allMembers = r.data || [];
      renderMembers();
    });
  };
  $('mem-search').addEventListener('input', renderMembers);
  $('mem-refresh').addEventListener('click', function () { loaders.members(); });
  $('mem-rows').addEventListener('change', function (e) {
    var s = e.target.closest('[data-mem-status]');
    if (!s) return;
    var id = s.closest('tr').getAttribute('data-id');
    db.from('members').update({ membership_status: s.value }).eq('id', id).then(function (r) {
      if (r.error) return say('mem-status-msg', niceErr(r.error), 'error');
      allMembers.forEach(function (m) { if (m.id === id) m.membership_status = s.value; });
      say('mem-status-msg', 'Status saved.');
    });
  });

  // ------------------------------------------------------------------ staff: business listings
  loaders.business = function () {
    say('biz-status-msg', 'Loading…', 'busy');
    db.from('business_directory').select('*').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) return say('biz-status-msg', niceErr(r.error), 'error');
      var rows = r.data || [];
      say('biz-status-msg', rows.filter(function (x) { return !x.approved; }).length + ' waiting for approval');
      $('biz-list').innerHTML = rows.length ? rows.map(function (x) {
        var contact = [x.email, x.phone, x.website].filter(Boolean).map(esc).join(' · ');
        return '<details class="item" data-id="' + x.id + '"' + (x.approved ? '' : ' open') + '><summary><span class="when">' + esc(fmtDate(x.created_at)) + '</span><span class="who">' + esc(x.business_name) + '</span>' + (x.category ? '<span class="badge">' + esc(x.category) + '</span>' : '') +
          '<span class="badge ' + (x.approved ? 'approved' : 'new') + '">' + (x.approved ? 'approved' : 'waiting') + '</span></summary><div class="body">' +
          '<dl class="answers"><dt>Owner</dt><dd>' + esc(x.owner_name || '') + '</dd><dt>Contact</dt><dd>' + contact + '</dd><dt>Description</dt><dd>' + esc(x.description || '') + '</dd></dl>' +
          '<div class="row">' + (x.approved ? '<button type="button" class="btn small secondary" data-biz="unapprove">Hide from directory</button>' : '<button type="button" class="btn small" data-biz="approve">Approve</button>') +
          '<button type="button" class="btn small danger" data-biz="delete">Delete</button><span class="status" role="status"></span></div></div></details>';
      }).join('') : '<p class="empty">No listings yet.</p>';
    });
  };
  $('biz-refresh').addEventListener('click', function () { loaders.business(); });
  $('biz-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-biz]');
    if (!b) return;
    var item = b.closest('.item'), id = Number(item.getAttribute('data-id')), action = b.getAttribute('data-biz'), note = b.parentNode.querySelector('.status');
    var job;
    if (action === 'delete') {
      if (!confirm('Delete this listing permanently?')) return;
      job = db.from('business_directory').delete().eq('id', id);
    } else {
      var on = action === 'approve';
      job = db.from('business_directory').update({ approved: on, approved_at: on ? new Date().toISOString() : null }).eq('id', id);
    }
    say(note, 'Saving…', 'busy');
    job.then(function (r) { if (r.error) return say(note, niceErr(r.error), 'error'); loaders.business(); });
  });

  // ------------------------------------------------------------------ staff: newsletter
  var subscribers = [];
  loaders.newsletter = function () {
    say('nl-status-msg', 'Loading…', 'busy');
    db.from('newsletter_subscribers').select('id,email,created_at,source,unsubscribed_at').order('created_at', { ascending: false }).then(function (r) {
      if (r.error) return say('nl-status-msg', niceErr(r.error), 'error');
      subscribers = r.data || [];
      var active = subscribers.filter(function (x) { return !x.unsubscribed_at; }).length;
      say('nl-status-msg', active + ' active of ' + subscribers.length);
      $('nl-rows').innerHTML = subscribers.map(function (x) {
        return '<tr data-id="' + x.id + '"><td>' + esc(x.email) + (x.unsubscribed_at ? ' <span class="badge">unsubscribed</span>' : '') + '</td><td>' + esc(fmtDate(x.created_at)) + '</td><td>' + esc(x.source || '') + '</td><td>' +
          '<button type="button" class="btn small secondary" data-nl="' + (x.unsubscribed_at ? 'resub' : 'unsub') + '">' + (x.unsubscribed_at ? 'Resubscribe' : 'Unsubscribe') + '</button></td></tr>';
      }).join('');
    });
  };
  $('nl-refresh').addEventListener('click', function () { loaders.newsletter(); });
  $('nl-copy').addEventListener('click', function () {
    var list = subscribers.filter(function (x) { return !x.unsubscribed_at; }).map(function (x) { return x.email; }).join(', ');
    if (!list) return say('nl-status-msg', 'No active subscribers yet.', 'error');
    (navigator.clipboard ? navigator.clipboard.writeText(list) : Promise.reject()).then(function () { say('nl-status-msg', 'Copied. Paste into your email BCC line.'); }, function () { window.prompt('Copy these addresses:', list); });
  });
  $('nl-rows').addEventListener('click', function (e) {
    var b = e.target.closest('[data-nl]');
    if (!b) return;
    var id = Number(b.closest('tr').getAttribute('data-id'));
    db.from('newsletter_subscribers').update({ unsubscribed_at: b.getAttribute('data-nl') === 'unsub' ? new Date().toISOString() : null }).eq('id', id).then(function (r) {
      if (r.error) return say('nl-status-msg', niceErr(r.error), 'error');
      loaders.newsletter();
    });
  });

  // ------------------------------------------------------------------ staff: issue receipts
  function findMemberByEmail(email) {
    return db.from('members').select('id,first_name,last_name,email').ilike('email', email).limit(2).then(function (r) {
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) throw new Error('No portal account found with that email. The member needs to create an account first.');
      if (r.data.length > 1) throw new Error('More than one account uses that email. Ask the office to tidy the member records.');
      return r.data[0];
    });
  }
  $('rc-year').value = String(new Date().getFullYear() - 1);
  $('sec-receipts').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = val('rc-email'), year = Number(val('rc-year')), amount = Number(val('rc-amount')), file = $('rc-file').files[0];
    if (!EMAIL_RE.test(email)) return say('rc-status', 'Enter the member\'s email.', 'error');
    if (!(year >= 2000 && year <= 2100)) return say('rc-status', 'Enter the tax year.', 'error');
    if (!(amount >= 0)) return say('rc-status', 'Enter the total amount.', 'error');
    if (!file) return say('rc-status', 'Attach the receipt PDF.', 'error');
    if (file.type && file.type !== 'application/pdf') return say('rc-status', 'The receipt must be a PDF.', 'error');
    say('rc-status', 'Uploading…', 'busy');
    var member, path;
    findMemberByEmail(email).then(function (m) {
      member = m; path = m.id + '/' + year + '.pdf';
      return db.storage.from('receipts').upload(path, file, { upsert: true, contentType: 'application/pdf' });
    }).then(function (up) {
      if (up.error) throw up.error;
      return db.from('giving_receipts').upsert({ member_id: member.id, tax_year: year, amount_cents: Math.round(amount * 100), receipt_number: orNull(val('rc-number')), file_path: path, issued_at: new Date().toISOString() }, { onConflict: 'member_id,tax_year' });
    }).then(function (r) {
      if (r.error) throw r.error;
      $('sec-receipts').reset();
      $('rc-year').value = String(year);
      say('rc-status', 'Receipt issued to ' + ([member.first_name, member.last_name].filter(Boolean).join(' ') || member.email) + ' for ' + year + '.');
    }).catch(function (err) { say('rc-status', niceErr(err), 'error'); });
  });

  // ------------------------------------------------------------------ staff: roles
  loaders.roles = function () {
    db.from('staff_roles').select('user_id,role,granted_at').order('granted_at').then(function (r) {
      if (r.error) return say('ro-status', niceErr(r.error), 'error');
      var rows = r.data || [];
      var ids = rows.map(function (x) { return x.user_id; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      (ids.length ? db.from('members').select('id,first_name,last_name,email').in('id', ids) : Promise.resolve({ data: [] })).then(function (m) {
        var byId = {};
        (m.data || []).forEach(function (x) { byId[x.id] = x; });
        $('ro-rows').innerHTML = rows.map(function (x) {
          var p = byId[x.user_id] || {};
          var who = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || x.user_id;
          return '<tr data-user="' + esc(x.user_id) + '" data-role="' + esc(x.role) + '"><td>' + esc(who) + (p.email && who !== p.email ? '<br><span class="muted">' + esc(p.email) + '</span>' : '') + '</td><td><span class="badge">' + esc(x.role.replace('_', ' ')) + '</span></td><td>' + esc(fmtDate(x.granted_at)) + '</td><td><button type="button" class="btn small danger" data-ro-remove>Remove</button></td></tr>';
        }).join('');
      });
    });
  };
  $('form-role').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = val('ro-email'), role = val('ro-role');
    if (!EMAIL_RE.test(email)) return say('ro-status', 'Enter the person\'s email.', 'error');
    say('ro-status', 'Saving…', 'busy');
    findMemberByEmail(email).then(function (m) {
      return db.from('staff_roles').insert({ user_id: m.id, role: role });
    }).then(function (r) {
      if (r.error) throw (/duplicate/i.test(r.error.message) ? new Error('They already have that role.') : r.error);
      $('form-role').reset();
      say('ro-status', 'Role granted.');
      loaders.roles();
    }).catch(function (err) { say('ro-status', niceErr(err), 'error'); });
  });
  $('ro-rows').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ro-remove]');
    if (!b) return;
    var tr = b.closest('tr'), user = tr.getAttribute('data-user'), role = tr.getAttribute('data-role');
    if (user === state.user.id && role === 'admin' && !confirm('Remove your own admin role? You will lose access to this screen.')) return;
    db.from('staff_roles').delete().eq('user_id', user).eq('role', role).then(function (r) {
      if (r.error) return say('ro-status', niceErr(r.error), 'error');
      say('ro-status', 'Role removed.');
      loaders.roles();
    });
  });
})();
