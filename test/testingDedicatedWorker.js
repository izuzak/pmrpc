//console.log("testingWorker worker loaded");

importScripts('https://raw.github.com/izuzak/pmrpc/master/pmrpc.js');

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
});

//console.log("testingWorker procedure registered");

setTimeout(sendMessage, 2000);

//console.log("testingWorker finished");
