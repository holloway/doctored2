import React, { Component } from "react";
import {
  MessageOut,
  MessageOutLoading,
  MessageOutLoaded,
  MessageInInitSax,
  MessageInLoad,
  MessageInGetRange,
  NodeTypes
} from "doctored-worker";

type Props = {};

type State = {
  loading?: MessageOutLoading | undefined;
  loaded?: MessageOutLoaded | undefined;
  nodes?: NodeTypes[] | undefined;
};

class App extends Component<Props, State> {
  sourceWorker: any;

  constructor(props: {}) {
    super(props);

    this.state = {};

    this.sourceWorkerInit = this.sourceWorkerInit.bind(this);
    this.sourceWorkerInit();
  }

  sourceWorkerInit() {
    this.onmessage = this.onmessage.bind(this);
    this.sourceWorker = new Worker("./doctored.worker.js");
    this.sourceWorker.onmessage = this.onmessage;
    this.sourceWorker.postMessage({
      type: "init-sax",
      location: window.location.toString()
    } as MessageInInitSax);
  }

  onmessage(e: { data: MessageOut }) {
    const message: MessageOut = e.data;
    console.log("UI Thread Received: ", message);
    if (message.type === "sax-ready") {
      this.sourceWorker.postMessage({
        type: "load-source",
        url: new URL("./large.xml", window.location.toString()).toString()
      } as MessageInLoad);
    }
    if (message.type === "loading") {
      this.setState({
        loading: message
      });
      if (message.nodesLength > 0) {
        this.sourceWorker.postMessage({
          type: "get-range/request",
          startIndex: 0,
          endIndex: Math.min(100, message.nodesLength)
        } as MessageInGetRange);
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
        <div>
          {nodes &&
            nodes.map((node: NodeTypes, index: number) => {
              return <div key={index}>{JSON.stringify(node)}</div>;
            })}
        </div>
      </div>
    );
  }
}

export default App;
