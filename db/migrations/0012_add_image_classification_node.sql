INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('image-classification-node', 'Image Classification', 'image-classification', 'Detects and classifies objects in images', 'AI', 'image',
  json_array(
    json_object('name', 'image', 'type', 'binary', 'description', 'The image to use for object detection')
  ),
  json_array(
    json_object('name', 'detections', 'type', 'array', 'description', 'Array of detected objects with scores, labels, and bounding boxes')
  )
); 