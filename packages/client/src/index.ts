export {
  createSefariaClient,
  type SefariaClient,
  type SefariaClientOptions,
} from "./client.js";
export {
  SefariaContractError,
  type ContractIssue,
  type SefariaContractErrorOptions,
} from "./contract-error.js";
export {
  getIndexV2,
  getLinks,
  getRef,
  getShape,
  getTextVersions,
  getV3Texts,
  type Options,
} from "./generated/sdk.gen.js";
export type * from "./generated/contracts.gen.js";
export * from "./generated/zod.gen.js";
export * from "./generated/response-validators.gen.js";
export {
  getResponseContract,
  validateExternalResponse,
  type ResponseSelector,
  type ValidationResult,
} from "./validation.js";
