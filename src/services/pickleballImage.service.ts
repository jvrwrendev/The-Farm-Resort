import { supabase } from '@/lib/supabase'
import { mapPostgrestError } from '@/lib/errors'

export interface PickleballImageRow {
  id: string
  name: string
  description: string | null
  storage_path: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface PickleballImage {
  id: string
  name: string
  description: string
  storagePath: string
  url: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

const BUCKET = 'pickleball-images'

function normalizeStoragePath(value: string): string {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const markerIndex = value.indexOf(marker)
  if (markerIndex >= 0) {
    return decodeURIComponent(value.slice(markerIndex + marker.length))
  }
  return value.replace(/^\/+/, '').replace(new RegExp(`^${BUCKET}/`), '')
}

async function rowToImage(row: PickleballImageRow): Promise<PickleballImage> {
  const storagePath = normalizeStoragePath(row.storage_path)
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const { data: signedData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24)

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    storagePath,
    // Signed URLs also work when a bucket was accidentally created private.
    // The repaired public URL remains the fallback if signing is unavailable.
    url: signedData?.signedUrl ?? publicData.publicUrl,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listPickleballImages(): Promise<PickleballImage[]> {
  const { data, error } = await supabase
    .from('pickleball_images')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(mapPostgrestError(error))
  return Promise.all((data ?? []).map((r) => rowToImage(r as PickleballImageRow)))
}

export async function listActivePickleballImages(): Promise<PickleballImage[]> {
  const { data, error } = await supabase
    .from('pickleball_images')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw new Error(mapPostgrestError(error))
  return Promise.all((data ?? []).map((r) => rowToImage(r as PickleballImageRow)))
}

export async function uploadPickleballImage(
  file: File,
  name: string,
  description: string,
): Promise<PickleballImage> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const storagePath = uploaded?.path ?? path

  const { data, error } = await supabase
    .from('pickleball_images')
    .insert({
      name,
      description: description || null,
      storage_path: storagePath,
      status: 'active',
    })
    .select('*')
    .single()
  if (error) {
    // cleanup uploaded file
    await supabase.storage.from(BUCKET).remove([storagePath])
    throw new Error(mapPostgrestError(error))
  }
  return await rowToImage(data as PickleballImageRow)
}

export async function updatePickleballImage(
  id: string,
  updates: { name?: string; description?: string },
): Promise<PickleballImage> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.name !== undefined) patch.name = updates.name
  if (updates.description !== undefined) patch.description = updates.description || null

  const { data, error } = await supabase
    .from('pickleball_images')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return await rowToImage(data as PickleballImageRow)
}

export async function replacePickleballImage(id: string, file: File): Promise<PickleballImage> {
  // get old path
  const { data: existing, error: fetchErr } = await supabase
    .from('pickleball_images')
    .select('storage_path')
    .eq('id', id)
    .single()
  if (fetchErr) throw new Error(mapPostgrestError(fetchErr))
  const oldPath = normalizeStoragePath((existing as { storage_path: string }).storage_path)

  const ext = file.name.split('.').pop() || 'jpg'
  const newPath = `${crypto.randomUUID()}.${ext}`
  const { data: uploaded, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, file, { upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const uploadedPath = uploaded?.path ?? newPath

  const { data, error } = await supabase
    .from('pickleball_images')
    .update({ storage_path: uploadedPath, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([uploadedPath])
    throw new Error(mapPostgrestError(error))
  }
  // remove old file
  if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])
  return await rowToImage(data as PickleballImageRow)
}

export async function togglePickleballImageStatus(id: string, status: 'active' | 'inactive'): Promise<PickleballImage> {
  const { data, error } = await supabase
    .from('pickleball_images')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return await rowToImage(data as PickleballImageRow)
}

export async function deletePickleballImage(id: string, storagePath: string): Promise<void> {
  const { error } = await supabase.from('pickleball_images').delete().eq('id', id)
  if (error) throw new Error(mapPostgrestError(error))
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([normalizeStoragePath(storagePath)])
  }
}
