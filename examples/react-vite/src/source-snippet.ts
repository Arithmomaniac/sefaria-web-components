export const reactSourceCardSnippet = `const result = await loadSourceCardViewModel(
  { tref },
  client,
  controller.signal,
);

const cardRef = useRef<SefariaSourceCard>(null);
const [selected, setSelected] = useState<SourceSelection>();
useElementProperty(cardRef, "viewModel", viewModel);
useElementProperty(cardRef, "selectable", viewModel.state === "data");
useElementProperty(cardRef, "selectedPosition", selected?.position);

function onSourceSelection(event: Event) {
  const detail = (event as CustomEvent<SourceSelection>).detail;
  setSelected({ position: [...detail.position], ref: detail.ref });
}

const setCardRef = useCallback((card: SefariaSourceCard | null) => {
  cardRef.current?.removeEventListener(
    "sefaria-source-select",
    onSourceSelection,
  );
  cardRef.current = card;
  card?.addEventListener("sefaria-source-select", onSourceSelection);
}, []);

return (
  <>
    <sefaria-source-card ref={setCardRef} />
    <p>{selected ? \`React received selection: \${selected.ref}.\` : ""}</p>
  </>
);`;
