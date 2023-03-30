import * as THREE from 'three'

import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {GUI} from 'three/examples/jsm/libs/lil-gui.module.min.js';
import vertexShader from "../shaders/face.vert";
import fragmentShader from "../shaders/face.frag";

let stats;
let camera, scene, renderer, controls, raycaster;
let clock;

let container;

const AXIS = 3;

// const SIZE = 9;

const ANIMATION_DURATION = 1.0;

let pointer;
let INTERSECTED;

let moving = false;

let configProps;

let FACE_COLORS = [0xffffff, 0xff00ff, 0xffff00, 0xff0000, 0x00ff00, 0x0000ff];

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

function makeSide(color, size) {
    let side = [];
    for (let i = 0; i < size * size; i++) {
        side.push(color);
    }
    return side;
}

function blankCube(size) {
    let sides = [];
    for (let i = 0; i < 2 * AXIS; i++) {
        sides.push(makeSide(i, size));
    }
    return sides;
}


// {cubes, axisLayers, size}
let cubeScene;

// {group, mixers, actions}
let cubeAnimations;

// {axisColors, size}
let currentCubeState;

init();

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

function buildAxisLayer(size, func) {
    let axis = [];
    for (let i = 0; i < AXIS; i++) {
        let layer = [];
        for (let j = 0; j < size; j++) {
            layer.push(func());
        }
        axis.push(layer);
    }
    return axis;
}


function newCube(scene) {
    let sides = blankCube(scene.size)
    return {axisColors: stateFromArrays(scene, sides), size: scene.size};
}

function stateFromArrays(scene, faceArrays) {
    const cubes = scene.cubes;
    const size = scene.size;
    return cubes.map(cube => {
        let x = cube.x;
        let y = cube.y;
        let z = cube.z;
        let sides = cube.sides;
        let axisIndex = [y + z * size, z + x * size, x + y * size];
        let axisColors = [0, 0, 0];
        for (let j = 0; j < sides.length; j++) {
            let side = sides[j];
            let axis = Math.floor(side / 2)
            let index = axisIndex[axis];
            let colorIndex = faceArrays[side][index];
            axisColors[axis] = colorIndex + 1;
        }
        return axisColors
    });
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

    const cubeState = JSON.parse(localStorage.getItem('cubeState'));
    if (cubeState) {
        currentCubeState = cubeState;
        cubeScene = buildCubes(cubeState.size);
    } else {
        cubeScene = buildCubes(3);
        currentCubeState = newCube(cubeScene);
        saveState(currentCubeState);
    }

    cubeAnimations = buildAnimations(cubeScene);

    showState(cubeScene, currentCubeState);

    scene.add(cubeAnimations.group);


    clock = new THREE.Clock();

    const gui = new GUI();
    configProps = {
        size: cubeScene.size,
        axis: 0,
        layer: 0,
        rotation: 0,
        rotate: function() {
            tryMove(cubeScene, currentCubeState, cubeAnimations, configProps.axis, configProps.rotation, configProps.layer);
        },
        random: function() {
            for (let i = 0; i < 10; i++) {
                let axis = Math.floor(Math.random() * AXIS);
                let layer = Math.floor(Math.random() * configProps.size);
                let rotation = Math.floor(Math.random() * 2);
                tryMove(cubeScene, currentCubeState, cubeAnimations, axis, rotation, layer);
            }
        },
        reset: function() {
            currentCubeState = newCube(cubeScene);
            showState(cubeScene, currentCubeState);
        },
        duration: ANIMATION_DURATION
    };

    const cubeFolder = gui.addFolder('Cube');
    cubeFolder.add(configProps, 'size', 2, 9, 1).onChange( value => {
        scene.remove(cubeAnimations.group);

        // delete cubeAnimations.group;
        // delete cubeAnimations.mixers;
        // delete cubeAnimations.actions;
        // delete cubeScene.cubes;
        // delete cubeScene.axisLayers
        // delete currentCubeState.axisColors

        cubeScene = buildCubes(value);
        currentCubeState = newCube(cubeScene);
        saveState(currentCubeState);
        cubeAnimations = buildAnimations(cubeScene);
        scene.add(cubeAnimations.group);
        showState(cubeScene, currentCubeState);
    });

    cubeFolder.add(configProps, 'duration', 0.1, 10.0);
    cubeFolder.add(configProps, 'random');
    cubeFolder.add(configProps, 'reset');
    const rotationFolder = gui.addFolder('Rotation');
    rotationFolder.add(configProps, 'axis', 0, AXIS - 1, 1);
    rotationFolder.add(configProps, 'layer', 0, configProps.size - 1, 1);
    rotationFolder.add(configProps, 'rotation', 0, 2, 1);
    rotationFolder.add(configProps, 'rotate');


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

function buildCubes(size) {
    const cubes = [];
    const axisLayers = buildAxisLayer(size, () => []);

    const box = new THREE.BoxGeometry(1, 1, 1);

    const geometry = box;

    let offset = (size / 2) - 0.5;
    let id = 0;
    for (let z = 0; z < size; z++) {
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (x % (size - 1) === 0 || y % (size - 1) === 0 || z % (size - 1) === 0) {

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

                    const cube = new THREE.Mesh(pieces, material);

                    cube.cubeId = id;
                    id++;

                    cube.x = x;
                    cube.y = y;
                    cube.z = z;

                    cube.position.x = x - offset;
                    cube.position.y = y - offset;
                    cube.position.z = z - offset;

                    let sides = []
                    if (x === size - 1) {
                        sides.push(0);
                    }
                    if (x === 0) {
                        sides.push(1);
                    }
                    if (y === size - 1) {
                        sides.push(2);
                    }
                    if (y === 0) {
                        sides.push(3);
                    }
                    if (z === size - 1) {
                        sides.push(4);
                    }
                    if (z === 0) {
                        sides.push(5);
                    }
                    cube.sides = sides;

                    axisLayers[0][x][y + size * z] = cube;
                    axisLayers[1][y][z + size * x] = cube;
                    axisLayers[2][z][x + size * y] = cube;

                    cubes.push(cube);
                }
            }
        }
    }

    return {cubes, axisLayers, size};
}

