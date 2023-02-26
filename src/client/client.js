import * as THREE from 'three'

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import {instance} from "three/nodes";
import vertexShader from "../shaders/face.vert";
import fragmentShader from "../shaders/face.frag";

let stats;
let camera, scene, renderer, controls, raycaster;
let clock;
let mixers = [];
let actions = [];

let group;
let animationGroup;
let frontSlice;
let front = [];

// let mesh;
let container;

const AXIS = 3;
const SIZE = 3;

let INTERSECTED;
let pointer;
let moving = false;


function makeSide(c) {
    return Array(SIZE * SIZE).fill(c);
}

let faceColors = [0xffff00, 0xff00ff, 0xffffff, 0xff0000, 0x00ff00, 0x0000ff];
// const state = [makeSide(0), makeSide(1), makeSide(2), makeSide(3), makeSide(4), makeSide(5)];
const state = [
    [
        1, 1, 1,
        1, 0, 0,
        0, 0, 0,
    ], [
        0, 0, 0,
        0, 1, 1,
        1, 1, 1,
    ], [
        0, 0, 0,
        0, 2, 2,
        2, 2, 2,
    ], [
        0, 0, 0,
        0, 3, 3,
        3, 3, 3,
    ], [
        0, 0, 0,
        0, 4, 4,
        4, 4, 4,
    ], [
        0, 0, 0,
        0, 5, 5,
        5, 5, 5
    ]
];

const cubes = [[], [], [], [], [], []];
const animationGroups = [new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup()];

// Axis layers: [X, Y, Z]
const animationAxisLayers = [];
for (let i = 0; i < AXIS; i++) {
    let layers = [];
    for (let j = 0; j < SIZE; j++) {
        layers.push(new THREE.AnimationObjectGroup());
    }
    animationAxisLayers.push(layers);
}
const layerMixers = [];
const rotationActions = [];

init();

function rotate() {

}

function transpose(arr) {
    for (let n = 0; n < SIZE - 1; n++) {
        for (let m = n + 1; m <  SIZE; m++) {
            let temp = arr[n + m * SIZE];
            arr[n + m * SIZE] = arr[m + n * SIZE];
            arr[m + n * SIZE] = temp;
        }
    }
}

function flipRows(arr) {
    for (let n = 0; n < SIZE; n++) {
        for (let m = 0; m < SIZE / 2; m++) {
            let b = SIZE - 1 - m;
            let temp = arr[b + n * SIZE];
            arr[b + n * SIZE] = arr[m + n * SIZE];
            arr[m + n * SIZE] = temp;
        }
    }
}

function rotateSide(side) {
    if (side === 0 || side === 4 || side === 3) {
        transpose(state[side]);
        flipRows(state[side]);
    } else {
        flipRows(state[side]);
        transpose(state[side]);
    }
}

