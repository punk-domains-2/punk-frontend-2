import { http, createConfig } from '@wagmi/core'
import { injected } from '@wagmi/connectors'
import {
  arbitrum, base, bsc, degen, flare, gnosis, mode, optimism, polygon, songbird,
} from './chains'

export const config = createConfig({
  chains: [arbitrum, base, bsc, degen, flare, gnosis, mode, optimism, polygon, songbird],
  connectors: [injected()],
  transports: {
    [arbitrum.id]: http(),
    [base.id]: http(),
    [bsc.id]: http(),
    [degen.id]: http(),
    [flare.id]: http(),
    [gnosis.id]: http(),
    [mode.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [songbird.id]: http(),
  },
})
