import React, { Component } from "react";
import { useSpring, animated } from "react-spring";
import SourceWorker, {
  MessageOut,
  MessageOutLoading,
  MessageOutLoaded,
  MessageInInitSax,
  MessageInLoad
} from "./source.worker";
import { InlineWebWorker } from "./functions.utils";

type Props = {};

type State = {
  loading?: MessageOutLoading | undefined;
  loaded?: MessageOutLoaded | undefined;
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
    this.sourceWorker = InlineWebWorker(SourceWorker);
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
    }
    if (message.type === "loaded") {
      this.setState({
        loaded: message
      });
    }
  }

  render() {
    const { loaded, loading } = this.state;

    return (
      <div>
        <p>
          Loading and parsing a 130MB XML file in a background thread using
          WASM.
        </p>
        <div>{loading && loading.loadedLengthBytes}</div>
        <div>{loaded && "DONE"}</div>
      </div>
    );
  }
}

function SpringNumber({ number }: { number: number }) {
  const props = useSpring({ number, from: { number: 0 } });
  return <animated.span>{Math.abs(props.number)}</animated.span>;
}

export default App;
