import React, { useState, useRef } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, ImageIcon, DocumentIcon, UploadIcon } from '../icons';
import { ResearchResource, ResourceCategory } from '../../types';
import { NativeDocumentSelector } from './NativeDocumentSelector';

interface ResourcePaneProps {
  resources: ResearchResource[];
  onChange: (resources: ResearchResource[]) => void;
  onOpenResource?: (id: string) => void;
  activeDocumentId?: string;
  userId?: string | null;
}

type SectionState = {
  expanded: boolean;
  uploading: boolean;
};

const compressImage = (file: File, maxPx = 900, quality = 0.75): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });

const CATEGORY_CONFIG = {
  scheme: {
    label: 'Scheme',
    color: 'from-blue-500 to-cyan-500',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    icon: <DocumentIcon className="h-4 w-4" />,
  },
  notes: {
    label: 'Notes',
    color: 'from-emerald-500 to-teal-500',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    icon: <DocumentIcon className="h-4 w-4" />,
  },
  images: {
    label: 'Images',
    color: 'from-orange-500 to-amber-500',
    bgLight: 'bg-orange-50 dark:bg-amber-950/30',
    badge: 'bg-orange-100 text-orange-700 dark:bg-amber-900/50 dark:text-amber-300',
    icon: <ImageIcon className="h-4 w-4" />,
  },
};

