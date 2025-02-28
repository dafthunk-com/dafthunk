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

## Workflows

### List All Workflows

```http
GET /api/workflows
```

Retrieves a list of all available workflows in the system.

#### Response

```typescript
{
    "workflows": [
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
  "workflows": [
    {
      "id": "1",
      "name": "My First Workflow",
      "createdAt": "2024-02-10T10:00:00Z",
      "updatedAt": "2024-02-10T10:00:00Z"
    }
  ]
}
```

### Get Workflow by ID

```http
GET /api/workflows/:id
```

Retrieves detailed information about a specific workflow by its ID.

#### Parameters

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| id        | string | The ID of the workflow |

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
  "name": "My First Workflow",
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

### Create Workflow

```http
POST /api/workflows
```

Creates a new workflow with the specified configuration.

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
  "name": "My First Workflow",
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

Returns `201 Created` on success with the created workflow object.

### Update Workflow

```http
PUT /api/workflows/:id
```

Updates an existing workflow with new configuration.

#### Parameters

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| id        | string | The ID of the workflow |

#### Request Body

Same as Create Workflow endpoint.

#### Response

Returns `200 OK` on success with the updated workflow object.

### Delete Workflow

```http
DELETE /api/workflows/:id
```

Deletes a specific workflow.

#### Parameters

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| id        | string | The ID of the workflow |

#### Response

Returns `204 No Content` on successful deletion.

### Execute Workflow

```http
POST /api/workflows/:id/execute
```

Executes a specific workflow and streams the execution progress using Server-Sent Events (SSE).

#### Parameters

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| id        | string | The ID of the workflow |

#### SSE Stream Events

The server emits the following event types:

1. `node-start`: Emitted when a node starts execution

```typescript
{
    "type": "node-start",
    "nodeId": string,
    "timestamp": string
}
```

2. `node-complete`: Emitted when a node completes execution

```typescript
{
    "type": "node-complete",
    "nodeId": string,
    "timestamp": string
}
```

3. `node-error`: Emitted when a node encounters an error

```typescript
{
    "type": "node-error",
    "nodeId": string,
    "error": string,
    "timestamp": string
}
```

4. `execution-complete`: Emitted when the entire workflow execution is complete

```typescript
{
    "type": "execution-complete",
    "timestamp": string
}
```

Example SSE Stream:

```
event: node-start
data: {"type":"node-start","nodeId":"1","timestamp":"2024-02-10T10:00:00Z"}

event: node-complete
data: {"type":"node-complete","nodeId":"1","timestamp":"2024-02-10T10:00:01Z"}

event: execution-complete
data: {"type":"execution-complete","timestamp":"2024-02-10T10:00:01Z"}
```

#### Error Responses

| Status Code | Description        |
| ----------- | ------------------ |
| 404         | Workflow not found |
| 500         | Execution error    |
