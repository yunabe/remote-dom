/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { appendKeys as addCssKeys } from './css/CSSStyleDeclaration';
import { HTMLElement, appendGlobalEventProperties } from './dom/HTMLElement';
import { SVGElement } from './dom/SVGElement';
import { HTMLAnchorElement } from './dom/HTMLAnchorElement';
import { HTMLButtonElement } from './dom/HTMLButtonElement';
import { HTMLCanvasElement } from './dom/HTMLCanvasElement';
import { HTMLDataElement } from './dom/HTMLDataElement';
import { HTMLEmbedElement } from './dom/HTMLEmbedElement';
import { HTMLFieldSetElement } from './dom/HTMLFieldSetElement';
import { HTMLFormElement } from './dom/HTMLFormElement';
import { HTMLIFrameElement } from './dom/HTMLIFrameElement';
import { HTMLImageElement } from './dom/HTMLImageElement';
import { HTMLInputElement } from './dom/HTMLInputElement';
import { HTMLLabelElement } from './dom/HTMLLabelElement';
import { HTMLLinkElement } from './dom/HTMLLinkElement';
import { HTMLMapElement } from './dom/HTMLMapElement';
import { HTMLMeterElement } from './dom/HTMLMeterElement';
import { HTMLModElement } from './dom/HTMLModElement';
import { HTMLOListElement } from './dom/HTMLOListElement';
import { HTMLOptionElement } from './dom/HTMLOptionElement';
import { HTMLProgressElement } from './dom/HTMLProgressElement';
import { HTMLQuoteElement } from './dom/HTMLQuoteElement';
import { HTMLScriptElement } from './dom/HTMLScriptElement';
import { HTMLSelectElement } from './dom/HTMLSelectElement';
import { HTMLSourceElement } from './dom/HTMLSourceElement';
import { HTMLStyleElement } from './dom/HTMLStyleElement';
import { HTMLTableCellElement } from './dom/HTMLTableCellElement';
import { HTMLTableColElement } from './dom/HTMLTableColElement';
import { HTMLTableElement } from './dom/HTMLTableElement';
import { HTMLTableRowElement } from './dom/HTMLTableRowElement';
import { HTMLTableSectionElement } from './dom/HTMLTableSectionElement';
import { HTMLTimeElement } from './dom/HTMLTimeElement';
import { Document } from './dom/Document';
import { GlobalScope } from './WorkerDOMGlobalScope';
import { MutationObserver } from './MutationObserver';
import { Event as WorkerDOMEvent } from './Event';
import { Text } from './dom/Text';
import { HTMLDataListElement } from './dom/HTMLDataListElement';
import { CharacterData } from './dom/CharacterData';
import { Comment } from './dom/Comment';
import { DOMTokenList } from './dom/DOMTokenList';
import { DocumentFragment } from './dom/DocumentFragment';
import { Element } from './dom/Element';
import * as WebSocket from 'ws';
import { MessageToWorker } from '../transfer/Messages';
import { TransferrableKeys } from '../transfer/TransferrableKeys';
import { serialize, deserialize } from '../transfer/Serialize';

const globalScope: GlobalScope = {
  innerWidth: 0,
  innerHeight: 0,
  CharacterData,
  Comment,
  DOMTokenList,
  Document,
  DocumentFragment,
  Element,
  HTMLAnchorElement,
  HTMLButtonElement,
  HTMLCanvasElement,
  HTMLDataElement,
  HTMLDataListElement,
  HTMLElement,
  HTMLEmbedElement,
  HTMLFieldSetElement,
  HTMLFormElement,
  HTMLIFrameElement,
  HTMLImageElement,
  HTMLInputElement,
  HTMLLabelElement,
  HTMLLinkElement,
  HTMLMapElement,
  HTMLMeterElement,
  HTMLModElement,
  HTMLOListElement,
  HTMLOptionElement,
  HTMLProgressElement,
  HTMLQuoteElement,
  HTMLScriptElement,
  HTMLSelectElement,
  HTMLSourceElement,
  HTMLStyleElement,
  HTMLTableCellElement,
  HTMLTableColElement,
  HTMLTableElement,
  HTMLTableRowElement,
  HTMLTableSectionElement,
  HTMLTimeElement,
  SVGElement,
  Text,
  Event: WorkerDOMEvent,
  MutationObserver,
};

/**
const code = `
      'use strict';
      (function(){
        ${workerDOMScript}
        self['window'] = self;
        var workerDOM = WorkerThread.workerDOM;
        WorkerThread.hydrate(
          workerDOM.document,
          ${JSON.stringify(strings)},
          ${JSON.stringify(skeleton)},
          ${JSON.stringify(cssKeys)},
          ${JSON.stringify(globalEventHandlerKeys)},
          [${window.innerWidth}, ${window.innerHeight}],
          ${JSON.stringify(localStorageData)},
          ${JSON.stringify(sessionStorageData)}
        );
        workerDOM.document[${TransferrableKeys.observe}](this);
        Object.keys(workerDOM).forEach(function(k){self[k]=workerDOM[k]});
      }).call(self);
      ${authorScript}
      //# sourceURL=${encodeURI(config.authorURL)}`;
 */

// WorkerDOM.Document.defaultView ends up being the window object.
// React requires the classes to exist off the window object for instanceof checks.
/* export const workerDOM = (function(postMessage, addEventListener, removeEventListener) {
  const document = new Document(globalScope);
  // TODO(choumx): Avoid polluting Document's public API.
  document.postMessage = postMessage;
  document.addGlobalEventListener = addEventListener;
  document.removeGlobalEventListener = removeEventListener;

  // TODO(choumx): Remove once defaultView contains all native worker globals.
  // Canvas's use of native OffscreenCanvas checks the existence of the property
  // on the WorkerDOMGlobalScope.
  globalScope.OffscreenCanvas = (self as any)['OffscreenCanvas'];
  globalScope.ImageBitmap = (self as any)['ImageBitmap'];

  document.isConnected = true;
  document.appendChild((document.body = document.createElement('body')));

  return document.defaultView;
})(postMessage.bind(self) || noop, addEventListener.bind(self) || noop, removeEventListener.bind(self) || noop);
 */

function initialize(
  document: Document,
  cssKeys: Array<string>,
  globalEventHandlerKeys: Array<string>,
  [innerWidth, innerHeight]: [number, number],
): void {
  addCssKeys(cssKeys);
  appendGlobalEventProperties(globalEventHandlerKeys);

  const window = document.defaultView;
  window.innerWidth = innerWidth;
  window.innerHeight = innerHeight;
}

export function setUp(ws: WebSocket) {
  function postMessage(message: any): void {
    const msg = serialize(message);
    ws.send(msg);
  }
  let handlers: ((message: { data: MessageToWorker }) => void)[] = [];
  ws.onmessage = ev => {
    const data = deserialize(ev.data as string) as any;
    handlers.forEach(handler => handler({ data }));
  };

  const document = new Document(globalScope);
  // TODO(choumx): Avoid polluting Document's public API.
  document.postMessage = postMessage;
  document.addGlobalEventListener = (type: 'message', handler: (message: { data: MessageToWorker }) => void) => {
    handlers.push(handler);
  };
  // document.removeGlobalEventListener = removeEventListener;

  document.isConnected = true;
  document.appendChild((document.body = document.createElement('body')));

  // TODO: Not sure when ['onclick'] is used.
  initialize(document, ['width', 'height', 'backgroundColor'], ['onclick'], [300, 400]);
  (global as any).window = document.defaultView;
  (global as any).document = document;

  document[TransferrableKeys.observe]();
}
