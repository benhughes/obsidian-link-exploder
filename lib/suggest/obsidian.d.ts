// ref: https://github.com/SilentVoid13/Templater/commit/e945c938e5b004c8df12e16c912214e1d5807b6c
import type { App } from 'obsidian';

declare module 'obsidian' {
  interface App {
    dom: {
      appContainerEl: HTMLElement;
    }
  }
};