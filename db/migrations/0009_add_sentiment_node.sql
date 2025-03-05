-- Insert sentiment classification node type
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('sentiment-node', 'Sentiment Analysis', 'sentiment', 'Analyzes the sentiment of text', 'AI', 'mood',
  json_array(
    json_object('name', 'text', 'type', 'string', 'description', 'The text to analyze for sentiment')
  ),
  json_array(
    json_object('name', 'label', 'type', 'string', 'description', 'The sentiment classification (POSITIVE or NEGATIVE)'),
    json_object('name', 'score', 'type', 'number', 'description', 'Confidence score for the sentiment classification')
  )
); 