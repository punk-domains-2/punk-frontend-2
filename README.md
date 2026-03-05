# Punk Domains Frontend (new)

A web app for minting and managing web3 domain names across multiple EVM chains, built with the [Punk Domains](https://docs.punk.domains/) protocol. Also works as a [Farcaster Mini App](https://docs.farcaster.xyz/developers/frames/getting-started).

## Features

- **Mint Domains** — Mint domain names on supported TLD extensions (e.g. `.arbi`, `.flr`, `.op`, `.base`). Supports both single-price and tiered-price TLDs.
- **Dashboard** — View and manage owned domains. Edit domain data (profile image, URL, social links) and set a default domain.
- **Search** — Look up any domain to see its owner, metadata, and on-chain image.
- **Send Tokens** — Send native or ERC-20 tokens to any Punk domain name.
- **Dark / Light Mode** — Theme toggle with dark mode as the default.
- **Mobile Friendly** — Responsive design for all screen sizes.

## Supported Chains

Arbitrum, Base, BNB Chain, Degen Chain, Flare, Gnosis, Mode, Optimism, Polygon, Songbird.

## Tech Stack

- [Vue 3](https://vuejs.org/) (Composition API)
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Wagmi](https://wagmi.sh/) / [viem](https://viem.sh/) for wallet & contract interactions
- [Farcaster Frame SDK](https://docs.farcaster.xyz/developers/frames/getting-started) for Mini App integration
- TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm (or yarn / pnpm)

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── abi/              # Smart contract ABIs (TLD, Minter, ERC-20)
├── components/       # Shared UI components (Navbar, Footer, etc.)
├── composables/      # Vue composables (useDomain, useTheme)
├── config/           # Wagmi config & supported chains
├── data/             # Domain TLD registry & token list (JSON)
├── pages/            # Route pages (Home, Mint, Dashboard, Search, etc.)
├── router/           # Vue Router setup
├── types/            # TypeScript type definitions
├── App.vue
├── main.ts
└── style.css
```

## Links

- [Documentation](https://docs.punk.domains/)
- [GitHub](https://github.com/punk-domains-2)
- [GitLab](https://gitlab.com/punk-domains)
- [Discord](https://discord.gg/8dSrwrAQeu)
- [X / Twitter](https://x.com/PunkDomains/)
