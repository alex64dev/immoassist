<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\Annonce;
use App\Exception\GeminiQuotaExceededException;
use App\Exception\GeminiUnavailableException;
use App\Service\GeminiService;

use const JSON_THROW_ON_ERROR;

use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;
use Symfony\Component\Mercure\HubInterface;

final class GeminiServiceTest extends TestCase
{
    private const string FAKE_API_KEY = 'fake-api-key';
    private const string PRIMARY_MODEL = 'gemini-2.5-flash';
    private const string FALLBACK_MODEL = 'gemini-2.5-flash-lite';

    private function makeAnnonce(): Annonce
    {
        return (new Annonce())
            ->setType('appartement')
            ->setSurface(75)
            ->setPieces(3)
            ->setPrix(250000)
            ->setLocalisation('Paris 11e')
            ->setPointsForts(['parquet', 'balcon', 'calme'])
            ->setTon('familial');
    }

    /**
     * @param list<MockResponse> $responses
     */
    private function makeService(array $responses, ?string $fallback = self::FALLBACK_MODEL): GeminiService
    {
        $httpClient = new MockHttpClient($responses);

        return new GeminiService(
            httpClient: $httpClient,
            hub: $this->createMock(HubInterface::class),
            apiKey: self::FAKE_API_KEY,
            primaryModel: self::PRIMARY_MODEL,
            fallbackModel: $fallback,
        );
    }

    private function geminiSuccessBody(string $text): string
    {
        return json_encode([
            'candidates' => [
                ['content' => ['parts' => [['text' => $text]]]],
            ],
        ], JSON_THROW_ON_ERROR);
    }

    #[Test]
    public function itReturnsTextWhenPrimaryModelSucceeds(): void
    {
        $service = $this->makeService([
            new MockResponse($this->geminiSuccessBody('Belle annonce générée.'), [
                'http_code' => 200,
            ]),
        ]);

        $result = $service->generateAnnonce($this->makeAnnonce());

        self::assertSame('Belle annonce générée.', $result);
    }

    #[Test]
    public function itFallsBackToSecondaryModelWhenPrimaryReturns429(): void
    {
        $service = $this->makeService([
            // Primary : quota épuisé
            new MockResponse(
                json_encode(['error' => ['status' => 'RESOURCE_EXHAUSTED']], JSON_THROW_ON_ERROR),
                ['http_code' => 429],
            ),
            // Fallback : succès
            new MockResponse($this->geminiSuccessBody('Annonce du fallback.'), [
                'http_code' => 200,
            ]),
        ]);

        $result = $service->generateAnnonce($this->makeAnnonce());

        self::assertSame('Annonce du fallback.', $result);
    }

    #[Test]
    public function itThrowsQuotaExceptionWhenBothModelsAreExhausted(): void
    {
        $service = $this->makeService([
            new MockResponse('{"error":{"status":"RESOURCE_EXHAUSTED"}}', ['http_code' => 429]),
            new MockResponse('{"error":{"status":"RESOURCE_EXHAUSTED"}}', ['http_code' => 429]),
        ]);

        $this->expectException(GeminiQuotaExceededException::class);

        $service->generateAnnonce($this->makeAnnonce());
    }

    #[Test]
    public function itThrowsUnavailableExceptionOn5xxWithoutFallback(): void
    {
        $service = $this->makeService(
            responses: [
                new MockResponse('{"error":"upstream"}', ['http_code' => 503]),
            ],
            fallback: null,
        );

        $this->expectException(GeminiUnavailableException::class);

        $service->generateAnnonce($this->makeAnnonce());
    }

    #[Test]
    public function itFallsBackOn5xxWhenFallbackIsConfigured(): void
    {
        $service = $this->makeService([
            new MockResponse('{"error":"upstream"}', ['http_code' => 503]),
            new MockResponse($this->geminiSuccessBody('Récupéré via fallback.'), [
                'http_code' => 200,
            ]),
        ]);

        $result = $service->generateAnnonce($this->makeAnnonce());

        self::assertSame('Récupéré via fallback.', $result);
    }

    #[Test]
    public function itThrowsUnavailableExceptionOnEmptyResponse(): void
    {
        $service = $this->makeService(
            responses: [
                new MockResponse(json_encode(['candidates' => []], JSON_THROW_ON_ERROR), [
                    'http_code' => 200,
                ]),
            ],
            fallback: null,
        );

        $this->expectException(GeminiUnavailableException::class);

        $service->generateAnnonce($this->makeAnnonce());
    }

    #[Test]
    public function quotaExceptionCarriesTheCorrectErrorCode(): void
    {
        $exception = new GeminiQuotaExceededException('test');

        self::assertSame('GEMINI_QUOTA_EXCEEDED', $exception->getErrorCode());
        self::assertSame(503, $exception->getStatusCode());
    }

    #[Test]
    public function unavailableExceptionCarriesTheCorrectErrorCode(): void
    {
        $exception = new GeminiUnavailableException('test');

        self::assertSame('GEMINI_UNAVAILABLE', $exception->getErrorCode());
        self::assertSame(503, $exception->getStatusCode());
    }
}
