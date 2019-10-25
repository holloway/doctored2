/* eslint-disable no-restricted-globals */
// above rule is disabling 'self' var check.

export function fnInner(js: string): string {
  // takes a string of "function(){ var x; }" and returns "var x;"
  const startIndex = js.indexOf("{") + 1;
  const endIndex = js.lastIndexOf("}");
  return js.substring(startIndex, endIndex);
}

export function InlineWebWorker(fn: Function): Worker {
  const workerJS = fnInner(fn.toString());
  var blob = new Blob([workerJS], { type: "text/javascript" });
  const workerURL = window.URL.createObjectURL(blob);
  var worker = new Worker(workerURL);
  return worker;
}
