# ARENA Collectibles — Design System

Authoritative. Where code and this file disagree, fix the code.

---

## 1. Colour

Three colours, as specified: black ground, white and brand green as accents.

| Token | Hex | Role |
|---|---|---|
| `--color-void` | `#000000` | Page ground |
| `--color-pitch` | `#0A0A0A` | Raised surface / bands |
| `--color-deck` | `#121214` | Product cards |
| `--color-line` | `#242427` | Hairline — **non-text only** |
| `--color-line-hot` | `#3A3A3F` | Hover hairline |
| `--color-volt` | `#B5FF00` | Brand green — accent, CTA fill |
| `--color-volt-dim` | `#93CC00` | Hover state on volt fills |
| `--color-chalk` | `#FFFFFF` | Primary text |
| `--color-fog` | `#A3A3A3` | Secondary text |
| `--color-steel` | `#8A8A8A` | Tertiary — smallest permitted for text |
| `--color-flag` | `#FF4D4D` | Errors |

### The green, measured

`#B5FF00` was sampled directly from the supplied logo (not the `#BEF202`
that shipped in the neon-mesh snippet — that has been replaced throughout).

Its luminance is very high, so **it behaves like a light colour**:

| Pair | Ratio | Verdict |
|---|---|---|
| Volt on black | **17.27:1** | Excellent |
| Black on volt | **17.27:1** | Excellent — this is why buttons are black-on-green |
| **White on volt** | **1.22:1** | **Banned.** No variant in `ui/index.tsx` can produce it |
| White on black | 21.00:1 | — |
| Fog on black | 7.85:1 | — |
| Steel on black | 5.73:1 | Floor for text |

`--color-line` (1.14:1) must never carry text. It is borders only.

---

## 2. Type

Taken from the Card Culture reference, whose live stack was measured
rather than guessed: a heavy condensed poster face over a serif body.

| Role | Face | Usage |
|---|---|---|
| Display | **Anton** | All headings and buttons. Uppercase, tight, large. Never body copy. |
| Body | **Lora** | Paragraphs, product names, long copy. |
| Data | **IBM Plex Mono** | Prices, grades, cert numbers, SKUs, scoreboard labels. |

Three faces, three jobs, no overlap. Every price, grade, population count
and cert number uses `.tnum` (tabular figures) so numbers never jitter
between states.

Display scale is `clamp()` throughout — the hero runs to `17vw`.

---

## 3. Motion

| Rule | Applied |
|---|---|
| transform / opacity only | No reflow, no CLS |
| `set()` + `to()`, never `from()` | A killed `from()` tween strands elements invisible |
| `matchMedia()` reduced-motion branch | Writes the final state, not just a faster animation |
| Pre-reveal hidden via CSS, gated on `html.fx-ready` | Set before first paint; 4s failsafe unhides if the motion chunk never boots |
| Auto-moving content has a pause control | Ticker (WCAG 2.2.2) |
| Offscreen simulations pause | Mesh uses IntersectionObserver |

### The two signature effects

**PointerTrail** (`ui/pointer-trail.tsx`) — hero. Recycled pool of 18
slots; nothing is created or destroyed per movement. Fine pointer spawns
on cursor travel past a threshold; coarse pointer spawns on drag plus a
slow idle autoplay so a phone never sees a dead hero; reduced motion
renders a static scatter with no listeners at all.

**NeonMesh** (`ui/neon-mesh.tsx`) — CTA band, shop and about headers.
See §5 for the fixes applied to the supplied source.

The two never share a viewport: both are pointer-driven, and running them
together halves the frame budget and splits attention.

---

## 4. Layout

Spacing rhythm `8 / 12 / 16 / 24 / 40 / 64 / 96 / 144`. Container maxes at
`90rem` with gutters `16 / 28 / 40px` by breakpoint.

Corners are square. Borders are hairlines. Emphasis comes from scale,
weight and the green — not from radius or shadow.

---

## 5. Changes made to the supplied neon-mesh component

The snippet as given does not compile and has three runtime defects.

1. **Does not compile.** Props were typed `NeonMagneticMeshProps`, which is
   never declared. Renamed to `NeonMeshProps`.
2. **Scale compounded on resize.** `ctx.scale(dpr, dpr)` ran on every
   resize without resetting the transform, so the mesh drifted off-canvas
   after a few resizes. Now calls `setTransform(1,0,0,1,0,0)` first.
3. **No reduced-motion path.** A perpetual physics animation with no way
   to stop it fails WCAG 2.2.2. It now renders one static frame and stops.
4. **Ran forever.** The simulation continued while scrolled far offscreen.
   Now paused by IntersectionObserver.
5. **Full-screen hero with baked-in headline.** Converted to a background
   layer that renders `children`, so it drops into any band.
6. **Light-mode branch and `#BEF202`.** Removed; this site is always black
   and the accent is the real brand green.
7. **Grid density fixed.** Spacing now scales with viewport — a phone
   solves far fewer constraints for the same visual result.
8. **Mouse only.** Touch handlers added.
9. **Added `scrim`.** The mesh is high-contrast by design and fights text;
   headers that carry copy enable a gradient wash.

## 6. Note on `/components/ui`

The project previously had a single `src/components/ui.tsx`. It has been
converted to a **directory** at `src/components/ui/` so the shadcn-style
convention works and `@/components/ui` still resolves (via `index.tsx`).
Keeping both a `ui.tsx` file and a `ui/` folder would make that import
ambiguous, so the file was removed.

This is not a full shadcn install — there is no `components.json` and no
Radix dependency, because nothing here needed a headless primitive. To add
shadcn later, run `npx shadcn@latest init` and accept `src/components/ui`
as the target; the folder already matches.
