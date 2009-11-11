//console.log("testingWorker worker loaded");

importScripts('../pmrpc.js');

console = {};
console.log = function(text) {
  pmrpc.call({
    publicProcedureName : "logger",
    params : [text],
    retries : 0
  });
};

//console.log("testingWorker pmrpc loaded");

function pmrpcWorkerTester(testerParam) {
  //console.log("testingWorker pmrpcWorkerTester called with param: " + testerParam);
  return testerParam;
}

function sendMessage() {
  var dedicatedWorkerEcho = "dedicatedWorkerEcho";
  //console.log("testingWorker before sending message");
  pmrpc.call({
    publicProcedureName : "containerWorkerTest",
    params : [dedicatedWorkerEcho],
  });
  //console.log("testingWorker after sending message");
}

//console.log("testingWorker procedure created");

pmrpc.register({
  publicProcedureName : "pmrpcWorkerTester",
  procedure : pmrpcWorkerTester,
  retries : 5
});

//console.log("testingWorker procedure registered");

//setTimeout(sendMessage, 10000);
sendMessage();

//console.log("testingWorker finished");