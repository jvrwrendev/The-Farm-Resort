import type {
  PickleballFacility,
  PickleballGalleryImage,
  PickleballSettings,
} from './types'

const image = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1800&q=80`

export const PICKLEBALL_GALLERY: PickleballGalleryImage[] = [
  {
    id: 'pickleball-overview',
    src: image('1779209219762-681ff11296d6'),
    alt: 'Outdoor pickleball court surrounded by lush greenery',
    title: 'Center Court at a glance',
    category: 'Court overview',
  },
  {
    id: 'pickleball-playing-area',
    src: image('1686721135016-49949bd23352'),
    alt: 'Bright yellow pickleballs resting on a blue court',
    title: 'Ready for the first rally',
    category: 'Playing area',
  },
  {
    id: 'pickleball-markings',
    src: image('1763232580086-240844d86bff'),
    alt: 'Pickleball court with clearly marked lines',
    title: 'Tournament-style court markings',
    category: 'Net & markings',
  },
  {
    id: 'pickleball-player',
    src: image('1756477558468-b3e485757470'),
    alt: 'A player hitting a pickleball during a game',
    title: 'Mid-game action',
    category: 'Players',
  },
  {
    id: 'pickleball-group',
    src: image('1737229302954-a79054b8375f'),
    alt: 'A group of friends playing pickleball together',
    title: 'Doubles with friends',
    category: 'Players',
  },
  {
    id: 'pickleball-surroundings',
    src: image('1762423570057-3ab77cb09b31'),
    alt: 'Pickleball player enjoying an outdoor court',
    title: 'Fresh air and friendly competition',
    category: 'Surroundings',
  },
  {
    id: 'pickleball-facilities',
    src: image('1676962687637-49e3c1ac4d63'),
    alt: 'Courtside seating and facilities beside the playing area',
    title: 'Courtside seating and shade',
    category: 'Facilities',
  },
  {
    id: 'pickleball-equipment',
    src: image('1715333148717-3f1fb80852f1'),
    alt: 'Players holding paddles on a pickleball court',
    title: 'Paddles ready at the net',
    category: 'Facilities',
  },
]

export const PICKLEBALL_SETTINGS: PickleballSettings = {
  openTime: '07:00',
  closeTime: '21:00',
  slotMinutes: 60,
  maxDurationHours: 3,
  bookingWindowDays: 90,
  maxPlayers: 4,
}

export const PICKLEBALL_FACILITIES: PickleballFacility[] = [
  {
    id: 'courts',
    name: 'Three playing courts',
    description: 'Garden, Center, and Covered courts, each sized for doubles play.',
    icon: 'court',
  },
  {
    id: 'lighting',
    name: 'Evening lighting',
    description: 'Floodlit courts let you keep playing until 9:00 PM.',
    icon: 'light',
  },
  {
    id: 'seating',
    name: 'Courtside seating',
    description: 'Shaded benches and spectator spots for teammates and guests.',
    icon: 'seating',
  },
  {
    id: 'equipment',
    name: 'Equipment rental',
    description: 'Paddles and balls are available on request at the court desk.',
    icon: 'paddle',
  },
  {
    id: 'water',
    name: 'Water and rest areas',
    description: 'Drinking water and shaded rest points are available between games.',
    icon: 'water',
  },
  {
    id: 'parking',
    name: 'On-site parking',
    description: 'Complimentary parking is available a short walk from the courts.',
    icon: 'parking',
  },
  {
    id: 'restrooms',
    name: 'Restrooms and changing area',
    description: 'Clean facilities and a changing area are available near the clubhouse.',
    icon: 'restroom',
  },
  {
    id: 'first-aid',
    name: 'First-aid kit',
    description: 'A basic first-aid kit is kept at the court desk for minor knocks.',
    icon: 'first-aid',
  },
]
