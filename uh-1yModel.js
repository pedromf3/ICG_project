import * as THREE from "three";

export function buildUH1YModel() {
	const helicopterGroup = new THREE.Group();

	const shape = new THREE.Shape();
	shape.moveTo(-6, 6);
	shape.lineTo(6, 6);
	shape.lineTo(9, 3);
	shape.lineTo(9, -3);
	shape.lineTo(6, -6);
	shape.lineTo(-6, -6);
	shape.lineTo(-9, -3);
	shape.lineTo(-9, 3);
	shape.closePath();

	const extrudeSettings = {
		depth: 30,
		bevelEnabled: false
	};

	const bodyGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
	const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
	const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
	bodyMesh.position.set(0, 20, -15);
	bodyMesh.rotation.z = Math.PI / 2;
	helicopterGroup.add(bodyMesh);

	const bodyGeometry2 = new THREE.CapsuleGeometry(9, 20, 15);
	const bodyMaterial2 = new THREE.MeshLambertMaterial({ color: 0x666666 });
	const bodyMesh2 = new THREE.Mesh(bodyGeometry2, bodyMaterial2);
	bodyMesh2.position.set(0, 20, -2);
	bodyMesh2.rotation.x = Math.PI / 2;
	helicopterGroup.add(bodyMesh2);

	const cabinGeometry = new THREE.CylinderGeometry(5, 7, 10, 4);
	const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
	const cabinMesh = new THREE.Mesh(cabinGeometry, cabinMaterial);
	cabinMesh.position.x = 0;
	cabinMesh.position.y = 17;
	cabinMesh.position.z = 20;
	cabinMesh.rotation.x = Math.PI / 2;
	cabinMesh.rotation.y = Math.PI / 4;
	helicopterGroup.add(cabinMesh);

	const glassGeometry = new THREE.CapsuleGeometry(6, 10, 4, 8);
	const glassMaterial = new THREE.MeshLambertMaterial({ color: 0x99ccff, transparent: true, opacity: 0.6 });
	const glassMesh = new THREE.Mesh(glassGeometry, glassMaterial);
	glassMesh.position.x = 0;
	glassMesh.position.y = 22;
	glassMesh.position.z = 11;
	glassMesh.rotation.x = Math.PI / 2;
	helicopterGroup.add(glassMesh);

	const tailGeometry = new THREE.CylinderGeometry(4, 2, 45, 8);
	const tailMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
	const tailMesh = new THREE.Mesh(tailGeometry, tailMaterial);
	tailMesh.position.x = 0;
	tailMesh.position.y = 22;
	tailMesh.position.z = -35;
	tailMesh.rotation.x = Math.PI / 2;
	helicopterGroup.add(tailMesh);

	const topGeometry = new THREE.BoxGeometry(6, 6, 16);
	const topMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
	const topMesh = new THREE.Mesh(topGeometry, topMaterial);
	topMesh.position.x = 0;
	topMesh.position.y = 31;
	topMesh.position.z = 0;
	helicopterGroup.add(topMesh);

	const gearGeometry = new THREE.CylinderGeometry(3, 3, 7, 16);
	const gearMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
	const gearMesh = new THREE.Mesh(gearGeometry, gearMaterial);
	gearMesh.position.x = 0;
	gearMesh.position.y = 36;
	gearMesh.position.z = 0;
	helicopterGroup.add(gearMesh);

	const helicesGroup = new THREE.Group();
	const helixGeometry = new THREE.BoxGeometry(4, 0.3, 44);
	const helixMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

	const helixMesh1 = new THREE.Mesh(helixGeometry, helixMaterial);
	helixMesh1.position.set(1, 0, 22);
	helixMesh1.rotation.y = 0;
	helicesGroup.add(helixMesh1);

	const helixMesh2 = new THREE.Mesh(helixGeometry, helixMaterial);
	helixMesh2.position.set(-1, 0, -22);
	helixMesh2.rotation.y = Math.PI;
	helicesGroup.add(helixMesh2);

	const helixMesh3 = new THREE.Mesh(helixGeometry, helixMaterial);
	helixMesh3.position.set(22, 0, -1);
	helixMesh3.rotation.y = Math.PI / 2;
	helicesGroup.add(helixMesh3);

	const helixMesh4 = new THREE.Mesh(helixGeometry, helixMaterial);
	helixMesh4.position.set(-22, 0, 1);
	helixMesh4.rotation.y = -Math.PI / 2;
	helicesGroup.add(helixMesh4);

	helicesGroup.position.set(0, 38, 0);
	helicopterGroup.add(helicesGroup);

	const backGearGeometry = new THREE.CylinderGeometry(2, 2, 9, 16);
	const backGearMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
	const backGearMesh = new THREE.Mesh(backGearGeometry, backGearMaterial);
	backGearMesh.position.x = 2;
	backGearMesh.position.y = 23;
	backGearMesh.position.z = -58;
	backGearMesh.rotation.x = Math.PI / 2;
	backGearMesh.rotation.z = Math.PI / 2;
	helicopterGroup.add(backGearMesh);

	const backHelicesPivot = new THREE.Group();
	backHelicesPivot.position.set(5, 23, -58);
	backHelicesPivot.rotation.x = Math.PI / 2;
	backHelicesPivot.rotation.z = Math.PI / 2;
	helicopterGroup.add(backHelicesPivot);

	const backHelicesGroup = new THREE.Group();
	const backHelixGeometry = new THREE.BoxGeometry(3, 0.2, 12);
	const backHelixMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

	const backHelixMesh1 = new THREE.Mesh(backHelixGeometry, backHelixMaterial);
	backHelixMesh1.position.set(1, 0, 6);
	backHelixMesh1.rotation.y = 0;
	backHelicesGroup.add(backHelixMesh1);

	const backHelixMesh2 = new THREE.Mesh(backHelixGeometry, backHelixMaterial);
	backHelixMesh2.position.set(-1, 0, -6);
	backHelixMesh2.rotation.y = Math.PI;
	backHelicesGroup.add(backHelixMesh2);

	const backHelixMesh3 = new THREE.Mesh(backHelixGeometry, backHelixMaterial);
	backHelixMesh3.position.set(6, 0, -1);
	backHelixMesh3.rotation.y = Math.PI / 2;
	backHelicesGroup.add(backHelixMesh3);

	const backHelixMesh4 = new THREE.Mesh(backHelixGeometry, backHelixMaterial);
	backHelixMesh4.position.set(-6, 0, 1);
	backHelixMesh4.rotation.y = -Math.PI / 2;
	backHelicesGroup.add(backHelixMesh4);

	backHelicesPivot.add(backHelicesGroup);

	const landingGearGroup = new THREE.Group();
	const trainGeometry = new THREE.CylinderGeometry(1, 0.6, 10, 8);
	const trainMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

	const trainMesh1 = new THREE.Mesh(trainGeometry, trainMaterial);
	trainMesh1.position.set(8, 10, -7);
	trainMesh1.rotation.z = Math.PI / 4;
	landingGearGroup.add(trainMesh1);

	const trainMesh2 = new THREE.Mesh(trainGeometry, trainMaterial);
	trainMesh2.position.set(-8, 10, -7);
	trainMesh2.rotation.z = -Math.PI / 4;
	landingGearGroup.add(trainMesh2);

	const trainMesh3 = new THREE.Mesh(trainGeometry, trainMaterial);
	trainMesh3.position.set(8, 10, 8);
	trainMesh3.rotation.z = Math.PI / 4;
	landingGearGroup.add(trainMesh3);

	const trainMesh4 = new THREE.Mesh(trainGeometry, trainMaterial);
	trainMesh4.position.set(-8, 10, 8);
	trainMesh4.rotation.z = -Math.PI / 4;
	landingGearGroup.add(trainMesh4);

	const skidGeometry = new THREE.CylinderGeometry(0.8, 0.8, 30, 8);
	const skidMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

	const skidRight = new THREE.Mesh(skidGeometry, skidMaterial);
	skidRight.position.set(12, 6.2, 0.5);
	skidRight.rotation.x = Math.PI / 2;
	landingGearGroup.add(skidRight);

	const skidLeft = new THREE.Mesh(skidGeometry, skidMaterial);
	skidLeft.position.set(-12, 6.2, 0.5);
	skidLeft.rotation.x = Math.PI / 2;
	landingGearGroup.add(skidLeft);

	helicopterGroup.add(landingGearGroup);

	const tailNavLightGeometry = new THREE.SphereGeometry(0.55, 16, 16);
	const tailNavLightMaterial = new THREE.MeshStandardMaterial({
		color: 0xaa2222,
		emissive: 0xaa2222,
		emissiveIntensity: 0.95,
		transparent: true,
		opacity: 0.7
	});
	const tailNavLightMesh = new THREE.Mesh(tailNavLightGeometry, tailNavLightMaterial);
	tailNavLightMesh.position.set(-2.5, 23, -58);
	helicopterGroup.add(tailNavLightMesh);

	const tailNavLight = new THREE.PointLight(0xff0000, 180, 42);
	tailNavLight.position.set(-2.8, 23, -58);
	helicopterGroup.add(tailNavLight);

	const frontHeadLight = new THREE.SpotLight(0xffffff, 11000, 220, Math.PI / 4, 0.55, 1.4);
	frontHeadLight.position.set(0, 14, 24.5);
	const frontHeadLightTarget = new THREE.Object3D();
	frontHeadLightTarget.position.set(0, 14, 70);
	helicopterGroup.add(frontHeadLightTarget);
	frontHeadLight.target = frontHeadLightTarget;
	helicopterGroup.add(frontHeadLight);

	const frontSpotLensGeometry = new THREE.SphereGeometry(1.1, 18, 18);
	const frontSpotLensMaterial = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		emissive: 0xffffff,
		emissiveIntensity: 0.9,
		transparent: true,
		opacity: 0.65
	});

	const frontSpotLensLeft = new THREE.Mesh(frontSpotLensGeometry, frontSpotLensMaterial);
	frontSpotLensLeft.position.copy(frontHeadLight.position);
	helicopterGroup.add(frontSpotLensLeft);

	let navLightsOn = true;
	let navBlinkVisible = true;

	function setNavigationLightSources(visibleNow) {
		tailNavLight.visible = visibleNow;
		tailNavLightMaterial.emissiveIntensity = visibleNow ? 0.95 : 0.2;
		frontHeadLight.visible = navLightsOn;
		frontSpotLensLeft.material.emissiveIntensity = navLightsOn ? 0.9 : 0.15;
	}

	function refreshNavigationLights() {
		setNavigationLightSources(navLightsOn && navBlinkVisible);
	}

	refreshNavigationLights();

	helicopterGroup.traverse((object) => {
		if (object.isMesh) {
			object.castShadow = true;
			object.receiveShadow = true;
		}
	});

	return {
		helicopterGroup,
		helicesGroup,
		backHelicesGroup
	};
}
