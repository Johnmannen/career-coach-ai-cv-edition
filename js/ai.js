// ============================================================
// CareerCoach AI — AI Module (Gemini API)
// VIKTIG: Master-Prompten nedan är systemets kärna.
// Den får ALDRIG ändras eller kortas ner.
// ============================================================

// Kunskapsdatabas (synkad från NotebookLM)
let syncedKnowledge = null;
async function loadKnowledgeBase() {
    try {
        const res = await fetch('data/knowledge_base.json');
        if (res.ok) {
            syncedKnowledge = await res.json();
            console.log("📚 Kunskapsbas laddad:", syncedKnowledge.last_updated);
        }
    } catch (e) {
        console.warn("Kunde inte ladda kunskapsbasen:", e);
    }
}
loadKnowledgeBase();

/**
 * MASTER-PROMPT — Jobbcoachen (CV Edition)
 * Källa: CareerCoachAI_Antigravity_Blueprint.txt, Sektion 2
 * @param {Array} history - Chatthistorik för att avgöra om vi ska fortsätta eller börja om.
 */
function getSystemPrompt(history = []) {
    const isReturningUser = history.length > 0;

    let prompt = `Du är Jobbcoachen, en elit-coach specialiserad på att transformera ansökningshandlingar till exceptionella säljinstrument enligt 2026 års standard. Din personlighet är en blandning av en strategisk rådgivare och en uppmuntrande mentor. Du är ödmjuk men rak, insiktsfull och genuint positiv. Du samarbetar med användaren för att bygga deras framtid.
`;

    if (isReturningUser) {
        prompt += `\nKONTINUITET: Denna användare är återkommande. Det finns redan tidigare meddelanden i historiken. Hoppa över det inledande välkomstprotokollet och fortsätt direkt där ni slutade eller svara på användarens senaste fråga. Vi bygger vidare på det vi redan har påbörjat.\n`;
    } else {
        prompt += `\nInledande Protokoll (Obligatoriskt & Stegvis): Varje ny konversation SKALL inledas mjukt för att inte överväldiga användaren.
1. Välkomnande: Hälsa varmt och kort. Nämn i förbifarten att samtalet sker på svenska men att användaren när som helst kan byta eller lägga till ett annat språk. Gör INTE detta till en separat fråga — väv in det naturligt i hälsningen och gå direkt vidare till steg 2.
2. Audit eller Nystart: Fråga om det finns ett befintligt CV att analysera ("audit") eller om ett nytt ska byggas från grunden. Avvakta svar.
3. Mål: Bekräfta svaret artigt. Fråga om användaren har tittat på specifika annonser eller har ett drömjobb i sikte för att kunna göra en "Gap-analys". Avvakta svar.
`;
    }

    prompt += `
Arbetsmetod & Verktyg (Berikad med RAG-strategier):
* Canvas-läge: Använd alltid Canvas-funktionen för att generera och redigera CV och personligt brev. Detta möjliggör live-ändringar och en tydlig överblick för användaren.
* Knowledge-fokus: Utgå i första hand från informationen i den länkade databasen för att säkerställa att råden följer den specifika metodiken.
* Optimerad digital närvaro: Fokusera på att göra CV:t "sökbart" och anpassat för både människor och algoritmer (ATS-optimering).
* Problem-Lösning-fokus: Varje punkt i CV:t ska tydligt visa ett problem kandidaten löste och resultatet som uppnåddes (förstärk XYZ-metodiken).
* Kulturell & Branschspecifik anpassning: Använd rätt terminologi och hjälp kandidaten att översätta sina unika styrkor till ett format som arbetsgivaren värdesätter.
* Resultatorienterat språkbruk: Undvik att bara lista arbetsuppgifter; fokusera på mätbara framgångar och prestationer.
* Show, don't tell: Om användaren använder adjektiv som "stresstålig", be om ett konkret exempel som bevisar det.`;

    if (syncedKnowledge) {
        prompt += `\n\nDIN AKTUELLA KUNSKAPSBAS (Senast synkad: ${syncedKnowledge.last_updated}):
Marknadsstatistik: ${syncedKnowledge.market_stats.join(' ')}
CV-Tips: ${syncedKnowledge.cv_tips.join(' ')}
Nyckelprinciper: ${syncedKnowledge.key_principles.join(' ')}`;
    }

    prompt += `\n\nLeverans & Avslut:
* Strategisk vägledning: Förklara alltid varför en ändring görs (t.ex. för ATS-optimering).
* Slutprodukt: Leverera ett komplett CV och personligt brev i Canvas som matchar 2026 års standard.
* Uppföljning: Avsluta med en positiv lyckönskning och erbjud stöd för framtida behov, som LinkedIn eller intervjuträning.

VIKTIGT: Du svarar ALLTID i JSON-format. Returnera ALLTID ett JSON-objekt med dessa nycklar:
{
  "response": "Ditt svar till användaren som en naturlig konversationstext",
  "canvasUpdate": {
    "name": "Fullständigt namn (om bekräftat, annars null)",
    "title": "Yrkestitel (om bekräftat, annars null)",
    "email": "E-post (om bekräftat, annars null)",
    "phone": "Telefon (om bekräftat, annars null)",
    "location": "Stad/plats (om bekräftat, annars null)",
    "summary": "Professionell sammanfattning (om bekräftat, annars null)",
    "experience": [
      {
        "title": "Jobbtitel",
        "company": "Företagsnamn",
        "period": "Tidsperiod (t.ex. 2020–2023)",
        "description": "Ansvar och prestationer enligt XYZ-metodiken"
      }
    ],
    "education": [
      {
        "degree": "Examen/utbildning",
        "institution": "Lärosäte",
        "period": "Tidsperiod",
        "description": "Relevant information"
      }
    ],
    "skills": ["Kompetens 1", "Kompetens 2"],
    "coverLetter": "Innehållet i det personliga brevet (om bekräftat eller genererat, annars null)"
  }
}

Om inget nytt CV-data bekräftades i det senaste svaret, sätt alla canvasUpdate-fält till null och experience/education/skills till tomma listor []. MEN inkludera alltid canvasUpdate-objektet.`;

    return prompt;
}

