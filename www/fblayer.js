/* fblayer.js: runs after the app. The admin signs in with a real Firebase account (admin@society.app);
   members keep the app's own ID + password login (auth/<id> documents). */
(function () {
  if (window.__FB_BAD) return;
  var auth = firebase.auth(), ADMIN = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.adminEmail) || 'admin@society.app', adminSub = false;
  var isAdminUser = function () { return !!auth.currentUser && auth.currentUser.email === ADMIN; };
  var doReload = function () { (window.__testReload || function () { location.reload(); })(); };
  var _doLogin = doLogin, _revalidate = revalidate, _setCred = setCred, _changePw = changePw;

  function adminOn() {
    S.platformAdmin = true; S.me = { uid: 'admin', role: 'admin', acc: 0, h: 'fb' }; S.tab = 'home'; S.lastPend = 0; refreshAdmin();
    if (!adminSub) {
      adminSub = true;
      S.db.collection('requests').onSnapshot(function (s) { S.reqDocs = s.docs.map(function (d) { return d.data(); }); checkPopup(); rerender(); }, function () { adminSub = false; });
      S.db.collection('pwreq').onSnapshot(function (s) { S.pwreqs = s.docs.map(function (d) { return d.data(); }); rerender(); }, function () {});
    }
    checkPopup();
  }

  var _gate = viewGate;
  window.viewGate = function () {
    if (S.forgot) { var had = S.auth.admin; if (!had) S.auth.admin = {}; try { return _gate(); } finally { if (!had) delete S.auth.admin; } }
    var msg = S.loginMsg ? '<div class="msg" role="alert">' + esc(S.loginMsg) + '</div>' : '';
    return '<div class="card gate"><h1>लॉगिन</h1><p>तुमचा आयडी आणि पासवर्ड टाका. (admin साठी आयडी: admin)</p>' +
      '<label for="l-id">आयडी</label><input id="l-id" data-keep type="text" autocapitalize="none" autocomplete="username" placeholder="उदा. m001">' +
      '<label for="l-pw">पासवर्ड</label><input id="l-pw" type="password" autocomplete="current-password">' + msg +
      '<button class="btn" data-act="login">लॉगिन करा</button>' +
      '<button class="back" data-act="fg-open" style="margin-top:12px">सभासद: पासवर्ड विसरलात?</button>' +
      '<button class="back" data-act="fg-admin" style="margin-top:4px">admin: पासवर्ड विसरलात? (ईमेलवर रीसेट)</button></div>';
  };
  document.addEventListener('click', async function (ev) {
    if (!ev.target.closest('[data-act=fg-admin]')) return;
    if (ADMIN === 'admin@society.app') return toast('admin चा खरा ईमेल अजून ठरवलेला नाही. मार्गदर्शकातील “admin ईमेल सेटअप” करा.');
    var m = ADMIN.replace(/^(.).*(@.*)$/, '$1***$2');
    if (!window.confirm('admin पासवर्ड रीसेट लिंक ' + m + ' वर पाठवायची?')) return;
    try { await auth.sendPasswordResetEmail(ADMIN); toast('रीसेट लिंक ' + m + ' वर पाठवली. ईमेल (स्पॅम सह) तपासा.'); }
    catch (e) { toast((e && e.code === 'auth/network-request-failed') ? 'इंटरनेट तपासा.' : 'लिंक पाठवता आली नाही'); }
  });

  window.doLogin = async function () {
    var idEl = $('l-id'), uid = idEl ? idEl.value.trim().toLowerCase() : '';
    if (uid !== 'admin') return _doLogin();
    if (Date.now() < S.lockUntil) { S.loginMsg = 'काही वेळाने पुन्हा प्रयत्न करा.'; return render(); }
    var pw = $('l-pw').value;
    try { await auth.signInWithEmailAndPassword(ADMIN, pw); }
    catch (e) {
      S.fails++;
      if (S.fails >= 5) { S.lockUntil = Date.now() + 30000; S.fails = 0; S.loginMsg = '५ वेळा चुकले. ३० सेकंद थांबा.'; }
      else S.loginMsg = (e && e.code === 'auth/network-request-failed') ? 'इंटरनेट तपासा.' : 'आयडी किंवा पासवर्ड चुकीचा आहे.';
      render(); var p = $('l-pw'); if (p) p.value = ''; return;
    }
    S.pid = auth.currentUser.uid; S.fails = 0; S.loginMsg = ''; adminOn(); render();
  };

  window.revalidate = function () {
    if (isAdminUser()) {
      /* an admin session is valid only if this page logged in (or has not been logged out by the app's auto-lock) */
      if (S.me && S.me.uid === 'admin') { S.platformAdmin = true; return; }
      auth.signOut(); return;
    }
    if (S.me && S.me.uid === 'admin') { S.me = null; remember(null); return; }
    _revalidate();
  };

  window.setCred = async function (uid, pw, role, acc) {
    if (uid === 'admin') { if (!isAdminUser()) throw new Error('not admin'); await auth.currentUser.updatePassword(pw); return; }
    return _setCred(uid, pw, role, acc);
  };

  window.changePw = async function () {
    if (!(S.me && S.me.uid === 'admin')) return _changePw();
    var o = val('pw-old'), n = val('pw-new'), n2 = val('pw-new2');
    if (n.length < 6) return toast('नवीन पासवर्ड किमान ६ अक्षरांचा ठेवा');
    if (n !== n2) return toast('दोन्ही नवीन पासवर्ड सारखे नाहीत');
    try { await auth.currentUser.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(ADMIN, o)); } catch (e) { return toast('सध्याचा पासवर्ड चुकीचा आहे'); }
    try { await auth.currentUser.updatePassword(n); ['pw-old', 'pw-new', 'pw-new2'].forEach(function (i) { var e = $(i); if (e) e.value = ''; }); toast('पासवर्ड बदलला'); }
    catch (e) { toast('बदल झाला नाही'); }
  };

  auth.onAuthStateChanged(function (u) {
    if (!u) return;
    S.pid = u.uid;
    if (u.email !== ADMIN && S.platformAdmin) { S.platformAdmin = false; S.reqDocs = []; S.pwreqs = []; adminSub = false; refreshAdmin(); rerender(); }
  });
  document.addEventListener('click', function (ev) { if (ev.target.closest('[data-act=logout]') && isAdminUser()) auth.signOut().then(function () { setTimeout(doReload, 120); }); }, true);
  /* app auto-lock logged the admin out of the app: also drop the Firebase admin session */
  setInterval(function () { if (isAdminUser() && !(S.me && S.me.uid === 'admin') && S.ready) auth.signOut().then(doReload); }, 3000);


  /* phone notifications through @capacitor/local-notifications (shown in the phone's notification panel) */
  var LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  if (LN) {
    var ready = function () { return LN.checkPermissions().then(function (p) { return p.display === 'granted' ? p : LN.requestPermissions(); }).then(function (p) { return p.display === 'granted'; }); };
    window.fbNotify = function (title, body) {
      ready().then(function (ok) {
        if (!ok) return;
        return LN.schedule({ notifications: [{ id: Math.floor(Math.random() * 2000000000), title: trS(title), body: trS(body || ''), schedule: { at: new Date(Date.now() + 400) } }] });
      }).catch(function () {});
    };
    setTimeout(function () { ready().catch(function () {}); }, 3000);
  }

  /* backup + import (admin) */
  var COLS = ['members', 'tx', 'invest', 'invtx', 'exp', 'perms', 'decisions', 'polls', 'votes', 'notices', 'profiles', 'ballots'], backupText = null;
  function snapshotAll() {
    var out = { _format: 'society-backup-v1' };
    var strip = function (x) { var d = Object.assign({}, x), id = d.id; delete d.id; return { id: id, data: d }; };
    out.members = S.members.map(strip); out.tx = S.tx.map(strip); out.invest = S.invest.map(strip); out.invtx = S.invtx.map(strip); out.exp = S.exp.map(strip);
    out.auth = Object.keys(S.auth).filter(function (k) { return k !== 'admin'; }).map(function (k) { return { id: k, data: S.auth[k] }; });
    out.perms = Object.keys(S.perms).map(function (k) { return { id: k, data: S.perms[k] }; });
    out.decisions = Object.keys(S.decisions).map(function (k) { return { id: k, data: S.decisions[k] }; });
    out.polls = S.polls.map(strip); out.votes = S.votes.map(strip); out.notices = S.notices.map(strip);
    out.ballots = S.ballots.map(strip);
    out.profiles = Object.keys(S.profiles).map(function (k) { return { id: k, data: S.profiles[k] }; });
    out.settings = S.settingsDoc ? [{ id: 'main', data: S.settingsDoc }] : [];
    return out;
  }
  var _more = VIEWS.more;
  VIEWS.more = function (C) {
    var h = _more(C);
    if (!S.admin) return h;
    return h + '<h2>डेटा बॅकअप</h2><div class="card"><div class="hint" style="margin:0">बॅकअप फाईल वेळोवेळी सेव्ह करून ठेवा. जुना डेटा नवीन ठिकाणी आणण्यासाठी तीच फाईल येथे आयात करा.</div>' +
      '<button class="btn" data-act="fb-export">बॅकअप फाईल (JSON) सेव्ह करा</button>' +
      '<label for="fb-file">आयात करण्यासाठी बॅकअप फाईल निवडा</label><input id="fb-file" type="file" accept="application/json,.json">' +
      '<button class="btn alt" data-act="fb-import">निवडलेली फाईल आयात करा</button></div>';
  };
  document.addEventListener('change', function (ev) {
    if (ev.target.id !== 'fb-file') return;
    var f = ev.target.files && ev.target.files[0]; backupText = null; if (!f) return;
    var fr = new FileReader(); fr.onload = function () { backupText = String(fr.result); toast('फाईल निवडली: ' + f.name); }; fr.readAsText(f);
  });
  document.addEventListener('click', async function (ev) {
    var b = ev.target.closest('[data-act]'); if (!b || !S.admin) return;
    if (b.dataset.act === 'fb-export') {
      try { await S.dl.save({ filename: 'society-backup-' + today() + '.json', data: JSON.stringify(snapshotAll()) }); toast('बॅकअप सेव्ह केला'); } catch (e) { if (!e || e.code !== 'declined') toast('बॅकअप सेव्ह झाला नाही'); }
    } else if (b.dataset.act === 'fb-import') {
      if (!backupText) return toast('आधी बॅकअप फाईल निवडा');
      var data; try { data = JSON.parse(backupText); } catch (e) { return toast('फाईल वाचता आली नाही'); }
      if (data._format !== 'society-backup-v1') return toast('ही बॅकअप फाईल ओळखता आली नाही');
      var cols = COLS.concat(['auth', 'settings']), n = cols.reduce(function (a, c) { return a + (data[c] || []).length; }, 0);
      ask('बॅकअप आयात करायचा?', [['एकूण नोंदी', String(n)], ['सभासद', String((data.members || []).length)], ['व्यवहार', String((data.tx || []).length)]], async function () {
        for (var i = 0; i < cols.length; i++) { var c = cols[i], list = data[c] || [];
          for (var j = 0; j < list.length; j++) { if (c === 'auth' && list[j].id === 'admin') continue; await S.db.doc(c + '/' + list[j].id).set(list[j].data); } }
        toast('आयात पूर्ण झाला');
      }, { ok: 'आयात करा', extra: 'त्याच आयडीच्या विद्यमान नोंदी बदलल्या जातील. नवीन नोंदी जोडल्या जातील.' });
    }
  });
})();
