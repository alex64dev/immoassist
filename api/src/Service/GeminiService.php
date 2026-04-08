<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Annonce;
use App\Exception\GeminiException;
use App\Exception\GeminiQuotaExceededException;
use App\Exception\GeminiUnavailableException;

use function sprintf;

use Symfony\Contracts\HttpClient\Exception\ExceptionInterface as HttpClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\HttpExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Throwable;

class GeminiService
{
    private const string ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $apiKey,
        private readonly string $primaryModel,
        private readonly ?string $fallbackModel = null,
    ) {
    }

    /**
     * Génère le contenu de l'annonce via l'API Gemini.
     *
     * Stratégie de résilience :
     * 1. Tente le modèle primaire
     * 2. Sur GeminiException (quota ou indisponibilité), si un modèle de fallback
     *    est configuré, retente avec celui-ci
     * 3. Si les deux échouent (ou pas de fallback), laisse remonter l'exception
     *    domaine, qui sera transformée en HTTP 503 + payload JSON par
     *    l'ExceptionListener.
     *
     * @throws GeminiException
     */
    public function generateAnnonce(Annonce $annonce): string
    {
        $prompt = $this->buildPrompt($annonce);

        try {
            return $this->callGemini($this->primaryModel, $prompt);
        } catch (GeminiException $e) {
            if (null === $this->fallbackModel || '' === $this->fallbackModel) {
                throw $e;
            }

            return $this->callGemini($this->fallbackModel, $prompt);
        }
    }

    /**
     * Effectue un appel à l'API Gemini pour un modèle donné et mappe les
     * erreurs HTTP / réseau / parsing en exceptions domaine.
     *
     * @throws GeminiException
     */
    private function callGemini(string $model, string $prompt): string
    {
        try {
            $response = $this->httpClient->request('POST', sprintf(self::ENDPOINT, $model), [
                'headers' => [
                    'x-goog-api-key' => $this->apiKey,
                ],
                'json' => [
                    'contents' => [
                        ['parts' => [['text' => $prompt]]],
                    ],
                    'generationConfig' => [
                        'temperature' => 0.8,
                        'maxOutputTokens' => 1024,
                        'thinkingConfig' => [
                            'thinkingBudget' => 0,
                        ],
                    ],
                ],
            ]);

            $data = $response->toArray();
        } catch (HttpExceptionInterface $e) {
            throw $this->mapHttpException($e);
        } catch (HttpClientExceptionInterface $e) {
            // Erreur transport/réseau (timeout, DNS, TLS, etc.)
            throw new GeminiUnavailableException(sprintf('Gemini API unreachable: %s', $e->getMessage()), $e);
        }

        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;

        if (null === $text || '' === $text) {
            throw new GeminiUnavailableException('Gemini returned an empty or malformed response.');
        }

        return $text;
    }

    /**
     * Mappe une exception HTTP Symfony (4xx/5xx) en exception domaine selon
     * le status code et, le cas échéant, le champ `error.status` du body Gemini.
     */
    private function mapHttpException(HttpExceptionInterface $e): GeminiException
    {
        $status = $e->getResponse()->getStatusCode();

        // Tente de lire le body Gemini pour détecter RESOURCE_EXHAUSTED même
        // sur des status codes inhabituels.
        $errorStatus = null;
        try {
            $body = $e->getResponse()->toArray(throw: false);
            $errorStatus = $body['error']['status'] ?? null;
        } catch (Throwable) {
            // body non parseable, on s'en passe
        }

        if (429 === $status || 'RESOURCE_EXHAUSTED' === $errorStatus) {
            return new GeminiQuotaExceededException(
                sprintf('Gemini quota exceeded (HTTP %d).', $status),
                $e,
            );
        }

        return new GeminiUnavailableException(
            sprintf('Gemini API error (HTTP %d).', $status),
            $e,
        );
    }

    private function buildPrompt(Annonce $annonce): string
    {
        $tonInstructions = match ($annonce->getTon()) {
            'luxe' => "Adopte un ton premium, sophistiqué, mettant en avant le prestige et l'exclusivité.",
            'familial' => 'Adopte un ton chaleureux et rassurant, parle aux familles avec enfants.',
            'investisseur' => 'Adopte un ton factuel et orienté rentabilité, mets en avant le potentiel locatif et financier.',
            'etudiant' => 'Adopte un ton dynamique et accessible, mets en avant la praticité et le rapport qualité-prix.',
            default => 'Adopte un ton professionnel et engageant.',
        };

        $pointsForts = implode(', ', $annonce->getPointsForts());

        return <<<PROMPT
Tu es un rédacteur professionnel d'annonces immobilières en France. Rédige une annonce attractive et professionnelle pour le bien suivant.

CARACTÉRISTIQUES :
- Type : {$annonce->getType()}
- Surface : {$annonce->getSurface()} m²
- Pièces : {$annonce->getPieces()}
- Prix : {$annonce->getPrix()} €
- Localisation : {$annonce->getLocalisation()}
- Points forts : {$pointsForts}

CONSIGNES :
{$tonInstructions}
- Longueur : 150 à 250 mots
- Ne pas inclure de titre, juste le corps de l'annonce
- Ne pas inventer de caractéristiques non mentionnées
- Pas de formules creuses type "à ne pas manquer", "rare opportunité"
- Mettre en valeur les points forts de manière concrète

Rédige uniquement l'annonce, sans préambule ni explication.
PROMPT;
    }
}
