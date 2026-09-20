import type { ReactNode } from "react";

/**
 * Sporting-moment posters.
 *
 * ORIGINAL ARTWORK, not photography. Press photographs of famous moments
 * are agency-owned (Getty, AP, Reuters), and commercial use of a
 * recognisable athlete needs personality rights on top of a photo
 * licence. These are stylised silhouettes of the *actions* — a volley, a
 * chase-down block, a bicycle kick — captioned by the move, not by any
 * individual. See trail-assets.tsx to swap in licensed photography.
 *
 * Figures are built from round-capped tapered strokes rather than
 * rectangles: the round joints overlap and merge into one continuous
 * silhouette, which is what stops it reading as a pictogram.
 */

const SKIN = "#F5F3EF";

type Pt = [number, number];

/** Upper + lower limb segment, tapering toward the extremity. */
function Limb({
  from, joint, to, w1, w2,
}: {
  from: Pt; joint: Pt; to: Pt; w1: number; w2: number;
}) {
  return (
    <>
      <path
        d={`M${from[0]} ${from[1]} L${joint[0]} ${joint[1]}`}
        stroke={SKIN} strokeWidth={w1} strokeLinecap="round" fill="none"
      />
      <path
        d={`M${joint[0]} ${joint[1]} L${to[0]} ${to[1]}`}
        stroke={SKIN} strokeWidth={w2} strokeLinecap="round" fill="none"
      />
    </>
  );
}

/** Head plus neck, drawn as one merged mass. */
function Head({ c, r, neck }: { c: Pt; r: number; neck: Pt }) {
  return (
    <>
      <path
        d={`M${c[0]} ${c[1]} L${neck[0]} ${neck[1]}`}
        stroke={SKIN} strokeWidth={r * 0.9} strokeLinecap="round" fill="none"
      />
      <circle cx={c[0]} cy={c[1]} r={r} fill={SKIN} />
    </>
  );
}

/** Shoulders-to-hips mass, wider at the chest. */
function Torso({ sL, sR, hL, hR }: { sL: Pt; sR: Pt; hL: Pt; hR: Pt }) {
  return (
    <path
      d={`M${sL[0]} ${sL[1]} L${sR[0]} ${sR[1]} L${hR[0]} ${hR[1]} L${hL[0]} ${hL[1]} Z`}
      fill={SKIN}
      stroke={SKIN}
      strokeWidth="13"
      strokeLinejoin="round"
    />
  );
}

const Ball = ({ c, r, accent }: { c: Pt; r: number; accent: string }) => (
  <>
    <circle cx={c[0]} cy={c[1]} r={r} fill={accent} />
    <circle cx={c[0]} cy={c[1]} r={r} fill="none" stroke="#000" strokeOpacity="0.4" strokeWidth="1.5" />
  </>
);

const Arc = ({ d, accent }: { d: string; accent: string }) => (
  <path d={d} fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="2.5"
    strokeDasharray="6 9" strokeLinecap="round" />
);

export interface Moment {
  id: string;
  caption: string;
  sub: string;
  accent: string;
  figure: (accent: string) => ReactNode;
}

