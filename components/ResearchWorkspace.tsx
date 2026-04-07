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
  setCounts
}) => {
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showResourcesDesktop, setShowResourcesDesktop] = useState(true);
  const [mobileTab, setMobileTab] = useState<'resources' | 'document'>('document');
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
      {/* Project header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 border-b border-violet-200 dark:border-violet-800/50 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {!showResourcesDesktop && (
            <button
              onClick={() => setShowResourcesDesktop(true)}
              className="hidden md:flex p-1.5 rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all"
              title="Show Resources"
            >
              <PanelLeftOpenIcon className="w-4 h-4" />
            </button>
          )}
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <svg className="h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 0 1 .45 1.318 2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 16.318a2.25 2.25 0 0 1 .45-1.318L9 8.5M14.25 3h-4.5" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {project.meta.projectName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">by {project.meta.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-xs font-semibold ${saveColor}`}>{saveLabel}</span>
          <span className="text-xs text-gray-400 dark:text-gray-600">
            {project.resources.length} resource{project.resources.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
        <button
          onClick={() => setMobileTab('resources')}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            mobileTab === 'resources'
              ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400 bg-violet-50 dark:bg-violet-900/40'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Resources
        </button>
        <button
          onClick={() => setMobileTab('document')}
          className={`flex-1 py-3 text-sm font-semibold transition-all ${
            mobileTab === 'document'
              ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400 bg-violet-50 dark:bg-violet-900/40'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Document
        </button>
      </div>

      {/* Dual pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Resource Pane */}
        <div 
          className={`
            ${mobileTab === 'resources' ? 'flex' : 'hidden'} md:flex
            ${showResourcesDesktop ? 'md:w-[38%] md:min-w-[280px] md:max-w-[400px]' : 'md:hidden'}
            w-full flex-col border-r-0 md:border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900
          `}
        >
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sources</span>
            <button 
              onClick={() => setShowResourcesDesktop(false)} 
              className="hidden md:block p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              title="Hide Resources"
            >
               <PanelLeftCloseIcon className="w-4 h-4" />
            </button>
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

        {/* Right: Document Pane */}
        <div className={`
          ${mobileTab === 'document' ? 'flex' : 'hidden'} md:flex
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
          />
        </div>
      </div>
    </div>
  );
};
