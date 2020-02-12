#pragma glslify: updateFragmentColor = require('../../base/updateFragmentColor.glsl')

varying float v_treeIndex;
varying vec3 v_color;
varying vec3 v_normal;

uniform int renderMode;

void main() {
    vec3 normal = normalize(v_normal);
    updateFragmentColor(renderMode, v_color, v_treeIndex, normal);
}
