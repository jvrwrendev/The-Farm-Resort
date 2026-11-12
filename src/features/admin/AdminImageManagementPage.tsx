import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image as ImageIcon, Upload, X, Eye, Edit, Trash2, RefreshCw, CheckCircle2, CircleDashed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { loadImages, saveImages, type ImageCategory, type ManagedImage } from './imageStorage'
import {
  listPickleballImages,
  uploadPickleballImage,
  updatePickleballImage,
  replacePickleballImage,
  togglePickleballImageStatus,
  deletePickleballImage,
} from '@/services/pickleballImage.service'
import type { PickleballImage } from '@/services/pickleballImage.service'
import {
  listAccommodationImages,
  uploadAccommodationImage,
  updateAccommodationImage,
  replaceAccommodationImage,
  toggleAccommodationImageStatus,
  deleteAccommodationImage,
} from '@/services/accommodationImage.service'
import type { AccommodationImage } from '@/services/accommodationImage.service'

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

const CATEGORIES: { key: ImageCategory; label: string }[] = [
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'gallery', label: 'Image Gallery' },
  { key: 'pickleball', label: 'Pickleball' },
]

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

function validateFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) {
    return 'Unsupported file type. Please use JPG, PNG, or WebP.'
  }
  if (file.size > MAX_SIZE) {
    return 'File is too large. Maximum size is 2 MB.'
  }
  return null
}

