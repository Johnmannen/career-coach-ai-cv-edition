// ============================================================
// CareerCoach AI — Real-tids Canvas Motor
// Ansvarar för att rendera CV-data i höger panel i realtid.
// ============================================================

/**
 * CV-datatillståndet. Detta är den enda källan till sanning.
 * Uppdateras via updateCvState() och renderas via renderCanvas().
 */
let cvState = {
    name: null,
    title: null,
    email: null,
    phone: null,
    location: null,
    summary: null,
    experience: [],
    education: [],
    skills: [],
    coverLetter: null // Nytt fält för personligt brev
};
window.cvState = cvState;

// Spåra hur komplett CV:t är (för progress-baren)
let completionScore = 0;
const MAX_SCORE = 10; // Max möjliga poäng

/**
 * Mergar ett patch-objekt in i cvState och re-renderar.
 * @param {object} patch - Partiellt CV-objekt från AI-svaret
 */
function updateCvState(patch) {
    if (!patch) return;

    let updated = false;

    // Skalärfält
    const scalarFields = ['name', 'title', 'email', 'phone', 'location', 'summary', 'coverLetter'];
    scalarFields.forEach(field => {
        if (patch[field] !== null && patch[field] !== undefined && patch[field] !== '') {
            // Endast om värdet faktiskt är nytt
            if (cvState[field] !== patch[field]) {
                cvState[field] = patch[field];
                updated = true;
            }
        }
    });

    // Arraysfält — merge (lägg till nya, uppdatera befintliga baserat på titel/grad)
    if (patch.experience && patch.experience.length > 0) {
        patch.experience.forEach(newEntry => {
            const existing = cvState.experience.find(e => e.title === newEntry.title && e.company === newEntry.company);
            if (existing) {
                // Kolla om något fält i experience-entryt ändrats
                let entryChanged = false;
                for (let key in newEntry) {
                    if (existing[key] !== newEntry[key]) {
                        existing[key] = newEntry[key];
                        entryChanged = true;
                    }
                }
                if (entryChanged) updated = true;
            } else {
                cvState.experience.push(newEntry);
                updated = true;
            }
        });
    }

    if (patch.education && patch.education.length > 0) {
        patch.education.forEach(newEntry => {
            const existing = cvState.education.find(e => e.degree === newEntry.degree && e.institution === newEntry.institution);
            if (existing) {
                let entryChanged = false;
                for (let key in newEntry) {
                    if (existing[key] !== newEntry[key]) {
                        existing[key] = newEntry[key];
                        entryChanged = true;
                    }
                }
                if (entryChanged) updated = true;
            } else {
                cvState.education.push(newEntry);
                updated = true;
            }
        });
    }

    if (patch.skills && patch.skills.length > 0) {
        patch.skills.forEach(skill => {
            if (!cvState.skills.includes(skill)) {
                cvState.skills.push(skill);
                updated = true;
            }
        });
    }

    if (updated) {
        console.log("🎨 Uppdaterar Canvas...");
        renderCanvas();
        updateProgressBar();
    }
}

/**
 * Renderar hela cvState till DOM-elementen i canvas-panelen.
 */
function renderCanvas() {
    const isCoverLetterView = document.body.classList.contains('view-cover-letter');

    // Växla synlighet mellan CV-dokument och Brev-dokument
    const cvDoc = document.getElementById('cv-document');
    const clDoc = document.getElementById('cl-document');

    if (isCoverLetterView) {
        cvDoc.classList.add('hidden');
        clDoc.classList.remove('hidden');
        renderCoverLetter();
    } else {
        cvDoc.classList.remove('hidden');
        clDoc.classList.add('hidden');
        renderCV();
    }
}

/**
 * Renderar CV-vyn.
 */
