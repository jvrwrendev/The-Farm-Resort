import { format, isWeekend as dateFnsIsWeekend, parseISO, isBefore, startOfDay } from 'date-fns'
import type { AdditionalFee, DayType, PackageType, Rate, Holiday, PricingBreakdown } from '@/types'

const PWD_DISCOUNT_RATE = 0.2

export function getDayType(date: Date, holidays: Holiday[]): DayType {
  const dateStr = format(date, 'yyyy-MM-dd')
  const isHoliday = holidays.some((h) => h.date === dateStr && h.is_active)
  if (isHoliday) return 'holiday'
  if (dateFnsIsWeekend(date)) return 'weekend'
  return 'weekday'
}

export function findApplicableRate(
  rates: Rate[],
  packageType: PackageType,
  guestCount: number
): Rate | null {
  const packageRates = rates
    .filter((r) => r.package_type === packageType && r.is_active)
    .sort((a, b) => a.guest_count - b.guest_count)

  if (packageRates.length === 0) return null

  let applicableRate = packageRates[0]
  for (const rate of packageRates) {
    if (guestCount >= rate.guest_count) {
      applicableRate = rate
    }
  }
  return applicableRate
}

export function getBaseRate(rate: Rate, dayType: DayType): number {
  switch (dayType) {
    case 'holiday':
      return rate.holiday_price ?? rate.weekend_price
    case 'weekend':
      return rate.weekend_price
    default:
      return rate.weekday_price
  }
}

export function calculateExtraGuestsFee(
  guestCount: number,
  rate: Rate,
  entranceFee: AdditionalFee | undefined
): number {
  if (!entranceFee || guestCount <= rate.guest_count) return 0
  const extraGuests = guestCount - rate.guest_count
  return extraGuests * entranceFee.price
}

export function calculateAddonsTotal(
  selectedAddons: Array<{ fee_id: string; quantity: number }>,
  fees: AdditionalFee[]
): { total: number; items: PricingBreakdown['addons'] } {
  const items: PricingBreakdown['addons'] = []
  let total = 0

  for (const selected of selectedAddons) {
    const fee = fees.find((f) => f.id === selected.fee_id)
    if (!fee || !fee.is_active || selected.quantity <= 0) continue

    const quantity = fee.max_quantity
      ? Math.min(selected.quantity, fee.max_quantity)
      : selected.quantity

    const totalPrice = fee.is_per_unit ? fee.price * quantity : fee.price
    total += totalPrice
    items.push({ fee, quantity, totalPrice })
  }

  return { total, items }
}

export function calculateDiscount(
  subtotal: number,
  promoCode?: { discount_type: 'percentage' | 'fixed'; discount_value: number; min_amount: number } | null,
  isPwd?: boolean
): number {
  let discount = 0

  if (isPwd) {
    discount += subtotal * PWD_DISCOUNT_RATE
  }

  if (promoCode && subtotal >= promoCode.min_amount) {
    if (promoCode.discount_type === 'percentage') {
      discount += subtotal * (promoCode.discount_value / 100)
    } else {
      discount += promoCode.discount_value
    }
  }

  return Math.min(discount, subtotal)
}

export function calculatePricing(params: {
  checkInDate: string
  guestCount: number
  packageType: PackageType
  selectedAddons: Array<{ fee_id: string; quantity: number }>
  rates: Rate[]
  additionalFees: AdditionalFee[]
  holidays: Holiday[]
  promoCode?: { discount_type: 'percentage' | 'fixed'; discount_value: number; min_amount: number } | null
  isPwd?: boolean
}): PricingBreakdown | null {
  const {
    checkInDate,
    guestCount,
    packageType,
    selectedAddons,
    rates,
    additionalFees,
    holidays,
    promoCode,
    isPwd,
  } = params

  const date = parseISO(checkInDate)
  const dayType = getDayType(date, holidays)
  const applicableRate = findApplicableRate(rates, packageType, guestCount)

  if (!applicableRate) return null

  const baseRate = getBaseRate(applicableRate, dayType)
  const entranceFee = additionalFees.find((f) => f.slug === 'entrance-fee')
  const extraGuestsFee = calculateExtraGuestsFee(guestCount, applicableRate, entranceFee)

  const { total: addonsTotal, items: addons } = calculateAddonsTotal(
    selectedAddons.filter((a) => {
      const fee = additionalFees.find((f) => f.id === a.fee_id)
      return fee?.slug !== 'entrance-fee'
    }),
    additionalFees
  )

  const subtotal = baseRate + addonsTotal + extraGuestsFee
  const discountAmount = calculateDiscount(subtotal, promoCode, isPwd)
  const totalAmount = subtotal - discountAmount

  return {
    baseRate,
    addonsTotal,
    extraGuestsFee,
    discountAmount,
    totalAmount,
    dayType,
    packageType,
    guestCount,
    addons,
  }
}

export function isDatePast(date: Date): boolean {
  return isBefore(startOfDay(date), startOfDay(new Date()))
}

export function getPackageLabel(type: PackageType): string {
  return type === 'basic' ? 'Basic (Ceiling Fans)' : 'Premium AC'
}

export function getDayTypeLabel(type: DayType): string {
  const labels: Record<DayType, string> = {
    weekday: 'Weekday Rate',
    weekend: 'Weekend Rate',
    holiday: 'Holiday Rate',
  }
  return labels[type]
}
