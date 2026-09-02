import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  captureGenesisIndexFixtureCandidate,
  publishStagedFixture,
} from "../scripts/refresh-fixtures.js";

const committedFixtureName = "index-genesis-2026-09-01.json";
const candidateCaptureDate = "2026-09-02";
const candidateFixtureName = `index-genesis-${candidateCaptureDate}.json`;
const source = "https://www.sefaria.org/api/v2/index/Genesis";
const roots: string[] = [];

async function createRoot(initialBytes = "original fixture bytes"): Promise<{
  readonly root: string;
  readonly committedFixturePath: string;
  readonly candidateFixturePath: string;
}> {
  const root = await mkdtemp(resolve(tmpdir(), "sefaria-fixture-capture-"));
  roots.push(root);
  const fixturesRoot = resolve(root, "test/fixtures");
  const committedFixturePath = resolve(fixturesRoot, committedFixtureName);
  await mkdir(fixturesRoot, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(fixturesRoot, "manifest.json"),
      JSON.stringify({ [committedFixtureName]: { source } }),
      "utf8",
    ),
    writeFile(committedFixturePath, initialBytes, "utf8"),
  ]);
  return {
    root,
    committedFixturePath,
    candidateFixturePath: resolve(fixturesRoot, candidateFixtureName),
  };
}

async function readCommittedFixture(): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(
      resolve(import.meta.dirname, "fixtures", committedFixtureName),
      "utf8",
    ),
  ) as Record<string, unknown>;
}

async function readCommittedFixtureBytes(): Promise<string> {
  return await readFile(
    resolve(import.meta.dirname, "fixtures", committedFixtureName),
    "utf8",
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function responseFor(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Genesis index fixture candidate capture", () => {
  it.each([
    { args: [] },
    { args: ["--write"] },
    { args: ["--capture-date", candidateCaptureDate] },
    { args: ["--write", "--capture-date", "2026-9-2"] },
    { args: ["--write", "--capture-date", "2026-02-30"] },
    {
      args: ["--write", "--capture-date", candidateCaptureDate, "extra"],
    },
  ])(
    "requires exact --write and an ISO capture date for $args",
    async ({ args }) => {
      const { root, committedFixturePath, candidateFixturePath } =
        await createRoot();
      const fetchImpl = vi.fn<typeof fetch>();

      await expect(
        captureGenesisIndexFixtureCandidate(args, fetchImpl, root),
      ).rejects.toThrow(/--write --capture-date YYYY-MM-DD/);

      expect(fetchImpl).not.toHaveBeenCalled();
      await expect(readFile(committedFixturePath, "utf8")).resolves.toBe(
        "original fixture bytes",
      );
      await expect(pathExists(candidateFixturePath)).resolves.toBe(false);
    },
  );

  it("creates a newly dated candidate with deterministic reduced bytes", async () => {
    const expectedBytes = await readCommittedFixtureBytes();
    const expected = await readCommittedFixture();
    const payload = structuredClone(expected) as {
      schema: { titles: unknown[] };
      alts: { Parasha: { nodes: unknown[] } };
      order?: number[];
    };
    payload.schema.titles.unshift({
      text: "Gen.",
      lang: "en",
    });
    payload.schema.titles.reverse();
    Object.assign(payload.schema.titles[0] as object, {
      upstreamOnly: true,
    });
    Object.assign(payload.alts.Parasha.nodes[0] as object, {
      upstreamOnly: true,
    });
    payload.alts.Parasha.nodes.push({ title: "Noach" });
    payload.order = [1, 1];
    const { root, committedFixturePath, candidateFixturePath } =
      await createRoot();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(responseFor(payload));

    await captureGenesisIndexFixtureCandidate(
      ["--write", "--capture-date", candidateCaptureDate],
      fetchImpl,
      root,
    );

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(source);
    await expect(readFile(candidateFixturePath, "utf8")).resolves.toBe(
      expectedBytes,
    );
    await expect(readFile(committedFixturePath, "utf8")).resolves.toBe(
      "original fixture bytes",
    );
  });

  it("refuses an existing dated candidate before fetching", async () => {
    const { root, committedFixturePath, candidateFixturePath } =
      await createRoot();
    await writeFile(candidateFixturePath, "existing candidate bytes", "utf8");
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(
      captureGenesisIndexFixtureCandidate(
        ["--write", "--capture-date", candidateCaptureDate],
        fetchImpl,
        root,
      ),
    ).rejects.toThrow(/already exists/);

    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(readFile(candidateFixturePath, "utf8")).resolves.toBe(
      "existing candidate bytes",
    );
    await expect(readFile(committedFixturePath, "utf8")).resolves.toBe(
      "original fixture bytes",
    );
  });

  it.each([
    {
      name: "network failure",
      fetchImpl: () =>
        vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
      message: /offline/,
    },
    {
      name: "HTTP failure",
      fetchImpl: () =>
        vi.fn<typeof fetch>().mockResolvedValue(
          new Response("unavailable", {
            status: 503,
            statusText: "Unavailable",
          }),
        ),
      message: /503 Unavailable/,
    },
    {
      name: "invalid JSON",
      fetchImpl: () =>
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response("{", { status: 200 })),
      message: /JSON/,
    },
    {
      name: "validation failure",
      fetchImpl: () =>
        vi.fn<typeof fetch>().mockResolvedValue(
          responseFor({
            title: "Genesis",
            categories: "Tanakh",
            schema: {},
          }),
        ),
      message: /validator/,
    },
    {
      name: "reduction failure",
      fetchImpl: () =>
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(responseFor({ error: "unknown index" })),
      message: /Cannot reduce/,
    },
  ])(
    "leaves committed evidence unchanged on $name",
    async ({ fetchImpl, message }) => {
      const { root, committedFixturePath, candidateFixturePath } =
        await createRoot();

      await expect(
        captureGenesisIndexFixtureCandidate(
          ["--write", "--capture-date", candidateCaptureDate],
          fetchImpl(),
          root,
        ),
      ).rejects.toThrow(message);

      await expect(readFile(committedFixturePath, "utf8")).resolves.toBe(
        "original fixture bytes",
      );
      await expect(pathExists(candidateFixturePath)).resolves.toBe(false);
    },
  );

  it("leaves the candidate absent when its publication rename fails", async () => {
    const payload = await readCommittedFixture();
    const { root, committedFixturePath, candidateFixturePath } =
      await createRoot();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(responseFor(payload));
    const renamePath = vi.fn(async () => {
      throw new Error("simulated publication failure");
    });

    await expect(
      captureGenesisIndexFixtureCandidate(
        ["--write", "--capture-date", candidateCaptureDate],
        fetchImpl,
        root,
        { renamePath },
      ),
    ).rejects.toThrow(/simulated publication failure/);

    expect(renamePath).toHaveBeenCalledOnce();
    await expect(readFile(committedFixturePath, "utf8")).resolves.toBe(
      "original fixture bytes",
    );
    await expect(pathExists(candidateFixturePath)).resolves.toBe(false);
  });
});

