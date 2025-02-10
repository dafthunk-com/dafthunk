# API Specification

## Node Types

```
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

```
GET /api/graphs
```

Returns a list of graphs available in the system.

```json
[
    {
        "id": "1",
        "name": "My First Graph"
    }
]
```

```
GET /api/graphs/:id
```

Returns a graph by id.

```json
{  
    "id": "1",
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
            },
            "error": null
        },
        {
            "id": "2",
            "name": "LLM Model",
            "type": "llm-model",
            "inputs": [
                {
                    "name": "prompt",
                    "type": "string"
                },
                {
                    "name": "temperature",
                    "type": "number"
                }
            ],
            "outputs": [
                {
                    "name": "completion",
                    "type": "string"
                }
            ],
            "position": {
                "x": 300,
                "y": 100
            },
            "error": null
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
