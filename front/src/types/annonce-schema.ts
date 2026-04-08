import { z } from 'zod'

import type { CreateAnnoncePayload } from '@/types/annonce'

export const TONS_VALUES = ['luxe', 'familial', 'investisseur', 'etudiant'] as const

export const annonceFormSchema = z.object({
  type: z
    .string()
    .min(2, 'Le type est requis')
    .max(50, '50 caractères maximum'),
  surface: z.coerce
    .number({ message: 'Surface invalide' })
    .int('Nombre entier attendu')
    .positive('La surface doit être positive'),
  pieces: z.coerce
    .number({ message: 'Nombre invalide' })
    .int('Nombre entier attendu')
    .min(1, 'Au moins 1 pièce')
    .max(15, '15 pièces maximum'),
  prix: z.coerce
    .number({ message: 'Prix invalide' })
    .int('Nombre entier attendu')
    .min(10000, 'Prix minimum 10 000 €')
    .max(100_000_000, 'Prix maximum 100 M€'),
  localisation: z
    .string()
    .min(2, 'La localisation est requise')
    .max(255, '255 caractères maximum'),
  pointsForts: z
    .array(
      z.object({
        value: z
          .string()
          .min(2, 'Au moins 2 caractères')
          .max(80, '80 caractères maximum'),
      }),
    )
    .min(1, 'Au moins un point fort')
    .max(5, '5 points forts maximum'),
  ton: z.enum(TONS_VALUES, { message: 'Ton invalide' }),
})

export type AnnonceFormValues = z.infer<typeof annonceFormSchema>

/**
 * Transforme les valeurs du formulaire (avec pointsForts en objets)
 * en payload API (avec pointsForts en string[]).
 */
export function toCreatePayload(
  values: AnnonceFormValues,
): CreateAnnoncePayload {
  return {
    ...values,
    pointsForts: values.pointsForts.map((p) => p.value),
  }
}
