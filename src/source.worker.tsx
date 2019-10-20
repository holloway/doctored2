/* eslint-disable no-restricted-globals */
/* eslint-disable no-eval */
// above rule is disabling 'self' var check.

export default function SourceWebWorker() {
  // This function is treated as a web worker.

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

  // Following code copied inline from https://www.npmjs.com/package/sax-wasm
  // It's copied inline so that we can .toString() the function wrapper
  // and send it to the worker.
  // Under MIT License
  // Copyright (c) 2018 Justin Wilaby

  class SaxEventType {
    // 1
    public static Text = 0b1;
    // 2
    public static ProcessingInstruction = 0b10;
    // 4
    public static SGMLDeclaration = 0b100;
    // 8
    public static Doctype = 0b1000;
    // 16
    public static Comment = 0b10000;
    // 32
    public static OpenTagStart = 0b100000;
    // 64
    public static Attribute = 0b1000000;
    // 128
    public static OpenTag = 0b10000000;
    // 256
    public static CloseTag = 0b100000000;
    // 512
    public static OpenCDATA = 0b1000000000;
    // 1024
    public static Cdata = 0b10000000000;
    // 2048
    public static CloseCDATA = 0b100000000000;
  }

  type Detail = Position | Attribute | Text | Tag | StringReader;

  abstract class Reader<T = Detail> {
    protected data: Uint8Array;
    protected cache = {} as { [prop: string]: T };
    protected ptr: number;

    constructor(data: Uint8Array, ptr: number = 0) {
      this.data = data;
      this.ptr = ptr;
    }

    public abstract toJSON(): { [prop: string]: T };
    // @ts-ignore
    public abstract get value();
  }

  class Position {
    public line: number;
    public character: number;

    constructor(line: number, character: number) {
      this.line = line;
      this.character = character;
    }
  }

  class Attribute extends Reader<string | number | Position> {
    get nameStart(): Position {
      return (
        (this.cache.nameStart as Position) ||
        (this.cache.nameStart = readPosition(this.data, this.ptr))
      );
    }

    get nameEnd(): Position {
      return (
        (this.cache.nameEnd as Position) ||
        (this.cache.nameEnd = readPosition(this.data, this.ptr + 8))
      );
    }

    get valueStart(): Position {
      return (
        (this.cache.valueStart as Position) ||
        (this.cache.valueStart = readPosition(this.data, this.ptr + 16))
      );
    }

    get valueEnd(): Position {
      return (
        (this.cache.valueEnd as Position) ||
        (this.cache.valueEnd = readPosition(this.data, this.ptr + 24))
      );
    }

    get name(): string {
      if (this.cache.name) {
        return this.cache.name as string;
      }
      const nameLen = readU32(this.data, this.ptr + 32);
      return (this.cache.name = readString(
        this.data.buffer,
        this.ptr + 36,
        nameLen
      ));
    }

    get value(): string {
      if (this.cache.value) {
        return this.cache.value as string;
      }
      const nameLen = readU32(this.data, this.ptr + 32);
      const valueLen = readU32(this.data, this.ptr + 36 + nameLen);
      return (this.cache.value = readString(
        this.data.buffer,
        this.ptr + 40 + nameLen,
        valueLen
      ));
    }

    public toJSON(): { [prop: string]: string | number | Position } {
      const { nameStart, nameEnd, valueStart, valueEnd, name, value } = this;
      return { nameStart, nameEnd, valueStart, valueEnd, name, value };
    }
  }

  class Text extends Reader<string | Position> {
    get start(): Position {
      return (
        (this.cache.start as Position) ||
        (this.cache.start = readPosition(this.data, this.ptr))
      );
    }

    get end(): Position {
      return (
        (this.cache.end as Position) ||
        (this.cache.end = readPosition(this.data, this.ptr + 8))
      );
    }

    get value(): string {
      if (this.cache.value) {
        return this.cache.value as string;
      }
      const valueLen = readU32(this.data, this.ptr + 16);
      return (this.cache.value = readString(
        this.data.buffer,
        this.ptr + 20,
        valueLen
      ));
    }

    public toJSON(): { [prop: string]: string | Position } {
      const { start, end, value } = this;
      return { start, end, value };
    }
  }

  class StringReader extends Reader<string> {
    get value(): string {
      if (this.cache.value) {
        return this.cache.value as string;
      }
      return (this.cache.value = readString(
        this.data.buffer,
        this.ptr,
        this.data.length
      ));
    }

    public toJSON(): { [p: string]: string } {
      return { value: this.value };
    }

    public toString() {
      return this.value;
    }
  }

  class Tag extends Reader<
    Attribute[] | Text[] | Position | string | number | boolean
  > {
    get openStart(): Position {
      return (
        (this.cache.openStart as Position) ||
        (this.cache.openStart = readPosition(this.data, 0))
      );
    }

    get openEnd(): Position {
      return (
        (this.cache.openEnd as Position) ||
        (this.cache.openEnd = readPosition(this.data, 8))
      );
    }

    get closeStart(): Position {
      return (
        (this.cache.closeStart as Position) ||
        (this.cache.closeStart = readPosition(this.data, 16))
      );
    }

    get closeEnd(): Position {
      return (
        (this.cache.closeEnd as Position) ||
        (this.cache.closeEnd = readPosition(this.data, 24))
      );
    }

    get selfClosing(): boolean {
      return !!this.data[32];
    }

    get name(): string {
      if (this.cache.name) {
        return this.cache.name as string;
      }
      const nameLen = readU32(this.data, 33);
      return (this.cache.name = readString(this.data.buffer, 37, nameLen));
    }

    get attributes(): Attribute[] {
      if (this.cache.attributes) {
        return this.cache.attributes as Attribute[];
      }
      // starting location of the attribute block
      let ptr = readU32(this.data, this.data.length - 8);
      let numAttrs = readU32(this.data, ptr);
      ptr += 4;
      const attributes = [] as Attribute[];
      for (let i = 0; i < numAttrs; i++) {
        let attrLen = readU32(this.data, ptr);
        ptr += 4;
        attributes[i] = new Attribute(this.data, ptr);
        ptr += attrLen;
      }
      return (this.cache.attributes = attributes);
    }

    get textNodes(): Text[] {
      if (this.cache.textNodes) {
        return this.cache.textNodes as Text[];
      }
      // starting location of the text nodes block
      let ptr = readU32(this.data, this.data.length - 4);
      let numTextNodes = readU32(this.data, ptr);
      const textNodes = [] as Text[];
      ptr += 4;
      for (let i = 0; i < numTextNodes; i++) {
        let textLen = readU32(this.data, ptr);
        ptr += 4;
        textNodes[i] = new Text(this.data, ptr);
        ptr += textLen;
      }
      return (this.cache.textNodes = textNodes);
    }

    public toJSON(): {
      [p: string]: Attribute[] | Text[] | Position | string | number | boolean;
    } {
      const {
        openStart,
        openEnd,
        closeStart,
        closeEnd,
        name,
        attributes,
        textNodes,
        selfClosing
      } = this;
      return {
        openStart,
        openEnd,
        closeStart,
        closeEnd,
        name,
        attributes,
        textNodes,
        selfClosing
      };
    }

    get value() {
      return this.name;
    }
  }

  interface WasmSaxParser {
    memory: WebAssembly.Memory;
    parser: (events: number) => void;
    write: (pointer: number, length: number) => void;
    end: () => void;
  }

  interface SaxParserOptions {
    highWaterMark: number;
  }

  class SAXParser {
    public static textDecoder: TextDecoder; // Web only

    // @ts-ignore
    public events: number;
    // @ts-ignore
    public eventHandler: (type: SaxEventType, detail: Detail) => void;

    private readonly options: SaxParserOptions;
    // @ts-ignore
    private wasmSaxParser: WasmSaxParser;
    // @ts-ignore
    private writeBuffer: Uint8Array | null;

    constructor(
      events = 0,
      options: SaxParserOptions = { highWaterMark: 32 * 1024 }
    ) {
      this.options = options;
      const self = this;
      Object.defineProperties(this, {
        events: {
          get: function() {
            return ~~events;
          },
          set: function(value: number) {
            events = ~~value;
            if (self.wasmSaxParser) {
              self.wasmSaxParser.parser(events);
            }
          },
          configurable: false,
          enumerable: true
        }
      });
    }

    public write(chunk: Uint8Array, offset: number = 0): void {
      const {
        write,
        memory: { buffer }
      } = this.wasmSaxParser;

      // Allocations within the WASM process
      // invalidate reference to the memory buffer.
      // We check for this and create a new Uint8Array
      // with the new memory buffer reference if needed.
      // **NOTE** These allocations can slow down parsing
      // if they become excessive. Consider adjusting the
      // highWaterMark in the options up or down to find the optimal
      // memory allocation to prevent too many new Uint8Array instances.
      if (!this.writeBuffer || this.writeBuffer.buffer !== buffer) {
        this.writeBuffer = new Uint8Array(
          buffer,
          0,
          this.options.highWaterMark
        );
      }
      this.writeBuffer.set(chunk);
      write(offset, chunk.byteLength);
    }

    public end(): void {
      this.writeBuffer = null;
      this.wasmSaxParser.end();
    }

    public async prepareWasm(saxWasm: Uint8Array): Promise<boolean> {
      const result = await WebAssembly.instantiate(saxWasm, {
        env: {
          memoryBase: 0,
          tableBase: 0,
          memory: new WebAssembly.Memory({
            initial: 32
          } as WebAssembly.MemoryDescriptor),
          table: new WebAssembly.Table({
            initial: 1,
            element: "anyfunc"
          } as WebAssembly.TableDescriptor),
          event_listener: this.eventTrap
        }
      });
      if (result) {
        const { parser } = (this.wasmSaxParser = result.instance.exports);
        parser(this.events);
        return true;
      }
      throw new Error(`Failed to instantiate the parser.`);
    }

    protected eventTrap = (event: number, ptr: number, len: number): void => {
      const uint8array = new Uint8Array(
        this.wasmSaxParser.memory.buffer.slice(ptr, ptr + len)
      );

      let detail: Detail;
      switch (event) {
        case SaxEventType.Attribute:
          detail = new Attribute(uint8array);
          break;

        case SaxEventType.OpenTag:
        case SaxEventType.CloseTag:
        case SaxEventType.OpenTagStart:
          detail = new Tag(uint8array);
          break;

        case SaxEventType.Text:
          detail = new Text(uint8array);
          break;

        case SaxEventType.OpenCDATA:
          detail = readPosition(uint8array);
          break;

        default:
          detail = new StringReader(uint8array);
          break;
      }

      this.eventHandler(event, detail);
    };
  }

  function readString(
    data: ArrayBuffer,
    byteOffset: number,
    length: number
  ): string {
    const env = global || window;
    // Node
    if ((env as any).Buffer !== undefined) {
      return Buffer.from(data, byteOffset, length).toString();
    }
    // Web
    return (
      SAXParser.textDecoder || (SAXParser.textDecoder = new TextDecoder())
    ).decode(new Uint8Array(data, byteOffset, length));
  }

  function readU32(uint8Array: Uint8Array, ptr: number): number {
    return (
      (uint8Array[ptr + 3] << 24) |
      (uint8Array[ptr + 2] << 16) |
      (uint8Array[ptr + 1] << 8) |
      uint8Array[ptr]
    );
  }

  function readPosition(uint8Array: Uint8Array, ptr: number = 0): Position {
    const line = readU32(uint8Array, ptr);
    const character = readU32(uint8Array, ptr + 4);
    return new Position(line, character);
  }
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
