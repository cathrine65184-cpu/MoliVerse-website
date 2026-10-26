"use client";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CourseWorld } from '@/lib/immersive/course';

export default function MarketScene({ course, selected, target, onSelect, flat }: { course: CourseWorld; selected: string; target?: string; onSelect: (id: string) => void; flat: boolean }) {
  const host = useRef<HTMLDivElement>(null); const selectRef=useRef(onSelect); selectRef.current=onSelect;
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    if(flat || !host.current) return;
    const el=host.current; let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); } catch { setFailed(true); return; }
    setFailed(false);
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setClearColor('#182b32'); el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','Interactive 3D story world. Drag to orbit, scroll to zoom. Use the location buttons for keyboard access.');
    const scene=new THREE.Scene(); scene.fog=new THREE.Fog('#182b32',23,50);
    const camera=new THREE.PerspectiveCamera(42,1,.1,100); camera.position.set(15,15,21);
    const controls=new OrbitControls(camera,renderer.domElement); controls.target.set(1,0,0); controls.enableDamping=true; controls.maxPolarAngle=Math.PI/2.25; controls.minDistance=12; controls.maxDistance=36; controls.enablePan=false;
    scene.add(new THREE.HemisphereLight('#ffe6bd','#324947',2.6));
    const sun=new THREE.DirectionalLight(new THREE.Color().lerpColors(new THREE.Color('#e5f2ff'),new THREE.Color('#ffbf79'),course.warmth),3); sun.position.set(2,10,8); scene.add(sun);
    const materials=new Map<string,THREE.MeshStandardMaterial>(); const geometries: THREE.BufferGeometry[]=[];
    const mat=(color:string)=>{ if(!materials.has(color)) materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.82})); return materials.get(color)!; };
    const boxGeo=new THREE.BoxGeometry(1,1,1), sphereGeo=new THREE.SphereGeometry(1,12,8), cylinderGeo=new THREE.CylinderGeometry(1,1,1,12); geometries.push(boxGeo,sphereGeo,cylinderGeo);
    const box=(g:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>{ const m=new THREE.Mesh(boxGeo,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);g.add(m);return m;};
    const ball=(g:THREE.Object3D,x:number,y:number,z:number,r:number,color:string)=>{const m=new THREE.Mesh(sphereGeo,mat(color));m.position.set(x,y,z);m.scale.setScalar(r);g.add(m);return m;};
    const textures:THREE.Texture[]=[]; const spriteMats:THREE.SpriteMaterial[]=[];
    const label=(g:THREE.Object3D,text:string,y:number)=>{const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d')!;ctx.fillStyle='#fff4d8';ctx.beginPath();ctx.roundRect(0,0,512,100,25);ctx.fill();ctx.fillStyle='#3b3b35';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,62);const texture=new THREE.CanvasTexture(c); textures.push(texture);const m=new THREE.SpriteMaterial({map:texture,depthTest:false});spriteMats.push(m);const s=new THREE.Sprite(m);s.position.set(0,y,0);s.scale.set(2.8,.55,1);g.add(s);};
    box(scene,1,-.3,0,21,.6,15,'#66736c'); box(scene,1,.02,2,19,.08,5,'#c2ad8b');
    for(let x=-8;x<11;x+=1.2) for(let z=.3;z<4.4;z+=1.2) box(scene,x,.08,z,1.12,.04,1.12,((x+z)%2>1)?'#bda786':'#cab795');
    // Fictional shophouse silhouettes, decorative shutters, warm windows.
    for(let i=0;i<7;i++){const x=-8+i*3;box(scene,x,2,-6.5,2.8,4,2,['#697f76','#a38d78','#8e9d8f'][i%3]);for(let j=0;j<2;j++){box(scene,x-.65+j*1.3,2.8,-5.46,.7,1,.08,'#e5c58a');box(scene,x-.65+j*1.3,2.8,-5.39,.06,1,.04,'#6e6556');}box(scene,x,4.1,-6.5,3,.25,2.4,'#615c55');}
    const clickable: THREE.Object3D[]=[]; const markers:THREE.Mesh[]=[]; const moliActors:THREE.Group[]=[];
    course.objects.forEach(o=>{
      const g=new THREE.Group();g.position.set(o.x,0,o.z);g.userData.objectId=o.id;scene.add(g);
      if(o.kind==='mentor') {
        const deer=new THREE.Group();deer.position.set(0,.1,0);g.add(deer);moliActors.push(deer);
        const body=ball(deer,0,1.05,0,.62,'#a9c77f');body.scale.set(.78,1,.68);
        const belly=ball(deer,0,1.02,.47,.35,'#f1d98a');belly.scale.set(.8,1,.3);
        const head=new THREE.Group();head.position.set(0,1.82,.05);head.userData.moliHead=true;deer.add(head);
        const face=ball(head,0,0,0,.55,'#b8d58c');face.scale.set(1,1,.82);
        for(const side of [-1,1]){const ear=ball(head,side*.5,.18,0,.23,'#a9c77f');ear.scale.set(.7,1.25,.45);ear.rotation.z=side*.75;const eye=ball(head,side*.2,.05,.45,.09,'#152b3b');eye.scale.z=.4;}
        ball(head,0,-.12,.49,.08,'#30424b');
        for(const side of [-1,1]){const horn=box(head,side*.3,.68,0,.09,.65,.09,'#283b58');horn.rotation.z=side*.23;const branch=box(head,side*.43,.75,0,.07,.3,.07,'#283b58');branch.rotation.z=side*.8;}
        ball(head,0,.55,0,.09,'#74a956');box(head,0,.72,0,.04,.3,.04,'#5a873f');
        for(const side of [-1,1]){const leg=box(deer,side*.27,.38,0,.18,.7,.18,'#94b873');leg.rotation.z=side*.06;}
        const tail=ball(deer,0,1.2,-.55,.2,'#e9dfb8');tail.scale.set(.7,1,.5);
        label(g,'MOLI',3.05);
      }
      else {
        box(g,0,.65,0,2.6,1.3,1.65,'#946d4d');box(g,0,1.35,0,2.85,.16,1.9,'#e5c69a');
        for(const x of [-1.25,1.25])box(g,x,1.9,-.5,.1,2,.1,'#594f42');
        for(let i=0;i<8;i++){const roof=box(g,-1.4+i*.4,2.7,0,.39,.13,2.2,i%2?o.color:'#f5e7c9');roof.rotation.x=.12; box(g,-1.4+i*.4,2.48,1,.39,.35,.1,i%2?o.color:'#f5e7c9');}
        if(o.kind==='fruit'||o.kind==='ice'){for(let i=0;i<12;i++){const colors=['#eda940','#e8d273','#87ab62','#997451']; const m=ball(g,-.95+(i%4)*.63,1.6+Math.floor(i/4)*.04,-.45+Math.floor(i/4)*.4,.19,colors[i%4]); if(i%4===1)m.scale.set(.12,.12,.33);} }
        if(o.kind==='flowers'){for(let i=0;i<5;i++){box(g,-.9+i*.45,1.7,0,.04,.6,.04,'#5b8052');for(let p=0;p<5;p++)ball(g,-.9+i*.45+Math.cos(p*1.26)*.13,2+Math.sin(p*1.26)*.13,0,.12,i%2?'#dfadba':'#efcf85');}}
        if(o.kind==='books'){for(let i=0;i<8;i++){const b=box(g,-1+i*.28,1.62,0,.2,.42,.5,['#4d899d','#b66152','#dccca0'][i%3]);b.rotation.z=(i%2)*.15;}}
        label(g,o.label,3.4);
      }
      const ringGeo=new THREE.TorusGeometry(1.65,.045,6,40);geometries.push(ringGeo);const ring=new THREE.Mesh(ringGeo,mat(o.id===target?'#f2ca70':o.id===selected?'#99dac5':'#79897d'));ring.rotation.x=Math.PI/2;ring.position.y=.16;g.add(ring);
      if(o.id===target){const marker=ball(g,0,4.15,0,.16,'#ffe2a0');markers.push(marker);}
      g.traverse(child=>{if(child instanceof THREE.Mesh){child.userData.objectId=o.id;clickable.push(child);}});
    });
    for(let i=0;i<11;i++){const x=-8+i*1.8; const y=5.4-Math.sin(i/10*Math.PI)*.8;box(scene,x,y+.38,-.3,.03,.75,.03,'#403e35');const lantern=ball(scene,x,y,-.3,.26,i%2?'#eeb763':'#d97f60');lantern.scale.y=.35;box(scene,x,y-.4,-.3,.04,.2,.04,'#e5c079');}
    const wireGeo=new THREE.BufferGeometry().setFromPoints(Array.from({length:31},(_,i)=>new THREE.Vector3(-8+i*.6,5.85-Math.sin(i/30*Math.PI)*.8,-.3)));geometries.push(wireGeo);const wireMat=new THREE.LineBasicMaterial({color:'#49483e'});scene.add(new THREE.Line(wireGeo,wireMat));
    const ray=new THREE.Raycaster(), pointer=new THREE.Vector2(); let down=[0,0];
    const hit=(e:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(clickable)[0]?.object.userData.objectId as string|undefined;};
    const start=(e:PointerEvent)=>{down=[e.clientX,e.clientY];}; const click=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])<8){const id=hit(e);if(id)selectRef.current(id);}};
    const hover=(e:PointerEvent)=>{renderer.domElement.style.cursor=hit(e)?'pointer':'grab';};
    renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',click);renderer.domElement.addEventListener('pointermove',hover);
    const resize=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(21))*Math.max(1,1.5/camera.aspect)));camera.updateProjectionMatrix();});resize.observe(el);
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
    const animate=(t:number)=>{controls.update();if(!reduce.matches){markers.forEach(m=>m.position.y=4.15+Math.sin(t*.002)*.1);moliActors.forEach((m,i)=>{m.position.y=.1+Math.sin(t*.003+i)*.07;m.rotation.z=Math.sin(t*.0022+i)*.035;const head=m.children.find(c=>c.userData.moliHead);if(head)head.rotation.y=Math.sin(t*.0018)*.18;});}renderer.render(scene,camera);frame=requestAnimationFrame(animate);};frame=requestAnimationFrame(animate);
    const lost=(e:Event)=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
    return ()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());spriteMats.forEach(m=>m.dispose());wireMat.dispose();renderer.dispose();renderer.domElement.remove();};
  },[course.objects,course.warmth,selected,target,flat]);
  return <div className="market-render"><div ref={host} className="market-canvas" style={{display:flat||failed?'none':'block'}} />{(flat||failed)&&<div className="market-flat"><p>{failed?'WebGL unavailable · accessible 2D mode':'2D learning map'}</p><div>{course.objects.map(o=><button key={o.id} onClick={()=>onSelect(o.id)} style={{borderColor:o.id===target?'#efc373':o.color}}><span>{({fruit:'🥭',flowers:'🌸',books:'📚',ice:'🍧',mentor:'🦌'})[o.kind]}</span>{o.label}{o.id===target&&<small>Next stop</small>}</button>)}</div></div>}</div>;
}
