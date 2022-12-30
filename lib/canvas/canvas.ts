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

export interface currentFile {
  path: string;
  basename: string;
}

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;
const DEFAULT_BUFFER = 100;

// recursive function that calls itself to create a list of nodes and edges
// to add to the canvas
// Some notes
// - it only allows unique notes
// - it priotises notes that have a lower depth overwriting notes that already exist
function createChildren(
  path: string,
  resolvedLinks: Record<string, Record<string, number>>,
  depth: number,
  canvasHashes: [Record<string, node>, Record<string, edge>] = [{}, {}],
  num = 0,
  rowCount: Record<string, number> = {}
): [Record<string, node>, Record<string, edge>] {
  log.info(path, depth, num);
  // if no links exist for this file then return
  if (!resolvedLinks[path]) {
    return canvasHashes;
  }
  if (!rowCount[num]) {
    rowCount[num] = 0;
  }

  let [returnedNodes, returnedEdges] = canvasHashes;
  const fileLinks = Object.keys(resolvedLinks[path]);

  // if returnedNodes is empty we can assume this is the first round and we add
  // it to the returnedNodes hash
  if (Object.keys(returnedNodes).length === 0) {
    returnedNodes[path] = {
      id: path,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      y:
        (fileLinks.length * (DEFAULT_HEIGHT + DEFAULT_BUFFER)) / 2 -
        DEFAULT_HEIGHT / 2,
      x: 0 - DEFAULT_WIDTH * 2,
      type: 'file',
      file: path,
    };
  }

  // we use this to do a comparison to make a decision about if the level
  // of the current node is lower then the previous version of the node (if exists)
  const currentLevelXValue = (DEFAULT_WIDTH + 500) * num;
  for (let i = 0; i < fileLinks.length; i++) {
    const link = fileLinks[i];
    log.info(
      Array.from(new Array(num))
        .map(() => '--')
        .join(''),
      num,
      link
    );
    // checks that node doesn't already exist and if it does it's x (using as a
    // reresentation of level) is higher then the new node then we override it.
    if (!returnedNodes[link] || returnedNodes[link].x > currentLevelXValue) {
      returnedNodes[link] = {
        id: link,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        x: (DEFAULT_WIDTH + 500) * num,
        y: rowCount[num] * (DEFAULT_HEIGHT + DEFAULT_BUFFER),
        type: 'file',
        file: link,
      };

      rowCount[num] = rowCount[num] + 1;
    }
    const edgeId = `${path}-${link}`;
    returnedEdges[edgeId] = {
      id: edgeId,
      fromSide: 'right',
      toSide: 'left',
      fromNode: path,
      toNode: link,
    };

    if (num < depth) {
      const nextDepth = num + 1;
      const [childNodes, childEdges] = createChildren(
        link,
        resolvedLinks,
        depth,
        [returnedNodes, returnedEdges],
        nextDepth,
        rowCount
      );
      returnedNodes = { ...returnedNodes, ...childNodes };
      returnedEdges = { ...returnedEdges, ...childEdges };
    }
  }

  return [returnedNodes, returnedEdges];
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

  const [childNodes, childEdges] = createChildren(filePath, resolvedLinks, 1);

  const nodes = Object.values(childNodes);
  const edges = Object.values(childEdges);

  const canvas: canvas = { nodes, edges };

  log.info(canvas);

  const path = getFileName(`${fileName}-canvas.canvas`, doesFileExist);
  const result = await createFile(path, JSON.stringify(canvas, null, 2));
  openFile(result);
  log.info(result);
  return result;
}

// getFileName looks for a safe file name to use and returns it.
// will take the path and add -n to the end until I finds one that doesn't
// exist
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
