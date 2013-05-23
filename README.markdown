# Introduction

**Pmrpc** is an HTML5 JavaScript library for **message passing**, **remote procedure call** and **publish-subscribe** cross-contex communication in the browser. The library provides a simple API for exposing and calling procedures between browser **windows**, **iframes** and **web workers**, even between different origins. Pmrpc also provides several advanced features: callbacks similar to AJAX calls, ACL-based access control, asynchronous procedure support and fault-tolerance via retries. In case this wasn't clear, pmrpc **is not** a library for browser-server communication, it is a library for communication within the browser.

The **implementation** of the library is based on the [HTML5 Cross-document messaging postMessage API](http://www.w3.org/html/wg/html5/#crossDocumentMessages), [Web Workers API](http://www.whatwg.org/specs/web-workers/current-work/), the [JSON-RPC protocol](http://groups.google.com/group/json-rpc/web/json-rpc-1-2-proposal) and the [JSON data format](http://www.json.org). Pmrpc uses the postMessage API as an underlying communication mechanism and extends it to a RPC model using the JSON-RPC, a transport-independent protocol that uses JSON for formatting messages.

# Documentation

The complete list of features and the full API reference is [here](http://izuzak.github.com/pmrpc/apidocs.html).

We have also written several blog posts about Pmrpc and cross-context communication:

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

Below is a **hello world example of using pmrpc**. For more examples, see the `examples` folder. See the API docs for a full description of the API, feature list and usage examples.

**Inter-window communication example** (parent window invokes procedure in nested iframe):

First, a procedure is registered for remote calls in the iframe that contains the procedure:

```html
<html>
  <head>
    <script type="text/javascript" src="http://izuzak.github.com/pmrpc/pmrpc.js"></script>
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
```

Second, the procedure is called from the parent window by specifying the iframe object which contains the remote procedure, name of the procedure and parameters:

```html
<html>
  <head>
    <script type="text/javascript" src="http://izuzak.github.com/pmrpc/pmrpc.js"></script>
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
```

# Browser support

Pmrpc should work on Firefox 3+, Google Chrome, Opera 10.60+, Internet Explorer 8+.

Visit the [pmrpc testing page](http://izuzak.github.com/pmrpc/test/testingContainer.html) to see if your browser can use pmrpc. In general, pmrpc is designed to work with the latest version of all popular browsers, we have no interest or intention to support old browser version (e.g. Firefox 2, IE6).

# License

Pmrpc was developed by [Ivan Zuzak](http://ivanzuzak.info) and [Marko Ivankovic](http://www.twitter.com/ivankovic_42) and is available under the [Apache v2.0 license](http://www.apache.org/licenses/LICENSE-2.0).

# Projects using pmrpc

* [edudip](http://www.edudip.com/) - Platform for live Online Courses

* [Responsive Open Learning Environments - ROLE](http://www.role-project.eu/) - European 7th Framework Programme (thanks to Bodo von der Heiden). _"ROLE will create an individual world for learning with personalization intelligence on the user's side. ROLE will reach this objective by enabling the user to easily construct and maintain her own personal learning environment (PLE) consisting of a mix of preferred learning tools, learning services, learning resources and other related technologies."_

* [OpenLaszlo](http://www.openlaszlo.org/) - An open source platform for the development and delivery of rich Internet applications.

# Credits

* Andrew Strelzoff, Jeremy Jones, Aaron Strickland, Justin Wang, Patrick Ransom, Jordan Granville, LaDarius Williams and Eric Mixon for an [awesome example of utilizing web workers to speed and smooth physics rendering](https://github.com/izuzak/pmrpc/tree/master/examples/physics-pmrpc)
* [Marc Fawzi](https://github.com/idibidiart) for many bug fixes and code improvements
* [Jose Badeau](https://github.com/jbadeau) for many bug reports and help in debugging several [issues](https://github.com/izuzak/pmrpc/issues/7)

[![gaugestracking alpha](https://secure.gaug.es/track.gif?h[site_id]=519d30c9f5a1f57062000015&h[resource]=http%3A%2F%2Fgithub.com%2Fizuzak%2Fpmrpc&h[title]=pmrpc%20%28GitHub%29&h[unique]=1&h[unique_hour]=1&h[unique_day]=1&h[unique_month]=1&h[unique_year]=1 "ivanzuzak.info")](http://ivanzuzak.info/)
