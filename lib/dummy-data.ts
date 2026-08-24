export const heroSlides = [
  {
    key: "idea",
    headline: "Any Idea Becomes A Book",
    title: "Lumo and the Lantern Forest",
    description: "A silver vine, a curious kid, and a forest that only lights up for the brave.",
  },
  {
    key: "cast",
    headline: "Your Whole Cast, Every Page",
    title: "Maya and the Runaway Moon",
    description: "Siblings, pets, grandparents — every character stays recognizable, cover to cover.",
  },
  {
    key: "print",
    headline: "Bedtime Stories, Printed",
    title: "Arjun Meets Hanuman",
    description: "Real trim sizes, real spines — a KDP-ready file in minutes, not weeks.",
  },
  {
    key: "video",
    headline: "One Story, Every Format",
    title: "Pip's First Trial Story",
    description: "Every page voiced, every scene animated — straight from your book.",
  },
] as const;

export const pricingTiers = [
  {
    id: "starter",
    name: "Starter",
    price: "$9.99",
    credits: 60,
    blurb: "For an occasional bedtime story or a one-off gift.",
    features: [
      "60 credits / month",
      "Classic & Immersive formats",
      "Full commercial rights",
      "PDF, PPTX, video & KDP export",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$19.99",
    credits: 130,
    blurb: "For families who make a new story every week.",
    features: [
      "130 credits / month",
      "Everything in Starter",
      "Priority generation queue",
      "50% credit rollover",
    ],
    highlighted: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29.99",
    credits: 210,
    blurb: "For self-publishers producing books regularly.",
    features: ["210 credits / month", "Everything in Growth", "Multi-character scenes at scale"],
  },
  {
    id: "pro_max",
    name: "Pro Max",
    price: "$49.99",
    credits: 360,
    blurb: "For high-volume KDP & Etsy sellers.",
    features: ["360 credits / month", "Everything in Pro", "Best price per credit"],
  },
];

export const topupPacks = [
  { id: "topup-5", price: "$4.99", credits: 25 },
  { id: "topup-10", price: "$9.99", credits: 55 },
  { id: "topup-20", price: "$19.99", credits: 120 },
];

export const storyStyles = [
  "Funny",
  "Adventure",
  "Mythology",
  "Moral",
  "Bedtime",
  "Let AI decide",
] as const;

// Only shown/used when style === "Mythology" — the chosen sub-type is packed
// into the stored `style` value as "Mythology - <sub-type>" so it steers the
// actual Claude prompt (see app/api/generate-story/route.ts), not just the label.
export const mythologySubTypes = ["Bible", "Hindu", "Vedic (Shloka style)"] as const;

export const ageGroups = ["0–3", "4–6", "7–9", "9–12"] as const;

export const pageCountOptions = [
  { count: 6, label: "6 — Free Trial", freeTrial: true },
  { count: 10, label: "10" },
  { count: 15, label: "15" },
  { count: 20, label: "20" },
  { count: 24, label: "24 — KDP Print Minimum" },
  { count: 25, label: "25" },
  { count: 30, label: "30" },
  { count: 40, label: "40" },
  { count: 50, label: "50" },
];

export const artStyles = [
  "Watercolor",
  "Pixar-3D",
  "Anime",
  "Classic storybook",
  "Paper-cut / collage",
  "Crayon",
];

export const settings = ["Village", "City", "Forest", "Space", "Underwater", "Fantasy kingdom"];

export interface DummyBook {
  id: string;
  title: string;
  status: "draft" | "story_generated" | "characters_confirmed" | "generating" | "complete";
  format: "classic" | "immersive";
  pageCount: number;
  ageGroup: string;
  style: string;
  artStyle: string;
  coverColor: string;
  updatedAt: string;
  isFreeTrial: boolean;
}

export const dummyBooks: DummyBook[] = [
  {
    id: "bk_lumo",
    title: "Lumo and the Lantern Forest",
    status: "complete",
    format: "immersive",
    pageCount: 20,
    ageGroup: "4–6",
    style: "Bedtime",
    artStyle: "Watercolor",
    coverColor: "teal",
    updatedAt: "2 days ago",
    isFreeTrial: false,
  },
  {
    id: "bk_maya_moon",
    title: "Maya and the Runaway Moon",
    status: "complete",
    format: "classic",
    pageCount: 15,
    ageGroup: "7–9",
    style: "Adventure",
    artStyle: "Pixar-3D",
    coverColor: "tangerine",
    updatedAt: "1 week ago",
    isFreeTrial: false,
  },
  {
    id: "bk_arjun_hanuman",
    title: "Arjun Meets Hanuman",
    status: "generating",
    format: "immersive",
    pageCount: 24,
    ageGroup: "7–9",
    style: "Mythology",
    artStyle: "Classic storybook",
    coverColor: "green",
    updatedAt: "Just now",
    isFreeTrial: false,
  },
  {
    id: "bk_trial",
    title: "Pip's First Trial Story",
    status: "complete",
    format: "classic",
    pageCount: 6,
    ageGroup: "0–3",
    style: "Funny",
    artStyle: "Crayon",
    coverColor: "lime",
    updatedAt: "3 weeks ago",
    isFreeTrial: true,
  },
];

export interface DummyCharacter {
  id: string;
  name: string;
  type: "human" | "non_human";
  description: string;
  color: string;
}

export const dummyCharacters: DummyCharacter[] = [
  {
    id: "ch_maya",
    name: "Maya",
    type: "human",
    description: "7 years old, curly black hair in two puffs, bright yellow raincoat, loves asking \"why?\"",
    color: "tangerine",
  },
  {
    id: "ch_pip",
    name: "Pip",
    type: "non_human",
    description: "A small round robot with a torch-light nose and a habit of beeping when excited",
    color: "teal",
  },
  {
    id: "ch_nana",
    name: "Nana Rose",
    type: "human",
    description: "Grandmother, silver bun, round glasses, cardigan with a sunflower pin",
    color: "green",
  },
];

export interface StoryRow {
  page: number;
  narration: string;
  imageDescription: string;
  characters: string[];
  setting: string;
  multiCharacter: boolean;
}

export const dummyStoryTable: StoryRow[] = [
  {
    page: 1,
    narration: "Maya found a strange glowing seed on the windowsill, humming a tune only she could hear.",
    imageDescription: "Maya leaning over a windowsill at dawn, a small glowing seed in her palm.",
    characters: ["Maya"],
    setting: "Village",
    multiCharacter: false,
  },
  {
    page: 2,
    narration: "She planted it in the garden, and by morning a silver vine curled all the way to the clouds.",
    imageDescription: "A silver vine spiraling up past rooftops into a pink morning sky.",
    characters: ["Maya"],
    setting: "Village",
    multiCharacter: false,
  },
  {
    page: 3,
    narration: "\"Well, someone's not going to school today,\" said Pip, beeping excitedly by her side.",
    imageDescription: "Maya and Pip the robot standing together at the base of the vine, looking up.",
    characters: ["Maya", "Pip"],
    setting: "Village",
    multiCharacter: true,
  },
  {
    page: 4,
    narration: "Up they climbed, past sleepy clouds shaped like teacups and sheep.",
    imageDescription: "Maya climbing the vine with Pip floating alongside, clouds shaped like teacups nearby.",
    characters: ["Maya", "Pip"],
    setting: "Sky",
    multiCharacter: true,
  },
  {
    page: 5,
    narration: "At the top, Nana Rose was waiting with a pot of tea, as if she'd expected them all along.",
    imageDescription: "Nana Rose sitting at a small floating tea table on a cloud, smiling warmly.",
    characters: ["Nana Rose"],
    setting: "Sky",
    multiCharacter: false,
  },
];

export const coverStyles = [
  { id: "single", label: "Single Image", desc: "One illustration spans the front; back is a matching color." },
  { id: "separate", label: "Separate Front & Back", desc: "Two distinct illustrations, one per side." },
];

export const titlePlacements = ["Top-third banner", "Centered overlay", "Bottom ribbon"];

export const exportOptions = [
  { id: "pdf", label: "PDF", desc: "Print-friendly, any format.", always: true },
  { id: "pptx", label: "PPTX", desc: "Editable slide format.", always: true },
  { id: "video_narrated", label: "Narrated video", desc: "Immersive only. Every page voiced.", immersiveOnly: true },
  { id: "video_silent", label: "Silent video", desc: "Immersive only. Music, no narration.", immersiveOnly: true },
  { id: "audiobook", label: "Audiobook", desc: "Every page's narration, stitched into one listen.", always: true },
  { id: "kdp", label: "KDP print file", desc: "Requires 15+ pages. Trim, spine & barcode-ready.", minPages: 15 },
  { id: "etsy", label: "Etsy digital PDF", desc: "Same interior, no KDP padding.", always: true },
];