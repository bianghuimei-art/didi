const e=`
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScene;
uniform float uVelocity;
uniform float uFlowPhase;
uniform float uQuality;
uniform float uHeroHandoff;
uniform float uWorkProgress;

float sat(float x) { return clamp(x, 0.0, 1.0); }
float ease01(float x) { x = sat(x); return x * x * (3.0 - 2.0 * x); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }
float hash21(vec2 p) {
  p = fract(p * vec2(123.34,456.21));
  p += dot(p,p + 45.32);
  return fract(p.x * p.y);
}
vec2 hash22(vec2 p) {
  float n = hash21(p);
  return vec2(n,hash21(p+n+19.19));
}
float noise2(vec2 p) {
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash21(i),hash21(i+vec2(1.0,0.0)),f.x),
             mix(hash21(i+vec2(0.0,1.0)),hash21(i+vec2(1.0,1.0)),f.x),f.y);
}
float starLayer(vec2 p, vec2 tangent, float scale, float seed, float stretch) {
  vec2 id=floor(p*scale), gv=fract(p*scale)-0.5;
  vec2 d=gv-(hash22(id+seed)-0.5)*0.70;
  vec2 radial=vec2(-tangent.y,tangent.x);
  float along=dot(d,tangent)/(1.0+stretch);
  float across=dot(d,radial)*(1.0+stretch*0.06);
  float rnd=hash21(id+seed*3.17);
  float rare=smoothstep(0.968,0.998,rnd);
  float radius=mix(0.082,0.15,rare);
  float core=1.0-smoothstep(0.018,radius,length(vec2(along,across)));
  float fade=smoothstep(0.0,0.11,0.5-max(abs(gv.x),abs(gv.y)));
  return step(0.89,rnd)*fade*core*mix(0.42,1.0,rnd);
}
vec3 stars(vec2 p, vec2 tangent, float stretch) {
  vec2 drift=vec2(uTime*0.0020,-uTime*0.0012);
  float a=starLayer(p+drift+uMouse*0.012,tangent,34.0,2.4,stretch);
  vec2 p2=rot(0.31)*p-drift*0.72-uMouse*0.006;
  float b=starLayer(p2,rot(0.31)*tangent,58.0,7.1,stretch*0.62);
  return vec3(0.48,0.69,1.0)*a*0.80+vec3(0.90,0.94,1.0)*b*0.58;
}
float sdSeg(vec2 a,vec2 b,vec2 p) {
  vec2 pa=p-a,ba=b-a;
  float h=sat(dot(pa,ba)/max(dot(ba,ba),0.00001));
  return length(pa-ba*h);
}

void main() {
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/min(uRes.x,uRes.y);
  vec3 bg=vec3(0.0196,0.0196,0.0471);
  float handoff=ease01(uHeroHandoff);
  float work=ease01(uWorkProgress);
  float portrait=smoothstep(0.90,0.60,uRes.x/uRes.y);
  vec2 q=uv+uMouse*mix(0.009,0.004,handoff);
  float phase=uTime*0.020+uFlowPhase*0.54+handoff*0.92;
  float r=length(q);
  vec2 radial=normalize(q+vec2(0.0001));
  float jump=smoothstep(0.015,0.62,handoff);

  // 外部镜头进入第一章时，星流继续沿中心方向加速，保持与 Hero Lens 同源。
  float bend=(noise2(radial*1.9+phase*0.06)-0.5)
            *(0.035+jump*0.06)*mix(0.65,1.0,uQuality);
  vec2 warped=rot(bend)*q*mix(1.92,2.56,smoothstep(0.08,0.86,handoff));
  warped+=radial*(phase*0.018+jump*0.075);
  float stretch=0.12+jump*2.8+uVelocity*1.7;
  vec3 col=bg+stars(warped,radial,stretch)*0.42*mix(0.38,1.0,smoothstep(0.14,0.74,r));
  float lane=smoothstep(0.58,0.79,
    noise2(radial*2.6+vec2(r*2.1-phase*0.18,phase*0.06)));
  float doppler=0.5+0.5*cos(atan(q.y,q.x)-0.42);
  col+=mix(vec3(0.17,0.38,0.82),vec3(0.74,0.39,0.24),doppler)
      *lane*smoothstep(0.20,1.04,r)*(0.018+jump*0.052);

  // 工作态不是额外的图标，而是一个沿球面推进的压缩前沿。
  float contraction=smoothstep(0.18,0.76,work);
  float radius=mix(mix(0.76,0.82,portrait),mix(0.235,0.215,portrait),handoff);
  float stretchX=1.0+contraction*0.54;
  float stretchY=1.0-contraction*0.20;
  vec2 bodyUV=(q-vec2(contraction*0.06,0.0))/max(radius,0.001);
  vec2 shapeUV=bodyUV/vec2(stretchX,stretchY);
  float br=length(shapeUV);
  vec2 bodyRadial=normalize(shapeUV+vec2(0.0001));
  vec2 tangent=vec2(-bodyRadial.y,bodyRadial.x);
  float limb=exp(-pow((br-0.82)/0.17,2.0));
  float twist=uTime*0.010+limb*(uTime*0.042+uFlowPhase*1.18);
  vec2 sphereUV=rot(twist)*shapeUV*(1.0+limb*(0.34+contraction*0.20));
  float starStretch=limb*(1.25+uVelocity*2.0+contraction*0.92);
  vec3 body=vec3(0.0060,0.0090,0.0240)
           +stars(sphereUV,tangent,starStretch)*mix(0.27,1.10,limb);

  float frontX=mix(-0.86,0.86,work);
  float front=exp(-pow((shapeUV.x-frontX+shapeUV.y*0.18)/0.23,2.0));
  float tail=exp(-pow((shapeUV.x-frontX+0.36)/0.44,2.0))*0.20;
  float breakUp=smoothstep(0.42,0.72,
    noise2(bodyRadial*3.1+vec2(phase*0.08,-phase*0.045)));
  vec3 frontColor=mix(vec3(0.28,0.42,0.92),vec3(0.44,0.30,0.76),
                      smoothstep(-0.55,0.65,shapeUV.x));
  body+=frontColor*(front*0.17+tail*0.052)*breakUp;
  body+=mix(vec3(0.20,0.38,0.82),vec3(0.48,0.28,0.70),doppler)
        *exp(-pow((br-0.80)/0.16,2.0))*breakUp*(0.10+uVelocity*0.055);
  body+=mix(vec3(0.28,0.50,0.96),vec3(0.62,0.36,0.78),doppler)
        *smoothstep(0.63,0.995,br)*breakUp*0.075;

  // 指令开始被推入后，双眼和静态轮廓逐步让位给工作流。
  float eyeVisible=(1.0-smoothstep(0.035,0.16,uWorkProgress))
                  *(1.0-smoothstep(1.08,1.36,uScene));
  vec2 ep=shapeUV-uMouse*vec2(0.055,0.04);
  float leftEye=sdSeg(vec2(-0.27,-0.09),vec2(-0.27,0.09),ep)-0.032;
  float rightEye=min(sdSeg(vec2(0.27,0.0),vec2(0.39,0.09),ep),
                     sdSeg(vec2(0.27,0.0),vec2(0.39,-0.09),ep))-0.032;
  body+=vec3(0.70,0.79,1.0)
       *(1.0-smoothstep(0.0,0.018,min(leftEye,rightEye)))*eyeVisible*0.28;

  float mask=1.0-smoothstep(0.987,1.005,br);
  // 与 Hero / Full Lens 共用球体出现门控。Work Lens 可能在首屏仍处于
  // 后台接管阶段，此时 uScene=0、uHeroHandoff=0，不能提前绘制一颗
  // 完整球体，否则切换到该材质时会短暂闪出虫洞。
  // 第一组星尘从远处聚合时，同步把工作虫洞和背景星表交还给纯深空底场。
  // 到 Scene 2.0 两者都已经完全退场，切换到 Galaxy Base 时像素完全一致。
  float abilityHandoff=smoothstep(1.58,2.0,uScene);
  float surface=smoothstep(0.38,0.82,uHeroHandoff)
              +smoothstep(0.04,0.18,uScene);
  surface=sat(surface)*(1.0-abilityHandoff);
  // 镜头退出 Hero 后，轮廓外的全屏星表必须同步退场；否则背景星点会穿过
  // 球体边缘，抹平虫洞的剪影和通透壳层。
  col=mix(col,bg,smoothstep(0.56,0.94,handoff));
  col=mix(col,body,mask*surface);
  col=mix(col,bg,abilityHandoff);
  gl_FragColor=vec4(col,1.0);
}
`,o=e;export{e as WORK_FALLBACK_FRAG_SRC,o as WORK_FALLBACK_FRAG_SRC_WINDOWS};
