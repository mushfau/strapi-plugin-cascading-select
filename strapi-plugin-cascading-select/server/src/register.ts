import type { Core } from '@strapi/strapi';

import { CUSTOM_FIELD_NAME, PLUGIN_ID } from './constants';
import createDocumentMiddleware from './document-middleware';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.customFields.register({
    name: CUSTOM_FIELD_NAME,
    plugin: PLUGIN_ID,
    type: 'json',
    inputSize: { default: 12, isResizable: true },
  });

  // Document Service middlewares must be registered during `register`.
  strapi.documents.use(createDocumentMiddleware(strapi));
};

export default register;
