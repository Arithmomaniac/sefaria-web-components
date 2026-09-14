import type { Frame, Locator, Page } from "playwright";

const CLICK_CLEARANCE = 16;

export async function revealLocatorForDemoClick(
  target: Locator,
  settleDelay = 150,
): Promise<void> {
  await target.waitFor({ state: "visible" });
  const page = target.page();
  const composer = page.locator(".interactive-input-part").last();
  const chatList = page.locator(".interactive-list").last();

  const isUnobstructed = async (): Promise<boolean> => {
    const [targetBounds, composerBounds, listBounds] = await Promise.all([
      target.boundingBox(),
      composer.boundingBox(),
      chatList.boundingBox(),
    ]);
    if (
      targetBounds === null ||
      composerBounds === null ||
      listBounds === null
    ) {
      return false;
    }
    return (
      targetBounds.y >= listBounds.y + CLICK_CLEARANCE &&
      targetBounds.y + targetBounds.height <= composerBounds.y - CLICK_CLEARANCE
    );
  };

  if (!(await isUnobstructed())) {
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(settleDelay);
  }

  for (
    let attempt = 0;
    attempt < 6 && !(await isUnobstructed());
    attempt += 1
  ) {
    const [targetBounds, composerBounds, listBounds] = await Promise.all([
      target.boundingBox(),
      composer.boundingBox(),
      chatList.boundingBox(),
    ]);
    if (
      targetBounds !== null &&
      composerBounds !== null &&
      listBounds !== null
    ) {
      const safeTop = listBounds.y + CLICK_CLEARANCE;
      const safeBottom = composerBounds.y - CLICK_CLEARANCE;
      const targetCenter = targetBounds.y + targetBounds.height / 2;
      const safeCenter = (safeTop + safeBottom) / 2;
      await chatList.hover({
        position: { x: 5, y: safeCenter - listBounds.y },
      });
      await page.mouse.wheel(0, targetCenter - safeCenter);
      await page.waitForTimeout(settleDelay);
    }
  }

  if (!(await isUnobstructed())) {
    throw new Error(
      "Could not reveal the demo click target above the Chat composer.",
    );
  }
  await target.click({ trial: true, timeout: 3000 });
  if (!(await isUnobstructed())) {
    throw new Error("The demo click target moved behind the Chat composer.");
  }
}

export async function frameReaderForCapture(
  frame: Frame,
  topOffset = 32,
  resetFrameScroll = true,
  settleDelay = 150,
): Promise<void> {
  if (resetFrameScroll) {
    await frame.evaluate(() => scrollTo({ top: 0, left: 0 }));
  }
  const page = frame.page();
  let outer = frame;
  while (
    outer.parentFrame() !== null &&
    outer.parentFrame() !== page.mainFrame()
  ) {
    outer = outer.parentFrame()!;
  }
  const iframe = await outer.frameElement();
  const list = page.locator(".interactive-list").last();
  const listBounds = await list.boundingBox();
  if (listBounds === null)
    throw new Error("The host Chat list is not visible.");
  await list.hover({ position: { x: 5, y: listBounds.height / 2 } });
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const bounds = await iframe.boundingBox();
    if (bounds === null)
      throw new Error("The Reader App frame is not visible.");
    const offset = bounds.y - listBounds.y;
    if (offset >= topOffset - 24 && offset <= topOffset + 24) return;
    // Monaco virtualizes this list: DOM scrollIntoView cannot move its rows.
    await page.mouse.wheel(0, offset - topOffset);
    await page.waitForTimeout(settleDelay);
  }
  throw new Error(
    "Could not frame the Reader header inside the host Chat list.",
  );
}

export async function captureVscodeViewport(page: Page): Promise<Buffer> {
  const session = await page.context().newCDPSession(page);
  try {
    // A Playwright viewport clip truncates Electron's zoomed native surface.
    const { data } = await session.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    return Buffer.from(data, "base64");
  } finally {
    await session.detach();
  }
}

export async function prepareShowcaseLayout(page: Page): Promise<void> {
  await runCommand(page, "workbench.action.zoomReset", "View: Reset Zoom");
  await runCommand(page, "workbench.action.zoomIn", "View: Zoom In");
  const workbench = page.locator(".monaco-workbench");
  if (
    !(await workbench.evaluate((element) =>
      element.classList.contains("fullscreen"),
    ))
  ) {
    await runCommand(
      page,
      "workbench.action.toggleFullScreen",
      "View: Toggle Full Screen",
    );
    await page.locator(".monaco-workbench.fullscreen").waitFor();
  }

  const centered = await page.evaluate(() => {
    const chat = document.getElementById("workbench.parts.auxiliarybar");
    return (
      chat !== null && chat.getBoundingClientRect().width >= innerWidth * 0.9
    );
  });
  if (!centered) {
    await runCommand(
      page,
      "workbench.action.maximizeAuxiliaryBar",
      "View: Maximize Secondary Side Bar",
    );
  }
  await page.waitForFunction(() => {
    const chat = document.getElementById("workbench.parts.auxiliarybar");
    return (
      chat !== null && chat.getBoundingClientRect().width >= innerWidth * 0.9
    );
  });
}

export async function prepareReaderForShowcaseCapture(
  frame: Frame,
): Promise<void> {
  await frame.evaluate(() => {
    document.documentElement.style.zoom = "0.84";
  });
}

async function runCommand(
  page: Page,
  id: string,
  title: string,
): Promise<void> {
  await page.keyboard.press("Control+Shift+P");
  const picker = page.locator(".quick-input-widget").last();
  const input = picker.locator(".quick-input-box input");
  await input.waitFor({ state: "visible" });
  await input.fill(`>${id}`);
  await picker
    .locator(".quick-input-list .monaco-list-row")
    .filter({ hasText: title })
    .first()
    .click();
  await picker.waitFor({ state: "hidden" });
}
