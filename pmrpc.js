/*
 * pmrpc 0.1 - HTML5 postMessage based RPC library 
 * http://code.google.com/p/pmrpc
 *
 * Copyright (c) 2008 Ivan Zuzak
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
    return "pmrpc." + JSON.stringify(obj);
  }

  // JSON decode a pmrpc message
  function decode(str){
    return JSON.parse(str.substring("pmrpc.".length));
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
  
  // dictionary of services registered for remote calls
  var registeredServices = {};
  // dictionary of requests being processed on the remote side
  var requestsBeingProcessed = {};
  // dictionary of requests being processed on the client side
  var callQueue = {};
  
  // register a service available for remote calls
  // if no acl is given, assume that it is available to everyone
  function register(publicProcedureName, procedure, acl) {
    registeredServices[publicProcedureName] = {
      "procedure" : procedure, 
      "acl" : typeof acl !== "undefined" ? acl : {whitelist: ["*"], blacklist: []}};
  }

  // unregister a previously registered procedure
  function unregister(publicProcedureName) {
    delete registeredServices[publicProcedureName];
  }
  
  // receive and execute a RPC call
  function dispatch(serviceCallEvent) {    
    // if the message is not for pmrpc, ignore it.
    if (serviceCallEvent.data.indexOf("pmrpc.") !== 0) {
      return;
    }
    
    // decode arguments, fetch service name, call parameters, and call id
    var callArguments = decode(serviceCallEvent.data);
    var service = registeredServices[callArguments.publicProcedureName];
    var parameters = callArguments.params.concat([serviceCallEvent.source]);
    var callId = callArguments.callId;
    
    // create a status object for sending reports to the sender
    var statusObj = {};
    statusObj.callId = callId;
  
    // check if service with specified name is registered
    if (typeof service !== "undefined") {      
      if (typeof callId === "undefined") {
        // if there is no callId, then this is an internal call so just invoke the procedure
        service.procedure.apply(null, parameters);
      } else {
        // if there is a callId, check if the request is already being processed
        if (typeof requestsBeingProcessed[callId] === "undefined") {
          // check the acl rights
          if (checkACL(service.acl, serviceCallEvent.origin)) {  
            // if the request is authorized, set internal flag for this callId, and send status update to sender
            
            requestsBeingProcessed[callId] = 1;
            statusObj.status = "processing";
            callInternal( {
              "destination" : serviceCallEvent.source,
              "publicProcedureName" : "receivePmrpcStatusUpdate",
              "params" : [statusObj],
              "retries" : -1 } );
            
            // invoke procedure, and expect exception 
            try {
              statusObj.returnValue = service.procedure.apply(null, parameters);
              statusObj.status = "success";
            } catch (error) {
              statusObj.status = "error";
              statusObj.errorDescription = error.description;
            }
            
            // delete internal flag for this callId, and return results to sender
            delete requestsBeingProcessed[callId];
            callInternal( {
              "destination" : serviceCallEvent.source,
              "publicProcedureName" : "receivePmrpcStatusUpdate",
              "params" : [statusObj],
              "retries" : -1 } );
            
          } else {
            // if the call is not authorized, return error
            statusObj.status = "error";
            statusObj.description = "request not authorized";
            callInternal( {
              "destination" : serviceCallEvent.source,
              "publicProcedureName" : "receivePmrpcStatusUpdate",
              "params" : [statusObj],
              "retries" : -1 } );
          }
        } else {
          // if call with specified callId is already being processed, just ignore this message
          return;
        }
      }
    } else {
      // if service with specified name is not registered, return error
      statusObj.status = "error";
      statusObj.description = "service not registered";
      callInternal( {
        "destination" : serviceCallEvent.source,
        "publicProcedureName" : "receivePmrpcStatusUpdate",
        "params" : [statusObj],
        "retries" : -1 } );
    }
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
  //   retries - number of retries pmrpc will attpempt if previous calls were not successful
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
      callId : Math.random() + "" + Math.random(),
      status : "requestNotSent"
    };
    
    if (config.retries === -1) {
      // if retries is -1, this is an internal status call
      callObj.destination.postMessage(
        encode({"publicProcedureName" : callObj.publicProcedureName, "params" : callObj.params}), 
        callObj.destinationDomain);
    } else {
      // otherwise, its a normal call. create an entry and start the wait-for-response protocol
      callQueue[callObj.callId] = callObj;
      waitForResponse(callObj.callId);
    }
  }
  
  // periodically send requests, until all retries are exhausted
  function waitForResponse(callId) {
    var callObj = callQueue[callId];
    
    // if the call was processed or is being processed, stop sending requests
    if (typeof callObj === "undefined" || callObj.status === "processing") {
      return;
    } else {
      // if the retried the maximum number of times, give up and report an error
      if (callObj.retries <= -1) {
        delete callQueue[callId];
        callObj.onError( { 
          "destination" : callObj.destination,
          "publicProcedureName" : callObj.publicProcedureName,
          "params" : callObj.params,
          "status" : "error",
          "description" : callObj.status === "requestSent" ? "destination not responding" : callObj.description} );
      } else {
        // if more retries are lest, send new request with same callId
        callObj.status = "requestSent";
        callObj.retries = callObj.retries - 1;
        callObj.destination.postMessage(
          encode({"publicProcedureName" : callObj.publicProcedureName, "params" : callObj.params, "callId" : callObj.callId}),
          callObj.destinationDomain);
        callQueue[callId] = callObj;
        window.setTimeout(function() { waitForResponse(callId); }, callObj.timeout);
      }
    }
  }
  
  // internal rpc service that receives status updates for rpc calls 
  function receivePmrpcStatusUpdate(statusObj) {
    var callId = statusObj.callId;
    var callObj = callQueue[callId];

    if (statusObj.status === "error") {
      // if an error happened, set the status and description and let waitForResponse handle the rest
      callObj.status = "error";
      callObj.description = statusObj.description;
    } else if(statusObj.status === "processing") {
      // if the destination started processing the request, set the status and let waitForResponse handle the rest
      callObj.status = "processing";
    } else if(statusObj.status === "success") {
      // if this is the response, call the onSuccess handler
      delete callQueue[callId];
      callObj.onSuccess( { 
        "destination" : callObj.destination,
        "publicProcedureName" : callObj.publicProcedureName,
        "params" : callObj.params,
        "status" : "success",
        "returnValue" : statusObj.returnValue} );
    }
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
  register("receivePmrpcStatusUpdate", receivePmrpcStatusUpdate);
  
  // return public methods
  return {
    register : register,
    unregister : unregister,
    call : call
  };
}();