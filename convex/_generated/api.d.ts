/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as actions_cleanDuplicates from "../actions/cleanDuplicates.js";
import type * as actions_syncProducts from "../actions/syncProducts.js";
import type * as crons_syncProducts from "../crons/syncProducts.js";
import type * as mutations_cart_cartOperations from "../mutations/cart/cartOperations.js";
import type * as mutations_categories from "../mutations/categories.js";
import type * as mutations_cleanDuplicates from "../mutations/cleanDuplicates.js";
import type * as mutations_syncProducts from "../mutations/syncProducts.js";
import type * as mutations_updateCategoryCounters from "../mutations/updateCategoryCounters.js";
import type * as queries_cart from "../queries/cart.js";
import type * as queries_categories from "../queries/categories.js";
import type * as queries_products from "../queries/products.js";
import type * as queries_syncLogs from "../queries/syncLogs.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/cleanDuplicates": typeof actions_cleanDuplicates;
  "actions/syncProducts": typeof actions_syncProducts;
  "crons/syncProducts": typeof crons_syncProducts;
  "mutations/cart/cartOperations": typeof mutations_cart_cartOperations;
  "mutations/categories": typeof mutations_categories;
  "mutations/cleanDuplicates": typeof mutations_cleanDuplicates;
  "mutations/syncProducts": typeof mutations_syncProducts;
  "mutations/updateCategoryCounters": typeof mutations_updateCategoryCounters;
  "queries/cart": typeof queries_cart;
  "queries/categories": typeof queries_categories;
  "queries/products": typeof queries_products;
  "queries/syncLogs": typeof queries_syncLogs;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
