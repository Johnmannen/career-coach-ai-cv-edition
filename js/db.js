// ──────────────────────────────────────────
//  FIREBASE / FIRESTORE (Persistens)
// ──────────────────────────────────────────

// Importera Firebase SDK från CDN (ESM)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    deleteDoc,
    serverTimestamp,
    collection,
    query,
    orderBy,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Firebase-konfiguration (Hämtas från config.js)
const firebaseConfig = window.FIREBASE_CONFIG || {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initiera Firebase
let db = null;
let auth = null;
const provider = new GoogleAuthProvider();

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Bridge for legacy scripts
    window.auth = auth;
    window.db = db;
    window.firebase = { app };

    // Övervaka inloggningsstatus
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("👤 Användare inloggad:", user.displayName);
            // Migrera eventuell gästsession till användarens konto
            await migrateGuestSession(user.uid);
            // GDPR: rensa sessioner äldre än 30 dagar
            await cleanupExpiredSession(user.uid);
            if (window.updateAuthUI) window.updateAuthUI(user);
        } else {
            console.log("👤 Ingen användare inloggad (Gäst)");
            if (window.updateAuthUI) window.updateAuthUI(null);
        }
    });
} catch (error) {
    console.error("Firebase initieringsfel:", error);
}

// Debounce timer för att undvika för täta anrop till molnet
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 2500; // Vänta 2.5s efter sista ändringen innan vi sparar

/**
 * Migrerar gästsession till inloggad användares konto.
 * Kopierar data från interviews/{sessionId} till users/{uid}/sessions/{sessionId}.
 * Körs automatiskt vid inloggning.
 */
async function migrateGuestSession(uid) {
    if (!db) return;
    const sessionId = getSessionId();

    try {
        const guestRef = doc(db, "interviews", sessionId);
        const guestSnap = await getDoc(guestRef);

        if (guestSnap.exists()) {
            const userRef = doc(db, "users", uid, "sessions", sessionId);
            const userSnap = await getDoc(userRef);

            // Migrera bara om användaren INTE redan har data för denna session
            if (!userSnap.exists()) {
                console.log("📦 Migrerar gästsession till användarkonto...");
                await setDoc(userRef, {
                    ...guestSnap.data(),
                    migratedAt: serverTimestamp()
                });
                console.log("✅ Gästsession migrerad!");
            }
        }
    } catch (error) {
        console.warn("Kunde inte migrera gästsession:", error);
    }
}

/**
 * GDPR Cleanup: Raderar sessioner äldre än 30 dagar.
 * Körs klientside vid varje inloggning (gratis alternativ till Cloud Function).
 */
async function cleanupExpiredSession(uid) {
    if (!db) return;
    const sessionId = getSessionId();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    try {
        const sessionRef = doc(db, "users", uid, "sessions", sessionId);
        const snap = await getDoc(sessionRef);

        if (snap.exists()) {
            const data = snap.data();
            const lastActive = data.lastActiveAt?.toDate?.();
            if (lastActive && (Date.now() - lastActive.getTime()) > THIRTY_DAYS_MS) {
                console.log("🗑️ GDPR: Raderar session äldre än 30 dagar...");
                await deleteDoc(sessionRef);
                localStorage.removeItem("careercoach_session_id");
                console.log("✅ Gammal session raderad.");
            }
        }
    } catch (error) {
        console.warn("GDPR cleanup misslyckades:", error);
    }
}

/**
 * Loggar ut användaren
 */
export async function logout() {
    if (!auth) return;
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Utloggningsfel:", error);
    }
}

/**
 * Sparar aktuell intervjusession till Firestore (Debounced)
 * @param {Object} cvState - Aktuellt CV-data
 * @param {Array} history - Chatthistorik
 */
