import {
  getAsyncTaskStatus,
  postFindRefs,
  zCoreFindRefsResponse,
  type SefariaClient,
} from "@sefaria/client";

const MAX_POLL_ATTEMPTS = 16;
const INITIAL_POLL_DELAY_MS = 500;
const MAX_POLL_DELAY_MS = 5_000;
const POLL_FACTOR = 1.5;
const DEADLINE_MS = 120_000;

export interface DetectionInput {
  readonly title: string;
  readonly body: string;
}

export async function detectReferences(
  input: DetectionInput,
  client: SefariaClient,
  signal?: AbortSignal,
): Promise<ReturnType<typeof zCoreFindRefsResponse.parse>> {
  const deadline = AbortSignal.timeout(DEADLINE_MS);
  const combined =
    signal === undefined ? deadline : AbortSignal.any([signal, deadline]);
  const submission = await postFindRefs({
    client,
    body: { text: input },
    query: { with_text: "0", debug: "0", max_segments: 20 },
    signal: combined,
  });
  if (submission.data === undefined) {
    throw new Error("Sefaria did not enqueue the citation scan.");
  }

  const taskId = submission.data.task_id;
  let delay = INITIAL_POLL_DELAY_MS;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    const result = await getAsyncTaskStatus({
      client,
      path: { task_id: taskId },
      signal: combined,
    });
    const payload = result.data ?? result.error;
    if (payload === undefined || payload.task_id !== taskId) {
      throw new Error("Sefaria returned an invalid citation task response.");
    }
    if (payload.state === "SUCCESS") {
      const parsed = zCoreFindRefsResponse.safeParse(payload.result);
      if (!parsed.success) {
        const paths = parsed.error.issues
          .map((issue) => `/result/${issue.path.join("/")}`)
          .join(", ");
        throw new Error(`Invalid find-refs task result at ${paths}.`);
      }
      return parsed.data;
    }
    if (payload.state === "FAILURE") {
      throw new Error(payload.error);
    }
    if (attempt + 1 < MAX_POLL_ATTEMPTS) {
      await wait(delay, combined);
      delay = Math.min(MAX_POLL_DELAY_MS, delay * POLL_FACTOR);
    }
  }
  throw new Error("Sefaria citation detection did not finish after 16 polls.");
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = (): void => {
      globalThis.clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
