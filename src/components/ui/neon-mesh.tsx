"use client";

import React, { useEffect, useRef, type ReactNode } from "react";

/**
 * NeonMesh — interactive 3D Verlet cloth, used as a section background.
 *
 * Adapted from the supplied component. Changes made, and why:
 *
 *  1. The original typed its props as `NeonMagneticMeshProps`, which is
 *     not declared anywhere — it does not compile. Renamed.
 *  2. `ctx.scale(dpr, dpr)` ran on every resize without resetting the
 *     transform first, so scale compounded on each resize and the mesh
 *     drifted off-canvas. Now resets with setTransform().
 *  3. It was a full-screen hero with its own baked-in headline. It is now
 *     a background layer that renders `children` over itself, so it can
 *     be dropped into any band.
 *  4. Light-mode branch and its `#BEF202` lime removed — this site is
 *     always black, and the accent is the real brand green #B5FF00.
 *  5. Added `prefers-reduced-motion`: renders ONE static frame and stops.
 *     A perpetual physics animation with no way to stop it fails WCAG 2.2.2.
 *  6. Added IntersectionObserver so the simulation is fully paused while
 *     the section is offscreen, instead of burning battery all page long.
 *  7. Grid spacing scales with viewport — a phone solves far fewer
 *     constraints than a desktop for the same visual result.
 *  8. Added touch support and a pointer-coarse guard.
 */

interface Point3D {
  x: number; y: number; z: number;
  oldX: number; oldY: number; oldZ: number;
  pinned: boolean;
  baseX: number; baseY: number; baseZ: number;
  projX: number; projY: number; projScale: number;
}

interface Constraint3D {
  p1: Point3D;
  p2: Point3D;
  length: number;
}

export interface NeonMeshProps {
  className?: string;
  children?: ReactNode;
  /** Larger = coarser mesh = cheaper. Desktop default 46. */
  spacing?: number;
  /** Dim the mesh so foreground copy stays legible. 0–1. */
  intensity?: number;
  /**
   * Gradient wash between the mesh and the content. Needed wherever real
   * copy sits on top — the mesh is high-contrast by design and will fight
   * text without it.
   */
  scrim?: boolean;
}

const VOLT = "#B5FF00";
const MESH_RGB = "120, 170, 0";

