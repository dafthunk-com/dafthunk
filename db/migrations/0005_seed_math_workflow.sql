-- Insert math node types
INSERT INTO node_types (id, name, type, description, category, icon, inputs, outputs) VALUES 
('add-node', 'Addition', 'addition', 'Adds two numbers together', 'Math', 'plus', 
  json_array(
    json_object('name', 'a', 'type', 'number', 'description', 'First number'),
    json_object('name', 'b', 'type', 'number', 'description', 'Second number')
  ),
  json_array(
    json_object('name', 'result', 'type', 'number', 'description', 'Sum of the two numbers')
  )
),
('multiply-node', 'Multiplication', 'multiplication', 'Multiplies two numbers', 'Math', 'x',
  json_array(
    json_object('name', 'a', 'type', 'number', 'description', 'First number'),
    json_object('name', 'b', 'type', 'number', 'description', 'Second number')
  ),
  json_array(
    json_object('name', 'result', 'type', 'number', 'description', 'Product of the two numbers')
  )
);

-- Insert a sample workflow that calculates (2 + 3) * 4
INSERT INTO workflows (id, name, data) VALUES (
  'math-example',
  'Math Example: (2 + 3) * 4',
  json_object(
    'nodes', json_array(
      json_object(
        'id', 'add1',
        'name', 'Addition',
        'type', 'addition',
        'position', json_object('x', 100, 'y', 100),
        'inputs', json_array(
          json_object('name', 'a', 'type', 'number', 'value', 2),
          json_object('name', 'b', 'type', 'number', 'value', 3)
        ),
        'outputs', json_array(
          json_object('name', 'result', 'type', 'number')
        )
      ),
      json_object(
        'id', 'multiply1',
        'name', 'Multiplication',
        'type', 'multiplication',
        'position', json_object('x', 400, 'y', 100),
        'inputs', json_array(
          json_object('name', 'a', 'type', 'number'),
          json_object('name', 'b', 'type', 'number', 'value', 4)
        ),
        'outputs', json_array(
          json_object('name', 'result', 'type', 'number')
        )
      )
    ),
    'edges', json_array(
      json_object(
        'source', 'add1',
        'target', 'multiply1',
        'sourceOutput', 'result',
        'targetInput', 'a'
      )
    )
  )
); 