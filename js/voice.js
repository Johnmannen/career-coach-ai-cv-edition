// ============================================================
// CareerCoach AI — Röstmodul (TTS + STT)
// Använder Web Speech API — ingen extern tjänst behövs.
// ============================================================

// ──────────────────────────────────────────
//  TEXT-TILL-TAL  (AI läser upp sitt svar)
// ──────────────────────────────────────────
let ttsEnabled = false;
let currentUtterance = null;
let cachedVoice = null;        // Sparar vald röst för snabb start
let voicesLoaded = false;

/**
 * Förladdar röster så att första uppspelningen startar direkt.
 * Kallas från initVoiceAndMedia.
 */
function preloadVoices() {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return;

        voicesLoaded = true;
        cachedVoice = pickBestSwedishVoice(voices);
        console.log("TTS röst vald:", cachedVoice?.name || "standard");
    };

    // Vissa webbläsare laddar röster asynkront
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

/**
 * Väljer den bästa svenska rösten.
 * Prioriterar: "Online" / "Natural" / "Premium" > vanlig sv-SE > fallback.
 */
function pickBestSwedishVoice(voices) {
    const svVoices = voices.filter(v => v.lang.startsWith("sv"));
    if (svVoices.length === 0) return null;

    // Prioritera naturliga / online-röster (mycket mindre robotaktiga)
    const natural = svVoices.find(v =>
        /online|natural|premium|enhanced|neural/i.test(v.name)
    );
    if (natural) return natural;

    // Annars föredra kvinnliga röster (tenderar vara mjukare)
    const female = svVoices.find(v =>
        /astrid|klara|alva|elin|hedda/i.test(v.name)
    );
    if (female) return female;

    return svVoices[0];
}

function initTTS() {
    const btn = document.getElementById("tts-toggle");
    if (!btn) return;

    if (!("speechSynthesis" in window)) {
        btn.title = "Text-till-tal stöds inte i din webbläsare";
        btn.disabled = true;
        btn.style.opacity = "0.4";
        return;
    }

    btn.addEventListener("click", () => {
        ttsEnabled = !ttsEnabled;
        btn.classList.toggle("active", ttsEnabled);
        btn.title = ttsEnabled ? "Stäng av uppläsning" : "Läs upp AI-svar";

        if (!ttsEnabled && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    });
}

/**
 * Läser upp en text med mjuk svensk röst.
 * @param {string} text - Text att läsa upp
 * @param {boolean} force - Om true, spela oavsett ttsEnabled (för play-knappar)
 */
function speakText(text, force = false) {
    if (!("speechSynthesis" in window)) return;
    if (!force && !ttsEnabled) return;

    // Stoppa eventuell pågående uppläsning
    window.speechSynthesis.cancel();

    // Rensa bort markdown-formattering för renare uppläsning
    const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/#{1,4}\s*/g, '')
        .replace(/\n/g, '. ');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "sv-SE";
    utterance.rate = 0.9;     // Lite lugnare tempo
    utterance.pitch = 0.95;   // Lite mjukare tonhöjd
    utterance.volume = 0.85;  // Inte för högt

    // Använd cachad röst för snabb start
    if (cachedVoice) {
        utterance.voice = cachedVoice;
    }

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}


// ──────────────────────────────────────────
//  TAL-TILL-TEXT  (Användaren talar)
// ──────────────────────────────────────────
let recognition = null;
let isListening = false;

function initSTT() {
    const btn = document.getElementById("mic-btn");
    if (!btn) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        btn.title = "Tal-till-text stöds inte i din webbläsare (prova Chrome)";
        btn.disabled = true;
        btn.style.opacity = "0.4";
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "sv-SE";
    recognition.interimResults = true;
    recognition.continuous = false;

    const chatInput = document.getElementById("chat-input");

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        chatInput.value = transcript;
    };

    recognition.onend = () => {
        isListening = false;
        btn.classList.remove("listening");
        btn.title = "Tala istället för att skriva";
    };

    recognition.onerror = (event) => {
        console.warn("STT-fel:", event.error);
        isListening = false;
        btn.classList.remove("listening");
    };

    btn.addEventListener("click", () => {
        if (isListening) {
            recognition.stop();
        } else {
            // Stoppa TTS om den spelar
            if (window.speechSynthesis?.speaking) {
                window.speechSynthesis.cancel();
            }
            recognition.start();
            isListening = true;
            btn.classList.add("listening");
            btn.title = "Klicka för att sluta lyssna";
        }
    });
}


// ──────────────────────────────────────────
//  MEDIA-UPLOAD  (Bifoga fil / CV-bild)
// ──────────────────────────────────────────

/**
 * Initierar media-upload-knappen.
 * Returnerar base64-data som kan skickas till Gemini Vision.
 */
function initMediaUpload() {
    const btn = document.getElementById("media-btn");
    const fileInput = document.getElementById("media-input");
    if (!btn || !fileInput) return;

    btn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validera filtyp
        const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
        if (!allowed.includes(file.type)) {
            alert("Filtypen stöds inte. Använd PNG, JPG, WebP eller PDF.");
            fileInput.value = "";
            return;
        }

        // Validera storlek (max 10 MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("Filen är för stor. Max 10 MB.");
            fileInput.value = "";
            return;
        }

        // Visa fil-indikator i chatten
        addMessageToChat("user", `📎 Bifogat: ${file.name}`);

        // Konvertera till base64
        const base64 = await fileToBase64(file);

        // Skicka till AI med meddelande
        const chatInput = document.getElementById("chat-input");
        const userText = chatInput.value.trim() || "Här är en fil jag vill att du analyserar.";
        chatInput.value = "";

        await handleSendWithMedia(userText, {
            mimeType: file.type,
            data: base64
        });

        fileInput.value = ""; // Nollställ
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Ta bort "data:...;base64," prefixet
            const base64 = reader.result.split(",")[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


// ──────────────────────────────────────────
//  Initiering
// ──────────────────────────────────────────
function initVoiceAndMedia() {
    preloadVoices();  // Ladda röster tidigt → snabb TTS-start
    initTTS();
    initSTT();
    initMediaUpload();
}
