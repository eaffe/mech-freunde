# Browser-Push bei Mech-Freunde (v1.3)

## Funktionsweise
- Auf der **Online-Seite** kann jeder Spieler Push explizit aktivieren oder ausschalten.
- Der Browser speichert sein Push-Abonnement mit Hilfe der öffentlichen VAPID-ID unter `mf13_push_subscriptions`.
- In Supabase löst **pg_net** bei neuen Freundeseinladungen und Antworten (Raum betreten, ablehnen, Rückkampf) eine interne Edge-Funktion aus.
- Die Edge-Funktion heißt `mf-duel-push`; Quellcode liegt unter `supabase/functions/mf-duel-push/index.ts`.
- Der private VAPID-Schlüssel und der interne Webhook-Token liegen ausschließlich in **Supabase Vault** (`mf13_vapid_private`, `mf13_push_webhook_token`), **nicht im GitHub-Repository**.
- Datenbankmigrationen liegen in der Supabase-Migrationshistorie (v1.3). Die DB-Funktionen beginnen mit `mf13_`.
- Ein Browser mit bereits gewährter Berechtigung wird beim Öffnen des Online-Bereichs automatisch dem angemeldeten Konto zugeordnet.
- Keine Benutzernamen, Chat-Inhalte oder Raumcodes werden in der Push-Nachricht übertragen.

## Browser-Unterstützung
- Chrome, Edge und Firefox benötigen HTTPS und die Erlaubnis für Benachrichtigungen.
- Auf iPhone/iPad muss die Web-App (iOS/iPadOS 16.4+) zum Home-Bildschirm hinzugefügt und von dort geöffnet werden.
- Es gibt keine Garantie für die Zustellung bei Offline-Geräten, deaktivierten Benachrichtigungen oder aktivem Energiesparen.
- Ein Push löst eine generische Nachricht aus: Für Details wird beim Antippen die App geöffnet.

## Überprüfung
1. Zwei Geräte/Browsersitzungen mit unterschiedlichen Spielerkonten öffnen.
2. Auf Gerät A unter Freunde-Duell „🔔 Aktivieren“ wählen.
3. Gerät A schließen; von B den sechsstelligen Raumcode benutzen und dem Duell beitreten.
4. Gerät A sollte eine generische Mech-Freunde-Benachrichtigung anzeigen und durch Antippen das Spiel öffnen.
5. Ebenso testen: Freundeinladung, Ablehnung, Rückkampfanfrage und Rückkampf-Ablehnung.
6. Im Supabase-Dashboard `net._http_response`, Edge-Logs und `mf13_push_events` überprüfen.
