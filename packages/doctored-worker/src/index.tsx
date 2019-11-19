/* eslint-disable no-restricted-globals */
/* eslint-disable no-eval */
// above rule is disabling 'self' var check.
import { SaxEventType, SAXParser, Detail } from "sax-wasm";

const nodes: NodeTypes[] = [];
let lastElement: NodeElementType | undefined;
let parentElements: number[] = [];
let parentsElements: number[][] = []; // index pointers to parent elements
let saxParser: SAXParser;

async function initSax(self: any, message: MessageInInitDoc): Promise<void> {
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
      switch (event) {
        case SaxEventType.OpenTagStart: {
          lastElement = [
            1,
            // @ts-ignore
            data.name
          ];
          nodes.push(lastElement);

          // @ts-ignore
          if (data.selfClosing) {
            nodes.push([NodeTypeEnum.CloseElement] as NodeCloseElementType);
          } else {
            parentElements.push(nodes.length - 1);
          }
          break;
        }
        case SaxEventType.Attribute: {
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
          nodes.push([NodeTypeEnum.CloseElement] as NodeCloseElementType);
          parentElements.pop();
          break;
        }
        case SaxEventType.Text: {
          nodes.push([
            NodeTypeEnum.Text,
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

      if (nodes[nodes.length - 1][0] === NodeTypeEnum.Element) {
        parentsElements.push(parentElements.slice());
      }
    };
    self.postMessage({ type: "doc-ready" } as MessageOutDocReady);
  } else {
    self.postMessage({
      type: "doc-failure",
      reason: "Unable to parser.prepareWasm"
    } as MessageOutDocFailure);
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
      nodesLength: nodes.length
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
        nodesLength: nodes.length
      } as MessageOutLoading);
    }
    self.postMessage({
      type: "loaded",
      url: message.url,
      contentLengthBytes,
      loadedLengthBytes: bytesRead,
      nodesLength: nodes.length
    } as MessageOutLoaded);
  } catch (e) {
    console.log("fetch load error", e, e.stack);
  }
}

function findParents(index: number): NodeElementType[] {
  for (let i = index; i--; i >= 0) {
    const parentsById = parentsElements[i];
    if (parentsById !== undefined) {
      return parentsById.map(
        (index: number): NodeElementType => {
          const node: NodeTypes = nodes[index];

          if (node[0] !== NodeTypeEnum.Element) {
            throw Error(`Parent node not element. Fatal error. Bye!`);
          }
          return node;
        }
      );
    }
  }
  return [];
}

function getRange(self: any, message: MessageInGetRange) {
  self.postMessage({
    type: "get-range/response",
    parents: findParents(message.startIndex),
    startIndex: message.startIndex,
    endIndex: message.endIndex,
    nodes: nodes.slice(message.startIndex, message.endIndex)
  } as MessageOutGetRangeResponse);
}

// @ts-ignore
self.onmessage = function(e) {
  const message: MessageIn = e.data;
  switch (message.type) {
    case "init-doc": {
      initSax(self, message);
      break;
    }
    case "load-source": {
      load(self, message);
      break;
    }
    case "get-range/request": {
      getRange(self, message);
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

// Message In (to web worker)

export type MessageInInitDoc = {
  type: "init-doc";
  location: string;
};

export type MessageInLoad = {
  type: "load-source";
  url: string;
};

export type MessageInGetRange = {
  type: "get-range/request";
  startIndex: number;
  endIndex: number;
};

export type MessageInCancel = { type: "cancel" };

export type MessageIn =
  | MessageInInitDoc
  | MessageInLoad
  | MessageInCancel
  | MessageInGetRange;

// Message Out (from web worker)

export type MessageOutDocReady = {
  type: "doc-ready";
};

export type MessageOutDocFailure = {
  type: "doc-failure";
  reason?: string | undefined;
};

export type MessageOutLoading = {
  type: "loading";
  url: string;
  contentLengthBytes: number;
  loadedLengthBytes: number;
  loadedLengthString?: number;
  nodesLength: number;
};

export type MessageOutLoaded = {
  type: "loaded";
  url: string;
  contentLengthBytes: number;
  loadedLengthBytes: number;
  loadedLengthString?: number;
  nodesLength: number;
};

export type MessageOutGetRangeResponse = {
  type: "get-range/response";
  parents: NodeElementType[];
  startIndex: number;
  endIndex: number;
  nodes: NodeTypes[];
};

export type MessageOut =
  | MessageOutDocReady
  | MessageOutLoading
  | MessageOutLoaded
  | MessageOutGetRangeResponse;

// Node Types

type NodeAttributesType = {
  [name: string]: string;
};

export type NodeElementType = [
  NodeTypeEnum.Element, // noteType
  string, // nodeName
  (NodeAttributesType | null)?,
  string? // namespace
];
const ELEMENT_ATTRIBUTE_OFFSET = 2;

export type NodeCloseElementType = [NodeTypeEnum.CloseElement]; // non-standard nodeType (obv)
export type NodeTextType = [NodeTypeEnum.Text, string];

export type NodeTypes = NodeElementType | NodeTextType | NodeCloseElementType;

export const NodeTypeId = {
  Element: 1,
  Text: 3,
  CloseElement: 20
};

enum NodeTypeEnum {
  Element = 1,
  Text = 3,
  CloseElement = 20
}