export function NeonMesh({
  className = "",
  children,
  spacing: spacingProp,
  intensity = 1,
  scrim = false,
}: NeonMeshProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    let visible = true;
    let running = false;

    const mouse = {
      x: -9999, y: -9999,
      targetAngleX: 0.2, targetAngleY: -0.3,
      angleX: 0.2, angleY: -0.3,
      radius: 170,
    };

    let points: Point3D[] = [];
    let constraints: Constraint3D[] = [];

    const initMesh = () => {
      points = [];
      constraints = [];

      // Coarser mesh on small screens: same look, far fewer constraints.
      const spacing = spacingProp ?? (width < 768 ? 50 : 46);

      const cols = Math.ceil((width * 1.1) / spacing) + 1;
      const rows = Math.ceil((height * 1.1) / spacing) + 1;

      const grid: Point3D[][] = [];
      const startX = -(cols * spacing) / 2;
      const startY = -(rows * spacing) / 2;

      for (let j = 0; j < rows; j++) {
        grid[j] = [];
        for (let i = 0; i < cols; i++) {
          const bx = startX + i * spacing;
          const by = startY + j * spacing;
          const isEdge = i === 0 || i === cols - 1 || j === 0 || j === rows - 1;
          const p: Point3D = {
            x: bx, y: by, z: 0,
            oldX: bx, oldY: by, oldZ: 0,
            pinned: isEdge,
            baseX: bx, baseY: by, baseZ: 0,
            projX: 0, projY: 0, projScale: 1,
          };
          points.push(p);
          grid[j][i] = p;
        }
      }

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if (i < cols - 1) {
            constraints.push({ p1: grid[j][i], p2: grid[j][i + 1], length: spacing });
          }
          if (j < rows - 1) {
            constraints.push({ p1: grid[j][i], p2: grid[j + 1][i], length: spacing });
          }
        }
      }
    };

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      // Reset before scaling, or dpr compounds on every resize.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      initMesh();
      if (reduceMotion) drawFrame();
    };

    const setPointer = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      mouse.x = rawX;
      mouse.y = rawY;
      const normX = (rawX / width - 0.5) * 2;
      const normY = (rawY / height - 0.5) * 2;
      mouse.targetAngleY = normX * 0.45;
      mouse.targetAngleX = -normY * 0.35 + 0.2;
    };

    const handleMouseMove = (e: MouseEvent) => setPointer(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setPointer(t.clientX, t.clientY);
    };
    const handleLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
      mouse.targetAngleX = 0.2;
      mouse.targetAngleY = 0;
    };

    let time = 0;

    function step() {
      time += 0.025;

      mouse.angleX += (mouse.targetAngleX - mouse.angleX) * 0.05;
      mouse.angleY += (mouse.targetAngleY - mouse.angleY) * 0.05;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.pinned) continue;
        const vx = (p.x - p.oldX) * 0.93;
        const vy = (p.y - p.oldY) * 0.93;
        const vz = (p.z - p.oldZ) * 0.93;
        p.oldX = p.x; p.oldY = p.y; p.oldZ = p.z;
        p.x += vx; p.y += vy; p.z += vz;
        const ambientZ = Math.sin(p.baseX * 0.015 + p.baseY * 0.015 + time) * 18;
        p.x += (p.baseX - p.x) * 0.04;
        p.y += (p.baseY - p.y) * 0.04;
        p.z += (p.baseZ + ambientZ - p.z) * 0.04;
      }
    }

    function project() {
      const perspective = 600;
      const cosX = Math.cos(mouse.angleX);
      const sinX = Math.sin(mouse.angleX);
      const cosY = Math.cos(mouse.angleY);
      const sinY = Math.sin(mouse.angleY);
      const centerX = width / 2;
      const centerY = height / 2;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const rx1 = p.x * cosY + p.z * sinY;
        const ry1 = p.y;
        const rz1 = -p.x * sinY + p.z * cosY;
        const rx2 = rx1;
        const ry2 = ry1 * cosX - rz1 * sinX;
        const rz2 = ry1 * sinX + rz1 * cosX + 400;
        const scale = perspective / Math.max(1, rz2);
        p.projScale = scale;
        p.projX = centerX + rx2 * scale;
        p.projY = centerY + ry2 * scale;

        if (!p.pinned) {
          const dx = p.projX - mouse.x;
          const dy = p.projY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius && dist > 0) {
            const force = (1 - dist / mouse.radius) * 22;
            const angle = Math.atan2(dy, dx);
            p.x += (Math.cos(angle) * force) / p.projScale;
            p.y += (Math.sin(angle) * force) / p.projScale;
            p.z -= (force * 1.5) / p.projScale;
          }
        }
      }
    }

    function solve() {
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < constraints.length; i++) {
          const c = constraints[i];
          const dx = c.p2.x - c.p1.x;
          const dy = c.p2.y - c.p1.y;
          const dz = c.p2.z - c.p1.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const delta = (dist - c.length) / (dist || 1);
          if (!c.p1.pinned) {
            c.p1.x += dx * 0.5 * delta;
            c.p1.y += dy * 0.5 * delta;
            c.p1.z += dz * 0.5 * delta;
          }
          if (!c.p2.pinned) {
            c.p2.x -= dx * 0.5 * delta;
            c.p2.y -= dy * 0.5 * delta;
            c.p2.z -= dz * 0.5 * delta;
          }
        }
      }
    }

    function paint() {
      if (!ctx) return;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < constraints.length; i++) {
        const c = constraints[i];
        const midX = (c.p1.projX + c.p2.projX) / 2;
        const midY = (c.p1.projY + c.p2.projY) / 2;
        const dx = mouse.x - midX;
        const dy = mouse.y - midY;
        const isHot = Math.sqrt(dx * dx + dy * dy) < mouse.radius;
        const avgScale = (c.p1.projScale + c.p2.projScale) / 2;

        ctx.strokeStyle = isHot
          ? VOLT
          : `rgba(${MESH_RGB}, ${Math.min(1, Math.max(0.08, 0.26 * avgScale * intensity))})`;
        ctx.lineWidth = isHot ? 1.9 * avgScale : 0.8 * avgScale;
        ctx.beginPath();
        ctx.moveTo(c.p1.projX, c.p1.projY);
        ctx.lineTo(c.p2.projX, c.p2.projY);
        ctx.stroke();
      }

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dx = mouse.x - p.projX;
        const dy = mouse.y - p.projY;
        if (Math.sqrt(dx * dx + dy * dy) < 100) {
          ctx.fillStyle = VOLT;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, 2.4 * p.projScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawFrame() {
      project();
      paint();
    }

    const render = () => {
      if (!visible) { running = false; return; }
      step();
      project();
      solve();
      paint();
      animationFrameId = requestAnimationFrame(render);
    };

    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      animationFrameId = requestAnimationFrame(render);
    };

    handleResize();

    // Only simulate while the section is actually on screen.
    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? false;
        if (visible) start();
        else cancelAnimationFrame(animationFrameId);
      },
      { rootMargin: "120px" },
    );
    io.observe(container);

    window.addEventListener("resize", handleResize);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleLeave);
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleLeave);

    if (reduceMotion) drawFrame();
    else start();

    return () => {
      cancelAnimationFrame(animationFrameId);
      io.disconnect();
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleLeave);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleLeave);
    };
  }, [spacingProp, intensity]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none bg-void ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" aria-hidden="true" />
      {scrim && (
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.72) 45%, rgba(0,0,0,0.25) 100%)",
          }}
        />
      )}
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
}

export default NeonMesh;
