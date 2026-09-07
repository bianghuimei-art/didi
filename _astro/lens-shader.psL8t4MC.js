const e=`
#define LX_LENS_ONLY 1
#ifndef LX_COMPILE_FAST
#define LX_COMPILE_FAST 0
#endif
#ifndef LX_FBM_OCTAVES
#define LX_FBM_OCTAVES 3
#endif
#ifndef LX_RAY_STEPS
#define LX_RAY_STEPS 36
#endif
#ifndef LX_LENS_ONLY
#define LX_LENS_ONLY 0
#endif
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform float uMode;
uniform float uScene;
uniform float uVelocity;
uniform float uFlowPhase;
uniform float uQuality;
uniform float uHeroReveal;
uniform float uHeroHandoff;
uniform float uWorkProgress;
uniform float uAbilityProgress;
uniform float uParticleMode;
float hash(vec3 p) {
p = fract(p * 0.3183099 + 0.1);
p *= 17.0;
return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
vec3 i = floor(x), f = fract(x);
f = f * f * (3.0 - 2.0 * f);
return mix(
mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
float a = 0.5, r = 0.0;
for (int i = 0; i < LX_FBM_OCTAVES; i++) {
r += a * noise(p);
p *= 2.02;
a *= 0.5;
}
return r;
}
mat2 rot(float a) {
float c = cos(a), s = sin(a);
return mat2(c, -s, s, c);
}
float ease01(float x) {
x = clamp(x, 0.0, 1.0);
return x * x * (3.0 - 2.0 * x);
}
float scenePhase(float start) {
return ease01(clamp(uScene - start, 0.0, 1.0));
}
float abilityWindow() {
float enter = smoothstep(1.76, 2.02, uScene);
float leave = 1.0 - smoothstep(2.76, 3.02, uScene);
return enter * leave;
}
float abilityFocus(float index) {
float stage = clamp(uAbilityProgress, 0.0, 1.0) * 3.0;
return abilityWindow() * (1.0 - smoothstep(0.30, 0.78, abs(stage - index)));
}
float workSequenceWindow() {
float enter = smoothstep(0.055, 0.13, uWorkProgress);
float leave = 1.0 - smoothstep(0.86, 0.94, uWorkProgress);
return enter * leave;
}
float workReportMode() {
return 1.0 - smoothstep(0.25, 0.43, uWorkProgress);
}
float workDeckMode() {
return smoothstep(0.60, 0.68, uWorkProgress);
}
float workDataMode() {
return max(0.0, 1.0 - workReportMode() - workDeckMode());
}
float workBeat(float start, float end) {
float feather = min(0.042, (end - start) * 0.20);
return smoothstep(start, start + feather, uWorkProgress)
* (1.0 - smoothstep(end - feather, end, uWorkProgress));
}
vec2 workState() {
float b0 = workBeat(0.045, 0.305);
float b1 = workBeat(0.330, 0.615);
float b2 = workBeat(0.625, 0.910);
float total = b0 + b1 + b2;
float l0 = clamp((uWorkProgress - 0.045) / 0.260, 0.0, 1.0);
float l1 = clamp((uWorkProgress - 0.330) / 0.285, 0.0, 1.0);
float l2 = clamp((uWorkProgress - 0.625) / 0.285, 0.0, 1.0);
float local = (b0 * l0 + b1 * l1 + b2 * l2) / max(total, 0.0001);
return vec2(clamp(total, 0.0, 1.0), local);
}
float smin(float a, float b, float k) {
float h = clamp(0.5 + 0.5 * (b - a) / max(k, 0.0001), 0.0, 1.0);
return mix(b, a, h) - k * h * (1.0 - h);
}
float smax(float a, float b, float k) {
return -smin(-a, -b, k);
}
float sdEllipsoid(vec3 p, vec3 r) {
float k0 = length(p / r);
float k1 = max(length(p / (r * r)), 0.0001);
return k0 * (k0 - 1.0) / k1;
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float radius) {
vec3 pa = p - a;
vec3 ba = b - a;
float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
return length(pa - ba * h) - radius;
}
vec3 orientBody(vec3 p) {
vec3 q = p;
float t = uTime * 0.22;
float facing = sin(t * 0.36) * 0.025;
q.xy *= rot(facing);
#if !LX_COMPILE_FAST && !LX_LENS_ONLY
float ability = abilityWindow();
vec3 path = abilitySpatialPath();
vec3 angle = abilitySpatialAngle();
q -= path * ability;
q.xy *= rot(angle.x * ability);
q.yz *= rot(angle.y * ability);
q.xz *= rot(angle.z * ability);
#endif
return q;
}
float shapeHero(vec3 q) {
float breathe = 1.0 + 0.026 * sin(uTime * 0.68);
float soft = 0.012 * sin(uTime * 0.41);
return sdEllipsoid(q, 1.05 * breathe * vec3(1.0 + soft, 1.0 - soft, 1.0));
}
float shapeThroat(vec3 q) {
float settle = scenePhase(0.0);
vec2 work = workState();
float working = work.x;
float local = work.y;
float breathe = 1.0 + 0.018 * sin(uTime * 0.61 + 0.8)
+ working * 0.003 * sin(local * 3.14159265);
float depth = mix(1.0, 1.06, settle);
float sphere = sdEllipsoid(q, breathe * vec3(1.055, 1.035, 1.04 * depth));
float travel = ease01(local);
float envelope = pow(max(sin(local * 3.14159265), 0.0), 0.72);
float frontX = mix(-0.92, 0.92, travel);
vec3 foldedP = q;
float foldCoord = foldedP.x - frontX + foldedP.y * 0.20;
float crease = exp(-pow(foldCoord / 0.305, 2.0));
float wake = exp(-pow((foldCoord + 0.44) / 0.48, 2.0));
float lead = exp(-pow((foldCoord - 0.40) / 0.50, 2.0));
float crossY = 1.0 + envelope
* (crease * 0.52 - wake * 0.18 - lead * 0.10);
float crossZ = 1.0 + envelope
* (crease * 0.40 - wake * 0.14 - lead * 0.07);
foldedP.y *= crossY;
foldedP.z *= crossZ;
foldedP.x += envelope * crease * (foldedP.y * 0.12 - foldedP.z * 0.045);
foldedP.y += envelope * crease * (0.105 + foldedP.x * 0.040);
foldedP.yz *= rot(envelope * crease * 0.12);
float tidalFold = sdEllipsoid(
foldedP,
breathe * vec3(1.055 * (1.0 + envelope * 0.045), 1.035, 1.04 * depth)
);
return mix(sphere, tidalFold, working);
}
float shapeWormhole(vec3 q) {
float progress = scenePhase(1.0);
float pulse = sin(uTime * 0.43 + progress * 1.7) * 0.012;
float squash = mix(1.0, 1.035, progress);
return sdEllipsoid(q, vec3(1.06 + pulse, 1.04 - pulse * 0.55, 1.08 * squash));
}
float mapBase(vec3 p) {
vec3 q = orientBody(p);
float stage = clamp(uScene, 0.0, 7.0);
float f = ease01(fract(stage));
float a;
float b;
#if LX_LENS_ONLY
if (stage < 1.0) {
a = shapeHero(q); b = shapeThroat(q);
} else {
a = shapeThroat(q); b = shapeWormhole(q);
}
return mix(a, b, f);
#else
if (stage < 1.0) {
a = shapeHero(q); b = shapeThroat(q);
} else if (stage < 2.0) {
a = shapeThroat(q); b = shapeWormhole(q);
} else if (stage < 3.0) {
a = shapeWormhole(q); b = shapeAction(q);
} else if (stage < 4.0) {
a = shapeAction(q); b = shapeConnection(q);
} else if (stage < 5.0) {
a = shapeConnection(q); b = shapeMemory(q);
} else if (stage < 6.0) {
a = shapeMemory(q); b = shapeEvolution(q);
} else if (stage < 7.0) {
a = shapeEvolution(q); b = shapeFinal(q);
} else {
a = shapeFinal(q); b = a;
}
float narrativeShape = mix(a, b, f);
#if !LX_COMPILE_FAST
float ability = abilityWindow();
if (ability > 0.001) {
return mix(narrativeShape, shapeAbility(q), ability);
}
#endif
return narrativeShape;
#endif
}
float mapShape(vec3 p) {
return mapBase(p) * 0.55;
}
float mapBump(vec3 p) {
vec3 q = orientBody(p);
float t = uTime * 0.22;
float base = mapBase(p);
float ripple = 0.00035 * sin(q.x * 4.7 + t * 0.42) * sin(q.y * 4.1 - t * 0.36);
return (base + ripple) * 0.55;
}
float shapeBoundRadius() {
#if LX_LENS_ONLY
return 1.72;
#else
float stage = clamp(uScene, 0.0, 7.0);
if (stage < 1.0) return 1.72;
if (stage < 2.0) return 1.72;
if (stage < 3.0) return 2.08;
if (stage < 4.0) return 2.08;
if (stage < 5.0) return 1.82;
if (stage < 6.0) return 1.72;
if (stage < 7.0) return 1.72;
return 1.24;
#endif
}
vec3 norm(vec3 p) {
#if LX_COMPILE_FAST
return normalize(orientBody(p));
#else
vec2 e = vec2(1.0, -1.0) * 0.0018;
return normalize(
e.xyy * mapBump(p + e.xyy) +
e.yyx * mapBump(p + e.yyx) +
e.yxy * mapBump(p + e.yxy) +
e.xxx * mapBump(p + e.xxx)
);
#endif
}
float sdSeg(vec2 a, vec2 b, vec2 p) {
vec2 pa = p - a, ba = b - a;
float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
return length(pa - ba * h);
}
float blinkEnv(float t) {
t = clamp(t, 0.0, 1.0);
float close = smoothstep(0.0, 0.28, t);
float open = 1.0 - smoothstep(0.34, 1.0, t);
return min(close, open);
}
vec3 lxBackground(vec2 q) {
vec3 bgInk = vec3(5.0, 5.0, 12.0) / 255.0;
vec3 bgPaper = vec3(246.0, 248.0, 252.0) / 255.0;
return mix(bgInk, bgPaper, uMode);
}
float hash21(vec2 p) {
p = fract(p * vec2(123.34, 456.21));
p += dot(p, p + 45.32);
return fract(p.x * p.y);
}
vec2 hash22(vec2 p) {
float n = hash21(p);
return vec2(n, hash21(p + n + 19.19));
}
vec3 lxSpectrum(float t) {
vec3 coral = vec3(0.933, 0.271, 0.396);
vec3 magenta = vec3(0.698, 0.176, 0.792);
vec3 violet = vec3(0.498, 0.341, 0.922);
vec3 blue = vec3(0.243, 0.478, 0.894);
vec3 teal = vec3(0.290, 0.663, 0.608);
vec3 amber = vec3(0.835, 0.584, 0.047);
float x = fract(t) * 6.0;
float f = smoothstep(0.0, 1.0, fract(x));
if (x < 1.0) return mix(coral, magenta, f);
if (x < 2.0) return mix(magenta, violet, f);
if (x < 3.0) return mix(violet, blue, f);
if (x < 4.0) return mix(blue, teal, f);
if (x < 5.0) return mix(teal, amber, f);
return mix(amber, coral, f);
}
float starLayer(vec2 p, vec2 tangent, float scale, float seed, float stretch) {
vec2 id = floor(p * scale);
vec2 gv = fract(p * scale) - 0.5;
vec2 offset = (hash22(id + seed) - 0.5) * 0.72;
vec2 d = gv - offset;
float rnd = hash21(id + seed * 3.17);
float arcRnd = hash21(id.yx + vec2(seed * 5.73, seed * 2.11));
vec2 radial = vec2(-tangent.y, tangent.x);
float arcGate = smoothstep(0.76, 0.985, arcRnd);
float localStretch = stretch * mix(0.24, 1.0, arcGate);
float along = dot(d, tangent) / (1.0 + localStretch);
float across = dot(d, radial) * (1.0 + localStretch * 0.08);
float starD = length(vec2(along, across));
float rare = smoothstep(0.965, 0.998, rnd);
float coreRadius = mix(0.098, 0.165, rare);
float core = 1.0 - smoothstep(0.022, coreRadius, starD);
float glow = 1.0 - smoothstep(coreRadius * 0.76, coreRadius * 1.92, starD);
float rayT = (1.0 - smoothstep(0.0, 0.023, abs(across)))
* (1.0 - smoothstep(0.07, 0.28, abs(along)));
float rayR = (1.0 - smoothstep(0.0, 0.023, abs(along)))
* (1.0 - smoothstep(0.06, 0.22, abs(across)));
float presence = step(0.885, rnd);
float cellEdge = 0.5 - max(abs(gv.x), abs(gv.y));
float cellFade = smoothstep(0.0, 0.115, cellEdge);
float shimmer = 0.98 + 0.02 * sin(uTime * 0.22 + rnd * 6.2831853 + seed);
return presence * cellFade
* (core + glow * 0.16 + (rayT + rayR) * (0.012 + rare * 0.10))
* mix(0.42, 1.0, rnd) * shimmer;
}
float eyeParticleLayer(vec2 p, float scale, float seed) {
vec2 id = floor(p * scale);
vec2 gv = fract(p * scale) - 0.5;
vec2 offset = (hash22(id + seed) - 0.5) * 0.64;
float rnd = hash21(id + seed * 2.73);
float d = length(gv - offset);
float core = 1.0 - smoothstep(0.038, 0.145, d);
float halo = 1.0 - smoothstep(0.09, 0.24, d);
float cellEdge = 0.5 - max(abs(gv.x), abs(gv.y));
float cellFade = smoothstep(0.0, 0.10, cellEdge);
return step(0.60, rnd) * cellFade * (core + halo * 0.16)
* mix(0.62, 1.0, rnd);
}
vec3 starField(vec2 p, vec2 tangent, float stretch) {
vec2 drift = vec2(uTime * 0.0022, -uTime * 0.0013);
vec2 nearP = p + drift + uMouse * 0.020;
vec2 midP = p * rot(0.31) - drift * 0.7 - uMouse * 0.009;
vec2 farP = p * rot(-0.18) + drift * 1.4 + uMouse * 0.0035;
float a = starLayer(nearP, tangent, 32.0, 2.4, stretch);
float b = starLayer(midP, tangent * rot(-0.31), 56.0, 7.1, stretch * 0.72);
#if LX_COMPILE_FAST
vec3 cold = vec3(0.46, 0.70, 1.0) * a * 1.12;
vec3 neutral = vec3(0.90, 0.94, 1.0) * b * 0.82;
return cold + neutral;
#else
float c = starLayer(farP, tangent * rot(0.18), 88.0, 13.7, stretch * 0.46);
vec3 cold = vec3(0.46, 0.70, 1.0) * a * 1.12;
vec3 neutral = vec3(0.90, 0.94, 1.0) * b * 0.82;
vec3 warm = vec3(1.0, 0.73, 0.45) * c * 0.54 * mix(0.45, 1.0, uQuality);
return cold + neutral + warm;
#endif
}
vec3 galaxyBand(vec2 p, float phase) {
vec2 g = rot(0.38 + phase) * p;
float bend = g.y + 0.13 * sin(g.x * 2.15 + phase * 2.0)
+ 0.045 * sin(g.x * 5.1 - phase);
float band = exp(-abs(bend) * 5.8);
float cloud = 0.34 + 0.66 * fbm(vec3(g * 1.55, phase + uTime * 0.012));
float dust = band * smoothstep(0.38, 0.72, cloud);
vec3 tint = mix(vec3(0.20, 0.34, 0.62), vec3(0.58, 0.42, 0.30),
smoothstep(-0.8, 0.9, g.x));
return tint * dust * 0.21;
}
float smoothEdgeFlow(vec2 q, float radius, float phase) {
float rn = length(q) / radius;
float angle = atan(q.y, q.x) - uTime * 0.065 - uFlowPhase * 0.72 - phase;
vec2 orbit = vec2(cos(angle), sin(angle));
float radialTime = rn * mix(23.0, 27.0, uVelocity)
- uTime * 0.095 - uFlowPhase * 0.65;
float broad = fbm(vec3(orbit * 1.72 + phase, radialTime * 0.84));
float detail = fbm(vec3(orbit * 3.25 - phase * 0.7, radialTime * 1.12 + 7.0));
float strands = smoothstep(0.57, 0.77, broad * 0.84 + detail * 0.16);
float broken = smoothstep(0.50, 0.72,
noise(vec3(orbit * 2.25 + phase * 1.3, uTime * 0.055)));
float innerBand = smoothstep(0.58, 0.74, rn)
* (1.0 - smoothstep(0.88, 0.975, rn));
return strands * broken * innerBand;
}
vec3 sourceGalaxy(vec2 beta, float flow) {
vec2 g = rot(-0.38) * (beta - vec2(0.235, -0.072));
g.x += sin(flow * 0.43) * 0.018;
float curve = g.y + 0.042 * sin(g.x * 8.2 + flow * 0.74)
+ 0.014 * sin(g.x * 18.0 - flow * 0.31);
float envelope = exp(-pow(g.x / 0.28, 2.0));
float laneA = exp(-abs(curve) * 27.0);
float laneB = exp(-abs(curve - 0.036 - 0.010 * sin(g.x * 13.0)) * 38.0);
float laneC = exp(-abs(curve + 0.052 + 0.009 * sin(g.x * 10.0 + 1.7)) * 34.0);
float dustBand = (laneA + laneB * 0.38 + laneC * 0.24) * envelope;
float broadHalo = exp(-length(g * vec2(1.42, 5.80)) * 5.2) * envelope;
float cloud = fbm(vec3(g * vec2(8.5, 14.0), flow * 0.055));
float streamClumps = noise(vec3(g.x * 17.0 - flow * 0.92,
g.y * 28.0 + flow * 0.08, 3.7));
streamClumps = smoothstep(0.36, 0.72, streamClumps);
float darkLane = smoothstep(0.43, 0.69,
noise(vec3(g * vec2(13.0, 19.0) + vec2(2.8, -4.1), flow * 0.038)));
float laneTexture = (0.10 + cloud * 0.50 + streamClumps * 0.40)
* mix(0.46, 1.0, darkLane);
float laneMain = laneA * envelope * laneTexture;
float laneEcho = laneB * envelope * (0.18 + cloud * 0.52 + streamClumps * 0.30)
* mix(0.52, 1.0, darkLane);
float laneWarm = laneC * envelope * (0.22 + cloud * 0.48 + streamClumps * 0.30)
* mix(0.48, 1.0, darkLane);
vec2 starUV = g * 1.34 + vec2(flow * 0.010, 0.0);
vec3 stars;
if (uQuality > 0.5) {
stars = starField(starUV, vec2(1.0, 0.0), 0.0);
} else {
float compactStars = starLayer(starUV, vec2(1.0, 0.0), 38.0, 5.4, 0.0);
stars = vec3(0.72, 0.82, 1.0) * compactStars * 0.86;
}
float starWindow = smoothstep(0.02, 0.16, broadHalo + dustBand)
* (0.38 + dustBand * 0.62);
vec3 filaments = vec3(0.48, 0.60, 0.79) * laneMain * 0.66
+ vec3(0.76, 0.79, 0.86) * laneEcho * 0.30
+ vec3(0.74, 0.61, 0.46) * laneWarm * 0.20;
vec3 halo = mix(vec3(0.24, 0.32, 0.47), vec3(0.52, 0.43, 0.34),
smoothstep(-0.30, 0.34, g.x)) * broadHalo * 0.030;
float sourceGap = smoothstep(0.055, 0.125, length(beta));
return (filaments + halo + stars * starWindow * 1.12) * sourceGap;
}
vec3 lensedGalaxyArcs(vec2 q, float foldSignal) {
float r = length(q);
float a = atan(q.y, q.x);
float flow = uTime * 0.012 + uFlowPhase * 0.34;
vec2 theta = rot(flow * 0.08) * q;
theta += vec2(theta.x * 0.030, -theta.y * 0.022);
float thetaE = 0.775 + foldSignal * 0.012;
float rr = max(dot(theta, theta), 0.045);
float lensScale = 1.0 - thetaE * thetaE / rr;
vec2 beta = theta * lensScale;
beta += vec2(theta.y, theta.x) * vec2(0.024, -0.018);
beta += vec2(sin(flow * 0.57), cos(flow * 0.41)) * 0.014;
vec3 image = sourceGalaxy(beta, flow);
float tangentialJacobian = abs(1.0 - thetaE * thetaE / rr);
float magnification = clamp(0.62 / sqrt(max(tangentialJacobian, 0.020)), 0.64, 3.65);
float lensWindow = smoothstep(0.38, 0.52, r)
* (1.0 - smoothstep(0.978, 0.998, r));
float compression = mix(1.0, 1.20, clamp(uVelocity * 1.8, 0.0, 1.0));
float edgeFocus = 1.0 - smoothstep(0.025, 0.14, tangentialJacobian);
float advectedDust = noise(vec3(beta * vec2(15.0, 22.0), flow * (0.10 + uVelocity * 0.18)));
image *= mix(0.82, 1.08, advectedDust) * compression;
float doppler = 0.5 + 0.5 * cos(a - 0.36);
vec3 spectral = mix(vec3(0.78, 0.88, 1.0), vec3(1.0, 0.86, 0.69), doppler);
vec3 focused = image * spectral * magnification * (0.90 + edgeFocus * 0.34);
float imageEnergy = dot(image, vec3(0.2126, 0.7152, 0.0722));
float photonRail = smoothstep(0.018, 0.14, imageEnergy)
* pow(edgeFocus, 2.05);
vec3 railColor = mix(vec3(0.74, 0.86, 1.0), vec3(1.0, 0.84, 0.65), doppler);
focused += railColor * photonRail * 0.28;
focused = focused / (vec3(1.0) + focused * 0.34);
return focused * lensWindow * 2.18;
}
vec3 rotatingGalaxyField(vec2 bodyUV, float faceMask) {
float radius = 1.0;
float tilt = sin(uTime * 0.08 + uScene * 0.7) * 0.10;
vec2 q = rot(tilt) * (bodyUV + uMouse * 0.012);
float r = length(q);
vec2 radial = normalize(q + vec2(0.0001));
vec2 tangent = vec2(-radial.y, radial.x);
float a = atan(q.y, q.x);
vec2 work = workState();
float working = work.x;
float reportMode = workReportMode();
float dataMode = workDataMode();
float deckMode = workDeckMode();
float workTravel = work.y;
float abilityMemory = abilityFocus(0.0);
float abilityConnect = abilityFocus(1.0);
float abilityAct = abilityFocus(2.0);
float abilityEvolve = abilityFocus(3.0);
float abilitySum = max(0.0001, abilityMemory + abilityConnect + abilityAct + abilityEvolve);
float abilityCompression = (
abilityMemory * 0.10 + abilityConnect * 0.07
+ abilityAct * 0.19 + abilityEvolve * 0.08
) / abilitySum;
vec3 taskTint = vec3(0.34, 0.50, 0.91) * reportMode
+ vec3(0.26, 0.66, 0.63) * dataMode
+ vec3(0.48, 0.42, 0.88) * deckMode;
float workFrontX = mix(-0.92, 0.92, ease01(workTravel));
float workCoord = q.x - workFrontX + q.y * 0.20;
float workWave = exp(-pow(workCoord / 0.24, 2.0)) * working;
float workTail = exp(-pow((workCoord + 0.37) / 0.45, 2.0)) * working * 0.22;
float limb = exp(-pow((r - radius * 0.82) / (radius * 0.17), 2.0));
float centerDepth = 1.0 - smoothstep(radius * 0.18, radius * 0.72, r);
float foldPhase = uTime * 0.052 + uFlowPhase * 0.78;
float foldA = sin(a * 2.0 - foldPhase);
float foldB = sin(a * 3.0 + foldPhase * 0.63 + 1.2);
float foldSignal = foldA * 0.68 + foldB * 0.32;
float foldGate = 0.5 + 0.5 * foldSignal;
float gravity = 0.16 + limb * 1.30 + centerDepth * 0.24
+ limb * (workWave * 0.86 + workTail * 0.16);
float angularFlow = uTime * 0.010
+ limb * (uTime * 0.042 + uFlowPhase * 1.16);
float twist = gravity * 0.18 + angularFlow;
float radialCompression = limb * (0.18 + uVelocity * 0.10
+ workWave * 0.27 + workTail * 0.050)
* mix(0.74, 1.28, foldGate);
float tangentialShear = limb * (0.022 + uVelocity * 0.045
+ workWave * 0.150) * foldSignal;
radialCompression += limb * abilityWindow() * abilityCompression;
tangentialShear += limb * abilityWindow()
* ((abilityConnect + abilityAct * 0.72) / abilitySum)
* foldSignal * 0.052;
vec2 primaryQ = rot(twist) * radial * (r * (1.0 + gravity * 0.34) + radialCompression)
+ tangent * tangentialShear;
vec2 mirrorQ = rot(-twist * 0.82 + 0.42) * radial
* (radius * 1.52 - r * 0.46 + radialCompression * 0.55)
- tangent * tangentialShear * 0.68;
vec2 primaryUV = rot(-tilt) * primaryQ;
vec2 mirrorUV = rot(-tilt) * mirrorQ;
float starStretch = limb * (1.30 + uVelocity * 2.10
+ workWave * 2.60 + workTail * 0.48)
* mix(0.72, 1.30, foldGate);
starStretch += limb * abilityWindow()
* ((abilityMemory * 0.34 + abilityConnect * 0.48
+ abilityAct * 0.92 + abilityEvolve * 0.40) / abilitySum);
vec3 primaryStars = starField(primaryUV, tangent * rot(-tilt), starStretch);
vec3 mirrorStars = starField(mirrorUV, -tangent * rot(-tilt), starStretch * 0.82);
float mirrorMask = smoothstep(radius * 0.52, radius * 0.70, r)
* (1.0 - smoothstep(radius * 0.93, radius * 0.995, r));
float mirrorBreak = smoothstep(0.46, 0.70,
noise(vec3(radial * 1.8 + vec2(4.2, -1.7), uTime * 0.022)));
mirrorMask *= limb * mirrorBreak * mix(0.46, 1.0, foldGate);
float innerEdge = smoothstep(radius * 0.48, radius * 0.72, r)
* (1.0 - smoothstep(radius * 0.89, radius * 0.985, r));
vec3 col = vec3(0.0045, 0.0065, 0.0170);
float adaptiveWindow = smoothstep(3.36, 3.92, uScene)
* (1.0 - smoothstep(4.22, 4.84, uScene));
col += vec3(0.014, 0.021, 0.055) * adaptiveWindow
* (0.30 + limb * 0.70) * (0.84 + foldGate * 0.16);
col += primaryStars * mix(0.15, 0.46, innerEdge);
col += mirrorStars * mirrorMask * 0.24;
col += galaxyBand(primaryUV * 0.72, 0.15) * mix(0.20, 0.52, limb);
col += galaxyBand(mirrorUV * 0.68, 1.72) * mirrorMask * 0.24;
col += lensedGalaxyArcs(q, foldSignal);
if (abilityWindow() > 0.001) {
vec2 memoryP = (q - vec2(0.34, 0.18)) / vec2(0.38, 0.46);
float memoryField = exp(-dot(memoryP, memoryP) * 1.55);
vec2 connectL = (q - vec2(-0.57, 0.13)) / vec2(0.34, 0.40);
vec2 connectR = (q - vec2(0.57, 0.10)) / vec2(0.34, 0.40);
float connectField = max(exp(-dot(connectL, connectL) * 1.7), exp(-dot(connectR, connectR) * 1.7));
vec2 actionP = (q - vec2(0.24, 0.0)) / vec2(0.82, 0.26);
float actionField = exp(-dot(actionP, actionP) * 1.45) * smoothstep(-0.72, 0.86, q.x);
vec2 evolveRoot = (q - vec2(-0.34, 0.0)) / vec2(0.42, 0.48);
vec2 evolveUpper = (q - vec2(0.48, 0.38)) / vec2(0.32, 0.34);
vec2 evolveLower = (q - vec2(0.45, -0.34)) / vec2(0.30, 0.32);
float evolveField = max(exp(-dot(evolveRoot, evolveRoot) * 1.8),
max(exp(-dot(evolveUpper, evolveUpper) * 1.8),
exp(-dot(evolveLower, evolveLower) * 1.8)));
float abilityField = (
memoryField * abilityMemory + connectField * abilityConnect
+ actionField * abilityAct + evolveField * abilityEvolve
) / abilitySum;
vec3 abilityTint = (
vec3(0.38, 0.46, 0.88) * abilityMemory
+ vec3(0.27, 0.67, 0.69) * abilityConnect
+ vec3(0.82, 0.31, 0.49) * abilityAct
+ vec3(0.38, 0.72, 0.57) * abilityEvolve
) / abilitySum;
float abilityTexture = 0.58 + 0.42 * noise(vec3(q * 2.7, uTime * 0.030 + uFlowPhase * 0.10));
float abilityEnergy = abilityField * abilityWindow() * abilityTexture;
col *= 1.0 - abilityEnergy * 0.055;
col += abilityTint * abilityEnergy * (0.034 + limb * 0.082);
}
float workInterior = smoothstep(radius * 0.20, radius * 0.48, r)
* (1.0 - smoothstep(radius * 0.92, radius * 1.01, r));
float pressureFront = workWave * workInterior;
col *= 1.0 - pressureFront * 0.29;
vec3 pressureColor = mix(vec3(0.50, 0.64, 0.98), taskTint, 0.32);
col += pressureColor * pressureFront * (0.045 + limb * 0.135);
float doppler = 0.5 + 0.5 * cos(a - 0.22 - tilt);
vec3 shift = mix(vec3(0.23, 0.58, 1.0), vec3(1.0, 0.58, 0.24), doppler);
float compression = mix(0.55, 1.45, 0.5 + 0.5 * cos(a + 0.45));
float moving = 0.16 + uVelocity * 0.36;
float streamA = smoothEdgeFlow(q, radius, 0.3);
float streamB = smoothEdgeFlow(q, radius, 2.7);
vec3 streamColor = mix(vec3(0.60, 0.74, 0.98), shift, 0.26);
float streamEnergy = (streamA * 0.58 + streamB * 0.25)
* compression * mix(0.76, 1.22, foldGate);
col += streamColor * streamEnergy * (0.27 + uVelocity * 0.36);
vec3 workTint = mix(vec3(0.36, 0.30, 0.82), taskTint, 0.48 + workTravel * 0.42);
float workTexture = 0.68 + 0.32 * noise(vec3(radial * 2.4, uTime * 0.035));
float workPulse = 0.96 + 0.04 * sin(workTravel * 3.14159265);
float workVisibility = mix(1.28, 1.0, uQuality);
col += workTint * limb
* (workWave * 0.235 + workTail * 0.055)
* workTexture * workPulse * workVisibility;
float release = working * smoothstep(0.52, 0.72, workTravel)
* (1.0 - smoothstep(0.90, 1.0, workTravel));
float rightFocus = exp(-pow(atan(sin(a), cos(a)) / 0.36, 2.0)) * limb;
col += taskTint * rightFocus * release * 0.22 * workVisibility;
float throatShade = (1.0 - smoothstep(radius * 0.08, radius * 0.66, r)) * 0.12;
col *= 1.0 - throatShade;
float chord = sqrt(max(0.0, 1.0 - r * r));
vec3 volumeTint = mix(vec3(0.008, 0.017, 0.042), vec3(0.026, 0.015, 0.032),
0.5 + 0.5 * cos(a - 0.45));
col += volumeTint * chord * (0.72 + centerDepth * 0.38);
float caustic = smoothstep(0.60, 0.78,
noise(vec3(radial * 3.2, uTime * 0.035))) * limb;
col += mix(vec3(0.58, 0.72, 1.0), vec3(1.0, 0.74, 0.52),
0.5 + 0.5 * cos(a - tilt)) * caustic * 0.10;
col *= mix(1.0, 0.68, faceMask);
return col;
}
vec3 heroInteriorField(vec2 uv, float handoff, float reveal) {
vec2 pointerLag = uMouse * mix(0.010, 0.004, handoff) * mix(0.55, 1.0, uQuality);
vec2 q = uv + pointerLag;
float r = length(q);
float intro = ease01(reveal);
vec2 radial = normalize(q + vec2(0.0001));
float phase = uTime * 0.020 + uFlowPhase * 0.54 + handoff * 0.92;
float jump = smoothstep(0.015, 0.62, handoff);
float mobileRestraint = mix(0.58, 1.0, uQuality);
float bend = (noise(vec3(radial * 1.85, phase * 0.36)) - 0.5)
* (0.045 + jump * 0.065) * mobileRestraint;
vec2 warped = rot(bend) * q * mix(1.92, 2.72, smoothstep(0.08, 0.86, handoff));
warped += radial * (phase * 0.018 + jump * 0.075);
float stretch = (0.12 + jump * 3.65 + uVelocity * 1.8) * mobileRestraint;
float contentQuiet = mix(0.34, 1.0, smoothstep(0.16, 0.72, r));
vec3 stars = starField(warped, radial, stretch) * 0.42 * contentQuiet;
#if !LX_COMPILE_FAST
if (uQuality > 0.5) {
vec2 farWarp = rot(-0.27) * warped * 1.62 + radial * 0.08;
stars += starField(farWarp, normalize(radial * rot(0.27)), stretch * 0.62) * 0.17 * contentQuiet;
}
#endif
vec3 dust = galaxyBand(rot(-0.31) * warped * 0.62, phase * 0.18)
* mix(0.44, 0.76, jump);
float lane = smoothstep(0.56, 0.77,
noise(vec3(radial * 2.45 + vec2(2.8, -4.1), r * 4.8 - phase * (0.6 + jump))));
float outer = smoothstep(0.20, 1.04, r);
float doppler = 0.5 + 0.5 * cos(atan(q.y, q.x) - 0.42);
vec3 laneTint = mix(vec3(0.18, 0.40, 0.88), vec3(0.82, 0.46, 0.28), doppler);
vec3 col = vec3(0.0035, 0.0055, 0.0150);
col += dust;
col += stars;
col += laneTint * lane * outer * (0.022 + jump * 0.064) * mobileRestraint;
col += vec3(0.010, 0.018, 0.045) * (1.0 - smoothstep(0.0, 0.72, r)) * 0.34;
float seamCurve = abs(q.y + sin(q.x * 2.4 + uTime * 0.11) * 0.008 * (1.0 - intro));
float fieldDistance = seamCurve * 0.82 + max(abs(q.x) - 0.12, 0.0) * 0.10;
float aperture = smoothstep(-0.045, 0.065, intro * 1.08 - fieldDistance);
float seamGlow = exp(-pow(seamCurve / (0.020 + intro * 0.060), 2.0))
* (1.0 - intro) * (0.35 + intro * 0.65);
col += mix(vec3(0.18, 0.28, 0.82), vec3(0.45, 0.22, 0.72),
0.5 + 0.5 * sin(q.x * 2.2)) * seamGlow * 0.055;
return mix(vec3(0.0035, 0.0050, 0.0130), col, aperture);
}
void main() {
vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
float s = uScroll;
float enter = smoothstep(0.0, 0.055, s);
float finale = smoothstep(0.84, 1.0, s);
float sceneRight = smoothstep(3.55,4.15,uScene) - smoothstep(6.7,7.2,uScene);
float sceneStage = smoothstep(2.45,3.08,uScene) - smoothstep(3.34,3.82,uScene);
float abilityScene = abilityWindow();
float portrait = smoothstep(0.90, 0.60, uRes.x / uRes.y);
float heroReveal = clamp(uHeroReveal, 0.0, 1.0);
float heroHandoff = ease01(uHeroHandoff);
float fluidVisibility = max(smoothstep(0.015, 0.34, heroReveal), smoothstep(0.02, 0.18, uScene));
float heroSceneWindow = 1.0 - smoothstep(1.02, 1.36, uScene);
float interiorVisibility = heroSceneWindow
* (1.0 - smoothstep(0.56, 0.94, heroHandoff));
float heroSurface = smoothstep(0.38, 0.82, heroHandoff) * heroSceneWindow;
float surfaceVisibility = max(heroSurface, smoothstep(0.04, 0.18, uScene));
float taskEyeRelease = smoothstep(0.035, 0.13, uWorkProgress);
float heroEyeHold = 1.0 - taskEyeRelease;
float heroEyeScene = 1.0 - smoothstep(1.08, 1.36, uScene);
float heroEyeArrival = smoothstep(0.55, 0.72, heroHandoff);
float heroEyeGather = smoothstep(0.46, 0.80, heroHandoff)
* heroEyeHold * heroEyeScene;
float heroEyes = heroEyeArrival * heroEyeHold * heroEyeScene;
float finalEyes = smoothstep(6.58, 6.94, uScene);
float eyeVisibility = max(heroEyes, finalEyes);
float eyeGather = max(heroEyeGather, finalEyes);
float particleWorldPresence = smoothstep(1.58, 1.96, uScene)
* (1.0 - smoothstep(3.56, 3.96, uScene));
float particleReveal = smoothstep(1.58, 2.02, uScene);
float particleWorldDominance = particleWorldPresence
* clamp(uParticleMode, 0.0, 1.0)
* particleReveal;
float side = sceneStage * 1.2 - sceneRight * 1.25 - abilityScene * 1.02;
float lift = -0.10 * enter - 0.035 * finale
- abilityScene * mix(0.02, 0.30, portrait);
side *= mix(1.0, 0.22, portrait);
vec2 drift = vec2(side, lift);
float contraction = smoothstep(0.26, 0.98, heroHandoff);
float nearDist = mix(1.48, 1.62, portrait);
float regularDist = mix(4.55, 4.90, portrait);
regularDist = mix(regularDist, 5.66, smoothstep(6.0, 6.8, uScene));
float heroDist = mix(nearDist, mix(4.55, 4.90, portrait), contraction);
float dist = mix(heroDist, regularDist, smoothstep(1.06, 1.82, uScene));
dist -= abilityScene * mix(0.30, 0.14, portrait);
vec2 workCamera = workState();
dist -= workCamera.x * mix(0.38, 0.24, portrait);
vec2 heroCenter = vec2(0.0);
float heroCenterWindow = 1.0 - smoothstep(1.02, 1.42, uScene);
vec2 cameraDrift = mix(vec2(0.0), drift, smoothstep(1.05, 1.40, uScene));
vec2 rayCenter = heroCenter * heroCenterWindow;
vec3 ro = vec3(cameraDrift.x, cameraDrift.y, dist);
vec3 rd = normalize(vec3((uv - rayCenter) * 1.45, -1.6));
float tt = 0.0, dmin = 1e3, hit = -1.0;
float raySurfaceVisibility = surfaceVisibility * (1.0 - particleWorldDominance);
if (raySurfaceVisibility > 0.002) {
float boundRadius = shapeBoundRadius();
float boundB = dot(ro, rd);
float boundC = dot(ro, ro) - boundRadius * boundRadius;
float boundH = boundB * boundB - boundC;
if (boundH > 0.0) {
float boundRoot = sqrt(boundH);
tt = max(0.0, -boundB - boundRoot);
float boundFar = -boundB + boundRoot + 0.025;
for (int i = 0; i < LX_RAY_STEPS; i++) {
vec3 p = ro + rd * tt;
float d = mapShape(p);
dmin = min(dmin, d);
if (d < 0.0012) { hit = tt; break; }
tt += d;
if (tt > boundFar) break;
}
}
}
vec3 backdrop = lxBackground(uv);
vec3 interiorLayer = backdrop;
vec3 baseLayer = backdrop;
float needsInterior = max(
interiorVisibility,
heroSurface * (1.0 - smoothstep(0.92, 0.99, heroHandoff))
);
if (needsInterior > 0.002) {
interiorLayer = heroInteriorField(uv, heroHandoff, heroReveal);
baseLayer = mix(backdrop, interiorLayer, interiorVisibility);
}
vec3 col = baseLayer;
if (hit > 0.0) {
vec3 p = ro + rd * hit;
vec3 n = norm(p);
vec3 view = -rd;
float ndv = max(dot(n, view), 0.0);
float fres = pow(1.0 - ndv, 3.2);
vec3 nb = normalize(orientBody(p));
vec3 frontN = normalize(ro);
vec3 up = abs(frontN.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
vec3 tR = normalize(cross(up, frontN));
vec3 tU = cross(frontN, tR);
float fu = dot(nb, tR);
float fv = dot(nb, tU);
float front = smoothstep(0.28, 0.62, dot(nb, frontN)) * 0.96;
float cycleLen = 6.8;
float phase = fract(uTime / cycleLen);
float blinkR = blinkEnv((phase - 0.78) / 0.16);
float blinkL = blinkR * 0.18;
float curv = smoothstep(0.0, 0.5, dot(nb, frontN));
float eyePersp = mix(0.75, 1.0, curv);
float eyeYL = mix(1.0, 0.08, blinkL) * eyePersp;
float eyeYR = mix(1.0, 0.62, blinkR) * eyePersp;
float et = uTime * 0.45;
float gazeX = uMouse.x * 0.22;
float gazeY = uMouse.y * 0.16;
vec2 faceC = vec2(fu - gazeX * 0.72, fv - gazeY * 0.72);
float faceD = length(vec2(faceC.x / 0.46, faceC.y / 0.37));
float faceMask = smoothstep(1.34, 0.32, faceD) * front * eyeVisibility;
col = rotatingGalaxyField(vec2(fu, fv), faceMask);
float ringA = atan(fu, fv);
vec3 ringColor = lxSpectrum(-ringA / 6.2831853 + 0.333 + uTime * 0.012);
float rimNoise = noise(vec3(fu * 2.1, fv * 2.1, uTime * 0.038));
float rimVariation = smoothstep(0.43, 0.74, rimNoise);
float liquidBand = smoothstep(0.25, 0.55, fres)
* (1.0 - smoothstep(0.55, 0.90, fres));
vec3 lensShift = mix(vec3(0.62, 0.77, 1.0), vec3(1.0, 0.76, 0.54),
0.5 + 0.5 * cos(ringA - 0.35));
vec3 spectralRim = mix(lensShift, ringColor, 0.30);
col += spectralRim * liquidBand * rimVariation * 0.044;
col = mix(col, spectralRim, clamp(fres, 0.0, 1.0) * rimVariation * 0.142);
col += spectralRim * smoothstep(0.76, 0.985, fres) * rimVariation * 0.050;
float shellFlow = smoothstep(0.48, 0.72,
noise(nb * 2.15 + vec3(0.0, 0.0, uTime * 0.042 + uFlowPhase * 0.18)));
float shellWindow = smoothstep(0.05, 0.34, fres)
* (1.0 - smoothstep(0.72, 0.95, fres));
col += spectralRim * shellFlow * shellWindow * (0.018 + uVelocity * 0.020);
float transmitted = pow(max(dot(nb, frontN), 0.0), 0.68)
* (1.0 - fres) * (1.0 - faceMask * 0.58);
vec3 transmissionTint = mix(vec3(0.34, 0.50, 0.82), vec3(0.72, 0.40, 0.42),
smoothstep(-0.75, 0.82, nb.x));
col += transmissionTint * transmitted * 0.010;
float bodyContour = pow(fres, 7.2);
col += vec3(0.006, 0.012, 0.028) * bodyContour;
vec3 l1 = normalize(vec3(0.55, 0.8, 0.55));
vec3 l2 = normalize(vec3(-0.62, 0.28, 0.72));
float spec1 = pow(max(dot(reflect(-l1, n), view), 0.0), 92.0);
float spec2 = pow(max(dot(reflect(-l2, n), view), 0.0), 24.0);
col += vec3(0.76, 0.82, 0.96) * spec1 * 0.084;
col += spectralRim * spec2 * 0.022;
float fuE = fu - gazeX - (sin(et) * 0.012 + sin(et * 2.7) * 0.004);
float fvE = fv - gazeY - (cos(et * 0.83) * 0.010 + sin(et * 1.9) * 0.004)
- max(blinkL, blinkR) * 0.012;
float breathe = 0.5 + 0.5 * sin(et * 1.25);
float radL = (0.037 - breathe * 0.004) * mix(1.0, 1.14, blinkL);
float radR = (0.035 - breathe * 0.004) * mix(1.0, 1.17, blinkR);
float halfL = mix(0.09, 0.028, blinkL);
float tipX = mix(0.395, 0.374, blinkR);
float armY = mix(0.095, 0.072, blinkR);
vec2 eyePointL = vec2(fuE, fvE / eyeYL);
vec2 eyePointR = vec2(fuE, fvE / eyeYR);
vec2 leftA = vec2(-0.27, -halfL);
vec2 leftB = vec2(-0.27, halfL);
vec2 eyeJoint = vec2(0.27, 0.0);
vec2 upperTip = vec2(tipX, armY);
vec2 lowerTip = vec2(tipX, -armY);
float el = sdSeg(leftA, leftB, eyePointL) - radL;
float er = min(
sdSeg(eyeJoint, upperTip, eyePointR),
sdSeg(eyeJoint, lowerTip, eyePointR)) - radR;
float dEye = min(el, er);
float poolL = (1.0 - smoothstep(0.0, 0.02, el)) * front * eyeVisibility;
float poolR = (1.0 - smoothstep(0.0, 0.02, er)) * front * eyeVisibility;
vec3 inkEye = vec3(0.08, 0.08, 0.11);
col = mix(col, inkEye, min(1.0, poolL * mix(1.0, 0.92, blinkL) + poolR * mix(0.88, 1.0, blinkR)) * uMode);
float eyeCoreL = (1.0 - smoothstep(-0.002, 0.012, el)) * (1.0 - blinkL * 0.70) * eyeVisibility;
float eyeCoreR = (1.0 - smoothstep(-0.002, 0.012, er)) * (1.0 - blinkR * 0.88) * eyeVisibility;
float eyeSkeleton = min(1.0, eyeCoreL + eyeCoreR) * front;
col += vec3(0.34, 0.43, 0.70) * eyeSkeleton * (1.0 - uMode) * 0.072;
if (eyeVisibility > 0.002) {
vec2 eyeParticleUV = vec2(fuE, fvE / eyePersp);
float settledDrift = mix(1.0, 0.18, ease01(eyeGather));
vec2 eyeDrift = vec2(uTime * 0.0030, -uTime * 0.0018) * settledDrift
+ vec2(uFlowPhase * 0.0012, -uFlowPhase * 0.0007);
float eyeDustA = eyeParticleLayer(eyeParticleUV + eyeDrift, 38.0, 23.7);
float eyeDustB = eyeParticleLayer(rot(0.23) * eyeParticleUV - eyeDrift * 0.72,
58.0, 41.3);
float motionCompression = clamp(uVelocity * 1.45, 0.0, 1.0);
vec2 trailVector = normalize(vec2(-0.80, 0.55))
* (0.004 + motionCompression * 0.008);
float eyeTrailA = eyeParticleLayer(eyeParticleUV + eyeDrift + trailVector,
38.0, 23.7);
float eyeTrailB = eyeParticleLayer(rot(0.23) * eyeParticleUV
- eyeDrift * 0.72 - trailVector * 0.72,
58.0, 41.3);
float particleA = max(eyeDustA, eyeTrailA * motionCompression * 0.42);
float particleB = max(eyeDustB, eyeTrailB * motionCompression * 0.36);
float particleField = min(1.0, particleA + particleB * 0.76);
float centerL = el + radL;
float centerR = er + radR;
float gatherRadius = mix(0.105, 0.027, ease01(eyeGather))
* mix(1.0, 0.82, motionCompression);
float attractL = 1.0 - smoothstep(gatherRadius * 0.32, gatherRadius, centerL);
float attractR = 1.0 - smoothstep(gatherRadius * 0.32, gatherRadius, centerR);
float attractField = max(attractL * (1.0 - blinkL * 0.42),
attractR * (1.0 - blinkR * 0.62));
float collectiveBreath = 0.94 + 0.06 * sin(uTime * 0.62);
float eyeParticles = particleField * attractField * front * eyeVisibility;
vec3 particleColor = mix(vec3(0.54, 0.70, 1.00), vec3(0.96, 1.01, 1.10), eyeGather);
col += particleColor * eyeParticles
* collectiveBreath * (0.86 + eyeGather * 0.54) * (1.0 - uMode);
}
float glowL = (1.0 - smoothstep(-0.005, 0.03, el)) * (1.0 - blinkL * 0.55) * eyeVisibility;
float glowR = (1.0 - smoothstep(-0.005, 0.03, er)) * (1.0 - blinkR * 0.85) * eyeVisibility;
float haloL = (1.0 - smoothstep(0.0, 0.10, el)) * (1.0 - blinkL * 0.55) * eyeVisibility;
float haloR = (1.0 - smoothstep(0.0, 0.10, er)) * (1.0 - blinkR * 0.85) * eyeVisibility;
col += (vec3(0.76, 0.82, 1.0) * (glowL + glowR) * 0.018
+ vec3(0.38, 0.47, 0.68) * (haloL + haloR) * 0.0015) * front * (1.0 - uMode);
float menL = smoothstep(0.018, 0.028, el) * (1.0 - smoothstep(0.028, 0.05, el)) * (1.0 - blinkL * 0.5);
float menR = smoothstep(0.018, 0.028, er) * (1.0 - smoothstep(0.028, 0.05, er)) * (1.0 - blinkR * 0.75);
col = mix(col, vec3(0.92, 0.95, 1.0), min(1.0, menL + menR) * front * 0.25 * uMode);
float eyeMask = (1.0 - smoothstep(0.0, 0.04, dEye)) * front;
float sheen = eyeMask * smoothstep(0.0, 0.05, fvE / eyePersp) * (1.0 - smoothstep(0.06, 0.12, fvE / eyePersp));
col += vec3(0.8, 0.85, 0.92) * sheen * 0.10 * uMode * (1.0 - max(blinkL, blinkR) * 0.85);
float heroMaterialMix = smoothstep(0.58, 0.96, heroHandoff) * heroSceneWindow;
float sceneMaterialMix = smoothstep(0.04, 0.18, uScene);
vec3 surfaceLayer = mix(interiorLayer, col, max(heroMaterialMix, sceneMaterialMix));
col = mix(baseLayer, surfaceLayer, raySurfaceVisibility);
}
col = mix(backdrop, col, fluidVisibility);
col *= 1.0 - 0.32 * pow(length(uv * vec2(0.8, 1.0)), 2.2) * (1.0 - uMode);
gl_FragColor = vec4(col, 1.0);
}
`;export{e as LENS_FRAG_SRC};