function renderCV() {
    // ── Header-block ─────────────────────────────────────────
    setTextIfFilled('cv-name', cvState.name, 'Ditt Namn');
    setTextIfFilled('cv-title', cvState.title, 'Din Yrkestitel');

    // Kontaktrad
    renderContactRow();

    // ── Sammanfattning ───────────────────────────────────────
    const summarySection = document.getElementById('section-summary');
    const summaryContent = document.getElementById('cv-summary-content');
    if (cvState.summary) {
        summarySection.classList.remove('hidden');
        summaryContent.innerHTML = `<p class="cv-summary-text">${escapeHtml(cvState.summary)}</p>`;
    } else {
        summaryContent.innerHTML = `<p class="cv-empty-hint">Din professionella sammanfattning dyker upp här när vi kommit igång...</p>`;
    }

    // ── Erfarenhet ───────────────────────────────────────────
    const expContent = document.getElementById('cv-experience-content');
    if (cvState.experience.length > 0) {
        expContent.innerHTML = cvState.experience.map(exp => `
      <div class="cv-experience-entry">
        <div class="cv-entry-header">
          <span class="cv-entry-title">${escapeHtml(exp.title || '')}</span>
          <span class="cv-entry-period">${escapeHtml(exp.period || '')}</span>
        </div>
        <div class="cv-entry-company">${escapeHtml(exp.company || '')}</div>
        ${exp.description ? `<div class="cv-entry-desc">${escapeHtml(exp.description)}</div>` : ''}
      </div>
    `).join('');
    } else {
        expContent.innerHTML = `<p class="cv-empty-hint">Dina arbetslivserfarenheter visas här under intervjun...</p>`;
    }

    // ── Utbildning ───────────────────────────────────────────
    const eduContent = document.getElementById('cv-education-content');
    if (cvState.education.length > 0) {
        eduContent.innerHTML = cvState.education.map(edu => `
      <div class="cv-education-entry">
        <div class="cv-entry-header">
          <span class="cv-entry-title">${escapeHtml(edu.degree || '')}</span>
          <span class="cv-entry-period">${escapeHtml(edu.period || '')}</span>
        </div>
        <div class="cv-entry-institution">${escapeHtml(edu.institution || '')}</div>
        ${edu.description ? `<div class="cv-entry-desc">${escapeHtml(edu.description)}</div>` : ''}
      </div>
    `).join('');
    } else {
        eduContent.innerHTML = `<p class="cv-empty-hint">Din utbildningsbakgrund visas här...</p>`;
    }

    // ── Kompetenser ──────────────────────────────────────────
    const skillsContent = document.getElementById('cv-skills-content');
    if (cvState.skills.length > 0) {
        skillsContent.innerHTML = `
      <div class="skills-grid">
        ${cvState.skills.map(skill => `<span class="skill-tag">${escapeHtml(skill)}</span>`).join('')}
      </div>
    `;
    } else {
        skillsContent.innerHTML = `<p class="cv-empty-hint">Dina kompetenser läggs till allt eftersom...</p>`;
    }
}

/**
 * Renderar Personligt Brev-vyn.
 */
function renderCoverLetter() {
    const clContent = document.getElementById('cl-content');
    const clName = document.getElementById('cl-name');
    const clContact = document.getElementById('cl-contact');

    clName.textContent = cvState.name || 'Ditt Namn';

    let contactInfo = [];
    if (cvState.email) contactInfo.push(cvState.email);
    if (cvState.phone) contactInfo.push(cvState.phone);
    if (cvState.location) contactInfo.push(cvState.location);
    clContact.textContent = contactInfo.join(' • ');

    if (cvState.coverLetter) {
        // Konvertera radbrytningar till <p> för snyggare layout
        const paragraphs = cvState.coverLetter.split('\n\n').map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
        clContent.innerHTML = `<div class="cl-text">${paragraphs}</div>`;
    } else {
        clContent.innerHTML = `<p class="cv-empty-hint">Ditt personliga brev skapas här när vi börjar diskutera dina specifika mål och erfarenheter...</p>`;
    }
}

/**
 * Renderar kontaktradens items.
 */
