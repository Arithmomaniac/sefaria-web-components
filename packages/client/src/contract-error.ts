export interface ContractIssue {
  readonly instancePath: string;
  readonly schemaPath: string;
  readonly keyword: string;
  readonly message?: string;
}

export interface SefariaContractErrorOptions {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly issues: readonly ContractIssue[];
  readonly response: Response;
}

export class SefariaContractError extends Error {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly issues: readonly ContractIssue[];
  readonly response: Response;

  constructor(options: SefariaContractErrorOptions) {
    const summary = options.issues
      .map(
        (issue) =>
          `${issue.instancePath || "/"} ${issue.keyword}${
            issue.message ? `: ${issue.message}` : ""
          }`,
      )
      .join("; ");
    super(
      `Sefaria response contract mismatch for ${options.operationId} (${options.method} ${options.path}, HTTP ${options.status}): ${summary}`,
    );
    this.name = "SefariaContractError";
    this.operationId = options.operationId;
    this.method = options.method;
    this.path = options.path;
    this.status = options.status;
    this.issues = options.issues;
    this.response = options.response;
  }
}
