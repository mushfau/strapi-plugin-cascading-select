/**
 * Options saved on the attribute by the Content-Type Builder (`attribute.options`).
 * Keep in sync with `server/src/types.ts`.
 */
export interface CascadingSelectOptions {
  parentUid?: string;
  parentLabelField?: string;
  childUid?: string;
  childLabelField?: string;
  parentRelation?: string;
  syncRelation?: string;
}

/** Value stored in the JSON column. Both ids are `documentId`s. */
export interface CascadingSelectValue {
  parent: string | null;
  child: string | null;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface OptionsResponse {
  data: SelectOption[];
  meta: { label: string; total: number };
}
