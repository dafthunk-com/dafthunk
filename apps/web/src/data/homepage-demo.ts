import type { ObjectReference, WorkflowExecution } from "@dafthunk/types";
import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
} from "@xyflow/react";
import type { WorkflowNodeType } from "@/components/workflow/workflow-types";

export const demoNodes: ReactFlowNode<WorkflowNodeType>[] = [
  {
    id: "canvas-doodle-1750948989536",
    type: "workflowNode",
    position: { x: -179.4695714341764, y: -323.6257684843936 },
    data: {
        name: "Canvas Doodle",
        icon: "pencil",
        executionState: "completed",
        inputs: [
        {
          id: "value",
          name: "value",
          type: "image",
          description: "value",
          hidden: true,
          value: {
            id: "0197acb7-9bdf-76c8-934f-85f298c49c15",
            mimeType: "image/png",
          },
        },
        {
          id: "width",
          name: "width",
          type: "number",
          description: "width",
          hidden: true,
        },
        {
          id: "height",
          name: "height",
          type: "number",
          description: "height",
          hidden: true,
        },
        {
          id: "strokeColor",
          name: "strokeColor",
          type: "string",
          description: "strokeColor",
          hidden: true,
        },
        {
          id: "strokeWidth",
          name: "strokeWidth",
          type: "number",
          description: "strokeWidth",
          hidden: true,
        },
      ],
      outputs: [
        { id: "image", name: "image", type: "image", description: "image" },
      ],
    },
  },
  {
    id: "uform-gen2-qwen-500m-1750948994683",
    type: "workflowNode",
    position: { x: 84.47390019675802, y: -79.01905703435875 },
    data: {
        name: "UForm Gen2 Qwen 500M",
        icon: "image",
        executionState: "completed",
        inputs: [
        { id: "image", name: "image", type: "image", description: "image" },
        {
          id: "prompt",
          name: "prompt",
          type: "string",
          description: "prompt",
          hidden: true,
        },
        {
          id: "max_tokens",
          name: "max_tokens",
          type: "number",
          description: "max_tokens",
          hidden: true,
        },
        {
          id: "top_p",
          name: "top_p",
          type: "number",
          description: "top_p",
          hidden: true,
        },
        {
          id: "top_k",
          name: "top_k",
          type: "number",
          description: "top_k",
          hidden: true,
        },
        {
          id: "repetition_penalty",
          name: "repetition_penalty",
          type: "number",
          description: "repetition_penalty",
          hidden: true,
        },
      ],
      outputs: [
        {
          id: "description",
          name: "description",
          type: "string",
          description: "description",
        },
      ],
    },
  },
  {
    id: "stable-diffusion-xl-base-1-0-1750949003301",
    type: "workflowNode",
    position: { x: 894.3937777338549, y: -455.22969227837785 },
    data: {
        name: "Stable Diffusion XL Base",
        icon: "image",
        executionState: "completed",
        inputs: [
        { id: "prompt", name: "prompt", type: "string", description: "prompt" },
        {
          id: "negative_prompt",
          name: "negative_prompt",
          type: "string",
          description: "negative_prompt",
          hidden: false,
        },
        {
          id: "width",
          name: "width",
          type: "number",
          description: "width",
          hidden: true,
        },
        {
          id: "height",
          name: "height",
          type: "number",
          description: "height",
          hidden: true,
        },
        {
          id: "num_steps",
          name: "num_steps",
          type: "number",
          description: "num_steps",
          hidden: true,
        },
        {
          id: "guidance",
          name: "guidance",
          type: "number",
          description: "guidance",
          hidden: true,
        },
        {
          id: "seed",
          name: "seed",
          type: "number",
          description: "seed",
          hidden: true,
        },
      ],
      outputs: [
        { id: "image", name: "image", type: "image", description: "image" },
      ],
    },
  },
  {
    id: "single-variable-string-template-1750949013100",
    type: "workflowNode",
    position: { x: 372.2932063530624, y: -477.8462229058754 },
    data: {
        name: "Single Variable String Template",
        icon: "quote",
        executionState: "completed",
        inputs: [
        {
          id: "template",
          name: "template",
          type: "string",
          description: "template",
        },
        {
          id: "variable",
          name: "variable",
          type: "string",
          description: "variable",
        },
      ],
      outputs: [
        { id: "result", name: "result", type: "string", description: "result" },
      ],
    },
  },
  {
    id: "text-area-1750949028851",
    type: "workflowNode",
    position: { x: 74.84288256585423, y: -519.449283356264 },
    data: {
        name: "Text Area",
        icon: "text",
        executionState: "completed",
        inputs: [
        {
          id: "value",
          name: "value",
          type: "string",
          description: "value",
          hidden: true,
          value:
            "cinematic photo ${variable} . 35mm photograph, film, bokeh, professional, 4k, highly detailed",
        },
        {
          id: "placeholder",
          name: "placeholder",
          type: "string",
          description: "placeholder",
          hidden: true,
        },
        {
          id: "rows",
          name: "rows",
          type: "number",
          description: "rows",
          hidden: true,
        },
      ],
      outputs: [
        { id: "value", name: "value", type: "string", description: "value" },
      ],
    },
  },
  {
    id: "text-area-1750949047338",
    type: "workflowNode",
    position: { x: 633.9627748375746, y: -379.8193303419201 },
    data: {
        name: "Text Area",
        icon: "text",
        executionState: "completed",
        inputs: [
        {
          id: "value",
          name: "value",
          type: "string",
          description: "value",
          hidden: true,
          value:
            "drawing, painting, crayon, sketch, graphite, impressionist, noisy, blurry, soft, deformed, ugly",
        },
        {
          id: "placeholder",
          name: "placeholder",
          type: "string",
          description: "placeholder",
          hidden: true,
        },
        {
          id: "rows",
          name: "rows",
          type: "number",
          description: "rows",
          hidden: true,
        },
      ],
      outputs: [
        { id: "value", name: "value", type: "string", description: "value" },
      ],
    },
  },
  {
    id: "melotts-1750949090680",
    type: "workflowNode",
    position: { x: 633.7652315068437, y: 59.99048095410136 },
    data: {
        name: "MeloTTS",
        icon: "mic",
        executionState: "completed",
        inputs: [
        { id: "prompt", name: "prompt", type: "string", description: "prompt" },
        { id: "lang", name: "lang", type: "string", description: "lang" },
      ],
      outputs: [
        { id: "audio", name: "audio", type: "audio", description: "audio" },
      ],
    },
  },
  {
    id: "bart-large-cnn-1750949100668",
    type: "workflowNode",
    position: { x: 372.08548414825697, y: -36.8981771182756 },
    data: {
        name: "BART Large CNN",
        icon: "sparkles",
        executionState: "completed",
        inputs: [
        {
          id: "inputText",
          name: "inputText",
          type: "string",
          description: "inputText",
        },
        {
          id: "maxLength",
          name: "maxLength",
          type: "number",
          description: "maxLength",
          hidden: true,
        },
      ],
      outputs: [
        {
          id: "summary",
          name: "summary",
          type: "string",
          description: "summary",
        },
      ],
    },
  },
  {
    id: "m2m100-1-2b-1750949147154",
    type: "workflowNode",
    position: { x: 890.7351714776828, y: -75.6100661108988 },
    data: {
        name: "M2M100 1.2B",
        icon: "sparkles",
        executionState: "completed",
        inputs: [
        { id: "text", name: "text", type: "string", description: "text" },
        {
          id: "sourceLang",
          name: "sourceLang",
          type: "string",
          description: "sourceLang",
          value: "en",
        },
        {
          id: "targetLang",
          name: "targetLang",
          type: "string",
          description: "targetLang",
          value: "fr",
        },
      ],
      outputs: [
        {
          id: "translatedText",
          name: "translatedText",
          type: "string",
          description: "translatedText",
        },
      ],
    },
  },
];