function updateColors() {
    console.log("COLORS", state);
    let c = new THREE.Color();
    for (let side = 0; side < state.length; side++) {
        let objects = cubes[side];

        for (let j = 0; j < objects.length; j++) {
        let colors = objects[j].geometry.attributes.color;
            for (let k = 0; k < 6; k++) {
                let hex = faceColors[state[side][j]];
                c.setHex(hex);
                colors.setXYZ(k + (side * 6), c.r, c.g, c.b);
            }
            colors.needsUpdate = true;
        }
    }
}


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
    const cameraPosition = JSON.parse(localStorage.getItem('cameraPosition'));
    if (cameraPosition) {
        camera.position.copy(cameraPosition);
    }
    camera.lookAt( 0, 0, 0 );
    scene.add( camera );

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2(1, 1);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('end', (e) => {
        localStorage.cameraPosition = JSON.stringify(camera.position);
    });


    // const light = new THREE.HemisphereLight( 0xffffff, 0x888888 );
    const light = new THREE.DirectionalLight( 0xffffff, 1 );
    light.position.set( 5, 20, 10 );
    scene.add( light );

    scene.add( new THREE.AmbientLight( 0x505050 ) );

    const ico = new THREE.IcosahedronGeometry( 0.5, 3 );

    const box = new THREE.BoxGeometry(1, 1, 1);
    // const material = new THREE.MeshPhongMaterial( { color: red } );
    // const material = new THREE.MeshBasicMaterial({color: red});         // red
    // const material = new THREE.MeshLambertMaterial( { color: 0xff0055 } )


    const geometry = box;

    group = new THREE.Group();
    animationGroup = new THREE.AnimationObjectGroup();
    frontSlice = new THREE.AnimationObjectGroup();

    let offset = (SIZE / 2) - 0.5;
    let id = 0;
    for (let z = 0; z < SIZE; z++) {
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (x % (SIZE - 1) === 0 || y % (SIZE - 1) === 0 || z % (SIZE - 1) === 0) {

                    const material = new THREE.MeshBasicMaterial({vertexColors: true});
                    // const material = new THREE.ShaderMaterial({
                    //     vertexColors: true,
                    //     vertexShader,
                    //     fragmentShader
                    // });
                    const pieces = geometry.toNonIndexed();
                    const colors = [];
                    const color = new THREE.Color();

                    for (let i = 0; i < 6; i++) {
                        // color.setHex(faceColors[i]);
                        color.setHex(0x000000);
                        colors.push(color.r, color.g, color.b);
                        colors.push(color.r, color.g, color.b);
                        colors.push(color.r, color.g, color.b);

                        colors.push(color.r, color.g, color.b);
                        colors.push(color.r, color.g, color.b);
                        colors.push(color.r, color.g, color.b);
                    }

                    pieces.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

                    const object = new THREE.Mesh(pieces, material);
                    const pivot = new THREE.Object3D();
                    object.cubeId = id;
                    object.x = x;
                    object.y = y;
                    object.z = z;

                    object.position.x = x - offset;
                    object.position.y = y - offset;
                    object.position.z = z - offset;

                    pivot.add(object);
                    group.add(pivot);

                    animationGroup.add(pivot);

                    animationAxisLayers[0][x].add(pivot);
                    animationAxisLayers[1][y].add(pivot);
                    animationAxisLayers[2][z].add(pivot);

                    if (x === 0) {
                        frontSlice.add(pivot);
                        front.push(object);
                    }

                    if (x === SIZE - 1) {
                        cubes[0].push(object);
                        animationGroups[0].add(pivot);
                    }
                    if (x === 0) {
                        cubes[1].push(object);
                        animationGroups[1].add(pivot);
                    }
                    if (y === SIZE - 1) {
                        cubes[2].push(object);
                        animationGroups[2].add(pivot);
                    }
                    if (y === 0) {
                        cubes[3].push(object);
                        animationGroups[3].add(pivot);
                    }
                    if (z === SIZE - 1) {
                        cubes[4].push(object);
                        animationGroups[4].add(pivot);
                    }
                    if (z === 0) {
                        cubes[5].push(object);
                        animationGroups[5].add(pivot);
                    }
                    id++;
                }
            }
        }
    }

    updateColors();


    scene.add(group);

    const xAxis = new THREE.Vector3( 1, 0, 0 );
    const yAxis = new THREE.Vector3( 0, 1, 0 );
    const zAxis = new THREE.Vector3( 0, 0, 1 );

    function rotationAction(side, axis, dir, duration, animationGroup) {
        const qInitial = new THREE.Quaternion().setFromAxisAngle( axis, 0 );
        const qFinal = new THREE.Quaternion().setFromAxisAngle( axis, dir);
        const quaternionKF = new THREE.QuaternionKeyframeTrack( '.quaternion', [ 0, duration ], [ qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w] );
        const clip = new THREE.AnimationClip( 'Action' + side, duration, [ quaternionKF ] );

        const mixer = new THREE.AnimationMixer( animationGroup );
        mixer.addEventListener('finished', (e) => {
            moving = false;
            updateColors();
        });

        let action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce);

        return [mixer, action];
    }


    let axis = [xAxis, xAxis, yAxis, yAxis, zAxis, zAxis];
    let d90 = Math.PI / 2;
    let dirs = [d90, -d90, d90, -d90, d90, -d90];
    for (let i = 0; i < 6; i++) {
        let [m, a] = rotationAction(i, axis[i], dirs[i], 0.5, animationGroups[i]);
        mixers.push(m);
        actions.push(a);
    }


    let axisArray = [xAxis, yAxis, zAxis];
    let rotationArray = [Math.PI / 2, -Math.PI / 2, Math.PI];
    let duration = 1;


    for (let i = 0; i < AXIS; i++) {
        let animationLayers = animationAxisLayers[i];
        let axis = axisArray[i];
        let axisActions = [];

        for (let k = 0; k < rotationArray.length; k++) {
            let rotation = rotationArray[k];
            const qInitial = new THREE.Quaternion().setFromAxisAngle( axis, 0 );
            const qFinal = new THREE.Quaternion().setFromAxisAngle( axis, rotation);

            const quaternionKF = new THREE.QuaternionKeyframeTrack( '.quaternion', [ 0, duration ], [ qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w] );
            const clip = new THREE.AnimationClip( 'Rotation.' + i + "." + k, duration, [ quaternionKF ] );

            let layerActions = [];

            for (let j = 0; j < SIZE; j++) {
                const layerGroup = animationLayers[j];
                const mixer = new THREE.AnimationMixer( layerGroup );
                mixer.addEventListener('finished', (e) => {
                    moving = false;
                    updateColors();
                });

                layerMixers.push(mixer);


                let action = mixer.clipAction(clip);
                action.setLoop(THREE.LoopOnce);
                layerActions.push(action);
            }
            axisActions.push(layerActions);
        }
        rotationActions.push(axisActions);
    }

    clock = new THREE.Clock();

    const gui = new GUI();
    let rotationProps = {
        axis: 0,
        layer: 0,
        rotation: 0,
        rotate: function() {
            console.log(`Rotating ${rotationProps.axis} ${rotationProps.layer} ${rotationProps.rotation}`);
            let action = rotationActions[rotationProps.axis][rotationProps.rotation][rotationProps.layer];
            if (!moving) {
                moving = true;
                action.stop();
                action.play();
            }
        }
    };

    const rotationFolder = gui.addFolder('Rotation');
    rotationFolder.add(rotationProps, 'axis', 0, AXIS - 1, 1);
    rotationFolder.add(rotationProps, 'layer', 0, SIZE - 1, 1);
    rotationFolder.add(rotationProps, 'rotation', 0, 2, 1);
    rotationFolder.add(rotationProps, 'rotate');


    stats = new Stats();
    document.body.appendChild( stats.dom );




    // const wireframeFolder = gui.addFolder('Wireframe');
    // wireframeFolder.add(material, 'wireframe', true, false);


    const gridSize = 10;
    const divisions = 10;

    const gridHelper = new THREE.GridHelper( gridSize, divisions );
    scene.add( gridHelper );

    const axesHelper = new THREE.AxesHelper( 10 );
    scene.add( axesHelper );

    window.addEventListener('resize', onWindowResize, false)
    window.addEventListener( 'pointermove', onPointerMove );
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
}


