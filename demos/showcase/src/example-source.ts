export const pipelineExampleSource = {
  client: `const result = await getV3Texts({
  client,
  path: { tref: request.tref },
  query: {
    version: ["english"],
    return_format: "default",
  },
  signal,
});

if (!result.data) {
  throw new Error(result.error?.error ?? "No text response.");
}

const payload = result.data;`,
  "view-model": `const viewModel = createTextSegmentViewModel(
  payload,
  request,
);`,
  element: `useElementProperty(
  elementRef,
  "viewModel",
  viewModel,
);

return <sefaria-text-segment ref={elementRef} />;`,
} as const;

export const textExampleSource = `const result = useFactoryViewModel(
  request,
  { state: "loading", message: \`Loading \${request.tref}.\` },
  loadTextSegmentViewModel,
  client,
);

useElementProperty(elementRef, "viewModel", result.viewModel);

return <>
  {result.error && <p role="alert">{result.error}</p>}
  <section style={{
    "--sample-font-english": englishFont,
    "--sample-font-hebrew": hebrewFont,
  }}>
    <sefaria-text-segment ref={elementRef} />
  </section>
</>;`;

export const sourceCardExampleSource = `const result = useFactoryViewModel(
  request,
  { state: "loading", message: \`Loading \${request.tref}.\` },
  loadSourceCardViewModel,
  client,
);

useElementProperty(cardRef, "viewModel", result.viewModel);
useElementProperty(cardRef, "layout", layout);

return <section style={{
  "--sample-font-english": englishFont,
  "--sample-font-hebrew": hebrewFont,
}}>
  <sefaria-source-card ref={cardRef} />
</section>;`;

export const readerExampleSource = `const [session, setSession] = useState<ReaderSession>();
const [activePane, setActivePane] = useState<ReaderPane>("source");

async function openSource(request, signal) {
  const result = await getV3Texts({
    client,
    path: { tref: request.tref },
    query: { version: ["primary", "translation"], return_format: "default" },
    signal,
  });
  if (!result.data) throw new Error(result.error?.error ?? "No text data.");
  const source = createReaderSourceContent(result.data, request);
  setSession(createReaderSession({ source }));
}

function selectSource(position, ref) {
  if (!session) return;
  const selected = session.selectSourcePosition(
    session.view.currentEntryId,
    position,
  );
  if (selected.state !== "applied") {
    setError(selected.reason);
    return;
  }
  setSession(selected.session);
  void loadConnections(selected.session.view.currentEntryId, ref);
}

useElementProperty(
  readerRef,
  "viewModel",
  session && createReaderViewModel(session.view),
);
useElementProperty(readerRef, "activePane", activePane);

function onPaneChange(event: CustomEvent<{ pane: ReaderPane }>) {
  setActivePane(event.detail.pane);
}
`;
