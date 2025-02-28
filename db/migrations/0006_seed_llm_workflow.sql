-- Insert math node types
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('llm-node', 'LLM', 'llm', 'Generates text', 'AI', 'ai',
  json_array(
    json_object('name', 'prompt', 'type', 'string', 'description', 'Prompt')
  ),
  json_array(
    json_object('name', 'result', 'type', 'string', 'description', 'Generated text')
  )
);

