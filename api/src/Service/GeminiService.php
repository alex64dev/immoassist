<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Annonce;

use function sprintf;

use Symfony\Contracts\HttpClient\HttpClientInterface;

class GeminiService
{
    private const string ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $apiKey,
        private readonly string $model,
    ) {
    }

    public function generateAnnonce(Annonce $annonce): string
    {
        $prompt = $this->buildPrompt($annonce);

        $response = $this->httpClient->request('POST', sprintf(self::ENDPOINT, $this->model), [
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

        return $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
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
