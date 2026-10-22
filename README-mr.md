# सर्वज्ञ सोसायटी: Android APK (मार्गदर्शक)

या प्रोजेक्टमधून तुमचे ॲप खरे Android ॲप (APK) म्हणून बनते. डेटा तुमच्या स्वतःच्या Firebase डेटाबेसमध्ये राहतो (मोफत Spark प्लॅन पुरेसा आहे). सभासदांना claude.ai खाते लागत नाही.

## काय लागेल
- Google खाते (Firebase साठी)
- GitHub खाते (मोफत, APK बनवण्यासाठी). संगणक असल्यास सोपे, फोनवरूनही शक्य.

## पायरी १: Firebase प्रोजेक्ट
1. https://console.firebase.google.com उघडा, “Add project” → नाव उदा. `sarvadnya-society` → Google Analytics बंद ठेवा.
2. **Build → Firestore Database → Create database** → “Production mode” → Location: `asia-south1 (Mumbai)`.
3. Firestore मध्ये **Rules** टॅब उघडा. आतले सर्व पुसून या प्रोजेक्टमधील `firestore.rules` फाईलचा मजकूर पेस्ट करा → **Publish**.

## पायरी २: लॉगिन चालू करा
1. **Build → Authentication → Get started → Sign-in method**.
2. **Anonymous** चालू करा. **Email/Password** चालू करा.
3. **Users** टॅब → **Add user**: Email `admin@society.app`, Password: तुमचा admin पासवर्ड (किमान ६ अक्षरे). हा पासवर्ड लक्षात ठेवा. ॲपमध्ये आयडी `admin` आणि हाच पासवर्ड वापरायचा.

## पायरी ३: ॲपला Firebase जोडा
1. Firebase मध्ये **Project settings (गिअर) → General → Your apps → Web (</>)** → नाव द्या → Register.
2. दिसणारा `firebaseConfig { ... }` कॉपी करा.
3. प्रोजेक्टमधील `www/firebase-config.js` फाईल उघडा आणि त्यातील `PASTE...` च्या जागी तुमची मूल्ये भरा.

## पायरी ४: APK बनवा (GitHub वर, मोफत)
1. https://github.com वर नवीन **private** repository बनवा.
2. या zip मधील सर्व फाईल्स आणि फोल्डर (`.github` फोल्डरसह) repository मध्ये अपलोड करा (“Add file → Upload files”). `.github` फोल्डर दिसत नसेल तर तुमच्या फाईल मॅनेजरमध्ये “hidden files दाखवा” चालू करा.
3. repository मध्ये **Actions** टॅब → **Build APK** → **Run workflow**.
4. ५ ते १० मिनिटांनी काम पूर्ण होते. त्या रनवर क्लिक करा. खाली **Artifacts → society-apk** डाउनलोड करा. zip उघडल्यावर `app-debug.apk` मिळते.

## पायरी ५: सभासदांना द्या
1. `app-debug.apk` WhatsApp वर सभासदांना पाठवा.
2. फोनवर फाईल उघडून इंस्टॉल करा. “अज्ञात स्रोतातून इंस्टॉल” ची परवानगी विचारल्यास द्या.

## पायरी ६: सध्याचा डेटा आणा (एकदाच)
1. `backup.json` फाईल तुमच्या फोनवर पाठवा.
2. ॲप उघडा → आयडी `admin` + पासवर्ड → **अधिक → डेटा बॅकअप → फाईल निवडा → आयात करा**.
3. सभासद, नोंदी आणि सेटिंग्ज येतात. सभासदांचे जुने आयडी-पासवर्ड तसेच चालतात.

लक्षात ठेवा: `backup.json` आजपर्यंतच्या डेटाचा स्नॅपशॉट आहे. त्यानंतर जुन्या claude.ai ॲपमध्ये भरलेल्या नोंदी त्यात नसतात. आयात केल्यावर फक्त नवीन APK वापरा.

## नंतर काय
- **बॅकअप:** “अधिक → डेटा बॅकअप → बॅकअप फाईल सेव्ह करा” दर महिन्याला करा.
- **नवीन आवृत्ती:** नवीन `www/index.html` आल्यावर repository मधील फाईल बदला. Actions मध्ये पुन्हा Build चालवा. डेटा तसाच राहतो.
- **Android Studio ने (पर्यायी):** संगणकावर Node 18+ आणि Android Studio असल्यास: `npm install`, `npx cap add android`, `npx cap sync android`, `npx cap open android` → Build → Build APK.

## सुरक्षेबद्दल (वाचा)
- admin चे खरे Firebase लॉगिन आहे. डेटा फक्त admin च बदलू शकतो.
- सभासदांचे आयडी-पासवर्ड ॲपच्या स्वतःच्या पद्धतीने तपासले जातात. ॲपमधील Firebase माहिती काढू शकणारा तांत्रिक माणूस डेटा वाचू शकतो आणि सभासदांचे पासवर्ड बदलू शकतो, पण नोंदी बदलू शकत नाही.
- APK फक्त विश्वासू सभासदांनाच द्या.
- सभासदाचा पासवर्ड विसरल्यास admin “लॉगिन आयडी आणि पासवर्ड” मधून नवीन तयार करतो. admin चा पासवर्ड विसरल्यास Firebase → Authentication → Users मधून reset करा.
- हा debug APK आहे आणि सभासदांना वाटण्यासाठी चालतो. Play Store साठी वेगळे signing लागते.
