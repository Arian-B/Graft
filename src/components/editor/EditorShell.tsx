'use client';

import { ReactNode } from 'react';

interface EditorShellProps {
  children: ReactNode;
}

export default function EditorShell({ children }: EditorShellProps) {
  return (
    <div className="h-screen flex flex-col bg-zinc-900">
      {children}
    </div>
  );
}
