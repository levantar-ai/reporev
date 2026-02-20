# RepoRev

**Instant report cards for GitHub repositories.**

Analyze any public GitHub repo for security, documentation, CI/CD, dependencies, code quality, licensing, and community health. Get a letter grade (A-F) instantly — all in your browser.

[![CI](https://github.com/levantar-ai/reporev/actions/workflows/ci.yml/badge.svg)](https://github.com/levantar-ai/reporev/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-97%25-brightgreen)](https://github.com/levantar-ai/reporev)
[![Code Quality](https://img.shields.io/badge/code%20quality-A-brightgreen)](https://sonarcloud.io/dashboard?id=levantar-ai_reporev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Repository Report Card** — Weighted scoring across 7 categories with detailed signal breakdowns
- **Git Statistics** — Commit heatmaps, punch cards, bus factor, file churn, contributor breakdown, code frequency, and more
- **Technology Detection** — Detect AWS, Azure, and GCP cloud services plus Node, Python, Go, Java, PHP, Rust, and Ruby dependencies
- **Organization Scan** — Analyze all repos in a GitHub org with aggregate scores
- **Repository Comparison** — Side-by-side comparison of two repositories
- **Developer Portfolio** — Analyze a developer's public repositories
- **Policy Engine** — Define custom compliance rules and evaluate repos against them
- **Export** — CSV, Markdown, and SBOM export formats
- **Privacy-First** — All analysis runs client-side in the browser. No data leaves your machine.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/levantar-ai/reporev.git
cd reporev

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. Enter a GitHub repository (e.g., `facebook/react`) in the analyzer
2. View the report card with scores across all categories
3. Explore detailed signal breakdowns and fix-it links
4. Use the Git Stats page for deep commit history analysis
5. Use Tech Detection to discover cloud services and language dependencies

## Tech Stack

| Technology                                   | Purpose        |
| -------------------------------------------- | -------------- |
| [React 19](https://react.dev)                | UI framework   |
| [TypeScript](https://www.typescriptlang.org) | Type safety    |
| [Vite](https://vite.dev)                     | Build tool     |
| [Tailwind CSS 4](https://tailwindcss.com)    | Styling        |
| [ECharts](https://echarts.apache.org)        | Charts         |
| [isomorphic-git](https://isomorphic-git.org) | In-browser git |

## Available Scripts

| Command             | Description              |
| ------------------- | ------------------------ |
| `npm run dev`       | Start dev server         |
| `npm run build`     | Type-check and build     |
| `npm run lint`      | Run ESLint               |
| `npm run format`    | Format with Prettier     |
| `npm run test`      | Run tests                |
| `npm run typecheck` | TypeScript type checking |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

[MIT](LICENSE)