export const demoEdges: ReactFlowEdge[] = [
  {
    id: "edge-1",
    source: "canvas-doodle-1750948989536",
    target: "uform-gen2-qwen-500m-1750948994683",
    sourceHandle: "image",
    targetHandle: "image",
    type: "workflowEdge",
  },
  {
    id: "edge-2",
    source: "single-variable-string-template-1750949013100",
    target: "stable-diffusion-xl-base-1-0-1750949003301",
    sourceHandle: "result",
    targetHandle: "prompt",
    type: "workflowEdge",
  },
  {
    id: "edge-3",
    source: "uform-gen2-qwen-500m-1750948994683",
    target: "single-variable-string-template-1750949013100",
    sourceHandle: "description",
    targetHandle: "variable",
    type: "workflowEdge",
  },
  {
    id: "edge-4",
    source: "text-area-1750949028851",
    target: "single-variable-string-template-1750949013100",
    sourceHandle: "value",
    targetHandle: "template",
    type: "workflowEdge",
  },
  {
    id: "edge-5",
    source: "text-area-1750949047338",
    target: "stable-diffusion-xl-base-1-0-1750949003301",
    sourceHandle: "value",
    targetHandle: "negative_prompt",
    type: "workflowEdge",
  },
  {
    id: "edge-6",
    source: "uform-gen2-qwen-500m-1750948994683",
    target: "bart-large-cnn-1750949100668",
    sourceHandle: "description",
    targetHandle: "inputText",
    type: "workflowEdge",
  },
  {
    id: "edge-7",
    source: "bart-large-cnn-1750949100668",
    target: "melotts-1750949090680",
    sourceHandle: "summary",
    targetHandle: "prompt",
    type: "workflowEdge",
  },
  {
    id: "edge-8",
    source: "bart-large-cnn-1750949100668",
    target: "m2m100-1-2b-1750949147154",
    sourceHandle: "summary",
    targetHandle: "text",
    type: "workflowEdge",
  },
];