describe("staged fixture publication", () => {
  it("keeps the original target present when replacement fails", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "sefaria-fixture-publish-"));
    roots.push(root);
    const stagedPath = resolve(root, "staged.json");
    const targetPath = resolve(root, "target.json");
    await Promise.all([
      writeFile(stagedPath, "replacement bytes", "utf8"),
      writeFile(targetPath, "original bytes", "utf8"),
    ]);

    await expect(
      publishStagedFixture(stagedPath, targetPath, {
        renamePath: async () => {
          await expect(readFile(targetPath, "utf8")).resolves.toBe(
            "original bytes",
          );
          throw new Error("simulated replacement failure");
        },
      }),
    ).rejects.toThrow(/simulated replacement failure/);

    await expect(readFile(targetPath, "utf8")).resolves.toBe("original bytes");
    await expect(readFile(stagedPath, "utf8")).resolves.toBe(
      "replacement bytes",
    );
  });

  it("replaces an existing target with one rename", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "sefaria-fixture-publish-"));
    roots.push(root);
    const stagedPath = resolve(root, "staged.json");
    const targetPath = resolve(root, "target.json");
    await Promise.all([
      writeFile(stagedPath, "replacement bytes", "utf8"),
      writeFile(targetPath, "original bytes", "utf8"),
    ]);
    const renamePath = vi.fn(rename);

    await publishStagedFixture(stagedPath, targetPath, { renamePath });

    expect(renamePath).toHaveBeenCalledOnce();
    await expect(readFile(targetPath, "utf8")).resolves.toBe(
      "replacement bytes",
    );
    await expect(pathExists(stagedPath)).resolves.toBe(false);
  });
});
