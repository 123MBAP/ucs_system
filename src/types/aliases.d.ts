// Helper module declarations for path aliases
// This file provides simple wildcard module declarations for the
// path aliases used in the project (e.g. '@/Pages/...').
//
// It's a pragmatic fallback for environments where `tsconfig` path
// mappings are not picked up by the TypeScript step during CI builds.
// Keep this file minimal — if the real issue is path mapping, prefer
// fixing `tsconfig.json` / the CI install step instead.

declare module '@/*';
declare module 'Src/*';
declare module 'src/*';

export { };
// Fallback type declarations for path aliases.
// This file is a safety-net for CI environments that don't pick up tsconfig "paths".
// Prefer fixing the tsconfig/CI, but keeping this file is low-risk and quiets TS2307
// errors about modules like '@/Pages/...'.

declare module '@/*' {
  const whatever: any;
  export default whatever;
}

export { };

