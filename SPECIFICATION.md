**Specification for Directed Acyclic Graph (DAG) for Dataflow Workflows**

### Overview

This document defines the specification for a Directed Acyclic Graph (DAG) editor for workflows. 
A DAG consists of nodes (tasks) and edges (connections) representing dependencies. 
The graph must always remain acyclic.

---

### DAG Components

1. **Node**

   - **ID**: Unique identifier.
   - **Name**: Descriptive task name.
   - **Type**: Categorizes the node based on its function. Examples may include:
     - **Input**: A source node that provides data to the graph.
     - **Processor**: A node that executes code or transformations.
     - **Output**: A sink node that consumes or stores data from the graph.
   - **Inputs**: Incoming connections, defined as:
     ```typescript
     {
       name: string; // Input name
       type: string; // Input type (e.g., "void", "number", "string")
     }
     ```
   - **Outputs**: Outgoing connections, defined as:
     ```typescript
     {
       name: string; // Output name
       type: string; // Output type (e.g., "void", "number", "string")
     }
     ```
   - **Error**: Represents the execution error state, defined as:
     ```typescript
     {
       error: string | null; // Error message or null if no error
     }
     ```

2. **Edge**

   - **Source Node ID**: Node where the edge starts.
   - **Target Node ID**: Node where the edge ends.
   - **Source Output Name**: Name of the source node output.
   - **Target Input Name**: Name of the target node input.

---

### Rules

1. **Acyclic Structure**

   - The DAG must remain acyclic at all times.
   - Cycles are prohibited.

2. **Type Matching**

   - Connections require type compatibility between source outputs and target inputs.
   - "Void" connections link only "void" inputs and outputs.

3. **Multi-Connections**

   - Inputs and outputs can allow multiple connections.

---

### Data Representation

1. **Node Schema**

   ```typescript
   {
     id: string;
     name: string;
     type: string; // Node type (e.g., "Input", "Processor", "Connector", "Output")
     inputs: { name: string; type: string }[];
     outputs: { name: string; type: string }[];
   }
   ```

2. **Edge Schema**

   ```typescript
   {
     source: string; // Source node ID
     target: string; // Target node ID
     sourceOutput: string; // Source output name
     targetInput: string; // Target input name
   }
   ```

3. **Graph Schema**

   ```typescript
   {
     nodes: Node[]; // Array of nodes
     edges: Edge[]; // Array of edges
   }
   ```
