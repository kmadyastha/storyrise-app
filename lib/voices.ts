export const NARRATOR_VOICES = [
  { id: "en-US-Neural2-F", label: "Warm Narrator (female)" },
  { id: "en-US-Neural2-D", label: "Warm Narrator (male)" },
  { id: "en-US-Neural2-C", label: "Cheerful (female)" },
  { id: "en-US-Neural2-J", label: "Gentle Bedtime Voice (male)" },
] as const;

export const DEFAULT_VOICE = NARRATOR_VOICES[0].id;