import fs from "node:fs";
import path from "node:path";

const RECORDINGS_ROOT = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "outputs",
  "recordings",
);

interface SavableRecording {
  segments: { speaker: string }[];
  saveSegments(dir: string, options?: { manifest?: boolean }): string;
}

/**
 * Persist a scenario voice recording (full.wav + per-turn segments +
 * manifest) under outputs/recordings/<name>/ — the listenable proof of
 * what Max actually sounded like in the run.
 */
export function saveRecording(
  audio: unknown,
  name: string,
): string | null {
  const recording = audio as SavableRecording | undefined;
  if (!recording || recording.segments.length === 0) return null;
  const dir = path.join(RECORDINGS_ROOT, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  recording.saveSegments(dir, { manifest: true });
  return dir;
}
