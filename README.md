# Strapi cascading select

Development repository for [`strapi-plugin-cascading-select`](strapi-plugin-cascading-select), a
Strapi 5 custom field with two linked dropdowns where the second is filtered by the first (for
example Atoll → Island).

| Folder | Contents |
| --- | --- |
| [`strapi-plugin-cascading-select/`](strapi-plugin-cascading-select) | The plugin (published to npm). Usage docs are in its [README](strapi-plugin-cascading-select/README.md) |
| [`playground/`](playground) | Strapi 5 app for local testing, with sample Maldivian atolls and islands and a `Business` type using the field |

## Running the playground

```bash
# 1. Build the plugin and publish it to the local yalc store (keeps rebuilding on change)
cd strapi-plugin-cascading-select
npm install
npm run watch:link

# 2. In another terminal, link it into the playground and start Strapi
cd playground
cp .env.example .env && mkdir -p .tmp   # SQLite database lives in .tmp/data.db
npx yalc add --link strapi-plugin-cascading-select
npm install
npm run develop
```

Open http://localhost:1337/admin, create the first admin user, and edit a **Business** entry.
The atolls and islands are seeded on first start. After admin-side changes to the plugin, restart
`npm run develop`, because the app does not watch `node_modules`.
