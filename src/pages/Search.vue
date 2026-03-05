<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDomain } from '@/composables/useDomain'

const route = useRoute()
const router = useRouter()
const { parseDomainName, getDomainConfig, getDomainHolder, getAllDomains } = useDomain()

const searchQuery = ref('')
const results = ref<{ fullName: string; tld: string; name: string; holder: string; available: boolean }[]>([])
const loading = ref(false)
const searched = ref(false)

onMounted(() => {
  if (route.query.q) {
    searchQuery.value = route.query.q as string
    handleSearch()
  }
})

watch(() => route.query.q, (q) => {
  if (q) {
    searchQuery.value = q as string
    handleSearch()
  }
})

async function handleSearch() {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return

  loading.value = true
  searched.value = true
  results.value = []

  try {
    if (q.includes('.')) {
      const parsed = parseDomainName(q)
      if (!parsed) return
      const cfg = getDomainConfig(parsed.tld)
      if (!cfg) {
        results.value = [{ fullName: q, tld: parsed.tld, name: parsed.name, holder: '', available: false }]
        return
      }
      try {
        const holder = await getDomainHolder(parsed.name, cfg)
        const isZero = holder === '0x0000000000000000000000000000000000000000'
        results.value = [{ fullName: q, tld: parsed.tld, name: parsed.name, holder: isZero ? '' : holder, available: isZero }]
      } catch {
        results.value = [{ fullName: q, tld: parsed.tld, name: parsed.name, holder: '', available: true }]
      }
    } else {
      const allDomains = getAllDomains()
      const searchResults: typeof results.value = []

      for (const [tld, cfg] of Object.entries(allDomains)) {
        try {
          const holder = await getDomainHolder(q, cfg)
          const isZero = holder === '0x0000000000000000000000000000000000000000'
          searchResults.push({
            fullName: q + tld,
            tld,
            name: q,
            holder: isZero ? '' : holder,
            available: isZero,
          })
        } catch {
          searchResults.push({
            fullName: q + tld,
            tld,
            name: q,
            holder: '',
            available: true,
          })
        }
      }

      results.value = searchResults
    }
  } finally {
    loading.value = false
  }
}

function viewDomain(fullName: string) {
  router.push({ name: 'DomainDetail', params: { fullName } })
}

function mintDomain(tld: string) {
  router.push({ name: 'Mint', params: { tld: tld.slice(1) } })
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center mb-10">
      <h1 class="text-3xl sm:text-4xl font-extrabold">
        <span class="bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">
          Search Domains
        </span>
      </h1>
      <p class="mt-3 text-slate-500 dark:text-slate-400">
        Look up any domain name or search across all TLDs
      </p>
    </div>

    <form @submit.prevent="handleSearch" class="flex gap-2 mb-8">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Enter a domain (e.g. alice.flr) or just a name (e.g. alice)"
        class="input-field flex-1"
      />
      <button type="submit" class="btn-primary" :disabled="loading">
        <span v-if="loading">Searching...</span>
        <span v-else>Search</span>
      </button>
    </form>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-punk-purple border-t-transparent rounded-full mx-auto" />
      <p class="mt-4 text-slate-500">Searching domains...</p>
    </div>

    <div v-else-if="searched && results.length === 0" class="text-center py-12">
      <p class="text-slate-500">No results found.</p>
    </div>

    <div v-else-if="results.length > 0" class="space-y-3">
      <div
        v-for="result in results"
        :key="result.fullName"
        class="card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white truncate">
            {{ result.fullName }}
          </h3>
          <p v-if="result.holder" class="text-sm text-slate-500 font-mono truncate mt-1">
            Owner: {{ result.holder }}
          </p>
          <p v-else-if="result.available" class="text-sm text-green-500 font-medium mt-1">
            Available
          </p>
        </div>
        <div class="flex gap-2">
          <button
            v-if="result.holder"
            @click="viewDomain(result.fullName)"
            class="btn-secondary text-sm"
          >
            View
          </button>
          <button
            v-if="result.available"
            @click="mintDomain(result.tld)"
            class="btn-primary text-sm"
          >
            Mint
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
