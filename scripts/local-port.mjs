import net from 'node:net';

export async function canListen(port) {
  return new Promise(resolve => {
    const socket = net.createServer();
    socket.once('error', () => resolve(false));
    socket.listen({ host: '127.0.0.1', port, exclusive: true }, () => socket.close(() => resolve(true)));
  });
}

export async function selectPort(preferred, attempts = 20) {
  for (let port = preferred; port <= Math.min(65535, preferred + attempts - 1); port++) {
    if (await canListen(port)) return { port, running: false };
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok && (await response.json()).appId === 'easyreader-local') return { port, running: true };
    } catch { /* Occupied non-HTTP services and other applications are skipped. */ }
  }
  throw new Error('附近端口均不可用，请关闭不需要的服务，或在 .env.local 设置其他 PORT。');
}
