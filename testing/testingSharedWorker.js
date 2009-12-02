// console.log("testingWorker worker loaded");

importScripts('../pmrpc.js');

console = {};
console.log = function(text) {
  pmrpc.call({
    publicProcedureName : "logger",
    params : [text],
    retries : 0
  });
};

//console.log("testingSharedWorker pmrpc loaded");

function pmrpcSharedWorkerTester(testerParam) {
  //console.log("testingSharedWorker pmrpcWorkerTester called with param: " + testerParam);
  return testerParam;
}

function sendMessage() {
  var sharedWorkerEcho = "sharedWorkerEcho";
  //console.log("testingSharedWorker before sending message");
  pmrpc.call({
    publicProcedureName : "containerSharedWorkerTest",
    params : [sharedWorkerEcho],
  });
  //console.log("testingSharedWorker after sending message");
}

//console.log("testingSharedWorker procedure created");

pmrpc.register({
  publicProcedureName : "pmrpcSharedWorkerTester",
  procedure : pmrpcSharedWorkerTester,
  retries : 5
});

//console.log("testingSharedWorker procedure registered");

//setTimeout(sendMessage, 10000);
sendMessage();

//console.log("testingSharedWorker finished");