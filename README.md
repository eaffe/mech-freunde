# Mech-Freunde v1.2.1 – Gegner-Baukasten repariert

Kindgerechte, mobil nutzbare PWA ohne Frameworks. Privatduelle über Supabase, Training auch offline. Bestehende Spielstände, Sterne, Pokale, Profile und Online-Punkte bleiben erhalten.

## Neuer Start in v1.2
- Beim ersten Start wird ein Fantasiename und eine Eltern-E-Mail-Adresse abgefragt. Bestehende Profile mit selbst gewähltem Namen werden nicht erneut gefragt.
- Benutzername und Icon werden direkt im Online-Profil hinterlegt – ein separater Profil-Schritt entfällt.
- Die öffentliche Bestenliste ist nur mit ausdrücklich gesetztem Häkchen sichtbar. Die E-Mail-Adresse ist dort nie zu sehen.
- Die Eltern-E-Mail wird nur an Supabase Auth zum Bestätigen übergeben, nicht in die öffentlich lesbaren Spielprofile geschrieben. Nach Bestätigung kann im Online-Kontomenü ein Passwort gesetzt werden.
- Anmeldung mit bestehendem Konto oder „erst einmal offline spielen“ bleibt möglich. Bisherige Mechs und Online-Punkte bleiben erhalten.

## Trainingsbalance in v1.1

- Flitzer, Wächter und Blitz passen sich an **Leben, Angriff, Rüstung und Ausweichen** des eigenen Mechs an. Die selbst gebaute Gegnerausrüstung zählt weiterhin.
- Pro Trainingskampf wird genau eine kleine Schwankung ausgewürfelt: ungefähr 20 % etwas entspannter, 30 % anspruchsvoller und 50 % normal. Es gibt keine erzwungenen Siege oder Niederlagen.
- Nach einer Niederlage wird die nächste Trainingsrunde sanfter, nach zwei aufeinanderfolgenden Niederlagen noch etwas sanfter.
- Gegnerstärke und Tagesform werden angezeigt. Die Anpassung betrifft ausschließlich Offline-Training; Online-Kämpfe bleiben unverändert.

## Neue Funktionen

- **Links und rechts unabhängig:** Waffen und Werkzeuge für jeden Mech-Arm einzeln auswählen. Gekaufte Armteile können auf beiden Seiten verwendet werden, ohne sie zweimal bezahlen zu müssen. Frühere Arm-Ausstattung wird auf beide Seiten übernommen.
- **Garage:** Bis zu fünf Mechs, frei benennbar. „Kopie als neuen Mech“ erstellt einen weiteren Entwurf. Vor Training oder Online-Duell wählt man den aktiven Mech.
- **Training:** Drei separat ausrüstbare Trainingsgegner, tägliche Sternemissionen, eigener Trainingsverlauf und vier optische Arenen (Weltraum, Vulkan, Eis, Stadt).
- **Frei wählbare Benutzernamen:** 3 bis 22 Buchstaben, Zahlen, Leerzeichen, `_` oder `-`; begrenzter Filter für verletzende Namen. Die öffentliche Bestenliste bleibt **ausdrücklich freiwillig** und zeigt nur Namen und Icons.
- **Konto auf mehreren Geräten:** Den bisherigen anonymen Spieler mittels Eltern-E-Mail bestätigen, danach Passwort festlegen. Anmeldung auf weiteren Geräten per E-Mail und Passwort. Online-Punkte bleiben an der **gleichen** Supabase-Spieler-ID, lokale Garage und Sterne werden anschließend als Cloud-Spielstand gesichert. Bei parallelen Änderungen gilt derzeit der zuletzt gespeicherte Stand.
- **WhatsApp-Einladung:** Im Online-Warteraum „Per WhatsApp einladen“ teilt einen Link mit Raumcode. Der Empfänger kann die PWA direkt öffnen und wird als Gast zuerst zum Verknüpfen oder Anmelden eines Kontos geführt. Keine Telefonnummer wird im Spiel gespeichert.
- **Freundesliste:** Achtstelligen privaten Freundescode weitergeben; Anfragen annehmen oder entfernen. Bestehende Freunde können im offenen eigenen Raum mit einem Tipp eingeladen werden; der Empfänger kann die Einladung direkt annehmen.
- **Viererturnier:** Privates Turnier mit sechsstelligen Codes; bei vier Teilnehmern starten zwei Halbfinals, danach automatisch das Finale. Alle Teilnehmer sehen den Turnierbaum; Online-Kämpfe sind identisch mit den bestehenden Serverregeln.
- **Online-Statistik:** Letzte 25 abgeschlossene Duelle, Siege und Niederlagen anzeigen.
- **Weiterhin:** Rückkampf ja/nein, Aufgeben, Farben-Shop, Rangliste, drei Kampfaktionen und Offline-Bottraining.

