<?php

declare(strict_types=1);

namespace App\Exception;

/**
 * Levée quand l'API Gemini renvoie HTTP 429 ou un body avec
 * `error.status === 'RESOURCE_EXHAUSTED'`, indiquant que le quota
 * gratuit (free tier) est atteint pour le modèle utilisé.
 */
final class GeminiQuotaExceededException extends GeminiException
{
    public const string ERROR_CODE = 'GEMINI_QUOTA_EXCEEDED';

    public function getErrorCode(): string
    {
        return self::ERROR_CODE;
    }
}
