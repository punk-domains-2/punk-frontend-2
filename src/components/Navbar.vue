<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import ThemeToggle from './ThemeToggle.vue'
import ConnectWallet from './ConnectWallet.vue'

const mobileOpen = ref(false)

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/search', label: 'Search' },
  { to: '/send', label: 'Send' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/about', label: 'About' },
]
</script>

<template>
  <nav class="sticky top-0 z-50 bg-white/80 dark:bg-punk-darker/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <RouterLink to="/" class="flex items-center gap-2">
          <img src="/assets/logo_white.svg" alt="Punk Domains" class="h-8 w-8 dark:invert-0 invert" />
          <span class="text-lg font-bold bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">
            Punk Domains
          </span>
        </RouterLink>

        <div class="hidden md:flex items-center gap-1">
          <RouterLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300
                   hover:text-punk-purple dark:hover:text-punk-purple hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            active-class="!text-punk-purple bg-punk-purple/10"
          >
            {{ link.label }}
          </RouterLink>
        </div>

        <div class="flex items-center gap-3">
          <ThemeToggle />
          <ConnectWallet />
          <button
            @click="mobileOpen = !mobileOpen"
            class="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path v-if="!mobileOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="mobileOpen" class="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-punk-darker">
      <div class="px-4 py-3 space-y-1">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          @click="mobileOpen = false"
          class="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300
                 hover:text-punk-purple hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          active-class="!text-punk-purple bg-punk-purple/10"
        >
          {{ link.label }}
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
