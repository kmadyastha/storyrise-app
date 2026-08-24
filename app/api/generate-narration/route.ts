import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_VOICE } from "@/lib/voices";
import { precheckCredits, chargeCredits } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateAIInput, ValidationError, MAX_LENGTHS } from "@/lib/validation";

export async function POST(request: Request) {
  const { pageId, voice } = await request.json();

  if (!pageId) {
    return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
  }

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

  const rate = await checkRateLimit(user.id, "generate-narration");
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  const { data: page, error: pageError } = await supabase
    .from("story_pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (pageError || !page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  try {
    validateAIInput(page.narration, "Narration text", MAX_LENGTHS.narration);
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const { data: book } = await supabase.from("books").select("is_free_trial").eq("id", page.book_id).single();
  const isFreeTrial = book?.is_free_trial ?? false;

  const precheck = await precheckCredits(user.id, "narration", isFreeTrial);
  if (!precheck.allowed) {
    return NextResponse.json({ error: precheck.reason }, { status: 402 });
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

  await chargeCredits(user.id, page.book_id, "narration", isFreeTrial);

  return NextResponse.json({ audioUrl });
}