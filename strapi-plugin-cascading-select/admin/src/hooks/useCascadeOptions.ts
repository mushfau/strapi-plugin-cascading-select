import { useEffect, useState } from 'react';
import { isFetchError, useFetchClient } from '@strapi/strapi/admin';

import { PLUGIN_ID } from '../pluginId';
import type { CascadingSelectOptions, OptionsResponse, SelectOption } from '../types';

interface CascadeOptionsState {
  options: SelectOption[];
  /** Display name of the listed collection type. */
  label: string;
  total: number;
  isLoading: boolean;
  error?: string;
}

const INITIAL_STATE: CascadeOptionsState = { options: [], label: '', total: 0, isLoading: true };

/**
 * Loads the options of one dropdown. `parent` is only used for the children.
 */
const useCascadeOptions = (
  level: 'parents' | 'children',
  fieldOptions: CascadingSelectOptions,
  { locale, parent }: { locale?: string; parent?: string | null }
) => {
  const { get } = useFetchClient();
  const [state, setState] = useState<CascadeOptionsState>(INITIAL_STATE);

  const { parentUid, parentLabelField, childUid, childLabelField, parentRelation } = fieldOptions;
  const query = new URLSearchParams(
    Object.entries({
      parentUid,
      parentLabelField,
      childUid,
      childLabelField,
      parentRelation,
      locale,
      parent: level === 'children' ? parent : undefined,
    }).filter((entry): entry is [string, string] => Boolean(entry[1]))
  ).toString();

  useEffect(() => {
    const controller = new AbortController();

    setState((previous) => ({ ...previous, isLoading: true, error: undefined }));

    get<OptionsResponse>(`/${PLUGIN_ID}/options/${level}?${query}`, { signal: controller.signal })
      .then(({ data }) => {
        setState({
          options: data.data,
          label: data.meta.label,
          total: data.meta.total,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState((previous) => ({
          ...previous,
          options: [],
          isLoading: false,
          error: isFetchError(error)
            ? (error.response?.data?.error?.message ?? error.message)
            : String(error),
        }));
      });

    return () => controller.abort();
  }, [get, level, query]);

  return state;
};

export { useCascadeOptions };
