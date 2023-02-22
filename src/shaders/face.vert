varying vec3 vColor;
varying vec2 vUv;
void main() {
    vColor = color;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}