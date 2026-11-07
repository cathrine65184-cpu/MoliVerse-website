/** Reference-checked starter lexicon. Never populated by a language model.
 * Definitions adapted from Wiktionnaire (CC BY-SA 4.0); examples are MoliVerse-authored.
 * This file is also imported by Deno: keep it pure and alias-free. */
export type Concept = {id:string; label:string};
export type VocabularyEntry = {
 id:string; version:number; conceptId:string; language:string; word:string; article:string;
 gender:"feminine"|"masculine"|"none"; meaning:string; example:string; examples:string[];
 pronunciation:{provider:"local-device-tts"; locale:string; text:string; audioUrl?:string};
 source:{title:string; url:string; license:string; licenseUrl:string; checkedAt:string; changes:string};
 reviewStatus:"reference-checked"|"draft"; level:string; options:string[];
};
export const concepts:Concept[]=[
 {id:"chair",label:"a chair"},{id:"table",label:"a table"},{id:"lamp",label:"a lamp"},
 {id:"book",label:"a book"},{id:"bed",label:"a bed"},{id:"rug",label:"a rug"},{id:"apple",label:"an apple"},
 {id:"banana",label:"a banana"},{id:"strawberry",label:"a strawberry"},{id:"orange",label:"an orange"},
 {id:"cat",label:"a cat"},{id:"dog",label:"a dog"},{id:"rabbit",label:"a rabbit"},{id:"bird",label:"a bird"}
];
export const assetConcepts:Record<string,string>={chair:"chair",table:"table",lamp:"lamp",book:"book",bookshelf:"book",bed:"bed",rug:"rug","apple-basket":"apple",apple:"apple",banana:"banana",strawberry:"strawberry",orange:"orange",cat:"cat",dog:"dog",rabbit:"rabbit",bird:"bird"};
const rows=[
 ["chair","chaise","une","feminine","A seat with a back, for one person.","Voici une chaise.","La chaise est ici.","fr-FR"],
 ["table","table","une","feminine","Furniture with a flat top for putting things on.","Voici une table.","La table est ici.","fr-FR"],
 ["lamp","lampe","une","feminine","An object that gives light.","Voici une lampe.","La lampe est ici.","fr-FR"],
 ["book","livre","un","masculine","Pages joined together for reading.","Voici un livre.","Le livre est ici.","fr-FR"],
 ["bed","lit","un","masculine","Furniture for sleeping on.","Voici un lit.","Le lit est ici.","fr-FR"],
 ["rug","tapis","un","masculine","A soft covering placed on the floor.","Voici un tapis.","Le tapis est ici.","fr-FR"],
 ["apple","pomme","une","feminine","A round fruit that grows on an apple tree.","Voici une pomme.","Une pomme, s’il vous plaît !","fr-FR"],
 ["banana","banane","une","feminine","A long fruit with a skin you peel.","Voici une banane.","La banane est jaune.","fr-FR"],
 ["strawberry","fraise","une","feminine","A small red fruit with tiny seeds on the outside.","Voici une fraise.","La fraise est rouge.","fr-FR"],
 ["orange","orange","une","feminine","A round citrus fruit with a peel.","Voici une orange.","Je mange une orange.","fr-FR"],
 ["cat","chat","un","masculine","A small animal that can purr and meow.","Voici un chat.","Le chat est ici.","fr-FR"],
 ["dog","chien","un","masculine","An animal that can bark and often lives with people.","Voici un chien.","Le chien est ici.","fr-FR"],
 ["rabbit","lapin","un","masculine","A small animal with long ears and soft fur.","Voici un lapin.","Le lapin est ici.","fr-FR"],
 ["bird","oiseau","un","masculine","An animal with feathers, a beak and wings.","Voici un oiseau.","Un oiseau est ici.","fr-FR"]
] as const;
export const vocabulary:VocabularyEntry[]=rows.flatMap(([id,word,article,gender,meaning,example,second,locale])=>{
 const source={title:`Wiktionnaire contributors — ${word}`,url:`https://fr.wiktionary.org/wiki/${word}`,license:"CC BY-SA 4.0",licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",checkedAt:"2026-11-07",changes:"Child-friendly English definition adapted; original MoliVerse examples. No dictionary example sentences copied."};
 const options=[id,...concepts.filter(c=>c.id!==id).slice(0,2).map(c=>c.id)];
 return [{id:`fr-${id}-v1`,version:1,conceptId:id,language:"fr",word,article,gender,meaning,example,examples:[example,second],pronunciation:{provider:"local-device-tts",locale,text:`${article} ${word}`},source,reviewStatus:"reference-checked",level:"Beginner",options},
 {id:`en-${id}-v1`,version:1,conceptId:id,language:"en",word:id,article:/^[aeiou]/.test(id)?"an":"a",gender:"none",meaning,example:`Here is ${/^[aeiou]/.test(id)?"an":"a"} ${id}.`,examples:[`Here is ${/^[aeiou]/.test(id)?"an":"a"} ${id}.`,`The ${id} is here.`],pronunciation:{provider:"local-device-tts",locale:"en-GB",text:`${/^[aeiou]/.test(id)?"an":"a"} ${id}`},source,reviewStatus:"reference-checked",level:"Beginner",options}];
});
export function entryForAsset(asset:string,language:string){return vocabulary.find(v=>v.conceptId===assetConcepts[asset]&&v.language===language&&v.reviewStatus==="reference-checked");}
export function checkVocabulary(entry:VocabularyEntry,choice:string){return entry.options.includes(choice)&&choice===entry.conceptId;}
export function choosePronunciation(entry:VocabularyEntry,voices:{lang:string;localService:boolean}[]){
 if(entry.pronunciation.audioUrl?.startsWith("/"))return {kind:"audio" as const,url:entry.pronunciation.audioUrl};
 const voice=voices.find(v=>v.localService&&v.lang.toLowerCase().split(/[-_]/)[0]===entry.language);
 return voice?{kind:"device" as const,locale:voice.lang}:{kind:"unavailable" as const};
}
export type VocabEvent={entry:string;kind:"discovery"|"practice"|"review";choice:string|null;correct:boolean|null;nonce:string};
export function summarise(events:VocabEvent[],entry:string){
 const rows=events.filter(x=>x.entry===entry);
 return {discoveries:rows.filter(x=>x.kind==="discovery").length,practices:rows.filter(x=>x.kind==="practice").length,reviews:rows.filter(x=>x.kind==="review").length,correct:rows.filter(x=>x.correct===true).length,again:rows.filter(x=>x.correct===false).length};
}
export function restoreVocab(raw:string|null):VocabEvent[]{try{
 const list=JSON.parse(raw||"[]");if(!Array.isArray(list))return [];
 return list.slice(-500).filter(e=>vocabulary.some(v=>v.id===e.entry)&&["discovery","practice","review"].includes(e.kind)&&typeof e.nonce==="string").map(e=>{
 const entry=vocabulary.find(v=>v.id===e.entry)!;
 return {...e,choice:e.kind==="discovery"?null:e.choice,correct:e.kind==="discovery"?null:checkVocabulary(entry,e.choice)};
 });
}catch{return []}}
