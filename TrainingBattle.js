import { getTrainingBotStats } from './TrainingBots.js';

// Einfache, testbare Offline-Kampfregeln mit drei unterschiedlichen Bot-Strategien.
// Für Online-Punkte darf ausschließlich ein zukünftiger Server Ergebnisse vergeben.
export class TrainingBattle {
  constructor(mech, botId = 'scout', rng = Math.random, enemyMech = null) {
    // Rückwärtskompatibilität zu Aufrufern aus v0.3: (mech, rng)
    if (typeof botId === 'function') { rng = botId; botId = 'scout'; }
    this.rng = rng;
    this.bot = getTrainingBotStats(botId, enemyMech);
    this.maxPlayerHp = mech.stats.hp;
    this.playerHp = this.maxPlayerHp;
    this.maxBotHp = this.bot.hp;
    this.botHp = this.maxBotHp;
    this.attack = mech.stats.attack;
    this.armor = mech.stats.armor;
    this.dodge = mech.stats.dodge || 0;
    this.guarding = false;
    this.botGuarding = false;
    this.power = 0;
    this.usedSpecial = false;
    this.turn = 'player';
    this.winner = null;
    this.lastEvent = { icon: '⚔️', message: 'Bereit!', actor: 'system', kind: 'start', damage: 0 };
  }

  get finished() { return Boolean(this.winner); }
  get specialReady() { return this.power >= 3; }

  act(action) {
    if (this.finished || this.turn !== 'player') return null;
    if (action === 'shield') {
      this.guarding = true;
      this.power = Math.min(3, this.power + 1);
      this.turn = 'bot';
      this.lastEvent = { icon: '🛡️', message: 'Schutz!', actor: 'player', kind: 'guard', damage: 0 };
      return this.lastEvent;
    }
    if (action !== 'attack' && action !== 'special') return null;
    if (action === 'special' && !this.specialReady) return null;

    const special = action === 'special';
    if (special) this.usedSpecial = true;
    const hit = this.rng() >= (special ? 0.06 : 0.12) + this.bot.dodge;
    const raw = hit ? Math.round(this.attack * (0.70 + this.rng() * 0.48) * (special ? 1.8 : 1)) : 0;
    const damage = hit ? Math.max(1, raw - this.bot.armor - (this.botGuarding ? 12 : 0)) : 0;
    this.botGuarding = false;
    this.botHp = Math.max(0, this.botHp - damage);
    this.power = special ? 0 : Math.min(3, this.power + 1);
    this.lastEvent = hit
      ? { icon: special ? '⚡' : '💥', message: `${damage}!`, actor: 'player', kind: special ? 'special' : 'hit', damage }
      : { icon: '💨', message: 'Daneben!', actor: 'player', kind: 'miss', damage: 0 };

    if (this.botHp === 0) this.winner = 'player';
    else this.turn = 'bot';
    return this.lastEvent;
  }

  botAction() {
    if (this.finished || this.turn !== 'bot') return null;
    if (this.rng() < this.bot.guardChance) {
      this.botGuarding = true;
      this.guarding = false;
      this.turn = 'player';
      this.lastEvent = { icon: '🛡️', message: 'Bot schützt!', actor: 'bot', kind: 'guard', damage: 0 };
      return this.lastEvent;
    }
    const hit = this.rng() < Math.max(0.18, this.bot.accuracy - this.dodge);
    const raw = hit ? Math.round(this.bot.attackMin + this.rng() * (this.bot.attackMax - this.bot.attackMin)) : 0;
    const damage = hit ? Math.max(0, raw - this.armor - (this.guarding ? 12 : 0)) : 0;
    this.playerHp = Math.max(0, this.playerHp - damage);
    this.guarding = false;
    this.lastEvent = hit
      ? { icon: damage === 0 ? '🛡️' : '💢', message: damage === 0 ? 'Abgewehrt!' : `-${damage}`, actor: 'bot', kind: damage === 0 ? 'blocked' : 'hit', damage }
      : { icon: '💨', message: 'Ausgewichen!', actor: 'bot', kind: 'miss', damage: 0 };
    if (this.playerHp === 0) this.winner = 'bot';
    else this.turn = 'player';
    return this.lastEvent;
  }
}
