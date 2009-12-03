importScripts('../pmrpc.js');

function pmrpcNestedChildWorkerTester(testerParam) {
  return testerParam;
}

pmrpc.register({
  publicProcedureName : "pmrpcNestedChildWorkerTester",
  procedure : pmrpcNestedChildWorkerTester,
});