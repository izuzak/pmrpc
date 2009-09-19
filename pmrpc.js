/*
 * pmrpc 0.3 - Inter-widget remote procedure call library based on HTML5 
 *             postMessage API and JSON-RPC. http://code.google.com/p/pmrpc
 *
 * Copyright (c) 2009 Ivan Zuzak, Marko Ivankovic. 
 * Apache License, Version 2.0 - http://www.apache.org/licenses/LICENSE-2.0
 */

pmrpc = window.pmrpc = function() {
  // check if JSON library is available
  if (typeof JSON === "undefined" || typeof JSON.stringify === "undefined" || 
      typeof JSON.parse === "undefined") {
    throw new Exception("pmrpc requires the JSON library");
  }
  
  // JSON encode an object into pmrpc message
  function encode(obj) {
    return "pmrpc." + JSON.stringify(obj);
  }

  // JSON decode a pmrpc message
  function decode(str) {
    return JSON.parse(str.substring("pmrpc.".length));
  }

  // Generates a version 4 UUID
  function generateUUID() {
    var uuid = [], nineteen = "89AB", hex = "0123456789ABCDEF";
    for (var i=0; i<36; i++) {
      uuid[i] = hex[Math.floor(Math.random() * 16)];
    }
    uuid[14] = '4';
    uuid[19] = nineteen[Math.floor(Math.random() * 4)];
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    return uuid.join('');
  }

  // Creates a base JSON-RPC object, usable for both request and response.
  // As of JSON-RPC 2.0 it only contains one field "jsonrpc" with value "2.0"
  function createJSONRpcBaseObject() {
    var call = {};
    call.jsonrpc = "2.0";
    return call;
  }

  // Creates a JSON-RPC request object for the given method and parameters
  function createJSONRpcRequestObject(procedureName, parameters, id) {
    var call = createJSONRpcBaseObject();
    call.method = procedureName;
    call.params = parameters;
    if (typeof id !== "undefined") {
      call.id = id;
    }
    return call;
  }

  // Creates a JSON-RPC error object complete with message and error code
  function createJSONRpcErrorObject(errorcode, message, data) {
    var error = {};
    error.code = errorcode;
    error.message = message;
    error.data = data;
    return error;
  }

  // Creates a JSON-RPC response object.
  function createJSONRpcResponseObject(error, result, id) {
    var response = createJSONRpcBaseObject();
    response.id = id;
    
    // check to see if the error object is set
    if (typeof error === "undefined" || error === null) {
      // no errors, go with the payload
      response.result = (result === "undefined") ? null : result;
    } else {
      // error response
      response.error = error;
    }
    
    return response;
  } 

  // Converts a wildcard expression into a regular expression
  function convertWildcardToRegex(wildcardExpression) {
    var regex = wildcardExpression.replace(
                  /([\^\$\.\+\?\=\!\:\|\\\/\(\)\[\]\{\}])/g, "\\$1");
    regex = "^" + regex.replace("*", ".*") + "$";
    return regex;
  }

  // Checks whether a domain satisfies the access control list. The access 
  // control list has a whitelist and a blacklist. In order to satisfy the acl, 
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
  
  // Calls a function with either positional or named parameters
  function invokeProcedure(fn, self, params) {
    if (params instanceof Array) {
      // positional parameters
      return fn.apply(self, params);
    } else {
      // get string representation of function
      var fnDef = fn.toString();
      
      // parse the string representation and retrieve order of parameters
      var argNames = fnDef.substring(fnDef.indexOf("(")+1, fnDef.indexOf(")"));
      argNames = (argNames === "") ? [] : argNames.split(", ");
      
      var argIndexes = {};
      for (var i=0; i<argNames.length; i++) {
        argIndexes[argNames[i]] = i;
      }
      
      // construct an array of arguments from a dictionary
      var callParameters = [];
      for (var paramName in namedParams) {
        if (typeof argIndexes[paramName] !== "undefined") {
          callParameters[argIndexes[paramName]] = namedParams[paramName];
        } else {
          throw "No such param!";
        }
      }
      
      // invoke function with specified context and arguments array
      return fn.apply(self, callParameters);
    }
  }
  
  // Process a single JSON-RPC Request
  function processJSONRpcRequest(request, origin) {
    console.log("processing " + JSON.stringify(request));
    if (request.jsonrpc !== "2.0") {
      // Invalid JSON-RPC request    
      return createJSONRpcResponseObject(
        createJSONRpcErrorObject(-32600, "Invalid request", 
          "The recived JSON is not a valid JSON-RPC 2.0 request."),
        null,
        null
      );
    }
    
    var id = request.id;
    var service = fetchRegisteredService(request.method);
    
    if (typeof service !== "undefined") {
      // check the acl rights
      if (checkACL(service.acl, origin)) {
        try {
          var returnValue = 
            invokeProcedure(service.procedure, service.context, request.params);
          console.log("after call ");
          return (typeof id === "undefined") ? null : 
            createJSONRpcResponseObject(null, returnValue, id);
        } catch (error) {
          if (typeof id === "undefined") {
            // it was a notification, nobody cares if it fails
            return null;
          }
          
          if (error === "No such param!") {
            return createJSONRpcResponseObject(
              createJSONRpcErrorObject(
                -32602, "Invalid params", error.description),
              null,
              id
            );            
          }            
          
          // the -32001 value is "application defined"
          return createJSONRpcResponseObject(
            createJSONRpcErrorObject(
              -32098, "Server error.", error.description),
            null,
            id
          );
        }
      } else {
        // access denied
        return (typeof id === "undefined") ? null : createJSONRpcResponseObject(
          createJSONRpcErrorObject(-32099, "Server error", "Access denied"),
          null,
          id
        );
      }
    } else {
      // No such method
      return (typeof id === "undefined") ? null : createJSONRpcResponseObject(
        createJSONRpcErrorObject(
          -32601,
          "Method not found", 
          "The requestd remote procedure does not exist or is not available"),
        null,
        id
      );
    }
  }

  // dictionary of services registered for remote calls
  var registeredServices = {};
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

  // retreive service for a specific procedure name
  function fetchRegisteredService(publicProcedureName){
    return registeredServices[publicProcedureName];
  }
  
  // receive and execute a pmrpc call
  function processPmrpcMessage(serviceCallEvent) {
    console.log("received");
    // if the message is not for pmrpc, ignore it.
    if (serviceCallEvent.data.indexOf("pmrpc.") !== 0) {
      return;
    } else {
      message = decode(serviceCallEvent.data);
      
      if (typeof message.method !== "undefined") {
        response = processJSONRpcRequest(message, serviceCallEvent.origin);
        // if there is a response
        if (response !== null) {
          // return the response
          sendPmrpcMessage(
            serviceCallEvent.source, response, serviceCallEvent.origin);
        }
      } else {
        processPmrpcResponse(message, serviceCallEvent.origin);
      }
    }
  }
  
  // call remote procedure, with configuration:
  //   destination - window on which the procedure is registered
  //   publicProcedureName - name under which the procedure is registered
  //   params - array of parameters fir the procedure call
  //   onSuccess - procedure which will be called if the rpc call was successful
  //   onError - procedure which will be called if the rpc call was not successful
  //   retries - number of retries pmrpc will attempt if previous calls do not
  //             create a response
  //   timeout - number of miliseconds pmrpc will wait for any kind of answer
  //             before givnig up or retrying
  //   destinationDoman - domain of the destination that should process the
  //                      call
  function call(config) {
    // check that number of retries is not -1, that is a special internal value
    if (config.retries && config.retries === -1) {
      throw new Exception("number of retries must be 0 or higher");
    }

    var callObj = {
      destination : config.destination,
      onSuccess : typeof config.onSuccess !== "undefined" ? 
                    config.onSuccess : function (){},
      onError : typeof config.onError !== "undefined" ? 
                    config.onError : function (){},
      retries : typeof config.retries !== "undefined" ? config.retries : 5,
      timeout : typeof config.timeout !== "undefined" ? config.timeout : 1000,
      destinationDomain : typeof config.destinationDomain !== "undefined" ?
                            config.destinationDomain : "*",
      status : "requestNotSent"
    };
    
    isNotification = typeof config.onError === "undefined" &&
                       typeof config.onError === "undefined";
    params = (typeof config.params !== "undefined") ? config.params : [];
    callId = generateUUID();
    
    if (isNotification) {
      callObj.message = createJSONRpcRequestObject(
                  config.publicProcedureName, params);
    } else {
      callQueue[callObj.callId] = callObj; 
      callObj.message = createJSONRpcRequestObject(
                          config.publicProcedureName, params, callId);
    }
    
    sendPmrpcMessage(
      callObj.destination, callObj.message, callObj.destinationDomain);
  }
  
  // Use the postMessage API to send a pmrpc message to a destination
  function sendPmrpcMessage(destination, message, destinationDomain) {
    destinationDomain = 
      typeof destinationDomain !== "undefined" ? destinationDomain : "*";
    console.log("Sending message:" + JSON.stringify(message));
    return destination.postMessage(encode(message), destinationDomain);
  }
  
  // internal rpc service that receives responses for rpc calls 
  function processPmrpcResponse(response, origin) {
    console.log(JSON.stringify(response)+"processPmrpcResponse");
    var id = response.id;
    var call = callQueue[id];
    if (typeof call === "undefined" || call === null) {
      return;
    } else {
      delete callQueue[id];
    }

    if (typeof response.result !== "undefined") {
      call.onSuccess( { 
        "destination" : call.destination,
        "publicProcedureName" : call.publicProcedureName,
        "params" : call.params,
        "status" : "success",
        "returnValue" : response.result} );
    } else {
      call.onError( { 
        "destination" : call.destination,
        "publicProcedureName" : call.publicProcedureName,
        "params" : call.params,
        "status" : "error",
        "description" : response.error.message} );
    }
  }
  
  // attach the pmrpc event listener
  if (window.addEventListener) {
    // FF
    window.addEventListener("message", processPmrpcMessage, false);
  } else {
    // IE
    window.attachEvent("onmessage", processPmrpcMessage);
  }
  
  // return public methods
  return {
    register : register,
    unregister : unregister,
    call : call
  };
}();
