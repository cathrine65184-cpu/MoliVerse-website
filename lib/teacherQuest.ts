/**
 * Digital teacher demo — "Hou Yi and the Nine Suns" German numbers quest.
 *
 * Level-1 digital twin: the teacher's persona and lesson design are encoded
 * as a scripted branching dialogue (no API key needed). The same persona
 * profile and scenario template later become the system prompt when the
 * quest is upgraded to a live LLM.
 */

export const teacher = {
  name: "鲁提菲娅",
  title: "德语老师 · 数字分身",
  avatar: "鲁",
  intro:
    "大家好呀，我是鲁提菲娅老师的数字分身！真人的我每周在 MoliVerse 工作坊带小朋友学德语，现在我的赛博分身随时都能陪你冒险。",
};

export type ChoiceOption = {
  label: string;
  correct?: boolean;
  reply: string[];
};

export type Beat =
  | { t: "say"; m: string[]; sun?: number }
  | {
      t: "choice";
      m: string[];
      options: ChoiceOption[];
      word?: string;
      sun?: number;
    }
  | {
      t: "type";
      m: string[];
      word: string;
      accept: string[];
      placeholder: string;
      hint: string;
      reveal: string;
      praise: string;
      sun?: number;
      trap?: { match: string[]; reply: string };
    };

