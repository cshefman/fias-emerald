import { useRef, useState } from "react";
import { Sky } from "./components/Sky";
import { Header } from "./components/Header";
import { GemHub, type GemHandle } from "./components/GemHub";
import { PassiveRail } from "./components/PassiveRail";
import { Drawer } from "./components/Drawer";
import { Progression } from "./components/Progression";
import { POWERS } from "./powers";
import { useStore } from "./state/store";
import type { PowerKey } from "./types";

type View = "home" | "prog";

export default function App() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState<View>("home");
  const [drawerPower, setDrawerPower] = useState<PowerKey | null>(null);

  const flashRef = useRef<HTMLDivElement>(null);
  const gemRef = useRef<GemHandle>(null);

  function openPower(key: PowerKey) {
    if (POWERS[key].kind !== "active" || state.unlocked[key] === 0) return;
    setDrawerPower(key);
    gemRef.current?.pulse();
  }
  function manage(_key: PowerKey) {
    setView("prog");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 14px", overflowX: "hidden" }}>
      <Sky ref={flashRef} />

      <div className="device">
        <Header aurum={state.aurumPool} level={state.characterLevel} onManage={() => setView("prog")} />

        {view === "home" ? (
          <>
            <GemHub
              unlocked={state.unlocked}
              onOpenPower={openPower}
              onManage={manage}
              flashRef={flashRef}
            />
            <PassiveRail unlocked={state.unlocked} onManage={manage} />
            <div className="hint">Tap a power to roll · long-press a node for tiers</div>

            <Drawer
              power={drawerPower}
              level={drawerPower ? state.unlocked[drawerPower] : 0}
              manualOverride={state.manualOverride}
              onFire={(key) => gemRef.current?.dramatize(key)}
              onClose={() => setDrawerPower(null)}
            />
          </>
        ) : (
          <Progression state={state} dispatch={dispatch} onBack={() => setView("home")} />
        )}
      </div>
    </div>
  );
}
