# Introduction

**Pmrpc** is an HTML5 JavaScript library for **message passing**, **remote procedure call** and **publish-subscribe** cross-contex communication in the browser. The library provides a simple API for exposing and calling procedures between browser **windows**, **iframes** and **web workers**, even between different origins. Pmrpc also provides several advanced features: callbacks similar to AJAX calls, ACL-based access control, asynchronous procedure support and fault-tolerance via retries. In case this wasnt clear, pmrpc **is not** a library for browser-server communication, it is a library for communication within the browser.

The **implementation** of the library is based on the [HTML5 Cross-document messaging postMessage API](http://www.w3.org/html/wg/html5/#crossDocumentMessages), [Web Workers API](http://www.whatwg.org/specs/web-workers/current-work/), the [JSON-RPC protocol](http://groups.google.com/group/json-rpc/web/json-rpc-1-2-proposal) and the [JSON data format](http://www.json.org). Pmrpc uses the postMessage API as an underlying communication mechanism and extends it to a RPC model using the JSON-RPC, a transport-independent protocol that uses JSON for formatting messages.

# Documentation

The complete list of features and the full API reference is [here](http://code.google.com/p/pmrpc/wiki/PmrpcApiDocs).

We have also written serveral blog posts about Pmrpc and cross-context communication:

* [Discovery and publish-subscribe support](http://ivanzuzak.info/2010/06/15/pmrpc-discovery-and-publish-subscribe-support-systematization-of-cross-context-browser-communication-systems.html)
* [WebWorker support](http://ivanzuzak.info/2009/12/21/rpc-for-web-workers-and-distributed-computing-within-the-browser.html)
* [Pmrpc introduction](http://ivanzuzak.info/2009/10/10/inter-window-browser-communication-and-how-to-make-it-better.html)

and several papers:

* [Cross-context Web browser communication with unified communication models and context types](http://ivanzuzak.info/#talks)
* [A Classification Framework for Web Browser Cross-Context Communication](http://ivanzuzak.info/#talks)
* [Inter-widget communication (MUPPLE lecture series)](http://ivanzuzak.info/#talks)

# Cross-context communication systems and libraries

We also maintain a **systematized list of other cross-context communication libraries** and systems - check it out [here](http://code.google.com/p/pmrpc/wiki/IWCProjects).

# Example

Below is an **example of using pmrpc** for RPC-style communication. See the API docs for a full description of the API, feature list and usage examples. 

**Inter-window communication example** (parent window invokes procedure in nested iframe):

First, a procedure is registered for remote calls in the iframe that contains the procedure:

    // [iframe object A] - rpc server that exposes the procedure
    
    // load pmrpc library
    <script type="text/javascript" src="pmrpc.js" />

    // expose a procedure
    pmrpc.register( {
      publicProcedureName : "HelloPMRPC",
      procedure : function(printParam) { alert(printParam); } } );

Second, the procedure is called from the parent window by specifying the iframe object which contains the remote procedure, name of the procedure and parameters:

    // [window object B] - client 
    
    // load pmrpc library
    <script type="text/javascript" src="pmrpc.js" />
    
    // call the exposed procedure
    pmrpc.call( {
      destination : window.frames["iFrameA"],
      publicProcedureName : "HelloPMRPC",
      params : ["Hello World!"] } ); 

# Browser support

Pmrpc should work on Firefox 3+, Google Chrome, Opera 10.60+, Internet Explorer 8+

Visit the [pmrpc testing page](http://code.google.com/p/pmrpc/wiki/PmrpcTesting) to see if your browser can use pmrpc. In general, pmrpc is designed to work with the latest version of all popular browsers, we have no interest or intention to support old browser version (e.g. Firefox 2, IE6).

# License

Pmrpc was developed by [Ivan Zuzak](http://ivanzuzak.info) and [Marko Ivankovic](http://www.twitter.com/ivankovic_42) and is available under the [Apache v2.0 license](http://www.apache.org/licenses/LICENSE-2.0).

# Projects using pmrpc

* [Responsive Open Learning Environments - ROLE](http://www.role-project.eu/) - European 7th Framework Programme (thanks to Bodo von der Heiden). _"ROLE will create an individual world for learning with personalization intelligence on the user’s side. ROLE will reach this objective by enabling the user to easily construct and maintain her own personal learning environment (PLE) consisting of a mix of preferred learning tools, learning services, learning resources and other related technologies."_

* [OpenLaszlo](http://www.openlaszlo.org/) - An open source platform for the development and delivery of rich Internet applications.
