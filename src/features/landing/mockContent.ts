import img1 from '@/assets/images/1.jpg'
import img2 from '@/assets/images/2.jpg'
import img3 from '@/assets/images/3.jpg'
import img4 from '@/assets/images/4.jpg'
import img5 from '@/assets/images/5.jpg'
import img6 from '@/assets/images/6.jpg'
import img7 from '@/assets/images/585310656_817306511044485_2339196781098693526_n.jpg'
import heroImg from '@/assets/images/hero.jpg'
import aboutImg from '@/assets/images/1.jpg'

import type { GalleryItem, HeroImage } from '@/types'

const NOW = '2025-01-01T00:00:00.000Z'

export const ABOUT_IMAGE_URL = aboutImg

export const HERO_BACKGROUND_URL = heroImg

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
  {
    id: 'mock-photo-1',
    image_url: img1,
    storage_path: 'assets/1.jpg',
    title: 'Resort exterior',
    alt_text: 'The Farm resort exterior view',
    is_cover: false,
    sort_order: 1,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'mock-photo-2',
    image_url: img2,
    storage_path: 'assets/2.jpg',
    title: 'Garden corners',
    alt_text: 'Quiet garden corner of the resort',
    is_cover: false,
    sort_order: 2,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'mock-photo-3',
    image_url: img3,
    storage_path: 'assets/3.jpg',
    title: 'Poolside afternoon',
    alt_text: 'Swimming pool and loungers at The Farm',
    is_cover: false,
    sort_order: 3,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'mock-photo-4',
    image_url: img4,
    storage_path: 'assets/4.jpg',
    title: 'Guest rooms',
    alt_text: 'Bright, spacious guest rooms at The Farm',
    is_cover: false,
    sort_order: 4,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'mock-photo-5',
    image_url: img5,
    storage_path: 'assets/5.jpg',
    title: 'Villas & lawns',
    alt_text: 'Spacious villas surrounded by lawns',
    is_cover: false,
    sort_order: 5,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'mock-photo-6',
    image_url: img6,
    storage_path: 'assets/6.jpg',
    title: 'Open-air dining',
    alt_text: 'Dining area for shared meals',
    is_cover: false,
    sort_order: 6,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 'mock-photo-7',
    image_url: img7,
    storage_path: 'assets/585310656_817306511044485_2339196781098693526_n.jpg',
    title: 'Moments at The Farm',
    alt_text: 'A candid moment captured at The Farm',
    is_cover: false,
    sort_order: 7,
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
    image_url: img1,
  },
  {
    id: 'room-basic-20',
    name: 'Basic Cottage (20 pax)',
    description:
      'Our most popular mid-sized package with ample space for reunions and group celebrations.',
    price_per_night: 19000,
    max_guests: 20,
    amenities: ['Wi-Fi', 'Parking', 'Pool Access', 'Kitchen'],
    image_url: img3,
  },
  {
    id: 'room-premium-10',
    name: 'Premium AC Villa (10 pax)',
    description:
      'Air-conditioned villa with premium linens, ideal for an upscale private retreat.',
    price_per_night: 15000,
    max_guests: 10,
    amenities: ['Air Conditioning', 'Wi-Fi', 'Parking', 'Pool Access'],
    image_url: img4,
  },
  {
    id: 'room-premium-23',
    name: 'Premium AC Villa (23 pax)',
    description:
      'The full estate experience — premium air-conditioned accommodations for larger groups.',
    price_per_night: 26000,
    max_guests: 23,
    amenities: ['Air Conditioning', 'Wi-Fi', 'Parking', 'Pool Access', 'Videoke'],
    image_url: img5,
  },
]
