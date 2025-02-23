-- Seed initial graphs
INSERT INTO workflows (id, name, data, created_at, updated_at) 
VALUES 
(
    '1',
    'Simple Approval Flow',
    json('{
        "nodes": [
            {
                "id": "1",
                "name": "Start",
                "type": "start",
                "position": { "x": 100, "y": 100 },
                "inputs": [],
                "outputs": [
                    { "name": "output", "type": "trigger" }
                ]
            },
            {
                "id": "2",
                "name": "Review Document",
                "type": "task",
                "position": { "x": 450, "y": 100 },
                "inputs": [
                    { "name": "input", "type": "trigger" }
                ],
                "outputs": [
                    { "name": "approved", "type": "trigger" },
                    { "name": "rejected", "type": "trigger" }
                ]
            },
            {
                "id": "3",
                "name": "End",
                "type": "end",
                "position": { "x": 800, "y": 100 },
                "inputs": [
                    { "name": "input", "type": "trigger" }
                ],
                "outputs": []
            }
        ],
        "edges": [
            {
                "source": "1",
                "target": "2",
                "sourceOutput": "output",
                "targetInput": "input"
            },
            {
                "source": "2",
                "target": "3",
                "sourceOutput": "approved",
                "targetInput": "input"
            }
        ]
    }'),
    strftime('%s', '2024-03-20 10:00:00'),
    strftime('%s', '2024-03-20 10:00:00')
),
(
    '2',
    'Document Processing',
    json('{
        "nodes": [
            {
                "id": "1",
                "name": "Start",
                "type": "start",
                "position": { "x": 100, "y": 100 },
                "inputs": [],
                "outputs": [
                    { "name": "output", "type": "trigger" }
                ]
            },
            {
                "id": "2",
                "name": "Upload Document",
                "type": "task",
                "position": { "x": 450, "y": 100 },
                "inputs": [
                    { "name": "input", "type": "trigger" }
                ],
                "outputs": [
                    { "name": "success", "type": "trigger" }
                ]
            },
            {
                "id": "3",
                "name": "Process Document",
                "type": "task",
                "position": { "x": 800, "y": 100 },
                "inputs": [
                    { "name": "input", "type": "trigger" }
                ],
                "outputs": [
                    { "name": "success", "type": "trigger" }
                ]
            },
            {
                "id": "4",
                "name": "End",
                "type": "end",
                "position": { "x": 1150, "y": 100 },
                "inputs": [
                    { "name": "input", "type": "trigger" }
                ],
                "outputs": []
            }
        ],
        "edges": [
            {
                "source": "1",
                "target": "2",
                "sourceOutput": "output",
                "targetInput": "input"
            },
            {
                "source": "2",
                "target": "3",
                "sourceOutput": "success",
                "targetInput": "input"
            },
            {
                "source": "3",
                "target": "4",
                "sourceOutput": "success",
                "targetInput": "input"
            }
        ]
    }'),
    strftime('%s', '2024-03-19 15:30:00'),
    strftime('%s', '2024-03-20 09:15:00')
); 