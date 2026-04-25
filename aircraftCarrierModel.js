import * as THREE from "three";

export function buildCarrierModel(textureLoader) {
	const carrierGroup = new THREE.Group();

	const deckIronTexture = textureLoader.load(
		new URL("./iron.png", import.meta.url).href,
		(texture) => {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.wrapS = THREE.RepeatWrapping;
			texture.wrapT = THREE.RepeatWrapping;
			texture.minFilter = THREE.LinearMipmapLinearFilter;
			texture.magFilter = THREE.LinearFilter;
			texture.repeat.set(8, 3);
			texture.needsUpdate = true;
		},
		undefined,
		() => {
			console.warn("Nao foi possivel carregar iron.png para os decks.");
		}
	);

	deckIronTexture.colorSpace = THREE.SRGBColorSpace;
	deckIronTexture.wrapS = THREE.RepeatWrapping;
	deckIronTexture.wrapT = THREE.RepeatWrapping;
	deckIronTexture.minFilter = THREE.LinearMipmapLinearFilter;
	deckIronTexture.magFilter = THREE.LinearFilter;
	deckIronTexture.repeat.set(8, 3);

	const mainGeometry = new THREE.CylinderGeometry(42, 42, 300, 3);
	const mainMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
	const mainBody = new THREE.Mesh(mainGeometry, mainMaterial);
	mainBody.position.y = -35;
	mainBody.rotation.x = Math.PI / 2;
	carrierGroup.add(mainBody);

	const deckGeometry = new THREE.BoxGeometry(370, 15, 75);
	const deckMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, map: deckIronTexture });
	const deck = new THREE.Mesh(deckGeometry, deckMaterial);
	deck.position.y = -15;
	deck.rotation.y = Math.PI / 2;
	carrierGroup.add(deck);

	const secondaryDeckGeometry = new THREE.BoxGeometry(270, 15, 70);
	const secondaryDeckMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, map: deckIronTexture });
	const secondaryDeck = new THREE.Mesh(secondaryDeckGeometry, secondaryDeckMaterial);
	secondaryDeck.position.set(15, -15, 5);
	secondaryDeck.rotation.y = Math.PI / 1.65;
	carrierGroup.add(secondaryDeck);

	const thirdDeckGeometry = new THREE.BoxGeometry(270, 15, 125);
	const thirdDeckMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, map: deckIronTexture });
	const thirdDeck = new THREE.Mesh(thirdDeckGeometry, thirdDeckMaterial);
	thirdDeck.position.set(-10, -15, -5);
	thirdDeck.rotation.y = Math.PI / 2;
	carrierGroup.add(thirdDeck);

	const towerGeometry = new THREE.BoxGeometry(18, 30, 28);
	const towerMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
	const tower = new THREE.Mesh(towerGeometry, towerMaterial);
	tower.position.set(-55, 7.5, -60);
	carrierGroup.add(tower);

	const glassGeometry = new THREE.BoxGeometry(16, 8, 20);
	const glassMaterial = new THREE.MeshPhongMaterial({ color: 0x88aaff, transparent: true, opacity: 0.6 });
	const glass = new THREE.Mesh(glassGeometry, glassMaterial);
	glass.position.set(-52.5, 12, -54);
	carrierGroup.add(glass);

	const antennaGeometry = new THREE.CylinderGeometry(1.5, 1.5, 20, 16);
	const antennaMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
	const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
	antenna.position.set(-55, 25, -60);
	carrierGroup.add(antenna);

	const antenna1Geometry = new THREE.BoxGeometry(3, 1, 36);
	const antenna1Material = new THREE.MeshPhongMaterial({ color: 0x444444 });
	const antenna1 = new THREE.Mesh(antenna1Geometry, antenna1Material);
	antenna1.position.set(-55, 30, -60);
	carrierGroup.add(antenna1);

	const antenna2Geometry = new THREE.BoxGeometry(3, 1, 24);
	const antenna2Material = new THREE.MeshPhongMaterial({ color: 0x444444 });
	const antenna2 = new THREE.Mesh(antenna2Geometry, antenna2Material);
	antenna2.position.set(-55, 30, -60);
	antenna2.rotation.y = Math.PI / 2;
	carrierGroup.add(antenna2);

	const antennaMiddleGeometry = new THREE.BoxGeometry(3, 1, 24);
	const antennaMiddleMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
	const antennaMiddle = new THREE.Mesh(antennaMiddleGeometry, antennaMiddleMaterial);
	antennaMiddle.position.set(-55, 26, -60);
	antennaMiddle.rotation.y = Math.PI / 4;
	carrierGroup.add(antennaMiddle);

	const antennaMiddle2Geometry = new THREE.BoxGeometry(3, 1, 24);
	const antennaMiddle2Material = new THREE.MeshPhongMaterial({ color: 0x444444 });
	const antennaMiddle2 = new THREE.Mesh(antennaMiddle2Geometry, antennaMiddle2Material);
	antennaMiddle2.position.set(-55, 26, -60);
	antennaMiddle2.rotation.y = Math.PI / 4 + Math.PI / 2;
	carrierGroup.add(antennaMiddle2);

	const antenna3Geometry = new THREE.IcosahedronGeometry(5, 1);
	const antenna3Material = new THREE.MeshPhongMaterial({ color: 0x888888 });
	const antenna3 = new THREE.Mesh(antenna3Geometry, antenna3Material);
	antenna3.position.set(-55, 38, -60);
	carrierGroup.add(antenna3);

	const radarBaseGeometry = new THREE.CylinderGeometry(3, 4, 30, 16);
	const radarBaseMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
	const radarBase = new THREE.Mesh(radarBaseGeometry, radarBaseMaterial);
	radarBase.position.set(-55, 2.5, -90);
	carrierGroup.add(radarBase);

	const radarSupportGeometry = new THREE.CylinderGeometry(1, 1, 20, 16);
	const radarSupportMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
	const radarSupport = new THREE.Mesh(radarSupportGeometry, radarSupportMaterial);
	radarSupport.position.set(-55, 12.5, -90);
	carrierGroup.add(radarSupport);

	const radarSpinner = new THREE.Group();
	radarSpinner.position.set(-55, 25, -90);
	carrierGroup.add(radarSpinner);

	const radarDishGeometry = new THREE.BoxGeometry(16, 4, 1);
	const radarDishMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
	const radarDish = new THREE.Mesh(radarDishGeometry, radarDishMaterial);
	radarSpinner.add(radarDish);

	const antenna4Geometry = new THREE.BoxGeometry(4, 1, 10);
	const antenna4Material = new THREE.MeshPhongMaterial({ color: 0x444444 });
	const antenna4 = new THREE.Mesh(antenna4Geometry, antenna4Material);
	antenna4.position.set(-55, 19.5, -90);
	carrierGroup.add(antenna4);

	const antenna5Geometry = new THREE.CylinderGeometry(5, 4, 1);
	const antenna5Material = new THREE.MeshPhongMaterial({ color: 0x444444 });
	const antenna5 = new THREE.Mesh(antenna5Geometry, antenna5Material);
	antenna5.position.set(-55, 22.5, -90);
	carrierGroup.add(antenna5);

	const bowGeometry = new THREE.CylinderGeometry(0, 35, 60, 50);
	const bowMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
	const bow = new THREE.Mesh(bowGeometry, bowMaterial);
	bow.position.set(0, -46, 150);
	bow.rotation.x = Math.PI;
	carrierGroup.add(bow);

	const motorGeometry = new THREE.CylinderGeometry(13, 10, 25, 10);
	const motorMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
	const motor = new THREE.Mesh(motorGeometry, motorMaterial);
	motor.position.set(-10, -50, -162);
	motor.rotation.x = Math.PI / 2;
	carrierGroup.add(motor);

	const motor2Geometry = new THREE.CylinderGeometry(13, 10, 25, 10);
	const motor2Material = new THREE.MeshPhongMaterial({ color: 0x333333 });
	const motor2 = new THREE.Mesh(motor2Geometry, motor2Material);
	motor2.position.set(10, -50, -162);
	motor2.rotation.x = Math.PI / 2;
	carrierGroup.add(motor2);

	const reverseMotorGeometry = new THREE.CylinderGeometry(5, 13, 35, 10);
	const reverseMotorMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
	const reverseMotor = new THREE.Mesh(reverseMotorGeometry, reverseMotorMaterial);
	reverseMotor.position.set(-10, -50, -132);
	reverseMotor.rotation.x = Math.PI / 2;
	carrierGroup.add(reverseMotor);

	const reverseMotor2Geometry = new THREE.CylinderGeometry(5, 13, 35, 10);
	const reverseMotor2Material = new THREE.MeshPhongMaterial({ color: 0x333333 });
	const reverseMotor2 = new THREE.Mesh(reverseMotor2Geometry, reverseMotor2Material);
	reverseMotor2.position.set(10, -50, -132);
	reverseMotor2.rotation.x = Math.PI / 2;
	carrierGroup.add(reverseMotor2);

	const room1Geometry = new THREE.BoxGeometry(90, 20, 80);
	const room1Material = new THREE.MeshPhongMaterial({ color: 0x555555 });
	const room1 = new THREE.Mesh(room1Geometry, room1Material);
	room1.position.set(0, -30, -80);
	carrierGroup.add(room1);

	const room2Geometry = new THREE.BoxGeometry(90, 20, 80);
	const room2Material = new THREE.MeshPhongMaterial({ color: 0x555555 });
	const room2 = new THREE.Mesh(room2Geometry, room2Material);
	room2.position.set(0, -30, 80);
	carrierGroup.add(room2);

	const room3Geometry = new THREE.BoxGeometry(100, 20, 40);
	const room3Material = new THREE.MeshPhongMaterial({ color: 0x555555 });
	const room3 = new THREE.Mesh(room3Geometry, room3Material);
	room3.position.set(0, -30, 0);
	carrierGroup.add(room3);

	const room4Geometry = new THREE.BoxGeometry(90, 10, 320);
	const room4Material = new THREE.MeshPhongMaterial({ color: 0x555555 });
	const room4 = new THREE.Mesh(room4Geometry, room4Material);
	room4.position.set(0, -27.5, -10);
	carrierGroup.add(room4);

	const line1Geometry = new THREE.BoxGeometry(2, 1.2, 260);
	const line1Material = new THREE.MeshPhongMaterial({ color: 0x777777 });
	const line1 = new THREE.Mesh(line1Geometry, line1Material);
	line1.position.set(40, -8, -10);
	line1.rotation.y = Math.PI / 9.5;
	carrierGroup.add(line1);

	const line2Geometry = new THREE.BoxGeometry(2, 1.2, 260);
	const line2Material = new THREE.MeshPhongMaterial({ color: 0x777777 });
	const line2 = new THREE.Mesh(line2Geometry, line2Material);
	line2.position.set(-5, -8, 5);
	line2.rotation.y = Math.PI / 9.5;
	carrierGroup.add(line2);

	const lineCenterGeometry = new THREE.BoxGeometry(2, 1.2, 260);
	const lineCenterMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
	const lineCenter = new THREE.Mesh(lineCenterGeometry, lineCenterMaterial);
	lineCenter.position.set(17.5, -8, -2.5);
	lineCenter.rotation.y = Math.PI / 9.5;
	carrierGroup.add(lineCenter);

	const runwayEdgeLights = [];
	const runwayEdgeLightGeometry = new THREE.SphereGeometry(0.55, 14, 14);
	const whiteRunwayLightMaterial = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		emissive: 0xffffff,
		emissiveIntensity: 0.8
	});
	const redRunwayLightMaterial = new THREE.MeshStandardMaterial({
		color: 0xff4444,
		emissive: 0xff0000,
		emissiveIntensity: 0.8
	});
	const runwayEdgeLightColors = [0xffffff, 0xff0000];
	const runwayEdgeLineAngle = Math.PI / 9.5;
	const runwayEdgeLineLength = 260;
	const runwayEdgeLineStep = 22;
	const runwayEdgeLineOffsets = [
		{ x: 40, z: -10 },
		{ x: -5, z: 5 }
	];

	for (let laneIndex = 0; laneIndex < runwayEdgeLineOffsets.length; laneIndex++) {
		const laneOffset = runwayEdgeLineOffsets[laneIndex];
		const laneGroup = new THREE.Group();
		laneGroup.position.set(laneOffset.x, -7.4, laneOffset.z);
		laneGroup.rotation.y = runwayEdgeLineAngle;
		carrierGroup.add(laneGroup);

		for (let stepIndex = 0; stepIndex <= Math.floor(runwayEdgeLineLength / runwayEdgeLineStep); stepIndex++) {
			const localZ = -runwayEdgeLineLength / 2 + stepIndex * runwayEdgeLineStep;
			const lightColor = runwayEdgeLightColors[(stepIndex + laneIndex) % 2];
			const isWhite = lightColor === 0xffffff;
			const lightMaterial = isWhite ? whiteRunwayLightMaterial.clone() : redRunwayLightMaterial.clone();

			const lightMesh = new THREE.Mesh(runwayEdgeLightGeometry, lightMaterial);
			lightMesh.position.set(0, 0, localZ);
			laneGroup.add(lightMesh);

			const pointLight = new THREE.PointLight(lightColor, isWhite ? 18 : 12, 40);
			pointLight.position.set(0, 0, localZ);
			laneGroup.add(pointLight);

			runwayEdgeLights.push({ lightMesh, pointLight, isWhite });
		}
	}

	const heliHLeftGeometry = new THREE.BoxGeometry(1, 1.2, 14);
	const heliMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
	const heliHLeft = new THREE.Mesh(heliHLeftGeometry, heliMaterial);
	heliHLeft.position.set(-56, -8, 100);
	carrierGroup.add(heliHLeft);

	const heliHRightGeometry = new THREE.BoxGeometry(1, 1.2, 14);
	const heliHRightMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
	const heliHRight = new THREE.Mesh(heliHRightGeometry, heliHRightMaterial);
	heliHRight.position.set(-44, -8, 100);
	carrierGroup.add(heliHRight);

	const heliHMiddleGeometry = new THREE.BoxGeometry(12, 1.2, 1);
	const heliHMiddleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
	const heliHMiddle = new THREE.Mesh(heliHMiddleGeometry, heliHMiddleMaterial);
	heliHMiddle.position.set(-50, -8, 100);
	carrierGroup.add(heliHMiddle);

	const heliCircleGeometry = new THREE.RingGeometry(10.5, 12, 64);
	const heliCircleMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
	const heliCircle = new THREE.Mesh(heliCircleGeometry, heliCircleMaterial);
	heliCircle.position.set(-50, -7.35, 100);
	heliCircle.rotation.x = -Math.PI / 2;
	carrierGroup.add(heliCircle);

	const heliSquareCornerGeometry = new THREE.SphereGeometry(0.65, 16, 16);
	const heliSquareGreenMaterial = new THREE.MeshStandardMaterial({
		color: 0x66ff66,
		emissive: 0x00ff00,
		emissiveIntensity: 3.2,
		roughness: 0.2,
		metalness: 0.0,
		transparent: true,
		opacity: 0.55
	});
	const heliSquareCornerOffsetX = 14;
	const heliSquareCornerOffsetZ = 14;
	const heliSquareCornerY = -7.4;
	const heliSquareCorners = [
		[-50 - heliSquareCornerOffsetX, heliSquareCornerY, 100 - heliSquareCornerOffsetZ],
		[-50 + heliSquareCornerOffsetX, heliSquareCornerY, 100 - heliSquareCornerOffsetZ],
		[-50 + heliSquareCornerOffsetX, heliSquareCornerY, 100 + heliSquareCornerOffsetZ],
		[-50 - heliSquareCornerOffsetX, heliSquareCornerY, 100 + heliSquareCornerOffsetZ]
	];
	const heliCornerLights = [];

	for (const corner of heliSquareCorners) {
		const heliCornerMesh = new THREE.Mesh(heliSquareCornerGeometry, heliSquareGreenMaterial.clone());
		heliCornerMesh.position.set(corner[0], corner[1], corner[2]);
		carrierGroup.add(heliCornerMesh);

		const heliCornerPointLight = new THREE.PointLight(0x00ff00, 55, 45);
		heliCornerPointLight.position.set(corner[0], corner[1], corner[2]);
		carrierGroup.add(heliCornerPointLight);

		heliCornerLights.push({
			lightMesh: heliCornerMesh,
			pointLight: heliCornerPointLight,
			nightIntensity: 55,
			nightEmissive: 3.2
		});
	}

	const deckCornerLightGeometry = new THREE.SphereGeometry(0.8, 16, 16);
	const deckCornerRedMaterial = new THREE.MeshStandardMaterial({
		color: 0xff6666,
		emissive: 0xff0000,
		emissiveIntensity: 3.5,
		roughness: 0.2,
		metalness: 0.0,
		transparent: true,
		opacity: 0.55
	});

	const deckLight1 = new THREE.Mesh(deckCornerLightGeometry, deckCornerRedMaterial.clone());
	deckLight1.position.set(-25, -7.2, 172.5);
	carrierGroup.add(deckLight1);
	const deckPointLight1 = new THREE.PointLight(0xff0000, 70, 60);
	deckPointLight1.position.set(-25, -7.2, 172.5);
	carrierGroup.add(deckPointLight1);

	const deckLight2 = new THREE.Mesh(deckCornerLightGeometry, deckCornerRedMaterial.clone());
	deckLight2.position.set(25, -7.2, 172.5);
	carrierGroup.add(deckLight2);
	const deckPointLight2 = new THREE.PointLight(0xff0000, 70, 60);
	deckPointLight2.position.set(25, -7.2, 172.5);
	carrierGroup.add(deckPointLight2);

	const deckLight3 = new THREE.Mesh(deckCornerLightGeometry, deckCornerRedMaterial.clone());
	deckLight3.position.set(-25, -7.2, -172.5);
	carrierGroup.add(deckLight3);
	const deckPointLight3 = new THREE.PointLight(0xff0000, 70, 60);
	deckPointLight3.position.set(-25, -7.2, -172.5);
	carrierGroup.add(deckPointLight3);

	const deckLight4 = new THREE.Mesh(deckCornerLightGeometry, deckCornerRedMaterial.clone());
	deckLight4.position.set(25, -7.2, -172.5);
	carrierGroup.add(deckLight4);
	const deckPointLight4 = new THREE.PointLight(0xff0000, 70, 60);
	deckPointLight4.position.set(25, -7.2, -172.5);
	carrierGroup.add(deckPointLight4);

	const deckCornerLights = [
		{ lightMesh: deckLight1, pointLight: deckPointLight1, nightIntensity: 70, nightEmissive: 3.5 },
		{ lightMesh: deckLight2, pointLight: deckPointLight2, nightIntensity: 70, nightEmissive: 3.5 },
		{ lightMesh: deckLight3, pointLight: deckPointLight3, nightIntensity: 70, nightEmissive: 3.5 },
		{ lightMesh: deckLight4, pointLight: deckPointLight4, nightIntensity: 70, nightEmissive: 3.5 }
	];

	carrierGroup.traverse((object) => {
		if (object.isMesh) {
			object.castShadow = true;
			object.receiveShadow = true;
		}
	});

	return {
		carrierGroup,
		radarSpinner,
		runwayEdgeLights,
		heliCornerLights,
		deckCornerLights
	};
}
