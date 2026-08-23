export type VocalizationMode = "taamim_and_nikkud" | "nikkud" | "none";

export interface VocalizationOptions {
  paseq?: "always" | "after-space";
}

export interface SanitizeOptions {
  allowFootnotes?: boolean;
  allowNamedEntities?: boolean;
  allowRefLinks?: boolean;
}
