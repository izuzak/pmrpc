importScripts('https://raw.github.com/izuzak/pmrpc/master/pmrpc.js');

// expose a procedure
pmrpc.register( {
  publicProcedureName : "HelloPMRPC",
  procedure : function(printParam) { return printParam; } } );
