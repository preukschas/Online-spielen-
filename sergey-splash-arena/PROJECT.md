# Projektstatus

## Stammdaten

**Name:** Sergey Splash Arena  
**Slug:** `sergey-splash-arena`  
**Status:** Stabiler Testkandidat  
**Version:** 1.0.0  
**Startdatei:** `index.html`

## Ziel

Ein kinderfreundliches Actionspiel mit Sergey als Hauptfigur. Schnelle Arcade-Action ohne realistische Waffen, Blut oder Verletzungsdarstellung: Sergey nutzt einen Wasser-/Schaumblaster gegen Comic-Schleime und Roboter.

## Kernmechanik

- 60-Sekunden-Runden mit 3-Sekunden-Countdown
- freie Top-down-Bewegung
- Wasserblaster mit automatischer Zielhilfe
- drei Spielphasen: Warm-up, Robot-Rush, Finale
- vier Gegnertypen mit unterschiedlichen Geschwindigkeiten und Widerstand
- Mega-Bot als Boss nach 30 Sekunden mit Vorwarnung und Boss-Leiste
- langsame, klar sichtbare Seifenblasen-Angriffe von Robotern/Boss, damit Ausweichen relevant ist
- Power-ups: Stern, Turbo, Schild, Mega-Splash
- aufladbarer SUPER SPLASH als Rundum-Spezialaktion
- Kombo-System, Sterne-Wertung und lokaler Highscore
- einmaliges Notfall-Schild bei nur noch zwei Schutzsternen

## Steuerung

- Desktop: WASD/Pfeiltasten bewegen, Leertaste Splash, E/Enter Super, P Pause
- Touch/iPad: D-Pad, großer SPLASH-Button, separater SUPER-Button
- SPLASH kann gehalten werden
- Auto-Aim reduziert Frust auf Touch-Geräten

## Grafik / Feedback

- überarbeitete Wasserarena mit Tiefenverlauf, Raster, Pfützen und Vignette
- Zielring und Auto-Aim-Linie
- klar unterscheidbare Schleime, Bots, schnelle Hüpfer, Tanks und Boss
- Partikel, Wasserprojektil-Glow, Screen-Shake, Trefferblitz und Punkte-Popups
- Boss-Vorwarnung und Boss-Lebensleiste
- Low-Health-Randwarnung
- sichtbarer Super-Splash-Ladering und Rundum-Welle
- Sergey mit Wasser-Rucksack, Blaster und eigenständiger Cartoon-Silhouette
- Soundeffekte per Web Audio mit Ton-an/aus-Schalter

## Balancing / Schutzmaßnahmen

- Gegnerzahl je Phase begrenzt (15 / 19 / 23)
- gegnerische Seifenblasen auf 28 begrenzt
- Partikel auf ca. 220 begrenzt
- normale Power-ups auf 7 gleichzeitig begrenzt
- Power-up-Pity: spätestens nach mehreren Treffern fällt wieder ein Bonus
- nach einem Treffer längere Schutzzeit plus Zurückdrängen naher Gegner
- Super-Splash lädt sich nicht durch seine eigenen Treffer direkt wieder auf
- Score-Multiplikator auf maximal ×3 begrenzt

## Teststatus

Ausführliche synthetische Browserlogik- und Gameplay-Simulation durchgeführt. JavaScript ist syntaktisch valide, alle verwendeten DOM-IDs existieren, es gibt keine doppelten IDs und CSS/JS sind korrekt verknüpft. Mehrere deterministische 60-Sekunden-Läufe mit Bewegung, Dauerfeuer, Boss und Super wurden erfolgreich abgeschlossen.

Details: `tests/TEST_RESULTS.md`.

## Figur / Grafik

Noch liegt kein bestätigtes Foto oder freigestelltes Sergey-Porträt vor. Sergey ist deshalb weiterhin als eigenständige Cartoon-Figur mit klarer S-Kennung umgesetzt. Ein späteres bestätigtes Sergey-Asset kann ohne Änderung der Spielmechanik eingebaut werden.

## Bekannte Grenzen

- Kein echtes Sergey-Foto/Cartoon-Asset eingebunden.
- Kein physischer iPhone-/iPad-Gerätetest in dieser Entwicklungsrunde; die Touch-Logik wurde simuliert und statisch geprüft.
- Sound besteht aus kurzen Web-Audio-Effekten, nicht aus Hintergrundmusik.

## Wichtige Entscheidungen

- Wasser/Schaum statt realistischer Waffen.
- Keine Blut-, Verletzungs- oder Tötungsdarstellung.
- Bewegung soll einen deutlichen Vorteil bringen, das Spiel für jüngere Spieler aber nicht unnötig bestrafen.
- Zielhilfe bleibt bewusst stark.
- Öffentliche Veröffentlichung ist nicht Teil dieses Entwicklungscommits; bei Veröffentlichung gilt die aktuelle Spielewelt-/PIN-Regel.

## Nächste Aufgaben

1. Echte Runde auf iPad/iPhone spielen und Touch-Größe/Schwierigkeitsgefühl prüfen.
2. Bei vorhandenem Sergey-Foto eine bestätigte Cartoon-Hauptfigur als Asset einbauen.
3. Nach Freigabe in die öffentliche Spiele-Zentrale spiegeln.

## Letzte Übergabe

03.10.2026: Version 1.0 grundlegend überarbeitet. Gameplay-Tiefe, Gegnerrollen, Bosskampf, Super-Splash, Seifenblasen-Angriffe, Balancing, Pause, Sound, visuelles Feedback und mobile Bedienung wurden verbessert und anschließend mit mehreren simulierten Runden getestet.
