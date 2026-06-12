import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ─── Supported Languages ────────────────────────────────────────────────────
export type LangCode = 'EN' | 'HI' | 'TE' | 'TA' | 'KN';

export interface Language {
  code: LangCode;
  name: string;       // native script name
  label: string;      // English label
  flag: string;       // emoji flag
}

export const LANGUAGES: Language[] = [
  { code: 'EN', name: 'English',    label: 'English',  flag: '🇬🇧' },
  { code: 'HI', name: 'हिन्दी',      label: 'Hindi',    flag: '🇮🇳' },
  { code: 'TE', name: 'తెలుగు',     label: 'Telugu',   flag: '🇮🇳' },
  { code: 'TA', name: 'தமிழ்',      label: 'Tamil',    flag: '🇮🇳' },
  { code: 'KN', name: 'ಕನ್ನಡ',      label: 'Kannada',  flag: '🇮🇳' },
];

// ─── Translation Dictionary ──────────────────────────────────────────────────
type TranslationKey =
  | 'navBilling'
  | 'navProducts'
  | 'navCustomers'
  | 'navRecovery'
  | 'navRecords'
  | 'navUdhaar'
  | 'navGroupBuy'
  | 'navAnalytics'
  | 'navGst'
  | 'navWhatsapp'
  | 'menuTitle'
  | 'lightMode'
  | 'darkMode'
  | 'signOut'
  | 'logoutTitle'
  | 'logoutSubtitle'
  | 'signOutNow'
  | 'stayLoggedIn'
  | 'comingSoon'
  | 'greeting'
  | 'all'
  | 'grocery'
  | 'dairy'
  | 'beverages'
  | 'snacks'
  | 'household'
  | 'personalCare'
  | 'lowStock'
  | 'premium'
  | 'popular'
  | 'add'
  | 'soldOut'
  | 'searchProducts'
  | 'khataBalance'
  | 'call'
  | 'whatsapp'
  | 'addCustomer'
  | 'searchCustomers'
  | 'phone'
  | 'date'
  | 'amount'
  | 'receivePayment'
  | 'giveCredit'

  // Supplier Bills modal
  | 'supplierBills'
  | 'digitizeBills'
  | 'scan'
  | 'manual'
  | 'history'
  | 'addToStock'
  | 'searchPlaceholder'
  // Scan tab
  | 'scanBill'
  | 'tapToScan'
  | 'orUploadPdf'
  | 'analyzingBill'
  | 'processingOcr'
  // Review board
  | 'reviewItems'
  | 'clearAll'
  | 'addRow'
  | 'process'
  | 'product'
  | 'qty'
  | 'unit'
  | 'total'
  | 'cost'
  | 'sell'
  // History
  | 'noHistory'
  | 'editReReview'
  | 'reProcessStock'
  | 'totalInvoiceValue'
  // Manual tab
  | 'productName'
  | 'sellingPrice'
  | 'costPrice'
  | 'stockQty'
  | 'category'
  | 'unitLabel'
  | 'verifyAddProduct'
  // Products screen
  | 'products'
  | 'catalogSize'
  | 'inventoryCommandCenter'
  | 'loadingInventory'
  | 'noProductsTitle'
  | 'noProductsDesc'
  | 'generateDemo'
  // Language picker
  | 'selectLanguage'
  | 'languageChanged';

type Translations = Record<TranslationKey, string>;
type Dictionary = Record<LangCode, Translations>;

