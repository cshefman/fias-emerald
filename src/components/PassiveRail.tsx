import { POWERS, passiveValue } from "../powers";
import type { PowerKey, TierLevel } from "../types";

const RAIL: PowerKey[] = ["venom", "cats", "owl"];

interface Props {
  unlocked: Record<PowerKey, TierLevel>;
  onManage: (key: PowerKey) => void;
}

/** Quiet rail of passive effects beneath the gem (glance-and-forget — brief §5.1). */
export function PassiveRail({ unlocked, onManage }: Props) {
  return (
    <div className="rail">
      {RAIL.map((key) => {
        const locked = unlocked[key] === 0;
        return (
          <button
            key={key}
            className={"chip" + (locked ? " lock" : "")}
            onClick={() => onManage(key)}
            style={{ cursor: "pointer", border: "1px solid rgba(120,210,160,.16)" }}
          >
            <div className="ct">{POWERS[key].name}</div>
            <div className="cv">{passiveValue(key, unlocked[key])}</div>
          </button>
        );
      })}
    </div>
  );
}
