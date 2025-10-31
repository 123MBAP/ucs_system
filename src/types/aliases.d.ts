// Fallback type declarations for path aliases.
// This file is a safety-net for CI environments that don't pick up tsconfig "paths".
// Prefer fixing the tsconfig/CI, but keeping this file is low-risk and quiets TS2307
// errors about modules like '@/Pages/...'.

declare module '@/*' {
  const whatever: any;
  export default whatever;
}

export { };

