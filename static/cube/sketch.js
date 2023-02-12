import * as THREE from 'three';

import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';


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

    const ico = new THREE.IcosahedronGeometry( 0.5, 3 );

    const box = new THREE.BoxGeometry(3, 3, 3);

    const geometry = box;
    const wireframe = new THREE.WireframeGeometry( geometry );
    const line = new THREE.LineSegments( wireframe );
    line.material.depthTest = false;
    line.material.opacity = 0.25;
    line.material.transparent = true;

    scene.add( line );

    const material = new THREE.MeshPhongMaterial( { color: 0xff0055 } );
    material.wireframe=true;
    mesh = new THREE.Mesh(geometry, material);

    const gui = new GUI();
    const meshFolder = gui.addFolder('Mesh');
    meshFolder.add(mesh.rotation, 'x', 0, Math.PI * 2);
    meshFolder.add(mesh.rotation, 'y', 0, Math.PI * 2);
    meshFolder.add(mesh.rotation, 'z', 0, Math.PI * 2);
    meshFolder.open();

    const cameraFolder = gui.addFolder('Camera');
    cameraFolder.add(camera.position, 'y', 0, 10);
    cameraFolder.open();

    const wireframeFolder = gui.addFolder('Wireframe');
    wireframeFolder.add(material, 'wireframe', true, false);

    let isEnabled = false;

    const props = {
        get 'Enabled'() {
            console.log("GET");
            return line.visible;
        },
        set 'Enabled'(v) {
            console.log("SET", v);
            isEnabled = v;
            line.visible = v;
        }
    };

    gui.add(props, 'Enabled' );


    scene.add(mesh);

}

window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}

function animate() {
    requestAnimationFrame(animate);
    render();
}

function render() {
    renderer.render(scene, camera);
}

animate();