import React, { Component } from "react";
import {
  MessageOut,
  MessageOutLoading,
  MessageOutLoaded,
  //  MessageInInitDoc,
  MessageInLoad,
  MessageInGetRange,
  NodeTypes
} from "doctored-worker";
import Nodes from "./App.utils";

type Props = {};

type State = {
  loading?: MessageOutLoading | undefined;
  loaded?: MessageOutLoaded | undefined;
  nodes?: NodeTypes[] | undefined;
  requestedRange?: number[];
};

class App extends Component<Props, State> {
  sourceWorker: any;

  constructor(props: {}) {
    super(props);

    this.state = {
      nodes
    };

    this.sourceWorkerInit = this.sourceWorkerInit.bind(this);
    this.sourceWorkerInit();
  }

  sourceWorkerInit() {
    // this.onmessage = this.onmessage.bind(this);
    // this.sourceWorker = new Worker("./doctored.worker.js");
    // this.sourceWorker.onmessage = this.onmessage;
    // this.sourceWorker.postMessage({
    //   type: "init-doc",
    //   location: window.location.toString()
    // } as MessageInInitDoc);
  }

  onmessage(e: { data: MessageOut }) {
    const { requestedRange } = this.state;
    const message: MessageOut = e.data;
    console.log("UI Thread Received: ", message);
    if (message.type === "doc-ready") {
      this.sourceWorker.postMessage({
        type: "load-source",
        url: new URL("./large.xml", window.location.toString()).toString()
      } as MessageInLoad);
    }
    if (message.type === "loading") {
      const newRange = [0, Math.min(100, message.nodesLength)];
      this.setState({
        loading: message
      });
      if (
        message.nodesLength > 0 &&
        (!requestedRange ||
          newRange[0] !== requestedRange[0] ||
          newRange[1] !== requestedRange[1])
      ) {
        console.log("GET RANGE");
        this.sourceWorker.postMessage({
          type: "get-range/request",
          startIndex: newRange[0],
          endIndex: newRange[1]
        } as MessageInGetRange);
        this.setState({
          requestedRange: newRange
        });
      }
    }
    if (message.type === "loaded") {
      this.setState({
        loaded: message
      });
      this.sourceWorker.postMessage({
        type: "get-range/request",
        startIndex: 0,
        endIndex: Math.min(100, message.nodesLength)
      } as MessageInGetRange);
    }
    if (message.type === "get-range/response") {
      console.log(JSON.stringify(message.nodes));
      this.setState({
        nodes: message.nodes
      });
    }
  }

  render() {
    const { loaded, loading, nodes } = this.state;

    return (
      <div>
        <p>
          Loading and parsing an 80MB XML file in a background thread using
          WASM.
        </p>
        <p>Open your dev console to see messages between threads.</p>
        <div>{loading && loading.loadedLengthBytes}</div>
        <div>{loaded && "DONE"}</div>
        <div className="doctored-nodes">{nodes && <Nodes nodes={nodes} />}</div>
      </div>
    );
  }
}

export default App;

const nodes: NodeTypes[] = [
  [1, "book", { name: "head.cmb" }],
  [1, "title"],
  [3, "The Doctored Editor"],
  [20],
  [1, "chapter"],
  [3, "\n  "],
  [1, "section"],
  [3, "\n   "],
  [1, "NP"],
  [3, "Vz+gjytHnSqmoW8pTex59B=="],
  [3, "\n    "],
  [1, "JJ"],
  [3, "Vz+gjytHnSqmoW8pTex59B=="],

  [3, "\n    "],
  [1, "NN"],
  [3, "l333Xdexuj+rLngvm5JwYa=="],
  [20],
  [3, "\n    "],
  [1, "NNS"],
  [3, "0fKDQZ+3ZRIjAo11SUyMQx=="],
  [20],
  [3, "\n   "],
  [20],
  [
    3,
    "Vz+gjytHnSqmoW8pTex59B lots of text Vz+gjytHnSqmoW8pTex59B lots of text Vz+gjytHnSqmoW8pTex59B lots of text Vz+gjytHnSqmoW8pTex59B lots of text Vz+gjytHnSqmoW8pTex59B lots of text"
  ],
  [3, "\n   "],
  [1, "VBP"],
  [3, "ItAvafJCEinspfoHNn8VbR=="],
  [20],
  [3, "\n   "],
  [1, "VP"],
  [3, "\n    "],
  [1, "VBN"],
  [3, "wtLif6joihOeW/VvC+lIW6=="],
  [20],
  [3, "\n    "],
  [1, "NP"],
  [3, "\n     "],
  [1, "NN"],
  [3, "CRtAgTzGVllR050ybz8wLM=="],
  [20],
  [3, "\n    "],
  [20],
  [3, "\n    "],
  [1, "S"],
  [3, "\n     "],
  [1, "NP"],
  [3, "\n      "],
  [1, "_NONE_"],
  [3, "O9Dgkfn4JDLYMry5bfJG39=="],
  [20],
  [3, "\n     "],
  [20],
  [3, "\n     "],
  [1, "TO"],
  [3, "l7qHDSm13CMOXnY+jkrZ6t=="],
  [20],
  [3, "\n     "],
  [1, "VP"],
  [3, "\n      "],
  [1, "VB"],
  [3, "OrwbtC5iVeBNpJFWBVdiLK=="],
  [20],
  [3, "\n      "],
  [1, "NP"],
  [3, "\n       "],
  [1, "NP"],
  [3, "\n        "],
  [1, "DT"],
  [3, "BbGbgbogeaDTvevENHu97s=="],
  [20],
  [3, "\n        "],
  [1, "NN"],
  [3, "MuSOrOyQfWAD+wLGsXN6UK=="],
  [20],
  [3, "\n       "],
  [20],
  [3, "\n       "],
  [1, "VP"],
  [3, "\n        "],
  [1, "VBG"],
  [3, "AHyj7/GtH8ccvGWaEHMrZR=="],
  [20],
  [3, "\n        "],
  [1, "NP"],
  [3, "\n         "],
  [1, "JJ"],
  [3, "a2vdSiq0HiVRh8Ck8ov5uC=="],
  [20],
  [3, "\n         "],
  [1, "NN"],
  [3, "/0ZfBqSHfvMbm99/FiGzG6=="],
  [20],
  [3, "\n         "],
  [1, "PP"],
  [3, "\n          "],
  [1, "TO"],
  [3, "6fc25UxSwWg9Pz+yyR6wi8=="],
  [20],
  [3, "\n          "],
  [1, "NP"],
  [3, "\n           "],
  [1, "NP"],
  [3, "\n            "]
];
