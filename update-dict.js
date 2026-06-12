const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'contexts', 'LanguageContext.tsx');
let content = fs.readFileSync(file, 'utf8');

const newEn = {
  navBilling: 'Billing', navProducts: 'Products', navCustomers: 'Customers', navRecovery: 'Recovery Agent',
  navRecords: 'Records', navUdhaar: 'Udhaar', navGroupBuy: 'Group Buy', navAnalytics: 'Analytics',
  navGst: 'GST & ITR', navWhatsapp: 'WhatsApp Desk', menuTitle: 'Menu', lightMode: 'Light Mode',
  darkMode: 'Dark Mode', signOut: 'Sign Out', logoutTitle: 'Ready to leave?', logoutSubtitle: 'Log out from ',
  signOutNow: 'Sign Out Now', stayLoggedIn: 'Stay Logged In', comingSoon: 'Coming Soon',
  greeting: 'Hey Tester! 👋', all: 'All', grocery: 'Grocery', dairy: 'Dairy', beverages: 'Beverages',
  snacks: 'Snacks', household: 'Household', personalCare: 'Personal Care', lowStock: 'Low Stock',
  premium: 'Premium', popular: 'Popular', add: 'ADD', soldOut: 'SOLD OUT', searchProducts: 'Search products...',
  khataBalance: 'Khata Balance', call: 'Call', whatsapp: 'WhatsApp', addCustomer: 'Add Customer',
  searchCustomers: 'Search customers...', phone: 'Phone', date: 'Date', amount: 'Amount',
  receivePayment: 'Receive Payment', giveCredit: 'Give Credit'
};

const newHi = {
  navBilling: 'बिलिंग', navProducts: 'उत्पाद', navCustomers: 'ग्राहक', navRecovery: 'वसूली एजेंट',
  navRecords: 'रिकॉर्ड', navUdhaar: 'उधार', navGroupBuy: 'ग्रुप बाय', navAnalytics: 'एनालिटिक्स',
  navGst: 'GST और ITR', navWhatsapp: 'WhatsApp डेस्क', menuTitle: 'मेनू', lightMode: 'लाइट मोड',
  darkMode: 'डार्क मोड', signOut: 'साइन आउट', logoutTitle: 'लॉग आउट करें?', logoutSubtitle: 'से लॉग आउट करें ',
  signOutNow: 'अभी साइन आउट करें', stayLoggedIn: 'लॉग इन रहें', comingSoon: 'जल्द आ रहा है',
  greeting: 'नमस्ते टेस्टर! 👋', all: 'सभी', grocery: 'किराना', dairy: 'डेयरी', beverages: 'पेय जल',
  snacks: 'नमकीन', household: 'घरेलू', personalCare: 'व्यक्तिगत देखभाल', lowStock: 'कम स्टॉक',
  premium: 'प्रीमियम', popular: 'लोकप्रिय', add: 'जोड़ें', soldOut: 'बिक गया', searchProducts: 'उत्पाद खोजें...',
  khataBalance: 'खाता बैलेंस', call: 'कॉल', whatsapp: 'WhatsApp', addCustomer: 'ग्राहक जोड़ें',
  searchCustomers: 'ग्राहक खोजें...', phone: 'फ़ोन', date: 'तारीख', amount: 'रकम',
  receivePayment: 'भुगतान प्राप्त करें', giveCredit: 'उधार दें'
};

