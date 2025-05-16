import { Mic, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Label } from "@/components/ui/label";
import { isObjectReference, useObjectService } from "@/services/object-service";

interface AudioRecorderConfig {
  value: any; // Now stores an object reference
}

interface AudioRecorderWidgetProps {
  config: AudioRecorderConfig;
  onChange: (value: any) => void;
  compact?: boolean;
}

export function AudioRecorderWidget({
  config,
  onChange,
  compact = false,
}: AudioRecorderWidgetProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioReference, setAudioReference] = useState<{
    id: string;
    mimeType: string;
  } | null>(
    config?.value && isObjectReference(config.value) ? config.value : null
  );
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

          // Convert blob to array buffer
          const arrayBuffer = await audioBlob.arrayBuffer();

          // Upload to objects endpoint
          const reference = await uploadBinaryData(arrayBuffer, "audio/webm");

          // Update state and pass the reference to parent
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
    setAudioReference(null);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>Audio Recorder</Label>}
      <div className="relative w-full mx-auto">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {audioReference ? (
            <button
              onClick={clearRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-neutral-600 hover:text-neutral-900 transition-colors"
              aria-label="Clear recording"
              disabled={isUploading}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          ) : isRecording ? (
            <button
              onClick={stopRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-red-600 hover:text-red-900 transition-colors"
              aria-label="Stop recording"
              disabled={isUploading}
            >
              <Square className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-neutral-600 hover:text-neutral-900 transition-colors"
              aria-label="Start recording"
              disabled={isUploading}
            >
              <Mic className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
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
                    <span className="text-sm">Recording...</span>
                  </div>
                ) : (
                  <span className="text-sm text-neutral-500">
                    Click to start recording
                  </span>
                )}
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-sm">
                {error}
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                <span>Uploading...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
