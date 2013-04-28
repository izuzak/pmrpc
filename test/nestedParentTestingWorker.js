importScripts('http://izuzak.github.com/pmrpc/pmrpc.js');

console = {};
console.log = function(text) {
  pmrpc.call({
    publicProcedureName : "logger",
    params : [text],
    retries : 0
  });
};

var nestedWorkerEcho = "nestedWorkerEcho";

pmrpc.call({
  publicProcedureName : "nestedWorkersImplemented",
  params : [typeof nonPmrpcWorker !== "undefined"],
});

if (typeof nonPmrpcWorker !== "undefined") {
  var nestedChildTestingWorker = new Worker("nestedChildTestingWorker.js");

  pmrpc.call({
    destination : nestedChildTestingWorker,
    publicProcedureName : "pmrpcNestedChildWorkerTester",
    params : [nestedWorkerEcho],
    onSuccess : function (result) {
      sendMessage(result.returnValue);
    },
    onError : function (result) {
      sendMessage("Failed.");
    }
  });
  function sendMessage(msg) {
    pmrpc.call({
      publicProcedureName : "containerNestedWorkerTest",
      params : [msg],
    });
  }
}
