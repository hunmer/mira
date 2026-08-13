# Mira

<a href="https://github.com/hunmer/mira/stargazers">
<img alt="GitHub Repo stars" src="https://img.shields.io/github/stars/hunmer/mira?style=for-the-badge" />
</a>
<a href="https://github.com/hunmer/mira/releases">
<img alt="GitHub Release" src="https://img.shields.io/github/v/release/hunmer/mira?style=for-the-badge" />
</a>
<a href="./LICENCE.md">
<img alt="License" src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" />
</a>

> The next-generation media library manager — making file management simple and putting automation within reach.

## What is Mira?

Mira is a next-generation media library manager. It makes file management simple and brings automation within reach through a complete CLI, MCP integration for AI agents, a Skill-based extensibility system, a rich plugin ecosystem, and real-time device monitoring.

This package (`landing-page`) is Mira's marketing website, built with [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/).

## Features

- **Complete CLI** — Manage libraries, files, tags, folders, plugins, devices, and databases from a single command, with multi-profile credentials.
- **MCP Integration** — Exposes ~50 tools as an MCP service, so AI agents like Claude / ZCode can operate Mira directly.
- **Skill Extension** — A convention-based Skill mechanism that delivers on-demand, project-specific knowledge packs to AI agents.
- **Flexible Library Management** — Create and manage multiple independent file libraries, each individually start/stop configurable.
- **Rich Plugin Ecosystem** — A plugin marketplace with install / enable / disable / search to meet customization needs.
- **Device Monitoring** — Real-time connection management and event push based on WebSocket.

## Getting Started

### Prerequisites

- Node.js 18 or later
- A package manager: npm, yarn, or pnpm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hunmer/mira.git
   cd mira/packages/landing-page
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run the development server**
   ```bash
   pnpm dev
   ```

4. **Open in your browser**

   Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Documentation

Full documentation is available in the [`mira-doc`](../mira-doc) package.

## License

Distributed under the MIT License. See [`LICENCE.md`](./LICENCE.md) for more information.

## Acknowledgements

This website is built on top of [efferd-ui](https://github.com/shabanhr/efferd-ui) by Shaban Haider, and [Shadcn UI](https://ui.shadcn.com/).

---

<p align="center">
  Built with ❤️ and TypeScript
</p>
