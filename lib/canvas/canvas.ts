import { log } from '../Log';

export interface node {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'file';
  file: string;
  color?: string;
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

export const DEFAULT_WIDTH = 500;
export const DEFAULT_HEIGHT = 500;
export const DEFAULT_BUFFER = 100;

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
  // the column the path is in
  colNumber = 0,
  // used to keep track of how many items are in each column
  colCount: Record<string, number> = {}
): [Record<string, node>, Record<string, edge>] {
  log.info(path, depth, colNumber);

  if (!colCount[colNumber]) {
    colCount[colNumber] = 0;
  }

  let [returnedNodes, returnedEdges] = canvasHashes;
  const fileLinks = Object.keys(resolvedLinks[path] || {});

  // if returnedNodes is empty we can assume this is the first round and we add
  // it to the returnedNodes hash
  let topLevelAdded = false;
  if (Object.keys(returnedNodes).length === 0) {
    returnedNodes[path] = {
      id: path,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      y: 0,
      x: 0,
      type: 'file',
      file: path,
      color: '1',
    };
    topLevelAdded = true;
  }

  // we use this to do a comparison to make a decision about if the level
  // of the current node is lower then the previous version of the node (if exists)
  const currentLevelXValue = (DEFAULT_WIDTH + 500) * (colNumber + 1);
  for (let i = 0; i < fileLinks.length; i++) {
    const link = fileLinks[i];
    log.info(
      Array.from(new Array(colNumber))
        .map(() => '--')
        .join(''),
      colNumber,
      link
    );

    const edgeId = `${path}-${link}`;
    returnedEdges[edgeId] = {
      id: edgeId,
      fromSide: 'right',
      toSide: 'left',
      fromNode: path,
      toNode: link,
    };

    // checks that node doesn't already exist and if it does it's x (using as a
    // reresentation of level) is higher then the new node then we override it.
    // we want to prioritise notes closer to the source
    if (!returnedNodes[link] || returnedNodes[link].x > currentLevelXValue) {
      returnedNodes[link] = {
        id: link,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        x: currentLevelXValue,
        y: colCount[colNumber] * (DEFAULT_HEIGHT + DEFAULT_BUFFER),
        type: 'file',
        file: link,
      };

      colCount[colNumber] = colCount[colNumber] + 1;
    }

    if (colNumber < depth) {
      const prevNodeCount = Object.keys(returnedNodes).length;
      const nextDepth = colNumber + 1;
      // before children get added we need to save the start point for this node so we can
      // easily set how its postioned amongst it's children
      const nodeYStartingPosition =
        (colCount[nextDepth] || 0) * (DEFAULT_HEIGHT + DEFAULT_BUFFER);

      const [childNodes, childEdges] = createChildren(
        link,
        resolvedLinks,
        depth,
        [returnedNodes, returnedEdges],
        nextDepth,
        colCount
      );

      const newChildrenAdded = Object.keys(childNodes).length - prevNodeCount;

      if (newChildrenAdded > 0) {
        childNodes[link].y =
          nodeYStartingPosition +
          calculateYPositionFromNumberOfChildren(newChildrenAdded);
      } else {
        // if it has no children we add a count to the next col to give it a buffer so the
        // next sibblings children doesn't take up the space
        childNodes[link].y =
          colCount[nextDepth] * (DEFAULT_HEIGHT + DEFAULT_BUFFER);
        colCount[nextDepth] = colCount[nextDepth] + 1;
      }

      returnedNodes = { ...returnedNodes, ...childNodes };
      returnedEdges = { ...returnedEdges, ...childEdges };
    }
  }

  // as we added the top level node earlier we now have to position it right we get the length of
  // of the children in the highest col
  if (topLevelAdded) {
    for (let i = depth; i >= 0; i--) {
      const maxRowCount = colCount[i];
      if (maxRowCount) {
        returnedNodes[path].y =
          calculateYPositionFromNumberOfChildren(maxRowCount);
        break;
      }
    }
  }

  return [returnedNodes, returnedEdges];
}

