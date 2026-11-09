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

function rowToImage(row: PickleballImageRow): PickleballImage {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(row.storage_path)
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    storagePath: row.storage_path,
    url: data.publicUrl,
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
  return (data ?? []).map((r) => rowToImage(r as PickleballImageRow))
}

export async function listActivePickleballImages(): Promise<PickleballImage[]> {
  const { data, error } = await supabase
    .from('pickleball_images')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw new Error(mapPostgrestError(error))
  return (data ?? []).map((r) => rowToImage(r as PickleballImageRow))
}

export async function uploadPickleballImage(
  file: File,
  name: string,
  description: string,
): Promise<PickleballImage> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })
  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from('pickleball_images')
    .insert({
      name,
      description: description || null,
      storage_path: path,
      status: 'active',
    })
    .select('*')
    .single()
  if (error) {
    // cleanup uploaded file
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(mapPostgrestError(error))
  }
  return rowToImage(data as PickleballImageRow)
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
  return rowToImage(data as PickleballImageRow)
}

export async function replacePickleballImage(id: string, file: File): Promise<PickleballImage> {
  // get old path
  const { data: existing, error: fetchErr } = await supabase
    .from('pickleball_images')
    .select('storage_path')
    .eq('id', id)
    .single()
  if (fetchErr) throw new Error(mapPostgrestError(fetchErr))
  const oldPath = (existing as { storage_path: string }).storage_path

  const ext = file.name.split('.').pop() || 'jpg'
  const newPath = `${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, file, { upsert: false })
  if (uploadError) throw new Error(uploadError.message)

  const { data, error } = await supabase
    .from('pickleball_images')
    .update({ storage_path: newPath, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([newPath])
    throw new Error(mapPostgrestError(error))
  }
  // remove old file
  if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])
  return rowToImage(data as PickleballImageRow)
}

export async function togglePickleballImageStatus(id: string, status: 'active' | 'inactive'): Promise<PickleballImage> {
  const { data, error } = await supabase
    .from('pickleball_images')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(mapPostgrestError(error))
  return rowToImage(data as PickleballImageRow)
}

export async function deletePickleballImage(id: string, storagePath: string): Promise<void> {
  const { error } = await supabase.from('pickleball_images').delete().eq('id', id)
  if (error) throw new Error(mapPostgrestError(error))
  if (storagePath) await supabase.storage.from(BUCKET).remove([storagePath])
}
