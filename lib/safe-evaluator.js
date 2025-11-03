/**
 * Safe Expression Evaluator
 * 
 * A secure wrapper around expr-eval that prevents code injection and unauthorized function calls.
 * This module removes all built-in functions and validates that only primitive values are used.
 * 
 * @module lib/safe-evaluator
 */

const { Parser } = require('../dist/bundle');

/**
 * Evaluates a mathematical expression with strict security constraints.
 * 
 * Security features:
 * - All built-in functions are removed (sin, cos, exec, etc.)
 * - Variables must be primitive types only (number, boolean, string, null)
 * - All identifiers in the expression must be present in the variables object
 * - Function calls are not allowed
 * 
 * @param {string} expression - The mathematical expression to evaluate (e.g., "x + y * 2")
 * @param {Object} variables - An object containing variable values (must be primitives only)
 * @returns {*} The result of the expression evaluation
 * @throws {Error} If expression is invalid, contains function calls, uses non-primitive variables, or references unknown identifiers
 * 
 * @example
 * // Valid usage
 * evaluate("2 + 3 * x", { x: 5 }); // Returns 17
 * 
 * @example
 * // Valid with multiple variables
 * evaluate("(a + b) / c", { a: 10, b: 5, c: 3 }); // Returns 5
 * 
 * @example
 * // Invalid - function call attempt (throws error)
 * evaluate("exec('whoami')", { exec: () => {} }); // Throws: Function calls are not allowed
 * 
 * @example
 * // Invalid - non-primitive variable (throws error)
 * evaluate("x + y", { x: 5, y: { value: 10 } }); // Throws: Variable 'y' must be a primitive
 * 
 * @example
 * // Invalid - unknown identifier (throws error)
 * evaluate("x + z", { x: 5 }); // Throws: Unknown identifier 'z'
 */
function evaluate(expression, variables) {
  // Validate inputs
  if (typeof expression !== 'string') {
    throw new Error('Expression must be a string');
  }

  if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
    throw new Error('Variables must be an object');
  }

  // Validate that all variable values are primitives
  for (const key in variables) {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      const value = variables[key];
      const type = typeof value;
      
      // Allow only primitive types: number, boolean, string, null (and undefined)
      if (type !== 'number' && type !== 'boolean' && type !== 'string' && value !== null && value !== undefined) {
        throw new Error(`Variable '${key}' must be a primitive value (number, boolean, string, or null). Got: ${type}`);
      }

      // Specifically reject functions
      if (type === 'function') {
        throw new Error(`Variable '${key}' cannot be a function. Function calls are not allowed for security reasons.`);
      }

      // Specifically reject objects (but null is OK since typeof null === 'object')
      if (type === 'object' && value !== null) {
        throw new Error(`Variable '${key}' cannot be an object. Only primitive values are allowed.`);
      }
    }
  }

  // Create a parser instance with all functions removed for security
  const parser = new Parser();
  
  // Remove all built-in functions to prevent any function calls
  parser.functions = {};
  
  // Remove all unary operators (sin, cos, sqrt, etc.) to prevent function-like calls
  parser.unaryOps = {
    '-': parser.unaryOps['-'],
    '+': parser.unaryOps['+'],
    'not': parser.unaryOps['not']
  };
  
  // Remove all constants except those explicitly provided in variables
  parser.consts = {};
  
  // Parse the expression
  let expr;
  try {
    expr = parser.parse(expression);
  } catch (error) {
    throw new Error(`Failed to parse expression: ${error.message}`);
  }

  // Get all symbols (variables and functions) used in the expression
  let symbols;
  try {
    symbols = expr.symbols();
  } catch (error) {
    throw new Error(`Failed to analyze expression: ${error.message}`);
  }

  // Check that all symbols are present in variables
  // If a symbol is used but not in variables, it might be a function call attempt
  for (const symbol of symbols) {
    if (!Object.prototype.hasOwnProperty.call(variables, symbol)) {
      throw new Error(`Unknown identifier '${symbol}' in expression. All identifiers must be provided in variables.`);
    }
  }

  // Evaluate the expression with the validated variables
  let result;
  try {
    result = expr.evaluate(variables);
  } catch (error) {
    throw new Error(`Failed to evaluate expression: ${error.message}`);
  }

  return result;
}

module.exports = {
  evaluate
};
