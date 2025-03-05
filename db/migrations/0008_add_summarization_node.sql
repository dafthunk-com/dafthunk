-- Insert summarization node type
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('summarization-node', 'Summarization', 'summarization', 'Summarizes text using BART-large-CNN model', 'AI', 'summarize',
  json_array(
    json_object('name', 'inputText', 'type', 'string', 'description', 'The text that you want the model to summarize'),
    json_object('name', 'maxLength', 'type', 'number', 'description', 'The maximum length of the generated summary in tokens', 'default', 1024)
  ),
  json_array(
    json_object('name', 'summary', 'type', 'string', 'description', 'The summarized version of the input text')
  )
); 