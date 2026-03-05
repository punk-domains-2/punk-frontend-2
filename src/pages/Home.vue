<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDomain } from '@/composables/useDomain'
import DomainCard from '@/components/DomainCard.vue'

const router = useRouter()
const { getDomainsByChain } = useDomain()

const showAll = ref(false)
const searchQuery = ref('')

const groupedDomains = computed(() => getDomainsByChain(!showAll.value))

const chainNames = computed(() =>
  Object.keys(groupedDomains.value).sort(),
)

function handleSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  const query = q.includes('.') ? q : q
  router.push({ name: 'Search', query: { q: query } })
}
</script>

<template>
  <div>
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-punk-purple/20 via-transparent to-punk-pink/20 dark:from-punk-purple/10 dark:to-punk-pink/10" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div class="text-center max-w-3xl mx-auto">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            <span class="bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">
              Punk Domains
            </span>
          </h1>
          <p class="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300">
            Mint your Web3 domain identity across multiple chains. Own your name, own your data.
          </p>

          <div class="mt-8 max-w-lg mx-auto">
            <form @submit.prevent="handleSearch" class="flex gap-2">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search for a domain (e.g. alice.flr)"
                class="input-field flex-1"
              />
              <button type="submit" class="btn-primary whitespace-nowrap">
                Search
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-bold">Available Domains</h2>
        <button @click="showAll = !showAll" class="btn-secondary text-sm">
          {{ showAll ? 'Show Featured' : 'Show All' }}
        </button>
      </div>

      <div v-for="chain in chainNames" :key="chain" class="mb-10">
        <h3 class="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-gradient-to-r from-punk-purple to-punk-pink" />
          {{ chain }}
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <DomainCard
            v-for="domain in groupedDomains[chain]"
            :key="domain.tld"
            :tld="domain.tld"
            :config="domain.config"
          />
        </div>
      </div>
    </section>
  </div>
</template>
