import type { Locator, Page } from "playwright";

const cursorId = "sefaria-demo-cursor";

export async function installDemoCursor(page: Page): Promise<void> {
  await page.evaluate((id) => {
    if (document.getElementById(id) !== null) return;
    const style = document.createElement("style");
    style.textContent = `
      #${id} {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 2147483647;
        width: 22px;
        height: 22px;
        box-sizing: border-box;
        margin: -11px 0 0 -11px;
        border: 3px solid #d9008f;
        border-radius: 50%;
        background: rgb(255 255 255 / 92%);
        opacity: 0;
        pointer-events: none;
        transform: translate(-50px, -50px);
        transition:
          transform 320ms cubic-bezier(.2, .8, .2, 1),
          opacity 80ms linear;
        box-shadow:
          0 0 0 2px rgb(255 255 255 / 90%),
          0 1px 3px rgb(0 0 0 / 75%);
      }
      #${id}::before {
        content: "";
        position: absolute;
        left: 6px;
        top: 6px;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #d9008f;
      }
      #${id}::after {
        content: "";
        position: absolute;
        left: -6px;
        top: -6px;
        width: 28px;
        height: 28px;
        border: 3px solid #d9008f;
        border-radius: 50%;
        opacity: 0;
      }
      #${id}.clicking::after {
        animation: ${id}-click 360ms ease-out;
      }
      @keyframes ${id}-click {
        from { opacity: 1; transform: scale(.35); }
        to { opacity: 0; transform: scale(1.8); }
      }
    `;
    const cursor = document.createElement("div");
    cursor.id = id;
    document.head.append(style);
    document.body.append(cursor);
  }, cursorId);
}

export async function moveDemoCursor(
  target: Locator,
  duration = 350,
): Promise<void> {
  await positionDemoCursor(target);
  const page = target.page();
  await page.evaluate((id) => {
    const cursor = document.getElementById(id);
    if (cursor === null) throw new Error("The demo cursor is not installed.");
    cursor.style.opacity = "1";
  }, cursorId);
  await page.waitForTimeout(duration);
}

export async function positionDemoCursor(target: Locator): Promise<void> {
  const bounds = await target.boundingBox();
  if (bounds === null) {
    throw new Error("The demo cursor target is not visible.");
  }
  const page = target.page();
  await page.evaluate(
    ({ id, x, y }) => {
      const cursor = document.getElementById(id);
      if (cursor === null) throw new Error("The demo cursor is not installed.");
      cursor.style.transform = `translate(${x}px, ${y}px)`;
    },
    {
      id: cursorId,
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    },
  );
}

export async function pulseDemoCursor(page: Page): Promise<void> {
  await page.evaluate((id) => {
    const cursor = document.getElementById(id);
    if (cursor === null) throw new Error("The demo cursor is not installed.");
    cursor.classList.remove("clicking");
    void cursor.offsetWidth;
    cursor.classList.add("clicking");
  }, cursorId);
  await page.waitForTimeout(360);
  await page.evaluate((id) => {
    const cursor = document.getElementById(id);
    if (cursor === null) throw new Error("The demo cursor is not installed.");
    cursor.style.opacity = "0";
  }, cursorId);
}
