import { useState } from 'react'

import { AnnonceForm } from '@/components/annonce/AnnonceForm'
import { AnnonceResult } from '@/components/annonce/AnnonceResult'
import { ModeToggle } from '@/components/mode-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { ApiError, createAnnonce } from '@/services/api'
import type { Annonce } from '@/types/annonce'
import { toCreatePayload, type AnnonceFormValues } from '@/types/annonce-schema'
import { toast } from 'sonner'

type ResultState = 'idle' | 'loading' | 'success'

function App() {
  const [resultState, setResultState] = useState<ResultState>('idle')
  const [annonce, setAnnonce] = useState<Annonce | null>(null)

  const handleSubmit = async (values: AnnonceFormValues) => {
    setResultState('loading')
    try {
      const payload = toCreatePayload(values)
      const created = await createAnnonce(payload)
      setAnnonce(created)
      setResultState('success')
    } catch (err) {
      setResultState('idle')
      const message =
        err instanceof ApiError
          ? `Erreur ${err.status} : ${err.message}`
          : 'Impossible de générer l\'annonce. Réessaye dans un instant.'
      toast.error(message)
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
          <ModeToggle />
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
                isSubmitting={resultState === 'loading'}
              />
            </CardContent>
          </Card>

          <AnnonceResult state={resultState} annonce={annonce} />
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}

export default App
