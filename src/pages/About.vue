<script setup lang="ts">
const links = [
  {
    title: 'Documentation',
    description: 'Learn how Punk Domains protocol works',
    url: 'https://docs.punk.domains/',
    icon: 'book',
  },
  {
    title: 'GitHub',
    description: 'Browse the source code',
    url: 'https://github.com/punk-domains-2',
    icon: 'code',
  },
  {
    title: 'GitLab',
    description: 'Mirror repository',
    url: 'https://gitlab.com/punk-domains',
    icon: 'code',
  },
  {
    title: 'Discord',
    description: 'Join the community',
    url: 'https://discord.gg/8dSrwrAQeu',
    icon: 'chat',
  },
  {
    title: 'X (Twitter)',
    description: 'Follow for updates',
    url: 'https://x.com/PunkDomains/',
    icon: 'social',
  },
]
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center mb-12">
      <div class="flex justify-center mb-6">
        <img src="/assets/logo_white.svg" alt="Punk Domains" class="h-20 w-20 dark:invert-0 invert" />
      </div>
      <h1 class="text-3xl sm:text-4xl font-extrabold">
        <span class="bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">
          About Punk Domains
        </span>
      </h1>
      <p class="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
        Punk Domains is a permissionless Web3 domain name protocol that allows anyone to create
        top-level domains (TLDs) and mint domain names across multiple blockchains.
      </p>
    </div>

    <div class="grid gap-4 mb-12">
      <div class="card">
        <h3 class="text-lg font-bold mb-3">What are Punk Domains?</h3>
        <p class="text-slate-600 dark:text-slate-300 leading-relaxed">
          Each domain is an NFT (ERC-721 token) that maps a human-readable name to a blockchain address.
          Domain holders can store custom data in their domains, set profile images, add social links,
          and much more. Domains work across supported chains and can be used for sending tokens,
          identity verification, and as decentralized profiles.
        </p>
      </div>

      <div class="card">
        <h3 class="text-lg font-bold mb-3">Key Features</h3>
        <ul class="space-y-2 text-slate-600 dark:text-slate-300">
          <li class="flex items-start gap-2">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-punk-purple flex-shrink-0" />
            <span>Multi-chain support across Ethereum L2s and other EVM chains</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-punk-purple flex-shrink-0" />
            <span>Customizable domain data with any key-value pairs</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-punk-purple flex-shrink-0" />
            <span>Default domain resolution for reverse lookups</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-punk-purple flex-shrink-0" />
            <span>Send tokens directly to domain names</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-punk-purple flex-shrink-0" />
            <span>Fully on-chain domain images (SVG)</span>
          </li>
        </ul>
      </div>
    </div>

    <h2 class="text-xl font-bold mb-4">Links</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <a
        v-for="link in links"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="card group hover:border-punk-purple/50 flex items-center gap-4"
      >
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-punk-purple/20 to-punk-pink/20 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-punk-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
        <div>
          <h3 class="font-semibold group-hover:text-punk-purple transition-colors">{{ link.title }}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ link.description }}</p>
        </div>
      </a>
    </div>
  </div>
</template>
