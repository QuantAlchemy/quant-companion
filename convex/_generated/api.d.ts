/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as mcp_auth from "../mcp/auth.js";
import type * as mcp_journal from "../mcp/journal.js";
import type * as mcp_server from "../mcp/server.js";
import type * as mcp_setup from "../mcp/setup.js";
import type * as model_trades from "../model/trades.js";
import type * as trades from "../trades.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "mcp/auth": typeof mcp_auth;
  "mcp/journal": typeof mcp_journal;
  "mcp/server": typeof mcp_server;
  "mcp/setup": typeof mcp_setup;
  "model/trades": typeof model_trades;
  trades: typeof trades;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
