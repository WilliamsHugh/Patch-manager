"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./liquid-glass-theme-toggle.module.css";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "patchflow-theme";

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeLens(raw: number) {
  const t = clamp(raw, 0, 1);
  if (t === 0 || t === 1) return t;
  const c4 = (2 * Math.PI) / 3.4;
  const cubic = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const settle = Math.pow(2, -8 * t) * Math.sin((t * 6.5 - 0.75) * c4) * 0.032;
  return clamp(cubic + (t > 0.65 ? settle * (1 - t) * 2.8 : 0), 0, 1.022);
}

function readInitialTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // Ignore storage read restrictions
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeToDOM(theme: ThemeMode, persist = true) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  if (persist) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage write restrictions
    }
  }
}

/**
 * Draws a clean, aspect-matched minimalist recessed track with soft Sun & Crescent Moon
 * glyphs centered at the exact rest coordinates (marginX, 0.5) and (1 - marginX, 0.5)
 * of the WebGL Liquid Glass spherical lens.
 */
class MinimalTrackScene {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 248;
    this.canvas.height = 112;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
  }

  render(darkness: number, targetWidth: number, targetHeight: number, restMarginX: number) {
    const scale = 2;
    const W = Math.max(64, Math.round(targetWidth * scale));
    const H = Math.max(32, Math.round(targetHeight * scale));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }

    const ctx = this.ctx;
    const d = clamp(darkness, 0, 1);
    const sunX = restMarginX * W;
    const moonX = (1 - restMarginX) * W;
    const centerY = H * 0.5;

    // Smooth atmospheric track gradient (Cool Pearl Slate <-> Deep Midnight Cobalt)
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    const rTop = Math.round(lerp(232, 11, d));
    const gTop = Math.round(lerp(239, 18, d));
    const bTop = Math.round(lerp(250, 38, d));
    const rBot = Math.round(lerp(213, 23, d));
    const gBot = Math.round(lerp(225, 37, d));
    const bBot = Math.round(lerp(244, 72, d));
    bgGrad.addColorStop(0, `rgb(${rTop},${gTop},${bTop})`);
    bgGrad.addColorStop(1, `rgb(${rBot},${gBot},${bBot})`);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle recessed track guide lines so optical meniscus refraction visibly bends them
    ctx.strokeStyle =
      d > 0.5
        ? `rgba(147, 197, 253, ${(0.11 * d).toFixed(3)})`
        : `rgba(37, 99, 235, ${(0.09 * (1 - d)).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.2, H * 0.018);
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(sunX, centerY + i * H * 0.125);
      ctx.lineTo(moonX, centerY + i * H * 0.125);
      ctx.stroke();
    }

    // Soft warm glow centered on Sun in Light mode, cool blue glow centered on Moon in Dark mode
    if (d < 0.95) {
      const sunGlow = ctx.createRadialGradient(sunX, centerY, H * 0.02, sunX, centerY, H * 0.38);
      sunGlow.addColorStop(0, `rgba(251, 191, 36, ${(0.36 * (1 - d)).toFixed(3)})`);
      sunGlow.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, W * 0.6, H);
    }
    if (d > 0.05) {
      const moonGlow = ctx.createRadialGradient(moonX, centerY, H * 0.02, moonX, centerY, H * 0.38);
      moonGlow.addColorStop(0, `rgba(96, 165, 250, ${(0.42 * d).toFixed(3)})`);
      moonGlow.addColorStop(1, "rgba(96, 165, 250, 0)");
      ctx.fillStyle = moonGlow;
      ctx.fillRect(W * 0.4, 0, W * 0.6, H);
    }

    // Left icon: Soft rounded Sun centered precisely at (sunX, centerY)
    ctx.save();
    ctx.translate(sunX, centerY);
    const sunColor =
      d < 0.5
        ? `rgb(${Math.round(lerp(234, 148, d * 2))},${Math.round(lerp(138, 163, d * 2))},${Math.round(lerp(12, 194, d * 2))})`
        : "rgba(148, 169, 214, 0.58)";
    ctx.strokeStyle = sunColor;
    ctx.lineWidth = Math.max(2, H * 0.036);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, H * 0.088, 0, Math.PI * 2);
    ctx.stroke();
    const rayInner = H * 0.136;
    const rayOuter = H * 0.172;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * rayInner, Math.sin(angle) * rayInner);
      ctx.lineTo(Math.cos(angle) * rayOuter, Math.sin(angle) * rayOuter);
      ctx.stroke();
    }
    ctx.restore();

    // Right icon: Two-arc Crescent Moon optically & geometrically centered at (moonX, centerY)
    ctx.save();
    ctx.translate(moonX, centerY);
    const moonAlpha = lerp(0.54, 1, d);
    const moonColor =
      d > 0.45
        ? `rgba(219, 234, 254, ${moonAlpha.toFixed(3)})`
        : `rgba(82, 96, 119, ${moonAlpha.toFixed(3)})`;
    const r1 = H * 0.162;
    const r2 = r1 * 0.82;
    const distCenters = r1 * 0.58;
    const cutAngle = -0.62; // ~ -35.5 deg (classic upper-right crescent opening)
    // Shift +0.22*r1 along cutAngle so belly (-0.78*r1) and horn tips (+0.79*r1) sit equidistant from (0, 0)
    const c1x = Math.cos(cutAngle) * (r1 * 0.22);
    const c1y = Math.sin(cutAngle) * (r1 * 0.22);
    const c2x = c1x + Math.cos(cutAngle) * distCenters;
    const c2y = c1y + Math.sin(cutAngle) * distCenters;

    const cosDelta = clamp(
      (r1 * r1 + distCenters * distCenters - r2 * r2) / (2 * r1 * distCenters),
      -1,
      1,
    );
    const delta = Math.acos(cosDelta);
    const a1Start = cutAngle + delta;
    const a1End = cutAngle - delta;
    const hornBX = c1x + Math.cos(a1End) * r1;
    const hornBY = c1y + Math.sin(a1End) * r1;
    const hornAX = c1x + Math.cos(a1Start) * r1;
    const hornAY = c1y + Math.sin(a1Start) * r1;
    const phiB = Math.atan2(hornBY - c2y, hornBX - c2x);
    const phiA = Math.atan2(hornAY - c2y, hornAX - c2x);

    ctx.fillStyle = moonColor;
    ctx.beginPath();
    ctx.arc(c1x, c1y, r1, a1Start, a1End, false);
    ctx.arc(c2x, c2y, r2, phiB, phiA, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/**
 * WebGL Optical Liquid-Glass Refraction Shader adapted from pixel-liquid-glass-toggle
 * (spherical normal + meniscus rim warping + RGB chromatic dispersion + Fresnel & specular highlights)
 */
class LiquidGlassRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly scene: MinimalTrackScene;
  private gl: WebGLRenderingContext | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;
  private program: WebGLProgram | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private texture: WebGLTexture | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, scene: MinimalTrackScene) {
    this.canvas = canvas;
    this.scene = scene;
    this.initContext();
  }

  private initContext() {
    try {
      const gl = (this.canvas.getContext("webgl", { alpha: false, antialias: true, premultipliedAlpha: false }) ||
        this.canvas.getContext("experimental-webgl", { alpha: false, antialias: true })) as WebGLRenderingContext | null;
      if (gl) {
        this.setupWebGL(gl);
        this.gl = gl;
        return;
      }
    } catch {
      // Fallback to 2D canvas if WebGL is unavailable
    }
    this.ctx2d = this.canvas.getContext("2d");
  }

  private compileShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to allocate shader");
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  private setupWebGL(gl: WebGLRenderingContext) {
    const vsSource = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      varying vec2 vUv;

      uniform sampler2D uScene;
      uniform vec2 uResolution;
      uniform float uLensX;
      uniform float uLensRadius;
      uniform float uStretchX;
      uniform float uVelocity;
      uniform float uDarkness;

      vec3 sampleTrack(vec2 uv) {
        return texture2D(uScene, clamp(uv, vec2(0.004), vec2(0.996))).rgb;
      }

      void main() {
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        vec2 lensCenter = vec2(uLensX, 0.5);

        vec2 rel = vec2((vUv.x - lensCenter.x) * aspect, vUv.y - lensCenter.y);
        vec2 relStretched = vec2(rel.x / uStretchX, rel.y);
        float dist = length(relStretched);
        float rNorm = dist / uLensRadius;

        vec3 baseColor = sampleTrack(vUv);

        vec2 shadowRel = vec2(((vUv.x - lensCenter.x) * aspect - 0.014) / uStretchX, (vUv.y - lensCenter.y) - 0.034);
        float shadowDist = length(shadowRel) / uLensRadius;
        if (rNorm >= 1.0) {
          float castShadow = (1.0 - smoothstep(0.95, 1.26, shadowDist)) * (0.24 + uDarkness * 0.24);
          float causticSpot = (1.0 - smoothstep(0.98, 1.16, shadowDist)) * smoothstep(0.86, 1.02, shadowDist);
          vec3 causticTint = mix(vec3(0.94, 0.97, 1.0), vec3(0.56, 0.76, 1.0), uDarkness);
          baseColor = baseColor * (1.0 - castShadow) + causticTint * causticSpot * (0.16 * (1.0 - uDarkness * 0.45));
          gl_FragColor = vec4(baseColor, 1.0);
          return;
        }

        vec2 dir = dist > 0.0001 ? (relStretched / dist) : vec2(0.0);
        float z = sqrt(max(0.001, 1.0 - rNorm * rNorm));
        vec3 normal = normalize(vec3(relStretched / uLensRadius, z * 0.82));

        float centerMag = 0.80;
        float rimWrap = pow(smoothstep(0.62, 1.0, rNorm), 2.2) * 0.28;
        float radialScale = mix(centerMag, 0.62, rimWrap);

        vec2 refractedRel = relStretched * radialScale;
        vec2 edgePull = -normal.xy * pow(rNorm, 3.6) * uLensRadius * 0.06;
        vec2 refractedUv = lensCenter + vec2((refractedRel.x + edgePull.x) * uStretchX / aspect, refractedRel.y + edgePull.y);

        float caStrength = pow(rNorm, 3.0) * 0.013;
        vec2 caOffset = vec2(dir.x / aspect, dir.y) * caStrength;

        float colR = sampleTrack(refractedUv + caOffset).r;
        float colG = sampleTrack(refractedUv).g;
        float colB = sampleTrack(refractedUv - caOffset).b;
        vec3 glassColor = vec3(colR, colG, colB);

        vec3 dayGlassTint = vec3(0.97, 0.99, 1.0);
        vec3 nightGlassTint = vec3(0.76, 0.86, 1.0);
        vec3 volumeTint = mix(dayGlassTint, nightGlassTint, uDarkness);
        float thicknessShade = smoothstep(0.72, 1.0, rNorm) * (0.12 + uDarkness * 0.14);
        glassColor = glassColor * mix(vec3(1.0), volumeTint, 0.22 + rNorm * 0.24) * (1.0 - thicknessShade);

        float fresnel = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.7);
        vec3 envReflectCol = mix(vec3(1.0, 1.0, 1.0), vec3(0.46, 0.66, 1.0), uDarkness);
        glassColor += envReflectCol * fresnel * 0.50;

        vec2 lightDirTop = normalize(vec3(-0.24 - uVelocity * 0.08, -0.78, 0.68)).xy;
        float topCrescent = smoothstep(0.76, 0.96, dot(normalize(relStretched + vec2(0.0001)), lightDirTop))
                          * smoothstep(0.60, 0.88, rNorm)
                          * (1.0 - smoothstep(0.93, 0.995, rNorm));
        glassColor += vec3(1.0, 0.99, 1.0) * topCrescent * 0.68;

        vec2 domePos = (relStretched / uLensRadius) - vec2(-0.14 - uVelocity * 0.04, -0.44);
        float upperDome = exp(-dot(domePos * vec2(1.4, 2.6), domePos * vec2(1.4, 2.6)) * 5.2);
        glassColor += vec3(0.96, 0.98, 1.0) * upperDome * 0.22;

        vec2 lightDirBot = normalize(vec2(0.18, 0.86));
        float botArc = smoothstep(0.70, 0.95, dot(normalize(relStretched + vec2(0.0001)), lightDirBot))
                     * smoothstep(0.72, 0.92, rNorm)
                     * (1.0 - smoothstep(0.95, 1.0, rNorm));
        vec3 botCol = mix(vec3(0.86, 0.94, 1.0), vec3(0.48, 0.68, 1.0), uDarkness);
        glassColor += botCol * botArc * 0.48;

        float rimLine = smoothstep(0.935, 0.98, rNorm) * (1.0 - smoothstep(0.985, 1.0, rNorm));
        vec3 rimCol = mix(vec3(1.0, 1.0, 1.0), vec3(0.66, 0.80, 1.0), uDarkness);
        glassColor += rimCol * rimLine * 0.68;

        float aaEdge = 1.0 - smoothstep(0.975, 1.0, rNorm);
        vec3 finalColor = mix(baseColor, glassColor, aaEdge);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const vs = this.compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = this.compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const prog = gl.createProgram();
    if (!prog) throw new Error("Unable to create program");
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`Link failed: ${gl.getProgramInfoLog(prog)}`);
    }

    this.program = prog;
    gl.useProgram(prog);

    const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    this.vertexBuffer = buf;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.texture = tex;

    this.uniforms = {
      uScene: gl.getUniformLocation(prog, "uScene"),
      uResolution: gl.getUniformLocation(prog, "uResolution"),
      uLensX: gl.getUniformLocation(prog, "uLensX"),
      uLensRadius: gl.getUniformLocation(prog, "uLensRadius"),
      uStretchX: gl.getUniformLocation(prog, "uStretchX"),
      uVelocity: gl.getUniformLocation(prog, "uVelocity"),
      uDarkness: gl.getUniformLocation(prog, "uDarkness"),
    };
  }

  resize(cssWidth: number, cssHeight: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    if (this.gl) {
      this.gl.viewport(0, 0, w, h);
    }
  }

  render(lensProgress: number, stretchX: number, velocity: number, darkness: number) {
    if (this.disposed) return;
    const W = Math.max(1, this.canvas.width);
    const H = Math.max(1, this.canvas.height);
    const aspect = W / H;
    const radiusV = 0.435;
    // Place rest centers at the exact geometric centers of the left & right semicircular pill caps
    const marginX = 0.5 / aspect;
    const lensX = lerp(marginX, 1.0 - marginX, lensProgress);

    this.scene.render(darkness, W, H, marginX);

    if (this.gl && this.program) {
      const gl = this.gl;
      gl.useProgram(this.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.scene.canvas);

      gl.uniform1i(this.uniforms.uScene, 0);
      gl.uniform2f(this.uniforms.uResolution, W, H);
      gl.uniform1f(this.uniforms.uLensX, lensX);
      gl.uniform1f(this.uniforms.uLensRadius, radiusV);
      gl.uniform1f(this.uniforms.uStretchX, stretchX);
      gl.uniform1f(this.uniforms.uVelocity, velocity);
      gl.uniform1f(this.uniforms.uDarkness, darkness);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return;
    }

    if (this.ctx2d) {
      const ctx = this.ctx2d;
      const sceneW = this.scene.canvas.width;
      const sceneH = this.scene.canvas.height;
      ctx.drawImage(this.scene.canvas, 0, 0, W, H);
      const cx = lensX * W;
      const cy = H * 0.5;
      const r = radiusV * H;

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * stretchX, r, 0, 0, Math.PI * 2);
      ctx.clip();
      const mag = 1.25;
      const srcW = ((r * 2) / W) * (sceneW / mag);
      const srcH = ((r * 2) / H) * (sceneH / mag);
      const srcX = clamp(lensX * sceneW - srcW * 0.5, 0, sceneW - srcW);
      const srcY = clamp(0.5 * sceneH - srcH * 0.5, 0, sceneH - srcH);
      ctx.drawImage(this.scene.canvas, srcX, srcY, srcW, srcH, cx - r * stretchX, cy - r, r * 2 * stretchX, r * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  dispose() {
    this.disposed = true;
    if (this.gl) {
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
  }
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> };
};

export function LiquidGlassThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("light");

  const controllerRef = useRef<{
    animateTo: (next: ThemeMode) => void;
  } | null>(null);

  const commitThemeWithWave = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    controllerRef.current?.animateTo(nextTheme);

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const btn = buttonRef.current;
    const doc = document as ViewTransitionDocument;

    if (!btn || reducedMotion || typeof doc.startViewTransition !== "function") {
      applyThemeToDOM(nextTheme, true);
      return;
    }

    const rect = btn.getBoundingClientRect();
    const cx = Math.round(rect.left + rect.width * 0.5);
    const cy = Math.round(rect.top + rect.height * 0.5);
    const maxRadius = Math.ceil(
      Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)),
    );

    const root = document.documentElement;
    root.style.setProperty("--theme-wave-x", `${cx}px`);
    root.style.setProperty("--theme-wave-y", `${cy}px`);
    root.style.setProperty("--theme-wave-r", `${maxRadius}px`);
    root.classList.add("theme-transitioning");

    const transition = doc.startViewTransition(() => {
      applyThemeToDOM(nextTheme, true);
    });

    transition.finished.finally(() => {
      root.classList.remove("theme-transitioning");
    });
  };

  useEffect(() => {
    const initial = readInitialTheme();
    setTheme(initial);
    applyThemeToDOM(initial, false);

    const buttonEl = buttonRef.current;
    const canvasEl = canvasRef.current;
    if (!buttonEl || !canvasEl) return;

    const scene = new MinimalTrackScene();
    const renderer = new LiquidGlassRenderer(canvasEl, scene);

    let lensProgress = initial === "dark" ? 1 : 0;
    let darkness = lensProgress;
    let velocity = 0;
    let rafId: number | null = null;
    let lastTime = performance.now();

    let transition: {
      startTime: number;
      duration: number;
      fromLens: number;
      toLens: number;
    } | null = null;

    let dragState: {
      pointerId: number;
      startX: number;
      startProgress: number;
      moved: boolean;
      width: number;
    } | null = null;

    const syncBezel = (d: number) => {
      buttonEl.style.setProperty("--toggle-night-mix", clamp(d, 0, 1).toFixed(3));
    };

    const drawOnce = () => {
      const rect = canvasEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        renderer.resize(rect.width, rect.height);
      }
      const stretchX = 1 + Math.min(0.035, Math.abs(velocity) * 0.028);
      renderer.render(lensProgress, stretchX, velocity, darkness);
      syncBezel(darkness);
    };

    const ensureLoop = () => {
      if (rafId !== null) return;
      lastTime = performance.now();
      const tick = (now: number) => {
        const dtSec = Math.min(0.064, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        if (transition) {
          const rawP = clamp((now - transition.startTime) / transition.duration, 0, 1);
          const eased = easeLens(rawP);
          const nextLens = clamp(lerp(transition.fromLens, transition.toLens, eased), 0, 1);
          velocity = ((nextLens - lensProgress) / Math.max(0.008, dtSec)) * 0.22;
          lensProgress = nextLens;
          darkness = clamp(lerp(transition.fromLens, transition.toLens, rawP), 0, 1);
          if (rawP >= 1) {
            lensProgress = transition.toLens;
            darkness = transition.toLens;
            velocity = 0;
            transition = null;
          }
        } else if (!dragState) {
          velocity *= 0.8;
          if (Math.abs(velocity) < 0.002) velocity = 0;
        }

        drawOnce();

        if (transition || dragState || Math.abs(velocity) > 0) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    controllerRef.current = {
      animateTo(next: ThemeMode) {
        const target = next === "dark" ? 1 : 0;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
          transition = null;
          lensProgress = target;
          darkness = target;
          velocity = 0;
          drawOnce();
          return;
        }
        transition = {
          startTime: performance.now(),
          duration: 620,
          fromLens: lensProgress,
          toLens: target,
        };
        ensureLoop();
      },
    };

    drawOnce();

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      buttonEl.setPointerCapture(e.pointerId);
      dragState = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startProgress: lensProgress,
        moved: false,
        width: Math.max(36, buttonEl.getBoundingClientRect().width * 0.52),
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      const dx = e.clientX - dragState.startX;
      if (!dragState.moved && Math.abs(dx) > 4) {
        dragState.moved = true;
        transition = null;
      }
      if (!dragState.moved) return;
      const next = clamp(dragState.startProgress + dx / dragState.width, 0, 1);
      velocity = clamp((next - lensProgress) * 14, -1.5, 1.5);
      lensProgress = next;
      darkness = next;
      ensureLoop();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      const wasDrag = dragState.moved;
      dragState = null;
      if (buttonEl.hasPointerCapture(e.pointerId)) {
        buttonEl.releasePointerCapture(e.pointerId);
      }
      const currentAttr = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const nextTheme: ThemeMode = wasDrag
        ? lensProgress >= 0.5
          ? "dark"
          : "light"
        : currentAttr === "dark"
          ? "light"
          : "dark";
      commitThemeWithWave(nextTheme);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (!dragState || e.pointerId !== dragState.pointerId) return;
      dragState = null;
      const currentAttr = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      controllerRef.current?.animateTo(currentAttr);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const currentAttr = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        commitThemeWithWave(currentAttr === "dark" ? "light" : "dark");
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
        applyThemeToDOM(e.newValue, false);
        controllerRef.current?.animateTo(e.newValue);
      }
    };

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => drawOnce()) : null;
    resizeObserver?.observe(canvasEl);

    buttonEl.addEventListener("pointerdown", onPointerDown);
    buttonEl.addEventListener("pointermove", onPointerMove);
    buttonEl.addEventListener("pointerup", onPointerUp);
    buttonEl.addEventListener("pointercancel", onPointerCancel);
    buttonEl.addEventListener("keydown", onKeyDown);
    window.addEventListener("storage", onStorage);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      buttonEl.removeEventListener("pointerdown", onPointerDown);
      buttonEl.removeEventListener("pointermove", onPointerMove);
      buttonEl.removeEventListener("pointerup", onPointerUp);
      buttonEl.removeEventListener("pointercancel", onPointerCancel);
      buttonEl.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("storage", onStorage);
      renderer.dispose();
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      role="switch"
      aria-checked={theme === "dark"}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={styles.toggle}
    >
      <span className={styles.outerBezel}>
        <span className={styles.metalNightOverlay} aria-hidden="true" />
        <span className={styles.rimHighlight} aria-hidden="true" />
        <span className={styles.innerBevel}>
          <span className={styles.innerBevelNight} aria-hidden="true" />
          <span className={styles.cavity}>
            <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
            <span className={styles.cavityDepthShadow} aria-hidden="true" />
          </span>
        </span>
      </span>
    </button>
  );
}
