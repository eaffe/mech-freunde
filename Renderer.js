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
    const { head, body, arms, legs, gear } = mech.selection;

    const legArt = ['spider','titan','skates'].includes(legs) ? `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M124 241H160L158 304H120Z M200 241H236L240 304H202Z" fill="${d}"/>
        <path d="M98 302H171L173 346H96Z M190 302H264L266 346H188Z" fill="${p}"/>
        ${legs === 'spider' ? '<path d="M115 284L66 296L46 332M245 284L294 296L314 332M114 303L72 336M246 303L288 336" fill="none" stroke="#8894bd" stroke-width="11" stroke-linecap="round"/>' : ''}
        ${legs === 'skates' ? `<path d="M99 346H172M189 346H263" stroke="${glow}" stroke-width="12" stroke-linecap="round"/>` : ''}
        ${legs === 'titan' ? `<path d="M98 313H170M190 313H263" stroke="${metal}" stroke-width="12"/>` : ''}
      </g>` : legs === 'hover'
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

    const armArt = ['hammer','claws','cannons','staff','saw'].includes(arms) ? `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M69 144H113L111 217H70Z M247 144H291L290 217H248Z" fill="${d}"/>
        <path d="M51 210H115L119 255L72 273L48 251Z M245 210H309L312 251L288 273L241 255Z" fill="${p}"/>
        ${arms === 'hammer' ? `<path d="M74 240L37 310M286 240L323 310" stroke="${steel}" stroke-width="11"/><path d="M10 296L55 311L46 334L2 319Z M350 296L305 311L314 334L358 319Z" fill="${metal}"/>` : ''}
        ${arms === 'claws' ? `<path d="M70 254L34 300L60 282L54 311L84 277M290 254L326 300L300 282L306 311L276 277" fill="none" stroke="${metal}" stroke-width="10"/>` : ''}
        ${arms === 'cannons' ? `<circle cx="80" cy="239" r="23" fill="${steel}"/><circle cx="280" cy="239" r="23" fill="${steel}"/><circle cx="80" cy="239" r="12" fill="${glow}"/><circle cx="280" cy="239" r="12" fill="${glow}"/>` : ''}
        ${arms === 'staff' ? `<path d="M72 249L28 320M288 249L332 320" stroke="${metal}" stroke-width="10"/><circle cx="28" cy="320" r="15" fill="${glow}"/><circle cx="332" cy="320" r="15" fill="${glow}"/>` : ''}
        ${arms === 'saw' ? `<circle cx="67" cy="273" r="30" fill="${metal}"/><circle cx="293" cy="273" r="30" fill="${metal}"/><circle cx="67" cy="273" r="10" fill="${glow}"/><circle cx="293" cy="273" r="10" fill="${glow}"/>` : ''}
      </g>` : arms === 'blades' || arms === 'champion'
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

    const chestMark = ['fortress','crystalcore','dragonplate','stealth'].includes(body) ? `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        <path d="M112 139L180 156L248 139L251 227L180 260L109 227Z" fill="${body==='stealth'?d:p}"/>
        <path d="M129 160L180 177L231 160L227 219L180 241L133 219Z" fill="${body==='crystalcore'?glow:d}"/>
        ${body==='fortress' ? `<path d="M104 154L94 130L119 138L133 124L152 151M256 154L266 130L241 138L227 124L208 151" fill="${metal}"/>` : ''}
        ${body==='dragonplate' ? `<path d="M151 191L180 167L209 191L180 231Z" fill="${l}"/>` : ''}
        ${body==='stealth' ? `<path d="M140 201H220" stroke="${glow}" stroke-width="8"/>` : ''}
        ${body==='crystalcore' ? `<path d="M180 180L199 204L180 231L161 204Z" fill="${metal}"/>` : ''}
      </g>` : body === 'shoulders'
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

    const headArt = ['dragon','crystal','owl','knight','star'].includes(head) ? `
      <g stroke="${outline}" stroke-width="6" stroke-linejoin="round">
        <path d="M119 74L145 53H215L241 74L244 116L216 151H144L116 116Z" fill="${p}"/>
        ${head==='dragon' ? `<path d="M123 76L93 31L149 51L180 21L211 51L267 31L237 76Z" fill="${d}"/><path d="M137 100L168 108M223 100L192 108" stroke="${glow}" stroke-width="11"/>` : ''}
        ${head==='crystal' ? `<path d="M180 18L227 74L214 129L180 149L146 129L133 74Z" fill="${l}"/><path d="M180 18V148M133 74H227" stroke="${glow}" stroke-width="6"/><path d="M151 101H170M190 101H209" stroke="${outline}" stroke-width="9"/>` : ''}
        ${head==='owl' ? `<path d="M119 74L105 42L148 62M241 74L255 42L212 62" fill="${d}"/><circle cx="152" cy="103" r="23" fill="${metal}"/><circle cx="208" cy="103" r="23" fill="${metal}"/><circle cx="152" cy="103" r="10" fill="${glow}"/><circle cx="208" cy="103" r="10" fill="${glow}"/>` : ''}
        ${head==='knight' ? `<path d="M119 73L139 41H221L241 73Z" fill="${metal}"/><path d="M133 96H227L216 125H144Z" fill="${outline}"/><path d="M147 110H213" stroke="${glow}" stroke-width="9"/>` : ''}
        ${head==='star' ? `<path d="M180 20L192 50L224 51L200 73L208 103L180 87L152 103L160 73L136 51L168 50Z" fill="#ffe38a"/><path d="M143 112L169 112M191 112H217" stroke="${glow}" stroke-width="10"/>` : ''}
      </g>` : head === 'samurai'
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

    const gearArt = gear === 'none' ? '' : `
      <g stroke="${outline}" stroke-width="5" stroke-linejoin="round">
        ${gear==='jetpack' ? `<path d="M96 166L76 156L68 244L94 260L112 235ZM264 166L284 156L292 244L266 260L248 235Z" fill="${steel}"/><path d="M80 260L71 302L91 276M280 260L289 302L269 276" fill="#ffb34e"/>` : ''}
        ${gear==='wings' ? `<path d="M118 162L69 106L14 94L48 144L18 171L97 211ZM242 162L291 106L346 94L312 144L342 171L263 211Z" fill="${metal}"/><path d="M34 123L100 180M326 123L260 180" stroke="${glow}"/>` : ''}
        ${gear==='shieldpack' ? `<path d="M82 164L51 178L62 253L91 276L117 248L115 181ZM278 164L309 178L298 253L269 276L243 248L245 181Z" fill="${steel}"/>` : ''}
        ${gear==='powercore' ? `<circle cx="180" cy="212" r="49" fill="none" stroke="${glow}" stroke-width="10" opacity=".6"/><circle cx="180" cy="212" r="22" fill="${glow}"/>` : ''}
        ${gear==='spikes' ? `<path d="M118 160L100 104L146 141M242 160L260 104L214 141M104 225L63 196L120 206M256 225L297 196L240 206" fill="${metal}"/>` : ''}
        ${gear==='banner' ? `<path d="M271 149V31" stroke="${steel}" stroke-width="8"/><path d="M273 32L336 51L273 77Z" fill="${l}"/>` : ''}
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
        ${gearArt}
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
