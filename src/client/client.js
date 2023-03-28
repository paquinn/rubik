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

// let mesh;
let container;

const AXIS = 3;
const SIZE = 9;

const ANIMATION_DURATION = 0.25;

let INTERSECTED;
let pointer;
let moving = false;

let rotationProps;


let faceColors = [0xffffff, 0xff00ff, 0xffff00, 0xff0000, 0x00ff00, 0x0000ff];
// const state = [
//     [
//         1, 1, 1,
//         1, 0, 0,
//         0, 0, 0,
//     ], [
//         0, 0, 0,
//         0, 1, 1,
//         1, 1, 1,
//     ], [
//         0, 0, 0,
//         0, 2, 2,
//         2, 2, 2,
//     ], [
//         0, 0, 0,
//         0, 3, 3,
//         3, 3, 3,
//     ], [
//         0, 0, 0,
//         0, 4, 4,
//         4, 4, 4,
//     ], [
//         0, 0, 0,
//         0, 5, 5,
//         5, 5, 5
//     ]
// ];

function makeSide(color) {
    let side = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
        side.push(color);
    }
    return side;
}


const  state = [
    makeSide(0),
    makeSide(1),
    makeSide(2),
    makeSide(3),
    makeSide(4),
    makeSide(5)
]

// Cube axis colors
// Order: [cube id][axis]
let cubeState;

const cubes = [];
const cubeIdPosition = [];
// Order: [axis][layer]
const cubeAxisLayers = [];
// Order: [axis][layer][index]
const cubeAxisLayers2D = [];
// const cubes = [[], [], [], [], [], []];
// const animationGroups = [new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup(), new THREE.AnimationObjectGroup()];

// Order: [axis][layer]
const animationAxisLayers = [];

for (let i = 0; i < AXIS; i++) {
    let animationLayer = [];
    let cubeLayer = [];
    let cubeLayer2D = [];
    for (let j = 0; j < SIZE; j++) {
        animationLayer.push(new THREE.AnimationObjectGroup());
        cubeLayer.push([]);
        cubeLayer2D.push([]);
    }
    animationAxisLayers.push(animationLayer);
    cubeAxisLayers.push(cubeLayer);
    cubeAxisLayers2D.push(cubeLayer2D);
}
const layerMixers = [];
// Order: [axis][rotation dir][layer]
const rotationActions = [];

init();

// function makeCubeSides() {
//     let index = 0;
//     for (let z = 0; z < SIZE; z++ ) {
//         for (let y = 0; y < SIZE; y++) {
//             for (let x = 0; x  <  SIZE; x++) {
//                 if (x % (SIZE - 1) === 0 || y % (SIZE - 1) === 0 || z % (SIZE - 1) === 0) {
//
//                     let cube = {index, sides, x, y, z};
//                     cubes.push(cube);
//                     index += 1;
//                 }
//             }
//         }
//     }
//
//     console.log("CUBES", cubes);
// }

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

function rotateSide(side, arr) {
    if (side === 0 || side === 4 || side === 3) {
        transpose(arr);
        flipRows(arr);
    } else {
        flipRows(arr);
        transpose(arr);
    }
}


function setState() {
    let cubeColors = [];
    let cubeAxisColors = [];
    let c = new THREE.Color();
    for (let i = 0; i < cubes.length; i++) {
        let cube = cubes[i];
        let x = cube.x;
        let y = cube.y;
        let z = cube.z;
        let sides = cube.sides;
        let id = cube.id;
        let axisIndex = [y + z * SIZE, x + z * SIZE, x + y * SIZE];

        let cubeColor = [];
        let axisColors = [0, 0, 0];
        for (let j = 0; j < sides.length; j++) {
            let side = sides[j];
            let axis = Math.floor(side / 2)
            let index = axisIndex[axis];
            let colors = cube.geometry.attributes.color;
            let colorIndex = state[side][index];
            axisColors[axis] = colorIndex + 1;
            let hex = faceColors[colorIndex];
            cubeColor.push(colorIndex);
        }
        cubeColors.push(cubeColor);
        cubeAxisColors.push(axisColors);
    }

    return cubeAxisColors;
}


