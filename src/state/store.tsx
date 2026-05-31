// Reducer + React context (brief §4: reducer + thin persistence layer, no Redux).
import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import type { PowerKey, SaveState, TierLevel } from "../types";
import { makeSeedState } from "../config";
import { loadState, saveState } from "./persistence";
import { refundForRelock, unlockInfo } from "./unlock";

export type Action =
  | { type: "unlock"; power: PowerKey }
  | { type: "relock"; power: PowerKey }
  | { type: "setLevel"; value: number }
  | { type: "setAurum"; value: number }
  | { type: "addAurum"; delta: number }
  | { type: "setBaseCost"; value: number }
  | { type: "setModel"; model: SaveState["aurumModel"] }
  | { type: "setManual"; value: boolean }
  | { type: "import"; state: SaveState }
  | { type: "reset" };

export function reducer(state: SaveState, action: Action): SaveState {
  switch (action.type) {
    case "unlock": {
      const info = unlockInfo(state, action.power);
      if (!info.ok || info.nextTier === null) return state;
      const level = (state.unlocked[action.power] + 1) as TierLevel;
      return {
        ...state,
        unlocked: { ...state.unlocked, [action.power]: level },
        aurumPool: state.aurumModel === "spend" ? state.aurumPool - info.cost : state.aurumPool,
      };
    }
    case "relock": {
      const cur = state.unlocked[action.power];
      if (cur <= 0) return state;
      const refund = refundForRelock(state, action.power);
      return {
        ...state,
        unlocked: { ...state.unlocked, [action.power]: (cur - 1) as TierLevel },
        aurumPool: state.aurumPool + refund,
      };
    }
    case "setLevel":
      return { ...state, characterLevel: Math.max(1, Math.min(20, Math.floor(action.value || 1))) };
    case "setAurum":
      return { ...state, aurumPool: Math.max(0, Math.floor(action.value || 0)) };
    case "addAurum":
      return { ...state, aurumPool: Math.max(0, state.aurumPool + action.delta) };
    case "setBaseCost":
      return { ...state, baseAurumCost: Math.max(0, Math.floor(action.value || 0)) };
    case "setModel":
      return { ...state, aurumModel: action.model };
    case "setManual":
      return { ...state, manualOverride: action.value };
    case "import":
      return action.state;
    case "reset":
      return makeSeedState();
    default:
      return state;
  }
}

interface StoreCtx {
  state: SaveState;
  dispatch: React.Dispatch<Action>;
}
const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  useEffect(() => {
    saveState(state);
  }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
