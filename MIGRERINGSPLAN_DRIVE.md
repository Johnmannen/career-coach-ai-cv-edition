# Migreringsplan: CareerCoach AI -> Google Drive

Denna plan är framtagen för att säkert flytta ditt projekt från din lokala hårddisk till Google Drive, vilket ger dig automatisk backup och tillgång till dina filer från andra platser.

## Förutsättningar
*   **Google Drive for Desktop** installerat på din Windows-dator (viktigt: det ska skapa en virtuell hårddisk som oftast heter `G:`).

## Steg 1: Förberedelse på Google Drive
1.  Öppna Utforskaren (File Explorer).
2.  Gå till din Google Drive-enhet (oftast `G:`).
3.  Gå in i mappen "Min enhet" (My Drive).
4.  Skapa en ny huvudmapp som heter `Utveckling` (om du inte redan har en).
5.  Inuti den, skapa mappen: `CareerCoach_AI`.

## Steg 2: Skapa undermappar (Rekommenderad struktur)
Inuti `CareerCoach_AI`, skapa följande mappar för att hålla ordning:
1.  📂 `app-src` — Här kommer själva koden att bo (din nuvarande webbapp).
2.  📂 `assets-raw` — Här lägger du original-filer (t.ex. den där 18MB herobilden om du vill spara den, eller videofiler).
3.  📂 `docs` — För strategi, budget och anteckningar.
4.  📂 `prompts` — För att spara systeminstruktioner och AI-logik separat.

## Steg 3: Flytta filerna
1.  Öppna din nuvarande projektmapp: `c:\Users\johnr\Documents\WebbApps\CareerCoach_AI_CVedition`.
2.  Markera **allt** (Ctrl + A) och välj **Kopiera**.
3.  Gå till din nya mapp på Drive: `G:\Min enhet\Utveckling\CareerCoach_AI\app-src`.
4.  Välj **Klistra in**.

## Steg 4: Peka om Antigravity
Nästa gång du ska jobba, gör du så här:
1.  Öppna PowerShell.
2.  Skriv: `cd "G:\Min enhet\Utveckling\CareerCoach_AI\app-src"` (använd citationstecken om det är mellanslag i namnet).
3.  Skriv: `antigravity`.

## Steg 5: GitHub Desktop (Viktigt för Deployment)
Eftersom Vercel hämtar kod från GitHub måste vi tala om för GitHub Desktop var filerna finns nu:
1.  Öppna GitHub Desktop.
2.  Gå till **File** -> **Add local repository**.
3.  Bläddra fram till `G:\Min enhet\Utveckling\CareerCoach_AI\app-src`.
4.  Klicka på **Add repository**.
5.  Om den frågar om du vill "Trust this folder", svara Ja.

---
*Planen skapad av din AI-coach 2026-02-25*