export const ResourcePane: React.FC<ResourcePaneProps> = ({
  resources,
  onChange,
  onOpenResource,
  activeDocumentId,
  userId,
}) => {
  const [sections, setSections] = useState<Record<ResourceCategory, SectionState>>({
    scheme: { expanded: false, uploading: false },
    notes: { expanded: false, uploading: false },
    images: { expanded: false, uploading: false },
  });
  const [textInputs, setTextInputs] = useState<Record<ResourceCategory, string>>({
    scheme: '',
    notes: '',
    images: '',
  });
  const [textNames, setTextNames] = useState<Record<ResourceCategory, string>>({
    scheme: '',
    notes: '',
    images: '',
  });

  const fileInputRefs = {
    scheme: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLInputElement>(null),
    images: useRef<HTMLInputElement>(null),
  };

  const toggleSection = (cat: ResourceCategory) => {
    setSections(prev => ({
      ...prev,
      [cat]: { ...prev[cat], expanded: !prev[cat].expanded },
    }));
  };

  const addResource = (resource: ResearchResource) => {
    onChange([...resources, resource]);
  };

  const removeResource = (id: string) => {
    onChange(resources.filter(r => r.id !== id));
  };

  const handleTextAdd = (cat: ResourceCategory) => {
    const name = textNames[cat].trim() || `${CATEGORY_CONFIG[cat].label} ${Date.now()}`;
    const content = textInputs[cat].trim();
    if (!content) return;
    addResource({
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category: cat,
      name,
      content,
      addedAt: Date.now(),
    });
    setTextInputs(prev => ({ ...prev, [cat]: '' }));
    setTextNames(prev => ({ ...prev, [cat]: '' }));
  };

  const handleFileUpload = async (cat: ResourceCategory, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;

    setSections(prev => ({ ...prev, [cat]: { ...prev[cat], uploading: true } }));
    try {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await compressImage(file);
          addResource({
            id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            category: cat,
            name: file.name,
            fileDataUrl: dataUrl,
            mimeType: 'image/jpeg',
            addedAt: Date.now(),
          });
        } else {
          let text = '';
          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
              try {
                  const { extractTextFromPdf } = await import('../../services/pdfExtract');
                  text = await extractTextFromPdf(file);
              } catch (e) {
                  console.error('PDF extraction failed:', e);
                  text = `<p>Error extracting PDF text. Ensure it is a valid text-based PDF.</p>`;
              }
          } else if (file.name.toLowerCase().endsWith('.docx')) {
              try {
                  const { readDocxFile } = await import('../../services/docxService');
                  text = await readDocxFile(file);
              } catch (e) {
                  console.error('DOCX extraction failed:', e);
                  text = `<p>Error extracting Word Document.</p>`;
              }
          } else {
              text = await readFileAsText(file);
          }
          addResource({
            id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            category: cat,
            name: file.name,
            content: text.slice(0, 50000),
            addedAt: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setSections(prev => ({ ...prev, [cat]: { ...prev[cat], uploading: false } }));
      e.target.value = '';
    }
  };

  const categories: ResourceCategory[] = ['scheme', 'notes', 'images'];

  return (
    <div className="flex flex-col gap-3 p-3">
      {categories.map(cat => {
        const cfg = CATEGORY_CONFIG[cat];
        const catResources = resources.filter(r => r.category === cat);
        const { expanded, uploading } = sections[cat];

        return (
          <div
            key={cat}
            className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
          >
            {/* Section header */}
            <button
              onClick={() => toggleSection(cat)}
              className={`w-full flex items-center justify-between px-3 py-2.5 ${cfg.bgLight} hover:opacity-90 transition-all`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-md bg-gradient-to-br ${cfg.color} text-white`}>
                  {cfg.icon}
                </div>
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                  {cfg.label}
                </span>
                {catResources.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${cfg.badge}`}>
                    {catResources.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <div
                  onClick={e => {
                    e.stopPropagation();
                    if (!expanded) toggleSection(cat);
                  }}
                  className="p-1 rounded hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all"
                  title={`Add to ${cfg.label}`}
                >
                  <PlusIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </div>
                {expanded ? (
                  <ChevronUpIcon className="h-3.5 w-3.5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-3.5 w-3.5 text-gray-500" />
                )}
              </div>
            </button>

            {/* Expanded upload area */}
            {expanded && (
              <div className="bg-white dark:bg-gray-900 p-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                {/* Text input (scheme & notes) */}
                {cat !== 'images' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={`Name (optional)`}
                      value={textNames[cat]}
                      onChange={e => setTextNames(prev => ({ ...prev, [cat]: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    <textarea
                      rows={4}
                      placeholder={`Paste ${cfg.label.toLowerCase()} content here…`}
                      value={textInputs[cat]}
                      onChange={e => setTextInputs(prev => ({ ...prev, [cat]: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                    />
                    <button
                      onClick={() => handleTextAdd(cat)}
                      disabled={!textInputs[cat].trim()}
                      className="w-full py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 text-white disabled:opacity-40 hover:opacity-90 transition-all"
                    >
                      Add Text
                    </button>
                  </div>
                )}

                {/* File upload */}
                <div>
                  <input
                    ref={fileInputRefs[cat]}
                    type="file"
                    className="hidden"
                    multiple
                    accept={cat === 'images' ? 'image/*' : 'image/*,.txt,.md,.pdf,.docx'}
                    onChange={e => handleFileUpload(cat, e)}
                  />
                  <button
                    onClick={() => fileInputRefs[cat].current?.click()}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-500 dark:hover:border-violet-500 transition-all disabled:opacity-50"
                  >
                    <UploadIcon className="h-3.5 w-3.5" />
                    {uploading
                      ? 'Uploading…'
                      : cat === 'images'
                      ? 'Upload Images'
                      : 'Upload File (docs, pdf, images)'}
                  </button>
                </div>

                {/* Native Document Select */}
                {cat !== 'images' && (
                  <NativeDocumentSelector 
                    userId={userId} 
                    onSelectMultiple={(docs) => {
                      const newResources = docs.map(doc => ({
                        id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                        category: cat,
                        name: doc.name,
                        content: doc.content || '',
                        addedAt: Date.now(),
                      }));
                      onChange([...resources, ...newResources]);
                    }} 
                    disabled={uploading} 
                  />
                )}
              </div>
            )}

            {/* Resource list */}
            {catResources.length > 0 && (
              <ul className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                {catResources.map(res => {
                  const isActive = activeDocumentId === res.id;
                  const isTextual = !res.fileDataUrl && res.content !== undefined;
                  
                  return (
                  <li
                    key={res.id}
                    onClick={() => {
                        if (isTextual && onOpenResource) {
                            onOpenResource(res.id);
                        }
                    }}
                    className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                      isActive 
                        ? 'bg-violet-100 dark:bg-violet-900/40 ring-1 ring-violet-300 dark:ring-violet-700' 
                        : isTextual 
                          ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer' 
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    {res.category === 'images' && res.fileDataUrl ? (
                      <img
                        src={res.fileDataUrl}
                        alt={res.name}
                        className="h-8 w-8 rounded object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className={`p-1 rounded ${isActive ? 'bg-violet-200 text-violet-800 dark:bg-violet-800 dark:text-violet-200' : cfg.badge} flex-shrink-0`}>
                        {cfg.icon}
                      </div>
                    )}
                    <span className="flex-1 text-xs text-gray-800 dark:text-gray-200 truncate">
                      {res.name}
                    </span>
                    <button
                      onClick={() => removeResource(res.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Remove"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )})}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};
