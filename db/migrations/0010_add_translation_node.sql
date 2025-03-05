INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('translation-node', 'Translation', 'translation', 'Translates text between languages', 'AI', 'language',
  json_array(
    json_object('name', 'text', 'type', 'string', 'description', 'The text to be translated'),
    json_object('name', 'source_lang', 'type', 'string', 'description', 'The language code of the source text (e.g., ''en'' for English)'),
    json_object('name', 'target_lang', 'type', 'string', 'description', 'The language code to translate the text into (e.g., ''es'' for Spanish)')
  ),
  json_array(
    json_object('name', 'translated_text', 'type', 'string', 'description', 'The translated text in the target language')
  )
); 