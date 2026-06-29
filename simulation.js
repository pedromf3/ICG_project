import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { Water } from "three/addons/objects/Water.js";
import { buildCarrierModel } from "./models/aircraftCarrierModel.js";
import { buildF22Model } from "./models/f22Model.js";
import { buildUH1YModel } from "./models/uh-1yModel.js";
import { startModelViewer, stopModelViewer, resizeModelViewer, getModelLabels } from "./modelViewer.js";
import { createThreeStatsHudUpdater } from "./threeStatsHud.js";

const isTouchDevice = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const DAY_DURATION_MS = 3 * 60 * 1000;
const NIGHT_DURATION_MS = 3 * 60 * 1000;
const FULL_CYCLE_MS = DAY_DURATION_MS + NIGHT_DURATION_MS;

function disableModelArtificialLights(root) {
    root.traverse((object) => {
        if (object.isLight) {
            object.visible = false;
            return;
        }

        if (!object.isMesh || !object.material) {
            return;
        }

        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
            if (material && "emissiveIntensity" in material) {
                material.emissiveIntensity = 0;
            }
        }
    });
}

function init() {
    const scene = new THREE.Scene();
    const daySkyColor = new THREE.Color(0x87ceeb);
    const sunsetSkyColor = new THREE.Color(0xe98a52);
    const nightSkyColor = new THREE.Color(0x061321);
    const dayFogColor = new THREE.Color(0x9fd6f5);
    const sunsetFogColor = new THREE.Color(0xc47a5a);
    const nightFogColor = new THREE.Color(0x0c1b2b);
    const dayOceanColor = new THREE.Color(0x061a2a);
    const sunsetOceanColor = new THREE.Color(0x4a2218);
    const nightOceanColor = new THREE.Color(0x01060b);
    const dayOceanSpecular = new THREE.Color(0x0f1d2b);
    const nightOceanSpecular = new THREE.Color(0x050b12);
    const nightWaterSunColor = new THREE.Color(0x050f1a);
    const sunsetWaterSunColor = new THREE.Color(0xff7744);
    const sunVisualDayColor = new THREE.Color(0xffd200);
    const sunVisualSunsetColor = new THREE.Color(0xffc247);
    const sunLightColor = new THREE.Color(0xffefb0);
    const sunsetSunLightColor = new THREE.Color(0xffb070);
    const WATER_LEVEL_Y = -44;
    const SUN_VISUAL_RADIUS = 42;
    const MIN_CAMERA_Y = WATER_LEVEL_Y + 2;
    const SUN_LIGHT_DISTANCE = 1700;
    const SUN_BEAM_DISTANCE = 760;
    const SUN_VISUAL_DISTANCE = 4200;
    const SHADOW_MAP_SIZE = 2048;
    const SHADOW_FRUSTUM_HALF_SIZE = 360;
    const WATER_TIME_SCALE = 0.6;

    scene.background = daySkyColor.clone();
    scene.fog = new THREE.Fog(dayFogColor.clone(), 900, 3200);

    const waterNormalsTexture = new THREE.TextureLoader().load(
        "https://threejs.org/examples/textures/waternormals.jpg"
    );
    waterNormalsTexture.wrapS = THREE.RepeatWrapping;
    waterNormalsTexture.wrapT = THREE.RepeatWrapping;
    waterNormalsTexture.repeat.set(3.25, 3.25);

    const oceanGeometry = new THREE.PlaneGeometry(8000, 8000, 128, 128);
    const ocean = new Water(oceanGeometry, {
        textureWidth: 1024,
        textureHeight: 1024,
        waterColor: dayOceanColor,
        waterNormals: waterNormalsTexture,
        sunDirection: new THREE.Vector3(0.70707, 0.70707, 0.0),
        sunColor: 0xffffff,
        eye: new THREE.Vector3(0, 0, 0),
        distortionScale: 2.3,
        fog: true,
        side: THREE.FrontSide,
        clipBias: 0.1,
        alpha: 0.98
    });
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = WATER_LEVEL_Y;
    scene.add(ocean);

    const textureLoader = new THREE.TextureLoader();
    const { carrierGroup, radarSpinner, setCarrierLightState } = buildCarrierModel(textureLoader);
    scene.add(carrierGroup);

    const deckCollisionData = [];
    carrierGroup.traverse((child) => {
        if (child.isMesh && child.geometry && child.geometry.type === "BoxGeometry") {
            const params = child.geometry.parameters;
            if (params.width > 200 && params.depth > 50) {
                deckCollisionData.push({
                    mesh: child,
                    box3: new THREE.Box3()
                });
            }
        }
    });

    // Pre-allocated vectors reused by checkDeckCollision to avoid GC per frame
    const _deckCollCenter = new THREE.Vector3();
    const _deckCollClosest = new THREE.Vector3();
    const _deckCollDirection = new THREE.Vector3();
    const _deckCollNewPos = new THREE.Vector3();

    function checkDeckCollision(position) {
        const COLLISION_PADDING = 20;

        for (const deckData of deckCollisionData) {
            const box = deckData.box3;
            box.setFromObject(deckData.mesh);

            box.min.addScalar(-COLLISION_PADDING);
            box.max.addScalar(COLLISION_PADDING);

            if (box.containsPoint(position)) {
                box.getCenter(_deckCollCenter);
                box.clampPoint(position, _deckCollClosest);
                _deckCollDirection.copy(position).sub(_deckCollClosest).normalize();

                if (_deckCollDirection.length() < 0.01) {
                    _deckCollDirection.copy(position).sub(_deckCollCenter).normalize();
                    if (_deckCollDirection.length() < 0.01) {
                        _deckCollDirection.set(0, 1, 0);
                    }
                }

                _deckCollNewPos.copy(position).addScaledVector(_deckCollDirection, COLLISION_PADDING + 5);
                return _deckCollNewPos;
            }
        }
        return null;
    }

    const runwayAngle = Math.PI / 9.5;
    const runwayCenterX = 17.5;
    const runwayCenterZ = -2.5;
    const runwayDirectionX = Math.sin(runwayAngle);
    const runwayDirectionZ = Math.cos(runwayAngle);

    const fighterLightSetters = [];

    function addCarrierFighter({ x, z, heading, scale = 0.38 }) {
        const { airplaneGroup: fighterGroup, setFighterLightState, setGearDeployFactor } = buildF22Model();
        fighterGroup.scale.setScalar(scale);
        fighterGroup.position.set(x, -7.5, z);
        fighterGroup.rotation.y = heading;
        fighterGroup.userData.setGearDeployFactor = setGearDeployFactor;
        carrierGroup.add(fighterGroup);
        if (typeof setFighterLightState === "function") {
            fighterLightSetters.push(setFighterLightState);
        }
        return fighterGroup;
    }

    const fighterDistanceFromCenter = -27;
    const mainFighter = addCarrierFighter({
        x: runwayCenterX + runwayDirectionX * fighterDistanceFromCenter,
        z: runwayCenterZ + runwayDirectionZ * fighterDistanceFromCenter,
        heading: runwayAngle,
        scale: 0.38
    });

    if (typeof mainFighter.userData.setGearDeployFactor === "function") {
        mainFighter.userData.setGearDeployFactor(1);
    }

    class FighterStateMachine {
        constructor(fighter) {
            this.fighter = fighter;
            this.state = "TAKEOFF";

            this.fighter.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map((m) => m.clone());
                        child.material.forEach((m) => (m.transparent = true));
                        child.userData.origOpacity = child.material.map((m) =>
                            m.opacity !== undefined ? m.opacity : 1.0
                        );
                    } else {
                        child.material = child.material.clone();
                        child.material.transparent = true;
                        child.userData.origOpacity =
                            child.material.opacity !== undefined ? child.material.opacity : 1.0;
                    }
                }
            });

            this.speed = 100;
            this.pitch = 0;
            this.altitude = 0;
            this.gearFactor = 1.0;
            this.distance = -100;

            this.runwayOrigin = new THREE.Vector3(17.5, -7.5, -2.5);
            this.dir = new THREE.Vector3(Math.sin(Math.PI / 9.5), 0, Math.cos(Math.PI / 9.5));

            this.touchdownPoint = new THREE.Vector3(
                this.runwayOrigin.x + this.dir.x * -100,
                this.runwayOrigin.y,
                this.runwayOrigin.z + this.dir.z * -100
            );

            this.teleportPos = new THREE.Vector3();
            this.approachStartPos = new THREE.Vector3();
            this.approachDist = 0;
        }

        update(delta) {
            if (delta > 0.1) delta = 0.1;

            switch (this.state) {
                case "TAKEOFF":
                    this.speed = THREE.MathUtils.lerp(this.speed, 350, delta * 0.5);
                    this.distance += this.speed * delta;

                    if (this.distance > 60) {
                        this.pitch = THREE.MathUtils.lerp(this.pitch, Math.PI / 12, delta * 3);
                        this.altitude += Math.sin(this.pitch) * this.speed * delta;

                        if (this.altitude > 100) {
                            this.state = "GEAR_RETRACTION";
                        }
                    }
                    this.updatePosFromDist();
                    break;

                case "GEAR_RETRACTION":
                    this.distance += this.speed * delta;
                    this.altitude += Math.sin(this.pitch) * this.speed * delta;

                    this.gearFactor = Math.max(0, this.gearFactor - delta * 1.5);
                    if (this.fighter.userData.setGearDeployFactor) {
                        this.fighter.userData.setGearDeployFactor(this.gearFactor);
                    }

                    if (this.altitude > 300) {
                        this.state = "FLY_TO_EDGE";
                    }
                    this.updatePosFromDist();
                    break;

                case "FLY_TO_EDGE":
                    this.distance += this.speed * delta;
                    this.pitch = THREE.MathUtils.lerp(this.pitch, 0, delta * 2);

                    if (this.distance > 2200) {
                        this.state = "FADE_OUT";
                    }
                    this.updatePosFromDist();
                    break;

                case "FADE_OUT":
                    this.distance += this.speed * delta;
                    let fadeOut = 1.0 - THREE.MathUtils.clamp((this.distance - 2200) / 600, 0, 1);
                    this.setOpacity(fadeOut);

                    if (this.distance > 2800) {
                        this.state = "TELEPORT";
                    }
                    this.updatePosFromDist();
                    break;

                case "TELEPORT":
                    this.fighter.position.set(
                        -this.fighter.position.x,
                        this.fighter.position.y,
                        -this.fighter.position.z
                    );
                    this.teleportPos.copy(this.fighter.position);
                    this.approachStartPos.copy(this.fighter.position);
                    this.approachDist = this.teleportPos.distanceTo(this.touchdownPoint);
                    this.distance = 0;
                    this.setOpacity(0);
                    this.pitch = -Math.PI / 36;
                    this.state = "APPROACH_AND_DEPLOY";
                    break;

                case "APPROACH_AND_DEPLOY":
                    this.distance += this.speed * delta;
                    let progress = this.distance / this.approachDist;
                    progress = Math.min(1.0, Math.max(0, progress));

                    this.fighter.position.lerpVectors(this.approachStartPos, this.touchdownPoint, progress);

                    let fadeIn = THREE.MathUtils.clamp(progress / 0.25, 0, 1);
                    this.setOpacity(fadeIn);

                    if (progress > 0.65) {
                        this.gearFactor = Math.min(1, this.gearFactor + delta * 1.5);
                        if (this.fighter.userData.setGearDeployFactor) {
                            this.fighter.userData.setGearDeployFactor(this.gearFactor);
                        }
                    }

                    _fsm_approachDir.subVectors(this.touchdownPoint, this.approachStartPos).normalize();
                    const approachDir = _fsm_approachDir;
                    const targetHeading = Math.atan2(approachDir.x, approachDir.z);

                    this.fighter.rotation.set(0, 0, 0);
                    this.fighter.rotateY(targetHeading);
                    this.fighter.rotateX(-this.pitch);

                    if (progress >= 1.0) {
                        this.state = "TOUCH_AND_GO";
                        this.distance = -100;
                        this.altitude = 0;
                    }
                    break;

                case "TOUCH_AND_GO":
                    this.distance += this.speed * delta;
                    this.pitch = THREE.MathUtils.lerp(this.pitch, 0, delta * 5);
                    this.speed = THREE.MathUtils.lerp(this.speed, 150, delta * 1.5);

                    this.updatePosFromDist();

                    if (this.distance > -20) {
                        this.state = "TAKEOFF";
                    }
                    break;
            }
        }

        updatePosFromDist() {
            this.fighter.position.set(
                this.runwayOrigin.x + this.dir.x * this.distance,
                this.runwayOrigin.y + this.altitude,
                this.runwayOrigin.z + this.dir.z * this.distance
            );
            this.fighter.rotation.set(0, 0, 0);
            this.fighter.rotateY(Math.PI / 9.5);
            this.fighter.rotateX(-this.pitch);
        }

        setOpacity(alpha) {
            this.fighter.userData.opacityMultiplier = alpha;
            this.fighter.traverse((child) => {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((mat, i) => {
                            mat.opacity =
                                (child.userData.origOpacity[i] !== undefined
                                    ? child.userData.origOpacity[i]
                                    : 1.0) * alpha;
                        });
                    } else {
                        child.material.opacity =
                            (child.userData.origOpacity !== undefined ? child.userData.origOpacity : 1.0) * alpha;
                    }
                }
            });
        }
    }

    const fighterStateMachine = new FighterStateMachine(mainFighter);

    const parkedFighterSlots = [
        { x: 35, z: -120, heading: runwayAngle + Math.PI + 2.5 },
        { x: 20, z: -155, heading: runwayAngle + Math.PI + 2.5 },
        { x: -50, z: -20, heading: runwayAngle + Math.PI - 2.3 },
        { x: -50, z: 5, heading: runwayAngle + Math.PI - 2.3 },
        { x: -50, z: 30, heading: runwayAngle + Math.PI - 2.3 },
        { x: -50, z: 55, heading: runwayAngle + Math.PI - 2.3 },
        { x: -5, z: 80, heading: runwayAngle + Math.PI - 2.6 },
        { x: -5, z: 105, heading: runwayAngle + Math.PI - 2.6 },
        { x: 0, z: 130, heading: runwayAngle + Math.PI - 2.6 },
        { x: 0, z: 155, heading: runwayAngle + Math.PI - 2.6 }
    ];

    for (const slot of parkedFighterSlots) {
        addCarrierFighter({
            x: slot.x,
            z: slot.z,
            heading: slot.heading,
            scale: 0.36
        });
    }

    const { helicopterGroup, helicesGroup, backHelicesGroup, setHelicopterLightState } = buildUH1YModel();
    const mainHelicopter = helicopterGroup;
    mainHelicopter.scale.setScalar(0.3);
    mainHelicopter.position.set(-50, -9.1, 100);
    carrierGroup.add(mainHelicopter);

    disableModelArtificialLights(carrierGroup);
    disableModelArtificialLights(helicopterGroup);

    let currentRotorSpeed = 0;
    const MAX_ROTOR_SPEED = Math.PI * 18;

    const mouse = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    const projectiles = [];
    const splashes = [];
    const smokes = [];
    const PROJECTILE_SPEED = 1200;

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(-380, 240, 520);
    camera.lookAt(0, -20, 0);
    scene.add(camera);

    const sunLight = new THREE.DirectionalLight(0xfff2c6, 7.5);
    sunLight.position.set(700, 900, 380);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = SHADOW_MAP_SIZE;
    sunLight.shadow.mapSize.height = SHADOW_MAP_SIZE;
    sunLight.shadow.camera.near = 40;
    sunLight.shadow.camera.far = 1900;
    sunLight.shadow.camera.left = -SHADOW_FRUSTUM_HALF_SIZE;
    sunLight.shadow.camera.right = SHADOW_FRUSTUM_HALF_SIZE;
    sunLight.shadow.camera.top = SHADOW_FRUSTUM_HALF_SIZE;
    sunLight.shadow.camera.bottom = -SHADOW_FRUSTUM_HALF_SIZE;
    sunLight.shadow.bias = -0.0002;
    sunLight.shadow.normalBias = 0.08;
    sunLight.shadow.radius = 2;

    const sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, -20, 0);
    scene.add(sunTarget);
    sunLight.target = sunTarget;
    scene.add(sunLight);

    const sunBeamLight = new THREE.SpotLight(0xffd980, 0.9, 2600, Math.PI / 2.08, 1, 1);
    sunBeamLight.position.copy(sunLight.position);
    sunBeamLight.castShadow = false;
    sunBeamLight.target = sunTarget;
    scene.add(sunBeamLight);

    const sunVisual = new THREE.Mesh(
        new THREE.SphereGeometry(SUN_VISUAL_RADIUS, 24, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd200, fog: false })
    );
    sunVisual.position.copy(sunLight.position);
    scene.add(sunVisual);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const hemisphere = new THREE.HemisphereLight(0x7fb2ff, 0x0a1622, 0.55);
    scene.add(hemisphere);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(new THREE.Color(0x87ceeb));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    const updateThreeStatsHud = createThreeStatsHudUpdater(
        renderer,
        document.getElementById("threejsStatsHud"),
        () => militaryMenu.classList.contains("game-active") && parametersOn
    );

    waterNormalsTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    document.getElementById("WebGL-output").appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1400;
    controls.minDistance = 120;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, -18, 0);

    const firstPersonControls = new PointerLockControls(camera, renderer.domElement);
    const viewToggleButton = document.getElementById("viewToggleButton");
    const fighterViewButton = document.getElementById("fighterViewButton");
    const heliViewButton = document.getElementById("heliViewButton");
    const setDayNowButton = document.getElementById("setDayNowButton");
    const setNightNowButton = document.getElementById("setNightNowButton");
    const toggleParametersButton = document.getElementById("toggleParametersButton");
    const toggleFighterLightsButton = document.getElementById("toggleFighterLightsButton");
    const toggleHeliLightsButton = document.getElementById("toggleHeliLightsButton");

    let fighterLightsEnabled = true;
    let helicopterLightsEnabled = true;
    let currentVehicleViewMode = null;
    let isHeliFiring = false;

    toggleFighterLightsButton.addEventListener("click", () => {
        fighterLightsEnabled = !fighterLightsEnabled;
        toggleFighterLightsButton.textContent = fighterLightsEnabled
            ? "Fighters: Lights ON"
            : "Fighters: Lights OFF";
    });

    toggleHeliLightsButton.addEventListener("click", () => {
        helicopterLightsEnabled = !helicopterLightsEnabled;
        toggleHeliLightsButton.textContent = helicopterLightsEnabled
            ? "Heli: Lights ON"
            : "Heli: Lights OFF";
    });

    function setupDpadButton(id, key) {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            keyState[key] = true;
        });
        btn.addEventListener("pointerup", (e) => {
            e.preventDefault();
            keyState[key] = false;
        });
        btn.addEventListener("pointerleave", (e) => {
            e.preventDefault();
            keyState[key] = false;
        });
    }

    setupDpadButton("btnUp", "KeyW");
    setupDpadButton("btnDown", "KeyS");
    setupDpadButton("btnLeft", "KeyA");
    setupDpadButton("btnRight", "KeyD");

    let touchStartX = 0;
    let touchStartY = 0;
    const TOUCH_SENSITIVITY = 0.005;

    renderer.domElement.addEventListener(
        "touchstart",
        (e) => {
            if (e.touches.length === 1 && isFirstPersonMode) {
                touchStartX = e.touches[0].pageX;
                touchStartY = e.touches[0].pageY;
            }
        },
        { passive: false }
    );

    renderer.domElement.addEventListener(
        "touchmove",
        (e) => {
            if (e.touches.length === 1 && isFirstPersonMode) {
                e.preventDefault();
                const touch = e.touches[0];
                const deltaX = touch.pageX - touchStartX;
                const deltaY = touch.pageY - touchStartY;

                touchStartX = touch.pageX;
                touchStartY = touch.pageY;

                _touchEuler.setFromQuaternion(camera.quaternion);

                _touchEuler.y -= deltaX * TOUCH_SENSITIVITY;
                _touchEuler.x -= deltaY * TOUCH_SENSITIVITY;

                const PI_2 = Math.PI / 2.0;
                _touchEuler.x = Math.max(-PI_2, Math.min(PI_2, _touchEuler.x));

                camera.quaternion.setFromEuler(_touchEuler);
            }
        },
        { passive: false }
    );

    const keyState = {
        KeyW: false,
        KeyA: false,
        KeyS: false,
        KeyD: false,
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        ShiftLeft: false,
        ShiftRight: false
    };
    const firstPersonMoveVector = new THREE.Vector3();
    const firstPersonSpawn = new THREE.Vector3(
        runwayCenterX + runwayDirectionX * 12,
        -6.2,
        runwayCenterZ + runwayDirectionZ * 12
    );
    const firstPersonLookPoint = new THREE.Vector3(
        firstPersonSpawn.x + runwayDirectionX * 30,
        firstPersonSpawn.y,
        firstPersonSpawn.z + runwayDirectionZ * 30
    );
    const orbitSavedPosition = new THREE.Vector3();
    const orbitSavedTarget = new THREE.Vector3();
    const firstPersonWalkablePerimeter = [
        [-37.5, 10, 185],
        [37.5, 10, 185],
        [37.5, 10, 140],
        [90, 10, 120],
        [50, 10, 0],
        [50, 10, -140],
        [37.5, 10, -140],
        [37.5, 10, -185],
        [-37.5, 10, -185],
        [-37.5, 10, -140],
        [-72.5, 10, -140],
        [-72.5, 10, 130],
        [-37.5, 10, 130]
    ];

    const firstPersonWalkablePolygon = firstPersonWalkablePerimeter.map(([x, , z]) => [x, z]);

    function pointInPolygon(x, z, polygon) {
        let inside = false;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0];
            const zi = polygon[i][1];
            const xj = polygon[j][0];
            const zj = polygon[j][1];

            const crossesEdge = zi > z !== zj > z;
            if (crossesEdge) {
                const edgeX = ((xj - xi) * (z - zi)) / (zj - zi) + xi;
                if (x < edgeX) {
                    inside = !inside;
                }
            }
        }

        return inside;
    }
    const FIRST_PERSON_MASS_DENSITY = 1;
    const FIRST_PERSON_MIN_BLOCKING_MASS = 600;
    const FIRST_PERSON_TOWER_COLLISION_PADDING = 2.5;
    const FIRST_PERSON_RADAR_BASE_COLLISION_PADDING = 2;
    const FIRST_PERSON_SPRINT_MULTIPLIER = 1.5;
    const firstPersonObstacleRects = [
        createFirstPersonObstacleRect({
            centerX: -55,
            centerZ: -60,
            width: 18,
            depth: 28,
            height: 30,
            padding: FIRST_PERSON_TOWER_COLLISION_PADDING
        }),
        createFirstPersonObstacleRect({
            centerX: -55,
            centerZ: -90,
            width: 8,
            depth: 8,
            height: 30,
            padding: FIRST_PERSON_RADAR_BASE_COLLISION_PADDING
        })
    ];
    const FIRST_PERSON_BASE_SPEED = 40;
    const FIRST_PERSON_EYE_Y = firstPersonSpawn.y;

    const walkableBoundaryPoints = firstPersonWalkablePerimeter.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const walkableBoundaryGeometry = new THREE.BufferGeometry().setFromPoints(
        walkableBoundaryPoints.concat([walkableBoundaryPoints[0]])
    );
    const walkableBoundaryMaterial = new THREE.LineBasicMaterial({ color: 0xff3b30 });
    const walkableBoundaryLine = new THREE.Line(walkableBoundaryGeometry, walkableBoundaryMaterial);
    walkableBoundaryLine.visible = false;
    scene.add(walkableBoundaryLine);

    let hasSavedOrbitPose = false;
    let isFirstPersonMode = false;
    let firstPersonSlideAxisPreference = null;
    const vehicleViewOffsets = {
        fighter: new THREE.Vector3(0, 12, 8),
        heli: new THREE.Vector3(0, 16, 8)
    };
    const tempVec3 = new THREE.Vector3();
    const tempQuat = new THREE.Quaternion();
    const cameraRotationOffset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    // Pre-allocated reusable objects to avoid per-frame allocations
    const _vehicleViewWorldPos = new THREE.Vector3();
    const _heliMoveDir = new THREE.Vector3();
    const _touchEuler = new THREE.Euler(0, 0, 0, "YXZ");
    const _fsm_approachDir = new THREE.Vector3();
    const _projMoveVec = new THREE.Vector3();
    const _projNextPos = new THREE.Vector3();
    const _projDir = new THREE.Vector3();
    const _projRay = new THREE.Raycaster();

    function clampFirstPersonPosition() {
        camera.position.y = FIRST_PERSON_EYE_Y;
    }

    function createFirstPersonObstacleRect({ centerX, centerZ, width, depth, height, padding = 0 }) {
        const expandedWidth = width + padding * 2;
        const expandedDepth = depth + padding * 2;

        return {
            minX: centerX - expandedWidth / 2,
            maxX: centerX + expandedWidth / 2,
            minZ: centerZ - expandedDepth / 2,
            maxZ: centerZ + expandedDepth / 2,
            mass: expandedWidth * expandedDepth * height * FIRST_PERSON_MASS_DENSITY
        };
    }

    function isFirstPersonPositionBlocked(x, z) {
        for (const obstacle of firstPersonObstacleRects) {
            if (
                obstacle.mass >= FIRST_PERSON_MIN_BLOCKING_MASS &&
                x >= obstacle.minX &&
                x <= obstacle.maxX &&
                z >= obstacle.minZ &&
                z <= obstacle.maxZ
            ) {
                return true;
            }
        }

        return false;
    }

    function isFirstPersonPositionValid(x, z) {
        return pointInPolygon(x, z, firstPersonWalkablePolygon) && !isFirstPersonPositionBlocked(x, z);
    }

    function getClosestPolygonEdgeTangent(x, z, polygon) {
        let closestTangent = null;
        let bestDistanceSq = Infinity;

        for (let i = 0; i < polygon.length; i++) {
            const a = polygon[i];
            const b = polygon[(i + 1) % polygon.length];
            const ax = a[0];
            const az = a[1];
            const bx = b[0];
            const bz = b[1];
            const edgeX = bx - ax;
            const edgeZ = bz - az;
            const edgeLengthSq = edgeX * edgeX + edgeZ * edgeZ;

            if (edgeLengthSq < 0.000001) {
                continue;
            }

            const t = THREE.MathUtils.clamp(((x - ax) * edgeX + (z - az) * edgeZ) / edgeLengthSq, 0, 1);
            const closestX = ax + edgeX * t;
            const closestZ = az + edgeZ * t;
            const distanceSq = (x - closestX) * (x - closestX) + (z - closestZ) * (z - closestZ);

            if (distanceSq < bestDistanceSq) {
                bestDistanceSq = distanceSq;
                const length = Math.sqrt(edgeLengthSq);
                closestTangent = {
                    x: edgeX / length,
                    z: edgeZ / length
                };
            }
        }

        return closestTangent;
    }

    function projectMovementOntoTangent(deltaX, deltaZ, tangent) {
        const dot = deltaX * tangent.x + deltaZ * tangent.z;
        return {
            x: tangent.x * dot,
            z: tangent.z * dot
        };
    }

    function resolveFirstPersonObstacleCollision(previousX, previousZ) {
        const currentX = camera.position.x;
        const currentZ = camera.position.z;

        if (isFirstPersonPositionValid(currentX, currentZ)) {
            firstPersonSlideAxisPreference = null;
            return;
        }

        const deltaX = currentX - previousX;
        const deltaZ = currentZ - previousZ;

        const boundaryTangent = getClosestPolygonEdgeTangent(currentX, currentZ, firstPersonWalkablePolygon);
        if (boundaryTangent) {
            const projectedMove = projectMovementOntoTangent(deltaX, deltaZ, boundaryTangent);
            const projectedX = previousX + projectedMove.x;
            const projectedZ = previousZ + projectedMove.z;

            if (isFirstPersonPositionValid(projectedX, projectedZ)) {
                camera.position.x = projectedX;
                camera.position.z = projectedZ;
                firstPersonSlideAxisPreference = null;
                return;
            }
        }

        const candidateKeepX = { x: previousX + deltaX, z: previousZ };
        const candidateKeepZ = { x: previousX, z: previousZ + deltaZ };
        const candidateKeepXValid = isFirstPersonPositionValid(candidateKeepX.x, candidateKeepX.z);
        const candidateKeepZValid = isFirstPersonPositionValid(candidateKeepZ.x, candidateKeepZ.z);

        if (candidateKeepXValid && candidateKeepZValid) {
            let axisToKeep;

            if (firstPersonSlideAxisPreference === "x" || firstPersonSlideAxisPreference === "z") {
                axisToKeep = firstPersonSlideAxisPreference;
            } else if (Math.abs(deltaX) < Math.abs(deltaZ)) {
                axisToKeep = "x";
            } else if (Math.abs(deltaZ) < Math.abs(deltaX)) {
                axisToKeep = "z";
            } else {
                axisToKeep = "z";
            }

            if (axisToKeep === "x") {
                camera.position.x = candidateKeepX.x;
                camera.position.z = candidateKeepX.z;
            } else {
                camera.position.x = candidateKeepZ.x;
                camera.position.z = candidateKeepZ.z;
            }

            firstPersonSlideAxisPreference = axisToKeep;
            return;
        }

        if (candidateKeepXValid) {
            camera.position.x = candidateKeepX.x;
            camera.position.z = candidateKeepX.z;
            firstPersonSlideAxisPreference = "x";
            return;
        }

        if (candidateKeepZValid) {
            camera.position.x = candidateKeepZ.x;
            camera.position.z = candidateKeepZ.z;
            firstPersonSlideAxisPreference = "z";
            return;
        }

        camera.position.x = previousX;
        camera.position.z = previousZ;
        firstPersonSlideAxisPreference = null;
    }

    function setViewMode(useFirstPerson) {
        if (useFirstPerson === isFirstPersonMode) {
            return;
        }

        isFirstPersonMode = useFirstPerson;
        currentVehicleViewMode = null;

        if (isFirstPersonMode) {
            orbitSavedPosition.copy(camera.position);
            orbitSavedTarget.copy(controls.target);
            renderer.domElement.style.cursor = "default";
            hasSavedOrbitPose = true;

            controls.enabled = false;
            camera.position.copy(firstPersonSpawn);
            camera.lookAt(firstPersonLookPoint);
            clampFirstPersonPosition();

            viewToggleButton.textContent = "View: First Person";
            if (!isTouchDevice) {
                firstPersonControls.lock();
            }
                updateMenuStates();
            return;
        }

        firstPersonControls.unlock();
        controls.enabled = true;

        if (hasSavedOrbitPose) {
            camera.position.copy(orbitSavedPosition);
            controls.target.copy(orbitSavedTarget);
        }

        viewToggleButton.textContent = "View: Orbital";
        controls.update();
        renderer.domElement.style.cursor = "default";
            updateMenuStates();
    }

    function setVehicleViewMode(vehicleType) {
        if (vehicleType) {
            isFirstPersonMode = false;
            firstPersonControls.unlock();
            controls.enabled = false;
            currentVehicleViewMode = vehicleType;

            let targetModel = vehicleType === "fighter" ? mainFighter : mainHelicopter;
            let offset = vehicleViewOffsets[vehicleType];

            tempVec3.copy(offset);
            targetModel.getWorldQuaternion(tempQuat);
            tempVec3.applyQuaternion(tempQuat);
            targetModel.getWorldPosition(_vehicleViewWorldPos);
            camera.position.copy(_vehicleViewWorldPos).add(tempVec3);

            tempQuat.multiplyQuaternions(tempQuat, cameraRotationOffset);
            camera.quaternion.copy(tempQuat);

            if (vehicleType === "fighter") {
                viewToggleButton.textContent = "View: Orbital";
                fighterViewButton.textContent = "Fighter: Cockpit (ACTIVE)";
                heliViewButton.textContent = "Heli: Cockpit";
                renderer.domElement.style.cursor = "default";
            } else {
                viewToggleButton.textContent = "View: Orbital";
                fighterViewButton.textContent = "Fighter: Cockpit";
                heliViewButton.textContent = "Heli: Cockpit (ACTIVE)";
                renderer.domElement.style.cursor = "crosshair";
            }
        } else {
            currentVehicleViewMode = null;
            controls.enabled = true;
            if (hasSavedOrbitPose) {
                camera.position.copy(orbitSavedPosition);
                controls.target.copy(orbitSavedTarget);
            }
            viewToggleButton.textContent = "View: Orbital";
            fighterViewButton.textContent = "Fighter: Cockpit";
            heliViewButton.textContent = "Heli: Cockpit";
            controls.update();
            renderer.domElement.style.cursor = "default";
        }
    }

    function updateVehicleViewCamera() {
        if (!currentVehicleViewMode) return;

        let targetModel = currentVehicleViewMode === "fighter" ? mainFighter : mainHelicopter;
        let offset = vehicleViewOffsets[currentVehicleViewMode];

        tempVec3.copy(offset);
        targetModel.getWorldQuaternion(tempQuat);
        tempVec3.applyQuaternion(tempQuat);

        targetModel.getWorldPosition(_vehicleViewWorldPos);
        camera.position.copy(_vehicleViewWorldPos).add(tempVec3);

        tempQuat.multiplyQuaternions(tempQuat, cameraRotationOffset);
        camera.quaternion.copy(tempQuat);
    }

    function updateHelicopterMovement(deltaSeconds) {
        if (!mainHelicopter) return;

        const prevPos = mainHelicopter.position.clone();

        const isBoostActive = keyState.ShiftLeft || keyState.ShiftRight;
        const speedMultiplier = isBoostActive ? 2.0 : 1.0;

        const HELI_SPEED = 80 * speedMultiplier;
        const HELI_ROTATION_SPEED = 1.5;
        const HELI_VERTICAL_SPEED = 40 * speedMultiplier;

        if (keyState.ArrowLeft) {
            mainHelicopter.rotation.y += HELI_ROTATION_SPEED * deltaSeconds;
        }
        if (keyState.ArrowRight) {
            mainHelicopter.rotation.y -= HELI_ROTATION_SPEED * deltaSeconds;
        }

        if (keyState.ArrowUp) {
            mainHelicopter.position.y += HELI_VERTICAL_SPEED * deltaSeconds;
        }
        if (keyState.ArrowDown) {
            mainHelicopter.position.y -= HELI_VERTICAL_SPEED * deltaSeconds;
        }

        mainHelicopter.position.y = THREE.MathUtils.clamp(mainHelicopter.position.y, -9.1, 800);

        const moveZ = (keyState.KeyW ? 1 : 0) - (keyState.KeyS ? 1 : 0);
        const moveX = (keyState.KeyA ? 1 : 0) - (keyState.KeyD ? 1 : 0);

        _heliMoveDir.set(moveX, 0, moveZ);

        if (_heliMoveDir.lengthSq() > 0) {
            _heliMoveDir.applyQuaternion(mainHelicopter.quaternion);

            _heliMoveDir.y = 0;
            _heliMoveDir.normalize();

            mainHelicopter.position.addScaledVector(_heliMoveDir, HELI_SPEED * deltaSeconds);
        }

        const MAP_LIMIT = 1250;
        mainHelicopter.position.x = THREE.MathUtils.clamp(mainHelicopter.position.x, -MAP_LIMIT, MAP_LIMIT);
        mainHelicopter.position.z = THREE.MathUtils.clamp(mainHelicopter.position.z, -MAP_LIMIT, MAP_LIMIT);

        const TOWER_MIN_X = -69;
        const TOWER_MAX_X = -41;
        const TOWER_MIN_Z = -79;
        const TOWER_MAX_Z = -41;
        const TOWER_MAX_Y = 27.5;

        if (
            mainHelicopter.position.x > TOWER_MIN_X && mainHelicopter.position.x < TOWER_MAX_X &&
            mainHelicopter.position.z > TOWER_MIN_Z && mainHelicopter.position.z < TOWER_MAX_Z &&
            mainHelicopter.position.y < TOWER_MAX_Y
        ) {
            mainHelicopter.position.copy(prevPos);
        }
    }

    function updateFirstPersonMovement(deltaSeconds) {
        const forwardInput = (keyState.KeyW ? 1 : 0) - (keyState.KeyS ? 1 : 0);
        const rightInput = (keyState.KeyD ? 1 : 0) - (keyState.KeyA ? 1 : 0);
        const previousX = camera.position.x;
        const previousZ = camera.position.z;
        const isSprintActive = keyState.ShiftLeft || keyState.ShiftRight;
        const speedMultiplier = isSprintActive ? FIRST_PERSON_SPRINT_MULTIPLIER : 1.0;

        firstPersonMoveVector.set(rightInput, 0, forwardInput);

        if (firstPersonMoveVector.lengthSq() < 0.0001) {
            clampFirstPersonPosition();
            return;
        }

        firstPersonMoveVector.normalize();

        const movementSpeed = FIRST_PERSON_BASE_SPEED * speedMultiplier * deltaSeconds;
        firstPersonControls.moveRight(firstPersonMoveVector.x * movementSpeed);
        firstPersonControls.moveForward(firstPersonMoveVector.z * movementSpeed);

        clampFirstPersonPosition();
        resolveFirstPersonObstacleCollision(previousX, previousZ);
        clampFirstPersonPosition();
    }

    viewToggleButton.addEventListener("click", () => {
        setViewMode(!isFirstPersonMode);
    });

    fighterViewButton.addEventListener("click", () => {
        if (currentVehicleViewMode === "fighter") {
            setVehicleViewMode(null);
        } else {
            orbitSavedPosition.copy(camera.position);
            orbitSavedTarget.copy(controls.target);
            hasSavedOrbitPose = true;
            setVehicleViewMode("fighter");
        }
    });

    heliViewButton.addEventListener("click", () => {
        if (currentVehicleViewMode === "heli") {
            setVehicleViewMode(null);
        } else {
            orbitSavedPosition.copy(camera.position);
            orbitSavedTarget.copy(controls.target);
            hasSavedOrbitPose = true;
            setVehicleViewMode("heli");
        }
    });

    setDayNowButton.addEventListener("click", () => {
        setCycleToProgress(0.25);
    });

    setNightNowButton.addEventListener("click", () => {
        setCycleToProgress(0.75);
    });

    const menuButtons = document.querySelectorAll(".menu-option");
    let currentViewMode = "orbital";
    let currentTimeMode = "day";
    let heliLightsOn = true;
    let fighterLightsOn = true;

    setParametersEnabled = function (enabled) {
        parametersOn = enabled;
        walkableBoundaryLine.visible = parametersOn;
        toggleParametersButton.textContent = parametersOn ? "Parameters: ON" : "Parameters: OFF";
    };

    toggleParametersButton.addEventListener("click", () => {
        setParametersEnabled(!parametersOn);
        updateMenuStates();
    });

    function updateMenuStates() {
        menuButtons.forEach((btn) => {
            const action = btn.dataset.action;
            btn.classList.remove("active");

            if (
                action === `view-${currentViewMode}` ||
                (action === "lights-heli" && heliLightsOn) ||
                (action === "lights-fighter" && fighterLightsOn) ||
                (action === "parameters" && parametersOn)
            ) {
                btn.classList.add("active");
            }
        });

        const mobileControls = document.getElementById("mobileControls");
        if (isFirstPersonMode && isTouchDevice) {
            mobileControls.style.display = "flex";
        } else {
            mobileControls.style.display = "none";
        }
    }

    menuButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const action = btn.dataset.action;

            if (action === "view-orbital") {
                currentViewMode = "orbital";
                if (isFirstPersonMode) {
                    setViewMode(false);
                } else if (currentVehicleViewMode) {
                    setVehicleViewMode(null);
                }
            } else if (action === "view-firstperson") {
                currentViewMode = "firstperson";
                setViewMode(true);
            } else if (action === "view-fighter") {
                if (currentVehicleViewMode === "fighter") {
                    setVehicleViewMode(null);
                    currentViewMode = "orbital";
                } else {
                    orbitSavedPosition.copy(camera.position);
                    orbitSavedTarget.copy(controls.target);
                    hasSavedOrbitPose = true;
                    setVehicleViewMode("fighter");
                    currentViewMode = "fighter";
                }
            } else if (action === "view-heli") {
                if (currentVehicleViewMode === "heli") {
                    setVehicleViewMode(null);
                    currentViewMode = "orbital";
                } else {
                    orbitSavedPosition.copy(camera.position);
                    orbitSavedTarget.copy(controls.target);
                    hasSavedOrbitPose = true;
                    setVehicleViewMode("heli");
                    currentViewMode = "heli";
                }
            } else if (action === "time-day") {
                currentTimeMode = "day";
                setCycleToProgress(0.25);
            } else if (action === "time-night") {
                currentTimeMode = "night";
                setCycleToProgress(0.75);
            } else if (action === "lights-heli") {
                helicopterLightsEnabled = !helicopterLightsEnabled;
                heliLightsOn = helicopterLightsEnabled;
            } else if (action === "lights-fighter") {
                fighterLightsEnabled = !fighterLightsEnabled;
                fighterLightsOn = fighterLightsEnabled;
            } else if (action === "parameters") {
                setParametersEnabled(!parametersOn);
            }

            updateMenuStates();
        });
    });

    updateMenuStates();

    renderer.domElement.addEventListener("click", () => {
        if (isFirstPersonMode && !firstPersonControls.isLocked && !isTouchDevice) {
            firstPersonControls.lock();
        }
    });

    window.addEventListener("mousemove", (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.domElement.addEventListener("mousedown", (event) => {
        if (event.button === 0 && currentVehicleViewMode === "heli") {
            isHeliFiring = true;
            raycaster.setFromCamera(mouse, camera);

            const targetPoint = new THREE.Vector3();
            raycaster.ray.at(3000, targetPoint);

            const heliPos = new THREE.Vector3();
            mainHelicopter.getWorldPosition(heliPos);

            const spawnPos = heliPos.clone();
            spawnPos.y -= 2;

            const direction = new THREE.Vector3().subVectors(targetPoint, spawnPos).normalize();

            const bulletGeom = new THREE.CylinderGeometry(0.4, 0.4, 25, 8);
            bulletGeom.rotateX(Math.PI / 2);
            const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
            const bullet = new THREE.Mesh(bulletGeom, bulletMat);

            bullet.position.copy(spawnPos);
            bullet.lookAt(targetPoint);
            scene.add(bullet);

            projectiles.push({
                mesh: bullet,
                velocity: direction.multiplyScalar(PROJECTILE_SPEED),
                distanceTraveled: 0
            });
        }
    });

    window.addEventListener("mouseup", (event) => {
        if (event.button === 0) {
            isHeliFiring = false;
        }
    });

    window.addEventListener("keydown", (event) => {
        if (event.code === "Escape") {
            event.preventDefault();
            if (currentVehicleViewMode || isFirstPersonMode) {
                currentViewMode = "orbital";
                if (isFirstPersonMode) {
                    setViewMode(false);
                } else {
                    setVehicleViewMode(null);
                }
                updateMenuStates();
            }
            return;
        }

        if (event.code in keyState) {
            if (currentVehicleViewMode === "heli" && event.code.startsWith("Arrow")) {
                event.preventDefault();
            }
            keyState[event.code] = true;
        }

        if (event.code.startsWith("Digit") && !event.repeat) {
            const digit = parseInt(event.code.replace("Digit", ""));
            if (digit >= 1 && digit <= 9) {
                const btnIndex = digit - 1;
                if (menuButtons[btnIndex]) {
                    menuButtons[btnIndex].click();
                }
            }
        }
    });

    window.addEventListener("keyup", (event) => {
        if (event.code in keyState) {
            keyState[event.code] = false;
        }
    });

    const sunOrbitRadiusX = 1100;
    const sunOrbitRadiusY = 900;
    const sunOrbitZ = 380;
    const horizonY = WATER_LEVEL_Y + SUN_VISUAL_RADIUS + 10;
    const cycleClock = new THREE.Clock();
    let cycleTimeOffsetMs = 0;
    const workingSkyColor = new THREE.Color();
    const workingFogColor = new THREE.Color();
    const workingOceanColor = new THREE.Color();
    const workingOceanSpecular = new THREE.Color();
    const workingSunVisualColor = new THREE.Color();
    const workingWaterSunColor = new THREE.Color();
    const workingSunLightColor = new THREE.Color();
    const sunDirection = new THREE.Vector3();
    let currentNightFactor = 0;

    function getEffectiveCycleElapsedMs() {
        return cycleClock.elapsedTime * 1000 + cycleTimeOffsetMs;
    }

    function setCycleToProgress(targetProgress) {
        const normalizedProgress = ((targetProgress % 1) + 1) % 1;
        const targetCycleElapsedMs = normalizedProgress * FULL_CYCLE_MS;
        cycleTimeOffsetMs = targetCycleElapsedMs - cycleClock.elapsedTime * 1000;
        updateDayNightCycle(getEffectiveCycleElapsedMs());
    }

    // Track previous sun intensity to detect meaningful changes and update shadow map
    let _prevSunIntensity = -1;

    function updateDayNightCycle(elapsedMs) {
        const cycleElapsedMs = ((elapsedMs % FULL_CYCLE_MS) + FULL_CYCLE_MS) % FULL_CYCLE_MS;
        const cycleProgress = cycleElapsedMs / FULL_CYCLE_MS;
        const orbitAngle = cycleProgress * Math.PI * 2;
        const sunHeight = Math.sin(orbitAngle);
        const daylight = THREE.MathUtils.clamp((sunHeight + 0.06) / 1.06, 0, 1);
        const nightFactor = THREE.MathUtils.clamp(1 - daylight, 0, 1);
        currentNightFactor = nightFactor;
        const twilight = THREE.MathUtils.smoothstep(sunHeight, -0.16, 0.24);
        const dayMix = THREE.MathUtils.smoothstep(sunHeight, -0.08, 0.72);
        const sunOrbitalX = Math.cos(orbitAngle) * sunOrbitRadiusX;
        const sunOrbitalY = horizonY + sunHeight * sunOrbitRadiusY;
        const sunOrbitalZ = sunOrbitZ;

        sunDirection.set(
            sunOrbitalX - sunTarget.position.x,
            sunOrbitalY - sunTarget.position.y,
            sunOrbitalZ - sunTarget.position.z
        ).normalize();

        sunLight.position.copy(sunTarget.position).addScaledVector(sunDirection, SUN_LIGHT_DISTANCE);
        sunBeamLight.position.copy(sunTarget.position).addScaledVector(sunDirection, SUN_BEAM_DISTANCE);
        sunVisual.position.copy(camera.position).addScaledVector(sunDirection, SUN_VISUAL_DISTANCE);

        workingSunVisualColor.lerpColors(sunVisualSunsetColor, sunVisualDayColor, dayMix);
        sunVisual.material.color.copy(workingSunVisualColor);

        const newSunIntensity = THREE.MathUtils.lerp(0.12, 7.5, daylight);
        sunLight.intensity = newSunIntensity;
        // Force shadow map refresh when light intensity changes significantly (fixes night/day flicker)
        if (Math.abs(newSunIntensity - _prevSunIntensity) > 0.05) {
            sunLight.shadow.needsUpdate = true;
            _prevSunIntensity = newSunIntensity;
        }

        sunBeamLight.intensity = THREE.MathUtils.lerp(0.0, 0.9, daylight * twilight);
        sunBeamLight.angle = THREE.MathUtils.lerp(Math.PI / 2.45, Math.PI / 2.02, 1 - dayMix);
        ambientLight.intensity = THREE.MathUtils.lerp(0.08, 0.55, twilight);
        hemisphere.intensity = THREE.MathUtils.lerp(0.1, 0.55, twilight);

        workingSkyColor.lerpColors(nightSkyColor, sunsetSkyColor, twilight);
        workingSkyColor.lerp(daySkyColor, dayMix);
        scene.background.copy(workingSkyColor);

        workingFogColor.lerpColors(nightFogColor, sunsetFogColor, twilight);
        workingFogColor.lerp(dayFogColor, dayMix);
        scene.fog.color.copy(workingFogColor);

        workingOceanColor.lerpColors(nightOceanColor, sunsetOceanColor, twilight);
        workingOceanColor.lerp(dayOceanColor, dayMix);
        if (ocean && ocean.material && ocean.material.uniforms) {
            ocean.material.uniforms.waterColor.value.copy(workingOceanColor);
            workingWaterSunColor.lerpColors(nightWaterSunColor, sunsetWaterSunColor, twilight);
            workingWaterSunColor.lerp(sunLightColor, dayMix);
            ocean.material.uniforms.sunColor.value.copy(workingWaterSunColor);
            ocean.material.uniforms.sunDirection.value.copy(sunDirection);
        }

        workingSunLightColor.lerpColors(sunsetSunLightColor, sunLightColor, dayMix);
        sunLight.color.copy(workingSunLightColor);

        if (setCarrierLightState) {
            const adjustedNightFactor = THREE.MathUtils.clamp((nightFactor - 0.65) * 2.86, 0, 1);
            const deckBlinkVisible = adjustedNightFactor > 0.05 && Math.sin(cycleElapsedMs / 260) > 0;
            const heliBlinkVisible = adjustedNightFactor > 0.05 && Math.sin(cycleElapsedMs / 420) > 0;
            let effectiveHeliFactor = helicopterLightsEnabled ? adjustedNightFactor * 8 : 0;

            setCarrierLightState(adjustedNightFactor, deckBlinkVisible, heliBlinkVisible);
            if (setHelicopterLightState) setHelicopterLightState(effectiveHeliFactor);
        }

        if (typeof fighterLightSetters !== "undefined" && fighterLightSetters.length > 0) {
            const adjustedNightFactor = THREE.MathUtils.clamp((nightFactor - 0.65) * 2.86, 0, 1);
            const fighterAF = fighterLightsEnabled ? adjustedNightFactor : 0;
            const fighterBlinkVisible =
                fighterLightsEnabled ? adjustedNightFactor > 0.05 && Math.sin(cycleElapsedMs / 260) > 0 : false;
            for (const fn of fighterLightSetters) {
                try {
                    fn(fighterAF, fighterBlinkVisible);
                } catch (e) {}
            }
        }

        sunVisual.visible = sunOrbitalY - SUN_VISUAL_RADIUS > WATER_LEVEL_Y;
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        updateMenuStates();
    }

    window.addEventListener("resize", onWindowResize);

    function renderScene() {
        requestAnimationFrame(renderScene);
        const frameDeltaSeconds = cycleClock.getDelta();
        const elapsedTime = cycleClock.elapsedTime;

        if (ocean && ocean.material && ocean.material.uniforms) {
            ocean.material.uniforms.time.value += frameDeltaSeconds * WATER_TIME_SCALE;
        }

        const isParked =
            mainHelicopter.position.x > -64 &&
            mainHelicopter.position.x < -36 &&
            mainHelicopter.position.z > 86 &&
            mainHelicopter.position.z < 114 &&
            mainHelicopter.position.y < -8.5;

        if (!isParked) {
            currentRotorSpeed = THREE.MathUtils.lerp(currentRotorSpeed, MAX_ROTOR_SPEED, frameDeltaSeconds * 2.0);
        } else {
            currentRotorSpeed = THREE.MathUtils.lerp(currentRotorSpeed, 0, frameDeltaSeconds * 1.5);
        }

        if (currentRotorSpeed > 0.01) {
            helicesGroup.rotation.y += currentRotorSpeed * frameDeltaSeconds;
            backHelicesGroup.rotation.y += currentRotorSpeed * frameDeltaSeconds;
        }

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            // Reuse pre-allocated vectors instead of cloning per frame
            _projMoveVec.copy(p.velocity).multiplyScalar(frameDeltaSeconds);
            _projNextPos.copy(p.mesh.position).add(_projMoveVec);

            const dist = _projMoveVec.length();
            _projDir.copy(_projMoveVec).normalize();
            _projRay.set(p.mesh.position, _projDir);
            _projRay.near = 0;
            _projRay.far = dist;
            const carrierHits = _projRay.intersectObject(carrierGroup, true);

            let hitPoint = null;
            for (let j = 0; j < carrierHits.length; j++) {
                let obj = carrierHits[j].object;
                let isShooter = false;
                while (obj) {
                    if (obj === mainHelicopter) {
                        isShooter = true;
                        break;
                    }
                    obj = obj.parent;
                }
                if (!isShooter) {
                    hitPoint = carrierHits[j].point;
                    break;
                }
            }

            if (hitPoint) {
                const smokeGeom = new THREE.SphereGeometry(1.5, 8, 8);
                const smokeMatBase = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.8 });

                for (let k = 0; k < 3; k++) {
                    const sMesh = new THREE.Mesh(smokeGeom, smokeMatBase.clone());
                    sMesh.position.copy(hitPoint);
                    sMesh.position.x += (Math.random() - 0.5) * 1.5;
                    sMesh.position.y += (Math.random() - 0.5) * 1.5;
                    sMesh.position.z += (Math.random() - 0.5) * 1.5;
                    scene.add(sMesh);
                    smokes.push({
                        mesh: sMesh,
                        life: 1.0 + Math.random() * 0.5,
                        maxLife: 1.5,
                        scale: 0.5 + Math.random() * 0.5,
                        velY: 4 + Math.random() * 8
                    });
                }

                scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                projectiles.splice(i, 1);
                continue;
            }

            if (p.mesh.position.y > WATER_LEVEL_Y && _projNextPos.y <= WATER_LEVEL_Y) {
                const hitFactor = (WATER_LEVEL_Y - p.mesh.position.y) / _projMoveVec.y;
                const hitX = p.mesh.position.x + _projMoveVec.x * hitFactor;
                const hitZ = p.mesh.position.z + _projMoveVec.z * hitFactor;

                const ringGeom = new THREE.RingGeometry(0.1, 1.5, 32);
                const splashMat = new THREE.MeshBasicMaterial({
                    color: 0xdddddd,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
                const splashMesh = new THREE.Mesh(ringGeom, splashMat);
                splashMesh.rotation.x = -Math.PI / 2;
                splashMesh.position.set(hitX, WATER_LEVEL_Y + 0.2, hitZ);
                scene.add(splashMesh);

                splashes.push({ mesh: splashMesh, life: 0.8, maxLife: 0.8, scale: 1.0 });

                scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                projectiles.splice(i, 1);
                continue;
            }

            p.mesh.position.copy(_projNextPos);
            p.distanceTraveled += dist;

            if (p.distanceTraveled > 4000) {
                scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                projectiles.splice(i, 1);
            }
        }

        for (let i = splashes.length - 1; i >= 0; i--) {
            const s = splashes[i];
            s.life -= frameDeltaSeconds;
            if (s.life <= 0) {
                scene.remove(s.mesh);
                if (s.mesh.geometry) s.mesh.geometry.dispose();
                if (s.mesh.material) s.mesh.material.dispose();
                splashes.splice(i, 1);
            } else {
                s.scale += frameDeltaSeconds * 20;
                s.mesh.scale.set(s.scale, s.scale, s.scale);
                s.mesh.material.opacity = (s.life / s.maxLife) * 0.7;
            }
        }

        for (let i = smokes.length - 1; i >= 0; i--) {
            const s = smokes[i];
            s.life -= frameDeltaSeconds;
            if (s.life <= 0) {
                scene.remove(s.mesh);
                if (s.mesh.geometry) s.mesh.geometry.dispose();
                if (s.mesh.material) s.mesh.material.dispose();
                smokes.splice(i, 1);
            } else {
                s.scale += frameDeltaSeconds * 3;
                s.mesh.scale.set(s.scale, s.scale, s.scale);
                s.mesh.position.y += s.velY * frameDeltaSeconds;
                s.mesh.material.opacity = (s.life / s.maxLife) * 0.8;
            }
        }

        fighterStateMachine.update(frameDeltaSeconds);

        if (currentVehicleViewMode) {
            if (currentVehicleViewMode === "heli") {
                updateHelicopterMovement(frameDeltaSeconds);
            }
            updateVehicleViewCamera();
        } else if (isFirstPersonMode) {
            updateFirstPersonMovement(frameDeltaSeconds);
        } else {
            if (controls.target.y < MIN_CAMERA_Y) {
                controls.target.y = MIN_CAMERA_Y;
            }
            controls.update();

            const newPos = checkDeckCollision(camera.position);
            if (newPos) {
                camera.position.copy(newPos);
            }

            if (camera.position.y < MIN_CAMERA_Y) {
                camera.position.y = MIN_CAMERA_Y;
            }
        }

        radarSpinner.rotation.y += 0.01;
        updateDayNightCycle(getEffectiveCycleElapsedMs());
        renderer.render(scene, camera);
        updateThreeStatsHud();
    }

    updateDayNightCycle(getEffectiveCycleElapsedMs());
    renderScene();
}