export default function AdminImageManagementPage() {
  const [images, setImages] = useState<ManagedImage[]>(() => loadImages())
  const [pickleballImages, setPickleballImages] = useState<PickleballImage[]>([])
  const [pickleballLoading, setPickleballLoading] = useState(false)
  const [accommodationImages, setAccommodationImages] = useState<AccommodationImage[]>([])
  const [accommodationLoading, setAccommodationLoading] = useState(false)
  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(() => new Set())
  const [activeTab, setActiveTab] = useState<ImageCategory>('accommodation')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [previewImage, setPreviewImage] = useState<ManagedImage | null>(null)
  const [editImage, setEditImage] = useState<ManagedImage | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const [replaceImage, setReplaceImage] = useState<ManagedImage | null>(null)
  const [replaceFile, setReplaceFile] = useState<File | null>(null)
  const [replacePreview, setReplacePreview] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)

  const [deleteImage, setDeleteImage] = useState<ManagedImage | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const tabImages = useMemo(() => {
    if (activeTab === 'pickleball') {
      return pickleballImages.map((img) => ({
        id: img.id,
        name: img.name,
        description: img.description,
        category: 'pickleball' as ImageCategory,
        displayStatus: img.status,
        fileUrl: img.url,
        uploadedAt: img.createdAt,
      }))
    }
    if (activeTab === 'accommodation') {
      return accommodationImages.map((img) => ({
        id: img.id,
        name: img.name,
        description: img.description,
        category: 'accommodation' as ImageCategory,
        displayStatus: img.status,
        fileUrl: img.url,
        uploadedAt: img.createdAt,
      }))
    }
    return images.filter((img) => img.category === activeTab)
  }, [activeTab, images, pickleballImages, accommodationImages])

  const persist = useCallback((next: ManagedImage[]) => {
    setImages(next)
    saveImages(next)
  }, [])

  const fetchPickleballImages = useCallback(async () => {
    setPickleballLoading(true)
    try {
      const data = await listPickleballImages()
      setPickleballImages(data)
      setBrokenImageIds(new Set())
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load pickleball images.',
      )
    } finally {
      setPickleballLoading(false)
    }
  }, [])

  const fetchAccommodationImages = useCallback(async () => {
    setAccommodationLoading(true)
    try {
      const data = await listAccommodationImages()
      setAccommodationImages(data)
      setBrokenImageIds(new Set())
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load accommodation images.',
      )
    } finally {
      setAccommodationLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPickleballImages()
    fetchAccommodationImages()
  }, [fetchPickleballImages, fetchAccommodationImages])

  // ---- Upload flow ----
  const handleFileSelected = (file: File) => {
    const err = validateFile(file)
    if (err) {
      toast.error(err)
      return
    }
    setUploadFile(file)
    readFileAsDataUrl(file)
      .then((url) => setUploadPreview(url))
      .catch(() => toast.error('Could not read file.'))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileSelected(file)
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadPreview) {
      toast.error('Please select an image first.')
      return
    }
    if (!uploadName.trim()) {
      toast.error('Image name is required.')
      return
    }
    setUploading(true)
    try {
      if (activeTab === 'pickleball') {
        const newImg = await uploadPickleballImage(uploadFile, uploadName.trim(), uploadDesc.trim())
        setPickleballImages((prev) => [newImg, ...prev])
      } else if (activeTab === 'accommodation') {
        const newImg = await uploadAccommodationImage(uploadFile, uploadName.trim(), uploadDesc.trim())
        setAccommodationImages((prev) => [newImg, ...prev])
      } else {
        const newImage: ManagedImage = {
          id: crypto.randomUUID(),
          name: uploadName.trim(),
          description: uploadDesc.trim(),
          category: activeTab,
          displayStatus: 'active',
          fileUrl: uploadPreview,
          uploadedAt: new Date().toISOString(),
        }
        persist([...images, newImage])
      }
      toast.success('Image uploaded successfully.')
      // reset
      setUploadOpen(false)
      setUploadFile(null)
      setUploadPreview(null)
      setUploadName('')
      setUploadDesc('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const resetUpload = () => {
    setUploadOpen(false)
    setUploadFile(null)
    setUploadPreview(null)
    setUploadName('')
    setUploadDesc('')
    setDragOver(false)
  }

  // ---- Edit flow ----
  const openEdit = (img: ManagedImage) => {
    setEditImage(img)
    setEditName(img.name)
    setEditDesc(img.description)
  }

  const handleEditSave = async () => {
    if (!editImage) return
    if (!editName.trim()) {
      toast.error('Image name is required.')
      return
    }
    const isPickleball = pickleballImages.some((img) => img.id === editImage.id)
    const isAccommodation = accommodationImages.some((img) => img.id === editImage.id)
    try {
      if (isPickleball || isAccommodation) {
        const updated = isAccommodation
          ? await updateAccommodationImage(editImage.id, {
              name: editName.trim(),
              description: editDesc.trim(),
            })
          : await updatePickleballImage(editImage.id, {
              name: editName.trim(),
              description: editDesc.trim(),
            })
        if (isAccommodation) {
          setAccommodationImages((prev) =>
            prev.map((img) => (img.id === updated.id ? updated : img)),
          )
        } else {
          setPickleballImages((prev) =>
            prev.map((img) => (img.id === updated.id ? updated : img)),
          )
        }
        setBrokenImageIds((current) => {
          const next = new Set(current)
          next.delete(updated.id)
          return next
        })
      } else {
        const next = images.map((img) =>
          img.id === editImage.id
            ? { ...img, name: editName.trim(), description: editDesc.trim() }
            : img,
        )
        persist(next as ManagedImage[])
      }
      toast.success('Image details updated.')
      setEditImage(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed. Please try again.')
    }
  }

  // ---- Replace flow ----
  const openReplace = (img: ManagedImage) => {
    setReplaceImage(img)
    setReplacePreview(null)
  }

  const handleReplaceFile = (file: File) => {
    const err = validateFile(file)
    if (err) {
      toast.error(err)
      return
    }
    setReplaceFile(file)
    readFileAsDataUrl(file)
      .then((url) => setReplacePreview(url))
      .catch(() => toast.error('Could not read file.'))
  }

  const handleReplace = async () => {
    if (!replaceImage || !replacePreview) {
      toast.error('Please select a new image.')
      return
    }
    setReplacing(true)
    try {
      const isPickleball = pickleballImages.some((img) => img.id === replaceImage.id)
      const isAccommodation = accommodationImages.some((img) => img.id === replaceImage.id)
      if (isPickleball || isAccommodation) {
        if (!replaceFile) {
          toast.error('Please select a new image.')
          return
        }
        const updated = isAccommodation
          ? await replaceAccommodationImage(replaceImage.id, replaceFile)
          : await replacePickleballImage(replaceImage.id, replaceFile)
        if (isAccommodation) {
          setAccommodationImages((prev) =>
            prev.map((img) => (img.id === updated.id ? updated : img)),
          )
        } else {
          setPickleballImages((prev) =>
            prev.map((img) => (img.id === updated.id ? updated : img)),
          )
        }
        setBrokenImageIds((current) => {
          const next = new Set(current)
          next.delete(updated.id)
          return next
        })
        toast.success('Image replaced successfully.')
        setReplaceImage(null)
        setReplaceFile(null)
        setReplacePreview(null)
      } else {
        const next = images.map((img) =>
          img.id === replaceImage.id ? { ...img, fileUrl: replacePreview } : img,
        )
        persist(next as ManagedImage[])
        toast.success('Image replaced successfully.')
        setReplaceImage(null)
        setReplacePreview(null)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Replace failed. Please try again.')
    } finally {
      setReplacing(false)
    }
  }

  // ---- Toggle status ----
  const toggleStatus = async (img: ManagedImage) => {
    const isPickleball = pickleballImages.some((i) => i.id === img.id)
    const isAccommodation = accommodationImages.some((i) => i.id === img.id)
    try {
      if (isPickleball || isAccommodation) {
        const newStatus = img.displayStatus === 'active' ? 'inactive' : 'active'
        const updated = isAccommodation
          ? await toggleAccommodationImageStatus(img.id, newStatus)
          : await togglePickleballImageStatus(img.id, newStatus)
        if (isAccommodation) {
          setAccommodationImages((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i)),
          )
        } else {
          setPickleballImages((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i)),
          )
        }
      } else {
        const next = images.map((i) =>
          i.id === img.id
            ? { ...i, displayStatus: i.displayStatus === 'active' ? 'inactive' : 'active' }
            : i,
        )
        persist(next as ManagedImage[])
      }
      toast.success(
        img.displayStatus === 'active' ? 'Image deactivated.' : 'Image activated.',
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status.')
    }
  }

  // ---- Delete flow ----
  const handleDelete = async () => {
    if (!deleteImage) return
    const isPickleball = pickleballImages.some((i) => i.id === deleteImage.id)
    const isAccommodation = accommodationImages.some((i) => i.id === deleteImage.id)
    try {
      if (isPickleball || isAccommodation) {
        const img = isAccommodation
          ? accommodationImages.find((i) => i.id === deleteImage.id)
          : pickleballImages.find((i) => i.id === deleteImage.id)
        if (isAccommodation) {
          await deleteAccommodationImage(deleteImage.id, img?.storagePath ?? '')
          setAccommodationImages((prev) => prev.filter((i) => i.id !== deleteImage.id))
        } else {
          await deletePickleballImage(deleteImage.id, img?.storagePath ?? '')
          setPickleballImages((prev) => prev.filter((i) => i.id !== deleteImage.id))
        }
      } else {
        const next = images.filter((i) => i.id !== deleteImage.id)
        persist(next as ManagedImage[])
      }
      toast.success('Image deleted.')
      setDeleteImage(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Delete failed. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Image Management</h2>
          <p className="text-sm text-muted-foreground">
            Upload and organize images for the public website galleries.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" /> Upload Image
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImageCategory)}>
        <TabsList className="inline-flex h-auto w-auto gap-1 rounded-lg bg-muted/50 p-1">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.key} value={c.key} className="rounded-md px-3 py-1.5 text-sm">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c.key} value={c.key} className="mt-6">
            {(pickleballLoading && activeTab === 'pickleball') || (accommodationLoading && activeTab === 'accommodation') ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <span className="text-sm text-muted-foreground">Loading images…</span>
                </CardContent>
              </Card>
            ) : tabImages.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-medium">No images yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload an image to get started.
                    </p>
                  </div>
                  <Button onClick={() => setUploadOpen(true)}>
                    <Upload className="h-4 w-4" /> Upload Image
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tabImages.map((img) => (
                  <Card key={img.id} className="overflow-hidden">
                    <div className="relative aspect-[4/3] bg-muted">
                      {brokenImageIds.has(img.id) ? (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
                          <ImageIcon className="h-7 w-7" />
                          <span className="text-xs">Image unavailable</span>
                        </div>
                      ) : (
                        <img
                          src={img.fileUrl}
                          alt={img.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={() =>
                            setBrokenImageIds((current) => {
                              const next = new Set(current)
                              next.add(img.id)
                              return next
                            })
                          }
                        />
                      )}
                      <span
                        className={cn(
                          'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium',
                          img.displayStatus === 'active'
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-muted/90 text-muted-foreground',
                        )}
                      >
                        {img.displayStatus === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <CardContent className="space-y-2 p-3">
                      <div>
                        <p className="font-medium leading-tight">{img.name}</p>
                        {img.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {img.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewImage(img)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(img)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReplace(img)}
                          title="Replace"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(img)}
                          title={img.displayStatus === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {img.displayStatus === 'active' ? (
                            <CircleDashed className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteImage(img)}
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => !o && resetUpload()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploadPreview ? (
                <div className="relative w-full">
                  <img
                    src={uploadPreview}
                    alt="Preview"
                    className="mx-auto max-h-48 rounded-md object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => {
                      setUploadFile(null)
                      setUploadPreview(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop an image here, or
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    JPG, PNG, WebP · max 2 MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelected(file)
                  e.target.value = ''
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-name">Image Name *</Label>
              <Input
                id="upload-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Main Bedroom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-desc">Description (optional)</Label>
              <Textarea
                id="upload-desc"
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Short description…"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetUpload} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !uploadPreview}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(o) => !o && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.name}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-3">
              <img
                src={previewImage.fileUrl}
                alt={previewImage.name}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
              {previewImage.description && (
                <p className="text-sm text-muted-foreground">{previewImage.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editImage} onOpenChange={(o) => !o && setEditImage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Image Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditImage(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Dialog */}
      <Dialog open={!!replaceImage} onOpenChange={(o) => !o && setReplaceImage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Replace Image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 p-6"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) handleReplaceFile(file)
              }}
            >
              {replacePreview ? (
                <div className="relative w-full">
                  <img
                    src={replacePreview}
                    alt="New preview"
                    className="mx-auto max-h-48 rounded-md object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => {
                      setReplacePreview(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a new image, or
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => replaceInputRef.current?.click()}
                  >
                    Browse
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    JPG, PNG, WebP · max 2 MB
                  </p>
                </>
              )}
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleReplaceFile(file)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplaceImage(null)} disabled={replacing}>
              Cancel
            </Button>
            <Button onClick={handleReplace} disabled={replacing || !replacePreview}>
              {replacing ? 'Replacing…' : 'Replace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteImage} onOpenChange={(o) => !o && setDeleteImage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Image</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete “{deleteImage?.name}”? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteImage(null)}>
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
