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

export function makeTrainingMech(id) {
  return new Mech(getTrainingBot(id).mech);
}