export const demoExecution: WorkflowExecution = {
  id: "61c6a061-669e-42a9-92d9-5d65413f941a",
  workflowId: "0197acb1-39b1-7047-8eb7-d8288d1131f0",
  status: "completed",
  nodeExecutions: [
    {
      nodeId: "canvas-doodle-1750948989536",
      status: "completed",
      outputs: {
        image: {
          id: "0197ad31-bb02-71b9-a5db-32fa2af51f4a",
          mimeType: "image/png",
        },
      },
    },
    {
      nodeId: "uform-gen2-qwen-500m-1750948994683",
      status: "completed",
      outputs: {
        description:
          "A small island with a green palm tree is depicted in the center of the image, surrounded by blue water. Above the island, an orange sun with a yellow center and six rays is drawn, casting a warm glow on the scene. The image is a simple yet captivating depiction of a tropical paradise.",
      },
    },
    {
      nodeId: "stable-diffusion-xl-base-1-0-1750949003301",
      status: "completed",
      outputs: {
        image: {
          id: "0197ad31-f434-776a-8ee3-94fec7cbc4d4",
          mimeType: "image/jpeg",
        },
      },
    },
    {
      nodeId: "single-variable-string-template-1750949013100",
      status: "completed",
      outputs: {
        result:
          "cinematic photo A small island with a green palm tree is depicted in the center of the image, surrounded by blue water. Above the island, an orange sun with a yellow center and six rays is drawn, casting a warm glow on the scene. The image is a simple yet captivating depiction of a tropical paradise. . 35mm photograph, film, bokeh, professional, 4k, highly detailed",
      },
    },
    {
      nodeId: "text-area-1750949028851",
      status: "completed",
      outputs: {
        value:
          "cinematic photo ${variable} . 35mm photograph, film, bokeh, professional, 4k, highly detailed",
      },
    },
    {
      nodeId: "text-area-1750949047338",
      status: "completed",
      outputs: {
        value:
          "drawing, painting, crayon, sketch, graphite, impressionist, noisy, blurry, soft, deformed, ugly",
      },
    },
    {
      nodeId: "melotts-1750949090680",
      status: "completed",
      outputs: {
        audio: {
          id: "0197ad31-ff39-731c-ae5d-1040b03bdc2d",
          mimeType: "audio/mpeg",
        },
      },
    },
    {
      nodeId: "bart-large-cnn-1750949100668",
      status: "completed",
      outputs: {
        summary:
          "A small island with a green palm tree is depicted in the center of the image, surrounded by blue water. Above the island, an orange sun with a yellow center and six rays is drawn, casting a warm glow on the scene.",
      },
    },
    {
      nodeId: "m2m100-1-2b-1750949147154",
      status: "completed",
      outputs: {
        translatedText:
          "Une petite île avec un palmier vert est représentée au centre de l'image, entourée d'eau bleue. Au-dessus de l'île, un soleil orange avec un centre jaune et six rayons est dessiné, jetant une chaleur chaleureuse sur la scène.",
      },
    },
  ],
  startedAt: new Date("2025-06-26T17:03:26.000Z"),
  endedAt: new Date("2025-06-26T17:03:46.000Z"),
};

export const createDemoObjectUrl = (ref: ObjectReference): string => {
  switch (ref.id) {
    case "0197ad31-bb02-71b9-a5db-32fa2af51f4a":
      return "/demo/image2.png";
    case "0197ad31-f434-776a-8ee3-94fec7cbc4d4":
      return "/demo/image1.jpg";
    case "0197ad31-ff39-731c-ae5d-1040b03bdc2d":
      return "/demo/audio.mp3";
    default:
      return "#";
  }
};
