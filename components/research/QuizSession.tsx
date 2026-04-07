import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, XIcon } from '../icons';
import { QaConfig, ResearchResource } from '../../types';
import { generateQuizQuestion, validateQuizAnswer } from '../../services/researchAiService';

interface QuizSessionProps {
  config: QaConfig;
  resources: ResearchResource[];
  onComplete: (reportHtml: string) => void;
  onClose: () => void;
}

interface QuizAnswer {
  player: string;
  question: string;
  playerAnswer: string;
  correct: boolean;
  correctAnswer: string;
  explanation: string;
}

interface PlayerScore {
  name: string;
  correct: number;
  total: number;
}

type Phase = 'question' | 'answer-input' | 'validating' | 'feedback' | 'complete';

export const QuizSession: React.FC<QuizSessionProps> = ({
  config,
  resources,
  onComplete,
  onClose,
}) => {
  const players = (config.playerNames || []).filter(n => n.trim()) || ['Player 1'];
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [playerAnswer, setPlayerAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; correctAnswer: string; explanation: string } | null>(null);
  const [history, setHistory] = useState<QuizAnswer[]>([]);
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [scores, setScores] = useState<PlayerScore[]>(
    players.map(name => ({ name, correct: 0, total: 0 }))
  );
  const [timer, setTimer] = useState<number | null>(config.timerEnabled ? 30 : null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);

  const currentPlayer = players[currentPlayerIdx];

  // Load first question
  useEffect(() => {
    loadQuestion();
  }, []);

  // Timer
  useEffect(() => {
    if (!config.timerEnabled || phase !== 'answer-input') return;
    setTimer(30);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitAnswer('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const loadQuestion = async () => {
    setPhase('question');
    setPlayerAnswer('');
    setFeedback(null);
    try {
      const q = await generateQuizQuestion(config, resources, currentPlayer, questionHistory);
      setCurrentQuestion(q);
      setQuestionHistory(prev => [...prev, q]);
      setPhase('answer-input');
      setTimeout(() => answerRef.current?.focus(), 100);
    } catch {
      setCurrentQuestion('Oops — could not load a question. Check your API key in Settings.');
      setPhase('answer-input');
    }
  };

  const handleSubmitAnswer = async (ans?: string) => {
    const answer = (ans !== undefined ? ans : playerAnswer).trim();
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('validating');
    const result = await validateQuizAnswer(currentQuestion, answer, resources);
    setFeedback(result);

    const record: QuizAnswer = {
      player: currentPlayer,
      question: currentQuestion,
      playerAnswer: answer || '(no answer)',
      correct: result.correct,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation,
    };
    setHistory(prev => [...prev, record]);
    setScores(prev =>
      prev.map(s =>
        s.name === currentPlayer
          ? { ...s, correct: s.correct + (result.correct ? 1 : 0), total: s.total + 1 }
          : s
      )
    );
    setPhase('feedback');
  };

  const handleNext = () => {
    const nextIdx = (currentPlayerIdx + 1) % players.length;
    setCurrentPlayerIdx(nextIdx);
    loadQuestion();
  };

  const handleEndQuiz = () => {
    const reportHtml = buildReport();
    onComplete(reportHtml);
  };

  const buildReport = () => {
    const leaderboard =
      players.length > 1
        ? `<h3 style="color:#059669;margin-top:1.5em">🏆 Leaderboard</h3>
<table style="border-collapse:collapse;width:100%;margin-bottom:1em">
  <tr style="background:#d1fae5"><th style="padding:8px;border:1px solid #a7f3d0;text-align:left">Player</th><th style="padding:8px;border:1px solid #a7f3d0">Score</th><th style="padding:8px;border:1px solid #a7f3d0">%</th></tr>
  ${[...scores]
    .sort((a, b) => b.correct - a.correct)
    .map(
      s =>
        `<tr><td style="padding:8px;border:1px solid #a7f3d0">${s.name}</td><td style="padding:8px;border:1px solid #a7f3d0;text-align:center">${s.correct}/${s.total}</td><td style="padding:8px;border:1px solid #a7f3d0;text-align:center">${s.total ? Math.round((s.correct / s.total) * 100) : 0}%</td></tr>`
    )
    .join('')}
</table>`
        : '';

    const audit = history
      .map(
        (h, i) => `
<div style="margin:1em 0;padding:1em;border-left:4px solid ${h.correct ? '#059669' : '#dc2626'};background:${h.correct ? '#f0fdf4' : '#fef2f2'}">
  <p><strong>${h.player} — Q${i + 1}:</strong> ${h.question}</p>
  <p><em>Answer given:</em> ${h.playerAnswer}</p>
  ${!h.correct ? `<p style="color:#059669"><em>Correct answer:</em> ${h.correctAnswer}</p>` : ''}
  ${!h.correct ? `<p style="color:#6b7280;font-size:0.9em"><em>Explanation:</em> ${h.explanation}</p>` : ''}
</div>`
      )
      .join('');

    return `<h2 style="color:#6366f1">Quiz Results</h2>${leaderboard}<h3>📋 Full Audit Trail</h3>${audit}`;
  };

  const timerColor = timer !== null && timer <= 10 ? 'text-red-500' : 'text-emerald-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div
        className="relative w-full max-w-xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎮</span>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Quiz Session</p>
              <p className="font-bold text-gray-900 dark:text-white text-sm">
                {currentPlayer}'s turn
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {timer !== null && phase === 'answer-input' && (
              <div className={`text-2xl font-black tabular-nums ${timerColor}`}>
                {timer}s
              </div>
            )}
            <button
              onClick={handleEndQuiz}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
            >
              End Quiz
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Score bar */}
        <div className="flex gap-3 px-5 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {scores.map(s => (
            <div key={s.name} className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              s.name === currentPlayer
                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {s.name}: {s.correct}/{s.total}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Question */}
          {(phase === 'question') && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="text-sm font-medium">Generating question…</span>
              </div>
            </div>
          )}

          {(phase === 'answer-input' || phase === 'validating' || phase === 'feedback') && (
            <>
              <div className="p-4 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-xl border border-violet-200 dark:border-violet-700/50">
                <p className="text-xs font-bold text-violet-500 dark:text-violet-400 mb-1.5 uppercase tracking-wider">Question</p>
                <p className="text-gray-900 dark:text-white font-medium leading-relaxed">{currentQuestion}</p>
              </div>

              {phase === 'answer-input' && (
                <div className="space-y-3">
                  <textarea
                    ref={answerRef}
                    value={playerAnswer}
                    onChange={e => setPlayerAnswer(e.target.value)}
                    rows={3}
                    placeholder={`${currentPlayer}, type your answer here…`}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmitAnswer(); }}
                  />
                  <button
                    onClick={() => handleSubmitAnswer()}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all active:scale-95"
                  >
                    Submit Answer
                  </button>
                </div>
              )}

              {phase === 'validating' && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="text-sm font-medium">Checking answer…</span>
                  </div>
                </div>
              )}

              {phase === 'feedback' && feedback && (
                <div className={`p-4 rounded-xl border ${
                  feedback.correct
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                    : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {feedback.correct ? (
                      <>
                        <span className="text-2xl">✅</span>
                        <p className="font-bold text-emerald-700 dark:text-emerald-300">Correct!</p>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">❌</span>
                        <p className="font-bold text-red-700 dark:text-red-300">Incorrect</p>
                      </>
                    )}
                  </div>
                  {!feedback.correct && (
                    <>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mb-1">
                        <strong>Correct answer:</strong> {feedback.correctAnswer}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{feedback.explanation}</p>
                    </>
                  )}
                  {(() => {
                    const isLastQuestion = config.questionsPerPlayer && history.length >= players.length * config.questionsPerPlayer;
                    return (
                      <button
                        onClick={isLastQuestion ? handleEndQuiz : handleNext}
                        className="mt-3 w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 transition-all text-sm"
                      >
                        {isLastQuestion ? 'Finish Quiz' : 'Next Question →'}
                      </button>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
