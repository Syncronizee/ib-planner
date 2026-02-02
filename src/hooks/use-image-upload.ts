import { useState } from 'react'
import { uploadNoteImage, deleteNoteImage } from '@/lib/upload-image'

export function useImageUpload(noteId?: string) {
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<{ url: string; path: string }[]>([])

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true)
    
    try {
      const result = await uploadNoteImage(file, noteId)
      
      if (result) {
        setUploadedImages(prev => [...prev, result])
        return result.url
      }
      
      return null
    } catch (error) {
      console.error('Upload failed:', error)
      return null
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (src: string): Promise<boolean> => {
    // Find the image in our uploaded list
    const image = uploadedImages.find(img => img.url === src)
    
    if (image) {
      const success = await deleteNoteImage(image.path)
      
      if (success) {
        setUploadedImages(prev => prev.filter(img => img.url !== src))
        return true
      }
    }
    
    return false
  }

  const clearUploaded = () => {
    setUploadedImages([])
  }

  return {
    upload,
    deleteImage,
    uploading,
    uploadedImages,
    clearUploaded,
  }
}