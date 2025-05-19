export interface SnippetParams {
  nameForForm: string;
  type: string;
}

export const EXECUTE_WORKFLOW_SNIPPETS = {
  curl: (
    executeUrl: string,
    hasJsonBody: boolean,
    formParams: SnippetParams[]
  ) => {
    const template = `curl -X POST "{{EXECUTE_URL}}" \\
  -H "Authorization: Bearer YOUR_API_KEY"{{CURL_HEADERS_AND_DATA}}`;

    let curlHeadersAndData = "";

    if (hasJsonBody) {
      curlHeadersAndData = ` \\
  -H "Content-Type: application/json" \\
  -d '{ "key": "value" }'`;
    } else if (formParams.length > 0) {
      let dataParams = "";
      formParams.forEach((param) => {
        let exampleValue: string;
        if (param.type.startsWith("parameter-boolean")) {
          exampleValue = "false";
        } else if (param.type.startsWith("parameter-number")) {
          exampleValue = "123";
        } else {
          exampleValue = `value_for_${param.nameForForm}`;
        }
        dataParams += ` \\
  -d "${param.nameForForm}=${exampleValue}"`;
      });
      // When using -d with key=value pairs, curl typically sets
      // Content-Type to application/x-www-form-urlencoded automatically.
      // If specific JSON is needed for empty form, it's handled by the else block.
      curlHeadersAndData = dataParams;
    } else {
      // Default to empty JSON body
      curlHeadersAndData = ` \\
  -H "Content-Type: application/json" \\
  -d '{}'`;
    }

    return template
      .replace("{{EXECUTE_URL}}", executeUrl)
      .replace("{{CURL_HEADERS_AND_DATA}}", curlHeadersAndData);
  },
  javascript: (
    executeUrl: string,
    hasJsonBody: boolean,
    formParams: SnippetParams[]
  ) => {
    const template = `
const response = await fetch("{{EXECUTE_URL}}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    {{JS_CONTENT_TYPE_HEADER}}
  },
  {{JS_BODY_CONTENT}}
});

const data = await response.json();
console.log(data);`;

    let jsContentTypeHeader = "";
    let jsBodyContent = "";

    if (hasJsonBody) {
      jsContentTypeHeader = `"Content-Type": "application/json"`;
      jsBodyContent = `body: JSON.stringify({ "key": "value" })`;
    } else if (formParams.length > 0) {
      jsContentTypeHeader = `"Content-Type": "application/x-www-form-urlencoded"`;
      const formBodyObjectParts = formParams.map((param) => {
        let exampleValue: string;
        if (param.type.startsWith("parameter-boolean")) {
          exampleValue = "false";
        } else if (param.type.startsWith("parameter-number")) {
          exampleValue = "123";
        } else {
          exampleValue = `value_for_${param.nameForForm}`;
        }
        return `    "${param.nameForForm}": "${exampleValue}"`;
      });
      jsBodyContent = `body: new URLSearchParams({\n${formBodyObjectParts.join(",\n")}\n  })`;
    } else {
      jsContentTypeHeader = `"Content-Type": "application/json"`;
      jsBodyContent = `body: JSON.stringify({})`;
    }

    return template
      .replace("{{EXECUTE_URL}}", executeUrl)
      .replace("{{JS_CONTENT_TYPE_HEADER}}", jsContentTypeHeader)
      .replace("{{JS_BODY_CONTENT}}", jsBodyContent)
      .trim();
  },
  python: (
    executeUrl: string,
    hasJsonBody: boolean,
    formParams: SnippetParams[]
  ) => {
    const template = `
import requests
import json

url = "{{EXECUTE_URL}}"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"{{PYTHON_HEADERS_EXTRA}}
}
{{PYTHON_PAYLOAD_DEFINITION}}
response = requests.post(url, headers=headers, data=payload)

print(response.json())`;

    let pythonHeadersExtra = "";
    let pythonPayloadDefinition = "";

    if (hasJsonBody) {
      pythonHeadersExtra = `,\n    "Content-Type": "application/json"`;
      pythonPayloadDefinition = `payload = json.dumps({ "key": "value" })`;
    } else if (formParams.length > 0) {
      // For form data (dict), requests usually sets Content-Type automatically.
      // No explicit "Content-Type" header needed here.
      // pythonHeadersExtra can be an empty string or just a newline if needed for formatting,
      // but an empty string is fine as the template is `headers = { ..., "Auth": "..."PYTHON_HEADERS_EXTRA }`
      pythonHeadersExtra = ""; // No extra header needed for urlencoded form data
      const formBodyParts = formParams.map((param) => {
        let exampleValue: string;
        if (param.type.startsWith("parameter-boolean")) {
          exampleValue = "False";
        } else if (param.type.startsWith("parameter-number")) {
          exampleValue = "123";
        } else {
          exampleValue = `value_for_${param.nameForForm}`;
        }
        return `    "${param.nameForForm}": "${exampleValue}"`;
      });
      pythonPayloadDefinition = `payload = {\n${formBodyParts.join(",\n")}\n}`;
    } else {
      pythonHeadersExtra = `,\n    "Content-Type": "application/json"`;
      pythonPayloadDefinition = `payload = json.dumps({})`;
    }

    return template
      .replace("{{EXECUTE_URL}}", executeUrl)
      .replace("{{PYTHON_HEADERS_EXTRA}}", pythonHeadersExtra)
      .replace("{{PYTHON_PAYLOAD_DEFINITION}}", pythonPayloadDefinition)
      .trim();
  },
};

export const GET_EXECUTION_STATUS_SNIPPETS = {
  curl: (statusUrl: string) => {
    const template = `curl -X GET "{{STATUS_URL}}/YOUR_EXECUTION_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;
    return template.replace("{{STATUS_URL}}", statusUrl);
  },
  javascript: (statusUrl: string) => {
    const template = `
const response = await fetch("{{STATUS_URL}}/YOUR_EXECUTION_ID", {
  method: "GET",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});

const data = await response.json();
console.log(data);`;
    return template.replace("{{STATUS_URL}}", statusUrl).trim();
  },
  python: (statusUrl: string) => {
    const template = `
import requests

url = "{{STATUS_URL}}/YOUR_EXECUTION_ID"
headers = {
    "Authorization": "Bearer YOUR_API_KEY"
}
response = requests.get(url, headers=headers)

print(response.json())`;
    return template.replace("{{STATUS_URL}}", statusUrl).trim();
  },
};

export const GET_OBJECT_SNIPPETS = {
  curl: (objectUrl: string) => {
    const template = `curl -X GET "{{OBJECT_URL}}&mimeType=YOUR_OBJECT_MIME_TYPE" \\
  -H "Authorization: Bearer YOUR_API_KEY"`;
    return template.replace("{{OBJECT_URL}}", objectUrl);
  },
  javascript: (objectUrl: string) => {
    const template = `
const response = await fetch("{{OBJECT_URL}}&mimeType=YOUR_OBJECT_MIME_TYPE", {
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
    return template.replace("{{OBJECT_URL}}", objectUrl).trim();
  },
  python: (objectUrl: string) => {
    const template = `
import requests

url = "{{OBJECT_URL}}&mimeType=YOUR_OBJECT_MIME_TYPE"
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
    return template.replace("{{OBJECT_URL}}", objectUrl).trim();
  },
};
