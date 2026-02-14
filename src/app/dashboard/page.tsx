'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PLUGIN_PLATFORMS } from '@/lib/pluginTypes';

interface PluginWithVersionInfo {
  id: string;
  name: string;
  plugin_type: string;
  created_at: string;
  stable_version: number | null;
  total_versions: number;
  owner_name: string;
  marketplace_published: boolean;
  marketplace_version: number | null;
}

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
  });
}

export default function Dashboard() {
  const [plugins, setPlugins] = useState<PluginWithVersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Load simulated user
    const user = localStorage.getItem('graft_user');
    setCurrentUser(user);

    async function fetchPlugins() {
      // Fetch plugins
      const { data: pluginData, error: pluginError } = await supabase
        .from('plugins')
        .select('*')
        .order('created_at', { ascending: false });

      if (pluginError) {
        console.error('Error fetching plugins:', pluginError);
        setError(pluginError.message);
        setLoading(false);
        return;
      }

      // Fetch version info for each plugin
      const enriched: PluginWithVersionInfo[] = await Promise.all(
        (pluginData || []).map(async (plugin) => {
          const { data: versions } = await supabase
            .from('versions')
            .select('version_number, is_stable')
            .eq('plugin_id', plugin.id)
            .order('version_number', { ascending: false });

          const stableVersion = versions?.find((v) => v.is_stable);

          return {
            ...plugin,
            stable_version: stableVersion?.version_number ?? null,
            total_versions: versions?.length || 0,
          };
        })
      );

      setPlugins(enriched);
      setLoading(false);
    }

    fetchPlugins();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              My Plugins
            </h1>
            <p className="text-zinc-400">
              Manage and monitor your plugin projects
            </p>
            {currentUser && (
              <p className="text-zinc-500 text-sm mt-1">
                Logged in as: <span className="text-orange-400">{currentUser}</span>
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <Link
              href="/requests"
              className="group relative flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium px-5 py-3 rounded-lg border border-zinc-700 transition-all"
            >
              <span>Inbox</span>
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse group-hover:bg-orange-400" />
            </Link>
            
            <Link
              href="/create"
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-3 rounded-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 transform hover:scale-105"
            >
              + Create New Plugin
            </Link>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-400 text-lg">Loading plugins...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 mb-6">
            Failed to load plugins: {error}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && plugins.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-zinc-400 text-lg mb-2">No plugins yet.</p>
            <Link href="/create" className="text-orange-500 hover:text-orange-400 font-medium transition-colors">
              Create one →
            </Link>
          </div>
        )}

        {/* Plugin Grid */}
        {!loading && !error && plugins.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plugins.map((plugin) => (
              <Link
                key={plugin.id}
                href={`/plugin/${plugin.id}`}
                className="block group"
              >
                <div className="bg-zinc-800/50 border border-zinc-700 hover:border-orange-500/50 rounded-lg p-6 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10 h-full relative overflow-hidden">
                  
                  {/* Owner Label */}
                  {plugin.owner_name && (
                    <div className="absolute top-4 right-4 text-xs font-semibold text-zinc-500 group-hover:text-zinc-400">
                      by {plugin.owner_name}
                    </div>
                  )}

                  {/* Plugin Name */}
                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-orange-500 transition-colors pr-12">
                    {plugin.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-zinc-700/50 text-zinc-300 border border-zinc-600">
                      {capitalize(plugin.plugin_type)}
                    </span>
                    {PLUGIN_PLATFORMS[plugin.plugin_type]?.previewSupport !== 'full' && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        External Testing Required
                      </span>
                    )}
                    {plugin.marketplace_published && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                        Published
                      </span>
                    )}
                    {plugin.stable_version !== null && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        v{plugin.stable_version}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    {plugin.marketplace_published && plugin.marketplace_version && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-zinc-400">Live Version:</span>
                        <span className="text-sm text-green-400">v{plugin.marketplace_version}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Versions:</span>
                      <span className="text-sm text-zinc-200">{plugin.total_versions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Created:</span>
                      <span className="text-sm text-zinc-200">{formatDate(plugin.created_at)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
