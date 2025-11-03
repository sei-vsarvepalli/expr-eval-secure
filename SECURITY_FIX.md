# Security Fix: Safe Expression Evaluator

## Vulnerability Overview

The `expr-eval` library (and its forks) provide powerful expression parsing and evaluation capabilities, but when used to evaluate untrusted user input, they can expose several security vulnerabilities:

### 1. **Arbitrary Function Execution**
The parser includes many built-in functions (`max`, `min`, `random`, `map`, `fold`, etc.) and unary operators (`sin`, `cos`, `sqrt`, etc.). If user-controlled expressions are evaluated, attackers can call these functions with arbitrary arguments.

### 2. **Code Execution via Variables**
If an application passes a variables object containing functions to `Parser.evaluate()`, those functions can be called from the expression:
```javascript
// UNSAFE: Allows arbitrary code execution
Parser.evaluate('exec("whoami")', { exec: require('child_process').execSync });
```

### 3. **Prototype Pollution**
Malicious expressions could potentially manipulate object prototypes if objects are allowed in the variables context.

### 4. **Information Disclosure**
Expressions can reference any variable in the provided context. If the context contains sensitive data not meant for expression evaluation, it could be accessed.

## The Fix: Safe Expression Evaluator

The new `lib/safe-evaluator.js` module provides a secure alternative for evaluating mathematical expressions from untrusted sources. It addresses the vulnerabilities through multiple layers of defense:

### Security Features

1. **No Function Calls**: All built-in functions are removed from the parser, preventing function execution.

2. **Primitive Values Only**: Variables are strictly validated to be primitive types (number, string, boolean, null). Functions and objects are rejected.

3. **Explicit Variable Declaration**: All identifiers used in expressions must be explicitly provided in the variables object. Unknown identifiers are rejected.

4. **Safe Operators Only**: Only basic arithmetic and comparison operators are allowed. Potentially dangerous unary operators are removed.

## Usage Instructions

### Basic Example

```javascript
const safeEvaluator = require('./lib/safe-evaluator');

// Safe: Evaluates arithmetic with provided variables
const result = safeEvaluator.evaluate('x * 2 + y', { x: 5, y: 3 });
console.log(result); // 13
```

### Migration from Parser.evaluate()

**Before (UNSAFE for untrusted input):**
```javascript
const Parser = require('expr-eval').Parser;

// UNSAFE: Can execute functions, access any variable
const result = Parser.evaluate(userInput, context);
```

**After (SAFE for untrusted input):**
```javascript
const safeEvaluator = require('./lib/safe-evaluator');

// SAFE: Only allows arithmetic, validates all inputs
const result = safeEvaluator.evaluate(userInput, variables);
```

### What's Allowed

The safe evaluator supports:
- Basic arithmetic: `+`, `-`, `*`, `/`, `%`, `^` (power)
- Comparisons: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Logical operators: `and`, `or`
- Ternary conditional: `x > 5 ? 10 : 20`
- String concatenation: `||`
- Grouping with parentheses: `(x + y) * z`
- Variables (primitive values only)

### What's Blocked

- Function calls: `max(1, 2)`, `min(a, b)`, `random()`
- Unary operator functions: `sin(x)`, `cos(x)`, `sqrt(x)`
- Object or array variables
- Function variables
- Unknown identifiers
- Variable assignment
- Array operations

### Examples

#### ✅ Valid Usage
```javascript
// Arithmetic expressions
safeEvaluator.evaluate('2 + 3', {});  // 5

// With variables
safeEvaluator.evaluate('x * 2 + y', { x: 5, y: 3 });  // 13

// Complex expressions
safeEvaluator.evaluate('(a + b) * c ^ 2', { a: 1, b: 2, c: 3 });  // 27

// Conditionals
safeEvaluator.evaluate('x > 10 ? x : 10', { x: 15 });  // 15

// Comparisons
safeEvaluator.evaluate('price * quantity', { price: 9.99, quantity: 3 });  // 29.97
```

