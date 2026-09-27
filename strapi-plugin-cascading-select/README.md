# strapi-plugin-cascading-select

A Strapi 5 custom field with two linked dropdowns: choosing an option in the first (parent)
dropdown filters the second (child) one. Typical uses are Atoll → Island, Country → City and
Category → Subcategory.

- Options come from your own collection types, so editors maintain the lists in the Content Manager.
- The child must belong to the selected parent. This is checked on the server for every write
  (Content Manager, REST, GraphQL, custom code), not only in the admin UI.
- Optionally, a real relation on the same content type is kept in sync with the selected child,
  so API consumers can `populate` it like any other relation.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/edit-view-dark.png">
  <img src="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/edit-view-light.png" width="654" alt="The field in the Content Manager: Seenu is selected in the Atoll dropdown and the Island dropdown lists only Seenu's islands">
</picture>

## Requirements

- Strapi 5 (tested with 5.55)
- Two collection types, where the child has a relation to the parent (for example `island.atoll`,
  manyToOne → `atoll`).

## Installation

```bash
npm install strapi-plugin-cascading-select
```

```ts
// config/plugins.ts
export default () => ({
  'cascading-select': {
    enabled: true,
  },
});
```

Rebuild the admin panel (`npm run build`) or restart `npm run develop`.

## Adding the field

In the Content-Type Builder, choose **Add another field → Custom → Cascading select**.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/ctb-picker-dark.png">
  <img src="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/ctb-picker-light.png" width="600" alt="Cascading select in the Custom tab of the Content-Type Builder field picker">
</picture>

Then set the two collections in the basic settings:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/ctb-settings-dark.png">
  <img src="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/ctb-settings-light.png" width="600" alt="Basic settings of the field: parent collection api::atoll.atoll, child collection api::island.island, optional label fields and relation to parent">
</picture>

| Setting                    | Required | Description                                                                                    |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Parent collection          | yes      | UID of the collection listed in the first dropdown, e.g. `api::atoll.atoll`                    |
| Parent label field         | no       | Attribute shown as the label. Defaults to `name`, `title`, `label` or the first text attribute |
| Child collection           | yes      | UID of the collection listed in the second dropdown, e.g. `api::island.island`                 |
| Child label field          | no       | Same as above, for the child                                                                   |
| Relation to parent         | no       | Relation on the child pointing to the parent. Detected automatically when there is only one    |
| Synced relation (advanced) | no       | Relation on this content type targeting the child collection, set on every save                |
| Required (advanced)        | no       | Both dropdowns must be filled                                                                  |

The same settings in a `schema.json`:

```json
"location": {
  "type": "customField",
  "customField": "plugin::cascading-select.cascading-select",
  "required": true,
  "options": {
    "parentUid": "api::atoll.atoll",
    "childUid": "api::island.island",
    "syncRelation": "island"
  }
},
"island": {
  "type": "relation",
  "relation": "manyToOne",
  "target": "api::island.island"
}
```

Misconfigured fields are reported as warnings on startup, and saving them returns an error that
explains the problem.

## Stored value

The field is a JSON attribute storing the `documentId` of each selection:

```json
{ "parent": "ujrhq9ufbx98xzspbvau8snr", "child": "evv7c03mcwv2hrr10etrpc5p" }
```

Changing the parent in the admin resets the child. On save, the value is normalized: unknown keys are
dropped, and an empty selection becomes `null`.

## Relation sync (recommended)

A custom field cannot itself be a relation. The JSON value alone therefore has no referential
integrity, and it can't be populated. Set **Synced relation** to a relation attribute that targets the child
collection, and the plugin writes it from the selected child whenever the document is created or
updated.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/ctb-advanced-dark.png">
  <img src="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/ctb-advanced-light.png" width="600" alt="Advanced settings of the field: Required checked, and Synced relation set to island">
</picture>

Query it like any relation. The parent is derived from the child, so the two can never disagree:

```
GET /api/businesses?populate[island][populate]=atoll
```

Hide the synced relation from the edit view (**Content Manager → Configure the view**), since the
plugin overwrites manual changes to it.

## Validation rules

On `create`, `update` and `clone`, for fields at the root, in components and in dynamic zones:

- the parent must exist, and the child must belong to it (through the parent relation),
- a child cannot be set without a parent,
- with **Required** on, both parent and child must be set. For content types with Draft & Publish,
  this check runs on publish instead of on save, following how Strapi handles required fields.
  Drafts can stay incomplete.

Errors are attached to the field, so the Content Manager shows them next to the dropdowns:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/validation-dark.png">
  <img src="https://raw.githubusercontent.com/mushfau/strapi-plugin-cascading-select/main/strapi-plugin-cascading-select/docs/screenshots/validation-light.png" width="654" alt="Publishing with only the atoll selected shows the error Island is required under the field">
</picture>

## Configuration

```ts
// config/plugins.ts
export default () => ({
  'cascading-select': {
    enabled: true,
    config: {
      // Maximum number of options loaded in one dropdown (default 1000).
      maxOptions: 1000,
    },
  },
});
```

## Admin API

The input loads its options from two admin routes, which require an authenticated admin user:

- `GET /cascading-select/options/parents`
- `GET /cascading-select/options/children?parent=<documentId>`

Both take the field settings as query parameters and only serve configurations used by an existing
cascading field (other combinations return `403`). They cannot be used to read arbitrary
collections. Only the `documentId` and the label field are returned.

## Limitations

- Two levels (parent → child). Deeper chains (Atoll → Island → Ward) are not supported yet.
- Single selection in each dropdown.
- Options are loaded in full up to `maxOptions`; there is no server-side search yet.
- With i18n, options are listed in the locale being edited. The synced relation follows Strapi's
  default locale rules for relations.

## Development

```bash
npm install
npm run build          # build admin + server bundles into dist/
npm run watch:link     # rebuild on change and push to linked apps with yalc
npm run test:ts:front  # type-check admin code
npm run test:ts:back   # type-check server code
npm run verify         # check the package before publishing
```

A test app lives in [`playground`](https://github.com/mushfau/strapi-plugin-cascading-select/tree/main/playground). It seeds sample Maldivian atolls and islands and has
a `Business` content type that uses the field. To link the plugin into it:

```bash
# plugin
npm run watch:link
# playground (another terminal)
npx yalc add --link strapi-plugin-cascading-select && npm install
npm run develop
```

## License

MIT
