UPDATE node_types 
SET outputs = json_array(
  json_object(
    'name', 'detections',
    'type', 'object',
    'description', 'JSON object containing detected objects with scores, labels, and bounding boxes'
  )
)
WHERE id = 'image-classification-node'; 