/**
 * Skickar ett meddelande till Gemini API och returnerar AI-svaret.
 * @param {string} userMessage - Användarens senaste meddelande
 * @param {Array}  history     - Konversationshistorik [{role, parts: [{text}]}]
 * @returns {Promise<{response: string, canvasUpdate: object}>}
 */
async function sendToGemini(userMessage, history) {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // Säkerställ att historiken växlar korrekt (user/model/user...)
    // Och börjar alltid med 'user'
    let limitedHistory = history.slice(-MAX_HISTORY_MESSAGES);
    if (limitedHistory.length > 0 && limitedHistory[0].role === 'model') {
        limitedHistory = limitedHistory.slice(1);
    }

    const requestBody = {
        system_instruction: {
            parts: [{ text: getSystemPrompt(limitedHistory) }]
        },
        contents: [
            ...limitedHistory,
            {
                role: "user",
                parts: [{ text: userMessage }]
            }
        ],
        generationConfig: {
            temperature: 0.7
        }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
        const res = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errBody = await res.text();
            console.error(`🔴 Gemini API Fel ${res.status}:`, errBody);
            // Visa felkoden i UI:t för att underlätta felsökning för användaren
            const errorMsg = getErrorResponse();
            errorMsg.response += ` (Felkod: ${res.status})`;
            return errorMsg;
        }

        const data = await res.json();
        console.log("Gemini råsvar:", JSON.stringify(data, null, 2));

        if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
            console.warn("Svar blockerat av säkerhetsfilter");
            return { response: "Jag kan tyvärr inte svara på det. Kan du formulera om din fråga?", canvasUpdate: null };
        }

        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return getErrorResponse();

        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Försök parsa JSON — med fallback för literal newlines
        const parsed = safeJsonParse(cleanedText);
        if (parsed && parsed.response) {
            return {
                response: parsed.response,
                canvasUpdate: parsed.canvasUpdate || null
            };
        }

        // Sista fallback: returnera rå text
        return { response: rawText, canvasUpdate: null };

    } catch (err) {
        clearTimeout(timeoutId);
        const isTimeout = err.name === 'AbortError';
        console.error("🔴 TEKNISKT AI-FEL:", {
            errorType: isTimeout ? 'TIMEOUT' : 'NETWORK/OTHER',
            message: err.message,
            stack: err.stack
        });

        const errorMsg = getErrorResponse();
        if (isTimeout) {
            errorMsg.response = "AI:n tog för lång tid på sig att svara. Prova att skicka ett kortare meddelande!";
        }
        return errorMsg;
    }
}

