import { Notice, Plugin, TFile } from 'obsidian';
import { createCanvasFromFile } from './lib/canvas/canvas';
import { log } from './lib/Log';

export default class LinkExploderPlugin extends Plugin {
  async onload(): Promise<void> {
    log.setUp(this);
    log.info(`${this.manifest.name} Loaded`);

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
          createCanvasFromFile(
            activeFile,
            this.app.metadataCache.resolvedLinks,
            doesFileExist,
            createFile,
            openFile
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

  onunload(): void {
    log.info('unloading link exploder');
  }
}
