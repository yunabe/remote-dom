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

import polka from 'polka';
import sirv from 'sirv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import url from 'url';
const WebSocket = require('ws');

const { PORT = 3001 } = process.env;

const server = http.createServer();

const pol = polka({ server })
  .use(
    sirv(path.resolve(__dirname, '..'), {
      dev: true,
      setHeaders: res => res.setHeader('AMP-Access-Control-Allow-Source-Origin', `http://localhost:${PORT}`),
    }),
  )
  .use(
    sirv(path.resolve(__dirname), {
      dev: true,
      setHeaders: res => res.setHeader('AMP-Access-Control-Allow-Source-Origin', `http://localhost:${PORT}`),
    }),
  )
  .get('/health', (req, res) => {
    res.end('OK');
  })
  .get('/slow/*', (req, res) => {
    const reqPath = req.path.substring('/slow/'.length);
    const file = fs.readFileSync(path.resolve(__dirname, reqPath));
    setTimeout(() => res.end(file), 6000);
  });

const wss = new WebSocket.Server({ noServer: true });

global.self = global;

server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;
  if (pathname === '/remotedom') {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      console.log('connected');
      const { setUp } = require('../output/worker-thread/index.remote');
      setUp(ws);

      let d = document.createElement('div');
      d.innerHTML = '<b>Hello</b> <i>World</i>!';
      document.body.appendChild(d);

      d = document.createElement('div');
      d.style['width'] = '100px';
      d.style['height'] = '100px';
      let flag = true;
      d.style['backgroundColor'] = '#f00';
      d.addEventListener('click', () => {
        if (flag) {
          d.style['backgroundColor'] = '#00f';
        } else {
          d.style['backgroundColor'] = '#f0f';
        }
        flag = !flag;
      });
      document.body.appendChild(d);
    });
    return;
  }
  console.log('Unknown pathname:', pathname);
  socket.destroy();
});

pol.listen(PORT, _ => {
  console.log(`> Running on http://localhost:${PORT}`);
});
