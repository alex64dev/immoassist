<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Annonce;
use App\Service\GeminiService;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;

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
        $data->setContenu($this->geminiService->generateAnnonce($data));
        $data->setCreatedAt(new DateTimeImmutable());

        $this->em->persist($data);
        $this->em->flush();

        return $data;
    }
}
