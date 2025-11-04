'use strict';
var assert = require('assert');
var Parser = require('../dist/bundle').Parser;
var fs = require('fs');
var child_process = require('child_process');

// 1. Setup the Dangerous Context
var context = {
    write: (path, data) => fs.writeFileSync(path, data),
    exec: (cmd) => console.log('Executing:', cmd)
};

// --- Test Case 1: Direct Call to a Dangerous Global/Context Function ---
it('should fail on direct function call to an unallowed function', function () {
    var parser = new Parser();

    // The evaluator should throw an error because 'write' is not an allowed function
    assert.throws(() => {
        parser.evaluate('write("pwned.txt","Hello!")', context);
    }, Error);
});

// --- Test Case 2: Function Definition (IFUNDEF) should still be safe ---
it('should allow IFUNDEF but keep function calls safe', function () {
    // Enable IFUNDEF
    var parserWithFndef = new Parser({
        operators: { fndef: true }
    });
    
    // Expression: define an expression-internal function 'g' and call it.
    // 'g' itself is safe because it only uses safe operators.
    var safeExpr = '(f(x) = x * x)(5)';

    assert.equal(parserWithFndef.evaluate(safeExpr), 25, 
    		 'Should correctly evaluate an expression with an allowed IFUNDEF.');

    // Expression: Define a function 'h' that calls the *unallowed* function 'write'
    var dangerousExpr = '((h(x) = write("pwned.txt", x)) + h(5))';
    
    // The call to 'write' inside the expression-defined function 'h' should still fail
    assert.throws(() => {
        parserWithFndef.evaluate(dangerousExpr, context);
    }, Error);
});

// --- Test Case 3: Variable Assignment to a Dangerous Function ---
it('should fail when a variable is assigned a dangerous function', function () {
    var parser = new Parser();
    
    // The variable 'evil' points to the 'exec' function from the context
    var dangerousContext = { ...context, evil: context.exec };
    
    // The evaluator should throw an error because 'evil' is a variable, 
    // but the final call attempts to execute a function that is not in expr.functions.
    assert.throws(() => {
        parser.evaluate('evil("ls -lh /")', dangerousContext);
    }, Error);
});

it('PoC provided by researcher VU#263614 deny child exec process', function() { 
    var parser = new Parser();
    var context = {
	exec: child_process.execSync
    };
    assert.throws(() => {
	parser.evaluate('exec("whoami")', context);
    }, Error);
});
