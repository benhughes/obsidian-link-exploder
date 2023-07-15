import { describe, expect, test } from '@jest/globals';
import {
  canvas,
  createCanvasFromFile,
  edge,
  node,
  DEFAULT_BUFFER,
  DEFAULT_HEIGHT,
} from './canvas';

describe('createCanvasFromFile', () => {
  const doesFileExist = () => false;
  const openFile = () => ({});

  const testNodes = (nodes: Partial<node>[], resultNodes: node[]) => {
    expect(resultNodes.length).toBe(nodes.length);
    nodes.forEach((node, i) => {
      Object.keys(node).forEach((nodeKey: keyof node) => {
        expect(resultNodes[i][nodeKey]).toBe(node[nodeKey]);
      });
    });
  };
  const testEdges = (edges: Partial<edge>[], resultEdges: edge[]) => {
    expect(resultEdges.length).toBe(edges.length);
    edges.forEach((edge, i) => {
      Object.keys(edge).forEach((edgeKey: keyof edge) => {
        expect(resultEdges[i][edgeKey]).toBe(edge[edgeKey]);
      });
    });
  };

  interface testCases {
    name: string;
    topPath: string;
    resolvedLinks: Record<string, Record<string, number>>;
    expectedNodes: Partial<node>[];
    expectedEdges: Partial<edge>[];
    skip?: boolean;
  }

  const testCases: testCases[] = [
    {
      name: 'returns single node if path has no links',
      topPath: 'A',
      resolvedLinks: {},
      expectedNodes: [{ id: 'A' }],
      expectedEdges: [],
    },
    {
      name: 'handles a single link',
      topPath: 'A',
      resolvedLinks: { ['A']: { B: 1 } },
      expectedNodes: [{ id: 'A' }, { id: 'B' }],
      expectedEdges: [{ fromNode: 'A', toNode: 'B' }],
    },
    {
      name: 'skips duplicates but still adds the edges',
      topPath: 'my-path/file',
      resolvedLinks: {
        'my-path/file': {
          'some-other-file': 1,
          'some-other-file-that-points-to-dupe': 1,
        },
        'some-other-file-that-points-to-dupe': { 'some-other-file': 1 },
      },
      expectedNodes: [
        { id: 'my-path/file' },
        { id: 'some-other-file' },
        { id: 'some-other-file-that-points-to-dupe' },
      ],
      expectedEdges: [
        { fromNode: 'my-path/file', toNode: 'some-other-file' },
        {
          fromNode: 'my-path/file',
          toNode: 'some-other-file-that-points-to-dupe',
        },
        {
          fromNode: 'some-other-file-that-points-to-dupe',
          toNode: 'some-other-file',
        },
      ],
    },
    {
      name: 'prioritises nodes in a lower depth',
      topPath: 'file-number-1',
      resolvedLinks: {
        'file-number-1': {
          'file-number-2': 1,
          'file-number-3': 1,
        },
        'file-number-2': {
          'file-number-3': 1,
        },
        'file-number-3': { 'file-number-4': 1 },
      },
      expectedNodes: [
        { id: 'file-number-1' },
        { id: 'file-number-2' },
        { id: 'file-number-3', x: 1000 },
        { id: 'file-number-4' },
      ],
      expectedEdges: [
        {
          fromNode: 'file-number-1',
          toNode: 'file-number-2',
        },
        {
          fromNode: 'file-number-2',
          toNode: 'file-number-3',
        },
        {
          fromNode: 'file-number-1',
          toNode: 'file-number-3',
        },
        {
          fromNode: 'file-number-3',
          toNode: 'file-number-4',
        },
      ],
    },
    {
      name: 'handles a incoming link',
      topPath: 'file-number-2',
      resolvedLinks: { 'file-number-1': { 'file-number-2': 1 } },
      expectedNodes: [{ id: 'file-number-2' }, { id: 'file-number-1' }],
      expectedEdges: [{ fromNode: 'file-number-1', toNode: 'file-number-2' }],
    },
    {
      name: 'handles incoming and outgoing links',
      topPath: 'file-number-2',
      resolvedLinks: {
        'file-number-1': { 'file-number-2': 1 },
        'file-number-2': { 'file-number-3': 1 },
      },
      expectedNodes: [
        { id: 'file-number-2' },
        { id: 'file-number-3' },
        { id: 'file-number-1' },
      ],
      expectedEdges: [
        { fromNode: 'file-number-2', toNode: 'file-number-3' },
        { fromNode: 'file-number-1', toNode: 'file-number-2' },
      ],
    },
    // Positioning Tests

    {
      name: 'correctly spaces out 2 levels of nodes',
      topPath: 'file-A',
      resolvedLinks: {
        'file-A': { 'file-B': 1, 'file-C': 1 },
      },
      expectedNodes: [
        {
          id: 'file-A',
          y: (DEFAULT_HEIGHT * 2 + DEFAULT_BUFFER * 1) / 2 - DEFAULT_HEIGHT / 2,
        },
        { id: 'file-B', y: 0 },
        { id: 'file-C', y: DEFAULT_HEIGHT + DEFAULT_BUFFER },
      ],
      expectedEdges: [
        { fromNode: 'file-A', toNode: 'file-B' },
        { fromNode: 'file-A', toNode: 'file-C' },
      ],
    },
    {
      name: 'correctly spaces out three levels of nodes',
      topPath: 'file-A',
      resolvedLinks: {
        'file-A': { 'file-B': 1, 'file-C': 1 },
        'file-B': { 'file-D': 1, 'file-E': 1, 'file-F': 1 },
        'file-C': { 'file-G': 1, 'file-H': 1 },
      },
      expectedNodes: [
        {
          id: 'file-A',
          y: (DEFAULT_HEIGHT * 5 + DEFAULT_BUFFER * 4) / 2 - DEFAULT_HEIGHT / 2,
        },
        {
          id: 'file-B',
          y: (DEFAULT_HEIGHT * 3 + DEFAULT_BUFFER * 2) / 2 - DEFAULT_HEIGHT / 2,
        },
        { id: 'file-D', y: 0 },
        { id: 'file-E', y: DEFAULT_HEIGHT + DEFAULT_BUFFER },
        { id: 'file-F', y: (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 2 },
        {
          id: 'file-C',
          y:
            (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 3 +
            (DEFAULT_HEIGHT + DEFAULT_BUFFER) / 2,
        },
        { id: 'file-G', y: (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 3 },
        { id: 'file-H', y: (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 4 },
      ],
      expectedEdges: [
        { fromNode: 'file-A', toNode: 'file-B' },
        { fromNode: 'file-B', toNode: 'file-D' },
        { fromNode: 'file-B', toNode: 'file-E' },
        { fromNode: 'file-B', toNode: 'file-F' },
        { fromNode: 'file-A', toNode: 'file-C' },
        { fromNode: 'file-C', toNode: 'file-G' },
        { fromNode: 'file-C', toNode: 'file-H' },
      ],
    },
    {
      name: 'correctly spaces out three vaired children levels of nodes',
      topPath: 'file-A',
      resolvedLinks: {
        'file-A': { 'file-B': 1, 'file-C': 1, 'file-I': 1 },
        'file-B': { 'file-D': 1, 'file-E': 1, 'file-F': 1 },
        'file-C': {},
        'file-I': { 'file-G': 1, 'file-H': 1 },
      },
      expectedNodes: [
        {
          id: 'file-A',
          y: (DEFAULT_HEIGHT * 6 + DEFAULT_BUFFER * 5) / 2 - DEFAULT_HEIGHT / 2,
        },
        {
          id: 'file-B',
          y: (DEFAULT_HEIGHT * 3 + DEFAULT_BUFFER * 2) / 2 - DEFAULT_HEIGHT / 2,
        },
        { id: 'file-D', y: 0 },
        { id: 'file-E', y: DEFAULT_HEIGHT + DEFAULT_BUFFER },
        { id: 'file-F', y: (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 2 },
        {
          id: 'file-C',
          y: (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 3,
        },
        {
          id: 'file-I',
          y:
            (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 4 +
            (DEFAULT_HEIGHT + DEFAULT_BUFFER) / 2,
        },
        { id: 'file-G', y: (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 4 },
        { id: 'file-H', y: (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 5 },
      ],
      expectedEdges: [
        { fromNode: 'file-A', toNode: 'file-B' },
        { fromNode: 'file-B', toNode: 'file-D' },
        { fromNode: 'file-B', toNode: 'file-E' },
        { fromNode: 'file-B', toNode: 'file-F' },
        { fromNode: 'file-A', toNode: 'file-C' },
        { fromNode: 'file-A', toNode: 'file-I' },
        { fromNode: 'file-I', toNode: 'file-G' },
        { fromNode: 'file-I', toNode: 'file-H' },
      ],
    },
    {
      name: 'correctly places top file when mid col is bigger then child cols',
      topPath: 'file-A',
      resolvedLinks: {
        'file-A': { 'file-B': 1, 'file-C': 1, 'file-D': 1 },
        'file-B': { 'file-E': 1 },
        'file-C': {},
      },
      expectedNodes: [
        {
          id: 'file-A',
          y: (DEFAULT_HEIGHT * 3 + DEFAULT_BUFFER * 2) / 2 - DEFAULT_HEIGHT / 2,
        },
        { id: 'file-B', y: 0 },
        { id: 'file-E', y: 0 },
        { id: 'file-C', y: DEFAULT_HEIGHT + DEFAULT_BUFFER },
        { id: 'file-D', y: (DEFAULT_HEIGHT + DEFAULT_BUFFER) * 2 },
      ],
      expectedEdges: [
        { fromNode: 'file-A', toNode: 'file-B' },
        { fromNode: 'file-B', toNode: 'file-E' },
        { fromNode: 'file-A', toNode: 'file-C' },
        { fromNode: 'file-A', toNode: 'file-D' },
      ],
    },
    {
      name: 'correctly places backlinks',
      topPath: 'file-A',
      resolvedLinks: {
        'file-A': { 'file-B': 1, 'file-C': 1 },
        'file-D': { 'file-A': 1 },
        'file-E': { 'file-A': 1 },
      },
      expectedNodes: [
        {
          id: 'file-A',
          y: (DEFAULT_HEIGHT * 2 + DEFAULT_BUFFER * 1) / 2 - DEFAULT_HEIGHT / 2,
        },
        { id: 'file-B', y: 0 },
        { id: 'file-C', y: DEFAULT_HEIGHT + DEFAULT_BUFFER },
        {
          id: 'file-D',
          y: 0,
        },
        {
          id: 'file-E',
          y: DEFAULT_HEIGHT + DEFAULT_BUFFER,
        },
      ],
      expectedEdges: [
        { fromNode: 'file-A', toNode: 'file-B' },
        { fromNode: 'file-A', toNode: 'file-C' },
        { fromNode: 'file-D', toNode: 'file-A' },
        { fromNode: 'file-E', toNode: 'file-A' },
      ],
    },
    {
      name: 'handles depth of 4',
      skip: true,
      topPath: '',
      resolvedLinks: {},
      expectedEdges: [],
      expectedNodes: [],
    },
  ];

  testCases.forEach((tc) => {
    let testRunner: typeof test | typeof test.skip = test;
    if (tc.skip) {
      testRunner = test.skip;
    }
    testRunner(tc.name, async () => {
      const createFileMock = jest.fn((path: string, _: string) =>
        Promise.resolve({ path: path, basename: '' })
      );

      await createCanvasFromFile(
        { path: tc.topPath, basename: 'base-name' },
        tc.resolvedLinks,
        doesFileExist,
        createFileMock,
        openFile,
        ''
      );
      const createdCanvas: canvas = JSON.parse(createFileMock.mock.calls[0][1]);
      testNodes(tc.expectedNodes, createdCanvas.nodes);
      testEdges(tc.expectedEdges, createdCanvas.edges);
    });
  });
});
