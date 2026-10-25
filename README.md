# 🤖 Mech-Freunde v0.1

Eine vollständig lokale, mobile, kinderfreundliche Mech-PWA ohne Framework oder Buildprozess. Funktioniert in Android-Chrome und auf GitHub Pages.

## Was schon funktioniert

- Bunten Mech aus Kopf, Bauch, Armen, Füßen und Farben zusammenstellen
- Bauteile gegen **lokale Trainingssterne** freischalten
- Mech und Sterne automatisch lokal in **IndexedDB** speichern
- Einzelspieler-Training gegen einen freundlichen Roboter
- Angriff oder Schild als einfache Aktionen, bei Sieg +6 und sonst +2 Sterne
- Auf dem Handy per **Zum Startbildschirm hinzufügen** als PWA nutzen
- Nach erstem vollständigen Online-Laden offline spielbar

## Was noch NICHT enthalten ist

- Online-Multiplayer, Server oder Login
- Offizielle Online-Ranglisten/Credits (die Trainingssterne werden bewusst nicht als Online-Geld akzeptiert)
- Cloud-Sicherung oder automatischer Gerätewechsel

## Installation auf GitHub Pages

1. Neues öffentliches GitHub-Repository `mech-freunde` erstellen.
2. **Alle Dateien aus diesem Ordner direkt ins Repository-Hauptverzeichnis** hochladen. Keine ZIP im Repository ablegen, sondern die entpackten Dateien.
3. `Settings → Pages → Deploy from a branch → main → / (root) → Save`.
4. GitHub-Pages-Adresse in Chrome auf dem Android-Handy öffnen und, wenn veröffentlicht, `⋮ → Zum Startbildschirm hinzufügen → Installieren` wählen.

Diese Dateien sind absichtlich **alle im Hauptordner**, damit das Hochladen vom Handy aus einfach bleibt.

## Klassenstruktur

- `Mech` – ausgewählte Bauteile und berechnete Werte
- `Pilot` – lokale Sterne, Besitz und Trainingsfortschritt
- `TrainingBattle` – reine rundenbasierte Kampfregeln ohne Oberfläche
- `MechRenderer` – SVG-Roboterzeichnung
- `PilotStore` – IndexedDB-Speicher
- `MechFriendsApp` (`app.js`) – UI und Bedienung
- `Parts.js` – erweiterbarer Teilekatalog

Für Online-Multiplayer später: separate Server-Validierung, damit Punkte und freigeschaltete Teile nicht vom Handy gefälscht werden können. Kein offener Chat oder öffentliche Benutzerprofile für Kinder vorsehen.


## v0.2
- Mech-Optik kantiger und heroischer gestaltet
- neue Farbe Rot hinzugefügt
- leichte Kampfanimationen und Monitor-Effekte in der Trainingsarena
