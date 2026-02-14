import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useState } from 'react';
import type { editor } from 'monaco-editor';

export function useCollaboration(
  roomId: string, 
  editorInstance: editor.IStandaloneCodeEditor | null,
  fileId: string | null
) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');

  useEffect(() => {
    if (!editorInstance || !roomId || !fileId) return;

    let binding: any = null;
    const ydoc = new Y.Doc();
    const wsProvider = new WebsocketProvider('wss://demos.yjs.dev', roomId, ydoc);
    
    // Use fileId as key to support multi-file editing in the same room
    const yText = ydoc.getText(fileId);

    // Dynamically import y-monaco to avoid SSR issues
    const initBinding = async () => {
      const { MonacoBinding } = await import('y-monaco');
      binding = new MonacoBinding(
        yText,
        editorInstance.getModel()!,
        new Set([editorInstance]),
        wsProvider.awareness
      );
    };

    initBinding();

    // Handle connection status
    wsProvider.on('status', (event: { status: 'connected' | 'disconnected' | 'connecting' }) => {
      setStatus(event.status);
      console.log(`Collaboration ${event.status} to room: ${roomId} (file: ${fileId})`);
    });

    setProvider(wsProvider);

    // Cleanup
    return () => {
      wsProvider.disconnect();
      wsProvider.destroy();
      ydoc.destroy();
      if (binding) binding.destroy();
      setProvider(null);
      setStatus('disconnected');
    };
  }, [roomId, editorInstance, fileId]);

  return { provider, status };
}
