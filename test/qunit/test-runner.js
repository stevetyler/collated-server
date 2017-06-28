var testrunner = require('qunit');

// Defaults:
var value = {
    // logging options
    log: {
        assertions: true,
        errors: true,
        tests: true,
        summary: true,
        globalSummary: true,
        coverage: true,
        globalCoverage: true,
        testing: true // log currently testing code file
    },

    coverage: false, // run test coverage tool
    deps: null, // define dependencies, which are required then before code
    namespace: null, // define namespace your code will be attached to on global['your namespace']
    maxBlockDuration: 2000 // max amount of ms child can be blocked, after that we assume running an infinite loop
};

// change any option for all tests globally
testrunner.options.optionName = value;

// or use setup function
testrunner.setup({
    log: {
        summary: true
    }
});

// one code and tests file
testrunner.run({
    code: '/path/to/your/code.js',
    tests: '/path/to/your/tests.js'
}, callback);

// require code into a namespace object, rather than globally
// testrunner.run({
//     code: {path: '/path/to/your/code.js', namespace: 'code'},
//     tests: '/path/to/your/tests.js'
// }, callback);

// one code and multiple tests file
// testrunner.run({
//     code: '/path/to/your/code.js',
//     tests: ['/path/to/your/tests.js', '/path/to/your/tests1.js']
// }, callback);

// array of code and test files
// testrunner.run([
//     {
//         code: '/path/to/your/code.js',
//         tests: '/path/to/your/tests.js'
//     },
//     {
//         code: '/path/to/your/code.js',
//         tests: '/path/to/your/tests.js'
//     }
// ], callback);

// using testrunner callback
testrunner.run({
    code: '/path/to/your/code.js',
    tests: '/path/to/your/tests.js'
}, function(err, report) {
    console.dir(report);
});

// specify dependency
testrunner.run({
    deps: '/path/to/your/dependency.js',
    code: '/path/to/your/code.js',
    tests: '/path/to/your/tests.js'
}, callback);

// dependencies can be modules or files
testrunner.run({
    deps: 'modulename',
    code: '/path/to/your/code.js',
    tests: '/path/to/your/tests.js'
}, callback);

// dependencies can required into a namespace object
testrunner.run({
    deps: {path: 'utilmodule', namespace: 'utils'},
    code: '/path/to/your/code.js',
    tests: '/path/to/your/tests.js'
}, callback);

// specify multiple dependencies
testrunner.run({
    deps: ['/path/to/your/dependency1.js', '/path/to/your/dependency2.js'],
    code: '/path/to/your/code.js',
    tests: '/path/to/your/tests.js'
}, callback);
