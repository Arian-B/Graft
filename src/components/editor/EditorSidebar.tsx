interface EditorSidebarProps {
  files: Record<string, string>; // filename -> content
  currentFileName: string;
  onFileSelect: (filename: string) => void;
}

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

export default function EditorSidebar({ files, currentFileName, onFileSelect }: EditorSidebarProps) {
  const fileNames = Object.keys(files);

  return (
    <div className="w-64 bg-zinc-800 border-r border-zinc-700 p-4 overflow-y-auto">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">FILES</h3>
        <div className="space-y-1">
          {fileNames.map((filename) => (
            <div
              key={filename}
              className={`text-sm px-3 py-2 rounded cursor-pointer transition-colors ${
                currentFileName === filename
                  ? 'text-white bg-orange-500/10 border border-orange-500/30'
                  : 'text-zinc-400 hover:bg-zinc-700'
              }`}
              onClick={() => onFileSelect(filename)}
            >
              📄 {filename}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">STRUCTURE</h3>
        <div className="text-xs text-zinc-500 space-y-1">
          <div>📁 src</div>
          <div className="ml-4">📁 components</div>
          <div className="ml-4">📁 utils</div>
          <div>📁 assets</div>
        </div>
      </div>
    </div>
  );
}
