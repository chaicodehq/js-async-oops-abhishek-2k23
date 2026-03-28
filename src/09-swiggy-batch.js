/**
 * 🍔 Swiggy Batch Delivery System - Promise.all, Promise.race, Promise.allSettled
 *
 * Swiggy ka batch delivery system banana hai jahan multiple orders ek saath
 * handle hote hain. Promise.all se sab orders ek saath process karo,
 * Promise.race se pehla ready order pakdo, aur Promise.allSettled se
 * mixed results handle karo. Har ek ka apna use case hai!
 *
 * Function: prepareOrder(item, prepTime)
 *   - Returns a new Promise
 *   - Resolves after prepTime milliseconds with:
 *     { item, ready: true, prepTime }
 *   - If item is empty/null/undefined: reject with Error "Item name required!"
 *   - If prepTime <= 0 or not a number: reject with Error "Invalid prep time!"
 *   - Use setTimeout for the delay
 *
 * Function: prepareBatch(items)
 *   - Takes array of { name, prepTime } objects
 *   - Uses Promise.all to prepare ALL items simultaneously
 *   - Calls prepareOrder(item.name, item.prepTime) for each
 *   - Returns Promise resolving with array of prepared items
 *   - If ANY single item fails, the ENTIRE batch fails (Promise.all behavior)
 *   - If items array is empty, resolve with empty array
 *
 * Function: getFirstReady(items)
 *   - Takes array of { name, prepTime } objects
 *   - Uses Promise.race to get the FIRST item that's ready
 *   - Returns Promise resolving/rejecting with the first settled Promise
 *   - If items array is empty, reject with Error "No items to prepare!"
 *
 * Function: prepareSafeBatch(items)
 *   - Takes array of { name, prepTime } objects
 *   - Uses Promise.allSettled to handle ALL outcomes
 *   - Returns Promise resolving with array of results:
 *     Each: { status: "fulfilled", value: preparedItem }
 *     Or:   { status: "rejected", reason: errorMessage }
 *   - Never rejects — always resolves with full results array
 *   - If items array is empty, resolve with empty array
 *
 * Function: deliverWithTimeout(orderPromise, timeoutMs)
 *   - Takes a Promise (orderPromise) and timeout in milliseconds
 *   - Uses Promise.race between orderPromise and a timeout
 *   - If orderPromise resolves first: returns the result
 *   - If timeout fires first: rejects with Error "Delivery timeout!"
 *   - timeoutMs must be > 0, otherwise reject with Error "Invalid timeout!"
 *
 * Function: batchWithRetry(items, maxRetries)
 *   - Tries prepareBatch(items)
 *   - If it fails, retries up to maxRetries times
 *   - Returns result of first successful attempt
 *   - If all attempts fail, throws the last error
 *   - maxRetries must be >= 0 (0 means no retries, just one attempt)
 *   - Each retry is a fresh call to prepareBatch
 *
 * Rules:
 *   - Use Promise.all for prepareBatch (all-or-nothing)
 *   - Use Promise.race for getFirstReady and deliverWithTimeout
 *   - Use Promise.allSettled for prepareSafeBatch (never fails)
 *   - prepareOrder must use actual setTimeout for delays
 *   - batchWithRetry uses sequential retry logic
 *   - Empty arrays should be handled gracefully
 *
 * @example
 *   const item = await prepareOrder("Biryani", 200);
 *   // => { item: "Biryani", ready: true, prepTime: 200 }
 *
 * @example
 *   const batch = await prepareBatch([
 *     { name: "Dosa", prepTime: 100 },
 *     { name: "Idli", prepTime: 50 }
 *   ]);
 *   // => [{ item: "Dosa", ready: true, prepTime: 100 },
 *   //     { item: "Idli", ready: true, prepTime: 50 }]
 *
 * @example
 *   const first = await getFirstReady([
 *     { name: "Dosa", prepTime: 200 },
 *     { name: "Maggi", prepTime: 50 }
 *   ]);
 *   // => { item: "Maggi", ready: true, prepTime: 50 }  (pehle ready hua!)
 *
 * @example
 *   const results = await prepareSafeBatch([
 *     { name: "Pizza", prepTime: 100 },
 *     { name: "", prepTime: 50 }  // invalid item
 *   ]);
 *   // => [{ status: "fulfilled", value: {...} },
 *   //     { status: "rejected", reason: "Item name required!" }]
 */
export function prepareOrder(item, prepTime) {
  return new Promise((res, rej) => {
    if (!item || typeof item !== "string" || !item.trim()) {
      rej(new Error("Item name required!"))
    }

    if (typeof prepTime !== "number" || prepTime <= 0) {
      rej(new Error("Invalid prep time!"))
    }

    setTimeout(() => {
      res({ item, ready: true, prepTime })
    }, prepTime)
  })
}

export function prepareBatch(items) {
  if (items.length === 0) return Promise.resolve([])
  const promises = items.map((item) => prepareOrder(item.name, item.prepTime))

  return Promise.all(promises)
}

export function getFirstReady(items) {
  if (items.length === 0) return Promise.reject(new Error("No items to prepare!"))
  const promises = items.map((item) => prepareOrder(item.name, item.prepTime))

  return Promise.race(promises)
}

export function prepareSafeBatch(items) {
  if (items.length === 0) return Promise.resolve([])
  const promises = items.map((item) => prepareOrder(item.name, item.prepTime))
  return Promise.allSettled(promises).then((result) => {
    return result.map((res) => ({
      [res.status === "fulfilled" ? "value" : "reason"]:
        res.status === "fulfilled" ? res.value : res.reason.message,
        
      status: res.status,
    }))
  })
}

export function deliverWithTimeout(orderPromise, timeoutMs) {
  if(timeoutMs <= 0) return Promise.reject(new Error("Invalid timeout!"));
  return Promise.race([
    orderPromise,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error("Delivery timeout!")), timeoutMs),
    ),
  ])
}

export async function batchWithRetry(items, maxRetries) {
  if (maxRetries < 0) {
    throw new Error("Invalid retries!");
  }
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const result = await prepareBatch(items);
      return result;
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }
    }
  }
}
