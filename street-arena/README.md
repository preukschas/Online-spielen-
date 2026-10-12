# ARENA ZERO 2.0 – spielbares 2D-Kampfspiel

**Stand:** 12. Oktober 2026 · **Status:** Implementiert auf `main`; Veröffentlichung erfolgt über das für das Repository eingerichtete GitHub Pages. Der öffentliche CDN-Stand muss auf echten Geräten gegengeprüft werden.

🎮 **Spiel:** https://preukschas.github.io/Online-spielen-/street-arena/  
🧪 **Browser-Smoketest:** https://preukschas.github.io/Online-spielen-/street-arena/tests/smoke.html

## Ziel und Kontinuität

Weiterentwicklung der bestehenden ARENA-ZERO-Website **ohne Austausch von Startmenü, VS-Bildern, Audio und Charakterkarten**. Die vier Kämpfer **Sergej, Aki, Moe und Domi** behalten ihre bereits hinterlegten Originalgrafiken; die Gesichter sind im Canvas mit den Köpfen verbunden. Das Spiel ist bewusst **ohne Blut** gestaltet.

## Neu in Version 2.0

1. **Luftkampf:** Sprungschlag und Sprungtritt (W, danach J bzw. U), gerichteter Sprung, Landepose und Landestaub. Getrennte Reichweiten, Schadenswerte und Trefferhöhen.
2. **Anti-Spam:** Ausdauerleiste (Türkis) je Figur; Angriffe verbrauchen Ausdauer, identische Serien werden teurer und erhalten mehr Erholungszeit. Ausdauer regeneriert sich. Die KI erkennt wiederholte Angriffsmuster und blockt/kontert/entfernt sich häufiger.
3. **Kombos:** Zeitfenster für Eingabepuffer; bei bestätigtem Treffer bis zu drei verbundene Angriffe (Aki vier), anschließende Rücksetzung; abgestufter Komboschaden. Auch bei Fehlschlägen kann ein rechtzeitig vorgemerkter Folgeangriff starten, allerdings ohne Kombobonus.
4. **Verteidigung:** Steh- und Tiefblock, kurzer perfekter Block beim frischen Tastendruck, anschließendes Konterfenster; Ausweichen mit Q oder doppeltem Tippen einer Richtung. Ausweichen kostet Ausdauer und hat eine Abklingzeit.
5. **Kampfstile:** Sergej erhält einen besonders wirkungsvollen schweren Schlag; Aki stärkere bzw. längere Kombos; Moe kraftvollere, günstigere Luftaktionen; Domi einen verstärkten Angriff im Konterfenster. Vier individuelle Spezialattacken bleiben bestehen.
6. **Animation:** Bewegungsphasen für Oberkörper, Arme, Beine, Sprung/Flug und Landung; sichtbares Zurückweichen bei Treffern, Kampfspuren bei Spezialattacken. Die Gesichtsporträts rotieren mit dem Körper.
7. **K. o.:** definierter Sturz über etwa 0,72 s, unterschiedliche Fallwinkel, anschließende feststehende Endpose **ohne zeitabhängiges Zittern**; Gegner in der Luft fallen zunächst auf den Boden.
8. **Effekte:** kurze Trefferpause, Rückstoß, Staubpartikel, leichtes Kamerawackeln, eigene Schlag-/Block-/K.-o.-Sounds.
9. **Qualität:** Diagnosewerte im Browser und separater Smoketest, dokumentierte Testfälle in `tests/TESTPLAN.md`.

## Steuerung

| Taste | Aktion |
|---|---|
| A / D | Gehen, in der Luft Richtung steuern |
| W | Springen |
| S | Ducken, zusammen mit Leertaste tiefer Block |
| J | Schlag, in der Luft Luftschlag |
| K | Schwerer Schlag |
| U | Tritt, in der Luft Sprungtritt |
| I | Tiefer Tritt |
| Leertaste | Blocken; im richtigen Moment perfekter Block |
| Q | Ausweichen |
| L | Spezialangriff bei voller blauer Superanzeige |
| Esc | Pause |

**Tablet/Mobil:** virtuelles Richtungspad und vier Aktionstasten. **Ducken + Schlag** = schwerer Schlag, **Ducken + Tritt** = tiefer Tritt. Zwei schnelle Tippimpulse in dieselbe Richtung lösen das Ausweichen aus. Die verfügbaren virtuellen Aktionstasten hängen von der Darstellung/Bildschirmgröße ab.

**Anzeigen:** Gelb/Rot = Trefferpunkte, Blau = Spezialenergie, Türkis = Ausdauer.

## Technik

Statische HTML/CSS/JavaScript-Anwendung, Canvas-2D, ohne Build-Schritt, externe Frameworks oder Browser-Plugins. Die Regeln sind im `index.html` in `moves`, `attack`, `strike`, `aiUpdate`, `updateF` und `body` zu finden.

Aki wird derzeit unter `assets/fighters/B4C2F74E-3CAC-4E0D-ADA3-BC9079A52B9A.png` geladen, da dieser Dateiname im Repository tatsächlich vorhanden ist. Nicht ohne Anpassung der Verknüpfung umbenennen.

Für die Diagnose im Browser:
```js
window.ARENA_ZERO_DIAGNOSTICS()
window.ARENA_ZERO_PORTRAITS.status
```

## Test und Grenzen

Die Spielregeln wurden mit **gemocktem DOM und Canvas** getestet (12/12 Testfälle erfolgreich, vgl. `tests/TESTPLAN.md`). Zusätzlich gibt es einen browserbasierten Integrations-Smoke-Test. **Ein vollständiger Spieltest auf einem realen iPad, eine visuelle Beurteilung jeder Pose und die öffentliche CDN-Auslieferung sind damit nicht automatisch bestätigt.** Die Figuren bleiben stilisierte 2D-Animationen mit echten Porträttexturen, keine fotorealistischen Motion-Capture-Modelle.

## Versionshistorie und Rückweg

Siehe `CHANGELOG.md`. Ursprünglicher geprüfter Ausgangsstand vor Version 2.0: Git-Blob `d76ffb130d82f0853337f2b8880e0b71448bd4e2` (GitHub-Historie und Commits enthalten alle Zwischenstände). Bei Problemen ist über die GitHub-Commit-Historie ein Revert möglich.
