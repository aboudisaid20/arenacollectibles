import Image from "next/image";
import { MomentArt, MOMENTS } from "@/components/MomentArt";
import type { ReactNode } from "react";

/**
 * ============================================================
 *  HERO TRAIL IMAGERY
 * ============================================================
 *
 * Square, full-bleed crops of sporting moments. Add or remove files in
 * /public/players and update this list — the trail picks them up and
 * nothing else needs touching. Falls back to the original moment posters
 * in components/MomentArt.tsx if the list is emptied.
 *
 * Format note: these are 1:1. PointerTrail renders square cells and
 * crops with object-cover, so a non-square file will be centre-cropped
 * rather than letterboxed.
 *
 * LICENSING — press photographs of famous moments are owned by agencies
 * (Getty, AP, Reuters), and commercial use of a recognisable athlete
 * generally needs BOTH a commercial photo licence and personality
 * rights. An editorial licence does not cover selling products alongside
 * them. Confirm clearance for anything listed here before going live.
 */
export const PLAYER_PHOTOS: { src: string; alt: string }[] = [
  { src: "/players/00e6f8d7-121215-UFC-Jose-Aldo-Conor-McGregor-3-LN-PI_polaroid_square.jpg", alt: "" },
  { src: "/players/2010-Kobe_polaroid_square.jpg", alt: "" },
  { src: "/players/29onsoccer-pele-1-f34f-mediumSquareAt3X_polaroid_square.jpg", alt: "" },
  { src: "/players/34376860-8838983-image-m-2_1602676547186_polaroid_square.jpg", alt: "" },
  { src: "/players/4114_polaroid_square.jpg", alt: "" },
  { src: "/players/486476180_polaroid_square.jpg", alt: "" },
  { src: "/players/5392_polaroid_square.jpg", alt: "" },
  { src: "/players/6856229_polaroid_square.jpg", alt: "" },
  { src: "/players/77366209007-36-424855_polaroid_square.jpg", alt: "" },
  { src: "/players/BNG-L-WARRIORS-0104-17_polaroid_square.jpg", alt: "" },
  { src: "/players/Copertine-sito-Football-World-3-3-1068x601_polaroid_square.jpg", alt: "" },
  { src: "/players/CurryShot81224-scaled_polaroid_square.jpg", alt: "" },
  { src: "/players/GettyImages-987922082_polaroid_square.jpg", alt: "" },
  { src: "/players/Rafael-Nadal-Clay-French-Open-Korda-scaled_polaroid_square.jpg", alt: "" },
  { src: "/players/TVO76CDW5VOCXOIYBW67B76BVY_polaroid_square.jpg", alt: "" },
  { src: "/players/blt3138ae7c1d1b551a_polaroid_square.jpg", alt: "" },
  { src: "/players/blt3ad0b4013aac8655_polaroid_square.jpg", alt: "" },
  { src: "/players/federer_2017_wimbledon_16_polaroid_square.jpg", alt: "" },
  { src: "/players/fern-story-1_polaroid_square.jpg", alt: "" },
  { src: "/players/images-2_polaroid_square.jpg", alt: "" },
  { src: "/players/images_1_polaroid_square.jpg", alt: "" },
  { src: "/players/images_2_polaroid_square.jpg", alt: "" },
  { src: "/players/images_3_polaroid_square.jpg", alt: "" },
  { src: "/players/images_55_polaroid_square.jpg", alt: "" },
  { src: "/players/maxresdefault_polaroid_square.jpg", alt: "" },
  { src: "/players/shaquille-o-neal-beim-dunking_polaroid_square.jpg", alt: "" },
  { src: "/players/skysports-mo-salah-liverpool_5533883_polaroid_square.jpg", alt: "" },
  { src: "/players/w1280-p16x9-AP26172584798364_polaroid_square.jpg", alt: "" },
  { src: "/players/xfz6edqbld0u9iqkdivd_polaroid_square.jpg", alt: "" },
];

/** Slots the trail cycles through. More slots = longer before a repeat. */
export const TRAIL_SLOTS = Math.max(6, Math.min(PLAYER_PHOTOS.length, 30));

export function trailSlides(): ReactNode[] {
  if (PLAYER_PHOTOS.length > 0) {
    return PLAYER_PHOTOS.slice(0, TRAIL_SLOTS).map((p, i) => (
      <div
        key={p.src}
        className="relative h-full w-full overflow-hidden shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/12"
      >
        <Image
          src={p.src}
          // Decorative: the whole trail layer is aria-hidden.
          alt=""
          fill
          // Up to `maxVisible` (6) are on screen at once, so the first
          // handful have to be ready the moment the pointer moves. The
          // rest load in the background; PointerTrail will not spawn a
          // slot whose image has not decoded, so a slow one is skipped
          // rather than drawn blank.
          priority={i < 8}
          // Cells render at 338px on desktop and 165px on a phone.
          // Declaring 320 lands on the 640 variant (~1.9x density)
          // instead of letting 2x round up to 750 — indistinguishable on
          // grainy photos shown for about a second, and a third off the
          // hero payload.
          sizes="(max-width: 640px) 180px, 320px"
          quality={60}
          className="object-cover"
        />
      </div>
    ));
  }

  // Fallback: original moment posters, no photography required.
  const out: ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const moment = MOMENTS[i % MOMENTS.length];
    out.push(
      <div key={`${moment.id}-${i}`} className="h-full w-full">
        <MomentArt moment={moment} />
      </div>,
    );
  }
  return out;
}
