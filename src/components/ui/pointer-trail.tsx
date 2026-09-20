"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";

/**
 * PointerTrail — images bloom along the cursor path.
 *
 * Decorative by definition, so the whole layer is aria-hidden and
 * pointer-events:none; anything interactive sits above it and stays
 * clickable.
 *
 * Images are dropped at fixed intervals ALONG THE POINTER PATH, not per
 * mousemove event. Each event walks the segment from the last drop point
 * to the cursor and emits one image every `spacing` pixels, so the gaps
 * stay equal whether the cursor crawls or flies — a mousemove-per-image
 * approach bunches them up when slow and scatters them when fast.
 *
 * There is no time gate, so the first image lands on the very first
 * pointer movement. Several are alive at once; they simply expire.
 *
 * Behaviour:
 *  - fine pointer  → drops one image every `spacing` px of path travelled
 *  - coarse pointer→ a simulated cursor wanders the hero and feeds the
 *                    same walker, so a phone sees the same trail; a real
 *                    finger takes over and the simulation stands down
 *  - reduced motion→ renders a small static scatter, no animation at all
 *
 * Slots are a fixed recycled pool: N nodes mounted once, reused forever.
 * Nothing is created or destroyed per movement.
 */

export interface PointerTrailProps {
  /** Recycled in order. 14–20 reads best; below ~10 repeats get obvious. */
  slides: ReactNode[];
  className?: string;
  children?: ReactNode;
  /** Distance between consecutive images along the path, in pixels. */
  spacing?: number;
  /** How long each image lives, in seconds. */
  life?: number;
  /** Hard cap on how many images can be on screen at once. */
  maxVisible?: number;
  /**
   * Rendered size of each slide at full width. Scaled down on narrow
   * viewports — a 260px cell is two thirds of a 375px phone screen and
   * buries the headline.
   */
  cellWidth?: number;
  cellHeight?: number;
  /** Cell may not exceed this fraction of the container width. */
  maxWidthFraction?: number;
  /**
   * Speed of the simulated cursor on touch devices, px per second.
   * Drives both how fast the trail travels and, with `spacing` and
   * `life`, how many images are alive at once.
   */
  virtualSpeed?: number;
}

