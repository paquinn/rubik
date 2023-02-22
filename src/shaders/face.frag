varying vec3 vColor;
varying vec2 vUv;

float sdRoundedBox( in vec2 p, in vec2 b, in vec4 r) {
    r.xy = (p.x > 0.0) ? r.xy : r.zw;
    r.x = (p.y > 0.0) ? r.x : r.y;
    vec2 q = abs(p) - b + r.x;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
}

float sdRoundedSquare( in vec2 p, in vec2 b, in float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}


float sdBox( in vec2 p, in vec2 b ) {
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float sdCircle(in vec2 p, in float r) {
   return length(p) - r;
}

void main() {
    vec2 p = 2.0 * vUv - vec2(1.0);

    float radius = 0.35;
    vec2 center = vec2(0.5);
    vec3 color = vColor;
    vec3 background = vec3(0.0);

    //float d = sdCircle(p, 0.5);
    //float d = sdBox(p, vec2(0.6)) - 0.2;
    //float d = sdRoundedBox(p, vec2(0.8), vec4(0.2));
    float d = sdRoundedSquare(p, vec2(0.8), 0.2);

    //vec3 col = (d > 0.0) ? background : color;
    vec3 col = mix(background, color, 1.0 - smoothstep(0.0, 0.01, d));

    gl_FragColor = vec4(col, 1.0);
}