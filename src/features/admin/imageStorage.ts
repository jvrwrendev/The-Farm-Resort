const STORAGE_KEY = 'the-farm-images-v1'

export type ImageCategory = 'accommodation' | 'gallery' | 'pickleball'

export interface ManagedImage {
  id: string
  name: string
  description: string
  category: ImageCategory
  displayStatus: 'active' | 'inactive'
  fileUrl: string
  uploadedAt: string
}

export function loadImages(): ManagedImage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as ManagedImage[]
    return []
  } catch {
    return []
  }
}

export function saveImages(images: ManagedImage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(images))
}

export function getActiveImages(category: ImageCategory): ManagedImage[] {
  return loadImages().filter((img) => img.category === category && img.displayStatus === 'active')
}
