import { browserClient } from "./client"

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

export type UploadedAttachment = {
  path: string
  name: string
  type: string
}

const sanitize = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "attachment"

export const uploadAttachment = async ({
  file,
  conversationId,
  senderId,
}: {
  file: File
  conversationId: string
  senderId: string
}): Promise<UploadedAttachment> => {
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error("File exceeds the 10 MB limit.")
  }

  const path = [
    conversationId,
    senderId,
    `${crypto.randomUUID()}-${sanitize(file.name)}`,
  ].join("/")

  const { error } = await browserClient()
    .storage.from("dm-attachments")
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error
  return {
    path,
    name: file.name,
    type: file.type || "application/octet-stream",
  }
}

const SIGNED_URL_TTL = 604800
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>()

export const getAttachmentUrl = async (path: string) => {
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url

  const { data, error } = await browserClient()
    .storage.from("dm-attachments")
    .createSignedUrl(path, SIGNED_URL_TTL)

  if (error) throw error

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_TTL * 1000,
  })
  return data.signedUrl
}

export const deleteAttachment = async (path: string) => {
  const { error } = await browserClient()
    .storage.from("dm-attachments")
    .remove([path])
  return error ?? null
}
