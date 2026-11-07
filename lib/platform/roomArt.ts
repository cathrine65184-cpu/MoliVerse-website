// Supplied MoliVerse artwork, rendered as sprites without altering the original sheets.
export const sprites:Record<string,{sheet:string;box:[number,number,number,number];clip?:string}>= {
 chair:{sheet:"cafe",box:[739,65,292,485]},
 table:{sheet:"cafe",box:[7,145,370,410]},
 bed:{sheet:"bedroom",box:[12,145,455,430]},
 rug:{sheet:"bedroom",box:[1017,675,429,336]},
 lamp:{sheet:"reading",box:[770,110,230,490],clip:"770,110 1000,110 1000,300 985,365 985,520 1000,540 1000,600 845,600 845,310 770,310"},
 bookshelf:{sheet:"reading",box:[6,102,405,507]},
 desk:{sheet:"bedroom",box:[405,590,368,426]},
 plant:{sheet:"decor",box:[1080,15,366,532]},
 cabinet:{sheet:"bedroom",box:[748,78,324,452]},
 chest:{sheet:"bedroom",box:[1080,234,367,310]},
 mirror:{sheet:"decor",box:[780,136,285,389]},
 clock:{sheet:"decor",box:[277,565,326,484]},
 cushions:{sheet:"decor",box:[602,625,496,411]},
 armchair:{sheet:"reading",box:[412,169,410,447],clip:"412,169 765,169 765,320 822,345 822,616 412,616"},
};
