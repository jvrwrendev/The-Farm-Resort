import { useCallback, useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  listAllPickleballCourts,
  createPickleballCourt,
  updatePickleballCourt,
  deletePickleballCourt,
  togglePickleballCourtStatus,
  uploadPickleballCourtImage,
  type CourtInput,
} from '@/services/pickleballCourt.service'

const ACCEPTED_IMAGES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 2 * 1024 * 1024
import type { PickleballCourt } from '@/features/pickleball/types'

const emptyForm: CourtInput = {
  name: '',
  tagline: '',
  description: '',
  imageUrl: '',
  hourlyRate: 0,
  weekdayRate: 0,
  weekendRate: 0,
  maxPlayers: 4,
  surface: '',
  isCovered: false,
  amenities: [],
  isAvailable: true,
  isActive: true,
  openTime: '07:00',
  closeTime: '21:00',
}

export default function AdminPickleballCourtsPage() {
  const [courts, setCourts] = useState<PickleballCourt[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PickleballCourt | null>(null)
  const [form, setForm] = useState<CourtInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PickleballCourt | null>(null)
  const [amenityInput, setAmenityInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchCourts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listAllPickleballCourts()
      setCourts(data)
    } catch {
      toast.error('Failed to load courts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCourts()
  }, [fetchCourts])

  const resetImageState = () => {
    setImageFile(null)
    setImagePreview('')
    setUploadingImage(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setAmenityInput('')
    resetImageState()
    setDialogOpen(true)
  }

  const openEdit = (court: PickleballCourt) => {
    setEditing(court)
    setForm({
      name: court.name,
      tagline: court.tagline,
      description: court.description,
      imageUrl: court.imageUrl,
      hourlyRate: court.hourlyRate,
      weekdayRate: court.weekdayRate,
      weekendRate: court.weekendRate,
      maxPlayers: court.maxPlayers,
      surface: court.surface,
      isCovered: court.isCovered,
      amenities: court.amenities,
      isAvailable: court.isAvailable,
      isActive: court.isActive,
      openTime: court.openTime,
      closeTime: court.closeTime,
    })
    setAmenityInput('')
    resetImageState()
    setDialogOpen(true)
  }

  const handleImageSelected = (file: File) => {
    if (!ACCEPTED_IMAGES.includes(file.type)) {
      toast.error('Unsupported file type. Please use JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('File is too large. Maximum size is 2 MB.')
      return
    }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.onerror = () => toast.error('Could not read file.')
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setForm((prev) => ({ ...prev, imageUrl: '' }))
    resetImageState()
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Court name is required.')
      return
    }
    setSaving(true)
    try {
      let imageUrl = form.imageUrl
      if (imageFile) {
        setUploadingImage(true)
        try {
          imageUrl = await uploadPickleballCourtImage(imageFile)
        } finally {
          setUploadingImage(false)
        }
      }

      const payload = { ...form, imageUrl }
      if (editing) {
        const updated = await updatePickleballCourt(editing.id, payload)
        setCourts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        toast.success('Court updated.')
      } else {
        const created = await createPickleballCourt(payload)
        setCourts((prev) => [...prev, created])
        toast.success('Court created.')
      }
      setDialogOpen(false)
      resetImageState()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save court.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePickleballCourt(deleteTarget.id)
      setCourts((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toast.success('Court deleted.')
      setDeleteTarget(null)
    } catch {
      toast.error('Failed to delete court.')
    }
  }

  const handleToggleActive = async (court: PickleballCourt) => {
    try {
      const updated = await togglePickleballCourtStatus(court.id, !court.isActive)
      setCourts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      toast.success(updated.isActive ? 'Court activated.' : 'Court deactivated.')
    } catch {
      toast.error('Failed to update status.')
    }
  }

  const addAmenity = () => {
    const v = amenityInput.trim()
    if (!v) return
    if (form.amenities?.includes(v)) return
    setForm((f) => ({ ...f, amenities: [...(f.amenities ?? []), v] }))
    setAmenityInput('')
  }

  const removeAmenity = (a: string) => {
    setForm((f) => ({ ...f, amenities: (f.amenities ?? []).filter((x) => x !== a) }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Pickleball Courts</h2>
          <p className="text-sm text-muted-foreground">Manage court details, pricing, and availability.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Court
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading courts…</div>
      ) : courts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-medium">No courts yet</p>
            <p className="text-sm text-muted-foreground">Add a court to get started.</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Court
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courts.map((court) => (
            <Card key={court.id} className="overflow-hidden">
              {court.imageUrl && (
                <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                  <img src={court.imageUrl} alt={court.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
              )}
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{court.name}</p>
                    <p className="text-xs text-muted-foreground">{court.tagline}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      court.isActive ? 'bg-emerald-500/90 text-white' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {court.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{court.description}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted px-2 py-1">₱{court.hourlyRate}/hr</span>
                  <span className="rounded-full bg-muted px-2 py-1">WD ₱{court.weekdayRate}</span>
                  <span className="rounded-full bg-muted px-2 py-1">WE ₱{court.weekendRate}</span>
                  <span className="rounded-full bg-muted px-2 py-1">Max {court.maxPlayers}</span>
                  <span className="rounded-full bg-muted px-2 py-1">{court.surface}</span>
                  <span className="rounded-full bg-muted px-2 py-1">{court.isCovered ? 'Covered' : 'Outdoor'}</span>
                  <span className="rounded-full bg-muted px-2 py-1">
                    {court.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(court)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(court)}
                    title={court.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {court.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(court)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDialogOpen(false)
            resetImageState()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Court' : 'Add Court'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Court image</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex h-28 w-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                  {imagePreview || form.imageUrl ? (
                    <img
                      src={imagePreview || form.imageUrl}
                      alt={form.name || 'Court image'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageSelected(file)
                      e.target.value = ''
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving || uploadingImage}
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {imagePreview || form.imageUrl ? 'Replace image' : 'Upload image'}
                    </Button>
                    {(imagePreview || form.imageUrl) && (
                      <Button type="button" variant="ghost" onClick={removeImage} disabled={saving}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">JPG, PNG, or WebP · max 2 MB</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Surface</Label>
              <Input value={form.surface} onChange={(e) => setForm((f) => ({ ...f, surface: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate</Label>
              <Input type="number" value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Weekday Rate</Label>
              <Input type="number" value={form.weekdayRate} onChange={(e) => setForm((f) => ({ ...f, weekdayRate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Weekend Rate</Label>
              <Input type="number" value={form.weekendRate} onChange={(e) => setForm((f) => ({ ...f, weekendRate: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Max Players</Label>
              <Input type="number" value={form.maxPlayers} onChange={(e) => setForm((f) => ({ ...f, maxPlayers: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Open Time</Label>
              <Input type="time" value={form.openTime} onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Close Time</Label>
              <Input type="time" value={form.closeTime} onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isCovered} onChange={(e) => setForm((f) => ({ ...f, isCovered: e.target.checked }))} />
              <Label>Covered</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
              <Label>Available</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              <Label>Active</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Amenities</Label>
              <div className="flex gap-2">
                <Input value={amenityInput} onChange={(e) => setAmenityInput(e.target.value)} placeholder="Add amenity" />
                <Button type="button" onClick={addAmenity}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {(form.amenities ?? []).map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs">
                    {a}
                    <button type="button" onClick={() => removeAmenity(a)} className="text-muted-foreground hover:text-destructive">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || uploadingImage}>
              {saving || uploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                'Save'
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Court</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete “{deleteTarget?.name}”? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
