// ============================================================
// CareerCoach AI — Chat Module
// Hanterar UI för chatt-panelen och koordinerar AI + Canvas.
// ============================================================

/** Konversationshistorik i Gemini API-format */
let chatHistory = [];
window.chatHistory = chatHistory;

/** Initialisering — körs när DOM:en är klar */
function initChat(skipGreeting = false) {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // Skicka vid knapptryck
    sendBtn.addEventListener('click', handleSend);

    // Skicka med Enter (Shift+Enter = ny rad)
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // Auto-expandera textarea
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Starta med Jobbcoachens välkomsthälsning om det är en ny session
    if (!skipGreeting) {
        triggerOpeningGreeting();
    }
}

/**
 * Startar konversationen med en tom prompt så att Jobbcoachen
 * inleder med sitt obligatoriska välkomstprotokoll.
 */
async function triggerOpeningGreeting() {
    showTypingIndicator();
    const result = await sendToGemini("Hej! Jag vill ha hjälp med mitt CV.", chatHistory);
    hideTypingIndicator();

    addMessageToChat('ai', result.response);
    speakText(result.response); // TTS
    chatHistory.push(
        { role: "user", parts: [{ text: "Hej! Jag vill ha hjälp med mitt CV." }] },
        { role: "model", parts: [{ text: result.response }] }
    );

    if (result.canvasUpdate) {
        updateCvState(result.canvasUpdate);
    }

    if (window.DB) {
        window.DB.saveSession(cvState, chatHistory);
    }
}

/**
 * Hanterar sändning av ett meddelande från användaren.
 */
async function handleSend() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const message = input.value.trim();

    if (!message || sendBtn.disabled) return;

    // Rensa och inaktivera input
    input.value = '';
    input.style.height = 'auto';
    setInputState(false);

    // Visa användarens meddelande
    addMessageToChat('user', message);

    // Visa "tänker"-indikatorn
    showTypingIndicator();

    // Anropa AI
    const result = await sendToGemini(message, chatHistory);

    // Dölj indikatorn och visa svaret
    hideTypingIndicator();
    addMessageToChat('ai', result.response);
    speakText(result.response); // TTS

    // Uppdatera historiken
    chatHistory.push(
        { role: "user", parts: [{ text: message }] },
        { role: "model", parts: [{ text: result.response }] }
    );

    // Uppdatera Canvas med ny CV-data (om det finns)
    if (result.canvasUpdate) {
        updateCvState(result.canvasUpdate);
    }

    // Spara till molnet
    if (window.DB) {
        window.DB.saveSession(cvState, chatHistory);
    }

    // Aktivera input igen
    setInputState(true);
    document.getElementById('chat-input').focus();
}

/**
 * Hanterar sändning av meddelande med bifogad media (bild/PDF).
 * Anropas från voice.js → initMediaUpload.
 */
async function handleSendWithMedia(userText, media) {
    setInputState(false);
    showTypingIndicator();

    const result = await sendToGeminiWithMedia(userText, media, chatHistory);

    hideTypingIndicator();
    addMessageToChat('ai', result.response);
    speakText(result.response); // TTS

    chatHistory.push(
        { role: "user", parts: [{ text: userText + " [bifogad fil]" }] },
        { role: "model", parts: [{ text: result.response }] }
    );

    if (result.canvasUpdate) {
        updateCvState(result.canvasUpdate);
    }

    // Spara till molnet
    if (window.DB) {
        window.DB.saveSession(cvState, chatHistory);
    }

    const chatInput = document.getElementById("chat-input");
    setInputState(true);
    chatInput.focus();
}

/**
 * Lägger till en meddelandebubbla i chattflödet.
 * @param {'ai'|'user'} role
 * @param {string} text
 */
function addMessageToChat(role, text) {
    const messages = document.getElementById('chat-messages');

    const wrapper = document.createElement('div');
    wrapper.className = `msg msg-${role}`;

    if (role === 'ai') {
        wrapper.innerHTML = `
      <div class="msg-sender">Jobbcoachen</div>
      <div class="msg-bubble">${formatMessageText(text)}</div>
      <button class="msg-play-btn" title="Läs upp detta svar" aria-label="Läs upp">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.5 3.75a.75.75 0 00-1.264-.546L5.203 7H2.667a.75.75 0 00-.7.48A6.985 6.985 0 001.5 10c0 .887.165 1.737.468 2.52.111.29.39.48.7.48h2.535l4.033 3.796A.75.75 0 0010.5 16.25V3.75zM13.38 5.076a.75.75 0 011.06-.044 6.5 6.5 0 010 9.936.75.75 0 01-1.017-1.103 5 5 0 000-7.646.75.75 0 01-.044-1.06z"/>
        </svg>
        Lyssna
      </button>
    `;
        // Koppla play-knappen
        const playBtn = wrapper.querySelector('.msg-play-btn');
        playBtn.addEventListener('click', () => speakText(text, true));
    } else {
        wrapper.innerHTML = `<div class="msg-bubble">${formatMessageText(text)}</div>`;
    }

    messages.appendChild(wrapper);
    scrollToBottom();
}

/**
 * Formaterar meddelandetext: ger grundläggande Markdown-stöd.
 * **bold**, *italic*, \n → <br>
 */
function formatMessageText(text) {
    if (!text) return '';

    return text
        // Escape HTML first
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Line breaks
        .replace(/\n/g, '<br>');
}

/** Scrollar chattflödet till botten */
function scrollToBottom() {
    const messages = document.getElementById('chat-messages');
    requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
    });
}

/** Visar "tänker"-indikatorn */
function showTypingIndicator() {
    document.getElementById('typing-indicator').classList.add('visible');
    scrollToBottom();
}

/** Döljer "tänker"-indikatorn */
function hideTypingIndicator() {
    document.getElementById('typing-indicator').classList.remove('visible');
}

/**
 * Aktiverar eller inaktiverar inmatningsfältet och sändknappen.
 * @param {boolean} enabled
 */
function setInputState(enabled) {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    input.disabled = !enabled;
    sendBtn.disabled = !enabled;

    if (enabled) {
        input.placeholder = "Skriv ditt svar här...";
    } else {
        input.placeholder = "Jobbcoachen tänker...";
    }
}

/**
 * Synkar den interna historiken (används vid laddning)
 * @param {Array} history 
 */
function syncChatHistory(history) {
    chatHistory = history;
    window.chatHistory = chatHistory;
}

/**
 * Visar en tillfällig "Sparat"-notis i UI:t
 * Exponeras till window så att db.js kan anropa den efter debounced save.
 */
function showSaveStatus() {
    // Vi kan lägga till en liten indikator i headern eller liknande
    const header = document.querySelector('.chat-header');
    if (!header) return;

    let status = document.getElementById('save-status');

    if (!status) {
        status = document.createElement('span');
        status.id = 'save-status';
        status.style.fontSize = '11px';
        status.style.opacity = '0.6';
        status.style.marginLeft = '10px';
        status.style.color = 'var(--color-success)';
        header.appendChild(status);
    }

    status.textContent = "✓ Sparat";
    status.style.display = 'inline';

    setTimeout(() => {
        status.style.display = 'none';
    }, 2000);
}

// Exponera för global användning (db.js)
window.showSaveStatus = showSaveStatus;
