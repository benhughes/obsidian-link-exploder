import { describe, expect, test } from '@jest/globals';
import {
  canvas,
  createCanvasFromFile,
  currentFile,
  edge,
  node,
} from './canvas';

describe('createCanvasFromFile', () => {
  const doesFileExist = (_: string) => false;
  const openFile = (_: currentFile) => ({});

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
  ];
  testCases.forEach((tc) => {
    test(tc.name, async () => {
      const createFileMock = jest.fn((path: string, _: string) =>
        Promise.resolve({ path: path, basename: '' })
      );

      await createCanvasFromFile(
        { path: tc.topPath, basename: 'base-name' },
        tc.resolvedLinks,
        doesFileExist,
        createFileMock,
        openFile
      );
      const createdCanvas: canvas = JSON.parse(createFileMock.mock.calls[0][1]);
      testNodes(tc.expectedNodes, createdCanvas.nodes);
      testEdges(tc.expectedEdges, createdCanvas.edges);
    });
  });
});
