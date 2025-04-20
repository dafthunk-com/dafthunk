# Dafthunk API Documentation

This document outlines the available API endpoints for the Dafthunk backend service.

## Type Definitions: `api/types.ts` vs `nodes/types.ts`

The codebase utilizes two distinct sets of type definitions located in `apps/api/src/lib/api/types.ts` and `apps/api/src/lib/nodes/types.ts`. Understanding their difference is crucial:

- **`apps/api/src/lib/api/types.ts`**: Defines the data structures used for communication between the client (e.g., the frontend application) and the API, as well as for storing workflow definitions in the database. A key characteristic is the use of `ObjectReference` (containing an `id` and `mimeType`) for binary data types like images, documents, and audio. This avoids transmitting large binary blobs directly via JSON APIs and instead relies on references to objects stored separately (e.g., in Cloudflare R2). Types defined here include `Workflow`, `Node`, `Edge`, `Parameter`, etc., as they are represented in API requests/responses and storage.

- **`apps/api/src/lib/nodes/types.ts`**: Defines the data structures used _internally_ by the individual executable workflow nodes during runtime execution. These types, such as `ImageParameter`, `DocumentParameter`, and `AudioParameter`, typically contain the actual binary data (as `Uint8Array`) required for the node's processing logic. The `ParameterRegistry` (`apps/api/src/lib/runtime/parameterRegistry.ts`) is responsible for converting between the API representation (`ObjectReference`) and the node execution representation (`Uint8Array`) when a workflow runs.

In essence, `api/types.ts` deals with the _external interface and storage representation_, while `nodes/types.ts` deals with the _internal execution data format_.

## Authentication

Authentication is handled via JWT (JSON Web Tokens) stored in an HTTP-only cookie (`dafthunk_session`). Most endpoints require authentication. Login is performed via OAuth providers (GitHub, Google).

### `GET /auth/protected`

- **Purpose**: Checks if the user has a valid authentication token.
- **Authentication**: Required.
- **Input**: None.
- **Output**:
  - `200 OK`: `{ "success": true }` if authenticated.
  - `401 Unauthorized`: If not authenticated.
- **Types**: `N/A`

### `GET /auth/user`

- **Purpose**: Retrieves the authenticated user's information from the JWT payload.
- **Authentication**: Required.
- **Input**: None.
- **Output**:
  - `200 OK`: `{ "user": CustomJWTPayload }`
  - `401 Unauthorized`: If not authenticated.
- **Types**: `CustomJWTPayload` (from `apps/api/src/lib/auth.ts`)

### `GET /auth/logout`

- **Purpose**: Clears the authentication cookie and redirects the user to the web host.
- **Authentication**: Not Required.
- **Input**: None.
- **Output**:
  - `302 Found`: Redirects to the `WEB_HOST`.
- **Types**: `N/A`

### `GET /auth/login/github`

- **Purpose**: Initiates the GitHub OAuth login flow. Handles the callback, creates/updates the user in the database, sets the authentication cookie, and redirects to the web host.
- **Authentication**: Not Required.
- **Input**: Standard OAuth parameters handled by the provider middleware.
- **Output**:
  - `302 Found`: Redirects to GitHub for authorization, then redirects back to the callback URL, and finally redirects to the `WEB_HOST` after successful login.
  - `400 Bad Request`: If user data is not received from GitHub.
- **Types**: Uses GitHub user profile data.

### `GET /auth/login/google`

- **Purpose**: Initiates the Google OAuth login flow. Handles the callback, creates/updates the user in the database, sets the authentication cookie, and redirects to the web host.
- **Authentication**: Not Required.
- **Input**: Standard OAuth parameters handled by the provider middleware.
- **Output**:
  - `302 Found`: Redirects to Google for authorization, then redirects back to the callback URL, and finally redirects to the `WEB_HOST` after successful login.
  - `400 Bad Request`: If user data is not received from Google.
- **Types**: Uses Google user profile data.

## Objects (Binary Data)

Handles the storage and retrieval of binary data (images, documents, audio) used in workflows.

### `GET /objects`

- **Purpose**: Retrieves a binary object previously stored.
- **Authentication**: Required.
- **Input**:
  - Query Parameters:
    - `id` (string, required): The unique ID of the object to retrieve.
    - `mimeType` (string, required): The MIME type of the object (used for the `Content-Type` header).
- **Output**:
  - `200 OK`: The raw binary data of the object with the correct `Content-Type` header.
  - `400 Bad Request`: If `id` or `mimeType` query parameters are missing.
  - `404 Not Found`: If the object with the specified `id` does not exist.
  - `500 Internal Server Error`: If there's an error retrieving the object from storage.
- **Types**: Raw binary data.

### `POST /objects`

- **Purpose**: Uploads a binary file and stores it, returning a reference.
- **Authentication**: Required.
- **Input**:
  - `Content-Type`: `multipart/form-data`
  - Form Data:
    - `file` (File, required): The binary file to upload.
