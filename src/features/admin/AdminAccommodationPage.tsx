import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, X } from 'lucide-react'
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
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/queryKeys'

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

  const handleUploadAccommodationImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    setUploadingImage(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `accommodation-${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('accommodation-images')
        .upload(path, file, { upsert: false })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('accommodation-images').getPublicUrl(path)
      update({ images: [data.publicUrl], aboutImageUrl: data.publicUrl, roomImageUrl: data.publicUrl })
      toast.success('Image uploaded. Save changes to apply.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploadingImage(false)
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
      aboutImageUrl: form.aboutImageUrl,
      roomImageUrl: form.roomImageUrl,
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
          <CardTitle className="font-display text-lg">Accommodation image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {form.image_url ? (
              <img
                src={form.image_url}
                alt="Accommodation"
                className="h-32 w-44 rounded-xl object-cover ring-2 ring-primary"
              />
            ) : (
              <div className="flex h-32 w-44 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                No image
              </div>
            )}
            <div className="space-y-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleUploadAccommodationImage(file)
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                loading={uploadingImage}
              >
                {form.image_url ? 'Replace image' : 'Upload image'}
              </Button>
              {form.image_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => update({ images: [], aboutImageUrl: null, roomImageUrl: null })}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload or replace the primary accommodation image. It is stored in Supabase and displayed automatically on the public Accommodation page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
