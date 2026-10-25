import { findColor } from './Parts.js';

let drawingId = 0;

export class MechRenderer {
  static draw(mech, { viewBox = '0 0 360 380', className = 'mech-picture', label = 'Mein bunter Mech' } = {}) {
    const c = findColor(mech.selection.color);
    const prefix = `bot-${++drawingId}`;
    const p = c.primary; const l = c.light; const d = c.dark;
    const { head, body, arms, legs } = mech.selection;
    const outline = '#25335d';

    const legArt = legs === 'hover'
      ? `<g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
           <rect x="119" y="250" width="40" height="58" rx="18" fill="${d}"/><rect x="201" y="250" width="40" height="58" rx="18" fill="${d}"/>
           <path d="M120 310 L154 310 L137 348Z M206 310 L240 310 L223 348Z" fill="#ffda66" stroke="#ff8d58" stroke-width="4"/>
           <path d="M131 346L120 368 M146 345L155 361 M221 345L212 366 M231 343L245 363" fill="none" stroke="#ffe5a0" stroke-width="5" stroke-linecap="round"/>
         </g>`
      : legs === 'tracks'
        ? `<g stroke="${outline}" stroke-width="5"><path d="M105 251H161L166 322Q164 341 146 344H95Q78 343 78 324Z" fill="${d}"/><path d="M198 251H254L281 324Q281 344 261 344H210Q193 341 194 323Z" fill="${d}"/>
           ${[103,127,151,218,242,266].map(x => `<circle cx="${x}" cy="323" r="13" fill="#dae7fa" stroke-width="4"/>`).join('')}
         </g>`
        : `<g stroke="${outline}" stroke-width="5" stroke-linejoin="round"><path d="M118 247H160V312H117Z" fill="${d}"/><path d="M200 247H242V312H200Z" fill="${d}"/>
           <path d="M105 304L162 304L170 341Q168 353 154 353H100Q87 352 88 339Z" fill="${p}"/><path d="M199 304H256L272 339Q274 353 259 353H205Q191 353 191 340Z" fill="${p}"/>
           <path d="M101 332H160 M203 332H261" stroke="${l}" stroke-width="6"/></g>`;

    const armArt = arms === 'rockets'
      ? `<g stroke="${outline}" stroke-width="5" stroke-linejoin="round"><rect x="45" y="146" width="66" height="105" rx="21" fill="${d}"/><rect x="249" y="146" width="66" height="105" rx="21" fill="${d}"/>
         <rect x="51" y="142" width="56" height="55" rx="14" fill="#e8edf8"/><rect x="253" y="142" width="56" height="55" rx="14" fill="#e8edf8"/>
         <circle cx="68" cy="169" r="8" fill="#ffb957"/><circle cx="90" cy="169" r="8" fill="#ffb957"/><circle cx="270" cy="169" r="8" fill="#ffb957"/><circle cx="292" cy="169" r="8" fill="#ffb957"/>
         <path d="M63 207L94 207M266 207L298 207" stroke="${l}" stroke-width="8"/></g>`
      : arms === 'laser'
        ? `<g stroke="${outline}" stroke-width="5" stroke-linejoin="round"><rect x="63" y="141" width="48" height="92" rx="19" fill="${d}"/><rect x="249" y="141" width="48" height="92" rx="19" fill="${d}"/>
           <rect x="49" y="211" width="67" height="51" rx="13" fill="${p}"/><rect x="244" y="211" width="67" height="51" rx="13" fill="${p}"/>
           <circle cx="82" cy="237" r="14" fill="#a7eeff"/><circle cx="278" cy="237" r="14" fill="#a7eeff"/><circle cx="82" cy="237" r="6" fill="#fff"/><circle cx="278" cy="237" r="6" fill="#fff"/>
         </g>`
        : `<g stroke="${outline}" stroke-width="5" stroke-linejoin="round"><rect x="70" y="141" width="43" height="85" rx="19" fill="${d}"/><rect x="247" y="141" width="43" height="85" rx="19" fill="${d}"/>
           <path d="M69 211Q40 213 44 241L53 264Q70 280 85 263L107 247Q117 237 106 224L100 229L100 217Q92 203 83 215L77 221Q76 207 69 211Z" fill="${p}"/>
           <path d="M291 211Q320 213 316 241L307 264Q290 280 275 263L253 247Q243 237 254 224L260 229L260 217Q268 203 277 215L283 221Q284 207 291 211Z" fill="${p}"/></g>`;

    const bodyFace = body === 'shield'
      ? `<path d="M143 180L180 167L217 180L211 218Q198 239 180 249Q162 239 149 218Z" fill="#daeaff" stroke="${outline}" stroke-width="5"/><path d="M180 182V235M159 205H202" stroke="${d}" stroke-width="9" stroke-linecap="round"/>`
      : body === 'bolt'
        ? `<circle cx="180" cy="210" r="39" fill="#25335d" stroke="${l}" stroke-width="6"/><path d="M188 173L163 210H181L169 245L205 199H187Z" fill="#ffe77e" stroke="#ffc654" stroke-width="3"/>`
        : `<path d="M180 241C142 221 139 204 145 190C153 171 171 179 180 190C193 172 217 173 219 192C221 211 203 227 180 241Z" fill="#ff6eae" stroke="${outline}" stroke-width="5"/><path d="M163 191Q169 186 176 196" stroke="#ffcbeb" stroke-width="5" stroke-linecap="round" fill="none"/>`;

    const headArt = head === 'visor'
      ? `<rect x="110" y="62" width="140" height="95" rx="43" fill="${p}" stroke="${outline}" stroke-width="7"/><rect x="120" y="86" width="120" height="48" rx="22" fill="#25335d"/>
         <path d="M129 95H229" stroke="#95f6ff" stroke-width="9" stroke-linecap="round"/><circle cx="152" cy="112" r="7" fill="#80f3ff"/><circle cx="209" cy="112" r="7" fill="#80f3ff"/>`
      : head === 'antenna'
        ? `<path d="M180 75V40" stroke="${outline}" stroke-width="9" stroke-linecap="round"/><circle cx="180" cy="31" r="15" fill="#ffe083" stroke="${outline}" stroke-width="5"/>
           <rect x="110" y="69" width="140" height="87" rx="34" fill="${p}" stroke="${outline}" stroke-width="7"/><circle cx="151" cy="112" r="14" fill="#25335d"/><circle cx="209" cy="112" r="14" fill="#25335d"/><circle cx="155" cy="109" r="5" fill="white"/><circle cx="213" cy="109" r="5" fill="white"/>
           <path d="M164 138Q180 148 196 138" fill="none" stroke="${outline}" stroke-width="5" stroke-linecap="round"/>`
        : `<rect x="110" y="68" width="140" height="88" rx="38" fill="${p}" stroke="${outline}" stroke-width="7"/>
           <ellipse cx="151" cy="112" rx="12" ry="16" fill="#25335d"/><ellipse cx="209" cy="112" rx="12" ry="16" fill="#25335d"/>
           <circle cx="155" cy="107" r="4" fill="white"/><circle cx="213" cy="107" r="4" fill="white"/>
           <path d="M164 138Q180 152 196 138" fill="none" stroke="${outline}" stroke-width="5" stroke-linecap="round"/>`;

    return `<svg class="${className}" viewBox="${viewBox}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${prefix}-body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${l}"/><stop offset="0.52" stop-color="${p}"/><stop offset="1" stop-color="${d}"/></linearGradient>
      <filter id="${prefix}-shade" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#283361" flood-opacity="0.2"/></filter>
    </defs>
    <ellipse cx="180" cy="359" rx="122" ry="15" fill="#5265a8" opacity=".16"/>
    <g filter="url(#${prefix}-shade)">${legArt}${armArt}
    <rect x="110" y="142" width="140" height="124" rx="36" fill="url(#${prefix}-body)" stroke="${outline}" stroke-width="7"/>
    <path d="M124 159Q181 143 236 162" fill="none" stroke="${l}" stroke-width="7" stroke-linecap="round" opacity=".8"/>
    <circle cx="125" cy="192" r="7" fill="#fdf4ca"/><circle cx="235" cy="192" r="7" fill="#fdf4ca"/>
    ${bodyFace}
    <rect x="163" y="149" width="34" height="18" rx="8" fill="${d}" stroke="${outline}" stroke-width="4"/>
    ${headArt}
    <circle cx="105" cy="114" r="12" fill="#ffbb75" stroke="${outline}" stroke-width="4"/><circle cx="255" cy="114" r="12" fill="#ffbb75" stroke="${outline}" stroke-width="4"/>
    <circle cx="180" cy="263" r="8" fill="#d5f8ff" stroke="${outline}" stroke-width="3"/>
    </g></svg>`;
  }
}
