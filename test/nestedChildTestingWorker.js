importScripts('https://raw.github.com/izuzak/pmrpc/master/pmrpc.js');

function pmrpcNestedChildWorkerTester(testerParam) {
  return testerParam;
}

pmrpc.register({
  publicProcedureName : "pmrpcNestedChildWorkerTester",
  procedure : pmrpcNestedChildWorkerTester,
});
