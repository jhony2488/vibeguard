// MCP stdio transport — JSON-RPC 2.0, newline-delimited (docs/04-mcp-server.md).
// One message per line, UTF-8, no embedded newlines. Only protocol traffic
// touches stdout; any diagnostics must go to stderr.

export const RPC_ERRORS = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
};

export function rpcError(code, message) {
  return Object.assign(new Error(message), { code });
}

function toResponse(id, result, error) {
  const res = { jsonrpc: '2.0', id };
  if (error) res.error = { code: error.code ?? RPC_ERRORS.INTERNAL, message: error.message };
  else res.result = result;
  return res;
}

// Dispatches a single JSON-RPC message through server.handleRequest.
// Notifications (no id) never produce a response.
async function dispatch(server, msg) {
  if (!msg || typeof msg !== 'object' || typeof msg.method !== 'string') {
    return toResponse(
      msg?.id ?? null,
      undefined,
      rpcError(RPC_ERRORS.INVALID_REQUEST, 'Invalid JSON-RPC request'),
    );
  }
  const isNotification = msg.id === undefined || msg.id === null;
  try {
    const result = await server.handleRequest(msg.method, msg.params ?? {});
    return isNotification ? null : toResponse(msg.id, result);
  } catch (err) {
    return isNotification ? null : toResponse(msg.id, undefined, err);
  }
}

// Reads newline-delimited JSON-RPC from `input` and writes responses to
// `output`. Resolves `done` when the input stream ends (client disconnect).
export function runStdioServer(server, { input = process.stdin, output = process.stdout } = {}) {
  let buffer = '';
  input.setEncoding?.('utf8');

  const write = (payload) => output.write(JSON.stringify(payload) + '\n');

  const onLine = async (line) => {
    if (!line) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      write(toResponse(null, undefined, rpcError(RPC_ERRORS.PARSE, 'Parse error')));
      return;
    }
    const msgs = Array.isArray(msg) ? msg : [msg];
    for (const m of msgs) {
      const res = await dispatch(server, m);
      if (res) write(res);
    }
  };

  let chain = Promise.resolve();
  const done = new Promise((resolve) => {
    input.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        // serialize handling so responses keep request order per batch
        chain = chain.then(() => onLine(line));
      }
    });
    input.on('end', () => chain.then(resolve, resolve));
    input.on('close', () => chain.then(resolve, resolve));
    input.on('error', () => chain.then(resolve, resolve));
  });

  return { done };
}
