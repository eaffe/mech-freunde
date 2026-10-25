# Mech-Freunde v0.3

Einfaches Mech-Bauspiel und Offline-Trainingsarena für Android/Chrome und andere Browser. Kein Build-Schritt.

## Neu

- Deutlich vergrößerte Mech-Vorschau im Hangar.
- Samurai-Helm (14 Sterne), Klingen-Arme (13 Sterne), Schulterpanzer (14 Sterne).
- Drei kostenlose Spielstile mit großer, bebilderter Auswahl: 🪽 Leicht, 💪 Stark, ⚡ Schnell.
  - **Leicht**: Standardwerte, +7 % Ausweichchance beim Training.
  - **Stark**: +20 Hülle, +3 Angriff, +1 Schutz.
  - **Schnell**: −10 Hülle, +1 Angriff, +19 % Ausweichchance beim Training.
- Rot bleibt weiterhin als auswählbare Mech-Farbe erhalten.
- Bisherige lokale Sterne, Käufe und Baupläne bleiben erhalten, weil der bestehende IndexedDB-Speicher unverändert ist.
- Kampf-Effekte aus v0.2 bleiben erhalten.

## Installation / Aktualisierung

1. ZIP entpacken.
2. Sämtliche Dateien aus dem Ordner `mech-freunde-v03` ins Hauptverzeichnis des bestehenden GitHub-Repositories hochladen und ersetzen.
3. Unter GitHub → Actions/Pages die Veröffentlichung abwarten.
4. GitHub-Pages-Seite in Chrome neu laden und installierte PWA neu öffnen.

**Wichtig:** Nicht nur das ZIP hochladen, sondern die enthaltenen Dateien. Beim Upload müssen `index.html`, `app.js`, `Renderer.js`, `Parts.js`, `Mech.js`, `TrainingBattle.js`, `style.css` und `service-worker.js` gemeinsam aktualisiert werden.

## Fortschritt

Spielstände sind nur auf dem jeweiligen Gerät gespeichert. Online-Duelle und Online-Credits sind noch nicht enthalten.
