export interface DomainConfig {
  chainId: number
  chainName: string
  address: `0x${string}`
  minter: string
  differentPrices: number
  currency: string
  currencyAddress: string
  currencyDecimals?: number
  show: boolean
  website: string
}

export interface DomainInfo {
  name: string
  tld: string
  fullName: string
  holder: string
  data: string
  tokenId: bigint
  image?: string
}

export interface DomainDataJson {
  [key: string]: string
}

export type DomainsMap = Record<string, DomainConfig>