## Supabase – bestehendes Projekt

Projekt **Mech Game for Kids** (Supabase-Projekt `iyedecofygidcrjlpcib`). Die Migration `supabase-v10-upgrade.sql` wurde beim Update auf die bestehende Datenbank angewendet. `mf5_`-Bestand bleibt erhalten. Serverseitige Zugriffsprüfungen, RLS ohne direkte Tabellenrechte und `SECURITY DEFINER`-RPCs verhindern das Auslesen fremder Spielerprofile und das eigenmächtige Vergeben von Online-Punkten.

**Wichtig vor der Konto-Nutzung:** Im Supabase Dashboard unter **Authentication → Providers** die Optionen für E-Mail-Authentifizierung und **Manual Identity Linking** prüfen/aktivieren. Anonyme Spieler werden über die bestätigte E-Mail in ein dauerhaftes Konto umgewandelt; das ist für den Erhalt ihrer Punkte wesentlich. E-Mails müssen für die Projekt-Domain zugestellt werden können (im produktiven Betrieb SMTP konfigurieren). Unter **Authentication → URL Configuration** die erlaubte Rücksprung-URL `https://eaffe.github.io/mech-freunde/index.html` und die Seitenadresse `https://eaffe.github.io/mech-freunde/` eintragen. Diese Dashboard-Einstellungen können vom PWA-Code nicht geändert werden.

**Kinderschutz:** Bitte eine E-Mail der Eltern oder Erziehungsberechtigten verwenden. Keine öffentlichen Chats, Telefon- oder E-Mail-Adressen in der Bestenliste. Die einfache Sperrliste für freie Benutzernamen ersetzt keine menschliche Moderation; für eine größere Kinder-Community sollten Meldefunktion, Moderation, Elterninformation und geeignete rechtliche Prüfung ergänzt werden. WhatsApp wird nur auf Wunsch extern geöffnet; die PWA speichert keine WhatsApp-Kontakte.

## Testablauf

1. App neu laden; links und rechts unterschiedliche Arme wählen, Mech zur Garage hinzufügen und Training starten.
2. Konto öffnen, bestehende Gast-ID via Eltern-E-Mail bestätigen, Passwort festlegen, auf zweitem Gerät anmelden; Mechs und Sterne vergleichen.
3. Online-Raum erstellen, WhatsApp-Einladung testen. Die andere Person richtet ggf. ein Konto ein und tritt bei.
4. In Freunde einen Code hinzufügen und Anfrage annehmen. Warteraum eröffnen → Freunde → „💌 Duell“; Empfänger nimmt in der Freundesliste an.
5. Mit vier Geräten privates Turnier erstellen/beitreten; Halbfinals und Finale durchspielen. Beide Geräte nach jeder Runde aktualisieren.

**Einschränkungen:** Eine produktive Konto-Registrierung und ein komplettes Viererturnier lassen sich nicht ausschließlich mit Datenbanktests verifizieren. Es braucht funktionierende Auth-E-Mail-Zustellung und echte Geräte. Online-Punkte sind serverseitig; offline Sterne bleiben während Internetausfällen lokal. Für mehrere zeitgleich bearbeitete Geräte fehlt eine automatische Konfliktzusammenführung.

## Deployment

GitHub Pages auf `main`, alle App-Dateien im Repository-Hauptverzeichnis. Service Worker `mech-freunde-v10-account-cloud-offline-sync-v2` aktualisiert den Cache. `online-config.js` ist die **öffentliche Publishable-Key-Konfiguration**, niemals `service_role` oder geheime Keys an die PWA geben.