function buildAnimations(scene) {
    const cubeGroup = new THREE.Group();

    const layerMixers = [];
// Order: [axis][rotation dir][layer]
    const rotationActions = [];

    // Order: [axis][layer] -> animation group
    const animationAxisLayers = buildAxisLayer(scene.size, () => new THREE.AnimationObjectGroup());

    scene.cubes.forEach((cube, index) => {
        const pivot = new THREE.Object3D();
        pivot.add(cube);
        cubeGroup.add(pivot);

        animationAxisLayers[0][cube.x].add(pivot);
        animationAxisLayers[1][cube.y].add(pivot);
        animationAxisLayers[2][cube.z].add(pivot);
    });

    const xAxis = new THREE.Vector3( 1, 0, 0 );
    const yAxis = new THREE.Vector3( 0, 1, 0 );
    const zAxis = new THREE.Vector3( 0, 0, 1 );

    let axisArray = [xAxis, yAxis, zAxis];
    let rotationArray = [Math.PI / 2, -Math.PI / 2, Math.PI];
    let durations = [1, 1, 1.5];

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

            for (let j = 0; j < scene.size; j++) {
                const layerGroup = animationLayers[j];
                const mixer = new THREE.AnimationMixer( layerGroup );
                mixer.addEventListener('finished', (e) => {
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

    return {group: cubeGroup, mixers: layerMixers, actions: rotationActions};
}


function tryMove(scene, state, animations, axis, rotation, layer, duration = null) {
    if (!moving) {
        startMove(scene, state, animations, axis, rotation, layer, duration);
    }
}

function startMove(scene, state, animations, axis, rotation, layer, duration) {
    if (duration) {
        moving = true;
        let action = animations.actions[axis][rotation][layer];
        action.reset();
        action.setDuration(duration);
        action.play();
    }

    let swapped = [];
    scene.axisLayers[axis][layer].forEach(function (cube, index) {
        let colors = [...state.axisColors[cube.cubeId]];
        let a = (axis + 1) % AXIS;
        let b = (axis + 2) % AXIS;

        if (rotation < 2) {
            let tmp = colors[a];
            colors[a] = colors[b];
            colors[b] = tmp;
        }

        let position = [cube.x, cube.y, cube.z];
        let axis2 = position[a];
        let axis3 = position[b];

        let size = scene.size;
        let moved;
        if (rotation === 0) {
            moved = (size - axis3 - 1) + size * axis2;
        } else if (rotation === 1) {
            moved = axis3 + (size - axis2 - 1) * size;
        } else {
            moved = (size - axis2 - 1) + (size - axis3 - 1) * size;
        }

        swapped.push({colors, moved});

    });

    for (let i = 0; i < swapped.length; i++) {
        let swap = swapped[i];
        let colors = swap.colors;
        let moved = swap.moved;
        let cube = scene.axisLayers[axis][layer][moved];
        state.axisColors[cube.cubeId] = colors;
    }

    saveState(state);

    if (!duration) {
        showState(scene, state);
    }
}

function saveState(state) {
    localStorage.cubeState = JSON.stringify(state);
}

function showState(scene, state) {
    const cubes = scene.cubes;
    const cubeState = state.axisColors;
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
            let color = FACE_COLORS[colorIndex - 1];
            c.setHex(color);
            for (let k = 0; k < 6; k++) {
                colors.setXYZ(k + (side * 6), c.r, c.g, c.b);
            }
        }
        colors.needsUpdate = true;
    }
}

function endMove() {
    moving = false;
    showState(cubeScene, currentCubeState);
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
    const intersects = raycaster.intersectObjects( cubeAnimations.group.children );
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
            const intersects = raycaster.intersectObjects( cubeAnimations.group.children );

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
                    tryMove(cubeScene, currentCubeState, cubeAnimations, turning, rotation, position[turning], configProps.duration);
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
    for (let i = 0; i < cubeAnimations.mixers.length; i++) {
        cubeAnimations.mixers[i].update(delta);
    }

    renderer.render(scene, camera);
    stats.update();
}

animate();