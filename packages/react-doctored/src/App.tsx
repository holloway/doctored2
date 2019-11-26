import React, { Component } from "react";
import {
  MessageOut,
  MessageOutLoading,
  MessageOutLoaded,
  MessageInInitDoc,
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

    this.state = {};

    this.sourceWorkerInit = this.sourceWorkerInit.bind(this);
    this.sourceWorkerInit();
  }

  sourceWorkerInit() {
    this.onmessage = this.onmessage.bind(this);
    this.sourceWorker = new Worker("./doctored.worker.js");
    this.sourceWorker.onmessage = this.onmessage;
    this.sourceWorker.postMessage({
      type: "init-doc",
      location: window.location.toString()
    } as MessageInInitDoc);
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
      <div className={`d-nodes${!nodes ? " d-loading" : ""}`}>
        {nodes && <Nodes nodes={nodes} />}
      </div>
    );
  }
}

export default App;
