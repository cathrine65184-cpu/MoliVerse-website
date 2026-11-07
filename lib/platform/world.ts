export type Asset = {
  id: string;
  name: string;
  category: string;
  source: "official" | "upload" | "generated";
  icon: string | null;
  collectible: boolean;
  thumb?: string;
};
export const official: Asset[] = [
  ["shop", "Little bakery", "Buildings", "🏠"],
  ["tree", "Pear tree", "Nature", "🌳"],
  ["moli", "Moli", "Characters", "moli"],
  ["chair", "Reading chair", "Furniture", "🪑"],
  ["bread", "Fresh bread", "Food", "🥖"],
  ["book", "Storybook", "Objects", "📖"],
  ["stars", "Paper stars", "Decorations", "✨"],
  ["valley", "Campus window", "Backgrounds", "valley"],
  ["apple-basket", "Apple basket", "Learning Collectibles", "🍎"],
  ["table", "Tea table", "Furniture", "table"],
  ["bed", "Little bed", "Furniture", "bed"],
  ["lamp", "Warm lamp", "Decorations", "lamp"],
  ["bookshelf", "Bookshelf", "Furniture", "bookshelf"],
  ["rug", "Flower rug", "Decorations", "rug"],
  ["desk", "Writing desk", "Furniture", "desk"],
  ["plant", "Leafy plant", "Nature", "plant"],
  ["cabinet", "Flower wardrobe", "Furniture", "cabinet"],
  ["chest", "Treasure chest", "Furniture", "chest"],
  ["mirror", "Little mirror", "Decorations", "mirror"],
  ["clock", "Flower clock", "Decorations", "clock"],
  ["cushions", "Soft cushions", "Decorations", "cushions"],
  ["armchair", "Cosy armchair", "Furniture", "armchair"],
  ["apple", "Apple", "Fruits", "🍎"],
  ["strawberry", "Strawberry", "Fruits", "🍓"],
  ["banana", "Banana", "Fruits", "🍌"],
  ["orange", "Orange", "Fruits", "🍊"],
  ["cat", "Little cat", "Animals", "🐈"],
  ["dog", "Little dog", "Animals", "🐕"],
  ["rabbit", "Rabbit", "Animals", "🐇"],
  ["bird", "Blue bird", "Animals", "🐦"],
].map(([id, name, category, icon]) => ({
  id,
  name,
  category,
  icon,
  source: "official",
  collectible: id === "apple-basket",
}));
export type Placed = { id: string; asset: string; x: number; y: number; size: number; angle: number };
export function starterScene():Placed[]{return [
 {id:"starter-rug",asset:"rug",x:55,y:81,size:38,angle:0},
 {id:"starter-bookshelf",asset:"bookshelf",x:22,y:51,size:27,angle:0},
 {id:"starter-lamp",asset:"lamp",x:78,y:47,size:22,angle:0},
 {id:"starter-table",asset:"table",x:65,y:71,size:25,angle:0},
 {id:"starter-chair",asset:"chair",x:43,y:69,size:21,angle:0},
 {id:"starter-moli",asset:"moli",x:84,y:81,size:14,angle:0}
];}
export const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function validScene(v: unknown, assets: Asset[]): v is Placed[] {
  if (!Array.isArray(v) || v.length > 60 || new Set(v.map((o) => o?.id)).size !== v.length) return false;
  return v.every((o) =>
    o && typeof o.id === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(o.id) && assets.some((a) =>
      a.id === o.asset
    ) && Number.isFinite(o.x) && o.x >= 0 && o.x <= 100 && Number.isFinite(o.y) && o.y >= 0 && o.y <= 100 &&
    Number.isFinite(o.size) && o.size >= 6 && o.size <= 50 && Number.isFinite(o.angle) &&
    Math.abs(o.angle) <= 180
  );
}
export const orders = [
  {
    question: "Someone asks for une pomme. Which fruit goes in the basket?",
    options: [["pear", "🍐 Pear"], ["apple", "🍎 Apple"], ["banana", "🍌 Banana"]],
  },
  {
    question: "Which French label belongs on the apples?",
    options: [["pain", "du pain"], ["pomme", "une pomme"], ["lait", "du lait"]],
  },
  {
    question: "Fill the order: Une pomme, s’il vous plaît !",
    options: [["bread", "🥖"], ["milk", "🥛"], ["apple", "🍎"]],
  },
];
export type Metadata = {
  type: string;
  title: string;
  description: string;
  language: string;
  subject: string;
  age: string;
  objectives: string;
  duration: string;
  instructions: string;
  attribution: string;
  rights: string;
  link: string;
};
export const freshMeta = (): Metadata => ({
  type: "PDF",
  title: "",
  description: "",
  language: "",
  subject: "",
  age: "",
  objectives: "",
  duration: "",
  instructions: "",
  attribution: "",
  rights: "",
  link: "",
});
export const metaFields = [
  "title",
  "description",
  "language",
  "subject",
  "age",
  "objectives",
  "duration",
  "instructions",
  "attribution",
  "rights",
] as const;
export type Submission = {
  id: string;
  owner_id: string;
  meta: Metadata;
  file_id: string | null;
  status: string;
  revision: number;
};
export type Creator = {
  id: string;
  kind: string;
  name: string;
  bio: string;
  languages: string;
  interests: string;
  status: string;
};
