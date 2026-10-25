# Mech-Freunde v0.6 – mehr Mechs & Freunde

Handyfreundliche PWA ohne Frameworks. Bestehende offline Mechs, Trainingssterne und Pokale bleiben erhalten.

## Neu in v0.6

- **40 Bauteile in 5 Gruppen:** mehr Köpfe, Panzerungen, Waffen, Beine und die neue Kategorie **Zubehör**.
- **Rückkampf ohne Raumcode:** Nach einem abgeschlossenen Online-Duell können beide Spieler mit einem Knopf eine neue Runde gegen denselben Gegner bestätigen. Die zweite Bestätigung startet automatisch ein frisches Duell.
- **Spielerprofile:** 100 kindgerechte Fantasienamen aus zwei Wortlisten und 12 feste Icons. Keine Freitext-Namen und kein Chat.
- **Bestenliste:** Top 20 nach Online-Siegen, nur mit ausdrücklichem Häkchen. Ohne Zustimmung kein Eintrag; keine Nutzer-IDs im Ergebnis.
- **Kompatibel:** Trainingssterne, Teile, Trophäen und Online-Punkte bleiben bestehen. Die neuen Teile wirken im Training, im Online-Duell sind sie weiterhin rein optisch.

## Server-Update v0.6

Die Datenbankmigration `supabase-v06-upgrade.sql` erweitert die bestehenden `mf5_`-Tabellen ohne Löschen. Neue RPCs: `mf6_rematch`, `mf6_set_identity`, `mf6_leaderboard`; bestehende Match-Snapshots und Profile liefern die neuen Felder. Die Migration muss vor dem Ausrollen der neuen Oberfläche auf das Supabase-Projekt angewendet werden.

## Bereits in v0.5

- 🌍 Private **1-gegen-1-Duelle** über sechsstellige Raumcodes (kein Chat, keine Namenspflicht).
- ⚔️ Drei Züge: Angriff, Schutz, Spezial (nach drei eigenen Aktionen).
- 🏅 Sieger erhält **10 Online-Punkte** (im Spielserver gespeichert, getrennt von Trainingssternen).
- 🎨 Online-Mech-Shop: Neon (20), Schatten (30), Glut (40) – kosmetische Lackierungen.
- 🔄 Spiel kann nach Neuladen auf demselben Gerät wieder aufgenommen werden.
- 📡 1,6s-Polling, so wird keine Realtime-Konfiguration benötigt.

**Die Online-Funktion ist zunächst deaktiviert**, bis Supabase eingerichtet wird:

1. Ein Supabase-Projekt bereitstellen oder das bisherige verwenden.
2. **Auth → Providers → Anonymous Sign-ins** einschalten. Ohne diese Option schlägt der Verbindungsaufbau fehl.
3. Die Datei `supabase-v05-online.sql` im **Supabase SQL Editor** vollständig ausführen.
4. In `online-config.js` die Projekt-URL (`https://...supabase.co`) und den öffentlichen `sb_publishable_...` Key (oder Legacy `eyJ...` anon key) eintragen. **Niemals `service_role` oder geheime Schlüssel hochladen.**
5. `online-config.js` auf GitHub committen. Die GitHub-Pages-Adresse neu laden. Zwei Geräte öffnen und Code eintippen.

Die SQL-Datei erzeugt **nur Tabellen/Funktionen mit Präfix `mf5_`** und verändert keine Daten der alten Mech Arena. Tabellen sind für Direktzugriffe gesperrt (RLS), Kampfaktionen und Punkte werden ausschließlich in kontrollierten PostgreSQL-Funktionen verarbeitet.

### Spielverlauf

`🏠 Hangar → 🌍 Freunde-Duell → ➕ Arena erstellen → Code teilen → Freund tritt bei → abwechselnd spielen`.

Du kannst die App auch weiterhin **vollständig offline trainieren**. Online-Punkte und gekaufte Online-Lackierungen sind an die anonyme Supabase-Identität auf diesem Gerät gebunden. **Browserdaten löschen / anderes Handy = Zugriff auf diese Identität kann verloren gehen.** Sichere Kontoübertragung ist noch nicht vorhanden.

### Fairness und Schutz

- Private Codes, keine Suche nach Mitspielern, kein Chat, keine Kinderprofile oder Namenseingaben.
- Online-Züge, Treffer, Sieger, Punkte und Käufe werden **serverseitig** entschieden.
- Gleiche Kampf-Basiswerte für beide Spieler: Bauteile und Lackierungen sind im Online-Modus kosmetisch.
- Ein Raum ist 15 Minuten zum Beitreten offen, aktiver Kampf läuft maximal eine Stunde.
- Für den produktiven Kinderbetrieb: Einverständnis/Datenschutz, Moderation und Abuse-Schutz separat prüfen. Anonyme Nutzer können zusätzliche Konten erzeugen und Ergebnisse zwischen eigenen Konten farmen; v0.5 ist ein Freundes-MVP, kein wettbewerbssicheres Ranglistensystem.

### Installation

Alle Dateien im Repo-Hauptverzeichnis. PWA-Service-Worker nutzt `mech-freunde-v05-online`, JS/CSS werden network-first aktualisiert.
