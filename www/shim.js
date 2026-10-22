/* shim.js: lets the society app run as a standalone app (APK) on Firebase.
   It provides the same window.claude.use('db' | 'user' | 'downloads') the app expects. */
(function () {
  var cfg = window.FIREBASE_CONFIG, ADMIN_EMAIL = 'admin@society.app';
  function fatal(msg) {
    window.__FB_BAD = true;
    var show = function () {
      var d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:99;background:#fff;color:#14232B;padding:28px 20px;font:16px/1.6 sans-serif;overflow:auto';
      d.innerHTML = '<h2 style="margin:0 0 10px">सेटअप अपूर्ण आहे</h2><p>' + msg + '</p>';
      document.body.appendChild(d);
    };
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }
  window.claude = { use: function () { return Promise.resolve(null); } };
  if (!window.firebase) return fatal('Firebase लोड झाले नाही. इंटरनेट चालू आहे का ते तपासा आणि ॲप पुन्हा उघडा.');
  if (!cfg || !cfg.apiKey || /PASTE/i.test(cfg.apiKey)) return fatal('<b>www/firebase-config.js</b> मध्ये तुमच्या Firebase प्रोजेक्टची माहिती भरलेली नाही. मार्गदर्शक (README) मधील पायरी ३ पाहा.');

  firebase.initializeApp(cfg);
  var auth = firebase.auth(), fs = firebase.firestore();
  fs.settings({ ignoreUndefinedProperties: true });

  /* Firestore cannot store arrays inside arrays (the slab table is [[min, hapta], ...]) */
  function enc(v) {
    if (Array.isArray(v)) return v.map(function (x) { return Array.isArray(x) ? { __a: x.map(enc) } : enc(x); });
    if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { o[k] = enc(v[k]); }); return o; }
    return v;
  }
  function dec(v) {
    if (Array.isArray(v)) return v.map(dec);
    if (v && typeof v === 'object') {
      if (Array.isArray(v.__a)) return v.__a.map(dec);
      var o = {}; Object.keys(v).forEach(function (k) { o[k] = dec(v[k]); }); return o;
    }
    return v;
  }
  var wrapDoc = function (s) { return { id: s.id, exists: s.exists, data: function () { return s.exists ? dec(s.data()) : undefined; } }; };
  var db = {
    collection: function (c) {
      var ref = fs.collection(c);
      return {
        onSnapshot: function (ok, err) { return ref.onSnapshot(function (s) { ok({ docs: s.docs.map(wrapDoc) }); }, err); },
        add: function (d) { return ref.add(enc(d)); }
      };
    },
    doc: function (p) {
      var ref = fs.doc(p);
      return {
        set: function (d) { return ref.set(enc(d)); },
        update: function (d) { return ref.update(enc(d)); },
        delete: function () { return ref.delete(); },
        onSnapshot: function (ok, err) { return ref.onSnapshot(function (s) { ok(wrapDoc(s)); }, err); }
      };
    }
  };

  var readyRes, authReady = new Promise(function (r) { readyRes = r; });
  auth.onAuthStateChanged(function (u) {
    if (u) return readyRes(u);
    auth.signInAnonymously().catch(function (e) {
      fatal('Firebase मध्ये “Anonymous” साइन-इन चालू केलेले नाही. README मधील पायरी २ पाहा. (' + (e && e.code) + ')');
      readyRes(null);
    });
  });
  window.fbIsAdmin = function () { return !!auth.currentUser && auth.currentUser.email === ADMIN_EMAIL; };

  var downloads = {
    save: function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
      var C = window.Capacitor, P = C && C.Plugins;
      if (C && C.isNativePlatform && C.isNativePlatform() && P && P.Filesystem && P.Share) {
        var name = String(o.filename).replace(/[^A-Za-z0-9._-]+/g, '_');
        return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(String(fr.result).split(',')[1]); }; fr.onerror = rej; fr.readAsDataURL(blob); })
          .then(function (b64) { return P.Filesystem.writeFile({ path: name, data: b64, directory: 'CACHE' }); })
          .then(function (w) { return P.Share.share({ title: name, url: w.uri, dialogTitle: 'शेअर करा' }); })
          .then(function () { return { status: 'saved' }; });
      }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = o.filename; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      return Promise.resolve({ status: 'saved' });
    }
  };

  window.claude = {
    use: function (name) {
      return new Promise(function (r) { setTimeout(r, 0); }).then(function () { return authReady; }).then(function (u) {
        if (name === 'user') return { canEdit: function () { return Promise.resolve(window.fbIsAdmin()); }, isOwner: function () { return Promise.resolve(window.fbIsAdmin()); }, id: function () { return Promise.resolve(auth.currentUser ? auth.currentUser.uid : null); } };
        if (name === 'db') return u ? db : null;
        if (name === 'downloads') return downloads;
        return null;
      });
    }
  };
})();
