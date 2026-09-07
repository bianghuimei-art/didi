const h=Math.PI*2,e=(t,s)=>{let o=Math.imul(t+1,73244475)^Math.imul(s+17,668265261);return o^=o>>>16,o=Math.imul(o,2146121005),o^=o>>>15,o=Math.imul(o,2221713035),o^=o>>>16,((o>>>0)+.5)/4294967296},i=(t,s)=>{const o=Math.max(1e-6,e(t,s)),l=e(t,s+1);return Math.sqrt(-2*Math.log(o))*Math.cos(h*l)},p=(t,s,o,l,r)=>{const a=s*3;t[a]=o,t[a+1]=l,t[a+2]=r},v=(t,s,o,l,r,a,c=!1)=>{const n=.035+Math.sqrt(e(t,s))*.96,u=Math.floor(e(t,s+1)*3),m=c?-1:1,f=u*h/3+m*n*4.7+i(t,s+2)*.105;return[o+Math.cos(f)*n*r,l+Math.sin(f)*n*a,i(t,s+4)*(.018+n*.055)]},M=t=>{const s=e(t,3);if(s<.72)return v(t,11,-.02,.01,.9,.67);if(s<.91){const r=Math.min(2,Math.floor(e(t,17)*3)),a=[[-.43,.25],[.42,.22],[.33,-.36]],c=Math.sqrt(e(t,18))*.16,n=e(t,19)*h;return[a[r][0]+Math.cos(n)*c,a[r][1]+Math.sin(n)*c*.82,i(t,20)*.035]}const o=e(t,23)*h,l=.76+i(t,24)*.055;return[Math.cos(o)*l,Math.sin(o)*l*.72,Math.sin(o*2)*.055+i(t,26)*.018]},g=t=>{const s=e(t,31);if(s<.35)return v(t,37,-.43,.23,.3,.25);if(s<.7)return v(t,43,.43,-.23,.3,.25,!0);const o=e(t,47),l=-.39+o*.78,r=.23*(1-o)-.23*o+Math.sin(o*Math.PI)*.055,a=.012+Math.sin(o*Math.PI)*.02;return[l+i(t,48)*a,r+i(t,50)*a,Math.sin(o*Math.PI)*.12+i(t,52)*.025]},y=t=>{const s=e(t,59);if(s<.7){const a=Math.pow(e(t,61),.78),c=(e(t,62)-.5)*2,n=.03+(1-a)*.17,u=-.92+a*1.56+Math.sin(a*Math.PI*1.15)*.045,m=.23*(1-a)-.045*Math.sin(a*Math.PI*1.4);return[u+i(t,63)*.02,m+c*n+i(t,64)*.02,Math.sin(a*Math.PI)*.12+c*.038+i(t,65)*.026]}if(s<.9){const a=e(t,71)*h,c=Math.sqrt(e(t,72))*.24;return[.62+Math.cos(a)*c*1.08+i(t,73)*.014,-.015+Math.sin(a)*c*.72+i(t,74)*.014,Math.sin(a*1.7)*.045+i(t,75)*.022]}const o=Math.pow(e(t,81),.72),l=e(t,82)*h,r=(1-o)*.12+.018;return[.72+o*.3+i(t,83)*.018,-.015+Math.cos(l)*r*.68,Math.sin(l)*r*.68+i(t,84)*.018]},P=t=>{const s=e(t,79);if(s<.66){const r=Math.min(2,Math.floor(e(t,81)*3)),a=e(t,82)*h+r*.58,n=[.36,.59,.82][r]+i(t,83)*(.028+r*.008),u=[-.14,.06,.18][r],m=Math.cos(a)*n*(.98-r*.035),f=Math.sin(a)*n*(.58+r*.055);return[.04+m+f*Math.sin(u),-.01+f*Math.cos(u),Math.sin(a*1.8+r)*(.045+r*.022)+i(t,84)*.024]}if(s<.8){const r=Math.sqrt(e(t,89))*.23,a=e(t,90)*h;return[.04+Math.cos(a)*r*1.02,-.01+Math.sin(a)*r*.82,i(t,91)*.04]}if(s<.94){const r=Math.min(2,Math.floor(e(t,101)*3)),a=[[.57,.4],[.7,-.02],[.54,-.4]],c=Math.sqrt(e(t,102))*.14,n=e(t,103)*h;return[a[r][0]+Math.cos(n)*c*1.12,a[r][1]+Math.sin(n)*c*.72,(r-1)*.11+i(t,104)*.035]}const o=Math.sqrt(e(t,105))*.2,l=e(t,106)*h;return[.04+Math.cos(l)*o*1.06,-.01+Math.sin(l)*o*.78,i(t,107)*.038]};function A(t){const s=Math.max(1,Math.floor(t)),o=new Float32Array(s*3),l=new Float32Array(s*3),r=new Float32Array(s*3),a=new Float32Array(s*3),c=new Float32Array(s*4);for(let n=0;n<s;n++){p(o,n,...M(n)),p(l,n,...g(n)),p(r,n,...y(n)),p(a,n,...P(n));const u=n*4,m=Math.pow(e(n,113),8);c[u]=.68+e(n,109)*.44+m*.72,c[u+1]=e(n,110),c[u+2]=.55+e(n,111)*.45,c[u+3]=e(n,112)}return{count:s,memory:o,connection:l,action:r,evolution:a,meta:c}}const b=`
precision highp float;
attribute vec3 aMemory;
attribute vec3 aConnection;
attribute vec3 aAction;
attribute vec3 aEvolution;
attribute vec4 aMeta;
uniform vec2 uRes;
uniform float uTime;
uniform float uScene;
uniform float uProgress;
uniform float uVelocity;
uniform float uDpr;
uniform float uPass;
uniform float uReduced;
varying float vAlpha;
varying float vTone;
varying float vEnergy;
varying float vTrail;
varying vec2 vDirection;

float ease01(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * (3.0 - 2.0 * x);
}
mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c,-s,s,c);
}
void main() {
  float stage = min(clamp(uProgress,0.0,1.0)*3.0,2.9999);
  float segment = floor(stage);
  float local = fract(stage);
  // 第一组不是直接“亮出来”：在用户刚进入能力舞台时，星尘先散在
  // 记忆旋臂之外，再沿深度和切向方向收束。后续形态保留更利落的跃迁。
  float morph = segment < 0.5
    ? ease01(smoothstep(0.70,0.98,local))
    : ease01(smoothstep(0.54,0.90,local));
  vec3 fromP;
  vec3 toP;
  if (segment < 0.5) {
    fromP = aMemory;
    toP = aConnection;
  } else if (segment < 1.5) {
    fromP = aConnection;
    toP = aAction;
  } else {
    fromP = aAction;
    toP = aEvolution;
  }

  float transit = sin(morph*3.14159265) * (1.0-uReduced*0.55);
  float depthLane = (aMeta.w-0.5)*2.0;
  vec3 position = mix(fromP,toP,morph);
  // 粒子首次可见由能力章节的 scene 交接驱动，而不是能力卡片的局部
  // progress。后者在快速滚动或恢复位置时可能已经跳过 0，导致没有入场。
  float firstAppear = uReduced > 0.5
    ? 1.0
    : smoothstep(1.58,2.02,uScene);
  float appearStage = segment < 0.5 ? firstAppear : 1.0;
  vec3 burstDirection = normalize(vec3(
    sin(aMeta.w*31.7+aMeta.y*4.0),
    cos(aMeta.w*27.4+aMeta.y*5.7),
    (aMeta.w-0.5)*1.8 + 0.0001
  ));
  vec3 dispersed = fromP*1.42 + burstDirection*(0.30+abs(depthLane)*0.23);
  dispersed.z -= 0.54 + abs(depthLane)*0.22;
  position = mix(dispersed,position,appearStage);
  transit *= appearStage;
  position.z += transit*(0.18+depthLane*1.12);
  vec2 flightAxis = segment < 0.5 ? vec2(0.88,0.48)
                  : segment < 1.5 ? vec2(-0.34,0.94)
                  : vec2(0.72,-0.69);
  position.xy += flightAxis*depthLane*transit*0.12;
  position.xy *= 1.0+transit*(0.08+abs(depthLane)*0.10);
  position.xy *= rot((segment-1.0)*transit*0.075);

  // 旋臂保持极慢自转，周期约 8.7 分钟；它只改变星系自身的朝向，
  // 不叠加滚动速度，因此停住页面后仍然是呼吸式流动，而不是抖动。
  float abilitySpin = uReduced > 0.5 ? 0.0 : uTime * 0.012;
  position.xy = rot(abilitySpin) * position.xy;

  float ambient = (1.0-uReduced)*0.006;
  position.xy += vec2(
    sin(uTime*0.095+aMeta.w*6.2831853),
    cos(uTime*0.081+aMeta.w*5.31)
  )*ambient;

  float camera = 3.25;
  float perspective = camera/max(0.92,camera-position.z);
  vec2 projected = position.xy*perspective;
  float portrait = smoothstep(0.90,0.60,uRes.x/uRes.y);
  vec2 center = mix(vec2(0.355,0.018),vec2(0.0,0.052),portrait);
  float scale = mix(0.615,0.525,portrait);
  vec2 uv = center+projected*vec2(scale,scale*mix(0.82,0.94,portrait));
  float minRes = min(uRes.x,uRes.y);
  gl_Position = vec4(uv*2.0*minRes/uRes,clamp(position.z/camera,-0.95,0.95),1.0);

  float enter = smoothstep(1.58,1.96,uScene);
  float leave = 1.0-smoothstep(3.56,3.96,uScene);
  float presence = enter*leave*mix(0.08,1.0,appearStage);
  float trail = transit*(1.15+abs(depthLane)*0.95)+uVelocity*0.55;
  float passScale = mix(3.05,1.0,uPass);
  float pointSize = aMeta.x*uDpr*passScale*perspective*(1.0+trail*0.32);
  float minimumSize = mix(2.20,1.15,uPass)*uDpr;
  gl_PointSize = min(9.0*uDpr,max(minimumSize,pointSize));
  vAlpha = presence;
  vTone = aMeta.y;
  vEnergy = aMeta.z;
  vTrail = trail;
  vDirection = normalize(flightAxis+position.xy*transit*0.35+vec2(0.0001));
}
`,R=`
precision highp float;
uniform float uPass;
varying float vAlpha;
varying float vTone;
varying float vEnergy;
varying float vTrail;
varying vec2 vDirection;
void main() {
  vec2 point = gl_PointCoord*2.0-1.0;
  vec2 direction = normalize(vDirection);
  vec2 normal = vec2(-direction.y,direction.x);
  float along = dot(point,direction)/(1.0+vTrail*0.72);
  float across = dot(point,normal)*(1.0+vTrail*0.10);
  float radius = length(vec2(along,across));
  float glow = exp(-radius*radius*3.6);
  float core = 1.0-smoothstep(0.10,0.82,radius);
  float alpha = mix(glow*0.13,core*0.86,uPass)*vAlpha*vEnergy;
  if (alpha < 0.003) discard;

  vec3 blue = vec3(0.53,0.69,1.0);
  vec3 ice = vec3(0.80,0.88,1.0);
  vec3 neutral = vec3(0.94,0.96,1.0);
  vec3 color = mix(blue,ice,smoothstep(0.08,0.70,vTone));
  color = mix(color,neutral,smoothstep(0.68,0.98,vTone));
  color *= mix(0.62,1.0,uPass);
  gl_FragColor = vec4(color,alpha);
}
`;export{R as ABILITY_PARTICLE_FRAG_SRC,b as ABILITY_PARTICLE_VERT_SRC,A as createAbilityParticleData};
