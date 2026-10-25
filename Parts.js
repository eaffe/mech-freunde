export const CATEGORIES = [
  { id: 'head', icon: '🥷', label: 'Kopf', viewBox: '76 0 210 160' },
  { id: 'body', icon: '🛡️', label: 'Rüstung', viewBox: '56 122 248 153' },
  { id: 'leftArm', icon: '🦾', label: 'Links', viewBox: '0 128 180 195' },
  { id: 'rightArm', icon: '⚔️', label: 'Rechts', viewBox: '180 128 180 195' },
  { id: 'legs', icon: '🥾', label: 'Beine', viewBox: '85 244 196 119' },
  { id: 'gear', icon: '🎒', label: 'Zubehör', viewBox: '0 20 360 320' },
  { id: 'color', icon: '🎨', label: 'Farbe', viewBox: '0 0 360 380' }
];

// Der Katalog ist von den Spielregeln getrennt: neue Bauteile brauchen
// zunächst nur einen neuen Eintrag und eine passende Zeichnung im Renderer.
export const PARTS = {
  head: [
    { id: 'smile', name: 'Kuller', cost: 0, icon: '😊', hp: 0, attack: 0, armor: 0 },
    { id: 'visor', name: 'Visier', cost: 6, icon: '😎', hp: 0, attack: 0, armor: 2 },
    { id: 'antenna', name: 'Fühler', cost: 10, icon: '📡', hp: 0, attack: 3, armor: 0 },
    { id: 'samurai', name: 'Samurai', cost: 14, icon: '🥷', hp: 5, attack: 2, armor: 1 },
    { id: 'dragon', name: 'Drachenhelm', cost: 16, icon: '🐉', hp: 4, attack: 4, armor: 1 },
    { id: 'crystal', name: 'Kristallkopf', cost: 15, icon: '💎', hp: 0, attack: 5, armor: 1 },
    { id: 'owl', name: 'Eulenvisier', cost: 11, icon: '🦉', hp: 5, attack: 0, armor: 2 },
    { id: 'knight', name: 'Ritterhelm', cost: 18, icon: '🪖', hp: 12, attack: 0, armor: 3 },
    { id: 'star', name: 'Sternenhelm', cost: 20, icon: '🌟', hp: 5, attack: 5, armor: 1 }
  ],
  body: [
    { id: 'heart', name: 'Herz', cost: 0, icon: '💖', hp: 0, attack: 0, armor: 0 },
    { id: 'shield', name: 'Panzer', cost: 10, icon: '🛡️', hp: 20, attack: 0, armor: 2 },
    { id: 'bolt', name: 'Turbo', cost: 12, icon: '⚡', hp: 0, attack: 5, armor: 0 },
    { id: 'shoulders', name: 'Schultern', cost: 14, icon: '🛡️', hp: 12, attack: 0, armor: 3 },
    { id: 'fortress', name: 'Festung', cost: 22, icon: '🏰', hp: 25, attack: 0, armor: 4 },
    { id: 'crystalcore', name: 'Kristallpanzer', cost: 19, icon: '💠', hp: 8, attack: 5, armor: 1 },
    { id: 'dragonplate', name: 'Drachenrüstung', cost: 24, icon: '🐲', hp: 15, attack: 5, armor: 2 },
    { id: 'stealth', name: 'Schattenpanzer', cost: 17, icon: '🌑', hp: 4, attack: 4, armor: 2 }
  ],
  arms: [
    { id: 'hands', name: 'Hände', cost: 0, icon: '👋', hp: 0, attack: 0, armor: 0 },
    { id: 'laser', name: 'Laser', cost: 9, icon: '✨', hp: 0, attack: 4, armor: 0 },
    { id: 'rockets', name: 'Raketen', cost: 14, icon: '🚀', hp: 0, attack: 8, armor: 0 },
    { id: 'blades', name: 'Klingen', cost: 13, icon: '⚔️', hp: 0, attack: 6, armor: 1 },
    { id: 'champion', name: 'Heldenklingen', cost: 0, icon: '🏆', hp: 0, attack: 9, armor: 1, trophyWins: 5 },
    { id: 'hammer', name: 'Donnerhammer', cost: 17, icon: '🔨', hp: 0, attack: 10, armor: 0 },
    { id: 'claws', name: 'Drachenklauen', cost: 16, icon: '🐾', hp: 0, attack: 7, armor: 2 },
    { id: 'cannons', name: 'Plasmakanonen', cost: 20, icon: '💥', hp: 0, attack: 11, armor: 0 },
    { id: 'staff', name: 'Energiestab', cost: 14, icon: '🪄', hp: 5, attack: 6, armor: 0 },
    { id: 'saw', name: 'Kreissägen', cost: 15, icon: '⚙️', hp: 0, attack: 8, armor: 1 }
  ],
  legs: [
    { id: 'boots', name: 'Stiefel', cost: 0, icon: '👟', hp: 0, attack: 0, armor: 0 },
    { id: 'hover', name: 'Düsen', cost: 8, icon: '💨', hp: 0, attack: 0, armor: 2 },
    { id: 'tracks', name: 'Raupen', cost: 11, icon: '🛞', hp: 15, attack: 0, armor: 1 },
    { id: 'spider', name: 'Spinnenbeine', cost: 14, icon: '🕷️', hp: 5, attack: 3, armor: 2 },
    { id: 'titan', name: 'Titanstiefel', cost: 16, icon: '🥾', hp: 18, attack: 0, armor: 3 },
    { id: 'skates', name: 'Blitzgleiter', cost: 12, icon: '🛼', hp: 0, attack: 4, armor: 1 }
  ],
  gear: [
    { id: 'none', name: 'Ohne', cost: 0, icon: '✨', hp: 0, attack: 0, armor: 0 },
    { id: 'jetpack', name: 'Jetpack', cost: 14, icon: '🚀', hp: 0, attack: 3, armor: 1 },
    { id: 'wings', name: 'Flügel', cost: 18, icon: '🪽', hp: 4, attack: 2, armor: 2 },
    { id: 'shieldpack', name: 'Rückenschild', cost: 15, icon: '🛡️', hp: 12, attack: 0, armor: 2 },
    { id: 'powercore', name: 'Energiekern', cost: 20, icon: '🔋', hp: 0, attack: 6, armor: 1 },
    { id: 'spikes', name: 'Stachelpanzer', cost: 16, icon: '🌵', hp: 6, attack: 3, armor: 2 },
    { id: 'banner', name: 'Heldenbanner', cost: 10, icon: '🚩', hp: 6, attack: 1, armor: 1 }
  ]
};

