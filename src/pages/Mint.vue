<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAccount, useWriteContract, useSwitchChain } from '@wagmi/vue'
import { formatUnits, zeroAddress } from 'viem'
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { useDomain } from '@/composables/useDomain'
import { tldAbi } from '@/abi/tld'
import { minterAbi } from '@/abi/minter'
import { erc20Abi } from '@/abi/erc20'
import { config } from '@/config/wagmi'
import { chainById } from '@/config/chains'
import type { DomainConfig } from '@/types'

const route = useRoute()
const { address, isConnected, chainId: connectedChainId } = useAccount()
const { switchChain } = useSwitchChain()
const { getDomainConfig, isType2, hasErc20Currency, checkMintingEnabled, fetchAllPrices } = useDomain()

const tld = computed(() => '.' + route.params.tld)
const domainConfig = computed(() => getDomainConfig(tld.value))
const domainName = ref('')
const loading = ref(false)
const mintingEnabled = ref<boolean | null>(null)
const prices = ref<Record<string, bigint>>({})
const txHash = ref('')
const errorMsg = ref('')
const successMsg = ref('')

const currentPrice = computed(() => {
  if (!domainConfig.value) return 0n
  if (isType2(domainConfig.value)) {
    const len = domainName.value.length
    if (len === 0) return 0n
    const clampedLen = Math.min(len, domainConfig.value.differentPrices)
    const key = clampedLen >= 5 ? '5+ chars' : `${clampedLen} char${clampedLen > 1 ? 's' : ''}`
    return prices.value[key] || 0n
  }
  return prices.value['any length'] || 0n
})

const needsChainSwitch = computed(() => {
  if (!domainConfig.value || !connectedChainId.value) return false
  return connectedChainId.value !== domainConfig.value.chainId
})

const chainName = computed(() => domainConfig.value?.chainName || '')
const currencyDecimals = computed(() => domainConfig.value?.currencyDecimals ?? 18)

async function loadStatus() {
  if (!domainConfig.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    mintingEnabled.value = await checkMintingEnabled(domainConfig.value)
    prices.value = await fetchAllPrices(domainConfig.value)
  } catch (e: any) {
    errorMsg.value = 'Failed to load domain info: ' + (e.shortMessage || e.message)
  } finally {
    loading.value = false
  }
}

async function handleSwitchChain() {
  if (!domainConfig.value) return
  try {
    await switchChain({ chainId: domainConfig.value.chainId })
  } catch (e: any) {
    errorMsg.value = 'Failed to switch chain: ' + (e.shortMessage || e.message)
  }
}

async function handleMint() {
  if (!domainConfig.value || !address.value || !domainName.value.trim()) return

  const cfg = domainConfig.value
  const name = domainName.value.trim().toLowerCase()
  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    if (hasErc20Currency(cfg)) {
      const spender = isType2(cfg) ? cfg.minter as `0x${string}` : cfg.address
      const allowance = await readContract(config, {
        address: cfg.currencyAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address.value, spender],
        chainId: cfg.chainId,
      })

      if ((allowance as bigint) < currentPrice.value) {
        const approveTx = await writeContract(config, {
          address: cfg.currencyAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, currentPrice.value],
          chainId: cfg.chainId,
        })
        await waitForTransactionReceipt(config, { hash: approveTx, chainId: cfg.chainId })
      }
    }

    const mintValue = hasErc20Currency(cfg) ? 0n : currentPrice.value

    let hash: `0x${string}`
    if (isType2(cfg)) {
      hash = await writeContract(config, {
        address: cfg.minter as `0x${string}`,
        abi: minterAbi,
        functionName: 'mint',
        args: [name, address.value, zeroAddress],
        value: mintValue,
        chainId: cfg.chainId,
      })
    } else {
      hash = await writeContract(config, {
        address: cfg.address,
        abi: tldAbi,
        functionName: 'mint',
        args: [name, address.value, zeroAddress],
        value: mintValue,
        chainId: cfg.chainId,
      })
    }

    txHash.value = hash
    await waitForTransactionReceipt(config, { hash, chainId: cfg.chainId })
    successMsg.value = `Successfully minted ${name}${tld.value}!`
    domainName.value = ''
  } catch (e: any) {
    errorMsg.value = e.shortMessage || e.message || 'Transaction failed'
  } finally {
    loading.value = false
  }
}

onMounted(loadStatus)
watch(() => route.params.tld, loadStatus)
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div v-if="!domainConfig" class="text-center py-20">
      <h2 class="text-2xl font-bold text-slate-400">Domain TLD not found</h2>
      <p class="mt-2 text-slate-500">The TLD <code>{{ tld }}</code> is not supported.</p>
    </div>

    <template v-else>
      <div class="mb-8">
        <h1 class="text-3xl sm:text-4xl font-extrabold">
          Mint
          <span class="bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">{{ tld }}</span>
        </h1>
        <p class="mt-2 text-slate-500 dark:text-slate-400">
          {{ chainName }} &middot; {{ domainConfig.currency }}
        </p>
      </div>

      <div v-if="loading && mintingEnabled === null" class="card text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-punk-purple border-t-transparent rounded-full mx-auto" />
        <p class="mt-4 text-slate-500">Loading domain info...</p>
      </div>

      <template v-else>
        <div v-if="mintingEnabled === false" class="card border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 mb-6">
          <p class="text-yellow-700 dark:text-yellow-400 font-medium">Minting is currently disabled for this TLD.</p>
        </div>

        <div v-if="Object.keys(prices).length > 0" class="card mb-6">
          <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Pricing
          </h3>
          <div class="space-y-2">
            <div
              v-for="(price, label) in prices"
              :key="label"
              class="flex justify-between items-center py-1"
            >
              <span class="text-sm text-slate-600 dark:text-slate-300">{{ label }}</span>
              <span class="text-sm font-mono font-medium">
                {{ formatUnits(price, currencyDecimals) }} {{ domainConfig.currency }}
              </span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="mb-4">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Domain Name
            </label>
            <div class="flex items-center gap-2">
              <input
                v-model="domainName"
                type="text"
                :placeholder="`yourname`"
                class="input-field flex-1"
                :disabled="!mintingEnabled"
              />
              <span class="text-lg font-semibold text-slate-400">{{ tld }}</span>
            </div>
          </div>

          <div v-if="domainName && currentPrice > 0n" class="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">Price</span>
              <span class="font-mono font-medium">{{ formatUnits(currentPrice, currencyDecimals) }} {{ domainConfig.currency }}</span>
            </div>
          </div>

          <div v-if="errorMsg" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p class="text-sm text-red-600 dark:text-red-400">{{ errorMsg }}</p>
          </div>

          <div v-if="successMsg" class="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p class="text-sm text-green-600 dark:text-green-400">{{ successMsg }}</p>
          </div>

          <div v-if="!isConnected">
            <p class="text-center text-slate-500 py-4">Connect your wallet to mint a domain.</p>
          </div>

          <div v-else-if="needsChainSwitch">
            <button @click="handleSwitchChain" class="btn-primary w-full">
              Switch to {{ chainName }}
            </button>
          </div>

          <div v-else>
            <button
              @click="handleMint"
              :disabled="!domainName.trim() || !mintingEnabled || loading"
              class="btn-primary w-full"
            >
              <span v-if="loading">Minting...</span>
              <span v-else>Mint {{ domainName || 'domain' }}{{ tld }}</span>
            </button>
          </div>

          <div v-if="hasErc20Currency(domainConfig)" class="mt-3">
            <p class="text-xs text-slate-400 text-center">
              Requires {{ domainConfig.currency }} token approval before minting
            </p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
