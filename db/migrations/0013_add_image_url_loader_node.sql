INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('image-url-loader-node', 'Image URL Loader', 'image-url-loader', 'Loads an image from a URL and converts it to a data array', 'Utility', 'link',
  json_array(
    json_object('name', 'url', 'type', 'string', 'description', 'The URL of the PNG image to load')
  ),
  json_array(
    json_object('name', 'imageData', 'type', 'binary', 'description', 'The image data as a binary array')
  )
); 