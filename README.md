# Workflow

A modern workflow execution platform built on Cloudflare Pages, Workers, and AI. Because apparently, the world needed another one of these.

## 🔍 Overview

Workflow is a powerful, visual workflow automation platform that allows you to create, manage, and execute workflows directly in your browser. Built on Cloudflare's edge infrastructure, it leverages Cloudflare Workers for serverless execution and Cloudflare AI for intelligent workflow processing.

The platform features a visual workflow editor built with React Flow, allowing you to create complex workflows by connecting various node types, including AI-powered nodes for text processing, image classification, and more. Think digital LEGO, but with less risk to your bare feet at 2 AM.

## ✨ Features

- **Visual Workflow Editor**: A drag-and-drop interface for creating and editing workflows that makes command-line enthusiasts mildly uncomfortable.
- **AI-Powered Nodes**: Leverage Cloudflare AI for text summarization, sentiment analysis, translation, and image classification. We've joined the AI bandwagon and we're not even sorry about it.
- **Serverless Execution**: Run workflows on Cloudflare's global edge network, where servers are merely a philosophical concept.
- **Real-time Execution**: Watch your workflow results appear in real-time, for better or worse.
- **Persistent Storage**: Save and load workflows from Cloudflare D1 database with reasonable confidence that they'll still be there tomorrow.
- **Modern UI**: Crafted with React, TailwindCSS, and Shadcn UI components because life's too short for vanilla CSS.

## 🛠️ Technology Stack

Our collection of carefully selected technologies, guaranteed to be outdated by the time you read this:

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn UI
- **Workflow Editor**: React Flow
- **Routing**: React Router
- **Build Tool**: Vite
- **Package Manager**: pnpm (stands for "please not another package manager")
- **Database**: Cloudflare D1
- **Serverless Functions**: Cloudflare Workers
- **AI Integration**: Cloudflare AI
- **Testing**: Vitest
- **Deployment**: Cloudflare Pages

## 🚀 Getting Started

### 📋 Prerequisites

- Node.js (v18 or later)
- pnpm (v8 or later)
- Cloudflare account with Workers and D1 access
- A reasonable amount of patience

### 💻 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/workflow.git
   cd workflow
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit with custom values
   ```

4. Create a Cloudflare account and login with Wrangler, a process that's almost as straightforward as it sounds:
   ```bash
   # Install Wrangler globally
   npm install -g wrangler
   
   # Login to Cloudflare
   wrangler login
   
   # Create a D1 database
   wrangler d1 create workflow-development
   ```

5. Start the development server and cross your fingers:
   ```bash
   pnpm dev
   ```

6. Open your browser and navigate to `http://localhost:3000`. Prepare to either celebrate or debug.

## 👨‍💻 Development

### 📁 Project Structure

A sensible organization that we all pretend won't change dramatically tomorrow:

- `/src` - Frontend React application
  - `/assets` - Static assets
  - `/components` - Reusable UI components
  - `/config` - Configuration files
  - `/lib` - Shared types, utilities, and constants
  - `/pages` - Application pages
  - `/services` - API services
- `/functions` - Cloudflare Workers functions
- `/db` - Database migrations and schema (handle with care)

### 🗄️ Database

The project uses Cloudflare D1 as the database. Migrations are automatically applied when the project is deployed, but you can also apply them manually if you're feeling adventurous:

#### 🧪 Development

```bash
npx wrangler d1 migrations apply DB --remote --env development
npx wrangler d1 execute DB --env development --command "SELECT name FROM sqlite_master WHERE type='table';" --remote
```

To reset the development database when things have gone spectacularly wrong:

```bash
export CI=true
npx wrangler d1 execute workflow-development --local --command="DROP TABLE IF EXISTS d1_migrations;DROP TABLE IF EXISTS workflows; DROP TABLE IF EXISTS node_types;"
npx wrangler d1 migrations apply workflow-development --local
```

#### 🚨 Production

```bash
npx wrangler d1 migrations apply DB --remote --env production
npx wrangler d1 execute DB --env production --command "SELECT name FROM sqlite_master WHERE type='table';" --remote
```

To reset the production database (a decision we will continue to make carelessly for some time):

```bash
export CI=true
npx wrangler d1 execute DB --remote --env production --command="DROP TABLE IF EXISTS d1_migrations;DROP TABLE IF EXISTS workflows; DROP TABLE IF EXISTS node_types;"
npx wrangler d1 migrations apply DB --remote --env production
```

> For using D1 locally, use the `--local` flag instead of `--remote`.

## 🚢 Deployment

The main branch is deployed automatically on Cloudflare with a GitHub Action.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. We aim to review them in a timely manner, though our definition of "timely" may be flexible.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgements

We've embraced the AI future before being deprecated (or obliterated?), but we still do the important bits ourselves (like architecture, blablabla, etc.). Right?

🎵 *I kissed an AI and I liked it, hope my dev team doesn't mind it. It felt so wrong, it felt so right—doesn't mean I'm coding tonight.* 🎵

(With apologies to Katy Perry)
