import { App, PluginSettingTab, Setting } from 'obsidian';

import type LinkExploderPlugin from '../main';

export interface LinkExploderSettings {
  mySetting: string;
  workTaskNoteLocation: string;
}

export const DEFAULT_SETTINGS: LinkExploderSettings = {
  mySetting: 'default',
  workTaskNoteLocation: '0006a Today - Work 🏢.md',
};

export class LinkExploderSettingTab extends PluginSettingTab {
  plugin: LinkExploderPlugin;

  constructor(app: App, plugin: LinkExploderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });

    containerEl.createEl('h3', { text: 'Day Planner' });

    new Setting(containerEl)
      .setName('Work Task Page')
      .setDesc('The page for your Work Tasks')
      .addText((text) =>
        text
          .setPlaceholder('Note to find your chosen tasks')
          .setValue('')
          .onChange(async (value) => {
            this.plugin.settings.workTaskNoteLocation = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Setting #1')
      .setDesc("It's a secret")
      .addText((text) =>
        text
          .setPlaceholder('Enter your secret')
          .setValue('')
          .onChange(async (value) => {
            console.log('Secret: ' + value);
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
