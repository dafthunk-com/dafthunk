INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('image-generation-node', 'Image Generation', 'image-generation', 'Generates images from text descriptions using Stable Diffusion XL Lightning', 'AI', 'wand',
  json_array(
    json_object('name', 'prompt', 'type', 'string', 'description', 'A text description of the image you want to generate'),
    json_object('name', 'negative_prompt', 'type', 'string', 'description', 'Text describing elements to avoid in the generated image', 'optional', true),
    json_object('name', 'height', 'type', 'number', 'description', 'The height of the generated image in pixels (256-2048)', 'value', 1024),
    json_object('name', 'width', 'type', 'number', 'description', 'The width of the generated image in pixels (256-2048)', 'value', 1024),
    json_object('name', 'num_steps', 'type', 'number', 'description', 'The number of diffusion steps (1-20)', 'value', 20),
    json_object('name', 'guidance', 'type', 'number', 'description', 'Controls how closely the generated image should adhere to the prompt', 'value', 7.5)
  ),
  json_array(
    json_object('name', 'image', 'type', 'binary', 'description', 'The generated image in PNG format')
  )
); 