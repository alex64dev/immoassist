<?php

declare(strict_types=1);

namespace App\Exception;

use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;
use Throwable;

/**
 * Classe parente pour toutes les erreurs métier liées à l'API Gemini.
 *
 * Hérite de ServiceUnavailableHttpException pour qu'API Platform renvoie
 * automatiquement un HTTP 503. L'ExceptionListener (App\EventListener)
 * lit ensuite getErrorCode() pour ajouter un code métier dans le payload JSON.
 */
abstract class GeminiException extends ServiceUnavailableHttpException
{
    public function __construct(
        string $message,
        ?Throwable $previous = null,
    ) {
        parent::__construct(retryAfter: null, message: $message, previous: $previous);
    }

    /**
     * Code métier stable utilisé par le frontend pour afficher
     * un message localisé adapté.
     */
    abstract public function getErrorCode(): string;
}
