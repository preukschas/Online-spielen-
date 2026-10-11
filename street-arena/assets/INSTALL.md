# ARENA ZERO – Grafikdateien installieren

Der Spielcode in `street-arena/index.html` nutzt bereits die 11 finalen WebP-Grafiken über die festen Pfade in `assets/manifest.json`.

## Letzter Upload-Schritt

1. Lade `ARENA_ZERO_Grafikassets_GitHub.zip` aus dem Chat herunter und entpacke es.
2. Öffne [das GitHub-Repository](https://github.com/preukschas/Online-spielen-).
3. Navigiere zu `street-arena/assets`. Lade die 11 Bilder über GitHub »Add file« / »Upload files« **mit den Unterordnern** `fighters`, `vs` und `title` hoch. Falls die Weboberfläche Ordner nicht beibehält, verwende GitHub Desktop zum Kopieren des entpackten `street-arena/assets`-Ordners.
4. Commit. Die bereits implementierte Charakterauswahl, das Titelbild und die VS-Ansicht erkennen die Grafiken automatisch.

### Dateien

- `title/arena-zero-cover.webp`
- `fighters/sergej.webp`, `fighters/aki.webp`, `fighters/moe.webp`, `fighters/domi.webp`
- `vs/sergej-vs-aki.webp`, `vs/sergej-vs-moe.webp`, `vs/sergej-vs-domi.webp`, `vs/aki-vs-moe.webp`, `vs/domi-vs-aki.webp`, `vs/domi-vs-moe.webp`

Hinweis: Die GitHub-App-Schnittstelle dieses Chats überträgt Text/Commits, nimmt aber keine hochgeladenen Binärdateien unmittelbar aus dem lokalen Arbeitscontainer entgegen. Der Upload der WebP-Dateien bleibt daher als einmaliger Schritt nötig.
