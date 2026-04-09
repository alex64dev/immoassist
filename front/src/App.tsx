import { useState } from 'react'

import { AnnonceForm } from '@/components/annonce/AnnonceForm'
import { AnnonceHistory } from '@/components/annonce/AnnonceHistory'
import { AnnonceResult } from '@/components/annonce/AnnonceResult'
import { ModeToggle } from '@/components/mode-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { useAnnonceGeneration } from '@/hooks/useAnnonceGeneration'
import { ApiError } from '@/services/api'
import type { Annonce } from '@/types/annonce'
import {
  toCreatePayload,
  toFormInput,
  type AnnonceFormInput,
  type AnnonceFormValues,
} from '@/types/annonce-schema'
import { toast } from 'sonner'

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'GEMINI_QUOTA_EXCEEDED':
        return "Le quota gratuit de l'API Gemini est atteint pour aujourd'hui. Réessaye plus tard."
      case 'GEMINI_UNAVAILABLE':
        return 'Le service de génération est temporairement indisponible. Réessaye dans un instant.'
      default:
        return `Erreur ${err.status} : ${err.message}`
    }
  }
  return "Impossible de générer l'annonce. Réessaye dans un instant."
}

function App() {
  const { state, streamingText, annonce, generate, selectAnnonce } =
    useAnnonceGeneration()
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [formInitialValues, setFormInitialValues] =
    useState<AnnonceFormInput | null>(null)

  const handleHistorySelect = (selected: Annonce) => {
    selectAnnonce(selected)
    setFormInitialValues(toFormInput(selected))
  }

  const handleRegenerate = async () => {
    if (!annonce) return
    try {
      await generate({
        type: annonce.type,
        surface: annonce.surface,
        pieces: annonce.pieces,
        prix: annonce.prix,
        localisation: annonce.localisation,
        pointsForts: annonce.pointsForts,
        ton: annonce.ton,
      })
      setHistoryRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleSubmit = async (values: AnnonceFormValues) => {
    try {
      await generate(toCreatePayload(values))
      setHistoryRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">ImmoAssist</h1>
            <p className="text-muted-foreground text-sm">
              Générateur d'annonces immobilières propulsé par l'IA
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AnnonceHistory
              refreshKey={historyRefreshKey}
              onSelect={handleHistorySelect}
            />
            <ModeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Caractéristiques du bien</CardTitle>
            </CardHeader>
            <CardContent>
              <AnnonceForm
                onSubmit={handleSubmit}
                isSubmitting={state === 'streaming'}
                initialValues={formInitialValues}
              />
            </CardContent>
          </Card>

          <AnnonceResult
            state={state}
            annonce={annonce}
            streamingText={streamingText}
            onRegenerate={handleRegenerate}
          />
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}

export default App
