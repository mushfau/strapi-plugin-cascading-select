import type { Core } from '@strapi/strapi';

import { PLUGIN_ID } from './constants';
import type { CascadeService } from './services/cascade';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {
  const service = strapi.plugin(PLUGIN_ID).service('cascade') as CascadeService;

  for (const problem of service.checkConfiguration()) {
    strapi.log.warn(`[${PLUGIN_ID}] ${problem}`);
  }
};

export default bootstrap;
