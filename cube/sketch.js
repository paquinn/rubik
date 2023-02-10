import Stats from 'three/examples/jsm/libs/stats.module.js';
import * as THREE from 'three';

let stats;
let camera, scene, renderer, controls;
let mesh;
let container;

const size = 3;

const mouse = new THREE.Vector2(1, 1);

init();

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


    const light = new THREE.HemisphereLight( 0xffffff, 0x888888 );
    light.position.set( 0, 20, 0 );

    scene.add( light );
    scene.add( new THREE.AmbientLight( 0x505050 ) );

    const geometry = new THREE.IcosahedronGeometry( 0.5, 3 );
    const box = new THREE.BoxGeometry(3, 3, 3);

    const material = new THREE.MeshPhongMaterial( { color: 0xff0055 } );

    mesh = new THREE.Mesh(box, material);
    scene.add(mesh);
}

function render() {
    renderer.render(scene, camera);
}

render();