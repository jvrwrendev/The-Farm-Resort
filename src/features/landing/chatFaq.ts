import { formatCurrency } from '@/lib/utils'
import type { Policy } from '@/types'

export type ChatTopicId =
  | 'rates'
  | 'guests'
  | 'checkin'
  | 'policies'
  | 'amenities'
  | 'availability'
  | 'location'
  | 'contact'
  | 'booking'

export interface ChatAction {
  label: string
  href: string
}

export interface ChatAnswer {
  text: string
  actions?: ChatAction[]
}

export interface ChatContext {
  price: number
  maxGuests: number
  checkInTime: string
  checkOutTime: string
  cancellationPolicy: string
  address: string
  phone: string
  email: string
  amenities: string[]
  policies: Policy[]
}

export interface QuickReply {
  id: ChatTopicId
  label: string
}

export const QUICK_REPLIES: QuickReply[] = [
  { id: 'rates', label: 'Rates' },
  { id: 'availability', label: 'Availability' },
  { id: 'policies', label: 'Policies' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'location', label: 'Location' },
  { id: 'booking', label: 'Book now' },
]

const TOPIC_ORDER: ChatTopicId[] = [
  'rates',
  'checkin',
  'policies',
  'amenities',
  'location',
  'contact',
  'availability',
  'guests',
  'booking',
]

const TOPIC_KEYWORDS: Record<ChatTopicId, string[]> = {
  rates: ['rate', 'price', 'cost', 'how much', 'fee', 'night', 'payment', 'pay', 'cheap', 'budget'],
  guests: [
    'guest',
    'guests',
    'pax',
    'capacity',
    'how many people',
    'how many persons',
    'people',
    'person',
    'adults',
    'children',
    'kids',
    'group size',
  ],
  checkin: ['check in', 'checkin', 'check out', 'checkout', 'arrival', 'arrive', 'early', 'late'],
  policies: ['policy', 'policies', 'cancel', 'cancellation', 'refund', 'rules', 'curfew', 'noise', 'house rules'],
  amenities: [
    'amenity',
    'amenities',
    'pool',
    'wifi',
    'wi fi',
    'internet',
    'parking',
    'kitchen',
    'videoke',
    'aircon',
    'air condition',
    'garden',
    'restaurant',
    'dining',
  ],
  availability: [
    'available',
    'availability',
    'calendar',
    'date',
    'dates',
    'open',
    'vacancy',
    'vacant',
    'booked',
    'fully booked',
    'schedule',
  ],
  location: ['location', 'located', 'where', 'address', 'direction', 'directions', 'map', 'antipolo', 'rizal', 'place'],
  contact: ['contact', 'phone', 'call', 'email', 'reach', 'number', 'human', 'staff', 'message', 'talk'],
  booking: ['book', 'booking', 'reserve', 'reservation', 'stay'],
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsKeyword(haystack: string, keyword: string): boolean {
  if (keyword.includes(' ')) return haystack.includes(keyword)
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(haystack)
}

export function matchTopic(input: string): ChatTopicId | null {
  const normalized = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return null

  for (const topic of TOPIC_ORDER) {
    if (TOPIC_KEYWORDS[topic].some((keyword) => containsKeyword(normalized, keyword))) {
      return topic
    }
  }

  return null
}

export function formatTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return value

  const hours = Number(match[1])
  const minutes = match[2]
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12

  return `${hour12}:${minutes} ${suffix}`
}

function formatList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  return `tel:${cleaned}`
}

function directionsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function buildAnswer(topic: ChatTopicId, context: ChatContext): ChatAnswer {
  const checkIn = formatTime(context.checkInTime)
  const checkOut = formatTime(context.checkOutTime)

  switch (topic) {
    case 'rates':
      return {
        text: `Our rate is ${formatCurrency(context.price)} per night for the entire resort, exclusive to your group of up to ${context.maxGuests} guests.`,
        actions: [
          { label: 'Book your stay', href: '/book' },
          { label: 'View accommodation', href: '#rooms' },
        ],
      }

    case 'guests':
      return {
        text: `The resort comfortably hosts up to ${context.maxGuests} guests. Because the whole property is reserved for one group at a time, you never share the spaces with other guests.`,
        actions: [{ label: 'Book your stay', href: '/book' }],
      }

    case 'checkin':
      return {
        text: `Check-in is from ${checkIn} and check-out is by ${checkOut}. Early check-in and late check-out may be arranged in advance with the team.`,
        actions: [{ label: 'View policies', href: '#policies' }],
      }

    case 'policies': {
      const houseRules = context.policies.find((policy) => /house|rule/i.test(policy.title))?.description
      return {
        text: `${context.cancellationPolicy}${houseRules ? `\n\n${houseRules}` : ''}`,
        actions: [{ label: 'Read all policies', href: '#policies' }],
      }
    }

    case 'amenities': {
      const amenities =
        context.amenities.length > 0
          ? formatList(context.amenities)
          : 'a swimming pool, air-conditioning, Wi-Fi, free parking, a full kitchen, videoke, and outdoor garden spaces'
      return {
        text: `The resort includes ${amenities}. The whole property is yours for the duration of your stay.`,
        actions: [{ label: 'See amenities', href: '#amenities' }],
      }
    }

    case 'availability':
      return {
        text: "I can't hold a specific date in chat, but the live availability calendar shows which dates are still open. Pick a date there and continue to the booking page.",
        actions: [
          { label: 'Check availability', href: '#calendar' },
          { label: 'Book your stay', href: '/book' },
        ],
      }

    case 'location':
      return {
        text: `We're located at ${context.address}. Tap below for directions, or ask me for our contact details.`,
        actions: [
          { label: 'Get directions', href: directionsHref(context.address) },
          { label: 'Contact us', href: telHref(context.phone) },
        ],
      }

    case 'contact':
      return {
        text: `You can reach the team at ${context.phone} or ${context.email}. We're happy to help with dates, special requests, and questions before you book.`,
        actions: [
          { label: `Call ${context.phone}`, href: telHref(context.phone) },
          { label: 'Email us', href: `mailto:${context.email}` },
        ],
      }

    case 'booking':
      return {
        text: 'You can reserve online in a few minutes. Choose your dates, tell us about your group, and we will confirm your private stay.',
        actions: [
          { label: 'Book your stay', href: '/book' },
          { label: 'Check availability', href: '#calendar' },
        ],
      }
  }
}

export function buildFallbackAnswer(context: ChatContext): ChatAnswer {
  return {
    text: `I'm not sure about that one. I can help with rates, availability, policies, amenities, location, or booking. You can also reach the team at ${context.phone} or ${context.email}.`,
    actions: [
      { label: 'Book your stay', href: '/book' },
      { label: 'Contact us', href: telHref(context.phone) },
    ],
  }
}
