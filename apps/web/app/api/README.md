# API Specification

## Node Types

```http
GET /api/types
```

Returns a list of node types available in the system. These node types can be used to create new nodes in the workflow.

```json
[
    {
        "id": "text-processor",
        "name": "Text Processor",
        "description": "Process and transform text data",
        "category": "Processing",
        "icon": "TextProcessorIcon"
    },
    {
        "id": "llm-model",
        "name": "LLM Model",
        "description": "Large Language Model for text generation",
        "category": "AI Models",
        "icon": "LLMModelIcon"
    }
]
```

## Graphs

### List All Graphs
```http
GET /api/graphs
```

Retrieves a list of all available graphs in the system.

#### Response

```typescript
{
    "graphs": [
        {
            "id": string,
            "name": string,
            "createdAt": string,
            "updatedAt": string
        }
    ]
}
```

Example Response:
```json
{
    "graphs": [
        {
            "id": "1",
            "name": "My First Graph",
            "createdAt": "2024-02-10T10:00:00Z",
            "updatedAt": "2024-02-10T10:00:00Z"
        }
    ]
}
```

### Get Graph by ID
```http
GET /api/graphs/:id
```

Retrieves detailed information about a specific graph by its ID.

#### Parameters

| Parameter | Type   | Description       |
|-----------|--------|-------------------|
| id        | string | The ID of the graph |

#### Response

```typescript
{
    "id": string,
    "name": string,
    "createdAt": string,
    "updatedAt": string,
    "nodes": [
        {
            "id": string,
            "name": string,
            "type": string,
            "inputs": [
                {
                    "name": string,
                    "type": string
                }
            ],
            "outputs": [
                {
                    "name": string,
                    "type": string
                }
            ],
            "position": {
                "x": number,
                "y": number
            },
            "error": string | null
        }
    ],
    "connections": [
        {
            "id": string,
            "source": string,
            "target": string,
            "sourceOutput": string,
            "targetInput": string
        }
    ]
}
```

Example Response:
```json
{  
    "id": "1",
    "name": "My First Graph",
    "createdAt": "2024-02-10T10:00:00Z",
    "updatedAt": "2024-02-10T10:00:00Z",
    "nodes": [
        {
            "id": "1",
            "name": "Text Processor",
            "type": "text-processor",
            "inputs": [
                {
                    "name": "text",
                    "type": "string"
                }
            ],
            "outputs": [
                {
                    "name": "processedText",
                    "type": "string"
                }
            ],
            "position": {
                "x": 100,
                "y": 100
            },
            "error": null
        }
    ],
    "connections": [
        {
            "id": "conn1",
            "source": "1",
            "target": "2",
            "sourceOutput": "processedText",
            "targetInput": "prompt"
        }
    ]
}
```

### Create Graph
```http
POST /api/graphs
```

Creates a new graph with the specified configuration.

#### Request Body

```typescript
{
    "name": string,
    "nodes": [
        {
            "id": string,
            "name": string,
            "type": string,
            "inputs": [
                {
                    "name": string,
                    "type": string
                }
            ],
            "outputs": [
                {
                    "name": string,
                    "type": string
                }
            ],
            "position": {
                "x": number,
                "y": number
            }
        }
    ],
    "connections": [
        {
            "source": string,
            "target": string,
            "sourceOutput": string,
            "targetInput": string
        }
    ]
}
```

Example Request:
```json
{  
    "name": "My First Graph",
    "nodes": [
        {
            "id": "1",
            "name": "Text Processor",
            "type": "text-processor",
            "inputs": [
                {
                    "name": "text",
                    "type": "string"
                }
            ],
            "outputs": [
                {
                    "name": "processedText",
                    "type": "string"
                }
            ],
            "position": {
                "x": 100,
                "y": 100
            }
        }
    ],
    "connections": [
        {
            "source": "1",
            "target": "2",
            "sourceOutput": "processedText",
            "targetInput": "prompt"
        }
    ]
}
```

#### Response

Returns `201 Created` on success with the created graph object.

### Update Graph
```http
PUT /api/graphs/:id
```

Updates an existing graph with new configuration.

#### Parameters

| Parameter | Type   | Description       |
|-----------|--------|-------------------|
| id        | string | The ID of the graph |

#### Request Body
Same as Create Graph endpoint.

#### Response

Returns `200 OK` on success with the updated graph object.

### Delete Graph
```http
DELETE /api/graphs/:id
```

Deletes a specific graph.

#### Parameters

| Parameter | Type   | Description       |
|-----------|--------|-------------------|
| id        | string | The ID of the graph |

#### Response

Returns `204 No Content` on successful deletion.
