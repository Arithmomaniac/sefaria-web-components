const denyNetwork = (): never => {
  throw new Error("Component fixture tests must not access the network.");
};

Object.defineProperty(globalThis, "fetch", {
  configurable: true,
  value: denyNetwork,
  writable: true,
});
