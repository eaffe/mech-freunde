import { CATEGORIES, PARTS, COLORS, STYLES } from './Parts.js';
import { Mech } from './Mech.js';
import { MechRenderer } from './Renderer.js';
import { Pilot } from './Pilot.js';
import { PilotStore } from './Store.js';
import { TrainingBattle } from './TrainingBattle.js';
import { TRAINING_BOTS, makeTrainingMech } from './TrainingBots.js';

class MechFriendsApp {
  constructor(root) {
    this.root = root;
    this.store = new PilotStore();
    this.pilot = new Pilot();
    this.category = 'head';
    this.screen = 'hangar';
    this.battle = null;
    this.botTimer = null;
    this.toastTimer = null;
    this.rewardApplied = false;
    this.sound = false;
    this.botId = 'scout';
    this.enemy = makeTrainingMech(this.botId);
    this.saving = Promise.resolve();
  }

  async start() {
    try {
      const saved = await this.store.load();
      this.pilot = new Pilot(saved || {});
    } catch (error) {
      console.error('Lokaler Speicher nicht verfügbar:', error);
      // Im Fehlerfall ist das Spiel trotzdem testbar, der Nutzer wird informiert.
      this.showToast('⚠️ Speichern gerade nicht möglich');
    }

    this.root.addEventListener('click', event => this.onClick(event));
    window.addEventListener('popstate', () => {
      this.stopBot();
      this.screen = 'hangar';
      this.render();
    });
    window.addEventListener('pagehide', () => this.save());
    this.render();
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      const register = () => navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }
  }

  save() {
    const snapshot = this.pilot.toJSON();
    this.saving = this.saving.catch(() => {}).then(() => this.store.save(snapshot));
    this.saving.catch(error => {
      console.error('Speichern fehlgeschlagen', error);
      this.showToast('⚠️ Nicht gespeichert');
    });
    return this.saving;
  }

  speak(phrase) {
    if (!this.sound || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = 'de-DE'; utterance.rate = 0.98;
      speechSynthesis.speak(utterance);
    } catch (error) { console.warn(error); }
  }

  showToast(message) {
    document.querySelector('.toast')?.remove();
    const element = document.createElement('div');
    element.className = 'toast'; element.setAttribute('role', 'status');
    element.textContent = message; document.body.appendChild(element);
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => element.remove(), 1900);
  }

  onClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.action;

    if (action === 'category') {
      this.category = button.dataset.value;
      this.render();
      this.speak(CATEGORIES.find(cat => cat.id === this.category)?.label || '');
    }
    if (action === 'part') {
      const result = this.pilot.choose(this.category, button.dataset.value);
      if (result.ok) {
        this.save(); this.render();
        this.root.querySelector('.hangar-stage')?.classList.add('is-installing');
        this.speak(result.part.name);
        this.showToast('✨ Geschafft!');
      } else if (result.reason === 'trophy') {
        this.showToast(`🏆 ${result.cost} Siege zum Freischalten!`);
        this.speak('Gewinne mehr Trainingskämpfe!');
      } else if (result.reason === 'stars') {
        this.showToast('⭐ Noch Sterne sammeln!');
        this.speak('Du brauchst noch mehr Sterne. Übe in der Arena!');
      }
    }
    if (action === 'color') {
      const color = COLORS.find(value => value.id === button.dataset.value);
      if (!color || (color.trophyWins && this.pilot.wins < color.trophyWins)) {
        this.showToast(`🏆 ${color?.trophyWins || 10} Siege nötig!`);
        return;
      }
      this.pilot.mech.equip('color', button.dataset.value);
      this.save(); this.render(); this.speak('Neue Farbe!');
    }
    if (action === 'style') {
      const choice = STYLES.find(style => style.id === button.dataset.value);
      if (choice) {
        this.pilot.mech.equip('style', choice.id);
        this.save(); this.render(); this.speak(choice.label);
      }
    }
    if (action === 'train') this.chooseTraining();
    if (action === 'pick-bot') this.startTraining(button.dataset.value);
    if (action === 'back') this.backToHangar();
    if (action === 'attack' || action === 'shield' || action === 'special') this.playTurn(action);
    if (action === 'again') this.startTraining(this.botId);
    if (action === 'choose-again') this.chooseTraining();
    if (action === 'voice') {
      this.sound = !this.sound;
      this.render();
      if (this.sound) this.speak('Hallo! Bau deinen Mech!');
    }
  }

  render() {
    this.root.innerHTML = this.screen === 'train' ? this.trainingMarkup()
      : this.screen === 'choose' ? this.chooseMarkup() : this.hangarMarkup();
  }

  starBank() {
    return `<div class="star-bank" aria-label="${this.pilot.stars} Sterne"><span class="star">⭐</span><span>${this.pilot.stars}</span></div>`;
  }

  hangarMarkup() {
    const category = CATEGORIES.find(cat => cat.id === this.category) || CATEGORIES[0];
    const stats = this.pilot.mech.stats;
    const styleCards = STYLES.map(style => {
      const selected = this.pilot.mech.selection.style === style.id;
      return `<button class="style-card style-${style.id} ${selected ? 'is-active' : ''}"
        data-action="style" data-value="${style.id}" aria-label="Spielstil ${style.label}"
        aria-pressed="${selected}">
          <span class="style-symbol">${style.icon}</span>
          <span class="style-title">${style.label}</span>
          ${selected ? '<span class="style-check" aria-hidden="true">✓</span>' : ''}
        </button>`;
    }).join('');
    const tabs = CATEGORIES.map(cat => `
      <button class="category-tab ${cat.id === this.category ? 'is-active' : ''}"
        data-action="category" data-value="${cat.id}" aria-label="${cat.label}" aria-pressed="${cat.id === this.category}">
        <span class="category-icon">${cat.icon}</span><span>${cat.label}</span>
      </button>`).join('');

    const cards = this.category === 'color'
      ? `<div class="colors-grid">${COLORS.map(color => {
          const equipped = this.pilot.mech.selection.color === color.id;
          const locked = color.trophyWins && this.pilot.wins < color.trophyWins;
          return `<button class="color-card ${equipped ? 'is-equipped' : ''} ${locked ? 'is-locked' : ''}" data-action="color" data-value="${color.id}"
            aria-label="Farbe ${color.label}${locked ? `, ab ${color.trophyWins} Siegen` : ''}" aria-pressed="${equipped}">
            <span class="color-dot" style="background:${color.primary}">${locked ? '🔒' : equipped ? '✓' : ''}</span></button>`;
        }).join('')}</div>`
      : `<div class="part-grid">${PARTS[this.category].map(part => {
          const selected = this.pilot.mech.selection[this.category] === part.id;
          const owned = this.pilot.owns(this.category, part.id);
          const preview = this.pilot.mech.withPart(this.category, part.id);
          return `<button class="part-card ${selected ? 'is-equipped' : ''}" data-action="part" data-value="${part.id}"
            aria-label="${part.name}, ${owned ? 'vorhanden' : `${part.cost} Sterne`}" aria-pressed="${selected}">
              ${selected ? '<span class="equipped-mark">✓</span>' : ''}
              <span class="part-art">${MechRenderer.draw(preview, { viewBox: category.viewBox, label: part.name })}</span>
              <span class="part-name">${part.name}</span>
              <span class="part-cost ${owned ? 'owned' : ''}">${owned ? (selected ? '✅' : '✓') : part.trophyWins ? `🏆 ${part.trophyWins}` : `⭐ ${part.cost}`}</span>
            </button>`;
        }).join('')}</div>`;

    return `<header class="topbar">
      <div class="brand"><span class="brand-logo">🤖</span><span>MECH-FREUNDE <small class="version-chip">v0.4</small></span></div>
      ${this.starBank()}
    </header>
    <main>
      <h1 class="section-title">⚙️ Mein Mech</h1>
      <div class="hangar-stage" aria-label="Große Vorschau deines Mechs">
        <span class="stage-deco deco-one">✨</span><span class="stage-deco deco-two">🌟</span><span class="stage-deco deco-three">⚙️</span>
        ${MechRenderer.draw(this.pilot.mech)}
        <div class="stage-floor" aria-hidden="true"></div>
      </div>
      <div class="style-row" role="group" aria-label="Spielstil auswählen">${styleCards}</div>
      <div class="stats" aria-label="Mechwerte">
        <div class="stat" title="Lebenspunkte"><span class="stat-icon">❤️</span>${stats.hp}</div>
        <div class="stat" title="Stärke"><span class="stat-icon">⚡</span>${stats.attack}</div>
        <div class="stat" title="Schutz"><span class="stat-icon">🛡️</span>${stats.armor}</div>
      </div>
      <section class="builder" aria-label="Mech-Baukasten">
        <div class="category-tabs" aria-label="Bauteile wählen">${tabs}</div>
        <div class="part-heading"><span>${category.icon} ${category.label} auswählen</span><small>👆 Tippen!</small></div>
        ${cards}
      </section>
      <button class="primary-action" data-action="train" aria-label="Zur Trainingsarena">
        <span class="action-icon">🎯</span><span>Trainieren!</span><span class="action-icon">🥊</span>
      </button>
      ${this.trophyMarkup()}
      <div class="future-card" aria-label="Online zusammen spielen wird später ergänzt">
        <span class="future-icon">🌍</span><span>🔒 Online-Duell kommt später</span><span class="future-icon">👬</span>
      </div>
      <p class="footnote">⭐ Trainingssterne bleiben auf diesem Gerät. Später werden Online-Punkte getrennt und sicher gespeichert.</p>
    </main>`;
  }


  trophyMarkup() {
    const trophies = [
      { icon: '🥉', label: 'Erster Sieg', done: this.pilot.wins >= 1, count: `${Math.min(1, this.pilot.wins)}/1` },
      { icon: '⚡', label: 'Spezial-Sieg', done: this.pilot.specialWins >= 1, count: `${Math.min(1, this.pilot.specialWins)}/1` },
      { icon: '🏆', label: 'Heldenklingen', done: this.pilot.wins >= 5, count: `${Math.min(5, this.pilot.wins)}/5` },
      { icon: '🥇', label: 'Goldfarbe', done: this.pilot.wins >= 10, count: `${Math.min(10, this.pilot.wins)}/10` }
    ];
    return `<section class="trophy-panel" aria-label="Meine Pokale">
      <div class="trophy-title">🏆 Meine Pokale</div>
      <div class="trophy-grid">${trophies.map(t => `<div class="trophy-tile ${t.done ? 'earned' : 'locked'}" aria-label="${t.label} ${t.done ? 'geschafft' : t.count}">
        <span class="trophy-icon">${t.done ? t.icon : '🔒'}</span><span class="trophy-count">${t.done ? '✓' : t.count}</span>
        <span class="trophy-label">${t.label}</span></div>`).join('')}</div>
    </section>`;
  }

  chooseTraining() {
    this.stopBot();
    if (this.screen === 'hangar') {
      history.pushState({ mechFriendsScreen: 'choose' }, '', `${location.pathname}${location.search}#training`);
    }
    this.screen = 'choose';
    this.render();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  chooseMarkup() {
    return `<header class="topbar"><div class="brand"><span class="brand-logo">🤖</span><span>MECH-FREUNDE <small class="version-chip">v0.4</small></span></div>${this.starBank()}</header>
      <main>
        <div class="training-top"><button class="back-button" data-action="back" aria-label="Zurück zum Hangar"><span>⬅️</span> Hangar</button>
          <div class="round-label">🎯 Training</div></div>
        <h1 class="section-title">🤖 Wähle einen Bot!</h1>
        <div class="opponent-list">${TRAINING_BOTS.map(bot => `<button class="opponent-card" data-action="pick-bot" data-value="${bot.id}" aria-label="Gegen ${bot.label} kämpfen">
          <span class="opponent-art">${MechRenderer.draw(makeTrainingMech(bot.id), { label: bot.label })}</span>
          <span class="opponent-info"><span class="opponent-name">${bot.icon} ${bot.label}</span>
            <span class="opponent-hint">${bot.hint} &nbsp; ❤️ ${bot.hp}</span>
            <span class="opponent-reward">⭐ ${bot.reward}</span></span>
          <span class="opponent-go" aria-hidden="true">▶</span>
        </button>`).join('')}</div>
      </main>`;
  }

  battleFxState() {
    const event = this.battle?.lastEvent || {};
    const playerClass = event.actor === 'player' && ['hit', 'miss', 'special'].includes(event.kind) ? 'is-attacking'
      : event.actor === 'bot' && event.kind === 'hit' ? 'is-hit'
      : event.actor === 'player' && event.kind === 'guard' ? 'is-guard'
      : event.actor === 'bot' && event.kind === 'miss' ? 'is-safe' : '';
    const botClass = event.actor === 'bot' && event.kind === 'hit' ? 'is-attacking'
      : event.actor === 'player' && ['hit', 'special'].includes(event.kind) ? 'is-hit'
      : event.actor === 'bot' && event.kind === 'guard' ? 'is-guard'
      : event.actor === 'player' && event.kind === 'miss' ? 'is-safe' : '';
    const special = event.kind === 'special';
    const monitor = event.actor === 'player' && ['hit','special'].includes(event.kind)
      ? `<div class="monitor-fx shot-right ${special ? 'special-beam' : ''}"></div><div class="monitor-burst right">-${event.damage}</div>${special ? '<div class="electric-ring right"></div>' : '<div class="spark-burst right">✴</div>'}`
      : event.actor === 'bot' && event.kind === 'hit'
        ? `<div class="monitor-fx shot-left"></div><div class="monitor-burst left">-${event.damage}</div><div class="spark-burst left">✴</div>`
        : event.kind === 'guard'
          ? `<div class="monitor-guard ${event.actor === 'bot' ? 'right' : 'left'}">🛡️</div>`
          : event.kind === 'miss' ? `<div class="monitor-miss ${event.actor === 'bot' ? 'left' : 'right'}">💨</div>`
          : event.kind === 'blocked' ? `<div class="monitor-guard left">🛡️</div>` : '';
    const playerBadge = event.actor === 'bot' && event.kind === 'hit' ? `<div class="battle-badge damage">-${event.damage}</div>`
      : event.actor === 'player' && event.kind === 'guard' ? '<div class="battle-badge guard">🛡️</div>' : '';
    const botBadge = event.actor === 'player' && ['hit','special'].includes(event.kind) ? `<div class="battle-badge damage">-${event.damage}</div>`
      : event.actor === 'bot' && event.kind === 'guard' ? '<div class="battle-badge guard">🛡️</div>' : '';
    return { playerClass, botClass, playerBadge, botBadge, monitor };
  }

  trainingMarkup() {
    const b = this.battle;
    if (!b) return '';
    const me = Math.max(0, Math.round(b.playerHp / b.maxPlayerHp * 100));
    const bot = Math.max(0, Math.round(b.botHp / b.maxBotHp * 100));
    const completed = b.finished;
    const blocked = b.turn !== 'player' || completed;
    const fx = this.battleFxState();
    const power = `<div class="power-meter" aria-label="Spezialenergie ${b.power} von 3">${[1,2,3].map(i => `<span class="power-cell ${b.power >= i ? 'charged' : ''}"></span>`).join('')}</div>`;
    const resultMarkup = completed ? `<section class="victory" aria-live="polite">
        <div class="emoji">${b.winner === 'player' ? '🏆⚡' : '🤖💜'}</div>
        <h2>${b.winner === 'player' ? 'Gewonnen!' : 'Weiter trainieren!'}</h2>
        <p>⭐ +${b.reward || 0}</p>
        <button class="primary-action" data-action="again" aria-label="Noch einmal trainieren"><span class="action-icon">🔁</span> Nochmal!</button>
        <button class="back-button result-back" data-action="choose-again" aria-label="Anderen Gegner wählen">🤖 Andere Bots</button>
      </section>` : `<div class="battle-message" role="status" aria-live="polite"><span>${b.lastEvent.icon}</span>${b.lastEvent.message}</div>
      <div class="battle-actions">
        <button class="battle-button attack" data-action="attack" ${blocked ? 'disabled' : ''} aria-label="Angreifen"><span class="battle-icon">⚔️</span><span>Angriff</span></button>
        <button class="battle-button shield" data-action="shield" ${blocked ? 'disabled' : ''} aria-label="Mit Schild schützen"><span class="battle-icon">🛡️</span><span>Schutz</span></button>
        <button class="battle-button special" data-action="special" ${blocked || !b.specialReady ? 'disabled' : ''} aria-label="Spezialangriff ${b.specialReady ? 'bereit' : 'lädt sich auf'}"><span class="battle-icon">⚡</span><span>Spezial</span>${power}</button>
      </div>`;
    return `<header class="topbar"><div class="brand"><span class="brand-logo">🤖</span><span>MECH-FREUNDE <small class="version-chip">v0.4</small></span></div>${this.starBank()}</header>
      <main>
        <div class="training-top"><button class="back-button" data-action="back" aria-label="Zurück zum Baukasten"><span>⬅️</span> Hangar</button><div class="round-label">🎯 Training</div></div>
        <h1 class="section-title">⚔️ ${b.bot.icon} ${b.bot.label}</h1>
        <section class="arena" aria-label="Roboterduell">
          <div class="arena-monitor" aria-hidden="true"><div class="scanline"></div>${fx.monitor}</div>
          <div class="fighters">
            <div class="fighter-card"><div class="fighter-name">🟢 Mein Mech</div>
              <div class="fighter-visual ${fx.playerClass}">${MechRenderer.draw(this.pilot.mech)}${fx.playerBadge}</div>
              <div class="hp-track" aria-label="Eigene Energie ${me} Prozent"><div class="hp-fill" style="--pct:${me}%"></div></div>
              <div class="hp-number">❤️ ${b.playerHp} / ${b.maxPlayerHp}</div></div>
            <div class="fighter-card"><div class="fighter-name">${b.bot.icon} ${b.bot.label}</div>
              <div class="fighter-visual enemy ${fx.botClass}">${MechRenderer.draw(this.enemy, { label: b.bot.label })}${fx.botBadge}</div>
              <div class="hp-track" aria-label="Gegnerische Energie ${bot} Prozent"><div class="hp-fill enemy" style="--pct:${bot}%"></div></div>
              <div class="hp-number">❤️ ${b.botHp} / ${b.maxBotHp}</div></div>
          </div>
        </section>
        ${resultMarkup}
        <p class="small-hint">${blocked && !completed ? '⏳ Der Bot ist dran …' : '👆 Tippe auf ein Symbol!'}</p>
      </main>`;
  }

  startTraining(botId = this.botId) {
    this.stopBot();
    this.botId = TRAINING_BOTS.some(bot => bot.id === botId) ? botId : 'scout';
    this.enemy = makeTrainingMech(this.botId);
    this.battle = new TrainingBattle(this.pilot.mech, this.botId);
    this.rewardApplied = false;
    if (this.screen === 'hangar') {
      history.pushState({ mechFriendsScreen: 'train' }, '', `${location.pathname}${location.search}#training`);
    }
    this.screen = 'train';
    this.render();
    this.speak('Trainingsarena! Angriff, Schutz oder Spezial.');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  playTurn(action) {
    if (!this.battle || this.battle.finished || this.battle.turn !== 'player') return;
    const result = this.battle.act(action);
    if (!result) return;
    this.render(); this.speak(result.message);
    if (this.battle.finished) return this.completeTraining();

    this.botTimer = setTimeout(() => {
      if (this.screen !== 'train' || !this.battle) return;
      const response = this.battle.botAction();
      if (!response) return;
      this.render(); this.speak(response.message);
      if (this.battle.finished) this.completeTraining();
    }, 760);
  }

  completeTraining() {
    if (!this.battle?.finished || this.rewardApplied) return;
    this.rewardApplied = true;
    this.battle.reward = this.pilot.finishTraining(this.battle.winner === 'player', this.battle.usedSpecial, this.battle.bot.reward);
    if (this.battle.winner === 'player' && [1, 5, 10].includes(this.pilot.wins)) this.showToast('🏆 Neuer Pokal!');
    this.save(); this.render();
    this.speak(this.battle.winner === 'player' ? 'Gewonnen! Du bekommst Sterne!' : 'Gut geübt! Du bekommst Sterne!');
  }

  stopBot() { clearTimeout(this.botTimer); this.botTimer = null; }

  backToHangar() {
    this.stopBot();
    if (history.state?.mechFriendsScreen === 'train') {
      history.back();
    } else {
      this.screen = 'hangar'; this.render();
    }
  }
}

const app = new MechFriendsApp(document.getElementById('app'));
app.start().catch(error => {
  console.error(error);
  document.getElementById('app').textContent = '🤖 Die App konnte nicht gestartet werden.';
});
