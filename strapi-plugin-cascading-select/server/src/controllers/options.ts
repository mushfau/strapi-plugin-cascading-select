import type { Core } from '@strapi/strapi';

import { PLUGIN_ID } from '../constants';
import type { CascadeService } from '../services/cascade';
import type { CascadingSelectOptions } from '../types';

const OPTION_KEYS = [
  'parentUid',
  'parentLabelField',
  'childUid',
  'childLabelField',
  'parentRelation',
] as const satisfies ReadonlyArray<keyof CascadingSelectOptions>;

type Query = Record<string, unknown>;

const getString = (query: Query, key: string) =>
  typeof query[key] === 'string' && query[key] !== '' ? (query[key] as string) : undefined;

const options = ({ strapi }: { strapi: Core.Strapi }) => {
  const getService = () => strapi.plugin(PLUGIN_ID).service('cascade') as CascadeService;

  /**
   * The admin input sends the field options it was configured with; they are resolved
   * and must match a field that exists on a schema.
   */
  const resolveFromQuery = (query: Query) => {
    const fieldOptions = Object.fromEntries(
      OPTION_KEYS.map((key) => [key, getString(query, key)])
    ) as CascadingSelectOptions;
    const config = getService().resolveConfig(fieldOptions);

    getService().assertConfigured(config);

    return config;
  };

  return {
    async parents(ctx) {
      const config = resolveFromQuery(ctx.query);

      ctx.body = await getService().listParents(config, {
        locale: getString(ctx.query, 'locale'),
      });
    },

    async children(ctx) {
      const config = resolveFromQuery(ctx.query);

      ctx.body = await getService().listChildren(config, {
        parent: getString(ctx.query, 'parent'),
        locale: getString(ctx.query, 'locale'),
      });
    },
  } satisfies Core.Controller;
};

export default options;
