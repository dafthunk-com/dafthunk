# Dafthunk Marketing Website

The marketing website for Dafthunk, built with React Router v7 and deployed on Cloudflare Workers.

## Development

Create a `.dev.vars` file for local development:

```bash
cp .dev.vars.example .dev.vars
```

Then run:

```bash
# Start dev server (port 3000)
pnpm dev

# Type check
pnpm typecheck

# Build
pnpm build
```

## Deployment

### Build-Time Secrets

Configure build-time secrets in the Cloudflare dashboard:

1. Go to **Workers & Pages** > Your Worker > **Settings** > **Build**
2. Add **Build variables and secrets**:

| Variable                 | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `VITE_API_HOST`          | API URL (e.g., `https://api.dafthunk.com`)     |
| `VITE_APP_URL`           | App URL (e.g., `https://app.dafthunk.com`)     |
| `VITE_WEBSITE_URL`       | Website URL (e.g., `https://www.dafthunk.com`) |
| `VITE_CONTACT_EMAIL`     | Contact email                                  |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4 Measurement ID (optional)   |

These are injected during the build process and not stored in the repository.

### Deploy

```bash
pnpm deploy
```

## Google Analytics

Google Analytics is configured with [Consent Mode v2](https://developers.google.com/tag-platform/security/guides/consent?consentmode=advanced):

- **Default state**: All consent denied (no tracking until user accepts)
- **Consent banner**: Appears on first visit, lets users accept or reject
- **Persistence**: User choice saved to localStorage

To enable analytics, set `VITE_GA_MEASUREMENT_ID` as a build-time secret. Leave it unset to disable analytics entirely (no scripts loaded, no banner shown).
