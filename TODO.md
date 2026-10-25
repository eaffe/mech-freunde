# Mech-Freunde – Zukunftsplan

Stand: nach v0.8. Ideen, **noch nicht umgesetzt**. Die Reihenfolge ist ein Vorschlag.

## Nächste Priorität: v0.9 – Zwei unterschiedliche Arme
- Linken und rechten Arm separat mit Waffen, Schilden oder Werkzeugen ausstatten.
- Beide Arme unabhängig im Mech-Renderer zeichnen; in der mobilen Vorschau gut erkennbar.
- Alte Spielstände automatisch übernehmen (bisherige Arm-Ausstattung zunächst für beide Seiten).
- Ausgewogene Online-Regeln: keine unfairen Vorteile durch gekaufte Teile.
- Baukasten auch für die Trainingsgegner anpassen.

## v1.0 – Konto und Gerätewechsel
- Freiwilliges dauerhaftes Spielerkonto, z. B. E-Mail-Magic-Link oder Passkey (Machbarkeit und Altersanforderungen prüfen).
- Bestehende anonyme Supabase-Identität sicher mit dem Konto verknüpfen; **keine Punkte/Erfolge verlieren**.
- Mechs, freigeschaltete Teile, Sterne, Online-Punkte und Profile zwischen Geräten synchronisieren.
- Konflikte bei paralleler Nutzung verständlich auflösen, Offline-Spiel weiterhin möglich.
- Datenschutz für Kinder: nur Fantasienamen/Icons öffentlich, keine Telefonnummern, kein öffentlicher Chat; bei Bedarf Elternfreigabe.

## v1.1 – Per WhatsApp zum Duell einladen
- Im Warteraum „Freund einladen“ mit sicherem, zeitlich begrenztem Einladungslink.
- Web Share API auf Mobilgeräten; alternativ „Link kopieren“; WhatsApp nur als externes Teilen-Ziel.
- Empfänger öffnet den Link, erstellt/verknüpft bei Bedarf ein Konto und tritt dem privaten Duell bei.
- Nach abgelaufenem oder bereits benutztem Link klare Meldung und neue Einladung.
- Keine Telefonnummern in der Spiel-Datenbank speichern.

## Weitere Ideen (Vorschläge)
1. **Mech-Vorlagen:** Mehrere eigene Mechs speichern und vor dem Duell auswählen.
2. **Kampfverlauf:** Die letzten Duelle, Siege, Rückkämpfe und Highlights ansehen.
3. **Trainingsmissionen:** Aufgaben wie „Drei Angriffe abwehren“ mit kosmetischen Belohnungen.
4. **Freundesliste mit Einwilligung:** Nur über Einladungscode, blockieren/entfernen möglich, keine Suche nach Klarnamen.
5. **Turniere im Freundeskreis:** Kleine private K.-o.-Runden, ohne öffentlichen Chat.
6. **Barrierefreiheit:** Größere Schaltflächen, weniger Animation, Farbblind-Modus, gut lesbare Kampfhinweise.

## Bereits umgesetzt
- v0.8: Drei Trainingsgegner separat bauen und ausstatten; Rückkampf ausdrücklich annehmen oder ablehnen.
- v0.7: Bestenliste erreichbar und Duell aufgeben.
- v0.6: Zubehör, zusätzliche Köpfe, Fantasienamen, Icons und Rückkampf.
