/** Editorial content, not live reporting. Add reviewed issues here, not in the view. */
export type WeeklyIssue = {
  slug: string;
  number: string;
  title: string;
  subtitle: string;
  status: "editorial-preview";
  language: string;
  reading: string;
  sections: {label: string; title: string; paragraphs: string[]; source?: string}[];
  words: {word: string; meaning: string}[];
  questions: string[];
  sources: {id: string; title: string; url: string; note: string}[];
};

export const WEEKLY_ISSUES: WeeklyIssue[] = [{
  slug: "peace-in-ukraine",
  number: "01",
  title: "What “Peace” in Ukraine Might Look Like",
  subtitle: "A gentle conversation about stopping fighting, caring for people and asking thoughtful questions.",
  status: "editorial-preview",
  language: "English",
  reading: "Read together with a parent or educator",
  sections: [
    {label: "A letter to our readers", title: "Hi, children.", paragraphs: [
      "When you hear the word peace, what comes to mind? Perhaps a quiet walk to school, playing with a friend, or knowing that the people you love are safe.",
      "This week’s question is about Ukraine. We are not predicting when the war will end or where a boundary might be drawn. Instead, let’s explore some words people use when they talk about peace. You can pause or choose another activity whenever you want."
    ]},
    {label: "A word we can explain", title: "A ceasefire means an agreement to stop fighting.", source: "un-glossary", paragraphs: [
      "A ceasefire can give people space to talk. But stopping fighting and reaching a lasting political agreement are not the same thing. There may still be difficult questions to work through.",
      "A humanitarian pause is different: it is a temporary break for helping people, in an agreed place and time. A headline about a pause does not by itself mean that a war is over."
    ]},
    {label: "An idea, not a prediction", title: "What about a buffer zone?", paragraphs: [
      "The article that inspired this issue discusses a possible demilitarized zone, or DMZ: an area where an agreement would limit military forces or activity. That is one proposed idea, not a promise about Ukraine’s future.",
      "We do not know whether such a zone will be agreed, where it would be, or how it would work. Before sharing a claim, ask: Is this an agreement that has happened, a proposal, or someone’s prediction?"
    ]},
    {label: "Think beyond the map", title: "Peace is also about everyday life.", paragraphs: [
      "Imagine a child returning to their neighbourhood after fighting has stopped. What might they want to feel safe again? A home, a school, clean water, time with friends — and adults who listen.",
      "Stopping fighting matters. So does what happens afterwards. As readers, we can ask whose voices are missing from a story and how a proposal might affect the people who live there. No child is responsible for solving a war."
    ]}
  ],
  words: [
    {word: "peace", meaning: "Living without war; working towards safety and care."},
    {word: "ceasefire", meaning: "An agreement between fighting sides to stop fighting."},
    {word: "civilian", meaning: "Someone who is not a member of the armed forces."},
    {word: "proposal", meaning: "An idea offered for people to consider."},
    {word: "prediction", meaning: "A thought about what might happen, not a certainty."},
    {word: "rebuild", meaning: "To build or repair something again."}
  ],
  questions: [
    "How is ‘might happen’ different from ‘has happened’?",
    "Whom would you want to listen to before deciding whether a peace plan helps people?",
    "Draw a place where people feel welcome and safe. What would you put in it?"
  ],
  sources: [
    {id: "un-glossary", title: "United Nations in Ukraine: Glossary of humanitarian terms", url: "https://ukraine.un.org/en/174777-glossary-humanitarian-terms-pauses-during-conflict", note: "14 March 2022 · Background definitions, not a current ceasefire announcement."},
    {id: "unicef-guidance", title: "UNICEF: Talking to children about conflict and war", url: "https://www.unicef.org/eca/how-talk-your-children-about-conflict-and-war", note: "Guidance for adults on calm, age-appropriate conversations."}
  ]
}];

export function weeklyIssue(slug: string) {
  return WEEKLY_ISSUES.find(issue => issue.slug === slug);
}
