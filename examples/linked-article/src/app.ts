import { createSefariaClient, type SefariaClient } from "@sefaria/client";
import "@sefaria/web-components";
import type { PopupLoadingViewModel } from "@sefaria/web-components";
import { loadPopupViewModel } from "@sefaria/web-components/popup";

const POPUP_ID = "linked-article-source-popup";
const LINK_SELECTOR = "a[data-sefaria-ref]";
const STATUS_SELECTOR = "[data-linked-article-status]";

export interface LinkedArticleApp {
  destroy(): void;
}

export function startLinkedArticle(
  root: Document = document,
  client: SefariaClient = createSefariaClient({ cache: false }),
): LinkedArticleApp {
  const popup = root.createElement("sefaria-popup");
  popup.id = POPUP_ID;
  root.body.append(popup);
  const existingStatus = root.querySelector<HTMLElement>(STATUS_SELECTOR);
  const status = existingStatus ?? root.createElement("p");
  if (existingStatus === null) {
    status.dataset.linkedArticleStatus = "";
    status.className = "linked-article-status";
    root.body.append(status);
  }

  const anchors = [...root.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR)];
  const listeners = new Map<HTMLAnchorElement, (event: MouseEvent) => void>();
  let request: AbortController | undefined;
  let operation = 0;

  const close = (): void => {
    request?.abort();
    request = undefined;
    operation += 1;
    popup.open = false;
  };

  popup.addEventListener("sefaria-popup-close", close);

  for (const anchor of anchors) {
    if (!isEligibleAnchor(anchor)) {
      continue;
    }
    anchor.setAttribute("aria-controls", POPUP_ID);
    const listener = (event: MouseEvent): void => {
      if (!shouldEnhanceActivation(event, anchor)) {
        return;
      }
      event.preventDefault();
      const tref = anchor.dataset.sefariaRef;
      if (tref === undefined) {
        return;
      }
      void open(anchor, tref);
    };
    listeners.set(anchor, listener);
    anchor.addEventListener("click", listener);
  }

  async function open(anchor: HTMLAnchorElement, tref: string): Promise<void> {
    request?.abort();
    const currentRequest = new AbortController();
    request = currentRequest;
    const currentOperation = ++operation;
    const loading: PopupLoadingViewModel = {
      state: "loading",
      message: `Loading ${tref}.`,
    };
    popup.anchor = anchor;
    popup.viewModel = loading;
    popup.open = true;
    status.textContent = "";
    status.setAttribute("role", "status");

    try {
      const viewModel = await loadPopupViewModel(
        { tref },
        client,
        currentRequest.signal,
      );
      if (
        currentOperation === operation &&
        !currentRequest.signal.aborted &&
        popup.isConnected
      ) {
        popup.viewModel = viewModel;
      }
    } catch (error) {
      if (
        currentOperation !== operation ||
        currentRequest.signal.aborted ||
        !popup.isConnected
      ) {
        return;
      }
      popup.open = false;
      status.textContent =
        error instanceof Error ? error.message : String(error);
      status.setAttribute("role", "alert");
    }
  }

  return {
    destroy(): void {
      close();
      popup.removeEventListener("sefaria-popup-close", close);
      for (const [anchor, listener] of listeners) {
        anchor.removeEventListener("click", listener);
        anchor.removeAttribute("aria-controls");
      }
      popup.remove();
      if (existingStatus === null) {
        status.remove();
      } else {
        status.textContent = "";
        status.setAttribute("role", "status");
      }
    },
  };
}

function isEligibleAnchor(anchor: HTMLAnchorElement): boolean {
  const tref = anchor.dataset.sefariaRef;
  if (tref === undefined || tref.trim().length === 0) {
    return false;
  }
  try {
    const url = new URL(anchor.href);
    return (
      url.protocol === "https:" &&
      url.hostname === "www.sefaria.org" &&
      url.username.length === 0 &&
      url.password.length === 0
    );
  } catch {
    return false;
  }
}

function shouldEnhanceActivation(
  event: MouseEvent,
  anchor: HTMLAnchorElement,
): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !anchor.hasAttribute("download") &&
    (anchor.target === "" || anchor.target === "_self")
  );
}
