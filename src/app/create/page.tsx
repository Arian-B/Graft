'use client';

import Link from 'next/link';
import { PluginInfo } from '@/lib/types';

export default function CreatePage() {
  const pluginTypes: PluginInfo[] = [
    {
      id: 'chrome-extension',
      name: 'Chrome Extension',
      supportLevel: 'Full Preview',
      badgeColor: 'bg-green-500/20 text-green-400 border-green-500/30',
      description: 'Build browser extensions with full live preview and testing capabilities.',
      icon: '🌐',
    },
    {
      id: 'vscode-extension',
      name: 'VS Code Extension',
      supportLevel: 'Partial Preview',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      description: 'Create powerful VS Code extensions with partial preview support.',
      icon: '💻',
    },
    {
      id: 'wordpress-plugin',
      name: 'WordPress Plugin',
      supportLevel: 'Partial Preview',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      description: 'Develop WordPress plugins with collaborative editing and preview.',
      icon: '📝',
    },
    {
      id: 'figma-plugin',
      name: 'Figma Plugin',
      supportLevel: 'UI Preview Only',
      badgeColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      description: 'Design Figma plugins with UI preview capabilities.',
      icon: '🎨',
    },
    {
      id: 'photoshop-plugin',
      name: 'Photoshop Plugin',
      supportLevel: 'Template Only',
      badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      description: 'Build Adobe Photoshop plugins using our starter templates.',
      icon: '🖼️',
    },
    {
      id: 'minecraft-mod',
      name: 'Minecraft Mod',
      supportLevel: 'Template Only',
      badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      description: 'Create Minecraft mods with pre-configured templates and structure.',
      icon: '⛏️',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plugin Type
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Select the type of plugin you want to build. Each option provides different levels of support and preview capabilities.
          </p>
        </div>

        {/* Plugin Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pluginTypes.map((plugin) => (
            <Link
              key={plugin.id}
              href={`/editor/${plugin.id}`}
              className="block group"
            >
              <div className="bg-zinc-800/50 border border-zinc-700 hover:border-orange-500/50 rounded-lg p-6 h-full transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105 cursor-pointer">
                {/* Icon Placeholder Circle */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 flex items-center justify-center mb-4 group-hover:from-orange-500/30 group-hover:to-orange-600/30 transition-all">
                  <span className="text-3xl">{plugin.icon}</span>
                </div>

                {/* Plugin Name */}
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-orange-500 transition-colors">
                  {plugin.name}
                </h3>

                {/* Support Badge */}
                <div className="mb-4">
                  <span className={`inline-block text-xs font-medium px-3 py-1 rounded-full border ${plugin.badgeColor}`}>
                    {plugin.supportLevel}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {plugin.description}
                </p>

                {/* Arrow Icon */}
                <div className="mt-4 flex items-center text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-medium mr-2">Get Started</span>
                  <svg
                    className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
