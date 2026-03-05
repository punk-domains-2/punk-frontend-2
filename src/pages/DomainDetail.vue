<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDomain } from '@/composables/useDomain'
import type { DomainDataJson } from '@/types'

const route = useRoute()
const {
  parseDomainName, getDomainConfig,
  getCachedDomainInfo, fetchAndCacheDomainInfo,
} = useDomain()

const fullName = computed(() => (route.params.fullName as string) || '')
const parsed = computed(() => parseDomainName(fullName.value))

const loading = ref(true)
const loadedFromCache = ref(false)
const holder = ref('')
const domainDataStr = ref('')
const domainData = ref<DomainDataJson>({})
const defaultImageUrl = ref('')
const errorMsg = ref('')

const customImage = computed(() => domainData.value?.image || '')

const defaultImage = computed(() => {
  const img = defaultImageUrl.value
  if (!img) return ''
  if (img.startsWith('data:image/svg+xml;base64,')) return img
  if (img.startsWith('http')) return img
  return ''
})

function applyInfo(info: { holder: string; data: DomainDataJson; dataStr: string; defaultImage?: string }) {
  holder.value = info.holder
  domainDataStr.value = info.dataStr
  domainData.value = info.data
  defaultImageUrl.value = info.defaultImage || ''
}

async function loadDomain() {
  if (!parsed.value) {
    errorMsg.value = 'Invalid domain name format'
    loading.value = false
    return
  }

  const cfg = getDomainConfig(parsed.value.tld)
  if (!cfg) {
    errorMsg.value = `TLD ${parsed.value.tld} is not supported`
    loading.value = false
    return
  }

  errorMsg.value = ''

  const cached = getCachedDomainInfo(fullName.value)
  if (cached) {
    applyInfo(cached)
    loadedFromCache.value = true
    loading.value = false
    return
  }

  loading.value = true
  loadedFromCache.value = false

  try {
    const info = await fetchAndCacheDomainInfo(parsed.value.name, cfg, parsed.value.tld)
    applyInfo(info)
    loadedFromCache.value = true
  } catch (e: any) {
    errorMsg.value = e.shortMessage || e.message || 'Failed to load domain'
  } finally {
    loading.value = false
  }
}

async function refreshDomain() {
  if (!parsed.value) return
  const cfg = getDomainConfig(parsed.value.tld)
  if (!cfg) return

  loading.value = true
  loadedFromCache.value = false
  errorMsg.value = ''

  try {
    const info = await fetchAndCacheDomainInfo(parsed.value.name, cfg, parsed.value.tld)
    applyInfo(info)
    loadedFromCache.value = true
  } catch (e: any) {
    errorMsg.value = e.shortMessage || e.message || 'Failed to refresh domain'
  } finally {
    loading.value = false
  }
}

onMounted(loadDomain)
watch(() => route.params.fullName, loadDomain)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div v-if="loading" class="text-center py-20">
      <div class="animate-spin w-8 h-8 border-2 border-punk-purple border-t-transparent rounded-full mx-auto" />
      <p class="mt-4 text-slate-500">Loading domain info...</p>
    </div>

    <div v-else-if="errorMsg" class="text-center py-20">
      <p class="text-red-500 text-lg">{{ errorMsg }}</p>
    </div>

    <template v-else>
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <h1 class="text-3xl sm:text-4xl font-extrabold">
            <span class="bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">
              {{ fullName }}
            </span>
          </h1>
          <button
            @click="refreshDomain"
            :disabled="loading"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-punk-purple hover:bg-punk-purple/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <p v-if="parsed" class="mt-2 text-slate-500 dark:text-slate-400">
          {{ getDomainConfig(parsed.tld)?.chainName || '' }}
          <span v-if="loadedFromCache" class="text-slate-400 dark:text-slate-500">(cached)</span>
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div v-if="defaultImage" class="card flex items-center justify-center">
          <div>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Default Image</p>
            <img :src="defaultImage" :alt="fullName" class="max-w-full max-h-64 rounded-xl" />
          </div>
        </div>

        <div v-if="customImage" class="card flex items-center justify-center">
          <div>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Custom Image</p>
            <img :src="customImage" :alt="fullName" class="max-w-full max-h-64 rounded-xl object-cover" />
          </div>
        </div>
      </div>

      <div class="card mb-6">
        <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Owner</h3>
        <div v-if="holder">
          <p class="font-mono text-sm break-all">{{ holder }}</p>
        </div>
        <div v-else>
          <p class="text-slate-500">This domain is not registered yet.</p>
          <RouterLink
            v-if="parsed"
            :to="`/mint/${parsed.tld.slice(1)}`"
            class="btn-primary inline-block mt-3 text-sm"
          >
            Mint {{ fullName }}
          </RouterLink>
        </div>
      </div>

      <div v-if="Object.keys(domainData).length > 0" class="card">
        <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Domain Data</h3>
        <div class="space-y-3">
          <div
            v-for="(value, key) in domainData"
            :key="key"
            class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
          >
            <span class="text-sm font-medium text-punk-purple min-w-[100px]">{{ key }}</span>
            <a
              v-if="value.startsWith('http')"
              :href="value"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-blue-500 hover:underline break-all"
            >
              {{ value }}
            </a>
            <span v-else class="text-sm text-slate-600 dark:text-slate-300 break-all">{{ value }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
