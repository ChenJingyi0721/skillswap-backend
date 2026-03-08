/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents_matching from "../agents/matching.js";
import type * as agents_nft from "../agents/nft.js";
import type * as agents_orchestrator from "../agents/orchestrator.js";
import type * as agents_rating from "../agents/rating.js";
import type * as agents_recommendation from "../agents/recommendation.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as contacts from "../contacts.js";
import type * as exchangeThreads from "../exchangeThreads.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as milestones from "../milestones.js";
import type * as posts from "../posts.js";
import type * as progressiveScoring from "../progressiveScoring.js";
import type * as seed from "../seed.js";
import type * as sessions from "../sessions.js";
import type * as skills from "../skills.js";
import type * as socialMedia from "../socialMedia.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "agents/matching": typeof agents_matching;
  "agents/nft": typeof agents_nft;
  "agents/orchestrator": typeof agents_orchestrator;
  "agents/rating": typeof agents_rating;
  "agents/recommendation": typeof agents_recommendation;
  ai: typeof ai;
  auth: typeof auth;
  contacts: typeof contacts;
  exchangeThreads: typeof exchangeThreads;
  http: typeof http;
  messages: typeof messages;
  milestones: typeof milestones;
  posts: typeof posts;
  progressiveScoring: typeof progressiveScoring;
  seed: typeof seed;
  sessions: typeof sessions;
  skills: typeof skills;
  socialMedia: typeof socialMedia;
  users: typeof users;
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
