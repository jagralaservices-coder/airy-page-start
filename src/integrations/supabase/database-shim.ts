// Temporary permissive Database type shim.
// Used in place of the auto-generated `./types` Database type so the
// project compiles without modifying the database schema, RLS, or
// running migrations.
//
// To restore strict types, regenerate `./types.ts` against your own
// Supabase project and switch `client.ts` back to importing Database
// from `./types`.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
