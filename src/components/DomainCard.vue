<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { DomainConfig } from '@/types'

defineProps<{
  tld: string
  config: DomainConfig
}>()
</script>

<template>
  <div class="card group">
    <div class="flex items-start justify-between mb-4">
      <div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white group-hover:text-punk-purple transition-colors">
          {{ tld }}
        </h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {{ config.chainName }}
        </p>
      </div>
      <span class="px-2.5 py-1 text-xs font-medium rounded-full bg-punk-purple/10 text-punk-purple">
        {{ config.currency }}
      </span>
    </div>

    <div class="flex items-center justify-between mt-4">
      <span class="text-xs text-slate-400">
        {{ config.differentPrices > 1 ? 'Multiple price tiers' : 'Single price' }}
      </span>
      <RouterLink
        :to="`/mint/${tld.slice(1)}`"
        class="px-4 py-1.5 text-sm font-medium bg-gradient-to-r from-punk-purple to-punk-pink
               text-white rounded-lg hover:opacity-90 transition-opacity"
      >
        Mint
      </RouterLink>
    </div>

    <a
      v-if="config.website"
      :href="config.website"
      target="_blank"
      rel="noopener noreferrer"
      class="mt-3 inline-block text-xs text-punk-purple hover:underline"
    >
      {{ config.website.replace('https://', '') }}
    </a>
  </div>
</template>
