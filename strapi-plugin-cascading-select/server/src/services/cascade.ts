import type { Core, Schema, Struct, UID } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { CUSTOM_FIELD_UID, PLUGIN_ID } from '../constants';
import type {
  CascadingSelectOptions,
  CascadingSelectValue,
  OptionsResponse,
  ResolvedConfig,
  ResolvedTarget,
} from '../types';

type AnySchema = Struct.ContentTypeSchema | Struct.ComponentSchema;
type Attribute = Schema.Attribute.AnyAttribute;
type CascadingAttribute = Attribute & {
  customField: string;
  options?: CascadingSelectOptions;
  required?: boolean;
};
type Data = Record<string, unknown>;
type Path = Array<string | number>;
type Locale = string | string[] | undefined;

export interface SanitizeOptions {
  locale?: string;
  /** Require a complete selection on required fields (skipped for drafts). */
  enforceRequired: boolean;
  path?: Path;
}

const LABEL_FIELD_CANDIDATES = ['name', 'title', 'label'];
const LABEL_FIELD_TYPES = new Set([
  'string',
  'text',
  'uid',
  'email',
  'enumeration',
  'integer',
  'biginteger',
  'float',
  'decimal',
]);

const isObject = (value: unknown): value is Data =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCascadingField = (attribute: Attribute): attribute is CascadingAttribute =>
  'customField' in attribute && attribute.customField === CUSTOM_FIELD_UID;

const isRelationTo = (attribute: Attribute | undefined, target: string) =>
  attribute?.type === 'relation' && 'target' in attribute && attribute.target === target;

/**
 * Error attached to a form field: the Content Manager maps `details.errors[].path`
 * onto the matching input.
 */
const fieldError = (path: Path, message: string) =>
  new errors.ValidationError(message, {
    errors: [{ path: path.map(String), message, name: 'ValidationError' }],
  });

