import type { ZodIssue, ZodType } from "zod";

import {
  responseContracts,
  type GeneratedResponseContract,
} from "./generated/response-contracts.gen.js";
import { SefariaContractError, type ContractIssue } from "./contract-error.js";

export interface ResponseSelector {
  readonly method: string;
  readonly path: string;
  readonly status: number;
}

export type ValidationResult =
  | {
      readonly valid: true;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly ContractIssue[];
    };

export type ResponseValidatorLookup = (
  contract: GeneratedResponseContract,
) => ZodType | undefined;

export interface ResponseValidationContext {
  readonly method: string;
  readonly path: string;
  readonly response: Response;
}

function normalizeMethod(method: string): string {
  return method.toUpperCase();
}

function findOperationContract(
  selector: Omit<ResponseSelector, "status">,
): GeneratedResponseContract | undefined {
  const method = normalizeMethod(selector.method);
  return responseContracts.find(
    (entry) => entry.method === method && entry.path === selector.path,
  );
}

export function getResponseContract(
  selector: ResponseSelector,
): GeneratedResponseContract | undefined {
  const method = normalizeMethod(selector.method);
  return responseContracts.find(
    (entry) =>
      entry.method === method &&
      entry.path === selector.path &&
      entry.status === selector.status,
  );
}

export function getResponseValidator(
  contract: GeneratedResponseContract,
): ZodType {
  return contract.schema;
}

function encodePointerSegment(segment: PropertyKey): string {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function issuesFromZod(
  errors: readonly ZodIssue[],
  schemaPath: string,
): ContractIssue[] {
  return errors.map((error) => ({
    instancePath:
      error.path.length === 0
        ? ""
        : `/${error.path.map(encodePointerSegment).join("/")}`,
    schemaPath,
    keyword: error.code,
    message: error.message,
  }));
}

function syntheticIssue(
  keyword: string,
  schemaPath: string,
  message: string,
): ContractIssue {
  return {
    instancePath: "",
    schemaPath,
    keyword,
    message,
  };
}

export function validateExternalResponse(
  selector: ResponseSelector,
  value: unknown,
  lookup: ResponseValidatorLookup = getResponseValidator,
): ValidationResult {
  const contract = getResponseContract(selector);
  if (contract === undefined) {
    return {
      valid: false,
      issues: [
        syntheticIssue(
          "undocumented-status",
          "",
          `No documented response schema for ${normalizeMethod(
            selector.method,
          )} ${selector.path} status ${selector.status}.`,
        ),
      ],
    };
  }
  const validator = lookup(contract);
  if (validator === undefined) {
    return {
      valid: false,
      issues: [
        syntheticIssue(
          "missing-validator",
          contract.schemaPath,
          `No generated validator named ${contract.validatorName}.`,
        ),
      ],
    };
  }
  const result = validator.safeParse(value);
  if (result.success) {
    return { valid: true, issues: [] };
  }
  return {
    valid: false,
    issues: issuesFromZod(result.error.issues, contract.schemaPath),
  };
}

function normalizedMediaType(contentType: string | null): string | undefined {
  return contentType?.split(";", 1)[0]?.trim().toLowerCase() || undefined;
}

function contractError(
  contract: GeneratedResponseContract,
  response: Response,
  issues: readonly ContractIssue[],
): SefariaContractError {
  return new SefariaContractError({
    operationId: contract.operationId,
    method: contract.method,
    path: contract.path,
    status: response.status,
    issues,
    response,
  });
}

export async function validateResponse(
  context: ResponseValidationContext,
  lookup: ResponseValidatorLookup = getResponseValidator,
): Promise<void> {
  const selector = {
    method: context.method,
    path: context.path,
    status: context.response.status,
  };
  const operation = findOperationContract(selector);
  if (operation === undefined) {
    throw new Error(
      `No generated operation metadata for ${normalizeMethod(
        context.method,
      )} ${context.path}.`,
    );
  }
  const contract = getResponseContract(selector);
  if (contract === undefined) {
    throw contractError(operation, context.response, [
      syntheticIssue(
        "undocumented-status",
        "",
        `HTTP ${context.response.status} is not documented for this operation.`,
      ),
    ]);
  }
  const validator = lookup(contract);
  if (validator === undefined) {
    throw contractError(contract, context.response, [
      syntheticIssue(
        "missing-validator",
        contract.schemaPath,
        `No generated validator named ${contract.validatorName}.`,
      ),
    ]);
  }

  const mediaType = normalizedMediaType(
    context.response.headers.get("content-type"),
  );
  if (
    mediaType === undefined ||
    !contract.contentTypes.some(
      (documented) => normalizedMediaType(documented) === mediaType,
    )
  ) {
    throw contractError(contract, context.response, [
      syntheticIssue(
        "content-type",
        contract.schemaPath,
        `Expected ${contract.contentTypes.join(
          " or ",
        )}, received ${mediaType ?? "no content type"}.`,
      ),
    ]);
  }

  const responseText = await context.response.clone().text();
  let value: unknown;
  try {
    value = JSON.parse(responseText) as unknown;
  } catch (error) {
    throw contractError(contract, context.response, [
      syntheticIssue(
        "invalid-json",
        contract.schemaPath,
        error instanceof Error
          ? error.message
          : "Response JSON parsing failed.",
      ),
    ]);
  }

  const result = validator.safeParse(value);
  if (!result.success) {
    throw contractError(
      contract,
      context.response,
      issuesFromZod(result.error.issues, contract.schemaPath),
    );
  }
}