export const MOMENTS: Moment[] = [
  {
    id: "dagger",
    caption: "The Dagger",
    sub: "Three · 0.6 left",
    accent: "#FF7A1F",
    figure: (a) => (
      <g>
        <Arc d="M244 104 C 272 58, 310 56, 322 92" accent={a} />
        {/* trailing, tucked leg first so it sits behind the torso */}
        <Limb from={[202, 262]} joint={[220, 324]} to={[244, 372]} w1={21} w2={15} />
        <Limb from={[168, 186]} joint={[144, 150]} to={[162, 118]} w1={15} w2={11} />
        <Torso sL={[166, 188]} sR={[206, 184]} hL={[176, 266]} hR={[204, 264]} />
        <Limb from={[174, 262]} joint={[156, 330]} to={[148, 392]} w1={22} w2={16} />
        <Head c={[186, 148]} r={19} neck={[188, 180]} />
        {/* shooting arm, fully extended with the wrist snapped over */}
        <Limb from={[206, 184]} joint={[228, 144]} to={[238, 108]} w1={16} w2={11} />
        <Ball c={[250, 84]} r={19} accent={a} />
      </g>
    ),
  },
  {
    id: "volley",
    caption: "The Volley",
    sub: "Left foot · 45 yards",
    accent: "#B5FF00",
    figure: (a) => (
      <g>
        <Arc d="M286 196 C 318 158, 346 150, 360 168" accent={a} />
        <Limb from={[170, 182]} joint={[204, 166]} to={[232, 178]} w1={14} w2={10} />
        <Torso sL={[136, 190]} sR={[172, 182]} hL={[146, 262]} hR={[172, 258]} />
        {/* planted leg */}
        <Limb from={[146, 260]} joint={[138, 328]} to={[134, 396]} w1={22} w2={16} />
        <Head c={[150, 148]} r={18} neck={[152, 180]} />
        {/* balance arm swung back */}
        <Limb from={[136, 190]} joint={[100, 204]} to={[70, 190]} w1={14} w2={10} />
        {/* striking leg, swung high across the body */}
        <Limb from={[172, 256]} joint={[224, 238]} to={[272, 202]} w1={23} w2={16} />
        <Ball c={[298, 186]} r={19} accent={a} />
      </g>
    ),
  },
  {
    id: "block",
    caption: "The Block",
    sub: "Chase-down · Game 7",
    accent: "#3B82F6",
    figure: (a) => (
      <g>
        <Arc d="M300 318 C 276 248, 256 190, 250 148" accent={a} />
        {/* legs trailing behind the leap */}
        <Limb from={[138, 308]} joint={[96, 342]} to={[58, 362]} w1={22} w2={16} />
        <Limb from={[162, 304]} joint={[144, 360]} to={[136, 408]} w1={21} w2={15} />
        <Limb from={[140, 236]} joint={[104, 256]} to={[74, 246]} w1={14} w2={10} />
        <Torso sL={[140, 234]} sR={[174, 226]} hL={[140, 308]} hR={[164, 304]} />
        <Head c={[148, 196]} r={18} neck={[152, 228]} />
        {/* blocking arm at full stretch */}
        <Limb from={[174, 226]} joint={[210, 184]} to={[236, 146]} w1={16} w2={11} />
        <Ball c={[250, 124]} r={19} accent={a} />
      </g>
    ),
  },
  {
    id: "bicycle",
    caption: "The Bicycle",
    sub: "Overhead · 1–0",
    accent: "#E11D48",
    figure: (a) => (
      <g>
        <Arc d="M280 128 C 322 168, 336 232, 314 292" accent={a} />
        {/* trailing leg scissored down */}
        <Limb from={[208, 292]} joint={[250, 312]} to={[292, 340]} w1={22} w2={16} />
        <Limb from={[146, 302]} joint={[108, 316]} to={[76, 304]} w1={14} w2={10} />
        {/* body horizontal, head low-left */}
        <Torso sL={[142, 306]} sR={[152, 272]} hL={[204, 296]} hR={[212, 268]} />
        <Head c={[118, 294]} r={18} neck={[146, 290]} />
        <Limb from={[152, 274]} joint={[124, 250]} to={[100, 236]} w1={14} w2={10} />
        {/* striking leg scissored up */}
        <Limb from={[208, 268]} joint={[240, 216]} to={[262, 166]} w1={23} w2={16} />
        <Ball c={[272, 134]} r={19} accent={a} />
      </g>
    ),
  },
  {
    id: "lift",
    caption: "The Lift",
    sub: "Trophy · Full time",
    accent: "#FACC15",
    figure: (a) => (
      <g>
        {/* trophy, held overhead */}
        <g>
          <path d="M178 66 L 222 66 L 216 104 L 184 104 Z" fill={a} />
          <path d="M172 66 C 152 70, 152 98, 174 100" fill="none" stroke={a} strokeWidth="8" strokeLinecap="round" />
          <path d="M228 66 C 248 70, 248 98, 226 100" fill="none" stroke={a} strokeWidth="8" strokeLinecap="round" />
          <rect x="193" y="104" width="14" height="20" fill={a} />
          <rect x="178" y="124" width="44" height="11" rx="2" fill={a} />
        </g>
        <Limb from={[180, 236]} joint={[172, 190]} to={[184, 146]} w1={15} w2={11} />
        <Limb from={[220, 236]} joint={[228, 190]} to={[216, 146]} w1={15} w2={11} />
        <Torso sL={[178, 238]} sR={[222, 238]} hL={[184, 320]} hR={[216, 320]} />
        <Limb from={[186, 318]} joint={[180, 362]} to={[176, 404]} w1={23} w2={17} />
        <Limb from={[214, 318]} joint={[221, 362]} to={[226, 404]} w1={23} w2={17} />
        <Head c={[200, 200]} r={20} neck={[200, 234]} />
        {[[76, 120], [320, 96], [104, 226], [312, 250], [62, 310], [338, 330], [150, 92], [256, 84]].map(
          ([x, y], i) => (
            <rect key={i} x={x} y={y} width="7" height="12" fill={a}
              fillOpacity={0.55 - i * 0.05} transform={`rotate(${i * 41} ${x} ${y})`} />
          ),
        )}
      </g>
    ),
  },
  {
    id: "finish",
    caption: "The Finish",
    sub: "Line · Photo",
    accent: "#22D3EE",
    figure: (a) => (
      <g>
        {/* trailing leg folded behind */}
        <Limb from={[188, 278]} joint={[148, 296]} to={[136, 344]} w1={22} w2={16} />
        <Limb from={[192, 208]} joint={[154, 218]} to={[128, 202]} w1={14} w2={10} />
        <Torso sL={[192, 206]} sR={[224, 200]} hL={[188, 280]} hR={[212, 276]} />
        {/* lead leg driving through */}
        <Limb from={[212, 274]} joint={[254, 302]} to={[276, 346]} w1={23} w2={16} />
        <Head c={[212, 166]} r={18} neck={[210, 198]} />
        <Limb from={[224, 200]} joint={[262, 190]} to={[286, 208]} w1={15} w2={11} />
        {/* tape, breaking across the chest */}
        <path d="M96 232 C 170 226, 250 230, 320 222" stroke={a} strokeWidth="3.5"
          strokeLinecap="round" fill="none" />
        <Arc d="M70 372 L 330 372" accent={a} />
      </g>
    ),
  },
];

