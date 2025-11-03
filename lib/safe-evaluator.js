/**
 * Safe Expression Evaluator
 *
 * Provides secure evaluation of mathematical expressions from untrusted sources.
 * This module addresses security vulnerabilities by:
 * - Disallowing all function calls (including built-in functions)
 * - Validating that all variables are primitive values
 * - Requiring all identifiers to be explicitly provided in variables object
 *
 * @module safe-evaluator
 */

'use strict';

var Parser = require('../dist/bundle').Parser;

/**
 * Validates that a value is a primitive type (number, boolean, string, null).
 * Rejects functions and objects to prevent code execution and prototype pollution.
 *
 * @param {*} value - The value to validate
 * @param {string} name - The name of the variable (for error messages)
 * @throws {Error} If the value is not a primitive type
 */
function validatePrimitive(value, name) {
  if (value === null) {
    return; // null is allowed
  }

  var type = typeof value;

  if (type === 'function') {
    throw new Error('Variable "' + name + '" is a function. Only primitive values are allowed.');
  }

  if (type === 'object') {
    throw new Error('Variable "' + name + '" is an object. Only primitive values (number, string, boolean, null) are allowed.');
  }

  // Allow number, string, boolean, undefined
  if (type !== 'number' && type !== 'string' && type !== 'boolean' && type !== 'undefined') {
    throw new Error('Variable "' + name + '" has unsupported type "' + type + '". Only primitive values are allowed.');
  }
}

/**
 * Validates all variables in the provided object.
 *
 * @param {Object} variables - Object containing variable name-value pairs
 * @throws {Error} If any variable is not a primitive type
 */
function validateVariables(variables) {
  // At this point, variables is guaranteed to be an object (checked in evaluate)
  for (var key in variables) {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      validatePrimitive(variables[key], key);
    }
  }
}

/**
 * Checks that all identifiers used in the expression are present in the variables object.
 *
 * @param {Array<string>} identifiers - List of identifiers found in the expression
 * @param {Object} variables - Object containing variable name-value pairs
 * @throws {Error} If any identifier is not present in variables
 */
function validateIdentifiers(identifiers, variables) {
  for (var i = 0; i < identifiers.length; i++) {
    var identifier = identifiers[i];
    if (!Object.prototype.hasOwnProperty.call(variables, identifier)) {
      throw new Error('Unknown identifier "' + identifier + '". All identifiers must be provided in variables.');
    }
  }
}

/**
 * Safely evaluates a mathematical expression with provided variables.
 *
 * This function provides a secure alternative to JavaScript's eval() for
 * mathematical expressions. It prevents code execution by:
 * - Removing all built-in functions from the parser
 * - Validating that variables contain only primitive values
 * - Requiring all identifiers to be explicitly provided
 *
 * @param {string} expression - The mathematical expression to evaluate
 * @param {Object} variables - Object containing variable name-value pairs
 * @returns {*} The result of evaluating the expression
 * @throws {Error} If the expression is invalid, contains function calls,
 *                 uses unknown identifiers, or variables contain non-primitives
 *
 * @example
 * // Basic arithmetic
 * evaluate('2 + 3', {}) // returns 5
 *
 * @example
 * // Using variables
 * evaluate('x * 2 + y', { x: 5, y: 3 }) // returns 13
 *
 * @example
 * // Rejects function calls
 * evaluate('max(1, 2)', {}) // throws Error
 *
 * @example
 * // Rejects unknown identifiers
 * evaluate('x + y', { x: 1 }) // throws Error: Unknown identifier "y"
 *
 * @example
 * // Rejects non-primitive variables
 * evaluate('x', { x: console.log }) // throws Error: Variable "x" is a function
 */
function evaluate(expression, variables) {
  if (typeof expression !== 'string') {
    throw new Error('Expression must be a string');
  }

  // Handle undefined vs explicitly passed null/invalid
  if (variables === undefined) {
    variables = {};
  } else if (variables === null || typeof variables !== 'object') {
    throw new Error('Variables must be an object');
  }

  // Validate all variables are primitives
  validateVariables(variables);

  // Create a new parser with no functions
  var parser = new Parser();

  // Remove all built-in functions to prevent function calls
  parser.functions = {};

  // Also clear unary ops that could be used as function calls
  // Keep only the basic operators that are needed for math
  var allowedUnaryOps = {
    '-': parser.unaryOps['-'],
    '+': parser.unaryOps['+']
  };
  parser.unaryOps = allowedUnaryOps;

  // Parse the expression
  var expr;
  try {
    expr = parser.parse(expression);
  } catch (e) {
    throw new Error('Failed to parse expression: ' + e.message);
  }

  // Get all variables used in the expression
  var identifiers = expr.variables();

  // Validate that all identifiers are present in variables
  validateIdentifiers(identifiers, variables);

  // Evaluate the expression
  try {
    return expr.evaluate(variables);
  } catch (e) {
    throw new Error('Failed to evaluate expression: ' + e.message);
  }
}

module.exports = {
  evaluate: evaluate
};
