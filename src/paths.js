import path from 'node:path';
// `relative` returns an absolute path when Windows volumes differ.
export function isWithin(root, target, flavor = path) {
  const r = flavor.relative(root, target);
  return r !== '..' && !r.startsWith(`..${flavor.sep}`) && !flavor.isAbsolute(r);
}
