/**
 * QuizQuestion Component
 *
 * Renders individual quiz question with appropriate input type
 * Supports: multiple choice, true/false, short answer, essay, fill in blank
 */

import React, { useState, useEffect } from 'react';
import type { QuizQuestionForStudent } from '@/types/quiz';

interface QuizQuestionProps {
  question: QuizQuestionForStudent;
  questionNumber: number;
  totalQuestions: number;
  value: string | string[];
  onChange: (answer: string | string[]) => void;
  readonly?: boolean;
  showCorrectAnswer?: boolean;
  correctAnswer?: string | string[];
  isCorrect?: boolean | null;
  explanation?: string;
}

export function QuizQuestion({
  question,
  questionNumber,
  totalQuestions,
  value,
  onChange,
  readonly = false,
  showCorrectAnswer = false,
  correctAnswer,
  isCorrect,
  explanation,
}: QuizQuestionProps) {
  const [localValue, setLocalValue] = useState<string | string[]>(value || '');

  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);

  const handleChange = (newValue: string | string[]) => {
    if (readonly) return;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const renderQuestionHeader = () => (
    <div className="mb-4">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full text-sm font-bold">
              {questionNumber}
            </span>
            <span className="text-sm text-text-muted">
              Question {questionNumber} of {totalQuestions}
            </span>
          </div>
          <h3 className="text-lg font-medium">{question.questionText}</h3>
        </div>
        <div className="flex-shrink-0 text-sm text-text-muted">
          {question.points} {question.points === 1 ? 'point' : 'points'}
        </div>
      </div>

      {question.questionImageUrl && (
        <img
          src={question.questionImageUrl}
          alt="Question illustration"
          className="mt-3 rounded-lg max-w-full h-auto"
        />
      )}

      {/* Result indicator */}
      {readonly && isCorrect !== undefined && (
        <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
          isCorrect === null
            ? 'bg-warning/10 text-warning'
            : isCorrect
            ? 'bg-success/10 text-success'
            : 'bg-error/10 text-error'
        }`}>
          {isCorrect === null ? (
            <>
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Awaiting teacher review</span>
            </>
          ) : isCorrect ? (
            <>
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Correct!</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>Incorrect</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  const renderMultipleChoice = () => {
    const selectedOptions = Array.isArray(localValue) ? localValue : localValue ? [localValue] : [];
    const options = question.options || [];

    return (
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const isThisCorrect = showCorrectAnswer && Array.isArray(correctAnswer)
            ? correctAnswer.includes(option.id)
            : showCorrectAnswer && correctAnswer === option.id;

          return (
            <label
              key={option.id}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                readonly ? 'cursor-default' : 'hover:border-primary'
              } ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              } ${
                showCorrectAnswer && isThisCorrect
                  ? 'border-success bg-success/5'
                  : ''
              } ${
                showCorrectAnswer && isSelected && !isThisCorrect
                  ? 'border-error bg-error/5'
                  : ''
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.id}
                checked={isSelected}
                onChange={(e) => handleChange(e.target.value)}
                disabled={readonly}
                className="mt-1 w-4 h-4 text-primary"
              />
              <span className="flex-1">{option.text}</span>
              {showCorrectAnswer && isThisCorrect && (
                <svg className="w-5 h-5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </label>
          );
        })}
      </div>
    );
  };

  const renderTrueFalse = () => {
    const stringValue = Array.isArray(localValue) ? localValue[0] : localValue;

    return (
      <div className="space-y-3">
        {['true', 'false'].map((option) => {
          const isSelected = stringValue?.toLowerCase() === option;
          const isThisCorrect = showCorrectAnswer &&
            correctAnswer?.toString().toLowerCase() === option;

          return (
            <label
              key={option}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                readonly ? 'cursor-default' : 'hover:border-primary'
              } ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              } ${
                showCorrectAnswer && isThisCorrect
                  ? 'border-success bg-success/5'
                  : ''
              } ${
                showCorrectAnswer && isSelected && !isThisCorrect
                  ? 'border-error bg-error/5'
                  : ''
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={isSelected}
                onChange={(e) => handleChange(e.target.value)}
                disabled={readonly}
                className="mt-1 w-4 h-4 text-primary"
              />
              <span className="flex-1 capitalize">{option}</span>
              {showCorrectAnswer && isThisCorrect && (
                <svg className="w-5 h-5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </label>
          );
        })}
      </div>
    );
  };

  const renderShortAnswer = () => {
    const stringValue = Array.isArray(localValue) ? localValue.join('') : localValue;

    return (
      <div>
        <input
          type="text"
          value={stringValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={readonly}
          placeholder="Enter your answer..."
          className="input w-full"
          maxLength={500}
        />
        {showCorrectAnswer && correctAnswer && (
          <div className="mt-2 p-3 bg-success/10 rounded-lg">
            <div className="text-sm font-medium text-success mb-1">Correct answer:</div>
            <div className="text-sm">
              {Array.isArray(correctAnswer)
                ? correctAnswer.join(', ')
                : correctAnswer}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEssay = () => {
    const stringValue = Array.isArray(localValue) ? localValue.join('') : localValue;

    return (
      <div>
        <textarea
          value={stringValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={readonly}
          placeholder="Enter your answer... (max 10,000 characters)"
          className="input w-full min-h-[200px]"
          maxLength={10000}
        />
        <div className="mt-2 text-sm text-text-muted text-right">
          {stringValue.length} / 10,000 characters
        </div>
      </div>
    );
  };

  const renderMultipleSelect = () => {
    const selectedOptions = Array.isArray(localValue) ? localValue : localValue ? [localValue] : [];
    const options = question.options || [];

    return (
      <div className="space-y-3">
        <p className="text-sm text-text-muted mb-2">Select all that apply</p>
        {options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);
          const isThisCorrect = showCorrectAnswer && Array.isArray(correctAnswer) && correctAnswer.includes(option.id);

          return (
            <label
              key={option.id}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                readonly ? 'cursor-default' : 'hover:border-primary'
              } ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              } ${
                showCorrectAnswer && isThisCorrect
                  ? 'border-success bg-success/5'
                  : ''
              } ${
                showCorrectAnswer && isSelected && !isThisCorrect
                  ? 'border-error bg-error/5'
                  : ''
              }`}
            >
              <input
                type="checkbox"
                name={`question-${question.id}`}
                value={option.id}
                checked={isSelected}
                onChange={(e) => {
                  if (readonly) return;
                  const newValue = e.target.checked
                    ? [...selectedOptions, option.id]
                    : selectedOptions.filter(v => v !== option.id);
                  handleChange(newValue);
                }}
                disabled={readonly}
                className="mt-1 w-4 h-4 text-primary"
              />
              <span className="flex-1">{option.text}</span>
              {showCorrectAnswer && isThisCorrect && (
                <svg className="w-5 h-5 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </label>
          );
        })}
      </div>
    );
  };

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'multiple_choice':
        return renderMultipleChoice();
      case 'true_false':
        return renderTrueFalse();
      case 'short_answer':
        return renderShortAnswer();
      case 'essay':
        return renderEssay();
      case 'multiple_select':
        return renderMultipleSelect();
      default:
        return <div className="text-error">Unknown question type</div>;
    }
  };

  return (
    <div className="card">
      {renderQuestionHeader()}
      {renderQuestionInput()}

      {/* Explanation (shown after submission if available) */}
      {readonly && explanation && showCorrectAnswer && (
        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-medium text-primary mb-1">Explanation</div>
              <div className="text-sm">{explanation}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
