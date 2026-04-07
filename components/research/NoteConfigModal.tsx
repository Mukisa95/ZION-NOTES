import React, { useState, useEffect } from 'react';
import { XIcon, SparklesIcon } from '../icons';
import { NoteGenerationConfig, AiApproach, NoteType, ResearchResource } from '../../types';
import { generateNotes } from '../../services/researchAiService';

interface NoteConfigModalProps {
  resources: ResearchResource[];
  onInsert: (html: string, heading: string) => void;
  onClose: () => void;
}

const AGE_GROUPS = [
  'Under 10', '11–13', '14–16', '17–18', 'Adult (18+)', 'Professional / Expert',
];

const AI_APPROACHES: { value: AiApproach; label: string; desc: string; icon: string }[] = [
  {
    value: 'resource-grounded',
    label: 'Resource Grounded',
    desc: "Uses ONLY the uploaded resources. No external knowledge.",
    icon: '🔒',
  },
  {
    value: 'resource-knowledge',
    label: 'Resource & Knowledge',
    desc: "Combines uploaded resources with the AI general knowledge.",
    icon: '🧠',
  },
  {
    value: 'resource-knowledge-internet',
    label: 'Resource, Knowledge & Internet',
    desc: "Broadest coverage: resources + knowledge + current best practices.",
    icon: '🌐',
  },
];

const NOTE_TYPES: { value: NoteType; label: string; desc: string; icon: string }[] = [
  {
    value: 'deep',
    label: 'Deep',
    desc: 'Exhaustive — principles, edge cases, connections. For mastery.',
    icon: '🔬',
  },
  {
    value: 'context',
    label: 'Context',
    desc: 'Core data only. Maximum density, minimum words.',
    icon: '⚡',
  },
  {
    value: 'exemplary',
    label: 'Exemplary',
    desc: 'Every concept paired with a practical worked example.',
    icon: '📚',
  },
];

export const NoteConfigModal: React.FC<NoteConfigModalProps> = ({
  resources,
  onInsert,
  onClose,
}) => {
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>(
    resources.map(r => r.id)
  );
  const [topic, setTopic] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [approach, setApproach] = useState<AiApproach>('resource-grounded');
  const [ageGroup, setAgeGroup] = useState('14–16');
  const [noteType, setNoteType] = useState<NoteType>('context');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedResourceIds.length === 0 && approach === 'resource-grounded') {
      setApproach('resource-knowledge');
    }
  }, [selectedResourceIds, approach]);

  const handleGenerate = async () => {
    if (selectedResourceIds.length === 0 && !topic.trim()) {
      setError('Please enter a topic since no resources are selected.');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const finalApproach = selectedResourceIds.length === 0 ? 'resource-knowledge' : approach;
      const config: NoteGenerationConfig = { 
        approach: finalApproach, 
        ageGroup, 
        noteType,
        selectedResourceIds,
        topic: topic.trim(),
        customInstructions: customInstructions.trim()
      };
      const html = await generateNotes(config, resources);
      // Build a meaningful heading from config
      const noteTypeLabel = noteType === 'deep' ? 'Deep Notes' : noteType === 'context' ? 'Context Notes' : 'Exemplary Notes';
      const topicLabel = topic.trim() ? `– ${topic.trim()}` : '';
      const heading = `${noteTypeLabel}${topicLabel}`;
      onInsert(html, heading);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to generate notes. Check your API key in Settings.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-violet-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">Generate Notes</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-5">
          {/* Topic */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Topic (Required if no resources selected)
            </h3>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Cellular Respiration..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 mb-4"
            />

            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Custom Instructions (Optional)
            </h3>
            <textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value)}
              placeholder="e.g. Explain like I'm 5, focus specifically on the role of ATP, etc..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          {/* Resources */}
          {resources.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Included Resources
              </h3>
              <div className="space-y-4 max-h-48 overflow-y-auto p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                {(['scheme', 'notes', 'images'] as const).map(cat => {
                  const catRes = resources.filter(r => r.category === cat);
                  if (catRes.length === 0) return null;
                  return (
                    <div key={cat} className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">{cat}</h4>
                      {catRes.map(r => (
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
                            className="accent-violet-500 rounded"
                          />
                          <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{r.name}</span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Approach */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              A. AI Approach (Data Source)
            </h3>
            <div className="space-y-2">
              {AI_APPROACHES.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    approach === opt.value
                      ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/40'
                      : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="approach"
                    value={opt.value}
                    checked={approach === opt.value}
                    onChange={() => setApproach(opt.value)}
                    className="mt-0.5 accent-violet-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {opt.icon} {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Age Group */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              B. Audience — Age Group
            </h3>
            <select
              value={ageGroup}
              onChange={e => setAgeGroup(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {AGE_GROUPS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Note Type */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              C. Note Type (Structural Density)
            </h3>
            <div className="space-y-2">
              {NOTE_TYPES.map(opt => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    noteType === opt.value
                      ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/40'
                      : 'border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="noteType"
                    value={opt.value}
                    checked={noteType === opt.value}
                    onChange={() => setNoteType(opt.value)}
                    className="mt-0.5 accent-violet-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {opt.icon} {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Resource hint */}
          {selectedResourceIds.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 rounded-xl">
              <span className="text-amber-500 text-sm">⚠️</span>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                No resources selected. The AI will rely completely on its general knowledge about the specified topic.
              </p>
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
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 disabled:opacity-60 shadow-md transition-all active:scale-95"
          >
            {generating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
