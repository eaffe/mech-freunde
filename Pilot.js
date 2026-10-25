import { Mech } from './Mech.js';
import { PARTS, partKey, findPart } from './Parts.js';

export class Pilot {
  constructor(data = {}) {
    this.mech = new Mech(data.mech || {});
    this.stars = Math.max(0, Number(data.stars) || 0);
    this.wins = Math.max(0, Number(data.wins) || 0);
    this.practiceCount = Math.max(0, Number(data.practiceCount) || 0);
    const defaultOwned = Object.entries(PARTS).map(([category, values]) => partKey(category, values[0].id));
    const savedOwned = Array.isArray(data.owned) ? data.owned : [];
    this.owned = new Set([...defaultOwned, ...savedOwned.filter(key =>
      typeof key === 'string' && Object.entries(PARTS).some(([cat, values]) =>
        values.some(part => partKey(cat, part.id) === key)
      )
    )]);
  }

  owns(category, id) { return this.owned.has(partKey(category, id)); }

  choose(category, id) {
    const part = findPart(category, id);
    if (!part) return { ok: false, reason: 'unknown' };
    if (!this.owns(category, id)) {
      if (this.stars < part.cost) return { ok: false, reason: 'stars', cost: part.cost };
      this.stars -= part.cost;
      this.owned.add(partKey(category, id));
    }
    this.mech.equip(category, id);
    return { ok: true, part };
  }

  finishTraining(won) {
    this.practiceCount += 1;
    if (won) this.wins += 1;
    const earned = won ? 6 : 2;
    this.stars += earned;
    return earned;
  }

  toJSON() {
    return { version: 1, mech: this.mech.toJSON(), stars: this.stars,
      wins: this.wins, practiceCount: this.practiceCount, owned: [...this.owned] };
  }
}