const mainMenu = document.getElementById("mainMenu");
const militaryMenu = document.getElementById("militaryMenu");
const backToMenuBtn = document.getElementById("backToMenuBtn");
const subBackBtn = document.getElementById("subBackBtn");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const modelGalleryPage = document.getElementById("modelGalleryPage");
const modelViewerPage = document.getElementById("modelViewerPage");
const controlsPage = document.getElementById("controlsPage");
const aboutPage = document.getElementById("aboutPage");
const modelViewerCanvas = document.getElementById("modelViewerCanvas");
const modelViewerPanel = document.getElementById("modelViewerPanel");
const modelViewerTitle = document.getElementById("modelViewerTitle");
let simInitialized = false;
let currentSubPage = null;
let modelViewerActive = false;
let parametersOn = false;
let setParametersEnabled = null;

const modelLabels = getModelLabels();

function hideAllSubPages() {
    modelGalleryPage.classList.remove("active");
    modelViewerPage.classList.remove("active");
    controlsPage.classList.remove("active");
    aboutPage.classList.remove("active");
    modelViewerPanel.classList.remove("active");
    modelViewerTitle.classList.remove("active");
    subBackBtn.classList.remove("active");
}

function showSubPage(pageId) {
    hideAllSubPages();
    currentSubPage = pageId;
    mainMenu.style.display = "none";
    subBackBtn.classList.add("active");
    backToMenuBtn.style.display = "none";

    if (pageId === "gallery") {
        modelGalleryPage.classList.add("active");
    } else if (pageId === "controls") {
        controlsPage.classList.add("active");
    } else if (pageId === "about") {
        aboutPage.classList.add("active");
    }
}

