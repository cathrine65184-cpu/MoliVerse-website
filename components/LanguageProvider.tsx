"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Languages } from "lucide-react";

type Locale = "en" | "zh" | "pt" | "es";

const localeLabels: Record<Locale, string> = { en: "English", zh: "中文", pt: "Português", es: "Español" };

/*
 * Marketing and product chrome deliberately share one small, dependency-free
 * translation layer. Educator-authored journeys are never passed through it:
 * a creator's language is part of the lesson itself, not website chrome.
 */
const copy: Record<string, Record<Locale, string>> = {
  "What is MoliVerse": { en: "What is MoliVerse", zh: "什么是 MoliVerse", pt: "O que é a MoliVerse", es: "Qué es MoliVerse" },
  "For Families": { en: "For Families", zh: "家庭专区", pt: "Para famílias", es: "Para familias" },
  "Mentor Studio": { en: "Mentor Studio", zh: "Mentor 工作室", pt: "Estúdio do Mentor", es: "Estudio del Mentor" },
  "Workshops": { en: "Workshops", zh: "线下工作坊", pt: "Oficinas", es: "Talleres" },
  "Sign in": { en: "Sign in", zh: "登录", pt: "Entrar", es: "Iniciar sesión" },
  "Built by language educators, for curious children everywhere": { en: "Built by language educators, for curious children everywhere", zh: "由语言教育者为全球好奇的孩子打造", pt: "Criado por educadores de idiomas, para crianças curiosas em todo o mundo", es: "Creado por educadores de idiomas, para niños curiosos de todo el mundo" },
  "Learn Languages.": { en: "Learn Languages.", zh: "学习语言。", pt: "Aprenda idiomas.", es: "Aprende idiomas." },
  "Build Memories.": { en: "Build Memories.", zh: "创造共同记忆。", pt: "Crie memórias.", es: "Crea recuerdos." },
  "Explore a journey": { en: "Explore a journey", zh: "探索一段旅程", pt: "Explorar uma jornada", es: "Explorar un viaje" },
  "I’m an educator": { en: "I’m an educator", zh: "我是教育者", pt: "Sou educador(a)", es: "Soy educador(a)" },
  "Cultural Worlds": { en: "Cultural Worlds", zh: "文化世界", pt: "Mundos culturais", es: "Mundos culturales" },
  "Educator-Made Mentors": { en: "Educator-Made Mentors", zh: "教育者创造的 Mentor", pt: "Mentores criados por educadores", es: "Mentores creados por educadores" },
  "Human Moments": { en: "Human Moments", zh: "真实的人类时刻", pt: "Momentos humanos", es: "Momentos humanos" },
  "Live Workshops": { en: "Live Workshops", zh: "线下工作坊", pt: "Oficinas ao vivo", es: "Talleres en vivo" },
  "Our Mission": { en: "Our Mission", zh: "我们的使命", pt: "Nossa missão", es: "Nuestra misión" },
  "Great teachers shouldn't be a privilege.": { en: "Great teachers shouldn't be a privilege.", zh: "优秀教师不该是一种特权。", pt: "Grandes educadores não devem ser um privilégio.", es: "Los grandes docentes no deberían ser un privilegio." },
  "Language · Culture · Story · Human connection": { en: "Language · Culture · Story · Human connection", zh: "语言 · 文化 · 故事 · 人的连接", pt: "Idioma · Cultura · História · Conexão humana", es: "Idioma · Cultura · Historia · Conexión humana" },
  "Family dashboard": { en: "Family dashboard", zh: "家庭控制面板", pt: "Painel da família", es: "Panel familiar" },
  "Set up an Explorer": { en: "Set up an Explorer", zh: "设置小小探索者", pt: "Criar um Explorador", es: "Crear un Explorador" },
  "Private family activation": { en: "Private family activation", zh: "私密家庭激活", pt: "Ativação privada da família", es: "Activación privada de la familia" },
  "Explorer setup": { en: "Explorer setup", zh: "探索者设置", pt: "Configuração do Explorador", es: "Configuración del Explorador" },
  "Ask a grown-up to activate": { en: "Ask a grown-up to activate", zh: "请家长激活", pt: "Peça a um responsável para ativar", es: "Pide a un adulto que active" },
  "Meet your AI Mentor": { en: "Meet your AI Mentor", zh: "遇见你的 AI Mentor", pt: "Conheça seu Mentor de IA", es: "Conoce a tu Mentor de IA" },
  "AI Mentor conversations": { en: "AI Mentor conversations", zh: "AI Mentor 对话", pt: "Conversas com Mentor de IA", es: "Conversaciones con el Mentor de IA" },
  "Save shared memories": { en: "Save shared memories", zh: "保存共同记忆", pt: "Salvar memórias compartilhadas", es: "Guardar recuerdos compartidos" },
  "Voice practice": { en: "Voice practice", zh: "语音练习", pt: "Prática de voz", es: "Práctica de voz" },
  "Ask for a human response": { en: "Ask for a human response", zh: "请求真人回应", pt: "Pedir uma resposta humana", es: "Pedir una respuesta humana" },
  "Weekly learning update": { en: "Weekly learning update", zh: "每周学习摘要", pt: "Atualização semanal de aprendizagem", es: "Resumen semanal de aprendizaje" },
  "A living language universe built by educators: children enter cultural stories with AI Mentors, and return because the world remembers what matters to them.": { en: "A living language universe built by educators: children enter cultural stories with AI Mentors, and return because the world remembers what matters to them.", zh: "这是一个由教育者共同打造的语言宇宙：孩子与 AI Mentor 走进文化故事，也因为世界记得对他们重要的事而再次回来。", pt: "Um universo vivo de idiomas criado por educadores: crianças entram em histórias culturais com Mentores de IA e voltam porque o mundo se lembra do que importa para elas.", es: "Un universo vivo de idiomas creado por educadores: los niños entran en historias culturales con Mentores de IA y vuelven porque el mundo recuerda lo que les importa." },
  "Not more lessons. A world worth returning to.": { en: "Not more lessons. A world worth returning to.", zh: "不是更多课程，而是一个值得再回来的世界。", pt: "Não mais aulas. Um mundo ao qual vale a pena voltar.", es: "No más lecciones. Un mundo al que vale la pena volver." },
  "MoliVerse turns curiosity into a cultural journey. Every experience connects story, language, relationship, and a memory children can carry forward.": { en: "MoliVerse turns curiosity into a cultural journey. Every experience connects story, language, relationship, and a memory children can carry forward.", zh: "MoliVerse 将好奇心化为文化旅程。每次体验连接故事、语言、关系，以及孩子能一直带着的共同记忆。", pt: "A MoliVerse transforma curiosidade em uma jornada cultural. Cada experiência une história, idioma, relação e uma memória que a criança leva consigo.", es: "MoliVerse convierte la curiosidad en un viaje cultural. Cada experiencia une historia, idioma, relación y un recuerdo que los niños pueden llevar consigo." },
  "A night market, a football pitch, a folktale — language begins with a place a child genuinely wants to understand.": { en: "A night market, a football pitch, a folktale — language begins with a place a child genuinely wants to understand.", zh: "夜市、足球场、民间传说——语言从孩子真正想要理解的地方开始。", pt: "Um mercado noturno, um campo de futebol, um conto popular — o idioma começa em um lugar que a criança realmente quer entender.", es: "Un mercado nocturno, una cancha de fútbol, un cuento popular: el idioma comienza en un lugar que el niño de verdad quiere entender." },
  "Language educators bring their voice, teaching approach, and cultural perspective into an AI Mentor — not a generic bot.": { en: "Language educators bring their voice, teaching approach, and cultural perspective into an AI Mentor — not a generic bot.", zh: "语言教育者将声音、教学方式和文化视角带入 AI Mentor，而不是做一个千篇一律的机器人。", pt: "Educadores de idiomas levam sua voz, abordagem de ensino e perspectiva cultural para um Mentor de IA — não para um robô genérico.", es: "Los educadores de idiomas llevan su voz, enfoque pedagógico y perspectiva cultural a un Mentor de IA, no a un bot genérico." },
  "AI carries everyday exploration. When a child needs encouragement, insight, or a real reply, the educator steps in.": { en: "AI carries everyday exploration. When a child needs encouragement, insight, or a real reply, the educator steps in.", zh: "AI 陪伴日常探索。当孩子需要鼓励、启发或真实回应时，教育者会出现。", pt: "A IA acompanha a exploração diária. Quando uma criança precisa de incentivo, compreensão ou uma resposta real, o educador entra em cena.", es: "La IA acompaña la exploración diaria. Cuando un niño necesita ánimo, comprensión o una respuesta real, el educador interviene." },
  "The universe is already open for young explorers.": { en: "The universe is already open for young explorers.", zh: "这个宇宙已经向小小探索者打开。", pt: "O universo já está aberto para jovens exploradores.", es: "El universo ya está abierto para los jóvenes exploradores." },
  "While we build MoliVerse, our team already runs live story-driven workshops where children learn Spanish, French, and German inside imaginary worlds — football kingdoms, animal ateliers, and ancient legends reimagined across European cities. Every scene below is a real class.": { en: "While we build MoliVerse, our team already runs live story-driven workshops where children learn Spanish, French, and German inside imaginary worlds — football kingdoms, animal ateliers, and ancient legends reimagined across European cities. Every scene below is a real class.", zh: "在打造 MoliVerse 的同时，我们已经开展了故事驱动的线下工作坊。孩子在想象世界里学习西班牙语、法语与德语：足球王国、动物工作室，还有重现在欧洲城市中的古老传说。下面的每个场景都来自真实课堂。", pt: "Enquanto construímos a MoliVerse, nossa equipe já realiza oficinas presenciais guiadas por histórias, nas quais crianças aprendem espanhol, francês e alemão em mundos imaginários — reinos de futebol, ateliês de animais e lendas antigas recriadas em cidades europeias. Cada cena abaixo é uma aula real.", es: "Mientras creamos MoliVerse, nuestro equipo ya realiza talleres presenciales guiados por historias, donde los niños aprenden español, francés y alemán dentro de mundos imaginarios: reinos de fútbol, talleres de animales y leyendas antiguas recreadas en ciudades europeas. Cada escena es una clase real." },
  "Join the Adventure": { en: "Join the Adventure", zh: "加入这场冒险", pt: "Participe da aventura", es: "Únete a la aventura" },
  "Free trial workshops, small groups — email us your child's age, language, and city.": { en: "Free trial workshops, small groups — email us your child's age, language, and city.", zh: "免费试听工作坊，小班进行——请邮件告诉我们孩子的年龄、学习语言和所在城市。", pt: "Oficinas experimentais gratuitas, em pequenos grupos — envie a idade, o idioma e a cidade da criança por e-mail.", es: "Talleres de prueba gratuitos y grupos pequeños: envíanos por correo la edad, el idioma y la ciudad de tu hijo." },
  "Affordable by Design": { en: "Affordable by Design", zh: "从设计上就可负担", pt: "Acessível por design", es: "Asequible por diseño" },
  "Fair for Creators": { en: "Fair for Creators", zh: "对创作者公平", pt: "Justa para criadores", es: "Justo para creadores" },
  "Open to Everywhere": { en: "Open to Everywhere", zh: "向每个地方开放", pt: "Aberta para todos os lugares", es: "Abierta a todos los lugares" },
  "In some places, classrooms overflow with resources. In others, a good language teacher is impossible to find — or to afford. AI alone doesn't close that gap: knowledge still needs a human guide. MoliVerse connects the two, building a universe that belongs to every child, not only those born near great schools.": { en: "In some places, classrooms overflow with resources. In others, a good language teacher is impossible to find — or to afford. AI alone doesn't close that gap: knowledge still needs a human guide. MoliVerse connects the two, building a universe that belongs to every child, not only those born near great schools.", zh: "有些地方的课堂资源充足，另一些地方却很难找到或负担得起优秀语言教师。仅有 AI 无法弥合这道鸿沟：知识仍需要人的引导。MoliVerse 连接两者，打造属于每个孩子的宇宙，而不仅属于出生在好学校附近的孩子。", pt: "Em alguns lugares, as salas de aula têm muitos recursos. Em outros, é impossível encontrar — ou pagar — um bom professor de idiomas. A IA sozinha não fecha essa lacuna: o conhecimento ainda precisa de orientação humana. A MoliVerse conecta os dois e constrói um universo para todas as crianças, não apenas para quem nasce perto de boas escolas.", es: "En algunos lugares las aulas rebosan de recursos. En otros, es imposible encontrar —o pagar— un buen profesor de idiomas. La IA por sí sola no cierra esa brecha: el conocimiento aún necesita una guía humana. MoliVerse une ambas cosas y construye un universo para todos los niños, no solo para quienes nacen cerca de buenas escuelas." },
  "Crafted for explorers of language and worlds.": { en: "Crafted for explorers of language and worlds.", zh: "为探索语言与世界的人而造。", pt: "Criada para exploradores de idiomas e mundos.", es: "Creada para exploradores de idiomas y mundos." },
  "Which world would you like to explore today?": { en: "Which world would you like to explore today?", zh: "今天，你想探索哪个世界？", pt: "Qual mundo você gostaria de explorar hoje?", es: "¿Qué mundo te gustaría explorar hoy?" },
  "Enter journey": { en: "Enter journey", zh: "进入旅程", pt: "Entrar na jornada", es: "Entrar al viaje" },
  "Meet AI Mentor": { en: "Meet AI Mentor", zh: "遇见 AI Mentor", pt: "Conhecer o Mentor de IA", es: "Conocer al Mentor de IA" },
  "Family information": { en: "Family information", zh: "家庭说明", pt: "Informações para famílias", es: "Información para familias" },
  "For families": { en: "For families", zh: "家庭专区", pt: "Para famílias", es: "Para familias" },
  "A language journey your child can care about.": { en: "A language journey your child can care about.", zh: "一段让孩子真正关心的语言旅程。", pt: "Uma jornada de idiomas com a qual seu filho pode se importar.", es: "Un viaje de idiomas que le importe a tu hijo." },
  "Start a language story, together.": { en: "Start a language story, together.", zh: "一起开启语言故事。", pt: "Comecem juntos uma história de idiomas.", es: "Comiencen juntos una historia de idiomas." },
  "Explorer name": { en: "Explorer name", zh: "探索者名字", pt: "Nome do Explorador", es: "Nombre del Explorador" },
  "Age range": { en: "Age range", zh: "年龄范围", pt: "Faixa etária", es: "Rango de edad" },
  "Language": { en: "Language", zh: "语言", pt: "Idioma", es: "Idioma" },
  "Parent or guardian email": { en: "Parent or guardian email", zh: "家长或监护人邮箱", pt: "E-mail do responsável", es: "Correo del padre, madre o tutor" },
  "Your grown-up said yes.": { en: "Your grown-up said yes.", zh: "你的家长已同意。", pt: "Seu responsável autorizou.", es: "Tu adulto responsable dijo que sí." },
  "Ask your grown-up to check their email.": { en: "Ask your grown-up to check their email.", zh: "请家长查看邮件。", pt: "Peça ao seu responsável para verificar o e-mail.", es: "Pide a tu adulto responsable que revise su correo." },
  "What your grown-up controls": { en: "What your grown-up controls", zh: "家长可以控制什么", pt: "O que seu responsável controla", es: "Lo que controla tu adulto responsable" },
  "Use a different email": { en: "Use a different email", zh: "使用其他邮箱", pt: "Usar outro e-mail", es: "Usar otro correo" },
  "My account": { en: "My account", zh: "我的账号", pt: "Minha conta", es: "Mi cuenta" },
  "Educator workspace": { en: "Educator workspace", zh: "教育者工作台", pt: "Espaço do educador", es: "Espacio del educador" },
  "Mentor Studio is for educators. Please sign in with an educator account.": { en: "Mentor Studio is for educators. Please sign in with an educator account.", zh: "Mentor Studio 仅面向教育者。请使用教育者账号登录。", pt: "O Mentor Studio é para educadores. Entre com uma conta de educador.", es: "Mentor Studio es para educadores. Inicia sesión con una cuenta de educador." },
  "Story Stage · Immersive story theatre": { en: "Story Stage · Immersive story theatre", zh: "Story Stage · 沉浸式故事剧场", pt: "Story Stage · Teatro de histórias imersivo", es: "Story Stage · Teatro de historias inmersivo" },
  "Choose a story · Live story": { en: "Choose a story · Live story", zh: "选择故事 · 实时故事", pt: "Escolha uma história · História ao vivo", es: "Elige una historia · Historia en vivo" },
  "Start camera and enter the story": { en: "Start camera and enter the story", zh: "开启摄像头，走进故事", pt: "Inicie a câmera e entre na história", es: "Enciende la cámara y entra en la historia" },
  "Real 3D twin": { en: "Real 3D twin", zh: "真实 3D 分身", pt: "Gêmeo 3D real", es: "Gemelo 3D real" },
};

