(this["webpackJsonpreact-doctored2"]=this["webpackJsonpreact-doctored2"]||[]).push([[0],{14:function(e,t,n){},15:function(e,t,n){"use strict";n.r(t);var o,s,i=n(0),r=n.n(i),a=n(3),d=n.n(a),c=n(4),l=n(5),u=n(7),g=n(6),h=n(1),v=n(8);n(14);function k(e){var t,n=e.nodes,i="",a=[];console.log(n);for(var d=0;d<n.length;d++){var c=n[d];switch(c[0]){case o.Element:t=c[1],a[a.length-1]===s.inline||["a","span","link"].includes(t)?(a.push(s.inline),i+='<div class="d-inline">',i+='<div class="d-inline__inner">',i+='<div class="d-inline__button" role="button" tabindex="0">',i+=c[1],i+="</div>",i+='<div class="d-inline__inner__content">'):(a.push(s.block),i+='<div class="d-block">',i+='<div class="d-block__button" role="button" tabindex="0">',i+=c[1],i+="</div>",i+='<div class="d-block__inner">');break;case o.Text:i+="<span contentEditable>".concat(c[1],"</span>");break;case o.CloseElement:a.pop()===s.inline?(i+="</div>",i+="</div>",i+="</div>"):(i+="</div>",i+="</div>")}}return r.a.createElement("div",{dangerouslySetInnerHTML:{__html:i}})}!function(e){e[e.Element=1]="Element",e[e.Text=3]="Text",e[e.CloseElement=20]="CloseElement"}(o||(o={})),function(e){e[e.block=0]="block",e[e.inline=1]="inline"}(s||(s={}));var p=function(e){function t(e){var n;return Object(c.a)(this,t),(n=Object(u.a)(this,Object(g.a)(t).call(this,e))).sourceWorker=void 0,n.state={},n.sourceWorkerInit=n.sourceWorkerInit.bind(Object(h.a)(n)),n.sourceWorkerInit(),n}return Object(v.a)(t,e),Object(l.a)(t,[{key:"sourceWorkerInit",value:function(){this.onmessage=this.onmessage.bind(this),this.sourceWorker=new Worker("./doctored.worker.js"),this.sourceWorker.onmessage=this.onmessage,this.sourceWorker.postMessage({type:"init-doc",location:window.location.toString()})}},{key:"onmessage",value:function(e){var t=this.state.requestedRange,n=e.data;if(console.log("UI Thread Received: ",n),"doc-ready"===n.type&&this.sourceWorker.postMessage({type:"load-source",url:new URL("./large.xml",window.location.toString()).toString()}),"loading"===n.type){var o=[0,Math.min(100,n.nodesLength)];this.setState({loading:n}),n.nodesLength>0&&(!t||o[0]!==t[0]||o[1]!==t[1])&&(console.log("GET RANGE"),this.sourceWorker.postMessage({type:"get-range/request",startIndex:o[0],endIndex:o[1]}),this.setState({requestedRange:o}))}"loaded"===n.type&&(this.setState({loaded:n}),this.sourceWorker.postMessage({type:"get-range/request",startIndex:0,endIndex:Math.min(100,n.nodesLength)})),"get-range/response"===n.type&&(console.log(JSON.stringify(n.nodes)),this.setState({nodes:n.nodes}))}},{key:"render",value:function(){var e=this.state,t=(e.loaded,e.loading,e.nodes);return r.a.createElement("div",{className:"d-nodes".concat(t?"":" d-loading")},t&&r.a.createElement(k,{nodes:t}))}}]),t}(i.Component);d.a.render(r.a.createElement(p,null),document.getElementById("root"))},9:function(e,t,n){e.exports=n(15)}},[[9,1,2]]]);
//# sourceMappingURL=main.c7372be1.chunk.js.map