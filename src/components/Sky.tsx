import { forwardRef } from "react";

/** Drifting storm clouds + the screen-flash layer used on fire. */
export const Sky = forwardRef<HTMLDivElement>(function Sky(_props, flashRef) {
  return (
    <>
      <div className="sky">
        <div className="cloud c1" />
        <div className="cloud c2" />
        <div className="cloud c3" />
      </div>
      {/* fire-flash overlay (opacity driven imperatively) */}
      <div
        ref={flashRef}
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(700px 500px at 50% 30%, rgba(150,235,180,.5), rgba(150,235,180,0) 70%)",
          opacity: 0,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
    </>
  );
});
