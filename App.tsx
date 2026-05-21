import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NoteEditor } from './components/NoteEditor';
import { ChatWindow } from './components/ChatSidebar';
import { SparklesIcon, BoldIcon, ItalicIcon, TrashIcon, BrainIcon, TextColorIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon, SuperscriptIcon, SubscriptIcon, SearchIcon, ExportIcon, PdfIcon, WordIcon, UploadIcon, SettingsIcon, BulletListIcon, NumberListIcon, ChevronDownIcon, SaveIcon, FolderIcon, DocumentIcon, CloudIcon, HomeIcon, UndoIcon, RedoIcon, TableOfContentsIcon } from './components/icons';
import { ListStylePicker } from './components/ListStylePicker';
import { AlignmentPicker } from './components/AlignmentPicker';
import { markdownToHtml } from './utils/markdown';
import { AiProvider, FormatType, NoteEditorHandles } from './types';
import { HelpMeThinkModal } from './components/HelpMeThinkModal';
import { SettingsModal } from './components/SettingsModal';
import { ProviderModal } from './components/ProviderModal';
import { SaveDialog } from './components/SaveDialog';
import { DocumentLibrary } from './components/DocumentLibrary';
import { SaveDocumentDialog } from './components/SaveDocumentDialog';
import { DocumentTabs, DocumentTab } from './components/DocumentTabs';
import { CloseTabDialog } from './components/CloseTabDialog';
import { AuthModal } from './components/AuthModal';
import { UserProfile } from './components/UserProfile';
import { DocumentLandingPage } from './components/DocumentLandingPage';
import { WareViewModal } from './components/WareViewModal';
import { CompressionDialog } from './components/CompressionDialog';
import { CompressionIndicator } from './components/CompressionIndicator';
import TranscriptionScreen from './components/TranscriptionScreen';
import { TableOfContentsModal } from './components/TableOfContentsModal';
import { ResearchWorkspace } from './components/ResearchWorkspace';
import { ResearchProjectSetupModal } from './components/ResearchProjectSetupModal';
import { ResearchProject, ResearchProjectMeta } from './types';
import { saveResearchProjectToFirestore } from './services/researchFirestoreService';
import { useAuth } from './contexts/AuthContext';
import { saveDocument, updateDocument, getCurrentDocumentId, setCurrentDocumentId, SavedDocument } from './services/documentStorage';
import { Ware, deleteWare } from './services/wareStorage';
import { deleteWareFromFirestore } from './services/wareFirestoreService';
import { saveDocumentToFirestore, getAllDocumentsFromFirestore, updateDocumentInFirestore, deleteDocumentFromFirestore } from './services/firestoreService';
import { getCountsFromHtml } from './utils/textUtils';
import { StatusToolbar } from './components/StatusToolbar';
import { FindAndReplaceBar } from './components/FindAndReplaceBar';
import { exportAsHtml, exportAsMarkdown, exportAsText, exportAsPdf, exportAsWord } from './utils/exportUtils';
import { readDocxFile } from './services/docxService';
import { getContentSize, CompressionMethod, decompressGzip, SplitResult, formatBytes } from './utils/compressionUtils';

const useClickOutside = (ref: React.RefObject<HTMLElement>, callback: () => void) => {
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [ref, callback]);
};


