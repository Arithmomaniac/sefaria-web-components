import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { CDPSession, Page } from "playwright";

interface RecordedFrame {
  readonly filePath: string;
  readonly timestamp: number;
}

interface ScreencastFrameEvent {
  readonly data: string;
  readonly metadata: {
    readonly timestamp?: number;
  };
  readonly sessionId: number;
}

const execFileAsync = promisify(execFile);

export class VscodeVideoRecorder {
  readonly #session: CDPSession;
  readonly #directory: string;
  readonly #output: string;
  readonly #frames: RecordedFrame[] = [];
  readonly #writes: Promise<void>[] = [];
  readonly #errors: unknown[] = [];

  private constructor(session: CDPSession, directory: string, output: string) {
    this.#session = session;
    this.#directory = directory;
    this.#output = output;
  }

  static async start(page: Page, output: string): Promise<VscodeVideoRecorder> {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), "sefaria-vscode-video-"),
    );
    const session = await page.context().newCDPSession(page);
    const recorder = new VscodeVideoRecorder(session, directory, output);
    session.on("Page.screencastFrame", recorder.#captureFrame);
    await session.send("Page.startScreencast", {
      everyNthFrame: 2,
      format: "jpeg",
      quality: 88,
    });
    return recorder;
  }

  async stop(): Promise<void> {
    await this.#session.send("Page.stopScreencast");
    this.#session.off("Page.screencastFrame", this.#captureFrame);
    await Promise.all(this.#writes);
    if (this.#errors.length > 0) {
      throw new AggregateError(
        this.#errors,
        "Could not capture VS Code video.",
      );
    }
    if (this.#frames.length === 0) {
      throw new Error("VS Code produced no screencast frames.");
    }

    await mkdir(path.dirname(this.#output), { recursive: true });
    const manifest = path.join(this.#directory, "frames.txt");
    await writeFile(manifest, createFfmpegConcatManifest(this.#frames), "utf8");
    try {
      await execFileAsync(
        process.env.FFMPEG_EXECUTABLE ?? "ffmpeg",
        [
          "-loglevel",
          "error",
          "-y",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          manifest,
          "-vf",
          "fps=30,format=yuv420p",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "20",
          "-movflags",
          "+faststart",
          this.#output,
        ],
        { windowsHide: true },
      );
    } finally {
      await this.#session.detach().catch(() => undefined);
      await rm(this.#directory, { recursive: true, force: true });
    }
  }

  async discard(): Promise<void> {
    this.#session.off("Page.screencastFrame", this.#captureFrame);
    await this.#session.send("Page.stopScreencast").catch(() => undefined);
    await Promise.allSettled(this.#writes);
    await this.#session.detach().catch(() => undefined);
    await rm(this.#directory, { recursive: true, force: true });
  }

  readonly #captureFrame = (event: ScreencastFrameEvent): void => {
    const frameNumber = this.#frames.length + 1;
    const filePath = path.join(
      this.#directory,
      `${String(frameNumber).padStart(6, "0")}.jpg`,
    );
    this.#frames.push({
      filePath,
      timestamp: event.metadata.timestamp ?? Date.now() / 1_000,
    });
    this.#writes.push(
      writeFile(filePath, Buffer.from(event.data, "base64")).catch((error) => {
        this.#errors.push(error);
      }),
    );
    void this.#session
      .send("Page.screencastFrameAck", { sessionId: event.sessionId })
      .catch((error) => {
        this.#errors.push(error);
      });
  };
}

export function createFfmpegConcatManifest(
  frames: readonly RecordedFrame[],
): string {
  return frames
    .flatMap((frame, index) => {
      const next = frames[index + 1];
      const duration =
        next === undefined
          ? 2
          : Math.min(5, Math.max(1 / 30, next.timestamp - frame.timestamp));
      const entry = [
        `file '${frame.filePath.replaceAll("\\", "/")}'`,
        `duration ${duration.toFixed(3)}`,
      ];
      if (next === undefined) {
        entry.push(`file '${frame.filePath.replaceAll("\\", "/")}'`);
      }
      return entry;
    })
    .join("\n")
    .concat("\n");
}
