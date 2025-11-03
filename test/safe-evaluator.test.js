/* global describe, it */

'use strict';

var assert = require('assert');
var safeEvaluator = require('../lib/safe-evaluator');

describe('Safe Evaluator', function () {
  describe('evaluate()', function () {
    it('should evaluate basic arithmetic expressions', function () {
      assert.strictEqual(safeEvaluator.evaluate('2 + 3', {}), 5);
      assert.strictEqual(safeEvaluator.evaluate('10 - 4', {}), 6);
      assert.strictEqual(safeEvaluator.evaluate('3 * 4', {}), 12);
      assert.strictEqual(safeEvaluator.evaluate('20 / 4', {}), 5);
      assert.strictEqual(safeEvaluator.evaluate('10 % 3', {}), 1);
    });

    it('should evaluate expressions with variables', function () {
      assert.strictEqual(safeEvaluator.evaluate('x + y', { x: 5, y: 3 }), 8);
      assert.strictEqual(safeEvaluator.evaluate('x * 2', { x: 7 }), 14);
      assert.strictEqual(safeEvaluator.evaluate('a + b * c', { a: 1, b: 2, c: 3 }), 7);
    });

    it('should evaluate complex arithmetic expressions', function () {
      assert.strictEqual(safeEvaluator.evaluate('(x + y) * z', { x: 2, y: 3, z: 4 }), 20);
      assert.strictEqual(safeEvaluator.evaluate('x * (y + z)', { x: 2, y: 3, z: 4 }), 14);
      assert.strictEqual(safeEvaluator.evaluate('x ^ y', { x: 2, y: 3 }), 8);
    });

    it('should handle negative numbers', function () {
      assert.strictEqual(safeEvaluator.evaluate('-5 + 3', {}), -2);
      assert.strictEqual(safeEvaluator.evaluate('x + (-y)', { x: 10, y: 3 }), 7);
      assert.strictEqual(safeEvaluator.evaluate('-x * y', { x: 5, y: 2 }), -10);
    });

    it('should handle string variables', function () {
      // Note: expr-eval supports string concatenation with ||
      assert.strictEqual(safeEvaluator.evaluate('x || y', { x: 'hello', y: 'world' }), 'helloworld');
    });

    it('should handle boolean variables', function () {
      assert.strictEqual(safeEvaluator.evaluate('x and y', { x: true, y: true }), true);
      assert.strictEqual(safeEvaluator.evaluate('x and y', { x: true, y: false }), false);
      assert.strictEqual(safeEvaluator.evaluate('x or y', { x: false, y: true }), true);
    });

    it('should handle null variables', function () {
      // null is allowed as a primitive value
      assert.strictEqual(safeEvaluator.evaluate('x', { x: null }), null);
    });

    it('should handle comparison operators', function () {
      assert.strictEqual(safeEvaluator.evaluate('x > y', { x: 5, y: 3 }), true);
      assert.strictEqual(safeEvaluator.evaluate('x < y', { x: 5, y: 3 }), false);
      assert.strictEqual(safeEvaluator.evaluate('x == y', { x: 5, y: 5 }), true);
      assert.strictEqual(safeEvaluator.evaluate('x != y', { x: 5, y: 3 }), true);
      assert.strictEqual(safeEvaluator.evaluate('x >= y', { x: 5, y: 5 }), true);
      assert.strictEqual(safeEvaluator.evaluate('x <= y', { x: 3, y: 5 }), true);
    });

    it('should handle ternary conditional operator', function () {
      assert.strictEqual(safeEvaluator.evaluate('x > 5 ? 10 : 20', { x: 7 }), 10);
      assert.strictEqual(safeEvaluator.evaluate('x > 5 ? 10 : 20', { x: 3 }), 20);
    });

    it('should reject function calls (built-in functions removed)', function () {
      // These should fail because all functions are removed
      // They're caught as unknown identifiers since functions are removed from parser
      assert.throws(function () {
        safeEvaluator.evaluate('max(1, 2)', {});
      }, /Unknown identifier "max"/);

      assert.throws(function () {
        safeEvaluator.evaluate('min(5, 3)', {});
      }, /Unknown identifier "min"/);

      assert.throws(function () {
        safeEvaluator.evaluate('random()', {});
      }, /Unknown identifier "random"/);
    });

    it('should reject function calls even if provided in variables', function () {
      // Even if someone tries to pass a function in variables, it should be rejected
      assert.throws(function () {
        safeEvaluator.evaluate('exec', { exec: function () { return 'hacked'; } });
      }, /Variable "exec" is a function/);

      assert.throws(function () {
        safeEvaluator.evaluate('x', { x: console.log });
      }, /Variable "x" is a function/);
    });

    it('should reject unary operator functions like sin, cos, sqrt', function () {
      // Unary operators that act like functions should be removed
      // They're caught as unknown identifiers
      assert.throws(function () {
        safeEvaluator.evaluate('sin(x)', { x: 0 });
      }, /Unknown identifier "sin"/);

      assert.throws(function () {
        safeEvaluator.evaluate('cos(x)', { x: 0 });
      }, /Unknown identifier "cos"/);

      assert.throws(function () {
        safeEvaluator.evaluate('sqrt(x)', { x: 4 });
      }, /Unknown identifier "sqrt"/);
    });

    it('should reject object variables', function () {
      assert.throws(function () {
        safeEvaluator.evaluate('x', { x: { key: 'value' } });
      }, /Variable "x" is an object/);

      assert.throws(function () {
        safeEvaluator.evaluate('x + y', { x: 5, y: {} });
      }, /Variable "y" is an object/);
    });

    it('should reject array variables (arrays are objects)', function () {
      assert.throws(function () {
        safeEvaluator.evaluate('x', { x: [1, 2, 3] });
      }, /Variable "x" is an object/);
    });

    it('should reject unknown identifiers', function () {
      assert.throws(function () {
        safeEvaluator.evaluate('x + y', { x: 5 });
      }, /Unknown identifier "y"/);

      assert.throws(function () {
        safeEvaluator.evaluate('a + b + c', { a: 1, b: 2 });
      }, /Unknown identifier "c"/);

      assert.throws(function () {
        safeEvaluator.evaluate('unknownVar', {});
      }, /Unknown identifier "unknownVar"/);
    });

    it('should require all identifiers in expression to be in variables', function () {
      assert.throws(function () {
        safeEvaluator.evaluate('x * y * z', { x: 1, y: 2 });
      }, /Unknown identifier "z"/);
    });

    it('should throw error for non-string expressions', function () {
      assert.throws(function () {
        safeEvaluator.evaluate(123, {});
      }, /Expression must be a string/);

      assert.throws(function () {
        safeEvaluator.evaluate(null, {});
      }, /Expression must be a string/);
    });

    it('should throw error for invalid expressions', function () {
      assert.throws(function () {
        safeEvaluator.evaluate('2 +', {});
      }, /Failed to parse expression/);

      assert.throws(function () {
        safeEvaluator.evaluate('2 + + +', {});
      }, /Failed to parse expression/);
    });

    it('should handle empty expression', function () {
      // Empty expression might throw or return undefined depending on parser
      assert.throws(function () {
        safeEvaluator.evaluate('', {});
      }, /Failed to parse expression/);
    });

    it('should work with no variables for constant expressions', function () {
      assert.strictEqual(safeEvaluator.evaluate('2 + 2', {}), 4);
      assert.strictEqual(safeEvaluator.evaluate('10 * 5', {}), 50);
    });

    it('should handle undefined variables parameter', function () {
      // Should default to empty object
      assert.strictEqual(safeEvaluator.evaluate('5 + 5'), 10);
    });

    it('should throw error for malformed variables object', function () {
      assert.throws(function () {
        safeEvaluator.evaluate('x', 'not an object');
      }, /Variables must be an object/);

      assert.throws(function () {
        safeEvaluator.evaluate('x', null);
      }, /Variables must be an object/);
    });

    it('should prevent prototype pollution attempts', function () {
      // Objects (including attempts at prototype pollution) should be rejected
      assert.throws(function () {
        safeEvaluator.evaluate('x', { x: Object.prototype });
      }, /Variable "x" is an object/);

      // The expr-eval parser itself protects against __proto__ access
      assert.throws(function () {
        safeEvaluator.evaluate('__proto__', { __proto__: {} });
      }, /prototype access detected/);
    });

    it('should handle large numbers', function () {
      assert.strictEqual(safeEvaluator.evaluate('x + y', { x: 1e10, y: 1e10 }), 2e10);
    });

    it('should handle decimal numbers', function () {
      assert.strictEqual(safeEvaluator.evaluate('x + y', { x: 0.1, y: 0.2 }), 0.30000000000000004); // Standard JS float precision
    });

    it('should handle mixed types in comparisons', function () {
      assert.strictEqual(safeEvaluator.evaluate('x == "5"', { x: 5 }), false); // expr-eval uses strict equality
    });
  });
});
