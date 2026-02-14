import { PluginType, PluginTemplate } from './types';

export function getTemplate(type: PluginType): PluginTemplate {
  const templates: Record<PluginType, PluginTemplate> = {
    'chrome-extension': {
      entry: 'manifest.json',
      files: {
        'manifest.json': `{
  "manifest_version": 3,
  "name": "My Chrome Extension",
  "version": "1.0.0",
  "description": "A powerful Chrome extension built with Graft",
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"]
}`,
        'popup.js': `// Chrome Extension Popup Script
document.addEventListener('DOMContentLoaded', function() {
  console.log('Extension popup loaded!');
  
  const button = document.getElementById('actionBtn');
  
  button.addEventListener('click', async function() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Execute script in current tab
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        alert('Hello from your Chrome Extension!');
      }
    });
  });
  
  // Load saved data
  chrome.storage.sync.get(['data'], function(result) {
    console.log('Stored data:', result.data);
  });
});`
      }
    },
    
    'vscode-extension': {
      entry: 'package.json',
      files: {
        'package.json': `{
  "name": "my-vscode-extension",
  "displayName": "My VS Code Extension",
  "description": "A VS Code extension built with Graft",
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./extension.js",
  "contributes": {
    "commands": [
      {
        "command": "extension.helloWorld",
        "title": "Hello World"
      }
    ]
  }
}`,
        'extension.ts': `import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "my-vscode-extension" is now active!');

  let disposable = vscode.commands.registerCommand(
    'extension.helloWorld',
    () => {
      vscode.window.showInformationMessage('Hello from VS Code Extension!');
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  console.log('Extension deactivated');
}`
      }
    },
    
    'wordpress-plugin': {
      entry: 'my-plugin.php',
      files: {
        'my-plugin.php': `<?php
/**
 * Plugin Name: My WordPress Plugin
 * Plugin URI: https://example.com/my-plugin
 * Description: A custom WordPress plugin built with Graft
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://example.com
 * License: GPL2
 * Text Domain: my-plugin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('MY_PLUGIN_VERSION', '1.0.0');
define('MY_PLUGIN_PATH', plugin_dir_path(__FILE__));

// Initialize plugin
add_action('plugins_loaded', 'my_plugin_init');

function my_plugin_init() {
    // Plugin initialization code
    add_action('admin_menu', 'my_plugin_menu');
    add_action('admin_enqueue_scripts', 'my_plugin_scripts');
}

// Add admin menu
function my_plugin_menu() {
    add_menu_page(
        'My Plugin Settings',
        'My Plugin',
        'manage_options',
        'my-plugin',
        'my_plugin_settings_page',
        'dashicons-admin-plugins',
        100
    );
}

// Settings page
function my_plugin_settings_page() {
    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <p>Welcome to your custom WordPress plugin!</p>
    </div>
    <?php
}

// Enqueue scripts
function my_plugin_scripts($hook) {
    if ($hook !== 'toplevel_page_my-plugin') {
        return;
    }
    
    wp_enqueue_style('my-plugin-styles', plugins_url('assets/style.css', __FILE__));
    wp_enqueue_script('my-plugin-script', plugins_url('assets/script.js', __FILE__));
}`
      }
    },
    
    'figma-plugin': {
      entry: 'manifest.json',
      files: {
        'manifest.json': `{
  "name": "My Figma Plugin",
  "id": "000000000000000000",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"]
}`,
        'code.ts': `// Figma Plugin Main Code
figma.showUI(__html__, { width: 300, height: 400 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-rectangle') {
    const rect = figma.createRectangle();
    rect.x = figma.viewport.center.x;
    rect.y = figma.viewport.center.y;
    rect.resize(100, 100);
    rect.fills = [
      {
        type: 'SOLID',
        color: { r: 1, g: 0.5, b: 0 }
      }
    ];
    
    figma.currentPage.appendChild(rect);
    figma.currentPage.selection = [rect];
    figma.viewport.scrollAndZoomIntoView([rect]);
    
    figma.ui.postMessage({
      type: 'creation-complete',
      message: 'Rectangle created successfully!'
    });
  }
  
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};`
      }
    },
    
    'photoshop-plugin': {
      entry: 'index.js',
      files: {
        'index.js': `// Photoshop Plugin Entry Point
const { app, action } = require('photoshop');

async function createNewLayer() {
  try {
    const doc = app.activeDocument;
    
    await action.batchPlay([
      {
        _obj: 'make',
        _target: [{ _ref: 'layer' }],
        using: {
          _obj: 'layer',
          name: 'New Layer from Plugin',
          opacity: { _unit: 'percentUnit', _value: 100 }
        }
      }
    ], {});
    
    console.log('Layer created successfully!');
  } catch (error) {
    console.error('Error creating layer:', error);
  }
}

async function applyEffect() {
  try {
    const doc = app.activeDocument;
    // Apply effects to active layer
    console.log('Applying effect to:', doc.activeLayers[0].name);
  } catch (error) {
    console.error('Error applying effect:', error);
  }
}

module.exports = {
  createNewLayer,
  applyEffect
};`
      }
    },
    
    'minecraft-mod': {
      entry: 'ExampleMod.java',
      files: {
        'ExampleMod.java': `package com.example.examplemod;

import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

@Mod("examplemod")
public class ExampleMod {
    public static final String MOD_ID = "examplemod";
    private static final Logger LOGGER = LogManager.getLogger();

    public ExampleMod() {
        // Register setup method
        FMLJavaModLoadingContext.get().getModEventBus()
            .addListener(this::setup);
        FMLJavaModLoadingContext.get().getModEventBus()
            .addListener(this::clientSetup);

        // Register this mod for server and other game events
        MinecraftForge.EVENT_BUS.register(this);
    }

    private void setup(final FMLCommonSetupEvent event) {
        LOGGER.info("Example Mod Common Setup");
    }

    private void clientSetup(final FMLClientSetupEvent event) {
        LOGGER.info("Example Mod Client Setup");
    }

    @SubscribeEvent
    public void onPlayerJoin(PlayerEvent.PlayerLoggedInEvent event) {
        LOGGER.info("Player joined: " + event.getEntity().getName());
    }
}`
      }
    }
  };

  return templates[type] || templates['chrome-extension'];
}
