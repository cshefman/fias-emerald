import { useRef } from "react";
import { IconChevronLeft, IconDownload, IconUpload } from "@tabler/icons-react";
import { config } from "../config";
import { POWERS, POWER_ORDER, SHORT_NAME, TIER_REFERENCE } from "../powers";
import { exportJSON, importJSON } from "../state/persistence";
import { costForTier, unlockInfo } from "../state/unlock";
import type { Action } from "../state/store";
import {
  TIER_LABEL,
  TIER_ORDER,
  TIER_ROMAN,
  type PowerKey,
  type SaveState,
  type TierKey,
} from "../types";

interface Props {
  state: SaveState;
  dispatch: React.Dispatch<Action>;
  onBack: () => void;
}

export function Progression({ state, dispatch, onBack }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  function doExport() {
    const blob = new Blob([exportJSON(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fias-emerald.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function doImport(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        dispatch({ type: "import", state: importJSON(String(reader.result)) });
      } catch {
        alert("Could not read that file — not valid Emerald JSON.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="prog">
      <div className="prog-head">
        <button className="back-btn" onClick={onBack}>
          <IconChevronLeft size={16} /> Emerald
        </button>
        <h2>Progression</h2>
        <div style={{ width: 64 }} />
      </div>

      {/* Aurum + economy controls */}
      <div className="pcard">
        <div className="pcard-top">
          <div className="aurum-edit">
            <span className="pip" style={{ width: 13, height: 13, transform: "rotate(45deg)", background: "linear-gradient(135deg,#f7da86,#a9781d)", borderRadius: 2, display: "inline-block" }} />
            <input
              type="number"
              value={state.aurumPool}
              onChange={(e) => dispatch({ type: "setAurum", value: Number(e.target.value) })}
              aria-label="Aurum pool"
            />
            <small style={{ color: "var(--mut2)", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase" }}>Aurum</small>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="undo-btn" onClick={() => dispatch({ type: "addAurum", delta: 1 })}>+1</button>
            <button className="undo-btn" onClick={() => dispatch({ type: "addAurum", delta: -1 })}>−1</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <span style={{ fontFamily: "Cinzel", fontSize: 12.5, color: "var(--ink)" }}>Character level</span>
          <div className="stepper" style={{ gap: 8 }}>
            <button onClick={() => dispatch({ type: "setLevel", value: state.characterLevel - 1 })} aria-label="decrease level">−</button>
            <b>{state.characterLevel}</b>
            <button onClick={() => dispatch({ type: "setLevel", value: state.characterLevel + 1 })} aria-label="increase level">+</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 10.5, color: "var(--mut)", display: "flex", alignItems: "center", gap: 6 }}>
            Base-tier cost
            <input
              type="number"
              value={state.baseAurumCost}
              onChange={(e) => dispatch({ type: "setBaseCost", value: Number(e.target.value) })}
              style={{ width: 44, background: "#0a1a12", border: "1px solid rgba(120,210,160,.25)", borderRadius: 7, color: "var(--ice)", textAlign: "center", padding: 4, fontFamily: "Cinzel" }}
            />
          </label>
          <label style={{ fontSize: 10.5, color: "var(--mut)", display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={state.aurumModel === "spend"} onChange={(e) => dispatch({ type: "setModel", model: e.target.checked ? "spend" : "threshold" })} />
            Spend Aurum on unlock
          </label>
          <label style={{ fontSize: 10.5, color: "var(--mut)", display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={state.manualOverride} onChange={(e) => dispatch({ type: "setManual", value: e.target.checked })} />
            Manual dice entry
          </label>
        </div>
      </div>

      {/* Power cards */}
      {POWER_ORDER.map((key) => (
        <PowerCard key={key} pkey={key} state={state} dispatch={dispatch} />
      ))}

      {/* backup */}
      <div className="io-row">
        <button className="io-btn" onClick={doExport}>
          <IconDownload size={15} /> Export
        </button>
        <button className="io-btn" onClick={() => fileRef.current?.click()}>
          <IconUpload size={15} /> Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
      </div>
      <button className="undo-btn" style={{ marginTop: 4 }} onClick={() => { if (confirm("Reset all unlocks and Aurum to the seeded defaults?")) dispatch({ type: "reset" }); }}>
        Reset to seeded defaults
      </button>
    </div>
  );
}

function PowerCard({ pkey, state, dispatch }: { pkey: PowerKey; state: SaveState; dispatch: React.Dispatch<Action> }) {
  const level = state.unlocked[pkey];
  const meta = POWERS[pkey];
  const info = unlockInfo(state, pkey);
  const ref = TIER_REFERENCE[pkey];

  return (
    <div className="pcard">
      <div className="pcard-top">
        <span className="pname">{SHORT_NAME[pkey]}</span>
        <span className="pkind">{meta.kind}</span>
      </div>

      {/* tier slots */}
      <div className="tierline">
        {TIER_ORDER.map((tk, idx) => {
          const tierLevel = idx + 1;
          const on = tierLevel <= level;
          const cost = costForTier(state, tk as TierKey);
          const req = config.levelRequirement[tk as TierKey];
          return (
            <div className={"tslot" + (on ? " on" : "")} key={tk}>
              <div className="tt">
                {TIER_LABEL[tk]} · {TIER_ROMAN[tk]}
              </div>
              {on ? (
                <div className="tv" style={{ color: "var(--gold-bright)" }}>✓ unlocked</div>
              ) : (
                <>
                  <div className="tv">{cost} Aurum</div>
                  <div className="treq">Lv {req}+</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* actions */}
      <div className="pcard-actions">
        <button className="unlock-btn" disabled={!info.ok} onClick={() => dispatch({ type: "unlock", power: pkey })}>
          {info.nextTier ? `Unlock ${TIER_LABEL[info.nextTier]} · ${info.cost} Aurum` : "Fully unlocked"}
        </button>
        <button className="undo-btn" disabled={level === 0} onClick={() => dispatch({ type: "relock", power: pkey })}>
          Undo
        </button>
      </div>
      {!info.ok && info.reasons.length > 0 && info.nextTier && (
        <div className="reasons">{info.reasons.join(" · ")}</div>
      )}

      {/* tier reference (brief §7) */}
      <div className="ref-table">
        <div className="rt-row head">
          <div className="cell label">Field</div>
          {TIER_ORDER.map((tk) => (
            <div className="cell" key={tk}>
              {TIER_ROMAN[tk]}
            </div>
          ))}
        </div>
        {ref.map((row) => (
          <div className="rt-row" key={row.field}>
            <div className="cell label">{row.field}</div>
            {row.values.map((v, i) => (
              <div className={"cell" + (i + 1 === level ? " cur" : "")} key={i}>
                {v}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
