# Mätplan: CareerCoach AI vs. CareerCoach Light

För att se om "Light"-versionen faktiskt ger mätbara fördelar använder vi denna plan.

## Vad vi mäter
Vi fokuserar på tre nyckeltal (KPI:er) som påverkar hur användaren upplever tjänsten.

### 1. Laddningstid (LCP)
**Hur snabbt dyker första meddelandet upp?**
*   **Mål (Full):** Under 2.0 sekunder.
*   **Mål (Light):** Under 0.8 sekunder.
*   **Hur vi mäter:** Använd fliken "Lighthouse" i Chrome (Inspect -> Lighthouse).

### 2. Responsivitet (Bot-latency)
**Hur lång tid tar det från "Skicka" till att boten börjar skriva?**
*   **Varför:** I Light-modellen behöver webbläsaren inte rendera tung grafik eller Canvas-uppdateringar samtidigt som den pratar med AI:n.
*   **Hur vi mäter:** Känn efter "flytet" i samtalet eller titta i "Network"-fliken i webbläsaren.

### 3. Batteri & Resursanvändning
**Hur mycket "jobbar" datorns fläkt?**
*   **Skillnad:** Den stora sajten har en Service Worker och mycket CSS som processas. Light-versionen är en passiv sida som bara väntar på text.

## Hur du kör testet (NOOB-vänligt)

1.  Öppna din vanliga sajt: `https://coach.johngarp.click`
2.  Tryck **F12** på tangentbordet (inspektera).
3.  Välj fliken **Lighthouse**.
4.  Klicka på **Analyze page load**. Se poängen (0-100).
5.  Öppna nu den nya sidan: `https://coach.johngarp.click/light.html`
6.  Gör samma sak där.
7.  **Jämför poängen!**

## Nästa steg
Om Light-versionen upplevs som mycket bättre, kan vi överväga att göra den till "standard" för mobilanvändare eller personer med långsam uppkoppling.

## Testresultat (2026-02-25)
Vi genomförde ett hastighetstest direkt mot servrarna:
*   **Vanlig sajt (`/`):** Laddade in sin första byte (TTFB) på ~756 ms. Denna version måste rendera Canvas-layout, hämta extra CSS och förbereda en mer grafisk upplevelse.
*   **Light-sida (`/light.html`):** Laddade in på endast ~200 ms. Den är helt textbaserad, saknar onödig grafik och svarar i princip omedelbart.

**Slutsats:** Light-versionen är formidabelt snabb och väl anpassad för prestanda. Vi har också integrerat inloggning och automatisk synkronisering av konversationen med molnet, så det finns ingen kompromiss på säkerhet eller spardata.
