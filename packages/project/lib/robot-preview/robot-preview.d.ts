export type Axis = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'E1' | 'E2';
export type Pose = Record<Axis, number>;
export interface Camera { yaw: number; pitch: number; zoom: number; }
export interface Segment { id: string; from: Pose; to: Pose; }
export interface Visibility { grid: boolean; axes: boolean; trajectory: boolean; }
export interface RobotPreviewOptions {
  pose?: Partial<Pose>;
  segments?: Segment[];
  selectedSegmentId?: string | null;
  camera?: Partial<Camera>;
  interactive?: boolean;
  onSegmentSelect?: (id: string) => void;
  /** Integer 2–240. Default 28. */
  trajectorySamples?: number;
  /** Clamped to 1–4. Default 2. */
  pixelRatioCap?: number;
  ariaLabel?: string;
}
export const AXES: readonly Axis[];
export const DEFAULT_POSE: Readonly<Pose>;
export const DEFAULT_CAMERA: Readonly<Camera>;
export function interpolatePose(from: Pose, to: Pose, progress: number): Pose;
export function getToolPosition(pose: Pose): [number, number, number];
export class RobotPreview {
  constructor(container: HTMLElement, options?: RobotPreviewOptions);
  getPose(): Pose;
  setPose(patch: Partial<Pose>): void;
  setSegments(segments: Segment[], options?: { fit?: boolean }): void;
  setSelectedSegment(id: string | null): void;
  getCamera(): Camera;
  setCamera(patch: Partial<Camera>): void;
  fitToView(): void;
  setVisibility(patch: Partial<Visibility>): void;
  resize(): void;
  destroy(): void;
}
