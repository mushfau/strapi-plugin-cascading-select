import type { Core } from '@strapi/strapi';

import { seedMaldives } from './seed/maldives';

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedMaldives(strapi);
  },
};