- **Output**:
  - `200 OK`: `{ "reference": ObjectReference }` containing the ID and MIME type of the stored object.
  - `400 Bad Request`: If the content type is incorrect or no valid file is provided.
  - `500 Internal Server Error`: If there's an error storing the object.
- **Types**: `ObjectReference` (from `apps/api/src/lib/runtime/store.ts`)

## Node Types

Provides information about the available node types for building workflows.

### `GET /types`

- **Purpose**: Retrieves a list of all available node types that can be used in the workflow editor.
- **Authentication**: Required.
- **Input**: None.
- **Output**:
  - `200 OK`: `NodeType[]` - An array of available node type definitions.
  - `500 Internal Server Error`: If there's an error retrieving the types.
- **Types**: `NodeType[]` (from `apps/api/src/lib/api/types.ts`)

## Workflows

Endpoints for managing user workflows (creating, reading, updating, deleting, executing).

### `GET /workflows`

- **Purpose**: Retrieves a list of all workflows belonging to the authenticated user.
- **Authentication**: Required.
- **Input**: None.
- **Output**:
  - `200 OK`: `{ "workflows": BasicWorkflowInfo[] }` - An array of basic workflow information (id, name, createdAt, updatedAt).
- **Types**: `BasicWorkflowInfo` (derived from `Workflow` in `apps/api/db/schema.ts`)

### `POST /workflows`

- **Purpose**: Creates a new workflow for the authenticated user.
- **Authentication**: Required.
- **Input**:
  - `Content-Type`: `application/json`
  - Body: `{ name?: string; nodes?: ApiNode[]; edges?: ApiEdge[] }`
    - `name` (optional): The name for the new workflow. Defaults to "Untitled Workflow".
    - `nodes` (optional): An array of initial nodes. Defaults to empty array.
    - `edges` (optional): An array of initial edges. Defaults to empty array.
- **Output**:
  - `201 Created`: The full `Workflow` object that was created.
- **Types**: `Workflow` (input body is partial, output is full `Workflow` from `apps/api/src/lib/api/types.ts`)

### `GET /workflows/:id`

- **Purpose**: Retrieves a specific workflow by its ID, belonging to the authenticated user.
- **Authentication**: Required.
- **Input**:
  - Path Parameter: `id` (string, required): The ID of the workflow to retrieve.
- **Output**:
  - `200 OK`: The full `Workflow` object.
  - `404 Not Found`: If the workflow doesn't exist or doesn't belong to the user.
- **Types**: `Workflow` (from `apps/api/src/lib/api/types.ts`)

### `PUT /workflows/:id`

- **Purpose**: Updates an existing workflow by its ID, belonging to the authenticated user. Input values (except for `ObjectReference` types) on nodes are sanitized: they are cleared if the input is connected to an edge. Output values are always cleared before saving.
- **Authentication**: Required.
- **Input**:
  - Path Parameter: `id` (string, required): The ID of the workflow to update.
  - `Content-Type`: `application/json`
  - Body: `Workflow` - The complete updated workflow data.
- **Output**:
  - `200 OK`: The full updated `Workflow` object after sanitization.
  - `404 Not Found`: If the workflow doesn't exist or doesn't belong to the user.
- **Types**: `Workflow` (input body and output are `Workflow` from `apps/api/src/lib/api/types.ts`)

### `DELETE /workflows/:id`

- **Purpose**: Deletes a specific workflow by its ID, belonging to the authenticated user.
- **Authentication**: Required.
- **Input**:
  - Path Parameter: `id` (string, required): The ID of the workflow to delete.
- **Output**:
  - `200 OK`: `{ "id": string }` - The ID of the deleted workflow.
  - `404 Not Found`: If the workflow doesn't exist or doesn't belong to the user.
- **Types**: `N/A`

### `GET /workflows/:id/execute`

- **Purpose**: Executes a specific workflow by its ID and streams execution events (node start, complete, error, execution end) back to the client using Server-Sent Events (SSE).
- **Authentication**: Required.
- **Input**:
  - Path Parameter: `id` (string, required): The ID of the workflow to execute.
- **Output**:
  - `Content-Type`: `text/event-stream`
  - Stream Data: A series of SSE events (`ExecutionEvent` structure, see below).
  - `403 Forbidden`: If a free plan user tries to execute a workflow with AI nodes.
  - `404 Not Found`: If the workflow doesn't exist or doesn't belong to the user.
  - `500 Internal Server Error`: If starting the workflow execution fails.
- **Types**:

  - Events streamed have the format:

    ```
    event: <event_type>
    data: JSON.stringify(<event_data>)
    id: <unique_event_id> (optional)

    ```

  - Possible `event_type`s:
    - `node-complete`: `data` = `{ nodeId: string, outputs: Record<string, ParameterValue>, timestamp: number }`
    - `node-error`: `data` = `{ nodeId: string, error: string, timestamp: number }`
    - `execution-complete`: `data` = `{ timestamp: number }`
    - `execution-error`: `data` = `{ error: string, timestamp: number }`
  - Uses `ParameterValue` from `apps/api/src/lib/api/types.ts` for `node-complete` outputs.
