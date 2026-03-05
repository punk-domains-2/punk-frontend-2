<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useAccount } from '@wagmi/vue'
import { writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/config/wagmi'
import { useDomain } from '@/composables/useDomain'
import { tldAbi } from '@/abi/tld'
import type { DomainConfig, DomainDataJson } from '@/types'

const { address, isConnected } = useAccount()
const {
  getAllDomains, parseDomainName, getDomainConfig, getDomainHolder,
  getDefaultName, fetchAndCacheDomainInfo, getCachedDomainInfo,
  setCachedDomainInfo,
  getCachedDomains, setCachedDomains, addToCachedDomains, updateCachedDomain,
} = useDomain()

interface OwnedDomain {
  fullName: string
  name: string
  tld: string
  chainName: string
  chainId: number
  data: DomainDataJson
  dataStr: string
  image?: string
  isDefault: boolean
  tldAddress: `0x${string}`
}

const ownedDomains = ref<OwnedDomain[]>([])
const loading = ref(false)
const loadedFromCache = ref(false)
const manualDomain = ref('')
const manualError = ref('')
const manualLoading = ref(false)

const editingDomain = ref<OwnedDomain | null>(null)
const editFields = ref<{ key: string; value: string }[]>([])
const editLoading = ref(false)
const editError = ref('')
const editSuccess = ref('')

const actionLoading = ref('')
const actionError = ref('')
const actionSuccess = ref('')

async function initDomains() {
  if (!address.value) return
  const cached = getCachedDomains(address.value)
  if (cached) {
    const hydrated = await Promise.all(cached.map((d) => hydrateFromPerDomainCache(d)))
    ownedDomains.value = hydrated
    loadedFromCache.value = true
  } else {
    loadedFromCache.value = false
    refreshDomains()
  }
}

function hydrateFromPerDomainCache(d: { fullName: string; name: string; tld: string; chainName: string; chainId: number; isDefault: boolean; tldAddress: string }): OwnedDomain {
  const info = getCachedDomainInfo(d.fullName)
  return {
    fullName: d.fullName,
    name: d.name,
    tld: d.tld,
    chainName: d.chainName,
    chainId: d.chainId,
    data: info?.data || {},
    dataStr: info?.dataStr || '',
    image: info?.defaultImage,
    isDefault: d.isDefault,
    tldAddress: d.tldAddress as `0x${string}`,
  }
}

async function refreshDomains() {
  if (!address.value) return
  loading.value = true
  ownedDomains.value = []
  loadedFromCache.value = false

  const allDomains = getAllDomains()
  const listEntries: OwnedDomain[] = []

  for (const [tld, cfg] of Object.entries(allDomains)) {
    try {
      const defaultName = await getDefaultName(address.value!, cfg)
      if (defaultName) {
        const info = await fetchAndCacheDomainInfo(defaultName, cfg, tld)
        listEntries.push({
          fullName: defaultName + tld,
          name: defaultName,
          tld,
          chainName: cfg.chainName,
          chainId: cfg.chainId,
          data: info.data,
          dataStr: info.dataStr,
          image: info.defaultImage,
          isDefault: true,
          tldAddress: cfg.address,
        })
      }
    } catch {}
  }

  ownedDomains.value = listEntries
  setCachedDomains(address.value, listEntries.map(({ fullName, name, tld, chainName, chainId, isDefault, tldAddress }) => ({
    fullName, name, tld, chainName, chainId, isDefault, tldAddress,
  })))
  loadedFromCache.value = true
  loading.value = false
}

async function addManualDomain() {
  if (!address.value || !manualDomain.value.trim()) return
  manualError.value = ''
  manualLoading.value = true

  const fullName = manualDomain.value.trim().toLowerCase()
  const parsed = parseDomainName(fullName)
  if (!parsed) {
    manualError.value = 'Invalid domain format. Use format: name.tld (e.g. alice.flr)'
    manualLoading.value = false
    return
  }

  const cfg = getDomainConfig(parsed.tld)
  if (!cfg) {
    manualError.value = `TLD ${parsed.tld} is not supported`
    manualLoading.value = false
    return
  }

  try {
    const holder = await getDomainHolder(parsed.name, cfg)
    if (holder.toLowerCase() !== address.value.toLowerCase()) {
      manualError.value = 'You do not own this domain'
      manualLoading.value = false
      return
    }

    const info = await fetchAndCacheDomainInfo(parsed.name, cfg, parsed.tld)
    const domainEntry: OwnedDomain = {
      fullName,
      name: parsed.name,
      tld: parsed.tld,
      chainName: cfg.chainName,
      chainId: cfg.chainId,
      data: info.data,
      dataStr: info.dataStr,
      image: info.defaultImage,
      isDefault: false,
      tldAddress: cfg.address,
    }

    if (!ownedDomains.value.find((d) => d.fullName === fullName)) {
      ownedDomains.value.push(domainEntry)
      addToCachedDomains(address.value, {
        fullName, name: parsed.name, tld: parsed.tld,
        chainName: cfg.chainName, chainId: cfg.chainId,
        isDefault: false, tldAddress: cfg.address,
      })
    }
    manualDomain.value = ''
  } catch (e: any) {
    manualError.value = e.shortMessage || e.message || 'Failed to verify domain ownership'
  } finally {
    manualLoading.value = false
  }
}

function openEditModal(domain: OwnedDomain) {
  editingDomain.value = domain
  editFields.value = Object.entries(domain.data).map(([key, value]) => ({ key, value }))
  if (editFields.value.length === 0) {
    editFields.value.push({ key: '', value: '' })
  }
  editError.value = ''
  editSuccess.value = ''
}

function addField() {
  editFields.value.push({ key: '', value: '' })
}

function removeField(index: number) {
  editFields.value.splice(index, 1)
}

async function saveData() {
  if (!editingDomain.value || !address.value) return
  editLoading.value = true
  editError.value = ''
  editSuccess.value = ''

  const dataObj: DomainDataJson = {}
  for (const field of editFields.value) {
    if (field.key.trim()) {
      dataObj[field.key.trim()] = field.value
    }
  }

  const dataStr = JSON.stringify(dataObj)

  try {
    const hash = await writeContract(config, {
      address: editingDomain.value.tldAddress,
      abi: tldAbi,
      functionName: 'editData',
      args: [editingDomain.value.name, dataStr],
      chainId: editingDomain.value.chainId,
    })
    await waitForTransactionReceipt(config, { hash, chainId: editingDomain.value.chainId })

    editingDomain.value.data = dataObj
    editingDomain.value.dataStr = dataStr

    const existing = getCachedDomainInfo(editingDomain.value.fullName)
    setCachedDomainInfo(editingDomain.value.fullName, {
      holder: existing?.holder || address.value,
      data: dataObj,
      dataStr,
      defaultImage: existing?.defaultImage || editingDomain.value.image,
    })

    editSuccess.value = 'Domain data updated successfully!'
  } catch (e: any) {
    editError.value = e.shortMessage || e.message || 'Failed to update domain data'
  } finally {
    editLoading.value = false
  }
}

async function setDefaultDomain(domain: OwnedDomain) {
  if (!address.value) return
  actionLoading.value = domain.fullName
  actionError.value = ''
  actionSuccess.value = ''

  try {
    const hash = await writeContract(config, {
      address: domain.tldAddress,
      abi: tldAbi,
      functionName: 'editDefaultDomain',
      args: [domain.name],
      chainId: domain.chainId,
    })
    await waitForTransactionReceipt(config, { hash, chainId: domain.chainId })

    for (const d of ownedDomains.value) {
      if (d.tld === domain.tld) {
        d.isDefault = false
        updateCachedDomain(address.value!, d.fullName, { isDefault: false })
      }
    }
    domain.isDefault = true
    updateCachedDomain(address.value, domain.fullName, { isDefault: true })
    actionSuccess.value = `${domain.fullName} set as default!`
  } catch (e: any) {
    actionError.value = e.shortMessage || e.message || 'Failed to set default domain'
  } finally {
    actionLoading.value = ''
  }
}

onMounted(() => {
  if (isConnected.value) initDomains()
})

watch(address, (newAddr) => {
  if (newAddr) initDomains()
  else {
    ownedDomains.value = []
    loadedFromCache.value = false
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <h1 class="text-3xl sm:text-4xl font-extrabold mb-8">
      <span class="bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">
        Dashboard
      </span>
    </h1>

    <div v-if="!isConnected" class="card text-center py-16">
      <svg class="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
      <h2 class="mt-4 text-xl font-semibold text-slate-500 dark:text-slate-400">Connect Your Wallet</h2>
      <p class="mt-2 text-slate-400">Connect your wallet to view and manage your domains.</p>
    </div>

    <template v-else>
      <div class="card mb-6">
        <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Add a Domain
        </h3>
        <form @submit.prevent="addManualDomain" class="flex gap-2">
          <input
            v-model="manualDomain"
            type="text"
            placeholder="e.g. alice.flr"
            class="input-field flex-1"
          />
          <button type="submit" class="btn-primary text-sm" :disabled="manualLoading">
            {{ manualLoading ? 'Checking...' : 'Add' }}
          </button>
        </form>
        <p v-if="manualError" class="mt-2 text-sm text-red-500">{{ manualError }}</p>
      </div>

      <div v-if="actionSuccess" class="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
        <p class="text-sm text-green-600 dark:text-green-400">{{ actionSuccess }}</p>
      </div>
      <div v-if="actionError" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
        <p class="text-sm text-red-500">{{ actionError }}</p>
      </div>

      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-punk-purple border-t-transparent rounded-full mx-auto" />
        <p class="mt-4 text-slate-500">Searching for your domains on-chain...</p>
      </div>

      <template v-else>
        <div v-if="ownedDomains.length > 0" class="flex items-center justify-between mb-4">
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ ownedDomains.length }} domain{{ ownedDomains.length !== 1 ? 's' : '' }} found
            <span v-if="loadedFromCache" class="text-slate-400 dark:text-slate-500">(cached)</span>
          </p>
          <button
            @click="refreshDomains"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-punk-purple hover:bg-punk-purple/10 rounded-lg transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div v-if="ownedDomains.length === 0" class="card text-center py-12">
          <p class="text-slate-500">No domains found. Mint one or add it manually above.</p>
        </div>
      </template>

      <div v-if="!loading && ownedDomains.length > 0" class="space-y-4">
        <div v-for="domain in ownedDomains" :key="domain.fullName" class="card">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-4">
              <img
                v-if="domain.image"
                :src="domain.image"
                :alt="domain.fullName"
                class="w-12 h-12 rounded-xl object-cover"
              />
              <div
                v-else
                class="w-12 h-12 rounded-xl bg-gradient-to-br from-punk-purple to-punk-pink flex items-center justify-center text-white font-bold text-lg"
              >
                {{ domain.name.charAt(0).toUpperCase() }}
              </div>
              <div>
                <h3 class="text-lg font-bold">{{ domain.fullName }}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-sm text-slate-500">{{ domain.chainName }}</span>
                  <span
                    v-if="domain.isDefault"
                    class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  >
                    Default
                  </span>
                </div>
              </div>
            </div>

            <div class="flex gap-2">
              <button
                v-if="!domain.isDefault"
                @click="setDefaultDomain(domain)"
                :disabled="actionLoading === domain.fullName"
                class="btn-secondary text-sm"
              >
                {{ actionLoading === domain.fullName ? 'Setting...' : 'Set Default' }}
              </button>
              <button @click="openEditModal(domain)" class="btn-primary text-sm">
                Edit Data
              </button>
            </div>
          </div>

          <div v-if="Object.keys(domain.data).length > 0" class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div v-for="(value, key) in domain.data" :key="key" class="flex gap-2 text-sm py-1">
              <span class="font-medium text-punk-purple min-w-[80px]">{{ key }}:</span>
              <a
                v-if="String(value).startsWith('http')"
                :href="String(value)"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-500 hover:underline truncate"
              >
                {{ value }}
              </a>
              <span v-else class="text-slate-600 dark:text-slate-300 truncate">{{ value }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit Data Modal -->
    <Teleport to="body">
      <div v-if="editingDomain" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="editingDomain = null" />
        <div class="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold">Edit Data: {{ editingDomain.fullName }}</h3>
              <button @click="editingDomain = null" class="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="space-y-3">
              <div v-for="(field, index) in editFields" :key="index" class="flex gap-2 items-start">
                <input
                  v-model="field.key"
                  type="text"
                  placeholder="Key"
                  class="input-field w-1/3"
                />
                <input
                  v-model="field.value"
                  type="text"
                  placeholder="Value"
                  class="input-field flex-1"
                />
                <button
                  @click="removeField(index)"
                  class="p-3 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <button @click="addField" class="mt-3 text-sm text-punk-purple hover:underline">
              + Add field
            </button>

            <div v-if="editError" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p class="text-sm text-red-500">{{ editError }}</p>
            </div>
            <div v-if="editSuccess" class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <p class="text-sm text-green-600 dark:text-green-400">{{ editSuccess }}</p>
            </div>

            <div class="mt-6 flex gap-3 justify-end">
              <button @click="editingDomain = null" class="btn-secondary text-sm">Cancel</button>
              <button @click="saveData" :disabled="editLoading" class="btn-primary text-sm">
                {{ editLoading ? 'Saving...' : 'Save Data' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
