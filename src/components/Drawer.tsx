import { useEffect, useState } from "react";
import { IconX } from "@tabler/icons-react";
import { POWERS, TYPE_CLASS, inputsFor, metaFor, rollPower } from "../powers";
import { TIER_LABEL, TIER_ROMAN, TIER_ORDER, type Effect, type PowerKey, type TierLevel } from "../types";

interface Props {
  power: PowerKey | null;
  level: TierLevel;
  manualOverride: boolean;
  /** trigger the gem choreography for this power. */
  onFire: (key: PowerKey) => void;
  onClose: () => void;
}

function tierBadge(level: TierLevel): string {
  if (level === 0) return "Locked";
  const key = TIER_ORDER[level - 1];
  return `${TIER_LABEL[key]} · ${TIER_ROMAN[key]}`;
}

function totals(effects: Effect[]) {
  let damageTotal = 0;
  let healTotal = 0;
  for (const e of effects) {
    if (e.subtotal === null) continue;
    if (e.heal) healTotal += e.subtotal;
    else damageTotal += e.subtotal;
  }
  return { damageTotal, healTotal };
}

export function Drawer({ power, level, manualOverride, onFire, onClose }: Props) {
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [effects, setEffects] = useState<Effect[] | null>(null);

  // reset inputs + clear results whenever the open power or its tier changes
  useEffect(() => {
    if (!power) return;
    const defs = inputsFor(power, level);
    const init: Record<string, number> = {};
    for (const d of defs) init[d.id] = d.val;
    setInputs(init);
    setEffects(null);
  }, [power, level]);

  if (!power) {
    return (
      <>
        <div className="scrim" onClick={onClose} />
        <div className="drawer" />
      </>
    );
  }

  const meta = POWERS[power];
  const defs = inputsFor(power, level);

  function step(id: string, delta: number) {
    const d = defs.find((x) => x.id === id);
    if (!d) return;
    setInputs((prev) => ({ ...prev, [id]: Math.max(d.min, Math.min(d.max, (prev[id] ?? d.val) + delta)) }));
  }

  function fire() {
    const out = rollPower(power!, level, inputs);
    setEffects(out.effects);
    onFire(power!);
  }

  function editDie(ei: number, di: number, raw: string) {
    setEffects((prev) => {
      if (!prev) return prev;
      const next = prev.map((e) => ({ ...e, faces: [...e.faces] }));
      const v = Math.max(0, Math.floor(Number(raw) || 0));
      next[ei].faces[di] = v;
      next[ei].subtotal = next[ei].faces.reduce((a, b) => a + b, 0) + next[ei].modifier;
      return next;
    });
  }

  const { damageTotal, healTotal } = effects ? totals(effects) : { damageTotal: 0, healTotal: 0 };

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="drawer show">
        <div className="dhead">
          <div>
            <h2>{meta.name}</h2>
            <span className="tier">{tierBadge(level)}</span>
          </div>
          <button className="dclose" onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>

        <div className="meta" dangerouslySetInnerHTML={{ __html: metaFor(power, level) }} />

        {defs.length > 0 && (
          <div className="inputs">
            {defs.map((d) => (
              <div className="field" key={d.id}>
                <label>{d.label}</label>
                {d.options ? (
                  <select
                    className="select"
                    value={inputs[d.id] ?? d.val}
                    onChange={(e) => setInputs((prev) => ({ ...prev, [d.id]: Number(e.target.value) }))}
                    aria-label={d.label}
                  >
                    {d.options.map((opt, i) => (
                      <option key={opt} value={i}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="stepper">
                    <button onClick={() => step(d.id, -1)} aria-label={`decrease ${d.label}`}>
                      −
                    </button>
                    <b>{inputs[d.id] ?? d.val}</b>
                    <button onClick={() => step(d.id, 1)} aria-label={`increase ${d.label}`}>
                      +
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button className="fire" onClick={fire}>
          {meta.fire}
        </button>

        {effects && (
          <div className="result">
            {effects.map((e, ei) => (
              <div className="rrow" key={ei}>
                <div className="rname">
                  {e.label}
                  <small>{e.formula}{e.note ? ` · ${e.note}` : ""}</small>
                </div>
                <div className="dice">
                  {e.faces.map((f, di) =>
                    manualOverride && e.rolling ? (
                      <span className={"die editable " + TYPE_CLASS[e.type]} key={di}>
                        <input
                          type="number"
                          value={f}
                          onChange={(ev) => editDie(ei, di, ev.target.value)}
                          aria-label={`${e.label} die ${di + 1}`}
                        />
                      </span>
                    ) : (
                      <span className={"die " + TYPE_CLASS[e.type]} key={di}>
                        {f}
                      </span>
                    ),
                  )}
                  {e.subtotal !== null ? (
                    <span className={"rtot " + (e.heal ? "heal" : "")}>
                      {e.heal ? "+" : ""}
                      {e.subtotal}
                    </span>
                  ) : (
                    <span className="rtot noted">noted</span>
                  )}
                </div>
              </div>
            ))}

            <div className="grand">
              <span>Total damage</span>
              <b>{damageTotal}</b>
            </div>
            {healTotal > 0 && (
              <div className="grand" style={{ marginTop: 2, paddingTop: 0 }}>
                <span>Healed</span>
                <b className="heal" style={{ fontSize: 20 }}>
                  +{healTotal}
                </b>
              </div>
            )}
            {manualOverride && effects.some((e) => e.rolling) && (
              <div className="manual-row">
                <span>Tap a die to enter a physical roll</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
