-- Insert a content analysis and translation workflow
INSERT INTO workflows (id, name, data) VALUES (
  'content-analysis-pipeline',
  'Content Analysis and Translation Pipeline',
  json_object(
    'nodes', json_array(
      json_object(
        'id', 'llm-1',
        'name', 'Content Expansion',
        'type', 'llm',
        'position', json_object('x', 200, 'y', 100),
        'inputs', json_array(
          json_object('name', 'prompt', 'type', 'string', 'value', 'Expand on the following text while maintaining its key points: Once upon a time, there was a cat that was very hungry. It went to the store and bought a mouse.'),
          json_object('name', 'temperature', 'type', 'number', 'value', 0.7),
          json_object('name', 'seed', 'type', 'number', 'value', 42)
        ),
        'outputs', json_array(
          json_object('name', 'response', 'type', 'string')
        )
      ),
      json_object(
        'id', 'sentiment-1',
        'name', 'Sentiment Analysis',
        'type', 'sentiment',
        'position', json_object('x', 600, 'y', 100),
        'inputs', json_array(
          json_object('name', 'text', 'type', 'string')
        ),
        'outputs', json_array(
          json_object('name', 'positive', 'type', 'number'),
          json_object('name', 'negative', 'type', 'number')
        )
      ),
      json_object(
        'id', 'summarize-1',
        'name', 'Content Summarization',
        'type', 'summarization',
        'position', json_object('x', 600, 'y', 300),
        'inputs', json_array(
          json_object('name', 'inputText', 'type', 'string'),
          json_object('name', 'maxLength', 'type', 'number', 'value', 150)
        ),
        'outputs', json_array(
          json_object('name', 'summary', 'type', 'string')
        )
      ),
      json_object(
        'id', 'translate-fr',
        'name', 'French Translation',
        'type', 'translation',
        'position', json_object('x', 1000, 'y', 100),
        'inputs', json_array(
          json_object('name', 'text', 'type', 'string'),
          json_object('name', 'sourceLang', 'type', 'string', 'value', 'en'),
          json_object('name', 'targetLang', 'type', 'string', 'value', 'fr')
        ),
        'outputs', json_array(
          json_object('name', 'translatedText', 'type', 'string')
        )
      ),
      json_object(
        'id', 'translate-de',
        'name', 'German Translation',
        'type', 'translation',
        'position', json_object('x', 1000, 'y', 300),
        'inputs', json_array(
          json_object('name', 'text', 'type', 'string'),
          json_object('name', 'sourceLang', 'type', 'string', 'value', 'en'),
          json_object('name', 'targetLang', 'type', 'string', 'value', 'de')
        ),
        'outputs', json_array(
          json_object('name', 'translatedText', 'type', 'string')
        )
      ),
      json_object(
        'id', 'translate-it',
        'name', 'Italian Translation',
        'type', 'translation',
        'position', json_object('x', 1000, 'y', 500),
        'inputs', json_array(
          json_object('name', 'text', 'type', 'string'),
          json_object('name', 'sourceLang', 'type', 'string', 'value', 'en'),
          json_object('name', 'targetLang', 'type', 'string', 'value', 'it')
        ),
        'outputs', json_array(
          json_object('name', 'translatedText', 'type', 'string')
        )
      )
    ),
    'edges', json_array(
      json_object(
        'source', 'llm-1',
        'target', 'sentiment-1',
        'sourceOutput', 'response',
        'targetInput', 'text'
      ),
      json_object(
        'source', 'llm-1',
        'target', 'summarize-1',
        'sourceOutput', 'response',
        'targetInput', 'inputText'
      ),
      json_object(
        'source', 'summarize-1',
        'target', 'translate-fr',
        'sourceOutput', 'summary',
        'targetInput', 'text'
      ),
      json_object(
        'source', 'summarize-1',
        'target', 'translate-de',
        'sourceOutput', 'summary',
        'targetInput', 'text'
      ),
      json_object(
        'source', 'summarize-1',
        'target', 'translate-it',
        'sourceOutput', 'summary',
        'targetInput', 'text'
      )
    )
  )
); 