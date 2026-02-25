// ============================================================
// CareerCoach AI — Konfiguration
// API-nyckeln hanteras av Vercel Serverless Proxy (/api/gemini)
// ============================================================

// Proxy-läge: nyckeln finns ALDRIG i klienten
const USE_PROXY = true;  // Sätt till false för lokal dev med direkt nyckel

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_URL = USE_PROXY
    ? `/api/gemini?model=${GEMINI_MODEL}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=DIN_NYCKEL_HÄR`;

// Max antal meddelanden att skicka som historik (för att undvika timeout)
const MAX_HISTORY_MESSAGES = 20;

// Firebase-konfiguration (Live från användaren)
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyC19UmpUdBw5-X6g-rsWl165_f0hJ-qcp0",
    authDomain: "careercoach-ai-cvedition.firebaseapp.com",
    projectId: "careercoach-ai-cvedition",
    storageBucket: "careercoach-ai-cvedition.firebasestorage.app",
    messagingSenderId: "23008962761",
    appId: "1:23008962761:web:1cfb983d589818dda30518"
};
