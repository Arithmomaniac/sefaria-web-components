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

export const readerExampleSource = `const controller = await loadReaderController(
  { tref: "Micah 6:8" },
  client,
  { signal },
);

const unbind = bindReaderController(readerElement, controller);
const unsubscribe = controller.subscribe(({ task, reader }) => {
  setStatus(task.state === "idle"
    ? \`Showing \${reader.label}.\`
    : "Reader request in progress.");
});

// On teardown:
unsubscribe();
unbind();
controller.dispose();`;

export const manualReaderExampleSource = `const dataSource =
  createSefariaReaderDataSource(client);
let session = createReaderSession({
  source: await dataSource.loadSource({ tref: "Micah 6:8" }, signal),
});

sourceCard.viewModel = session.view.current.source?.viewModel;
connectionsPanel.viewModel =
  session.view.current.connections?.state === "view"
    ? session.view.current.connections.viewModel
    : undefined;

sourceCard.addEventListener("sefaria-source-select", async (event) => {
  const selected = session.selectSourcePosition(
    session.view.currentEntryId,
    event.detail.position,
  );
  if (selected.state !== "applied") return;
  session = selected.session;
  const request = { tref: event.detail.ref, withText: true };
  const begun = session.beginConnections(session.view.currentEntryId, request);
  if (begun.state !== "applied") return;
  const content = await dataSource.loadConnections(request, {}, signal);
  session = begun.session.completeConnections(
    begun.value.operationId,
    content,
  ).session;
  renderSeparateColumns(session.view.current);
});`;
