import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useReducedMotion,
  MotionValue,
} from "framer-motion";

export type CursorVariant =
  | "network"
  | "gauge"
  | "chainlink"
  | "lens"
  | "bracket";

const COLOR = "#00bfff";
const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, textarea, label, summary, .cursor-pointer, [data-cursor="interactive"]';

interface CursorState {
  x: MotionValue<number>;
  y: MotionValue<number>;
  hovering: boolean;
  pressed: boolean;
  visible: boolean;
  reduced: boolean | null;
}

function useCursor(hideNativeCursor = true): CursorState {
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  // Hide native cursor for desktop
  useEffect(() => {
    if (!hideNativeCursor) return;
    const prev = document.documentElement.style.cursor;
    document.documentElement.style.cursor = "none";
    return () => {
      document.documentElement.style.cursor = prev;
    };
  }, [hideNativeCursor]);

  useEffect(() => {
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    if (isCoarse) {
      setVisible(false);
      return;
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      if (!visible) setVisible(true);
    };

    const onOver = (e: Event) => {
      const t = e.target as Element | null;
      setHovering(!!t?.closest(INTERACTIVE_SELECTOR));
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setPressed(true);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setPressed(false);
    };

    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    window.addEventListener("blur", onLeave);
    window.addEventListener("focus", onEnter);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("focus", onEnter);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y, visible]);

  return { x, y, hovering, pressed, visible, reduced };
}

function usePosition(
  x: MotionValue<number>,
  y: MotionValue<number>,
  cfg: Parameters<typeof useSpring>[1] = {
    stiffness: 900,
    damping: 45,
    mass: 0.6,
  }
) {
  const xSpring = useSpring(x, cfg);
  const ySpring = useSpring(y, cfg);
  return { xSpring, ySpring };
}

function Layer({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 9999,
        width: 0,
        height: 0,
      }}
    >
      {children}
    </div>
  );
}

/* 1) NETWORK — Graph nodes + connecting lines */
export const NetworkCursor: React.FC<{ hideNativeCursor?: boolean }> = ({
  hideNativeCursor = true,
}) => {
  const { x, y, hovering, pressed, visible, reduced } =
    useCursor(hideNativeCursor);

  const SIZE = 48;
  const { xSpring, ySpring } = usePosition(x, y, {
    stiffness: 950,
    damping: 40,
  });

  // Early return AFTER all hooks
  if (!visible) return null;

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = SIZE / 2 - 3;
  const angles = [0, 90, 180, 270];

  const pointAt = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  };

  const lines: [number, number][] = [
    [0, 90],
    [90, 180],
    [180, 270],
    [270, 0],
    [0, 180],
    [90, 270],
  ];

  const rotationDuration = hovering ? 2.2 : 6.5;
  const ringOpacity = hovering ? 0.9 : 0.7;

  return (
    <Layer>
      <motion.div
        style={{
          x: xSpring,
          y: ySpring,
          width: SIZE,
          height: SIZE,
          marginLeft: -SIZE / 2,
          marginTop: -SIZE / 2,
          position: "absolute",
          filter: pressed
            ? "drop-shadow(0 0 10px rgba(0,191,255,0.5))"
            : "drop-shadow(0 0 8px rgba(0,191,255,0.35))",
        }}
      >
        <motion.svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ display: "block" }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={`${COLOR}66`}
            strokeWidth={1.5}
          />

          {!reduced && (
            <motion.g
              animate={{ rotate: 360 }}
              transition={{
                duration: rotationDuration,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{ originX: `${cx}px`, originY: `${cy}px` }}
              key={hovering ? "fast" : "slow"}
            >
              {lines.map(([a, b], idx) => {
                const p1 = pointAt(a);
                const p2 = pointAt(b);
                return (
                  <line
                    key={idx}
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke={COLOR + (hovering ? "AA" : "66")}
                    strokeWidth={hovering ? 1.4 : 1}
                    strokeLinecap="round"
                  />
                );
              })}

              {angles.map((deg) => {
                const p = pointAt(deg);
                return (
                  <circle
                    key={deg}
                    cx={p.x}
                    cy={p.y}
                    r={hovering ? 2.6 : 2}
                    fill={COLOR}
                    opacity={ringOpacity}
                  />
                );
              })}
            </motion.g>
          )}

          <circle cx={cx} cy={cy} r={3} fill={COLOR} opacity={0.95} />
        </motion.svg>
      </motion.div>
    </Layer>
  );
};

