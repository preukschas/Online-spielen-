# DMP – Online spielen

Öffentliches GitHub-Pages-Repository für veröffentlichte Browser-Spiele und Lernspiele.

Dieses Repository ist **nur die Veröffentlichungs-/Spiegelversion**. Die eigentliche Entwicklung bleibt in den privaten Entwicklungs-Repositories.

## Öffentliche Spielzentrale

GitHub Pages:

`https://preukschas.github.io/Online-spielen-/`

Die Startseite beginnt mit einer **Weltenauswahl**:

- **🧠 Lernwelt** – immer frei zugänglich
- **🎮 Spielewelt** – durch eine vierstellige Eltern-PIN geschützt

## PIN-Schutz der Spielewelt

Der PIN-Schutz ist für die praktische Nutzung mit Kindern gedacht:

- 3 falsche Versuche führen zu 60 Sekunden Sperrzeit.
- Nach erfolgreicher Freigabe bleibt die Spielewelt 60 Minuten geöffnet.
- Direkte URLs zu veröffentlichten reinen Spaß-Games prüfen die Freigabe ebenfalls.
- Nach Ablauf der Freigabe wird ein geöffnetes Spaß-Game wieder durch die PIN-Sperre überlagert.
- Es gilt auf allen Geräten dieselbe zentral veröffentlichte Eltern-PIN.
- Eine PIN-Änderung erfolgt bewusst nur über einen neuen geprüften Veröffentlichungsstand, damit nicht jedes Gerät eine eigene PIN bekommt.
- Lernspiele benötigen keine PIN.

**Wichtig:** GitHub Pages ist eine statische Website. Die Sperre ist deshalb eine praktische Kindersicherung, keine kryptografisch sichere Zugriffskontrolle gegen technisch versierte Nutzer mit Entwicklerwerkzeugen.

## Veröffentlichte Bereiche

| Bereich | Spiel | Öffentlicher Pfad | Entwicklungsquelle |
|---|---|---|---|
| Lernwelt | Moe's English World | `/moes-english-world/` | `preukschas/Lernspiele--bei-DMP` → `projects/moes-english-world/` |
| Lernwelt | Moe – Machine City | `/moe-machine-city/` | `preukschas/Lernspiele--bei-DMP` → `projects/moe-machine-city-rpg/` |
| Spielewelt | Planet unter Druck | `/planet-unter-druck/` | `preukschas/DMP-Games` → `projects/tower-defense/` |

## Geplant

- Spielewelt: Domi Run → später als eigener Unterordner und ebenfalls mit PIN-Prüfung

## Veröffentlichungsregel

1. Änderungen werden im jeweiligen privaten Entwicklungs-Repository entwickelt und getestet.
2. Dort bleibt der maßgebliche Quellstand.
3. Erst ein geprüfter Stand wird hier in den passenden öffentlichen Unterordner kopiert.
4. Reine Spaß-Games müssen beim Veröffentlichen zusätzlich den gemeinsamen `fun-access.js`-Schutz laden.
5. Dateien in diesem Repository werden nicht als eigenständige Spielvariante weiterentwickelt.

## Stand

- Planet unter Druck: öffentliche V18-Version in `planet-unter-druck/index.html`, mit zusätzlicher öffentlicher PIN-Schutzschicht
- Moe's English World: aktueller geprüfter Stand in `moes-english-world/index.html`
- Moe – Machine City: Lernwelt, frei zugänglich
- Root-`index.html`: Weltenauswahl mit freier Lernwelt und PIN-geschützter Spielewelt
