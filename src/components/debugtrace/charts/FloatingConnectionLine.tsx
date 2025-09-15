import React from "react";
import { ConnectionLineComponentProps, getBezierPath } from "@xyflow/react";

const FloatingConnectionLine: React.FC<ConnectionLineComponentProps> = ({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}) => {
  const [edgePath] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });

  return (
    <g>
      <path
        fill="none"
        stroke="#00bfff"
        strokeWidth={2}
        className="animated"
        d={edgePath}
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#00bfff"
        r={3}
        stroke="#00bfff"
        strokeWidth={1.5}
      />
    </g>
  );
};

export default FloatingConnectionLine;