/**
 * Robust JSON-parser som hanterar Gemini:s tendens att
 * returnera JSON med literal newlines i strängvärden.
 */
function safeJsonParse(text) {
    // 1. Försök direkt
    try { return JSON.parse(text); } catch (_) { }

    // 2. Extrahera JSON-blocket
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    let jsonStr = jsonMatch[0];

    // 3. Försök parsa extraherat block
    try { return JSON.parse(jsonStr); } catch (_) { }

    // 4. Fixa literal newlines inuti strängar
    // Ersätt radbrytningar inuti JSON-strängar med \\n
    jsonStr = jsonStr.replace(/(["]:[ ]*")((?:[^"\\]|\\.)*)(")(?=\s*[,}])/gs, (match, prefix, content, suffix) => {
        const fixed = content.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        return prefix + fixed + suffix;
    });

    try { return JSON.parse(jsonStr); } catch (_) { }

    // 5. Aggressiv fallback: rensa ALLA literal newlines
    try {
        const aggressive = jsonStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r');
        return JSON.parse(aggressive);
    } catch (_) { }

    return null;
}

/**
 * Returnerar det standardiserade felmeddelandet på svenska.
 * Källa: Blueprint, Sektion 4 — Felhantering.
 */
function getErrorResponse() {
    return {
        response: "Jag får tyvärr ingen kontakt med min 'hjärna' just nu (nätverksstörning). Prova att ladda om sidan (F5) eller vänta en minut och försök igen.",
        canvasUpdate: null
    };
}

/**
 * Skickar ett meddelande MED bifogad fil (bild/PDF) till Gemini.
 * @param {string} userMessage - Användarens text
 * @param {{mimeType: string, data: string}} media - Base64-kodad fil
 * @param {Array}  history - Konversationshistorik
 * @returns {Promise<{response: string, canvasUpdate: object}>}
 */
async function sendToGeminiWithMedia(userMessage, media, history) {
    let limitedHistory = history.slice(-MAX_HISTORY_MESSAGES);
    if (limitedHistory.length > 0 && limitedHistory[0].role === 'model') {
        limitedHistory = limitedHistory.slice(1);
    }

    const requestBody = {
        system_instruction: {
            parts: [{ text: getSystemPrompt(limitedHistory) }]
        },
        contents: [
            ...limitedHistory,
            {
                role: "user",
                parts: [
                    { text: userMessage },
                    {
                        inline_data: {
                            mime_type: media.mimeType,
                            data: media.data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7
        }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // Längre timeout för media

    try {
        const res = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errBody = await res.text();
            console.error(`Gemini Vision HTTP-fel ${res.status}:`, errBody);
            return getErrorResponse();
        }

        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return getErrorResponse();

        const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Använd samma robusta parser som sendToGemini
        const parsed = safeJsonParse(cleanedText);
        if (parsed && parsed.response) {
            return {
                response: parsed.response,
                canvasUpdate: parsed.canvasUpdate || null
            };
        }

        return { response: rawText, canvasUpdate: null };

    } catch (err) {
        clearTimeout(timeoutId);
        console.error("AI-fel (media):", err);
        return getErrorResponse();
    }
}
