/**
 * Pre-generated lessons — authored by DeepSeek reading each course's title
 * and description, then normalized to the LessonStep schema. This is the
 * "AI understands the courseware and writes the lesson" path, generated
 * offline (the API key never ships to the browser). New courses fall back
 * to the rule-based buildLessonFromCourse until regenerated.
 */

import type { LessonStep } from "./lessonEngine";

export const generatedLessons: Record<string, LessonStep[]> =
{
  "4d6be320-523a-44e9-ab7c-a67877bae36a": [
    {
      "t": "intro",
      "scene": "夜晚 星空",
      "costume": "astronaut",
      "say": "Hello, my little star! Tonight we'll visit the Little Prince and learn some feeling words. Are you ready?",
      "title": "Goodnight, Little Prince",
      "sub": "Let's say goodnight to the Little Prince together."
    },
    {
      "t": "card",
      "scene": "夜晚 月亮",
      "costume": "astronaut",
      "say": "Look! The moon is shining. Can you say 'moon'? M-O-O-N. Good job!",
      "emoji": "🌙",
      "word": "moon",
      "action": "Point to the sky and whisper 'moon'.",
      "move": false
    },
    {
      "t": "card",
      "scene": "沙漠 夜晚",
      "costume": "explorer",
      "say": "The Little Prince feels lonely on his planet. Lonely means you want a friend. Hug yourself and say 'lonely'.",
      "emoji": "🤗",
      "word": "lonely",
      "action": "Hug yourself and look down sadly.",
      "move": true
    },
    {
      "t": "move",
      "scene": "星空 萤火虫",
      "costume": "astronaut",
      "say": "Stand up and twinkle your fingers like stars all around. Twinkle, twinkle!",
      "emoji": "🌟",
      "prompt": "Let's twinkle like stars!"
    },
    {
      "t": "card",
      "scene": "森林 月亮",
      "costume": "ranger",
      "say": "The fox is curious. Curious means you want to know more. Tilt your head and look curious! Say 'curious'.",
      "emoji": "🦊",
      "word": "curious",
      "action": "Tilt head, raise eyebrows, look around with wonder.",
      "move": true
    },
    {
      "t": "quiz",
      "scene": "沙漠 夜晚",
      "costume": "explorer",
      "say": "Listen carefully: which word means you feel like you want a friend?",
      "question": "Which word means you want a friend?",
      "options": [
        {
          "label": "lonely",
          "correct": true
        },
        {
          "label": "curious",
          "correct": false
        },
        {
          "label": "kind",
          "correct": false
        }
      ]
    },
    {
      "t": "card",
      "scene": "城堡 黄昏",
      "costume": "storyteller",
      "say": "The Little Prince is kind to his rose. Kind means you are nice and gentle. Put your hand on your heart and say 'kind'.",
      "emoji": "🌹",
      "word": "kind",
      "action": "Smile softly and make a gentle gesture with hand over heart.",
      "move": false
    },
    {
      "t": "move",
      "scene": "森林 晴天",
      "costume": "ranger",
      "say": "Let's pretend to be kind animals. Walk slowly and gently like a kind lion. Roar softly!",
      "emoji": "🦁",
      "prompt": "Let's be kind and brave!"
    },
    {
      "t": "quiz",
      "scene": "星空 萤火虫",
      "costume": "astronaut",
      "say": "One more question: which word means you want to know more?",
      "question": "Which word means you want to learn something new?",
      "options": [
        {
          "label": "lonely",
          "correct": false
        },
        {
          "label": "curious",
          "correct": true
        },
        {
          "label": "kind",
          "correct": false
        }
      ]
    },
    {
      "t": "card",
      "scene": "沙漠 黄昏",
      "costume": "explorer",
      "say": "The Little Prince makes a friend with the fox. Friend is someone you love. Reach out your hand and say 'friend'.",
      "emoji": "🤝",
      "word": "friend",
      "action": "Reach out hand like shaking hands, smile.",
      "move": false
    },
    {
      "t": "move",
      "scene": "星空 夜晚",
      "costume": "astronaut",
      "say": "Close your eyes, make a wish on a star. Then open your eyes and blow a kiss to the sky. Wonderful!",
      "emoji": "💫",
      "prompt": "Let's make a wish!"
    },
    {
      "t": "finale",
      "scene": "夜晚 月亮",
      "costume": "astronaut",
      "say": "You did an amazing job tonight! You learned moon, lonely, curious, kind, and friend. Sleep tight, little star. Goodnight!"
    }
  ],
  "f15af2ba-b75e-4440-9a63-b5514d031aa9": [
    {
      "t": "intro",
      "title": "Letter World: Love in Letters",
      "sub": "A five-part English story journey with Catherine",
      "say": "Hello, little letter keeper. I’m Catherine. Today we enter Letter World, where every kind word can travel far. We will read a story, learn gentle English, and write a small letter of our own.",
      "scene": "城市 夕阳 星星",
      "costume": "storyteller"
    },
    {
      "t": "card",
      "word": "farewell",
      "emoji": "💌",
      "action": "Place one hand on your heart and wave a calm goodbye.",
      "move": true,
      "say": "Part one: A quiet farewell. In our original Letter World story, young letter keeper Elia hears a phrase she does not understand: ‘I care about you.’ A farewell can feel sad, confusing, or empty. Say it softly with me: farewell.",
      "scene": "夜晚 城市 星星",
      "costume": "storyteller"
    },
    {
      "t": "card",
      "word": "Dear …,",
      "emoji": "✉️",
      "action": "Pretend to open a letter slowly.",
      "move": false,
      "say": "Part two: A new beginning. Elia joins the Letter House and learns that a letter can hold words that feel shy in our mouths. Every letter can begin with two warm words: Dear, then the person’s name. Say: Dear Grandma.",
      "scene": "城市 晴天 太阳",
      "costume": "storyteller"
    },
    {
      "t": "quiz",
      "question": "Which beginning belongs at the top of a kind letter?",
      "say": "Let’s choose the gentle opening for a letter.",
      "options": [
        { "label": "Dear Grandma,", "correct": true },
        { "label": "Run very fast!", "correct": false },
        { "label": "A blue umbrella", "correct": false }
      ],
      "scene": "城市 晴天 太阳",
      "costume": "storyteller"
    },
    {
      "t": "card",
      "word": "I remember …",
      "emoji": "🌿",
      "action": "Tap your temple, then smile at one small memory.",
      "move": true,
      "say": "Part three: Other people’s hearts. Elia learns that care is often hidden in little things: warm socks, a saved seat, a favourite snack. To share one real memory, we can say: I remember when you helped me. Try it with me: I remember.",
      "scene": "晴天 森林 大树",
      "costume": "ranger"
    },
    {
      "t": "card",
      "word": "warm",
      "emoji": "🧡",
      "action": "Rub your hands together, then put them gently over your heart.",
      "move": true,
      "say": "A feeling can be warm even when it is not hot. When someone listens, helps, or remembers you, you may feel warm inside. Say: I feel warm inside.",
      "scene": "夜晚 森林 萤火虫",
      "costume": "wizard"
    },
    {
      "t": "quiz",
      "question": "Which sentence shares one small, loving memory?",
      "say": "Listen carefully. Which sentence sounds like a real memory for a letter?",
      "options": [
        { "label": "I remember when you read with me.", "correct": true },
        { "label": "Purple is a square.", "correct": false },
        { "label": "Jump over seven clouds.", "correct": false }
      ],
      "scene": "夜晚 森林 萤火虫",
      "costume": "wizard"
    },
    {
      "t": "move",
      "emoji": "🕊️",
      "prompt": "Fold an invisible letter, give it a gentle tap, and send it safely into the sky.",
      "say": "Let’s give our words a journey. Fold your invisible letter, press it closed, and send it gently. Your words can be brave and soft at the same time.",
      "scene": "星空 月亮 萤火虫",
      "costume": "wizard"
    },
    {
      "t": "card",
      "word": "With love,",
      "emoji": "🌸",
      "action": "Draw a tiny flower in the air, then sign your name.",
      "move": false,
      "say": "Part four: A poem for everyone. Elia discovers that love can be a friend waiting beside you, a parent’s careful reminder, or kindness for someone you have never met. A letter can close with: With love, then your name. Say: With love, Catherine.",
      "scene": "城堡 夕阳 星星",
      "costume": "storyteller"
    },
    {
      "t": "card",
      "word": "I hope you …",
      "emoji": "⭐",
      "action": "Make a small wish on your open palm.",
      "move": false,
      "say": "Part five: Your letter. Choose anyone safe and kind: a family member, a friend, a pet, a tree, or future you. Your letter has three little parts: Dear name. I remember one small thing. I hope you have a lovely day. Say: I hope you are happy.",
      "scene": "晴天 城市 太阳",
      "costume": "storyteller"
    },
    {
      "t": "quiz",
      "question": "What matters most in a kind letter?",
      "say": "One last question. What makes a letter special?",
      "options": [
        { "label": "A true and kind thought", "correct": true },
        { "label": "Perfect spelling every time", "correct": false },
        { "label": "The longest letter in the world", "correct": false }
      ],
      "scene": "晴天 城市 太阳",
      "costume": "storyteller"
    },
    {
      "t": "finale",
      "say": "You did something beautiful today. You learned farewell, Dear, I remember, warm, With love, and I hope you. Your letter does not have to be perfect. It only has to be true. One day, you will understand love a little more — starting with one kind sentence. I’ll see you in Letter World soon.",
      "scene": "夜晚 星空 月亮",
      "costume": "wizard"
    }
  ],
  "68edb892-d437-4f48-942f-08c1ae0b23e0": [
    {
      "t": "intro",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "Hello, little explorers! Welcome to the Café English adventure! Today, we're going to a cozy café to order drinks and snacks. Are you ready? Let's go!",
      "title": "Café English · 咖啡馆点单大冒险",
      "sub": "Welcome, little barista!"
    },
    {
      "t": "card",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "Look! This is a hot chocolate. Yummy! Say it with me: hot chocolate. (Hold your imaginary cup and blow.)",
      "emoji": "☕",
      "word": "hot chocolate",
      "action": "Pretend to hold a warm cup and blow on it.",
      "move": true
    },
    {
      "t": "card",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "And this is a cupcake! Sweet and delicious. Say: cupcake. (Pretend to take a bite.)",
      "emoji": "🧁",
      "word": "cupcake",
      "action": "Pretend to eat a small cake.",
      "move": true
    },
    {
      "t": "quiz",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "Let's check! Which picture shows hot chocolate?",
      "question": "Which one is 'hot chocolate'?",
      "options": [
        {
          "label": "☕",
          "correct": true
        },
        {
          "label": "🧁",
          "correct": false
        },
        {
          "label": "🍪",
          "correct": false
        }
      ]
    },
    {
      "t": "move",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "Now let's enter the café! Stand up and pretend to open a door. Push it open... great! Now walk in like a customer.",
      "emoji": "🚪",
      "prompt": "Open the café door!"
    },
    {
      "t": "card",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "When you want to know the price, you ask: 'How much?' Point to the menu and say it with me: How much?",
      "emoji": "💰",
      "word": "How much?",
      "action": "Point to the menu and look curious.",
      "move": false
    },
    {
      "t": "card",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "When you pay, you say: 'Here you go.' Pretend to give money to the cashier. Say it: Here you go.",
      "emoji": "💵",
      "word": "Here you go.",
      "action": "Pretend to hand over money.",
      "move": true
    },
    {
      "t": "quiz",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "Listen carefully! When you give money, you say...",
      "question": "What do you say when paying?",
      "options": [
        {
          "label": "How much?",
          "correct": false
        },
        {
          "label": "Here you go.",
          "correct": true
        },
        {
          "label": "Hot chocolate.",
          "correct": false
        }
      ]
    },
    {
      "t": "move",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "Let's sit down! Find a chair and sit. Then pretend to look at a menu. What would you like?",
      "emoji": "🪑",
      "prompt": "Sit down at a table!"
    },
    {
      "t": "card",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "And a cookie! Yummy with hot chocolate. Say: cookie. (Pretend to dip and eat.)",
      "emoji": "🍪",
      "word": "cookie",
      "action": "Pretend to dunk a cookie in milk.",
      "move": true
    },
    {
      "t": "quiz",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "When you want a hot chocolate, you say: 'A hot chocolate, please!' Which one is correct?",
      "question": "How do you order a hot chocolate?",
      "options": [
        {
          "label": "A hot chocolate, please!",
          "correct": true
        },
        {
          "label": "Here you go.",
          "correct": false
        },
        {
          "label": "How much?",
          "correct": false
        }
      ]
    },
    {
      "t": "finale",
      "scene": "晴天 城市",
      "costume": "explorer",
      "say": "Amazing job, little baristas! You learned how to order hot chocolate, cupcakes, cookies, ask 'How much?', and say 'Here you go.' Next time you visit a café, you can use these phrases! See you next adventure!"
    }
  ]
} as unknown as Record<string, LessonStep[]>;
