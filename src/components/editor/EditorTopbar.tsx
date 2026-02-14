interface EditorTopbarProps {
  pluginName: string;
  currentFileName: string;
  onSave: () => void;
  isSaving: boolean;
  saveMessage: string | null;
}

export default function EditorTopbar({
  pluginName,
  currentFileName,
  onSave,
  isSaving,
  saveMessage,
}: EditorTopbarProps) {
  return (
    <div className="bg-zinc-800 border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">
          {pluginName}
        </h2>
        <span className="text-sm text-zinc-400">•</span>
        <span className="text-sm text-zinc-400">{currentFileName}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={isSaving}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            isSaving
              ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
              : 'bg-zinc-700 hover:bg-zinc-600 text-white'
          }`}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed opacity-50 border border-orange-500/30">
          Publish
        </button>

        {saveMessage && (
          <span className={`text-sm font-medium ${
            saveMessage.startsWith('Error')
              ? 'text-red-400'
              : 'text-green-400'
          }`}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}
