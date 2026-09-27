import type { UID } from '@strapi/strapi';

/**
 * Options saved on the attribute by the Content-Type Builder (`attribute.options`).
 */
export interface CascadingSelectOptions {
  /** Collection type listed in the first dropdown, e.g. `api::atoll.atoll`. */
  parentUid?: string;
  /** Attribute of the parent used as the option label. Auto-detected when empty. */
  parentLabelField?: string;
  /** Collection type listed in the second dropdown, e.g. `api::island.island`. */
  childUid?: string;
  /** Attribute of the child used as the option label. Auto-detected when empty. */
  childLabelField?: string;
  /** Relation on the child pointing to the parent. Auto-detected when empty. */
  parentRelation?: string;
  /** Relation on the same schema (targeting the child) kept in sync on save. */
  syncRelation?: string;
}

/**
 * Value stored in the JSON column. Both ids are `documentId`s.
 */
export interface CascadingSelectValue {
  parent: string | null;
  child: string | null;
}

export interface ResolvedTarget {
  uid: UID.ContentType;
  displayName: string;
  labelField: string;
}

export interface ResolvedConfig {
  parent: ResolvedTarget;
  child: ResolvedTarget & { parentRelation: string };
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface OptionsResponse {
  data: SelectOption[];
  meta: {
    /** Display name of the listed collection type, used as the dropdown label. */
    label: string;
    /** Total matches; greater than `data.length` when truncated by `maxOptions`. */
    total: number;
  };
}

export interface PluginConfig {
  maxOptions: number;
}