// TODO use this to improve orign function
function createIncomingChildren(
  path: string,
  resolvedLinks: Record<string, Record<string, number>>,
  canvasHashes: [Record<string, node>, Record<string, edge>] = [{}, {}]
): [Record<string, node>, Record<string, edge>] {
  const [returnedNodes, returnedEdges] = canvasHashes;
  if (!returnedNodes[path]) {
    log.warn('createIncomingChildren: path not in canvasHashes');
    return canvasHashes;
  }

  const fileLinks = Object.keys(resolvedLinks[path] || {}).filter(
    (link) => !returnedNodes[link]
  );

  const baseY = returnedNodes[path].y;
  const yStart =
    baseY +
    DEFAULT_HEIGHT / 2 -
    ((fileLinks.length / 2) * DEFAULT_HEIGHT +
      ((fileLinks.length - 1) / 2) * DEFAULT_BUFFER);
  for (let i = 0; i < fileLinks.length; i++) {
    const link = fileLinks[i];

    const edgeId = `${path}-${link}`;
    returnedEdges[edgeId] = {
      id: edgeId,
      fromSide: 'right',
      toSide: 'left',
      fromNode: link,
      toNode: path,
    };

    returnedNodes[link] = {
      id: link,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      x: 0 - (DEFAULT_WIDTH + 500),
      y: yStart + i * (DEFAULT_HEIGHT + DEFAULT_BUFFER),
      type: 'file',
      file: link,
    };
  }

  return [returnedNodes, returnedEdges];
}

const calculateYPositionFromNumberOfChildren = (childrenCount: number) =>
  (DEFAULT_HEIGHT * childrenCount + DEFAULT_BUFFER * (childrenCount - 1)) / 2 -
  DEFAULT_HEIGHT / 2;

export async function createCanvasFromFile(
  activeFile: currentFile,
  resolvedLinks: Record<string, Record<string, number>>,
  doesFileExist: (path: string) => boolean,
  createFile: (path: string, data: string) => Promise<currentFile>,
  openFile: (currentFile: currentFile) => void,
  location: string
): Promise<currentFile> {
  const { path: filePath, basename: fileName } = activeFile;

  const resolvedIncomingLinks = buildResolvedIncomingLinks(resolvedLinks);

  // TODO: create a combined resolved links so we're not passing two different ones
  // to the same func
  const [outgoingNodes, outgoingEdges] = createChildren(
    filePath,
    resolvedLinks,
    1
  );
  const [incomingNodes, incomingEdges] = createIncomingChildren(
    filePath,
    resolvedIncomingLinks,
    [outgoingNodes, outgoingEdges]
  );

  const nodes = Object.values(incomingNodes);
  const edges = Object.values(incomingEdges);

  const canvas: canvas = { nodes, edges };

  log.info(canvas);
  const path = getFileName(
    location ? `${location}/${fileName}.canvas` : `${fileName}.canvas`,
    doesFileExist
  );

  if (!path) {
    throw `unable to save: ${fileName}`;
  }

  const result = await createFile(path, JSON.stringify(canvas, null, 2));
  openFile(result);
  log.info(result);
  return result;
}

// buildResolvedIncomingLinks takes the outgoingResolvedLinks and flips it to
// incoming links where the top level key is the path and the record value is a
// is a record with the keys being other paths that point to it. The number value is not used
// and set to one
const buildResolvedIncomingLinks = (
  resolvedLinks: Record<string, Record<string, number>>
): Record<string, Record<string, number>> => {
  const resolvedIncomingLinks: Record<string, Record<string, number>> = {};
  Object.entries(resolvedLinks).forEach(([linker, destination]) => {
    Object.keys(destination).forEach((path) => {
      if (!resolvedIncomingLinks[path]) {
        resolvedIncomingLinks[path] = {};
      }
      resolvedIncomingLinks[path][linker] = 1;
    });
  });

  return resolvedIncomingLinks;
};

// getFileName looks for a safe file name to use and returns it.
// will take the path and add -n to the end until I finds one that doesn't
// exist
export const getFileName = (
  path: string,
  doesFileExist: (path: string) => boolean
): string | null => {
  if (!doesFileExist(path)) {
    return path;
  }
  const limit = 50;
  const idx = path.lastIndexOf('.');
  const name = path.substring(0, idx);
  const extention = path.substring(idx + 1);
  for (let i = 0; i < limit; i++) {
    const newPath = `${name}-${i}.${extention}`;
    log.info(newPath);
    if (!doesFileExist(newPath)) {
      return newPath;
    }
  }
  return null;
};
