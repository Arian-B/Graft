'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Plugin, Version, ActivityLog } from '@/lib/types';
import { PLUGIN_PLATFORMS } from '@/lib/pluginTypes';
import { logActivity } from '@/lib/activity';

function capitalize(str: string): string {
  return str
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PluginDetailsPage({ params }: { params: { id: string } }) {
  const pluginId = params.id;

  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('graft_user');
    setCurrentUser(user);

    async function fetchData() {
      // Fetch plugin
      const { data: pluginData, error: pluginError } = await supabase
        .from('plugins')
        .select('*')
        .eq('id', pluginId)
        .single();

      if (pluginError) {
        console.error('Error fetching plugin:', pluginError);
        setError(pluginError.message);
        setLoading(false);
        return;
      }

      setPlugin(pluginData);

      // Fetch versions
      const { data: versionData, error: versionError } = await supabase
        .from('versions')
        .select('*')
        .eq('plugin_id', pluginId)
        .order('version_number', { ascending: false });

      if (versionError) {
        console.error('Error fetching versions:', versionError);
        setError(versionError.message);
      } else {
        setVersions(versionData || []);
      }

      // Fetch logs
      const { data: logData, error: logError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('plugin_id', pluginId)
        .order('created_at', { ascending: false });

      if (logError) {
         console.error('Error fetching logs:', logError);
      } else {
         setLogs(logData || []);
      }

      setLoading(false);
    }

    fetchData();
  }, [pluginId]);

  const handleMarkStable = async (versionId: string) => {
    if (!plugin) return;
    
    // Check ownership
    if (plugin.owner_name && currentUser !== plugin.owner_name) {
      alert('Only the owner can manage versions.');
      return;
    }

    // Set all versions to not stable
    const { error: clearError } = await supabase
      .from('versions')
      .update({ is_stable: false })
      .eq('plugin_id', pluginId);

    if (clearError) {
      console.error('Error clearing stable:', clearError);
      return;
    }

    // Set selected version as stable
    const { error: setError } = await supabase
      .from('versions')
      .update({ is_stable: true })
      .eq('id', versionId);

    if (setError) {
      console.error('Error setting stable:', setError);
      return;
    }

    // Update UI
    setVersions((prev) =>
      prev.map((v) => ({
        ...v,
        is_stable: v.id === versionId,
      }))
    );

    // Log activity
    logActivity(pluginId, currentUser!, 'Marked Stable', { version_number: versions.find(v => v.id === versionId)?.version_number });
  };

  const handlePublish = async () => {
    if (!plugin) return;
    
    // Find stable version
    const stableVersion = versions.find((v) => v.is_stable);
    if (!stableVersion) {
      alert('No stable version found to publish.');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('plugins')
        .update({
          marketplace_published: true,
          marketplace_version: stableVersion.version_number,
          marketplace_platform: plugin.plugin_type,
        })
        .eq('id', pluginId);

      if (updateError) throw updateError;

      // Update local state
      setPlugin({
        ...plugin,
        marketplace_published: true,
        marketplace_version: stableVersion.version_number,
        marketplace_platform: plugin.plugin_type,
      });

      setPublishMessage(`Version ${stableVersion.version_number} is now marked as Published.`);
      setTimeout(() => setPublishMessage(null), 5000);

      // Log activity
      logActivity(pluginId, currentUser!, 'Published', { version_number: stableVersion.version_number });

    } catch (err: any) {
      console.error('Publish error:', err);
      alert('Failed to publish: ' + err.message);
    }
  };

  const openMarketplace = () => {
    if (!plugin) return;
    const platformInfo = PLUGIN_PLATFORMS[plugin.plugin_type];
    if (platformInfo?.marketplaceUrl) {
      window.open(platformInfo.marketplaceUrl, '_blank');
    } else {
      alert('No marketplace URL defined for this platform.');
    }
  };

  const openOfficialDocs = () => {
    if (!plugin) return;
    const platformInfo = PLUGIN_PLATFORMS[plugin.plugin_type];
    if (platformInfo?.officialDocsUrl) {
      window.open(platformInfo.officialDocsUrl, '_blank');
    }
  };

  const openOfficialPlatform = () => {
    if (!plugin) return;
    const platformInfo = PLUGIN_PLATFORMS[plugin.plugin_type];
    if (platformInfo?.officialPlatformUrl) {
      window.open(platformInfo.officialPlatformUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-lg">Loading plugin...</p>
        </div>
      </div>
    );
  }

  if (error || !plugin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">
            {error || 'Plugin not found'}
          </p>
          <Link href="/dashboard" className="text-orange-500 hover:text-orange-400">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const stableVersion = versions.find((v) => v.is_stable);
  const isOwner = currentUser === plugin.owner_name;

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 hover:text-orange-500 transition-colors mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>
        
        {/* Plugin Header */}
        <div className="border-b border-zinc-800 pb-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white">
                  {plugin.name}
                </h1>
                {plugin.marketplace_published && (
                   <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                     Published
                   </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {capitalize(plugin.plugin_type)}
                </span>
                {stableVersion && (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    Stable: v{stableVersion.version_number}
                  </span>
                )}
                <span className="text-xs text-zinc-500">
                  {versions.length} version{versions.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-zinc-600 border-l border-zinc-800 pl-3 ml-1">
                  Owner: {plugin.owner_name || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
               {plugin.marketplace_published && (
                <button
                  onClick={openMarketplace}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors border border-zinc-700"
                >
                  Open in Marketplace ↗
                </button>
               )}

               {isOwner ? (
                <Link
                  href={`/editor/${plugin.plugin_type}?id=${plugin.id}`}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                >
                  Edit Plugin
                </Link>
               ) : (
                 <Link
                  href={`/editor/${plugin.plugin_type}?id=${plugin.id}`}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors border border-zinc-700"
                >
                  View Code
                </Link>
               )}
            </div>
          </div>
        </div>

        {/* Platform Guidance Section */}
        {plugin && PLUGIN_PLATFORMS[plugin.plugin_type] && (
          <div className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Platform Implementation</h2>
            
            <div className="mb-6">
              {PLUGIN_PLATFORMS[plugin.plugin_type].previewSupport === 'full' && (
                <p className="text-zinc-300">
                  This plugin type supports full in-browser preview in Graft.
                </p>
              )}
              {PLUGIN_PLATFORMS[plugin.plugin_type].previewSupport === 'partial' && (
                <p className="text-zinc-300">
                  Graft provides partial preview for this plugin type. 
                  For complete testing and packaging, continue on the official platform.
                </p>
              )}
              {PLUGIN_PLATFORMS[plugin.plugin_type].previewSupport === 'template' && (
                <p className="text-zinc-300">
                  Graft provides structure and collaboration support only.
                  Full implementation must be completed on the official platform.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={openOfficialDocs}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors border border-zinc-700"
              >
                Visit Official Documentation ↗
              </button>
              <button 
                onClick={openOfficialPlatform}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors border border-zinc-700"
              >
                Visit Official Platform ↗
              </button>
              <button 
                onClick={openMarketplace}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors border border-zinc-700"
              >
                Open Marketplace ↗
              </button>
            </div>
          </div>
        )}

        {/* Marketplace Publish Section (Owner Only) */}
        {isOwner && (
          <div className="mb-10 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Marketplace Publishing</h2>
            
            {publishMessage && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-sm">
                {publishMessage}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm mb-1">
                  Publish your stable version to the {capitalize(plugin.plugin_type)} marketplace.
                </p>
                {!stableVersion && (
                   <p className="text-amber-500 text-xs mt-1">
                     ⚠ Mark a version as Stable before publishing.
                   </p>
                )}
                {stableVersion && plugin.marketplace_published && plugin.marketplace_version === stableVersion.version_number && (
                  <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
                    ✓ Version {stableVersion.version_number} is live.
                  </p>
                )}
                {stableVersion && plugin.marketplace_published && plugin.marketplace_version !== stableVersion.version_number && (
                  <p className="text-blue-400 text-xs mt-1">
                    ℹ Marketplace is on v{plugin.marketplace_version}. Publish v{stableVersion.version_number} to update.
                  </p>
                )}
                
                {PLUGIN_PLATFORMS[plugin.plugin_type]?.previewSupport !== 'full' && (
                  <p className="text-zinc-500 text-xs mt-3 border-t border-zinc-800 pt-2">
                    Note: Before publishing, ensure final testing is completed on the official platform.
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <button
                onClick={handlePublish}
                disabled={!stableVersion}
                className={`px-5 py-2.5 rounded-md text-sm font-bold transition-all ${
                  stableVersion
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                }`}
              >
                {plugin.marketplace_published 
                  ? 'Update Marketplace Version'
                  : 'Publish Stable Version'
                }
              </button>
              </div>
            </div>
          </div>
        )}

        {/* Version History */}
        <h2 className="text-lg font-semibold text-white mb-4">Version History</h2>

        {versions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-500">No versions yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div
                key={version.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors gap-4"
              >
                <div className="flex items-center gap-4">
                  {/* Version Number */}
                  <span className="text-white font-semibold text-sm min-w-[40px]">
                    v{version.version_number}
                  </span>

                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {version.is_stable ? (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        Stable
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        Draft
                      </span>
                    )}

                    {plugin.marketplace_published && plugin.marketplace_version === version.version_number && (
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        Live on Marketplace
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <span className="text-xs text-zinc-500 hidden sm:inline">
                    {formatDate(version.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {!version.is_stable && isOwner && (
                    <button
                      onClick={() => handleMarkStable(version.id)}
                      className="text-xs text-zinc-400 hover:text-orange-400 px-3 py-1.5 rounded border border-zinc-700 hover:border-orange-500/30 transition-colors"
                    >
                      Mark Stable
                    </button>
                  )}
                  {version.version_number > 1 && (
                    <Link
                      href={`/plugin/${pluginId}/compare/${version.version_number}`}
                      className="text-xs text-zinc-400 hover:text-orange-400 px-3 py-1.5 rounded border border-zinc-700 hover:border-orange-500/30 transition-colors"
                    >
                      Compare with Previous
                    </Link>
                  )}
                  <Link
                    href={`/editor/${plugin.plugin_type}?id=${plugin.id}&version=${version.version_number}`}
                    className="text-xs text-orange-500 hover:text-orange-400 px-3 py-1.5 rounded border border-orange-500/30 hover:bg-orange-500/10 transition-colors"
                  >
                    {isOwner ? 'Open in Editor' : 'View Code'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Timeline */}
        <h2 className="text-lg font-semibold text-white mt-12 mb-6">Activity</h2>
        <div className="border-l border-zinc-800 ml-3 pl-6 space-y-6">
          {logs.length === 0 ? (
            <p className="text-zinc-500 text-sm">No activity recorded yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute -left-[29px] top-1.5 w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <p className="text-sm text-zinc-300">
                  <span className="font-medium text-white">{log.actor}</span>
                  {' '}
                  <span className="text-zinc-500">•</span>
                  {' '}
                  {log.action}
                  {log.metadata?.version_number && (
                    <span className="text-zinc-500"> (v{log.metadata.version_number})</span>
                  )}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {formatDate(log.created_at)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
