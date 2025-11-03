// Root-level fallback module declarations for path aliases.
// Placed at project root `types/` so CI builds pick them up even when
// project-local includes are ignored or tsc is invoked differently.

declare module '@/*' {
  const whatever: any;
  export default whatever;
}

declare module 'Src/*' {
  const whatever: any;
  export default whatever;
}

declare module 'src/*' {
  const whatever: any;
  export default whatever;
}

export { };
