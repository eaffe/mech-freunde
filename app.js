import { CATEGORIES, PARTS, COLORS, STYLES } from './Parts.js';
import { Mech } from './Mech.js';
import { MechRenderer } from './Renderer.js';
import { Pilot } from './Pilot.js';
import { PilotStore } from './Store.js';
import { TrainingBattle } from './TrainingBattle.js';
import { TRAINING_BOTS, getTrainingBot, getAdaptiveTrainingBotStats } from './TrainingBots.js';
import { OnlineService, ONLINE_PAINTS, ONLINE_AVATARS, NAME_FIRST, NAME_SECOND } from './OnlineService.js';

const safeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

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
    this.botEditId = 'scout';
    this.botEditCategory = 'head';
    this.enemy = this.pilot.trainingMech(this.botId);
    this.saving = Promise.resolve();
    this.online = new OnlineService();
    this.onlineProfile = null;
    this.onlineMatch = null;
    this.onlineBusy = false;
    this.onlineError = '';
    this.onlineShopOpen = false;
    this.onlineProfileOpen = false;
    this.onlineLeaderboardOpen = false;
    this.onlineLeaderboard = null;
    this.onlineAvatarDraft = '🤖';
    this.onlinePublicDraft = false;
    this.onlineNicknameDraft='';
    this.onlineAccountOpen=false;
    this.onlineFriendsOpen=false;
    this.onlineTournamentOpen=false;
    this.onlineAccount=null;
    this.onlineFriends=[];
    this.onlineInvites=[];
    this.onlineHistoryOpen=false;
    this.onlineHistory=[];
    this.onlineFriendCode='';
    this.tournament=null;
    this.tournamentCode='';
    this.cloudOwner=null;
    this.localAccountOwner=null;
    this.localDirty=false;
    this.inviteCode=null;
    this.invitedTournament=null;
    this.tourneyPollTick=0;
    this.onlinePollTimer = null;
    this.onlinePolling = false;
    this.onlineDismissedMatch = null;
  }

  async start() {
    try {
      const saved = await this.store.load();
      this.pilot = new Pilot(saved || {});
      this.localAccountOwner=await this.store.load('pilot-owner')||null;
    } catch (error) {
      console.error('Lokaler Speicher nicht verfügbar:', error);
      // Im Fehlerfall ist das Spiel trotzdem testbar, der Nutzer wird informiert.
      this.showToast('⚠️ Speichern gerade nicht möglich');
    }

    this.root.addEventListener('click', event => this.onClick(event));
    window.addEventListener('popstate', () => {
      this.stopBot();
      this.stopOnlinePoll();
      this.screen = 'hangar';
      this.render();
    });
    window.addEventListener('pagehide', () => { this.stopOnlinePoll(); this.save(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.screen === 'online') this.refreshOnline();
    });
    this.render();
    const invite=(location.hash.match(/^#invite=([A-HJ-NP-Z2-9]{6})$/i)||[])[1];
    const tourney=(location.hash.match(/^#turnier=([A-HJ-NP-Z2-9]{6})$/i)||[])[1];
    if(invite){this.inviteCode=invite.toUpperCase();this.openOnline();}
    else if(tourney){this.invitedTournament=tourney.toUpperCase();this.openOnline().then(()=>{this.closeOnlineSubpages();this.onlineTournamentOpen=true;this.render();});}
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      const register = () => navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
      if (document.readyState === 'complete') register();
      else window.addEventListener('load', register, { once: true });
    }
  }

  save() {
    const snapshot = this.pilot.toJSON();
    this.localDirty=true;
    const saveOwner=this.cloudOwner;
    this.saving = this.saving.catch(() => {}).then(async () => {
      await this.store.save(snapshot);
      if(saveOwner && saveOwner===this.cloudOwner) {
        try {
          const account=await this.online.getAccount();
          if(account?.id===saveOwner){await this.online.saveGame(snapshot);this.localDirty=false;}
        } catch(e) {console.warn('Cloud-Backup aufgeschoben:',e.message);}
      }
    });
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
    if (action==='garage-select') { if(this.pilot.selectGarage(Number(button.dataset.value))){this.save();this.render();}return; }
    if (action==='garage-add') {if(this.pilot.addGarage()){this.save();this.render();}else this.showToast('🏠 Maximal fünf Mechs');return;}
    if (action==='garage-rename') {const name=window.prompt('Wie soll dein Mech heißen?',this.pilot.garage[this.pilot.activeSlot].name);if(name!==null){if(this.pilot.renameGarage(name)){this.save();this.render();}else this.showToast('⚠️ Name: 1 bis 22 Zeichen');}return;}
    if (action==='mission-claim') {if(this.pilot.claimMission(button.dataset.value)){this.save();this.render();this.showToast('⭐ Mission geschafft!');}return;}
    if (action==='arena-select') {if(['space','volcano','ice','city'].includes(button.dataset.value)){this.pilot.arena=button.dataset.value;this.save();this.render();}return;}
    if (action === 'online') { this.openOnline(); return; }
    if (action === 'online-rank-entry') { this.openOnline(true); return; }
    if (action.startsWith('online-')) { this.handleOnlineAction(action, button); return; }
    if (action === 'train') this.chooseTraining();
    if (action === 'pick-bot') this.startTraining(button.dataset.value);
    if (action === 'edit-bot') { this.openBotEditor(button.dataset.value); return; }
    if (action === 'bot-edit-back') { this.screen='choose'; this.render(); return; }
    if (action === 'bot-edit-fight') { this.startTraining(this.botEditId); return; }
    if (action === 'bot-edit-reset') {
      if (window.confirm('Gegner wirklich auf die ursprüngliche Ausstattung zurücksetzen?')) {
        this.pilot.resetTrainingBot(this.botEditId); this.save(); this.render();
        this.showToast('🔄 Gegner zurückgesetzt');
      }
      return;
    }
    if (action === 'bot-edit-category') { this.botEditCategory=button.dataset.value; this.render(); return; }
    if (action === 'bot-edit-part' || action === 'bot-edit-color' || action === 'bot-edit-style') {
      const category = action === 'bot-edit-part' ? this.botEditCategory : action === 'bot-edit-color' ? 'color' : 'style';
      if (this.pilot.equipTrainingBot(this.botEditId,category,button.dataset.value)) {
        this.save(); this.render(); this.showToast('🔧 Gegner ausgerüstet!');
      }
      return;
    }
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
    document.documentElement.dataset.arena=this.pilot.arena;
    this.root.innerHTML = this.screen === 'online' ? this.onlineMarkup()
      : this.screen === 'bot-editor' ? this.botEditorMarkup()
      : this.screen === 'train' ? this.trainingMarkup()
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
      ? `<div class="colors-grid">${COLORS.filter(color => !color.onlineOnly).map(color => {
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
      <div class="brand"><span class="brand-logo">🤖</span><span>MECH-FREUNDE <small class="version-chip">v1.1</small></span></div>
      ${this.starBank()}
    </header>
    <main>
      <h1 class="section-title">⚙️ Mein Mech</h1>
      <section class="feature-panel" aria-label="Meine Mech-Garage">
        <div class="feature-title">🏠 Meine Mech-Garage</div>
        <div class="garage-tabs">${this.pilot.garage.map((slot,i)=>`<button data-action="garage-select" data-value="${i}" class="garage-tab ${i===this.pilot.activeSlot?'selected':''}" aria-pressed="${i===this.pilot.activeSlot}">${safeText(slot.name)}</button>`).join('')}</div>
        <div class="feature-buttons"><button data-action="garage-rename" class="online-small">✏️ Mech benennen</button><button data-action="garage-add" class="online-small" ${this.pilot.garage.length>=5?'disabled':''}>➕ Kopie als neuen Mech</button></div>
      </section>
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
      <section class="feature-panel" aria-label="Meine Trainingsstatistik"><div class="feature-title">📜 Trainingsverlauf · ${this.pilot.wins} Siege</div>
        ${this.pilot.history.length?this.pilot.history.slice(0,5).map(h=>`<p class="history-row">${h.won?'🏆':'💪'} ${safeText(h.bot)} · ${h.won?'Gewonnen':'Geübt'} · ${safeText(h.time.slice(0,10))}</p>`).join(''):'<p class="feature-hint">Nach deinen ersten Kämpfen siehst du hier den Verlauf.</p>'}
      </section>
      <section class="feature-panel" aria-label="Tägliche Missionen"><div class="feature-title">🎯 Tägliche Missionen</div>
        <p class="feature-hint">Jeden Tag neue Aufgaben für Trainingssterne.</p>
        ${this.pilot.missions.map(m=>`<div class="mission-row"><span>${safeText(m.name)} · ${Math.min(m.current,m.goal)}/${m.goal}</span>
          <button data-action="mission-claim" data-value="${m.id}" ${m.current<m.goal||this.pilot.daily.claimed.includes(m.id)?'disabled':''}>${this.pilot.daily.claimed.includes(m.id)?'✅':'⭐ +'+m.reward}</button></div>`).join('')}
      </section>
      <section class="feature-panel" aria-label="Kampfarena wählen"><div class="feature-title">🌌 Kampfarenen</div>
        <div class="arena-choices">${[['space','🚀 Weltraum'],['volcano','🌋 Vulkan'],['ice','🧊 Eiswelt'],['city','🌆 Stadt']].map(([id,name])=>`<button data-action="arena-select" data-value="${id}" class="arena-choice ${id===this.pilot.arena?'selected':''}" aria-pressed="${id===this.pilot.arena}">${name}</button>`).join('')}</div>
      </section>
      <button class="primary-action online-entry" data-action="online" aria-label="Online mit Freunden spielen">
        <span class="action-icon">🌍</span><span>Freunde-Duell</span><span class="action-icon">👫</span>
      </button>
      <button class="hangar-leaderboard" data-action="online-rank-entry" aria-label="Online-Bestenliste ansehen">🏆 Bestenliste ansehen <span aria-hidden="true">→</span></button>
      <p class="footnote">⭐ Trainingssterne sind offline. 🏅 Online-Punkte werden getrennt gespeichert.</p>
    </main>`;
  }



  onlineMarkup() {
    const p = this.onlineProfile;
    const b = this.onlineMatch;
    const busy = this.onlineBusy;
    const header = `<header class="topbar"><div class="brand"><span class="brand-logo">🤖</span><span>MECH-FREUNDE <small class="version-chip">v1.1</small></span></div>${this.starBank()}</header>
      <main><div class="training-top"><button class="back-button" data-action="online-back" aria-label="Zurück zum Hangar"><span>⬅️</span> Hangar</button>
      <div class="round-label">🌍 Privat</div></div><h1 class="section-title">🌍 Freunde-Duell</h1>`;
    if (!this.online.configured) return `${header}
      <div class="online-panel online-setup"><div class="online-big-icon">🔒🌍</div>
      <h2>Online vorbereiten</h2><p>Der Spielleiter richtet den Online-Zugang ein.</p>
      <span class="online-help">🛠️ Supabase-Verbindung fehlt</span></div></main>`;
    if (this.onlineError) return `${header}
      <div class="online-panel"><div class="online-big-icon">📡</div><h2>Verbindung prüfen</h2>
      <p>${this.onlineError}</p><button class="online-wide" data-action="online-retry">🔄 Nochmal</button></div></main>`;
    if (!p) return `${header}<div class="online-panel"><div class="online-big-icon">🔄</div><h2>Verbinden …</h2></div></main>`;
    const bank = `<div class="online-bank"><span>🏅 ${p.points} Punkte</span><span>🏆 ${p.wins}</span></div><div class="online-player-tag">${safeText(p.avatar)} ${safeText(p.nickname)}</div>
      <nav class="online-quick-nav" aria-label="Online-Navigation">
        <button class="online-quick-link ${this.onlineLeaderboardOpen?'is-active':''}" data-action="online-leaderboard" aria-pressed="${this.onlineLeaderboardOpen}">🏆 Bestenliste</button>
        <button class="online-quick-link ${this.onlineHistoryOpen?'is-active':''}" data-action="online-history">📜 Verlauf</button>
        <button class="online-quick-link ${this.onlineProfileOpen?'is-active':''}" data-action="online-profile" aria-pressed="${this.onlineProfileOpen}">🪪 Profil</button>
        <button class="online-quick-link ${this.onlineFriendsOpen?'is-active':''}" data-action="online-friends">👥 Freunde${this.onlineInvites.length?' ('+this.onlineInvites.length+')':''}</button>
        <button class="online-quick-link ${this.onlineAccountOpen?'is-active':''}" data-action="online-account">🔐 Konto</button>
        <button class="online-quick-link ${this.onlineTournamentOpen?'is-active':''}" data-action="online-tourney">🏆 Turnier</button>
      </nav>`;
    if(this.onlineHistoryOpen)return this.onlineHistoryMarkup(header,bank,busy);
    if(this.onlineAccountOpen)return this.onlineAccountMarkup(header,bank,busy);
    if(this.onlineFriendsOpen)return this.onlineFriendsMarkup(header,bank,busy);
    if(this.onlineTournamentOpen)return this.onlineTourneyMarkup(header,bank,busy);
    if (this.onlineProfileOpen) return this.onlineProfileMarkup(header,bank,busy);
    if (this.onlineLeaderboardOpen) return this.onlineLeaderboardMarkup(header,bank,busy);
    if (b && (b.status === 'waiting' || b.status === 'active' || b.status === 'finished')) {
      const mySide = b.side;
      const yourTurn = b.turn === mySide;
      const playerHp = mySide==='host'?b.hostHp:b.guestHp;
      const enemyHp = mySide==='host'?b.guestHp:b.hostHp;
      const yourPower = mySide==='host'?b.hostPower:b.guestPower;
      const myLook = new Mech(mySide==='host'?b.hostLook:b.guestLook);
      const otherLook = new Mech(mySide==='host'?b.guestLook:b.hostLook);
      const last = b.event || {};
      const byYou = last.by === mySide;
      const eventIcon = last.kind === 'special' ? '⚡' : last.kind === 'hit' ? '💥' : last.kind === 'miss' ? '💨'
        : last.kind === 'guard' ? '🛡️' : '⚔️';
      const myName = mySide === 'host' ? b.hostName : b.guestName;
      const otherName = mySide === 'host' ? b.guestName : b.hostName;
      const myAvatar = mySide === 'host' ? b.hostAvatar : b.guestAvatar;
      const otherAvatar = mySide === 'host' ? b.guestAvatar : b.hostAvatar;
      const requested = mySide === 'host' ? b.rematchHost : b.rematchGuest;
      const otherRequested = mySide === 'host' ? b.rematchGuest : b.rematchHost;
      const rematchDeclined=Boolean(b.rematchDeclined);
      const result = b.status === 'waiting' ? `<div class="online-panel"><div class="online-big-icon">⏳</div>
         <p>Code an Freund weitergeben</p><div class="room-code" aria-label="Raumcode ${b.code}">${b.code}</div>
         <button class="online-wide" data-action="online-copy">📋 Code kopieren</button>
         <button class="online-wide invite-whatsapp" data-action="online-whatsapp">💬 Per WhatsApp einladen</button>
         <button class="online-small" data-action="online-cancel" ${busy?'disabled':''}>❌ Raum schließen</button></div>`
        : b.status === 'finished' ? `<div class="online-panel"><div class="online-big-icon">${b.winner===mySide?'🏆🎉':'🤖💜'}</div>
          <h2>${last.kind==='forfeit' ? (b.winner===mySide?'Dein Gegner hat aufgegeben! +10 🏅':'Du hast aufgegeben.') : (b.winner===mySide?'Gewonnen! +10 🏅':'Gut gespielt!')}</h2>
          ${rematchDeclined ? '<p class="rematch-declined" role="status">🚫 Kein Rückkampf: Ein Spieler hat abgelehnt.</p>'
            : otherRequested ? '<p class="rematch-invite">💌 Dein Freund möchte noch einmal kämpfen!</p>' : ''}
          ${rematchDeclined ? '' : `<div class="rematch-choices">
            <button class="online-wide rematch-primary" data-action="online-rematch" ${busy||requested?'disabled':''}>${requested?'⏳ Warte auf deinen Freund …':'🔁 Noch eine Runde? Ja!'}</button>
            <button class="online-wide rematch-decline" data-action="online-rematch-decline" ${busy?'disabled':''}>🙅 Nein, danke</button>
          </div>`}
          <button class="online-small" data-action="online-new" ${busy?'disabled':''}>🆕 Anderes Duell erstellen</button>
          <button class="online-small" data-action="online-lobby">🏠 Zur Übersicht</button></div>`
        : `<div class="online-message" role="status" aria-live="polite">${eventIcon} ${last.kind==='join'?'Bereit!':last.kind==='guard'?(byYou?'Schild an!':'Freund schützt sich!'):
          ['hit','special'].includes(last.kind)?`${byYou?'Treffer!':'Treffer vom Freund!'} -${last.damage}`:
          last.kind==='miss'?'Daneben!':yourTurn?'Du bist dran!':'Freund ist dran!'}</div>
          <div class="online-turn">${yourTurn?'🟢 Du bist dran!':'⏳ Freund ist dran …'}</div>
          <div class="battle-actions"><button class="battle-button attack" data-action="online-attack" ${!yourTurn||busy?'disabled':''} aria-label="Online angreifen"><span class="battle-icon">⚔️</span>Angriff</button>
          <button class="battle-button shield" data-action="online-shield" ${!yourTurn||busy?'disabled':''} aria-label="Online Schild"><span class="battle-icon">🛡️</span>Schutz</button>
          <button class="battle-button special" data-action="online-special" ${!yourTurn||busy||yourPower<3?'disabled':''} aria-label="Online Spezialangriff"><span class="battle-icon">⚡</span>Spezial<div class="power-meter">${[1,2,3].map(i=>`<span class="power-cell ${yourPower>=i?'charged':''}"></span>`).join('')}</div></button></div>
           <button class="online-forfeit" data-action="online-forfeit" ${busy?'disabled':''} aria-label="Duell aufgeben">🏳️ Duell aufgeben</button>`;
      return `${header}${bank}${b.status === 'waiting' ? '' : `<section class="arena online-arena" aria-label="Freundesduell">
        <div class="arena-monitor"><div class="scanline"></div>${last.kind==='special'?'<div class="electric-ring right"></div>':''}</div>
        <div class="fighters"><div class="fighter-card"><div class="fighter-name">${safeText(myAvatar)} ${safeText(myName)}</div>
         <div class="fighter-visual">${MechRenderer.draw(myLook)}</div><div class="hp-track"><div class="hp-fill" style="--pct:${playerHp}%"></div></div><div class="hp-number">❤️ ${playerHp} / 100</div></div>
        <div class="fighter-card"><div class="fighter-name">${safeText(otherAvatar)} ${safeText(otherName)}</div><div class="fighter-visual enemy">${MechRenderer.draw(otherLook)}</div>
         <div class="hp-track"><div class="hp-fill enemy" style="--pct:${enemyHp}%"></div></div><div class="hp-number">❤️ ${enemyHp} / 100</div></div></div></section>`}
        ${result}<p class="footnote">🔒 Nur mit Code. Kein Chat. Punkte kommen vom Spielserver.</p></main>`;
    }
    if (this.onlineShopOpen) {
      return `${header}${bank}<div class="online-panel"><div class="online-big-icon">🎨</div><h2>Mech-Farben</h2>
        <div class="online-shop-grid"><button class="online-paint ${p.activePaint==='none'?'equipped':''}" data-action="online-equip" data-value="none" ${busy?'disabled':''}>
          <span class="paint-orb">🎨</span><strong>Normal</strong><small>${p.activePaint==='none'?'✓':'✅'}</small></button>
        ${ONLINE_PAINTS.map(item=>{const owned=p.paints.includes(item.id);const selected=p.activePaint===item.id;
         return `<button class="online-paint ${selected?'equipped':''}" data-action="${owned?'online-equip':'online-buy'}" data-value="${item.id}" ${busy?'disabled':''}
           aria-label="${item.name}, ${owned?'gekauft':`${item.cost} Punkte`}"><span class="paint-orb">${item.icon}</span><strong>${item.name}</strong>
           <small>${selected?'✓':owned?'✅':`🏅 ${item.cost}`}</small></button>`}).join('')}</div>
        <button class="online-wide" data-action="online-shop-back">⬅️ Zurück</button></div></main>`;
    }
    return `${header}${bank}<div class="online-panel"><div class="online-big-icon">👫⚔️</div>
       <button class="online-wide" data-action="online-create" ${busy?'disabled':''}>➕ Arena erstellen</button>
       <div class="online-join"><label for="room-code">🔑 Freundes-Code</label><input id="room-code" inputmode="text" type="text"
        maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC234" aria-label="Sechsstelligen Code eingeben" />
       <button class="online-wide" data-action="online-join" ${busy?'disabled':''}>▶ Beitreten</button></div>
       ${this.inviteCode?`<p class="invite-notice">💌 Einladung zum Duell <strong>${safeText(this.inviteCode)}</strong>. ${this.onlineAccount?.is_anonymous?'Erstelle zunächst dein Konto – deine Einladung bleibt gespeichert.':'Du kannst jetzt beitreten!'}</p>`:''}
       <button class="online-wide online-shop-link" data-action="online-shop">🎨 Mech-Shop 🏅</button>
       <div class="online-lobby-extras"><button class="online-wide" data-action="online-account">🔐 Konto / Gerätewechsel</button>
       <button class="online-wide" data-action="online-friends">👥 Freundesliste</button>
       <button class="online-wide" data-action="online-tourney">🏆 Freundesturnier</button>
       <button class="online-wide" data-action="online-history">📜 Kampfverlauf</button>
       <button class="online-wide" data-action="online-profile">🪪 Mein Name & Icon</button>
       <button class="online-wide" data-action="online-leaderboard">🏆 Bestenliste</button></div></div>
       <p class="footnote">🛡️ Nur Fantasienamen & Icons. Kein Chat. Bestenliste freiwillig.</p></main>`;
  }


  onlineHistoryMarkup(header,bank,busy){
    const p=this.onlineProfile;
    return `${header}${bank}<section class="online-panel"><div class="online-big-icon">📜</div><h2>Meine Online-Statistik</h2>
      <p>🏆 ${Number(p.wins)||0} Siege · 💪 ${Number(p.losses)||0} Niederlagen · 🏅 ${Number(p.points)||0} Punkte</p>
      ${this.onlineHistory.length?this.onlineHistory.map(h=>`<p class="history-row">${h.won?'🏆 Sieg':'💪 Niederlage'} gegen ${safeText(h.avatar)} ${safeText(h.opponent)} ${h.forfeit?'🏳️':''} · ${safeText(String(h.time||'').slice(0,10))}</p>`).join(''):'<p>Du hast noch keine beendeten Online-Duelle.</p>'}
      <button class="online-small" data-action="online-history-back">⬅️ Zurück</button></section></main>`;
  }

  onlineAccountMarkup(header,bank,busy){
    const user=this.onlineAccount;
    const guest=!user||user.is_anonymous;
    const email=user?.email||'';
    return `${header}${bank}<section class="online-panel"><div class="online-big-icon">🔐</div><h2>Mein Spielerkonto</h2>
      <p>${guest?'Noch als Gast unterwegs. Damit dein Mech auf anderen Geräten bleibt, sichere dein Konto mit einer bestätigten E-Mail und einem Passwort.':'📨 Gespeichertes Konto: '+safeText(email)}</p>
      <p class="online-privacy-note">Für Kinder: Bitte eine E-Mail-Adresse der Eltern oder Erziehungsberechtigten verwenden. Ein Erwachsener sollte die Registrierung begleiten.</p>
      ${guest?`<div class="account-form"><label>Eltern-E-Mail <input id="account-email" type="email" inputmode="email" autocomplete="email" placeholder="familie@beispiel.de" /></label>
        <button class="online-wide" data-action="online-account-link" ${busy?'disabled':''}>📩 E-Mail bestätigen & Gastkonto sichern</button>
        <p class="feature-hint">Nach dem Klick kommt eine Bestätigungs-E-Mail. Öffne den Link, kehre hierher zurück und lege ein Passwort fest.</p>
        <label>Bestehendes Konto: Passwort <input id="account-password" type="password" autocomplete="current-password" placeholder="Passwort" /></label>
        <button class="online-wide" data-action="online-account-login" ${busy?'disabled':''}>🔓 Auf anderem Gerät anmelden</button></div>`:
        `<div class="account-form"><label>Neues Passwort (mind. 8 Zeichen) <input id="account-password" type="password" autocomplete="new-password" minlength="8" placeholder="Passwort festlegen oder ändern" /></label>
        <button class="online-wide" data-action="online-account-password" ${busy?'disabled':''}>💾 Passwort festlegen / ändern</button>
        <p class="feature-hint">Deine Mech-Garage und Trainingssterne werden bei Änderungen in deinem Konto gespeichert. Online-Punkte bleiben an dieser Spieler-ID.</p>
        <button class="online-small" data-action="online-account-logout" ${busy?'disabled':''}>🚪 Von diesem Gerät abmelden</button></div>`}
      <button class="online-small" data-action="online-account-back">⬅️ Zurück</button></section></main>`;
  }

  onlineFriendsMarkup(header,bank,busy){
    return `${header}${bank}<section class="online-panel"><div class="online-big-icon">👥</div><h2>Meine Freunde</h2>
      <p>Teile nur deinen Freundescode. Keine öffentlichen Suchprofile und kein Chat.</p>
      <div class="room-code" aria-label="Mein Freundescode">${safeText(this.onlineFriendCode||'Lade …')}</div>
      <div class="account-form"><label>Freundescode eingeben <input id="friend-code-input" maxlength="8" autocapitalize="characters" autocomplete="off" placeholder="A1B2C3D4" /></label>
      <button class="online-wide" data-action="online-friend-add" ${busy?'disabled':''}>➕ Freund hinzufügen</button></div>
      ${this.onlineInvites.length?`<h3>💌 Einladungen zu Duellen</h3><div class="friends-rows">${this.onlineInvites.map(i=>`<div class="friend-row"><span>${safeText(i.avatar)} ${safeText(i.name)} lädt dich ein!</span><button data-action="online-friend-join" data-value="${safeText(i.id)}">⚔️ Annehmen</button></div>`).join('')}</div>`:''}
      ${this.onlineFriends.length?`<div class="friends-rows">${this.onlineFriends.map(f=>`<div class="friend-row"><span>${safeText(f.avatar)} <strong>${safeText(f.nickname)}</strong> <small>${f.accepted?'✅ Freunde':f.incoming?'💌 Anfrage':'⏳ Angefragt'}</small></span>
       <div>${f.accepted && this.onlineMatch?.status==='waiting'?`<button data-action="online-friend-invite" data-value="${safeText(f.id)}">💌 Duell</button>`:''}${!f.accepted&&f.incoming?`<button data-action="online-friend-accept" data-value="${safeText(f.id)}">✅ Annehmen</button>`:''}
       <button data-action="online-friend-remove" data-value="${safeText(f.id)}" aria-label="Freund entfernen">✖️</button></div></div>`).join('')}</div>`:'<p>Hier erscheinen deine Freunde und Anfragen.</p>'}
      <p class="feature-hint">Für ein Duell: Arena erstellen und einen Einladungslink per WhatsApp teilen.</p>
      <button class="online-small" data-action="online-friends-back">⬅️ Zurück</button></section></main>`;
  }

  onlineTourneyMarkup(header,bank,busy){
    const t=this.tournament;
    return `${header}${bank}<section class="online-panel"><div class="online-big-icon">🏆</div><h2>Freundesturnier</h2>
      <p>Vier Spieler. Zwei Halbfinale, danach das Finale. Der Sieger steht im Turnierbaum.</p>
      ${t?`<div class="room-code">${safeText(t.code)}</div><p>${t.status==='waiting'?'⏳ Warte auf vier Teilnehmer …':t.status==='finished'?'🎉 Turnier beendet!':'⚔️ Turnier läuft!'}</p>
        <div class="tourney-grid">${(t.players||[]).map(x=>`<div class="tourney-player">${safeText(x.avatar)} ${safeText(x.name)} · Platz ${Number(x.slot)}</div>`).join('')}
          ${(t.bracket||[]).map(x=>`<div class="tourney-bracket"><strong>${safeText(x.label)}</strong><span>${safeText(x.host||'Offen')} ⚔️ ${safeText(x.guest||'Offen')}</span><small>${x.winner?'🏆 '+safeText(x.winner):x.status==='active'?'⏳ Läuft …':'–'}</small></div>`).join('')}</div>
        ${t.myMatchId?`<button class="online-wide" data-action="online-tourney-battle">⚔️ Meinen Turnierkampf spielen</button>`:''}
        <button class="online-wide invite-whatsapp" data-action="online-tourney-share">💬 Turnier per WhatsApp teilen</button>
        <button class="online-small" data-action="online-tourney-refresh" ${busy?'disabled':''}>🔄 Turnierstand aktualisieren</button>`:
        `<div class="account-form"><button class="online-wide" data-action="online-tourney-create" ${busy?'disabled':''}>➕ Turnier erstellen</button>
          <label>Turniercode <input id="tourney-code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC234" value="${safeText(this.invitedTournament||'')}" /></label>
          <button class="online-wide" data-action="online-tourney-join" ${busy?'disabled':''}>▶ Dem Turnier beitreten</button></div>`}
      <p class="feature-hint">Jeder Spieler braucht sein eigenes Gerät. Für das Finale müssen die beiden Halbfinalkämpfe abgeschlossen sein.</p>
      <button class="online-small" data-action="online-tourney-back">⬅️ Zurück</button></section></main>`;
  }

  onlineProfileMarkup(header,bank,busy) {
    const p=this.onlineProfile;
    const b=this.onlineMatch;
    return `${header}${bank}<div class="online-panel"><div class="online-big-icon">🪪</div><h2>Mein Spielerprofil</h2>
        <p>Erfinde deinen eigenen Spielernamen. Bitte keinen echten Namen, keine Kontaktdaten.</p>
        <div class="online-name-row"><label for="player-nickname">Mein Benutzername (3–22 Zeichen)
          <input id="player-nickname" maxlength="22" minlength="3" autocomplete="off" spellcheck="false" value="${safeText(this.onlineNicknameDraft || p.nickname || '')}" placeholder="z. B. LaserFuchs7" /></label></div>
        <div class="online-avatar-title">Mein Spieler-Icon</div>
        <div class="online-avatar-grid">${ONLINE_AVATARS.map(icon=>`<button class="online-avatar ${this.onlineAvatarDraft===icon?'selected':''}" data-action="online-avatar" data-value="${icon}" aria-pressed="${this.onlineAvatarDraft===icon}" aria-label="Icon ${icon}">${icon}</button>`).join('')}</div>
        <label class="online-privacy"><input type="checkbox" id="leaderboard-opt-in" ${this.onlinePublicDraft?'checked':''}/>
          <span>🏆 Meinen Fantasienamen in der Bestenliste zeigen</span></label>
        <p class="online-privacy-note">Freiwillig! Ohne Häkchen bist du nicht in der öffentlichen Liste.</p>
        <button class="online-wide" data-action="online-profile-save" ${busy?'disabled':''}>💾 Profil speichern</button>
        <button class="online-small" data-action="online-profile-back">⬅️ ${b?'Zurück zum Duell':'Zurück zur Übersicht'}</button></div></main>`;
  }

  onlineLeaderboardMarkup(header,bank,busy) {
    const p=this.onlineProfile;
    const b=this.onlineMatch;
    const list = this.onlineLeaderboard;
    return `${header}${bank}<div class="online-panel"><div class="online-big-icon">🏆</div><h2>Mech-Bestenliste</h2>
        <p>Die 20 besten freiwillig sichtbaren Piloten – nach Online-Siegen. Auch 0 Siege werden angezeigt.</p>
        ${!list?'<p>⏳ Lade Bestenliste …</p>':list.length?`<ol class="online-rank-list">${list.map(row=>`<li><span class="rank-number">${row.rank}.</span><span class="rank-avatar">${safeText(row.avatar)}</span><strong>${safeText(row.nickname)}</strong><span class="rank-wins">🏆 ${Number(row.wins)||0}</span></li>`).join('')}</ol>`:'<p>🌟 Noch keine Einträge. Öffne „Mein Profil“ und aktiviere die Teilnahme!</p>'}
        <button class="online-wide" data-action="online-leaderboard-refresh" ${busy?'disabled':''}>🔄 Aktualisieren</button>
        ${!p.showInLeaderboard?'<p class="online-privacy-note">🔒 Du stehst noch nicht in der Liste. Die Teilnahme ist freiwillig.</p><button class="online-wide" data-action="online-profile">🪪 Mein Profil sichtbar machen</button>':''}
         <button class="online-small" data-action="online-leaderboard-back">⬅️ ${b?'Zurück zum Duell':'Zurück zur Übersicht'}</button></div></main>`;
  }

  stopOnlinePoll() { clearInterval(this.onlinePollTimer); this.onlinePollTimer=null; }
  startOnlinePoll() {
    this.stopOnlinePoll();
    this.onlinePollTimer=setInterval(()=>{
      if (this.screen==='online'&&!document.hidden&&!this.onlineBusy) this.refreshOnline();
    }, 1600);
  }
  async openOnline(showLeaderboard=false) {
    if (this.screen === 'hangar') history.pushState({mechFriendsScreen:'online'},'',`${location.pathname}${location.search}#online`);
    this.screen='online'; this.onlineError=''; this.onlineShopOpen=false; this.onlineProfileOpen=false; this.onlineLeaderboardOpen=showLeaderboard; this.onlineLeaderboard=null; this.onlineAccountOpen=false;this.onlineFriendsOpen=false;this.onlineTournamentOpen=false; this.render();
    if (!this.online.configured) return;
    this.onlineBusy=true;
    try {
      const data=await this.online.overview();
      this.onlineProfile=data.profile; this.onlineMatch=data.match?.status==='finished' && data.match.id===this.onlineDismissedMatch ? null : data.match;
      this.onlineAccount=await this.online.getAccount();
      try{this.onlineInvites=await this.online.pendingInvites();}catch(_){}
      await this.syncCloudGame();
      if(this.inviteCode&&!this.onlineMatch&&this.onlineAccount?.is_anonymous)this.onlineAccountOpen=true;
      this.startOnlinePoll();
      if (showLeaderboard) {
        try { this.onlineLeaderboard=await this.online.leaderboard(); }
        catch (error) { this.onlineError='Bestenliste konnte nicht geladen werden. Bitte erneut versuchen.'; }
      }
    } catch (error) { this.onlineError=error.message; }
    finally { this.onlineBusy=false; if (this.screen==='online') {this.render();this.prefillInvite();} }
  }
  prefillInvite(){
    if(this.inviteCode){const codeInput=this.root.querySelector('#room-code');if(codeInput)codeInput.value=this.inviteCode;}
  }
  async syncCloudGame(){
    const user=this.onlineAccount;
    if(!user||user.is_anonymous||this.cloudOwner===user.id)return;
    try {
      await this.saving.catch(()=>{});
      const cloud=await this.online.game();
      const sameAccount=this.localAccountOwner===user.id;
      if(sameAccount && this.localDirty){
        // Changes from this device since launch stay authoritative after an offline session.
        await this.online.saveGame(this.pilot.toJSON());
      } else if(cloud?.game?.mech){
        this.pilot=new Pilot(cloud.game);
        await this.store.save(this.pilot.toJSON());
      } else {
        await this.online.saveGame(this.pilot.toJSON());
      }
      this.localAccountOwner=user.id;
      await this.store.save(user.id,'pilot-owner');
      this.localDirty=false;
      this.cloudOwner=user.id;
    } catch(e){console.warn('Cloud-Synchronisation:',e.message);this.showToast('☁️ Cloud-Speicherung vorübergehend nicht möglich');}
  }
  async refreshOnline() {
    if (this.screen!=='online'||this.onlinePolling||this.onlineBusy||!this.online.configured) return;
    this.onlinePolling=true;
    try {
      if(this.onlineTournamentOpen && this.tournamentCode && (++this.tourneyPollTick%3===0)){this.tournament=await this.online.tournamentState(this.tournamentCode);this.render();}
      if(!this.onlineAccountOpen&&!this.onlineProfileOpen && ++this.tourneyPollTick%7===0){const i=await this.online.pendingInvites();if(i.length!==this.onlineInvites.length){this.onlineInvites=i;this.render();}}
      const previous=this.onlineMatch;
      if (previous && ['waiting','active','finished'].includes(previous.status)) {
        const latest=await this.online.state(previous.id);
        if (latest.nextMatchId) {
          this.onlineMatch = await this.online.state(latest.nextMatchId);
          this.onlineDismissedMatch = null;
          this.render();
        } else if (latest.version!==previous.version || latest.status!==previous.status) {
          this.onlineMatch=latest;
          if (latest.status==='finished') this.onlineProfile=await this.online.rpc('mf5_profile');
          this.render();
        }
      } else if (!previous) {
        const current=await this.online.rpc('mf5_current_match');
        if (current && (current.status!=='finished'||current.id!==this.onlineDismissedMatch)) { this.onlineMatch=current; this.render(); }
      }
    } catch (error) { console.warn('Online Aktualisierung:',error.message); }
    finally { this.onlinePolling=false; }
  }
  async handleOnlineAction(action, button) {
    if (action==='online-back') { this.stopOnlinePoll(); this.screen='hangar'; this.render(); return; }
    if(action==='online-whatsapp' || action==='online-tourney-share') {
      const code=action==='online-whatsapp'?this.onlineMatch?.code:this.tournament?.code;
      if(!code)return;
      const invite=new URL('./index.html',location.href);
      invite.hash=action==='online-whatsapp'?`invite=${code}`:`turnier=${code}`;
      const message=`🤖 Komm zu Mech-Freunde! ${action==='online-whatsapp'?'Unser Duell':'Unser 4-Spieler-Turnier'}: ${invite.href}`;
      const target=`https://wa.me/?text=${encodeURIComponent(message)}`;
      const popup=window.open(target,'_blank','noopener,noreferrer');
      if(!popup){try{await navigator.clipboard.writeText(message);this.showToast('📋 Einladung kopiert!');}catch(_){this.showToast('Teilen nicht möglich');}}
      return;
    }
    if (action==='online-copy') {
      const code=this.onlineMatch?.code;
      if (code) {
        try { await navigator.clipboard.writeText(code); this.showToast('📋 Code kopiert!'); }
        catch (_) { this.showToast('🔑 Code merken oder abschreiben'); }
      }
      return;
    }
    if(action==='online-history'){this.closeOnlineSubpages();this.onlineHistoryOpen=true;this.online.matchHistory().then(rows=>{this.onlineHistory=rows;this.render();}).catch(()=>this.showToast('📜 Verlauf nicht verfügbar'));this.render();return;}
    if(action==='online-history-back'){this.onlineHistoryOpen=false;this.render();return;}
    if(action==='online-account'){this.closeOnlineSubpages();this.onlineAccountOpen=true;this.online.getAccount().then(u=>{this.onlineAccount=u;this.render();});this.render();return;}
    if(action==='online-account-back'){this.onlineAccountOpen=false;this.online.getAccount().then(u=>{this.onlineAccount=u;this.render();this.prefillInvite();});this.render();this.prefillInvite();return;}
    if(action==='online-friends'){this.closeOnlineSubpages();this.onlineFriendsOpen=true;Promise.all([this.online.friends(),this.online.friendCode(),this.online.pendingInvites()]).then(([f,c,i])=>{this.onlineFriends=f;this.onlineFriendCode=c;this.onlineInvites=i;this.render();}).catch(()=>this.showToast('👥 Freunde nicht geladen'));this.render();return;}
    if(action==='online-friends-back'){this.onlineFriendsOpen=false;this.render();return;}
    if(action==='online-tourney'){this.closeOnlineSubpages();this.onlineTournamentOpen=true;this.render();return;}
    if(action==='online-tourney-back'){this.onlineTournamentOpen=false;this.render();this.prefillInvite();return;}
    if (action==='online-lobby') { this.onlineDismissedMatch=this.onlineMatch?.id; this.onlineMatch=null; this.render(); return; }
    if (action==='online-profile') {
      this.onlineShopOpen=false; this.onlineLeaderboardOpen=false; this.onlineProfileOpen=true;
      this.onlineNicknameDraft=this.onlineProfile?.nickname||'';
      this.onlineAvatarDraft = this.onlineProfile?.avatar || '🤖';
      this.onlinePublicDraft = Boolean(this.onlineProfile?.showInLeaderboard); this.render(); return;
    }
    if (action==='online-profile-back') { this.onlineProfileOpen=false; this.render(); return; }
    if (action==='online-avatar') {
      this.onlineNicknameDraft=this.root.querySelector('#player-nickname')?.value||this.onlineNicknameDraft;
      this.onlinePublicDraft=Boolean(this.root.querySelector('#leaderboard-opt-in')?.checked);
      this.onlineAvatarDraft=button.dataset.value; this.render(); return;
    }
    if (action==='online-leaderboard-back') { this.onlineLeaderboardOpen=false; this.render(); return; }
    if (action==='online-leaderboard' || action==='online-leaderboard-refresh') {
      this.onlineShopOpen=false; this.onlineProfileOpen=false; this.onlineLeaderboardOpen=true;
      this.onlineLeaderboard=null; this.render();
      try { this.onlineLeaderboard=await this.online.leaderboard(); }
      catch (_) { this.showToast('📡 Bestenliste gerade nicht verfügbar'); this.onlineLeaderboard=[]; }
      if (this.screen==='online') this.render(); return;
    }
    if (action==='online-shop') { this.onlineShopOpen=true; this.render(); return; }
    if (action==='online-shop-back') { this.onlineShopOpen=false; this.render(); return; }
    if (action==='online-retry') { this.onlineProfile=null; await this.openOnline(); return; }
    if (this.onlineBusy || !this.online.configured) return;
    if (action==='online-forfeit') {
      if (this.onlineMatch?.status!=='active') return;
      if (!window.confirm('Duell wirklich aufgeben? Dein Gegner gewinnt und bekommt 10 Online-Punkte.')) return;
    }
    const code=action==='online-join'?this.root.querySelector('#room-code')?.value.toUpperCase().trim():null;
    if (action==='online-join'&&!/^[A-HJ-NP-Z2-9]{6}$/.test(code||'')) {
      this.showToast('🔑 6 Zeichen eingeben');return;
    }
    this.onlineBusy=true;
    try {
      if(action==='online-account-link' || action==='online-account-password' || action==='online-account-login' || action==='online-account-logout') {
        await this.handleAccountChange(action);
      } else if(action==='online-friend-invite') {
        if(this.onlineMatch?.status!=='waiting')throw new Error('Erstelle zuerst eine Arena.');
        await this.online.inviteFriend(button.dataset.value,this.onlineMatch.id);
        this.showToast('💌 Einladung an Freund gesendet!');
      } else if(action==='online-friend-join') {
        const value=await this.online.acceptInvite(button.dataset.value,this.pilot.mech.selection);
        if(value?.error)throw new Error('Diese Einladung ist nicht mehr gültig.');
        this.onlineMatch=value;this.onlineFriendsOpen=false;this.onlineInvites=[];
      } else if(action==='online-friend-add') {
        const code=(this.root.querySelector('#friend-code-input')?.value||'').trim().toUpperCase();
        await this.online.addFriend(code);this.onlineFriends=await this.online.friends();this.showToast('👥 Anfrage gesendet!');
      } else if(action==='online-friend-accept') {
        await this.online.acceptFriend(button.dataset.value);this.onlineFriends=await this.online.friends();
      } else if(action==='online-friend-remove') {
        if(window.confirm('Freund entfernen?')){await this.online.removeFriend(button.dataset.value);this.onlineFriends=await this.online.friends();}
      } else if(action==='online-tourney-create') {
        this.tournament=await this.online.newTournament(this.pilot.mech.selection);
        this.tournamentCode=this.tournament.code;
      } else if(action==='online-tourney-join') {
        if(this.invitedTournament && this.onlineAccount?.is_anonymous)throw new Error('Bitte zuerst Konto sichern oder anmelden.');
        const code=(this.root.querySelector('#tourney-code')?.value||'').trim().toUpperCase();
        this.tournament=await this.online.joinTournament(code,this.pilot.mech.selection);this.tournamentCode=this.tournament.code;
      } else if(action==='online-tourney-refresh') {
        this.tournament=await this.online.tournamentState(this.tournamentCode);
      } else if(action==='online-tourney-battle') {
        const id=this.tournament?.myMatchId;
        if(id){this.onlineMatch=await this.online.state(id);this.onlineTournamentOpen=false;this.onlineDismissedMatch=null;}
      } else if (action==='online-profile-save') {
        const nickname=(this.root.querySelector('#player-nickname')?.value||'').trim();
        if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]{2,21}$/u.test(nickname) || !ONLINE_AVATARS.includes(this.onlineAvatarDraft)) throw new Error('Name: 3–22 Buchstaben, Zahlen, Leerzeichen oder _ -');
        this.onlineNicknameDraft=nickname;
        this.onlinePublicDraft=Boolean(this.root.querySelector('#leaderboard-opt-in')?.checked);
        this.onlineProfile=await this.online.setIdentity(nickname,this.onlineAvatarDraft,this.onlinePublicDraft);
        this.onlineProfileOpen=false; this.showToast('✨ Profil gespeichert!');
      } else if (action==='online-rematch') {
        if (this.onlineMatch?.status!=='finished' || this.onlineMatch.rematchDeclined) return;
        const value=await this.online.rematch(this.onlineMatch.id);
        this.onlineMatch=value;
        if (value.status==='active') this.showToast('⚔️ Nächste Runde startet!');
      } else if (action==='online-rematch-decline') {
        if (this.onlineMatch?.status!=='finished' || this.onlineMatch.rematchDeclined) return;
        this.onlineMatch=await this.online.declineRematch(this.onlineMatch.id);
        this.showToast('🙅 Rückkampf abgelehnt');
      } else if (action==='online-create' || action==='online-new') {
        this.onlineMatch=await this.online.create(this.pilot.mech.selection);
        this.onlineDismissedMatch=null;
      } else if (action==='online-join') {
        if(this.inviteCode && this.onlineAccount?.is_anonymous)throw new Error('Bitte zuerst Konto sichern oder anmelden.');
        const value=await this.online.join(code,this.pilot.mech.selection);
        if (value?.error) throw new Error('Code nicht gefunden oder schon benutzt');
        this.onlineMatch=value;
      } else if (action==='online-attack'||action==='online-shield'||action==='online-special') {
        this.onlineMatch=await this.online.move(this.onlineMatch.id,action.slice('online-'.length));
      } else if (action==='online-cancel') {
        await this.online.cancel(this.onlineMatch.id); this.onlineMatch=null;
      } else if (action==='online-forfeit') {
        this.onlineMatch=await this.online.forfeit(this.onlineMatch.id);
        this.showToast('🏳️ Duell beendet');
      } else if (action==='online-buy') {
        this.onlineProfile=await this.online.buy(button.dataset.value);
        this.showToast('🎨 Farbe freigeschaltet!');
      } else if (action==='online-equip') {
        this.onlineProfile=await this.online.equip(button.dataset.value);
      }
      if (!this.onlineProfile || this.onlineMatch?.status==='finished') this.onlineProfile=await this.online.rpc('mf5_profile');
    } catch (error) { this.showToast('📡 '+error.message); }
    finally { this.onlineBusy=false; if (this.screen==='online') {this.render();this.prefillInvite();} }
  }

  closeOnlineSubpages(){this.onlineProfileOpen=false;this.onlineShopOpen=false;this.onlineLeaderboardOpen=false;this.onlineAccountOpen=false;this.onlineFriendsOpen=false;this.onlineTournamentOpen=false;this.onlineHistoryOpen=false;}

  async handleAccountChange(action){
    const email=(this.root.querySelector('#account-email')?.value||'').trim();
    const password=this.root.querySelector('#account-password')?.value||'';
    if(action==='online-account-link'){
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Gültige Eltern-E-Mail eingeben');
      await this.online.linkEmail(email);
      this.showToast('📩 Bestätigungs-E-Mail prüfen!');
    }else if(action==='online-account-password'){
      const u=await this.online.getAccount();
      if(u?.is_anonymous || !u?.email_confirmed_at)throw new Error('E-Mail zuerst bestätigen');
      if(password.length<8)throw new Error('Passwort: mindestens 8 Zeichen');
      await this.online.setPassword(password);
      this.onlineAccount=await this.online.getAccount();
      await this.syncCloudGame();this.showToast('🔐 Konto gesichert!');
    }else if(action==='online-account-login'){
      if(!email||!password)throw new Error('E-Mail und Passwort eingeben');
      await this.store.save(this.pilot.toJSON());
      if(this.onlineAccount?.is_anonymous)await this.store.save(this.pilot.toJSON(),'pilot-guest');
      this.onlineAccount=await this.online.login(email,password);
      this.cloudOwner=null;
      await this.syncCloudGame();
      this.onlineMatch=null;this.onlineDismissedMatch=null;
      this.onlineProfile=await this.online.rpc('mf5_profile');this.showToast('🔐 Angemeldet!');
    }else if(action==='online-account-logout'){
      if(!window.confirm('Von diesem Konto abmelden? Deine Cloud-Daten bleiben erhalten.'))return;
      await this.online.logoutToGuest();this.cloudOwner=null;this.localAccountOwner=null;this.localDirty=false;
      await this.store.save(null,'pilot-owner');
      this.onlineAccount=await this.online.getAccount();
      this.pilot=new Pilot(await this.store.load('pilot-guest')||{});
      await this.store.save(this.pilot.toJSON());
      this.onlineProfile=await this.online.rpc('mf5_profile');this.onlineMatch=null;
      this.showToast('👋 Jetzt Gastzugang');
    }
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
    return `<header class="topbar"><div class="brand"><span class="brand-logo">🤖</span><span>MECH-FREUNDE <small class="version-chip">v1.1</small></span></div>${this.starBank()}</header>
      <main>
        <div class="training-top"><button class="back-button" data-action="back" aria-label="Zurück zum Hangar"><span>⬅️</span> Hangar</button>
          <div class="round-label">🎯 Training</div></div>
        <h1 class="section-title">🤖 Wähle einen Bot!</h1>
        <p class="opponent-builder-intro">🛠️ Jeder Trainingsgegner kann einen eigenen Mech bekommen!</p>
         <p class="training-balance-info">🧠 Die Gegner passen sich deinem Mech an. Jeder Kampf ist etwas anders. Nach Niederlagen wird es leichter. 💜</p>
        <div class="opponent-list">${TRAINING_BOTS.map(bot => {
          const enemy=this.pilot.trainingMech(bot.id);
          const stats=getAdaptiveTrainingBotStats(bot.id,this.pilot.mech.stats,enemy);
          return `<div class="opponent-card-wrap"><button class="opponent-card" data-action="pick-bot" data-value="${bot.id}" aria-label="Gegen ${bot.label} kämpfen">
            <span class="opponent-art">${MechRenderer.draw(enemy, { label: bot.label })}</span>
            <span class="opponent-info"><span class="opponent-name">${bot.icon} ${bot.label}</span>
              <span class="opponent-hint">${bot.hint} &nbsp; ❤️ ${stats.hp} &nbsp; 🛡️ ${stats.armor}</span>
              <span class="opponent-reward">⭐ ${bot.reward}</span></span>
            <span class="opponent-go" aria-hidden="true">▶</span>
          </button><button class="opponent-edit" data-action="edit-bot" data-value="${bot.id}" aria-label="${bot.label} bauen und ausrüsten">🛠️ ${bot.label} bauen & ausrüsten</button></div>`;
        }).join('')}</div>
      </main>`;
  }

  openBotEditor(botId) {
    if (!TRAINING_BOTS.some(bot=>bot.id===botId)) return;
    this.botEditId=botId;
    this.botEditCategory='head';
    this.screen='bot-editor';
    this.render();
    window.scrollTo({top:0,behavior:'instant'});
  }

  botEditorMarkup() {
    const bot=getTrainingBot(this.botEditId);
    const mech=this.pilot.trainingMech(bot.id);
    const stats=getTrainingBotStats(bot.id,mech);
    const category=CATEGORIES.find(cat=>cat.id===this.botEditCategory) || CATEGORIES[0];
    const tabs=CATEGORIES.map(cat=>`<button class="category-tab ${cat.id===category.id?'is-active':''}"
      data-action="bot-edit-category" data-value="${cat.id}" aria-pressed="${cat.id===category.id}">
      <span class="category-icon">${cat.icon}</span><span>${cat.label}</span></button>`).join('');
    const styles=STYLES.map(style=>`<button class="style-card style-${style.id} ${mech.selection.style===style.id?'is-active':''}"
      data-action="bot-edit-style" data-value="${style.id}" aria-pressed="${mech.selection.style===style.id}">
      <span class="style-symbol">${style.icon}</span><span class="style-title">${style.label}</span></button>`).join('');
    const cards=category.id==='color'
      ? `<div class="colors-grid">${COLORS.filter(c=>!c.onlineOnly).map(color=>`<button class="color-card ${mech.selection.color===color.id?'is-equipped':''}"
        data-action="bot-edit-color" data-value="${color.id}" aria-label="Gegnerfarbe ${color.label}" aria-pressed="${mech.selection.color===color.id}">
        <span class="color-dot" style="background:${color.primary}">${mech.selection.color===color.id?'✓':''}</span></button>`).join('')}</div>`
      : `<div class="part-grid">${PARTS[category.id].map(part=>`<button class="part-card ${mech.selection[category.id]===part.id?'is-equipped':''}"
        data-action="bot-edit-part" data-value="${part.id}" aria-pressed="${mech.selection[category.id]===part.id}" aria-label="${part.name} für Gegner">
        ${mech.selection[category.id]===part.id?'<span class="equipped-mark">✓</span>':''}
        <span class="part-art">${MechRenderer.draw(mech.withPart(category.id,part.id),{viewBox:category.viewBox,label:part.name})}</span>
        <span class="part-name">${part.name}</span><span class="part-cost owned">${mech.selection[category.id]===part.id?'✅':'🔧'}</span>
      </button>`).join('')}</div>`;
    return `<header class="topbar"><div class="brand"><span class="brand-logo">🤖</span><span>MECH-FREUNDE <small class="version-chip">v1.1</small></span></div>${this.starBank()}</header>
      <main class="bot-builder"><div class="training-top"><button class="back-button" data-action="bot-edit-back">⬅️ Alle Gegner</button>
      <div class="round-label">🛠️ Gegner-Baukasten</div></div>
      <h1 class="section-title">${bot.icon} ${bot.label} ausrüsten</h1>
      <div class="hangar-stage bot-builder-stage" aria-label="Vorschau des Trainingsgegners">${MechRenderer.draw(mech,{label:bot.label})}<div class="stage-floor" aria-hidden="true"></div></div>
      <div class="bot-builder-stats" aria-label="Gegnerwerte"><span>❤️ ${stats.hp}</span><span>⚔️ ${stats.attackMin}–${stats.attackMax}</span><span>🛡️ ${stats.armor}</span></div>
      <p class="bot-builder-note">🔧 Alle Bauteile sind für Trainingsgegner kostenlos. Die Ausrüstung verändert auch die Trainingswerte. Dein eigener Mech und deine Sterne bleiben unverändert.</p>
      <div class="style-row" role="group" aria-label="Gegner-Spielstil">${styles}</div>
      <section class="builder" aria-label="Trainingsgegner ausrüsten"><div class="category-tabs">${tabs}</div>
        <div class="part-heading"><span>${category.icon} ${category.label} auswählen</span><small>👆 Tippen!</small></div>${cards}</section>
      <button class="primary-action" data-action="bot-edit-fight">⚔️ Gegen ${bot.label} kämpfen</button>
      <button class="bot-builder-reset" data-action="bot-edit-reset">↩️ Originalausstattung wiederherstellen</button>
      <button class="online-small" data-action="bot-edit-back">⬅️ Zur Gegnerauswahl</button></main>`;
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
         ${b.winner !== 'player' ? '<p class="training-kind-note">💜 Gut gekämpft! Der nächste Versuch wird etwas leichter.</p>' : ''}
        <button class="primary-action" data-action="again" aria-label="Noch einmal trainieren"><span class="action-icon">🔁</span> Nochmal!</button>
        <button class="back-button result-back" data-action="choose-again" aria-label="Anderen Gegner wählen">🤖 Andere Bots</button>
      </section>` : `<div class="battle-message" role="status" aria-live="polite"><span>${b.lastEvent.icon}</span>${b.lastEvent.message}</div>
      <div class="battle-actions">
        <button class="battle-button attack" data-action="attack" ${blocked ? 'disabled' : ''} aria-label="Angreifen"><span class="battle-icon">⚔️</span><span>Angriff</span></button>
        <button class="battle-button shield" data-action="shield" ${blocked ? 'disabled' : ''} aria-label="Mit Schild schützen"><span class="battle-icon">🛡️</span><span>Schutz</span></button>
        <button class="battle-button special" data-action="special" ${blocked || !b.specialReady ? 'disabled' : ''} aria-label="Spezialangriff ${b.specialReady ? 'bereit' : 'lädt sich auf'}"><span class="battle-icon">⚡</span><span>Spezial</span>${power}</button>
      </div>`;
    return `<header class="topbar"><div class="brand"><span class="brand-logo">🤖</span><span>MECH-FREUNDE <small class="version-chip">v1.1</small></span></div>${this.starBank()}</header>
      <main>
        <div class="training-top"><button class="back-button" data-action="back" aria-label="Zurück zum Baukasten"><span>⬅️</span> Hangar</button><div class="round-label">🎯 Training</div></div>
        <h1 class="section-title">⚔️ ${b.bot.icon} ${b.bot.label}</h1>
         <p class="training-balance-info" role="status">${b.bot.difficultyLabel} · ❤️ ${b.maxBotHp} · 🛡️ ${b.bot.armor}</p>
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
    this.enemy = this.pilot.trainingMech(this.botId);
    const recentLosses = this.pilot.history.slice(0, 2).filter((entry, i, all) =>
       !entry.won && all.slice(0, i).every(previous => !previous.won)).length;
     this.battle = new TrainingBattle(this.pilot.mech, this.botId, Math.random, this.enemy, { recentLosses });
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
    this.battle.reward = this.pilot.finishTraining(this.battle.winner === 'player', this.battle.usedSpecial, this.battle.bot.reward, this.botId);
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
