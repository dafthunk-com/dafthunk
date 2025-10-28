import Mic from "lucide-react/icons/mic";
import Square from "lucide-react/icons/square";
import Trash2 from "lucide-react/icons/trash-2";
import { useEffect, useRef, useState } from "react";

import { isObjectReference, useObjectService } from "@/services/object-service";

import type { BaseWidgetProps } from "./widget";
import { createWidget, getInputValue } from "./widget";

interface AudioRecorderWidgetProps extends BaseWidgetProps {
  value: any;
  sampleRate: number;
  channels: number;
}

function AudioRecorderWidget({
  value,
  onChange,
  readonly = false,
}: AudioRecorderWidgetProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioReference, setAudioReference] = useState<{
    id: string;
    mimeType: string;
  } | null>(value && isObjectReference(value) ? value : null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const { uploadBinaryData, createObjectUrl } = useObjectService();

  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    if (readonly) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setIsUploading(true);

          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          const arrayBuffer = await audioBlob.arrayBuffer();
          const reference = await uploadBinaryData(arrayBuffer, "audio/webm");

          setAudioReference(reference);
          onChange(reference);

          setIsUploading(false);
          setError(null);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to upload audio"
          );
          setIsUploading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to access microphone"
      );
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const clearRecording = () => {
    if (readonly) return;
    setAudioReference(null);
    onChange(null);
  };

  return (
    <div className="p-2">
      <div className="relative w-full">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {audioReference ? (
            <button
              onClick={clearRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-neutral-600"
              aria-label="Clear recording"
              disabled={isUploading || readonly}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          ) : isRecording ? (
            <button
              onClick={stopRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-red-600"
              aria-label="Stop recording"
              disabled={isUploading || readonly}
            >
              <Square className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-neutral-600"
              aria-label="Start recording"
              disabled={isUploading || readonly}
            >
              <Mic className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="overflow-hidden bg-white">
          <div className="relative h-24 bg-neutral-100">
            {audioReference ? (
              <audio
                src={createObjectUrl(audioReference)}
                controls
                className="w-full h-full"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {isRecording ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-xs">Recording...</span>
                  </div>
                ) : (
                  <span className="text-xs text-neutral-500">
                    Click to start recording
                  </span>
                )}
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-xs">
                {error}
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                Uploading...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const audioRecorderWidget = createWidget({
  component: AudioRecorderWidget,
  nodeTypes: ["audio-recorder"],
  inputField: "value",
  extractConfig: (_nodeId, inputs) => ({
    value: getInputValue(inputs, "value", ""),
    sampleRate: getInputValue(inputs, "sampleRate", 44100),
    channels: getInputValue(inputs, "channels", 1),
  }),
});
