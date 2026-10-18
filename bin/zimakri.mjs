#!/usr/bin/env node
// Runs the TypeScript CLI through tsx so the package works with `npx zimakri init`.
import { register } from 'tsx/esm/api';
register();
const { main } = await import('../src/cli.ts');
process.exitCode = main(process.argv.slice(2));
