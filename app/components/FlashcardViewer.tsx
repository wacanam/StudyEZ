"use client";

import { useState } from "react";

interface Flashcard {
  id: number;
  question: string;
  answer: string;
}

interface FlashcardViewerProps {
  flashcards: Flashcard[];
}

export default function FlashcardViewer({ flashcards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (flashcards.length === 0) {
    return (
      <div className="text-center text-ink/60 py-8">
        No flashcards available. Generate some first!
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="space-y-6">
      {/* Card Counter */}
      <div className="text-center text-sm text-ink/60">
        Card {currentIndex + 1} of {flashcards.length}
      </div>

      {/* Flashcard */}
      <div
        className="relative h-64 cursor-pointer"
        onClick={handleFlip}
        style={{ perspective: "1000px" }}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 ${
            isFlipped ? "rotate-y-180" : ""
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front of card */}
          <div
            className="absolute w-full h-full backface-hidden bg-accent text-white rounded-xl p-8 flex items-center justify-center text-center shadow-lg"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div>
              <p className="text-sm opacity-75 mb-4">Question</p>
              <p className="text-xl font-semibold">{currentCard.question}</p>
            </div>
          </div>

          {/* Back of card */}
          <div
            className="absolute w-full h-full backface-hidden bg-surface border-2 border-accent rounded-xl p-8 flex items-center justify-center text-center shadow-lg"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div>
              <p className="text-sm text-ink/60 mb-4">Answer</p>
              <p className="text-xl font-semibold text-ink">{currentCard.answer}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className="text-center text-sm text-ink/50">
        Click card to flip
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handlePrevious}
          disabled={flashcards.length <= 1}
          className="px-6 py-2 bg-surface border border-ink/20 text-ink font-medium rounded-lg hover:bg-ink/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          disabled={flashcards.length <= 1}
          className="px-6 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
