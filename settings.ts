import LinkExploderPlugin from './main';
import { App, PluginSettingTab, Setting } from 'obsidian';

export class LinkExploderPluginSettings {
  newFileLocation: Location = Location.VaultFolder;
  customFileLocation: string = '';
}

export enum Location {
  VaultFolder,
  SameFolder,
  SpecifiedFolder,
}

export class LinkExploderPluginSettingTab extends PluginSettingTab {
  plugin: LinkExploderPlugin;

  constructor(app: App, plugin: LinkExploderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Link Exploder Settings' });

    new Setting(containerEl)
      .setName('Default location for new canvas files')
      .addDropdown((dropDown) => {
        dropDown
          .addOption(Location[Location.VaultFolder], 'Vault folder')
          .addOption(
            Location[Location.SameFolder],
            'Same folder as current file'
          )
          .addOption(
            Location[Location.SpecifiedFolder],
            'In the folder specified below'
          )
          .setValue(
			  Location[this.plugin.settings.newFileLocation] ||
              Location[Location.VaultFolder]
          )
          .onChange(async (value) => {
            this.plugin.settings.newFileLocation =
              Location[value as keyof typeof Location];
            await this.plugin.saveSettings();
            this.display();
          });
      });
    if (this.plugin.settings.newFileLocation == Location.SpecifiedFolder) {
      new Setting(containerEl)
        .setName('Folder to create new canvas files in')
        .addText((text) => {
          text
            .setPlaceholder('Example: folder 1/folder 2')
            .setValue(this.plugin.settings.customFileLocation)
            .onChange(async (value) => {
              this.plugin.settings.customFileLocation = value;
              await this.plugin.saveSettings();
            });
        });
    }
  }
}
