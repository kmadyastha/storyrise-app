import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { NARRATOR_VOICES, DEFAULT_VOICE } from "@/lib/voices";

// Not book-length text — a short fixed line is plenty to judge a voice by.
export const maxDuration = 30;

const SAMPLE_PHRASE = "Hi there! I'm the storyteller who'll be reading your book.";

export async function POST(request: Request) {
  const { voice } = await request.json().catch(() => ({}));

  if (!process.env.GOOGLE_TTS_CREDENTIALS) {
    return NextResponse.json({ error: "GOOGLE_TTS_CREDENTIALS is not set on the server" }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // This is free to the user (no credit charge — it's a short fixed
  // sample, not real narration), but it's still a real Google TTS call
  // that costs something, so it still needs its own rate limit to prevent
  // abuse from turning into a real cost.
  const rate = await checkRateLimit(user.id, "preview-voice");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  const voiceName = NARRATOR_VOICES.some((v) => v.id === voice) ? voice : DEFAULT_VOICE;

  try {
    const credentials = JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS);
    const client = new textToSpeech.TextToSpeechClient({ credentials });

    const [response] = await client.synthesizeSpeech({
      input: { text: SAMPLE_PHRASE },
      voice: { languageCode: "en-US", name: voiceName },
      audioConfig: { audioEncoding: "MP3" },
    });

    if (!response.audioContent) {
      throw new Error("Google TTS didn't return audio content");
    }

    const bytes = new Uint8Array(response.audioContent as Uint8Array);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(bytes.length),
        // Never persisted anywhere — safe to cache briefly client-side, but
        // not something to store or treat as a real asset.
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't generate a voice preview";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}