'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { EditRequest } from '@/lib/types';
import { logActivity } from '@/lib/activity';

interface ExtendedRequest extends EditRequest {
  plugin_name?: string; // We'll join or fetch this
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ExtendedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem('graft_user');
    setCurrentUser(user);
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchRequests() {
      // 1. Get plugins owned by current user
      const { data: myPlugins, error: pluginError } = await supabase
        .from('plugins')
        .select('id, name')
        .eq('owner_name', user);

      if (pluginError || !myPlugins?.length) {
        setLoading(false);
        return;
      }

      const pluginIds = myPlugins.map((p) => p.id);
      const pluginMap = Object.fromEntries(myPlugins.map((p) => [p.id, p.name]));

      // 2. Get incoming requests for these plugins
      const { data: requestData, error: requestError } = await supabase
        .from('edit_requests')
        .select('*')
        .in('plugin_id', pluginIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestError) {
        console.error('Error fetching requests:', requestError);
      } else {
        const extended = (requestData || []).map((r) => ({
          ...r,
          plugin_name: pluginMap[r.plugin_id],
        }));
        setRequests(extended);
      }
      setLoading(false);
    }

    fetchRequests();
  }, []);

  const handleApprove = async (req: ExtendedRequest) => {
    try {
      // 1. Update request status
      const { error: updateError } = await supabase
        .from('edit_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      if (updateError) throw updateError;

      // 2. Fetch original plugin details
      const { data: originalPlugin, error: orgError } = await supabase
        .from('plugins')
        .select('*')
        .eq('id', req.plugin_id)
        .single();
      
      if (orgError) throw orgError;

      // 3. Create NEW plugin (Fork)
      const { data: newPlugin, error: createError } = await supabase
        .from('plugins')
        .insert({
          name: `${originalPlugin.name} (Fork)`,
          plugin_type: originalPlugin.plugin_type,
          owner_name: req.requester_name,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // 4. Get latest version of original
      const { data: latestVersion, error: verError } = await supabase
        .from('versions')
        .select('*')
        .eq('plugin_id', req.plugin_id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      if (verError) throw verError;

      // 5. Copy files to new plugin as version 1
      const { error: copyError } = await supabase
        .from('versions')
        .insert({
          plugin_id: newPlugin.id,
          version_number: 1,
          files: latestVersion.files,
          is_stable: true,
        });

      if (copyError) throw copyError;
      
      // Log Fork (Original)
      logActivity(req.plugin_id, req.requester_name, 'Fork Created', { new_plugin_id: newPlugin.id });

      // Log Creation (New)
      logActivity(newPlugin.id, req.requester_name, 'Plugin Created');
      logActivity(newPlugin.id, req.requester_name, 'Version Created', { version_number: 1, is_stable: true });

      // Log Approval
      logActivity(req.plugin_id, currentUser || 'Unknown', 'Edit Request Approved', { request_id: req.id });

      alert('Fork created successfully!');
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== req.id));

    } catch (err: any) {
      alert('Error approving request: ' + err.message);
    }
  };

  const handleReject = async (id: string) => {
    const req = requests.find(r => r.id === id);
    const { error } = await supabase
      .from('edit_requests')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) {
      alert('Error rejecting: ' + error.message);
    } else {
      if (req) {
         logActivity(req.plugin_id, currentUser || 'Unknown', 'Edit Request Rejected', { request_id: id });
      }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Edit Requests</h1>
            <p className="text-zinc-400 text-sm">
              Incoming requests to edit your plugins
            </p>
          </div>
          <Link href="/dashboard" className="text-orange-500 hover:text-orange-400 text-sm">
            ← Back to Dashboard
          </Link>
        </div>

        {!currentUser ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
            <p className="text-zinc-400 mb-4">You are not identified.</p>
            <p className="text-sm text-zinc-500">
              Create or edit a plugin to set your simulated identity.
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-1">No pending requests</h3>
            <p className="text-zinc-500 text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-white">{req.requester_name}</span>
                    <span className="text-zinc-500 text-sm">wants to edit</span>
                    <span className="text-orange-400 font-medium">{req.plugin_name}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Requested on {new Date(req.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-4 py-2 rounded-md text-sm font-medium text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(req)}
                    className="px-4 py-2 rounded-md text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 transition-all"
                  >
                    Approve & Fork
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
