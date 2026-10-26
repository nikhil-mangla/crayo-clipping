#!/usr/bin/env python3
"""
Local Whisper transcription script for ClipForge AI
Uses faster-whisper with cached models on Apple Silicon / CPU
"""
import sys
import os
import json
import logging

# Suppress verbose warnings
logging.basicConfig(level=logging.ERROR)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing audio file path argument"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    language = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "auto" else None

    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found at {audio_path}"}))
        sys.exit(1)

    try:
        from faster_whisper import WhisperModel

        # Use base model for fast, accurate word timestamps
        # Apple Silicon / CPU int8 quantization
        model = WhisperModel("base", device="cpu", compute_type="int8")

        segments_iter, info = model.transcribe(
            audio_path,
            language=language,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        segments = []
        all_words = []
        seg_id = 1

        for seg in segments_iter:
            words = []
            if seg.words:
                for w in seg.words:
                    word_obj = {
                        "word": w.word.strip(),
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "confidence": round(w.probability, 2) if hasattr(w, "probability") else 1.0
                    }
                    if word_obj["word"]:
                        words.append(word_obj)
                        all_words.append(word_obj)

            text_clean = seg.text.strip()
            if text_clean:
                segments.append({
                    "id": seg_id,
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": text_clean,
                    "words": words
                })
                seg_id += 1

        full_text = " ".join(s["text"] for s in segments)

        result = {
            "text": full_text,
            "segments": segments,
            "words": all_words,
            "duration": round(info.duration, 2),
            "language": info.language,
            "provider": "faster_whisper",
            "isFallback": False
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
