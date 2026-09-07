const e=`
precision mediump float;
uniform vec2 uRes;
void main() {
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/min(uRes.x,uRes.y);
  vec3 bg=vec3(5.0,5.0,12.0)/255.0;
  float vignette=1.0-0.32*pow(length(uv*vec2(0.8,1.0)),2.2);
  gl_FragColor=vec4(bg*max(0.70,vignette),1.0);
}
`,o=e;export{e as GALAXY_FRAG_SRC,o as GALAXY_FRAG_SRC_WINDOWS};
