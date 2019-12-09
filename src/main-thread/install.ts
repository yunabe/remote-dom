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

import { MutationFromWorker, MessageType, MessageFromWorker } from '../transfer/Messages';
import { MutatorProcessor } from './mutator';
import { NodeContext } from './nodes';
import { StringContext } from './strings';
import { TransferrableKeys } from '../transfer/TransferrableKeys';
import { InboundWorkerDOMConfiguration, normalizeConfiguration, Messanger } from './configuration';
import { WorkerContext, WorkerContextImpl } from './worker';
import { MessageToWorker } from '../transfer/Messages';
import { ObjectContext } from './object-context';

const ALLOWABLE_MESSAGE_TYPES = [MessageType.MUTATE, MessageType.HYDRATE];

/**
 * @param baseElement
 * @param authorScriptURL
 * @param workerDOMURL
 * @param callbacks
 * @param sanitizer
 * @param debug
 */
export function fetchAndInstall(baseElement: HTMLElement, config: InboundWorkerDOMConfiguration): Promise<Messanger | null> {
  const fetchPromise = Promise.all([
    // TODO(KB): Fetch Polyfill for IE11.
    fetch(config.domURL).then(response => response.text()),
    fetch(config.authorURL).then(response => response.text()),
  ]);
  return install(fetchPromise, baseElement, config);
}

/**
 * @param fetchPromise
 * @param baseElement
 * @param config
 */
export function install(
  fetchPromise: Promise<[string, string]>,
  baseElement: HTMLElement,
  config: InboundWorkerDOMConfiguration,
): Promise<Messanger | null> {
  const stringContext = new StringContext();
  const objectContext = new ObjectContext();
  const nodeContext = new NodeContext(stringContext, baseElement);
  const normalizedConfig = normalizeConfiguration(config);
  return fetchPromise.then(([domScriptContent, authorScriptContent]) => {
    if (domScriptContent && authorScriptContent && config.authorURL) {
      const workerContext: WorkerContext = new WorkerContextImpl(baseElement, nodeContext, domScriptContent, authorScriptContent, normalizedConfig);
      const mutatorContext = new MutatorProcessor(stringContext, nodeContext, workerContext, normalizedConfig, objectContext);
      workerContext.worker.onmessage = (message: MessageFromWorker) => {
        const { data } = message;

        if (!ALLOWABLE_MESSAGE_TYPES.includes(data[TransferrableKeys.type])) {
          return;
        }

        mutatorContext.mutate(
          (data as MutationFromWorker)[TransferrableKeys.phase],
          (data as MutationFromWorker)[TransferrableKeys.nodes],
          (data as MutationFromWorker)[TransferrableKeys.strings],
          new Uint16Array(data[TransferrableKeys.mutations]),
        );

        if (config.onReceiveMessage) {
          config.onReceiveMessage(message);
        }
      };

      return workerContext.worker;
    }
    return null;
  });
}

/**
 * @param fetchPromise
 * @param baseElement
 * @param config
 */
export function installMessanger(workerContext: WorkerContext, baseElement: HTMLElement, config: InboundWorkerDOMConfiguration): void {
  const stringContext = new StringContext();
  const objectContext = new ObjectContext();
  const nodeContext = new NodeContext(stringContext, baseElement);
  const normalizedConfig = normalizeConfiguration(config);
  const mutatorContext = new MutatorProcessor(stringContext, nodeContext, workerContext, normalizedConfig, objectContext);
  workerContext.worker.onmessage = (message: MessageFromWorker) => {
    const { data } = message;

    if (!ALLOWABLE_MESSAGE_TYPES.includes(data[TransferrableKeys.type])) {
      return;
    }

    mutatorContext.mutate(
      (data as MutationFromWorker)[TransferrableKeys.phase],
      (data as MutationFromWorker)[TransferrableKeys.nodes],
      (data as MutationFromWorker)[TransferrableKeys.strings],
      new Uint16Array(data[TransferrableKeys.mutations]),
    );

    if (config.onReceiveMessage) {
      config.onReceiveMessage(message);
    }
  };
}

/**
 * @param fetchPromise
 * @param baseElement
 * @param config
 */
export function installWS(ws: WebSocket, baseElement: HTMLElement, config: InboundWorkerDOMConfiguration): void {
  const messanger: Messanger = {
    postMessage: (message: any): void => {
      ws.send(JSON.stringify(message));
    },
    onmessage: null,
  };
  ws.onmessage = (e: MessageEvent) => {
    if (messanger.onmessage) {
      messanger.onmessage({
        data: JSON.parse(e.data),
      });
    }
  };
  const context: WorkerContext = {
    get worker() {
      return messanger;
    },
    messageToWorker(message: MessageToWorker): void {
      messanger.postMessage(message);
    },
  };
  installMessanger(context, baseElement, config);
}
