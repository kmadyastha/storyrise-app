import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import { createClient } from "@/lib/supabase/server";

// A small curated set — shown to the user as a picker before export,
// rather than exposing the full raw list of Google voice IDs.
export const NARRATOR_VOICES = [
  { id: "en-US-Neural2-F", label: "Warm Narrator (female)" },
  { id: "en-US-Neural2-D", label: "Warm Narrator (male)" },
  { id: "en-US-Neural2-C", label: "Cheerful (female)" },
  { id: "en-US-Neural2-J", label: "Gentle Bedtime Voice (male)" },
] as const;

const DEFAULT_VOICE = NARRATOR_VOICES[0].id;

export async function POST(request: Request) {
  const { pageId, voice } = await request.json();

  if (!pageId) {
    return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
  }

  if (!process.env.GOOGLE_TTS_CREDENTIALS) {
    return NextResponse.json({ error: "GOOGLE_TTS_CREDENTIALS is not set on the server" }, { status: 500 });
  }

  const supabase = await createClient();

  const { data: page, error: pageError } = await supabase
    .from("story_pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  let audioUrl: string;
  try {
    const credentials = JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS);
    const client = new textToSpeech.TextToSpeechClient({ credentials });

    const [response] = await client.synthesizeSpeech({
      input: { text: page.narration },
      voice: { languageCode: "en-US", name: voice || DEFAULT_VOICE },
      audioConfig: { audioEncoding: "MP3" },
    });

    if (!response.audioContent) {
      throw new Error("Google TTS didn't return audio content");
    }

    const bytes = Buffer.from(response.audioContent as Uint8Array);
    const path = `narration/${pageId}.mp3`;

    const { error: uploadError } = await supabase.storage.from("book-assets").upload(path, bytes, {
      contentType: "audio/mpeg",
      upsert: true,
    });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("book-assets").getPublicUrl(path);
    audioUrl = urlData.publicUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Narration generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { error: updateError } = await supabase.from("story_pages").update({ audio_url: audioUrl }).eq("id", pageId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ audioUrl });
}