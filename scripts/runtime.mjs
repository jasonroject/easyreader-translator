import path from 'node:path';
export function pythonPath(root, platform = process.platform) {
  return path.join(root, '.babeldoc-venv', ...(platform === 'win32' ? ['Scripts', 'python.exe'] : ['bin', 'python']));
}
export function supportedNode(version) {
  const [major, minor] = version.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 19);
}
