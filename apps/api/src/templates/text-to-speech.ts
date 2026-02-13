import { MelottsNode } from "@dafthunk/runtime/nodes/audio/melotts-node";
import { TextInputNode } from "@dafthunk/runtime/nodes/input/text-input-node";
import { AudioOutputNode } from "@dafthunk/runtime/nodes/output/audio-output-node";
import type { WorkflowTemplate } from "@dafthunk/types";

export const textToSpeechTemplate: WorkflowTemplate = {
  id: "text-to-speech",
  name: "Text to Speech",
  description: "Convert text to natural-sounding speech",
  icon: "mic",
  trigger: "manual",
  tags: ["audio", "ai"],
  nodes: [
    TextInputNode.create({
      id: "text-to-speak",
      name: "Text to Speak",
      position: { x: 100, y: 100 },
      inputs: {
        value:
          "Hello! This is a text-to-speech demonstration. You can type any text here and it will be converted to natural-sounding speech.",
        placeholder: "Enter text to convert to speech...",
        rows: 4,
      },
    }),
    MelottsNode.create({
      id: "speech-generator",
      name: "Speech Generator",
      position: { x: 500, y: 100 },
    }),
    AudioOutputNode.create({
      id: "audio-preview",
      name: "Audio",
      position: { x: 900, y: 100 },
    }),
  ],
  edges: [
    {
      source: "text-to-speak",
      target: "speech-generator",
      sourceOutput: "value",
      targetInput: "prompt",
    },
    {
      source: "speech-generator",
      target: "audio-preview",
      sourceOutput: "audio",
      targetInput: "value",
    },
  ],
};
