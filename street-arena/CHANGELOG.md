# ARENA ZERO – Änderungsprotokoll

## 2.0 – 2026-10-12

### Spielmechanik
- Neues, einheitliches Datenmodell für Angriffe mit Start-, Aktiv- und Erholungsphase.
- **Luftschlag und Sprungtritt** samt eigener Animation und Trefferprüfung.
- Ausdauer mit Regeneration, erhöhten Kosten/Erholungszeiten beim wiederholten gleichen Angriff.
- Reaktionsfähigere KI mit Bewegungsentscheidung, Angriffsmischung, Block, optionalem Ausweichen und Anti-Spam-Erkennung (je nach Schwierigkeitsgrad).
- Eingabepuffer für aufeinanderfolgende Schläge; begrenzte bestätigte Kombos und abnehmende Kombowirkung.
- Doppeltes Tippen einer Richtung oder Q = Ausweichschritt (Abklingzeit und Kosten).
- Zeitlich eng begrenzter perfekter Block und darauf folgendes Konterfenster; Ausdauerverlust beim Blocken und Guard-Break bei leerer Leiste.
- Kämpfer-Stärken: Sergej (schwerer Schlag), Aki (Kombos), Moe (Luftangriffe), Domi (Konter).

### Animation & Inszenierung
- Zeitlich definierte Bewegungsabläufe für Flugphase, Sprungtritt, Trefferreaktion, Landung und Ausweichen.
- **K.-o.-Ablauf:** Rückstoß, kontrolliertes Kippen, Fallbewegung und feste Ruheposition. Kein laufender Idle-/Treffer-Zittereffekt nach dem K. o.
- Gesichtsanimation nutzt die vorhandenen Originalporträts und bewegt sie mit dem Kopf.
- Trefferstopp, Kamerawackeln und Partikel bleiben im Spiel; keine Blutdarstellung.

### Oberfläche
- Neue türkisfarbene Ausdaueranzeige.
- Die kanonische Datei `assets/fighters/aki.png` ist wiederhergestellt und im Spiel sowie Manifest einheitlich hinterlegt.
- Die Vier-Tasten-Touchsteuerung ermöglicht über **Ducken + Schlag/Tritt** auch schweren Schlag und tiefen Tritt.
- Hilfetext um Q/Doppeltippen ergänzt.
- Lesbare Diagnosedaten unter `window.ARENA_ZERO_DIAGNOSTICS()`.

### Qualitätssicherung
- JavaScript-Syntaxprüfung nach den Änderungen erfolgreich.
- 13/13 funktionale Tests in simuliertem DOM/Canvas im erweiterten Abschlusslauf bestanden (kein echter Endgeräte-Ersatz).
- Browser-Smoke-Test unter `tests/smoke.html`.
- Dokumentation der manuellen Abnahmeschritte unter `tests/TESTPLAN.md`.

### Bereits vorhanden, unverändert
- Vier Charaktere, Auswahl, Porträts, VS-Grafiken, Musik und Sounds, Pause, Vollbild, Touch-Steuerung und Best-of-3-Runden.

### Bekannte Grenzen
- Keine Sprite-Sheets/Motion-Capture: prozedurale 2D-Skelettkörper mit Porträtgesichtern.
- Die bildliche Wiedergabe auf iPad/iPhone und Pages-CDN muss noch im echten Browser abgenommen werden.
- Balancewerte sind ein Ausgangspunkt und können nach Spieltests nachjustiert werden.

### Rückweg
- Die GitHub-Commit-Historie bewahrt die alte Version. Startversion vor diesem Ausbau hatte den `index.html`-Blob `d76ffb130d82f0853337f2b8880e0b71448bd4e2`.