#### ❌ Rejected Usage
```javascript
// Function calls - throws error
safeEvaluator.evaluate('max(1, 2)', {});
// Error: Failed to parse expression

// Functions in variables - throws error
safeEvaluator.evaluate('exec("cmd")', { exec: someFunction });
// Error: Variable "exec" is a function. Only primitive values are allowed.

// Objects in variables - throws error
safeEvaluator.evaluate('user', { user: { name: 'John' } });
// Error: Variable "user" is an object. Only primitive values are allowed.

// Unknown identifiers - throws error
safeEvaluator.evaluate('x + y', { x: 5 });
// Error: Unknown identifier "y". All identifiers must be provided in variables.
```

## Integration Guide

### Step 1: Identify Unsafe Usage

Find all places where you're using `Parser.evaluate()` or `parser.evaluate()` with untrusted input:

```javascript
// Look for patterns like:
Parser.evaluate(userInput, variables);
parser.evaluate(req.body.expression, context);
```

### Step 2: Replace with Safe Evaluator

```javascript
const safeEvaluator = require('./lib/safe-evaluator');

// Replace unsafe calls
const result = safeEvaluator.evaluate(userInput, variables);
```

### Step 3: Prepare Clean Variables

Ensure your variables object contains only the values needed for evaluation:

```javascript
// Before: May contain sensitive data
const context = {
  userInput: req.body.value,
  dbConnection: db,
  session: req.session
};

// After: Only expose needed primitives
const variables = {
  userInput: Number(req.body.value)
};

const result = safeEvaluator.evaluate(expression, variables);
```

### Step 4: Handle Errors

The safe evaluator throws descriptive errors that should be handled:

```javascript
try {
  const result = safeEvaluator.evaluate(userExpression, variables);
  res.json({ result });
} catch (error) {
  // Log for debugging
  console.error('Expression evaluation failed:', error.message);
  
  // Return safe error to user
  res.status(400).json({ 
    error: 'Invalid expression',
    details: error.message 
  });
}
```

## Testing

Run the test suite to verify the safe evaluator:

```bash
npm test
```

The test suite (`test/safe-evaluator.test.js`) includes comprehensive tests for:
- Valid arithmetic operations
- Function call rejection
- Non-primitive variable rejection
- Unknown identifier rejection
- Edge cases and error handling

## Security Considerations

### Defense in Depth

While the safe evaluator provides strong protections, follow these additional best practices:

1. **Input Validation**: Validate and sanitize user input before evaluation
2. **Rate Limiting**: Prevent abuse by limiting expression evaluation frequency
3. **Timeout Protection**: Consider adding execution timeouts for complex expressions
4. **Audit Logging**: Log expression evaluations for security monitoring
5. **Principle of Least Privilege**: Only include necessary variables in the evaluation context

### Limitations

The safe evaluator is designed for **mathematical expressions only**. It is not suitable for:
- General-purpose scripting
- Complex data structure manipulation
- Applications requiring custom functions
- Use cases needing array operations

For these cases, consider alternative solutions:
- Predefined formula library (user selects from approved formulas)
- Domain-specific language with strict parser
- Sandboxed execution environment (e.g., vm2, isolated-vm)

## When to Use Parser.evaluate() (Safely)

The original `Parser.evaluate()` can still be used safely when:
1. The expression comes from a **trusted source** (not user input)
2. You need built-in functions or advanced features
3. The variables context is carefully controlled

Example of safe usage:
```javascript
// SAFE: Expression is hardcoded by developer
const formula = 'price * quantity * (1 + taxRate)';
const result = Parser.evaluate(formula, {
  price: product.price,
  quantity: order.quantity,
  taxRate: 0.08
});
```

## Support

For questions or issues related to the safe evaluator:
1. Review the examples in this document
2. Check the test suite for usage patterns
3. Consult the inline JSDoc documentation in `lib/safe-evaluator.js`

## Version History

- **v1.0.0** (2025-11-03): Initial implementation of safe expression evaluator
  - Added `lib/safe-evaluator.js` module
  - Added comprehensive test suite
  - Added security documentation
