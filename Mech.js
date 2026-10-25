import { STARTER_SELECTION, findPart, findColor, findStyle } from './Parts.js';

export class Mech {
  constructor(selection = {}) {
    this.selection = { ...STARTER_SELECTION };
    for (const category of ['head', 'body', 'arms', 'legs', 'gear']) {
      if (findPart(category, selection[category])) this.selection[category] = selection[category];
    }
    // Old saved mechs used one shared 'arms' choice. Import them without losing equipment.
    const legacyArms = this.selection.arms;
    this.selection.leftArm = findPart('arms',selection.leftArm) ? selection.leftArm : legacyArms;
    this.selection.rightArm = findPart('arms',selection.rightArm) ? selection.rightArm : legacyArms;
    this.selection.color = findColor(selection.color).id;
    this.selection.style = findStyle(selection.style).id;
  }

  equip(category, id) {
    if (category === 'color') this.selection.color = findColor(id).id;
    else if (category === 'style') this.selection.style = findStyle(id).id;
    else if (findPart(category, id)) this.selection[category] = id;
    return this;
  }

  withPart(category, id) {
    const next = new Mech(this.selection);
    next.equip(category, id);
    return next;
  }

  get stats() {
    const sum = { hp: 95, attack: 18, armor: 0, dodge: 0 };
    const style = findStyle(this.selection.style);
    sum.hp += style.hp;
    sum.attack += style.attack;
    sum.armor += style.armor;
    sum.dodge += style.dodge;
    for (const category of ['head', 'body', 'legs', 'gear']) {
      const part = findPart(category, this.selection[category]);
      if (!part) continue;
      sum.hp += part.hp;
      sum.attack += part.attack;
      sum.armor += part.armor;
    }
    // Two half-strength arm slots preserve roughly the old power balance.
    const left=findPart('arms',this.selection.leftArm);
    const right=findPart('arms',this.selection.rightArm);
    for (const stat of ['hp','attack','armor'])
      sum[stat] += Math.round(((left?.[stat]||0)+(right?.[stat]||0))/2);
    return sum;
  }

  toJSON() { return { ...this.selection }; }
}
