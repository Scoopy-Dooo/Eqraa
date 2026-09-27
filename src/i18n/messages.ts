export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";
export const dir = (l: Locale) => (l === "ar" ? "rtl" : "ltr");
export const messages = {
  ar: { brand: "إقرأ", tagline: "ختمة جماعية يومية، بهدوء والتزام", intro: "لكل قارئ جزء واحد كل يوم، يتبدّل يومًا بعد يوم، حتى يقرأ كل عضو الأجزاء الثلاثين. تبدأ الختمة عند الفجر وتنتهي عند الفجر التالي.", signup: "إنشاء حساب", login: "تسجيل الدخول",
    err: { invalidPhone: "أدخل الرقم بالمفتاح الدولي، مثل ‎+249…", weakPin: "اختر رمزًا من 6 أرقام لا يكون متكررًا أو متسلسلًا", phoneTaken: "هذا الرقم مسجّل من قبل", badLogin: "الرقم أو الرمز غير صحيح", locked: "تم إيقاف المحاولة مؤقتًا. حاول لاحقًا" } },
  en: { brand: "Eqraa", tagline: "A daily group Khatmah, calm and consistent", intro: "Each reader gets one Juz' per day, rotating daily until every member has read all thirty. The Khatmah opens at Fajr and closes at the next Fajr.", signup: "Create account", login: "Sign in",
    err: { invalidPhone: "Enter the number with its country code, e.g. +249…", weakPin: "Choose a 6-digit PIN that isn't repeated or sequential", phoneTaken: "This number is already registered", badLogin: "Incorrect number or PIN", locked: "Too many attempts. Try again later" } },
} as const;
