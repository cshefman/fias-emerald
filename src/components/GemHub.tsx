import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import gemArt from "../assets/emerald.png";
import { POWERS, POWER_ORDER, SHORT_NAME } from "../powers";
import { POWER_ICONS } from "../icons";
import type { PowerKey, TierLevel } from "../types";

const SVGNS = "http://www.w3.org/2000/svg";
const SW = 412;
const SH = 360;
const CX = 206;
const CY = 180;

export interface GemHandle {
  /** gem charge + shake (on open / tap). */
  pulse: () => void;
  /** full activation: bolt down the wire, shockwave ring, shake, flash, wire light. */
  dramatize: (key: PowerKey) => void;
}

interface Props {
  unlocked: Record<PowerKey, TierLevel>;
  onOpenPower: (key: PowerKey) => void;
  onManage: (key: PowerKey) => void;
  flashRef: React.RefObject<HTMLDivElement>;
}

function P(cx: number, cy: number, ang: number, r: number): [number, number] {
  const a = (ang * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
}
function boltPts(x1: number, y1: number, x2: number, y2: number, seg: number, jit: number) {
  const pts: [number, number][] = [[x1, y1]];
  const nx = -(y2 - y1);
  const ny = x2 - x1;
  const len = Math.hypot(nx, ny) || 1;
  for (let i = 1; i < seg; i++) {
    const t = i / seg;
    const mx = x1 + (x2 - x1) * t;
    const my = y1 + (y2 - y1) * t;
    const off = (Math.random() * 2 - 1) * jit;
    pts.push([mx + (nx / len) * off, my + (ny / len) * off]);
  }
  pts.push([x2, y2]);
  return pts;
}

export const GemHub = forwardRef<GemHandle, Props>(function GemHub(
  { unlocked, onOpenPower, onManage, flashRef },
  ref,
) {
  const sapphireRef = useRef<HTMLDivElement>(null);
  const wiresRef = useRef<SVGSVGElement>(null);
  const fxRef = useRef<SVGSVGElement>(null);
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

  function drawBolt(x1: number, y1: number, x2: number, y2: number) {
    const fx = fxRef.current;
    if (!fx) return;
    const pts = boltPts(x1, y1, x2, y2, 7, 16);
    const d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L ");
    const mk = (stroke: string, w: string) => {
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", d);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", stroke);
      p.setAttribute("stroke-width", w);
      p.setAttribute("stroke-linecap", "round");
      p.setAttribute("class", "bolt");
      return p;
    };
    const glow = mk("rgba(110,235,170,.55)", "7");
    const core = mk("#eafff2", "2");
    fx.appendChild(glow);
    fx.appendChild(core);
    setTimeout(() => {
      glow.remove();
      core.remove();
    }, 540);
  }

  function dramatize(key: PowerKey) {
    pulse();
    fireFlash();
    const fx = fxRef.current;
    if (fx) {
      const ring = document.createElementNS(SVGNS, "circle");
      ring.setAttribute("cx", String(CX));
      ring.setAttribute("cy", String(CY));
      ring.setAttribute("r", "16");
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", "#bfffdb");
      ring.setAttribute("stroke-width", "3");
      ring.setAttribute("class", "ring");
      ring.style.transformOrigin = `${CX}px ${CY}px`;
      fx.appendChild(ring);
      setTimeout(() => ring.remove(), 660);
    }
    const n = POWERS[key].node;
    drawBolt((SW * n.x) / 100, (SH * n.y) / 100, CX, CY);
    // briefly light the wire
    const wire = wiresRef.current?.querySelector<SVGPathElement>(`path[data-key="${key}"]`);
    if (wire) {
      wire.setAttribute("stroke", "rgba(190,255,220,.95)");
      wire.setAttribute("stroke-width", "2.6");
      setTimeout(() => {
        wire.setAttribute("stroke", "rgba(233,189,76,.32)");
        wire.setAttribute("stroke-width", "1.2");
      }, 620);
    }
  }

  useImperativeHandle(ref, () => ({ pulse, dramatize }));

  // idle ambient arcs near the gem
  useEffect(() => {
    const id = window.setInterval(() => {
      const fx = fxRef.current;
      if (!fx) return;
      const a = Math.random() * 360;
      const b = a + 90 + Math.random() * 120;
      const p1 = P(CX, CY, a, 52);
      const p2 = P(CX, CY, b, 52);
      const pts = boltPts(p1[0], p1[1], p2[0], p2[1], 5, 9);
      const d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L ");
      const arc = document.createElementNS(SVGNS, "path");
      arc.setAttribute("d", d);
      arc.setAttribute("fill", "none");
      arc.setAttribute("stroke", "rgba(150,235,180,.5)");
      arc.setAttribute("stroke-width", "1.4");
      arc.setAttribute("stroke-linecap", "round");
      arc.setAttribute("class", "bolt");
      fx.appendChild(arc);
      setTimeout(() => arc.remove(), 540);
    }, 4200);
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
      <svg className="fx" ref={fxRef} viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="none" />

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
