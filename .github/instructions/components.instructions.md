---
description: "Rules for component factories, Lit elements, and browser demonstrations"
applyTo: "packages/components/**,demos/component-lab/**,docs/specs/components.md"
---

# Component Instructions

- Give each component a non-DOM subpath with its request type, view-model union, pure factory, and async factory.
- Keep component view models specific to one rendering surface.
- Do not create a generalized data facade.
- Make pure factories deterministic and independent of clients, caches, DOM state, and global state.
- Make async factories accept a supplied `@sefaria/client`.
- Make a successful async result equal the pure result for its captured payload.
- Return a component error view model for documented HTTP error payloads.
- Preserve network and abort rejections from the supplied client.
- Return component-specific partial or empty states for missing requested content.
- Keep loading, data, partial, empty, and error details in view models.
- Keep layout, focus, selection, open state, and placement as element properties.
- Let elements accept only a component view model and visual or interaction properties.
- Do not give elements references, raw JSON, API payloads, clients, hosts, base URLs, request parameters, or `fetch`.
- Do not make requests or call async factories from elements.
- Make composite async factories issue one outer request and call child pure factories.
- Prove that ten child views use one outer request and zero child requests.
- Sanitize unsafe HTML before it enters a view model.
- Add JSDoc to every handwritten exported declaration and every exported interface or class property. Document rendering state and element behavior at the declaration. Link to package documentation for longer explanations.
- Use direction and attribution from payload data.
- Use real interactive controls, accessible names, visible focus, and keyboard operation.
- Use browser tests for structure, direction, focus, layout, event composition, token inheritance, and request absence.
- Add a component-lab state for each view-model state and important interaction.