/* 2) GAUGE — Segmented ring + sweeping indicator */
export const GaugeCursor: React.FC<{ hideNativeCursor?: boolean }> = ({
  hideNativeCursor = true,
}) => {
  const { x, y, hovering, pressed, visible, reduced } =
    useCursor(hideNativeCursor);

  const SIZE = 52;
  const { xSpring, ySpring } = usePosition(x, y, {
    stiffness: 880,
    damping: 38,
  });

  // Early return AFTER all hooks
  if (!visible) return null;

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = SIZE / 2 - 4;

  const sweepKey = `${hovering}-${pressed}`;
  const baseGlow = pressed
    ? "0 0 12px rgba(0,191,255,0.55)"
    : "0 0 10px rgba(0,191,255,0.35)";

  return (
    <Layer>
      <motion.div
        style={{
          x: xSpring,
          y: ySpring,
          width: SIZE,
          height: SIZE,
          marginLeft: -SIZE / 2,
          marginTop: -SIZE / 2,
          position: "absolute",
        }}
      >
        <motion.svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ display: "block", filter: `drop-shadow(${baseGlow})` }}
        >
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={`${COLOR}66`}
            strokeWidth={1.5}
            pathLength={1}
            strokeDasharray="0.01 0.06"
            strokeLinecap="round"
          />

          {!reduced && (
            <motion.g
              key={sweepKey}
              animate={{ rotate: 360 }}
              transition={{
                duration: hovering ? 2.4 : 6.2,
                ease: "linear",
                repeat: Infinity,
              }}
              style={{ originX: `${cx}px`, originY: `${cy}px` }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={R}
                fill="none"
                stroke={COLOR}
                strokeWidth={2}
                pathLength={1}
                strokeDasharray="0.18 1"
                strokeLinecap="round"
                opacity={0.95}
              />
            </motion.g>
          )}

          <circle cx={cx} cy={cy} r={2.8} fill={COLOR} opacity={0.9} />
        </motion.svg>
      </motion.div>
    </Layer>
  );
};

/* 3) CHAINLINK — Dual rings with parallax and coupling on hover */
export const ChainLinkCursor: React.FC<{ hideNativeCursor?: boolean }> = ({
  hideNativeCursor = true,
}) => {
  const { x, y, hovering, pressed, visible, reduced } =
    useCursor(hideNativeCursor);

  const SIZE = 44;
  const offset = useSpring(hovering ? 0 : 9, { stiffness: 400, damping: 28 });
  const { xSpring, ySpring } = usePosition(x, y, {
    stiffness: 900,
    damping: 40,
  });
  const xLag = useSpring(x, { stiffness: 600, damping: 34 });
  const yLag = useSpring(y, { stiffness: 600, damping: 34 });

  // Early return AFTER all hooks
  if (!visible) return null;

  const ringStyle = (thick = false): React.CSSProperties => ({
    position: "absolute",
    inset: 0,
    borderRadius: "9999px",
    border: `${thick ? 2 : 1.5}px solid ${COLOR}AA`,
    boxShadow: "inset 0 0 16px rgba(0,191,255,0.15)",
    background: "transparent",
  });

  return (
    <>
      <Layer>
        <motion.div
          style={{
            x: xSpring,
            y: ySpring,
            width: SIZE,
            height: SIZE,
            marginLeft: -SIZE / 2,
            marginTop: -SIZE / 2,
            position: "absolute",
            filter: pressed
              ? "drop-shadow(0 0 12px rgba(0,191,255,0.55))"
              : "drop-shadow(0 0 9px rgba(0,191,255,0.35))",
          }}
        >
          <div style={ringStyle(pressed)} />
        </motion.div>
      </Layer>

      <Layer>
        <motion.div
          style={{
            x: xLag,
            y: yLag,
            width: SIZE,
            height: SIZE,
            marginLeft: -SIZE / 2,
            marginTop: -SIZE / 2,
            position: "absolute",
          }}
        >
          <motion.div
            style={{
              ...ringStyle(false),
              translateX: offset,
              translateY: offset,
              rotate: "45deg",
              borderColor: `${COLOR}88`,
            }}
          />
        </motion.div>
      </Layer>
    </>
  );
};

/* 4) LENS — Analytical lens with subtle glass + scanning line */
export const LensCursor: React.FC<{ hideNativeCursor?: boolean }> = ({
  hideNativeCursor = true,
}) => {
  const { x, y, hovering, pressed, visible, reduced } =
    useCursor(hideNativeCursor);

  const SIZE = 56;
  const { xSpring, ySpring } = usePosition(x, y, {
    stiffness: 900,
    damping: 42,
  });
  const scale = useSpring(1, { stiffness: 500, damping: 28 });

  useEffect(() => {
    scale.set(hovering ? 1.12 : 1);
  }, [hovering, scale]);

  // Early return AFTER all hooks
  if (!visible) return null;

  return (
    <Layer>
      <motion.div
        style={{
          x: xSpring,
          y: ySpring,
          width: SIZE,
          height: SIZE,
          marginLeft: -SIZE / 2,
          marginTop: -SIZE / 2,
          scale,
          position: "absolute",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            border: `1.5px solid ${COLOR}66`,
            boxShadow: pressed
              ? "0 0 14px rgba(0,191,255,0.5), inset 0 0 20px rgba(0,191,255,0.18)"
              : "0 0 12px rgba(0,191,255,0.35), inset 0 0 16px rgba(0,191,255,0.12)",
            background:
              "radial-gradient(transparent 60%, rgba(0,191,255,0.08) 100%)",
            backdropFilter: "blur(1.2px) saturate(1.05)",
            WebkitBackdropFilter: "blur(1.2px) saturate(1.05)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 10,
              height: 10,
              marginLeft: -5,
              marginTop: -5,
              borderRadius: "9999px",
              border: `1px solid ${COLOR}88`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              height: 1,
              background: `${COLOR}66`,
              transform: "translateY(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: 1,
              background: `${COLOR}66`,
              transform: "translateX(-50%)",
            }}
          />

          {!reduced && (
            <motion.div
              initial={{ y: "-60%" }}
              animate={{ y: "160%" }}
              transition={{
                duration: hovering ? 1.6 : 3.8,
                ease: "linear",
                repeat: Infinity,
              }}
              style={{
                position: "absolute",
                left: -2,
                right: -2,
                height: 10,
                background:
                  "linear-gradient(to bottom, rgba(0,191,255,0) 0%, rgba(0,191,255,0.18) 50%, rgba(0,191,255,0) 100%)",
              }}
            />
          )}
        </div>
      </motion.div>
    </Layer>
  );
};