function tryMove(axis, rotation, layer) {
    if (!moving) {
        moving = true;
        startMove(axis, rotation, layer);
    }
}

function startMove(axis, rotation, layer) {
    let action = rotationActions[axis][rotation][layer];
    action.reset();
    action.setDuration(rotationProps.duration);
    action.play();

    let cubes = cubeAxisLayers[axis][layer];
    let swapped = [];
    cubeAxisLayers2D[axis][layer].forEach(function (cube, index) {
        let colors = [...cubeState[cube.cubeId]];
        let a = (axis + 1) % AXIS;
        let b = (axis + 2) % AXIS;

        if (rotation !== 2) {
            let tmp = colors[a];
            colors[a] = colors[b];
            colors[b] = tmp;
        }

        let position = [cube.x, cube.y, cube.z];
        let axis2 = position[a];
        let axis3 = position[b];

        let moved;
        if (rotation === 0) {
            moved = (SIZE - axis3 - 1) + SIZE * axis2;
        } else if (rotation === 1) {
            moved = axis3 + (SIZE - axis2 - 1) * SIZE;
        } else {
            moved = (SIZE - axis2 - 1) + (SIZE - axis3 - 1) * SIZE;
        }

        swapped.push({colors, moved});

    });

    for (let i = 0; i < swapped.length; i++) {
        let swap = swapped[i];
        let colors = swap.colors;
        let moved = swap.moved;
        let cube = cubeAxisLayers2D[axis][layer][moved];
        cubeState[cube.cubeId] = colors;
    }
}

function updateColors() {
    let c = new THREE.Color();
    for (let i = 0; i < cubes.length; i++) {
        let cube = cubes[i];
        let id = cube.cubeId;
        let sides = cube.sides;

        let axisColors = cubeState[id];
        let colors = cube.geometry.attributes.color;
        for (let j = 0; j < sides.length; j++) {
            let side = sides[j];
            let axis = Math.floor(side / 2)
            let colorIndex = axisColors[axis];
            let color = faceColors[colorIndex - 1];
            c.setHex(color);
            for (let k = 0; k < 6; k++) {
                colors.setXYZ(k + (side * 6), c.r, c.g, c.b);
            }
        }
        colors.needsUpdate = true;
    }
}

function endMove() {

    updateColors();
}

