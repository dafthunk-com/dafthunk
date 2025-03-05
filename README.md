# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from "eslint-plugin-react";

export default tseslint.config({
  // Set the react version
  settings: { react: { version: "18.3" } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs["jsx-runtime"].rules,
  },
});
```

## Database

The project uses D1 as the database. The database is automatically created when the project is deployed.
The migrations are automatically applied when the project is deployed. But in some cases, you may need to apply them manually.

In production, they can be applied manually by running the following commands in the root of the project:

```bash
npx wrangler d1 migrations apply DB --remote --env production
npx wrangler d1 execute DB --env production --command "SELECT name FROM sqlite_master WHERE type='table';" --remote
```

To reset the production database, run the following commands:

```bash
export CI=true
npx wrangler d1 execute DB --remote --env production --command="DROP TABLE IF EXISTS d1_migrations;DROP TABLE IF EXISTS workflows; DROP TABLE IF EXISTS node_types;"
npx wrangler d1 migrations apply DB --remote --env production
```

In development, they can be applied manually by running the following commands in the root of the project:

```bash
npx wrangler d1 migrations apply DB --remote --env development
npx wrangler d1 execute DB --env development --command "SELECT name FROM sqlite_master WHERE type='table';" --remote
```

To reset the development database, run the following commands:

```bash
export CI=true
npx wrangler d1 execute workflow-development --local --command="DROP TABLE IF EXISTS d1_migrations;DROP TABLE IF EXISTS workflows; DROP TABLE IF EXISTS node_types;"
npx wrangler d1 migrations apply workflow-development --local
```

> [!NOTE]
> For using d1 locally, use the `--local` flag instead of `--remote`
