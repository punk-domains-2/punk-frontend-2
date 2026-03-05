<script setup lang="ts">
import { ref } from 'vue'
import { useAccount, useConnect, useDisconnect } from '@wagmi/vue'

const { address, isConnected } = useAccount()
const { connectors, connect } = useConnect()
const { disconnect } = useDisconnect()
const showMenu = ref(false)

function shortenAddress(addr: string): string {
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}

function handleConnect(connector: any) {
  connect({ connector })
  showMenu.value = false
}
</script>

<template>
  <div class="relative">
    <button
      v-if="!isConnected"
      @click="showMenu = !showMenu"
      class="btn-primary text-sm"
    >
      Connect
    </button>

    <button
      v-else
      @click="showMenu = !showMenu"
      class="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700
             rounded-xl text-sm font-mono hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      {{ shortenAddress(address!) }}
    </button>

    <div
      v-if="showMenu"
      class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
             rounded-xl shadow-xl z-50 overflow-hidden"
    >
      <template v-if="!isConnected">
        <button
          v-for="connector in connectors"
          :key="connector.uid"
          @click="handleConnect(connector)"
          class="w-full px-4 py-3 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {{ connector.name }}
        </button>
      </template>
      <template v-else>
        <div class="px-4 py-3 text-xs text-slate-500 border-b border-slate-200 dark:border-slate-700 font-mono break-all">
          {{ address }}
        </div>
        <button
          @click="disconnect(); showMenu = false"
          class="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Disconnect
        </button>
      </template>
    </div>

    <div v-if="showMenu" @click="showMenu = false" class="fixed inset-0 z-40" />
  </div>
</template>
