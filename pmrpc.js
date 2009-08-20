/*
 * pmrpc 0.3 - HTML5 postMessage-based JSON-RPC library 
 * http://code.google.com/p/pmrpc
 *
 * Copyright (c) 2009 Ivan Zuzak, Marko Ivankovic
 * GPL license
 */

pmrpc = window.pmrpc = function(){
  // check if JSON library is available
  if (typeof JSON === "undefined" || typeof JSON.stringify === "undefined" || 
      typeof JSON.parse === "undefined") {
    throw new Exception("pmrpc requires the JSON library");
  }
  // JSON encode an object into pmrpc message
  function encode(obj){
    return JSON.stringify(obj);
  }

  // JSON decode a pmrpc message
  function decode(str){
	return JSON.parse(str);
  }

  // Generates a version 4 UUID
  // fun to use as call ids and
  // compliant with JSON-RPC specs
  function generateUUID(){
	var uuid = [], nineteen = "89AB", hex = "0123456789ABCDEF";
	// Filling it with random hex data
	for (var i = 0; i < 36; i++) uuid[i] = hex[Math.floor(Math.random() * 16)];
	// Version char thingy
	uuid[14] = '4';
	// Set the random 19-teenth char
	uuid[19] = nineteen[Math.floor(Math.random() * 4)];
	// Make it look nice with all them '-'s
	uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
	// Wooo, we have ourselfs a random (well, sorta) UUID
	return uuid.join('');
  }

  // Creates a base JSON-RPC object, usable for both request and response
  // as of JSON-RPC 2.0 it only contains one field "jsonrpc" with value exactley "2.0"
  function JSONRpcCreateBaseObject(){
	var call = new Object;	 
	call.jsonrpc = "2.0";
	return call;
  }

  // Creates a JSON-RPC request object for the given method and parameters
  function JSONRpcCreateRequestObject(procedureName, parameters, id){
	var call = JSONRpcCreateBaseObject();
	call.method = procedureName;
	call.params = parameters;
	if (typeof id !== "undefined")
		call.id = id;
	return call;
  }

  // Creates a JSON-RPC error object complete with message and error code
  function JSONRpcCreateErrorObject(errorcode, message, data){
	  var error = new Object;
	  error.code = errorcode;
	  error.message = message;
	  error.data = data;
	  return error;
  }

  // Creates a JSON-RPC response object.
  function JSONRpcCreateResponseObject(error, result, id){
	var response = JSONRpcCreateBaseObject();
	response.id = id;

	// check to see if the error object is set
	if (typeof error === "undefined") {
		// no errors, go with the payload
		response.result = result;
	}
	else {
		// error response
		response.error = error;
	}
	return response;
  } 

  // Converts a wildcard expression into a regular expression
  function convertWildcardToRegex(wildcardExpression) {
    var regex = wildcardExpression.replace(/([\^\$\.\+\?\=\!\:\|\\\/\(\)\[\]\{\}])/g,"\\$1");
    regex = "^" + regex.replace("*", ".*") + "$";
    return regex;
  }

  // Checks whether a domain satisfies the access control list. 
  // The access control list has a whitelist and a blacklist. In order to satisfy the acl, 
  // the domain must be on the whitelist, and must not be on the blacklist.
  function checkACL(accessControlList, origin) {
    var aclWhitelist = accessControlList.whitelist;
    var aclBlacklist = accessControlList.blacklist;
      
    var isWhitelisted = false;
    var isBlacklisted = false;
    
    for (var i=0; i<aclWhitelist.length; ++i) {
      var aclRegex = convertWildcardToRegex(aclWhitelist[i]);
      if(origin.match(aclRegex)) {
        isWhitelisted = true;
        break;
      }
    }
     
    for (var j=0; i<aclBlacklist.length; ++j) {
      var aclRegex = convertWildcardToRegex(aclBlacklist[j]);
      if(origin.match(aclRegex)) {
        isBlacklisted = true;
        break;
      }
    }
    
    return isWhitelisted && !isBlacklisted;
  }

  function JSONRpcProcessRequest(request, origin){
  	// decode arguments, fetch service name, call parameters, and call id
	try {
		var callArguments = decode(serviceCallEvent.data);
	}
	catch (error) {
		// JSON parsing failed, returning JSON-RPC error message -32700
		// kind of wtf because we are not even certain it was json-rpc to begin with...		
		// error object is first
		// null response (error instead)
		// null id
		return JSONRpcCreateResponseObject(
			JSONRpcCreateErrorObject(-32700, "Parse error", "Invalid JSON. An error occured on server while parsing JSON(?) text"),
			null,
			null
			);
	}

	if (callArguments.jsonrpc != "2.0") {
		// Invalid JSON-RPC request		
		return JSONRpcCreateResponseObject(
			JSONRpcCreateErrorObject(-32600, "Invalid request", "The recived JSON is not a valid JSON-RPC 2.0 request"),
			null,
			null
			);
	}

	var id = request.id;
  	var service = fetchRegisteredService(request.method);
	if (typeof service !== "undefined"){
		// So there is a service afterall...
          	// check the acl rights
	        if (checkACL(service.acl, origin)) {
			// ok, go
			if (typeof id === "undefined"){
				// a-ha! so we have ourselves a notification here!
				service.procedure.apply(service.context, parameters);
			}
			else {
				try {
					returnValue = service.procedure.apply(service.context, parameters);
					return JSONRpcCreateResponseObject(null,
						returnValue,
						id
				);
				} catch (error) {
					// uh-oh
					// the -1 value is "application defined" as far as JSON-RPC is considered
					return JSONRpcCreateResponseObject(
						JSONRpcCreateErrorObject(-1, "Remote crash", error.description),
						null,
						id
						);
				}
			}
		}
		else {
			// access denied
			if (typeof id !== "undefined"){
				// And it's not notification
				return JSONRpcCreateResponseObject(
					JSONRpcCreateErrorObject(-32099, "Access denied", "Access denied"),
					null,
					id
					);
			}
		}
	}
	else {
		// No such method
		if (typeof id !== "undefined"){
			// And it's not notification
			return JSONRpcCreateResponseObject(
				JSONRpcCreateErrorObject(-32601, "Method not found", "The requestd remote procedure does not exist or is not available"),
				null,
				id
				);
		}
	}
  }
  
  // dictionary of services registered for remote calls
  var registeredServices = {};
  // dictionary of requests being processed on the remote side
  var requestsBeingProcessed = {};
  // dictionary of requests being processed on the client side
  var callQueue = {};
  
  // register a service available for remote calls
  // if no acl is given, assume that it is available to everyone
  function register(config) {
    registeredServices[config.publicProcedureName] = {
      "procedure" : config.procedure,
      "context" : config.procedure.context,
      "isAsync" : typeof config.isAsynchronous !== "undefined" ? config.isAsynchronous : false,
      "acl" : typeof config.acl !== "undefined" ? config.acl : {whitelist: ["*"], blacklist: []}};
  }

  // unregister a previously registered procedure
  function unregister(publicProcedureName) {
    delete registeredServices[publicProcedureName];
  }
  
  // receive and execute a RPC call
  function dispatch(serviceCallEvent) {
	response = JSONRpcProcessRequest(serviceCallEvent.data, serviceCallEvent.origin);
	// return the response
	callInternal({
	"destination": serviceCallEvent.source,
	"publicProcedureName": "recievePMRPCResponse",
	"params", [response]
	"retries", 1
	"notification", true
	});
  }
  
  // public call method
  function call(config) {
    // check that number of retries is not -1, that is a special internal value
    if (config.retries && config.retries === -1) {
      throw new Exception("number of retries must be 0 or higher");
    } 
    callInternal(config);
  }


  // call remote method, with configuration:
  //   destination - window on which the method is registered
  //   publicProcedureName - name under which the method is registered
  //   params - array of parameters fir the method call
  //   onSuccess - method which will be called if the rpc call was successful
  //   onError - method which will be called if the rpc call was not successful
  //   retries - number of retries pmrpc will attempt if previous calls do not create a response
  //   timeout - number of miliseconds pmrpc will wait for any kind of answer before givnig up or retrying
  //   destinationDoman - domain of the destination that should process the call
  function callInternal(config) {
    var callObj = {
      destination : config.destination,
      publicProcedureName : config.publicProcedureName,
      params : typeof config.params !== "undefined" ? config.params : [],
      onSuccess : typeof config.onSuccess !== "undefined" ? config.onSuccess : function (){},
      onError : typeof config.onError !== "undefined" ? config.onError : function (){},
      retries : typeof config.retries !== "undefined" ? config.retries : 5,
      timeout : typeof config.timeout !== "undefined" ? config.timeout : 1000,
      destinationDomain : typeof config.destinationDomain !== "undefined" ? config.destinationDomain : "*",
      callId : generateUUID(), 
      status : "requestNotSent",
      notification : typeof config.notification !== "undefined" ? config.notification : false
    };

    callQueue[callObj.id] = callObj;
    if ( callObj.notification )
    	callObj.destination.postMessage(encode(JSONRpcCreateRequestObject(callObj.publicProcedureName, callObj.params), callObj.destinationDomain);
    else
    	callObj.destination.postMessage(encode(JSONRpcCreateRequestObject(callObj.publicProcedureName, callObj.params, callObj.callId), callObj.destinationDomain);
  }
  
  // internal rpc service that receives responses for rpc calls 
  function recievePMRPCResponse(result) {
  	// TODO: <<just this and were are complete>>
  }
  
  // attach the pmrpc event listener
  if (window.addEventListener) {
    // FF
    window.addEventListener("message", dispatch, false);
  } else {
    // IE
    window.attachEvent("onmessage", dispatch);
  }
  
  // register internal procedure for communication between pmrpc modules
  register( {
    publicProcedureName : "recievePMRPCResponse", 
    procedure : recievePMRPCResponse } );
  
  // return public methods
  return {
    register : register,
    unregister : unregister,
    call : call
  };
}();