function normalToSide(normal) {
    let xyz = [normal.x, normal.y, normal.z];
    for (let i = 0; i < xyz.length; i++) {
        if (xyz[i] !== 0) {
            return 2 * i + (xyz[i] < 0);
        }
    }
}

function onMouseDown(event) {

    raycaster.setFromCamera( pointer, camera );
    const intersects = raycaster.intersectObjects( group.children );
    if ( intersects.length > 0 ) {

        if ( !INTERSECTED || INTERSECTED.object !== intersects[ 0 ].object ) {
            INTERSECTED = intersects[ 0 ];
        }
    } else {
        INTERSECTED = null;
    }

    if (INTERSECTED) {
        controls.enabled = false;
    }


    if (INTERSECTED && !moving) {
        const side = normalToSide(INTERSECTED.face.normal);
        rotateSide(side);
        actions[side].stop();
        actions[side].play();
        moving = true;
    }
}

function onMouseUp(event) {
    controls.enabled = true;
    INTERSECTED = null;

}


function onPointerMove( event ) {

    // event.preventDefault();

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

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
    const delta = clock.getDelta();
    for (let i = 0; i < mixers.length; i++) {
        mixers[i].update( delta );
    }
    for (let i = 0; i < layerMixers.length; i++) {
        layerMixers[i].update(delta);
    }

    renderer.render(scene, camera);
    stats.update();
}

animate();