import heroImg from '@/assets/images/hero.jpg'

import type { GalleryItem, HeroImage, Policy } from '@/types'

const NOW = '2025-01-01T00:00:00.000Z'

export const ABOUT_IMAGE_URL = heroImg

export const HERO_BACKGROUND_URL = heroImg

export const MOCK_POLICIES: Policy[] = [
  {
    id: 'policy-exclusive-use',
    title: 'Exclusive Use',
    description:
      'The entire resort is reserved for one group at a time. Your booking guarantees private use of all facilities.',
    icon: 'home',
    sort_order: 1,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'policy-check-in-out',
    title: 'Check-in & Check-out',
    description:
      'Check-in is from 2:00 PM and check-out is by 12:00 PM. Early check-in and late check-out may be arranged in advance.',
    icon: 'clock',
    sort_order: 2,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'policy-cancellation',
    title: 'Cancellation',
    description:
      'Free cancellation up to 7 days before check-in. Cancellations made within 7 days are subject to a one-night charge.',
    icon: 'calendar',
    sort_order: 3,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'policy-house-rules',
    title: 'House Rules',
    description:
      'Please keep noise reasonable after the videoke curfew, dispose of trash properly, and respect the gardens and wildlife.',
    icon: 'shield',
    sort_order: 4,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
]

export const MOCK_GALLERY: GalleryItem[] = [
  {
    id: 'mock-photo-hero',
    image_url: heroImg,
    storage_path: 'assets/hero.jpg',
    title: 'The Farm at a glance',
    alt_text: 'Wide view of The Farm resort',
    is_cover: true,
    sort_order: 0,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
]

export const MOCK_HERO: HeroImage[] = [
  {
    id: 'mock-hero-1',
    image_url: heroImg,
    storage_path: 'assets/hero.jpg',
    title: 'Welcome to The Farm',
    subtitle: 'Your private resort escape awaits',
    sort_order: 1,
    is_active: true,
    created_at: NOW,
  },
]

export interface RoomCard {
  id: string
  name: string
  description: string
  price_per_night: number
  max_guests: number
  amenities: string[]
  image_url: string
}

export const MOCK_ROOMS: RoomCard[] = [
  {
    id: 'room-basic-10',
    name: 'Basic Cottage (10 pax)',
    description:
      'A breezy cottage package perfect for small family gatherings and intimate getaways.',
    price_per_night: 12000,
    max_guests: 10,
    amenities: ['Wi-Fi', 'Parking', 'Pool Access', 'Kitchen'],
    image_url: heroImg,
  },
  {
    id: 'room-basic-20',
    name: 'Basic Cottage (20 pax)',
    description:
      'Our most popular mid-sized package with ample space for reunions and group celebrations.',
    price_per_night: 19000,
    max_guests: 20,
    amenities: ['Wi-Fi', 'Parking', 'Pool Access', 'Kitchen'],
    image_url: heroImg,
  },
  {
    id: 'room-premium-10',
    name: 'Premium AC Villa (10 pax)',
    description:
      'Air-conditioned villa with premium linens, ideal for an upscale private retreat.',
    price_per_night: 15000,
    max_guests: 10,
    amenities: ['Air Conditioning', 'Wi-Fi', 'Parking', 'Pool Access'],
    image_url: heroImg,
  },
  {
    id: 'room-premium-23',
    name: 'Premium AC Villa (23 pax)',
    description:
      'The full estate experience — premium air-conditioned accommodations for larger groups.',
    price_per_night: 26000,
    max_guests: 23,
    amenities: ['Air Conditioning', 'Wi-Fi', 'Parking', 'Pool Access', 'Videoke'],
    image_url: heroImg,
  },
]
