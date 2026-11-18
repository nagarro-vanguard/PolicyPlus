import { Background, Controls, MarkerType, ReactFlow } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Laid } from "../lib/layout";
import type { FlowModel } from "../lib/model";

type Props = { model: FlowModel; laid: Laid; title: string; nodeWidth: number; nodeHeight: number; labelLines: number };

/**
 * A figure a person can pan, zoom and move through: the boxes are HTML styled by the design system, laid out at build
 * time with explicit sizes, drawn in the browser (the page's text version stands for it without scripts) and fitted to the room it has.
 * @param props the figure, its layout and its box size
 * @returns the figure
 */
export default function Flow({ model, laid, title, nodeWidth, nodeHeight, labelLines }: Props) {
    const byId = new Map(model.nodes.map((node) => [node.id, node]));
    const nodes: Node[] = laid.boxes.map((box) => {
        const node = byId.get(box.id);
        return {
            id: box.id,
            position: { x: box.x, y: box.y },
            width: nodeWidth,
            height: nodeHeight,
            draggable: false,
            data: {
                label: (
                    <span className="dg-flow-label">
                        <strong>{node ? node.label : box.id}</strong>
                        <span>{node ? node.sub : ""}</span>
                    </span>
                ),
            },
            className: `dg-flow-node ${node ? node.kind : ""}`,
            ariaLabel: node ? `${node.label}, ${node.sub}` : box.id,
            style: { width: nodeWidth, height: nodeHeight, ["--lines" as string]: labelLines },
        };
    });
    const edges: Edge[] = laid.wires.map((wire) => ({
        id: wire.id,
        source: wire.from,
        target: wire.to,
        label: wire.label,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
    }));
    return (
        <div className="dg-flow" role="group" aria-label={title} style={{ height: laid.height + 32 }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                fitViewOptions={{ maxZoom: 1, padding: 0.02 }}
                onInit={(instance) => void instance.fitView({ maxZoom: 1, padding: 0.02 })}
                zoomOnScroll={false}
                preventScrolling={false}
                nodesDraggable={false}
                nodesConnectable={false}
                proOptions={{ hideAttribution: true }}
            >
                <Background />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}
