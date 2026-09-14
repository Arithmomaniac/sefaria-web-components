# Custom elements

This file is generated from the Lit element sources and the bounded event and token catalogs in `scripts/generate-package-metadata.mjs`. Run `pnpm metadata:generate` after changing a public element contract.

## `<sefaria-bilingual-segment>`

Request-free custom element that renders one bilingual-segment view model.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `viewModel` | Property only | `BilingualSegmentViewModel` | - | Render-ready state supplied by the host. |
| `contentLanguage` | `content-language` | `BilingualSegmentContentLanguage` | `"both"` | Sides the host wants displayed. |
| `layout` | `layout` | `BilingualSegmentLayout` | `"auto"` | Requested arrangement of the two sides. |
| `sideOrder` | `side-order` | `BilingualSegmentSideOrder` | `"primary-first"` | Requested role order for a side-by-side arrangement. |

### Events

None.

### Slots and CSS parts

No public slots or CSS parts.

## `<sefaria-connections-panel>`

Request-free category summaries and bounded connected-text details.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `viewModel` | Property only | `ConnectionsViewModel | undefined` | - | Host-supplied rendering state. |
| `showPreviews` | `show-previews` | `boolean` | `true` | Hides or reveals captured preview data without requesting it. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-connections-category-change` | Requests a different captured connection category. |
| `sefaria-connections-preview-request` | Requests captured connection previews from the host. |
| `sefaria-connections-page-change` | Requests a different page of captured connections. |
| `sefaria-connection-select` | Reports selection of one connected reference. |

### Slots and CSS parts

No public slots or CSS parts.

## `<sefaria-popup>`

Request-free anchored dialog that renders one popup view model.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `viewModel` | Property only | `PopupViewModel | undefined` | `undefined` | Render-ready popup state supplied by the integration. |
| `anchor` | Property only | `HTMLElement | null` | `null` | Host element used for placement and focus restoration. |
| `open` | `open` | `boolean` | `false` | Whether the dialog is visible. |

### Events

| Event                 | Description                          |
| --------------------- | ------------------------------------ |
| `sefaria-popup-close` | Reports that the popup should close. |

### Slots and CSS parts

No public slots or CSS parts.

## `<sefaria-reader>`

Request-free controlled reader surface for one semantic reader entry.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `viewModel` | Property only | `ReaderViewModel | undefined` | - | Host-supplied reader rendering state. |
| `activePane` | `active-pane` | `ReaderPane` | `"source"` | Host-controlled pane selected in compact presentation. |
| `chatExport` | `chat-export` | `boolean` | `false` | Shows an explicit host-mediated chat export action when a target exists. |

### Events

| Event | Description |
| --- | --- |
| `sefaria-reader-back` | Requests navigation to the previous entry. |
| `sefaria-reader-history-activate` | Requests activation of one retained history entry. |
| `sefaria-reader-pane-change` | Requests the visible compact reader pane. |
| `sefaria-reader-chat-export` | Requests host-owned export of a reference to chat. |
| `sefaria-reader-source-select` | Reports selection of one source-card item. |
| `sefaria-reader-connections-category-change` | Requests a different connection category. |
| `sefaria-reader-connections-page-change` | Requests a different connection page. |
| `sefaria-reader-connection-select` | Reports selection of one connected reference. |
| `sefaria-reader-connections-preview-request` | Requests connection previews from the host. |

### Slots and CSS parts

No public slots or CSS parts.

## `<sefaria-ref-label>`

Request-free custom element that renders one reference-label view model.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `viewModel` | Property only | `RefLabelViewModel` | - | Render-ready state supplied by the host. |
| `labelLanguage` | `label-language` | `RefLabelLanguage` | `"english"` | Label language selected by the host. |
| `linked` | `linked` | `boolean` | `false` | Whether data-state labels render as canonical links. |

### Events

None.

### Slots and CSS parts

No public slots or CSS parts.

## `<sefaria-source-card>`

Request-free custom element that renders one source-card view model.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `viewModel` | Property only | `SourceCardViewModel` | - | Render-ready state supplied by the host. |
| `referenceLabel` | Property only | `RefLabelViewModel | undefined` | `undefined` | Optional richer label supplied by a host that already owns it. |
| `contentLanguage` | `content-language` | `BilingualPairContentLanguage` | `"both"` | Sides the host wants displayed for every pair. |
| `layout` | `layout` | `BilingualPairLayout` | `"auto"` | Requested arrangement for every pair. |
| `sideOrder` | `side-order` | `BilingualPairSideOrder` | `"primary-first"` | Requested role order for every pair. |
| `showAddressLabels` | Property only | `boolean` | `true` | Whether compact address labels are visible beside rendered text sides. |
| `selectable` | `selectable` | `boolean` | `false` | Enables selection controls for items with proven canonical targets. |
| `selectedPosition` | Property only | `readonly number[] | undefined` | `undefined` | Host-controlled original position path, never a reference string. |
| `hideAttributions` | `hide-attributions` | `boolean` | `false` | Whether resolved edition attribution is intentionally omitted. |

### Events

| Event                   | Description                                |
| ----------------------- | ------------------------------------------ |
| `sefaria-source-select` | Reports selection of one source-card item. |

### Slots and CSS parts

No public slots or CSS parts.

## `<sefaria-text-segment>`

Request-free custom element that renders one text-segment view model.

### Properties and attributes

| Property | Attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `viewModel` | Property only | `TextSegmentViewModel` | - | Render-ready state supplied by the host. |

### Events

None.

### Slots and CSS parts

No public slots or CSS parts.

## Shared CSS custom properties

| Property | Default | Description |
| --- | --- | --- |
| `--sefaria-surface` | `light-dark(#fffdf8, #2b2e2a)` | Primary surface color. |
| `--sefaria-surface-muted` | `light-dark(#f5f1e8, #222521)` | Muted surface color. |
| `--sefaria-fg` | `light-dark(#25231f, #f1eee7)` | Primary foreground color. |
| `--sefaria-fg-muted` | `light-dark(#6d675d, #bdb7ac)` | Muted foreground color. |
| `--sefaria-border` | `light-dark(#d7cfc1, #555b53)` | Standard border color. |
| `--sefaria-border-strong` | `light-dark(#aaa094, #73796f)` | Strong border color. |
| `--sefaria-accent` | `light-dark(#8e2449, #ff93b4)` | Accent and focus color. |
| `--sefaria-accent-soft` | `light-dark(rgb(142 36 73 / 10%), rgb(255 147 180 / 14%))` | Translucent accent surface. |
| `--sefaria-danger` | `light-dark(#9c1c1c, #ffaaa4)` | Error foreground color. |
| `--sefaria-link` | `light-dark(#8e2449, #ff93b4)` | Link foreground color. |
| `--sefaria-shadow` | `0 1rem 3rem rgb(0 0 0 / 28%)` | Popup and elevated-surface shadow. |
| `--sefaria-panel-radius` | `0.75rem` | Panel corner radius. |
| `--sefaria-control-radius` | `0.3rem` | Control corner radius. |
| `--sefaria-font-scale` | `1` | Component font-size multiplier. |
| `--sefaria-font-hebrew` | `"Noto Serif Hebrew", "SBL Hebrew", "Times New Roman", serif` | Hebrew body font stack. |
| `--sefaria-font-english` | `Georgia, "Times New Roman", serif` | English body font stack. |
| `--sefaria-font-label-hebrew` | `"Noto Sans Hebrew", system-ui, sans-serif` | Hebrew label font stack. |
| `--sefaria-font-label-english` | `system-ui, sans-serif` | English label font stack. |
