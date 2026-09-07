import type { Frame, Page } from "playwright";

export async function frameReaderForCapture(frame: Frame): Promise<void> {
  await frame.evaluate(() => scrollTo({ top: 0, left: 0 }));
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
    if (offset >= 8 && offset <= 56) return;
    // Monaco virtualizes this list: DOM scrollIntoView cannot move its rows.
    await page.mouse.wheel(0, offset - 32);
    await page.waitForTimeout(150);
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
