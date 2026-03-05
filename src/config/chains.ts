import { defineChain } from 'viem'
import {
  arbitrum,
  base,
  bsc,
  gnosis,
  optimism,
  polygon,
  mode,
  flare,
} from 'viem/chains'
import type { Chain } from 'viem'

export const songbird = defineChain({
  id: 19,
  name: 'Songbird',
  nativeCurrency: { name: 'Songbird', symbol: 'SGB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://songbird-api.flare.network/ext/C/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Songbird Explorer', url: 'https://songbird-explorer.flare.network' },
  },
})

export const degen = defineChain({
  id: 666666666,
  name: 'Degen Chain',
  nativeCurrency: { name: 'DEGEN', symbol: 'DEGEN', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.degen.tips'] },
  },
  blockExplorers: {
    default: { name: 'Degen Explorer', url: 'https://explorer.degen.tips' },
  },
})

export const supportedChains = [
  arbitrum,
  base,
  bsc,
  degen,
  flare,
  gnosis,
  mode,
  optimism,
  polygon,
  songbird,
] as const

export const chainById: Record<number, Chain> = Object.fromEntries(
  supportedChains.map((chain) => [chain.id, chain]),
)

export {
  arbitrum,
  base,
  bsc,
  gnosis,
  optimism,
  polygon,
  mode,
  flare,
}
