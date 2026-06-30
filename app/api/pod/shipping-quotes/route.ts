import { NextRequest, NextResponse } from 'next/server'
import { getFulfillmentProvider } from '@/lib/fulfillment'
import type { Address, PodLineItem } from '@/lib/fulfillment/types'
import { z } from 'zod'

const addressSchema = z.object({
  name:        z.string().min(1),
  line1:       z.string().min(1),
  line2:       z.string().optional(),
  city:        z.string().min(1),
  state:       z.string().optional(),
  postalCode:  z.string().min(1),
  countryCode: z.string().length(2),
  phone:       z.string().optional(),
  email:       z.string().email(),
})

const schema = z.object({
  lineItems: z.array(z.object({
    printProductId: z.string().uuid(),
    quantity:       z.number().int().min(1),
  })).min(1),
  shippingAddress: addressSchema,
})

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const provider = getFulfillmentProvider()
    const quotes   = await provider.getShippingQuotes({
      lineItems:       parsed.data.lineItems as PodLineItem[],
      shippingAddress: parsed.data.shippingAddress as Address,
    })
    return NextResponse.json({ quotes })
  } catch (err) {
    console.error('[pod/shipping-quotes]', err)
    return NextResponse.json({ error: 'Could not fetch shipping quotes. Please try again.' }, { status: 502 })
  }
}
