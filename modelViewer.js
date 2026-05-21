import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildCarrierModel } from "./aircraftCarrierModel.js";
import { buildF22Model } from "./f22Model.js";
import { buildUH1YModel } from "./uh-1yModel.js";

let viewerState = null;

const MODEL_CONFIG = {
    carrier: {
        label: "Porta-Aviões",
        build: (textureLoader) => {
            const { carrierGroup, radarSpinner, setCarrierLightState } = buildCarrierModel(textureLoader);
            carrierGroup.scale.setScalar(0.5);
            carrierGroup.position.set(0, 15, 0);
            return {
                root: carrierGroup,
                radarSpinner,
                setLights: (on) => setCarrierLightState(on ? 1 : 0, on, on),
                cameraDistance: 240,
                targetY: -6
            };
        },
        controls: ["lights", "radar"]
    },
    fighter: {
        label: "Caça F-22",
        build: () => {
            const { airplaneGroup, setFighterLightState, setGearDeployFactor } = buildF22Model();
            airplaneGroup.position.set(0, 0, 0);
            setGearDeployFactor(1);
            return {
                root: airplaneGroup,
                setLights: (on) => setFighterLightState(on ? 1 : 0, on),
                setGearDeployFactor,
                gearDeployed: true,
                cameraDistance: 95,
                targetY: 12
            };
        },
        controls: ["lights", "gear"]
    },
    helicopter: {
        label: "Helicóptero UH-1Y",
        build: () => {
            const { helicopterGroup, helicesGroup, backHelicesGroup, setHelicopterLightState } = buildUH1YModel();
            helicopterGroup.scale.setScalar(0.45);
            helicopterGroup.position.set(0, 0, 0);
            return {
                root: helicopterGroup,
                helicesGroup,
                backHelicesGroup,
                setLights: (on) => setHelicopterLightState(on ? 1 : 0),
                rotorsOn: false,
                cameraDistance: 75,
                targetY: 18
            };
        },
        controls: ["lights", "rotors"]
    }
};

function disposeObject3D(root) {
    root.traverse((child) => {
        if (child.geometry) {
            child.geometry.dispose();
        }
        if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            for (const material of materials) {
                material.dispose();
            }
        }
    });
}

export function startModelViewer(container, modelId, onControlsUpdate) {
    stopModelViewer();

    const config = MODEL_CONFIG[modelId];
    if (!config) {
        return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(800, 800),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.85, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -12;
    scene.add(floor);

    const grid = new THREE.GridHelper(800, 40, 0x1a3a1a, 0x0d1f0d);
    grid.position.y = -11.99;
    scene.add(grid);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(120, 180, 90);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88aacc, 0.45);
    fillLight.position.set(-80, 60, -100);
    scene.add(fillLight);

    const textureLoader = new THREE.TextureLoader();
    const modelData = config.build(textureLoader);
    modelData.root.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
        }
    });
    scene.add(modelData.root);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = modelData.cameraDistance * 0.35;
    controls.maxDistance = modelData.cameraDistance * 2.5;
    controls.target.set(0, modelData.targetY, 0);

    const angle = Math.PI * 0.22;
    camera.position.set(
        Math.sin(angle) * modelData.cameraDistance,
        modelData.targetY + modelData.cameraDistance * 0.35,
        Math.cos(angle) * modelData.cameraDistance
    );
    camera.lookAt(controls.target);

    let lightsOn = true;
    let rotorsOn = false;
    let gearFactor = modelData.gearDeployed !== false ? 1 : 0;
    let gearTarget = gearFactor;
    let radarOn = true;
    let rotorSpeed = 0;
    const MAX_ROTOR_SPEED = Math.PI * 14;
    const GEAR_ANIM_SPEED = 1.5;
    const clock = new THREE.Clock();

    modelData.setLights(true);

    const uiState = {
        lightsOn: true,
        rotorsOn: false,
        gearDeployed: gearTarget > 0.5,
        radarOn: true
    };

    function syncUi() {
        if (onControlsUpdate && viewerState) {
            onControlsUpdate(uiState, config.controls, viewerState.handlers);
        }
    }

    function renderLoop() {
        viewerState.animationId = requestAnimationFrame(renderLoop);
        const delta = clock.getDelta();

        if (modelData.helicesGroup && modelData.backHelicesGroup) {
            const targetSpeed = rotorsOn ? MAX_ROTOR_SPEED : 0;
            rotorSpeed = THREE.MathUtils.lerp(rotorSpeed, targetSpeed, delta * (rotorsOn ? 2.5 : 1.5));
            if (rotorSpeed > 0.01) {
                modelData.helicesGroup.rotation.y += rotorSpeed * delta;
                modelData.backHelicesGroup.rotation.y += rotorSpeed * delta;
            }
        }

        if (modelData.radarSpinner && radarOn) {
            modelData.radarSpinner.rotation.y += delta * 0.8;
        }

        if (modelData.setGearDeployFactor) {
            if (gearFactor < gearTarget) {
                gearFactor = Math.min(gearTarget, gearFactor + delta * GEAR_ANIM_SPEED);
            } else if (gearFactor > gearTarget) {
                gearFactor = Math.max(gearTarget, gearFactor - delta * GEAR_ANIM_SPEED);
            }
            modelData.setGearDeployFactor(gearFactor);
        }

        controls.update();
        renderer.render(scene, camera);
    }

    viewerState = {
        scene,
        camera,
        renderer,
        controls,
        modelData,
        config,
        container,
        animationId: null,
        uiState,
        handlers: {
            toggleLights() {
                lightsOn = !lightsOn;
                uiState.lightsOn = lightsOn;
                modelData.setLights(lightsOn);
                syncUi();
            },
            toggleRotors() {
                rotorsOn = !rotorsOn;
                uiState.rotorsOn = rotorsOn;
                syncUi();
            },
            toggleGear() {
                if (!modelData.setGearDeployFactor) return;
                gearTarget = gearTarget > 0.5 ? 0 : 1;
                uiState.gearDeployed = gearTarget > 0.5;
                syncUi();
            },
            toggleRadar() {
                radarOn = !radarOn;
                uiState.radarOn = radarOn;
                syncUi();
            }
        },
        resize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    };

    syncUi();
    renderLoop();
}

export function stopModelViewer() {
    if (!viewerState) return;

    cancelAnimationFrame(viewerState.animationId);

    viewerState.controls.dispose();
    disposeObject3D(viewerState.modelData.root);
    viewerState.renderer.dispose();

    if (viewerState.renderer.domElement.parentNode) {
        viewerState.renderer.domElement.parentNode.removeChild(viewerState.renderer.domElement);
    }

    viewerState = null;
}

export function getModelViewerHandlers() {
    return viewerState ? viewerState.handlers : null;
}

export function resizeModelViewer() {
    if (viewerState) {
        viewerState.resize();
    }
}

export function getModelLabels() {
    return {
        carrier: MODEL_CONFIG.carrier.label,
        fighter: MODEL_CONFIG.fighter.label,
        helicopter: MODEL_CONFIG.helicopter.label
    };
}
