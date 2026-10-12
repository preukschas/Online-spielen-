# ARENA ZERO 2.0 – Testplan und Abnahme

## A. Automatisierte Funktionsprüfungen (simulierte Umgebung)

Am 12.10.2026 wurde die veröffentlichungsnahe GitHub-Version mit einem JavaScript-Ausführungstest geprüft. Dafür wurden DOM-Elemente, Canvas-2D-Befehle, Bildladeereignisse, Tastaturereignisse und `requestAnimationFrame` simuliert. **Ergebnis: 12 von 12 erfolgreich**.

| # | Prüffall | Ergebnis |
|---|---|---|
| 1 | Initialisierung der Kampflogik und Ausdauer | ✔ |
| 2 | Sprung + U aktiviert Lufttritt | ✔ |
| 3 | Sprungtritt führt zu echtem Treffer | ✔ |
| 4 | Figur landet wieder und startet Landepose | ✔ |
| 5 | Serien gleicher Angriffe kosten mehr Ausdauer | ✔ |
| 6 | Perfekter Block löst Konterfenster aus | ✔ |
| 7 | K. o. nach Treffer im Luftzustand wird gestartet | ✔ |
| 8 | K.-o.-Figur erreicht den Boden und die Endposition | ✔ |
| 9 | Nach dem Sturz ist die Pose unabhängig von verstrichener Zeit | ✔ |
| 10 | Alle vier Kampfprofile existieren | ✔ |
| 11 | Spiel- und Porträt-UI bleiben zugreifbar | ✔ |
| 12 | Simuliertes Canvas-Frame wird gerendert | ✔ |

**Erweiterte Abschlussprüfung:** Nach dem zusätzlichen Balancing- und Mobile-Update wurden 13 von 13 automatisierten Regressionstests erfolgreich ausgeführt. Ergänzend zu den oben aufgezählten Fällen wurden auch **Blockbruch durch verbrauchte Ausdauer**, **Ducken + Tritt als Tiefangriff** und der erneute stabile K.-o.-Zustand getestet.

**Wichtige Einschränkung:** Die Tests prüfen Regeln und Renderer-Aufrufe; sie garantieren nicht die visuelle Qualität im echten Safari, 60-FPS-Laufzeit, die Korrektheit der Bildausschnitte oder das vollständige Balancing gegen menschliche Spieler.

## B. Automatischer Browser-Smoke-Test

Die Seite `tests/smoke.html` lädt ARENA ZERO in einen gleichoriginären Frame, prüft die Diagnose-API und Bilder, startet einen Kampf, sendet eine Sprung- und Tritt-Kombination sowie eine Ausweich-Eingabe. Sie zeigt Ergebnisse unmittelbar an.

## C. Manuelle Abnahme auf iPad, iPhone und Desktop

1. **Grafiken:** Auf Startmenü und im Kampf Sergej, Aki, Moe und Domi auswählen. Für jeden prüfen: richtiges Gesicht, kein fremder Name, keine verzerrte Ausschnittkante.
2. **Luftkampf:** W + U / Touch-Sprung + Tritt in unmittelbarer Nähe zum Gegner. Der Tritt muss sichtbar ausschlagen, Schaden verursachen und sauber landen.
3. **Kombos:** J → J → U in Reichweite, mit kurzen Pausen drücken. Eingaben sollen weder verloren gehen noch unbegrenzte Schlagserien auslösen.
4. **Spam:** Nur J oder nur U mehrfach drücken. Gegen normale KI muss die Verteidigung mit der Zeit reagieren; der Ausdauerbalken soll sinken und wieder steigen.
5. **Touch-Kombination:** Auf iPad/Smartphone Ducken + JAB bzw. Ducken + KICK gedrückt halten: schwerer Schlag bzw. tiefer Tritt müssen ausgelöst werden.
6. **Block und Konter:** Space früh drücken (normaler Block), dann unmittelbar vor einem sichtbaren Angriff drücken (perfekter Block); anschließend einen eigenen Treffer landen. Beim dauerhaften Blocken muss die türkise Leiste sinken und kann zum Blockbruch führen.
7. **Ausweichen:** Q am Desktop; am Touchpad zweimal schnell dieselbe Richtung. Figur muss zurückweichen, nicht permanent unverwundbar sein.
8. **Kämpfer-Unterschiede:** Sergejs schwere Schläge, Akis längere Ketten, Moes Lufttritt und Domis Konter jeweils testen.
9. **K. o. / Verlust:** Beide Seiten mindestens einmal verlieren lassen. Sturz beginnt sichtbar, Figur liegt nach ca. 0,7 s ruhig am Boden, keine Idle-Bewegung, kein Zittern.
10. **Touch:** Auf Hoch-/Querformat prüfen, ob alle notwendigen Tasten erreichbar sind und keine Überlagerung erfolgt.
11. **Audio und Pausen:** Musik, Treffer, Spezialattacke, Stummtaste, Pause, Fortsetzen und Rückkehr zum Menü testen.
12. **Leistung:** Auf iPad zehn Kämpfe starten, auf unbeabsichtigte Verzögerungen, Ruckeln, Speicher-/Bildausfälle achten.
13. **Balance:** Einfach, Normal und Schwer mit jedem Kämpfer spielen; prüfen, ob Treffer nachvollziehbar und Schwierigkeitsunterschiede fair bleiben.

## D. Freigabekriterien

- Keine JavaScript-Konsolenfehler.
- Richtiges Gesicht pro Figur.
- Lufttritt trifft in geeigneter Reichweite.
- Keine durch Dauerspammen garantierten Siege.
- K.-o.-Endpose bleibt nach dem Sturz stabil.
- Kampfstart, Pausieren und „Noch mal“ funktionieren.
- Touch-Steuerung ist benutzbar.
- Auf GitHub Pages ist dieselbe Version sichtbar wie im Repository.

**Status:** Automatisierte Regellogik-Tests erfolgreich; die manuelle Endgeräteabnahme ist ausdrücklich noch offen.
