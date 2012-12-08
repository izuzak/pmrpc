// ammo.js worker using pmrpc calls to wrap up calls to and from the render client
// @author andrew strelzoff
//see client.js for license and such

importScripts("ammo.js");
importScripts('https://raw.github.com/izuzak/pmrpc/master/pmrpc.js');

var transform = new Ammo.btTransform();
var mygravity = -10;
var mytargetmass = 1;
var myprojectilemass = 30;
var myprojectiletype = "sphere"; //"box" //"cone"  
var myprojectilespeed = 150;
var NUM;
var NUMRANGE = [];
var quat = new Ammo.btQuaternion(0, 0, 0);


// start up Bullet Physics
var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
var overlappingPairCache = new Ammo.btDbvtBroadphase();
var solver = new Ammo.btSequentialImpulseConstraintSolver();
var dynamicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, overlappingPairCache, solver, collisionConfiguration);
dynamicsWorld.setGravity(new Ammo.btVector3(0, mygravity, 0));

var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(1000, 50, 1000));

var bodies = [];

var groundTransform = new Ammo.btTransform();
groundTransform.setIdentity();
groundTransform.setOrigin(new Ammo.btVector3(0, -50, 0));

function addStaticBody(shape, trans) {
	var mass = 0;
	var localInertia = new Ammo.btVector3(0, 0, 0);
	var myMotionState = new Ammo.btDefaultMotionState(trans);
	var rbInfo = new Ammo.btRigidBodyConstructionInfo(0, myMotionState, shape, localInertia);
	var body = new Ammo.btRigidBody(rbInfo);

	dynamicsWorld.addRigidBody(body);
	bodies.push(body);
}

pmrpc.register( {
	publicProcedureName : "fire",
	procedure : function(campos,vector) {
		var body = bodies[1];
		var origin = body.getWorldTransform().getOrigin();
		origin.setX(campos.x);
		origin.setY(campos.y);
		origin.setZ(campos.z);
		body.setLinearVelocity(new Ammo.btVector3(vector.x, vector.y, vector.z));
		body.activate();
	} 
} );

	pmrpc.register( {
		publicProcedureName : "wall",
		procedure : wall
	} );

	function wall() {  //local copy for local call - necesary?
		NUMRANGE.forEach(function(i) {
			bodies[i].getWorldTransform().setIdentity();
			bodies[i].getWorldTransform().setRotation(quat);
			bodies[i].setLinearVelocity(new Ammo.btVector3(0, 0, 0));
			bodies[i].setAngularVelocity(new Ammo.btVector3(0, 0, 0));
			var origin = bodies[i].getWorldTransform().getOrigin();

			origin.setX((2.05 * (i % 10) ) );
			origin.setY(1 + Math.floor(2.00 * (NUM - i) / 10));
			origin.setZ(Math.random()-0.5);

			bodies[i].activate();
			if (i == 1) {
				origin.setX(500);
				origin.setY(0);
				origin.setZ(500);
				bodies[i].activate();
			}
		});
	}

	function readBulletObject(i, pos, quat) {
		var body = bodies[i];
		body.getMotionState().getWorldTransform(transform);
		var origin = transform.getOrigin();
		pos[0] = origin.x();
		pos[1] = origin.y();
		pos[2] = origin.z();
		var rotation = transform.getRotation();
		quat[0] = rotation.x();
		quat[1] = rotation.y();
		quat[2] = rotation.z();
		quat[3] = rotation.w();
	}

	function simulatePhysics(dt) {
		dynamicsWorld.stepSimulation(dt, 1);
		// Read bullet data into JS objects
		for (var i = 0; i <= NUM; i++) {        
			var position = [0, 0, 0];
			var quaternion = [0, 0, 0, 0];
			readBulletObject(i + 1, position, quaternion);
			pmrpc.call( {            
				publicProcedureName : "update",
			params : [i,position,quaternion] } );		
		}
	}

	addStaticBody(groundShape, groundTransform);

	pmrpc.register( {
		publicProcedureName : "initWorker",
		procedure : function(delta,mynum) {
			NUM = mynum;
			for (var i = 0; i <= NUM; i++)
				NUMRANGE[i] = i + 1;
			NUMRANGE.forEach(function(i) {
				if((myprojectiletype == "sphere") &&(i==1)){
					var boxShape = new Ammo.btSphereShape(2);
				}
				else if((myprojectiletype == "cone") &&(i==1)){
					var boxShape = new Ammo.btConeShape(1,2);
				}
				else{        
					var boxShape = new Ammo.btBoxShape(new Ammo.btVector3(1, 1, 1));
				}
				var startTransform = new Ammo.btTransform();
				startTransform.setIdentity();
				if (i == 1) var mass = myprojectilemass;
			else
				mass = mytargetmass;
			var localInertia = new Ammo.btVector3(0, 0, 0);
			boxShape.calculateLocalInertia(mass, localInertia);

			var myMotionState = new Ammo.btDefaultMotionState(startTransform);

			var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, myMotionState, boxShape, localInertia);

			var body = new Ammo.btRigidBody(rbInfo);

			dynamicsWorld.addRigidBody(body);
			bodies.push(body);	      
			});  //finished initial setup
			wall();
			//done setting up	      
			//start physics clock
			setInterval('simulatePhysics('+delta*8+')',delta/4);	
		}
	});
