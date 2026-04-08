export type Ton = 'luxe' | 'familial' | 'investisseur' | 'etudiant'

export const TONS: { value: Ton; label: string }[] = [
  { value: 'luxe', label: 'Luxe' },
  { value: 'familial', label: 'Familial' },
  { value: 'investisseur', label: 'Investisseur' },
  { value: 'etudiant', label: 'Étudiant' },
]

export type Annonce = {
  id: number
  type: string
  surface: number
  pieces: number
  prix: number
  localisation: string
  pointsForts: string[]
  ton: Ton
  contenu: string | null
  createdAt: string
}

export type CreateAnnoncePayload = {
  type: string
  surface: number
  pieces: number
  prix: number
  localisation: string
  pointsForts: string[]
  ton: Ton
}
