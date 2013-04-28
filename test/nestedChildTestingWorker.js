importScripts('http://izuzak.github.com/pmrpc/pmrpc.js');

function pmrpcNestedChildWorkerTester(testerParam) {
  return testerParam;
}

pmrpc.register({
  publicProcedureName : "pmrpcNestedChildWorkerTester",
  procedure : pmrpcNestedChildWorkerTester,
});
