/**
Example of Three.js + Ammo.js + pmrpc.js

utilizing workers to speed and smooth physics rendering

@author andrew strelzoff
@email andrew.strelzoff@gmail.com
@acknowldgements 
Early versions of this code were prototyped by Eric Mixon, 
and Jeremy Jones contributed the cannon ball targeting code and other fixes
@license   The MIT License

Copyright (c) 2011 GuardianResearch and Andrew Strelzoff. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.  
**/

var shots = 5;
var NUM = 80;  //number of blocks to simulate


var container, stats;
var camera, scene, renderer, objects;
var pointlight;
var dt;
var myprojectiletype = "sphere"; //"box" //"cone"  
var myprojectilespeed = 150;
var controls;

var w = window.innerWidth;
var h = window.innerHeight;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

var workerCount = 1;
var delta = 40;  //physics time step in ms
var boxes = [];

init();
startworkers();
animate();

function init() {
	container = document.createElement("div");
	document.body.appendChild(container);

	scene = new THREE.Scene();

	addCamera();
	addLights();
	addGrid();
	for (var i = 0; i <= NUM; i++)  //add cubes and projectile to the scene
		createCube(i);

	renderer = new THREE.WebGLRenderer();  //set up for rendering
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(new THREE.Color(0x99CCFF), 1);

	container.appendChild(renderer.domElement);

	addControls();

	setEventListeners();  //double click to fire cannon
	window.addEventListener( 'resize', onWindowResize, false );
	
}

function addCamera() {
	
	camera = new THREE.PerspectiveCamera(60,window.innerWidth / window.innerHeight,1,1e3);
	camera.position.x = -15;
	camera.position.y = 6;
	camera.position.z = 15;
	//camera.target.position.y = 6.0;	
}

function addControls(){
	controls = new THREE.TrackballControls( camera, renderer.domElement );
	controls.rotateSpeed = 1.0;
	controls.zoomSpeed =1.2;
	controls.panSpeed = 0.8;
	controls.noZoom = false;
	controls.noPan = false;
	controls.staticMoving = true;
	controls.dynamicDampingFactor =  0.3;
	controls.keys = [65, 83, 68];
	controls.minDistance = 1.1;
	controls.maxDistance = 100;
}


function addLights() {
	var pointLight = new THREE.PointLight(0xffffff);
	pointLight.position.set(20, 30, 20);
	scene.add(pointLight);
	var ambientLight = new THREE.AmbientLight(0x909090);
	scene.add(ambientLight);
}

function addGrid() {
	var geometry = new THREE.PlaneGeometry(100, 100);

	var xm = [];
	xm.push(new THREE.MeshBasicMaterial({
		map: THREE.ImageUtils.loadTexture('textures/bigGrass.jpg')
	}));

	/*  xm.push(new THREE.MeshBasicMaterial({
		color: 0x000000,
		wireframe: true
		}));*/

		geometry = new THREE.PlaneGeometry(100, 100, 40, 40);

		var ground = new THREE.Mesh(geometry, xm);

		ground.position.set(0, 0, 0);
		ground.rotation.x = -1.57;

		scene.add(ground);
}

function createCube(i) {
	var material = [];
	material.push(new THREE.MeshLambertMaterial({
		map: THREE.ImageUtils.loadTexture('textures/redbrick.jpg')
	}));

	if((myprojectiletype == "sphere") && (i == 0)){
		var geometry = new THREE.SphereGeometry(1.4, 16, 8);
		material.push(new THREE.MeshLambertMaterial({
			map: THREE.ImageUtils.loadTexture('textures/baseball.jpg')
		}));

	}
	else if ((myprojectiletype == "cone") && (i == 0)){
		var geometry = new THREE.CylinderGeometry(16, 0.1, 1.0, 1.4);
		material.push(new THREE.MeshBasicMaterial({"color":0x000000,"wireframe":true}));
	}
	else{
		var geometry = new THREE.CubeGeometry(2, 2, 2);
	}
	boxes[i] = new THREE.Mesh(geometry, material);
	boxes[i].position.x = 0;
	boxes[i].position.y = (i * 10) + 5;
	boxes[i].position.z = 0;
	if ((myprojectiletype == "cone") && (i == 0)){
		boxes[i].rotation.x = Math.Pi/2;
	}
	scene.add(boxes[i]);
}

function setEventListeners() {
	document.addEventListener('dblclick', onDocumentMouseDown, false);
}

function onDocumentMouseDown(event) {
	if(shots == 0){
		wall();
		shots = 5;
	}
	else{  
		fire(event.clientX,event.clientY);
		shots--;
	}
}

//worker setup - starts worker(s) and registers pmrpc function for physics updates

function startworkers(){
	workers = new Array(workerCount);
	for (var i = 0; i < workerCount; i++) {
		workers[i] = new Worker("js/worker.js");
	}
	for (var i = 0; i < workerCount; i++) {
		pmrpc.call( {
			destination : workers[i],
			publicProcedureName : "initWorker",
		params : [delta,NUM] } );
	}
	pmrpc.register( {
		publicProcedureName : "update",
		procedure : function(i,position,quaternion) {
			boxes[i].position.x = position[0];
			boxes[i].position.y = position[1];
			boxes[i].position.z = position[2];
			boxes[i].quaternion.x = quaternion[0];
			boxes[i].quaternion.y = quaternion[1];
			boxes[i].quaternion.z = quaternion[2];
			boxes[i].quaternion.w = quaternion[3];
			boxes[i].useQuaternion = true;
		}});
}

//pmrpc calls to various physics functions
function wall(){
	for (var i = 0; i < workerCount; i++) {
		//workers[i]. postMessage('{"type":"wall"}');
		pmrpc.call( {
			destination : workers[i],
			publicProcedureName : "wall",
		params : [] } );
	}
}

function fire(x,y) {
	var vector = new THREE.Vector3((x / window.innerWidth) * 2 - 1,
	-(y / window.innerHeight) * 2 + 1,
	1);
	var projector = new THREE.Projector();
	projector.unprojectVector(vector, camera);
	vector.normalize();
	vector.multiplyScalar(myprojectilespeed);
	for (var i = 0; i < workerCount; i++) {
		pmrpc.call( {
			destination : workers[i],
			publicProcedureName : "fire",
		params : [camera.position,vector] } );
	}
}

function onWindowResize( event ) {

				width = window.innerWidth;
				height = window.innerHeight;

				renderer.setSize( width, height );

				camera.aspect = width / height;
				camera.updateProjectionMatrix();

				controls.screen.width = width;
				controls.screen.height = height;

				camera.radius = ( width + height ) / 4;

	};


//requestAnimationFrame insures that render doesn't run when tab is not visible
function animate() {
	requestAnimationFrame(animate);
	render();

}

function render() {

	controls.update();

	renderer.clear();
	renderer.render(scene, camera);
}