const dict: Dictionary = {
  EN: {
    navBilling: 'Billing',
    navProducts: 'Products',
    navCustomers: 'Customers',
    navRecovery: 'Recovery Agent',
    navRecords: 'Records',
    navUdhaar: 'Udhaar',
    navGroupBuy: 'Group Buy',
    navAnalytics: 'Analytics',
    navGst: 'GST & ITR',
    navWhatsapp: 'WhatsApp Desk',
    menuTitle: 'Menu',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    signOut: 'Sign Out',
    logoutTitle: 'Ready to leave?',
    logoutSubtitle: 'Log out from ',
    signOutNow: 'Sign Out Now',
    stayLoggedIn: 'Stay Logged In',
    comingSoon: 'Coming Soon',
    greeting: 'Hey Tester! 👋',
    all: 'All',
    grocery: 'Grocery',
    dairy: 'Dairy',
    beverages: 'Beverages',
    snacks: 'Snacks',
    household: 'Household',
    personalCare: 'Personal Care',
    lowStock: 'Low Stock',
    premium: 'Premium',
    popular: 'Popular',
    add: 'ADD',
    soldOut: 'SOLD OUT',
    searchProducts: 'Search products...',
    khataBalance: 'Khata Balance',
    call: 'Call',
    whatsapp: 'WhatsApp',
    addCustomer: 'Add Customer',
    searchCustomers: 'Search customers...',
    phone: 'Phone',
    date: 'Date',
    amount: 'Amount',
    receivePayment: 'Receive Payment',
    giveCredit: 'Give Credit',
    supplierBills: 'Supplier Bills',
    digitizeBills: 'Digitize bills, update stock & track history',
    scan: 'Scan',
    manual: 'Manual',
    history: 'History',
    addToStock: 'Add to Stock',
    searchPlaceholder: 'Search by name or category',
    scanBill: 'Scan Bill',
    tapToScan: 'Tap to scan or upload a bill',
    orUploadPdf: 'or upload PDF / image',
    analyzingBill: 'Analyzing bill with AI...',
    processingOcr: 'Processing with OCR AI...',
    reviewItems: 'Review Items',
    clearAll: 'Clear All',
    addRow: '+ Add Row',
    process: 'PROCESS',
    product: 'PRODUCT',
    qty: 'QTY',
    unit: 'UNIT',
    total: 'TOTAL',
    cost: 'COST',
    sell: 'SELL',
    noHistory: 'No bills processed yet.',
    editReReview: 'Edit & Re-Review',
    reProcessStock: 'Re-Process Stock',
    totalInvoiceValue: 'TOTAL INVOICE VALUE',
    productName: 'Product Name',
    sellingPrice: 'Selling Price (₹)',
    costPrice: 'Cost Price (₹)',
    stockQty: 'Stock Quantity',
    category: 'Category',
    unitLabel: 'Unit',
    verifyAddProduct: 'Verify & Add Product',
    products: 'Products 📦',
    catalogSize: 'CATALOG SIZE',
    inventoryCommandCenter: 'INVENTORY COMMAND CENTER',
    loadingInventory: 'Loading Inventory...',
    noProductsTitle: 'No products in catalog',
    noProductsDesc: 'Generate mock bulk products or register items manually below to manage your smart dukaan.',
    generateDemo: 'Generate Demo Inventory',
    selectLanguage: 'Select Language',
    languageChanged: 'Language changed!',
  },
  HI: {
    navBilling: 'बिलिंग',
    navProducts: 'उत्पाद',
    navCustomers: 'ग्राहक',
    navRecovery: 'वसूली एजेंट',
    navRecords: 'रिकॉर्ड',
    navUdhaar: 'उधार',
    navGroupBuy: 'ग्रुप बाय',
    navAnalytics: 'एनालिटिक्स',
    navGst: 'GST और ITR',
    navWhatsapp: 'WhatsApp डेस्क',
    menuTitle: 'मेनू',
    lightMode: 'लाइट मोड',
    darkMode: 'डार्क मोड',
    signOut: 'साइन आउट',
    logoutTitle: 'लॉग आउट करें?',
    logoutSubtitle: 'से लॉग आउट करें ',
    signOutNow: 'अभी साइन आउट करें',
    stayLoggedIn: 'लॉग इन रहें',
    comingSoon: 'जल्द आ रहा है',
    greeting: 'नमस्ते टेस्टर! 👋',
    all: 'सभी',
    grocery: 'किराना',
    dairy: 'डेयरी',
    beverages: 'पेय जल',
    snacks: 'नमकीन',
    household: 'घरेलू',
    personalCare: 'व्यक्तिगत देखभाल',
    lowStock: 'कम स्टॉक',
    premium: 'प्रीमियम',
    popular: 'लोकप्रिय',
    add: 'जोड़ें',
    soldOut: 'बिक गया',
    searchProducts: 'उत्पाद खोजें...',
    khataBalance: 'खाता बैलेंस',
    call: 'कॉल',
    whatsapp: 'WhatsApp',
    addCustomer: 'ग्राहक जोड़ें',
    searchCustomers: 'ग्राहक खोजें...',
    phone: 'फ़ोन',
    date: 'तारीख',
    amount: 'रकम',
    receivePayment: 'भुगतान प्राप्त करें',
    giveCredit: 'उधार दें',
    supplierBills: 'आपूर्तिकर्ता बिल',
    digitizeBills: 'बिल डिजिटल करें, स्टॉक अपडेट करें और इतिहास ट्रैक करें',
    scan: 'स्कैन',
    manual: 'मैन्युअल',
    history: 'इतिहास',
    addToStock: 'स्टॉक जोड़ें',
    searchPlaceholder: 'नाम या श्रेणी से खोजें',
    scanBill: 'बिल स्कैन करें',
    tapToScan: 'बिल स्कैन या अपलोड करने के लिए टैप करें',
    orUploadPdf: 'या PDF / इमेज अपलोड करें',
    analyzingBill: 'AI से बिल का विश्लेषण...',
    processingOcr: 'OCR AI से प्रोसेसिंग...',
    reviewItems: 'आइटम समीक्षा करें',
    clearAll: 'सब साफ करें',
    addRow: '+ पंक्ति जोड़ें',
    process: 'प्रोसेस',
    product: 'उत्पाद',
    qty: 'मात्रा',
    unit: 'इकाई',
    total: 'कुल',
    cost: 'लागत',
    sell: 'बिक्री',
    noHistory: 'अभी तक कोई बिल प्रोसेस नहीं हुआ।',
    editReReview: 'संपादित करें और पुनः समीक्षा',
    reProcessStock: 'स्टॉक पुनः प्रोसेस करें',
    totalInvoiceValue: 'कुल चालान मूल्य',
    productName: 'उत्पाद का नाम',
    sellingPrice: 'बिक्री मूल्य (₹)',
    costPrice: 'लागत मूल्य (₹)',
    stockQty: 'स्टॉक मात्रा',
    category: 'श्रेणी',
    unitLabel: 'इकाई',
    verifyAddProduct: 'सत्यापित करें और उत्पाद जोड़ें',
    products: 'उत्पाद 📦',
    catalogSize: 'सूची का आकार',
    inventoryCommandCenter: 'इन्वेंटरी कमांड सेंटर',
    loadingInventory: 'इन्वेंटरी लोड हो रही है...',
    noProductsTitle: 'सूची में कोई उत्पाद नहीं',
    noProductsDesc: 'अपनी स्मार्ट दुकान प्रबंधित करने के लिए नमूना उत्पाद बनाएं या मैन्युअल रूप से आइटम दर्ज करें।',
    generateDemo: 'डेमो इन्वेंटरी बनाएं',
    selectLanguage: 'भाषा चुनें',
    languageChanged: 'भाषा बदल गई!',
  },
  TE: {
    navBilling: 'బిల్లింగ్',
    navProducts: 'ఉత్పత్తులు',
    navCustomers: 'కస్టమర్లు',
    navRecovery: 'రికవరీ ఏజెంట్',
    navRecords: 'రికార్డులు',
    navUdhaar: 'ఉధార్ (అప్పు)',
    navGroupBuy: 'గ్రూప్ బై',
    navAnalytics: 'విశ్లేషణలు',
    navGst: 'GST & ITR',
    navWhatsapp: 'WhatsApp డెస్క్',
    menuTitle: 'మెనూ',
    lightMode: 'లైట్ మోడ్',
    darkMode: 'డార్క్ మోಡ್',
    signOut: 'సైన్ అవుట్',
    logoutTitle: 'లాగ్ అవుట్ చేయాలా?',
    logoutSubtitle: 'నుండి లాగ్ అవుట్ చేయండి ',
    signOutNow: 'ఇప్పుడే సైన్ అవుట్ చేయండి',
    stayLoggedIn: 'లాగిన్ లో ఉండండి',
    comingSoon: 'త్వరలో',
    greeting: 'నమస్తే టెస్టర్! 👋',
    all: 'అన్నీ',
    grocery: 'కిరాణా',
    dairy: 'డైరీ',
    beverages: 'పానీయాలు',
    snacks: 'స్నాక్స్',
    household: 'గృహావసరాలు',
    personalCare: 'వ్యక్తిగత సంరక్షణ',
    lowStock: 'తక్కువ స్టాక్',
    premium: 'ప్రీమియం',
    popular: 'పాపులర్',
    add: 'జోడించు',
    soldOut: 'అమ్ముడైంది',
    searchProducts: 'ఉత్పత్తులను వెతకండి...',
    khataBalance: 'ఖాతా బ్యాలెన్స్',
    call: 'కాల్ చేయండి',
    whatsapp: 'WhatsApp',
    addCustomer: 'కస్టమర్‌ను జోడించు',
    searchCustomers: 'కస్టమర్ల కోసం వెతకండి...',
    phone: 'ఫోన్',
    date: 'తేదీ',
    amount: 'మొత్తం',
    receivePayment: 'చెల్లింపును స్వీకరించండి',
    giveCredit: 'అప్పు ఇవ్వండి',
    supplierBills: 'సరఫరాదారు బిల్లులు',
    digitizeBills: 'బిల్లులు డిజిటలైజ్ చేయండి, స్టాక్ అప్డేట్ చేయండి',
    scan: 'స్కాన్',
    manual: 'మాన్యువల్',
    history: 'చరిత్ర',
    addToStock: 'స్టాక్కు జోడించండి',
    searchPlaceholder: 'పేరు లేదా వర్గం ద్వారా వెతకండి',
    scanBill: 'బిల్లు స్కాన్ చేయండి',
    tapToScan: 'స్కాన్ చేయడానికి లేదా బిల్లు అప్లోడ్ చేయడానికి నొక్కండి',
    orUploadPdf: 'లేదా PDF / చిత్రం అప్లోడ్ చేయండి',
    analyzingBill: 'AI తో బిల్లు విశ్లేషిస్తోంది...',
    processingOcr: 'OCR AI తో ప్రాసెస్ అవుతోంది...',
    reviewItems: 'వస్తువులు సమీక్షించండి',
    clearAll: 'అన్నీ తొలగించు',
    addRow: '+ వరుస జోడించు',
    process: 'ప్రాసెస్',
    product: 'ఉత్పత్తి',
    qty: 'పరిమాణం',
    unit: 'యూనిట్',
    total: 'మొత్తం',
    cost: 'ధర',
    sell: 'అమ్మకం',
    noHistory: 'ఇంకా బిల్లులేమీ ప్రాసెస్ కాలేదు.',
    editReReview: 'సవరించండి & మళ్ళీ సమీక్షించండి',
    reProcessStock: 'స్టాక్ మళ్ళీ ప్రాసెస్ చేయండి',
    totalInvoiceValue: 'మొత్తం ఇన్వాయిస్ విలువ',
    productName: 'ఉత్పత్తి పేరు',
    sellingPrice: 'విక్రయ ధర (₹)',
    costPrice: 'వ్యయ ధర (₹)',
    stockQty: 'స్టాక్ పరిమాణం',
    category: 'వర్గం',
    unitLabel: 'యూనిట్',
    verifyAddProduct: 'ధృవీకరించండి & ఉత్పత్తి జోడించండి',
    products: 'ఉత్పత్తులు 📦',
    catalogSize: 'కేటలాగ్ పరిమాణం',
    inventoryCommandCenter: 'ఇన్వెంటరీ కమాండ్ సెంటర్',
    loadingInventory: 'ఇన్వెంటరీ లోడ్ అవుతోంది...',
    noProductsTitle: 'కేటలాగ్లో ఉత్పత్తులు లేవు',
    noProductsDesc: 'మీ స్మార్ట్ దుకాణాన్ని నిర్వహించడానికి డెమో ఉత్పత్తులు జనరేట్ చేయండి.',
    generateDemo: 'డెమో ఇన్వెంటరీ రూపొందించండి',
    selectLanguage: 'భాష ఎంచుకోండి',
    languageChanged: 'భాష మారింది!',
  },
  TA: {
    navBilling: 'பில்லிங்',
    navProducts: 'தயாரிப்புகள்',
    navCustomers: 'வாடிக்கையாளர்கள்',
    navRecovery: 'மீட்பு முகவர்',
    navRecords: 'பதிவுகள்',
    navUdhaar: 'கடன் (உதார்)',
    navGroupBuy: 'குழு கொள்முதல்',
    navAnalytics: 'பகுப்பாய்வு',
    navGst: 'GST & ITR',
    navWhatsapp: 'WhatsApp டெஸ்க்',
    menuTitle: 'மெனு',
    lightMode: 'லைட் மோட்',
    darkMode: 'டார்க் மோட்',
    signOut: 'வெளியேறு',
    logoutTitle: 'வெளியேறவா?',
    logoutSubtitle: 'இருந்து வெளியேறு ',
    signOutNow: 'இப்போதே வெளியேறு',
    stayLoggedIn: 'உள்நுழைந்திரு',
    comingSoon: 'விரைவில்',
    greeting: 'வணக்கம் டெஸ்டர்! 👋',
    all: 'அனைத்தும்',
    grocery: 'மளிகை',
    dairy: 'பால்',
    beverages: 'பானங்கள்',
    snacks: 'சிற்றுண்டி',
    household: 'வீட்டு உபயோகம்',
    personalCare: 'தனிப்பட்ட பராமரிப்பு',
    lowStock: 'குறைந்த இருப்பு',
    premium: 'பிரீமியம்',
    popular: 'பிரபலம்',
    add: 'சேர்',
    soldOut: 'விற்றுத்தீர்ந்தது',
    searchProducts: 'தயாரிப்புகளை தேடு...',
    khataBalance: 'கணக்கு இருப்பு',
    call: 'அழை',
    whatsapp: 'WhatsApp',
    addCustomer: 'வாடிக்கையாளரை சேர்',
    searchCustomers: 'வாடிக்கையாளர்களை தேடு...',
    phone: 'தொலைபேசி',
    date: 'தேதி',
    amount: 'தொகை',
    receivePayment: 'பணம் பெறவும்',
    giveCredit: 'கடன் கொடு',
    supplierBills: 'சப்ளையர் பில்கள்',
    digitizeBills: 'பில்களை டிஜிட்டல் செய்யுங்கள், இருப்பு புதுப்பிக்கவும்',
    scan: 'ஸ்கேன்',
    manual: 'கைமுறை',
    history: 'வரலாறு',
    addToStock: 'இருப்பில் சேர்',
    searchPlaceholder: 'பெயர் அல்லது வகை மூலம் தேடுங்கள்',
    scanBill: 'பில் ஸ்கேன் செய்',
    tapToScan: 'பில்லை ஸ்கேன் அல்லது அப்லோட் செய்ய தட்டுங்கள்',
    orUploadPdf: 'அல்லது PDF / படம் அப்லோட் செய்யுங்கள்',
    analyzingBill: 'AI மூலம் பில் பகுப்பாய்வு...',
    processingOcr: 'OCR AI மூலம் செயலாக்கம்...',
    reviewItems: 'பொருட்களை மதிப்பாய்வு செய்',
    clearAll: 'எல்லாவற்றையும் அழி',
    addRow: '+ வரிசை சேர்',
    process: 'செயல்படுத்து',
    product: 'தயாரிப்பு',
    qty: 'அளவு',
    unit: 'அலகு',
    total: 'மொத்தம்',
    cost: 'செலவு',
    sell: 'விற்பனை',
    noHistory: 'இதுவரை எந்த பில்லும் செயல்படுத்தப்படவில்லை.',
    editReReview: 'திருத்து & மறு மதிப்பாய்வு',
    reProcessStock: 'இருப்பை மீண்டும் செயல்படுத்து',
    totalInvoiceValue: 'மொத்த இன்வாய்ஸ் மதிப்பு',
    productName: 'தயாரிப்பு பெயர்',
    sellingPrice: 'விற்பனை விலை (₹)',
    costPrice: 'செலவு விலை (₹)',
    stockQty: 'இருப்பு அளவு',
    category: 'வகை',
    unitLabel: 'அலகு',
    verifyAddProduct: 'சரிபார்த்து தயாரிப்பு சேர்',
    products: 'தயாரிப்புகள் 📦',
    catalogSize: 'பட்டியல் அளவு',
    inventoryCommandCenter: 'சரக்கு கட்டுப்பாட்டு மையம்',
    loadingInventory: 'சரக்கு ஏற்றுகிறது...',
    noProductsTitle: 'பட்டியலில் தயாரிப்புகள் இல்லை',
    noProductsDesc: 'உங்கள் ஸ்மார்ட் கடையை நிர்வகிக்க டெமோ தயாரிப்புகளை உருவாக்கவும்.',
    generateDemo: 'டெமோ சரக்கு உருவாக்கு',
    selectLanguage: 'மொழி தேர்ந்தெடு',
    languageChanged: 'மொழி மாற்றப்பட்டது!',
  },
  KN: {
    navBilling: 'ಬಿಲ್ಲಿಂಗ್',
    navProducts: 'ಉತ್ಪನ್ನಗಳು',
    navCustomers: 'ಗ್ರಾಹಕರು',
    navRecovery: 'ರಿಕವರಿ ಏಜೆಂಟ್',
    navRecords: 'ದಾಖಲೆಗಳು',
    navUdhaar: 'ಉಧಾರ್ (ಸಾಲ)',
    navGroupBuy: 'ಗುಂಪು ಖರೀದಿ',
    navAnalytics: 'ಅನಾಲಿಟಿಕ್ಸ್',
    navGst: 'GST & ITR',
    navWhatsapp: 'WhatsApp ಡೆಸ್ಕ್',
    menuTitle: 'ಮೆನು',
    lightMode: 'ಲೈಟ್ ಮೋಡ್',
    darkMode: 'ಡಾರ್ಕ್ ಮೋಡ್',
    signOut: 'ಸೈನ್ ಔಟ್',
    logoutTitle: 'ಲಾಗ್ ಔಟ್ ಮಾಡಬೇಕೆ?',
    logoutSubtitle: 'ಇಂದ ಲಾಗ್ ಔಟ್ ಮಾಡಿ ',
    signOutNow: 'ಈಗ ಲಾಗ್ ಔಟ್ ಮಾಡಿ',
    stayLoggedIn: 'ಲಾಗ್ ಇನ್ ಆಗಿರಿ',
    comingSoon: 'ಶೀಘ್ರದಲ್ಲೇ',
    greeting: 'ನಮಸ್ಕಾರ ಟೆಸ್ಟರ್! 👋',
    all: 'ಎಲ್ಲಾ',
    grocery: 'ಕಿರಾಣಿ',
    dairy: 'ಡೈರಿ',
    beverages: 'ಪಾನೀಯಗಳು',
    snacks: 'ತಿಂಡಿಗಳು',
    household: 'ಮನೆಬಳಕೆ',
    personalCare: 'ವೈಯಕ್ತಿಕ ಆರೈಕೆ',
    lowStock: 'ಕಡಿಮೆ ಸ್ಟಾಕ್',
    premium: 'ಪ್ರೀಮಿಯಂ',
    popular: 'ಜನಪ್ರಿಯ',
    add: 'ಸೇರಿಸಿ',
    soldOut: 'ಮಾರಾಟವಾಗಿದೆ',
    searchProducts: 'ಉತ್ಪನ್ನಗಳನ್ನು ಹುಡುಕಿ...',
    khataBalance: 'ಖಾತಾ ಬ್ಯಾಲೆನ್ಸ್',
    call: 'ಕರೆ ಮಾಡಿ',
    whatsapp: 'WhatsApp',
    addCustomer: 'ಗ್ರಾಹಕನನ್ನು ಸೇರಿಸಿ',
    searchCustomers: 'ಗ್ರಾಹಕರನ್ನು ಹುಡುಕಿ...',
    phone: 'ಫೋನ್',
    date: 'ದಿನಾಂಕ',
    amount: 'ಮೊತ್ತ',
    receivePayment: 'ಪಾವತಿ ಸ್ವೀಕರಿಸಿ',
    giveCredit: 'ಸಾಲ ನೀಡಿ',
    supplierBills: 'ಸರಬರಾಜುದಾರ ಬಿಲ್ಗಳು',
    digitizeBills: 'ಬಿಲ್ಗಳನ್ನು ಡಿಜಿಟಲೀಕರಿಸಿ, ದಾಸ್ತಾನು ನವೀಕರಿಸಿ',
    scan: 'ಸ್ಕ್ಯಾನ್',
    manual: 'ಕೈಯಾರೆ',
    history: 'ಇತಿಹಾಸ',
    addToStock: 'ದಾಸ್ತಾನಿಗೆ ಸೇರಿಸಿ',
    searchPlaceholder: 'ಹೆಸರು ಅಥವಾ ವರ್ಗದಿಂದ ಹುಡುಕಿ',
    scanBill: 'ಬಿಲ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ',
    tapToScan: 'ಬಿಲ್ ಸ್ಕ್ಯಾನ್ ಅಥವಾ ಅಪ್ಲೋಡ್ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
    orUploadPdf: 'ಅಥವಾ PDF / ಚಿತ್ರ ಅಪ್ಲೋಡ್ ಮಾಡಿ',
    analyzingBill: 'AI ನೊಂದಿಗೆ ಬಿಲ್ ವಿಶ್ಲೇಷಿಸಲಾಗುತ್ತಿದೆ...',
    processingOcr: 'OCR AI ನೊಂದಿಗೆ ಪ್ರಕ್ರಿಯೆ...',
    reviewItems: 'ವಸ್ತುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ',
    clearAll: 'ಎಲ್ಲಾ ತೆರವು',
    addRow: '+ ಸಾಲು ಸೇರಿಸಿ',
    process: 'ಪ್ರಕ್ರಿಯೆ',
    product: 'ಉತ್ಪನ್ನ',
    qty: 'ಪ್ರಮಾಣ',
    unit: 'ಘಟಕ',
    total: 'ಒಟ್ಟು',
    cost: 'ವೆಚ್ಚ',
    sell: 'ಮಾರಾಟ',
    noHistory: 'ಇನ್ನೂ ಯಾವ ಬಿಲ್ಗಳೂ ಪ್ರಕ್ರಿಯೆ ಆಗಿಲ್ಲ.',
    editReReview: 'ಸಂಪಾದಿಸಿ & ಮರು ಪರಿಶೀಲಿಸಿ',
    reProcessStock: 'ದಾಸ್ತಾನು ಮರು ಪ್ರಕ್ರಿಯೆ',
    totalInvoiceValue: 'ಒಟ್ಟು ಇನ್ವಾಯ್ಸ್ ಮೌಲ್ಯ',
    productName: 'ಉತ್ಪನ್ನ ಹೆಸರು',
    sellingPrice: 'ಮಾರಾಟ ಬೆಲೆ (₹)',
    costPrice: 'ವೆಚ್ಚ ಬೆಲೆ (₹)',
    stockQty: 'ದಾಸ್ತಾನು ಪ್ರಮಾಣ',
    category: 'ವರ್ಗ',
    unitLabel: 'ಘಟಕ',
    verifyAddProduct: 'ಪರಿಶೀಲಿಸಿ & ಉತ್ಪನ್ನ ಸೇರಿಸಿ',
    products: 'ಉತ್ಪನ್ನಗಳು 📦',
    catalogSize: 'ಕ್ಯಾಟಲಾಗ್ ಗಾತ್ರ',
    inventoryCommandCenter: 'ದಾಸ್ತಾನು ಆಜ್ಞಾ ಕೇಂದ್ರ',
    loadingInventory: 'ದಾಸ್ತಾನು ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    noProductsTitle: 'ಕ್ಯಾಟಲಾಗ್ನಲ್ಲಿ ಉತ್ಪನ್ನಗಳಿಲ್ಲ',
    noProductsDesc: 'ನಿಮ್ಮ ಸ್ಮಾರ್ಟ್ ದುಕಾನ್ ನಿರ್ವಹಿಸಲು ಡೆಮೋ ಉತ್ಪನ್ನಗಳನ್ನು ರಚಿಸಿ.',
    generateDemo: 'ಡೆಮೋ ದಾಸ್ತಾನು ರಚಿಸಿ',
    selectLanguage: 'ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ',
    languageChanged: 'ಭಾಷೆ ಬದಲಾಯಿತು!',
  },
};

// ─── Context ─────────────────────────────────────────────────────────────────
interface LanguageContextType {
  lang: LangCode;
  showLangPicker: boolean;
  setShowLangPicker: (show: boolean) => void;
  setLang: (code: LangCode) => void;
  t: (key: TranslationKey) => string;
  languages: Language[];
  currentLanguage: Language;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LangCode>('EN');
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Load persisted language on mount
  useEffect(() => {
    (async () => {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web') {
          saved = localStorage.getItem(STORAGE_KEY);
        } else {
          saved = await SecureStore.getItemAsync(STORAGE_KEY);
        }
        if (saved && LANGUAGES.some(l => l.code === saved)) {
          setLangState(saved as LangCode);
        }
      } catch {}
    })();
  }, []);

  const setLang = useCallback(async (code: LangCode) => {
    setLangState(code);
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEY, code);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEY, code);
      }
    } catch {}
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return dict[lang][key] ?? dict['EN'][key] ?? key;
  }, [lang]);

  const currentLanguage = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, languages: LANGUAGES, currentLanguage, showLangPicker, setShowLangPicker }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
};
