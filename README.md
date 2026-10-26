# Ai2fireprotection – Website

Statische Website für Ai2fireprotection (vorbeugender Brandschutz, Mainz & Rhein-Main) — Startseite plus Impressum und Datenschutzerklärung.

## Struktur

- `index.html` — Startseite (alle Inhaltsbereiche als Anker: Leistungen, Branchen, Über mich, Kontakt)
- `impressum.html` — Impressum gemäß § 5 DDG
- `datenschutz.html` — Datenschutzerklärung gemäß DSGVO
- `styles.css` — gemeinsames Stylesheet aller Seiten
- `fonts/` — lokal gehostete Google-Fonts-Dateien (Oswald, IBM Plex Sans); dadurch werden **keine** Daten an Google-Server übertragen

## Lokal öffnen

Einfach `index.html` im Browser öffnen — keine Build-Schritte, keine Abhängigkeiten. Für den vollen Effekt (z. B. relative Links zwischen den Seiten) am besten über einen lokalen Server öffnen, z. B.:

```
python3 -m http.server 8080
```

und dann `http://localhost:8080/` aufrufen.

## Live hosten (GitHub Pages)

1. Repo-Einstellungen → **Pages**
2. Branch **main**, Ordner **/(root)** auswählen
3. Speichern — die Seite ist danach unter `https://<username>.github.io/<repo>/` erreichbar

## Inhalte anpassen

- Texte, Kontaktdaten und Leistungen stehen direkt im HTML der jeweiligen Seite.
- Der Farb-Akzent lässt sich zentral über die CSS-Variable `--accent` in `styles.css` (`.page`-Klasse) anpassen.
- Das Kontaktformular sendet über eine Netlify Function (`netlify/functions/contact.mjs`, erreichbar unter `/api/contact`) und Brevo – siehe unten.

## Rechtliche Hinweise (bitte prüfen)

Impressum und Datenschutzerklärung sind als **Entwürfe** auf Basis der bekannten Angaben (Name, Adresse, Kontakt) erstellt. Vor Veröffentlichung bitte ergänzen/prüfen lassen:

- Umsatzsteuer-ID bzw. Hinweis auf Kleinunternehmerregelung (§ 19 UStG)
- Tatsächlich genutzter Hosting-Anbieter in Abschnitt „Hosting" der Datenschutzerklärung
- Bei Bedarf: rechtliche Prüfung durch einen Anwalt oder Datenschutzbeauftragten

## Kontaktformular mit Brevo

Beim Absenden passiert Folgendes:

1. **Benachrichtigung** an ai2fireprotection@gmail.com mit allen Angaben – „Antworten" geht direkt an den Kunden.
2. **Eingangsbestätigung** an den Kunden (Deutsch oder Englisch, je nach Seite).
3. Optional: Kunde wird als Kontakt in einer Brevo-Liste gespeichert.

Spamschutz über ein unsichtbares Honeypot-Feld; ohne Einwilligung oder mit ungültiger E-Mail wird nichts verschickt.

### Einrichtung (einmalig)

1. **Brevo:** *Absender, Domains & dedizierte IPs → Absender* → `ai2fireprotection@gmail.com` als Absender hinzufügen und per Bestätigungsmail verifizieren.
2. **Brevo:** *SMTP & API → API-Schlüssel* → neuen Schlüssel erzeugen (nur einmal sichtbar, sicher aufbewahren, niemals ins Repo).
3. **Netlify:** *Project configuration → Environment variables* →
   - `BREVO_API_KEY` = der Schlüssel aus Schritt 2 (Pflicht)
   - `BREVO_LIST_ID` = Listen-ID aus Brevo (optional, nur wenn Kontakte gespeichert werden sollen)
   - `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `CONTACT_TO_EMAIL` (optional, Standardwerte passen)
4. Danach neu deployen.

**Hinweis Zustellbarkeit:** Ein Gmail-Absender über Brevo kann bei manchen Empfängern im Spam landen, weil Gmail-Adressen nicht für fremde Server freigegeben sind. Sobald eine eigene Domain mit Postfach existiert (z. B. `info@ai2fireprotection.com`), diese in Brevo verifizieren und als `BREVO_SENDER_EMAIL` eintragen.

### Lokal testen

`netlify dev` (Netlify CLI) startet Seite und Function zusammen; `BREVO_API_KEY` dafür in einer lokalen `.env` setzen (steht in `.gitignore`).