function returnToMainMenu() {
    if (modelViewerActive) {
        stopModelViewer();
        modelViewerActive = false;
        modelViewerPanel.innerHTML = "";
    }
    if (typeof setParametersEnabled === "function") {
        setParametersEnabled(false);
    }
    hideAllSubPages();
    currentSubPage = null;
    mainMenu.style.display = "flex";
    subBackBtn.classList.remove("active");
    if (simInitialized) {
        backToMenuBtn.style.display = "block";
    }
}

function buildViewerControlButtons(availableControls, uiState, handlers) {
    modelViewerPanel.innerHTML = "";
    if (!handlers) return;

    if (availableControls.includes("lights")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "viewer-btn" + (uiState.lightsOn ? " on" : "");
        btn.textContent = uiState.lightsOn ? "Lights: ON" : "Lights: OFF";
        btn.addEventListener("click", () => {
            handlers.toggleLights();
            btn.classList.toggle("on", uiState.lightsOn);
            btn.textContent = uiState.lightsOn ? "Lights: ON" : "Lights: OFF";
        });
        modelViewerPanel.appendChild(btn);
    }
    if (availableControls.includes("rotors")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "viewer-btn" + (uiState.rotorsOn ? " on" : "");
        btn.textContent = uiState.rotorsOn ? "Rotors: ON" : "Rotors: OFF";
        btn.addEventListener("click", () => {
            handlers.toggleRotors();
            btn.classList.toggle("on", uiState.rotorsOn);
            btn.textContent = uiState.rotorsOn ? "Rotors: ON" : "Rotors: OFF";
        });
        modelViewerPanel.appendChild(btn);
    }
    if (availableControls.includes("gear")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "viewer-btn" + (uiState.gearDeployed ? " on" : "");
        btn.textContent = uiState.gearDeployed ? "Gear: Extended" : "Gear: Retracted";
        btn.addEventListener("click", () => {
            handlers.toggleGear();
            btn.classList.toggle("on", uiState.gearDeployed);
            btn.textContent = uiState.gearDeployed ? "Gear: Extended" : "Gear: Retracted";
        });
        modelViewerPanel.appendChild(btn);
    }
    if (availableControls.includes("radar")) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "viewer-btn" + (uiState.radarOn ? " on" : "");
        btn.textContent = uiState.radarOn ? "Radar: ON" : "Radar: OFF";
        btn.addEventListener("click", () => {
            handlers.toggleRadar();
            btn.classList.toggle("on", uiState.radarOn);
            btn.textContent = uiState.radarOn ? "Radar: ON" : "Radar: OFF";
        });
        modelViewerPanel.appendChild(btn);
    }
}

