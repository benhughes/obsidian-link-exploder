import { Notice, Plugin, TFile } from 'obsidian';
import { createCanvasFromFile } from './lib/canvas/canvas';
import { log } from './lib/Log';
import {
  Location,
  LinkExploderPluginSettings,
  LinkExploderPluginSettingTab,
} from './settings';

export default class LinkExploderPlugin extends Plugin {
  settings: LinkExploderPluginSettings;

  async onload(): Promise<void> {
    log.setUp(this);
    log.info(`${this.manifest.name} Loaded`);

    await this.loadSettings();

    this.addSettingTab(new LinkExploderPluginSettingTab(this.app, this));

    this.addCommand({
      id: 'link-exploder-canvas-builder',
      name: 'Create Canvas From File Links',
      checkCallback: (checking: boolean) => {
        if (checking) {
          return true;
        }
        const activeFile: TFile | null = this.app.workspace.getActiveFile();
        if (activeFile) {
          const doesFileExist = (path: string) =>
            Boolean(this.app.vault.getAbstractFileByPath(path));
          const createFile = (path: string, data: string) =>
            this.app.vault.create(path, data);
          const openFile = (currentFile: TFile) =>
            this.app.workspace.getLeaf().openFile(currentFile);
          activeFile.parent;
          const location = (() => {
            switch (this.settings.newFileLocation) {
              case Location.VaultFolder:
              default:
                return '';
              case Location.SameFolder:
                return activeFile.parent.path;
              case Location.SpecifiedFolder:
                return doesFileExist(this.settings.customFileLocation)
                  ? this.settings.customFileLocation
                  : '';
            }
          })();
          createCanvasFromFile(
            activeFile,
            this.app.metadataCache.resolvedLinks,
            doesFileExist,
            createFile,
            openFile,
            location
          ).catch((e) => {
            new Notice(`Something went wrong with creating the canvas: ${e}`);
            console.error(e);
          });
        }
      },
    });

    // this only appears if in dev mode, allows quick reloading with shift-cmd-R
    if (this.manifest.name.contains('Canary')) {
      this.addCommand({
        id: 'reloadLinkExploder',
        name: 'Reload LinkExploder (dev)',
        callback: () => {
          const id: string = this.manifest.id;
          // @ts-ignore - for this.app.plugins
          const plugins = this.app.plugins;
          plugins.disablePlugin(id).then(() => plugins.enablePlugin(id));
          new Notice('Reloading LinkExploder');
        },
        hotkeys: [{ key: 'r', modifiers: ['Mod', 'Shift'] }],
      });
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload(): void {
    log.info('unloading link exploder');
  }
}
