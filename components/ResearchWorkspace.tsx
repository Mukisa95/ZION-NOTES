import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResearchProject, ResearchResource } from '../types';
import { ResourcePane } from './research/ResourcePane';
import { DocumentPane } from './research/DocumentPane';
import { PanelLeftOpenIcon, PanelLeftCloseIcon } from './icons';
import {
  getResearchProjectFromFirestore,
  updateResearchProjectInFirestore,
} from '../services/researchFirestoreService';

interface ResearchWorkspaceProps {
  projectId: string;
  userId?: string | null;
  editorRef?: React.RefObject<any>;
  zoomLevel?: number;
  onToggleFind?: (visible: boolean) => void;
  isFindVisible?: boolean;
  searchResults?: { total: number; current: number };
  onFind?: (query: string, options: { matchCase: boolean }) => void;
  onNavigate?: (direction: 'next' | 'prev') => void;
  onCloseFind?: () => void;
  setCounts?: (counts: { words: number; characters: number }) => void;
  onProjectUpdate?: (project: ResearchProject) => void;
  isTocOpen?: boolean;
  onCloseToc?: () => void;
}

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({
  projectId,
  userId,
  editorRef,
  zoomLevel = 100,
  onToggleFind,
  isFindVisible,
  searchResults,
  onFind,
  onNavigate,
  onCloseFind,
  setCounts,
  onProjectUpdate,
  isTocOpen,
  onCloseToc,
}) => {
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showResourcesDesktop, setShowResourcesDesktop] = useState(true);
  const [mobileTab, setMobileTab] = useState<'resources' | 'document' | 'outline'>('document');
  const [activeDocumentId, setActiveDocumentId] = useState<string>('main');
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);

  // Load project on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (userId) {
          const p = await getResearchProjectFromFirestore(userId, projectId);
          if (p) {
            setProject(p);
            onProjectUpdate?.(p);
          } else {
            setError('Research project not found.');
          }
        } else {
          setError('You must be signed in to use Research projects.');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load research project.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId, userId]);

  // Auto-save (debounced 3 seconds)
  const scheduleAutoSave = useCallback(
    (updated: ResearchProject) => {
      if (!userId) return;
      isDirtyRef.current = true;
      setSaveStatus('unsaved');

      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
      autoSaveRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await updateResearchProjectInFirestore(userId, updated.id, {
            resources: updated.resources,
            documentContent: updated.documentContent,
            updatedAt: Date.now(),
          });
          setSaveStatus('saved');
          isDirtyRef.current = false;
        } catch {
          setSaveStatus('unsaved');
        }
      }, 3000);
    },
    [userId]
  );

  // Save immediately on unmount if dirty
  useEffect(() => {
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, []);

  const handleResourcesChange = (resources: ResearchResource[]) => {
    if (!project) return;
    const updated = { ...project, resources };
    setProject(updated);
    onProjectUpdate?.(updated);
    scheduleAutoSave(updated);
  };

  const handleContentChange = (newContent: string) => {
    if (!project) return;
    let updated;
    if (activeDocumentId === 'main') {
      updated = { ...project, documentContent: newContent };
    } else {
      updated = {
        ...project,
        resources: project.resources.map(r => 
          r.id === activeDocumentId ? { ...r, content: newContent } : r
        )
      };
    }
    setProject(updated);
    onProjectUpdate?.(updated);
    scheduleAutoSave(updated);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading research workspace…</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-sm">
          <p className="text-5xl mb-4">⚠️</p>
          <p className="text-gray-700 dark:text-gray-300 font-medium">{error || 'Project not found.'}</p>
          <p className="text-xs text-gray-400 mt-2">Make sure you are signed in and have a valid project.</p>
        </div>
      </div>
    );
  }

  const saveColor =
    saveStatus === 'saved'
      ? 'text-emerald-600 dark:text-emerald-400'
      : saveStatus === 'saving'
      ? 'text-amber-500 dark:text-amber-400'
      : 'text-gray-400 dark:text-gray-500';

  const saveLabel =
    saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? '⟳ Saving…' : '● Unsaved';

  return (
    <div className="flex flex-col h-full">


      {/* Mobile Tab Bar — compact pill switcher */}
      <div className="md:hidden flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-3 py-1.5">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5 gap-0.5">

          {/* Resources tab */}
          <button
            onClick={() => setMobileTab('resources')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              mobileTab === 'resources'
                ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Sources</span>
            {project.resources.length > 0 && (
              <span className={`text-[10px] font-bold px-1 rounded-full leading-tight ${
                mobileTab === 'resources'
                  ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {project.resources.length}
              </span>
            )}
          </button>

          {/* Document tab */}
          <button
            onClick={() => setMobileTab('document')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              mobileTab === 'document'
                ? 'bg-white dark:bg-gray-700 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Document</span>
          </button>

          {/* Outline tab — only when TOC is on */}
          {isTocOpen && (
            <button
              onClick={() => setMobileTab('outline')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                mobileTab === 'outline'
                  ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
              </svg>
              <span>Outline</span>
            </button>
          )}

        </div>
      </div>

      {/* Dual pane */}
      <div className="flex flex-1 overflow-hidden relative">
        {!showResourcesDesktop && (
          <div className="absolute top-2 left-2 z-10 hidden md:block">
            <button
              onClick={() => setShowResourcesDesktop(true)}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              title="Show Resources"
            >
              <PanelLeftOpenIcon className="w-4 h-4" />
            </button>
            <span className={`ml-2 text-[10px] font-semibold bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded shadow-sm ${saveColor}`}>
              {saveLabel}
            </span>
          </div>
        )}
        {/* Left: Resource Pane */}
        <div 
          className={`
            ${mobileTab === 'resources' ? 'flex' : 'hidden'} md:flex
            ${showResourcesDesktop ? 'md:w-[38%] md:min-w-[280px] md:max-w-[400px]' : 'md:hidden'}
            w-full flex-col border-r-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900
          `}
        >
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Sources {project.resources.length > 0 ? '(' + project.resources.length + ')' : ''}
            </span>
            <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold ${saveColor}`}>{saveLabel}</span>
            <button 
              onClick={() => setShowResourcesDesktop(false)} 
              className="hidden md:block p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              title="Hide Resources"
            >
               <PanelLeftCloseIcon className="w-4 h-4" />
            </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ResourcePane
              resources={project.resources}
              onChange={handleResourcesChange}
              onOpenResource={(id) => {
                setActiveDocumentId(id);
                if (window.innerWidth < 768) {
                    setMobileTab('document');
                }
              }}
              activeDocumentId={activeDocumentId}
            />
          </div>
        </div>

        {/* Right: Document Pane – shown for 'document' and 'outline' mobile tabs */}
        <div className={`
          ${(mobileTab === 'document' || mobileTab === 'outline') ? 'flex' : 'hidden'} md:flex
          flex-1 overflow-hidden flex-col
        `}>
          {/* Right: Document Pane */}
          <DocumentPane
            content={activeDocumentId === 'main' ? project.documentContent : (project.resources.find(r => r.id === activeDocumentId)?.content || '')}
            resources={project.resources}
            onChange={handleContentChange}
            activeDocumentId={activeDocumentId}
            onBackToMain={() => setActiveDocumentId('main')}
            editorRef={editorRef}
            zoomLevel={zoomLevel}
            onToggleFind={onToggleFind}
            isFindVisible={isFindVisible}
            searchResults={searchResults}
            onFind={onFind}
            onNavigate={onNavigate}
            onCloseFind={onCloseFind}
            setCounts={setCounts}
            isTocOpen={isTocOpen}
            onCloseToc={onCloseToc}
            isMobileOutline={mobileTab === 'outline'}
            onMobileOutlineClose={() => setMobileTab('document')}
          />
        </div>
      </div>
    </div>
  );
};
