<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Annonce;
use App\Service\GeminiService;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;

use function sprintf;

/**
 * @implements ProcessorInterface<Annonce, Annonce>
 */
class AnnonceProcessor implements ProcessorInterface
{
    public function __construct(
        private readonly GeminiService $geminiService,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): Annonce
    {
        $streamId = $data->getStreamId();
        $topic = null !== $streamId && '' !== $streamId
            ? sprintf('annonce/%s', $streamId)
            : null;

        $contenu = null !== $topic
            ? $this->geminiService->streamAnnonce($data, $topic)
            : $this->geminiService->generateAnnonce($data);

        $data->setContenu($contenu);
        $data->setCreatedAt(new DateTimeImmutable());

        $this->em->persist($data);
        $this->em->flush();

        if (null !== $topic) {
            $this->geminiService->publishDone($topic, (int) $data->getId());
        }

        return $data;
    }
}
