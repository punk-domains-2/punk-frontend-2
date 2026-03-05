<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAccount, useSwitchChain } from '@wagmi/vue'
import {
  sendTransaction,
  writeContract,
  readContract,
  waitForTransactionReceipt,
} from '@wagmi/core'
import { parseEther, parseUnits } from 'viem'
import { config } from '@/config/wagmi'
import { useDomain } from '@/composables/useDomain'
import { chainById } from '@/config/chains'
import { erc20Abi } from '@/abi/erc20'
import tokensData from '@/data/tokens.json'
import domainsData from '@/data/domains.json'

const { address, isConnected, chainId: connectedChainId } = useAccount()
const { switchChain } = useSwitchChain()
const { parseDomainName, getDomainConfig, getDomainHolder } = useDomain()

const domainInput = ref('')
const amount = ref('')
const selectedTokenSymbol = ref('')
const resolvedHolder = ref('')
const resolvedChainId = ref(0)
const loading = ref(false)
const resolving = ref(false)
const showConfirm = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const txHash = ref('')

const supportedChainIds = computed(() => {
  const ids = new Set<number>()
  for (const domain of Object.values(domainsData)) {
    ids.add(domain.chainId)
  }
  return ids
})

const supportedTokens = computed(() => {
  const result: Record<string, Record<string, string>> = {}
  for (const [chainId, tokens] of Object.entries(tokensData)) {
    if (supportedChainIds.value.has(Number(chainId))) {
      result[chainId] = tokens as Record<string, string>
    }
  }
  return result
})

const detectedChainId = computed(() => {
  const fullName = domainInput.value.trim().toLowerCase()
  if (!fullName.includes('.')) return null
  const tld = '.' + fullName.split('.').pop()
  const domainCfg = (domainsData as Record<string, { chainId: number }>)[tld]
  return domainCfg ? domainCfg.chainId : null
})

const availableTokens = computed(() => {
  if (!detectedChainId.value) return []
  const chainTokens = supportedTokens.value[String(detectedChainId.value)]
  if (!chainTokens) return []
  return Object.entries(chainTokens).map(([symbol, addr]) => ({
    symbol,
    address: addr,
    isNative: addr === '0x0',
  }))
})

watch(detectedChainId, () => {
  if (availableTokens.value.length > 0) {
    const native = availableTokens.value.find((t) => t.isNative)
    selectedTokenSymbol.value = native ? native.symbol : availableTokens.value[0].symbol
  } else {
    selectedTokenSymbol.value = ''
  }
})

const selectedToken = computed(() => {
  return availableTokens.value.find((t) => t.symbol === selectedTokenSymbol.value) || null
})

const needsChainSwitch = computed(() => {
  if (!resolvedChainId.value || !connectedChainId.value) return false
  return connectedChainId.value !== resolvedChainId.value
})

const chainName = computed(() => {
  const cid = resolvedChainId.value || detectedChainId.value
  if (!cid) return ''
  const chain = chainById[cid]
  return chain?.name || ''
})

const detectedChainName = computed(() => {
  if (!detectedChainId.value) return ''
  const chain = chainById[detectedChainId.value]
  return chain?.name || ''
})

async function resolveDomain() {
  const fullName = domainInput.value.trim().toLowerCase()
  if (!fullName) return

  resolving.value = true
  errorMsg.value = ''
  resolvedHolder.value = ''

  const parsed = parseDomainName(fullName)
  if (!parsed) {
    errorMsg.value = 'Invalid domain format. Use format: name.tld (e.g. alice.flr)'
    resolving.value = false
    return
  }

  const cfg = getDomainConfig(parsed.tld)
  if (!cfg) {
    errorMsg.value = `TLD ${parsed.tld} is not supported`
    resolving.value = false
    return
  }

  if (!selectedToken.value) {
    errorMsg.value = 'Please select a token to send'
    resolving.value = false
    return
  }

  try {
    const holder = await getDomainHolder(parsed.name, cfg)
    if (holder === '0x0000000000000000000000000000000000000000') {
      errorMsg.value = 'This domain is not registered'
      resolving.value = false
      return
    }
    resolvedHolder.value = holder
    resolvedChainId.value = cfg.chainId
    showConfirm.value = true
  } catch (e: any) {
    errorMsg.value = e.shortMessage || e.message || 'Failed to resolve domain'
  } finally {
    resolving.value = false
  }
}

async function handleSwitchChain() {
  try {
    await switchChain({ chainId: resolvedChainId.value })
  } catch (e: any) {
    errorMsg.value = 'Failed to switch chain: ' + (e.shortMessage || e.message)
  }
}

