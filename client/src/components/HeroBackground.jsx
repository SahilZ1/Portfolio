/**
 * Hero background: a slow-drifting node network with data packets travelling
 * along its links.
 *
 * The visual idea is a system diagram rather than a screensaver — nodes,
 * connections and traffic, which is what the site is about. It is deliberately
 * low-contrast and slow: the hero text must dominate, not compete.
 *
 * Performance and accessibility guards, all of which matter more than the
 * effect itself:
 *
 *  - Canvas, not DOM. Sixty animated DOM nodes would thrash layout; one canvas
 *    element does not.
 *  - Rendering stops when the canvas scrolls out of view (IntersectionObserver)
 *    and when the tab is hidden (visibilitychange). An animation loop running
 *    behind a background tab is pure battery cost.
 *  - Node count scales with viewport area and is capped hard on small screens.
 *  - devicePixelRatio is capped at 2; a 3x phone display would otherwise mean
 *    rendering nine times the pixels for no visible gain.
 *  - Link-finding is O(n²) over a small, capped n, run once per frame, with the
 *    distance check done on squared distances to avoid a sqrt per pair.
 *  - prefers-reduced-motion renders ONE static frame and never starts the loop.
 *  - The pointer-parallax is desktop-only and is not registered at all on a
 *    coarse pointer.
 *
 * The element is aria-hidden: it carries no information, and nothing on the
 * page depends on seeing it.
 */

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/motion.js";

const BRAND = "255, 200, 0";
const INK = "16, 17, 20";

/** Node count from viewport area, bounded at both ends. */
function nodeCountFor(width, height) {
  const byArea = Math.round((width * height) / 26_000);
  const cap = width < 640 ? 26 : width < 1100 ? 44 : 64;
  return Math.max(14, Math.min(byArea, cap));
}

export function HeroBackground() {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return undefined;

    const reduced = prefersReducedMotion();
    const coarsePointer = window.matchMedia?.("(hover: none), (pointer: coarse)").matches ?? false;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let nodes = [];
    let packets = [];
    let frameId = null;
    let running = false;

    /** Recompute canvas size and regenerate the node field. */
    function layout() {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = nodeCountFor(width, height);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        // Very slow drift: the field should feel alive, not busy.
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        radius: Math.random() < 0.16 ? 2.6 : 1.4,
        // A minority of nodes are "hot" and drawn in brand yellow.
        hot: Math.random() < 0.18,
      }));

      packets = [];
    }

    const LINK_DISTANCE = 150;
    const LINK_DISTANCE_SQ = LINK_DISTANCE * LINK_DISTANCE;

    function step() {
      context.clearRect(0, 0, width, height);

      const pointer = pointerRef.current;
      // Parallax offset, in pixels, applied to the whole field.
      const offsetX = pointer.active ? (pointer.x - 0.5) * 22 : 0;
      const offsetY = pointer.active ? (pointer.y - 0.5) * 14 : 0;

      // --- advance nodes -------------------------------------------------
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        // Wrap rather than bounce: bouncing creates visible edges where the
        // field becomes denser.
        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;
      }

      // --- links ----------------------------------------------------------
      context.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distanceSq = dx * dx + dy * dy;
          if (distanceSq > LINK_DISTANCE_SQ) continue;

          const closeness = 1 - Math.sqrt(distanceSq) / LINK_DISTANCE;
          const brandLink = a.hot || b.hot;
          context.strokeStyle = brandLink
            ? `rgba(${BRAND}, ${closeness * 0.5})`
            : `rgba(${INK}, ${closeness * 0.11})`;
          context.beginPath();
          context.moveTo(a.x + offsetX, a.y + offsetY);
          context.lineTo(b.x + offsetX, b.y + offsetY);
          context.stroke();

          // Occasionally launch a packet down a link. Rate-limited by the
          // packet cap so a dense field does not flood the canvas.
          if (brandLink && packets.length < 10 && Math.random() < 0.0016) {
            packets.push({ ax: a, bx: b, t: 0, speed: 0.006 + Math.random() * 0.008 });
          }
        }
      }

      // --- nodes ----------------------------------------------------------
      for (const node of nodes) {
        context.beginPath();
        context.arc(node.x + offsetX, node.y + offsetY, node.radius, 0, Math.PI * 2);
        context.fillStyle = node.hot ? `rgba(${BRAND}, 0.95)` : `rgba(${INK}, 0.24)`;
        context.fill();

        if (node.hot) {
          // Soft halo on the brand nodes.
          context.beginPath();
          context.arc(node.x + offsetX, node.y + offsetY, node.radius * 3.4, 0, Math.PI * 2);
          context.fillStyle = `rgba(${BRAND}, 0.1)`;
          context.fill();
        }
      }

      // --- packets ----------------------------------------------------------
      packets = packets.filter((packet) => {
        packet.t += packet.speed;
        if (packet.t >= 1) return false;

        const x = packet.ax.x + (packet.bx.x - packet.ax.x) * packet.t + offsetX;
        const y = packet.ax.y + (packet.bx.y - packet.ax.y) * packet.t + offsetY;
        // Fade in and out at the ends of the run rather than popping.
        const alpha = Math.sin(packet.t * Math.PI);

        context.beginPath();
        context.arc(x, y, 2.4, 0, Math.PI * 2);
        context.fillStyle = `rgba(${BRAND}, ${alpha})`;
        context.fill();
        return true;
      });
    }

    function loop() {
      step();
      frameId = window.requestAnimationFrame(loop);
    }

    function startLoop() {
      if (running || reduced) return;
      running = true;
      frameId = window.requestAnimationFrame(loop);
    }

    function stopLoop() {
      running = false;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    }

    layout();

    if (reduced) {
      // One static frame: the composition is still there, nothing moves.
      step();
    } else {
      startLoop();
    }

    // Pause when scrolled away.
    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? startLoop() : stopLoop()),
      { threshold: 0 }
    );
    observer.observe(canvas);

    // Pause when the tab is backgrounded.
    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());
    document.addEventListener("visibilitychange", onVisibility);

    // Resize: debounced via rAF so a drag-resize does not rebuild the field
    // on every intermediate size.
    let resizeFrame = null;
    const onResize = () => {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => {
        layout();
        if (reduced) step();
      });
    };
    window.addEventListener("resize", onResize);

    // Pointer parallax — desktop only.
    let onPointerMove = null;
    let onPointerLeave = null;
    if (!coarsePointer && !reduced) {
      onPointerMove = (event) => {
        const rect = canvas.getBoundingClientRect();
        pointerRef.current = {
          x: (event.clientX - rect.left) / rect.width,
          y: (event.clientY - rect.top) / rect.height,
          active: true,
        };
      };
      onPointerLeave = () => {
        pointerRef.current = { x: 0.5, y: 0.5, active: false };
      };
      const parent = canvas.parentElement ?? window;
      parent.addEventListener("pointermove", onPointerMove, { passive: true });
      parent.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      stopLoop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      if (onPointerMove) {
        const parent = canvas.parentElement ?? window;
        parent.removeEventListener("pointermove", onPointerMove);
        parent.removeEventListener("pointerleave", onPointerLeave);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="hero__canvas" aria-hidden="true" />;
}
