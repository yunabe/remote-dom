function b64encode(ab: ArrayBuffer): string {
  if (typeof btoa === 'undefined') {
    // Node.js
    var buf = Buffer.alloc(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
      buf[i] = view[i];
    }
    return buf.toString('base64');
  }
  return btoa(String.fromCharCode(...new Uint8Array(ab)));
}

function b64decode(s: string): ArrayBuffer {
  if (typeof btoa === 'undefined') {
    // Node.js
    const buf = new Buffer(s, 'base64');
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
    }
    return ab;
  }
  return Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
}

function arrayBufToB64Obj(message: any): any {
  if (typeof message !== 'object') {
    return message;
  }
  if (message instanceof Array) {
    return message.map(e => arrayBufToB64Obj(e));
  }
  if (message instanceof ArrayBuffer) {
    return {
      buffer: b64encode(message),
    };
  }
  const cp: Object = {};
  for (const key in message) {
    cp[key] = arrayBufToB64Obj(message[key]);
  }
  return cp;
}

function b64ToArrayBufObj(message: any): any {
  if (typeof message !== 'object') {
    return message;
  }
  if (message instanceof Array) {
    return message.map(e => b64ToArrayBufObj(e));
  }
  if (message['buffer']) {
    return b64decode(message['buffer']);
  }
  const cp: Object = {};
  for (const key in message) {
    cp[key] = b64ToArrayBufObj(message[key]);
  }
  return cp;
}

export function serialize(message: Object): string {
  return JSON.stringify(arrayBufToB64Obj(message));
}

export function deserialize(s: string): Object {
  return b64ToArrayBufObj(JSON.parse(s));
}