function renderContactRow() {
    const contactRow = document.getElementById('cv-contact-row');
    const items = [];

    if (cvState.email) {
        items.push(`<div class="cv-contact-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z"/><path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z"/></svg>
      ${escapeHtml(cvState.email)}
    </div>`);
    }

    if (cvState.phone) {
        items.push(`<div class="cv-contact-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clip-rule="evenodd"/></svg>
      ${escapeHtml(cvState.phone)}
    </div>`);
    }

    if (cvState.location) {
        items.push(`<div class="cv-contact-item">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd"/></svg>
      ${escapeHtml(cvState.location)}
    </div>`);
    }

    contactRow.innerHTML = items.join('');
}

/**
 * Uppdaterar progress-baren baserat på hur fyllt CV:t är.
 */
function updateProgressBar() {
    let score = 0;
    if (cvState.name) score += 2;
    if (cvState.title) score += 1;
    if (cvState.email) score += 1;
    if (cvState.summary) score += 2;
    if (cvState.experience.length) score += 2;
    if (cvState.education.length) score += 1;
    if (cvState.skills.length) score += 1;

    const pct = Math.min(100, Math.round((score / MAX_SCORE) * 100));
    const fill = document.getElementById('canvas-progress-fill');
    if (fill) fill.style.width = `${pct}%`;
}

// ─── Helpers ────────────────────────────────────────────────

function setTextIfFilled(id, value, placeholder) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value || placeholder;
    el.style.opacity = value ? '1' : '0.45';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Returnerar en kopia av det aktuella CV-tillståndet.
 */
function getCvState() {
    return JSON.parse(JSON.stringify(cvState));
}
/**
 * Formaterar CV-tillståndet som en ren textfil (.txt)
 * @returns {string}
 */
function formatCvAsText() {
    const state = cvState;
    const isCoverLetter = document.body.classList.contains('view-cover-letter');

    if (isCoverLetter) {
        let text = `PERSONLIGT BREV\n`;
        text += `================\n\n`;
        text += `${state.name || 'Ditt Namn'}\n`;
        if (state.email || state.phone || state.location) {
            text += `${[state.email, state.phone, state.location].filter(Boolean).join(' • ')}\n`;
        }
        text += `\n----------------\n\n`;
        text += state.coverLetter || 'Inget brev genererat ännu.';
        return text;
    }

    // CV-format
    let text = `CURRICULUM VITAE\n`;
    text += `================\n\n`;
    text += `${(state.name || 'Ditt Namn').toUpperCase()}\n`;
    text += `${state.title || 'Din Yrkestitel'}\n\n`;

    if (state.email || state.phone || state.location) {
        text += `KONTAKT\n`;
        text += `-------\n`;
        if (state.email) text += `E-post: ${state.email}\n`;
        if (state.phone) text += `Tel:    ${state.phone}\n`;
        if (state.location) text += `Plats:  ${state.location}\n`;
        text += `\n`;
    }

    if (state.summary) {
        text += `PROFIL\n`;
        text += `------\n`;
        text += `${state.summary}\n\n`;
    }

    if (state.experience.length > 0) {
        text += `ERFARENHET\n`;
        text += `----------\n`;
        state.experience.forEach(exp => {
            text += `${exp.title.toUpperCase()}\n`;
            text += `${exp.company} | ${exp.period}\n`;
            if (exp.description) text += `${exp.description}\n`;
            text += `\n`;
        });
    }

    if (state.education.length > 0) {
        text += `UTBILDNING\n`;
        text += `----------\n`;
        state.education.forEach(edu => {
            text += `${edu.degree.toUpperCase()}\n`;
            text += `${edu.institution} | ${edu.period}\n`;
            if (edu.description) text += `${edu.description}\n`;
            text += `\n`;
        });
    }

    if (state.skills.length > 0) {
        text += `KOMPETENSER\n`;
        text += `-----------\n`;
        text += state.skills.join(', ') + '\n';
    }

    return text;
}

// Exponera för interview.html
window.formatCvAsText = formatCvAsText;