const cascade = ({ strapi }: { strapi: Core.Strapi }) => {
  const getCollectionType = (uid: string | undefined, option: keyof CascadingSelectOptions) => {
    const schema = uid ? strapi.contentTypes[uid as UID.ContentType] : undefined;

    if (!uid) {
      throw new errors.ValidationError(`"${option}" is not set`);
    }
    if (!schema || schema.kind !== 'collectionType') {
      throw new errors.ValidationError(`"${option}" must be a collection type UID, got "${uid}"`);
    }

    return schema;
  };

  const resolveLabelField = (
    schema: Struct.ContentTypeSchema,
    field: string | undefined,
    option: keyof CascadingSelectOptions
  ) => {
    const isLabel = (name: string) => LABEL_FIELD_TYPES.has(schema.attributes[name]?.type);

    if (field) {
      if (field === 'documentId' || isLabel(field)) {
        return field;
      }
      throw new errors.ValidationError(
        `"${option}": "${field}" is not a text or number attribute of ${schema.uid}`
      );
    }

    return (
      LABEL_FIELD_CANDIDATES.find(isLabel) ??
      Object.keys(schema.attributes).find((name) => schema.attributes[name].type === 'string') ??
      'documentId'
    );
  };

  const resolveParentRelation = (
    child: Struct.ContentTypeSchema,
    parentUid: string,
    field: string | undefined
  ) => {
    if (field) {
      if (isRelationTo(child.attributes[field], parentUid)) {
        return field;
      }
      throw new errors.ValidationError(
        `"parentRelation": "${field}" is not a relation from ${child.uid} to ${parentUid}`
      );
    }

    const candidates = Object.keys(child.attributes).filter((name) =>
      isRelationTo(child.attributes[name], parentUid)
    );

    if (candidates.length === 1) {
      return candidates[0];
    }
    throw new errors.ValidationError(
      candidates.length === 0
        ? `${child.uid} has no relation to ${parentUid}`
        : `${child.uid} has several relations to ${parentUid} (${candidates.join(', ')}), set "parentRelation"`
    );
  };

  /**
   * Turns the options stored on the attribute into a fully resolved config.
   * Throws a ValidationError describing the first misconfiguration.
   */
  const resolveConfig = (options: CascadingSelectOptions = {}): ResolvedConfig => {
    const parent = getCollectionType(options.parentUid, 'parentUid');
    const child = getCollectionType(options.childUid, 'childUid');

    return {
      parent: {
        uid: parent.uid,
        displayName: parent.info.displayName,
        labelField: resolveLabelField(parent, options.parentLabelField, 'parentLabelField'),
      },
      child: {
        uid: child.uid,
        displayName: child.info.displayName,
        labelField: resolveLabelField(child, options.childLabelField, 'childLabelField'),
        parentRelation: resolveParentRelation(child, parent.uid, options.parentRelation),
      },
    };
  };

  const assertSyncRelation = (schema: AnySchema, field: string, config: ResolvedConfig) => {
    if (!isRelationTo(schema.attributes[field], config.child.uid)) {
      throw new errors.ValidationError(
        `"syncRelation": "${field}" is not a relation from ${schema.uid} to ${config.child.uid}`
      );
    }
  };

  const getSchemas = (): AnySchema[] => [
    ...Object.values(strapi.contentTypes),
    ...Object.values(strapi.components),
  ];

  const getCascadingFields = (schema: AnySchema) =>
    Object.entries(schema.attributes).filter((entry): entry is [string, CascadingAttribute] =>
      isCascadingField(entry[1])
    );

  /**
   * Checks every cascading field of the app and reports misconfigurations.
   */
  const checkConfiguration = () => {
    const problems: string[] = [];

    for (const schema of getSchemas()) {
      for (const [name, attribute] of getCascadingFields(schema)) {
        try {
          const config = resolveConfig(attribute.options);
          if (attribute.options?.syncRelation) {
            assertSyncRelation(schema, attribute.options.syncRelation, config);
          }
        } catch (error) {
          problems.push(`${schema.uid}.${name}: ${(error as Error).message}`);
        }
      }
    }

    return problems;
  };

  const configKey = ({ parent, child }: ResolvedConfig) =>
    [parent.uid, parent.labelField, child.uid, child.labelField, child.parentRelation].join('|');

  let configuredKeys: Set<string> | undefined;

  /**
   * The options endpoints only serve configurations that exist on a schema, so they
   * cannot be used to read arbitrary collections. Schemas only change on restart.
   */
  const assertConfigured = (config: ResolvedConfig) => {
    if (!configuredKeys) {
      configuredKeys = new Set();
      for (const schema of getSchemas()) {
        for (const [, attribute] of getCascadingFields(schema)) {
          try {
            configuredKeys.add(configKey(resolveConfig(attribute.options)));
          } catch {
            // Misconfigured fields are reported by `checkConfiguration` on bootstrap.
          }
        }
      }
    }

    if (!configuredKeys.has(configKey(config))) {
      throw new errors.ForbiddenError('No cascading select field uses this configuration');
    }
  };

  const listOptions = async (
    target: ResolvedTarget,
    filters: Data | undefined,
    locale: string | undefined
  ): Promise<OptionsResponse> => {
    const maxOptions = strapi.plugin(PLUGIN_ID).config<number>('maxOptions');
    const service = strapi.documents(target.uid);
    const query = { filters, locale };

    const [documents, total] = await Promise.all([
      service.findMany({
        ...query,
        fields: target.labelField === 'documentId' ? ['documentId'] : [target.labelField],
        sort: { [target.labelField]: 'asc' },
        limit: maxOptions,
      } as Parameters<typeof service.findMany>[0]),
      service.count(query as Parameters<typeof service.count>[0]),
    ]);

    return {
      data: documents.map((document) => {
        const label = (document as Data)[target.labelField];
        return {
          value: document.documentId,
          label:
            label === null || label === undefined || label === ''
              ? document.documentId
              : String(label),
        };
      }),
      meta: { label: target.displayName, total },
    };
  };

  const listParents = (config: ResolvedConfig, { locale }: { locale?: string } = {}) =>
    listOptions(config.parent, undefined, locale);

  const listChildren = async (
    config: ResolvedConfig,
    { parent, locale }: { parent?: string; locale?: string } = {}
  ): Promise<OptionsResponse> => {
    if (!parent) {
      return { data: [], meta: { label: config.child.displayName, total: 0 } };
    }

    return listOptions(
      config.child,
      { [config.child.parentRelation]: { documentId: { $eq: parent } } },
      locale
    );
  };

  const exists = async (uid: UID.ContentType, filters: Data, locale: string | undefined) => {
    const service = strapi.documents(uid);
    return (await service.count({ filters, locale } as Parameters<typeof service.count>[0])) > 0;
  };

  const parseValue = (raw: unknown, path: Path): CascadingSelectValue | null => {
    if (raw === null) {
      return null;
    }

    const isId = (value: unknown): value is string | null | undefined =>
      value === null || value === undefined || typeof value === 'string';

    if (!isObject(raw) || !isId(raw.parent) || !isId(raw.child)) {
      throw fieldError(
        path,
        'Expected { "parent": documentId | null, "child": documentId | null }'
      );
    }
    if (!raw.parent && !raw.child) {
      return null;
    }

    return { parent: raw.parent || null, child: raw.child || null };
  };

  const validateSelection = async (
    config: ResolvedConfig,
    value: CascadingSelectValue | null,
    { locale, required, path }: { locale?: string; required: boolean; path: Path }
  ) => {
    const { parent, child } = config;

    if (!value?.parent) {
      if (value?.child) {
        throw fieldError(
          path,
          `${parent.displayName} is required when ${child.displayName} is set`
        );
      }
      if (required) {
        throw fieldError(path, `${parent.displayName} and ${child.displayName} are required`);
      }
      return;
    }
    if (!value.child && required) {
      throw fieldError(path, `${child.displayName} is required`);
    }
    if (!(await exists(parent.uid, { documentId: { $eq: value.parent } }, locale))) {
      throw fieldError(path, `The selected ${parent.displayName} does not exist`);
    }
    if (
      value.child &&
      !(await exists(
        child.uid,
        {
          documentId: { $eq: value.child },
          [child.parentRelation]: { documentId: { $eq: value.parent } },
        },
        locale
      ))
    ) {
      throw fieldError(
        path,
        `The selected ${child.displayName} does not belong to the selected ${parent.displayName}`
      );
    }
  };

  const containsCache = new Map<string, boolean>();

  /** Whether a schema holds a cascading field, directly or through components. */
  const containsCascadingField = (schema: AnySchema | undefined): boolean => {
    if (!schema) {
      return false;
    }

    const cached = containsCache.get(schema.uid);
    if (cached !== undefined) {
      return cached;
    }

    containsCache.set(schema.uid, false);
    const result = Object.values(schema.attributes).some((attribute) => {
      if (isCascadingField(attribute)) {
        return true;
      }
      if (attribute.type === 'component') {
        return containsCascadingField(strapi.components[attribute.component]);
      }
      if (attribute.type === 'dynamiczone') {
        return attribute.components.some((uid) => containsCascadingField(strapi.components[uid]));
      }
      return false;
    });
    containsCache.set(schema.uid, result);

    return result;
  };

  /**
   * Validates every cascading field found in `data` (including inside components and
   * dynamic zones), normalizes their value and fills the synced relations.
   * Returns a new data object; fields absent from `data` are left untouched.
   */
  const sanitizeData = async (
    schema: AnySchema,
    data: Data,
    { path = [], ...options }: SanitizeOptions
  ): Promise<Data> => {
    if (!containsCascadingField(schema)) {
      return data;
    }

    const result: Data = { ...data };
    const sanitizeComponent = (uid: string, value: unknown, componentPath: Path) =>
      isObject(value)
        ? sanitizeData(strapi.components[uid as UID.Component], value, {
            ...options,
            path: componentPath,
          })
        : value;

    for (const [name, attribute] of Object.entries(schema.attributes)) {
      const value = data[name];
      const attributePath = [...path, name];

      if (value === undefined) {
        continue;
      }

      if (isCascadingField(attribute)) {
        const settings = attribute.options ?? {};
        let config: ResolvedConfig;

        try {
          config = resolveConfig(settings);
          if (settings.syncRelation) {
            assertSyncRelation(schema, settings.syncRelation, config);
          }
        } catch (error) {
          throw fieldError(attributePath, `Field misconfigured: ${(error as Error).message}`);
        }

        const selection = parseValue(value, attributePath);
        await validateSelection(config, selection, {
          locale: options.locale,
          required: options.enforceRequired && attribute.required === true,
          path: attributePath,
        });

        result[name] = selection;
        if (settings.syncRelation) {
          result[settings.syncRelation] = {
            set: selection?.child ? [{ documentId: selection.child }] : [],
          };
        }
      } else if (attribute.type === 'component') {
        result[name] = Array.isArray(value)
          ? await Promise.all(
              value.map((item, index) =>
                sanitizeComponent(attribute.component, item, [...attributePath, index])
              )
            )
          : await sanitizeComponent(attribute.component, value, attributePath);
      } else if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
        result[name] = await Promise.all(
          value.map((item, index) =>
            isObject(item) && typeof item.__component === 'string'
              ? sanitizeComponent(item.__component, item, [...attributePath, index])
              : item
          )
        );
      }
    }

    return result;
  };

  /** Populate query reaching every component that holds a cascading field. */
  const buildPopulate = (schema: AnySchema): Data | true => {
    const populate: Data = {};

    for (const [name, attribute] of Object.entries(schema.attributes)) {
      if (attribute.type === 'component') {
        const component = strapi.components[attribute.component];
        if (containsCascadingField(component)) {
          populate[name] = { populate: buildPopulate(component) };
        }
      } else if (attribute.type === 'dynamiczone') {
        const on = Object.fromEntries(
          attribute.components
            .filter((uid) => containsCascadingField(strapi.components[uid]))
            .map((uid) => [uid, { populate: buildPopulate(strapi.components[uid]) }])
        );
        if (Object.keys(on).length > 0) {
          populate[name] = { on };
        }
      }
    }

    return Object.keys(populate).length > 0 ? populate : true;
  };

  /**
   * Draft & Publish only enforces required fields on publish, so a complete selection
   * is checked against the drafts about to be published.
   */
  const validateDraftsBeforePublish = async (
    schema: Struct.ContentTypeSchema,
    { documentId, locale }: { documentId?: string; locale?: Locale }
  ) => {
    if (!documentId || !containsCascadingField(schema)) {
      return;
    }

    const where: Data = { documentId, publishedAt: null };
    const isLocalized = (schema.pluginOptions?.i18n as { localized?: boolean } | undefined)
      ?.localized;

    if (isLocalized && locale !== '*') {
      where.locale = locale ?? (await strapi.plugin('i18n').service('locales').getDefaultLocale());
    }

    const drafts: Data[] = await strapi.db.query(schema.uid).findMany({
      where,
      populate: buildPopulate(schema),
    });

    for (const draft of drafts) {
      await sanitizeData(schema, draft, {
        locale: typeof draft.locale === 'string' ? draft.locale : undefined,
        enforceRequired: true,
      });
    }
  };

  return {
    resolveConfig,
    assertConfigured,
    checkConfiguration,
    containsCascadingField,
    listParents,
    listChildren,
    sanitizeData,
    validateDraftsBeforePublish,
  };
};

export type CascadeService = ReturnType<typeof cascade>;

export default cascade;