// Left and right arms share the same unlocks and shop prices.
PARTS.leftArm = PARTS.arms;
PARTS.rightArm = PARTS.arms;

export const COLORS = [
  { id: 'mint', label: 'Türkis', primary: '#37c8b0', light: '#90f9e2', dark: '#168d83' },
  { id: 'pink', label: 'Pink', primary: '#f279bd', light: '#ffd2ec', dark: '#c34b92' },
  { id: 'blue', label: 'Blau', primary: '#6d9afa', light: '#c3ddff', dark: '#4d67db' },
  { id: 'orange', label: 'Orange', primary: '#ffad53', light: '#ffe29b', dark: '#d77537' },
  { id: 'purple', label: 'Lila', primary: '#ac85f4', light: '#decfff', dark: '#785aca' },
  { id: 'lime', label: 'Limette', primary: '#96c953', light: '#dcffa0', dark: '#608d31' },
  { id: 'red', label: 'Rot', primary: '#df4343', light: '#ffb2b2', dark: '#9f2323' },
  { id: 'gold', label: 'Gold', primary: '#e7ab27', light: '#fff1a8', dark: '#a26315', trophyWins: 10 },
  { id: 'neon', label: 'Neon', primary: '#14cfd3', light: '#a4ffff', dark: '#075e88', onlineOnly: true },
  { id: 'onyx', label: 'Schatten', primary: '#525878', light: '#b8c4e6', dark: '#1f263e', onlineOnly: true },
  { id: 'ember', label: 'Glut', primary: '#de5629', light: '#ffca63', dark: '#92251a', onlineOnly: true }
];

// Drei sofort verfügbare Spielstile ohne Stern-Kosten.
// Die Werte bleiben bewusst moderat; gekaufte Teile sind unabhängig davon.
export const STYLES = Object.freeze([
  { id: 'light', icon: '🪽', label: 'Leicht', hp: 0, attack: 0, armor: 0, dodge: 0.07 },
  { id: 'strong', icon: '💪', label: 'Stark', hp: 20, attack: 3, armor: 1, dodge: 0 },
  { id: 'fast', icon: '⚡', label: 'Schnell', hp: -10, attack: 1, armor: 0, dodge: 0.19 }
]);

export const findStyle = id => STYLES.find(style => style.id === id) || STYLES[0];

export const STARTER_SELECTION = Object.freeze({
  head: 'smile', body: 'heart', arms: 'hands', leftArm: 'hands', rightArm: 'hands', legs: 'boots', gear: 'none', color: 'mint', style: 'light'
});

export const findPart = (category, id) => PARTS[category]?.find(part => part.id === id) || null;
export const findColor = id => COLORS.find(color => color.id === id) || COLORS[0];
export const partKey = (category, id) => `${category}:${id}`;
