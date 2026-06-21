/**
 * lib/utils.js
 * General-purpose utility functions for Apex AI OS.
 */

/**
 * Determines whether a given number is prime.
 *
 * A prime number is a natural number greater than 1 that has no positive
 * divisors other than 1 and itself.
 *
 * @param {number} n - The number to test for primality.
 * @returns {boolean} True if n is a prime number, false otherwise.
 *
 * @example
 * isPrime(2);  // true
 * isPrime(4);  // false
 * isPrime(17); // true
 * isPrime(1);  // false
 */
function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  const limit = Math.sqrt(n);
  for (let i = 3; i <= limit; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

module.exports = { isPrime };