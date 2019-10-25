/* eslint-disable no-restricted-globals */
/* eslint-disable no-eval */
// above rule is disabling 'self' var check.
import { SaxEventType, SAXParser } from "sax-wasm";

let data: string = "";
let saxParser: SAXParser;

async function initSax(self: any, message: MessageInInitSax): Promise<void> {
  console.log("initSax");
  const wasmUrl = new URL("./sax-wasm.wasm", message.location).toString();
  saxParser = new SAXParser(SaxEventType.Attribute | SaxEventType.OpenTag, {
    highWaterMark: 1024 * 1024
  });
  const saxWasmResponse = await fetch(wasmUrl);
  const saxWasmBuffer = await saxWasmResponse.arrayBuffer();
  const ready = await saxParser.prepareWasm(new Uint8Array(saxWasmBuffer));
  if (ready) {
    saxParser.eventHandler = (event: any, data: any) => {
      // console.log("SAX EVENT!");
    };
    self.postMessage({ type: "sax-ready" } as MessageOutSaxReady);
  } else {
    self.postMessage({
      type: "sax-failure",
      reason: "Unable to parser.prepareWasm"
    } as MessageOutSaxFailure);
  }
}

async function load(self: any, message: MessageInLoad): Promise<void> {
  console.log("Loading...", message.url);
  try {
    const response = await fetch(message.url);
    const contentLengthBytes = parseInt(
      response.headers.get("Content-Length") || "-1",
      10
    );

    self.postMessage({
      type: "loading",
      url: message.url,
      contentLengthBytes,
      loadedLengthString: 0
    } as MessageOutLoading);

    if (!response || !response.body)
      throw Error("Fetch error. Response type = " + typeof response);

    let bytesRead = 0;
    const reader = response.body.getReader();
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        saxParser.end();
        break;
      }

      saxParser.write(chunk.value);

      bytesRead += chunk.value ? chunk.value.length : 0;
      // console.log("Bytes", bytesRead);

      // console.log(
      //   "Loading chunk size",
      //   chunk.value ? chunk.value.length : "nothing (done)"
      // );
      // data += chunk.value ? utf8Decoder.decode(chunk.value) : "";
      self.postMessage({
        type: "loading",
        url: message.url,
        contentLengthBytes,
        loadedLengthBytes: bytesRead,
        loadedLengthString: data.length
      } as MessageOutLoading);
    }
    self.postMessage({
      type: "loaded",
      url: message.url,
      contentLengthBytes,
      loadedLengthBytes: bytesRead,
      loadedLengthString: data.length
    } as MessageOutLoaded);
  } catch (e) {
    console.log("fetch load error", e);
  }
}

// @ts-ignore
self.onmessage = function(e) {
  const message: MessageIn = e.data;
  switch (message.type) {
    case "init-sax": {
      initSax(self, message);
      break;
    }
    case "load-source": {
      load(self, message);
      break;
    }
    case "cancel": {
      // not supported
      break;
    }
    default: {
      throw Error(`Unrecognised message ${JSON.stringify(message)}`);
    }
  }
};

function throttle(func: Function, delay: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function(...args: any[]) {
    if (!timeout) {
      timeout = setTimeout(() => {
        // @ts-ignore
        func.call(this, ...args);
        timeout = null;
      }, delay);
    }
  };
}

// Message In (to web worker)

export type MessageInInitSax = {
  type: "init-sax";
  location: string;
};

export type MessageInLoad = {
  type: "load-source";
  url: string;
};

export type MessageInCancel = { type: "cancel" };

export type MessageIn = MessageInInitSax | MessageInLoad | MessageInCancel;

// Message Out (from web worker)

export type MessageOutSaxReady = {
  type: "sax-ready";
};

export type MessageOutSaxFailure = {
  type: "sax-failure";
  reason?: string | undefined;
};

export type MessageOutLoading = {
  type: "loading";
  url: string;
  contentLengthBytes: number;
  loadedLengthBytes: number;
  loadedLengthString: number;
};

export type MessageOutLoaded = {
  type: "loaded";
  url: string;
  contentLengthBytes: number;
  loadedLengthBytes: number;
  loadedLengthString: number;
};

export type MessageOut =
  | MessageOutSaxReady
  | MessageOutLoading
  | MessageOutLoaded;
