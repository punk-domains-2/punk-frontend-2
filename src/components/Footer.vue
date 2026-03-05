<script setup lang="ts">
const links = [
  { label: 'Docs', url: 'https://docs.punk.domains/' },
  { label: 'GitHub', url: 'https://github.com/punk-domains-2' },
  { label: 'GitLab', url: 'https://gitlab.com/punk-domains' },
  { label: 'Discord', url: 'https://discord.gg/8dSrwrAQeu' },
  { label: 'X', url: 'https://x.com/PunkDomains/' },
]
</script>

<template>
  <footer class="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-punk-darker/50 backdrop-blur-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <img src="/assets/logo_white.svg" alt="Punk Domains" class="h-6 w-6 dark:invert-0 invert" />
          <span class="text-sm font-semibold bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">
            Punk Domains
          </span>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-4">
          <a
            v-for="link in links"
            :key="link.label"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-slate-500 dark:text-slate-400 hover:text-punk-purple dark:hover:text-punk-purple transition-colors"
          >
            {{ link.label }}
          </a>
        </div>

        <p class="text-xs text-slate-400 dark:text-slate-500">
          Built with the Punk Domains protocol
        </p>
      </div>
    </div>
  </footer>
</template>
