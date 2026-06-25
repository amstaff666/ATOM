/**
 * Type shim for reactflow — @reactflow/core ships without .d.ts in some installs.
 */
declare module "reactflow" {
  import type {
    ComponentType,
    CSSProperties,
    FC,
    ReactNode,
  } from "react";

  export interface Node<T = Record<string, unknown>> {
    id: string;
    position: { x: number; y: number };
    data: T;
    type?: string;
    width?: number;
    height?: number;
    selected?: boolean;
    dragging?: boolean;
    parentNode?: string;
    [key: string]: unknown;
  }

  export interface Edge<T = Record<string, unknown>> {
    id: string;
    source: string;
    target: string;
    type?: string;
    data?: T;
    label?: string;
    animated?: boolean;
    style?: CSSProperties;
    [key: string]: unknown;
  }

  export interface Connection {
    source: string | null;
    target: string | null;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }

  export interface EdgeProps {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition?: Position;
    targetPosition?: Position;
    style?: CSSProperties;
    markerEnd?: string;
    data?: Record<string, unknown>;
  }

  export enum Position {
    Left = "left",
    Top = "top",
    Right = "right",
    Bottom = "bottom",
  }

  export type NodeTypes = Record<string, ComponentType<{ data: unknown }>>;

  export const ReactFlow: FC<Record<string, unknown>>;
  export const ReactFlowProvider: FC<{ children: ReactNode }>;
  export const Background: FC<Record<string, unknown>>;
  export const Controls: FC<Record<string, unknown>>;
  export const MiniMap: FC<Record<string, unknown>>;
  export const Panel: FC<{ children: ReactNode; position?: string }>;
  export const Handle: FC<Record<string, unknown>>;
  export const BaseEdge: FC<Record<string, unknown>>;
  export const EdgeLabelRenderer: FC<{ children: ReactNode }>;

  export function addEdge(
    connection: Connection | Edge,
    edges: Edge[]
  ): Edge[];
  export function getBezierPath(params: Record<string, unknown>): [string, number, number];
  export function useNodesState<T = Record<string, unknown>>(
    initial: Node<T>[]
  ): [Node<T>[], React.Dispatch<React.SetStateAction<Node<T>[]>>, (changes: unknown) => void];
  export function useEdgesState<T = Record<string, unknown>>(
    initial: Edge<T>[]
  ): [Edge<T>[], React.Dispatch<React.SetStateAction<Edge<T>[]>>, (changes: unknown) => void];
  export function useKeyPress(keyCode: string | string[]): boolean;

  const ReactFlowDefault: typeof ReactFlow;
  export default ReactFlowDefault;
}