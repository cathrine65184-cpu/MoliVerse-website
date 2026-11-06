// Three small curved sheets, drawn directly into a transparent foreground layer.
// No copies of the hero artwork and no full-viewport postprocessing texture.
const vertex = `
attribute vec2 uv;
uniform float time, seed;
uniform vec2 size;
varying vec2 paper;
varying float fade;
void main(){
  float travel=fract(time/19.+seed*.37);
  float angle=time*.43+seed*1.9;
  float y=uv.y;
  float x=uv.x*sin(3.14159*y)*4.2;
  float z=(uv.x*uv.x*.9+sin(y*3.14159)*1.1);
  vec2 sheet=vec2(x*cos(angle)+z*sin(angle),(y-.5)*11.);
  float roll=sin(angle*.7)*.55;
  sheet=mat2(cos(roll),sin(roll),-sin(roll),cos(roll))*sheet;
  vec2 center=vec2(.57+.115*seed+.065*sin(time*.19+seed),.16+.68*travel);
  vec2 clip=(center+sheet/size)*2.-1.;
  gl_Position=vec4(clip.x,-clip.y,0.,1.);
  paper=uv;fade=smoothstep(.0,.15,travel)*(1.-smoothstep(.82,1.,travel))*.63;
}`;
const fragment = `
precision mediump float;
varying vec2 paper;
varying float fade;
float pigment(vec2 p){
  return .48+.18*sin(p.x*4.+p.y*3.)+.12*cos(p.y*13.)+.04*sin(37.*p.x+19.*p.y);
}
// Local Kuwahara-style smoothing: choose the least-variable quadrant of the
// procedural pigment field, only on the petal fragments (never over the page).
void main(){
  float best=10.,ink=.5;
  for(int q=0;q<4;q++){
    vec2 dir=vec2(mod(float(q),2.)*2.-1.,q<2?-1.:1.)*.045;
    float a=pigment(paper),b=pigment(paper+vec2(dir.x,0.));
    float c=pigment(paper+vec2(0.,dir.y)),d=pigment(paper+dir);
    float mean=(a+b+c+d)*.25;
    float variance=dot(vec4(a,b,c,d)-mean,vec4(a,b,c,d)-mean);
    if(variance<best){best=variance;ink=mean;}
  }
  vec3 colour=mix(vec3(.79,.52,.53),vec3(1.,.89,.81),ink);
  gl_FragColor=vec4(colour,fade*(1.-smoothstep(.82,1.,abs(paper.x))));
}`;

export function createPetals(canvas:HTMLCanvasElement) {
  const gl=canvas.getContext("webgl",{alpha:true,antialias:false,depth:false,premultipliedAlpha:false,powerPreference:"low-power"});
  if(!gl)return null;
  const program=gl.createProgram(),buffer=gl.createBuffer();
  let timer=0,last=0,elapsed=0;
  const clear=()=>{window.clearTimeout(timer);timer=0;last=0};
  function dispose(){clear();gl?.deleteBuffer(buffer);gl?.deleteProgram(program);gl?.getExtension("WEBGL_lose_context")?.loseContext()}
  if(!program||!buffer){dispose();return null}
  for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const){
    const shader=gl.createShader(type);
    if(!shader){dispose();return null}
    gl.shaderSource(shader,source);gl.compileShader(shader);gl.attachShader(program,shader);gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){dispose();return null}
  const mesh:number[]=[];
  for(let j=0;j<=10;j++)mesh.push(-1,j/10,1,j/10);
  gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh),gl.STATIC_DRAW);
  const attr=gl.getAttribLocation(program,"uv");
  gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  const time=gl.getUniformLocation(program,"time"),size=gl.getUniformLocation(program,"size"),seed=gl.getUniformLocation(program,"seed");
  function draw(){
    if(!gl||gl.isContextLost()){clear();return}
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h){clear();return}
    const ratio=Math.min(1,1280/w);
    const rw=Math.max(1,Math.round(w*ratio)),rh=Math.max(1,Math.round(h*ratio));
    if(canvas.width!==rw||canvas.height!==rh){canvas.width=rw;canvas.height=rh;gl.viewport(0,0,rw,rh)}
    gl.clear(gl.COLOR_BUFFER_BIT);const now=performance.now();if(last)elapsed+=Math.min(now-last,100)/1000;last=now;
    gl.uniform2f(size,w,h);gl.uniform1f(time,elapsed);
    for(let i=0;i<3;i++){gl.uniform1f(seed,i);gl.drawArrays(gl.TRIANGLE_STRIP,0,mesh.length/2)}
    timer=window.setTimeout(draw,66);
  }
  return {run(on:boolean){if(on&&!timer)draw();else if(!on)clear()},dispose};
}
