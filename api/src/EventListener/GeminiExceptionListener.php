<?php

declare(strict_types=1);

namespace App\EventListener;

use App\Exception\GeminiException;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Intercepte les GeminiException levées par GeminiService et les transforme
 * en réponse JSON contenant un code métier stable que le frontend peut
 * inspecter pour afficher un message localisé adapté.
 *
 * Format de la réponse :
 * {
 *   "code":   "GEMINI_QUOTA_EXCEEDED" | "GEMINI_UNAVAILABLE",
 *   "detail": "<message technique pour log/debug>",
 *   "status": 503
 * }
 */
#[AsEventListener(event: KernelEvents::EXCEPTION, priority: 255)]
final class GeminiExceptionListener
{
    public function __invoke(ExceptionEvent $event): void
    {
        $exception = $event->getThrowable();

        if (!$exception instanceof GeminiException) {
            return;
        }

        $event->setResponse(new JsonResponse(
            [
                'code' => $exception->getErrorCode(),
                'detail' => $exception->getMessage(),
                'status' => $exception->getStatusCode(),
            ],
            $exception->getStatusCode(),
            $exception->getHeaders(),
        ));

        // Empêche API Platform d'écraser notre réponse avec son format Hydra.
        $event->stopPropagation();
    }
}
