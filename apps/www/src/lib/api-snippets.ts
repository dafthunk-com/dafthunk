export const EXECUTE_ENDPOINT_SNIPPETS = {
  curl: (endpointUrl: string) => {
    return `curl -X POST "${endpointUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "key": "value" }'`;
  },
  javascript: (endpointUrl: string) => {
    return `const response = await fetch("${endpointUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ "key": "value" })
});

const data = await response.json();
console.log(data);`;
  },
  python: (endpointUrl: string) => {
    return `import requests
import json

url = "${endpointUrl}"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = json.dumps({ "key": "value" })
response = requests.post(url, headers=headers, data=payload)

print(response.json())`;
  },
};

export const GET_EXECUTION_STATUS_SNIPPETS = {
  curl: (statusUrl: string) => {
    return `curl -X GET "${statusUrl}/YOUR_EXECUTION_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;
  },
  javascript: (statusUrl: string) => {
    return `const response = await fetch("${statusUrl}/YOUR_EXECUTION_ID", {
  method: "GET",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});

const data = await response.json();
console.log(data);`;
  },
  python: (statusUrl: string) => {
    return `import requests

url = "${statusUrl}/YOUR_EXECUTION_ID"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}
response = requests.get(url, headers=headers)

print(response.json())`;
  },
};

export const GET_OBJECT_SNIPPETS = {
  curl: (objectUrl: string) => {
    return `curl -X GET "${objectUrl}&mimeType=YOUR_OBJECT_MIME_TYPE" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;
  },
  javascript: (objectUrl: string) => {
    return `const response = await fetch("${objectUrl}&mimeType=YOUR_OBJECT_MIME_TYPE", {
  method: "GET",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});

// Depending on the object's mimeType, you may need to handle the response differently
// For example, for an image:
// const blob = await response.blob();
// const imageUrl = URL.createObjectURL(blob);
// console.log(imageUrl);

// For JSON:
// const data = await response.json();
// console.log(data);

// For text:
// const text = await response.text();
// console.log(text);

if (response.ok) {
  console.log("Object fetched successfully. Handle response based on mimeType.");
} else {
  console.error("Error fetching object:", response.status, await response.text());
}`;
  },
  python: (objectUrl: string) => {
    return `import requests

url = "${objectUrl}&mimeType=YOUR_OBJECT_MIME_TYPE"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}
response = requests.get(url, headers=headers)

if response.status_code == 200:
    # Depending on the object's mimeType, you might want to save it to a file
    # or process it in memory.
    # For example, to save to a file:
    # with open("downloaded_object.ext", "wb") as f: # replace .ext with actual extension
    #     f.write(response.content)
    print("Object fetched successfully. Content length:", len(response.content))
else:
    print(f"Error fetching object: {response.status_code}")
    print(response.text)`;
  },
};

export const PUBLISH_QUEUE_SNIPPETS = {
  curl: (queueUrl: string) => {
    return `curl -X POST "${queueUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "payload": { "event": "order_created", "data": { "id": 123 } } }'`;
  },
  javascript: (queueUrl: string) => {
    return `const response = await fetch("${queueUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    payload: { event: "order_created", data: { id: 123 } }
  })
});

const data = await response.json();
console.log(data);`;
  },
  python: (queueUrl: string) => {
    return `import requests
import json

url = "${queueUrl}"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = json.dumps({
    "payload": { "event": "order_created", "data": { "id": 123 } }
})
response = requests.post(url, headers=headers, data=payload)

print(response.json())`;
  },
};

export const QUERY_DATABASE_SNIPPETS = {
  curl: (databaseUrl: string) => {
    return `curl -X POST "${databaseUrl}" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "sql": "SELECT * FROM users WHERE active = ?", "params": [true] }'`;
  },
  javascript: (databaseUrl: string) => {
    return `const response = await fetch("${databaseUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    sql: "SELECT * FROM users WHERE active = ?",
    params: [true]
  })
});

const data = await response.json();
console.log(data);`;
  },
  python: (databaseUrl: string) => {
    return `import requests
import json

url = "${databaseUrl}"
headers = {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
}
payload = json.dumps({
    "sql": "SELECT * FROM users WHERE active = ?",
    "params": [True]
})
response = requests.post(url, headers=headers, data=payload)

print(response.json())`;
  },
};
