import * as THREE from "three";

export function buildF22Model() {
	const airplaneGroup = new THREE.Group();

	const boxGeometry = new THREE.CylinderGeometry(6, 3, 48, 4);
	const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
	const box = new THREE.Mesh(boxGeometry, boxMaterial);
	box.position.x = 0;
	box.position.y = 13;
	box.position.z = 0;
	box.rotation.x = Math.PI / 2;
	box.rotation.y = Math.PI / 4;
	airplaneGroup.add(box);

	const cabinetGeometry = new THREE.ConeGeometry(7, 28, 5);
	const cabinetMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
	const cabinet = new THREE.Mesh(cabinetGeometry, cabinetMaterial);
	cabinet.position.x = 0;
	cabinet.position.y = 13;
	cabinet.position.z = 39;
	cabinet.rotation.x = Math.PI / 2;
	airplaneGroup.add(cabinet);

	const invertcabinetGeometry = new THREE.ConeGeometry(7, 22, 5);
	const invertcabinetMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
	const invertcabinet = new THREE.Mesh(invertcabinetGeometry, invertcabinetMaterial);
	invertcabinet.position.x = 0;
	invertcabinet.position.y = 13;
	invertcabinet.position.z = 14;
	invertcabinet.rotation.x = Math.PI + Math.PI / 2;
	invertcabinet.rotation.y = Math.PI / 5;
	airplaneGroup.add(invertcabinet);

	const motorGeometry = new THREE.BoxGeometry(18, 5, 44);
	const motorMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
	const motor = new THREE.Mesh(motorGeometry, motorMaterial);
	motor.position.x = 0;
	motor.position.y = 12.4;
	motor.position.z = -2;
	airplaneGroup.add(motor);

	const asaMaterial = new THREE.MeshStandardMaterial({
		color: 0x333333,
		flatShading: true
	});

	function criarTrapezio(p1, p2, p3, p4) {
		const thickness = 0.45;
		const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
		const v2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
		const v3 = new THREE.Vector3(p3[0], p3[1], p3[2]);
		const v4 = new THREE.Vector3(p4[0], p4[1], p4[2]);

		const normal = new THREE.Vector3()
			.subVectors(v2, v1)
			.cross(new THREE.Vector3().subVectors(v3, v1))
			.normalize();
		const offset = normal.multiplyScalar(thickness * 0.5);

		const front1 = v1.clone().add(offset);
		const front2 = v2.clone().add(offset);
		const front3 = v3.clone().add(offset);
		const front4 = v4.clone().add(offset);

		const back1 = v1.clone().sub(offset);
		const back2 = v2.clone().sub(offset);
		const back3 = v3.clone().sub(offset);
		const back4 = v4.clone().sub(offset);

		const vertices = new Float32Array([
			front1.x, front1.y, front1.z,
			front2.x, front2.y, front2.z,
			front3.x, front3.y, front3.z,
			front4.x, front4.y, front4.z,
			back1.x, back1.y, back1.z,
			back2.x, back2.y, back2.z,
			back3.x, back3.y, back3.z,
			back4.x, back4.y, back4.z
		]);

		const indices = [
			0, 1, 2, 0, 2, 3,
			6, 5, 4, 7, 6, 4,
			0, 4, 5, 0, 5, 1,
			1, 5, 6, 1, 6, 2,
			2, 6, 7, 2, 7, 3,
			3, 7, 4, 3, 4, 0
		];

		const geo = new THREE.BufferGeometry();
		geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
		geo.setIndex(indices);
		geo.computeVertexNormals();
		return geo;
	}

	const asaprincipaldireitaGeo = criarTrapezio(
		[0, 0, 17],
		[0, 0, -24],
		[30, 0, -10],
		[30, 0, -5]
	);
	const asaDireita = new THREE.Mesh(asaprincipaldireitaGeo, asaMaterial);
	asaDireita.position.set(0, 15, 0);
	airplaneGroup.add(asaDireita);

	const asaprincipalEsquerdaGeo = criarTrapezio(
		[0, 0, 17],
		[0, 0, -24],
		[-30, 0, -10],
		[-30, 0, -5]
	);
	const asaEsquerda = new THREE.Mesh(asaprincipalEsquerdaGeo, asaMaterial);
	asaEsquerda.position.set(0, 15, 0);
	airplaneGroup.add(asaEsquerda);

	const wingTipLightGeometry = new THREE.SphereGeometry(0.55, 16, 16);
	const rightWingTipMaterial = new THREE.MeshStandardMaterial({
		color: 0xaa4444,
		emissive: 0xaa4444,
		emissiveIntensity: 0.9,
		transparent: true,
		opacity: 0.55
	});
	const leftWingTipMaterial = new THREE.MeshStandardMaterial({
		color: 0x448844,
		emissive: 0x448844,
		emissiveIntensity: 0.9,
		transparent: true,
		opacity: 0.55
	});

	const rightWingTipMesh = new THREE.Mesh(wingTipLightGeometry, rightWingTipMaterial);
	rightWingTipMesh.position.set(28, 15, -7.5);
	airplaneGroup.add(rightWingTipMesh);

	const leftWingTipMesh = new THREE.Mesh(wingTipLightGeometry, leftWingTipMaterial);
	leftWingTipMesh.position.set(-28, 15, -7.5);
	airplaneGroup.add(leftWingTipMesh);

	const rightWingTipTopLight = new THREE.PointLight(0xff0000, 120, 35);
	rightWingTipTopLight.position.set(28, 15.5, -7.5);
	airplaneGroup.add(rightWingTipTopLight);

	const rightWingTipBottomLight = new THREE.PointLight(0xff0000, 120, 35);
	rightWingTipBottomLight.position.set(28, 14.5, -7.5);
	airplaneGroup.add(rightWingTipBottomLight);

	const leftWingTipTopLight = new THREE.PointLight(0x00ff00, 120, 35);
	leftWingTipTopLight.position.set(-28, 15.5, -7.5);
	airplaneGroup.add(leftWingTipTopLight);

	const leftWingTipBottomLight = new THREE.PointLight(0x00ff00, 120, 35);
	leftWingTipBottomLight.position.set(-28, 14.5, -7.5);
	airplaneGroup.add(leftWingTipBottomLight);

	let navLightsOn = true;
	let navBlinkVisible = true;

	function setNavigationLightSources(visibleNow) {
		rightWingTipTopLight.visible = visibleNow;
		rightWingTipBottomLight.visible = visibleNow;
		leftWingTipTopLight.visible = visibleNow;
		leftWingTipBottomLight.visible = visibleNow;
	}

	function refreshNavigationLights() {
		setNavigationLightSources(navLightsOn && navBlinkVisible);
	}

	refreshNavigationLights();

	const canardDireitoGeo = criarTrapezio(
		[0, 0, 17],
		[0, 0, 0],
		[10, 0, -10],
		[10, 0, 4]
	);
	const canardDireito = new THREE.Mesh(canardDireitoGeo, asaMaterial);
	canardDireito.position.set(0, 15, 15);
	airplaneGroup.add(canardDireito);

	const canardEsquerdoGeo = criarTrapezio(
		[0, 0, 17],
		[0, 0, 0],
		[-10, 0, -10],
		[-10, 0, 4]
	);
	const canardEsquerdo = new THREE.Mesh(canardEsquerdoGeo, asaMaterial);
	canardEsquerdo.position.set(0, 15, 15);
	airplaneGroup.add(canardEsquerdo);

	const verticalStabilizerEsquerdaGeo = criarTrapezio(
		[0, 0, -22],
		[0, 0, -39],
		[8, 9, -34],
		[8, 9, -26]
	);
	const verticalStabilizerEsquerda = new THREE.Mesh(verticalStabilizerEsquerdaGeo, asaMaterial);
	verticalStabilizerEsquerda.position.set(6, 15, 15);
	airplaneGroup.add(verticalStabilizerEsquerda);

	const verticalStabilizerDireitaGeo = criarTrapezio(
		[0, 0, -22],
		[0, 0, -39],
		[-8, 9, -34],
		[-8, 9, -26]
	);
	const verticalStabilizerDireita = new THREE.Mesh(verticalStabilizerDireitaGeo, asaMaterial);
	verticalStabilizerDireita.position.set(-6, 15, 15);
	airplaneGroup.add(verticalStabilizerDireita);

	const horizontalStabilizerEsquerdaGeo = criarTrapezio(
		[0, 0, -25],
		[0, 0, -46],
		[6, 0, -48],
		[12, 0, -40]
	);
	const horizontalStabilizerEsquerda = new THREE.Mesh(horizontalStabilizerEsquerdaGeo, asaMaterial);
	horizontalStabilizerEsquerda.position.set(2, 15, 15);
	airplaneGroup.add(horizontalStabilizerEsquerda);

	const horizontalStabilizerDireitaGeo = criarTrapezio(
		[0, 0, -25],
		[0, 0, -46],
		[-6, 0, -48],
		[-12, 0, -40]
	);
	const horizontalStabilizerDireita = new THREE.Mesh(horizontalStabilizerDireitaGeo, asaMaterial);
	horizontalStabilizerDireita.position.set(-2, 15, 15);
	airplaneGroup.add(horizontalStabilizerDireita);

	const turbinaEsquerdaGeo = new THREE.CylinderGeometry(2, 3, 16, 32);
	const turbinaMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
	const turbina = new THREE.Mesh(turbinaEsquerdaGeo, turbinaMaterial);
	turbina.position.x = 4;
	turbina.position.y = 12;
	turbina.position.z = -20;
	turbina.rotation.x = Math.PI / 2;
	airplaneGroup.add(turbina);

	const turbinaDireitaGeo = new THREE.CylinderGeometry(2, 3, 16, 32);
	const turbinaDireita = new THREE.Mesh(turbinaDireitaGeo, turbinaMaterial);
	turbinaDireita.position.x = -4;
	turbinaDireita.position.y = 12;
	turbinaDireita.position.z = -20;
	turbinaDireita.rotation.x = Math.PI / 2;
	airplaneGroup.add(turbinaDireita);

	const cockpitGeo = new THREE.CapsuleGeometry(4, 4.5, 3, 8);
	const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, transparent: true, opacity: 0.7 });
	const cockpit = new THREE.Mesh(cockpitGeo, cockpitMaterial);
	cockpit.position.x = 0;
	cockpit.position.y = 15;
	cockpit.position.z = 29.8;
	cockpit.rotation.x = Math.PI / 2 + Math.PI / 10;
	airplaneGroup.add(cockpit);

	const rodaPousoGeo = new THREE.CylinderGeometry(2, 2, 2, 32);
	const rodaPousoMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
	const eixoRodaGeo = new THREE.CylinderGeometry(0.5, 0.5, 8, 32);
	const eixoRodaMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

	const frontGearPivot = new THREE.Group();
	frontGearPivot.position.set(0, 10, 15);
	const eixoFrente = new THREE.Mesh(eixoRodaGeo, eixoRodaMaterial);
	eixoFrente.position.set(0, -4, 0);
	const rodaFrente = new THREE.Mesh(rodaPousoGeo, rodaPousoMaterial);
	rodaFrente.position.set(0, -8, 0);
	rodaFrente.rotation.z = Math.PI / 2;
	frontGearPivot.add(eixoFrente);
	frontGearPivot.add(rodaFrente);
	airplaneGroup.add(frontGearPivot);

	const rightGearPivot = new THREE.Group();
	rightGearPivot.position.set(-8, 10, -10);
	const eixoDireita = new THREE.Mesh(eixoRodaGeo, eixoRodaMaterial);
	eixoDireita.position.set(1, -4, 0);
	const rodaDireita = new THREE.Mesh(rodaPousoGeo, rodaPousoMaterial);
	rodaDireita.position.set(0, -8, 0);
	rodaDireita.rotation.z = Math.PI / 2;
	rightGearPivot.add(eixoDireita);
	rightGearPivot.add(rodaDireita);
	airplaneGroup.add(rightGearPivot);

	const leftGearPivot = new THREE.Group();
	leftGearPivot.position.set(8, 10, -10);
	const eixoEsquerda = new THREE.Mesh(eixoRodaGeo, eixoRodaMaterial);
	eixoEsquerda.position.set(-1, -4, 0);
	const rodaEsquerda = new THREE.Mesh(rodaPousoGeo, rodaPousoMaterial);
	rodaEsquerda.position.set(0, -8, 0);
	rodaEsquerda.rotation.z = Math.PI / 2;
	leftGearPivot.add(eixoEsquerda);
	leftGearPivot.add(rodaEsquerda);
	airplaneGroup.add(leftGearPivot);

	airplaneGroup.traverse((object) => {
		if (object.isMesh) {
			object.castShadow = true;
			object.receiveShadow = true;
		}
	});

	return airplaneGroup;
}
