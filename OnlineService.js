import { ONLINE_CONFIG } from './online-config.js';

// Ausschließlich öffentliche Konfiguration. Kampf und Belohnungen werden
// atomar von PostgreSQL-RPCs verarbeitet, niemals vom Browser berechnet.
export class OnlineService {
  constructor() { this.client = null; this.loading = null; }

  get configured() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test((ONLINE_CONFIG.url || '').trim())
      && /^(sb_publishable_|eyJ)/.test((ONLINE_CONFIG.publishableKey || '').trim());
  }

  async connect() {
    if (!this.configured) throw new Error('Online noch nicht eingerichtet');
    if (this.client) return this.client;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      if (!window.supabase?.createClient) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error('Supabase konnte nicht geladen werden'));
          document.head.appendChild(script);
        });
      }
      if (!window.supabase?.createClient) throw new Error('Supabase konnte nicht gestartet werden');
      const client = window.supabase.createClient(ONLINE_CONFIG.url, ONLINE_CONFIG.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        const { error } = await client.auth.signInAnonymously();
        if (error) throw error;
      }
      this.client = client;
      return client;
    })();
    try { return await this.loading; } finally { this.loading = null; }
  }

  async rpc(name, args = {}) {
    const client = await this.connect();
    const { data, error } = await client.rpc(name, args);
    if (error) {
      // Rohes SQL oder Rolleninformationen nicht in der Kinderoberfläche zeigen.
      console.warn(`Online: ${name}`, error.message);
      throw new Error('Online-Aktion nicht möglich. Bitte erneut versuchen.');
    }
    return data;
  }

  async overview() {
    const [profile, match] = await Promise.all([
      this.rpc('mf5_profile'), this.rpc('mf5_current_match')
    ]);
    return { profile, match };
  }

  async create(look) { return this.rpc('mf5_create_match', { p_look: look }); }
  async join(code, look) { return this.rpc('mf5_join_match', { p_code: code, p_look: look }); }
  async state(id) { return this.rpc('mf5_match_state', { p_id: id }); }
  async move(id, kind) { return this.rpc('mf5_move', { p_id: id, p_action: kind }); }
  async buy(id) { return this.rpc('mf5_buy_paint', { p_paint: id }); }
  async equip(id) { return this.rpc('mf5_equip_paint', { p_paint: id }); }
  async cancel(id) { return this.rpc('mf5_cancel_match', { p_id: id }); }
  async rematch(id) { return this.rpc('mf6_rematch', { p_id: id }); }
  async forfeit(id) { return this.rpc('mf7_forfeit', { p_id: id }); }
  async setIdentity(name, avatar, visible) { return this.rpc('mf6_set_identity', { p_name:name, p_avatar:avatar, p_public:visible }); }
  async leaderboard() { return this.rpc('mf6_leaderboard'); }
}

export const ONLINE_PAINTS = Object.freeze([
  { id:'neon', icon:'💠', name:'Neon', cost:20 },
  { id:'onyx', icon:'🌑', name:'Schatten', cost:30 },
  { id:'ember', icon:'🔥', name:'Glut', cost:40 }
]);

export const ONLINE_AVATARS = Object.freeze(['🤖','🐉','🦊','🐼','🐯','🦉','🦄','🚀','⭐','🦁','🐺','🛡️']);
export const NAME_FIRST = Object.freeze(['Blitz','Turbo','Stern','Mega','Neon','Wolken','Feuer','Eis','Super','Gold']);
export const NAME_SECOND = Object.freeze(['Fuchs','Drache','Tiger','Panda','Falke','Robo','Luchs','Komet','Kaefer','Wolf']);
