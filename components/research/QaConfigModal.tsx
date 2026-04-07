import React, { useState } from 'react';
import { XIcon } from '../icons';
import { QaConfig, QaMode, TruthSource, QuestionType, ResearchResource } from '../../types';
import { generateTest } from '../../services/researchAiService';

interface QaConfigModalProps {
  resources: ResearchResource[];
  onInsertTest: (html: string) => void;
  onStartQuiz: (config: QaConfig) => void;
  onClose: () => void;
}

export const QaConfigModal: React.FC<QaConfigModalProps> = ({
  resources,
  onInsertTest,
  onStartQuiz,
  onClose,
}) => {
  const [mode, setMode] = useState<QaMode>('test');
  const [truthSource, setTruthSource] = useState<TruthSource>('resource');
  const [topic, setTopic] = useState('');
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    resources.filter(r => r.content).map(r => r.id)
  );
  const [kSelected, setKSelected] = useState(true);
  const [cSelected, setCSelected] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1', 'Player 2', '', '']);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [answerPlacement, setAnswerPlacement] = useState<'along' | 'under'>('along');
  const [questionsPerPlayer, setQuestionsPerPlayer] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const derivedQuestionType: QuestionType = (kSelected && cSelected) ? 'mixed' : kSelected ? 'knowledge' : cSelected ? 'comprehension' : 'knowledge';

  const updatePlayerName = (i: number, val: string) => {
    const names = [...playerNames];
    names[i] = val;
    setPlayerNames(names);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    const config: QaConfig = {
      mode,
      truthSource,
      topic: truthSource === 'topic' ? topic : undefined,
      selectedResourceIds,
      questionType: derivedQuestionType,
      questionCount,
      playerCount,
      playerNames: playerNames.slice(0, playerCount).filter(n => n.trim()),
      timerEnabled,
      includeAnswers,
      answerPlacement,
      questionsPerPlayer,
    };
    try {
      if (mode === 'test') {
        const html = await generateTest(config, resources);
        onInsertTest(html);
        onClose();
      } else {
        onStartQuiz(config);
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || 'Failed. Check your API key in Settings.');
    } finally {
      setGenerating(false);
    }
  };

  const textResources = resources.filter(r => r.content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🎯</span> Q&A / Quiz
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-5">
          {/* Mode */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['test', 'quiz'] as QaMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all ${
                    mode === m
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                  }`}
                >
                  {m === 'test' ? '📝 Test' : '🎮 Quiz'}
                </button>
              ))}
            </div>
          </div>

          {/* Truth Source */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Truth Source</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(['topic', 'resource'] as TruthSource[]).map(ts => (
                <button
                  key={ts}
                  onClick={() => setTruthSource(ts)}
                  className={`py-2 rounded-xl border text-xs font-semibold capitalize transition-all ${
                    truthSource === ts
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                  }`}
                >
                  {ts === 'topic' ? '🗂 Topic' : '📂 Resources Only'}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {truthSource === 'topic' && (
                <input
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Cell division in mitosis"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
              
              {textResources.length > 0 && (
                <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 max-h-40 overflow-y-auto space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Select Resources:
                  </h4>
                  {textResources.map(r => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedResourceIds.includes(r.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedResourceIds(prev => [...prev, r.id]);
                          } else {
                            setSelectedResourceIds(prev => prev.filter(id => id !== r.id));
                          }
                        }}
                        className="accent-emerald-500 rounded"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{r.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Question Type */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Question Type</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { if (!(!cSelected && kSelected)) setKSelected(!kSelected); }}
                className={`py-2.5 px-3 rounded-xl border text-left transition-all ${
                  kSelected
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                }`}
              >
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">📖 Knowledge</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Factual recall</p>
              </button>
              <button
                onClick={() => { if (!(!kSelected && cSelected)) setCSelected(!cSelected); }}
                className={`py-2.5 px-3 rounded-xl border text-left transition-all ${
                  cSelected
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                }`}
              >
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">💡 Comprehension</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">How & why</p>
              </button>
            </div>
          </div>

          {/* Test-specific */}
          {mode === 'test' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Number of Questions: <span className="text-emerald-600 dark:text-emerald-400">{questionCount}</span>
                </h3>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={e => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span><span>50</span><span>100</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={includeAnswers}
                    onChange={e => setIncludeAnswers(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4"
                  />
                  <span className="text-sm font-semibold tracking-wider text-gray-700 dark:text-gray-300">Include Answers</span>
                </label>

                {includeAnswers && (
                  <div className="ml-7 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Answer Placement</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setAnswerPlacement('along')}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                          answerPlacement === 'along'
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                        }`}
                      >
                        Along (Below Q)
                      </button>
                      <button
                        onClick={() => setAnswerPlacement('under')}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                          answerPlacement === 'under'
                            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                        }`}
                      >
                        Under (At Bottom)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quiz-specific */}
          {mode === 'quiz' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Player Count: <span className="text-emerald-600 dark:text-emerald-400">{playerCount}</span>
                </h3>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button
                      key={n}
                      onClick={() => setPlayerCount(n)}
                      className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
                        playerCount === n
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Player Names</h3>
                <div className="space-y-2">
                  {Array.from({ length: playerCount }).map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      value={playerNames[i] || ''}
                      onChange={e => updatePlayerName(i, e.target.value)}
                      placeholder={`Player ${i + 1} name`}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={timerEnabled}
                  onChange={e => setTimerEnabled(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">⏱ Enable Timer</span>
              </label>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Questions roughly per player: <span className="text-emerald-600 dark:text-emerald-400">{questionsPerPlayer}</span>
                </h3>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={questionsPerPlayer}
                  onChange={e => setQuestionsPerPlayer(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-700/50">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || (truthSource === 'topic' && !topic.trim() && selectedResourceIds.length === 0) || (truthSource === 'resource' && selectedResourceIds.length === 0)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-60 shadow-md transition-all active:scale-95"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Working…
              </>
            ) : mode === 'test' ? (
              '📝 Generate Test'
            ) : (
              '🎮 Start Quiz'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
