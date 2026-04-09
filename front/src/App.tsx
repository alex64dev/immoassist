import { AnnonceForm } from '@/components/annonce/AnnonceForm'
import { AnnonceResult } from '@/components/annonce/AnnonceResult'
import { ModeToggle } from '@/components/mode-toggle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Toaster } from '@/components/ui/sonner'
import { useAnnonceGeneration } from '@/hooks/useAnnonceGeneration'
import { ApiError } from '@/services/api'
import { toCreatePayload, type AnnonceFormValues } from '@/types/annonce-schema'
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
  const { state, streamingText, annonce, generate } = useAnnonceGeneration()

  const handleSubmit = async (values: AnnonceFormValues) => {
    try {
      await generate(toCreatePayload(values))
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
                isSubmitting={state === 'streaming'}
              />
            </CardContent>
          </Card>

          <AnnonceResult
            state={state}
            annonce={annonce}
            streamingText={streamingText}
          />
        </div>
      </main>

      <Toaster richColors position="bottom-right" />
    </div>
  )
}

export default App
