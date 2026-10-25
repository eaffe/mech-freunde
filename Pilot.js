import { Mech } from './Mech.js';
import { PARTS, COLORS, STYLES, partKey, findPart } from './Parts.js';
import { TRAINING_BOTS, getTrainingBot } from './TrainingBots.js';

export class Pilot {
  constructor(data = {}) {
    this.garage = Array.isArray(data.garage) && data.garage.length ? data.garage.slice(0,5).map((s,i)=>({
      name: String(s?.name||`Mech ${i+1}`).slice(0,22),
      selection: new Mech(s?.selection||data.mech||{}).toJSON()
    })) : [{name:'Mein Mech',selection:new Mech(data.mech||{}).toJSON()}];
    this.activeSlot = Math.max(0,Math.min(this.garage.length-1,Number(data.activeSlot)||0));
    this.mech = new Mech(this.garage[this.activeSlot].selection);
    this.arena = ['space','volcano','ice','city'].includes(data.arena) ? data.arena : 'space';
    this.daily = this.cleanDaily(data.daily);
    this.history=Array.isArray(data.history)?data.history.slice(0,20).map(h=>({bot:String(h.bot||'scout').slice(0,14),won:Boolean(h.won),time:String(h.time||'').slice(0,30)})):[];
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
    // Jede Trainings-KI hat einen eigenen, lokal gespeicherten Mech.
    // Fremde Online-Mechs können nicht verändert werden.
    this.trainingBots = {};
    for (const bot of TRAINING_BOTS) {
      const saved = data.trainingBots?.[bot.id];
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        const selection = new Mech({ ...bot.mech, ...saved }).toJSON();
        if (COLORS.some(c => c.id === selection.color && !c.onlineOnly)) this.trainingBots[bot.id] = selection;
      }
    }
  }

  cleanDaily(value) {
    const today=this.today();
    if (!value || value.date!==today) return {date:today, fights:0, wins:0, specials:0, claimed:[]};
    return {date:today,fights:Math.max(0,Math.min(100,Number(value.fights)||0)),
      wins:Math.max(0,Math.min(100,Number(value.wins)||0)),
      specials:Math.max(0,Math.min(100,Number(value.specials)||0)),
      claimed:Array.isArray(value.claimed)?value.claimed.filter(x=>['fights','wins','specials'].includes(x)):[]};
  }
  today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  get missions(){this.daily=this.cleanDaily(this.daily);return [
    {id:'fights',name:'2 Trainingskämpfe',current:this.daily.fights,goal:2,reward:4},
    {id:'wins',name:'2 Siege',current:this.daily.wins,goal:2,reward:6},
    {id:'specials',name:'Spezialangriff einsetzen',current:this.daily.specials,goal:1,reward:5}];}
  claimMission(id){const m=this.missions.find(x=>x.id===id);if(!m||m.current<m.goal||this.daily.claimed.includes(id))return false;this.stars+=m.reward;this.daily.claimed.push(id);return true;}
  syncGarage(){this.garage[this.activeSlot].selection=this.mech.toJSON();}
  selectGarage(index){if(!Number.isInteger(index)||index<0||index>=this.garage.length)return false;this.syncGarage();this.activeSlot=index;this.mech=new Mech(this.garage[index].selection);return true;}
  addGarage(){if(this.garage.length>=5)return false;this.syncGarage();this.garage.push({name:`Mech ${this.garage.length+1}`,selection:new Mech(this.mech.toJSON()).toJSON()});this.selectGarage(this.garage.length-1);return true;}
  renameGarage(name){const value=String(name||'').trim();if(value.length<1||value.length>22)return false;this.garage[this.activeSlot].name=value;return true;}
  owns(category, id) {
    const part = findPart(category, id);
    if (part?.trophyWins) return this.wins >= part.trophyWins;
    const unlockCategory=['leftArm','rightArm'].includes(category)?'arms':category;
    return this.owned.has(partKey(unlockCategory, id));
  }

  choose(category, id) {
    const part = findPart(category, id);
    if (!part) return { ok: false, reason: 'unknown' };
    if (part.trophyWins && !this.owns(category, id)) return { ok: false, reason: 'trophy', cost: part.trophyWins };
    if (!this.owns(category, id)) {
      if (this.stars < part.cost) return { ok: false, reason: 'stars', cost: part.cost };
      this.stars -= part.cost;
      this.owned.add(partKey(['leftArm','rightArm'].includes(category)?'arms':category, id));
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

  finishTraining(won, usedSpecial = false, winReward = 6, botId='scout') {
    this.history.unshift({bot:getTrainingBot(botId).label,won:Boolean(won),time:new Date().toISOString()});
    this.history=this.history.slice(0,20);
    this.practiceCount += 1;
    this.daily=this.cleanDaily(this.daily);
    this.daily.fights+=1;
    if(won)this.daily.wins+=1;
    if(usedSpecial)this.daily.specials+=1;
    if (won) {
      this.wins += 1;
      if (usedSpecial) this.specialWins += 1;
    }
    const earned = won ? Math.max(0, Math.min(20, Number(winReward) || 6)) : 2;
    this.stars += earned;
    return earned;
  }

  toJSON() {
    this.syncGarage();
    return { version: 4, mech: this.mech.toJSON(),garage:this.garage,activeSlot:this.activeSlot,arena:this.arena,daily:this.daily,history:this.history, stars: this.stars,
      wins: this.wins, specialWins: this.specialWins, practiceCount: this.practiceCount, owned: [...this.owned],
      trainingBots: this.trainingBots };
  }
}
