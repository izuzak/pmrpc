---
title: Pmrpc API docs
layout: default
---

# Pmrpc API documentation, feature list and usage examples

## Introduction

Pmrpc is an [inter-window](http://dev.w3.org/html5/spec/Overview.html#crossDocumentMessages) and [web workers](http://dev.w3.org/html5/workers/) communication JavaScript library for use in [HTML5](http://www.w3.org/TR/html5/) browsers. The pmrpc library supports three kinds of communication: [message-passing](http://en.wikipedia.org/wiki/Message_passing), [remote procedure call (RPC)](http://en.wikipedia.org/wiki/Remote_procedure_call) and [publish-subscribe (pubsub)](http://en.wikipedia.org/wiki/Publish/subscribe).

The library provides a simple API for exposing and calling procedures (RPC) between browser **windows**, **iFrames** and **web workers** (both dedicated and shared web workers). In case of inter-window communication, the windows/iframes may also be on different domains and can communicate without being subject to the [same-origin policy](http://en.wikipedia.org/wiki/Same_origin_policy). Below are two simple **examples of using pmrpc**.

**Inter-window communication example** (parent window invokes procedure in nested iframe):

First, a procedure is registered for remote calls in the iframe that contains the procedure:

{% highlight html %}
<html>
  <head>
    <script type="text/javascript" src="https://raw.github.com/izuzak/pmrpc/master/pmrpc.js"></script>
  </head>
  <body>
    <script type="text/javascript">
      // expose a procedure
      pmrpc.register( {
        publicProcedureName : "HelloPMRPC",
        procedure : function(printParam) { alert(printParam); } } 
      );
    </script>
  </body>
</html>
{% endhighlight %}

Second, the procedure is called from the parent window by specifying the iframe object which contains the remote procedure, name of the procedure and parameters:

{% highlight html %}
<html>
  <head>
    <script type="text/javascript" src="https://raw.github.com/izuzak/pmrpc/master/pmrpc.js"></script>
  </head>
  <body>
    <iframe id="ifr" name="ifr" src="iframe.html" width="0" height="0" frameborder=0></iframe>
    <script type="text/javascript">
      // call the exposed procedure
      pmrpc.call( {
        destination : window.frames["ifr"],
        publicProcedureName : "HelloPMRPC",
        params : ["Hello World!"] } ); 
    </script>
  </body>
</html>
{% endhighlight %}

Simple **Web worker communication example** (window -> worker communication):


{% highlight javascript %}
importScripts('https://raw.github.com/izuzak/pmrpc/master/pmrpc.js');

// expose a procedure
pmrpc.register( {
  publicProcedureName : "HelloPMRPC",
  procedure : function(printParam) { return printParam; } } );
{% endhighlight %}


{% highlight html %}
<html>
  <head>
    <script src='https://raw.github.com/izuzak/pmrpc/master/pmrpc.js' type='text/javascript'></script>  
  </head>
  <body>
    <script type="text/javascript">
      var worker = new Worker("worker.js");

      setTimeout(function() {
        pmrpc.call( {
          destination : worker,
          onSuccess : function(retVal) { alert(retVal.returnValue); },
          publicProcedureName : "HelloPMRPC",
          params : ["Hello World!"] } ); }, 1000);
    </script>
  </body>
</html>
{% endhighlight %}


Pmrpc also provides several advanced features, like AJAX-style callbacks and access control lists.


## Usage overview

_This section provides a high-level overview of pmrpc features, the full API is described below._

As in most communication systems, a pmrpc system consists of a _client_ and a _server_. The purpose of the server is to implement and publically expose one or more procedures. These procedures can then be remotely called by clients from different domains. 

In pmrpc, every browser window, any iframe within a window or any web worker (dedicated or shared) that loads the pmrpc library may be both a client and a server. A client can call procedures from more than one server, more than one client can call procedures from a single server, and an entity can be a client and a server at the same time.

The slides below give an overview of the basic usage and advanced features of pmrpc, explained in more detail in the following sections.

<iframe src="https://docs.google.com/present/embed?id=dctznkrh_677n8758gf8&amp;size=m" height="451" width="550" border="1" > </iframe>

## Basic usage

The basic scenario of using pmrpc is as follows:

* both the client and server load the pmrpc library
* the server exposes a procedure by using the pmrpc **register** method. The registered procedure is exposed under a known public name.
* the client calls the exposed procedure remotely by using the pmrpc **call** method. The procedure is called by identifying the server window object, the public name of the method, and a list of parameters.
* the server removes the registered procedure by using the pmrpc **unregister** method. 


## Advanced features

Pmrpc also supports four advanced and optional features: 
  
* **callbacks** for successful and unsuccessful calls,
* **access control** on both the client and server side,
* calling the same method on multiple servers (multicast) and a **publish-subscribe** communication model (broadcast)
* **discovery** of remotely registered procedures by various criteria,
* fault tolerance using user-defined **retries** and **timeouts** for each call,
* registering **asychronous procedures**.


### Callbacks

Pmrpc calls are asynchronous, like [XMLHttpRequest](http://www.w3.org/TR/XMLHttpRequest/) calls. This means that the pmrpc call method doesn't block the execution of the client, rather it just sends the call and returns. If the client wishes to be notified when the execution of the called procedure finishes or receive return values, a callback method should be supplied as a parameter to the pmrpc call. This callback method is called after the server finishes execution of that call.

Pmrpc supports two callback methods:

* the **onSuccess** callback is called in case of a successful pmrpc call. The callback also receives return values from the method.
* the **onError** callback is called in case that the call was unsucessful. The callback also receives a status describing the error which occured.


### Retries and timeouts

Like with AJAX calls, sometimes the server will not be running at the exact time of the client request, or the server will have different configuration than the one expected by the client. For example, the client (e.g. window) will load faster than the server (e.g. worker) and will send the request before the server even registers any procedures. 

For this reason, pmrpc let's clients specify that a call should be **retried** a certain number of times before giving up, if the previous request didn't complete successfuly for any reason. Also, pmrpc enables clients to specify the **timeout period** between two retries of the same call. For example, the client could specify that a call should be retried up to 5 times, waiting 2000 milliseconds between calls.


### Asynchronous procedures

When a call is routed to the server, pmrpc calls the target procedure, waits for it to execute and returns the result to the client. This execution flow works for synchronous procedures registered on the server and doesn't work for asynchronous procedures. If the registered procedure is asynchronous - it returns immediately, continues processing in the background and invokes a callback function when execution finishes. Pmrpc supports **asynchronous procedures** by automatically passing a callback function which asynchronous procedures should call with the return value.


### Access control

_The Access control advanced feature is available only for inter-window communication (i.e. communication not involving web workers) since communication involving web workers is always between contexts on the same domain (the worker script must be on the same domain as the context in which the worker was created)._

Sometimes servers need to restrict the access to their methods only to clients from certain domains. Similarly, clients sometimes need to restrict the set of servers which may process a specific call to certain domains. In order to ensure that messages are dilivered to and from trusted domains, pmrpc supports a simple access control mechanism on both the client and the server side.

On the **client side**, the client can specify from which domains must the server be loaded or specify that the server may be loaded from any domain. On the **server side**, the server can specify which procedures can be called from which domains. The server access control mechanism is based on **[access control lists (ACLs)](http://en.wikipedia.org/wiki/Access_control_list)**. An access control list contains a **whitelist** and a **blacklist**. The whitelist defines which subjects (windows or iframes) are permitted to perform an action (call a procedure or process a call), while the blacklist defines which subjects are not permitted to perform an action. Both the whitelist and the blacklist are lists of URLs defined with wildcard expressions. In order to satisfy the ACL, the domain of a subject must be in the whitelist and must not be in the blacklist.


### Multicast and publish-subscribe

Pmrpc also supports calling the same remote procedure on multiple servers as a single call. In order to make such a **multicast call**, the client lists all servers it wishes to call the procedure on. The execution of such call is the same as would be multiple calls to each server exposing the procedure. 

Sometimes the client will not know the number or identity of servers implementing the procedure that needs to be called. In those cases, a **publish-subscribe model** is more appropriate. In order to make a publish call, the client doesn't specify any servers but only the procedure, and pmrpc will try to invoke the procedure on all servers exposing that procedure (broadcast).


### Discovery

In cases when clients don't know which servers expose a procedure or which procedures are exposed at which server, a **discovery** mechanism is needed. Pmrpc implements a simple discovery mechanism that enables clients to fetch information on all registered procedures from all servers and filter them by procedure name, server or server origin.


## API

Pmrpc is available as a single-file JavaScript library. The library exposes the pmrpc object with 4 public methods: register, call, unregister and discover. Furthermore, in order to enable web worker communication, the library wraps the default Worker and SharedWorker constructors. Instructions for loading the library and using the API are given below.


### Loading the library

The pmrpc library must be loaded in every window, iframe and web worker that intends to use pmrpc. Furthermore, since pmrpc uses JSON as a data-interchange format, the JSON library must be loaded also. Most modern web browsers (Chrome, Firefox, ...) implement the JSON library natively, so loading it will usually not be necessary. 

Note: the JSON library available on http://www.json.org/json2.js contains an alert statement which forces you to download the library, remove the alert and serve the it from your server.

#### Windows and iFrames

{% highlight html %}
<script src='http://www.json.org/json2.js' type='text/javascript'></script>
<script src='https://raw.github.com/izuzak/pmrpc/master/pmrpc.js' type='text/javascript'></script>
{% endhighlight %}

#### Web workers

{% highlight javascript %}
importScripts('http://www.json.org/json2.js');
importScripts('https://raw.github.com/izuzak/pmrpc/master/pmrpc.js');
{% endhighlight %}

### Register method


The **register** method is used by servers to publically expose a procedure under a known name and sets the access control rules for that procedure:

{% highlight javascript %}
pmrpc.register( {
  "publicProcedureName" : publicProcedureName,
  "procedure" : procedure, 
  "acl" : accessControlList,
  "isAsynchronous" : isAsynchronous } );
{% endhighlight %}

* (mandatory) **publicProcedureName** is a string that determines the public name under which the procedure will be made available to remote windows and iframes. 

* (mandatory) **procedure** is a function object representing the procedure being registered. This can be a named or unnamed function or method.
  
* (optional and _this feature is available only for non-worker communication_) **acl** is an object containg two string arrays: the whitelist and the blacklist. This parameter is optional, and by default enables clients from any domain to call the procedure. Elements of the whitelist and blacklist are wildcard-defined strings where the `*` wildcard represents any sequence of characters. 
  
* (optional) **isAsynchronous** is a boolean value which defines whether the procedure is asynchronous or synchronous. By default, a synchronous procedure is assumed.

**Example 1:** synchronous procedure named "HelloPMRPC" accessible from windows and iframes loaded from any page on "http://www.myFriendlyDomain1.com" or exactly from the "http://www.myFriendlyDomain2.com" page. 

{% highlight javascript %}
var publicProcedureName = "HelloPMRPC";
var procedure = function (alertText) { alert(alertText); return "Hello!"; };
var accessControlList = {
  whitelist : ["http://www.myFriendlyDomain1.com*", "http://www.myFriendlyDomain2.com"],
  blacklist : []
};
var isAsynchronous = false;

pmrpc.register( {
  "publicProcedureName" : publicProcedureName,
  "procedure" : procedure, 
  "acl" : accessControlList,
  "isAsynchronous" : isAsynchronous } );
{% endhighlight %}

**Example 2:** asynchronous method named "HelloPMRPC" accessible from windows and iframes loaded from any domain, except from "http://evil.com".

{% highlight javascript %}
var publicProcedureName = "HelloPMRPC";
var procedure = function (alertText, pmrpcCallback) { 
  alert(alertText); 
  pmrpcCallback("Hello!"); };
var accessControlList = {
  whitelist : ["*"],
  blacklist : ["http://evil.com*"]
};
var isAsynchronous = true;

pmrpc.register( {
  "publicProcedureName" : publicProcedureName,
  "procedure" : procedure, 
  "acl" : accessControlList,
  "isAsynchronous" : isAsynchronous } );
{% endhighlight %}


### Unregister method

The **unregister** method cancles the registration of an exposed procedure:

{% highlight javascript %}
pmrpc.unregister(publicProcedureName);
{% endhighlight %}

* **publicProcedureName** is a string that determines the name under which a procedure is registered.
  
**Example 3:** unregister a procedure named "HelloPMRPC".

{% highlight javascript %}
var publicProcedureName = "HelloPMRPC";
pmrpc.unregister(publicProcedureName);
{% endhighlight %}

### Call method

The **call** method calls a procedure exposed on the server:

{% highlight javascript %}
pmrpc.call(parameters);
{% endhighlight %}


* **parameters** is an object through which parameters of the call are defined:
    * (optional) **destination** is the server context object (window, iframe, web worker) on which the destination procedure is registered. There are four different possibilities for defining this parameter:
        * when communicating from within a web worker to the parent context (which may be either a window or another worker in case of nested workers), this parameter must be left undefined
        * if the client wants to call the remote method on a single server, this parameter must be the context object of the destination (window, worker, iframe)
        * if the client wants to call the remote method on multiple server (multicast), this parameter must be an array of context objects of the destinations (windows, workers, iframes)
        * if the client wants to make a publish call (broadcast), this parameter must have the value "publish"
    * (mandatory) **publicProcedureName** is the public name under which the procedure is registered
    * (optional) **params** is an object containing parameters for the remote call. By default, an empty array is used. Pmrpc supports both positional and named parameters. Positional parameters should be passed as elements of an array, while named parameters should be passed as key-value pairs of an object where keys represent the name of the parameter and the value represents the value of the parameter
    * (optional) **onSuccess** is a function object which will be called if the call is completed successfully. By default, no method is called. The method is passed a status object as a paramter, containing these properties:
        * **destination** is the window object that contains the called procedure
        * **publicProcedureName** is the name of the procedure that was called
        * **params** is the parameters object of the call
        * **status** is a string containing "success"
        * **returnValue** is an object containing the result of the remotely called procedure
        * (optional) **onError** is a function object which will be called if the call is not completed successfully for any reason. By default, no method is called. The method is passed a status object as a paramter, containing these properties:
        * **destination** is the window object that contains the called procedure
        * **publicProcedureName** is the name of the procedure that was called
        * **params** is the parameters object of the call
        * **status** is a string containing "error"
        * **description** is a string containing a user-friendly description of the error
    * (optional) **retries** is an non-negative integer which represents the number of times pmrpc will attempt to invoke the remote procedure. By default, the number of retries is 5.
    * (optional) **timeout** is the number of miliseconds pmrpc will wait for any kind of answer before givnig up or retrying. By default, the timeout is 1000ms.
    * (optional and _this feature is available only for non-worker communication_) **destinationDoman** is an either a string defining which domain the servers must be loaded from, an array of such strings or a string defining that the server may be loaded from any domain (`*`). By default, the server may be loaded from any domain.

 
**Example 4:** invoke procedure "HelloPMRPC" with single positional parameter "Hello world from pmrpc client!". The onSuccess and onError methods alert the response, and the call will be retried up to 15 times, waiting 1500 milliseconds between retries. Servers loaded from any domain may process the call.

{% highlight javascript %}
var parameters = {
  destination : window.frames["targetIframeName"],
  publicProcedureName : "HelloPMRPC",
  params : ["Hello world from pmrpc client!"],
  onSuccess : function(returnObj) {alert(returnObj.returnValue);},
  onError : function(statusObj) {alert(statusObj.description);},
  retries : 15,
  timeout : 1500,
  destinationDomain :  "*"
};

pmrpc.call(parameters);
{% endhighlight %}


**Example 5:** invoke procedure "HelloPMRPC" with single named parameter "alertText" with value "Hello world from pmrpc client!". The response is disregarded (no onSuccess and onError methods), and the call will be retried up to 5 times, waiting 1000 milliseconds between retries (default values). Servers loaded only from http://good.com domain may process the call.

{% highlight javascript %}
var parameters = {
  destination : window.frames["targetIframeName"],
  publicProcedureName : "HelloPMRPC",
  params : {alertText : "Hello world from pmrpc client!"},
  destinationDomain :  "http://good.com"
};

pmrpc.call(parameters);
{% endhighlight %}

### Discover method

{% highlight javascript %}
pmrpc.discover(parameters);
{% endhighlight %}


* **parameters** is an object through which parameters of the call are defined:
    * (optional) **destination** is an array of server context objects (windows, iframes, web workers) on which discovery will be performed. By default, discovery is performed on all accessible contexts.
    * (optional) **originRegex** is a regular expression that defines the origins of servers from which discovered procedures will be returned. In other words, only procedures discovered from these servers will be returned in the result set.
    * (optional) **nameRegex** is a regular expression that defines the names of procedures which will be returned. In other words, only procedures with these names will be returned in the result set.
    * (mandatory) **callback** is a function object which will be called when the discovery process finishes. The method is passed a an array of discovered procedures where each element of the array contains the following properties: 
        * **publicProcedureName** is the name of the discovered procedure
        * **destination** is the context object of the server which exposes the procedure
        * **procedureACL** is the access control list defined for this procedure on the server
        * **destinationOrigin** the origin of the server which exposes the discovered procedure

**Example 5:** discover procedures registered at any server loaded from any origin and filter out procedures that do not contain "goodOrigin" in their public name. After that, choose the first element in the returned result array and call the procedure.

{% highlight javascript %}
pmrpc.discover({
  nameRegex : ".*goodName.*",
  callback : function(discoveredMethods) {
    pmrpc.call({
      destination : discoveredMethods[0].destination,
      publicProcedureName : discoveredMethods[0].publicProcedureName,
      params : ["Hello World!"],
      destinationDomain : "*",
    };
  }
});
{% endhighlight %}

## Examples

See [here](https://github.com/izuzak/pmrpc/tree/master/examples).


## Implementation

The implementation of the library is based on the [cross-document messaging](http://dev.w3.org/html5/spec/Overview.html#crossDocumentMessages) and [web workers](http://dev.w3.org/html5/workers/) APIs and the [JSON-RPC protocol](http://groups.google.com/group/json-rpc/). 

The **cross-document messaging API** is a simple method for passing messages between browser window objects (windows and iframes) which may be loaded from different domains. When using the postMessage APIs, restrictions concerning the [same-origin policy](https://developer.mozilla.org/En/Same_origin_policy_for_JavaScript) do not apply, and programmers can call postMessage on any window. Nevertheles, the API is secure in a sense that it provides mechanisms both for the sender and the receiver to ensure that messages are delivered from trusted domains. **Web workers** are background scripts running in parallel to their main page. The scripts communicate with the main page with an identical API as in cross-document messaging.

Pmrpc uses the postMessage API as an underlying communication mechanism, and extends it to a more RPC-like model using the **JSON-RPC protocol**. JSON-RPC is a stateless, light-weight remote procedure call (RPC) protocol. It uses [JSON](http://www.json.org) as data format, and is transport-independent. By combining the postMessage API as the transport mechanism with JSON-RPC as the communication protocol pmrpc provides a **powerful and open communication mechanism** for inter-window communication.

Pmrpc implements the following requirements as defined in the JSON-RPC specification:
* normal remote procedure call
* notification (procedure call without Response)
* request, response and error JSON message format
* call parameters (positional and named)

Pmrpc doesn't implement the Batch call feature of the JSON-RPC specification since there is a lot of discussion on how this feature will work and how it should be implemented.

Here is an example of request and response messages in pmrpc (and JSON-RPC):

```
(request)  --> {"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}
(response) <-- {"jsonrpc": "2.0", "result": 19, "id": 1}
```

## Important notes

* If you are using pmrpc in Google Chrome or Chromium to communicate with contexts loaded from local machine files - you should read [these](http://googlechromereleases.blogspot.com/2010/02/dev-channel-update_24.html) [posts](https://groups.google.com/a/chromium.org/group/chromium-html5/browse_thread/thread/b71c654e8df2e20b#). In short, you may need to start Chrome/Chromium with the `--allow-file-access-from-files` switch in order to enable communication.

* If you are using pmrpc in Firefox to communicate with contexts loaded from local machine files - you should read the notes at the bottom of [this article](https://developer.mozilla.org/en/DOM/window.postMessage). In short, due to a non-standard security feature in Firefox, pmrpc will probably not work for local files.

<script type="text/javascript">
  var _gaq = _gaq || [];
  _gaq.push(['_setAccount', 'UA-9935933-1']);
  _gaq.push(['_setDomainName', 'auto']);
  _gaq.push(['_setAllowLinker', true]);
  _gaq.push(['_trackPageview']);

  (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript';
    ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' :
    'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(ga, s);
  })();
</script>    
