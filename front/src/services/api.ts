import type { Annonce, CreateAnnoncePayload } from '@/types/annonce'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8088/api'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
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
    try {
      const data = await response.json()
      detail = data['hydra:description'] ?? data.detail ?? detail
    } catch {
      // ignore parse errors
    }
    throw new ApiError(detail, response.status)
  }

  return (await response.json()) as Annonce
}
