import { Mech } from './Mech.js';
import { PARTS, COLORS, STYLES, partKey, findPart } from './Parts.js';
import { TRAINING_BOTS, getTrainingBot } from './TrainingBots.js';

export class Pilot {
  constructor(data = {}) {
    this.mech = new Mech(data.mech || {});
    this.stars = Math.max(0, Number(data.stars) || 0);
    this.wins = Math.max(0, Number(data.wins) || 0);
    this.specialWins = Math.max(0, Number(data.specialWins) || 0);
    this.practiceCount = Math.max(0, Number(data.practiceCount) || 0);
    const defaultOwned = Object.entries(PARTS).map(([category, values]) => partKey(category, values[0].id));
    const savedOwned = Array.isArray(data.owned) ? data.owned : [];
    this.owned = new Set([...defaultOwned, ...savedOwned.filter(key =>
      typeof key === 'string' && Object.entries(PARTS).some(([cat, values]) =>
        values.some(part => partKey(cat, part.id) === key)
      )
    )]);
    this.trainingBots = {};
    for (const bot of TRAINING_BOTS) {
      const saved = data.trainingBots?.[bot.id];
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        const selection = new Mech({ ...bot.mech, ...saved }).toJSON();
        if (COLORS.some(c => c.id === selection.color && !c.onlineOnly)) this.trainingBots[bot.id] = selection;
      }
    }
  }

  owns(category, id) {
    const part = findPart(category, id);
    if (part?.trophyWins) return this.wins >= part.trophyWins;
    return this.owned.has(partKey(category, id));
  }

  choose(category, id) {
    const part = findPart(category, id);
    if (!part) return { ok: false, reason: 'unknown' };
    if (part.trophyWins && !this.owns(category, id)) return { ok: false, reason: 'trophy', cost: part.trophyWins };
    if (!this.owns(category, id)) {
      if (this.stars < part.cost) return { ok: false, reason: 'stars', cost: part.cost };
      this.stars -= part.cost;
      this.owned.add(partKey(category, id));
    }
    this.mech.equip(category, id);
    return { ok: true, part };
  }

  trainingMech(botId) {
    return new Mech(this.trainingBots[botId] || getTrainingBot(botId).mech);
  }

  equipTrainingBot(botId, category, id) {
    if (!TRAINING_BOTS.some(bot => bot.id === botId)) return false;
    if (category === 'color') {
      if (!COLORS.some(color => color.id === id && !color.onlineOnly)) return false;
    } else if (category === 'style') {
      if (!STYLES.some(style => style.id === id)) return false;
    } else if (!findPart(category, id)) return false;
    const mech = this.trainingMech(botId);
    mech.equip(category, id);
    this.trainingBots[botId] = mech.toJSON();
    return true;
  }

  resetTrainingBot(botId) {
    if (!TRAINING_BOTS.some(bot => bot.id === botId)) return false;
    delete this.trainingBots[botId];
    return true;
  }

  finishTraining(won, usedSpecial = false, winReward = 6) {
    this.practiceCount += 1;
    if (won) {
      this.wins += 1;
      if (usedSpecial) this.specialWins += 1;
    }
    const earned = won ? Math.max(0, Math.min(20, Number(winReward) || 6)) : 2;
    this.stars += earned;
    return earned;
  }

  toJSON() {
    return { version: 3, mech: this.mech.toJSON(), stars: this.stars,
      wins: this.wins, specialWins: this.specialWins, practiceCount: this.practiceCount, owned: [...this.owned], trainingBots: this.trainingBots };
  }
}
