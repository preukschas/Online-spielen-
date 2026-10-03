# DMP – Online spielen

Öffentliches GitHub-Pages-Repository für veröffentlichte Browser-Spiele und Lernspiele.

Dieses Repository ist **nur die Veröffentlichungs-/Spiegelversion**. Die eigentliche Entwicklung bleibt in den privaten Entwicklungs-Repositories.

## Öffentliche Spielzentrale

GitHub Pages:

`https://preukschas.github.io/Online-spielen-/`

Die Startseite beginnt mit einer **Weltenauswahl**:

- **🧠 Lernwelt** – immer frei zugänglich
- **🎮 Spielewelt** – durch eine vierstellige Eltern-PIN geschützt
- **🎉 Specials** – besondere Spiele, frei zugänglich ohne Eltern-PIN

## PIN-Schutz der Spielewelt

Der PIN-Schutz ist für die praktische Nutzung mit Kindern gedacht:

- 3 falsche Versuche führen zu 60 Sekunden Sperrzeit.
- Nach erfolgreicher Freigabe bleibt die Spielewelt 60 Minuten geöffnet.
- Direkte URLs zu veröffentlichten Spielen der Spielewelt prüfen die Freigabe ebenfalls.
- Nach Ablauf der Freigabe wird ein geöffnetes Spaß-Game wieder durch die PIN-Sperre überlagert.
- Es gilt auf allen Geräten dieselbe zentral veröffentlichte Eltern-PIN.
- Eine PIN-Änderung erfolgt bewusst nur über einen neuen geprüften Veröffentlichungsstand, damit nicht jedes Gerät eine eigene PIN bekommt.
- Lernspiele benötigen keine PIN.

**Wichtig:** GitHub Pages ist eine statische Website. Die Sperre ist deshalb eine praktische Kindersicherung, keine kryptografisch sichere Zugriffskontrolle gegen technisch versierte Nutzer mit Entwicklerwerkzeugen.

## Veröffentlichte Bereiche

