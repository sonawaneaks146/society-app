/* सर्वज्ञ सोसायटी: फोनच्या सूचना (push). ॲप बंद असतानाही सूचना पाठवते. */
const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const REGION = process.env.FN_REGION || 'asia-south1';

const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');
const LF_TITLE = { pending: 'नवीन कर्ज अर्ज', approved: 'कर्ज अर्ज मंजूर', rejected: 'कर्ज अर्ज नाकारला', cancelled: 'कर्ज अर्ज रद्द', given: 'कर्ज दिले' };

/* सर्व नोंदणीकृत फोनना सूचना पाठवा (ज्याने कृती केली त्याला वगळून; admin ने बंद केलेल्यांना वगळून) */
async function send(title, body, skipUid, permKey) {
  const [tokSnap, permSnap] = await Promise.all([db.collection('fcm').get(), db.collection('perms').get()]);
  const perms = {}; permSnap.forEach(d => { perms[d.id] = d.data() || {}; });
  const tokens = [], owners = [];
  tokSnap.forEach(d => {
    const t = d.data() || {}, uid = t.uid || d.id, pr = perms[uid];
    if (!t.token || uid === skipUid) return;
    if (pr && pr.enabled === false) return;
    if (pr && permKey && pr.p && pr.p[permKey] === false) return;
    tokens.push(t.token); owners.push(d.id);
  });
  if (!tokens.length) return;
  for (let i = 0; i < tokens.length; i += 500) {
    const part = tokens.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: part,
      notification: { title, body },
      android: { priority: 'high' }
    });
    const dead = [];
    res.responses.forEach((r, k) => {
      const c = r.error && r.error.code;
      if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-registration-token') dead.push(owners[i + k]);
    });
    await Promise.all(dead.map(id => db.doc('fcm/' + id).delete().catch(() => {})));
  }
}

exports.onLoanUpdate = onDocumentWritten({ document: 'loanfeed/{id}', region: REGION }, async ev => {
  const after = ev.data && ev.data.after && ev.data.after.exists ? ev.data.after.data() : null;
  if (!after) return;
  const before = ev.data.before && ev.data.before.exists ? ev.data.before.data() : null;
  if (before && before.status === after.status && before.amt === after.amt) return;
  const f = after;
  const body = f.body || (f.name || ('खाते ' + f.acc)) + ' · ' + inr(f.amt) + (f.kind === 'emg' ? ' (आपत्कालीन)' : '') +
    (f.status === 'approved' && f.reqAmt !== f.amt ? ' (मागितले ' + inr(f.reqAmt) + ')' : '') +
    (f.note ? ' · कारण: ' + f.note : '') + (f.status !== 'pending' && f.by ? ' · ' + f.by + ' यांनी' : '');
  await send(f.title || LF_TITLE[f.status] || 'कर्ज अर्ज अपडेट', body, f.byUid, 'loannotify');
});

exports.onNotice = onDocumentCreated({ document: 'notices/{id}', region: REGION }, async ev => {
  const n = ev.data && ev.data.data(); if (!n) return;
  await send('सूचना: ' + n.title, (n.text || '') + (n.by ? ' — ' + n.by : ''), n.byUid, 'notices');
});

exports.onPoll = onDocumentCreated({ document: 'polls/{id}', region: REGION }, async ev => {
  const p = ev.data && ev.data.data(); if (!p) return;
  await send('नवीन मतदान' + (p.by ? ' (' + p.by + ')' : ''), p.q || '', p.byUid, 'polls');
});