/** Lowercase, trim, strip punctuation/spaces, normalize German umlauts. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ä/g, "a")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9一-鿿]/g, "");
}

export function matches(input: string, accept: string[]): boolean {
  const n = normalize(input);
  return n.length > 0 && accept.some((a) => normalize(a) === n);
}

export const beats: Beat[] = [
  {
    t: "say",
    m: [
      "欢迎来到慕尼黑！可是……抬头看！天上挂着九个太阳，玛利亚广场的钟楼都快被烤化了 🥵",
      "神箭手后羿赶来了！但他的神箭有个秘密：必须有人用德语喊出太阳的编号，箭才会命中。",
    ],
  },
  {
    t: "choice",
    m: ["你愿意当后羿的德语报数员吗？"],
    options: [
      {
        label: "出发！让我来喊 🏹",
        correct: true,
        reply: ["Super!（太棒了！）这就是我最喜欢的冒险精神！"],
      },
      {
        label: "可是我一句德语都不会……",
        correct: true,
        reply: [
          "别担心，真人的我教过好多零基础的小朋友～数字是德语里最好学的部分，我们边玩边学！",
        ],
      },
    ],
  },
  {
    t: "say",
    m: [
      "先学前三个数字，跟我读：",
      "1 = eins（读'爱因斯'，爱因斯坦的爱因斯）\n2 = zwei（读'茨维'）\n3 = drei（读'德赖'）",
    ],
  },
  {
    t: "type",
    m: ["后羿搭弓了！瞄准 1 号太阳——快用德语喊出'1'！"],
    word: "eins",
    accept: ["eins", "1", "一", "ains"],
    placeholder: "输入德语的 1……",
    hint: "提示：读'爱因斯'，e 开头，四个字母 ✨",
    reveal: "是 eins！跟我再念一遍：eins（爱因斯）。没关系，第一次都这样～",
    praise: "eins！咻——💥 1 号太阳应声落下！你的发音天赋藏不住了！",
    sun: 1,
  },
  {
    t: "choice",
    m: ["2 号太阳在往科隆大教堂跑！'2'的德语是哪个？"],
    word: "zwei",
    options: [
      { label: "drei", reply: ["drei 是 3 哦～再想想，'茨维'？"] },
      {
        label: "zwei",
        correct: true,
        reply: ["Zwei！💥 2 号太阳掉进了莱茵河！Sehr gut!（非常好！）"],
      },
      { label: "eins", reply: ["eins 是我们刚射下的 1 号～'茨维'开头是 z 哦"] },
    ],
    sun: 2,
  },
  {
    t: "type",
    m: ["3 号太阳吓得直发抖……快，用德语喊'3'，一鼓作气！"],
    word: "drei",
    accept: ["drei", "3", "三", "dry", "drai"],
    placeholder: "输入德语的 3……",
    hint: "提示：读'德赖'，d 开头 🎯",
    reveal: "是 drei！德——赖！来，记住这个手感，等下还会见到它～",
    praise: "drei！💥 三连击！后羿回头看了你一眼，眼神里全是佩服！",
    sun: 3,
  },
  {
    t: "say",
    m: [
      "后羿手痒，自己把 4 号太阳射下来了，还偷偷跟我学了一句：4 = vier（读'菲尔'）😄",
      "接着学：\n5 = fünf（读'芬夫'，注意 ü 上面有两个小点点）\n6 = sechs（读'泽克斯'）",
    ],
    sun: 4,
  },
  {
    t: "type",
    m: ["5 号太阳躲到了新天鹅堡后面！用德语喊'5'把它揪出来！"],
    word: "fünf",
    accept: ["fünf", "funf", "fuenf", "5", "五"],
    placeholder: "输入德语的 5……（打不出 ü 就用 u）",
    hint: "提示：'芬夫'，f 开头 f 结尾，中间是 ün 💪",
    reveal: "是 fünf！这个词有点调皮，真人课堂上小朋友也常在这里卡住，多念两遍就是你的了！",
    praise: "fünf！💥 5 号太阳从城堡后面滚了下来！这个 ü 你都拿下了，了不起！",
    sun: 5,
  },
  {
    t: "type",
    m: ["6 号太阳是个大块头！深呼吸，用德语喊'6'！"],
    word: "sechs",
    accept: ["sechs", "6", "六", "zeks", "sex"],
    placeholder: "输入德语的 6……",
    hint: "提示：'泽克斯'，s 开头 s 结尾，中间藏着 ech 🔍",
    reveal: "是 sechs！泽——克——斯！这是我们工作坊课件里最大的那个太阳，你见过它的 😉",
    praise: "sechs！💥 大块头轰然倒地，大地都震了三震！",
    sun: 6,
  },
  {
    t: "say",
    m: ["最后三个数字，冲刺！\n7 = sieben（读'齐本'）\n8 = acht（读'阿赫特'）\n9 = neun（读'诺因'）"],
  },
  {
    t: "choice",
    m: ["7 号太阳在柏林勃兰登堡门上空！'7'是哪个？"],
    word: "sieben",
    options: [
      {
        label: "sieben",
        correct: true,
        reply: ["Sieben！💥 命中！你已经比后羿的德语好了（别告诉他）🤫"],
      },
      { label: "neun", reply: ["neun 是 9 哦～'齐本'，s 开头七个……不对，六个字母！"] },
      { label: "acht", reply: ["acht 是 8～再听一遍：'齐——本'"] },
    ],
    sun: 7,
  },
  {
    t: "type",
    m: ["8 号太阳是倒数第二个了！用德语喊'8'！"],
    word: "acht",
    accept: ["acht", "8", "八", "aht", "acht!"],
    placeholder: "输入德语的 8……",
    hint: "提示：'阿赫特'，a 开头 t 结尾，一共四个字母 ⏰",
    reveal: "是 acht！阿赫特！德语里 8 点钟就是 acht Uhr，以后约饭用得上 😋",
    praise: "acht！💥 8 号太阳栽进了黑森林！",
    sun: 8,
  },
  {
    t: "say",
    m: [
      "等等！后羿正瞄准最后的 9 号太阳……",
      "但是——如果把太阳全射光，慕尼黑就再也没有白天啦！传说里后羿也留了一个太阳温暖人间。",
      "快用德语对后羿喊'不'！德语的'不'是 nein（读'奈因'）——小心别喊成 neun(9)，不然他真射了！",
    ],
  },
  {
    t: "type",
    m: ["快！阻止后羿！"],
    word: "nein",
    accept: ["nein", "不", "no", "nain"],
    placeholder: "对后羿喊出德语的'不'……",
    hint: "提示：'奈因'，n 开头 n 结尾，中间是 ei ✋",
    reveal: "是 nein！奈因！（neun 是 9，nein 是不——这对双胞胎要分清哦）",
    praise: "NEIN——！！后羿的箭停在了弦上。他冲你竖起大拇指：这位小翻译，靠谱！",
    trap: {
      match: ["neun", "9", "九"],
      reply:
        "啊等等！neun 是 9！你这是在喊'9 号太阳'，后羿更来劲了！！我们要喊的是'不'——奈因，n-e-i-n！",
    },
  },
  {
    t: "say",
    m: [
      "夕阳下，最后一个太阳温柔地照着慕尼黑，钟楼的冰淇淋店重新开张了 🍦",
      "你今天用德语从 1 数到了 9，还救下了一个太阳。eins, zwei, drei, vier, fünf, sechs, sieben, acht, neun——现在它们都是你的了！",
      "这是数字分身的我能做到的，而真人的我会在下面这份报告里继续陪你 👇",
    ],
  },
];

export const TOTAL_SUNS = 9;
