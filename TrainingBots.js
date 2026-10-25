import { Mech } from './Mech.js';

// Drei klar erkennbare Gegner, mit eigenen Verhaltensweisen.
// Alle Werte gehören nur zum Offline-Training, nicht zu späteren Online-Duellen.
export const TRAINING_BOTS = Object.freeze([
  {
    id: 'scout', icon: '💨', label: 'Flitzer', hint: '🪽',
    hp: 66, armor: 0, attackMin: 8, attackMax: 13,
    accuracy: 0.74, dodge: 0.23, guardChance: 0.04, reward: 6,
    mech: { color: 'blue', head: 'visor', body: 'bolt', arms: 'laser', legs: 'hover', style: 'fast' }
  },
  {
    id: 'guardian', icon: '🛡️', label: 'Wächter', hint: '❤️',
    hp: 106, armor: 3, attackMin: 9, attackMax: 14,
    accuracy: 0.84, dodge: 0.04, guardChance: 0.24, reward: 7,
    mech: { color: 'lime', head: 'samurai', body: 'shoulders', arms: 'hands', legs: 'tracks', style: 'strong' }
  },
  {
    id: 'striker', icon: '🔥', label: 'Blitz', hint: '⚔️',
    hp: 84, armor: 1, attackMin: 13, attackMax: 19,
    accuracy: 0.86, dodge: 0.08, guardChance: 0.05, reward: 8,
    mech: { color: 'red', head: 'visor', body: 'bolt', arms: 'blades', legs: 'boots', style: 'strong' }
  }
]);

export function getTrainingBot(id) {
  return TRAINING_BOTS.find(bot => bot.id === id) || TRAINING_BOTS[0];
}

// Optische Änderungen beeinflussen nur die Offline-Trainingswerte, nicht Online-Duelle.
export function getTrainingBotStats(id, enemyMech = null) {
  const bot = getTrainingBot(id);
  const base = new Mech(bot.mech).stats;
  const equipped = enemyMech instanceof Mech ? enemyMech.stats : base;
  const hp = Math.max(45, Math.min(160, bot.hp + Math.round((equipped.hp - base.hp) * 0.65)));
  const armor = Math.max(0, Math.min(9, bot.armor + (equipped.armor - base.armor)));
  const damage = Math.max(-5, Math.min(9, Math.round((equipped.attack - base.attack) * 0.5)));
  const dodge = Math.max(0, Math.min(0.35, bot.dodge + equipped.dodge - base.dodge));
  return { ...bot, hp, armor, attackMin:Math.max(4,bot.attackMin+damage),
    attackMax:Math.max(8,bot.attackMax+damage), dodge };
}

export function makeTrainingMech(id) {
  return new Mech(getTrainingBot(id).mech);
}

const trainingClamp = (low, high, value) => Math.max(low, Math.min(high, value));

// Nur Offline-Training: vorhandene Ausrüstung zählt, Online-Kämpfe bleiben unberührt.
export function getAdaptiveTrainingBotStats(id, playerStats, enemyMech = null, options = {}) {
  const base = getTrainingBotStats(id, enemyMech);
  const stats = playerStats || {};
  const hp = trainingClamp(70, 240, Number(stats.hp) || 95);
  const attack = trainingClamp(12, 65, Number(stats.attack) || 18);
  const armor = trainingClamp(0, 20, Number(stats.armor) || 0);
  const dodge = trainingClamp(0, 0.3, Number(stats.dodge) || 0);
  const variation = trainingClamp(-0.2, 0.2, Number(options.variation) || 0);
  const lossStreak = trainingClamp(0, 2, Number(options.recentLosses) || 0);
  const relief = lossStreak * 0.07;
  const intensity = trainingClamp(0.75, 1.20, 1 + variation - relief);
  const progress = trainingClamp(0, 2.2,
    Math.max(0, attack - 18) / 32 * 0.80 +
    Math.max(0, hp - 95) / 105 * 0.55 +
    armor / 13 * 0.55 + Math.max(0, dodge - 0.07) * 0.70);

  const adjustedArmor = trainingClamp(0, 14, Math.round(base.armor + progress * 1.2 * intensity));
  const expectedPlayerHit = Math.max(4, attack * 0.94 - adjustedArmor);
  const expectedBotHp = Math.round(expectedPlayerHit * (4.7 + progress * 0.18) *
    Math.max(0.45, 0.88 - base.dodge) * intensity);
  const adjustedHp = trainingClamp(45, 320, Math.max(base.hp, expectedBotHp));
  const bonus = Math.round(Math.max(0, attack - 18) * 0.4 +
    Math.max(0, hp - 95) * 0.125 + armor * 0.8 + Math.max(0, dodge - 0.07) * 15);
  const attackMin = Math.max(4, Math.round((base.attackMin + bonus) * intensity));
  const attackMax = Math.max(attackMin + 3, Math.round((base.attackMax + bonus) * intensity));

  const difficultyLabel = lossStreak >= 2 ? '💜 Mutmachrunde'
    : variation > 0.12 ? '🔥 Heute etwas kniffliger'
    : variation > 0 ? '⚡ Heute etwas wacher'
    : variation < 0 ? '🌱 Heute etwas entspannter' : '🤖 Angepasst an deinen Mech';

  return {
    ...base, hp: adjustedHp, armor: adjustedArmor, attackMin, attackMax,
    accuracy: trainingClamp(0.60, 0.96, base.accuracy + progress * 0.035 + variation * 0.14 - relief * 0.16),
    dodge: trainingClamp(0.025, 0.30, base.dodge + progress * 0.02 + variation * 0.08 - relief * 0.05),
    guardChance: trainingClamp(0.02, 0.24, base.guardChance + progress * 0.015 - relief * 0.06),
    difficultyLabel
  };
}
