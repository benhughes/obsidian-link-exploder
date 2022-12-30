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
  const createFileMock = jest.fn((path: string, _: string) =>
    Promise.resolve({ path: path, basename: '' })
  );

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

  test('errors if top file has no links', async () => {
    await expect(
      createCanvasFromFile(
        { path: 'my-path', basename: 'bob' },
        { '': { '': 1 } },
        doesFileExist,
        createFileMock,
        openFile
      )
    ).rejects.toThrow('Current file bob has no links');
  });

  interface testCases {
    name: string;
    topPath: string;
    resolvedLinks: Record<string, Record<string, number>>;
    expectedNodes: Partial<node>[];
    expectedEdges: Partial<edge>[];
  }

  const testCases: testCases[] = [
    {
      name: 'handles a single link',
      topPath: 'my-path/file',
      resolvedLinks: { ['my-path/file']: { 'some-other-file': 1 } },
      expectedNodes: [{ id: 'my-path/file' }, { id: 'some-other-file' }],
      expectedEdges: [{ fromNode: 'my-path/file', toNode: 'some-other-file' }],
    },
    {
      name: 'skips duplicates',
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
      name: 'skips duplicates of top file',
      topPath: 'my-path/file',
      resolvedLinks: {
        'my-path/file': {
          'some-other-file': 1,
          'some-other-file-that-points-to-dupe': 1,
        },
        'some-other-file-that-points-to-dupe': { 'my-path/file': 1 },
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
          toNode: 'my-path/file',
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
        { id: 'file-number-3', x: 0 },
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
