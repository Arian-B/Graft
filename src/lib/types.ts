// Plugin Types
export type PluginType = 
  | 'chrome-extension'
  | 'vscode-extension'
  | 'wordpress-plugin'
  | 'figma-plugin'
  | 'photoshop-plugin'
  | 'minecraft-mod';

// Preview Support Levels
export type PreviewSupport = 
  | 'Full Preview'
  | 'Partial Preview'
  | 'UI Preview Only'
  | 'Template Only';

// Plugin Template File
export interface PluginFile {
  name: string;
  content: string;
  language: string;
}

// Plugin Template with structured files
export interface PluginTemplate {
  files: Record<string, string>; // filename -> content
  entry: string; // entry file name
}

// Plugin Info for Create Page
export interface PluginInfo {
  id: PluginType;
  name: string;
  supportLevel: PreviewSupport;
  badgeColor: string;
  description: string;
  icon: string;
}

// Plugin Name Mapping
export const PLUGIN_NAMES: Record<PluginType, string> = {
  'chrome-extension': 'Chrome Extension',
  'vscode-extension': 'VS Code Extension',
  'wordpress-plugin': 'WordPress Plugin',
  'figma-plugin': 'Figma Plugin',
  'photoshop-plugin': 'Photoshop Plugin',
  'minecraft-mod': 'Minecraft Mod',
};

// Plugin row from Supabase
export interface Plugin {
  id: string;
  name: string;
  plugin_type: string;
  created_at: string;
  owner_name: string;
  marketplace_published: boolean;
  marketplace_version: number | null;
  marketplace_platform: string | null;
}

// Version row from Supabase
export interface Version {
  id: string;
  plugin_id: string;
  version_number: number;
  files: Record<string, string>;
  is_stable: boolean;
  created_at: string;
}

// Edit Request row from Supabase
export interface EditRequest {
  id: string;
  plugin_id: string;
  requester_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  // Joins
  plugins?: Plugin;
}

// Activity Log row from Supabase
export interface ActivityLog {
  id: string;
  plugin_id: string;
  actor: string;
  action: string;
  metadata: any;
  created_at: string;
}
