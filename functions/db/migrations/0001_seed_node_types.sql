-- Clear existing node types
DELETE FROM node_types;

-- Seed default node types
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs)
VALUES 
  (
    'text-processor',
    'Text Processor',
    'text-processor',
    'Process and transform text data',
    'Processing',
    'TextProcessorIcon',
    '[{"name":"Text Input","type":"string"}]',
    '[{"name":"Processed Text","type":"string"}]'
  ),
  (
    'llm-model',
    'LLM Model',
    'llm-model',
    'Large Language Model for text generation',
    'AI Models',
    'LLMModelIcon',
    '[{"name":"Prompt","type":"string"},{"name":"Temperature","type":"number"}]',
    '[{"name":"Generated Text","type":"string"}]'
  ),
  (
    'text-splitter',
    'Text Splitter',
    'text-splitter',
    'Split text into chunks',
    'Processing',
    'TextSplitterIcon',
    '[{"name":"Text Input","type":"string"},{"name":"Chunk Size","type":"number"}]',
    '[{"name":"Text Chunks","type":"string[]"}]'
  ),
  (
    'text-joiner',
    'Text Joiner',
    'text-joiner',
    'Join multiple text inputs into one',
    'Processing',
    'TextJoinerIcon',
    '[{"name":"Text Inputs","type":"string[]"},{"name":"Separator","type":"string"}]',
    '[{"name":"Joined Text","type":"string"}]'
  ),
  (
    'sentiment-analyzer',
    'Sentiment Analyzer',
    'sentiment-analyzer',
    'Analyze text sentiment',
    'AI Models',
    'SentimentIcon',
    '[{"name":"Text Input","type":"string"}]',
    '[{"name":"Sentiment Score","type":"number"},{"name":"Sentiment Label","type":"string"}]'
  ); 