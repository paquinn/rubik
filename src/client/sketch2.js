import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import {instance} from "three/nodes";

import vertexShader from '../shaders/face.vert';
import fragmentShader from '../shaders/face.frag';

let stats;
let camera, scene, renderer, controls, raycaster, mesh;
let pivot;
let clock, mixer, action;

let group;
let uniforms;

// let mesh;
let container;

function init() {
    container = document.getElementById( 'c' );
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0 );


    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
    camera.position.set( 10, 10, 10 );
    camera.lookAt( 0, 0, 0 );
    scene.add( camera );

    controls = new OrbitControls(camera, renderer.domElement);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const basicMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
    uniforms = {
        u_time: {
            type: "f",
            value: 1.0
        },
        u_resolution: {
            type: "v2",
            value: new THREE.Vector2()
        },
        u_mouse: {
            type: "v2",
            value: new THREE.Vector2()
        }
    };

    const shaderMaterial = new THREE.ShaderMaterial({
        vertexColors: true,
        uniforms: uniforms,
        vertexShader,
        fragmentShader
    });

    const material = shaderMaterial;
    console.log(fragmentShader);
    console.log(vertexShader);
    // const material = basicMaterial;
    const pieces = geometry.toNonIndexed();
    // console.log(pieces);
    const positionAttribute = pieces.getAttribute('position');
    const colors = [];

    const color = new THREE.Color();
    let faceColors = [0xffff00, 0xff00ff, 0xffffff, 0xff0000, 0x00ff00, 0x0000ff];
    for (let i = 0; i < positionAttribute.count; i += 6) {

        color.setHex(faceColors[i / 6]);

        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);

        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
    }

    pieces.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    mesh = new THREE.Mesh(pieces, material);
    pivot = new THREE.Object3D();

    mesh.translateX(2);
    mesh.translateY(2);
    mesh.translateZ(2);
    pivot.add(mesh);
    // mesh.position.x = 2;
    // mesh.position.y = 2;
    // mesh.position.z = 2;

    scene.add(pivot);

    const gui = new GUI();
    const colorFolder = gui.addFolder('Color');

    let params = {
        color: basicMaterial.color.getHex()
    }
    colorFolder.addColor(params, 'color').onChange(function() {
        basicMaterial.color.set(params.color);
    });

    const axesHelper = new THREE.AxesHelper( 10 );
    scene.add( axesHelper );


    const xAxis = new THREE.Vector3( 1, 0, 0 );
    const qInitial = new THREE.Quaternion().setFromAxisAngle( xAxis, 0 );
    const qFinal = new THREE.Quaternion().setFromAxisAngle( xAxis, Math.PI / 2 );
    const quaternionKF = new THREE.QuaternionKeyframeTrack( '.quaternion', [ 0, 1 ], [ qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w] );

    const clip = new THREE.AnimationClip( 'Action', 1, [ quaternionKF ] );
    mixer = new THREE.AnimationMixer( pivot );
    mixer.addEventListener('finished', (e) => {
        console.log(e);
    });
    action = mixer.clipAction( clip );
    action.setLoop(THREE.LoopOnce);

    clock = new THREE.Clock();



    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousedown', onMouseDown);
}

function onMouseDown(event) {
    // for (let i = 0; i < mesh.geometry.attributes.color.count; i++) {
    //     mesh.geometry.attributes.color.setXYZ(i, 1.0, 0.0, 1.0);
    // }
    // mesh.geometry.attributes.color.needsUpdate = true;
    action.stop();
    action.play();

}

function onMouseUp(event) {
    // mesh.material.color.setHex(0x0000ff);
    // for (let i = 0; i < mesh.geometry.attributes.color.count; i++) {
    //     mesh.geometry.attributes.color.setXYZ(i, 1.0, 1.0, 0.0);
    // }
    // mesh.geometry.attributes.color.needsUpdate = true;

}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if ( mixer ) {
        mixer.update( delta );
    }
    renderer.render(scene, camera);
}

init();
animate();
