// console.log("testingWorker worker loaded");
importScripts('../pmrpc.js');
eventSource = "";

console = {};
console.log = function(text) {
  function logClosure() {
    pmrpc.call({
      destination : eventSource,
      publicProcedureName : "logger",
      params : [text],
      retries : 5
    });
  };
  setTimeout(logClosure, 2000);
};

//console.log("testingSharedWorker pmrpc loaded");

function pmrpcSharedWorkerTester(testerParam, e) {
  eventSource = e.source;
  //console.log("testingSharedWorker pmrpcWorkerTester called with param: " + testerParam + " " + typeof e.source);
  return testerParam;
}

function sendMessage() {
  var sharedWorkerEcho = "sharedWorkerEcho";
  //console.log("testingSharedWorker before sending message");
  pmrpc.call({
    destination : eventSource,
    publicProcedureName : "containerSharedWorkerTest",
    params : [sharedWorkerEcho],
  });
  //console.log("testingSharedWorker after sending message");
}

//console.log("testingSharedWorker procedure created");

pmrpc.register({
  publicProcedureName : "pmrpcSharedWorkerTester",
  procedure : pmrpcSharedWorkerTester,
});

//console.log("testingSharedWorker procedure registered");

setTimeout(sendMessage, 500);

//console.log("testingSharedWorker finished");