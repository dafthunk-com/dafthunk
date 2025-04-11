import { Workflow as RuntimeWorkflow } from "../src/lib/runtime/types";

// Create a simple math workflow
function createMathWorkflow(): RuntimeWorkflow {
  return {
    id: "test-workflow",
    name: "Test Math Workflow",
    nodes: [
      {
        id: "add1",
        type: "addition",
        inputs: [
          { name: "a", type: "number", value: 1 },
          { name: "b", type: "number", value: 2 },
        ],
        outputs: [{ name: "result", type: "number" }],
        name: "Add",
      },
      {
        id: "subtract1",
        type: "subtraction",
        inputs: [
          { name: "a", type: "number" },
          { name: "b", type: "number", value: 1 },
        ],
        outputs: [{ name: "result", type: "number" }],
        name: "Subtract",
      },
      {
        id: "multiply1",
        type: "multiplication",
        inputs: [
          { name: "a", type: "number" },
          { name: "b", type: "number", value: 3 },
        ],
        outputs: [{ name: "result", type: "number" }],
        name: "Multiply",
      },
    ],
    edges: [
      {
        source: "add1",
        sourceOutput: "result",
        target: "subtract1",
        targetInput: "a",
      },
      {
        source: "subtract1",
        sourceOutput: "result",
        target: "multiply1",
        targetInput: "a",
      },
    ],
  };
}

function createStableDiffusionWorkflow(): RuntimeWorkflow {
  return {
    id: "test-workflow",
    name: "Test SDL Workflow",
    nodes: [
      {
        id: "image-generation",
        type: "stable-diffusion-xl-lightning",
        inputs: [
          {
            name: "prompt",
            type: "string",
            value: "A beautiful sunset over a calm ocean",
          },
        ],
        outputs: [{ name: "image", type: "image" }],
        name: "Stable Diffusion",
      },
    ],
    edges: [],
  };
}

async function streamWorkflow(workflow: RuntimeWorkflow): Promise<any> {
  console.log(`Streaming ${workflow.name} to localhost:8787...`);

  try {
    const response = await fetch("http://localhost:8787/workflows/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workflow }),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}. Check if the worker is running at http://localhost:8787`
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = null;

    console.log("SSE Stream started:");

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log("Stream complete");
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.substring(6));
          console.log(`Status: ${data.status}`, data);

          if (data.status === "complete") {
            finalResult = data;
          } else if (data.status === "errored") {
            throw new Error(
              `Workflow execution failed: ${JSON.stringify(data)}`
            );
          }
        }
      }
    }

    return finalResult;
  } catch (error) {
    console.error("Error streaming workflow:", error);
    throw error;
  }
}

// Test execution function
async function runTest(
  testName: string,
  workflow: RuntimeWorkflow,
  validateFn?: (result: any) => boolean
): Promise<boolean> {
  try {
    console.log(`\n---------- RUNNING TEST: ${testName} ----------`);
    const result = await streamWorkflow(workflow);

    if (!result || result.status !== "complete") {
      console.error(
        `❌ ${testName} FAILED: Workflow did not complete successfully`
      );
      return false;
    }

    if (validateFn && !validateFn(result)) {
      console.error(`❌ ${testName} FAILED: Validation failed`);
      return false;
    }

    console.log(`✅ ${testName} PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${testName} FAILED with error:`, error);
    return false;
  }
}

// Run all integration tests
async function runAllTests() {
  let passCount = 0;
  let totalTests = 0;

  // Test 1: Math workflow
  totalTests++;
  const mathTest = await runTest(
    "Math Workflow Test",
    createMathWorkflow(),
    (result) => {
      // Expected results:
      // add1: 1 + 2 = 3
      // subtract1: 3 - 1 = 2
      // multiply1: 2 * 3 = 6
      const nodes = result.output.nodeOutputs || {};
      const multiplyNode = nodes["multiply1"];

      if (!multiplyNode || multiplyNode.result !== 6) {
        console.error(
          `Expected final result to be 6, got ${multiplyNode?.result}`
        );
        return false;
      }

      console.log("Math calculation correct: final result is 6");
      return true;
    }
  );
  if (mathTest) passCount++;

  // Test 2: Stable Diffusion workflow
  totalTests++;
  const sdTest = await runTest(
    "Stable Diffusion Workflow Test",
    createStableDiffusionWorkflow(),
    (result) => {
      const nodes = result.output.nodeOutputs || {};
      const sdNode = nodes["image-generation"];

      if (!sdNode || !sdNode.image) {
        console.error("Expected image output not found");
        return false;
      }

      console.log("Stable Diffusion generated an image successfully");
      return true;
    }
  );
  if (sdTest) passCount++;

  // Print test summary
  console.log(`\n---------- TEST SUMMARY ----------`);
  console.log(`Tests passed: ${passCount}/${totalTests}`);

  // Return non-zero exit code if any tests failed
  if (passCount < totalTests) {
    process.exit(1);
  }
}

// Execute all tests
runAllTests().catch((error) => {
  console.error("Error running tests:", error);
  process.exit(1);
});
