import { execFileSync } from 'node:child_process';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

// Respect an explicit environment proxy, otherwise reuse Windows' HTTP proxy.
let proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (!proxy && process.platform === 'win32') {
  try {
    const value = execFileSync('powershell.exe', ['-NoProfile', '-Command', "$p = Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'; if ($p.ProxyEnable -eq 1) { $p.ProxyServer }"], { windowsHide: true, encoding: 'utf8' }).trim();
    proxy = value.includes('=') ? value.split(';').find(p => p.startsWith('https='))?.slice(6) || value.split(';').find(p => p.startsWith('http='))?.slice(5) : value;
  } catch { /* Direct connection when no system proxy is available. */ }
}
if (proxy) {
  setGlobalDispatcher(new ProxyAgent(proxy.includes('://') ? proxy : `http://${proxy}`));
  console.log('翻译请求已启用本机代理。');
}

export const networkProxy = proxy ? (proxy.includes('://') ? proxy : 'http://' + proxy) : undefined;
