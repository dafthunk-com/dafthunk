import { AudioRecorderInputNode } from "@dafthunk/runtime/nodes/input/audio-recorder-input-node";
import { TextOutputNode } from "@dafthunk/runtime/nodes/output/text-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

import { createCloudflareModelNode } from "./cloudflare-model-template";

export const speechToTextTemplate: WorkflowTemplate = {
  id: "speech-to-text",
  name: "Speech to Text",
  description: "Record audio and transcribe it to text",
  icon: "mic",
  trigger: "manual",
  tags: ["audio", "ai"],
  nodes: [
    AudioRecorderInputNode.create({
      id: "audio-recorder",
      name: "Audio Recorder",
      position: { x: 100, y: 100 },
    }),
    createCloudflareModelNode({
      id: "transcriber",
      name: "Transcriber",
      position: { x: 500, y: 100 },
      model: "@cf/openai/whisper",
      meta: {
        description:
          "Whisper is a general-purpose speech recognition model. It is trained on a large dataset of diverse audio and is also a multitasking model that can perform multilingual speech recognition, speech translation, and language identification.",
        taskName: "Automatic Speech Recognition",
      },
      inputs: [
        {
          name: "audio",
          type: "audio",
          description: "Audio file to transcribe",
          required: true,
        },
      ],
      outputs: [
        {
          name: "text",
          type: "string",
          description: "Transcribed text",
        },
        {
          name: "word_count",
          type: "number",
          description: "Number of words in the transcription",
          hidden: true,
        },
        {
          name: "words",
          type: "json",
          description: "Per-word timing information",
          hidden: true,
        },
        {
          name: "vtt",
          type: "string",
          description: "WebVTT-formatted transcription",
          hidden: true,
        },
      ],
    }),
    TextOutputNode.create({
      id: "transcription-preview",
      name: "Transcription",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "audio-recorder",
      target: "transcriber",
      sourceOutput: "audio",
      targetInput: "audio",
    },
    {
      source: "transcriber",
      target: "transcription-preview",
      sourceOutput: "text",
      targetInput: "value",
    },
  ],
};
