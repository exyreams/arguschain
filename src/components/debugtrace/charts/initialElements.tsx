import { Node, Edge } from "@xyflow/react";

export const initialElements = () => {
  const nodes: Node[] = [
    {
      id: "1",
      type: "input",
      data: { label: "Input Node" },
      position: { x: 250, y: 25 },
    },
    {
      id: "2",
      data: { label: "Default Node" },
      position: { x: 100, y: 125 },
    },
    {
      id: "3",
      data: { label: "Output Node" },
      position: { x: 250, y: 250 },
    },
  ];

  const edges: Edge[] = [
    {
      id: "e1-2",
      source: "1",
      target: "2",
      type: "floating",
    },
    {
      id: "e2-3",
      source: "2",
      target: "3",
      type: "floating",
    },
  ];

  return { nodes, edges };
};