async function handleSend() {
  if (!resolvedHolder.value || !amount.value || !address.value || !selectedToken.value) return

  loading.value = true
  errorMsg.value = ''
  successMsg.value = ''

  try {
    let hash: `0x${string}`

    if (selectedToken.value.isNative) {
      hash = await sendTransaction(config, {
        to: resolvedHolder.value as `0x${string}`,
        value: parseEther(amount.value),
        chainId: resolvedChainId.value,
      })
    } else {
      const decimals = await readContract(config, {
        address: selectedToken.value.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'decimals',
        chainId: resolvedChainId.value,
      })

      hash = await writeContract(config, {
        address: selectedToken.value.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [resolvedHolder.value as `0x${string}`, parseUnits(amount.value, decimals)],
        chainId: resolvedChainId.value,
      })
    }

    txHash.value = hash
    await waitForTransactionReceipt(config, { hash, chainId: resolvedChainId.value })
    successMsg.value = `Successfully sent ${amount.value} ${selectedToken.value.symbol} to ${domainInput.value}!`
    showConfirm.value = false
    domainInput.value = ''
    amount.value = ''
    resolvedHolder.value = ''
  } catch (e: any) {
    errorMsg.value = e.shortMessage || e.message || 'Transaction failed'
  } finally {
    loading.value = false
  }
}

function cancelSend() {
  showConfirm.value = false
  resolvedHolder.value = ''
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="mb-8">
      <h1 class="text-3xl sm:text-4xl font-extrabold">
        <span class="bg-gradient-to-r from-punk-purple to-punk-pink bg-clip-text text-transparent">
          Send Tokens
        </span>
      </h1>
      <p class="mt-3 text-slate-500 dark:text-slate-400">
        Send tokens to any Punk Domain holder
      </p>
    </div>

    <div v-if="!isConnected" class="card text-center py-16">
      <p class="text-slate-500">Connect your wallet to send tokens.</p>
    </div>

    <template v-else>
      <div class="card">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Recipient Domain
            </label>
            <input
              v-model="domainInput"
              type="text"
              placeholder="e.g. alice.flr"
              class="input-field"
              :disabled="showConfirm"
            />
          </div>

          <div v-if="detectedChainId && availableTokens.length > 0">
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Token
              <span class="text-xs text-slate-400 font-normal ml-1">on {{ detectedChainName }}</span>
            </label>
            <select
              v-model="selectedTokenSymbol"
              class="input-field"
              :disabled="showConfirm"
            >
              <option
                v-for="token in availableTokens"
                :key="token.symbol"
                :value="token.symbol"
              >
                {{ token.symbol }}{{ token.isNative ? ' (native)' : '' }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Amount
              <span v-if="selectedToken" class="text-xs text-slate-400 font-normal ml-1">
                {{ selectedToken.symbol }}
              </span>
            </label>
            <input
              v-model="amount"
              type="text"
              placeholder="0.01"
              class="input-field"
              :disabled="showConfirm"
            />
          </div>

          <div v-if="errorMsg" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p class="text-sm text-red-500">{{ errorMsg }}</p>
          </div>

          <div v-if="successMsg" class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p class="text-sm text-green-600 dark:text-green-400">{{ successMsg }}</p>
          </div>

          <button
            v-if="!showConfirm"
            @click="resolveDomain"
            :disabled="!domainInput.trim() || !amount || !selectedToken || resolving"
            class="btn-primary w-full"
          >
            {{ resolving ? 'Resolving...' : 'Resolve & Send' }}
          </button>
        </div>
      </div>

      <!-- Confirmation Modal -->
      <Teleport to="body">
        <div v-if="showConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="cancelSend" />
          <div class="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl">
            <div class="p-6">
              <h3 class="text-xl font-bold mb-6">Confirm Transaction</h3>

              <div class="space-y-4">
                <div class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500">To Domain</span>
                    <span class="font-medium">{{ domainInput }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500">Holder Address</span>
                    <span class="font-mono text-xs">{{ resolvedHolder }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500">Token</span>
                    <span class="font-medium">
                      {{ selectedToken?.symbol }}
                      <span v-if="selectedToken?.isNative" class="text-xs text-slate-400">(native)</span>
                      <span v-else class="text-xs text-slate-400">(ERC-20)</span>
                    </span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500">Amount</span>
                    <span class="font-medium">{{ amount }} {{ selectedToken?.symbol }}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span class="text-slate-500">Network</span>
                    <span class="font-medium">{{ chainName }}</span>
                  </div>
                </div>

                <p class="text-xs text-slate-400 text-center">
                  Please verify the recipient address before confirming.
                </p>

                <div v-if="errorMsg" class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p class="text-sm text-red-500">{{ errorMsg }}</p>
                </div>

                <div v-if="needsChainSwitch">
                  <button @click="handleSwitchChain" class="btn-primary w-full">
                    Switch to {{ chainName }}
                  </button>
                </div>
                <div v-else class="flex gap-3">
                  <button @click="cancelSend" class="btn-secondary flex-1">Cancel</button>
                  <button
                    @click="handleSend"
                    :disabled="loading"
                    class="btn-primary flex-1"
                  >
                    {{ loading ? 'Sending...' : 'Confirm Send' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>
