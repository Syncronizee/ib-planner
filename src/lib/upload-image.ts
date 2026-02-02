import { createClient } from '@/lib/supabase/client'

export async function uploadNoteImage(
  file: File,
  noteId?: string
): Promise<{ url: string; path: string } | null> {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('User not authenticated')
    return null
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    console.error('File is not an image')
    return null
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    console.error('File too large. Max size is 5MB')
    return null
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const fileName = `${timestamp}-${randomString}.${fileExt}`
  
  // Path: user_id/note_id/filename or user_id/temp/filename
  const folder = noteId || 'temp'
  const filePath = `${user.id}/${folder}/${fileName}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('note-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error.message)
    return null
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('note-images')
    .getPublicUrl(data.path)

  return {
    url: urlData.publicUrl,
    path: data.path,
  }
}

export async function deleteNoteImage(path: string): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from('note-images')
    .remove([path])

  if (error) {
    console.error('Delete error:', error.message)
    return false
  }

  return true
}

export async function moveImagesToNote(
  userId: string,
  noteId: string,
  imagePaths: string[]
): Promise<string[]> {
  const supabase = createClient()
  const newPaths: string[] = []

  for (const oldPath of imagePaths) {
    // Only move temp images
    if (!oldPath.includes('/temp/')) continue

    const fileName = oldPath.split('/').pop()
    const newPath = `${userId}/${noteId}/${fileName}`

    const { error } = await supabase.storage
      .from('note-images')
      .move(oldPath, newPath)

    if (!error) {
      newPaths.push(newPath)
    }
  }

  return newPaths
}