export function saveSession(cvState, history) {
    if (!db) return;

    // Rensa tidigare timeout om ett nytt anrop kommer snabbt (t.ex. AI uppdaterar flera fält)
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        const sessionId = getSessionId();
        const user = auth?.currentUser;

        // Sökväg: Om inloggad -> users/{uid}/sessions/{sessionId}, annars interviews/{sessionId}
        const sessionRef = user
            ? doc(db, "users", user.uid, "sessions", sessionId)
            : doc(db, "interviews", sessionId);

        try {
            await setDoc(sessionRef, {
                cvState: cvState,
                history: history,
                lastUpdated: serverTimestamp(),
                lastActiveAt: serverTimestamp() // För 30-dagars radering
            }, { merge: true });
            console.log("☁️ Session autosparad till molnet");

            // Trigga "Sparat"-notis i UI:t om funktionen finns
            if (typeof window.showSaveStatus === 'function') {
                window.showSaveStatus();
            }
        } catch (error) {
            console.error("Kunde inte spara session till Firestore:", error);
        }
    }, SAVE_DEBOUNCE_MS);
}

/**
 * Laddar en intervjusession från Firestore
 * @returns {Promise<Object|null>} Session-data eller null
 */
export async function loadSession() {
    if (!db) return null;

    const user = auth?.currentUser;

    if (user) {
        try {
            // Hämta användarens senast aktiva session, även vid byte av enhet
            const sessionsRef = collection(db, "users", user.uid, "sessions");
            const q = query(sessionsRef, orderBy("lastUpdated", "desc"), limit(1));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const latestDoc = querySnapshot.docs[0];
                // Säkerställ att den lokala id:n matchar
                localStorage.setItem("careercoach_session_id", latestDoc.id);
                return latestDoc.data();
            }
        } catch (error) {
            console.error("Kunde inte söka efter användarens senaste session:", error);
        }
    }

    const sessionId = getSessionId();

    const sessionRef = user
        ? doc(db, "users", user.uid, "sessions", sessionId)
        : doc(db, "interviews", sessionId);

    try {
        const docSnap = await getDoc(sessionRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
    } catch (error) {
        console.error("Kunde inte ladda session från Firestore:", error);
    }
    return null;
}

/**
 * Exporterar sessionen som en JSON-fil för nedladdning
 * @param {Object} cvState - Aktuellt CV-data
 * @param {Array} history - Chatthistorik
 */
export function exportSessionToJson(cvState, history) {
    const data = {
        cvState,
        history,
        exportedAt: new Date().toISOString(),
        version: "2.0"
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CareerCoach_Session_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Importerar en session från en JSON-sträng
 * @param {string} jsonString - Rådata från filen
 * @returns {Object|null} Den importerade sessionen eller null vid fel
 */
export function parseImportedSession(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data.cvState && data.history) {
            return data;
        }
    } catch (e) {
        console.error("Fel vid import av session:", e);
    }
    return null;
}

/**
 * Hämtar eller skapar ett unikt sessionId för denna webbläsare.
 * Prioriterar 'session' parameter i URL:en för delning.
 */
function getSessionId() {
    // 1. Kolla URL-parametrar först (för delade länkar)
    const urlParams = new URLSearchParams(window.location.search);
    const urlSession = urlParams.get('session');
    if (urlSession) {
        // Spara URL-param till localStorage för framtida besök
        localStorage.setItem("careercoach_session_id", urlSession);
        return urlSession;
    }

    // 2. Annars kolla localStorage
    let id = localStorage.getItem("careercoach_session_id");
    if (!id) {
        id = "session_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now();
        localStorage.setItem("careercoach_session_id", id);
    }
    return id;
}

/**
 * Loggar in med Google
 */
export async function login() {
    if (!auth) return;
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Inloggningsfel:", error);
        alert("Kunde inte logga in. Kontrollera att Google Auth är aktiverat i Firebase.");
    }
}

/**
 * Loggar in med E-post och lösenord
 */
export async function loginWithEmail(email, password) {
    if (!auth) return;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("E-post inloggningsfel:", error);
        let msg = "Kunde inte logga in. Kontrollera uppgifterna.";
        if (error.code === 'auth/user-not-found') msg = "Användaren hittades inte. Registrera dig först.";
        if (error.code === 'auth/wrong-password') msg = "Fel lösenord.";
        alert(msg);
        throw error;
    }
}

/**
 * Registrerar ny användare med E-post
 */
export async function registerWithEmail(email, password) {
    if (!auth) return;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Registreringsfel:", error);
        let msg = "Kunde inte registrera användare.";
        if (error.code === 'auth/email-already-in-use') msg = "E-postadressen används redan.";
        if (error.code === 'auth/weak-password') msg = "Lösenordet är för svagt (minst 6 tecken).";
        alert(msg);
        throw error;
    }
}
