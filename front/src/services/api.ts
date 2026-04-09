import type { Annonce, CreateAnnoncePayload } from '@/types/annonce'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8088/api'

export class ApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(message: string, status: number, code: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function createAnnonce(
  payload: CreateAnnoncePayload,
): Promise<Annonce> {
  const response = await fetch(`${API_URL}/annonces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/ld+json',
      Accept: 'application/ld+json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let detail = response.statusText
    let code: string | null = null
    try {
      const data = await response.json()
      // Format de notre GeminiExceptionListener : { code, detail, status }
      // Format Hydra par défaut d'API Platform : { 'hydra:description', detail }
      code = typeof data.code === 'string' ? data.code : null
      detail =
        data['hydra:description'] ?? data.detail ?? data.message ?? detail
    } catch {
      // ignore parse errors
    }
    throw new ApiError(detail, response.status, code)
  }

  return (await response.json()) as Annonce
}

type HydraCollection<T> = {
  'hydra:member'?: T[]
  member?: T[]
}

export async function deleteAnnonce(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/annonces/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok && response.status !== 204) {
    throw new ApiError(response.statusText, response.status)
  }
}

export async function listAnnonces(): Promise<Annonce[]> {
  const response = await fetch(`${API_URL}/annonces?order[createdAt]=desc`, {
    headers: {
      Accept: 'application/ld+json',
    },
  })

  if (!response.ok) {
    throw new ApiError(response.statusText, response.status)
  }

  const data = (await response.json()) as HydraCollection<Annonce>
  return data['hydra:member'] ?? data.member ?? []
}
