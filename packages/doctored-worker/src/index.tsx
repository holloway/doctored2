/* eslint-disable no-restricted-globals */
/* eslint-disable no-eval */
// above rule is disabling 'self' var check.
import { SaxEventType, SAXParser, Detail } from "sax-wasm";

const items: NodeTypes[] = [];
let lastElement: NodeElementType;
let saxParser: SAXParser;

let count = 0;

async function initSax(self: any, message: MessageInInitSax): Promise<void> {
  const wasmUrl = new URL("./sax-wasm.wasm", message.location).toString();
  saxParser = new SAXParser(
    SaxEventType.OpenTagStart |
      SaxEventType.Attribute |
      SaxEventType.Text |
      SaxEventType.CloseTag
  );
  const saxWasmResponse = await fetch(wasmUrl);
  const saxWasmBuffer = await saxWasmResponse.arrayBuffer();
  const ready = await saxParser.prepareWasm(new Uint8Array(saxWasmBuffer));
  if (ready) {
    saxParser.eventHandler = (event: SaxEventType, data: Detail) => {
      count++;

      switch (event) {
        case SaxEventType.OpenTagStart: {
          if (count < 10) {
            console.log(
              "OPEN TAG",
              JSON.parse(JSON.stringify(event)),
              JSON.parse(JSON.stringify(data))
            );
          }

          lastElement = [
            1,
            // @ts-ignore
            data.name
          ];
          items.push(lastElement);
          // @ts-ignore
          if (data.selfClosing) {
            items.push([20] as NodeCloseElementType);
          }
          break;
        }
        case SaxEventType.Attribute: {
          if (count < 10) {
            console.log(
              "ATTRIBUTE",
              JSON.parse(JSON.stringify(event)),
              JSON.parse(JSON.stringify(data))
            );
          }
          if (!lastElement) {
            console.error(
              "Attribute node received without lastItem. Huh?",
              data
            );
            throw new Error();
          }
          if (lastElement[ELEMENT_ATTRIBUTE_OFFSET] === undefined) {
            lastElement[ELEMENT_ATTRIBUTE_OFFSET] = {};
          }
          // @ts-ignore
          lastElement[ELEMENT_ATTRIBUTE_OFFSET][data.name] = data.value;
          break;
        }
        case SaxEventType.CloseTag: {
          items.push([20] as NodeCloseElementType);
          break;
        }
        case SaxEventType.Text: {
          items.push([
            3,
            // @ts-ignore
            data.value
          ] as NodeTextType);
          lastElement = undefined;
          break;
        }
        default: {
          console.log(
            "SAX EVENT",
            event,
            SaxEventType.OpenTag,
            SaxEventType.OpenTagStart,
            SaxEventType.Attribute,
            SaxEventType.CloseTag,
            JSON.parse(JSON.stringify(data))
          );
          break;
        }
      }

      if (count < 30) {
        console.log("ITEMS", JSON.parse(JSON.stringify(items)));
      }
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
      itemLength: items.length
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
      let offset = 0;
      while (offset < chunk.value.length) {
        saxParser.write(chunk.value.slice(offset, offset + 1024));
        offset += 1024;
      }
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
        itemLength: items.length
      } as MessageOutLoading);
    }
    self.postMessage({
      type: "loaded",
      url: message.url,
      contentLengthBytes,
      loadedLengthBytes: bytesRead,
      itemLength: items.length
    } as MessageOutLoaded);
  } catch (e) {
    console.log("fetch load error", e, e.stack);
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

export type MessageInGetItem = {
  type: "get-item/request";
  startIndex: number;
  endIndex: number;
};

export type MessageInCancel = { type: "cancel" };

export type MessageIn =
  | MessageInInitSax
  | MessageInLoad
  | MessageInCancel
  | MessageInGetItem;

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
  loadedLengthString?: number;
  itemLength: number;
};

export type MessageOutLoaded = {
  type: "loaded";
  url: string;
  contentLengthBytes: number;
  loadedLengthBytes: number;
  loadedLengthString?: number;
  itemLength: number;
};

export type MessageOutGetItemResponse = {
  type: "get-item/response";
  path: NodeElementType[];
  startIndex: number;
  endIndex: number;
  data: NodeTypes[];
};

export type MessageOut =
  | MessageOutSaxReady
  | MessageOutLoading
  | MessageOutLoaded
  | MessageOutGetItemResponse;

// Node Types

type NodeAttributesType = {
  [name: string]: string;
};

type NodeElementType = [
  1, // noteType
  string, // nodeName
  (NodeAttributesType | null)?,
  string? // namespace
];
const ELEMENT_ATTRIBUTE_OFFSET = 2;

type NodeCloseElementType = [20]; // non-standard nodeType (obv)
type NodeTextType = [3, string];

type NodeTypes = NodeElementType | NodeTextType | NodeCloseElementType;

export const ItemTypeEnum = {
  Element: 1,
  Text: 3,
  CloseElement: 100
};
