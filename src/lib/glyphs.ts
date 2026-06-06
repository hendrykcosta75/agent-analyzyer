/**
 * Procedural icon-chip textures for the 3D minimap markers.
 * Glyphs are drawn in white on transparent canvases so the marker material can
 * tint them to the node's status color (and bloom can pick up the bright edges).
 * Everything is cached, so each glyph/canvas is built at most once.
 */
import * as THREE from "three";
import type { NodeFlavor, VisualNodeKind } from "@/types/visual";

export type GlyphKey = "gateway" | "agent" | "memory" | "mcp" | "skill" | "tool";

const cache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return { c, ctx: c.getContext("2d")!, size };
}

function finalize(c: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Map a node kind/flavor to the glyph it should render. */
export function glyphKeyFor(kind: VisualNodeKind, flavor?: NodeFlavor): GlyphKey {
  if (kind === "gateway") return "gateway";
  if (kind === "agent") return "agent";
  if (kind === "memory") return "memory";
  switch (flavor) {
    case "memory":
      return "memory";
    case "mcp":
      return "mcp";
    case "skill":
      return "skill";
    default:
      return "tool";
  }
}

function polygon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, sides: number, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawGlyph(ctx: CanvasRenderingContext2D, key: GlyphKey, s: number) {
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.26;
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = s * 0.05;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (key) {
    case "gateway": {
      // Isometric cube
      const w = r * 1.1;
      const h = r * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 1.6);
      ctx.lineTo(cx + w, cy - h * 0.6);
      ctx.lineTo(cx + w, cy + h * 0.6);
      ctx.lineTo(cx, cy + h * 1.6);
      ctx.lineTo(cx - w, cy + h * 0.6);
      ctx.lineTo(cx - w, cy - h * 0.6);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - w, cy - h * 0.6);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + w, cy - h * 0.6);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + h * 1.6);
      ctx.stroke();
      break;
    }
    case "agent": {
      polygon(ctx, cx, cy, r, 6, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.34, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "memory": {
      // Database cylinder
      const w = r * 0.92;
      const eh = r * 0.34;
      const top = cy - r * 0.78;
      const bottom = cy + r * 0.78;
      ctx.beginPath();
      ctx.ellipse(cx, top, w, eh, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - w, top);
      ctx.lineTo(cx - w, bottom);
      ctx.moveTo(cx + w, top);
      ctx.lineTo(cx + w, bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, bottom, w, eh, 0, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, w, eh, 0, 0, Math.PI);
      ctx.stroke();
      break;
    }
    case "mcp": {
      // IC chip: square body with legs
      const b = r * 0.82;
      roundRect(ctx, cx - b, cy - b, b * 2, b * 2, s * 0.03);
      ctx.stroke();
      const leg = r * 0.34;
      ctx.beginPath();
      for (const o of [-0.5, 0.5]) {
        ctx.moveTo(cx + o * b, cy - b);
        ctx.lineTo(cx + o * b, cy - b - leg);
        ctx.moveTo(cx + o * b, cy + b);
        ctx.lineTo(cx + o * b, cy + b + leg);
        ctx.moveTo(cx - b, cy + o * b);
        ctx.lineTo(cx - b - leg, cy + o * b);
        ctx.moveTo(cx + b, cy + o * b);
        ctx.lineTo(cx + b + leg, cy + o * b);
      }
      ctx.stroke();
      break;
    }
    case "skill": {
      // Four-point spark
      const R = r * 1.05;
      const w = r * 0.22;
      ctx.beginPath();
      ctx.moveTo(cx, cy - R);
      ctx.quadraticCurveTo(cx + w, cy - w, cx + R, cy);
      ctx.quadraticCurveTo(cx + w, cy + w, cx, cy + R);
      ctx.quadraticCurveTo(cx - w, cy + w, cx - R, cy);
      ctx.quadraticCurveTo(cx - w, cy - w, cx, cy - R);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "tool":
    default: {
      // 2x2 module grid
      const g = r * 0.62;
      const gap = r * 0.22;
      for (const ox of [-1, 1]) {
        for (const oy of [-1, 1]) {
          const x = cx + (ox * (g + gap)) / 2 - g / 2;
          const y = cy + (oy * (g + gap)) / 2 - g / 2;
          roundRect(ctx, x, y, g, g, s * 0.02);
          ctx.stroke();
        }
      }
      break;
    }
  }
}

/** White line-art glyph on transparent background (tint with material color). */
export function getGlyphTexture(key: GlyphKey): THREE.CanvasTexture {
  const id = `glyph-${key}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const { c, ctx, size } = makeCanvas();
  ctx.clearRect(0, 0, size, size);
  drawGlyph(ctx, key, size);
  const tex = finalize(c);
  cache.set(id, tex);
  return tex;
}

/** Filled rounded-square alpha mask for the dark chip backing. */
export function getChipTexture(): THREE.CanvasTexture {
  const id = "chip-fill";
  const hit = cache.get(id);
  if (hit) return hit;
  const { c, ctx, size } = makeCanvas();
  ctx.clearRect(0, 0, size, size);
  const pad = size * 0.13;
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, size * 0.18);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  const tex = finalize(c);
  cache.set(id, tex);
  return tex;
}

/** Rounded-square outline (tint with status color). */
export function getChipBorderTexture(): THREE.CanvasTexture {
  const id = "chip-border";
  const hit = cache.get(id);
  if (hit) return hit;
  const { c, ctx, size } = makeCanvas();
  ctx.clearRect(0, 0, size, size);
  const pad = size * 0.13;
  ctx.lineWidth = size * 0.04;
  ctx.strokeStyle = "#ffffff";
  roundRect(ctx, pad, pad, size - pad * 2, size - pad * 2, size * 0.18);
  ctx.stroke();
  const tex = finalize(c);
  cache.set(id, tex);
  return tex;
}
