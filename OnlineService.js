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
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
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
  async declineRematch(id) { return this.rpc('mf8_decline_rematch', { p_id: id }); }
  async forfeit(id) { return this.rpc('mf7_forfeit', { p_id: id }); }
  async setIdentity(name, avatar, visible) { return this.rpc('mf6_set_identity', { p_name:name, p_avatar:avatar, p_public:visible }); }
  async leaderboard() { return this.rpc('mf6_leaderboard'); }
  async matchHistory(){return this.rpc('mf10_match_history');}
  async getAccount() {
    const client=await this.connect();
    const {data,error}=await client.auth.getUser();
    if(error)throw new Error('Konto konnte nicht geladen werden');
    return data.user;
  }
  async linkEmail(email) {
    const client=await this.connect();
    const {error}=await client.auth.updateUser({email},
      {emailRedirectTo:new URL('./index.html#online',window.location.href).href});
    if(error)throw new Error('E-Mail konnte nicht verknüpft werden: '+error.message);
  }
  async setPassword(password) {
    const client=await this.connect();
    const {error}=await client.auth.updateUser({password});
    if(error)throw new Error('Passwort konnte nicht gespeichert werden');
  }
  async login(email,password) {
    const client=await this.connect();
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error)throw new Error('Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.');
    return data.user;
  }
  async logoutToGuest() {
    const client=await this.connect();
    const {error}=await client.auth.signOut();
    if(error)throw new Error('Abmeldung fehlgeschlagen');
    const next=await client.auth.signInAnonymously();
    if(next.error)throw new Error('Gastzugang nicht verfügbar');
  }
  async game(){return this.rpc('mf10_game');}
  async saveGame(data){return this.rpc('mf10_save_game',{p_data:data});}
  async friendCode(){return this.rpc('mf10_friend_code');}
  async friends(){return this.rpc('mf10_list_friends');}
  async addFriend(code){return this.rpc('mf10_add_friend',{p_code:code});}
  async acceptFriend(userId){return this.rpc('mf10_accept_friend',{p_sender:userId});}
  async removeFriend(userId){return this.rpc('mf10_remove_friend',{p_other:userId});}
  async inviteFriend(userId,matchId){return this.rpc('mf10_invite_friend',{p_receiver:userId,p_match:matchId});}
  async pendingInvites(){return this.rpc('mf10_pending_invites');}
  async acceptInvite(id,look){return this.rpc('mf10_accept_invite',{p_invite:id,p_look:look});}
  async declineInvite(id){return this.rpc('mf13_decline_invite',{p_invite:id});}
  async pushKey(){return this.rpc('mf13_push_key');}
  async registerPush(subscription){
    const data=subscription.toJSON();
    if(!subscription.endpoint || !data?.keys?.p256dh || !data?.keys?.auth)
      throw new Error('Push-Abonnement nicht gültig.');
    return this.rpc('mf13_push_subscribe',{
      p_endpoint:subscription.endpoint,p_p256dh:data.keys.p256dh,p_auth:data.keys.auth
    });
  }
  async unregisterPush(endpoint){return this.rpc('mf13_push_unsubscribe',{p_endpoint:endpoint});}
  async newTournament(look){return this.rpc('mf10_tourney_create',{p_look:look});}
  async joinTournament(code,look){return this.rpc('mf10_tourney_join',{p_code:code,p_look:look});}
  async tournamentState(code){return this.rpc('mf10_tourney_state',{p_code:code});}
}

export const ONLINE_PAINTS = Object.freeze([
  { id:'neon', icon:'💠', name:'Neon', cost:20 },
  { id:'onyx', icon:'🌑', name:'Schatten', cost:30 },
  { id:'ember', icon:'🔥', name:'Glut', cost:40 }
]);

export const ONLINE_AVATARS = Object.freeze(['🤖','🐉','🦊','🐼','🐯','🦉','🦄','🚀','⭐','🦁','🐺','🛡️']);
export const NAME_FIRST = Object.freeze(['Blitz','Turbo','Stern','Mega','Neon','Wolken','Feuer','Eis','Super','Gold']);
export const NAME_SECOND = Object.freeze(['Fuchs','Drache','Tiger','Panda','Falke','Robo','Luchs','Komet','Kaefer','Wolf']);
