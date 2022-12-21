import { log } from '../Log';

export interface node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'file';
  file: string;
}

export interface edge {
  id: string;
  fromNode: string;
  fromSide: 'left' | 'right' | 'top' | 'bottom';
  toNode: string;
  toSide: 'left' | 'right' | 'top' | 'bottom';
}

export interface canvas {
  nodes: node[];
  edges: edge[];
}

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;
const DEFAULT_BUFFER = 100;

function createChildren(
  path: string,
  resolvedLinks: Record<string, Record<string, number>>,
  depth: number,
  num = 0,
  uniqueHash: Record<string, boolean> = {},
  rowCount: Record<string, number> = {}
): [node[], edge[]] {
  log.info(path, depth, num);
  if (!resolvedLinks[path]) {
    return [[], []];
  }
  if (!rowCount[num]) {
    rowCount[num] = 0;
  }
  if (!uniqueHash[path]) {
    uniqueHash[path] = true;
  }
  const fileLinks = Object.keys(resolvedLinks[path]);

  let nodes: node[] = [];
  let edges: edge[] = [];

  for (let i = 0; i < fileLinks.length; i++) {
    const link = fileLinks[i];
    log.info(
      Array.from(new Array(num))
        .map(() => '--')
        .join(''),
      num,
      link
    );
    if (!uniqueHash[link] && link != path) {
      nodes = [
        ...nodes,
        {
          id: link,
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT,
          x: (DEFAULT_WIDTH + 500) * num,
          y: rowCount[num] * (DEFAULT_HEIGHT + DEFAULT_BUFFER),
          type: 'file',
          file: link,
        },
      ];
      uniqueHash[link] = true;
      rowCount[num] = rowCount[num] + 1;
    }

    edges.push({
      id: `${path}-${link}`,
      fromSide: 'right',
      toSide: 'left',
      fromNode: path,
      toNode: link,
    });

    if (num < depth) {
      const nextDepth = num + 1;
      const [childNodes, childEdges] = createChildren(
        link,
        resolvedLinks,
        depth,
        nextDepth,
        uniqueHash,
        rowCount
      );
      nodes = [...nodes, ...childNodes];
      edges = [...edges, ...childEdges];
    }
  }

  return [nodes, edges];
}
export interface currentFile {
  path: string;
  basename: string;
}

export async function createCanvasFromFile(
  activeFile: currentFile,
  resolvedLinks: Record<string, Record<string, number>>,
  doesFileExist: (path: string) => boolean,
  createFile: (path: string, data: string) => Promise<currentFile>,
  openFile: (currentFile: currentFile) => void
): Promise<currentFile> {
  const { path: filePath, basename: fileName } = activeFile;
  if (!resolvedLinks[filePath]) {
    throw Error(`Current file ${fileName} has no links`);
  }
  const fileLinks = Object.keys(resolvedLinks[filePath]);

  let nodes: node[] = [
    {
      id: filePath,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      y:
        (fileLinks.length * (DEFAULT_HEIGHT + DEFAULT_BUFFER)) / 2 -
        DEFAULT_HEIGHT / 2,
      x: 0 - DEFAULT_WIDTH * 2,
      type: 'file',
      file: filePath,
    },
  ];
  let edges: edge[] = [];
  const [childNodes, childEdges] = createChildren(filePath, resolvedLinks, 1);

  nodes = [...nodes, ...childNodes];
  edges = [...edges, ...childEdges];

  const canvas: canvas = { nodes, edges };
  log.info(canvas);
  const path = getFileName(`${fileName}-canvas.canvas`, doesFileExist);
  const result = await createFile(path, JSON.stringify(canvas, null, 2));
  openFile(result);
  log.info(result);
  return result;
}

const getFileName = (
  path: string,
  doesFileExist: (path: string) => boolean
) => {
  if (!doesFileExist(path)) {
    return path;
  }
  const limit = 50;
  const [name, extention] = path.split('.');
  for (let i = 0; i < limit; i++) {
    const newPath = `${name}-${i}.${extention}`;
    log.info(newPath);
    if (!doesFileExist(newPath)) {
      return newPath;
    }
  }
  log.warn(`no paths avialable for ${path}`);
};
