import { ref } from 'vue'
import { readContract, getPublicClient } from '@wagmi/core'
import { config } from '@/config/wagmi'
import { tldAbi } from '@/abi/tld'
import { minterAbi } from '@/abi/minter'
import domainsData from '@/data/domains.json'
import type { DomainConfig, DomainsMap, DomainDataJson } from '@/types'

const domains = domainsData as DomainsMap

export function useDomain() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  function parseDomainName(fullName: string): { name: string; tld: string } | null {
    const dotIndex = fullName.indexOf('.')
    if (dotIndex === -1) return null
    return {
      name: fullName.substring(0, dotIndex).toLowerCase(),
      tld: '.' + fullName.substring(dotIndex + 1).toLowerCase(),
    }
  }

  function getDomainConfig(tld: string): DomainConfig | null {
    return domains[tld] || null
  }

  function getAllDomains(): Record<string, DomainConfig> {
    return domains
  }

  function getVisibleDomains(): Record<string, DomainConfig> {
    return Object.fromEntries(
      Object.entries(domains).filter(([, cfg]) => cfg.show),
    )
  }

  function getDomainsByChain(visibleOnly = true): Record<string, { tld: string; config: DomainConfig }[]> {
    const source = visibleOnly ? getVisibleDomains() : getAllDomains()
    const grouped: Record<string, { tld: string; config: DomainConfig }[]> = {}
    for (const [tld, cfg] of Object.entries(source)) {
      if (!grouped[cfg.chainName]) grouped[cfg.chainName] = []
      grouped[cfg.chainName].push({ tld, config: cfg })
    }
    return grouped
  }

  function isType2(cfg: DomainConfig): boolean {
    return cfg.minter !== ''
  }

  function hasErc20Currency(cfg: DomainConfig): boolean {
    return cfg.currencyAddress !== ''
  }

  async function checkMintingEnabled(cfg: DomainConfig): Promise<boolean> {
    try {
      if (isType2(cfg)) {
        const paused = await readContract(config, {
          address: cfg.minter as `0x${string}`,
          abi: minterAbi,
          functionName: 'paused',
          chainId: cfg.chainId,
        })
        return !paused
      } else {
        const enabled = await readContract(config, {
          address: cfg.address,
          abi: tldAbi,
          functionName: 'buyingEnabled',
          chainId: cfg.chainId,
        })
        return enabled as boolean
      }
    } catch {
      return false
    }
  }

  async function fetchPrice(cfg: DomainConfig, domainLength?: number): Promise<bigint> {
    if (isType2(cfg)) {
      const len = Math.min(domainLength || 5, cfg.differentPrices)
      const fnName = len >= 5 ? 'price5char' : `price${len}char`
      const price = await readContract(config, {
        address: cfg.minter as `0x${string}`,
        abi: minterAbi,
        functionName: fnName as any,
        chainId: cfg.chainId,
      })
      return price as bigint
    } else {
      const price = await readContract(config, {
        address: cfg.address,
        abi: tldAbi,
        functionName: 'price',
        chainId: cfg.chainId,
      })
      return price as bigint
    }
  }

  async function fetchAllPrices(cfg: DomainConfig): Promise<Record<string, bigint>> {
    const prices: Record<string, bigint> = {}
    if (isType2(cfg)) {
      for (let i = 1; i <= cfg.differentPrices; i++) {
        const fnName = `price${i}char`
        try {
          const price = await readContract(config, {
            address: cfg.minter as `0x${string}`,
            abi: minterAbi,
            functionName: fnName as any,
            chainId: cfg.chainId,
          })
          const label = i >= 5 ? `${i}+ chars` : `${i} char${i > 1 ? 's' : ''}`
          prices[label] = price as bigint
        } catch {
          break
        }
      }
    } else {
      const price = await readContract(config, {
        address: cfg.address,
        abi: tldAbi,
        functionName: 'price',
        chainId: cfg.chainId,
      })
      prices['any length'] = price as bigint
    }
    return prices
  }

  async function getDomainHolder(domainName: string, cfg: DomainConfig): Promise<string> {
    const holder = await readContract(config, {
      address: cfg.address,
      abi: tldAbi,
      functionName: 'getDomainHolder',
      args: [domainName],
      chainId: cfg.chainId,
    })
    return holder as string
  }

  async function getDomainData(domainName: string, cfg: DomainConfig): Promise<string> {
    const data = await readContract(config, {
      address: cfg.address,
      abi: tldAbi,
      functionName: 'getDomainData',
      args: [domainName],
      chainId: cfg.chainId,
    })
    return data as string
  }

  async function getDefaultName(address: `0x${string}`, cfg: DomainConfig): Promise<string> {
    const name = await readContract(config, {
      address: cfg.address,
      abi: tldAbi,
      functionName: 'defaultNames',
      args: [address],
      chainId: cfg.chainId,
    })
    return name as string
  }

  async function getDomainMetadata(domainName: string, cfg: DomainConfig): Promise<{ name: string; description: string; image: string } | null> {
    try {
      const domainInfo = await readContract(config, {
        address: cfg.address,
        abi: tldAbi,
        functionName: 'domains',
        args: [domainName],
        chainId: cfg.chainId,
      })
      const tokenId = (domainInfo as any)[1] as bigint
      if (tokenId === 0n) return null

      const tokenUri = await readContract(config, {
        address: cfg.address,
        abi: tldAbi,
        functionName: 'tokenURI',
        args: [tokenId],
        chainId: cfg.chainId,
      })

      const uriStr = tokenUri as string
      if (uriStr.startsWith('data:application/json;base64,')) {
        const json = atob(uriStr.replace('data:application/json;base64,', ''))
        return JSON.parse(json)
      }
      return null
    } catch {
      return null
    }
  }

  function parseDomainData(dataStr: string): DomainDataJson {
    if (!dataStr) return {}
    try {
      return JSON.parse(dataStr)
    } catch {
      return {}
    }
  }

  // --- Per-domain data cache (e.g. key: "tempe-flr-data") ---

  interface CachedDomainInfo {
    holder: string
    data: DomainDataJson
    dataStr: string
    defaultImage?: string
  }

  function domainDataKey(fullName: string): string {
    return fullName.toLowerCase().replace(/\./g, '-') + '-data'
  }

  function getCachedDomainInfo(fullName: string): CachedDomainInfo | null {
    const raw = localStorage.getItem(domainDataKey(fullName))
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  function setCachedDomainInfo(fullName: string, info: CachedDomainInfo) {
    localStorage.setItem(domainDataKey(fullName), JSON.stringify(info))
  }

  function clearCachedDomainInfo(fullName: string) {
    localStorage.removeItem(domainDataKey(fullName))
  }

  async function fetchAndCacheDomainInfo(domainName: string, cfg: DomainConfig, tld: string): Promise<CachedDomainInfo> {
    let holderAddr = ''
    let dataStr = ''
    let data: DomainDataJson = {}
    let defaultImage: string | undefined

    try {
      holderAddr = await getDomainHolder(domainName, cfg)
      if (holderAddr === '0x0000000000000000000000000000000000000000') holderAddr = ''
    } catch {}

    try {
      dataStr = await getDomainData(domainName, cfg)
      data = parseDomainData(dataStr)
    } catch {}

    try {
      const meta = await getDomainMetadata(domainName, cfg)
      if (meta?.image) defaultImage = meta.image
    } catch {}

    const info: CachedDomainInfo = { holder: holderAddr, data, dataStr, defaultImage }
    setCachedDomainInfo(domainName + tld, info)
    return info
  }

  async function getDomainInfoCached(fullName: string, forceRefresh = false): Promise<CachedDomainInfo | null> {
    const parsed = parseDomainName(fullName)
    if (!parsed) return null
    const cfg = getDomainConfig(parsed.tld)
    if (!cfg) return null

    if (!forceRefresh) {
      const cached = getCachedDomainInfo(fullName)
      if (cached) return cached
    }

    return fetchAndCacheDomainInfo(parsed.name, cfg, parsed.tld)
  }

  // --- User domain list cache (which domains a user owns) ---

  function getCacheKey(address: string): string {
    return `punk-domains-cache-${address.toLowerCase()}`
  }

  interface StoredDomain {
    fullName: string
    name: string
    tld: string
    chainName: string
    chainId: number
    isDefault: boolean
    tldAddress: string
  }

  function getCachedDomains(address: string): StoredDomain[] | null {
    const raw = localStorage.getItem(getCacheKey(address))
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null
    } catch {
      return null
    }
  }

  function setCachedDomains(address: string, domains: StoredDomain[]) {
    localStorage.setItem(getCacheKey(address), JSON.stringify(domains))
  }

  function addToCachedDomains(address: string, domain: StoredDomain) {
    const existing = getCachedDomains(address) || []
    const idx = existing.findIndex((d) => d.fullName === domain.fullName)
    if (idx >= 0) {
      existing[idx] = domain
    } else {
      existing.push(domain)
    }
    setCachedDomains(address, existing)
  }

  function updateCachedDomain(address: string, fullName: string, patch: Partial<StoredDomain>) {
    const existing = getCachedDomains(address)
    if (!existing) return
    const idx = existing.findIndex((d) => d.fullName === fullName)
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...patch }
      setCachedDomains(address, existing)
    }
  }

  function clearCachedDomains(address: string) {
    localStorage.removeItem(getCacheKey(address))
  }

  return {
    loading,
    error,
    parseDomainName,
    getDomainConfig,
    getAllDomains,
    getVisibleDomains,
    getDomainsByChain,
    isType2,
    hasErc20Currency,
    checkMintingEnabled,
    fetchPrice,
    fetchAllPrices,
    getDomainHolder,
    getDomainData,
    getDefaultName,
    getDomainMetadata,
    parseDomainData,
    getCachedDomainInfo,
    setCachedDomainInfo,
    clearCachedDomainInfo,
    fetchAndCacheDomainInfo,
    getDomainInfoCached,
    getCachedDomains,
    setCachedDomains,
    addToCachedDomains,
    updateCachedDomain,
    clearCachedDomains,
  }
}
