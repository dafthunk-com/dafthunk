-- Insert math node types
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('llm-node', 'LLM', 'llm', 'Generates text', 'AI', 'ai',
  json_array(
    json_object('name', 'prompt', 'type', 'string', 'description', 'Prompt')
  ),
  json_array(
    json_object('name', 'response', 'type', 'string', 'description', 'Generated text response'),
    json_object('name', 'promptTokens', 'type', 'number', 'description', 'Number of tokens in the input prompt'),
    json_object('name', 'completionTokens', 'type', 'number', 'description', 'Number of tokens in the generated response'),
    json_object('name', 'totalTokens', 'type', 'number', 'description', 'Total number of tokens used')
  )
);

