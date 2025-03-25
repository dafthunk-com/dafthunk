import { describe, it, expect } from 'vitest';
import { JsonNumberExtractorNode } from './jsonNumberExtractorNode';
import { Node } from '../../workflowTypes';

describe('JsonNumberExtractorNode', () => {
  const createNode = (inputs: Record<string, any> = {}): Node => ({
    id: 'test-node',
    type: 'jsonNumberExtractor',
    name: 'Test Node',
    position: { x: 0, y: 0 },
    inputs: [],
    outputs: [],
    ...inputs,
  });

  const createContext = (inputs: Record<string, any> = {}) => ({
    nodeId: 'test-node',
    workflowId: 'test-workflow',
    inputs,
  });

  it('should extract an integer value from a simple path', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { age: 30 },
      path: '$.age'
    }));

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(30);
    expect(result.outputs?.found).toBe(true);
  });

  it('should extract a float value', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { price: 99.99 },
      path: '$.price'
    }));

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(99.99);
    expect(result.outputs?.found).toBe(true);
  });

  it('should extract a nested number value', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { product: { details: { weight: 1.5 } } },
      path: '$.product.details.weight'
    }));

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(1.5);
    expect(result.outputs?.found).toBe(true);
  });

  it('should return default value when path does not exist', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { user: { name: 'John' } },
      path: '$.user.age',
      defaultValue: 25
    }));

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(25);
    expect(result.outputs?.found).toBe(false);
  });

  it('should return default value when value is not a number', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { value: '123' },
      path: '$.value',
      defaultValue: 0
    }));

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(0);
    expect(result.outputs?.found).toBe(false);
  });

  it('should handle array paths', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { scores: [85, 90, 95] },
      path: '$.scores[1]'
    }));

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(90);
    expect(result.outputs?.found).toBe(true);
  });

  it('should fail with invalid JSON input', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: null,
      path: '$.value'
    }));

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or missing JSON input');
  });

  it('should fail with invalid path', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { value: 42 },
      path: null
    }));

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or missing JSONPath expression');
  });

  it('should use 0 as default value when not specified', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { user: { name: 'John' } },
      path: '$.user.age'
    }));

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(0);
    expect(result.outputs?.found).toBe(false);
  });

  it('should handle negative numbers', async () => {
    const node = new JsonNumberExtractorNode(createNode());
    const result = await node.execute(createContext({
      json: { temperature: -5.5 },
      path: '$.temperature'
    }));

    expect(result.success).toBe(true);
    expect(result.outputs?.value).toBe(-5.5);
    expect(result.outputs?.found).toBe(true);
  });
}); 