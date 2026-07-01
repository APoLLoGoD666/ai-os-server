/**
 * Math utility functions for Apex AI OS
 * Provides foundational arithmetic helpers for use across the system.
 */

/**
 * Adds two numbers and returns their sum.
 *
 * @param {number} a - The first operand
 * @param {number} b - The second operand
 * @returns {number} The sum of a and b
 * @throws {TypeError} If either argument is not a number
 *
 * @example
 * add(2, 3);     // returns 5
 * add(-1, 5);    // returns 4
 * add(0.5, 1.5); // returns 2
 */
function add(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Both arguments must be numbers');
  }

  if (Number.isNaN(a) || Number.isNaN(b)) {
    throw new TypeError('Both arguments must be numbers');
  }

  return a + b;
}

module.exports = { add };