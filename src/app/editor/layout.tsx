import React from 'react';

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full bg-zinc-900 overflow-hidden">
      {children}
    </div>
  );
}
