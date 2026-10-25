import { findColor } from './Parts.js';

let drawingId = 0;

export class MechRenderer {
  static draw(mech, { viewBox = '0 0 360 380', className = 'mech-picture', label = 'Mech' } = {}) {
    const c = findColor(mech.selection.color);
    const prefix = `mech-${++drawingId}`;
    const p = c.primary;
    const l = c.light;
    const d = c.dark;
    const metal = '#eef4ff';
    const steel = '#8c99b9';
    const outline = '#1d2747';
    const glow = '#8de8ff';
    const { head, body, arms, legs } = mech.selection;

    const legArt = legs === 'hover'
      ? `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M131 244L159 244L153 305L126 305Z" fill="${d}"/>
        <path d="M201 244L229 244L234 305L207 305Z" fill="${d}"/>
        <path d="M113 304H166L144 345L102 345Z" fill="${p}"/>
        <path d="M194 304H247L258 345H216Z" fill="${p}"/>
        <path d="M112 347C122 335 145 335 156 347C146 358 124 360 112 347Z" fill="#ffad58" stroke="#ff6d48"/>
        <path d="M205 347C217 334 239 334 250 347C240 358 219 360 205 347Z" fill="#ffad58" stroke="#ff6d48"/>
        <path d="M124 353L116 367M146 353L152 367M218 353L212 367M240 353L246 367" stroke="#ffe5ad" stroke-width="5" stroke-linecap="round"/>
      </g>`
      : legs === 'tracks'
        ? `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M102 246H162L165 307Q165 344 131 344H96Q72 344 72 317Z" fill="${d}"/>
        <path d="M198 246H258L288 317Q288 344 264 344H229Q196 344 195 308Z" fill="${d}"/>
        <path d="M87 320H154M211 320H278" stroke="${metal}" stroke-width="6" stroke-linecap="round"/>
        ${[95,118,141,222,245,268].map(x => `<circle cx="${x}" cy="320" r="12" fill="#e7efff" stroke="${outline}" stroke-width="3"/>`).join('')}
      </g>`
        : `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M124 241H160L158 305H120Z" fill="${d}"/>
        <path d="M200 241H236L241 305H203Z" fill="${d}"/>
        <path d="M107 304H168L171 338L145 353H97L94 327Z" fill="${p}"/>
        <path d="M193 304H254L269 327L266 353H218L192 338Z" fill="${p}"/>
        <path d="M106 327H168M194 327H257" stroke="${l}" stroke-width="6" stroke-linecap="round"/>
      </g>`;

    const armArt = arms === 'blades' || arms === 'champion'
      ? `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M71 143H113L110 221H75Z" fill="${d}"/>
        <path d="M247 143H289L285 221H250Z" fill="${d}"/>
        <path d="M65 207L108 207L119 248L89 266L64 247Z" fill="${p}"/>
        <path d="M252 207L295 207L296 247L271 266L241 248Z" fill="${p}"/>
        <path d="M77 247L49 259L28 290L63 280L99 259Z" fill="${metal}"/>
        <path d="M283 247L311 259L332 290L297 280L261 259Z" fill="${metal}"/>
        <path d="M49 259L28 290L63 280" fill="none" stroke="${arms === 'champion' ? '#ffe168' : glow}" stroke-width="5"/>
        <path d="M311 259L332 290L297 280" fill="none" stroke="${arms === 'champion' ? '#ffe168' : glow}" stroke-width="5"/>
        <path d="M78 219L105 233M255 233L282 219" stroke="${l}" stroke-width="7"/>
        ${arms === 'champion' ? '<path d="M39 275L27 305L51 292M321 275L333 305L309 292" fill="none" stroke="#ffe168" stroke-width="6" stroke-linecap="round"/>' : ''}
      </g>`
      : arms === 'rockets'
      ? `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M52 146H112L114 241H58Z" fill="${d}"/><path d="M248 146H308L302 241H246Z" fill="${d}"/>
        <path d="M58 145L76 130H107L106 181H57Z" fill="${metal}"/><path d="M253 145L254 181H305L304 130H286Z" fill="${metal}"/>
        <circle cx="76" cy="153" r="7" fill="#ffb65e"/><circle cx="95" cy="153" r="7" fill="#ffb65e"/>
        <circle cx="266" cy="153" r="7" fill="#ffb65e"/><circle cx="285" cy="153" r="7" fill="#ffb65e"/>
        <path d="M69 206H100M260 206H291" stroke="${l}" stroke-width="8" stroke-linecap="round"/>
      </g>`
      : arms === 'laser'
        ? `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M70 144H113L111 218H68Z" fill="${d}"/><path d="M247 144H290L293 218H250Z" fill="${d}"/>
        <path d="M44 210L109 210L121 251L74 264L48 246Z" fill="${p}"/>
        <path d="M251 210L316 210L313 246L287 264L240 251Z" fill="${p}"/>
        <circle cx="84" cy="235" r="15" fill="${glow}" stroke="${outline}" stroke-width="3"/><circle cx="276" cy="235" r="15" fill="${glow}" stroke="${outline}" stroke-width="3"/>
        <circle cx="84" cy="235" r="6" fill="#fff"/><circle cx="276" cy="235" r="6" fill="#fff"/>
      </g>`
        : `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M77 143H112L109 218H74Z" fill="${d}"/><path d="M248 143H283L286 218H251Z" fill="${d}"/>
        <path d="M63 212L106 212L117 247L96 267L73 257L63 233Z" fill="${p}"/>
        <path d="M254 212L297 212L307 233L297 257L274 267L253 247Z" fill="${p}"/>
        <path d="M76 238L55 248M91 250L73 266M283 250L301 266M270 238L289 248" stroke="${l}" stroke-width="5" stroke-linecap="round"/>
      </g>`;

    const chestMark = body === 'shoulders'
      ? `<g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
          <path d="M105 137L139 124L157 151L148 190L101 180L85 153Z" fill="${p}"/>
          <path d="M255 137L221 124L203 151L212 190L259 180L275 153Z" fill="${p}"/>
          <path d="M96 151L132 141M228 141L264 151" stroke="${l}" stroke-width="7"/>
          <path d="M180 182L210 196L202 237L180 249L158 237L150 196Z" fill="${steel}"/>
          <path d="M180 193V237M164 212H196" stroke="${glow}" stroke-width="8" stroke-linecap="round"/>
        </g>`
      : body === 'shield'
      ? `<path d="M180 173L214 185L210 225Q198 243 180 253Q162 243 150 225L146 185Z" fill="#eff7ff" stroke="${outline}" stroke-width="5"/><path d="M180 187V236M157 209H203" stroke="${d}" stroke-width="9" stroke-linecap="round"/>`
      : body === 'bolt'
        ? `<polygon points="191,174 163,210 182,210 171,246 205,202 186,202" fill="#ffe168" stroke="#ffb739" stroke-width="4"/><circle cx="180" cy="212" r="38" fill="none" stroke="${l}" stroke-width="6"/>`
        : `<g><path d="M180 251L153 238L145 212L161 187H199L215 212L207 238Z" fill="#ffd0df" stroke="${outline}" stroke-width="5"/><path d="M164 214Q171 205 180 213Q189 205 196 214Q196 230 180 239Q164 230 164 214Z" fill="#ff688f"/></g>`;

    const headArt = head === 'samurai'
      ? `<g stroke="${outline}" stroke-width="6" stroke-linejoin="round">
          <path d="M125 66L104 25L140 41L159 26L180 48L201 26L220 41L256 25L235 66Z" fill="${d}"/>
          <path d="M180 26L164 49L180 63L196 49Z" fill="#ffdb79"/>
          <path d="M119 75L143 54H218L241 75L246 118L217 152H143L114 118Z" fill="${p}"/>
          <path d="M135 86L225 86L220 118L180 134L140 118Z" fill="#1d2747"/>
          <path d="M143 99L169 104M217 99L191 104" stroke="${glow}" stroke-width="10" stroke-linecap="round"/>
          <path d="M180 91L169 130L180 137L191 130Z" fill="${metal}"/>
          <path d="M145 142H215" stroke="${l}" stroke-width="5"/>
        </g>`
      : head === 'visor'
      ? `
      <g>
        <path d="M118 67L145 53H215L242 67L248 107L229 150H131L112 107Z" fill="${p}" stroke="${outline}" stroke-width="7" stroke-linejoin="round"/>
        <path d="M131 92H229L220 121L180 132L140 121Z" fill="#1c2747" stroke="${outline}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M144 102H216" stroke="${glow}" stroke-width="10" stroke-linecap="round"/>
      </g>`
      : head === 'antenna'
        ? `
      <g>
        <path d="M180 56V31" stroke="${outline}" stroke-width="8" stroke-linecap="round"/>
        <circle cx="180" cy="22" r="13" fill="#ffd96b" stroke="${outline}" stroke-width="5"/>
        <path d="M118 69L145 55H215L242 69L248 109L230 149H130L112 109Z" fill="${p}" stroke="${outline}" stroke-width="7" stroke-linejoin="round"/>
        <circle cx="150" cy="107" r="13" fill="#1c2747"/><circle cx="210" cy="107" r="13" fill="#1c2747"/>
        <circle cx="153" cy="103" r="4" fill="#fff"/><circle cx="213" cy="103" r="4" fill="#fff"/>
        <path d="M160 131H200" stroke="${metal}" stroke-width="7" stroke-linecap="round"/>
      </g>`
        : `
      <g>
        <path d="M132 52H228L247 79L241 124L215 149H145L119 124L113 79Z" fill="${p}" stroke="${outline}" stroke-width="7" stroke-linejoin="round"/>
        <path d="M144 96H216" stroke="#1c2747" stroke-width="10" stroke-linecap="round"/>
        <circle cx="151" cy="96" r="10" fill="${glow}"/><circle cx="209" cy="96" r="10" fill="${glow}"/>
        <path d="M162 126L180 136L198 126" fill="none" stroke="${metal}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      </g>`;

    return `<svg class="${className}" viewBox="${viewBox}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${prefix}-armor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${l}"/>
          <stop offset="0.45" stop-color="${p}"/>
          <stop offset="1" stop-color="${d}"/>
        </linearGradient>
        <linearGradient id="${prefix}-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#d9e3fb"/>
        </linearGradient>
        <filter id="${prefix}-shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#23305b" flood-opacity="0.22"/>
        </filter>
      </defs>
      <ellipse cx="180" cy="358" rx="120" ry="15" fill="#1d2747" opacity="0.12"/>
      <g filter="url(#${prefix}-shadow)">
        ${legArt}
        ${armArt}
        <path d="M122 145L150 128H210L238 145L248 214L224 265H136L112 214Z" fill="url(#${prefix}-armor)" stroke="${outline}" stroke-width="7" stroke-linejoin="round"/>
        <path d="M139 154H221" stroke="${l}" stroke-width="7" stroke-linecap="round" opacity="0.95"/>
        <path d="M149 167H211" stroke="${metal}" stroke-width="5" stroke-linecap="round" opacity="0.75"/>
        <path d="M156 145L180 129L204 145" fill="none" stroke="${outline}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="128" cy="193" r="7" fill="#ffe7a0"/><circle cx="232" cy="193" r="7" fill="#ffe7a0"/>
        ${chestMark}
        <path d="M168 150H192V166H168Z" fill="#203056" stroke="${outline}" stroke-width="4"/>
        ${headArt}
        <g class="reactor-glow"><circle cx="180" cy="169" r="5" fill="${glow}"/></g>
        ${mech.selection.style === 'fast'
          ? `<path d="M89 280L52 294M104 292L67 306M271 280L308 294M256 292L293 306" stroke="${glow}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`
          : mech.selection.style === 'strong'
            ? `<path d="M115 238L127 258M245 238L233 258" stroke="${l}" stroke-width="9" stroke-linecap="round"/>`
            : ''}
        <path d="M110 114H126M234 114H250" stroke="#ffb96a" stroke-width="7" stroke-linecap="round"/>
      </g>
    </svg>`;
  }
}
