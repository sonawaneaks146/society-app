/* fblayer.js: runs after the app. The admin signs in with a real Firebase account (admin@society.app);
   members keep the app's own ID + password login (auth/<id> documents). */
(function () {
  if (window.__FB_BAD) return;
  var auth = firebase.auth(), ADMIN = 'admin@society.app', adminSub = false;
  var isAdminUser = function () { return !!auth.currentUser && auth.currentUser.email === ADMIN; };
  var _doLogin = doLogin, _revalidate = revalidate, _setCred = setCred, _changePw = changePw;

  function adminOn() {
    S.platformAdmin = true; S.me = { uid: 'admin', role: 'admin', acc: 0, h: 'fb' }; S.tab = 'home'; S.lastPend = 0; refreshAdmin();
    if (!adminSub) {
      adminSub = true;
      S.db.collection('requests').onSnapshot(function (s) { S.reqDocs = s.docs.map(function (d) { return d.data(); }); checkPopup(); rerender(); }, function () { adminSub = false; });
    }
    checkPopup();
  }

  window.viewGate = function () {
    var msg = S.loginMsg ? '<div class="msg" role="alert">' + esc(S.loginMsg) + '</div>' : '';
    return '<div class="card gate"><h1>लॉगिन</h1><p>तुमचा आयडी आणि पासवर्ड टाका. (admin साठी आयडी: admin)</p>' +
      '<label for="l-id">आयडी</label><input id="l-id" data-keep type="text" autocapitalize="none" autocomplete="username" placeholder="उदा. m001">' +
      '<label for="l-pw">पासवर्ड</label><input id="l-pw" type="password" autocomplete="current-password">' + msg +
      '<button class="btn" data-act="login">लॉगिन करा</button></div>';
  };

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
    if (isAdminUser()) { S.platformAdmin = true; if (!S.me || S.me.uid !== 'admin') S.me = { uid: 'admin', role: 'admin', acc: 0, h: 'fb' }; return; }
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
    if (u.email !== ADMIN && S.platformAdmin) { S.platformAdmin = false; S.reqDocs = []; adminSub = false; refreshAdmin(); rerender(); }
  });
  document.addEventListener('click', function (ev) { if (ev.target.closest('[data-act=logout]') && isAdminUser()) auth.signOut(); }, true);

  /* backup + import (admin) */
  var COLS = ['members', 'tx', 'invest', 'invtx', 'exp', 'perms', 'decisions'], backupText = null;
  function snapshotAll() {
    var out = { _format: 'society-backup-v1' };
    var strip = function (x) { var d = Object.assign({}, x), id = d.id; delete d.id; return { id: id, data: d }; };
    out.members = S.members.map(strip); out.tx = S.tx.map(strip); out.invest = S.invest.map(strip); out.invtx = S.invtx.map(strip); out.exp = S.exp.map(strip);
    out.auth = Object.keys(S.auth).filter(function (k) { return k !== 'admin'; }).map(function (k) { return { id: k, data: S.auth[k] }; });
    out.perms = Object.keys(S.perms).map(function (k) { return { id: k, data: S.perms[k] }; });
    out.decisions = Object.keys(S.decisions).map(function (k) { return { id: k, data: S.decisions[k] }; });
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
