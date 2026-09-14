export const reactSourceCardSnippet = `const result = await loadSourceCardViewModel(
  { tref },
  client,
  controller.signal,
);

const cardRef = useRef<SefariaSourceCard>(null);
useElementProperty(cardRef, "viewModel", viewModel);
useElementProperty(cardRef, "selectable", viewModel.state === "data");

function onSourceSelection(event: Event) {
  const detail = (event as CustomEvent<SourceSelection>).detail;
  setSelectedPosition(detail.position);
}

const setCardRef = useCallback((card: SefariaSourceCard | null) => {
  cardRef.current?.removeEventListener(
    "sefaria-source-select",
    onSourceSelection,
  );
  cardRef.current = card;
  card?.addEventListener("sefaria-source-select", onSourceSelection);
}, []);

return <sefaria-source-card ref={setCardRef} />;`;
