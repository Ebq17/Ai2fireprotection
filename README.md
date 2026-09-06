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
- Das Kontaktformular öffnet beim Absenden das E-Mail-Programm des Besuchers (kein Server-Backend nötig).

## Rechtliche Hinweise (bitte prüfen)

Impressum und Datenschutzerklärung sind als **Entwürfe** auf Basis der bekannten Angaben (Name, Adresse, Kontakt) erstellt. Vor Veröffentlichung bitte ergänzen/prüfen lassen:

- Umsatzsteuer-ID bzw. Hinweis auf Kleinunternehmerregelung (§ 19 UStG)
- Tatsächlich genutzter Hosting-Anbieter in Abschnitt „Hosting" der Datenschutzerklärung
- Bei Bedarf: rechtliche Prüfung durch einen Anwalt oder Datenschutzbeauftragten
