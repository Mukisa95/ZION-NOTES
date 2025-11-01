import React from 'react';

interface CompressionIndicatorProps {
  content: string;
}

export const CompressionIndicator: React.FC<CompressionIndicatorProps> = ({ content }) => {
  const isCompressed = content.startsWith('GZIP:') || content.startsWith('LZ:');
  
  if (!isCompressed) return null;
  
  const type = content.startsWith('GZIP:') ? 'GZIP' : 'LZ';
  
  return (
    <div className="fixed top-20 right-4 z-50 bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in-fast">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
      <span className="text-xs font-semibold">{type} Compressed</span>
    </div>
  );
};

