# फोन सूचना (ॲप बंद असतानाही): एकदाची तयारी

## भाग अ: Blaze प्लॅन (मी तुमच्या वतीने करू शकत नाही; तुमचे Google खाते/कार्ड लागते)
1. https://console.firebase.google.com → तुमचा प्रोजेक्ट उघडा.
2. डावीकडे खाली **Upgrade** (किंवा गिअर → Usage and billing → Details & settings → **Modify plan**) → **Blaze** निवडा.
3. बिलिंग खाते/कार्ड जोडा. (मोफत मर्यादा मोठी आहे; या सोसायटीसाठी सहसा ₹०. हवे तर Budget alert ₹१००/₹२०० लावा.)

## भाग ब: Android ॲप Firebase ला जोडा (google-services.json)
1. Firebase → Project settings (गिअर) → General → Your apps → **Add app → Android**.
2. Package name अगदी असेच टाका: `com.sarvadnya.society` → Register app.
3. **google-services.json** डाउनलोड करा. पुढच्या पायऱ्या वगळून Finish करा.
4. ही फाईल GitHub repository च्या **मुख्य (root) फोल्डरमध्ये** अपलोड करा (`package.json` च्या शेजारी).

## भाग क: नवीन फाईल्स GitHub वर टाका
zip मधील सर्व फाईल्स आपापल्या जागी अपलोड करा (जुन्या बदला):
`www/index.html`, `www/fblayer.js`, `package.json`, `.github/workflows/build-apk.yml`, `firestore.rules`, `firebase.json`, `functions/index.js`, `functions/package.json`, `functions/.env`

`firestore.rules` चा मजकूर Firebase → Firestore → Rules मध्ये पेस्ट करून Publish करा (नवीन `fcm` भाग आहे).

## भाग ड: सूचना पाठवणारे फंक्शन चालू करा (एकदाच, Cloud Shell मध्ये)
1. https://shell.cloud.google.com उघडा (त्याच Google खात्याने).
2. खालील कमांड एकेक करून चालवा (`तुमचे-नाव/तुमची-repo` आणि `प्रोजेक्ट-आयडी` बदला):
```
git clone https://github.com/तुमचे-नाव/तुमची-repo.git society
cd society/functions && npm install && cd ..
npx firebase-tools login --no-localhost
npx firebase-tools deploy --only functions --project प्रोजेक्ट-आयडी
```
(private repo असल्यास GitHub वापरकर्तानाव आणि Personal Access Token विचारेल.)
3. "Deploy complete" दिसले की झाले. Firestore चे ठिकाण Mumbai नसेल तर `functions/.env` मधील `asia-south1` बदला.

## भाग इ: नवीन APK
Actions → Build APK → Run. नवीन APK जुन्या ॲपवर इन्स्टॉल करा, ॲप उघडून लॉगिन करा, "सूचना परवानगी" द्या. प्रत्येक सभासदाने एकदा ॲप उघडून लॉगिन करणे आवश्यक आहे.
