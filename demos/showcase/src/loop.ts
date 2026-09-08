import Reveal from "reveal.js";

import "reveal.js/dist/reveal.css";
import "./loop.css";

const paused = new URLSearchParams(location.search).get("paused") === "1";
const deck = new Reveal({
  controls: false,
  progress: false,
  slideNumber: false,
  keyboard: paused,
  touch: paused,
  overview: false,
  center: false,
  disableLayout: true,
  hash: false,
  loop: true,
  autoSlide: paused ? false : 10_000,
  autoSlideStoppable: false,
  transition: "fade",
  backgroundTransition: "fade",
});

void deck.initialize().then(() => {
  const updateVisibility = () => {
    document.documentElement.toggleAttribute(
      "data-loop-hidden",
      document.hidden,
    );
    if (paused) return;
    deck.toggleAutoSlide(!document.hidden);
  };
  document.addEventListener("visibilitychange", updateVisibility);
  updateVisibility();
});