const newTe = {
  navBilling: 'బిల్లింగ్', navProducts: 'ఉత్పత్తులు', navCustomers: 'కస్టమర్లు', navRecovery: 'రికవరీ ఏజెంట్',
  navRecords: 'రికార్డులు', navUdhaar: 'ఉధార్ (అప్పు)', navGroupBuy: 'గ్రూప్ బై', navAnalytics: 'విశ్లేషణలు',
  navGst: 'GST & ITR', navWhatsapp: 'WhatsApp డెస్క్', menuTitle: 'మెనూ', lightMode: 'లైట్ మోడ్',
  darkMode: 'డార్క్ మోಡ್', signOut: 'సైన్ అవుట్', logoutTitle: 'లాగ్ అవుట్ చేయాలా?', logoutSubtitle: 'నుండి లాగ్ అవుట్ చేయండి ',
  signOutNow: 'ఇప్పుడే సైన్ అవుట్ చేయండి', stayLoggedIn: 'లాగిన్ లో ఉండండి', comingSoon: 'త్వరలో',
  greeting: 'నమస్తే టెస్టర్! 👋', all: 'అన్నీ', grocery: 'కిరాణా', dairy: 'డైరీ', beverages: 'పానీయాలు',
  snacks: 'స్నాక్స్', household: 'గృహావసరాలు', personalCare: 'వ్యక్తిగత సంరక్షణ', lowStock: 'తక్కువ స్టాక్',
  premium: 'ప్రీమియం', popular: 'పాపులర్', add: 'జోడించు', soldOut: 'అమ్ముడైంది', searchProducts: 'ఉత్పత్తులను వెతకండి...',
  khataBalance: 'ఖాతా బ్యాలెన్స్', call: 'కాల్ చేయండి', whatsapp: 'WhatsApp', addCustomer: 'కస్టమర్‌ను జోడించు',
  searchCustomers: 'కస్టమర్ల కోసం వెతకండి...', phone: 'ఫోన్', date: 'తేదీ', amount: 'మొత్తం',
  receivePayment: 'చెల్లింపును స్వీకరించండి', giveCredit: 'అప్పు ఇవ్వండి'
};

const newTa = {
  navBilling: 'பில்லிங்', navProducts: 'தயாரிப்புகள்', navCustomers: 'வாடிக்கையாளர்கள்', navRecovery: 'மீட்பு முகவர்',
  navRecords: 'பதிவுகள்', navUdhaar: 'கடன் (உதார்)', navGroupBuy: 'குழு கொள்முதல்', navAnalytics: 'பகுப்பாய்வு',
  navGst: 'GST & ITR', navWhatsapp: 'WhatsApp டெஸ்க்', menuTitle: 'மெனு', lightMode: 'லைட் மோட்',
  darkMode: 'டார்க் மோட்', signOut: 'வெளியேறு', logoutTitle: 'வெளியேறவா?', logoutSubtitle: 'இருந்து வெளியேறு ',
  signOutNow: 'இப்போதே வெளியேறு', stayLoggedIn: 'உள்நுழைந்திரு', comingSoon: 'விரைவில்',
  greeting: 'வணக்கம் டெஸ்டர்! 👋', all: 'அனைத்தும்', grocery: 'மளிகை', dairy: 'பால்', beverages: 'பானங்கள்',
  snacks: 'சிற்றுண்டி', household: 'வீட்டு உபயோகம்', personalCare: 'தனிப்பட்ட பராமரிப்பு', lowStock: 'குறைந்த இருப்பு',
  premium: 'பிரீமியம்', popular: 'பிரபலம்', add: 'சேர்', soldOut: 'விற்றுத்தீர்ந்தது', searchProducts: 'தயாரிப்புகளை தேடு...',
  khataBalance: 'கணக்கு இருப்பு', call: 'அழை', whatsapp: 'WhatsApp', addCustomer: 'வாடிக்கையாளரை சேர்',
  searchCustomers: 'வாடிக்கையாளர்களை தேடு...', phone: 'தொலைபேசி', date: 'தேதி', amount: 'தொகை',
  receivePayment: 'பணம் பெறவும்', giveCredit: 'கடன் கொடு'
};

