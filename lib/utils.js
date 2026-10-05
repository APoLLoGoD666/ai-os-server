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

/**
 * Formats a monetary amount as a locale-specific currency string.
 *
 * Uses the Intl.NumberFormat API with the process default locale to produce
 * a human-readable currency string. The output format depends on the runtime
 * locale (e.g., '$1,234.56' for en-US with currency 'USD').
 *
 * @param {number} amount - The numeric monetary value to format.
 * @param {string} currency - An ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP').
 * @returns {string} The formatted currency string.
 * @throws {TypeError} If amount is not a number.
 * @throws {TypeError} If currency is not a non-empty string.
 *
 * @example
 * formatCurrency(1234.56, 'USD'); // '$1,234.56' (en-US locale)
 * formatCurrency(1000, 'EUR');    // '€1,000.00' (en-US locale)
 * formatCurrency(0, 'GBP');      // '£0.00' (en-US locale)
 */
function formatCurrency(amount, currency) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new TypeError('amount must be a valid number');
  }
  if (typeof currency !== 'string' || currency.trim().length === 0) {
    throw new TypeError('currency must be a non-empty string');
  }
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

module.exports = { isPrime, formatCurrency };