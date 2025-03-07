-- Insert an image generation workflow with LLM prompt generation
INSERT INTO workflows (id, name, data) VALUES (
  'ai-image-generation-workflow',
  'AI Image Generation with Prompt Generation',
  json_object(
    'nodes', json_array(
      json_object(
        'id', 'llm-prompt-generator',
        'name', 'Prompt Generator',
        'type', 'llm',
        'position', json_object('x', 200, 'y', 200),
        'inputs', json_array(
          json_object('name', 'prompt', 'type', 'string', 'value', 'Create a detailed and vivid description for an image of: a astonishing sunset in space. Reply only with the description.'),
          json_object('name', 'temperature', 'type', 'number', 'value', 0.8),
          json_object('name', 'seed', 'type', 'number', 'value', 42)
        ),
        'outputs', json_array(
          json_object('name', 'response', 'type', 'string')
        )
      ),
      json_object(
        'id', 'image-generator',
        'name', 'Image Generator',
        'type', 'image-generation',
        'position', json_object('x', 600, 'y', 200),
        'inputs', json_array(
          json_object('name', 'prompt', 'type', 'string'),
          json_object('name', 'negative_prompt', 'type', 'string', 'value', 'blurry, low quality, distorted, deformed'),
          json_object('name', 'height', 'type', 'number', 'value', 1024),
          json_object('name', 'width', 'type', 'number', 'value', 1024),
          json_object('name', 'num_steps', 'type', 'number', 'value', 20),
          json_object('name', 'guidance', 'type', 'number', 'value', 7.5)
        ),
        'outputs', json_array(
          json_object('name', 'image', 'type', 'binary')
        )
      )
    ),
    'edges', json_array(
      json_object(
        'source', 'llm-prompt-generator',
        'target', 'image-generator',
        'sourceOutput', 'response',
        'targetInput', 'prompt'
      )
    )
  )
); 