/**
 * Shared CSMS application and server configuration.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageMetadata = require("../../package.json");

export const applicationConfig = Object.freeze({
  name: "Community Services Management System",
  version: packageMetadata.version,
  currentSprint: "Final Release - T16",
  technology: "JavaScript with Express.js"
});

export const serverConfig = Object.freeze({
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000)
});
