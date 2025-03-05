-- Insert sentiment classification node type
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('sentiment-node', 'Sentiment Analysis', 'sentiment', 'Analyzes the sentiment of text', 'AI', 'mood',
  json_array(
    json_object('name', 'text', 'type', 'string', 'description', 'The text to analyze for sentiment')
  ),
  json_array(
    json_object('name', 'positive', 'type', 'number', 'description', 'Confidence score for positive sentiment'),
    json_object('name', 'negative', 'type', 'number', 'description', 'Confidence score for negative sentiment')
  )
);