function openModelViewer(modelId) {
    hideAllSubPages();
    modelViewerPage.classList.add("active");
    modelViewerPanel.classList.add("active");
    modelViewerTitle.classList.add("active");
    modelViewerTitle.textContent = (modelLabels[modelId] || modelId) + " — drag to rotate, scroll to zoom";
    subBackBtn.classList.add("active");
    currentSubPage = "viewer";

    startModelViewer(modelViewerCanvas, modelId, (uiState, availableControls, handlers) => {
        buildViewerControlButtons(availableControls, uiState, handlers);
    });
    modelViewerActive = true;
}

document.querySelectorAll(".model-pick-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        openModelViewer(btn.dataset.model);
    });
});

subBackBtn.addEventListener("click", () => {
    if (currentSubPage === "viewer") {
        stopModelViewer();
        modelViewerActive = false;
        modelViewerPanel.innerHTML = "";
        showSubPage("gallery");
    } else {
        returnToMainMenu();
    }
});

window.addEventListener("resize", () => {
    resizeModelViewer();
});

document.getElementById("btnPlay").addEventListener("click", () => {
    if (window.innerWidth <= 768) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement
                .requestFullscreen()
                .then(() => {
                    if (screen.orientation && screen.orientation.lock) {
                        screen.orientation
                            .lock("landscape")
                            .catch(() => {});
                    }
                })
                .catch(() => {});
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen();
        }
    }

    mainMenu.style.display = "none";

    if (!simInitialized) {
        const loadingScreen = document.getElementById("loadingScreen");
        const loadingBarFill = document.getElementById("loadingBarFill");
        const loadingStatus = document.getElementById("loadingStatus");

        loadingScreen.classList.add("active");
        loadingBarFill.style.width = "15%";
        loadingStatus.textContent = "Preparing renderer...";

        setTimeout(() => {
            loadingBarFill.style.width = "40%";
            loadingStatus.textContent = "Building models...";

            setTimeout(() => {
                loadingBarFill.style.width = "70%";
                loadingStatus.textContent = "Configuring scene...";

                init();
                simInitialized = true;

                loadingBarFill.style.width = "100%";
                loadingStatus.textContent = "Systems online";

                setTimeout(() => {
                    loadingScreen.classList.add("fade-out");
                    militaryMenu.classList.add("game-active");
                    hamburgerBtn.classList.add("game-active");
                    backToMenuBtn.style.display = "block";

                    setTimeout(() => {
                        loadingScreen.classList.remove("active", "fade-out");
                    }, 600);
                }, 400);
            }, 50);
        }, 50);
    } else {
        militaryMenu.classList.add("game-active");
        hamburgerBtn.classList.add("game-active");
        backToMenuBtn.style.display = "block";
    }
});

hamburgerBtn.addEventListener("click", () => {
    militaryMenu.classList.toggle("mobile-open");
});

backToMenuBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
    }
    militaryMenu.classList.remove("game-active", "mobile-open");
    hamburgerBtn.classList.remove("game-active");
    const mobileControls = document.getElementById("mobileControls");
    if (mobileControls) {
        mobileControls.style.display = "none";
    }
    returnToMainMenu();
});

document.getElementById("btnControls").addEventListener("click", () => {
    showSubPage("controls");
});

document.getElementById("btnModels").addEventListener("click", () => {
    showSubPage("gallery");
});

document.getElementById("btnAbout").addEventListener("click", () => {
    showSubPage("about");
});
