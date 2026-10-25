export const CATEGORIES = [
  { id: 'head', icon: '🙂', label: 'Kopf', viewBox: '87 23 190 133' },
  { id: 'body', icon: '💟', label: 'Bauch', viewBox: '88 140 186 130' },
  { id: 'arms', icon: '💪', label: 'Arme', viewBox: '20 133 324 150' },
  { id: 'legs', icon: '👟', label: 'Füße', viewBox: '85 244 196 119' },
  { id: 'color', icon: '🎨', label: 'Farbe', viewBox: '0 0 360 380' }
];

// Der Katalog ist von den Spielregeln getrennt: neue Bauteile brauchen
// zunächst nur einen neuen Eintrag und eine passende Zeichnung im Renderer.
export const PARTS = {
  head: [
    { id: 'smile', name: 'Kuller', cost: 0, icon: '😊', hp: 0, attack: 0, armor: 0 },
    { id: 'visor', name: 'Visier', cost: 6, icon: '😎', hp: 0, attack: 0, armor: 2 },
    { id: 'antenna', name: 'Fühler', cost: 10, icon: '📡', hp: 0, attack: 3, armor: 0 }
  ],
  body: [
    { id: 'heart', name: 'Herz', cost: 0, icon: '💖', hp: 0, attack: 0, armor: 0 },
    { id: 'shield', name: 'Panzer', cost: 10, icon: '🛡️', hp: 20, attack: 0, armor: 2 },
    { id: 'bolt', name: 'Turbo', cost: 12, icon: '⚡', hp: 0, attack: 5, armor: 0 }
  ],
  arms: [
    { id: 'hands', name: 'Hände', cost: 0, icon: '👋', hp: 0, attack: 0, armor: 0 },
    { id: 'laser', name: 'Laser', cost: 9, icon: '✨', hp: 0, attack: 4, armor: 0 },
    { id: 'rockets', name: 'Raketen', cost: 14, icon: '🚀', hp: 0, attack: 8, armor: 0 }
  ],
  legs: [
    { id: 'boots', name: 'Stiefel', cost: 0, icon: '👟', hp: 0, attack: 0, armor: 0 },
    { id: 'hover', name: 'Düsen', cost: 8, icon: '💨', hp: 0, attack: 0, armor: 2 },
    { id: 'tracks', name: 'Raupen', cost: 11, icon: '🛞', hp: 15, attack: 0, armor: 1 }
  ]
};

export const COLORS = [
  { id: 'mint', label: 'Türkis', primary: '#37c8b0', light: '#90f9e2', dark: '#168d83' },
  { id: 'pink', label: 'Pink', primary: '#f279bd', light: '#ffd2ec', dark: '#c34b92' },
  { id: 'blue', label: 'Blau', primary: '#6d9afa', light: '#c3ddff', dark: '#4d67db' },
  { id: 'orange', label: 'Orange', primary: '#ffad53', light: '#ffe29b', dark: '#d77537' },
  { id: 'purple', label: 'Lila', primary: '#ac85f4', light: '#decfff', dark: '#785aca' },
  { id: 'lime', label: 'Limette', primary: '#96c953', light: '#dcffa0', dark: '#608d31' }
];

export const STARTER_SELECTION = Object.freeze({
  head: 'smile', body: 'heart', arms: 'hands', legs: 'boots', color: 'mint'
});

export const findPart = (category, id) => PARTS[category]?.find(part => part.id === id) || null;
export const findColor = id => COLORS.find(color => color.id === id) || COLORS[0];
export const partKey = (category, id) => `${category}:${id}`;
