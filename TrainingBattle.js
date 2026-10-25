// Isolierte Kampfregeln: später können Online-Duelle dieselben Aktionsbegriffe
// verwenden, während ein Server die offiziellen Ergebnisse berechnet.
export class TrainingBattle {
  constructor(mech, rng = Math.random) {
    this.rng = rng;
    this.maxPlayerHp = mech.stats.hp;
    this.playerHp = this.maxPlayerHp;
    this.maxBotHp = 78;
    this.botHp = this.maxBotHp;
    this.attack = mech.stats.attack;
    this.armor = mech.stats.armor;
    this.guarding = false;
    this.turn = 'player';
    this.winner = null;
    this.lastEvent = { icon: '👋', message: 'Los geht’s!' };
  }

  get finished() { return Boolean(this.winner); }

  act(action) {
    if (this.finished || this.turn !== 'player') return null;
    if (action === 'shield') {
      this.guarding = true;
      this.turn = 'bot';
      this.lastEvent = { icon: '🛡️', message: 'Super Schild!' };
      return this.lastEvent;
    }
    if (action !== 'attack') return null;
    const hit = this.rng() >= 0.12;
    const damage = hit ? Math.max(1, Math.round(this.attack * (0.65 + this.rng() * 0.5))) : 0;
    this.botHp = Math.max(0, this.botHp - damage);
    this.lastEvent = hit ? { icon: '💥', message: `${damage} Treffer!` } : { icon: '💨', message: 'Daneben!' };
    if (this.botHp === 0) this.winner = 'player';
    else this.turn = 'bot';
    return this.lastEvent;
  }

  botAction() {
    if (this.finished || this.turn !== 'bot') return null;
    const hit = this.rng() >= 0.16;
    const raw = hit ? Math.round(10 + this.rng() * 7) : 0;
    const damage = hit ? Math.max(1, raw - this.armor - (this.guarding ? 12 : 0)) : 0;
    this.playerHp = Math.max(0, this.playerHp - damage);
    this.guarding = false;
    this.lastEvent = hit ? { icon: '💢', message: `Roboter: ${damage}` } : { icon: '💨', message: 'Roboter daneben!' };
    if (this.playerHp === 0) this.winner = 'bot';
    else this.turn = 'player';
    return this.lastEvent;
  }
}