export function PointerTrail({
  slides,
  className = "",
  children,
  spacing = 60,
  life = 1.05,
  maxVisible = 6,
  cellWidth = 338,
  cellHeight = 338,
  maxWidthFraction = 0.44,
  virtualSpeed = 250,
}: PointerTrailProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [cell, setCell] = useState({ w: cellWidth, h: cellHeight });

  // Fit the cell to the container, keeping the aspect ratio.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fit = () => {
      const w = root.clientWidth || cellWidth;
      const scale = Math.min(1, (w * maxWidthFraction) / cellWidth);
      setCell({
        w: Math.round(cellWidth * scale),
        h: Math.round(cellHeight * scale),
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    return () => ro.disconnect();
  }, [cellWidth, cellHeight, maxWidthFraction]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const slots = slotRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!slots.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    // Reduced motion: one still image, no listeners, no rAF.
    if (reduce) {
      const rect = root.getBoundingClientRect();
      slots.forEach((el, i) => {
        gsap.set(el, {
          xPercent: -50,
          yPercent: -50,
          x: rect.width * 0.72,
          y: rect.height * 0.42,
          opacity: i === 0 ? 0.4 : 0,
          scale: 1,
          rotate: 0,
        });
      });
      return;
    }

    let index = 0;
    // Anchor = where the last image was dropped, not where the pointer
    // last was. Null until the first movement.
    let anchorX: number | null = null;
    let anchorY: number | null = null;
    let rafId = 0;
    let suspendUntil = 0;
    const cleanups: (() => void)[] = [];
    // Oldest first. Anything beyond `maxVisible` is retired on spawn.
    const live: HTMLDivElement[] = [];

    const retire = (el: HTMLDivElement) => {
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 0 });
      const i = live.indexOf(el);
      if (i >= 0) live.splice(i, 1);
    };

    // Guards against a burst if the pointer jumps (tab focus, window
    // drag, a teleporting cursor) — without it a 2000px jump would drop
    // 16 images in one frame.
    const MAX_PER_EVENT = 4;

    // Scale spacing with the cell, so the images overlap by the same
    // proportion on a phone as on a desktop.
    const step = Math.max(40, spacing * (cell.w / cellWidth));

    gsap.set(slots, {
      opacity: 0, scale: 0.7, rotate: 0, xPercent: -50, yPercent: -50,
    });

    /** A slot is usable once its <img> has actually decoded. Spawning a
     *  slot whose image is still in flight is what produced blank cells:
     *  the cell lives about a second, and a first-hover request that has
     *  not landed yet never paints. Slots without an <img> (the vector
     *  fallback) are always ready. */
    const ready = (el: HTMLDivElement) => {
      const img = el.querySelector("img");
      if (!img) return true;
      return img.complete && img.naturalWidth > 0;
    };

    const spawn = (x: number, y: number) => {
      // Walk forward to the next decoded slot. Bounded by one full lap,
      // so if nothing is ready yet this costs a scan and draws nothing
      // rather than spinning.
      let el: HTMLDivElement | null = null;
      for (let probe = 0; probe < slots.length; probe++) {
        const candidate = slots[(index + probe) % slots.length];
        if (ready(candidate)) {
          el = candidate;
          index += probe;
          break;
        }
      }
      if (!el) return;
      index++;

      // Reusing a slot whose previous life has not finished: kill it and
      // write the start state explicitly rather than inheriting it.
      const already = live.indexOf(el);
      if (already >= 0) live.splice(already, 1);

      // Hold the cap. Retiring the oldest is what keeps the trail a fixed
      // length no matter how fast the pointer moves.
      while (live.length >= maxVisible) retire(live[0]);
      live.push(el);

      gsap.killTweensOf(el);
      gsap.set(el, {
        x, y,
        opacity: 0,
        scale: 0.86,
        rotate: 0,
        zIndex: index,
      });

      const enter = 0.22;
      const exit = Math.max(0.3, life - enter - 0.1);

      gsap
        .timeline()
        // Short and snappy: the entrance is what the latency feels like.
        .to(el, { opacity: 1, scale: 1, duration: enter, ease: "power3.out" })
        .to(el, {
          opacity: 0,
          scale: 0.94,
          duration: exit,
          ease: "power2.in",
          onComplete: () => {
            const i = live.indexOf(el);
            if (i >= 0) live.splice(i, 1);
          },
        }, life - exit);
    };

    /** Walks the path from the last drop point to (x, y), in container
     *  coordinates. Shared by the real pointer and the virtual one. */
    const feed = (x: number, y: number) => {
      // First movement drops immediately — no threshold to clear, so
      // there is nothing to wait for.
      if (anchorX === null || anchorY === null) {
        anchorX = x;
        anchorY = y;
        spawn(x, y);
        return;
      }

      let dx = x - anchorX;
      let dy = y - anchorY;
      let dist = Math.hypot(dx, dy);
      let emitted = 0;

      // Step along the segment in fixed increments. The anchor advances
      // with each drop, so leftover distance carries into the next event
      // and spacing stays even across event boundaries.
      while (dist >= step && emitted < MAX_PER_EVENT) {
        const t = step / dist;
        anchorX += dx * t;
        anchorY += dy * t;
        spawn(anchorX, anchorY);
        emitted++;
        dx = x - anchorX;
        dy = y - anchorY;
        dist = Math.hypot(dx, dy);
      }

      // Hit the cap: snap to the cursor so the trail does not lag behind
      // reality for the next several events.
      if (emitted >= MAX_PER_EVENT) {
        anchorX = x;
        anchorY = y;
      }
    };

    const toLocal = (clientX: number, clientY: number): [number, number] => {
      const rect = root.getBoundingClientRect();
      return [clientX - rect.left, clientY - rect.top];
    };

    const handleMouse = (e: MouseEvent) => feed(...toLocal(e.clientX, e.clientY));
    const handleTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      // A real finger takes over; the virtual cursor stands down.
      suspendUntil = performance.now() + 2600;
      feed(...toLocal(t.clientX, t.clientY));
    };

    const resetAnchor = () => { anchorX = null; anchorY = null; };
    root.addEventListener("mouseleave", resetAnchor);
    root.addEventListener("mousemove", handleMouse);
    root.addEventListener("touchmove", handleTouch, { passive: true });

    /**
     * Touch devices have no cursor, so one is simulated: a point that
     * wanders between random waypoints and feeds the same path walker.
     * The result is the identical evenly-spaced snake, not a sequence of
     * unrelated images popping in one at a time.
     */
    if (coarse) {
      const rect = root.getBoundingClientRect();
      let vx = rect.width * 0.5;
      let vy = rect.height * 0.45;
      let tx = vx;
      let ty = vy;
      // Current heading as a unit vector. Steering toward the target
      // rather than snapping to it is what makes the path curve like a
      // hand-moved mouse instead of zig-zagging between waypoints.
      let hx = 1;
      let hy = 0;
      let last = performance.now();
      let onScreen = true;

      const pickTarget = () => {
        const r = root.getBoundingClientRect();
        const mx = r.width * 0.18;
        const my = r.height * 0.2;
        tx = mx + Math.random() * Math.max(1, r.width - mx * 2);
        ty = my + Math.random() * Math.max(1, r.height - my * 2);
      };
      pickTarget();

      const io = new IntersectionObserver(
        (entries) => {
          onScreen = entries[0]?.isIntersecting ?? false;
          // Skip the gap that built up while offscreen.
          if (onScreen) last = performance.now();
        },
        { threshold: 0.05 },
      );
      io.observe(root);
      cleanups.push(() => io.disconnect());

      const tick = (now: number) => {
        // Clamped at 0.1s (10fps), not 0.05s: below that the clamp itself
        // becomes the speed limit and the cursor crawls on any device
        // dropping frames. Beyond 10fps a single larger step is correct,
        // and MAX_PER_EVENT caps how many images it can emit at once.
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;

        if (onScreen && now >= suspendUntil) {
          const r = root.getBoundingClientRect();
          let dx = tx - vx;
          let dy = ty - vy;
          let d = Math.hypot(dx, dy) || 1;

          // Retarget early and keep moving — stopping to choose costs a
          // frame each time and measurably slows the trail.
          if (d < 90) {
            pickTarget();
            dx = tx - vx;
            dy = ty - vy;
            d = Math.hypot(dx, dy) || 1;
          }

          // Slightly eager steering: at 0.05 the heading took ~20 frames
          // to come round, so the cursor overshot targets and drifted
          // into the edges.
          hx += (dx / d - hx) * 0.075;
          hy += (dy / d - hy) * 0.075;
          const m = Math.hypot(hx, hy) || 1;
          hx /= m;
          hy /= m;

          vx += hx * virtualSpeed * dt;
          vy += hy * virtualSpeed * dt;

          // Reflect off the edges like a billiard rather than clamping.
          // Clamping stalled the cursor: pinned against a wall with a
          // target still beyond it, steering dragged it straight back and
          // it travelled almost nothing — which left stretches with no
          // images on screen at all.
          const pad = 24;
          let bounced = false;
          if (vx < pad) { vx = pad; hx = Math.abs(hx); bounced = true; }
          else if (vx > r.width - pad) { vx = r.width - pad; hx = -Math.abs(hx); bounced = true; }
          if (vy < pad) { vy = pad; hy = Math.abs(hy); bounced = true; }
          else if (vy > r.height - pad) { vy = r.height - pad; hy = -Math.abs(hy); bounced = true; }
          // Retarget ahead of the new heading so steering does not
          // immediately pull it back into the wall it just left.
          if (bounced) {
            const r2 = root.getBoundingClientRect();
            tx = Math.min(Math.max(vx + hx * r2.width * 0.5, pad), r2.width - pad);
            ty = Math.min(Math.max(vy + hy * r2.height * 0.5, pad), r2.height - pad);
          }

          feed(vx, vy);
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    return () => {
      root.removeEventListener("mouseleave", resetAnchor);
      root.removeEventListener("mousemove", handleMouse);
      root.removeEventListener("touchmove", handleTouch);
      cancelAnimationFrame(rafId);
      cleanups.forEach((fn) => fn());
      gsap.killTweensOf(slots);
    };
  }, [slides.length, spacing, life, maxVisible, cell.w, cell.h, cellWidth, virtualSpeed]);

  return (
    <div ref={rootRef} className={`relative isolate overflow-hidden ${className}`}>
      {/* Decorative layer. `z-0` + positioned makes this its own stacking
          context, so the per-slot zIndex below stays contained here and
          can never paint over the headline. */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ width: cell.w, height: cell.h, opacity: 0 }}
          >
            {slide}
          </div>
        ))}
      </div>
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

export default PointerTrail;
