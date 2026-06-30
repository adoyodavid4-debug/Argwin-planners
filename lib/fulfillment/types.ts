export type Address = {
  name: string
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  countryCode: string
  phone?: string
  email: string
}

export type PodLineItem = {
  printProductId: string   // our print_products.id
  quantity: number
}

export type ShippingQuote = {
  level: string
  label: string
  cost: number             // minor units (cents)
  currency: string
  estDeliveryMinDays: number
  estDeliveryMaxDays: number
}

export type PrintJobStatus =
  | 'pending_review'
  | 'submitted'
  | 'accepted'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'rejected'
  | 'canceled'
  | 'error'

export interface FulfillmentProvider {
  readonly id: 'lulu' | 'printify'

  getShippingQuotes(input: {
    lineItems: PodLineItem[]
    shippingAddress: Address
  }): Promise<ShippingQuote[]>

  createPrintJob(input: {
    externalId: string          // our order id — idempotency key
    lineItems: PodLineItem[]
    shippingAddress: Address
    shippingLevel: string
  }): Promise<{ providerJobId: string; status: PrintJobStatus }>

  getPrintJobStatus(providerJobId: string): Promise<{
    status: PrintJobStatus
    trackingUrl?: string
    trackingNumber?: string
  }>

  verifyAndParseWebhook(req: Request): Promise<
    | { valid: false }
    | {
        valid: true
        providerJobId: string
        status: PrintJobStatus
        trackingUrl?: string
        trackingNumber?: string
      }
  >

  cancelPrintJob?(providerJobId: string): Promise<void>
}
