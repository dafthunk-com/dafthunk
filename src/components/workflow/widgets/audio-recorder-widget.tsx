import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Mic, Square, Trash2 } from "lucide-react";

interface AudioRecorderConfig {
  value: string;
  sampleRate: number;
  channels: number;
}

interface AudioRecorderWidgetProps {
  config: AudioRecorderConfig;
  onChange: (value: string) => void;
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

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

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const base64String = base64Data.split(",")[1];
          setAudioUrl(base64Data);
          onChange(
            JSON.stringify({
              value: base64String,
              sampleRate: config.sampleRate,
              channels: config.channels,
            })
          );
        };
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
    setAudioUrl(null);
    onChange(
      JSON.stringify({
        value: "",
        sampleRate: config.sampleRate,
        channels: config.channels,
      })
    );
  };

  return (
    <div className="space-y-2">
      {!compact && <Label>Audio Recorder</Label>}
      <div className="relative w-full mx-auto">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {audioUrl ? (
            <button
              onClick={clearRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Clear recording"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          ) : isRecording ? (
            <button
              onClick={stopRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-red-600 hover:text-red-900 transition-colors"
              aria-label="Stop recording"
            >
              <Square className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/90 hover:bg-white text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Start recording"
            >
              <Mic className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="relative h-24 bg-gray-100">
            {audioUrl ? (
              <audio src={audioUrl} controls className="w-full h-full" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {isRecording ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-sm">Recording...</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">
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
          </div>
        </div>
      </div>
    </div>
  );
}
