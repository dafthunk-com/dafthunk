-- Insert math node types
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('llm-node', 'LLM', 'llm', 'Generates text', 'AI', 'ai',
  json_array(
    json_object('name', 'prompt', 'type', 'string', 'description', 'The input text prompt for the LLM'),
    json_object('name', 'temperature', 'type', 'number', 'description', 'Controls randomness in the output (0.0 to 1.0)'),
    json_object('name', 'seed', 'type', 'number', 'description', 'Random seed for deterministic generation')
  ),
  json_array(
    json_object('name', 'response', 'type', 'string', 'description', 'Generated text response')
  )
);