function init() {
    container = document.getElementById( 'c' );
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0 );

    let width = window.innerWidth;
    let height = window.innerHeight;

    // camera = new THREE.OrthographicCamera( width / -2, width / 2, height / 2, height / -2, 1, 1000);
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

    let offset = (SIZE / 2) - 0.5;
    let id = 0;
    let position = 0;
    for (let z = 0; z < SIZE; z++) {
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                if (x % (SIZE - 1) === 0 || y % (SIZE - 1) === 0 || z % (SIZE - 1) === 0) {

                    // const material = new THREE.MeshBasicMaterial({vertexColors: true});
                    const material = new THREE.ShaderMaterial({
                        vertexColors: true,
                        vertexShader,
                        fragmentShader
                    });
                    const pieces = geometry.toNonIndexed();
                    const colors = [];
                    const color = new THREE.Color();

                    for (let i = 0; i < 6; i++) {
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
                    object.positionId = position;
                    object.x = x;
                    object.y = y;
                    object.z = z;

                    object.position.x = x - offset;
                    object.position.y = y - offset;
                    object.position.z = z - offset;

                    let sides = []
                    if (x === SIZE - 1) {
                        sides.push(0);
                    }
                    if (x === 0) {
                        sides.push(1);
                    }
                    if (y === SIZE - 1) {
                        sides.push(2);
                    }
                    if (y === 0) {
                        sides.push(3);
                    }
                    if (z === SIZE - 1) {
                        sides.push(4);
                    }
                    if (z === 0) {
                        sides.push(5);
                    }

                    object.sides = sides;

                    pivot.add(object);
                    group.add(pivot);

                    animationAxisLayers[0][x].add(pivot);
                    animationAxisLayers[1][y].add(pivot);
                    animationAxisLayers[2][z].add(pivot);

                    cubeAxisLayers[0][x].push(object);
                    cubeAxisLayers[1][y].push(object);
                    cubeAxisLayers[2][z].push(object);

                    cubeAxisLayers2D[0][x][y + SIZE * z] = object;
                    cubeAxisLayers2D[1][y][z + SIZE * x] = object;
                    cubeAxisLayers2D[2][z][x + SIZE * y] = object;

                    id++;
                    cubes.push(object);
                    cubeIdPosition[position] = object;
                }
                position++;
            }
        }
    }

    cubeState = setState();
    updateColors();

    scene.add(group);

    const xAxis = new THREE.Vector3( 1, 0, 0 );
    const yAxis = new THREE.Vector3( 0, 1, 0 );
    const zAxis = new THREE.Vector3( 0, 0, 1 );


    let axisArray = [xAxis, yAxis, zAxis];
    let rotationArray = [Math.PI / 2, -Math.PI / 2, Math.PI];
    let durations = [ANIMATION_DURATION * 0.75, ANIMATION_DURATION * 0.75, ANIMATION_DURATION];


    for (let i = 0; i < AXIS; i++) {
        let animationLayers = animationAxisLayers[i];
        let axis = axisArray[i];
        let axisActions = [];

        for (let k = 0; k < rotationArray.length; k++) {
            let rotation = rotationArray[k];
            let duration = durations[k];
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
                    endMove();
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
    rotationProps = {
        axis: 0,
        layer: 0,
        rotation: 0,
        rotate: function() {
            tryMove(rotationProps.axis, rotationProps.rotation, rotationProps.layer);
        },
        duration: ANIMATION_DURATION
    };

    const rotationFolder = gui.addFolder('Rotation');
    rotationFolder.add(rotationProps, 'axis', 0, AXIS - 1, 1);
    rotationFolder.add(rotationProps, 'layer', 0, SIZE - 1, 1);
    rotationFolder.add(rotationProps, 'rotation', 0, 2, 1);
    rotationFolder.add(rotationProps, 'duration', 0.1, 10.0);
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

    // const interval = setInterval(function() {
    //     let axis = Math.floor(Math.random() * AXIS);
    //     let layer = Math.floor(Math.random() * SIZE);
    //     let rotation = Math.floor(Math.random() * 2);
    //     tryMove(axis, rotation, layer);
    // }, ANIMATION_DURATION * 1000);
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

    // if (INTERSECTED && !moving) {
    //     const side = normalToSide(INTERSECTED.face.normal);
    //     rotateSide(side);
    //     actions[side].stop();
    //     // actions[side].setDuration(rotationProps.duration);
    //     actions[side].play();
    //     moving = true;
    // }
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

    if (INTERSECTED) {
        if (!moving) {
            raycaster.setFromCamera( pointer, camera );
            const intersects = raycaster.intersectObjects( group.children );

            if ( intersects.length > 0 ) {
                let start = INTERSECTED.point;
                let next = intersects[0].point;
                let v = [next.x - start.x, next.y - start.y, next.z - start.z];
                let largest = 0;
                if (Math.abs(v[1]) > Math.abs(v[largest])) {
                    largest = 1;
                }
                if (Math.abs(v[2]) > Math.abs(v[largest])) {
                    largest = 2;
                }
                if (Math.abs(v[largest]) > 0.3) {
                    let cube = INTERSECTED.object;

                    let position = [cube.x, cube.y, cube.z];
                    let side = normalToSide(INTERSECTED.face.normal);
                    let axis = Math.floor(side / 2);
                    let direction = v[largest] > 0 ? 1 : 0
                    let back = side % 2 === 0 ? 1 : 0;

                    let same = back === direction ? 0 : 1;
                    let rotation = (axis + 1) % AXIS === largest ? same : 1 - same;

                    let turning = (largest + 1) % AXIS;
                    if (turning === axis) {
                        turning = (turning + 1) % AXIS;
                    }
                    tryMove(turning, rotation, position[turning]);
                }
            }
        }
    }
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