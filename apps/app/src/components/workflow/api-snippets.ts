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
