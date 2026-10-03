# Sergey Splash Arena – Testergebnisse 1.0

**Datum:** 03.10.2026  
**Stand:** Branch `project/sergey-splash-arena/polish-1-0`

## Statische Checks

- JavaScript-Syntax: **OK**
- fehlende DOM-IDs: **0**
- doppelte DOM-IDs: **0**
- `style.css` verknüpft: **OK**
- `game.js` verknüpft: **OK**
- CSS-Klammerbilanz: **0 / ausgeglichen**

## Simulierte Gameplay-Läufe

Es wurden mehrere deterministische Testläufe mit unterschiedlichen Zufallsfolgen ausgeführt.

### Bewegung + Dauerfeuer + Super
Sechs Testläufe wurden über die kompletten 60 Sekunden simuliert. Alle sechs erreichten das reguläre Rundenende, der Boss erschien in jedem Lauf. Die Punktestände lagen grob zwischen 17.500 und 20.500 Punkten.

### Stehenbleiben + Dauerfeuer
Mehrere Läufe wurden ohne Bewegung simuliert. Die Runden sind deutlich schlechter: Sergey verliert regelmäßig Schutzsterne und erzielt meist niedrigere Punktestände. Das Spiel bleibt absichtlich verzeihlich genug, dass ein Kind eine Runde teilweise auch ohne perfektes Ausweichen schaffen kann.

### Komplett ohne Eingabe
Ohne Bewegung und ohne Schießen endet die Runde erwartungsgemäß früh. Damit ist sichergestellt, dass Interaktion notwendig bleibt.

### Boss-Seifenblasen
Der isolierte Boss-Test erzeugte mehrere gleichzeitig sichtbare, begrenzte Seifenblasen-Projektile. Die Projektile laufen aus dem Spielfeld aus bzw. werden bei Kollision entfernt.

### Pause
Während Pause verändert sich die Spielzeit nicht. Nach Fortsetzen läuft die Runde weiter.

### Super-Splash
Bei 100 % Ladung aktiviert sich Super. Die Ladung fällt auf 0, gegnerische Seifenblasen werden entfernt und die eigenen Super-Treffer füllen die Leiste nicht sofort wieder auf.

## Behobene Fehler während des Tests

1. Score-Multiplikator war zu stark und erzeugte perfekte Testwerte über 40.000 Punkte.
2. Power-ups konnten sich unnötig stark ansammeln.
3. Ohne gegnerische Fernangriffe war reines Dauerfeuer ohne Bewegung zu effektiv.
4. Super-Splash konnte sich durch eigene Super-Treffer teilweise selbst wieder aufladen.
5. Bei einem Grafik-Politur-Patch entstand eine literale `\\n`-Sequenz im JavaScript. Der Syntax-Test hat den Fehler entdeckt; er wurde korrigiert und danach erneut getestet.
6. Pause aktualisierte den Super-Button-Zustand nicht sofort; UI-Aktualisierung wurde ergänzt.

## Rest-Risiken

Die Tests prüfen Spielzustand, Logik und Rendering-Aufrufe synthetisch. Ein echter physischer Safari-Test auf iPhone/iPad kann Unterschiede bei Touchgefühl, Displayhöhe, Audiofreigabe und Performance sichtbar machen und bleibt daher als letzter Praxisschritt sinnvoll.
