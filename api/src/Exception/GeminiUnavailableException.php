<?php

declare(strict_types=1);

namespace App\Exception;

/**
 * Levée pour toute autre erreur de l'API Gemini : 5xx (panne côté Google),
 * 401/403 (clé invalide), timeout réseau, réponse mal formée, etc.
 */
final class GeminiUnavailableException extends GeminiException
{
    public const string ERROR_CODE = 'GEMINI_UNAVAILABLE';

    public function getErrorCode(): string
    {
        return self::ERROR_CODE;
    }
}
