(this.webpackJsonpdoctored=this.webpackJsonpdoctored||[]).push([[0],{14:function(e,t,n){"use strict";n.r(t);var o=n(0),r=n.n(o),s=n(3),a=n.n(s),i=n(4),d=n(5),c=n(7),l=n(6),u=n(1),g=n(8),h=function(e){function t(e){var n;return Object(i.a)(this,t),(n=Object(c.a)(this,Object(l.a)(t).call(this,e))).sourceWorker=void 0,n.state={},n.sourceWorkerInit=n.sourceWorkerInit.bind(Object(u.a)(n)),n.sourceWorkerInit(),n}return Object(g.a)(t,e),Object(d.a)(t,[{key:"sourceWorkerInit",value:function(){this.onmessage=this.onmessage.bind(this),this.sourceWorker=new Worker("./doctored.worker.js"),this.sourceWorker.onmessage=this.onmessage,this.sourceWorker.postMessage({type:"init-sax",location:window.location.toString()})}},{key:"onmessage",value:function(e){var t=e.data;console.log("UI Thread Received: ",t),"sax-ready"===t.type&&this.sourceWorker.postMessage({type:"load-source",url:new URL("./large.xml",window.location.toString()).toString()}),"loading"===t.type&&(this.setState({loading:t}),t.nodesLength>0&&this.sourceWorker.postMessage({type:"get-range/request",startIndex:0,endIndex:Math.min(100,t.nodesLength)})),"loaded"===t.type&&(this.setState({loaded:t}),this.sourceWorker.postMessage({type:"get-range/request",startIndex:0,endIndex:Math.min(100,t.nodesLength)})),"get-range/response"===t.type&&this.setState({nodes:t.nodes})}},{key:"render",value:function(){var e=this.state,t=e.loaded,n=e.loading,o=e.nodes;return r.a.createElement("div",null,r.a.createElement("p",null,"Loading and parsing an 80MB XML file in a background thread using WASM."),r.a.createElement("p",null,"Open your dev console to see messages between threads."),r.a.createElement("div",null,n&&n.loadedLengthBytes),r.a.createElement("div",null,t&&"DONE"),r.a.createElement("div",null,o&&o.map((function(e,t){return r.a.createElement("div",{key:t},JSON.stringify(e))}))))}}]),t}(o.Component);a.a.render(r.a.createElement(h,null),document.getElementById("root"))},9:function(e,t,n){e.exports=n(14)}},[[9,1,2]]]);
//# sourceMappingURL=main.87518693.chunk.js.map