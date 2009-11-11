// console.log("testingWorker worker loaded");

importScripts('pmrpc.js');

console = {};
console.log = function(text) {
  pmrpc.call({
    publicProcedureName : "logger",
    params : [text],
    retries : 0
  });
};

console.log("testingSharedWorker pmrpc loaded");

function pmrpcWorkerTester(testerParam) {
  console.log("testingSharedWorker pmrpcWorkerTester called with param: " + testerParam);
  return testerParam + " from worker";
}

function sendMessage() {
  console.log("testingSharedWorker before sending message");
  pmrpc.call({
    publicProcedureName : "containerWorkerTest",
    params : ["Hello from worker!"],
  });
  console.log("testingSharedWorker after sending message");
}

console.log("testingSharedWorker procedure created");

pmrpc.register({
  publicProcedureName : "pmrpcWorkerTester",
  procedure : pmrpcWorkerTester,
  retries : 5
});

console.log("testingSharedWorker procedure registered");

//setTimeout(sendMessage, 10000);
sendMessage();

console.log("testingSharedWorker finished");