import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeading } from '@/features/admin/components'
import { getAccommodation, updateAccommodation } from '@/services/accommodation.service'
import {
  deleteAccommodationImage,
  listAccommodationImages,
  toggleAccommodationImageStatus,
  uploadAccommodationImage,
} from '@/services/accommodationImage.service'
import { queryKeys } from '@/lib/queryKeys'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Accommodation, AccommodationStatus } from '@/types'

export default function AdminAccommodationPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.accommodation,
    queryFn: getAccommodation,
  })

  const [form, setForm] = useState<Accommodation | null>(null)
  const [amenityInput, setAmenityInput] = useState('')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const { data: accommodationImages = [], refetch: refetchImages } = useQuery({
    queryKey: ['accommodation-images'],
    queryFn: listAccommodationImages,
  })

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

  const mutation = useMutation({
    mutationFn: (payload: Partial<Accommodation>) => updateAccommodation(payload),
    onSuccess: (updated) => {
      toast.success('Accommodation updated.')
      setForm({ ...updated })
      queryClient.invalidateQueries({ queryKey: queryKeys.accommodation })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save changes.')
    },
  })

  if (isLoading || !form) {
    return <p className="text-sm text-muted-foreground">Loading accommodation…</p>
  }

  const update = (patch: Partial<Accommodation>) => setForm((prev) => (prev ? { ...prev, ...patch } : prev))

  const addAmenity = () => {
    const value = amenityInput.trim()
    if (!value || form.amenities.includes(value)) return
    update({ amenities: [...form.amenities, value] })
    setAmenityInput('')
  }

  const removeAmenity = (amenity: string) =>
    update({ amenities: form.amenities.filter((item) => item !== amenity) })

  const toggleImage = (image: string) => {
    const hasImage = form.images.includes(image)
    if (hasImage && form.images.length === 1) {
      toast.error('Keep at least one image.')
      return
    }
    update({ images: hasImage ? form.images.filter((item) => item !== image) : [...form.images, image] })
  }

  const handleToggleImageStatus = async (id: string, current: 'active' | 'inactive') => {
    const next = current === 'active' ? 'inactive' : 'active'
    if (next === 'inactive' && accommodationImages.filter((i) => i.status === 'active').length <= 1) {
      toast.error('Keep at least one active image.')
      return
    }
    try {
      await toggleAccommodationImageStatus(id, next)
      refetchImages()
      toast.success(next === 'active' ? 'Image activated.' : 'Image deactivated.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update image.')
    }
  }

  const handleUploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    setUploadingImage(true)
    try {
      await uploadAccommodationImage(file, file.name, '')
      refetchImages()
      toast.success('Image uploaded.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteImage = async (id: string, storagePath: string) => {
    try {
      await deleteAccommodationImage(id, storagePath)
      refetchImages()
      toast.success('Image deleted.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed.')
    }
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name is required.')
      return
    }
    mutation.mutate({
      name: form.name.trim(),
      description: form.description.trim(),
      pricePerNight: Number(form.pricePerNight),
      maxGuests: Number(form.maxGuests),
      amenities: form.amenities,
      images: form.images,
      status: form.status,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Accommodation"
        description="Manage the single exclusive accommodation. New bookings use the current price."
        action={
          <Button onClick={handleSave} loading={mutation.isPending}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price per night (₱)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  value={form.pricePerNight}
                  onChange={(e) => update({ pricePerNight: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxGuests">Maximum guests</Label>
                <Input
                  id="maxGuests"
                  type="number"
                  min={1}
                  value={form.maxGuests}
                  onChange={(e) => update({ maxGuests: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Availability</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => update({ status: value as AccommodationStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Amenities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add an amenity"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addAmenity()
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addAmenity} aria-label="Add amenity">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary" className="gap-1">
                  {amenity}
                  <button type="button" onClick={() => removeAmenity(amenity)} aria-label={`Remove ${amenity}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {form.amenities.length === 0 && (
                <p className="text-sm text-muted-foreground">No amenities yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {RESORT_IMAGES.map((image) => {
              const selected = form.images.includes(image)
              return (
                <button
                  key={image}
                  type="button"
                  onClick={() => toggleImage(image)}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-xl border-2 transition-colors',
                    selected ? 'border-primary' : 'border-transparent',
                  )}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                  <span
                    className={cn(
                      'absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-black/40 text-white opacity-0 group-hover:opacity-100',
                    )}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Selected images appear on the booking page and landing showcase.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
