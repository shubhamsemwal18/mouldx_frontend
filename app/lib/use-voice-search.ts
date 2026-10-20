"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal shape of the Web Speech API we rely on. It is still vendor-prefixed
 * in Chrome and absent in several browsers, so every use is capability-gated.
 */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
  if (typeof window === "undefined") return null;

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

export type VoiceSearchError = "unsupported" | "denied" | "failed" | null;

/**
 * Dictation for the search inputs. Interim results stream into `onTranscript`
 * so the field fills as the user speaks; `onFinal` fires once when they stop.
 */
export function useVoiceSearch({
  onTranscript,
  onFinal,
  lang = "en-IN",
}: {
  onTranscript: (text: string) => void;
  onFinal?: (text: string) => void;
  lang?: string;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<VoiceSearchError>(null);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Held in refs so restarting recognition never needs a stale closure.
  const transcriptRef = useRef(onTranscript);
  const finalRef = useRef(onFinal);

  // Keep the latest callbacks reachable without restarting recognition.
  // Written in an effect, never during render.
  useEffect(() => {
    transcriptRef.current = onTranscript;
    finalRef.current = onFinal;
  }, [onTranscript, onFinal]);

  // Feature detection has to run on the client, after mount.
  useEffect(() => {
    const timer = window.setTimeout(() => setSupported(Boolean(getRecognitionCtor())), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();

    if (!Ctor) {
      setError("unsupported");
      return;
    }

    // Starting twice throws; always tear the previous session down first.
    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    let lastTranscript = "";

    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0]?.transcript ?? "";
      }

      lastTranscript = text.trim();
      transcriptRef.current(lastTranscript);
    };

    recognition.onerror = (event) => {
      setError(event?.error === "not-allowed" ? "denied" : "failed");
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (lastTranscript) finalRef.current?.(lastTranscript);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setError(null);
      setListening(true);
    } catch {
      setError("failed");
      setListening(false);
    }
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  // Never leave the microphone open behind a closed sheet.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { listening, supported, error, start, stop, toggle };
}
