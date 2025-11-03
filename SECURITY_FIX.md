# Security Fix: Safe Expression Evaluator

## Vulnerability Description

The expr-eval library, while powerful for mathematical expression evaluation, has inherent security risks when used with untrusted input:

### Security Risks

1. **Function Injection**: The library includes many built-in functions (sin, cos, sqrt, random, etc.) that can be called within expressions. Malicious users could potentially:
   - Call functions with unexpected side effects
   - Access system functions if passed in as variables
   - Execute arbitrary code through function references

2. **Prototype Pollution**: Previous versions were vulnerable to prototype pollution attacks through object property access.

3. **Object Method Access**: Expressions can access object properties and methods (e.g., `user.toString()`, `obj.constructor`), which could be exploited to:
   - Access sensitive data
   - Call dangerous methods
   - Break out of the expression sandbox

4. **Unrestricted Variable Types**: The default evaluator accepts any JavaScript value as a variable, including:
   - Functions that could be invoked
   - Objects with methods and getters
   - Complex data structures with security implications

### Example Vulnerable Code

```javascript
const Parser = require('expr-eval').Parser;

// UNSAFE: Allows function calls and object access
function evaluateUserInput(expression, context) {
  return Parser.evaluate(expression, context);
}

// Dangerous scenarios:
evaluateUserInput('exec("rm -rf /")', { exec: require('child_process').exec });
evaluateUserInput('sin(random())', {}); // Unpredictable behavior
evaluateUserInput('user.password', { user: { password: 'secret' } }); // Data leak
```

## The Fix

This security fix introduces a new **safe-evaluator** module that provides a hardened wrapper around expr-eval with the following security measures:

### Security Features

1. **No Built-in Functions**: All parser built-in functions (sin, cos, max, min, random, etc.) are removed, preventing function calls entirely.

2. **No Unary Operators**: Mathematical unary operators (sin, cos, sqrt, etc.) are removed except for basic arithmetic (`+`, `-`, `not`).

3. **No Constants**: Built-in constants (E, PI, true, false) are removed to prevent reliance on implicit values.

4. **Primitive Values Only**: Variables must be primitive JavaScript types:
   - `number`
   - `boolean`
   - `string`
   - `null`
   
   Functions, objects, and arrays are explicitly rejected.

5. **Explicit Variable Declaration**: Every identifier used in an expression must be present in the variables object. Unknown identifiers are rejected.

6. **Clear Error Messages**: All validation failures provide descriptive error messages for debugging.

### Safe Usage Example

```javascript
const { evaluate } = require('./lib/safe-evaluator');

// SAFE: Only arithmetic operations with primitive values
const result = evaluate('(price * quantity) * (1 - discount)', {
  price: 10.50,
  quantity: 3,
  discount: 0.1
});
console.log(result); // 28.35

// SAFE: Boolean logic
const canProceed = evaluate('age >= minAge and hasConsent', {
  age: 25,
  minAge: 18,
  hasConsent: true
});
console.log(canProceed); // true

// BLOCKED: Function calls are rejected
try {
  evaluate('exec("whoami")', { exec: someFunction });
} catch (error) {
  console.error(error.message); // Variable 'exec' must be a primitive value
}

// BLOCKED: Unknown identifiers are rejected
try {
  evaluate('x + unknownVar', { x: 5 });
} catch (error) {
  console.error(error.message); // Unknown identifier 'unknownVar'
}

// BLOCKED: Objects are rejected
try {
  evaluate('user.name', { user: { name: 'John' } });
} catch (error) {
  console.error(error.message); // Variable 'user' must be a primitive value
}
```

## Migration Instructions

### For New Code

Use the safe evaluator for any user-provided expressions:

```javascript
const { evaluate } = require('./lib/safe-evaluator');

function calculateUserFormula(formula, userInputs) {
  try {
    // Validate and sanitize userInputs first
    const safeInputs = {};
    for (const [key, value] of Object.entries(userInputs)) {
      if (typeof value === 'number' || typeof value === 'boolean' || 
          typeof value === 'string' || value === null) {
        safeInputs[key] = value;
      } else {
        throw new Error(`Invalid input type for ${key}`);
      }
    }
    
    return evaluate(formula, safeInputs);
  } catch (error) {
    console.error('Formula evaluation failed:', error.message);
    throw error;
  }
}
```

### For Existing Code

**DO NOT** automatically replace existing expr-eval usage. The safe evaluator is intentionally restrictive and may break existing functionality:

1. **Audit Usage**: Review all places where expr-eval is currently used
2. **Assess Risk**: Determine if the input is from trusted or untrusted sources
3. **Test Thoroughly**: If migrating to safe-evaluator, test all expressions
4. **Consider Alternatives**: For trusted use cases, the original expr-eval may be appropriate

### Migration Checklist

- [ ] Identify all expr-eval usage in your codebase
- [ ] Categorize by input source (trusted vs untrusted)
- [ ] For untrusted input, migrate to safe-evaluator
- [ ] Update expressions to avoid:
  - Built-in functions (sin, cos, max, min, etc.)
  - Built-in constants (PI, E, true, false)
  - Object/array variables
  - Function variables
- [ ] Add comprehensive tests for all migrated expressions
- [ ] Update documentation for users of your API

### When NOT to Use Safe Evaluator

The safe evaluator is **not suitable** for:
- Scientific calculations requiring trigonometric functions
- Expressions needing array/object manipulation
- Use cases requiring random numbers or other built-in functions
- Trusted, internal calculations where flexibility is needed

For these cases, continue using the standard expr-eval Parser with appropriate access controls.

## Testing Locally

### Installation

```bash
npm install
```

### Run All Tests

```bash
npm test
```

This will:
1. Build the distribution bundles
2. Run all existing expr-eval tests (ensures no regression)
3. Run the new safe-evaluator tests

### Run Only Safe Evaluator Tests

```bash
npm run build
npx mocha test/safe-evaluator.test.js
```

### Test Coverage

The safe-evaluator test suite includes:
- ✅ Valid arithmetic operations (+, -, *, /, %, ^)
- ✅ Comparison operators (==, !=, <, >, <=, >=)
- ✅ Logical operators (and, or, not)
- ✅ Conditional expressions (ternary operator)
- ✅ Rejection of function calls (even when provided in variables)
- ✅ Rejection of built-in functions (sin, cos, max, min, etc.)
- ✅ Rejection of non-primitive variables (objects, arrays, functions)
- ✅ Rejection of unknown identifiers
- ✅ Input validation (type checking for expression and variables)
- ✅ Error handling (parse errors, evaluation errors)
- ✅ Edge cases (null, zero, negative numbers, strings, booleans)

### Continuous Integration

The test suite is designed to run in CI/CD pipelines. Ensure your CI configuration includes:

```yaml
# Example for GitHub Actions
- name: Install dependencies
  run: npm install --legacy-peer-deps

- name: Run tests
  run: npm test
```

## Additional Resources

- [expr-eval documentation](https://github.com/silentmatt/expr-eval)
- [OWASP Code Injection](https://owasp.org/www-community/attacks/Code_Injection)
- [Secure Expression Evaluation Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)

## License

This security fix maintains the same MIT license as the original expr-eval library.

## Support

For questions or issues with the safe-evaluator:
1. Review the test cases in `test/safe-evaluator.test.js` for usage examples
2. Check error messages for guidance on fixing validation failures
3. Open an issue if you discover a security vulnerability

**Security Disclosure**: If you discover a security issue, please report it responsibly by opening a private security advisory rather than a public issue.
