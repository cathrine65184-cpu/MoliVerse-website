"use client";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CourseWorld } from '@/lib/immersive/course';

type ThemeLook = { sky:string; fog:string; ground:string; path:string; buildings:string[]; window:string };

export default function MarketScene({ course, selected, target, onSelect, flat }: { course: CourseWorld; selected: string; target?: string; onSelect: (id: string) => void; flat: boolean }) {
  const host = useRef<HTMLDivElement>(null); const selectRef=useRef(onSelect); selectRef.current=onSelect;
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(flat || !host.current) return;
    const el=host.current; let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); } catch { setFailed(true); return; }
    const looks: Record<CourseWorld['theme'],ThemeLook> = {
      blank:{sky:'#eef2e8',fog:'#eef2e8',ground:'#dfe7d8',path:'#f4eee0',buildings:['#d8dfd1'],window:'#f8e8b5'},
      market:{sky:'#253d46',fog:'#253d46',ground:'#6f766b',path:'#cdb28c',buildings:['#687f76','#a38d78','#8e9d8f'],window:'#f2ca7d'},
      bakery:{sky:'#755f70',fog:'#755f70',ground:'#8f8074',path:'#d9b98f',buildings:['#b18172','#8fa08b','#c19877'],window:'#ffe3a0'},
      forest:{sky:'#274842',fog:'#274842',ground:'#58705a',path:'#bca77f',buildings:['#53705a','#6e8061','#7b6c59'],window:'#f5d98c'},
      ocean:{sky:'#397b8c',fog:'#397b8c',ground:'#75a7a2',path:'#e2cfaa',buildings:['#5c9697','#6c83a6','#769a8d'],window:'#ffe7a9'},
      space:{sky:'#111536',fog:'#111536',ground:'#55516f',path:'#8d87a4',buildings:['#5d5b83','#4a6f88','#735f8c'],window:'#bde8ff'},
      city:{sky:'#304c52',fog:'#304c52',ground:'#6d786e',path:'#c7b393',buildings:['#71847c','#a08d79','#85968b'],window:'#ead092'},
      castle:{sky:'#4b4262',fog:'#4b4262',ground:'#706a78',path:'#c3b79d',buildings:['#81788b','#716b80','#938378'],window:'#f6d58d'},
      library:{sky:'#3c4d4a',fog:'#3c4d4a',ground:'#756d61',path:'#c5aa83',buildings:['#816f60','#667b72','#997a61'],window:'#f5d18a'},
      museum:{sky:'#4c5058',fog:'#4c5058',ground:'#817b72',path:'#d2c5aa',buildings:['#8a8278','#6f7e80','#9b806e'],window:'#f5ddb0'},
      farm:{sky:'#6c8e8f',fog:'#6c8e8f',ground:'#6f8a58',path:'#d4bd83',buildings:['#a46853','#c59a6d','#7b9368'],window:'#ffe29b'},
      school:{sky:'#587d94',fog:'#587d94',ground:'#72806b',path:'#cbb892',buildings:['#718aa0','#a77e68','#7f9681'],window:'#f6d48f'},
      desert:{sky:'#a87568',fog:'#a87568',ground:'#bb8b5f',path:'#e0be82',buildings:['#b37b55','#c5976e','#9b725c'],window:'#ffe4a3'},
    };
    const world=looks[course.theme] || looks.city;
    const seed=`${course.title}${course.dna.stories}`.split('').reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,17);
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.setClearColor(world.sky); el.appendChild(renderer.domElement); setFailed(false);
    renderer.domElement.setAttribute('aria-label',`Interactive 3D ${course.theme} story world. Drag to orbit, scroll to zoom. Use the location buttons for keyboard access.`);
    const scene=new THREE.Scene(); scene.fog=new THREE.Fog(world.fog,24,52);
    const camera=new THREE.PerspectiveCamera(42,1,.1,100); camera.position.set(15,14,21);
    const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(0,1,-.5); controls.enableDamping=true; controls.maxPolarAngle=Math.PI/2.16; controls.minDistance=12; controls.maxDistance=38; controls.enablePan=false;
    scene.add(new THREE.HemisphereLight('#fff0cf','#263e43',2.8));
    const sun=new THREE.DirectionalLight(new THREE.Color().lerpColors(new THREE.Color('#dcecff'),new THREE.Color('#ffc57e'),course.warmth),3.2); sun.position.set(-3,11,8); scene.add(sun);
    const materials=new Map<string,THREE.MeshStandardMaterial>(); const geometries:THREE.BufferGeometry[]=[];
    const mat=(color:string,emissive='')=>{const key=`${color}-${emissive}`;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.78,metalness:course.theme==='space'?.16:.02,emissive:emissive||'#000000',emissiveIntensity:emissive?.45:0}));return materials.get(key)!;};
    const boxGeo=new THREE.BoxGeometry(1,1,1), sphereGeo=new THREE.SphereGeometry(1,16,11), cylinderGeo=new THREE.CylinderGeometry(1,1,1,18), coneGeo=new THREE.ConeGeometry(1,1,16);geometries.push(boxGeo,sphereGeo,cylinderGeo,coneGeo);
    const box=(g:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string,emissive='')=>{const m=new THREE.Mesh(boxGeo,mat(color,emissive));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;};
    const ball=(g:THREE.Object3D,x:number,y:number,z:number,r:number,color:string,emissive='')=>{const m=new THREE.Mesh(sphereGeo,mat(color,emissive));m.position.set(x,y,z);m.scale.setScalar(r);g.add(m);return m;};
    const cylinder=(g:THREE.Object3D,x:number,y:number,z:number,r:number,h:number,color:string)=>{const m=new THREE.Mesh(cylinderGeo,mat(color));m.position.set(x,y,z);m.scale.set(r,h,r);g.add(m);return m;};
    const cone=(g:THREE.Object3D,x:number,y:number,z:number,r:number,h:number,color:string)=>{const m=new THREE.Mesh(coneGeo,mat(color));m.position.set(x,y,z);m.scale.set(r,h,r);g.add(m);return m;};
    const torus=(g:THREE.Object3D,x:number,y:number,z:number,r:number,tube:number,color:string)=>{const geo=new THREE.TorusGeometry(r,tube,8,36);geometries.push(geo);const m=new THREE.Mesh(geo,mat(color));m.position.set(x,y,z);g.add(m);return m;};
    const textures:THREE.Texture[]=[];const spriteMats:THREE.SpriteMaterial[]=[];
    const label=(g:THREE.Object3D,text:string,y:number)=>{const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d')!;ctx.fillStyle='#fffaf0';ctx.beginPath();ctx.roundRect(0,0,512,96,24);ctx.fill();ctx.fillStyle='#334039';ctx.font='bold 29px sans-serif';ctx.textAlign='center';ctx.fillText(text.slice(0,28),256,60);const texture=new THREE.CanvasTexture(c);textures.push(texture);const sm=new THREE.SpriteMaterial({map:texture,depthTest:false});spriteMats.push(sm);const s=new THREE.Sprite(sm);s.position.set(0,y,0);s.scale.set(3,.56,1);g.add(s);};
    const tree=(g:THREE.Object3D,x:number,z:number,s=1)=>{cylinder(g,x,1.1*s,z,.2*s,1.2*s,'#665343');for(let i=0;i<3;i++)ball(g,x+(i-1)*.35*s,2.25*s+(i%2)*.22,z,.72*s,['#66875b','#7b9b62','#557a5d'][i]);};
    const shelf=(g:THREE.Object3D,x:number,z:number,w=2.4,h=2.2)=>{box(g,x,h/2,z,w,h,.45,'#76583f');for(let row=0;row<3;row++){box(g,x,.42+row*.64,z+.26,w,.08,.08,'#4e3b31');for(let i=0;i<7;i++)box(g,x-w/2+.25+i*(w-.3)/6,.67+row*.64,z+.34,.16,.42,.18,['#b85f52','#548092','#d1ae65','#7f6a9b'][i%4]);}};
    const stall=(g:THREE.Object3D,color:string)=>{box(g,0,.65,0,2.6,1.3,1.65,'#946d4d');box(g,0,1.36,0,2.85,.16,1.9,'#e5c69a');for(const x of [-1.25,1.25])box(g,x,1.9,-.5,.1,2,.1,'#594f42');for(let i=0;i<8;i++){const roof=box(g,-1.4+i*.4,2.7,0,.39,.13,2.2,i%2?color:'#f5e7c9');roof.rotation.x=.12;}for(let i=0;i<9;i++)ball(g,-.85+(i%3)*.85,1.62,-.45+Math.floor(i/3)*.4,.19,['#eda940','#e8d273','#87ab62'][i%3]);};
    const facade=(g:THREE.Object3D,color:string)=>{box(g,0,1.75,-.45,3.8,3.5,1.2,color);box(g,0,1.05,.2,2.7,2,.12,'#40584f');box(g,0,1.15,.28,2.4,1.65,.08,world.window,world.window);for(let i=0;i<7;i++){const aw=box(g,-1.38+i*.46,2.35,.42,.44,.12,1.05,i%2?'#f3dfbf':'#a87469');aw.rotation.x=.08;}box(g,1.25,.5,.3,.72,1.5,.12,'#4d3e35');};
    const coral=(g:THREE.Object3D,x:number,z:number,color:string,s=1)=>{for(let i=0;i<4;i++){const b=cylinder(g,x+(i-1.5)*.18*s,.48*s+i*.12*s,z,.1*s,.52*s,color);b.rotation.z=(i-1.5)*.22;}for(let i=0;i<3;i++)ball(g,x+(i-1)*.25*s,.9*s,z,.16*s,['#ec8b83','#eab36a','#8fc5ad'][i]);};
    const star=(g:THREE.Object3D,x:number,y:number,z:number,r=.06)=>ball(g,x,y,z,r,'#e9f4ff','#bde8ff');

    if(course.theme==='ocean'){
      box(scene,0,-.55,0,24,.5,17,'#4f9bab');for(let i=0;i<4;i++){const island=cylinder(scene,-5+i*3.5,-.12,-1+(i%2)*2,1.7-i*.12,.32,'#e2c78e');island.scale.z=.75;}for(let i=0;i<6;i++)coral(scene,-7+i*2.8,-5+(i%2),['#e3827a','#7bc0b0','#e4b766'][i%3],.8);
    } else if(course.theme==='space'){
      box(scene,0,-.35,0,22,.65,16,'#4c4965');for(let i=0;i<34;i++)star(scene,-10+(i%11)*2,2.5+(i%5)*1.05,-8+(i%3),.04+(i%3)*.015);const planet=ball(scene,7,7,-8,2.2,'#7969ae');const ring=torus(scene,7,7,-8,3,.12,'#d8b66b');ring.rotation.x=1.1;planet.scale.y=.94;for(let i=0;i<8;i++){const crater=cylinder(scene,-7+(i%4)*4,.02,-3+Math.floor(i/4)*6,.55,.05,'#706b89');crater.scale.z=.55;}
    } else if(course.theme==='forest'||course.theme==='farm'){
      box(scene,0,-.35,0,22,.65,16,world.ground);box(scene,0,.02,2,18,.08,4,world.path);for(let i=0;i<12;i++)tree(scene,-9+(i%6)*3.6,-6+Math.floor(i/6)*10,.7+(i%3)*.1);if(course.theme==='farm'){box(scene,5,1.7,-6,5,3.4,2.2,'#a6614f');cone(scene,5,4,-6,3.4,1.7,'#5f4d43');box(scene,5,1,-4.85,1.2,2,.12,'#f1d6a0');}
    } else if(course.theme==='desert'){
      box(scene,0,-.35,0,22,.65,16,'#c99d6a');for(let i=0;i<4;i++){const p=cone(scene,-7+i*4.6,1.4,-6+(i%2),2.4,2.8,['#d8ad71','#bd8657'][i%2]);p.rotation.y=i*.2;}ball(scene,7,7,-9,1.2,'#f3c665','#f3c665');
    } else {
      box(scene,0,-.35,0,22,.65,16,world.ground);box(scene,0,.02,2,19,.08,5,world.path);for(let x=-8;x<10;x+=1.2)for(let z=.2;z<4.4;z+=1.2)box(scene,x,.08,z,1.12,.04,1.12,((x+z)%2>1)?world.path:'#ead9b9');
      if(course.theme==='castle'){box(scene,0,2,-6.5,10,4,2,world.buildings[0]);for(const x of [-5,5]){cylinder(scene,x,2.3,-6,1.6,3.8,world.buildings[1]);cone(scene,x,5,-6,1.9,2,'#655375');}box(scene,0,1.2,-5.4,2.2,2.4,.2,'#403948');}
      else if(['library','museum','school'].includes(course.theme)){box(scene,0,2.3,-6.8,19,4.6,1.2,world.buildings[0]);if(course.theme==='library')for(let i=0;i<5;i++)shelf(scene,-7+i*3.5,-5.9,2.7,2.7);if(course.theme==='museum')for(let i=0;i<5;i++){box(scene,-7+i*3.5,2.6,-5.95,2.2,1.5,.08,['#d8b47f','#789f9b','#a97d78'][i%3]);box(scene,-7+i*3.5,2.6,-5.88,1.8,1.1,.05,'#f4e6c9');}if(course.theme==='school')for(let i=0;i<6;i++)box(scene,-7.5+i*3,2.5,-6.1,1.5,1.7,.08,world.window,world.window);}
      else if(course.theme==='bakery'){facade(scene,world.buildings[0]);for(let i=0;i<7;i++){const b=ball(scene,-7+i*2.2,4.8-Math.abs(3-i)*.13,-4.8,.38,'#e7b264','#e7b264');b.scale.y=.65;}}
      else for(let i=0;i<7;i++){const x=-8+i*3;box(scene,x,2,-6.5,2.8,4,2,world.buildings[i%world.buildings.length]);for(let j=0;j<2;j++)box(scene,x-.65+j*1.3,2.8,-5.46,.7,1,.08,world.window,world.window);box(scene,x,4.1,-6.5,3,.25,2.4,'#615c55');}
    }

    const clickable:THREE.Object3D[]=[];const markers:THREE.Mesh[]=[];const moliActors:THREE.Group[]=[];let propIndex=0;
    const buildMoli=(g:THREE.Group)=>{const deer=new THREE.Group();deer.position.set(0,.1,0);g.add(deer);moliActors.push(deer);const body=ball(deer,0,1.05,0,.62,'#a9c77f');body.scale.set(.78,1,.68);const belly=ball(deer,0,1.02,.47,.35,'#f1d98a');belly.scale.set(.8,1,.3);const head=new THREE.Group();head.position.set(0,1.82,.05);head.userData.moliHead=true;deer.add(head);const face=ball(head,0,0,0,.55,'#b8d58c');face.scale.set(1,1,.82);for(const side of [-1,1]){const ear=ball(head,side*.5,.18,0,.23,'#a9c77f');ear.scale.set(.7,1.25,.45);ear.rotation.z=side*.75;const eye=ball(head,side*.2,.05,.45,.09,'#152b3b');eye.scale.z=.4;const horn=box(head,side*.3,.68,0,.09,.65,.09,'#283b58');horn.rotation.z=side*.23;}ball(head,0,-.12,.49,.08,'#30424b');ball(head,0,.55,0,.09,'#74a956');for(const side of [-1,1]){const leg=box(deer,side*.27,.38,0,.18,.7,.18,'#94b873');leg.rotation.z=side*.06;}};
    const buildProp=(g:THREE.Group,index:number,color:string)=>{
      if(course.theme==='market'){stall(g,color);return;}
      if(course.theme==='bakery'){if(index===0){box(g,0,.75,0,2.7,1.5,1.5,'#8f684c');for(let i=0;i<6;i++){const bread=ball(g,-1+i*.4,1.58,.05,.22,'#d99a52');bread.scale.set(1.45,.65,.65);}}else if(index===1){shelf(g,0,0,2.9,2.5);box(g,0,2.85,0,2.4,.5,.3,'#efe0bd');}else{box(g,0,1.25,0,2.5,2.5,1.8,'#7b6255');const fire=ball(g,0,1.08,.95,.55,'#ef8c4e','#ef8c4e');fire.scale.y=.7;box(g,0,2.65,0,2.8,.25,2,'#c18d65');}return;}
      if(course.theme==='ocean'){if(index===0){const sand=cylinder(g,0,.18,0,1.7,.22,'#e5cb91');sand.scale.z=.65;for(let i=0;i<7;i++){const sh=ball(g,-1.1+i*.35,.48,(i%2)*.35-.18,.14,['#f0b8a5','#f0d28d','#dba2bd'][i%3]);sh.scale.set(1,.45,1.2);}}else if(index===1){for(let i=0;i<6;i++)coral(g,-1.1+i*.45,0,['#ef857c','#75bea9','#eab669'][i%3],.9);}else{box(g,0,.55,0,3.2,.7,1.5,'#75573f');box(g,0,1.6,0,.1,2.5,.1,'#4d463f');const sail=cone(g,.8,1.8,0,1.2,2.4,'#f1e3c5');sail.rotation.z=-.6;}return;}
      if(course.theme==='space'){if(index===0){const p=ball(g,0,1.45,0,1.35,color);p.scale.y=.9;const r=torus(g,0,1.45,0,1.9,.09,'#d8c17a');r.rotation.x=1.1;}else if(index===1){const dome=ball(g,0,.85,0,1.55,'#7292a6');dome.scale.y=.55;box(g,0,.35,0,3,.7,2.2,'#4f5d78');for(let i=0;i<5;i++)star(g,-1+i*.5,1.4,.9,.08);}else{cylinder(g,0,1.3,0,.8,1.8,'#e4e8df');cone(g,0,3,0,.85,1.2,color);for(const x of [-.55,.55])cone(g,x,.45,0,.35,.8,'#cf775b');}return;}
      if(course.theme==='forest'||course.theme==='farm'){if(index===0){for(let i=0;i<7;i++){cylinder(g,-1.2+i*.4,.35,0,.08,.35,'#e9dfc2');cone(g,-1.2+i*.4,.9,0,.38,.45,[color,'#d77c66','#e7b45f'][i%3]);}}else if(index===1){course.theme==='farm'?facade(g,'#a8614e'):tree(g,0,0,1.4);}else{tree(g,0,0,1.1);for(let i=0;i<8;i++)star(g,-1.3+(i%4)*.85,1+(i%2)*.6,-.4+Math.floor(i/4)*.8,.08);}return;}
      if(course.theme==='castle'){if(index===0){for(let i=0;i<6;i++){cylinder(g,-1.1+i*.44,.5,0,.16,.55,'#648257');ball(g,-1.1+i*.44,1.1,0,.25,[color,'#ca7b93','#e2ba62'][i%3]);}}else if(index===1){box(g,0,.65,0,2.8,1.3,1.8,'#765a46');box(g,0,1.34,.35,2.2,.06,1.2,'#eadcb8');for(let i=0;i<5;i++)box(g,-.8+i*.4,1.4,.4,.03,.03,.8,'#8a6f57');}else{box(g,0,.7,0,2.2,1.4,1.5,'#6f587f');box(g,0,1.65,-.45,1.6,2,.35,'#8d73a0');for(const x of [-.9,.9])cylinder(g,x,1.3,0,.18,1.5,'#d1b36f');}return;}
      if(course.theme==='library'||course.theme==='museum'||course.theme==='school'){if(index===0){if(course.theme==='museum'){for(let i=0;i<7;i++){const bone=cylinder(g,-1.2+i*.38,1.1+Math.sin(i)*.25,0,.08,.55,'#e6dcc4');bone.rotation.z=1.2;}}else shelf(g,0,0,3,2.6);}else if(index===1){box(g,0,.7,0,3,1.4,1.7,'#8a684e');box(g,0,1.42,0,2.5,.08,1.3,'#ead9b2');for(let i=0;i<5;i++)box(g,-.8+i*.4,1.5,0,.22,.04,.65,['#b65d55','#5b8795','#d0a85f'][i%3]);}else{box(g,0,1.6,0,2.8,3.2,.25,color);box(g,0,1.6,.17,2.3,2.7,.05,world.window,world.window);for(const x of [-.7,0,.7])box(g,x,1.6,.25,.05,2.7,.05,'#6a5d50');}return;}
      if(course.theme==='desert'){if(index===0){const oasis=cylinder(g,0,.1,0,1.5,.12,'#4ca5a1');oasis.scale.z=.65;for(const x of [-1.5,1.4])tree(g,x,.2,.55);}else if(index===1){box(g,0,.65,0,2.8,1.3,1.8,'#765a46');box(g,0,1.35,.2,2.4,.06,1.25,'#ead7a4');}else{cone(g,0,1.45,0,2.5,2.9,color);box(g,0,.45,1.25,.65,.9,.18,'#463d36');}return;}
      if(index===0){for(let i=0;i<7;i++){cylinder(g,-1.1+i*.37,.45,0,.08,.45,'#5f8058');ball(g,-1.1+i*.37,1,0,.23,[color,'#d7899b','#efc36d'][i%3]);}}else if(index===1)shelf(g,0,0,2.9,2.4);else{box(g,0,.7,0,2.7,1.4,1.6,'#8c6649');for(let i=0;i<5;i++)ball(g,-.8+i*.4,1.55,.1,.18,['#d89a57','#8aae77','#d88172'][i%3]);}
    };
    course.objects.forEach(o=>{const g=new THREE.Group();g.position.set(o.x,0,o.z);g.userData.objectId=o.id;scene.add(g);if(o.kind==='mentor')buildMoli(g);else buildProp(g,propIndex++,o.color);label(g,o.label,o.kind==='mentor'?3.05:3.7);const ringGeo=new THREE.TorusGeometry(1.65,.045,6,40);geometries.push(ringGeo);const ring=new THREE.Mesh(ringGeo,mat(o.id===target?'#f2ca70':o.id===selected?'#99dac5':'#79897d'));ring.rotation.x=Math.PI/2;ring.position.y=.16;g.add(ring);if(o.id===target){const marker=ball(g,0,4.3,0,.16,'#ffe2a0','#ffe2a0');markers.push(marker);}g.traverse(child=>{if(child instanceof THREE.Mesh){child.userData.objectId=o.id;clickable.push(child);}});});
    if(['market','city','bakery'].includes(course.theme)){for(let i=0;i<11;i++){const x=-8+i*1.8;const y=5.4-Math.sin(i/10*Math.PI)*.8;box(scene,x,y+.38,-.3,.03,.75,.03,'#403e35');const lantern=ball(scene,x,y,-.3,.26,i%2?'#eeb763':'#d97f60','#d59a57');lantern.scale.y=.35;}}
    if(seed%2===0&&course.theme!=='space')for(let i=0;i<4;i++){const cloud=ball(scene,-7+i*4.5,7-(i%2),-9,1.05,'#dce7df');cloud.scale.set(1.6,.55,.7);}
    const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=[0,0];const hit=(e:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(clickable)[0]?.object.userData.objectId as string|undefined;};const start=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};const click=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])<8){const id=hit(e);if(id)selectRef.current(id);}};const hover=(e:PointerEvent)=>{renderer.domElement.style.cursor=hit(e)?'pointer':'grab';};
    renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',click);renderer.domElement.addEventListener('pointermove',hover);
    const resize=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(21))*Math.max(1,1.5/camera.aspect)));camera.updateProjectionMatrix();});resize.observe(el);
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;const animate=(t:number)=>{controls.update();if(!reduce.matches){markers.forEach(m=>m.position.y=4.3+Math.sin(t*.002)*.1);moliActors.forEach((m,i)=>{m.position.y=.1+Math.sin(t*.003+i)*.07;m.rotation.z=Math.sin(t*.0022+i)*.035;const head=m.children.find(c=>c.userData.moliHead);if(head)head.rotation.y=Math.sin(t*.0018)*.18;});}renderer.render(scene,camera);frame=requestAnimationFrame(animate);};frame=requestAnimationFrame(animate);
    const lost=(e:Event)=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
    return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());spriteMats.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove();};
  },[course.objects,course.warmth,course.theme,course.title,course.dna.stories,selected,target,flat]);
  const icons:Record<CourseWorld['theme'],string>= {blank:'✨',market:'🏮',bakery:'🥐',forest:'🌲',ocean:'🐚',space:'🪐',city:'🏙️',castle:'🏰',library:'📚',museum:'🏛️',farm:'🌻',school:'🏫',desert:'🏜️'};
  return <div className="market-render"><div ref={host} className="market-canvas" style={{display:flat||failed?'none':'block'}} />{(flat||failed)&&<div className="market-flat"><p>{failed?'WebGL unavailable · accessible 2D mode':`${icons[course.theme]} ${course.theme} learning map`}</p><div>{course.objects.map(o=><button key={o.id} onClick={()=>onSelect(o.id)} style={{borderColor:o.id===target?'#efc373':o.color}}><span>{o.kind==='mentor'?'🦌':icons[course.theme]}</span>{o.label}{o.id===target&&<small>Next stop</small>}</button>)}</div></div>}</div>;
}
