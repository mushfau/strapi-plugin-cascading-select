import type { Core, Modules } from '@strapi/strapi';
import { contentTypes } from '@strapi/utils';

import { PLUGIN_ID } from './constants';
import type { CascadeService } from './services/cascade';

const WRITE_ACTIONS = new Set(['create', 'update', 'clone']);

/**
 * Document Service middleware keeping cascading fields consistent whatever the entry
 * point (Content Manager, REST, GraphQL or custom code):
 * - validates that the child belongs to the parent and normalizes the stored value,
 * - fills the optional synced relation from the selected child,
 * - enforces complete selections on required fields (on publish for Draft & Publish).
 */
const createDocumentMiddleware =
  (strapi: Core.Strapi): Modules.Documents.Middleware.Middleware =>
  async (context, next) => {
    const service = strapi.plugin(PLUGIN_ID).service('cascade') as CascadeService;

    if (!service.containsCascadingField(context.contentType)) {
      return next();
    }

    const params = context.params as {
      data?: Record<string, unknown>;
      documentId?: string;
      locale?: string | string[];
    };

    if (WRITE_ACTIONS.has(context.action) && params.data) {
      params.data = await service.sanitizeData(context.contentType, params.data, {
        locale: typeof params.locale === 'string' ? params.locale : undefined,
        // Drafts may be incomplete; required fields are checked on publish instead.
        enforceRequired: !contentTypes.hasDraftAndPublish(context.contentType),
      });
    }

    if (context.action === 'publish') {
      await service.validateDraftsBeforePublish(context.contentType, params);
    }

    return next();
  };

export default createDocumentMiddleware;