const newKn = {
  navBilling: 'ಬಿಲ್ಲಿಂಗ್', navProducts: 'ಉತ್ಪನ್ನಗಳು', navCustomers: 'ಗ್ರಾಹಕರು', navRecovery: 'ರಿಕವರಿ ಏಜೆಂಟ್',
  navRecords: 'ದಾಖಲೆಗಳು', navUdhaar: 'ಉಧಾರ್ (ಸಾಲ)', navGroupBuy: 'ಗುಂಪು ಖರೀದಿ', navAnalytics: 'ಅನಾಲಿಟಿಕ್ಸ್',
  navGst: 'GST & ITR', navWhatsapp: 'WhatsApp ಡೆಸ್ಕ್', menuTitle: 'ಮೆನು', lightMode: 'ಲೈಟ್ ಮೋಡ್',
  darkMode: 'ಡಾರ್ಕ್ ಮೋಡ್', signOut: 'ಸೈನ್ ಔಟ್', logoutTitle: 'ಲಾಗ್ ಔಟ್ ಮಾಡಬೇಕೆ?', logoutSubtitle: 'ಇಂದ ಲಾಗ್ ಔಟ್ ಮಾಡಿ ',
  signOutNow: 'ಈಗ ಲಾಗ್ ಔಟ್ ಮಾಡಿ', stayLoggedIn: 'ಲಾಗ್ ಇನ್ ಆಗಿರಿ', comingSoon: 'ಶೀಘ್ರದಲ್ಲೇ',
  greeting: 'ನಮಸ್ಕಾರ ಟೆಸ್ಟರ್! 👋', all: 'ಎಲ್ಲಾ', grocery: 'ಕಿರಾಣಿ', dairy: 'ಡೈರಿ', beverages: 'ಪಾನೀಯಗಳು',
  snacks: 'ತಿಂಡಿಗಳು', household: 'ಮನೆಬಳಕೆ', personalCare: 'ವೈಯಕ್ತಿಕ ಆರೈಕೆ', lowStock: 'ಕಡಿಮೆ ಸ್ಟಾಕ್',
  premium: 'ಪ್ರೀಮಿಯಂ', popular: 'ಜನಪ್ರಿಯ', add: 'ಸೇರಿಸಿ', soldOut: 'ಮಾರಾಟವಾಗಿದೆ', searchProducts: 'ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಿ...',
  khataBalance: 'ಖಾತಾ ಬ್ಯಾಲೆನ್ಸ್', call: 'ಕರೆ ಮಾಡಿ', whatsapp: 'WhatsApp', addCustomer: 'ಗ್ರಾಹಕನನ್ನು ಸೇರಿಸಿ',
  searchCustomers: 'ಗ್ರಾಹಕರನ್ನು ಹುಡುಕಿ...', phone: 'ಫೋನ್', date: 'ದಿನಾಂಕ', amount: 'ಮೊತ್ತ',
  receivePayment: 'ಪಾವತಿ ಸ್ವೀಕರಿಸಿ', giveCredit: 'ಸಾಲ ನೀಡಿ'
};

const appendDict = (lang, dictMap) => {
  const marker = new RegExp(`${lang}: \\{`);
  const lines = Object.entries(dictMap).map(([k, v]) => `    ${k}: '${v}',`).join('\n');
  content = content.replace(marker, `${lang}: {\n${lines}`);
}

appendDict('EN', newEn);
appendDict('HI', newHi);
appendDict('TE', newTe);
appendDict('TA', newTa);
appendDict('KN', newKn);

// update type TranslationKey
const newKeysStr = Object.keys(newEn).map(k => `  | '${k}'`).join('\n');
content = content.replace(/type TranslationKey =/, `type TranslationKey =\n${newKeysStr}\n`);

// add showLangPicker to context
content = content.replace(/lang: LangCode;/, 'lang: LangCode;\n  showLangPicker: boolean;\n  setShowLangPicker: (show: boolean) => void;');
content = content.replace(/const \[lang, setLangState\] = useState<LangCode>\('EN'\);/, "const [lang, setLangState] = useState<LangCode>('EN');\n  const [showLangPicker, setShowLangPicker] = useState(false);");
content = content.replace(/value=\{\{ lang, setLang, t, languages: LANGUAGES, currentLanguage \}\}/, "value={{ lang, setLang, t, languages: LANGUAGES, currentLanguage, showLangPicker, setShowLangPicker }}");

fs.writeFileSync(file, content);
console.log('LanguageContext updated successfully');
