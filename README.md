# Mech-Freunde v0.4

Kinderfreundliches Mech-Bauspiel / offline Trainingsarena als GitHub-Pages-PWA. Ohne Build-System oder externe Bibliotheken.

## Neuerungen

- Drei Trainingsgegner zur Auswahl: 💨 Flitzer (ausweichstark), 🛡️ Wächter (verteidigt oft), 🔥 Blitz (höherer Schaden).
- Drei große Kampfbuttons: ⚔️ Angriff, 🛡️ Schutz und ⚡ Spezial. Spezial lädt sich nach 3 eigenen Aktionen auf.
- Sichtbare Laserstrahlen, Trefferfunken, Schild- und Spezialeffekte, kurze Mech-Bewegungen, leuchtender Reaktor und Einbau-Effekt im Hangar.
- Pokale: erster Sieg, erster Sieg mit eingesetztem Spezialangriff, 5 Siege, 10 Siege.
- 🏆 Heldenklingen werden nach 5 gewonnenen Trainingskämpfen freigeschaltet, 🥇 Goldfarbe nach 10 Siegen.
- Lokale Trainingssterne: pro Sieg 6/7/8 (abhängig vom Bot), pro Niederlage 2. Bestehende Spielstände und Käufe werden übernommen.
- Animierte Effekte respektieren die Systemeinstellung „Bewegung reduzieren“.

## Hinweise

Alles funktioniert weiterhin offline im lokalen Browser. Es gibt **keine** öffentlich erreichbaren Kinderprofile, keinen Chat und kein PvP. Punkte und Pokale sind lokale Spieldaten, keine Online-Währung. Ein Online-Modus benötigt später sichere Serverfunktionen.

Beim Hochladen auf GitHub müssen die vorhandenen Dateien im Repository-Hauptverzeichnis überschrieben und `TrainingBots.js` neu hinzugefügt werden. Der Service Worker verwendet `mech-freunde-v04`.
