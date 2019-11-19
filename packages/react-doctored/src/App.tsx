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
      <div>
        <header>Doctored 2: XML editor demo</header>
        <div className="intro">
          <p>
            Loading and parsing an 80MB XML file in a background thread using
            WASM.
          </p>
          <p>Open your dev console to see messages between threads.</p>

          <div>{loading && loading.loadedLengthBytes}</div>
          <div>{loaded && "DONE"}</div>
        </div>
        <div className="doctored-nodes">{nodes && <Nodes nodes={nodes} />}</div>
      </div>
    );
  }
}

export default App;

// const nodes: NodeTypes[] = [
//   [1, "book", { name: "head.cmb" }],
//   [1, "title"],
//   [3, "The Doctored Editor"],
//   [20],
//   [1, "chapter"],
//   [3, "\n  "],
//   [1, "section"],
//   [3, "\n   "],
//   [1, "para"],
//   [
//     3,
//     "It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey!"
//   ],

//   [1, "link"],
//   [3, "It was the blurst of times."],
//   [1, "span"],
//   [3, "Stupid monkey!"],
//   [20],
//   [1, "span"],
//   [3, "Stupid monkey!"],
//   [20],
//   [20],
//   [
//     3,
//     "It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey!"
//   ],
//   [20],
//   [1, "para"],
//   [3, "It was the best of times."],

//   [1, "span"],
//   [3, "It was the blurst of times."],
//   [1, "span"],
//   [3, "Stupid monkey!"],
//   [20],
//   [1, "span"],
//   [3, "Stupid monkey!"],
//   [20],
//   [20],
//   [
//     3,
//     "It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey! It was the best of times. It was the blurst of times. Stupid monkey! Stupid monkey!"
//   ],
//   [20],

//   [3, "\n            "]
// ];
