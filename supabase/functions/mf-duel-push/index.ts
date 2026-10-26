// Mech-Freunde Web Push gateway. Called only by a signed internal database webhook.
// Supabase Vault holds the VAPID key and webhook token; never ship them to browsers.
import { createClient } from "jsr:@supabase/supabase-js@2";

const utf8 = new TextEncoder();
function b64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? utf8.encode(input) : input;
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function allowedEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" &&
      ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname) &&
      url.username === "" && url.password === "";
  } catch { return false; }
}
async function vapidToken(config: Record<string,string>, audience: string): Promise<string> {
  const privateKey = await crypto.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256", x: config.x, y: config.y,
    d: config.private, ext: true
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = b64url(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now()/1000) + 60 * 60 * 4,
    sub: "https://eaffe.github.io/mech-freunde/"
  }));
  const input = header + "." + payload;
  const signed = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, utf8.encode(input));
  return input + "." + b64url(new Uint8Array(signed));
}
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return new Response("Server unavailable", { status: 503 });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: config, error: confError } = await admin.rpc("mf13_push_runtime");
  if (confError || !config?.secret || !config?.private) {
    console.error("Push config RPC failed:", confError?.code, confError?.message || "Missing Vault secrets");
    return new Response("Not configured", { status: 503 });
  }
  const token = request.headers.get("x-mf-internal") || "";
  if (token.length !== config.secret.length || token !== config.secret) return new Response("Forbidden", { status: 403 });
  let body: { event_id?: string };
  try { body = await request.json(); } catch { return new Response("Bad request", { status: 400 }); }
  if (typeof body.event_id !== "string" || !/^[a-f0-9-]{36}$/i.test(body.event_id)) return new Response("Bad event", { status: 400 });
  const { data: event, error: evtError } = await admin.rpc("mf13_push_event", { p_id: body.event_id });
  if (evtError || !event) return new Response("Event not found", { status: 404 });
  if (event.delivered) return new Response("Already sent", { status: 200 });
  if (!["joined","invite","declined","rematch","rematch_started"].includes(event.kind)) return new Response("Invalid kind", { status: 400 });

  let success = 0;
  let failure = 0;
  const subscriptions = Array.isArray(event.subscriptions) ? event.subscriptions.slice(0, 6) : [];
  for (const subscription of subscriptions) {
    if (!allowedEndpoint(subscription.endpoint)) continue;
    try {
      const audience = new URL(subscription.endpoint).origin;
      const jwt = await vapidToken(config, audience);
      // Empty payload avoids storing player names on lock screens. The service
      // worker displays a generic text and opens the game for details.
      const response = await fetch(subscription.endpoint, {
        method: "POST",
        headers: {
          Authorization: `vapid t=${jwt}, k=${config.public}`,
          TTL: "3600",
          Urgency: "normal"
        }
      });
      if (response.status === 201 || response.status === 202 || response.ok) success++;
      else if ([404, 410].includes(response.status)) {
        await admin.rpc("mf13_push_remove_dead", { p_endpoint: subscription.endpoint });
      } else {
        failure++;
        console.warn("Push provider status:", response.status);
      }
    } catch (error) {
      failure++;
      console.warn("Push delivery failed:", String(error).slice(0, 160));
    }
  }
  if (failure === 0) await admin.rpc("mf13_push_mark_delivered", { p_id: body.event_id });
  return Response.json({ ok: failure === 0, delivered: success, failed: failure }, { status: failure ? 503 : 200 });
});
