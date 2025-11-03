/* global describe, it */

'use strict';

const assert = require('assert');
const { evaluate } = require('../lib/safe-evaluator');

describe('Safe Evaluator', function () {
  describe('Valid arithmetic evaluation', function () {
    it('should evaluate simple addition', function () {
      assert.strictEqual(evaluate('2 + 3', {}), 5);
    });

    it('should evaluate expressions with variables', function () {
      assert.strictEqual(evaluate('x + y', { x: 10, y: 5 }), 15);
    });

    it('should evaluate complex expressions', function () {
      assert.strictEqual(evaluate('(a + b) * c - d', { a: 2, b: 3, c: 4, d: 1 }), 19);
    });

    it('should handle multiplication and division', function () {
      assert.strictEqual(evaluate('x * y / z', { x: 20, y: 5, z: 4 }), 25);
    });

    it('should handle exponentiation', function () {
      assert.strictEqual(evaluate('x ^ y', { x: 2, y: 3 }), 8);
    });

    it('should handle modulo operator', function () {
      assert.strictEqual(evaluate('x % y', { x: 10, y: 3 }), 1);
    });

    it('should handle negative numbers', function () {
      assert.strictEqual(evaluate('-x + y', { x: 5, y: 10 }), 5);
    });

    it('should evaluate with boolean variables', function () {
      assert.strictEqual(evaluate('x ? y : z', { x: true, y: 10, z: 20 }), 10);
      assert.strictEqual(evaluate('x ? y : z', { x: false, y: 10, z: 20 }), 20);
    });

    it('should evaluate with string variables', function () {
      assert.strictEqual(evaluate('x == "hello"', { x: 'hello' }), true);
    });

    it('should handle null values', function () {
      assert.strictEqual(evaluate('x', { x: null }), null);
    });

    it('should evaluate comparison operators', function () {
      assert.strictEqual(evaluate('x > y', { x: 10, y: 5 }), true);
      assert.strictEqual(evaluate('x < y', { x: 10, y: 5 }), false);
      assert.strictEqual(evaluate('x == y', { x: 5, y: 5 }), true);
      assert.strictEqual(evaluate('x != y', { x: 5, y: 3 }), true);
    });

    it('should evaluate logical operators', function () {
      assert.strictEqual(evaluate('x and y', { x: true, y: true }), true);
      assert.strictEqual(evaluate('x or y', { x: false, y: true }), true);
      assert.strictEqual(evaluate('not x', { x: false }), true);
    });
  });

  describe('Rejection of function calls', function () {
    it('should reject function calls even if function is provided in variables', function () {
      const dangerousFunc = function () { return 'hacked'; };
      assert.throws(
        function () { evaluate('exec("whoami")', { exec: dangerousFunc }); },
        /Variable 'exec' must be a primitive value/
      );
    });

    it('should reject expressions that try to use built-in functions', function () {
      // Built-in functions should not be available
      assert.throws(
        function () { evaluate('sin(x)', { x: 0 }); },
        /Unknown identifier 'sin'/
      );
    });

    it('should reject max function call', function () {
      assert.throws(
        function () { evaluate('max(x, y)', { x: 1, y: 2 }); },
        /Unknown identifier 'max'/
      );
    });

    it('should reject min function call', function () {
      assert.throws(
        function () { evaluate('min(x, y)', { x: 1, y: 2 }); },
        /Unknown identifier 'min'/
      );
    });

    it('should reject sqrt function call', function () {
      assert.throws(
        function () { evaluate('sqrt(x)', { x: 4 }); },
        /Unknown identifier 'sqrt'/
      );
    });

    it('should reject random function call', function () {
      assert.throws(
        function () { evaluate('random()', {}); },
        /Unknown identifier 'random'/
      );
    });

    it('should reject any function variable', function () {
      const testFunc = function (a, b) { return a + b; };
      assert.throws(
        function () { evaluate('x + y', { x: testFunc, y: 5 }); },
        /Variable 'x' must be a primitive value/
      );
    });
  });

  describe('Rejection of non-primitive variable values', function () {
    it('should reject object variables', function () {
      assert.throws(
        function () { evaluate('x + y', { x: 5, y: { value: 10 } }); },
        /Variable 'y' must be a primitive value/
      );
    });

    it('should reject array variables', function () {
      assert.throws(
        function () { evaluate('x + y', { x: 5, y: [1, 2, 3] }); },
        /Variable 'y' must be a primitive value/
      );
    });

    it('should reject Date objects', function () {
      assert.throws(
        function () { evaluate('x + 1', { x: new Date() }); },
        /Variable 'x' must be a primitive value/
      );
    });

    it('should reject RegExp objects', function () {
      assert.throws(
        function () { evaluate('x + 1', { x: /test/ }); },
        /Variable 'x' must be a primitive value/
      );
    });

    it('should allow null (special case of object type)', function () {
      assert.doesNotThrow(function () { evaluate('x + 1', { x: null }); });
    });
  });

  describe('Rejection of unknown identifiers', function () {
    it('should reject expression with undeclared variable', function () {
      assert.throws(
        function () { evaluate('x + z', { x: 5 }); },
        /Unknown identifier 'z'/
      );
    });

    it('should reject expression with multiple undeclared variables', function () {
      assert.throws(
        function () { evaluate('a + b + c', { a: 1 }); },
        /Unknown identifier/
      );
    });

    it('should require all variables to be declared', function () {
      assert.throws(
        function () { evaluate('x * y + z', { x: 2, y: 3 }); },
        /Unknown identifier 'z'/
      );
    });

    it('should not allow using constants without declaration', function () {
      // Constants like E and PI should not be available without explicit declaration
      assert.throws(
        function () { evaluate('PI * r', { r: 5 }); },
        /Unknown identifier 'PI'/
      );
    });
  });

  describe('Input validation', function () {
    it('should require expression to be a string', function () {
      assert.throws(
        function () { evaluate(123, { x: 1 }); },
        /Expression must be a string/
      );
    });

    it('should require variables to be an object', function () {
      assert.throws(
        function () { evaluate('x + 1', null); },
        /Variables must be an object/
      );
    });

    it('should reject arrays as variables parameter', function () {
      assert.throws(
        function () { evaluate('x + 1', [1, 2, 3]); },
        /Variables must be an object/
      );
    });

    it('should handle parse errors gracefully', function () {
      assert.throws(
        function () { evaluate('x +', { x: 1 }); },
        /Failed to parse expression/
      );
    });

    it('should handle invalid expressions', function () {
      assert.throws(
        function () { evaluate('((x + y)', { x: 1, y: 2 }); },
        /Failed to parse expression/
      );
    });
  });

  describe('Edge cases', function () {
    it('should handle empty variables object', function () {
      assert.strictEqual(evaluate('1 + 2', {}), 3);
    });

    it('should handle zero values', function () {
      assert.strictEqual(evaluate('x + y', { x: 0, y: 0 }), 0);
    });

    it('should handle negative values', function () {
      assert.strictEqual(evaluate('x + y', { x: -5, y: 10 }), 5);
    });

    it('should handle floating point numbers', function () {
      assert.strictEqual(evaluate('x + y', { x: 1.5, y: 2.5 }), 4);
    });

    it('should handle large numbers', function () {
      assert.strictEqual(evaluate('x * y', { x: 1000000, y: 1000000 }), 1000000000000);
    });

    it('should preserve boolean true', function () {
      assert.strictEqual(evaluate('x', { x: true }), true);
    });

    it('should preserve boolean false', function () {
      assert.strictEqual(evaluate('x', { x: false }), false);
    });

    it('should handle string concatenation with ||', function () {
      assert.strictEqual(evaluate('x || y', { x: 'hello', y: 'world' }), 'helloworld');
    });
  });
});