| Bereich | Spiel | Öffentlicher Pfad | Entwicklungsquelle |
|---|---|---|---|
| Lernwelt | Moe's English World | `/moes-english-world/` | `preukschas/Lernspiele--bei-DMP` → `projects/moes-english-world/` |
| Lernwelt | Europa-Express | `/europa-express/` | `preukschas/Lernspiele--bei-DMP` → `projects/europa-express/` |
| Lernwelt | Kokos-Vokabelspiel | `/kokos-vokabelspiel/` | Entwickelte Grafikversion V3 |
| Lernwelt | Moe – Machine City | `/moe-machine-city/` | `preukschas/Lernspiele--bei-DMP` → `projects/moe-machine-city/` (Quellzeiger auf V0.7-Blob) |
| Lernwelt | Vokabel Quest | `/vokabel-quest/` | `preukschas/Lernspiele--bei-DMP` → `vokabel-quest/index.html` (V10) |
| Lernwelt | Einmaleins Space | `/einmaleins-space/` | `preukschas/Lernspiele--bei-DMP` → `projects/einmaleins-space/` (V1.0) |
| Lernwelt | Mario – Malermeister auf Tour | `/mario-maler/` | `preukschas/Lernspiele--bei-DMP` → `projects/mario-maler/` (V0.1) |
| Lernwelt | Chaos-Labor | `/chaos-labor/` | `preukschas/Lernspiele--bei-DMP` → `projects/chaos-labor/` (V1.0) |
| Lernwelt | Code-Knacker | `/code-knacker/` | `preukschas/Lernspiele--bei-DMP` → `projects/code-knacker/` (V1.0) |
| Lernwelt | Wildnis-Boss | `/wildnis-boss/` | `preukschas/Lernspiele--bei-DMP` → `projects/wildnis-boss/` (V1.0) |
| Lernwelt | Fake-Alarm! | `/fake-alarm/` | `preukschas/Lernspiele--bei-DMP` → `projects/fake-alarm/` (V1.0) |
| Lernwelt | Stunt-Werkstatt | `/stunt-werkstatt/` | `preukschas/Lernspiele--bei-DMP` → `projects/stunt-werkstatt/` (V1.0) |
| Lernwelt | Einmaleins Ringkampf | `/einmaleins-ringkampf/` | `preukschas/Lernspiele--bei-DMP` → `projects/einmaleins-ringkampf/` (V1.0) |
| Lernwelt | Die sieben Siegel des Nils | `/sieben-siegel-des-nils/` | `preukschas/Lernspiele--bei-DMP` → `projects/sieben-siegel-des-nils/` (V1.0) |
| Spielewelt | Sergey Splash Arena | `/sergey-splash-arena/` | `preukschas/DMP-Games` → `projects/sergey-splash-arena/` (Story Mode 1.1) |\n| Spielewelt | Planet unter Druck | `/planet-unter-druck/` | `preukschas/DMP-Games` → `projects/tower-defense/` (V18) |
| Spielewelt | Domi Run | `/domi-run/` | Entwickelte Standalone-Datei V0.2 |
| Spielewelt | Micha auf'm Wasen | `/micha-wasen-run/` | `preukschas/DMP-Games` → `projects/micha-wasen-run/` (V0.1) |
| Spielewelt | Ronja Race | `/ronja-race/` | `preukschas/DMP-Games` → `projects/ronja-race/` (V0.5.1 Touch-/Swipe-Hotfix) |
| Spielewelt | Bett Battle | `/bett-battle/` | `preukschas/DMP-Games` → `projects/bett-battle/` (Final 1.0) |
| Specials | Franz – Meister der Fuge | `/franz-fliesenleger/` | `preukschas/DMP-Games` → `projects/franz-fliesenleger/` (V1.0) |
| Specials | Elli – Ein schöner Tag | `/elli-ein-schoener-tag/` | `preukschas/DMP-Games` → `projects/elli-ein-schoener-tag/` (Final 1.2) |
| Specials | Leons Geschenk-Jagd | `/leon-geburtstag/` | `preukschas/DMP-Games` → `projects/leon-geburtstag/` |

Einmaleins Space ist ein eigenständiges Lernspiel. Die Weltraum-Abwehr innerhalb von Vokabel Quest bleibt Teil des Vokabeltrainers.

## Veröffentlichungsregel

1. Änderungen werden im jeweiligen privaten Entwicklungs-Repository entwickelt und getestet.
2. Dort bleibt der maßgebliche Quellstand.
3. Erst ein geprüfter Stand wird hier in den passenden öffentlichen Unterordner kopiert.
4. Spiele der Spielewelt laden beim Veröffentlichen den gemeinsamen `fun-access.js`-Schutz. Specials bleiben nach aktueller Entscheidung frei zugänglich.
5. Dateien in diesem Repository werden nicht als eigenständige Spielvariante weiterentwickelt.\n6. Alle veröffentlichten Spiele laden den gemeinsamen `game-interaction-guard.css` bzw. erhalten bei Machine City denselben Schutz über den responsiven Wrapper. Damit wird versehentliches Textmarkieren/Long-Press auf Touch-Geräten verhindert, während Eingabefelder auswählbar bleiben.

## Stand

- Alle dreiundzwanzig vorhandenen Browser-Spiele sind auf der Startseite verlinkt.
- Lernwelt: vierzehn Spiele ohne Eltern-PIN.
- Spielewelt: sechs Spiele mit gemeinsamer PIN-Prüfung auch beim direkten URL-Aufruf.
- Specials: Leons Geschenk-Jagd, Franz – Meister der Fuge und Elli – Ein schöner Tag frei zugänglich ohne PIN und ohne Zeitsperre.
- Die Spielinhalte stammen aus den jeweiligen Entwicklungsfassungen; Spaß-Games tragen zusätzlich die zentrale PIN-Einbindung.
