import type { GetRefData, GetV3TextsData } from "@sefaria/client";

export type V3ComponentRequest = Pick<GetV3TextsData, "path" | "query">;

export type RefComponentRequest = Pick<GetRefData, "path">;

export type ProductionOwnerIssue = 16 | 17 | 18 | 19;

export type RejectionKind =
  "abort" | "contract-mismatch" | "internal" | "network";

export interface ProjectionFixture<TRequest, TViewModel, TPayload = unknown> {
  readonly kind: "projection";
  readonly id: string;
  readonly ownerIssue: ProductionOwnerIssue;
  readonly request: TRequest;
  readonly payloadKey: string;
  readonly payload: TPayload;
  readonly derivedFrom?: {
    readonly payloadKey: string;
    readonly operation: string;
  };
  readonly expected: TViewModel;
}

export interface ReproducibleHttpErrorFixture<
  TRequest,
  TViewModel,
  TPayload = unknown,
> {
  readonly kind: "http-error";
  readonly id: string;
  readonly ownerIssue: ProductionOwnerIssue;
  readonly request: TRequest;
  readonly transportTrigger?: never;
  readonly status: number;
  readonly payloadKey: string;
  readonly payload: TPayload;
  readonly expected: TViewModel;
}

export interface TransportOnlyHttpErrorFixture<TViewModel, TPayload = unknown> {
  readonly kind: "http-error";
  readonly id: string;
  readonly ownerIssue: ProductionOwnerIssue;
  readonly request?: never;
  readonly transportTrigger: {
    readonly path: Readonly<Record<string, string>>;
    readonly query?: Readonly<Record<string, string | readonly string[]>>;
    readonly reason: string;
  };
  readonly status: number;
  readonly payloadKey: string;
  readonly payload: TPayload;
  readonly expected: TViewModel;
}

export type HttpErrorFixture<TRequest, TViewModel, TPayload = unknown> =
  | ReproducibleHttpErrorFixture<TRequest, TViewModel, TPayload>
  | TransportOnlyHttpErrorFixture<TViewModel, TPayload>;

export interface RejectionFixture<TRequest> {
  readonly kind: "rejection";
  readonly id: string;
  readonly ownerIssue: ProductionOwnerIssue;
  readonly request: TRequest;
  readonly rejection: RejectionKind;
}

export interface RenderFixture<TViewModel> {
  readonly kind: "render";
  readonly id: string;
  readonly ownerIssue: ProductionOwnerIssue;
  readonly viewModel: TViewModel;
}

export type ComponentFixture<TRequest, TViewModel, TPayload = unknown> =
  | HttpErrorFixture<TRequest, TViewModel, TPayload>
  | ProjectionFixture<TRequest, TViewModel, TPayload>
  | RejectionFixture<TRequest>
  | RenderFixture<TViewModel>;

export interface BrowserFixture<TViewModel, TElementProperties> {
  readonly id: string;
  readonly ownerIssue: ProductionOwnerIssue;
  readonly viewModel: TViewModel;
  readonly elementProperties: TElementProperties;
  readonly container: {
    readonly width: 320 | 960;
  };
  readonly theme: {
    readonly colorScheme: "dark" | "light";
    readonly properties: Readonly<Record<`--sefaria-${string}`, string>>;
  };
  readonly blockingAssertions: readonly string[];
  readonly informationalScreenshot: string;
}