const FormattingToolbar: React.FC<{
  onFormat: (type: FormatType, value?: string) => void;
  onClear: () => void;
  onInsertList: (type: 'ul' | 'ol', style?: string) => void;
  onOpenSelectionMenu?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}> = ({ onFormat, onClear, onInsertList, onOpenSelectionMenu, onUndo, onRedo }) => {
    const colorInputRef = useRef<HTMLInputElement>(null);
    const fontFamilyRef = useRef<HTMLSelectElement>(null);
    const fontSizeRef = useRef<HTMLSelectElement>(null);
    
    const [activeFormats, setActiveFormats] = useState<{
        bold: boolean;
        italic: boolean;
        underline: boolean;
        superscript: boolean;
        subscript: boolean;
        justifyLeft: boolean;
        justifyCenter: boolean;
        justifyRight: boolean;
        justifyFull: boolean;
        fontFamily: string;
        fontSize: string;
    }>({
        bold: false,
        italic: false,
        underline: false,
        superscript: false,
        subscript: false,
        justifyLeft: false,
        justifyCenter: false,
        justifyRight: false,
        justifyFull: false,
        fontFamily: 'Calibri',
        fontSize: '11pt'
    });

    const [hasSelection, setHasSelection] = useState(false);

    // Update active formats when selection changes
    useEffect(() => {
        const updateFormats = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                setHasSelection(false);
                return;
            }
            
            const selectionRange = selection.getRangeAt(0);
            setHasSelection(!selectionRange.collapsed);

            const formats = {
                bold: document.queryCommandState('bold'),
                italic: document.queryCommandState('italic'),
                underline: document.queryCommandState('underline'),
                superscript: document.queryCommandState('superscript'),
                subscript: document.queryCommandState('subscript'),
                justifyLeft: document.queryCommandState('justifyLeft'),
                justifyCenter: document.queryCommandState('justifyCenter'),
                justifyRight: document.queryCommandState('justifyRight'),
                justifyFull: document.queryCommandState('justifyFull'),
                fontFamily: 'Calibri',
                fontSize: '11pt'
            };

            // Get font family
            const range = selection.getRangeAt(0);
            let node = range.commonAncestorContainer;
            if (node.nodeType === Node.TEXT_NODE) {
                node = node.parentNode as Node;
            }
            const element = node as HTMLElement;
            
            if (element.style?.fontFamily) {
                formats.fontFamily = element.style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            } else {
                const computed = window.getComputedStyle(element);
                if (computed.fontFamily) {
                    formats.fontFamily = computed.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
                }
            }

            // Get font size
            if (element.style?.fontSize) {
                formats.fontSize = element.style.fontSize;
            } else {
                const computed = window.getComputedStyle(element);
                if (computed.fontSize) {
                    // Convert px to pt if needed
                    const pxSize = parseFloat(computed.fontSize);
                    const ptSize = Math.round(pxSize * 0.75);
                    formats.fontSize = ptSize + 'pt';
                }
            }

            setActiveFormats(formats);
            
            // Update dropdown values
            if (fontFamilyRef.current) {
                fontFamilyRef.current.value = formats.fontFamily;
            }
            if (fontSizeRef.current) {
                fontSizeRef.current.value = formats.fontSize;
            }
        };

        document.addEventListener('selectionchange', updateFormats);
        return () => document.removeEventListener('selectionchange', updateFormats);
    }, []);

    const handleColorButtonClick = () => {
        colorInputRef.current?.click();
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Save the current selection
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        
        onFormat('foreColor', e.target.value);
        
        // Restore the selection using requestAnimationFrame for better timing
        requestAnimationFrame(() => {
            if (range && selection) {
                try {
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (e) {
                    console.debug('Could not restore selection:', e);
                }
            }
        });
    };

    const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // Save the current selection
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        
        document.execCommand('fontSize', false, '7');
        const fontElements = document.querySelectorAll('font[size="7"]');
        fontElements.forEach(element => {
            element.removeAttribute('size');
            (element as HTMLElement).style.fontSize = e.target.value;
        });
        
        // Restore the selection using requestAnimationFrame for better timing
        requestAnimationFrame(() => {
            if (range && selection) {
                try {
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (e) {
                    console.debug('Could not restore selection:', e);
                }
            }
        });
    };

    const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // Save the current selection
        const selection = window.getSelection();
        const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        
        document.execCommand('fontName', false, e.target.value);
        
        // Restore the selection using requestAnimationFrame for better timing
        requestAnimationFrame(() => {
            if (range && selection) {
                try {
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (e) {
                    console.debug('Could not restore selection:', e);
                }
            }
        });
    };

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {/* Undo/Redo Controls */}
        <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
          <button
            onMouseDown={(e) => { 
              e.preventDefault(); 
              onUndo?.(); 
            }}
            className="p-1.5 rounded text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onMouseDown={(e) => { 
              e.preventDefault(); 
              onRedo?.(); 
            }}
            className="p-1.5 rounded text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
            title="Redo (Ctrl+Y)"
          >
            <RedoIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Font Controls */}
        <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
          <select
            ref={fontFamilyRef}
            onChange={handleFontFamilyChange}
            value={activeFormats.fontFamily}
            className="px-2 py-1 text-xs bg-transparent border-none focus:outline-none text-gray-700 dark:text-gray-300 cursor-pointer max-w-[120px] font-semibold"
            title="Font Family"
          >
            <option value="Calibri">Calibri</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Cambria">Cambria</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Tahoma">Tahoma</option>
            <option value="Trebuchet MS">Trebuchet MS</option>
            <option value="Garamond">Garamond</option>
            <option value="Palatino">Palatino</option>
            <option value="Courier New">Courier New</option>
            <option value="Lucida Console">Lucida Console</option>
            <option value="Monaco">Monaco</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
            <option value="Impact">Impact</option>
          </select>
          
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
          
          <select
            ref={fontSizeRef}
            onChange={handleFontSizeChange}
            value={activeFormats.fontSize}
            className="px-2 py-1 text-xs bg-transparent border-none focus:outline-none text-gray-700 dark:text-gray-300 cursor-pointer font-semibold"
            title="Font Size (pt)"
          >
            <option value="8pt">8</option>
            <option value="9pt">9</option>
            <option value="10pt">10</option>
            <option value="10.5pt">10.5</option>
            <option value="11pt">11</option>
            <option value="12pt">12</option>
            <option value="14pt">14</option>
            <option value="16pt">16</option>
            <option value="18pt">18</option>
            <option value="20pt">20</option>
            <option value="22pt">22</option>
            <option value="24pt">24</option>
            <option value="26pt">26</option>
            <option value="28pt">28</option>
            <option value="36pt">36</option>
            <option value="48pt">48</option>
            <option value="72pt">72</option>
          </select>
        </div>

        <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
          <button 
            onMouseDown={(e) => { e.preventDefault(); onFormat('bold'); }} 
            className={`p-1.5 rounded transition-all ${
              activeFormats.bold 
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            title="Bold"
          >
            <BoldIcon className="h-3.5 w-3.5" />
        </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); onFormat('italic'); }} 
            className={`p-1.5 rounded transition-all ${
              activeFormats.italic 
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            title="Italic"
          >
            <ItalicIcon className="h-3.5 w-3.5" />
        </button>
        <div className="relative">
              <button onMouseDown={(e) => { e.preventDefault(); handleColorButtonClick(); }} className="p-1.5 rounded text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all" title="Text Color">
                  <TextColorIcon className="h-3.5 w-3.5" />
            </button>
            <input type="color" ref={colorInputRef} onChange={handleColorChange} className="absolute top-0 left-0 w-0 h-0 opacity-0" />
          </div>
        </div>

        {/* Selection Menu Button - only show when text is selected */}
        {hasSelection && onOpenSelectionMenu && (
          <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
            <button 
              onClick={onOpenSelectionMenu}
              className="p-1.5 rounded text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
              title="AI Actions for Selection"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        
        <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
          <AlignmentPicker
            onSelect={(alignment) => onFormat(alignment)}
            currentAlignment={
              activeFormats.justifyLeft ? 'justifyLeft' :
              activeFormats.justifyCenter ? 'justifyCenter' :
              activeFormats.justifyRight ? 'justifyRight' :
              activeFormats.justifyFull ? 'justifyFull' :
              'justifyLeft'
            }
          />
        </div>

        <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
          <button 
            onMouseDown={(e) => { e.preventDefault(); onFormat('superscript'); }} 
            className={`p-1.5 rounded transition-all ${
              activeFormats.superscript 
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            title="Superscript"
          >
            <SuperscriptIcon className="h-3.5 w-3.5" />
        </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); onFormat('subscript'); }} 
            className={`p-1.5 rounded transition-all ${
              activeFormats.subscript 
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            title="Subscript"
          >
            <SubscriptIcon className="h-3.5 w-3.5" />
        </button>
        </div>

        <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
          <ListStylePicker
            type="bullet"
            onSelect={(style) => onInsertList('ul', style)}
            buttonIcon={<BulletListIcon className="h-3.5 w-3.5" />}
            buttonTitle="Bullet List"
          />
          <ListStylePicker
            type="number"
            onSelect={(style) => onInsertList('ol', style)}
            buttonIcon={<NumberListIcon className="h-3.5 w-3.5" />}
            buttonTitle="Numbered List"
          />
        </div>

        <button onMouseDown={(e) => { e.preventDefault(); onClear(); }} className="p-1.5 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-red-200/50 dark:border-red-700/50" title="Clear Note">
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
};


const App: React.FC = () => {
  const { user, incognitoMode } = useAuth();
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<NoteEditorHandles>(null);

  const [lastBrainstorm, setLastBrainstorm] = useState<{ conversation: any[]; initialTopic: string; } | null>(null);
  const [isHelpMeThinkModalOpen, setIsHelpMeThinkModalOpen] = useState(false);
  const [isNewBrainstormSession, setIsNewBrainstormSession] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [counts, setCounts] = useState({ words: 0, characters: 0 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFindVisible, setIsFindVisible] = useState(false);
  const [searchResults, setSearchResults] = useState<{ total: number; current: number }>({ total: 0, current: 0 });
  
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [selectedContentForExport, setSelectedContentForExport] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingInsertion, setPendingInsertion] = useState<{ documentId: string; content: string } | null>(null);
  // Table feature removed
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [settingsInitialProvider, setSettingsInitialProvider] = useState<AiProvider | undefined>(undefined);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingExport, setPendingExport] = useState<{ format: 'pdf' | 'html' | 'md' | 'txt' | 'docx'; content: string } | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Document Management with Tabs
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [openTabs, setOpenTabs] = useState<DocumentTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [isDocumentLibraryOpen, setIsDocumentLibraryOpen] = useState(false);
  const [isSaveDocumentDialogOpen, setIsSaveDocumentDialogOpen] = useState(false);
  const [closeTabDialogOpen, setCloseTabDialogOpen] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);
  const [isWareViewModalOpen, setIsWareViewModalOpen] = useState(false);
  const [selectedWare, setSelectedWare] = useState<Ware | null>(null);
  const [isCompressionDialogOpen, setIsCompressionDialogOpen] = useState(false);
  const [compressionDialogData, setCompressionDialogData] = useState<{ name: string; content: string } | null>(null);
  const [isTableOfContentsOpen, setIsTableOfContentsOpen] = useState(false);
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);
  const [transcriptionPreview, setTranscriptionPreview] = useState<{ html: string; errors: { original: string; suggestion: string }[] } | null>(null);
  const [isResearchSetupOpen, setIsResearchSetupOpen] = useState(false);
  const [activeResearchProject, setActiveResearchProject] = useState<ResearchProject | null>(null);
  const [isMyProjectsOpen, setIsMyProjectsOpen] = useState(false);
  const [myProjects, setMyProjects] = useState<ResearchProject[]>([]);
  const [myProjectsLoading, setMyProjectsLoading] = useState(false);
  const [isResearchTocOpen, setIsResearchTocOpen] = useState(false);

  // Get active tab
  const activeTab = activeTabId ? openTabs.find(tab => tab.id === activeTabId) : null;
  const isResearchTab = activeTab?.type === 'research';
  const noteContent = activeTab?.content || '<p><br></p>';

  useClickOutside(exportMenuRef, () => setIsExportMenuOpen(false));

  useEffect(() => {
    const newCounts = getCountsFromHtml(noteContent);
    setCounts(newCounts);
  }, [noteContent]);

  // Handle pending insertion at cursor
  useEffect(() => {
    if (pendingInsertion && pendingInsertion.documentId === activeTabId && editorRef.current) {
      // Convert markdown to HTML and insert at cursor
      import('./utils/markdown').then(({ markdownToHtml }) => {
        const htmlContent = markdownToHtml(pendingInsertion.content);
        editorRef.current?.insertAtCursor(htmlContent);
        setPendingInsertion(null);
      });
    }
  }, [pendingInsertion, activeTabId]);

  // Sync content changes to active tab
  const setNoteContent = (newContent: string) => {
    setOpenTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content: newContent, isDirty: true }
          : tab
      )
    );
  };

  // Auto-save function with debouncing
  const autoSaveDocument = useCallback(async () => {
    if (!activeTabId || !activeTab) return;
    
    // Only auto-save if document is already saved (has a doc_ id)
    if (!activeTab.id.startsWith('doc_')) return;
    
    // Don't auto-save if content hasn't changed
    if (!activeTab.isDirty) return;

    setIsAutoSaving(true);
    try {
      if (user && !incognitoMode) {
        // Check size before auto-save
        const contentSize = getContentSize(activeTab.content);
        if (contentSize > 900000) {
          // Too large for auto-save - warn user
          console.warn('Document too large for auto-save. Manual save with compression required.');
          setIsAutoSaving(false);
          return;
        }
        
        // Save to Firestore
        await updateDocumentInFirestore(user.uid, activeTab.id, {
          name: activeTab.name,
          content: activeTab.content,
          lastModified: Date.now(),
          wordCount: getCountsFromHtml(activeTab.content).words
        });
      } else {
        // Save to local storage
        await updateDocument(activeTab.id, activeTab.name, activeTab.content);
      }
      
      // Mark as not dirty
      setOpenTabs(prevTabs =>
        prevTabs.map(tab =>
          tab.id === activeTabId
            ? { ...tab, isDirty: false }
            : tab
        )
      );
    } catch (error) {
      console.error('Error auto-saving document:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [activeTabId, activeTab, user, incognitoMode]);

  // Auto-save effect with debouncing (2 seconds after last change)
  useEffect(() => {
    if (!activeTab || !activeTab.isDirty) return;
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveDocument();
    }, 2000); // 2 seconds debounce
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [noteContent, activeTab?.isDirty, autoSaveDocument]);

  // Don't auto-load last document - show landing page instead

  const handleAddTextToNote = useCallback((text: string) => {
    const htmlText = markdownToHtml(text);
    editorRef.current?.appendText(htmlText);
  }, []);

  const handleFind = (query: string, options: { matchCase: boolean }) => {
    const results = editorRef.current?.find(query, options);
    setSearchResults(results || { total: 0, current: 0 });
  };
  
  const handleFindNavigate = (direction: 'next' | 'prev') => {
    const results = editorRef.current?.findNavigate(direction);
    setSearchResults(results || { total: 0, current: 0 });
  };

  const handleCloseFind = () => {
    setIsFindVisible(false);
    editorRef.current?.clearHighlights();
    setSearchResults({ total: 0, current: 0 });
  };

  const handleToggleExportMenu = () => {
      const selectionHtml = editorRef.current?.getSelectionHtml();
      setSelectedContentForExport(selectionHtml);
      setIsExportMenuOpen(prev => !prev);
  };
  
  const handleExport = async (format: 'pdf' | 'html' | 'md' | 'txt' | 'docx') => {
      const activeCurrentTab = openTabs.find(t => t.id === activeTabId);
      const isResearch = !selectedContentForExport && activeCurrentTab?.type === 'research' && activeResearchProject;

      // ── Research Project: use dedicated export functions ──────────────────
      if (isResearch && activeResearchProject) {
          setIsExportMenuOpen(false);

          if (format === 'docx') {
              const { exportResearchAsDocx } = await import('./services/docxService');
              await exportResearchAsDocx(activeResearchProject);
              return;
          }

          if (format === 'pdf') {
              const { exportResearchAsPdf } = await import('./services/docxService');
              exportResearchAsPdf(activeResearchProject);
              return;
          }

          // For html / md / txt — build HTML then fall through to the save dialog
          const { buildResearchExportHtml } = await import('./utils/exportUtils');
          const htmlContent = buildResearchExportHtml(activeResearchProject);
          setPendingExport({ format, content: htmlContent });
          setSaveDialogOpen(true);
          return;
      }

      // ── Normal Document export ────────────────────────────────────────────
      const contentToExport = selectedContentForExport || noteContent;
      setPendingExport({ format, content: contentToExport });
      setIsExportMenuOpen(false);
      setSaveDialogOpen(true);
  };

  const handleSaveFile = async (filename: string, useNativePicker: boolean) => {
      if (!pendingExport) return;
      
      const { format, content } = pendingExport;
      
      // Ensure correct extension
      const extensions: Record<string, string> = {
          pdf: '.pdf',
          html: '.html',
          md: '.md',
          txt: '.txt',
          docx: '.docx'
      };
      
      let finalFilename = filename;
      if (!finalFilename.toLowerCase().endsWith(extensions[format])) {
          finalFilename += extensions[format];
      }

      console.log('💾 Saving file:', finalFilename, 'with native picker:', useNativePicker);

      // If using native picker, get file handle FIRST (must be in user gesture context)
      let fileHandle: any = null;
      if (useNativePicker && 'showSaveFilePicker' in window && format !== 'pdf') {
          try {
              const mimeTypes: Record<string, string> = {
                  pdf: 'application/pdf',
                  html: 'text/html',
                  md: 'text/markdown',
                  txt: 'text/plain',
                  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              };
              
              fileHandle = await (window as any).showSaveFilePicker({
                  suggestedName: finalFilename,
                  types: [{
                      description: format.toUpperCase() + ' File',
                      accept: {
                          [mimeTypes[format]]: [extensions[format]]
                      },
                  }],
              });
              console.log('✅ User selected save location');
          } catch (err) {
              if ((err as Error).name === 'AbortError') {
                  console.log('ℹ️ User cancelled save dialog');
                  setPendingExport(null);
                  return;
              }
              console.warn('⚠️ File picker failed:', err);
              fileHandle = null; // Will fall back to download
          }
      }

      // Now generate and save the file
      switch (format) {
          case 'pdf':
              // Override title explicitly for the print dialog so it defaults to the correct filename
              document.title = finalFilename.replace('.pdf', '');
              exportAsPdf(content, finalFilename);
              setTimeout(() => { document.title = 'AI Note Taker'; }, 2000);
              break;
          case 'html':
              await exportAsHtml(content, finalFilename, fileHandle);
              break;
          case 'md':
              await exportAsMarkdown(content, finalFilename, fileHandle);
              break;
          case 'txt':
              await exportAsText(content, finalFilename, fileHandle);
              break;
          case 'docx':
              await exportAsWord(content, finalFilename, fileHandle);
              break;
      }
      
      setPendingExport(null);
  };

  const handleTabSwitch = (tabId: string) => {
    // Auto-save current tab before switching (if it has a document ID)
    const currentTab = openTabs.find(t => t.id === activeTabId);
    if (currentTab && currentTab.id.startsWith('doc_') && currentTab.isDirty) {
      updateDocument(currentTab.id, currentTab.name, currentTab.content).catch(err => {
        console.error('Auto-save failed:', err);
      });
    }
    
    setActiveTabId(tabId);
  };

  // Keyboard shortcuts for tab navigation and undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only handle undo/redo if not in a contentEditable that's not our editor
        const editorElement = document.querySelector('[data-note-editor-root]');
        const isEditor = editorElement instanceof HTMLElement ? editorElement.contains(target) : false;
        if (!isEditor && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        
        // Handle undo/redo in editor
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          if (isEditor) {
            e.preventDefault();
            handleUndo();
          }
          return;
        }
        
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
          if (isEditor) {
            e.preventDefault();
            handleRedo();
          }
          return;
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (openTabs[tabIndex]) {
          setActiveTabId(openTabs[tabIndex].id);
        }
      }
      
      // Ctrl+W to close tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (openTabs.length > 1) {
          handleTabClose(activeTabId);
        }
      }
      
      // Ctrl+T for new tab
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        handleNewTab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTabs, activeTabId]);

  const handleTabClose = (tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    
    // Check if tab has any content (not just empty)
    const hasContent = tab && tab.content.trim() && tab.content !== '<p><br></p>' && tab.content !== '<p>Start typing...</p>';
    
    if (hasContent) {
      // Show save dialog
      setTabToClose(tabId);
      setCloseTabDialogOpen(true);
      return;
    }

    // Close tab immediately if empty
    closeTabImmediately(tabId);
  };

  const handleTranscriptionComplete = (result: { html: string; errors: { original: string; suggestion: string }[] }) => {
    setTranscriptionPreview(result);
    setIsTranscriptionOpen(false);
  };

  const handleApplyTranscription = () => {
    if (transcriptionPreview?.html) {
      editorRef.current?.appendText(transcriptionPreview.html);
    }
    setTranscriptionPreview(null);
  };

  const closeTabImmediately = (tabId: string) => {
    const remainingTabs = openTabs.filter(t => t.id !== tabId);
    
    if (remainingTabs.length === 0) {
      // Show landing page when all tabs are closed
      setOpenTabs([]);
      setActiveTabId(null);
      setShowLandingPage(true);
    } else {
      setOpenTabs(remainingTabs);
      if (tabId === activeTabId) {
        setActiveTabId(remainingTabs[0].id);
      }
    }
  };

  const handleSaveAndClose = async () => {
    if (!tabToClose) return;
    
    const tab = openTabs.find(t => t.id === tabToClose);
    if (!tab) return;

    // If tab is already saved, just update it
    if (tab.id.startsWith('doc_')) {
      try {
        await updateDocument(tab.id, tab.name, tab.content);
        setCloseTabDialogOpen(false);
        closeTabImmediately(tabToClose);
        setTabToClose(null);
      } catch (error) {
        console.error('Error saving before close:', error);
        alert('Failed to save document');
      }
    } else {
      // New document - show save dialog first
      setCloseTabDialogOpen(false);
      setIsSaveDocumentDialogOpen(true);
      // After saving, close will happen in handleSaveDocumentLocally
    }
  };

  const handleDontSaveAndClose = () => {
    if (tabToClose) {
      closeTabImmediately(tabToClose);
      setTabToClose(null);
    }
    setCloseTabDialogOpen(false);
  };

  const handleTabRename = (tabId: string, newName: string) => {
    setOpenTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId
          ? { ...tab, name: newName, isDirty: true }
          : tab
      )
    );
    
    // If it's a saved document, update in database
    if (tabId.startsWith('doc_')) {
      const tab = openTabs.find(t => t.id === tabId);
      if (tab) {
        updateDocument(tabId, newName, tab.content).catch(err => {
          console.error('Error renaming document:', err);
        });
      }
    }
  };

  const handleNewTab = () => {
    const newTab: DocumentTab = {
      id: 'new_' + Date.now(),
      name: 'Untitled',
      content: '<p><br></p>'
    };
    setOpenTabs([...openTabs, newTab]);
    setActiveTabId(newTab.id);
    setShowLandingPage(false);
  };

  const handleCreateNewDocument = () => {
    handleNewTab();
  };

  // ─── Research handlers ────────────────────────────────────────────────────────

  const handleNewResearch = () => {
    setIsResearchSetupOpen(true);
  };

  const handleResearchSetupConfirm = async (meta: ResearchProjectMeta) => {
    setIsResearchSetupOpen(false);
    const projectId = `rp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    const project: ResearchProject = {
      id: projectId,
      meta,
      resources: [],
      documentContent: '',
      userId: user?.uid || '',
      createdAt: now,
      updatedAt: now,
    };
    try {
      if (user && !incognitoMode) {
        await saveResearchProjectToFirestore(user.uid, project);
      }
    } catch (e) {
      console.error('Failed to save research project to Firestore:', e);
    }
    const newTab: DocumentTab = {
      id: projectId,
      name: meta.projectName,
      content: '',
      type: 'research',
      researchProjectId: projectId,
    };
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(projectId);
    setShowLandingPage(false);
  };

  const handleOpenResearch = (project: ResearchProject) => {
    // Check if already open
    const existing = openTabs.find(t => t.researchProjectId === project.id);
    if (existing) {
      setActiveTabId(existing.id);
      setShowLandingPage(false);
      return;
    }
    // Open a new research tab
    const newTab: DocumentTab = {
      id: project.id,
      name: project.meta.projectName, // Shows actual project name
      content: '',
      type: 'research',
      researchProjectId: project.id,
    };
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(project.id);
    setShowLandingPage(false);
  };

  const handleSaveDocumentLocally = async (name: string) => {
    try {
      const activeTab = openTabs.find(tab => tab.id === activeTabId);
      if (!activeTab) return;

      // Check document size for cloud saves
      const MAX_SIZE = 900000; // 900KB safe limit
      const contentSize = getContentSize(activeTab.content);
      
      if (user && !incognitoMode && contentSize > MAX_SIZE) {
        // Document too large for cloud - show compression dialog
        setCompressionDialogData({ name, content: activeTab.content });
        setIsCompressionDialogOpen(true);
        setIsSaveDocumentDialogOpen(false);
        return;
      }

      // Proceed with save
      await performSave(name, activeTab.content);
    } catch (error) {
      console.error('Error saving document:', error);
      const syncStatus = user && !incognitoMode ? ' to cloud' : ' locally';
      alert(`Failed to save document${syncStatus}. ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const performSave = async (name: string, content: string) => {
    const activeTab = openTabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;

    // Check if this tab already has a saved document ID
    const isUpdate = activeTab.id.startsWith('doc_');
    
    let savedDoc: SavedDocument;
    
    if (user && !incognitoMode) {
      // Cloud sync mode - save to Firestore
      console.log('Saving document to Firestore for user:', user.uid);
      if (isUpdate) {
        // Update existing document in Firestore
        console.log('Updating existing document:', activeTab.id);
        await updateDocumentInFirestore(user.uid, activeTab.id, {
          name,
          content: content,
          lastModified: Date.now(),
          wordCount: getCountsFromHtml(content).words
        });
        savedDoc = {
          id: activeTab.id,
          name,
          content: content,
          lastModified: Date.now(),
          wordCount: getCountsFromHtml(content).words
        };
      } else {
        // Create new document in Firestore
        savedDoc = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          content: content,
          lastModified: Date.now(),
          wordCount: getCountsFromHtml(content).words
        };
        console.log('Creating new document:', savedDoc.id);
        await saveDocumentToFirestore(user.uid, savedDoc);
        console.log('Document saved to Firestore successfully');
        setCurrentDocumentId(savedDoc.id);
      }
    } else {
      // Local storage mode - save to IndexedDB (no size limit)
      if (isUpdate) {
        // Update existing document
        savedDoc = await updateDocument(activeTab.id, name, content);
      } else {
        // Create new document
        savedDoc = await saveDocument(name, content);
        setCurrentDocumentId(savedDoc.id);
      }
    }

    // Update tab with saved document ID and name
    setOpenTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === activeTabId
          ? { ...tab, id: savedDoc.id, name: savedDoc.name, content: content, isDirty: false }
          : tab
      )
    );
    
    // Update active tab ID if it changed
    if (!isUpdate) {
      setActiveTabId(savedDoc.id);
    }

    const syncStatus = user && !incognitoMode ? ' to cloud' : ' locally';
    alert(`Document "${name}" saved successfully${syncStatus}!`);
  };

  const handleCompressionConfirm = async (compressedContent: string, method: CompressionMethod, splitData?: SplitResult) => {
    setIsCompressionDialogOpen(false);
    if (!compressionDialogData) return;

    try {
      if (method === CompressionMethod.SPLIT_DOCUMENT && splitData) {
        // Save Part 1
        await performSave(`${compressionDialogData.name} (Part 1)`, splitData.part1);
        
        // Save Part 2
        await performSave(`${compressionDialogData.name} (Part 2)`, splitData.part2);
        
        alert(`Document split successfully!\n\nCreated:\n• ${compressionDialogData.name} (Part 1) - ${formatBytes(getContentSize(splitData.part1))}\n• ${compressionDialogData.name} (Part 2) - ${formatBytes(getContentSize(splitData.part2))}`);
      } else {
        await performSave(compressionDialogData.name, compressedContent);
      }
      setCompressionDialogData(null);
    } catch (error) {
      console.error('Error saving compressed document:', error);
      alert(`Failed to save document. ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const openDocumentInTab = async (doc: SavedDocument): Promise<void> => {
    // Check if document is already open
    const existingTab = openTabs.find(tab => tab.id === doc.id);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      return;
    }

    // Load document content if needed (for cloud documents)
    let documentContent = doc.content;
    if (user && !incognitoMode && doc.id.startsWith('doc_')) {
      const { getDocumentFromFirestore } = await import('./services/firestoreService');
      const cloudDoc = await getDocumentFromFirestore(user.uid, doc.id);
      if (cloudDoc) {
        documentContent = cloudDoc.content;
      }
    }

    // Decompress content if it was compressed
    if (documentContent.startsWith('GZIP:') || documentContent.startsWith('LZ:')) {
      try {
        console.log('Decompressing document...');
        documentContent = await decompressGzip(documentContent);
        console.log('Decompression successful');
      } catch (error) {
        console.error('Failed to decompress document:', error);
        alert('Failed to decompress document. The document may be corrupted.');
        return;
      }
    }

    // Open in new tab
    const newTab: DocumentTab = {
      id: doc.id,
      name: doc.name,
      content: documentContent,
      isDirty: false
    };
    setOpenTabs([...openTabs, newTab]);
    setActiveTabId(newTab.id);
    setCurrentDocumentId(doc.id);
  };

  const handleOpenDocument = async (doc: SavedDocument) => {
    try {
      await openDocumentInTab(doc);
      setShowLandingPage(false); // Switch to editor view
    } catch (error: any) {
      console.error('Error opening document:', error);
      alert(`Failed to open document: ${error.message || 'Unknown error'}`);
    }
  };

  const handleOpenDocuments = async (docs: SavedDocument[]) => {
    try {
      console.log('Opening documents:', docs.length, docs.map(d => d.name));
      const openedDocs: DocumentTab[] = [];
      
      for (const doc of docs) {
        // Check if document is already open
        const existingTab = openTabs.find(tab => tab.id === doc.id);
        if (existingTab) {
          openedDocs.push(existingTab);
          continue;
        }

        // Load document content if needed (for cloud documents)
        let documentContent = doc.content;
        if (user && !incognitoMode && doc.id.startsWith('doc_')) {
          try {
            const { getDocumentFromFirestore } = await import('./services/firestoreService');
            const cloudDoc = await getDocumentFromFirestore(user.uid, doc.id);
            if (cloudDoc) {
              documentContent = cloudDoc.content;
            }
          } catch (err) {
            console.error('Error loading cloud document:', err);
          }
        }

        // Create new tab
        const newTab: DocumentTab = {
          id: doc.id,
          name: doc.name,
          content: documentContent,
          isDirty: false
        };
        openedDocs.push(newTab);
      }

      // Add all new tabs at once
      setOpenTabs(prevTabs => {
        const existingIds = new Set(prevTabs.map(t => t.id));
        const newTabs = openedDocs.filter(tab => !existingIds.has(tab.id));
        return [...prevTabs, ...newTabs];
      });
      
      // Set the active tab to the first document
      if (openedDocs.length > 0) {
        setActiveTabId(openedDocs[0].id);
        setCurrentDocumentId(openedDocs[0].id);
        setShowLandingPage(false); // Switch to editor view
      }
    } catch (error: any) {
      console.error('Error opening documents:', error);
      alert(`Failed to open some documents: ${error.message || 'Unknown error'}`);
    }
  };

  const handleOpenWordDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
          const htmlContent = await readDocxFile(file);
          editorRef.current?.appendText(htmlContent);
      } catch (error) {
          console.error('Error opening Word document:', error);
          alert('Failed to open Word document. Please try again.');
      }

      // Reset the file input
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  const handleOpenClick = () => {
      fileInputRef.current?.click();
  };

  const handleNavigateToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element && mainContainerRef.current) {
      const rect = element.getBoundingClientRect();
      const containerRect = mainContainerRef.current.getBoundingClientRect();
      mainContainerRef.current.scrollTo({ 
        top: mainContainerRef.current.scrollTop + rect.top - containerRect.top - 100, 
        behavior: 'smooth' 
      });
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleUndo = () => {
    // Focus the editor first to ensure commands work on it
    editorRef.current?.focus();
    // Use execCommand for undo (works on contentEditable elements)
    // The browser will handle the undo stack automatically
    document.execCommand('undo', false);
    // Trigger content update after a short delay to capture the change
    setTimeout(() => {
      // Find the contentEditable element
      const editorElement = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editorElement) {
        setNoteContent(editorElement.innerHTML);
      }
    }, 50);
  };

  const handleRedo = () => {
    // Focus the editor first to ensure commands work on it
    editorRef.current?.focus();
    // Use execCommand for redo (works on contentEditable elements)
    // The browser will handle the redo stack automatically
    document.execCommand('redo', false);
    // Trigger content update after a short delay to capture the change
    setTimeout(() => {
      // Find the contentEditable element
      const editorElement = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editorElement) {
        setNoteContent(editorElement.innerHTML);
      }
    }, 50);
  };

  const handleInsertList = (type: 'ul' | 'ol', style?: string) => {
      if (!editorRef.current) return;
      
      // First create the list
      if (type === 'ul') {
          editorRef.current.format('insertUnorderedList');
      } else {
          editorRef.current.format('insertOrderedList');
      }
      
      // Then apply custom style if provided
      if (style && style !== 'default') {
          setTimeout(() => {
              const selection = window.getSelection();
              if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  let element = range.commonAncestorContainer as Node;
                  
                  if (element.nodeType === Node.TEXT_NODE) {
                      element = element.parentNode as Node;
                  }
                  
                  const list = (element as HTMLElement).closest('ul, ol');
                  if (list) {
                      const htmlList = list as HTMLElement;
                      
                      // Apply the selected style
                      if (style.startsWith('custom-')) {
                          // For custom formats like 1) or (1), we need to use CSS counter
                          const isOL = htmlList.tagName === 'OL';
                          if (isOL) {
                              htmlList.style.listStyleType = 'none';
                              htmlList.style.counterReset = 'custom-counter';
                              
                              const items = htmlList.querySelectorAll('li');
                              items.forEach((li, index) => {
                                  const htmlLi = li as HTMLElement;
                                  htmlLi.style.counterIncrement = 'custom-counter';
                                  
                                  if (style === 'custom-paren') {
                                      htmlLi.style.setProperty('list-style', 'none');
                                      htmlLi.setAttribute('data-number', `${index + 1})`);
                                      htmlLi.style.setProperty('--list-marker', `'${index + 1}) '`);
                                  } else if (style === 'custom-both') {
                                      htmlLi.style.setProperty('list-style', 'none');
                                      htmlLi.setAttribute('data-number', `(${index + 1})`);
                                      htmlLi.style.setProperty('--list-marker', `'(${index + 1}) '`);
                                  }
                              });
                          }
                      } else {
                          // Standard CSS list-style-type
                          htmlList.style.listStyleType = style;
                      }
                      
                      console.log('Applied list style:', style);
                  }
              }
          }, 100);
      }
  };

  const handleInsertTable = (rows: number, cols: number) => {
      if (rows < 1 || cols < 1) return;
      
      let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;" border="1">';
      
      // Create header row
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
          tableHtml += '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">Header ' + (c + 1) + '</th>';
      }
      tableHtml += '</tr>';
      
      // Create data rows
      for (let r = 0; r < rows - 1; r++) {
          tableHtml += '<tr>';
          for (let c = 0; c < cols; c++) {
              tableHtml += '<td style="border: 1px solid #ddd; padding: 8px; text-align: left;">Cell</td>';
          }
          tableHtml += '</tr>';
      }
      
      tableHtml += '</table><p><br></p>';
      
      editorRef.current?.appendText(tableHtml);
  };

  return (
    <div className="flex h-full w-full font-sans text-gray-800 dark:text-gray-200">
      {showLandingPage ? (
        <DocumentLandingPage
          onOpenDocument={handleOpenDocument}
          onOpenDocuments={handleOpenDocuments}
          onCreateNew={handleCreateNewDocument}
          onCreateNewResearch={handleNewResearch}
          onOpenResearch={handleOpenResearch}
          userId={user?.uid}
          incognitoMode={incognitoMode}
          user={user}
        />
      ) : (
        <div className="flex-1 flex flex-col relative">
          {/* Modern Header with Two Rows */}
          <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700/50 shadow-sm">
          {/* First Row: Brand + Action Buttons */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800/50">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <h1 className="hidden sm:block text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                AI Note Taker
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5">
              {/* Home Button */}
              <button
                onClick={() => setShowLandingPage(true)}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                title="Home - Return to documents"
              >
                <HomeIcon className="h-4 w-4" />
              </button>
              
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
              
              {/* Document Management – hidden for research tabs */}
              {!isResearchTab && (
                <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
                  <button
                    onClick={() => setIsSaveDocumentDialogOpen(true)}
                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                    title="Save document locally"
                  >
                    <SaveIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsDocumentLibraryOpen(true)}
                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                    title="My Documents"
                  >
                    <FolderIcon className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* My Projects – shown only on research tabs */}
              {isResearchTab && (
                <div className="flex items-center gap-0.5 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm px-1 py-0.5 rounded-md border border-gray-200/50 dark:border-gray-700/50">
                  <button
                    onClick={async () => {
                      setMyProjectsLoading(true);
                      setIsMyProjectsOpen(true);
                      try {
                        const { getAllResearchProjectsFromFirestore } = await import('./services/researchFirestoreService');
                        const projects = await getAllResearchProjectsFromFirestore(user?.uid || '');
                        setMyProjects(projects);
                      } catch (e) { console.error(e); }
                      setMyProjectsLoading(false);
                    }}
                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-all flex items-center gap-1.5 px-2"
                    title="My Research Projects"
                  >
                    <FolderIcon className="h-4 w-4" />
                    <span className="text-xs font-medium">My Projects</span>
                  </button>
                </div>
              )}

              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>

                {/* Import Word + Find – hidden on research tabs */}
                {!isResearchTab && (
                  <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleOpenWordDocument}
                  accept=".docx"
                  className="hidden"
                />
                <button
                  onClick={handleOpenClick}
                  className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                  title="Import Word document"
                >
                  <UploadIcon className="h-4 w-4" />
                </button>
             <button
                onClick={() => {
                  setIsFindVisible(true);
                  setTimeout(() => editorRef.current?.focus(), 0);
                }}
                  className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                title="Find text (Ctrl+F)"
              >
                  <SearchIcon className="h-4 w-4" />
              </button>
                  </>
                )}
               {/* Transcribe button – hidden on research tabs */}
              {!isResearchTab && (
              <button
                onClick={() => setIsTranscriptionOpen(true)}
                className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                title="Transcribe files"
              >
                <DocumentIcon className="h-4 w-4" />
              </button>
              )}
              {/* Table of Contents – always visible; on research tabs it triggers the research TOC */}
              <button
                onClick={() => {
                  if (isResearchTab) {
                    setIsResearchTocOpen(prev => !prev);
                  } else {
                    setIsTableOfContentsOpen(true);
                  }
                }}
                className={`p-1.5 rounded-md transition-all ${
                  isResearchTab
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
                title={isResearchTab ? 'Document Outline' : 'Table of Contents'}
              >
                <TableOfContentsIcon className="h-4 w-4" />
              </button>
            <div className="relative" ref={exportMenuRef}>
                 <button
                    onClick={handleToggleExportMenu}
                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                    title="Export note"
                  >
                    <ExportIcon className="h-4 w-4" />
                  </button>
                {isExportMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-40 animate-fade-in-fast">
                      <div className="p-1.5 space-y-0.5">
                        <button onClick={() => handleExport('pdf')} className="w-full flex items-center px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                          <PdfIcon className="h-4 w-4 mr-2.5 text-red-500" />
                          <span>{selectedContentForExport ? 'Selection → PDF' : 'Save as PDF'}</span>
                        </button>
                        <button onClick={() => handleExport('docx')} className="w-full flex items-center px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                          <WordIcon className="h-4 w-4 mr-2.5 text-blue-500" />
                          <span>{selectedContentForExport ? 'Selection → Word' : 'Save as Word'}</span>
                                </button>
                        <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                        <button onClick={() => handleExport('html')} className="w-full text-left px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                          {selectedContentForExport ? 'Selection → HTML' : 'Save as HTML'}
                                </button>
                        <button onClick={() => handleExport('md')} className="w-full text-left px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                          {selectedContentForExport ? 'Selection → MD' : 'Save as Markdown'}
                                </button>
                        <button onClick={() => handleExport('txt')} className="w-full text-left px-2.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-all">
                          {selectedContentForExport ? 'Selection → TXT' : 'Save as Text'}
                                </button>
                      </div>
                    </div>
                )}
            </div>
                
            {lastBrainstorm && (
              <button
                onClick={() => {
                  setIsNewBrainstormSession(false);
                  setIsHelpMeThinkModalOpen(true);
                }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all"
                title="Continue last brainstorm session"
              >
                    <BrainIcon className="h-4 w-4" />
                    <span>Thoughts</span>
              </button>
            )}
              
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600"></div>
              
              {/* Authentication */}
              {user ? (
                <>
                  <UserProfile onOpenProvider={() => setIsProviderOpen(true)} />
                  {incognitoMode && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-md text-xs font-medium">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="hidden sm:inline">Incognito</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsProviderOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-all"
                    title="Provider"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Provider</span>
                  </button>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    title="Sign in to sync documents"
                  >
                    <CloudIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign In</span>
                  </button>
                </>
              )}
              </div>
            </div>
          
          {/* Second Row: Document Tabs */}
          <DocumentTabs
            tabs={openTabs}
            activeTabId={activeTabId}
            onTabClick={handleTabSwitch}
            onTabClose={handleTabClose}
            onTabRename={handleTabRename}
            onNewTab={handleNewTab}
            onNewResearch={handleNewResearch}
          />

          {/* Third Row: Formatting Toolbar – hidden on research tabs */}
          {!isResearchTab && (
            <div className="px-4 py-2">
              <FormattingToolbar
                onFormat={(type, value) => editorRef.current?.format(type, value)}
                onClear={() => editorRef.current?.clear()}
                onInsertList={handleInsertList}
                onOpenSelectionMenu={() => {
                  editorRef.current?.openSelectionMenu();
                }}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
            </div>
          )}
        </header>

        {/* Main content — swap NoteEditor for ResearchWorkspace on research tabs */}
        {activeTab?.type === 'research' && activeTab.researchProjectId ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ResearchWorkspace
              key={activeTab.researchProjectId}
              projectId={activeTab.researchProjectId}
              userId={user?.uid}
              editorRef={editorRef}
              zoomLevel={zoomLevel}
              onToggleFind={setIsFindVisible}
              isFindVisible={isFindVisible}
              searchResults={searchResults}
              onFind={handleFind}
              onNavigate={handleFindNavigate}
              onCloseFind={handleCloseFind}
              setCounts={setCounts}
              onProjectUpdate={setActiveResearchProject}
              isTocOpen={isResearchTocOpen}
              onCloseToc={() => setIsResearchTocOpen(false)}
            />
          </div>
        ) : (
          <main ref={mainContainerRef} className="flex-1 flex flex-col items-center py-8 px-4 overflow-y-auto">
            <div className="w-full max-w-4xl relative">
              {isFindVisible && (
                <FindAndReplaceBar
                  onFind={handleFind}
                  onNavigate={handleFindNavigate}
                  onClose={handleCloseFind}
                  results={searchResults}
                />
              )}
              <NoteEditor
                ref={editorRef}
                content={noteContent}
                setContent={setNoteContent}
                scrollContainerRef={mainContainerRef}
                zoomLevel={zoomLevel}
                onToggleFind={setIsFindVisible}
                onOpenHelpMeThink={() => {
                  setIsNewBrainstormSession(true);
                  setIsHelpMeThinkModalOpen(true);
                }}
                availableDocuments={openTabs.map(tab => ({ id: tab.id, name: tab.name }))}
                currentDocumentId={activeTabId || undefined}
                onSwitchDocument={(documentId: string) => {
                  if (documentId !== activeTabId) {
                    setActiveTabId(documentId);
                    setPendingInsertion(null);
                  }
                }}
                onInsertToDocument={async (documentId: string, content: string) => {
                  if (documentId !== activeTabId) {
                    setActiveTabId(documentId);
                    setTimeout(() => {
                      setPendingInsertion({ documentId, content });
                    }, 200);
                  } else {
                    setPendingInsertion({ documentId, content });
                  }
                }}
              />
            </div>
          </main>
        )}

        <StatusToolbar
            counts={counts}
            zoomLevel={zoomLevel}
            onZoomIn={() => setZoomLevel(z => Math.min(200, z + 10))}
            onZoomOut={() => setZoomLevel(z => Math.max(50, z - 10))}
            onSetZoom={setZoomLevel}
        />
        
        {/* Compression Indicator */}
        {activeTab && <CompressionIndicator content={activeTab.content} />}
        
        {/* Auto-save indicator */}
        {isAutoSaving && activeTab?.id.startsWith('doc_') && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in-fast">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm font-medium">Saving...</span>
          </div>
        )}
        
        {!isAutoSaving && activeTab?.id.startsWith('doc_') && activeTab.isDirty && (
          <div className="fixed bottom-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-fade-in-fast">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="text-sm font-medium">Unsaved changes</span>
          </div>
        )}
        </div>
      )}

      {!showLandingPage && (
        <ChatWindow addTextToNote={handleAddTextToNote} />
      )}

      {/* My Projects Modal — shown when research tab is active */}
      {isMyProjectsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsMyProjectsOpen(false)}>
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <FolderIcon className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">My Research Projects</h2>
              </div>
              <button
                onClick={() => setIsMyProjectsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            {/* Project list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {myProjectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : myProjects.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <p className="text-sm">No research projects found.</p>
                  <p className="text-xs mt-1">Create a new research project to get started.</p>
                </div>
              ) : (
                myProjects
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(proj => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        handleOpenResearch(proj);
                        setIsMyProjectsOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                            {proj.meta.projectName}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {proj.meta.author} · {proj.resources.length} resource{proj.resources.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-600 ml-4 shrink-0">
                          {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))
              )}
            </div>

            {/* Footer: New project button */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  setIsMyProjectsOpen(false);
                  handleNewResearch();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow"
              >
                + New Research Project
              </button>
            </div>
          </div>
        </div>
      )}

      <HelpMeThinkModal
        isOpen={isHelpMeThinkModalOpen}
        onClose={() => setIsHelpMeThinkModalOpen(false)}
        onInsertText={(text) => {
            const html = markdownToHtml(text);
            editorRef.current?.appendText(html);
        }}
        initialSession={isNewBrainstormSession ? null : lastBrainstorm}
        onFinish={(session) => {
            setLastBrainstorm(session);
        }}
       />

      <ProviderModal
        isOpen={isProviderOpen}
        onClose={() => setIsProviderOpen(false)}
        onOpenSettings={(provider) => {
          setIsProviderOpen(false);
          setSettingsInitialProvider(provider);
          setIsSettingsOpen(true);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        initialProvider={settingsInitialProvider}
        onClose={() => {
          setIsSettingsOpen(false);
          setSettingsInitialProvider(undefined);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Research Project Setup Modal */}
      {isResearchSetupOpen && (
        <ResearchProjectSetupModal
          onConfirm={handleResearchSetupConfirm}
          onCancel={() => setIsResearchSetupOpen(false)}
        />
      )}

      <SaveDialog
        isOpen={saveDialogOpen}
        onClose={() => {
          setSaveDialogOpen(false);
          setPendingExport(null);
        }}
        onSave={handleSaveFile}
        defaultFilename={pendingExport ? `ai-note${selectedContentForExport ? '-selection' : ''}.${pendingExport.format === 'md' ? 'md' : pendingExport.format}` : 'ai-note.txt'}
        format={pendingExport ? `.${pendingExport.format}` : '.txt'}
      />

      <SaveDocumentDialog
        isOpen={isSaveDocumentDialogOpen}
        onClose={() => setIsSaveDocumentDialogOpen(false)}
        onSave={handleSaveDocumentLocally}
        currentDocumentName={activeTab?.name !== 'Untitled' ? activeTab?.name : undefined}
        userId={user?.uid}
        incognitoMode={incognitoMode}
      />

      {compressionDialogData && (
        <CompressionDialog
          isOpen={isCompressionDialogOpen}
          onClose={() => {
            setIsCompressionDialogOpen(false);
            setCompressionDialogData(null);
          }}
          onConfirm={handleCompressionConfirm}
          content={compressionDialogData.content}
          documentName={compressionDialogData.name}
          maxSize={900000}
        />
      )}

      <DocumentLibrary
        isOpen={isDocumentLibraryOpen}
        onClose={() => setIsDocumentLibraryOpen(false)}
        onOpenDocument={handleOpenDocument}
        currentDocumentId={activeTabId}
        userId={user?.uid}
        incognitoMode={incognitoMode}
      />

      {selectedWare && (
        <WareViewModal
          isOpen={isWareViewModalOpen}
          onClose={() => {
            setIsWareViewModalOpen(false);
            setSelectedWare(null);
          }}
          ware={selectedWare}
          onOpenDocument={handleOpenDocument}
          onOpenDocuments={handleOpenDocuments}
          onDeleteWare={async () => {
            if (!selectedWare) return;
            try {
              if (user && !incognitoMode) {
                await deleteWareFromFirestore(user.uid, selectedWare.id);
              } else {
                await deleteWare(selectedWare.id);
              }
              setIsWareViewModalOpen(false);
              setSelectedWare(null);
            } catch (error) {
              console.error('Error deleting WARE:', error);
              throw error;
            }
          }}
          onAddDocuments={() => {
            setIsDocumentLibraryOpen(true);
          }}
          userId={user?.uid}
          incognitoMode={incognitoMode}
        />
      )}

      <CloseTabDialog
        isOpen={closeTabDialogOpen}
        onClose={() => {
          setCloseTabDialogOpen(false);
          setTabToClose(null);
        }}
        onSave={handleSaveAndClose}
        onDontSave={handleDontSaveAndClose}
        documentName={openTabs.find(t => t.id === tabToClose)?.name || 'Untitled'}
      />

      <TableOfContentsModal
        isOpen={isTableOfContentsOpen}
        onClose={() => setIsTableOfContentsOpen(false)}
        editorContent={noteContent}
        onNavigateToHeading={handleNavigateToHeading}
        onMarkHeading={handleNavigateToHeading}
        documentId={activeTabId || undefined}
      />

      {isTranscriptionOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl">
              <TranscriptionScreen
                onTranscriptionComplete={handleTranscriptionComplete}
                onBack={() => setIsTranscriptionOpen(false)}
                onHome={() => {
                  setIsTranscriptionOpen(false);
                  setShowLandingPage(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {transcriptionPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Review Transcription</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Preview the generated content before inserting it into the document.
                </p>
              </div>
              <button
                onClick={() => setTranscriptionPreview(null)}
                className="px-4 py-2 text-sm font-medium rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 px-6 py-4 overflow-y-auto">
              <div className="flex-1 min-h-[300px] border border-gray-200 dark:border-gray-700 rounded-2xl p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: transcriptionPreview.html }}
                />
              </div>
              <div className="md:w-80 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-800">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
                  Detected Issues ({transcriptionPreview.errors.length})
                </h4>
                {transcriptionPreview.errors.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    No spelling or grammar issues were reported.
                  </p>
                ) : (
                  <ul className="space-y-3 text-xs text-gray-700 dark:text-gray-200 max-h-64 overflow-y-auto">
                    {transcriptionPreview.errors.map((err, idx) => (
                      <li key={`${err.original}-${idx}`} className="p-2 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
                        <p className="font-semibold">Original:</p>
                        <p className="text-gray-600 dark:text-gray-300 break-words">{err.original}</p>
                        <p className="font-semibold mt-2">Suggestion:</p>
                        <p className="text-green-600 dark:text-green-400 break-words">{err.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setTranscriptionPreview(null)}
                className="px-5 py-2 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Close
              </button>
              <button
                onClick={handleApplyTranscription}
                className="px-6 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow"
              >
                Insert into Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table modal removed */}
    </div>
  );
};

export default App;
