export interface BookIndex {
  readonly titles: readonly string[];
}

export interface ParsedRef {
  readonly book: string;
  readonly sections: readonly number[];
  readonly toSections: readonly number[];
}
