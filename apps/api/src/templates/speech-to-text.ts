import type { WorkflowTemplate } from "@dafthunk/types";

import { WhisperNode } from "../nodes/audio/whisper-node";
import { AudioRecorderInputNode } from "../nodes/input/audio-recorder-input-node";
import { TextOutputNode } from "../nodes/output/text-output-node";

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
    WhisperNode.create({
      id: "transcriber",
      name: "Transcriber",
      position: { x: 500, y: 100 },
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