export function MomentArt({
  moment,
  className = "",
  showCaption = true,
}: {
  moment: Moment;
  className?: string;
  showCaption?: boolean;
}) {
  const { id, accent, caption, sub } = moment;

  return (
    <svg viewBox="0 0 400 520" className={`h-full w-full ${className}`}
      role="presentation" focusable="false">
      <defs>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.4" r="0.66">
          <stop offset="0%" stopColor={accent} stopOpacity="0.26" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`frame-${id}`}>
          <rect x="0" y="0" width="400" height="520" rx="2" />
        </clipPath>
      </defs>

      <g clipPath={`url(#frame-${id})`}>
        <rect width="400" height="520" fill="#09090A" />
        <rect width="400" height="520" fill={`url(#glow-${id})`} />
        <path d="M0 406 L400 406" stroke={accent} strokeOpacity="0.2" strokeWidth="2" />

        {moment.figure(accent)}

        {showCaption && (
          <g>
            <rect x="0" y="424" width="400" height="96" fill="#000" fillOpacity="0.62" />
            <text x="26" y="470" fontFamily="Anton, 'Arial Narrow', sans-serif"
              fontSize="40" letterSpacing="0.5" fill="#F5F3EF">
              {caption.toUpperCase()}
            </text>
            <text x="27" y="496" fontFamily="IBM Plex Mono, monospace"
              fontSize="13" letterSpacing="1.8" fill={accent}>
              {sub.toUpperCase()}
            </text>
          </g>
        )}

        <rect x="0.75" y="0.75" width="398.5" height="518.5" fill="none"
          stroke={accent} strokeOpacity="0.32" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
