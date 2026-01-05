"use client";

import { useState } from "react";

interface Quiz {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
}

interface QuizViewerProps {
  quizzes: Quiz[];
}

export default function QuizViewer({ quizzes }: QuizViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  if (quizzes.length === 0) {
    return (
      <div className="text-center text-ink/60 py-8">
        No quiz questions available. Generate some first!
      </div>
    );
  }

  const currentQuiz = quizzes[currentIndex];

  const handleSelectAnswer = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    
    setIsAnswered(true);
    setAnsweredCount((prev) => prev + 1);
    
    if (selectedAnswer === currentQuiz.correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => (prev + 1) % quizzes.length);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setAnsweredCount(0);
  };

  return (
    <div className="space-y-6">
      {/* Progress and Score */}
      <div className="flex justify-between items-center text-sm text-ink/60">
        <div>
          Question {currentIndex + 1} of {quizzes.length}
        </div>
        <div>
          Score: {score} / {answeredCount}
        </div>
      </div>

      {/* Question */}
      <div className="bg-surface border border-ink/10 rounded-xl p-6">
        <p className="text-lg font-semibold text-ink mb-6">
          {currentQuiz.question}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {currentQuiz.options.map((option, index) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === currentQuiz.correctAnswer;
            const showCorrect = isAnswered && isCorrect;
            const showIncorrect = isAnswered && isSelected && !isCorrect;

            return (
              <button
                key={index}
                onClick={() => handleSelectAnswer(option)}
                disabled={isAnswered}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                  showCorrect
                    ? "bg-green-100 border-green-500 text-green-800"
                    : showIncorrect
                    ? "bg-red-100 border-red-500 text-red-800"
                    : isSelected
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-background border-ink/20 text-ink hover:border-accent/50"
                } ${isAnswered ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{option}</span>
                  {showCorrect && <span className="ml-auto">✓</span>}
                  {showIncorrect && <span className="ml-auto">✗</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {isAnswered && currentQuiz.explanation && (
          <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
            <p className="text-sm font-semibold text-accent mb-2">
              Explanation:
            </p>
            <p className="text-sm text-ink">{currentQuiz.explanation}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {!isAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="px-8 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Answer
          </button>
        ) : (
          <>
            {currentIndex < quizzes.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors"
              >
                Next Question →
              </button>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-xl font-semibold text-ink">
                  Quiz Complete! 🎉
                </div>
                <div className="text-lg text-ink/70">
                  Final Score: {score} / {answeredCount} (
                  {answeredCount > 0 ? ((score / answeredCount) * 100).toFixed(0) : 0}%)
                </div>
                <button
                  onClick={handleReset}
                  className="px-8 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors"
                >
                  Restart Quiz
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
