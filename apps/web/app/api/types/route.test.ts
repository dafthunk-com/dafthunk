import { describe, it, expect } from '@jest/globals';
import { GET } from './route';

describe('Types API', () => {
  it('should return a list of node types', async () => {
    const response = await GET();
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    
    // Test structure of each node type
    data.forEach((nodeType: any) => {
      expect(nodeType).toHaveProperty('id');
      expect(nodeType).toHaveProperty('name');
      expect(nodeType).toHaveProperty('description');
      expect(nodeType).toHaveProperty('category');
      expect(nodeType).toHaveProperty('icon');
    });

    // Test specific node types
    expect(data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'text-processor',
          name: 'Text Processor',
          description: 'Process and transform text data',
          category: 'Processing',
          icon: 'TextProcessorIcon',
        }),
        expect.objectContaining({
          id: 'llm-model',
          name: 'LLM Model',
          description: 'Large Language Model for text generation',
          category: 'AI Models',
          icon: 'LLMModelIcon',
        }),
      ])
    );
  });
}); 