const textSources = new WeakMap<Text, string>();

function sourceFor(value: string) {
  const direct = copy[value];
  if (direct) return value;
  return Object.entries(copy).find(([, translations]) => Object.values(translations).includes(value))?.[0] ?? value;
}

function translate(source: string, locale: Locale) {
  return copy[sourceFor(source)]?.[locale] ?? source;
}

function translateDocument(locale: Locale) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, [data-no-translate]")) return;
    const original = textSources.get(node) ?? node.nodeValue ?? "";
    const trimmed = original.trim();
    const replacement = translate(trimmed, locale);
    if (replacement === trimmed) return;
    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    textSources.set(node, original);
    node.nodeValue = `${leading}${replacement}${trailing}`;
  });
}

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const localeRef = useRef<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("moliverse-locale") as Locale | null;
    if (saved && localeLabels[saved]) setLocale(saved);
  }, []);

  useEffect(() => {
    localeRef.current = locale;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
    localStorage.setItem("moliverse-locale", locale);
    translateDocument(locale);
  }, [locale]);

  useEffect(() => {
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => translateDocument(localeRef.current));
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <>{children}<div className="fixed bottom-4 right-4 z-[70]"><label className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#100d1a]/90 px-3 py-2 text-xs text-slate-100 shadow-xl backdrop-blur-xl"><Languages className="h-3.5 w-3.5 text-violet-300" /><span className="sr-only">Language</span><select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="appearance-none bg-transparent pr-3 text-xs font-medium outline-none"><option value="en">English</option><option value="zh">中文</option><option value="pt">Português</option><option value="es">Español</option></select><ChevronDown className="pointer-events-none -ml-5 h-3.5 w-3.5 text-slate-400" /></label></div></>;
}
