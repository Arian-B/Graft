'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DiffEditor } from '@monaco-editor/react';
import { Version, Plugin } from '@/lib/types';

export default function ComparePage({ params }: { params: { id: string; version: string } }) {
  const pluginId = params.id;
  const currentVersionNum = parseInt(params.version);
  const previousVersionNum = currentVersionNum - 1;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [previousVersion, setPreviousVersion] = useState<Version | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Plugin
        const { data: pluginData, error: pluginError } = await supabase
          .from('plugins')
          .select('*')
          .eq('id', pluginId)
          .single();

        if (pluginError) throw pluginError;
        setPlugin(pluginData);

        // Fetch Current Version
        const { data: currentData, error: currentError } = await supabase
          .from('versions')
          .select('*')
          .eq('plugin_id', pluginId)
          .eq('version_number', currentVersionNum)
          .single();

        if (currentError) throw new Error(`Version ${currentVersionNum} not found.`);
        setCurrentVersion(currentData);

        // Fetch Previous Version
        const { data: prevData, error: prevError } = await supabase
          .from('versions')
          .select('*')
          .eq('plugin_id', pluginId)
          .eq('version_number', previousVersionNum)
          .single();

        if (!prevError) {
          setPreviousVersion(prevData);
        } else {
          // If no previous version, we might treat it as empty or just show error if expected
          // But strict requirement: "Handle case where previous version does not exist."
          // We'll set it to null and handle in UI
          console.warn('Previous version not found:', prevError.message);
        }

        // Set default file
        if (currentData && currentData.files) {
          const files = Object.keys(currentData.files);
          if (files.length > 0) {
            setSelectedFile(files[0]);
          }
        }

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [pluginId, currentVersionNum, previousVersionNum]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !currentVersion) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <p className="mb-4 text-red-400">{error || 'Version not found'}</p>
        <Link href={`/plugin/${pluginId}`} className="text-orange-500 hover:text-orange-400">
          ← Back to Plugin Details
        </Link>
      </div>
    );
  }

  const currentCode = selectedFile && currentVersion.files ? currentVersion.files[selectedFile] || '' : '';
  const previousCode = selectedFile && previousVersion && previousVersion.files ? previousVersion.files[selectedFile] || '' : '';

  // Get union of files from both versions to populate selector
  const allFiles = new Set<string>();
  if (currentVersion.files) Object.keys(currentVersion.files).forEach(f => allFiles.add(f));
  if (previousVersion?.files) Object.keys(previousVersion.files).forEach(f => allFiles.add(f));
  const fileList = Array.from(allFiles).sort();

  // Helper for language detection
  function getLanguageFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'json': 'json',
      'php': 'php',
      'java': 'java',
      'html': 'html',
      'css': 'css',
      'tsx': 'typescript',
      'jsx': 'javascript',
    };
    return languageMap[ext || ''] || 'plaintext';
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-4">
          <Link 
            href={`/plugin/${pluginId}`}
            className="text-zinc-400 hover:text-orange-500 transition-colors text-sm font-medium"
          >
            ← Back
          </Link>
          <div className="h-6 w-px bg-zinc-700" />
          <h1 className="text-lg font-semibold">
            Comparing <span className="text-orange-400">v{currentVersionNum}</span> with <span className="text-zinc-400">v{previousVersionNum}</span>
          </h1>
          {plugin && (
             <span className="text-xs text-zinc-500 ml-2">({plugin.name})</span>
          )}
        </div>

        {/* File Selector */}
        <div className="flex items-center gap-2">
           <span className="text-sm text-zinc-500">File:</span>
           <select 
             value={selectedFile || ''}
             onChange={(e) => setSelectedFile(e.target.value)}
             className="bg-zinc-800 border border-zinc-700 text-white text-sm rounded px-3 py-1 focus:outline-none focus:border-orange-500"
           >
             {fileList.map((f) => (
               <option key={f} value={f}>{f}</option>
             ))}
           </select>
        </div>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 relative">
        {selectedFile ? (
          <DiffEditor
            height="100%"
            theme="vs-dark"
            original={previousCode}
            modified={currentCode}
            language={getLanguageFromFilename(selectedFile)}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            No file selected
          </div>
        )}
      </div>
    </div>
  );
}
