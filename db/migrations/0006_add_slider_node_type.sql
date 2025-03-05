-- Add slider node type
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('slider-node', 'Slider', 'slider', 'A slider widget for selecting a value constrained by min, max, and step values', 'Widgets', 'sliders-horizontal', 
  json_array(
    json_object('name', 'min', 'type', 'number', 'description', 'Minimum value of the slider'),
    json_object('name', 'max', 'type', 'number', 'description', 'Maximum value of the slider'),
    json_object('name', 'step', 'type', 'number', 'description', 'Step size for the slider'),
    json_object('name', 'value', 'type', 'number', 'description', 'Current value of the slider')
  ),
  json_array(
    json_object('name', 'value', 'type', 'number', 'description', 'The selected value from the slider')
  )
); 