/* 5) BRACKET — Terminal-style corner brackets + ghost trail */
export const BracketCursor: React.FC<{ hideNativeCursor?: boolean }> = ({
  hideNativeCursor = true,
}) => {
  const { x, y, hovering, pressed, visible, reduced } =
    useCursor(hideNativeCursor);

  const SIZE = 40;
  const { xSpring, ySpring } = usePosition(x, y, {
    stiffness: 980,
    damping: 42,
  });
  const xLag = useSpring(x, { stiffness: 500, damping: 34 });
  const yLag = useSpring(y, { stiffness: 500, damping: 34 });
  const scale = useSpring(1, { stiffness: 520, damping: 30 });

  useEffect(() => {
    scale.set(hovering ? 1.12 : pressed ? 0.96 : 1);
  }, [hovering, pressed, scale]);

  // Early return AFTER all hooks
  if (!visible) return null;

  const corner = (pos: "tl" | "tr" | "bl" | "br"): React.CSSProperties => {
    const size = 8;
    const thickness = 2;
    const styles: React.CSSProperties = {
      position: "absolute",
      width: size,
      height: size,
      borderColor: COLOR,
      opacity: 0.9,
    };

    if (pos === "tl") {
      styles.top = 0;
      styles.left = 0;
      styles.borderLeft = `${thickness}px solid ${COLOR}`;
      styles.borderTop = `${thickness}px solid ${COLOR}`;
    }
    if (pos === "tr") {
      styles.top = 0;
      styles.right = 0;
      styles.borderRight = `${thickness}px solid ${COLOR}`;
      styles.borderTop = `${thickness}px solid ${COLOR}`;
    }
    if (pos === "bl") {
      styles.bottom = 0;
      styles.left = 0;
      styles.borderLeft = `${thickness}px solid ${COLOR}`;
      styles.borderBottom = `${thickness}px solid ${COLOR}`;
    }
    if (pos === "br") {
      styles.bottom = 0;
      styles.right = 0;
      styles.borderRight = `${thickness}px solid ${COLOR}`;
      styles.borderBottom = `${thickness}px solid ${COLOR}`;
    }

    return styles;
  };

  const Frame = () => (
    <motion.div
      style={{
        width: SIZE,
        height: SIZE,
        marginLeft: -SIZE / 2,
        marginTop: -SIZE / 2,
        scale,
        position: "relative",
        filter: pressed
          ? "drop-shadow(0 0 10px rgba(0,191,255,0.5))"
          : "drop-shadow(0 0 8px rgba(0,191,255,0.35))",
      }}
    >
      <div style={corner("tl")} />
      <div style={corner("tr")} />
      <div style={corner("bl")} />
      <div style={corner("br")} />
    </motion.div>
  );

  return (
    <>
      <Layer>
        <motion.div style={{ x: xSpring, y: ySpring, position: "absolute" }}>
          <Frame />
        </motion.div>
      </Layer>

      {!reduced && (
        <Layer>
          <motion.div
            style={{ x: xLag, y: yLag, opacity: 0.35, position: "absolute" }}
          >
            <Frame />
          </motion.div>
        </Layer>
      )}
    </>
  );
};

/* Wrapper to switch variants easily */
export const Cursor: React.FC<{
  variant?: CursorVariant;
  hideNativeCursor?: boolean;
}> = ({ variant = "network", hideNativeCursor = true }) => {
  switch (variant) {
    case "gauge":
      return <GaugeCursor hideNativeCursor={hideNativeCursor} />;
    case "chainlink":
      return <ChainLinkCursor hideNativeCursor={hideNativeCursor} />;
    case "lens":
      return <LensCursor hideNativeCursor={hideNativeCursor} />;
    case "bracket":
      return <BracketCursor hideNativeCursor={hideNativeCursor} />;
    case "network":
    default:
      return <NetworkCursor hideNativeCursor={hideNativeCursor} />;
  }
};
