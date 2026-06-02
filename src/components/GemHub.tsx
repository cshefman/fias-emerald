import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import gemArt from "../assets/emerald.png";
import { POWERS, POWER_ORDER, SHORT_NAME } from "../powers";
import { POWER_ICONS } from "../icons";
import type { PowerKey, TierLevel } from "../types";

const SW = 412;
const SH = 360;
const CX = 206;
const CY = 180;

/** Flower-petal palette for the activation FX (Violet Aeonia violets + emerald leaves + gold). */
const PETAL_COLORS = ["#b98cff", "#a779ff", "#d98fe0", "#f7da86", "#57db93", "#7fe0b0"];

export interface GemHandle {
  /** gem charge + shake (on open / tap). */
  pulse: () => void;
  /** full activation: petal burst + bloom ring + petal stream, played over the drawer. */
  dramatize: (key: PowerKey) => void;
}

interface Props {
  unlocked: Record<PowerKey, TierLevel>;
  onOpenPower: (key: PowerKey) => void;
  onManage: (key: PowerKey) => void;
  flashRef: React.RefObject<HTMLDivElement>;
}

// ---------------------------------------------------------------------------
// Petal FX helpers (pixel-space, rendered on the viewport overlay so they paint
// above the drawer). Each animation cleans up its own DOM node on finish.
// ---------------------------------------------------------------------------
function makePetal(x: number, y: number, size: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "petal";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${size}px`;
  el.style.height = `${size}px`;
  const c = PETAL_COLORS[(Math.random() * PETAL_COLORS.length) | 0];
  el.style.background = `radial-gradient(circle at 32% 28%, rgba(255,255,255,.85), ${c} 70%)`;
  return el;
}

/** A spray of petals bursting outward from the gem, drifting down as they fade. */
function petalBurst(over: HTMLElement, gx: number, gy: number) {
  const N = 14;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 70 + Math.random() * 95;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    const size = 9 + Math.random() * 9;
    const el = makePetal(gx, gy, size);
    over.appendChild(el);
    const r0 = Math.random() * 360;
    const r1 = r0 + (Math.random() * 2 - 1) * 220;
    const anim = el.animate(
      [
        { transform: `translate(-50%,-50%) rotate(${r0}deg) scale(.3)`, opacity: 0, offset: 0 },
        {
          transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5}px)) rotate(${(r0 + r1) / 2}deg) scale(1)`,
          opacity: 1,
          offset: 0.28,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 34}px)) rotate(${r1}deg) scale(.92)`,
          opacity: 0,
          offset: 1,
        },
      ],
      { duration: 720 + Math.random() * 380, easing: "cubic-bezier(.18,.7,.3,1)", fill: "forwards" },
    );
    anim.onfinish = () => el.remove();
  }
}

/** A soft expanding bloom ripple centred on the gem. */
function bloomRing(over: HTMLElement, gx: number, gy: number) {
  const ring = document.createElement("div");
  ring.className = "bloom-ring";
  ring.style.left = `${gx}px`;
  ring.style.top = `${gy}px`;
  over.appendChild(ring);
  const anim = ring.animate(
    [
      { transform: "translate(-50%,-50%) scale(.2)", opacity: 0.8 },
      { transform: "translate(-50%,-50%) scale(3.4)", opacity: 0 },
    ],
    { duration: 680, easing: "ease-out", fill: "forwards" },
  );
  anim.onfinish = () => ring.remove();
}

/** A trail of petals flowing from the firing node into the gem. */
function petalStream(over: HTMLElement, nx: number, ny: number, gx: number, gy: number) {
  const N = 7;
  for (let i = 0; i < N; i++) {
    const size = 8 + Math.random() * 7;
    const el = makePetal(nx, ny, size);
    over.appendChild(el);
    const jx = (Math.random() * 2 - 1) * 40;
    const jy = (Math.random() * 2 - 1) * 40;
    const r1 = Math.random() * 540;
    const anim = el.animate(
      [
        { transform: "translate(-50%,-50%) translate(0px,0px) rotate(0deg) scale(.6)", opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.2 },
        {
          transform: `translate(-50%,-50%) translate(${(gx - nx) / 2 + jx}px, ${(gy - ny) / 2 + jy}px) rotate(${r1 / 2}deg) scale(1)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(-50%,-50%) translate(${gx - nx}px, ${gy - ny}px) rotate(${r1}deg) scale(.4)`,
          opacity: 0,
          offset: 1,
        },
      ],
      { duration: 520, delay: i * 45, easing: "ease-in", fill: "forwards" },
    );
    anim.onfinish = () => el.remove();
  }
}

/** A single petal drifting quietly near the gem (idle ambience, in-stage HTML layer). */
function ambientPetal(layer: HTMLElement) {
  const cx = layer.clientWidth / 2;
  const cy = layer.clientHeight / 2;
  const ang = Math.random() * Math.PI * 2;
  const r0 = 34 + Math.random() * 30;
  const sx = cx + Math.cos(ang) * r0;
  const sy = cy + Math.sin(ang) * r0;
  const size = 7 + Math.random() * 6;
  const el = makePetal(sx, sy, size);
  layer.appendChild(el);
  const dx = Math.cos(ang) * 28;
  const dy = -34 - Math.random() * 30; // drift up and out
  const r1 = (Math.random() * 2 - 1) * 160;
  const anim = el.animate(
    [
      { transform: "translate(-50%,-50%) rotate(0deg) scale(.5)", opacity: 0, offset: 0 },
      {
        transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5}px)) rotate(${r1 / 2}deg) scale(1)`,
        opacity: 0.8,
        offset: 0.4,
      },
      {
        transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${r1}deg) scale(.9)`,
        opacity: 0,
        offset: 1,
      },
    ],
    { duration: 2600, easing: "ease-out", fill: "forwards" },
  );
  anim.onfinish = () => el.remove();
}

export const GemHub = forwardRef<GemHandle, Props>(function GemHub(
  { unlocked, onOpenPower, onManage, flashRef },
  ref,
) {
  const sapphireRef = useRef<HTMLDivElement>(null);
  const wiresRef = useRef<SVGSVGElement>(null);
  const ambientRef = useRef<HTMLDivElement>(null);
  const fxOverRef = useRef<HTMLDivElement>(null); // viewport overlay, paints above the drawer
  const pressTimer = useRef<number | null>(null);

  // stable wire midpoint jitter per node
  const wireGeom = useMemo(() => {
    const g: Record<string, { d: string }> = {};
    for (const key of POWER_ORDER) {
      if (unlocked[key] === 0) continue; // locked → no wire
      const n = POWERS[key].node;
      const nx = (SW * n.x) / 100;
      const ny = (SH * n.y) / 100;
      const mx = (nx + CX) / 2 + (Math.random() * 20 - 10);
      const my = (ny + CY) / 2 + (Math.random() * 16 - 8);
      g[key] = { d: `M${nx} ${ny} Q${mx} ${my} ${CX} ${CY}` };
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Object.values(unlocked).join(",")]);

  function fireFlash() {
    const f = flashRef.current;
    if (!f) return;
    f.style.transition = "none";
    f.style.opacity = ".62";
    void f.offsetWidth;
    f.style.transition = "opacity .5s ease";
    f.style.opacity = "0";
  }

  function pulse() {
    const s = sapphireRef.current;
    if (!s) return;
    s.classList.remove("fire");
    void s.offsetWidth;
    s.classList.add("fire");
    setTimeout(() => s.classList.remove("fire"), 680);
  }

  function dramatize(key: PowerKey) {
    pulse();
    fireFlash();

    // Activation burst rendered on the viewport overlay so it paints above the drawer.
    // Coordinates are real screen pixels measured from the DOM (the overlay has no viewBox).
    const over = fxOverRef.current;
    const gem = sapphireRef.current;
    if (over && gem) {
      const ob = over.getBoundingClientRect(); // overlay origin (no-op unless an ancestor is a containing block)
      const gr = gem.getBoundingClientRect();
      const gx = gr.left + gr.width / 2 - ob.left;
      const gy = gr.top + gr.height / 2 - ob.top;

      bloomRing(over, gx, gy);
      petalBurst(over, gx, gy);

      const disc = document.querySelector<HTMLElement>(`[data-node="${key}"] .disc`);
      if (disc) {
        const nr = disc.getBoundingClientRect();
        const nx = nr.left + nr.width / 2 - ob.left;
        const ny = nr.top + nr.height / 2 - ob.top;
        petalStream(over, nx, ny, gx, gy);
      }
    }

    // briefly light the wire from the firing node (quiet in-stage accent)
    const wire = wiresRef.current?.querySelector<SVGPathElement>(`path[data-key="${key}"]`);
    if (wire) {
      wire.setAttribute("stroke", "rgba(190,255,220,.95)");
      wire.setAttribute("stroke-width", "2.6");
      setTimeout(() => {
        const active = POWERS[key].kind === "active";
        wire.setAttribute("stroke", active ? "rgba(233,189,76,.32)" : "rgba(87,219,147,.26)");
        wire.setAttribute("stroke-width", "1.2");
      }, 620);
    }
  }

  useImperativeHandle(ref, () => ({ pulse, dramatize }));

  // idle ambient petals drifting near the gem
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return; // timeline is paused while backgrounded — don't pile up petals
      const layer = ambientRef.current;
      if (!layer) return;
      ambientPetal(layer);
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  function startPress(key: PowerKey) {
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      onManage(key);
    }, 500);
  }
  function endPress(key: PowerKey, active: boolean) {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
      if (active) onOpenPower(key);
    }
  }

  return (
    <div className="stage" id="stage">
      <svg className="wires" ref={wiresRef} viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none">
        {POWER_ORDER.filter((k) => wireGeom[k]).map((k) => {
          const active = POWERS[k].kind === "active";
          return (
            <path
              key={k}
              data-key={k}
              d={wireGeom[k].d}
              fill="none"
              stroke={active ? "rgba(233,189,76,.32)" : "rgba(87,219,147,.26)"}
              strokeWidth="1.2"
            />
          );
        })}
      </svg>
      <div className="fx ambient" ref={ambientRef} />
      <div
        className="fx-over"
        ref={fxOverRef}
        style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 60 }}
      />

      <div className="sapphire" ref={sapphireRef} onClick={pulse} title="Fia's Emerald">
        <img className="gemArt" src={gemArt} alt="Fia's Emerald" width={156} />
      </div>

      {POWER_ORDER.map((key) => {
        const meta = POWERS[key];
        const level = unlocked[key];
        const locked = level === 0;
        const passive = meta.kind === "passive";
        const active = meta.kind === "active" && !locked;
        const Icon = POWER_ICONS[meta.icon];
        const cls = "node" + (passive ? " passive" : "") + (locked ? " locked" : "");
        return (
          <div
            key={key}
            className={cls}
            data-node={key}
            style={{
              left: `calc(${meta.node.x}% - 42px)`,
              top: `calc(${meta.node.y}% - 36px)`,
            }}
            onPointerDown={() => startPress(key)}
            onPointerUp={() => endPress(key, active)}
            onPointerLeave={() => {
              if (pressTimer.current !== null) {
                window.clearTimeout(pressTimer.current);
                pressTimer.current = null;
              }
            }}
          >
            <div className="disc">
              <Icon size={24} stroke={1.75} />
            </div>
            <div className="nm">{SHORT_NAME[key]}</div>
            <div className="pips">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={"pip2" + (passive ? " passive" : "") + (i <= level ? " on" : "")}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});
