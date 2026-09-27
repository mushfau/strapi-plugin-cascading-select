import * as yup from 'yup';

import type { CascadingSelectOptions } from './types';
import { getTranslation } from './utils/getTranslation';

const UID_PATTERN = /^(api|plugin)::[\w-]+\.[\w-]+$/;

const message = (id: string, defaultMessage: string) => ({
  id: getTranslation(id),
  defaultMessage,
});

/**
 * Text input stored under `attribute.options[name]`.
 */
const textOption = (
  name: keyof CascadingSelectOptions,
  label: string,
  description: string,
  placeholder: string
) => ({
  name: `options.${name}`,
  type: 'text',
  intlLabel: message(`options.${name}.label`, label),
  description: message(`options.${name}.description`, description),
  placeholder: message(`options.${name}.placeholder`, placeholder),
});

const collectionUid = () =>
  yup
    .string()
    .required(message('options.error.required', 'This value is required'))
    .matches(UID_PATTERN, {
      message: message('options.error.uid', 'Use a collection type UID such as api::atoll.atoll'),
      // Leave empty values to `required`, otherwise its message is shadowed.
      excludeEmptyString: true,
    });

export const customFieldOptions = {
  base: [
    {
      sectionTitle: message('options.section.parent', 'First dropdown (parent)'),
      items: [
        textOption(
          'parentUid',
          'Parent collection',
          'UID of the collection type listed in the first dropdown',
          'api::atoll.atoll'
        ),
        textOption(
          'parentLabelField',
          'Parent label field',
          'Attribute shown as the option label. Empty: name, title, label or the first text attribute',
          'name'
        ),
      ],
    },
    {
      sectionTitle: message('options.section.child', 'Second dropdown (child)'),
      items: [
        textOption(
          'childUid',
          'Child collection',
          'UID of the collection type listed in the second dropdown',
          'api::island.island'
        ),
        textOption(
          'childLabelField',
          'Child label field',
          'Attribute shown as the option label. Empty: name, title, label or the first text attribute',
          'name'
        ),
        textOption(
          'parentRelation',
          'Relation to parent',
          'Relation on the child pointing to the parent. Empty: detected automatically',
          'atoll'
        ),
      ],
    },
  ],
  advanced: [
    {
      sectionTitle: message('options.section.settings', 'Settings'),
      items: [
        {
          name: 'required',
          type: 'checkbox',
          intlLabel: message('options.required.label', 'Required field'),
          description: message(
            'options.required.description',
            'Both dropdowns must be filled (checked on publish when Draft & Publish is enabled)'
          ),
        },
        {
          name: 'private',
          type: 'checkbox',
          intlLabel: message('options.private.label', 'Private field'),
          description: message(
            'options.private.description',
            'This field will not show up in the API response'
          ),
        },
      ],
    },
    {
      sectionTitle: message('options.section.sync', 'Relation sync'),
      items: [
        textOption(
          'syncRelation',
          'Synced relation',
          'Relation on this content type targeting the child collection. It is set from the selected child on every save',
          'island'
        ),
      ],
    },
  ],
  validator: () => ({
    parentUid: collectionUid(),
    childUid: collectionUid(),
  }),
};
