import { Plugin } from 'obsidian';

class Log {
  setUp(plugin: Plugin) {
    this.isDev = plugin.manifest.name.toLowerCase().contains('canary');
    if (this.isDev) {
      this.info = console.info;
    }
  }

  isDev: boolean;

  info(..._: any[]): void {
    // empty function in non dev envs
  }

  warn = console.warn;
}

export const log = new Log();
