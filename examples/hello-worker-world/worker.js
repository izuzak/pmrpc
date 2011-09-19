importScripts('https://raw.github.com/izuzak/pmrpc/master/pmrpc.js');

// expose a procedure
pmrpc.register( {
  publicProcedureName : "HelloPMRPC_1",
  procedure : function(printParam) { return printParam; } } );
  
// invoke remote procedure
setTimeout(function() {
  pmrpc.call( {
    publicProcedureName : "HelloPMRPC_2",
    params : ["Hello World (from worker)!"] } ); }, 1000);
