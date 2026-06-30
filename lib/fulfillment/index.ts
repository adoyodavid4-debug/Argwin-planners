import type { FulfillmentProvider } from './types'

let _provider: FulfillmentProvider | null = null

export function getFulfillmentProvider(): FulfillmentProvider {
  if (_provider) return _provider
  const { LuluProvider } = require('./providers/lulu')
  _provider = new LuluProvider()
  return _provider
}

export type { FulfillmentProvider, Address, PodLineItem, ShippingQuote, PrintJobStatus } from './types'
