'use client';

import Editor from '@monaco-editor/react';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getTemplate } from '@/lib/templates';
import { PluginType, PLUGIN_NAMES } from '@/lib/types';
import { PLUGIN_PLATFORMS } from '@/lib/pluginTypes';
import { useCollaboration } from '@/lib/useCollaboration';
import { logActivity } from '@/lib/activity';
import { supabase } from '@/lib/supabase';
import type { editor } from 'monaco-editor';
import EditorShell from '@/components/editor/EditorShell';
import EditorTopbar from '@/components/editor/EditorTopbar';
import EditorSidebar from '@/components/editor/EditorSidebar';

// Helper to get language from filename
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

function EditorContent({ params }: { params: { type: string } }) {
  const pluginType = params.type as PluginType;
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get('id');
  const versionFromUrl = searchParams.get('version');

  // Load template as default/fallback
  const template = getTemplate(pluginType);

  // File state
  const filesRef = useRef<Record<string, string>>({ ...template.files });
  const [currentFileName, setCurrentFileName] = useState(template.entry);
  const [code, setCode] = useState(filesRef.current[template.entry]);
  const [language, setLanguage] = useState(getLanguageFromFilename(template.entry));

  // Plugin & version state
  const [pluginId, setPluginId] = useState<string | null>(idFromUrl);
  const [pluginName, setPluginName] = useState(PLUGIN_NAMES[pluginType] || 'New Plugin');
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number | null>(null);
  
  // Ownership & Access state
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true); // Default to true for new plugins until saved
  const [hasRequest, setHasRequest] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!!idFromUrl);
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);

  // Collaboration
  const { status: collabStatus } = useCollaboration(
    pluginId ?? '', 
    editorInstance, 
    currentFileName
  );

  // Load current user from local storage on mount
  useEffect(() => {
    const user = localStorage.getItem('graft_user');
    setCurrentUser(user);
  }, []);

  // Check requests if not owner
  useEffect(() => {
    if (pluginId && currentUser && !isOwner) {
      const checkRequest = async () => {
        const { data } = await supabase
          .from('edit_requests')
          .select('status')
          .eq('plugin_id', pluginId)
          .eq('requester_name', currentUser)
          .eq('status', 'pending')
          .single();
        
        if (data) setHasRequest(true);
      };
      checkRequest();
    }
  }, [pluginId, currentUser, isOwner]);

  // Fetch existing plugin version from Supabase
  useEffect(() => {
    if (!idFromUrl) return;

    async function fetchPlugin() {
      try {
        // Fetch plugin metadata
        const { data: pluginData, error: pluginError } = await supabase
          .from('plugins')
          .select('*')
          .eq('id', idFromUrl)
          .single();

        if (pluginError) {
          console.error('Error fetching plugin:', pluginError);
          setSaveMessage(`Error loading plugin: ${pluginError.message}`);
          setIsLoading(false);
          return;
        }

        setPluginName(pluginData.name || PLUGIN_NAMES[pluginType] || 'New Plugin');
        setOwnerName(pluginData.owner_name);

        // Check ownership
        const user = localStorage.getItem('graft_user');
        if (pluginData.owner_name && user !== pluginData.owner_name) {
          setIsOwner(false);
        } else {
          setIsOwner(true);
        }

        // Determine which version to load
        let versionQuery = supabase
          .from('versions')
          .select('*')
          .eq('plugin_id', idFromUrl);

        if (versionFromUrl) {
          // Load specific version
          versionQuery = versionQuery.eq('version_number', parseInt(versionFromUrl));
        } else {
          // Load latest version
          versionQuery = versionQuery.order('version_number', { ascending: false }).limit(1);
        }

        const { data: versionData, error: versionError } = await versionQuery.single();

        if (versionError) {
          console.error('Error fetching version:', versionError);
          setSaveMessage(`Error loading version: ${versionError.message}`);
          setIsLoading(false);
          return;
        }

        // Load saved files into state
        const savedFiles = versionData.files as Record<string, string>;
        filesRef.current = savedFiles;
        setCurrentVersionNumber(versionData.version_number);

        const firstFile = Object.keys(savedFiles)[0];
        setCurrentFileName(firstFile);
        setCode(savedFiles[firstFile]);
        setLanguage(getLanguageFromFilename(firstFile));
      } catch (err) {
        console.error('Unexpected error:', err);
      }

      setIsLoading(false);
    }

    fetchPlugin();
  }, [idFromUrl, versionFromUrl, pluginType]);

  const handleFileSelect = (filename: string) => {
    // Only update ref if owner
    if (isOwner) {
      filesRef.current[currentFileName] = code;
    }
    setCurrentFileName(filename);
    setCode(filesRef.current[filename]);
    setLanguage(getLanguageFromFilename(filename));
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!isOwner) return; // Read-only
    const newCode = value || '';
    setCode(newCode);
    filesRef.current[currentFileName] = newCode;
  };

  const handleRequestAccess = async () => {
    let requester = currentUser;
    if (!requester) {
      requester = prompt('Enter your name to request access:', '') || null;
      if (!requester) return;
      localStorage.setItem('graft_user', requester);
      setCurrentUser(requester);
    }

    if (!pluginId) return;

    const { error } = await supabase
      .from('edit_requests')
      .insert({
        plugin_id: pluginId,
        requester_name: requester,
        status: 'pending'
      });

    if (error) {
      alert('Failed to send request: ' + error.message);
    } else {
      setHasRequest(true);
      alert('Request sent to creator.');
    }
  };

  const handleSave = async () => {
    if (!isOwner) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Prompt for creator name on first save if not set
      let creator = currentUser;
      if (!creator) {
        creator = prompt('Enter your name (Creator):', '') || null;
        if (!creator) {
          setIsSaving(false);
          return;
        }
        localStorage.setItem('graft_user', creator);
        setCurrentUser(creator);
      }

      // Sync current editor content
      filesRef.current[currentFileName] = code;

      let currentPluginId = pluginId;

      if (!currentPluginId) {
        // FIRST SAVE: Insert plugin, then version 1
        const { data: newPlugin, error: pluginError } = await supabase
          .from('plugins')
          .insert({
            name: pluginName,
            plugin_type: pluginType,
            owner_name: creator,
          })
          .select('id')
          .single();

        if (pluginError) throw pluginError;
        currentPluginId = newPlugin.id;
        setPluginId(currentPluginId);
        setOwnerName(creator);
        setIsOwner(true);

        // Insert version 1 as stable
        const { error: versionError } = await supabase
          .from('versions')
          .insert({
            plugin_id: currentPluginId,
            version_number: 1,
            files: filesRef.current,
            is_stable: true,
          });


        if (versionError) throw versionError;
        setCurrentVersionNumber(1);
        setSaveMessage('Plugin created — v1 (stable)');
        
        // Log creation
        logActivity(newPlugin.id, creator!, 'Plugin Created');
        logActivity(newPlugin.id, creator!, 'Version Created', { version_number: 1, is_stable: true });
      } else {
        // SUBSEQUENT SAVE: Get max version, insert next
        const { data: maxData, error: maxError } = await supabase
          .from('versions')
          .select('version_number')
          .eq('plugin_id', currentPluginId)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();

        if (maxError) throw maxError;

        const nextVersion = (maxData?.version_number || 0) + 1;

        const { error: versionError } = await supabase
          .from('versions')
          .insert({
            plugin_id: currentPluginId,
            version_number: nextVersion,
            files: filesRef.current,
            is_stable: false,
          });

        if (versionError) throw versionError;
        setCurrentVersionNumber(nextVersion);
        setSaveMessage(`Saved as v${nextVersion}`);

        // Log version
        logActivity(currentPluginId, creator!, 'Version Created', { version_number: nextVersion, is_stable: false });
      }

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setSaveMessage(`Error: ${errorMessage}`);
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading spinner
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-900 h-screen">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-lg">Loading plugin...</p>
        </div>
      </div>
    );
  }

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Platform Preview Banner */}
      {PLUGIN_PLATFORMS[pluginType]?.previewSupport === 'partial' && (
        <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-1.5 text-center text-xs text-orange-500">
          Partial preview mode. Complete implementation on official platform.
        </div>
      )}
      {PLUGIN_PLATFORMS[pluginType]?.previewSupport === 'template' && (
        <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-1.5 text-center text-xs text-zinc-400">
          Template-only mode. Use official tools to fully test this plugin.
        </div>
      )}

      {/* Collaboration Indicator */}
      {collabStatus === 'connected' && (
        <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-1 text-center text-xs text-green-400 font-medium flex justify-center items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Collaboration Active
        </div>
      )}

      {isOwner ? (
        <EditorTopbar
          pluginName={pluginName}
          currentFileName={currentFileName}
          onSave={handleSave}
          isSaving={isSaving}
          saveMessage={saveMessage}
        />
      ) : (
        <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">{pluginName}</h2>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-zinc-700 text-zinc-300 border border-zinc-600">
              Read Only
            </span>
          </div>
          <div>
            {hasRequest ? (
              <span className="text-sm text-yellow-500 font-medium">Request Pending...</span>
            ) : (
              <button
                onClick={handleRequestAccess}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Request Edit Access
              </button>
            )}
          </div>
        </div>
      )}

      {/* Access Warning Banner if not owner */}
      {!isOwner && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-sm text-yellow-500">
          You are viewing a plugin by <strong>{ownerName}</strong>. Request access to edit.
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <EditorSidebar
          files={filesRef.current}
          currentFileName={currentFileName}
          onFileSelect={handleFileSelect}
        />

        <div className="flex-1 bg-zinc-900 relative">
          <Editor
            height="100%"
            language={language}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              readOnly: !isOwner,
            }}
          />
        </div>

        <div className="w-80 bg-zinc-800 border-l border-zinc-700 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-zinc-400 mb-4">PREVIEW</h3>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
            <p className="text-zinc-500 text-sm text-center">
              Preview will appear here when available for this plugin type.
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">DETAILS</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Type:</span>
                <span className="text-zinc-300">{PLUGIN_NAMES[pluginType]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Owner:</span>
                <span className="text-zinc-300">{ownerName || 'You'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Version:</span>
                <span className="text-zinc-300">
                  {currentVersionNumber ? `v${currentVersionNumber}` : 'Unsaved'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status:</span>
                <span className="text-green-400">Draft</span>
              </div>
              {pluginId && (
                <div className="mt-4 pt-3 border-t border-zinc-700">
                  <a
                    href={`/plugin/${pluginId}`}
                    className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    View all versions →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage({ params }: { params: { type: string } }) {
  return (
    <EditorShell>
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-zinc-900">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <EditorContent params={params} />
      </Suspense>
    </EditorShell>
  );
}
