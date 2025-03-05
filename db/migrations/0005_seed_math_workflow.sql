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
('subtract-node', 'Subtraction', 'subtraction', 'Subtracts one number from another', 'Math', 'minus',
  json_array(
    json_object('name', 'a', 'type', 'number', 'description', 'First number'),
    json_object('name', 'b', 'type', 'number', 'description', 'Second number')
  ),
  json_array(
    json_object('name', 'result', 'type', 'number', 'description', 'Difference of the two numbers')
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
),
('divide-node', 'Division', 'division', 'Divides one number by another', 'Math', 'divide',
  json_array(
    json_object('name', 'a', 'type', 'number', 'description', 'Numerator'),
    json_object('name', 'b', 'type', 'number', 'description', 'Denominator')
  ),
  json_array(
    json_object('name', 'result', 'type', 'number', 'description', 'Quotient of the two numbers')
  )
),
('modulo-node', 'Modulo', 'modulo', 'Calculates the remainder after division', 'Math', 'percent',
  json_array(
    json_object('name', 'a', 'type', 'number', 'description', 'Dividend'),
    json_object('name', 'b', 'type', 'number', 'description', 'Divisor')
  ),
  json_array(
    json_object('name', 'result', 'type', 'number', 'description', 'Remainder after division')
  )
),
('exponentiation-node', 'Exponentiation', 'exponentiation', 'Raises a base to an exponent', 'Math', 'power',
  json_array(
    json_object('name', 'base', 'type', 'number', 'description', 'Base number'),
    json_object('name', 'exponent', 'type', 'number', 'description', 'Exponent value')
  ),
  json_array(
    json_object('name', 'result', 'type', 'number', 'description', 'Result of base raised to exponent')
  )
),
('sqrt-node', 'Square Root', 'square-root', 'Calculates the square root of a number', 'Math', 'square-root',
  json_array(
    json_object('name', 'value', 'type', 'number', 'description', 'Number to find square root of')
  ),
  json_array(
    json_object('name', 'result', 'type', 'number', 'description', 'Square root of the input value')
  )
),
('abs-node', 'Absolute Value', 'absolute-value', 'Calculates the absolute value of a number', 'Math', 'absolute',
  json_array(
    json_object('name', 'value', 'type', 'number', 'description', 'Number to find absolute value of')
  ),
  json_array(
    json_object('name', 'result', 'type', 'number', 'description', 'Absolute value of the input')
  )
);

-- Insert a sample workflow that calculates (2 + 3) * 4
INSERT INTO workflows (id, name, data) VALUES (
  'math-example',
  'Math Example: (2 + 3) * 4',
  json_object(
    'nodes', json_array(
      json_object(
        'id', 'addition-1',
        'name', 'Addition',
        'type', 'addition',
        'position', json_object('x', 200, 'y', 100),
        'inputs', json_array(
          json_object('name', 'a', 'type', 'number', 'value', 2),
          json_object('name', 'b', 'type', 'number', 'value', 3)
        ),
        'outputs', json_array(
          json_object('name', 'result', 'type', 'number')
        )
      ),
      json_object(
        'id', 'multiplication-1',
        'name', 'Multiplication',
        'type', 'multiplication',
        'position', json_object('x', 600, 'y', 100),
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
        'source', 'addition-1',
        'target', 'multiplication-1',
        'sourceOutput', 'result',
        'targetInput', 'a'
      )
    )
  )
);

-- Insert a more complex workflow example using new math operations
INSERT INTO workflows (id, name, data) VALUES (
  'advanced-math-example',
  'Advanced Math Example: √(|10 - 25| ^ 2 % 7)',
  json_object(
    'nodes', json_array(
      json_object(
        'id', 'subtraction-1',
        'name', 'Subtraction',
        'type', 'subtraction',
        'position', json_object('x', 200, 'y', 100),
        'inputs', json_array(
          json_object('name', 'a', 'type', 'number', 'value', 10),
          json_object('name', 'b', 'type', 'number', 'value', 25)
        ),
        'outputs', json_array(
          json_object('name', 'result', 'type', 'number')
        )
      ),
      json_object(
        'id', 'abs-1',
        'name', 'Absolute Value',
        'type', 'absolute-value',
        'position', json_object('x', 600, 'y', 100),
        'inputs', json_array(
          json_object('name', 'value', 'type', 'number')
        ),
        'outputs', json_array(
          json_object('name', 'result', 'type', 'number')
        )
      ),
      json_object(
        'id', 'exponentiation-1',
        'name', 'Exponentiation',
        'type', 'exponentiation',
        'position', json_object('x', 1000, 'y', 100),
        'inputs', json_array(
          json_object('name', 'base', 'type', 'number'),
          json_object('name', 'exponent', 'type', 'number', 'value', 2)
        ),
        'outputs', json_array(
          json_object('name', 'result', 'type', 'number')
        )
      ),
      json_object(
        'id', 'modulo-1',
        'name', 'Modulo',
        'type', 'modulo',
        'position', json_object('x', 1400, 'y', 100),
        'inputs', json_array(
          json_object('name', 'a', 'type', 'number'),
          json_object('name', 'b', 'type', 'number', 'value', 7)
        ),
        'outputs', json_array(
          json_object('name', 'result', 'type', 'number')
        )
      ),
      json_object(
        'id', 'sqrt-1',
        'name', 'Square Root',
        'type', 'square-root',
        'position', json_object('x', 1800, 'y', 100),
        'inputs', json_array(
          json_object('name', 'value', 'type', 'number')
        ),
        'outputs', json_array(
          json_object('name', 'result', 'type', 'number')
        )
      )
    ),
    'edges', json_array(
      json_object(
        'source', 'subtraction-1',
        'target', 'abs-1',
        'sourceOutput', 'result',
        'targetInput', 'value'
      ),
      json_object(
        'source', 'abs-1',
        'target', 'exponentiation-1',
        'sourceOutput', 'result',
        'targetInput', 'base'
      ),
      json_object(
        'source', 'exponentiation-1',
        'target', 'modulo-1',
        'sourceOutput', 'result',
        'targetInput', 'a'
      ),
      json_object(
        'source', 'modulo-1',
        'target', 'sqrt-1',
        'sourceOutput', 'result',
        'targetInput', 'value'
      )
    )
  )
); 