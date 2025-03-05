-- Insert math node types
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('llm-node', 'LLM', 'llm', 'Generates text', 'AI', 'ai',
  json_array(
    json_object('name', 'prompt', 'type', 'string', 'description', 'The input text prompt for the LLM'),
    json_object('name', 'temperature', 'type', 'number', 'description', 'Controls randomness in the output (0.0 to 1.0)'),
    json_object('name', 'seed', 'type', 'number', 'description', 'Random seed for deterministic generation'),
    json_object('name', 'topP', 'type', 'number', 'description', 'Nucleus sampling parameter (0.0 to 1.0)'),
    json_object('name', 'topK', 'type', 'number', 'description', 'Number of highest probability tokens to consider'),
    json_object('name', 'maxTokens', 'type', 'number', 'description', 'Maximum number of tokens to generate'),
    json_object('name', 'presencePenalty', 'type', 'number', 'description', 'Penalty for new tokens based on presence in text'),
    json_object('name', 'repetitionPenalty', 'type', 'number', 'description', 'Penalty for repeating tokens in generated text')
  ),
  json_array(
    json_object('name', 'response', 'type', 'string', 'description', 'Generated text response'),
    json_object('name', 'promptTokens', 'type', 'number', 'description', 'Number of tokens in the input prompt'),
    json_object('name', 'completionTokens', 'type', 'number', 'description', 'Number of tokens in the generated response'),
    json_object('name', 'totalTokens', 'type', 'number', 'description', 'Total number of tokens used')
  )
);

