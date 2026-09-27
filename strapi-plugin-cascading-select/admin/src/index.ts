import type { ComponentType } from 'react';
import type { StrapiApp } from '@strapi/strapi/admin';

import { Initializer } from './components/Initializer';
import { PluginIcon } from './components/PluginIcon';
import { customFieldOptions } from './customFieldOptions';
import { CUSTOM_FIELD_NAME, PLUGIN_ID } from './pluginId';
import { getTranslation } from './utils/getTranslation';

type CustomField = Exclude<Parameters<StrapiApp['customFields']['register']>[0], unknown[]>;

const plugin: StrapiApp['appPlugins'][string] = {
  register(app) {
    app.customFields.register({
      name: CUSTOM_FIELD_NAME,
      pluginId: PLUGIN_ID,
      type: 'json',
      icon: PluginIcon,
      intlLabel: {
        id: getTranslation('field.label'),
        defaultMessage: 'Cascading select',
      },
      intlDescription: {
        id: getTranslation('field.description'),
        defaultMessage: 'Two linked dropdowns, the second one filtered by the first',
      },
      components: {
        // Typed as a props-less component by Strapi; the Content Manager passes the
        // field props (name, value, onChange, attribute...) at runtime.
        Input: async () => {
          const { default: Input } = await import('./components/CascadingSelectInput');
          return { default: Input as unknown as ComponentType };
        },
      },
      // Strapi's typings only list built-in option names, while custom fields store
      // their own settings under `options.*` (as documented for custom fields).
      options: customFieldOptions as unknown as CustomField['options'],
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: Initializer,
      isReady: false,
      name: PLUGIN_ID,
    });
  },

  registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = (await import(`./translations/${locale}.json`)) as {
            default: Record<string, string>;
          };

          const newData: Record<string, string> = {};
          const keys = Object.keys(data);

          for (const key of keys) {
            newData[getTranslation(key)] = data[key];
          }

          return { data: newData, locale };
        } catch {
          return { data: {}, locale };
        }
      })
    );
  },
};

export default plugin;
