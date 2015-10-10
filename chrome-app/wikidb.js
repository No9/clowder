require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":32}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
    return fromTypedArray(that, object)
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = String(string)

  if (string.length === 0) return 0

  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      return string.length
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return string.length * 2
    case 'hex':
      return string.length >>> 1
    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(string).length
    case 'base64':
      return base64ToBytes(string).length
    default:
      return string.length
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

},{"base64-js":4,"ieee754":5,"is-array":6}],4:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],5:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],6:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],7:[function(require,module,exports){
module.exports={
  "O_RDONLY": 0,
  "O_WRONLY": 1,
  "O_RDWR": 2,
  "S_IFMT": 61440,
  "S_IFREG": 32768,
  "S_IFDIR": 16384,
  "S_IFCHR": 8192,
  "S_IFBLK": 24576,
  "S_IFIFO": 4096,
  "S_IFLNK": 40960,
  "S_IFSOCK": 49152,
  "O_CREAT": 512,
  "O_EXCL": 2048,
  "O_NOCTTY": 131072,
  "O_TRUNC": 1024,
  "O_APPEND": 8,
  "O_DIRECTORY": 1048576,
  "O_NOFOLLOW": 256,
  "O_SYNC": 128,
  "O_SYMLINK": 2097152,
  "S_IRWXU": 448,
  "S_IRUSR": 256,
  "S_IWUSR": 128,
  "S_IXUSR": 64,
  "S_IRWXG": 56,
  "S_IRGRP": 32,
  "S_IWGRP": 16,
  "S_IXGRP": 8,
  "S_IRWXO": 7,
  "S_IROTH": 4,
  "S_IWOTH": 2,
  "S_IXOTH": 1,
  "E2BIG": 7,
  "EACCES": 13,
  "EADDRINUSE": 48,
  "EADDRNOTAVAIL": 49,
  "EAFNOSUPPORT": 47,
  "EAGAIN": 35,
  "EALREADY": 37,
  "EBADF": 9,
  "EBADMSG": 94,
  "EBUSY": 16,
  "ECANCELED": 89,
  "ECHILD": 10,
  "ECONNABORTED": 53,
  "ECONNREFUSED": 61,
  "ECONNRESET": 54,
  "EDEADLK": 11,
  "EDESTADDRREQ": 39,
  "EDOM": 33,
  "EDQUOT": 69,
  "EEXIST": 17,
  "EFAULT": 14,
  "EFBIG": 27,
  "EHOSTUNREACH": 65,
  "EIDRM": 90,
  "EILSEQ": 92,
  "EINPROGRESS": 36,
  "EINTR": 4,
  "EINVAL": 22,
  "EIO": 5,
  "EISCONN": 56,
  "EISDIR": 21,
  "ELOOP": 62,
  "EMFILE": 24,
  "EMLINK": 31,
  "EMSGSIZE": 40,
  "EMULTIHOP": 95,
  "ENAMETOOLONG": 63,
  "ENETDOWN": 50,
  "ENETRESET": 52,
  "ENETUNREACH": 51,
  "ENFILE": 23,
  "ENOBUFS": 55,
  "ENODATA": 96,
  "ENODEV": 19,
  "ENOENT": 2,
  "ENOEXEC": 8,
  "ENOLCK": 77,
  "ENOLINK": 97,
  "ENOMEM": 12,
  "ENOMSG": 91,
  "ENOPROTOOPT": 42,
  "ENOSPC": 28,
  "ENOSR": 98,
  "ENOSTR": 99,
  "ENOSYS": 78,
  "ENOTCONN": 57,
  "ENOTDIR": 20,
  "ENOTEMPTY": 66,
  "ENOTSOCK": 38,
  "ENOTSUP": 45,
  "ENOTTY": 25,
  "ENXIO": 6,
  "EOPNOTSUPP": 102,
  "EOVERFLOW": 84,
  "EPERM": 1,
  "EPIPE": 32,
  "EPROTO": 100,
  "EPROTONOSUPPORT": 43,
  "EPROTOTYPE": 41,
  "ERANGE": 34,
  "EROFS": 30,
  "ESPIPE": 29,
  "ESRCH": 3,
  "ESTALE": 70,
  "ETIME": 101,
  "ETIMEDOUT": 60,
  "ETXTBSY": 26,
  "EWOULDBLOCK": 35,
  "EXDEV": 18,
  "SIGHUP": 1,
  "SIGINT": 2,
  "SIGQUIT": 3,
  "SIGILL": 4,
  "SIGTRAP": 5,
  "SIGABRT": 6,
  "SIGIOT": 6,
  "SIGBUS": 10,
  "SIGFPE": 8,
  "SIGKILL": 9,
  "SIGUSR1": 30,
  "SIGSEGV": 11,
  "SIGUSR2": 31,
  "SIGPIPE": 13,
  "SIGALRM": 14,
  "SIGTERM": 15,
  "SIGCHLD": 20,
  "SIGCONT": 19,
  "SIGSTOP": 17,
  "SIGTSTP": 18,
  "SIGTTIN": 21,
  "SIGTTOU": 22,
  "SIGURG": 16,
  "SIGXCPU": 24,
  "SIGXFSZ": 25,
  "SIGVTALRM": 26,
  "SIGPROF": 27,
  "SIGWINCH": 28,
  "SIGIO": 23,
  "SIGSYS": 12,
  "SSL_OP_ALL": 2147486719,
  "SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION": 262144,
  "SSL_OP_CIPHER_SERVER_PREFERENCE": 4194304,
  "SSL_OP_CISCO_ANYCONNECT": 32768,
  "SSL_OP_COOKIE_EXCHANGE": 8192,
  "SSL_OP_CRYPTOPRO_TLSEXT_BUG": 2147483648,
  "SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS": 2048,
  "SSL_OP_EPHEMERAL_RSA": 2097152,
  "SSL_OP_LEGACY_SERVER_CONNECT": 4,
  "SSL_OP_MICROSOFT_BIG_SSLV3_BUFFER": 32,
  "SSL_OP_MICROSOFT_SESS_ID_BUG": 1,
  "SSL_OP_MSIE_SSLV2_RSA_PADDING": 64,
  "SSL_OP_NETSCAPE_CA_DN_BUG": 536870912,
  "SSL_OP_NETSCAPE_CHALLENGE_BUG": 2,
  "SSL_OP_NETSCAPE_DEMO_CIPHER_CHANGE_BUG": 1073741824,
  "SSL_OP_NETSCAPE_REUSE_CIPHER_CHANGE_BUG": 8,
  "SSL_OP_NO_COMPRESSION": 131072,
  "SSL_OP_NO_QUERY_MTU": 4096,
  "SSL_OP_NO_SESSION_RESUMPTION_ON_RENEGOTIATION": 65536,
  "SSL_OP_NO_SSLv2": 16777216,
  "SSL_OP_NO_SSLv3": 33554432,
  "SSL_OP_NO_TICKET": 16384,
  "SSL_OP_NO_TLSv1": 67108864,
  "SSL_OP_NO_TLSv1_1": 268435456,
  "SSL_OP_NO_TLSv1_2": 134217728,
  "SSL_OP_PKCS1_CHECK_1": 0,
  "SSL_OP_PKCS1_CHECK_2": 0,
  "SSL_OP_SINGLE_DH_USE": 1048576,
  "SSL_OP_SINGLE_ECDH_USE": 524288,
  "SSL_OP_SSLEAY_080_CLIENT_DH_BUG": 128,
  "SSL_OP_SSLREF2_REUSE_CERT_TYPE_BUG": 16,
  "SSL_OP_TLS_BLOCK_PADDING_BUG": 512,
  "SSL_OP_TLS_D5_BUG": 256,
  "SSL_OP_TLS_ROLLBACK_BUG": 8388608,
  "NPN_ENABLED": 1
}

},{}],8:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],10:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],11:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],12:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.3.2 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.3.2',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],13:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],14:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],15:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":13,"./encode":14}],16:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":17}],17:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require('_process'))
},{"./_stream_readable":19,"./_stream_writable":21,"_process":11,"core-util-is":22,"inherits":9}],18:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":20,"core-util-is":22,"inherits":9}],19:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;


/*<replacement>*/
var debug = require('util');
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/


util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (util.isString(chunk) && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (util.isNullOrUndefined(chunk)) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || util.isNull(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (!util.isNumber(n) || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (util.isNull(ret)) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (!util.isNull(ret))
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      process.nextTick(function() {
        emitReadable_(stream);
      });
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        var self = this;
        process.nextTick(function() {
          debug('readable nexttick read 0');
          self.read(0);
        });
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    if (!state.reading) {
      debug('resume read 0');
      this.read(0);
    }
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(function() {
      resume_(stream, state);
    });
  }
}

function resume_(stream, state) {
  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (util.isFunction(stream[i]) && util.isUndefined(this[i])) {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"./_stream_duplex":17,"_process":11,"buffer":3,"core-util-is":22,"events":8,"inherits":9,"isarray":10,"stream":27,"string_decoder/":28,"util":2}],20:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (!util.isNullOrUndefined(data))
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('prefinish', function() {
    if (util.isFunction(this._flush))
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (!util.isNull(ts.writechunk) && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":17,"core-util-is":22,"inherits":9}],21:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = options.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!util.isBuffer(chunk) &&
      !util.isString(chunk) &&
      !util.isNullOrUndefined(chunk) &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (util.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (!util.isFunction(cb))
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.buffer.length)
      clearBuffer(this, state);
  }
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      util.isString(chunk)) {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (util.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, false, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      state.pendingcb--;
      cb(er);
    });
  else {
    state.pendingcb--;
    cb(er);
  }

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.buffer.length) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  if (stream._writev && state.buffer.length > 1) {
    // Fast case, write everything using _writev()
    var cbs = [];
    for (var c = 0; c < state.buffer.length; c++)
      cbs.push(state.buffer[c].callback);

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    doWrite(stream, state, true, state.length, state.buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
    state.buffer = [];
  } else {
    // Slow case, write chunks one-by-one
    for (var c = 0; c < state.buffer.length; c++) {
      var entry = state.buffer[c];
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);

      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        c++;
        break;
      }
    }

    if (c < state.buffer.length)
      state.buffer = state.buffer.slice(c);
    else
      state.buffer.length = 0;
  }

  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));

};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (util.isFunction(chunk)) {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (util.isFunction(encoding)) {
    cb = encoding;
    encoding = null;
  }

  if (!util.isNullOrUndefined(chunk))
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else
      prefinish(stream, state);
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":17,"_process":11,"buffer":3,"core-util-is":22,"inherits":9,"stream":27}],22:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":3}],23:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":18}],24:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = require('stream');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":17,"./lib/_stream_passthrough.js":18,"./lib/_stream_readable.js":19,"./lib/_stream_transform.js":20,"./lib/_stream_writable.js":21,"stream":27}],25:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":20}],26:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":21}],27:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":8,"inherits":9,"readable-stream/duplex.js":16,"readable-stream/passthrough.js":23,"readable-stream/readable.js":24,"readable-stream/transform.js":25,"readable-stream/writable.js":26}],28:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":3}],29:[function(require,module,exports){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
},{"process/browser.js":11}],30:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":12,"querystring":15}],31:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],32:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":31,"_process":11,"inherits":9}],33:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
var util = require('util')

module.exports = ChromeBus
util.inherits(ChromeBus, EventEmitter)

var emit = EventEmitter.prototype.emit
var on = EventEmitter.prototype.on

function ChromeBus (opts) {
  if (!(this instanceof ChromeBus)) return new ChromeBus(opts)
  if (!opts) opts = {}

  var self = this
  EventEmitter.call(this)
  if (typeof opts === 'string') opts = { key: opts }
  if (opts.tagName === 'WEBVIEW') {
    this._key = 'chrome-bus'
    this.source = opts.contentWindow
    window.addEventListener('message', function (ev) {
      var value = JSON.parse(ev.data)
      if (Array.isArray(value)) emit.apply(self, value)
    })
  } else if (window.location.href.indexOf('#fragment') > -1) {
    this._key = 'chrome-bus'
    window.addEventListener('message', function (ev) {
      if (!self.source) {
        self.source = ev.source
      }
      var value = JSON.parse(ev.data)
      if (Array.isArray(value)) emit.apply(self, value)
    }, false)
  } else {
    this._key = opts.key || 'chrome-bus'
    chrome.runtime.onMessage.addListener(function (ev) { // eslint-disable-line
        var value = JSON.parse(ev) // } catch (err) { return }
        if (Array.isArray(value)) emit.apply(self, value)
    })
  }
}

ChromeBus.prototype.on = function (name, f) {
  on.apply(this, arguments)
}

ChromeBus.prototype.emit = function (name) {
  emit.apply(this, arguments)
  var args = [].slice.call(arguments)
  if (this.source) {
    this.source.postMessage([JSON.stringify(args)], '*')
  } else {
    if (window.location.href.indexOf('#fragment') > -1) {
      console.warn('This is a webview and the host page has not evented to it yet so the channel is not set up')
      return
    }
    chrome.runtime.sendMessage([JSON.stringify(args)]) // eslint-disable-line  
  }
  return this
}

},{"events":8,"util":32}],34:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":36}],35:[function(require,module,exports){
(function(root) {
  var localStorageMemory = {};
  var cache = {};

  /**
   * number of stored items.
   */
  localStorageMemory.length = 0;

  /**
   * returns item for passed key, or null
   *
   * @para {String} key
   *       name of item to be returned
   * @returns {String|null}
   */
  localStorageMemory.getItem = function(key) {
    return cache[key] || null;
  };

  /**
   * sets item for key to passed value, as String
   *
   * @para {String} key
   *       name of item to be set
   * @para {String} value
   *       value, will always be turned into a String
   * @returns {undefined}
   */
  localStorageMemory.setItem = function(key, value) {
    if (typeof value === 'undefined') {
      localStorageMemory.removeItem(key);
    } else {
      cache[key] = '' + value;
      localStorageMemory.length++;
    }
  };

  /**
   * removes item for passed key
   *
   * @para {String} key
   *       name of item to be removed
   * @returns {undefined}
   */
  localStorageMemory.removeItem = function(key) {
    delete cache[key];
    localStorageMemory.length--;
  };

  /**
   * returns name of key at passed index
   *
   * @para {Number} index
   *       Position for key to be returned (starts at 0)
   * @returns {String|null}
   */
  localStorageMemory.key = function(index) {
    return Object.keys(cache)[index] || null;
  };

  /**
   * removes all stored items and sets length to 0
   *
   * @returns {undefined}
   */
  localStorageMemory.clear = function() {
    cache = {};
    localStorageMemory.length = 0;
  };

  if (typeof exports === 'object') {
    module.exports = localStorageMemory;
  } else {
    root.localStorageMemory = localStorageMemory;
  }
})(this);



},{}],36:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],37:[function(require,module,exports){
(function (Buffer){
/*!
 * depd
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 */

module.exports = bufferConcat

/**
 * Concatenate an array of Buffers.
 */

function bufferConcat(bufs) {
  var length = 0

  for (var i = 0, len = bufs.length; i < len; i++) {
    length += bufs[i].length
  }

  var buf = new Buffer(length)
  var pos = 0

  for (var i = 0, len = bufs.length; i < len; i++) {
    bufs[i].copy(buf, pos)
    pos += bufs[i].length
  }

  return buf
}

}).call(this,require("buffer").Buffer)
},{"buffer":3}],38:[function(require,module,exports){
/*!
 * depd
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 */

module.exports = callSiteToString

/**
 * Format a CallSite file location to a string.
 */

function callSiteFileLocation(callSite) {
  var fileName
  var fileLocation = ''

  if (callSite.isNative()) {
    fileLocation = 'native'
  } else if (callSite.isEval()) {
    fileName = callSite.getScriptNameOrSourceURL()
    if (!fileName) {
      fileLocation = callSite.getEvalOrigin()
    }
  } else {
    fileName = callSite.getFileName()
  }

  if (fileName) {
    fileLocation += fileName

    var lineNumber = callSite.getLineNumber()
    if (lineNumber != null) {
      fileLocation += ':' + lineNumber

      var columnNumber = callSite.getColumnNumber()
      if (columnNumber) {
        fileLocation += ':' + columnNumber
      }
    }
  }

  return fileLocation || 'unknown source'
}

/**
 * Format a CallSite to a string.
 */

function callSiteToString(callSite) {
  var addSuffix = true
  var fileLocation = callSiteFileLocation(callSite)
  var functionName = callSite.getFunctionName()
  var isConstructor = callSite.isConstructor()
  var isMethodCall = !(callSite.isToplevel() || isConstructor)
  var line = ''

  if (isMethodCall) {
    var methodName = callSite.getMethodName()
    var typeName = getConstructorName(callSite)

    if (functionName) {
      if (typeName && functionName.indexOf(typeName) !== 0) {
        line += typeName + '.'
      }

      line += functionName

      if (methodName && functionName.lastIndexOf('.' + methodName) !== functionName.length - methodName.length - 1) {
        line += ' [as ' + methodName + ']'
      }
    } else {
      line += typeName + '.' + (methodName || '<anonymous>')
    }
  } else if (isConstructor) {
    line += 'new ' + (functionName || '<anonymous>')
  } else if (functionName) {
    line += functionName
  } else {
    addSuffix = false
    line += fileLocation
  }

  if (addSuffix) {
    line += ' (' + fileLocation + ')'
  }

  return line
}

/**
 * Get constructor name of reviver.
 */

function getConstructorName(obj) {
  var receiver = obj.receiver
  return (receiver.constructor && receiver.constructor.name) || null
}

},{}],39:[function(require,module,exports){
(function (Buffer){
/*!
 * depd
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 */

lazyProperty(module.exports, 'bufferConcat', function bufferConcat() {
  return Buffer.concat || require('./buffer-concat')
})

lazyProperty(module.exports, 'callSiteToString', function callSiteToString() {
  var limit = Error.stackTraceLimit
  var obj = {}
  var prep = Error.prepareStackTrace

  function prepareObjectStackTrace(obj, stack) {
    return stack
  }

  Error.prepareStackTrace = prepareObjectStackTrace
  Error.stackTraceLimit = 2

  // capture the stack
  Error.captureStackTrace(obj)

  // slice the stack
  var stack = obj.stack.slice()

  Error.prepareStackTrace = prep
  Error.stackTraceLimit = limit

  return stack[0].toString ? toString : require('./callsite-tostring')
})

/**
 * Define a lazy property.
 */

function lazyProperty(obj, prop, getter) {
  function get() {
    var val = getter()

    Object.defineProperty(obj, prop, {
      configurable: true,
      enumerable: true,
      value: val
    })

    return val
  }

  Object.defineProperty(obj, prop, {
    configurable: true,
    enumerable: true,
    get: get
  })
}

/**
 * Call toString() on the obj
 */

function toString(obj) {
  return obj.toString()
}

}).call(this,require("buffer").Buffer)
},{"./buffer-concat":37,"./callsite-tostring":38,"buffer":3}],40:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],41:[function(require,module,exports){
var dezalgo = require('dezalgo')

module.exports = function (tasks, cb) {
  var current = 0
  var results = []
  if (cb) cb = dezalgo(cb)

  function done (err, result) {
    results.push(result)
    if (++current >= tasks.length || err) {
      if (cb) cb(err, results)
    } else {
      tasks[current](done)
    }
  }

  if (tasks.length) {
    tasks[0](done)
  } else {
    if (cb) cb(null, results)
  }
}

},{"dezalgo":42}],42:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(dezalgo)

var asap = require('asap')

function dezalgo (cb) {
  var sync = true
  asap(function () {
    sync = false
  })

  return function zalgoSafe() {
    var args = arguments
    var me = this
    if (sync)
      asap(function() {
        cb.apply(me, args)
      })
    else
      cb.apply(me, args)
  }
}

},{"asap":43,"wrappy":45}],43:[function(require,module,exports){
"use strict";

// rawAsap provides everything we need except exception management.
var rawAsap = require("./raw");
// RawTasks are recycled to reduce GC churn.
var freeTasks = [];
// We queue errors to ensure they are thrown in right order (FIFO).
// Array-as-queue is good enough here, since we are just dealing with exceptions.
var pendingErrors = [];
var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);

function throwFirstError() {
    if (pendingErrors.length) {
        throw pendingErrors.shift();
    }
}

/**
 * Calls a task as soon as possible after returning, in its own event, with priority
 * over other events like animation, reflow, and repaint. An error thrown from an
 * event will not interrupt, nor even substantially slow down the processing of
 * other events, but will be rather postponed to a lower priority event.
 * @param {{call}} task A callable object, typically a function that takes no
 * arguments.
 */
module.exports = asap;
function asap(task) {
    var rawTask;
    if (freeTasks.length) {
        rawTask = freeTasks.pop();
    } else {
        rawTask = new RawTask();
    }
    rawTask.task = task;
    rawAsap(rawTask);
}

// We wrap tasks with recyclable task objects.  A task object implements
// `call`, just like a function.
function RawTask() {
    this.task = null;
}

// The sole purpose of wrapping the task is to catch the exception and recycle
// the task object after its single use.
RawTask.prototype.call = function () {
    try {
        this.task.call();
    } catch (error) {
        if (asap.onerror) {
            // This hook exists purely for testing purposes.
            // Its name will be periodically randomized to break any code that
            // depends on its existence.
            asap.onerror(error);
        } else {
            // In a web browser, exceptions are not fatal. However, to avoid
            // slowing down the queue of pending tasks, we rethrow the error in a
            // lower priority turn.
            pendingErrors.push(error);
            requestErrorThrow();
        }
    } finally {
        this.task = null;
        freeTasks[freeTasks.length] = this;
    }
};

},{"./raw":44}],44:[function(require,module,exports){
(function (global){
"use strict";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including IO, animation, reflow, and redraw
// events in browsers.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Equivalent to push, but avoids a function call.
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// `requestFlush` is an implementation-specific method that attempts to kick
// off a `flush` event as quickly as possible. `flush` will attempt to exhaust
// the event queue before yielding to the browser's own event loop.
var requestFlush;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory exhaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

// `requestFlush` is implemented using a strategy based on data collected from
// every available SauceLabs Selenium web driver worker at time of writing.
// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
// have WebKitMutationObserver but not un-prefixed MutationObserver.
// Must use `global` instead of `window` to work in both frames and web
// workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.
var BrowserMutationObserver = global.MutationObserver || global.WebKitMutationObserver;

// MutationObservers are desirable because they have high priority and work
// reliably everywhere they are implemented.
// They are implemented in all modern browsers.
//
// - Android 4-4.3
// - Chrome 26-34
// - Firefox 14-29
// - Internet Explorer 11
// - iPad Safari 6-7.1
// - iPhone Safari 7-7.1
// - Safari 6-7
if (typeof BrowserMutationObserver === "function") {
    requestFlush = makeRequestCallFromMutationObserver(flush);

// MessageChannels are desirable because they give direct access to the HTML
// task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
// 11-12, and in web workers in many engines.
// Although message channels yield to any queued rendering and IO tasks, they
// would be better than imposing the 4ms delay of timers.
// However, they do not work reliably in Internet Explorer or Safari.

// Internet Explorer 10 is the only browser that has setImmediate but does
// not have MutationObservers.
// Although setImmediate yields to the browser's renderer, it would be
// preferrable to falling back to setTimeout since it does not have
// the minimum 4ms penalty.
// Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
// Desktop to a lesser extent) that renders both setImmediate and
// MessageChannel useless for the purposes of ASAP.
// https://github.com/kriskowal/q/issues/396

// Timers are implemented universally.
// We fall back to timers in workers in most engines, and in foreground
// contexts in the following browsers.
// However, note that even this simple case requires nuances to operate in a
// broad spectrum of browsers.
//
// - Firefox 3-13
// - Internet Explorer 6-9
// - iPad Safari 4.3
// - Lynx 2.8.7
} else {
    requestFlush = makeRequestCallFromTimer(flush);
}

// `requestFlush` requests that the high priority event queue be flushed as
// soon as possible.
// This is useful to prevent an error thrown in a task from stalling the event
// queue if the exception handled by Node.js’s
// `process.on("uncaughtException")` or by a domain.
rawAsap.requestFlush = requestFlush;

// To request a high priority event, we induce a mutation observer by toggling
// the text of a text node between "1" and "-1".
function makeRequestCallFromMutationObserver(callback) {
    var toggle = 1;
    var observer = new BrowserMutationObserver(callback);
    var node = document.createTextNode("");
    observer.observe(node, {characterData: true});
    return function requestCall() {
        toggle = -toggle;
        node.data = toggle;
    };
}

// The message channel technique was discovered by Malte Ubl and was the
// original foundation for this library.
// http://www.nonblocking.io/2011/06/windownexttick.html

// Safari 6.0.5 (at least) intermittently fails to create message ports on a
// page's first load. Thankfully, this version of Safari supports
// MutationObservers, so we don't need to fall back in that case.

// function makeRequestCallFromMessageChannel(callback) {
//     var channel = new MessageChannel();
//     channel.port1.onmessage = callback;
//     return function requestCall() {
//         channel.port2.postMessage(0);
//     };
// }

// For reasons explained above, we are also unable to use `setImmediate`
// under any circumstances.
// Even if we were, there is another bug in Internet Explorer 10.
// It is not sufficient to assign `setImmediate` to `requestFlush` because
// `setImmediate` must be called *by name* and therefore must be wrapped in a
// closure.
// Never forget.

// function makeRequestCallFromSetImmediate(callback) {
//     return function requestCall() {
//         setImmediate(callback);
//     };
// }

// Safari 6.0 has a problem where timers will get lost while the user is
// scrolling. This problem does not impact ASAP because Safari 6.0 supports
// mutation observers, so that implementation is used instead.
// However, if we ever elect to use timers in Safari, the prevalent work-around
// is to add a scroll event listener that calls for a flush.

// `setTimeout` does not call the passed callback if the delay is less than
// approximately 7 in web workers in Firefox 8 through 18, and sometimes not
// even then.

function makeRequestCallFromTimer(callback) {
    return function requestCall() {
        // We dispatch a timeout with a specified delay of 0 for engines that
        // can reliably accommodate that request. This will usually be snapped
        // to a 4 milisecond delay, but once we're flushing, there's no delay
        // between events.
        var timeoutHandle = setTimeout(handleTimer, 0);
        // However, since this timer gets frequently dropped in Firefox
        // workers, we enlist an interval handle that will try to fire
        // an event 20 times per second until it succeeds.
        var intervalHandle = setInterval(handleTimer, 50);

        function handleTimer() {
            // Whichever timer succeeds will cancel both timers and
            // execute the callback.
            clearTimeout(timeoutHandle);
            clearInterval(intervalHandle);
            callback();
        }
    };
}

// This is for `asap.js` only.
// Its name will be periodically randomized to break any code that depends on
// its existence.
rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

// ASAP was originally a nextTick shim included in Q. This was factored out
// into this ASAP package. It was later adapted to RSVP which made further
// amendments. These decisions, particularly to marginalize MessageChannel and
// to capture the MutationObserver implementation in a closure, were integrated
// back into ASAP proper.
// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],45:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],46:[function(require,module,exports){
var ClientRequest = require('./lib/request')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Split opts.host into its components
	var hostHostname = opts.host ? opts.host.split(':')[0] : null
	var hostPort = opts.host ? parseInt(opts.host.split(':')[1], 10) : null

	opts.method = opts.method || 'GET'
	opts.headers = opts.headers || {}
	opts.path = opts.path || '/'
	opts.protocol = opts.protocol || window.location.protocol
	// If the hostname is provided, use the default port for the protocol. If
	// the url is instead relative, use window.location.port
	var defaultPort = (opts.hostname || hostHostname) ? (opts.protocol === 'https:' ? 443 : 80) : window.location.port
	opts.hostname = opts.hostname || hostHostname || window.location.hostname
	opts.port = opts.port || hostPort || defaultPort

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.STATUS_CODES = statusCodes

http.METHODS = [
	'GET',
	'POST',
	'PUT',
	'DELETE' // TODO: include the methods from RFC 2616 and 2518?
]
},{"./lib/request":48,"builtin-status-codes":50,"url":30,"xtend":56}],47:[function(require,module,exports){
exports.fetch = isFunction(window.fetch) && isFunction(window.ReadableByteStream)

exports.blobConstructor = false
try {
	new Blob([new ArrayBuffer(1)])
	exports.blobConstructor = true
} catch (e) {}

var xhr = new window.XMLHttpRequest()
xhr.open('GET', '/')

function checkTypeSupport (type) {
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

var haveArrayBuffer = isFunction(window.ArrayBuffer)
var haveSlice = haveArrayBuffer && isFunction(window.ArrayBuffer.prototype.slice)

exports.arraybuffer = haveArrayBuffer && checkTypeSupport('arraybuffer')
exports.msstream = haveSlice && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = haveArrayBuffer && checkTypeSupport('moz-chunked-arraybuffer')
exports.overrideMimeType = isFunction(xhr.overrideMimeType)
exports.vbArray = isFunction(window.VBArray)

function isFunction (value) {
  return typeof value === 'function'
}

xhr = null // Help gc
},{}],48:[function(require,module,exports){
(function (process,Buffer){
var capability = require('./capability')
var foreach = require('foreach')
var indexOf = require('indexof')
var inherits = require('inherits')
var keys = require('object-keys')
var response = require('./response')
var stream = require('stream')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary) {
	if (capability.fetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else if (capability.vbArray && preferBinary) {
		return 'text:vbarray'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._url = opts.protocol + '//' + opts.hostname + ':' + opts.port + opts.path
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
	foreach(keys(opts.headers), function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility isn't
		preferBinary = false
	} else if (opts.mode === 'prefer-fast') {
		// If binary is preferred for speed
		preferBinary = true
	} else if (!opts.mode || opts.mode === 'default') {
		// By default, use binary if text streaming may corrupt data
		preferBinary = !capability.overrideMimeType
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary)

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (indexOf(unsafeHeaders, lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var self = this
	return self._headers[name.toLowerCase()].value
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	var headersObj = self._headers
	var body
	if (opts.method === 'POST' || opts.method === 'PUT') {
		if (capability.blobConstructor) {
			body = new window.Blob(self._body.map(function (buffer) {
				return buffer.toArrayBuffer()
			}), {
				type: (headersObj['content-type'] || {}).value || ''
			})
		} else {
			// get utf8 string
			body = Buffer.concat(self._body).toString()
		}
	}

	if (self._mode === 'fetch') {
		var headers = keys(headersObj).map(function (name) {
			return [headersObj[name].name, headersObj[name].value]
		})

		window.fetch(self._url, {
			method: self._opts.method,
			headers: headers,
			body: body,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin'
		}).then(function (response) {
			self._fetchResponse = response
			self._connect()
		}).then(undefined, function (reason) {
			self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new window.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode.split(':')[0]

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		foreach(keys(headersObj), function (name) {
			xhr.setRequestHeader(headersObj[name].name, headersObj[name].value)
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable. Even though the spec says it should
 * be available in readyState 3, accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		return (xhr.status !== null)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
	var self = this
	self._destroyed = true
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	// Currently, there isn't a way to truly abort a fetch.
	// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	if (data)
		stream.Writable.push.call(self, data, encoding)

	stream.Writable.prototype.end.call(self, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'user-agent',
	'via'
]

}).call(this,require('_process'),require("buffer").Buffer)
},{"./capability":47,"./response":49,"_process":11,"buffer":3,"foreach":51,"indexof":52,"inherits":53,"object-keys":54,"stream":27}],49:[function(require,module,exports){
(function (process,Buffer){
var capability = require('./capability')
var foreach = require('foreach')
var inherits = require('inherits')
var stream = require('stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.statusCode = response.status
		self.statusMessage = response.statusText
		// backwards compatible version of for (<item> of <iterable>):
		// for (var <item>,_i,_it = <iterable>[Symbol.iterator](); <item> = (_i = _it.next()).value,!_i.done;)
		for (var header, _i, _it = response.headers[Symbol.iterator](); header = (_i = _it.next()).value, !_i.done;) {
			self.headers[header[0].toLowerCase()] = header[1]
			self.rawHeaders.push(header[0], header[1])
		}

		// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				if (result.done) {
					self.push(null)
					return
				}
				self.push(new Buffer(result.value))
				read()
			})
		}
		read()

	} else {
		self._xhr = xhr
		self._pos = 0

		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		foreach(headers, function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (self.headers[key] !== undefined)
					self.headers[key] += ', ' + matches[2]
				else
					self.headers[key] = matches[2]
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRProgress = function () {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text:vbarray': // For IE9
			if (xhr.readyState !== rStates.DONE)
				break
			try {
				// This fails in IE8
				response = new window.VBArray(xhr.responseBody).toArray()
			} catch (e) {}
			if (response !== null) {
				self.push(new Buffer(response))
				break
			}
			// Falls through in IE8	
		case 'text':
			try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
				response = xhr.responseText
			} catch (e) {
				self._mode = 'text:vbarray'
				break
			}
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = new Buffer(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE)
				break
			response = xhr.response
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new window.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		self.push(null)
	}
}

}).call(this,require('_process'),require("buffer").Buffer)
},{"./capability":47,"_process":11,"buffer":3,"foreach":51,"inherits":53,"stream":27}],50:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Moved Temporarily",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Time-out",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Request Entity Too Large",
  "414": "Request-URI Too Large",
  "415": "Unsupported Media Type",
  "416": "Requested Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Time-out",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],51:[function(require,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],52:[function(require,module,exports){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
},{}],53:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],54:[function(require,module,exports){
'use strict';

// modified from https://github.com/es-shims/es5-shim
var has = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var slice = Array.prototype.slice;
var isArgs = require('./isArguments');
var hasDontEnumBug = !({ 'toString': null }).propertyIsEnumerable('toString');
var hasProtoEnumBug = function () {}.propertyIsEnumerable('prototype');
var dontEnums = [
	'toString',
	'toLocaleString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'constructor'
];

var keysShim = function keys(object) {
	var isObject = object !== null && typeof object === 'object';
	var isFunction = toStr.call(object) === '[object Function]';
	var isArguments = isArgs(object);
	var isString = isObject && toStr.call(object) === '[object String]';
	var theKeys = [];

	if (!isObject && !isFunction && !isArguments) {
		throw new TypeError('Object.keys called on a non-object');
	}

	var skipProto = hasProtoEnumBug && isFunction;
	if (isString && object.length > 0 && !has.call(object, 0)) {
		for (var i = 0; i < object.length; ++i) {
			theKeys.push(String(i));
		}
	}

	if (isArguments && object.length > 0) {
		for (var j = 0; j < object.length; ++j) {
			theKeys.push(String(j));
		}
	} else {
		for (var name in object) {
			if (!(skipProto && name === 'prototype') && has.call(object, name)) {
				theKeys.push(String(name));
			}
		}
	}

	if (hasDontEnumBug) {
		var ctor = object.constructor;
		var skipConstructor = ctor && ctor.prototype === object;

		for (var k = 0; k < dontEnums.length; ++k) {
			if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
				theKeys.push(dontEnums[k]);
			}
		}
	}
	return theKeys;
};

keysShim.shim = function shimObjectKeys() {
	if (!Object.keys) {
		Object.keys = keysShim;
	} else {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			return (Object.keys(arguments) || '').length === 2;
		}(1, 2));
		if (!keysWorksWithArguments) {
			var originalKeys = Object.keys;
			Object.keys = function keys(object) {
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				} else {
					return originalKeys(object);
				}
			};
		}
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./isArguments":55}],55:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],56:[function(require,module,exports){
module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],57:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],58:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],59:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var debug = util.debuglog('http');

// New Agent code.

// The largest departure from the previous implementation is that
// an Agent instance holds connections for a variable number of host:ports.
// Surprisingly, this is still API compatible as far as third parties are
// concerned. The only code that really notices the difference is the
// request object.

// Another departure is that all code related to HTTP parsing is in
// ClientRequest.onSocket(). The Agent is now *strictly*
// concerned with managing a connection pool.

function Agent(options) {
  if (!(this instanceof Agent))
    return new Agent(options);

  EventEmitter.call(this);

  var self = this;

  self.defaultPort = 80;
  self.protocol = 'http:';

  self.options = util._extend({}, options);

  // don't confuse net and make it think that we're connecting to a pipe
  self.options.path = null;
  self.requests = {};
  self.sockets = {};
  self.freeSockets = {};
  self.keepAliveMsecs = self.options.keepAliveMsecs || 1000;
  self.keepAlive = self.options.keepAlive || false;
  self.maxSockets = self.options.maxSockets || Agent.defaultMaxSockets;
  self.maxFreeSockets = self.options.maxFreeSockets || 256;

  self.on('free', function(socket, options) {
    var name = self.getName(options);
    debug('agent.on(free)', name);

    if (!socket.destroyed &&
        self.requests[name] && self.requests[name].length) {
      self.requests[name].shift().onSocket(socket);
      if (self.requests[name].length === 0) {
        // don't leak
        delete self.requests[name];
      }
    } else {
      // If there are no pending requests, then put it in
      // the freeSockets pool, but only if we're allowed to do so.
      var req = socket._httpMessage;
      if (req &&
          req.shouldKeepAlive &&
          !socket.destroyed &&
          self.options.keepAlive) {
        var freeSockets = self.freeSockets[name];
        var freeLen = freeSockets ? freeSockets.length : 0;
        var count = freeLen;
        if (self.sockets[name])
          count += self.sockets[name].length;

        if (count >= self.maxSockets || freeLen >= self.maxFreeSockets) {
          self.removeSocket(socket, options);
          socket.destroy();
        } else {
          freeSockets = freeSockets || [];
          self.freeSockets[name] = freeSockets;
          socket.setKeepAlive(true, self.keepAliveMsecs);
          socket.unref();
          socket._httpMessage = null;
          self.removeSocket(socket, options);
          freeSockets.push(socket);
        }
      } else {
        self.removeSocket(socket, options);
        socket.destroy();
      }
    }
  });
}

util.inherits(Agent, EventEmitter);
exports.Agent = Agent;

Agent.defaultMaxSockets = Infinity;

Agent.prototype.createConnection = net.createConnection;

// Get the key for a given set of request options
Agent.prototype.getName = function(options) {
  var name = '';

  if (options.host)
    name += options.host;
  else
    name += 'localhost';

  name += ':';
  if (options.port)
    name += options.port;
  name += ':';
  if (options.localAddress)
    name += options.localAddress;
  name += ':';
  return name;
};

Agent.prototype.addRequest = function(req, options) {
  // Legacy API: addRequest(req, host, port, path)
  if (typeof options === 'string') {
    options = {
      host: options,
      port: arguments[2],
      path: arguments[3]
    };
  }

  var name = this.getName(options);
  if (!this.sockets[name]) {
    this.sockets[name] = [];
  }

  var freeLen = this.freeSockets[name] ? this.freeSockets[name].length : 0;
  var sockLen = freeLen + this.sockets[name].length;

  if (freeLen) {
    // we have a free socket, so use that.
    var socket = this.freeSockets[name].shift();
    debug('have free socket');

    // don't leak
    if (!this.freeSockets[name].length)
      delete this.freeSockets[name];

    socket.ref();
    req.onSocket(socket);
    this.sockets[name].push(socket);
  } else if (sockLen < this.maxSockets) {
    debug('call onSocket', sockLen, freeLen);
    // If we are under maxSockets create a new one.
    req.onSocket(this.createSocket(req, options));
  } else {
    debug('wait for socket');
    // We are over limit so we'll add it to the queue.
    if (!this.requests[name]) {
      this.requests[name] = [];
    }
    this.requests[name].push(req);
  }
};

Agent.prototype.createSocket = function(req, options) {
  var self = this;
  options = util._extend({}, options);
  options = util._extend(options, self.options);

  options.servername = options.host;
  if (req) {
    var hostHeader = req.getHeader('host');
    if (hostHeader) {
      options.servername = hostHeader.replace(/:.*$/, '');
    }
  }

  var name = self.getName(options);

  debug('createConnection', name, options);
  options.encoding = null;
  var s = self.createConnection(options);
  if (!self.sockets[name]) {
    self.sockets[name] = [];
  }
  this.sockets[name].push(s);
  debug('sockets', name, this.sockets[name].length);

  function onFree() {
    self.emit('free', s, options);
  }
  s.on('free', onFree);

  function onClose(err) {
    debug('CLIENT socket onClose');
    // This is the only place where sockets get removed from the Agent.
    // If you want to remove a socket from the pool, just close it.
    // All socket errors end in a close event anyway.
    self.removeSocket(s, options);
  }
  s.on('close', onClose);

  function onRemove() {
    // We need this function for cases like HTTP 'upgrade'
    // (defined by WebSockets) where we need to remove a socket from the
    // pool because it'll be locked up indefinitely
    debug('CLIENT socket onRemove');
    self.removeSocket(s, options);
    s.removeListener('close', onClose);
    s.removeListener('free', onFree);
    s.removeListener('agentRemove', onRemove);
  }
  s.on('agentRemove', onRemove);
  return s;
};

Agent.prototype.removeSocket = function(s, options) {
  var name = this.getName(options);
  debug('removeSocket', name, 'destroyed:', s.destroyed);
  var sets = [this.sockets];

  // If the socket was destroyed, remove it from the free buffers too.
  if (s.destroyed)
    sets.push(this.freeSockets);

  for (var sk = 0; sk < sets.length; sk++) {
    var sockets = sets[sk];

    if (sockets[name]) {
      var index = sockets[name].indexOf(s);
      if (index !== -1) {
        sockets[name].splice(index, 1);
        // Don't leak
        if (sockets[name].length === 0)
          delete sockets[name];
      }
    }
  }

  if (this.requests[name] && this.requests[name].length) {
    debug('removeSocket, have a request, make a socket');
    var req = this.requests[name][0];
    // If we have pending requests and a socket gets closed make a new one
    this.createSocket(req, options).emit('free');
  }
};

Agent.prototype.destroy = function() {
  var sets = [this.freeSockets, this.sockets];
  for (var s = 0; s < sets.length; s++) {
    var set = sets[s];
    var keys = Object.keys(set);
    for (var v = 0; v < keys.length; v++) {
      var setName = set[keys[v]];
      for (var n = 0; n < setName.length; n++) {
        setName[n].destroy();
      }
    }
  }
};

exports.globalAgent = new Agent();

},{"events":8,"net":"net","util":32}],60:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');
var net = require('net');
var url = require('url');
var EventEmitter = require('events').EventEmitter;
var HTTPParser = require('http-parser-js').HTTPParser;
var assert = require('assert').ok;
var Buffer = require('buffer').Buffer;

var common = require('./_http_common');

var httpSocketSetup = common.httpSocketSetup;
var parsers = common.parsers;
var freeParser = common.freeParser;
var debug = common.debug;

var OutgoingMessage = require('./_http_outgoing').OutgoingMessage;

var Agent = require('./_http_agent');


function ClientRequest(options, cb) {
  var self = this;
  OutgoingMessage.call(self);

  if (util.isString(options)) {
    options = url.parse(options);
  } else {
    options = util._extend({}, options);
  }

  var agent = options.agent;
  var defaultAgent = options._defaultAgent || Agent.globalAgent;
  if (agent === false) {
    agent = new defaultAgent.constructor();
  } else if (util.isNullOrUndefined(agent) && !options.createConnection) {
    agent = defaultAgent;
  }
  self.agent = agent;

  var protocol = options.protocol || defaultAgent.protocol;
  var expectedProtocol = defaultAgent.protocol;
  if (self.agent && self.agent.protocol)
    expectedProtocol = self.agent.protocol;

  if (options.path && / /.test(options.path)) {
    // The actual regex is more like /[^A-Za-z0-9\-._~!$&'()*+,;=/:@]/
    // with an additional rule for ignoring percentage-escaped characters
    // but that's a) hard to capture in a regular expression that performs
    // well, and b) possibly too restrictive for real-world usage. That's
    // why it only scans for spaces because those are guaranteed to create
    // an invalid request.
    throw new TypeError('Request path contains unescaped characters.');
  } else if (protocol !== expectedProtocol) {
    throw new Error('Protocol "' + protocol + '" not supported. ' +
                    'Expected "' + expectedProtocol + '".');
  }

  var defaultPort = options.defaultPort || self.agent && self.agent.defaultPort;

  var port = options.port = options.port || defaultPort || 80;
  var host = options.host = options.hostname || options.host || 'localhost';

  if (util.isUndefined(options.setHost)) {
    var setHost = true;
  }

  self.socketPath = options.socketPath;

  var method = self.method = (options.method || 'GET').toUpperCase();
  self.path = options.path || '/';
  if (cb) {
    self.once('response', cb);
  }

  if (!util.isArray(options.headers)) {
    if (options.headers) {
      var keys = Object.keys(options.headers);
      for (var i = 0, l = keys.length; i < l; i++) {
        var key = keys[i];
        self.setHeader(key, options.headers[key]);
      }
    }
    if (host && !this.getHeader('host') && setHost) {
      var hostHeader = host;
      if (port && +port !== defaultPort) {
        hostHeader += ':' + port;
      }
      this.setHeader('Host', hostHeader);
    }
  }

  if (options.auth && !this.getHeader('Authorization')) {
    //basic auth
    this.setHeader('Authorization', 'Basic ' +
                   new Buffer(options.auth).toString('base64'));
  }

  if (method === 'GET' ||
      method === 'HEAD' ||
      method === 'DELETE' ||
      method === 'OPTIONS' ||
      method === 'CONNECT') {
    self.useChunkedEncodingByDefault = false;
  } else {
    self.useChunkedEncodingByDefault = true;
  }

  if (util.isArray(options.headers)) {
    self._storeHeader(self.method + ' ' + self.path + ' HTTP/1.1\r\n',
                      options.headers);
  } else if (self.getHeader('expect')) {
    self._storeHeader(self.method + ' ' + self.path + ' HTTP/1.1\r\n',
                      self._renderHeaders());
  }

  if (self.socketPath) {
    self._last = true;
    self.shouldKeepAlive = false;
    var conn = self.agent.createConnection({ path: self.socketPath });
    self.onSocket(conn);
  } else if (self.agent) {
    // If there is an agent we should default to Connection:keep-alive,
    // but only if the Agent will actually reuse the connection!
    // If it's not a keepAlive agent, and the maxSockets==Infinity, then
    // there's never a case where this socket will actually be reused
    if (!self.agent.keepAlive && !Number.isFinite(self.agent.maxSockets)) {
      self._last = true;
      self.shouldKeepAlive = false;
    } else {
      self._last = false;
      self.shouldKeepAlive = true;
    }
    self.agent.addRequest(self, options);
  } else {
    // No agent, default to Connection:close.
    self._last = true;
    self.shouldKeepAlive = false;
    if (options.createConnection) {
      var conn = options.createConnection(options);
    } else {
      debug('CLIENT use net.createConnection', options);
      var conn = net.createConnection(options);
    }
    self.onSocket(conn);
  }

  self._deferToConnect(null, null, function() {
    self._flush();
    self = null;
  });
}

util.inherits(ClientRequest, OutgoingMessage);

exports.ClientRequest = ClientRequest;

ClientRequest.prototype.aborted = undefined;

ClientRequest.prototype._finish = function() {
  // DTRACE_HTTP_CLIENT_REQUEST(this, this.connection);
  // COUNTER_HTTP_CLIENT_REQUEST();
  OutgoingMessage.prototype._finish.call(this);
};

ClientRequest.prototype._implicitHeader = function() {
  this._storeHeader(this.method + ' ' + this.path + ' HTTP/1.1\r\n',
                    this._renderHeaders());
};

ClientRequest.prototype.abort = function() {
  // Mark as aborting so we can avoid sending queued request data
  // This is used as a truthy flag elsewhere. The use of Date.now is for
  // debugging purposes only.
  this.aborted = Date.now();

  // If we're aborting, we don't care about any more response data.
  if (this.res)
    this.res._dump();
  else
    this.once('response', function(res) {
      res._dump();
    });

  // In the event that we don't have a socket, we will pop out of
  // the request queue through handling in onSocket.
  if (this.socket) {
    // in-progress
    this.socket.destroy();
  }
};


function createHangUpError() {
  var error = new Error('socket hang up');
  error.code = 'ECONNRESET';
  return error;
}


function socketCloseListener() {
  var socket = this;
  var req = socket._httpMessage;
  debug('HTTP socket close');

  // Pull through final chunk, if anything is buffered.
  // the ondata function will handle it properly, and this
  // is a no-op if no final chunk remains.
  socket.read();

  // NOTE: Its important to get parser here, because it could be freed by
  // the `socketOnData`.
  var parser = socket.parser;
  req.emit('close');
  if (req.res && req.res.readable) {
    // Socket closed before we emitted 'end' below.
    req.res.emit('aborted');
    var res = req.res;
    res.on('end', function() {
      res.emit('close');
    });
    res.push(null);
  } else if (!req.res && !req.socket._hadError) {
    // This socket error fired before we started to
    // receive a response. The error needs to
    // fire on the request.
    req.emit('error', createHangUpError());
    req.socket._hadError = true;
  }

  // Too bad.  That output wasn't getting written.
  // This is pretty terrible that it doesn't raise an error.
  // Fixed better in v0.10
  if (req.output)
    req.output.length = 0;
  if (req.outputEncodings)
    req.outputEncodings.length = 0;

  if (parser) {
    parser.finish();
    freeParser(parser, req, socket);
  }
}

function socketErrorListener(err) {
  var socket = this;
  var req = socket._httpMessage;
  debug('SOCKET ERROR:', err.message, err.stack);

  if (req) {
    req.emit('error', err);
    // For Safety. Some additional errors might fire later on
    // and we need to make sure we don't double-fire the error event.
    req.socket._hadError = true;
  }

  // Handle any pending data
  socket.read();

  var parser = socket.parser;
  if (parser) {
    parser.finish();
    freeParser(parser, req, socket);
  }

  // Ensure that no further data will come out of the socket
  socket.removeListener('data', socketOnData);
  socket.removeListener('end', socketOnEnd);
  socket.destroy();
}

function socketOnEnd() {
  var socket = this;
  var req = this._httpMessage;
  var parser = this.parser;

  if (!req.res && !req.socket._hadError) {
    // If we don't have a response then we know that the socket
    // ended prematurely and we need to emit an error on the request.
    req.emit('error', createHangUpError());
    req.socket._hadError = true;
  }
  if (parser) {
    parser.finish();
    freeParser(parser, req, socket);
  }
  socket.destroy();
}

function socketOnData(d) {
  var socket = this;
  var req = this._httpMessage;
  var parser = this.parser;

  assert(parser && parser.socket === socket);

  var ret = parser.execute(d);
  if (ret instanceof Error) {
    debug('parse error');
    freeParser(parser, req, socket);
    socket.destroy();
    req.emit('error', ret);
    req.socket._hadError = true;
  } else if (parser.incoming && parser.incoming.upgrade) {
    // Upgrade or CONNECT
    var bytesParsed = ret;
    var res = parser.incoming;
    req.res = res;

    socket.removeListener('data', socketOnData);
    socket.removeListener('end', socketOnEnd);
    parser.finish();

    var bodyHead = d.slice(bytesParsed, d.length);

    var eventName = req.method === 'CONNECT' ? 'connect' : 'upgrade';
    if (EventEmitter.listenerCount(req, eventName) > 0) {
      req.upgradeOrConnect = true;

      // detach the socket
      socket.emit('agentRemove');
      socket.removeListener('close', socketCloseListener);
      socket.removeListener('error', socketErrorListener);

      // TODO(isaacs): Need a way to reset a stream to fresh state
      // IE, not flowing, and not explicitly paused.
      socket._readableState.flowing = null;

      req.emit(eventName, res, socket, bodyHead);
      req.emit('close');
    } else {
      // Got Upgrade header or CONNECT method, but have no handler.
      socket.destroy();
    }
    freeParser(parser, req, socket);
  } else if (parser.incoming && parser.incoming.complete &&
             // When the status code is 100 (Continue), the server will
             // send a final response after this client sends a request
             // body. So, we must not free the parser.
             parser.incoming.statusCode !== 100) {
    socket.removeListener('data', socketOnData);
    socket.removeListener('end', socketOnEnd);
    freeParser(parser, req, socket);
  }
}


// client
function parserOnIncomingClient(res, shouldKeepAlive) {
  var socket = this.socket;
  var req = socket._httpMessage;


  // propogate "domain" setting...
  if (req.domain && !res.domain) {
    debug('setting "res.domain"');
    res.domain = req.domain;
  }

  debug('AGENT incoming response!');

  if (req.res) {
    // We already have a response object, this means the server
    // sent a double response.
    socket.destroy();
    return;
  }
  req.res = res;

  // Responses to CONNECT request is handled as Upgrade.
  if (req.method === 'CONNECT') {
    res.upgrade = true;
    return true; // skip body
  }

  // Responses to HEAD requests are crazy.
  // HEAD responses aren't allowed to have an entity-body
  // but *can* have a content-length which actually corresponds
  // to the content-length of the entity-body had the request
  // been a GET.
  var isHeadResponse = req.method === 'HEAD';
  debug('AGENT isHeadResponse', isHeadResponse);

  if (res.statusCode === 100) {
    // restart the parser, as this is a continue message.
    delete req.res; // Clear res so that we don't hit double-responses.
    req.emit('continue');
    return true;
  }

  if (req.shouldKeepAlive && !shouldKeepAlive && !req.upgradeOrConnect) {
    // Server MUST respond with Connection:keep-alive for us to enable it.
    // If we've been upgraded (via WebSockets) we also shouldn't try to
    // keep the connection open.
    req.shouldKeepAlive = false;
  }


  // DTRACE_HTTP_CLIENT_RESPONSE(socket, req);
  // COUNTER_HTTP_CLIENT_RESPONSE();
  req.res = res;
  res.req = req;

  // add our listener first, so that we guarantee socket cleanup
  res.on('end', responseOnEnd);
  var handled = req.emit('response', res);

  // If the user did not listen for the 'response' event, then they
  // can't possibly read the data, so we ._dump() it into the void
  // so that the socket doesn't hang there in a paused state.
  if (!handled)
    res._dump();

  return isHeadResponse;
}

// client
function responseOnEnd() {
  var res = this;
  var req = res.req;
  var socket = req.socket;

  if (!req.shouldKeepAlive) {
    if (socket.writable) {
      debug('AGENT socket.destroySoon()');
      socket.destroySoon();
    }
    assert(!socket.writable);
  } else {
    debug('AGENT socket keep-alive');
    if (req.timeoutCb) {
      socket.setTimeout(0, req.timeoutCb);
      req.timeoutCb = null;
    }
    socket.removeListener('close', socketCloseListener);
    socket.removeListener('error', socketErrorListener);
    // Mark this socket as available, AFTER user-added end
    // handlers have a chance to run.
    process.nextTick(function() {
      socket.emit('free');
    });
  }
}

function tickOnSocket(req, socket) {
  var parser = parsers.alloc();
  req.socket = socket;
  req.connection = socket;
  parser.reinitialize(HTTPParser.RESPONSE);
  parser.socket = socket;
  parser.incoming = null;
  req.parser = parser;

  socket.parser = parser;
  socket._httpMessage = req;

  // Setup "drain" propogation.
  httpSocketSetup(socket);

  // Propagate headers limit from request object to parser
  if (util.isNumber(req.maxHeadersCount)) {
    parser.maxHeaderPairs = req.maxHeadersCount << 1;
  } else {
    // Set default value because parser may be reused from FreeList
    parser.maxHeaderPairs = 2000;
  }

  parser.onIncoming = parserOnIncomingClient;
  socket.on('error', socketErrorListener);
  socket.on('data', socketOnData);
  socket.on('end', socketOnEnd);
  socket.on('close', socketCloseListener);
  req.emit('socket', socket);
}

ClientRequest.prototype.onSocket = function(socket) {
  var req = this;

  process.nextTick(function() {
    if (req.aborted) {
      // If we were aborted while waiting for a socket, skip the whole thing.
      socket.emit('free');
    } else {
      tickOnSocket(req, socket);
    }
  });
};

ClientRequest.prototype._deferToConnect = function(method, arguments_, cb) {
  // This function is for calls that need to happen once the socket is
  // connected and writable. It's an important promisy thing for all the socket
  // calls that happen either now (when a socket is assigned) or
  // in the future (when a socket gets assigned out of the pool and is
  // eventually writable).
  var self = this;
  var onSocket = function() {
    if (self.socket.writable) {
      if (method) {
        self.socket[method].apply(self.socket, arguments_);
      }
      if (cb) { cb(); }
    } else {
      self.socket.once('connect', function() {
        if (method) {
          self.socket[method].apply(self.socket, arguments_);
        }
        if (cb) { cb(); }
      });
    }
  }
  if (!self.socket) {
    self.once('socket', onSocket);
  } else {
    onSocket();
  }
};

ClientRequest.prototype.setTimeout = function(msecs, callback) {
  if (callback) this.once('timeout', callback);

  var self = this;
  function emitTimeout() {
    self.emit('timeout');
  }

  if (this.socket && this.socket.writable) {
    if (this.timeoutCb)
      this.socket.setTimeout(0, this.timeoutCb);
    this.timeoutCb = emitTimeout;
    this.socket.setTimeout(msecs, emitTimeout);
    return;
  }

  // Set timeoutCb so that it'll get cleaned up on request end
  this.timeoutCb = emitTimeout;
  if (this.socket) {
    var sock = this.socket;
    this.socket.once('connect', function() {
      sock.setTimeout(msecs, emitTimeout);
    });
    return;
  }

  this.once('socket', function(sock) {
    sock.setTimeout(msecs, emitTimeout);
  });
};

ClientRequest.prototype.setNoDelay = function() {
  this._deferToConnect('setNoDelay', arguments);
};
ClientRequest.prototype.setSocketKeepAlive = function() {
  this._deferToConnect('setKeepAlive', arguments);
};

ClientRequest.prototype.clearTimeout = function(cb) {
  this.setTimeout(0, cb);
};

}).call(this,require('_process'))
},{"./_http_agent":59,"./_http_common":61,"./_http_outgoing":63,"_process":11,"assert":1,"buffer":3,"events":8,"http-parser-js":66,"net":"net","url":30,"util":32}],61:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var FreeList = require('freelist').FreeList;
var HTTPParser = require('http-parser-js').HTTPParser;

var incoming = require('./_http_incoming');
var IncomingMessage = incoming.IncomingMessage;
var readStart = incoming.readStart;
var readStop = incoming.readStop;

var isNumber = require('util').isNumber;
var debug = require('util').debuglog('http');
exports.debug = debug;

exports.CRLF = '\r\n';
exports.chunkExpression = /chunk/i;
exports.continueExpression = /100-continue/i;
exports.methods = HTTPParser.methods;

var kOnHeaders = HTTPParser.kOnHeaders | 0;
var kOnHeadersComplete = HTTPParser.kOnHeadersComplete | 0;
var kOnBody = HTTPParser.kOnBody | 0;
var kOnMessageComplete = HTTPParser.kOnMessageComplete | 0;

// Only called in the slow case where slow means
// that the request headers were either fragmented
// across multiple TCP packets or too large to be
// processed in a single run. This method is also
// called to process trailing HTTP headers.
function parserOnHeaders(headers, url) {
  // Once we exceeded headers limit - stop collecting them
  if (this.maxHeaderPairs <= 0 ||
      this._headers.length < this.maxHeaderPairs) {
    this._headers = this._headers.concat(headers);
  }
  this._url += url;
}

// info.headers and info.url are set only if .onHeaders()
// has not been called for this request.
//
// info.url is not set for response parsers but that's not
// applicable here since all our parsers are request parsers.
function parserOnHeadersComplete(info) {
  debug('parserOnHeadersComplete', info);
  var parser = this;
  var headers = info.headers;
  var url = info.url;

  if (!headers) {
    headers = parser._headers;
    parser._headers = [];
  }

  if (!url) {
    url = parser._url;
    parser._url = '';
  }

  parser.incoming = new IncomingMessage(parser.socket);
  parser.incoming.httpVersionMajor = info.versionMajor;
  parser.incoming.httpVersionMinor = info.versionMinor;
  parser.incoming.httpVersion = info.versionMajor + '.' + info.versionMinor;
  parser.incoming.url = url;

  var n = headers.length;

  // If parser.maxHeaderPairs <= 0 - assume that there're no limit
  if (parser.maxHeaderPairs > 0) {
    n = Math.min(n, parser.maxHeaderPairs);
  }

  parser.incoming._addHeaderLines(headers, n);

  if (isNumber(info.method)) {
    // server only
    parser.incoming.method = HTTPParser.methods[info.method];
  } else {
    // client only
    parser.incoming.statusCode = info.statusCode;
    parser.incoming.statusMessage = info.statusMessage;
  }

  parser.incoming.upgrade = info.upgrade;

  var skipBody = false; // response to HEAD or CONNECT

  if (!info.upgrade) {
    // For upgraded connections and CONNECT method request,
    // we'll emit this after parser.execute
    // so that we can capture the first part of the new protocol
    skipBody = parser.onIncoming(parser.incoming, info.shouldKeepAlive);
  }

  return skipBody;
}

// XXX This is a mess.
// TODO: http.Parser should be a Writable emits request/response events.
function parserOnBody(b, start, len) {
  var parser = this;
  var stream = parser.incoming;

  // if the stream has already been removed, then drop it.
  if (!stream)
    return;

  var socket = stream.socket;

  // pretend this was the result of a stream._read call.
  if (len > 0 && !stream._dumped) {
    var slice = b.slice(start, start + len);
    var ret = stream.push(slice);
    if (!ret)
      readStop(socket);
  }
}

function parserOnMessageComplete() {
  var parser = this;
  var stream = parser.incoming;

  if (stream) {
    stream.complete = true;
    // Emit any trailing headers.
    var headers = parser._headers;
    if (headers) {
      parser.incoming._addHeaderLines(headers, headers.length);
      parser._headers = [];
      parser._url = '';
    }

    if (!stream.upgrade)
      // For upgraded connections, also emit this after parser.execute
      stream.push(null);
  }

  if (stream && !parser.incoming._pendings.length) {
    // For emit end event
    stream.push(null);
  }

  // force to read the next incoming message
  readStart(parser.socket);
}


var parsers = new FreeList('parsers', 1000, function() {
  var parser = new HTTPParser(HTTPParser.REQUEST);

  parser._headers = [];
  parser._url = '';

  // Only called in the slow case where slow means
  // that the request headers were either fragmented
  // across multiple TCP packets or too large to be
  // processed in a single run. This method is also
  // called to process trailing HTTP headers.
  parser[kOnHeaders] = parserOnHeaders;
  parser[kOnHeadersComplete] = parserOnHeadersComplete;
  parser[kOnBody] = parserOnBody;
  parser[kOnMessageComplete] = parserOnMessageComplete;

  return parser;
});
exports.parsers = parsers;


// Free the parser and also break any links that it
// might have to any other things.
// TODO: All parser data should be attached to a
// single object, so that it can be easily cleaned
// up by doing `parser.data = {}`, which should
// be done in FreeList.free.  `parsers.free(parser)`
// should be all that is needed.
function freeParser(parser, req, socket) {
  if (parser) {
    parser._headers = [];
    parser.onIncoming = null;
    if (parser.socket)
      parser.socket.parser = null;
    parser.socket = null;
    parser.incoming = null;
    if (parsers.free(parser) === false)
      parser.close();
    parser = null;
  }
  if (req) {
    req.parser = null;
  }
  if (socket) {
    socket.parser = null;
  }
}
exports.freeParser = freeParser;


function ondrain() {
  if (this._httpMessage) this._httpMessage.emit('drain');
}


function httpSocketSetup(socket) {
  socket.removeListener('drain', ondrain);
  socket.on('drain', ondrain);
}
exports.httpSocketSetup = httpSocketSetup;

},{"./_http_incoming":62,"freelist":65,"http-parser-js":66,"util":32}],62:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');
var Stream = require('stream');

function readStart(socket) {
  if (socket && !socket._paused && socket.readable)
    socket.resume();
}
exports.readStart = readStart;

function readStop(socket) {
  if (socket)
    socket.pause();
}
exports.readStop = readStop;


/* Abstract base class for ServerRequest and ClientResponse. */
function IncomingMessage(socket) {
  Stream.Readable.call(this);

  // XXX This implementation is kind of all over the place
  // When the parser emits body chunks, they go in this list.
  // _read() pulls them out, and when it finds EOF, it ends.

  this.socket = socket;
  this.connection = socket;

  this.httpVersionMajor = null;
  this.httpVersionMinor = null;
  this.httpVersion = null;
  this.complete = false;
  this.headers = {};
  this.rawHeaders = [];
  this.trailers = {};
  this.rawTrailers = [];

  this.readable = true;

  this._pendings = [];
  this._pendingIndex = 0;
  this.upgrade = null;

  // request (server) only
  this.url = '';
  this.method = null;

  // response (client) only
  this.statusCode = null;
  this.statusMessage = null;
  this.client = this.socket;

  // flag for backwards compatibility grossness.
  this._consuming = false;

  // flag for when we decide that this message cannot possibly be
  // read by the user, so there's no point continuing to handle it.
  this._dumped = false;
}
util.inherits(IncomingMessage, Stream.Readable);


exports.IncomingMessage = IncomingMessage;


IncomingMessage.prototype.setTimeout = function(msecs, callback) {
  if (callback)
    this.on('timeout', callback);
  this.socket.setTimeout(msecs);
};


IncomingMessage.prototype.read = function(n) {
  this._consuming = true;
  this.read = Stream.Readable.prototype.read;
  return this.read(n);
};


IncomingMessage.prototype._read = function(n) {
  // We actually do almost nothing here, because the parserOnBody
  // function fills up our internal buffer directly.  However, we
  // do need to unpause the underlying socket so that it flows.
  if (this.socket.readable)
    readStart(this.socket);
};


// It's possible that the socket will be destroyed, and removed from
// any messages, before ever calling this.  In that case, just skip
// it, since something else is destroying this connection anyway.
IncomingMessage.prototype.destroy = function(error) {
  if (this.socket)
    this.socket.destroy(error);
};


IncomingMessage.prototype._addHeaderLines = function(headers, n) {
  if (headers && headers.length) {
    var raw, dest;
    if (this.complete) {
      raw = this.rawTrailers;
      dest = this.trailers;
    } else {
      raw = this.rawHeaders;
      dest = this.headers;
    }

    for (var i = 0; i < n; i += 2) {
      var k = headers[i];
      var v = headers[i + 1];
      raw.push(k);
      raw.push(v);
      this._addHeaderLine(k, v, dest);
    }
  }
};


// Add the given (field, value) pair to the message
//
// Per RFC2616, section 4.2 it is acceptable to join multiple instances of the
// same header with a ', ' if the header in question supports specification of
// multiple values this way. If not, we declare the first instance the winner
// and drop the second. Extended header fields (those beginning with 'x-') are
// always joined.
IncomingMessage.prototype._addHeaderLine = function(field, value, dest) {
  field = field.toLowerCase();
  switch (field) {
    // Array headers:
    case 'set-cookie':
      if (!util.isUndefined(dest[field])) {
        dest[field].push(value);
      } else {
        dest[field] = [value];
      }
      break;

    // list is taken from:
    // https://mxr.mozilla.org/mozilla/source/netwerk/protocol/http/src/nsHttpHeaderArray.cpp
    case 'content-type':
    case 'content-length':
    case 'user-agent':
    case 'referer':
    case 'host':
    case 'authorization':
    case 'proxy-authorization':
    case 'if-modified-since':
    case 'if-unmodified-since':
    case 'from':
    case 'location':
    case 'max-forwards':
      // drop duplicates
      if (util.isUndefined(dest[field]))
        dest[field] = value;
      break;

    default:
      // make comma-separated list
      if (!util.isUndefined(dest[field]))
        dest[field] += ', ' + value;
      else {
        dest[field] = value;
      }
  }
};


// Call this instead of resume() if we want to just
// dump all the data to /dev/null
IncomingMessage.prototype._dump = function() {
  if (!this._dumped) {
    this._dumped = true;
    this.resume();
  }
};

},{"stream":27,"util":32}],63:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var assert = require('assert').ok;
var Stream = require('stream');
var timers = require('timers');
var util = require('util');
var Buffer = require('buffer').Buffer;
var common = require('./_http_common');

// fix if cork methods aren't available
if (!Stream.Writable.prototype.cork) {
  Stream.Writable.prototype.cork = Stream.Writable.prototype.uncork = function() {};
}
if (!Stream.Duplex.prototype.cork) {
  Stream.Duplex.prototype.cork = Stream.Duplex.prototype.uncork = function() {};
}

var CRLF = common.CRLF;
var chunkExpression = common.chunkExpression;
var debug = common.debug;


var connectionExpression = /Connection/i;
var transferEncodingExpression = /Transfer-Encoding/i;
var closeExpression = /close/i;
var contentLengthExpression = /Content-Length/i;
var dateExpression = /Date/i;
var expectExpression = /Expect/i;

var automaticHeaders = {
  connection: true,
  'content-length': true,
  'transfer-encoding': true,
  date: true
};


var dateCache;
function utcDate() {
  if (!dateCache) {
    var d = new Date();
    dateCache = d.toUTCString();
    timers.enroll(utcDate, 1000 - d.getMilliseconds());
    timers._unrefActive(utcDate);
  }
  return dateCache;
}
utcDate._onTimeout = function() {
  dateCache = undefined;
};


function OutgoingMessage() {
  Stream.call(this);

  this.output = [];
  this.outputEncodings = [];
  this.outputCallbacks = [];

  this.writable = true;

  this._last = false;
  this.chunkedEncoding = false;
  this.shouldKeepAlive = true;
  this.useChunkedEncodingByDefault = true;
  this.sendDate = false;
  this._removedHeader = {};

  this._hasBody = true;
  this._trailer = '';

  this.finished = false;
  this._hangupClose = false;
  this._headerSent = false;

  this.socket = null;
  this.connection = null;
  this._header = null;
  this._headers = null;
  this._headerNames = {};
}
util.inherits(OutgoingMessage, Stream);


exports.OutgoingMessage = OutgoingMessage;


OutgoingMessage.prototype.setTimeout = function(msecs, callback) {
  if (callback)
    this.on('timeout', callback);
  if (!this.socket) {
    this.once('socket', function(socket) {
      socket.setTimeout(msecs);
    });
  } else
    this.socket.setTimeout(msecs);
};


// It's possible that the socket will be destroyed, and removed from
// any messages, before ever calling this.  In that case, just skip
// it, since something else is destroying this connection anyway.
OutgoingMessage.prototype.destroy = function(error) {
  if (this.socket)
    this.socket.destroy(error);
  else
    this.once('socket', function(socket) {
      socket.destroy(error);
    });
};


// This abstract either writing directly to the socket or buffering it.
OutgoingMessage.prototype._send = function(data, encoding, callback) {
  // This is a shameful hack to get the headers and first body chunk onto
  // the same packet. Future versions of Node are going to take care of
  // this at a lower level and in a more general way.
  if (!this._headerSent) {
    if (util.isString(data) &&
        encoding !== 'hex' &&
        encoding !== 'base64') {
      data = this._header + data;
    } else {
      this.output.unshift(this._header);
      this.outputEncodings.unshift('binary');
      this.outputCallbacks.unshift(null);
    }
    this._headerSent = true;
  }
  return this._writeRaw(data, encoding, callback);
};


OutgoingMessage.prototype._writeRaw = function(data, encoding, callback) {
  if (util.isFunction(encoding)) {
    callback = encoding;
    encoding = null;
  }

  if (data.length === 0) {
    if (util.isFunction(callback))
      process.nextTick(callback);
    return true;
  }

  if (this.connection &&
      this.connection._httpMessage === this &&
      this.connection.writable &&
      !this.connection.destroyed) {
    // There might be pending data in the this.output buffer.
    while (this.output.length) {
      if (!this.connection.writable) {
        this._buffer(data, encoding, callback);
        return false;
      }
      var c = this.output.shift();
      var e = this.outputEncodings.shift();
      var cb = this.outputCallbacks.shift();
      this.connection.write(c, e, cb);
    }

    // Directly write to socket.
    return this.connection.write(data, encoding, callback);
  } else if (this.connection && this.connection.destroyed) {
    // The socket was destroyed.  If we're still trying to write to it,
    // then we haven't gotten the 'close' event yet.
    return false;
  } else {
    // buffer, as long as we're not destroyed.
    this._buffer(data, encoding, callback);
    return false;
  }
};


OutgoingMessage.prototype._buffer = function(data, encoding, callback) {
  this.output.push(data);
  this.outputEncodings.push(encoding);
  this.outputCallbacks.push(callback);
  return false;
};


OutgoingMessage.prototype._storeHeader = function(firstLine, headers) {
  // firstLine in the case of request is: 'GET /index.html HTTP/1.1\r\n'
  // in the case of response it is: 'HTTP/1.1 200 OK\r\n'
  var state = {
    sentConnectionHeader: false,
    sentContentLengthHeader: false,
    sentTransferEncodingHeader: false,
    sentDateHeader: false,
    sentExpect: false,
    messageHeader: firstLine
  };

  var field, value;

  if (headers) {
    var keys = Object.keys(headers);
    var isArray = util.isArray(headers);
    var field, value;

    for (var i = 0, l = keys.length; i < l; i++) {
      var key = keys[i];
      if (isArray) {
        field = headers[key][0];
        value = headers[key][1];
      } else {
        field = key;
        value = headers[key];
      }

      if (util.isArray(value)) {
        for (var j = 0; j < value.length; j++) {
          storeHeader(this, state, field, value[j]);
        }
      } else {
        storeHeader(this, state, field, value);
      }
    }
  }

  // Date header
  if (this.sendDate === true && state.sentDateHeader === false) {
    state.messageHeader += 'Date: ' + utcDate() + CRLF;
  }

  // Force the connection to close when the response is a 204 No Content or
  // a 304 Not Modified and the user has set a "Transfer-Encoding: chunked"
  // header.
  //
  // RFC 2616 mandates that 204 and 304 responses MUST NOT have a body but
  // node.js used to send out a zero chunk anyway to accommodate clients
  // that don't have special handling for those responses.
  //
  // It was pointed out that this might confuse reverse proxies to the point
  // of creating security liabilities, so suppress the zero chunk and force
  // the connection to close.
  var statusCode = this.statusCode;
  if ((statusCode === 204 || statusCode === 304) &&
      this.chunkedEncoding === true) {
    debug(statusCode + ' response should not use chunked encoding,' +
          ' closing connection.');
    this.chunkedEncoding = false;
    this.shouldKeepAlive = false;
  }

  // keep-alive logic
  if (this._removedHeader.connection) {
    this._last = true;
    this.shouldKeepAlive = false;
  } else if (state.sentConnectionHeader === false) {
    var shouldSendKeepAlive = this.shouldKeepAlive &&
        (state.sentContentLengthHeader ||
         this.useChunkedEncodingByDefault ||
         this.agent);
    if (shouldSendKeepAlive) {
      state.messageHeader += 'Connection: keep-alive\r\n';
    } else {
      this._last = true;
      state.messageHeader += 'Connection: close\r\n';
    }
  }

  if (state.sentContentLengthHeader === false &&
      state.sentTransferEncodingHeader === false) {
    if (this._hasBody && !this._removedHeader['transfer-encoding']) {
      if (this.useChunkedEncodingByDefault) {
        state.messageHeader += 'Transfer-Encoding: chunked\r\n';
        this.chunkedEncoding = true;
      } else {
        this._last = true;
      }
    } else {
      // Make sure we don't end the 0\r\n\r\n at the end of the message.
      this.chunkedEncoding = false;
    }
  }

  this._header = state.messageHeader + CRLF;
  this._headerSent = false;

  // wait until the first body chunk, or close(), is sent to flush,
  // UNLESS we're sending Expect: 100-continue.
  if (state.sentExpect) this._send('');
};

function storeHeader(self, state, field, value) {
  // Protect against response splitting. The if statement is there to
  // minimize the performance impact in the common case.
  if (/[\r\n]/.test(value))
    value = value.replace(/[\r\n]+[ \t]*/g, '');

  state.messageHeader += field + ': ' + value + CRLF;

  if (connectionExpression.test(field)) {
    state.sentConnectionHeader = true;
    if (closeExpression.test(value)) {
      self._last = true;
    } else {
      self.shouldKeepAlive = true;
    }

  } else if (transferEncodingExpression.test(field)) {
    state.sentTransferEncodingHeader = true;
    if (chunkExpression.test(value)) self.chunkedEncoding = true;

  } else if (contentLengthExpression.test(field)) {
    state.sentContentLengthHeader = true;
  } else if (dateExpression.test(field)) {
    state.sentDateHeader = true;
  } else if (expectExpression.test(field)) {
    state.sentExpect = true;
  }
}


OutgoingMessage.prototype.setHeader = function(name, value) {
  if (typeof name !== 'string')
    throw new TypeError('"name" should be a string');
  if (value === undefined)
    throw new Error('"name" and "value" are required for setHeader().');
  if (this._header)
    throw new Error('Can\'t set headers after they are sent.');

  if (this._headers === null)
    this._headers = {};

  var key = name.toLowerCase();
  this._headers[key] = value;
  this._headerNames[key] = name;

  if (automaticHeaders[key])
    this._removedHeader[key] = false;
};


OutgoingMessage.prototype.getHeader = function(name) {
  if (arguments.length < 1) {
    throw new Error('`name` is required for getHeader().');
  }

  if (!this._headers) return;

  var key = name.toLowerCase();
  return this._headers[key];
};


OutgoingMessage.prototype.removeHeader = function(name) {
  if (arguments.length < 1) {
    throw new Error('`name` is required for removeHeader().');
  }

  if (this._header) {
    throw new Error('Can\'t remove headers after they are sent.');
  }

  var key = name.toLowerCase();

  if (key === 'date')
    this.sendDate = false;
  else if (automaticHeaders[key])
    this._removedHeader[key] = true;

  if (this._headers) {
    delete this._headers[key];
    delete this._headerNames[key];
  }
};


OutgoingMessage.prototype._renderHeaders = function() {
  if (this._header) {
    throw new Error('Can\'t render headers after they are sent to the client.');
  }

  if (!this._headers) return {};

  var headers = {};
  var keys = Object.keys(this._headers);

  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    headers[this._headerNames[key]] = this._headers[key];
  }
  return headers;
};


Object.defineProperty(OutgoingMessage.prototype, 'headersSent', {
  configurable: true,
  enumerable: true,
  get: function() { return !!this._header; }
});


OutgoingMessage.prototype.write = function(chunk, encoding, callback) {
  var self = this;

  if (this.finished) {
    var err = new Error('write after end');
    process.nextTick(function() {
      self.emit('error', err);
      if (callback) callback(err);
    });

    return true;
  }

  if (!this._header) {
    this._implicitHeader();
  }

  if (!this._hasBody) {
    debug('This type of response MUST NOT have a body. ' +
          'Ignoring write() calls.');
    return true;
  }

  if (!util.isString(chunk) && !util.isBuffer(chunk)) {
    throw new TypeError('first argument must be a string or Buffer');
  }


  // If we get an empty string or buffer, then just do nothing, and
  // signal the user to keep writing.
  if (chunk.length === 0) return true;

  var len, ret;
  if (this.chunkedEncoding) {
    if (util.isString(chunk) &&
        encoding !== 'hex' &&
        encoding !== 'base64' &&
        encoding !== 'binary') {
      len = Buffer.byteLength(chunk, encoding);
      chunk = len.toString(16) + CRLF + chunk + CRLF;
      ret = this._send(chunk, encoding, callback);
    } else {
      // buffer, or a non-toString-friendly encoding
      if (util.isString(chunk))
        len = Buffer.byteLength(chunk, encoding);
      else
        len = chunk.length;

      if (this.connection && !this.connection.corked) {
        this.connection.cork();
        var conn = this.connection;
        process.nextTick(function connectionCork() {
          if (conn)
            conn.uncork();
        });
      }
      this._send(len.toString(16), 'binary', null);
      this._send(crlf_buf, null, null);
      this._send(chunk, encoding, null);
      ret = this._send(crlf_buf, null, callback);
    }
  } else {
    ret = this._send(chunk, encoding, callback);
  }

  debug('write ret = ' + ret);
  return ret;
};


OutgoingMessage.prototype.addTrailers = function(headers) {
  this._trailer = '';
  var keys = Object.keys(headers);
  var isArray = util.isArray(headers);
  var field, value;
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i];
    if (isArray) {
      field = headers[key][0];
      value = headers[key][1];
    } else {
      field = key;
      value = headers[key];
    }

    this._trailer += field + ': ' + value + CRLF;
  }
};


var crlf_buf = new Buffer('\r\n');


OutgoingMessage.prototype.end = function(data, encoding, callback) {
  if (util.isFunction(data)) {
    callback = data;
    data = null;
  } else if (util.isFunction(encoding)) {
    callback = encoding;
    encoding = null;
  }

  if (data && !util.isString(data) && !util.isBuffer(data)) {
    throw new TypeError('first argument must be a string or Buffer');
  }

  if (this.finished) {
    return false;
  }

  var self = this;
  function finish() {
    self.emit('finish');
  }

  if (util.isFunction(callback))
    this.once('finish', callback);


  if (!this._header) {
    this._implicitHeader();
  }

  if (data && !this._hasBody) {
    debug('This type of response MUST NOT have a body. ' +
          'Ignoring data passed to end().');
    data = null;
  }

  if (this.connection && data)
    this.connection.cork();

  var ret;
  if (data) {
    // Normal body write.
    ret = this.write(data, encoding);
  }

  if (this._hasBody && this.chunkedEncoding) {
    ret = this._send('0\r\n' + this._trailer + '\r\n', 'binary', finish);
  } else {
    // Force a flush, HACK.
    ret = this._send('', 'binary', finish);
  }

  if (this.connection && data)
    this.connection.uncork();

  this.finished = true;

  // There is the first message on the outgoing queue, and we've sent
  // everything to the socket.
  debug('outgoing message end.');
  if (this.output.length === 0 && this.connection._httpMessage === this) {
    this._finish();
  }

  return ret;
};


OutgoingMessage.prototype._finish = function() {
  assert(this.connection);
  this.emit('prefinish');
};


// This logic is probably a bit confusing. Let me explain a bit:
//
// In both HTTP servers and clients it is possible to queue up several
// outgoing messages. This is easiest to imagine in the case of a client.
// Take the following situation:
//
//    req1 = client.request('GET', '/');
//    req2 = client.request('POST', '/');
//
// When the user does
//
//   req2.write('hello world\n');
//
// it's possible that the first request has not been completely flushed to
// the socket yet. Thus the outgoing messages need to be prepared to queue
// up data internally before sending it on further to the socket's queue.
//
// This function, outgoingFlush(), is called by both the Server and Client
// to attempt to flush any pending messages out to the socket.
OutgoingMessage.prototype._flush = function() {
  if (this.socket && this.socket.writable) {
    var ret;
    while (this.output.length) {
      var data = this.output.shift();
      var encoding = this.outputEncodings.shift();
      var cb = this.outputCallbacks.shift();
      ret = this.socket.write(data, encoding, cb);
    }

    if (this.finished) {
      // This is a queue to the server or client to bring in the next this.
      this._finish();
    } else if (ret) {
      // This is necessary to prevent https from breaking
      this.emit('drain');
    }
  }
};


OutgoingMessage.prototype.flushHeaders = function outgoingFlushHeaders() {
  if (!this._header) {
    // Force-flush the headers.
    this._implicitHeader();
    this._send('');
  }
};

}).call(this,require('_process'))
},{"./_http_common":61,"_process":11,"assert":1,"buffer":3,"stream":27,"timers":29,"util":32}],64:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');
var net = require('net');
var EventEmitter = require('events').EventEmitter;
var HTTPParser = require('http-parser-js').HTTPParser;
var assert = require('assert').ok;

var common = require('./_http_common');
var parsers = common.parsers;
var freeParser = common.freeParser;
var debug = common.debug;
var CRLF = common.CRLF;
var continueExpression = common.continueExpression;
var chunkExpression = common.chunkExpression;
var httpSocketSetup = common.httpSocketSetup;

var OutgoingMessage = require('./_http_outgoing').OutgoingMessage;


var STATUS_CODES = exports.STATUS_CODES = {
  100 : 'Continue',
  101 : 'Switching Protocols',
  102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
  200 : 'OK',
  201 : 'Created',
  202 : 'Accepted',
  203 : 'Non-Authoritative Information',
  204 : 'No Content',
  205 : 'Reset Content',
  206 : 'Partial Content',
  207 : 'Multi-Status',               // RFC 4918
  300 : 'Multiple Choices',
  301 : 'Moved Permanently',
  302 : 'Moved Temporarily',
  303 : 'See Other',
  304 : 'Not Modified',
  305 : 'Use Proxy',
  307 : 'Temporary Redirect',
  308 : 'Permanent Redirect',         // RFC 7238
  400 : 'Bad Request',
  401 : 'Unauthorized',
  402 : 'Payment Required',
  403 : 'Forbidden',
  404 : 'Not Found',
  405 : 'Method Not Allowed',
  406 : 'Not Acceptable',
  407 : 'Proxy Authentication Required',
  408 : 'Request Time-out',
  409 : 'Conflict',
  410 : 'Gone',
  411 : 'Length Required',
  412 : 'Precondition Failed',
  413 : 'Request Entity Too Large',
  414 : 'Request-URI Too Large',
  415 : 'Unsupported Media Type',
  416 : 'Requested Range Not Satisfiable',
  417 : 'Expectation Failed',
  418 : 'I\'m a teapot',              // RFC 2324
  422 : 'Unprocessable Entity',       // RFC 4918
  423 : 'Locked',                     // RFC 4918
  424 : 'Failed Dependency',          // RFC 4918
  425 : 'Unordered Collection',       // RFC 4918
  426 : 'Upgrade Required',           // RFC 2817
  428 : 'Precondition Required',      // RFC 6585
  429 : 'Too Many Requests',          // RFC 6585
  431 : 'Request Header Fields Too Large',// RFC 6585
  500 : 'Internal Server Error',
  501 : 'Not Implemented',
  502 : 'Bad Gateway',
  503 : 'Service Unavailable',
  504 : 'Gateway Time-out',
  505 : 'HTTP Version Not Supported',
  506 : 'Variant Also Negotiates',    // RFC 2295
  507 : 'Insufficient Storage',       // RFC 4918
  509 : 'Bandwidth Limit Exceeded',
  510 : 'Not Extended',               // RFC 2774
  511 : 'Network Authentication Required' // RFC 6585
};


function ServerResponse(req) {
  OutgoingMessage.call(this);

  if (req.method === 'HEAD') this._hasBody = false;

  this.sendDate = true;

  if (req.httpVersionMajor < 1 || req.httpVersionMinor < 1) {
    this.useChunkedEncodingByDefault = chunkExpression.test(req.headers.te);
    this.shouldKeepAlive = false;
  }
}
util.inherits(ServerResponse, OutgoingMessage);

ServerResponse.prototype._finish = function() {
  // DTRACE_HTTP_SERVER_RESPONSE(this.connection);
  // COUNTER_HTTP_SERVER_RESPONSE();
  OutgoingMessage.prototype._finish.call(this);
};



exports.ServerResponse = ServerResponse;

ServerResponse.prototype.statusCode = 200;
ServerResponse.prototype.statusMessage = undefined;

function onServerResponseClose() {
  // EventEmitter.emit makes a copy of the 'close' listeners array before
  // calling the listeners. detachSocket() unregisters onServerResponseClose
  // but if detachSocket() is called, directly or indirectly, by a 'close'
  // listener, onServerResponseClose is still in that copy of the listeners
  // array. That is, in the example below, b still gets called even though
  // it's been removed by a:
  //
  //   var obj = new events.EventEmitter;
  //   obj.on('event', a);
  //   obj.on('event', b);
  //   function a() { obj.removeListener('event', b) }
  //   function b() { throw "BAM!" }
  //   obj.emit('event');  // throws
  //
  // Ergo, we need to deal with stale 'close' events and handle the case
  // where the ServerResponse object has already been deconstructed.
  // Fortunately, that requires only a single if check. :-)
  if (this._httpMessage) this._httpMessage.emit('close');
}

ServerResponse.prototype.assignSocket = function(socket) {
  assert(!socket._httpMessage);
  socket._httpMessage = this;
  socket.on('close', onServerResponseClose);
  this.socket = socket;
  this.connection = socket;
  this.emit('socket', socket);
  this._flush();
};

ServerResponse.prototype.detachSocket = function(socket) {
  assert(socket._httpMessage === this);
  socket.removeListener('close', onServerResponseClose);
  socket._httpMessage = null;
  this.socket = this.connection = null;
};

ServerResponse.prototype.writeContinue = function(cb) {
  this._writeRaw('HTTP/1.1 100 Continue' + CRLF + CRLF, 'ascii', cb);
  this._sent100 = true;
};

ServerResponse.prototype._implicitHeader = function() {
  this.writeHead(this.statusCode);
};

ServerResponse.prototype.writeHead = function(statusCode, reason, obj) {
  var headers;

  if (util.isString(reason)) {
    // writeHead(statusCode, reasonPhrase[, headers])
    this.statusMessage = reason;
  } else {
    // writeHead(statusCode[, headers])
    this.statusMessage =
        this.statusMessage || STATUS_CODES[statusCode] || 'unknown';
    obj = reason;
  }
  this.statusCode = statusCode;

  if (this._headers) {
    // Slow-case: when progressive API and header fields are passed.
    if (obj) {
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k) this.setHeader(k, obj[k]);
      }
    }
    // only progressive api is used
    headers = this._renderHeaders();
  } else {
    // only writeHead() called
    headers = obj;
  }

  var statusLine = 'HTTP/1.1 ' + statusCode.toString() + ' ' +
                   this.statusMessage + CRLF;

  if (statusCode === 204 || statusCode === 304 ||
      (100 <= statusCode && statusCode <= 199)) {
    // RFC 2616, 10.2.5:
    // The 204 response MUST NOT include a message-body, and thus is always
    // terminated by the first empty line after the header fields.
    // RFC 2616, 10.3.5:
    // The 304 response MUST NOT contain a message-body, and thus is always
    // terminated by the first empty line after the header fields.
    // RFC 2616, 10.1 Informational 1xx:
    // This class of status code indicates a provisional response,
    // consisting only of the Status-Line and optional headers, and is
    // terminated by an empty line.
    this._hasBody = false;
  }

  // don't keep alive connections where the client expects 100 Continue
  // but we sent a final status; they may put extra bytes on the wire.
  if (this._expect_continue && !this._sent100) {
    this.shouldKeepAlive = false;
  }

  this._storeHeader(statusLine, headers);
};

ServerResponse.prototype.writeHeader = function() {
  this.writeHead.apply(this, arguments);
};


function Server(requestListener) {
  if (!(this instanceof Server)) return new Server(requestListener);
  net.Server.call(this, { allowHalfOpen: true });

  if (requestListener) {
    this.addListener('request', requestListener);
  }

  // Similar option to this. Too lazy to write my own docs.
  // http://www.squid-cache.org/Doc/config/half_closed_clients/
  // http://wiki.squid-cache.org/SquidFaq/InnerWorkings#What_is_a_half-closed_filedescriptor.3F
  this.httpAllowHalfOpen = false;

  this.addListener('connection', connectionListener);

  this.addListener('clientError', function(err, conn) {
    conn.destroy(err);
  });

  this.timeout = 2 * 60 * 1000;
}
util.inherits(Server, net.Server);


Server.prototype.setTimeout = function(msecs, callback) {
  this.timeout = msecs;
  if (callback)
    this.on('timeout', callback);
};


exports.Server = Server;


function connectionListener(socket) {
  var self = this;
  var outgoing = [];
  var incoming = [];

  function abortIncoming() {
    while (incoming.length) {
      var req = incoming.shift();
      req.emit('aborted');
      req.emit('close');
    }
    // abort socket._httpMessage ?
  }

  function serverSocketCloseListener() {
    debug('server socket close');
    // mark this parser as reusable
    if (this.parser) {
      freeParser(this.parser, null, this);
    }

    abortIncoming();
  }

  debug('SERVER new http connection');

  httpSocketSetup(socket);

  // If the user has added a listener to the server,
  // request, or response, then it's their responsibility.
  // otherwise, destroy on timeout by default
  if (self.timeout)
    socket.setTimeout(self.timeout);
  socket.on('timeout', function() {
    var req = socket.parser && socket.parser.incoming;
    var reqTimeout = req && !req.complete && req.emit('timeout', socket);
    var res = socket._httpMessage;
    var resTimeout = res && res.emit('timeout', socket);
    var serverTimeout = self.emit('timeout', socket);

    if (!reqTimeout && !resTimeout && !serverTimeout)
      socket.destroy();
  });

  var parser = parsers.alloc();
  parser.reinitialize(HTTPParser.REQUEST);
  parser.socket = socket;
  socket.parser = parser;
  parser.incoming = null;

  // Propagate headers limit from server instance to parser
  if (util.isNumber(this.maxHeadersCount)) {
    parser.maxHeaderPairs = this.maxHeadersCount << 1;
  } else {
    // Set default value because parser may be reused from FreeList
    parser.maxHeaderPairs = 2000;
  }

  socket.addListener('error', socketOnError);
  socket.addListener('close', serverSocketCloseListener);
  parser.onIncoming = parserOnIncoming;
  socket.on('end', socketOnEnd);
  socket.on('data', socketOnData);

  // TODO(isaacs): Move all these functions out of here
  function socketOnError(e) {
    self.emit('clientError', e, this);
  }

  function socketOnData(d) {
    assert(!socket._paused);
    debug('SERVER socketOnData %d', d.length);
    var ret = parser.execute(d);
    if (ret instanceof Error) {
      debug('parse error');
      socket.destroy(ret);
    } else if (parser.incoming && parser.incoming.upgrade) {
      // Upgrade or CONNECT
      var bytesParsed = ret;
      var req = parser.incoming;
      debug('SERVER upgrade or connect', req.method);

      socket.removeListener('data', socketOnData);
      socket.removeListener('end', socketOnEnd);
      socket.removeListener('close', serverSocketCloseListener);
      parser.finish();
      freeParser(parser, req, null);
      parser = null;

      var eventName = req.method === 'CONNECT' ? 'connect' : 'upgrade';
      if (EventEmitter.listenerCount(self, eventName) > 0) {
        debug('SERVER have listener for %s', eventName);
        var bodyHead = d.slice(bytesParsed, d.length);

        // TODO(isaacs): Need a way to reset a stream to fresh state
        // IE, not flowing, and not explicitly paused.
        socket._readableState.flowing = null;
        self.emit(eventName, req, socket, bodyHead);
      } else {
        // Got upgrade header or CONNECT method, but have no handler.
        socket.destroy();
      }
    }

    if (socket._paused) {
      // onIncoming paused the socket, we should pause the parser as well
      debug('pause parser');
      socket.parser.pause();
    }
  }

  function socketOnEnd() {
    var socket = this;
    var ret = parser.finish();

    if (ret instanceof Error) {
      debug('parse error');
      socket.destroy(ret);
      return;
    }

    if (!self.httpAllowHalfOpen) {
      abortIncoming();
      if (socket.writable) socket.end();
    } else if (outgoing.length) {
      outgoing[outgoing.length - 1]._last = true;
    } else if (socket._httpMessage) {
      socket._httpMessage._last = true;
    } else {
      if (socket.writable) socket.end();
    }
  }


  // The following callback is issued after the headers have been read on a
  // new message. In this callback we setup the response object and pass it
  // to the user.

  socket._paused = false;
  function socketOnDrain() {
    // If we previously paused, then start reading again.
    if (socket._paused) {
      socket._paused = false;
      socket.parser.resume();
      socket.resume();
    }
  }
  socket.on('drain', socketOnDrain);

  function parserOnIncoming(req, shouldKeepAlive) {
    incoming.push(req);

    // If the writable end isn't consuming, then stop reading
    // so that we don't become overwhelmed by a flood of
    // pipelined requests that may never be resolved.
    if (!socket._paused) {
      var needPause = socket._writableState.needDrain;
      if (needPause) {
        socket._paused = true;
        // We also need to pause the parser, but don't do that until after
        // the call to execute, because we may still be processing the last
        // chunk.
        socket.pause();
      }
    }

    var res = new ServerResponse(req);

    res.shouldKeepAlive = shouldKeepAlive;
    // DTRACE_HTTP_SERVER_REQUEST(req, socket);
    // COUNTER_HTTP_SERVER_REQUEST();

    if (socket._httpMessage) {
      // There are already pending outgoing res, append.
      outgoing.push(res);
    } else {
      res.assignSocket(socket);
    }

    // When we're finished writing the response, check if this is the last
    // respose, if so destroy the socket.
    res.on('prefinish', resOnFinish);
    function resOnFinish() {
      // Usually the first incoming element should be our request.  it may
      // be that in the case abortIncoming() was called that the incoming
      // array will be empty.
      assert(incoming.length === 0 || incoming[0] === req);

      incoming.shift();

      // if the user never called req.read(), and didn't pipe() or
      // .resume() or .on('data'), then we call req._dump() so that the
      // bytes will be pulled off the wire.
      if (!req._consuming && !req._readableState.resumeScheduled)
        req._dump();

      res.detachSocket(socket);

      if (res._last) {
        socket.destroySoon();
      } else {
        // start sending the next message
        var m = outgoing.shift();
        if (m) {
          m.assignSocket(socket);
        }
      }
    }

    if (!util.isUndefined(req.headers.expect) &&
        (req.httpVersionMajor == 1 && req.httpVersionMinor == 1) &&
        continueExpression.test(req.headers['expect'])) {
      res._expect_continue = true;
      if (EventEmitter.listenerCount(self, 'checkContinue') > 0) {
        self.emit('checkContinue', req, res);
      } else {
        res.writeContinue();
        self.emit('request', req, res);
      }
    } else {
      self.emit('request', req, res);
    }
    return false; // Not a HEAD response. (Not even a response!)
  }
}
exports._connectionListener = connectionListener;

},{"./_http_common":61,"./_http_outgoing":63,"assert":1,"events":8,"http-parser-js":66,"net":"net","util":32}],65:[function(require,module,exports){
var FreeList = (function() {
	function FreeList(name, max, constructor) {
		this.name = name;
		this.max = max;
		this.constructor = constructor != null ? constructor : function() {};
		this.list = [];
	}

	FreeList.prototype.alloc = function() {
		if (this.list.length) {
			return this.list.shift();
		} else {
			return this.constructor.apply(this, arguments);
		}
	};

	FreeList.prototype.free = function(obj) {
		if (this.list.length < this.max) {
			this.list.push(obj);
			return true;
		} else {
			return false;
		}
	};

	return FreeList;
})();

// remain backward compatible
FreeList.FreeList = FreeList;

module.exports = FreeList;

},{}],66:[function(require,module,exports){
/*jshint node:true */

var assert = require('assert');

exports.HTTPParser = HTTPParser;
function HTTPParser(type) {
  assert.ok(type === HTTPParser.REQUEST || type === HTTPParser.RESPONSE);
  this.type = type;
  this.state = type + '_LINE';
  this.info = {
    headers: [],
    upgrade: false
  };
  this.trailers = [];
  this.line = '';
  this.isChunked = false;
  this.connection = '';
  this.headerSize = 0; // for preventing too big headers
  this.body_bytes = null;
  this.isUserCall = false;
}
HTTPParser.REQUEST = 'REQUEST';
HTTPParser.RESPONSE = 'RESPONSE';
var kOnHeaders = HTTPParser.kOnHeaders = 0;
var kOnHeadersComplete = HTTPParser.kOnHeadersComplete = 1;
var kOnBody = HTTPParser.kOnBody = 2;
var kOnMessageComplete = HTTPParser.kOnMessageComplete = 3;
var methods = HTTPParser.methods = [
  'DELETE',
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'CONNECT',
  'OPTIONS',
  'TRACE',
  'COPY',
  'LOCK',
  'MKCOL',
  'MOVE',
  'PROPFIND',
  'PROPPATCH',
  'SEARCH',
  'UNLOCK',
  'REPORT',
  'MKACTIVITY',
  'CHECKOUT',
  'MERGE',
  'M-SEARCH',
  'NOTIFY',
  'SUBSCRIBE',
  'UNSUBSCRIBE',
  'PATCH',
  'PURGE'
];
HTTPParser.prototype.reinitialize = HTTPParser;
HTTPParser.prototype.close =
HTTPParser.prototype.pause =
HTTPParser.prototype.resume = function () {};
HTTPParser.prototype._compatMode = false;

var maxHeaderSize = 80 * 1024;
var headerState = {
  REQUEST_LINE: true,
  RESPONSE_LINE: true,
  HEADER: true
};
HTTPParser.prototype.execute = function (chunk, start, length) {
  if (!(this instanceof HTTPParser)) {
    throw new TypeError('not a HTTPParser');
  }
  
  // backward compat to node < 0.11.4
  // Note: the start and length params were removed in newer version
  start = start || 0;
  length = typeof length === 'number' ? length : chunk.length;

  this.chunk = chunk;
  this.offset = start;
  var end = this.end = start + length;
  try {
    while (this.offset < end) {
      if (this[this.state]()) {
        break;
      }
    }
  } catch (err) {
    if (this.isUserCall) {
      throw err;
    }
    return err;
  }
  this.chunk = null;
  var length = this.offset - start
  if (headerState[this.state]) {
    this.headerSize += length;
    if (this.headerSize > maxHeaderSize) {
      return new Error('max header size exceeded');
    }
  }
  return length;
};

var stateFinishAllowed = {
  REQUEST_LINE: true,
  RESPONSE_LINE: true,
  BODY_RAW: true
};
HTTPParser.prototype.finish = function () {
  if (!stateFinishAllowed[this.state]) {
    return new Error('invalid state for EOF');
  }
  if (this.state === 'BODY_RAW') {
    this.userCall()(this[kOnMessageComplete]());
  }
};

//For correct error handling - see HTTPParser#execute
//Usage: this.userCall()(userFunction('arg'));
HTTPParser.prototype.userCall = function () {
  this.isUserCall = true;
  var self = this;
  return function (ret) {
    self.isUserCall = false;
    return ret;
  };
};

HTTPParser.prototype.nextRequest = function () {
  this.userCall()(this[kOnMessageComplete]());
  this.reinitialize(this.type);
};

HTTPParser.prototype.consumeLine = function () {
  var end = this.end,
      chunk = this.chunk;
  for (var i = this.offset; i < end; i++) {
    if (chunk[i] === 0x0a) { // \n
      var line = this.line + chunk.toString('ascii', this.offset, i);
      if (line.charAt(line.length - 1) === '\r') {
        line = line.substr(0, line.length - 1);
      }
      this.line = '';
      this.offset = i + 1;
      return line;
    }
  }
  //line split over multiple chunks
  this.line += chunk.toString('ascii', this.offset, this.end);
  this.offset = this.end;
};

var headerExp = /^([^: \t]+):[ \t]*((?:.*[^ \t])|)/;
var headerContinueExp = /^[ \t]+(.*[^ \t])/;
HTTPParser.prototype.parseHeader = function (line, headers) {
  var match = headerExp.exec(line);
  var k = match && match[1];
  if (k) { // skip empty string (malformed header)
    headers.push(k);
    headers.push(match[2]);
  } else {
    var matchContinue = headerContinueExp.exec(line);
    if (matchContinue && headers.length) {
      if (headers[headers.length - 1]) {
        headers[headers.length - 1] += ' ';
      }
      headers[headers.length - 1] += matchContinue[1];
    }
  }
};

var requestExp = /^([A-Z-]+) ([^ ]+) HTTP\/(\d)\.(\d)$/;
HTTPParser.prototype.REQUEST_LINE = function () {
  var line = this.consumeLine();
  if (!line) {
    return;
  }
  var match = requestExp.exec(line);
  if (match === null) {
    var err = new Error('Parse Error');
    err.code = 'HPE_INVALID_CONSTANT';
    throw err;
  }
  this.info.method = this._compatMode ? match[1] : methods.indexOf(match[1]);
  if (this.info.method === -1) {
    throw new Error('invalid request method');
  }
  if (match[1] === 'CONNECT') {
    this.info.upgrade = true;
  }
  this.info.url = match[2];
  this.info.versionMajor = +match[3];
  this.info.versionMinor = +match[4];
  this.body_bytes = 0;
  this.state = 'HEADER';
};

var responseExp = /^HTTP\/(\d)\.(\d) (\d{3}) ?(.*)$/;
HTTPParser.prototype.RESPONSE_LINE = function () {
  var line = this.consumeLine();
  if (!line) {
    return;
  }
  var match = responseExp.exec(line);
  if (match === null) {
    var err = new Error('Parse Error');
    err.code = 'HPE_INVALID_CONSTANT';
    throw err;
  }
  this.info.versionMajor = +match[1];
  this.info.versionMinor = +match[2];
  var statusCode = this.info.statusCode = +match[3];
  this.info.statusMessage = match[4];
  // Implied zero length.
  if ((statusCode / 100 | 0) === 1 || statusCode === 204 || statusCode === 304) {
    this.body_bytes = 0;
  }
  this.state = 'HEADER';
};

HTTPParser.prototype.shouldKeepAlive = function () {
  if (this.info.versionMajor > 0 && this.info.versionMinor > 0) {
    if (this.connection.indexOf('close') !== -1) {
      return false;
    }
  } else if (this.connection.indexOf('keep-alive') === -1) {
    return false;
  }
  if (this.body_bytes !== null || this.isChunked) { // || skipBody
    return true;
  }
  return false;
};

HTTPParser.prototype.HEADER = function () {
  var line = this.consumeLine();
  if (line === undefined) {
    return;
  }
  if (line) {
    this.parseHeader(line, this.info.headers);
  } else {
    var headers = this.info.headers;
    for (var i = 0; i < headers.length; i += 2) {
      switch (headers[i].toLowerCase()) {
        case 'transfer-encoding':
          this.isChunked = headers[i + 1].toLowerCase() === 'chunked';
          break;
        case 'content-length':
          this.body_bytes = +headers[i + 1];
          break;
        case 'connection':
          this.connection += headers[i + 1].toLowerCase();
          break;
        case 'upgrade':
          this.info.upgrade = true;
          break;
      }
    }
    
    this.info.shouldKeepAlive = this.shouldKeepAlive();
    //problem which also exists in original node: we should know skipBody before calling onHeadersComplete
    var skipBody = this.userCall()(this[kOnHeadersComplete](this.info));
    
    if (this.info.upgrade) {
      this.nextRequest();
      return true;
    } else if (this.isChunked && !skipBody) {
      this.state = 'BODY_CHUNKHEAD';
    } else if (skipBody || this.body_bytes === 0) {
      this.nextRequest();
    } else if (this.body_bytes === null) {
      this.state = 'BODY_RAW';
    } else {
      this.state = 'BODY_SIZED';
    }
  }
};

HTTPParser.prototype.BODY_CHUNKHEAD = function () {
  var line = this.consumeLine();
  if (line === undefined) {
    return;
  }
  this.body_bytes = parseInt(line, 16);
  if (!this.body_bytes) {
    this.state = 'BODY_CHUNKTRAILERS';
  } else {
    this.state = 'BODY_CHUNK';
  }
};

HTTPParser.prototype.BODY_CHUNK = function () {
  var length = Math.min(this.end - this.offset, this.body_bytes);
  this.userCall()(this[kOnBody](this.chunk, this.offset, length));
  this.offset += length;
  this.body_bytes -= length;
  if (!this.body_bytes) {
    this.state = 'BODY_CHUNKEMPTYLINE';
  }
};

HTTPParser.prototype.BODY_CHUNKEMPTYLINE = function () {
  var line = this.consumeLine();
  if (line === undefined) {
    return;
  }
  assert.equal(line, '');
  this.state = 'BODY_CHUNKHEAD';
};

HTTPParser.prototype.BODY_CHUNKTRAILERS = function () {
  var line = this.consumeLine();
  if (line === undefined) {
    return;
  }
  if (line) {
    this.parseHeader(line, this.trailers);
  } else {
    if (this.trailers.length) {
      this.userCall()(this[kOnHeaders](this.trailers, this.info.url));
    }
    this.nextRequest();
  }
};

HTTPParser.prototype.BODY_RAW = function () {
  var length = this.end - this.offset;
  this.userCall()(this[kOnBody](this.chunk, this.offset, length));
  this.offset = this.end;
};

HTTPParser.prototype.BODY_SIZED = function () {
  var length = Math.min(this.end - this.offset, this.body_bytes);
  this.userCall()(this[kOnBody](this.chunk, this.offset, length));
  this.offset += length;
  this.body_bytes -= length;
  if (!this.body_bytes) {
    this.nextRequest();
  }
};

// backward compat to node < 0.11.6
['Headers', 'HeadersComplete', 'Body', 'MessageComplete'].forEach(function (name) {
  var k = HTTPParser['kOn' + name];
  Object.defineProperty(HTTPParser.prototype, 'on' + name, {
    get: function () {
      return this[k];
    },
    set: function (to) {
      // hack for backward compatibility
      this._compatMode = true;
      return (this[k] = to);
    }
  });
});

},{"assert":1}],67:[function(require,module,exports){
(function (Buffer){
var through = require('through2');
var writeonly = require('write-only-stream');
var readonly = require('read-only-stream');
var defined = require('defined');

var SHA = require('sha.js/sha256')
var IDB = require('idb-blob-store');

module.exports = CA;

function CA (opts) {
    if (!(this instanceof CA)) return new CA(opts);
    var self = this;
    this._idb = new IDB(opts);
}

CA.prototype.createWriteStream = function (opts, cb) {
    var self = this;
    if (!opts) opts = {};
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (typeof opts !== 'object') opts = {};
    if (!cb) cb = function () {};
    
    var kbytes = window.crypto.getRandomValues(new Uint8Array(32));
    var params = {
        key: Buffer(kbytes).toString('hex'),
        size: opts.size
    };
    
    var h = new SHA;
    var hash = null;
    var w = through(write, end);
    var outer = writeonly(w);
    
    w.pipe(this._idb.createWriteStream(params, function (err, meta) {
        if (err) return cb(err);
        self.exists(hash, function (err, ex) {
            if (err) cb(err)
            else if (ex) remove()
            else create()
        });
        function remove () {
            self.remove(params.key, function (err) {
                if (err) cb(err)
                else cb(null, { key: hash, size: meta.size });
            });
        }
        function create () {
            self._idb._put(hash, meta.key, function (err) {
                if (err) return cb(err)
                outer.size = meta.size;
                cb(null, { key: hash, size: meta.size });
            });
        }
    }));
    return outer;
    
    function write (buf, enc, next) {
        h.update(buf);
        this.push(buf);
        next();
    }
    function end () {
        hash = h.digest().toString('hex');
        outer.key = hash;
        this.push(null);
    }
};

CA.prototype.createReadStream = function (opts) {
    var self = this;
    if (typeof opts === 'string') opts = { key: opts };
    if (!opts) opts = {};
    var key = opts.key || 'undefined';
    var stream = through();
    
    self._idb._get(key, function (err, value) {
        if (err) stream.emit('error', err);
        else if (value) {
            var r = self._idb.createReadStream(value);
            r.on('error', function (err) { stream.emit('error', err) });
            r.pipe(stream);
        }
        else stream.emit('error', new Error('key not found: ' + key));
    });
    return readonly(stream);
};

CA.prototype.exists = function (opts, cb) {
    var self = this;
    if (typeof opts === 'string') opts = { key: opts };
    var key = defined(opts.key, 'undefined');
    self._idb._get(key, function (err, value) {
        if (err) return cb(err);
        if (value === undefined) return cb(null, false);
        self._idb.exists(value, cb);
    });
};

CA.prototype.remove = function (opts, cb) {
    var self = this;
    if (typeof opts === 'string') opts = { key: opts };
    var key = defined(opts.key, 'undefined');
    self._idb._get(key, function (err, value) {
        if (err) cb(err)
        else self._idb.remove(value, cb)
    });
};

}).call(this,require("buffer").Buffer)
},{"buffer":3,"defined":68,"idb-blob-store":69,"read-only-stream":82,"sha.js/sha256":96,"through2":107,"write-only-stream":108}],68:[function(require,module,exports){
module.exports = function () {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== undefined) return arguments[i];
    }
};

},{}],69:[function(require,module,exports){
(function (process,Buffer){
module.exports = IDB;

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var through = require('through2');
var writeonly = require('write-only-stream');
var readonly = require('read-only-stream');
var defined = require('defined');
var pack = require('lexicographic-integer').pack;
var Block = require('block-stream2');
var Readable = require('readable-stream').Readable;

var idb = window.indexedDB || window.mozIndexedDB
    || window.webkitIndexedDB || window.msIndexedDB
;

module.exports = IDB;
inherits(IDB, EventEmitter);

function IDB (opts) {
    if (!(this instanceof IDB)) return new IDB(opts);
    EventEmitter.call(this);
    
    var self = this;
    if (typeof opts === 'string') opts = { name: opts };
    if (!opts) opts = {};
    self._ready = false;
    if (!opts.name) opts.name = 'idb-blob-store';
    
    var request = idb.open(opts.name);
    request.addEventListener('upgradeneeded', function () {
        var db = request.result;
        db.createObjectStore('blobs'); 
    });
    request.addEventListener('success', function () {
        self.db = request.result;
        self.emit('ready');
    });
}

IDB.prototype._store = function (mode, cb) {
    var self = this;
    if (!self.db) return self.once('ready', ready);
    else process.nextTick(ready)
    
    function ready () {
        var trans = self.db.transaction(['blobs'], mode);
        var store = trans.objectStore('blobs');
        trans.addEventListener('error', function (err) { cb(err) });
        cb(null, store)
    }
};

IDB.prototype._put = function (key, value, cb) {
    this._store('readwrite', function (err, store) {
        if (err) return cb(err);
        backify(store.put(value, key), wait(store, cb));
    });
};

function wait (store, cb) {
    var pending = 2;
    store.transaction.addEventListener('complete', done);
    return function (err) {
        if (err) cb(err)
        else done()
    };
    function done () { if (-- pending === 0) cb(null) }
}


IDB.prototype._get = function (key, cb) {
    this._store('readonly', function (err, store) {
        if (err) cb(err)
        else backify(store.get(key), function (err, ev) {
            if (err) cb(err)
            else cb(null, ev.target.result)
        });
    });
};

IDB.prototype._del = function (key, cb) {
    this._store('readwrite', function (err, store) {
        if (err) cb(err)
        else backify(store.delete(key), wait(store, cb));
    });
};

IDB.prototype.createWriteStream = function (opts, cb) {
    var self = this;
    if (!opts) opts = {};
    if (typeof opts === 'string') opts = { key: opts };
    
    var key = defined(opts.key, 'undefined');
    var size = opts.size || 1024 * 16;
    var pos = 0;
    var pending = 1;
    
    var block = new Block(size, { nopad: true });
    
    self.exists(key, function (err, ex) {
        if (err) return cb(err);
        else if (ex) self.remove(key, function (err) {
            if (err) cb(err)
            else ready()
        })
        else ready()
    });
    
    function ready () {
        block.pipe(through(write, end));
    }
    
    var w = writeonly(block);
    w.key = key;
    if (cb) w.once('error', cb);
    return w;
    
    function write (buf, enc, next) {
        pending ++;
        self._put(key + '!' + pack(pos, 'hex'), buf, function (err) {
            if (err) w.emit('error', err)
            else if (-- pending === 0) done()
        });
        pos += buf.length;
        next();
    }
    
    function end () {
        self._put(key + '!', { size: size, length: pos }, function (err) {
            if (err) w.emit('error', err)
            else if (-- pending === 0) done()
        });
    }
    
    function done () {
        if (cb) cb(null, { key: key, size: pos })
    }
};

IDB.prototype.createReadStream = function (opts) {
    var self = this;
    var r = new Readable;
    var cursor;
    r._read = function () { if (cursor) cursor.continue() };
    
    if (typeof opts === 'string') opts = { key: opts };
    if (!opts) opts = {};
    
    var key = defined(opts.key, 'undefined');
    var range = IDBKeyRange.bound(key + '!0', key + '!~', true, true);
    
    self._store('readonly', function (err, store) {
        if (err) return r.emit('error', err);
        var cur = store.openCursor(range);
        var times = 0;
        
        backify(cur, function (err, ev) {
            if (err) return r.emit('error', err)
            cursor = ev.target.result;
            if (times === 0 && !cursor) {
                r.emit('error', new Error('key not found: ' + key));
            }
            else if (cursor) {
                r.push(Buffer(cursor.value));
            }
            else r.push(null)
            times ++;
        });
    });
    return r;
};

IDB.prototype.exists = function (opts, cb) {
    var self = this;
    if (!cb) cb = function () {};
    if (typeof opts === 'string') opts = { key: opts };
    if (!opts) opts = {};
    var range = IDBKeyRange.only(opts.key + '!');
    
    self._store('readonly', function (err, store) {
        if (err) return cb(err);
        backify(store.openCursor(range), function (err, ev) {
            if (err) cb(err)
            else if (ev.target.result) cb(null, true)
            else cb(null, false)
        });
    });
};

IDB.prototype.remove = function (opts, cb) {
    var self = this;
    if (typeof opts === 'string') opts = { key: opts };
    if (!opts) opts = {};
    var pending = 1;
    var key = opts.key;
    
    self._get(key + '!', function (err, value) {
        if (err) return cb(err);
        if (!value) return cb(null, new Error('not found'));
        self._del(key + '!', callback);
        
        var max = Math.ceil(value.length / value.size) * value.size;
        for (var i = 0; i < max; i += value.size) {
            var ikey = key + '!' + pack(i, 'hex');
            pending ++;
            self._del(ikey, callback);
        }
        function callback (err) {
            if (err) { cb(err); cb = function () {} }
            else if (-- pending === 0 && cb) cb(null);
        }
    });
};

function backify (r, cb) {
    r.addEventListener('success', function (ev) { cb(null, ev) });
    r.addEventListener('error', function (err) { cb(err) });
}

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":11,"block-stream2":70,"buffer":3,"defined":68,"events":8,"inherits":71,"lexicographic-integer":72,"read-only-stream":82,"readable-stream":81,"through2":107,"write-only-stream":108}],70:[function(require,module,exports){
(function (Buffer){
var inherits = require('inherits');
var Transform = require('readable-stream').Transform;
var defined = require('defined');

module.exports = Block;
inherits(Block, Transform);

function Block (size, opts) {
    if (!(this instanceof Block)) return new Block(size, opts);
    Transform.call(this);
    if (!opts) opts = {};
    if (typeof size === 'object') {
        opts = size;
        size = opts.size;
    }
    this.size = size || 512;
    
    if (opts.nopad) this._zeroPadding = false;
    else this._zeroPadding = defined(opts.zeroPadding, true);
    
    this._buffered = [];
    this._bufferedBytes = 0;
}

Block.prototype._transform = function (buf, enc, next) {
    this._bufferedBytes += buf.length;
    this._buffered.push(buf);
    
    while (this._bufferedBytes >= this.size) {
        var b = Buffer.concat(this._buffered);
        this._bufferedBytes -= this.size;
        this.push(b.slice(0, this.size));
        this._buffered = [ b.slice(this.size, b.length) ];
    }
    next();
};

Block.prototype._flush = function () {
    if (this._bufferedBytes && this._zeroPadding) {
        var zeroes = new Buffer(this.size - this._bufferedBytes);
        zeroes.fill(0);
        this._buffered.push(zeroes);
        this.push(Buffer.concat(this._buffered));
        this._buffered = null;
    }
    else if (this._bufferedBytes) {
        this.push(Buffer.concat(this._buffered));
        this._buffered = null;
    }
    this.push(null);
};

}).call(this,require("buffer").Buffer)
},{"buffer":3,"defined":68,"inherits":71,"readable-stream":81}],71:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],72:[function(require,module,exports){
exports.pack = pack;
exports.unpack = unpack;

function pack (n, enc) {
    n = Math.floor(n);
    if (n < 0 || n === Infinity) return undefined;
    
    var bytes;
    var max = 251;
    var x = n - max;
    
    if (n < max) {
        bytes = [ n ];
    }
    else if (x < 256) {
        bytes = [ max, x ];
    }
    else if (x < 256*256) {
        bytes = [ max + 1, Math.floor(x / 256), x % 256 ];
    }
    else if (x < 256*256*256) {
        bytes = [
            max + 2,
            Math.floor(x / 256 / 256),
            Math.floor(x / 256) % 256,
            x % 256
        ];
    }
    else if (x < 256*256*256*256) {
        bytes = [
            max + 3,
            Math.floor(x / 256 / 256 / 256),
            Math.floor(x / 256 / 256) % 256,
            Math.floor(x / 256) % 256,
            x % 256
        ];
    }
    else {
        var exp = Math.floor(Math.log(x) / Math.log(2)) - 32;
        bytes = [ 255 ];
        bytes.push.apply(bytes, pack(exp));
        var res = x / Math.pow(2, exp - 11);
        bytes.push.apply(bytes, bytesOf(x / Math.pow(2, exp - 11)));
    }
    if (enc === undefined || enc === 'array') return bytes;
    if (enc === 'hex') return encodeHex(bytes);
};

function unpack (xs) {
    if (typeof xs === 'string') xs = decodeHex(xs);
    if (!Array.isArray(xs)) return undefined;
    
    if (xs.length === 1 && xs[0] < 251) {
        return xs[0];
    }
    if (xs.length === 2 && xs[0] === 251) {
        return 251 + xs[1];
    }
    if (xs.length === 3 && xs[0] === 252) {
        return 251 + 256 * xs[1] + xs[2];
    }
    if (xs.length === 4 && xs[0] === 253) {
        return 251 + 256 * 256 * xs[1] + 256 * xs[2] + xs[3];
    }
    if (xs.length === 5 && xs[0] === 254) {
        return 251 + 256 * 256 * 256 * xs[1]
            + 256 * 256 * xs[2] + 256 * xs[3] + xs[4]
        ;
    }
    if (xs.length > 5 && xs[0] === 255) {
        var m = 0, x = 1;
        var pivot = Math.max(2, xs.length - 6);
        for (var i = xs.length - 1; i >= pivot; i--) {
            m += x * xs[i];
            x *= 256;
        }
        if (xs[1] + 32 < 251) {
            var n = unpack([ xs[1] + 32 ]) - 11;
        }
        else if (xs[0] === 255 && xs[1] < 251) {
            var n = xs[1] + 21;
        }
        else if (pivot === 3) {
            var n = unpack([ xs[1], xs[2] + 21 ]);
        }
        else if (pivot === 4) {
            var n = unpack([ xs[1], xs[2], xs[3] + 21 ]);
        }
        return 251 + m / Math.pow(2, 32 - n);
    }
    return undefined;
}

function encodeHex(bytes) {
    var s = '';
    for (var i = 0, l = bytes.length; i < l; i++) {
        var b = bytes[i];
        var c = b.toString(16);
        if (b < 16) c = '0' + c;
        s += c;
    }
    return s;
}

function decodeHex(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i = i+2) {
        bytes.push(parseInt(hex[i] + hex[i+1], 16));
    }
    return bytes;
}

function bytesOf (x) {
    x = Math.floor(x);
    var bytes = [];
    for (var i = 0, d = 1; i < 6; i++, d *= 256) {
        bytes.unshift(Math.floor(x / d) % 256);
    }
    return bytes;
}

},{}],73:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":75,"./_stream_writable":77,"_process":11,"core-util-is":78,"dup":17,"inherits":71}],74:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./_stream_transform":76,"core-util-is":78,"dup":18,"inherits":71}],75:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./_stream_duplex":73,"_process":11,"buffer":3,"core-util-is":78,"dup":19,"events":8,"inherits":71,"isarray":79,"stream":27,"string_decoder/":80,"util":2}],76:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./_stream_duplex":73,"core-util-is":78,"dup":20,"inherits":71}],77:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./_stream_duplex":73,"_process":11,"buffer":3,"core-util-is":78,"dup":21,"inherits":71,"stream":27}],78:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],79:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],80:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],81:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"./lib/_stream_duplex.js":73,"./lib/_stream_passthrough.js":74,"./lib/_stream_readable.js":75,"./lib/_stream_transform.js":76,"./lib/_stream_writable.js":77,"dup":24,"stream":27}],82:[function(require,module,exports){
var Readable = require('readable-stream/readable');
var rwrap = require('readable-wrap');

module.exports = function (stream) {
    var opts = stream._readableState;
    if (typeof stream.read !== 'function') stream = rwrap(stream, opts);
    
    var ro = new Readable({ objectMode: opts && opts.objectMode });
    var waiting = false;
    
    stream.on('readable', function () {
        if (waiting) {
            waiting = false;
            ro._read();
        }
    });
    
    ro._read = function () {
        var buf, reads = 0;
        while ((buf = stream.read()) !== null) {
            ro.push(buf);
            reads ++;
        }
        if (reads === 0) waiting = true;
    };
    stream.once('end', function () { ro.push(null) });
    stream.on('error', function (err) { ro.emit('error', err) });
    return ro;
};

},{"readable-stream/readable":92,"readable-wrap":93}],83:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":85,"./_stream_writable":87,"_process":11,"core-util-is":88,"dup":17,"inherits":89}],84:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./_stream_transform":86,"core-util-is":88,"dup":18,"inherits":89}],85:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./_stream_duplex":83,"_process":11,"buffer":3,"core-util-is":88,"dup":19,"events":8,"inherits":89,"isarray":90,"stream":27,"string_decoder/":91,"util":2}],86:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./_stream_duplex":83,"core-util-is":88,"dup":20,"inherits":89}],87:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./_stream_duplex":83,"_process":11,"buffer":3,"core-util-is":88,"dup":21,"inherits":89,"stream":27}],88:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],89:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],90:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],91:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],92:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"./lib/_stream_duplex.js":83,"./lib/_stream_passthrough.js":84,"./lib/_stream_readable.js":85,"./lib/_stream_transform.js":86,"./lib/_stream_writable.js":87,"dup":24,"stream":27}],93:[function(require,module,exports){
var Readable = require('readable-stream').Readable;

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
module.exports = wrap;
module.exports.obj = function (stream, opts) {
  if (!opts) opts = {};
  opts.objectMode = true;
  return wrap(stream, opts);
};

function wrap (stream, opts) {
  var self = new Readable(opts)
  var state = self._readableState;
  var paused = false;

  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    //if (state.objectMode && util.isNullOrUndefined(chunk))
    if (state.objectMode && (chunk === null || chunk === undefined))
      return
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof self[i] === 'undefined') {
      self[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  for (var i = 0; i < events.length; i++) (function (ev) {
    stream.on(ev, function () {
      var args = [ ev ].concat([].slice.call(arguments));
      self.emit.apply(self, args);
    })
  })(events[i]);

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

},{"readable-stream":92}],94:[function(require,module,exports){
(function (Buffer){
// prototype class for hash functions
function Hash (blockSize, finalSize) {
  this._block = new Buffer(blockSize)
  this._finalSize = finalSize
  this._blockSize = blockSize
  this._len = 0
  this._s = 0
}

Hash.prototype.update = function (data, enc) {
  if (typeof data === 'string') {
    enc = enc || 'utf8'
    data = new Buffer(data, enc)
  }

  var l = this._len += data.length
  var s = this._s || 0
  var f = 0
  var buffer = this._block

  while (s < l) {
    var t = Math.min(data.length, f + this._blockSize - (s % this._blockSize))
    var ch = (t - f)

    for (var i = 0; i < ch; i++) {
      buffer[(s % this._blockSize) + i] = data[i + f]
    }

    s += ch
    f += ch

    if ((s % this._blockSize) === 0) {
      this._update(buffer)
    }
  }
  this._s = s

  return this
}

Hash.prototype.digest = function (enc) {
  // Suppose the length of the message M, in bits, is l
  var l = this._len * 8

  // Append the bit 1 to the end of the message
  this._block[this._len % this._blockSize] = 0x80

  // and then k zero bits, where k is the smallest non-negative solution to the equation (l + 1 + k) === finalSize mod blockSize
  this._block.fill(0, this._len % this._blockSize + 1)

  if (l % (this._blockSize * 8) >= this._finalSize * 8) {
    this._update(this._block)
    this._block.fill(0)
  }

  // to this append the block which is equal to the number l written in binary
  // TODO: handle case where l is > Math.pow(2, 29)
  this._block.writeInt32BE(l, this._blockSize - 4)

  var hash = this._update(this._block) || this._hash()

  return enc ? hash.toString(enc) : hash
}

Hash.prototype._update = function () {
  throw new Error('_update must be implemented by subclass')
}

module.exports = Hash

}).call(this,require("buffer").Buffer)
},{"buffer":3}],95:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],96:[function(require,module,exports){
(function (Buffer){
/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = require('inherits')
var Hash = require('./hash')

var K = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
]

var W = new Array(64)

function Sha256 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha256, Hash)

Sha256.prototype.init = function () {
  this._a = 0x6a09e667 | 0
  this._b = 0xbb67ae85 | 0
  this._c = 0x3c6ef372 | 0
  this._d = 0xa54ff53a | 0
  this._e = 0x510e527f | 0
  this._f = 0x9b05688c | 0
  this._g = 0x1f83d9ab | 0
  this._h = 0x5be0cd19 | 0

  return this
}

function Ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function Maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function Sigma0 (x) {
  return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10)
}

function Sigma1 (x) {
  return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7)
}

function Gamma0 (x) {
  return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)
}

function Gamma1 (x) {
  return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ (x >>> 10)
}

Sha256.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0
  var f = this._f | 0
  var g = this._g | 0
  var h = this._h | 0

  var j = 0

  function calcW () { return Gamma1(W[j - 2]) + W[j - 7] + Gamma0(W[j - 15]) + W[j - 16] }
  function loop (w) {
    W[j] = w

    var T1 = h + Sigma1(e) + Ch(e, f, g) + K[j] + w
    var T2 = Sigma0(a) + Maj(a, b, c)

    h = g
    g = f
    f = e
    e = d + T1
    d = c
    c = b
    b = a
    a = T1 + T2

    j++
  }

  while (j < 16) loop(M.readInt32BE(j * 4))
  while (j < 64) loop(calcW())

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
  this._f = (f + this._f) | 0
  this._g = (g + this._g) | 0
  this._h = (h + this._h) | 0
}

Sha256.prototype._hash = function () {
  var H = new Buffer(32)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)
  H.writeInt32BE(this._h, 28)

  return H
}

module.exports = Sha256

}).call(this,require("buffer").Buffer)
},{"./hash":94,"buffer":3,"inherits":95}],97:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":98,"./_stream_writable":100,"_process":11,"core-util-is":101,"dup":17,"inherits":102}],98:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;
  var ret;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    ret = null;

    // In cases where the decoder did not receive enough data
    // to produce a full chunk, then immediately received an
    // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
    // howMuchToRead will see this and coerce the amount to
    // read to zero (because it's looking at the length of the
    // first <Buffer > in state.buffer), and we'll end up here.
    //
    // This can only happen via state.decoder -- no other venue
    // exists for pushing a zero-length chunk into state.buffer
    // and triggering this behavior. In this case, we return our
    // remaining data and end the stream, if appropriate.
    if (state.length > 0 && state.decoder) {
      ret = fromList(n, state);
      state.length -= ret.length;
    }

    if (state.length === 0)
      endReadable(this);

    return ret;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    process.nextTick(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    process.nextTick(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      process.nextTick(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    //if (state.objectMode && util.isNullOrUndefined(chunk))
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"_process":11,"buffer":3,"core-util-is":101,"events":8,"inherits":102,"isarray":103,"stream":27,"string_decoder/":104}],99:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":97,"core-util-is":101,"inherits":102}],100:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      cb(er);
    });
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require('_process'))
},{"./_stream_duplex":97,"_process":11,"buffer":3,"core-util-is":101,"inherits":102,"stream":27}],101:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],102:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],103:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],104:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],105:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"./lib/_stream_transform.js":99,"dup":25}],106:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],107:[function(require,module,exports){
(function (process){
var Transform = require('readable-stream/transform')
  , inherits  = require('util').inherits
  , xtend     = require('xtend')

function DestroyableTransform(opts) {
  Transform.call(this, opts)
  this._destroyed = false
}

inherits(DestroyableTransform, Transform)

DestroyableTransform.prototype.destroy = function(err) {
  if (this._destroyed) return
  this._destroyed = true
  
  var self = this
  process.nextTick(function() {
    if (err)
      self.emit('error', err)
    self.emit('close')
  })
}

// a noop _transform function
function noop (chunk, enc, callback) {
  callback(null, chunk)
}


// create a new export function, used by both the main export and
// the .ctor export, contains common logic for dealing with arguments
function through2 (construct) {
  return function (options, transform, flush) {
    if (typeof options == 'function') {
      flush     = transform
      transform = options
      options   = {}
    }

    if (typeof transform != 'function')
      transform = noop

    if (typeof flush != 'function')
      flush = null

    return construct(options, transform, flush)
  }
}


// main export, just make me a transform stream!
module.exports = through2(function (options, transform, flush) {
  var t2 = new DestroyableTransform(options)

  t2._transform = transform

  if (flush)
    t2._flush = flush

  return t2
})


// make me a reusable prototype that I can `new`, or implicitly `new`
// with a constructor call
module.exports.ctor = through2(function (options, transform, flush) {
  function Through2 (override) {
    if (!(this instanceof Through2))
      return new Through2(override)

    this.options = xtend(options, override)

    DestroyableTransform.call(this, this.options)
  }

  inherits(Through2, DestroyableTransform)

  Through2.prototype._transform = transform

  if (flush)
    Through2.prototype._flush = flush

  return Through2
})


module.exports.obj = through2(function (options, transform, flush) {
  var t2 = new DestroyableTransform(xtend({ objectMode: true, highWaterMark: 16 }, options))

  t2._transform = transform

  if (flush)
    t2._flush = flush

  return t2
})

}).call(this,require('_process'))
},{"_process":11,"readable-stream/transform":105,"util":32,"xtend":106}],108:[function(require,module,exports){
var Writable = require('readable-stream/writable');

module.exports = function (stream) {
    var opts = stream._writableState;
    var compat = typeof stream._write !== 'function';
    var wo = new Writable({ objectMode: opts && opts.objectMode });
    
    wo._write = function (buf, enc, next) {
        if (compat) {
            stream.write(buf);
            next();
        }
        else stream._write(buf, enc, next);
    };
    
    wo.once('finish', function () {
        stream.end();
    });
    
    stream.on('error', function (err) {
        wo.emit('error', err);
    });
    return wo;
};

},{"readable-stream/writable":116}],109:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":110,"./_stream_writable":111,"_process":11,"core-util-is":112,"dup":17,"inherits":113}],110:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./_stream_duplex":109,"_process":11,"buffer":3,"core-util-is":112,"dup":19,"events":8,"inherits":113,"isarray":114,"stream":27,"string_decoder/":115,"util":2}],111:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./_stream_duplex":109,"_process":11,"buffer":3,"core-util-is":112,"dup":21,"inherits":113,"stream":27}],112:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],113:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],114:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],115:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],116:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"./lib/_stream_writable.js":111,"dup":26}],117:[function(require,module,exports){

var Leveljs = require('level-js')

module.exports = require('level-packager')(function(l) {
  return new Leveljs(l)
})

},{"level-js":118,"level-packager":134}],118:[function(require,module,exports){
(function (Buffer){
module.exports = Level

var IDB = require('idb-wrapper')
var AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN
var util = require('util')
var Iterator = require('./iterator')
var isBuffer = require('isbuffer')
var xtend = require('xtend')
var toBuffer = require('typedarray-to-buffer')

function Level(location) {
  if (!(this instanceof Level)) return new Level(location)
  if (!location) throw new Error("constructor requires at least a location argument")
  this.IDBOptions = {}
  this.location = location
}

util.inherits(Level, AbstractLevelDOWN)

Level.prototype._open = function(options, callback) {
  var self = this
    
  var idbOpts = {
    storeName: this.location,
    autoIncrement: false,
    keyPath: null,
    onStoreReady: function () {
      callback && callback(null, self.idb)
    }, 
    onError: function(err) {
      callback && callback(err)
    }
  }
  
  xtend(idbOpts, options)
  this.IDBOptions = idbOpts
  this.idb = new IDB(idbOpts)
}

Level.prototype._get = function (key, options, callback) {
  this.idb.get(key, function (value) {
    if (value === undefined) {
      // 'NotFound' error, consistent with LevelDOWN API
      return callback(new Error('NotFound'))
    }
    // by default return buffers, unless explicitly told not to
    var asBuffer = true
    if (options.asBuffer === false) asBuffer = false
    if (options.raw) asBuffer = false
    if (asBuffer) {
      if (value instanceof Uint8Array) value = toBuffer(value)
      else value = new Buffer(String(value))
    }
    return callback(null, value, key)
  }, callback)
}

Level.prototype._del = function(id, options, callback) {
  this.idb.remove(id, callback, callback)
}

Level.prototype._put = function (key, value, options, callback) {
  if (value instanceof ArrayBuffer) {
    value = toBuffer(new Uint8Array(value))
  }
  var obj = this.convertEncoding(key, value, options)
  if (Buffer.isBuffer(obj.value)) {
    obj.value = new Uint8Array(value.toArrayBuffer())
  }
  this.idb.put(obj.key, obj.value, function() { callback() }, callback)
}

Level.prototype.convertEncoding = function(key, value, options) {
  if (options.raw) return {key: key, value: value}
  if (value) {
    var stringed = value.toString()
    if (stringed === 'NaN') value = 'NaN'
  }
  var valEnc = options.valueEncoding
  var obj = {key: key, value: value}
  if (value && (!valEnc || valEnc !== 'binary')) {
    if (typeof obj.value !== 'object') {
      obj.value = stringed
    }
  }
  return obj
}

Level.prototype.iterator = function (options) {
  if (typeof options !== 'object') options = {}
  return new Iterator(this.idb, options)
}

Level.prototype._batch = function (array, options, callback) {
  var op
  var i
  var k
  var copiedOp
  var currentOp
  var modified = []
  
  if (array.length === 0) return setTimeout(callback, 0)
  
  for (i = 0; i < array.length; i++) {
    copiedOp = {}
    currentOp = array[i]
    modified[i] = copiedOp
    
    var converted = this.convertEncoding(currentOp.key, currentOp.value, options)
    currentOp.key = converted.key
    currentOp.value = converted.value

    for (k in currentOp) {
      if (k === 'type' && currentOp[k] == 'del') {
        copiedOp[k] = 'remove'
      } else {
        copiedOp[k] = currentOp[k]
      }
    }
  }

  return this.idb.batch(modified, function(){ callback() }, callback)
}

Level.prototype._close = function (callback) {
  this.idb.db.close()
  callback()
}

Level.prototype._approximateSize = function (start, end, callback) {
  var err = new Error('Not implemented')
  if (callback)
    return callback(err)

  throw err
}

Level.prototype._isBuffer = function (obj) {
  return Buffer.isBuffer(obj)
}

Level.destroy = function (db, callback) {
  if (typeof db === 'object') {
    var prefix = db.IDBOptions.storePrefix || 'IDBWrapper-'
    var dbname = db.location
  } else {
    var prefix = 'IDBWrapper-'
    var dbname = db
  }
  var request = indexedDB.deleteDatabase(prefix + dbname)
  request.onsuccess = function() {
    callback()
  }
  request.onerror = function(err) {
    callback(err)
  }
}

var checkKeyValue = Level.prototype._checkKeyValue = function (obj, type) {
  if (obj === null || obj === undefined)
    return new Error(type + ' cannot be `null` or `undefined`')
  if (obj === null || obj === undefined)
    return new Error(type + ' cannot be `null` or `undefined`')
  if (isBuffer(obj) && obj.byteLength === 0)
    return new Error(type + ' cannot be an empty ArrayBuffer')
  if (String(obj) === '')
    return new Error(type + ' cannot be an empty String')
  if (obj.length === 0)
    return new Error(type + ' cannot be an empty Array')
}

}).call(this,require("buffer").Buffer)
},{"./iterator":119,"abstract-leveldown":122,"buffer":3,"idb-wrapper":124,"isbuffer":125,"typedarray-to-buffer":127,"util":32,"xtend":129}],119:[function(require,module,exports){
var util = require('util')
var AbstractIterator  = require('abstract-leveldown').AbstractIterator
var ltgt = require('ltgt')

module.exports = Iterator

function Iterator (db, options) {
  if (!options) options = {}
  this.options = options
  AbstractIterator.call(this, db)
  this._order = options.reverse ? 'DESC': 'ASC'
  this._limit = options.limit
  this._count = 0
  this._done  = false
  var lower = ltgt.lowerBound(options)
  var upper = ltgt.upperBound(options)
  this._keyRange = lower || upper ? this.db.makeKeyRange({
    lower: lower,
    upper: upper,
    excludeLower: ltgt.lowerBoundExclusive(options),
    excludeUpper: ltgt.upperBoundExclusive(options)
  }) : null
  this.callback = null
}

util.inherits(Iterator, AbstractIterator)

Iterator.prototype.createIterator = function() {
  var self = this

  self.iterator = self.db.iterate(function () {
    self.onItem.apply(self, arguments)
  }, {
    keyRange: self._keyRange,
    autoContinue: false,
    order: self._order,
    onError: function(err) { console.log('horrible error', err) },
  })
}

// TODO the limit implementation here just ignores all reads after limit has been reached
// it should cancel the iterator instead but I don't know how
Iterator.prototype.onItem = function (value, cursor, cursorTransaction) {
  if (!cursor && this.callback) {
    this.callback()
    this.callback = false
    return
  }
  var shouldCall = true

  if (!!this._limit && this._limit > 0 && this._count++ >= this._limit)
    shouldCall = false

  if (shouldCall) this.callback(false, cursor.key, cursor.value)
  if (cursor) cursor['continue']()
}

Iterator.prototype._next = function (callback) {
  if (!callback) return new Error('next() requires a callback argument')
  if (!this._started) {
    this.createIterator()
    this._started = true
  }
  this.callback = callback
}

},{"abstract-leveldown":122,"ltgt":126,"util":32}],120:[function(require,module,exports){
(function (process){
/* Copyright (c) 2013 Rod Vagg, MIT License */

function AbstractChainedBatch (db) {
  this._db         = db
  this._operations = []
  this._written    = false
}

AbstractChainedBatch.prototype._checkWritten = function () {
  if (this._written)
    throw new Error('write() already called on this batch')
}

AbstractChainedBatch.prototype.put = function (key, value) {
  this._checkWritten()

  var err = this._db._checkKeyValue(key, 'key', this._db._isBuffer)
  if (err) throw err
  err = this._db._checkKeyValue(value, 'value', this._db._isBuffer)
  if (err) throw err

  if (!this._db._isBuffer(key)) key = String(key)
  if (!this._db._isBuffer(value)) value = String(value)

  if (typeof this._put == 'function' )
    this._put(key, value)
  else
    this._operations.push({ type: 'put', key: key, value: value })

  return this
}

AbstractChainedBatch.prototype.del = function (key) {
  this._checkWritten()

  var err = this._db._checkKeyValue(key, 'key', this._db._isBuffer)
  if (err) throw err

  if (!this._db._isBuffer(key)) key = String(key)

  if (typeof this._del == 'function' )
    this._del(key)
  else
    this._operations.push({ type: 'del', key: key })

  return this
}

AbstractChainedBatch.prototype.clear = function () {
  this._checkWritten()

  this._operations = []

  if (typeof this._clear == 'function' )
    this._clear()

  return this
}

AbstractChainedBatch.prototype.write = function (options, callback) {
  this._checkWritten()

  if (typeof options == 'function')
    callback = options
  if (typeof callback != 'function')
    throw new Error('write() requires a callback argument')
  if (typeof options != 'object')
    options = {}

  this._written = true

  if (typeof this._write == 'function' )
    return this._write(callback)

  if (typeof this._db._batch == 'function')
    return this._db._batch(this._operations, options, callback)

  process.nextTick(callback)
}

module.exports = AbstractChainedBatch
}).call(this,require('_process'))
},{"_process":11}],121:[function(require,module,exports){
(function (process){
/* Copyright (c) 2013 Rod Vagg, MIT License */

function AbstractIterator (db) {
  this.db = db
  this._ended = false
  this._nexting = false
}

AbstractIterator.prototype.next = function (callback) {
  var self = this

  if (typeof callback != 'function')
    throw new Error('next() requires a callback argument')

  if (self._ended)
    return callback(new Error('cannot call next() after end()'))
  if (self._nexting)
    return callback(new Error('cannot call next() before previous next() has completed'))

  self._nexting = true
  if (typeof self._next == 'function') {
    return self._next(function () {
      self._nexting = false
      callback.apply(null, arguments)
    })
  }

  process.nextTick(function () {
    self._nexting = false
    callback()
  })
}

AbstractIterator.prototype.end = function (callback) {
  if (typeof callback != 'function')
    throw new Error('end() requires a callback argument')

  if (this._ended)
    return callback(new Error('end() already called on iterator'))

  this._ended = true

  if (typeof this._end == 'function')
    return this._end(callback)

  process.nextTick(callback)
}

module.exports = AbstractIterator

}).call(this,require('_process'))
},{"_process":11}],122:[function(require,module,exports){
(function (process,Buffer){
/* Copyright (c) 2013 Rod Vagg, MIT License */

var xtend                = require('xtend')
  , AbstractIterator     = require('./abstract-iterator')
  , AbstractChainedBatch = require('./abstract-chained-batch')

function AbstractLevelDOWN (location) {
  if (!arguments.length || location === undefined)
    throw new Error('constructor requires at least a location argument')

  if (typeof location != 'string')
    throw new Error('constructor requires a location string argument')

  this.location = location
}

AbstractLevelDOWN.prototype.open = function (options, callback) {
  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('open() requires a callback argument')

  if (typeof options != 'object')
    options = {}

  if (typeof this._open == 'function')
    return this._open(options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.close = function (callback) {
  if (typeof callback != 'function')
    throw new Error('close() requires a callback argument')

  if (typeof this._close == 'function')
    return this._close(callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.get = function (key, options, callback) {
  var err

  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('get() requires a callback argument')

  if (err = this._checkKeyValue(key, 'key', this._isBuffer))
    return callback(err)

  if (!this._isBuffer(key))
    key = String(key)

  if (typeof options != 'object')
    options = {}

  if (typeof this._get == 'function')
    return this._get(key, options, callback)

  process.nextTick(function () { callback(new Error('NotFound')) })
}

AbstractLevelDOWN.prototype.put = function (key, value, options, callback) {
  var err

  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('put() requires a callback argument')

  if (err = this._checkKeyValue(key, 'key', this._isBuffer))
    return callback(err)

  if (err = this._checkKeyValue(value, 'value', this._isBuffer))
    return callback(err)

  if (!this._isBuffer(key))
    key = String(key)

  // coerce value to string in node, don't touch it in browser
  // (indexeddb can store any JS type)
  if (!this._isBuffer(value) && !process.browser)
    value = String(value)

  if (typeof options != 'object')
    options = {}

  if (typeof this._put == 'function')
    return this._put(key, value, options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.del = function (key, options, callback) {
  var err

  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('del() requires a callback argument')

  if (err = this._checkKeyValue(key, 'key', this._isBuffer))
    return callback(err)

  if (!this._isBuffer(key))
    key = String(key)

  if (typeof options != 'object')
    options = {}

  if (typeof this._del == 'function')
    return this._del(key, options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.batch = function (array, options, callback) {
  if (!arguments.length)
    return this._chainedBatch()

  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('batch(array) requires a callback argument')

  if (!Array.isArray(array))
    return callback(new Error('batch(array) requires an array argument'))

  if (typeof options != 'object')
    options = {}

  var i = 0
    , l = array.length
    , e
    , err

  for (; i < l; i++) {
    e = array[i]
    if (typeof e != 'object')
      continue

    if (err = this._checkKeyValue(e.type, 'type', this._isBuffer))
      return callback(err)

    if (err = this._checkKeyValue(e.key, 'key', this._isBuffer))
      return callback(err)

    if (e.type == 'put') {
      if (err = this._checkKeyValue(e.value, 'value', this._isBuffer))
        return callback(err)
    }
  }

  if (typeof this._batch == 'function')
    return this._batch(array, options, callback)

  process.nextTick(callback)
}

//TODO: remove from here, not a necessary primitive
AbstractLevelDOWN.prototype.approximateSize = function (start, end, callback) {
  if (   start == null
      || end == null
      || typeof start == 'function'
      || typeof end == 'function') {
    throw new Error('approximateSize() requires valid `start`, `end` and `callback` arguments')
  }

  if (typeof callback != 'function')
    throw new Error('approximateSize() requires a callback argument')

  if (!this._isBuffer(start))
    start = String(start)

  if (!this._isBuffer(end))
    end = String(end)

  if (typeof this._approximateSize == 'function')
    return this._approximateSize(start, end, callback)

  process.nextTick(function () {
    callback(null, 0)
  })
}

AbstractLevelDOWN.prototype._setupIteratorOptions = function (options) {
  var self = this

  options = xtend(options)

  ;[ 'start', 'end', 'gt', 'gte', 'lt', 'lte' ].forEach(function (o) {
    if (options[o] && self._isBuffer(options[o]) && options[o].length === 0)
      delete options[o]
  })

  options.reverse = !!options.reverse

  // fix `start` so it takes into account gt, gte, lt, lte as appropriate
  if (options.reverse && options.lt)
    options.start = options.lt
  if (options.reverse && options.lte)
    options.start = options.lte
  if (!options.reverse && options.gt)
    options.start = options.gt
  if (!options.reverse && options.gte)
    options.start = options.gte

  if ((options.reverse && options.lt && !options.lte)
    || (!options.reverse && options.gt && !options.gte))
    options.exclusiveStart = true // start should *not* include matching key

  return options
}

AbstractLevelDOWN.prototype.iterator = function (options) {
  if (typeof options != 'object')
    options = {}

  options = this._setupIteratorOptions(options)

  if (typeof this._iterator == 'function')
    return this._iterator(options)

  return new AbstractIterator(this)
}

AbstractLevelDOWN.prototype._chainedBatch = function () {
  return new AbstractChainedBatch(this)
}

AbstractLevelDOWN.prototype._isBuffer = function (obj) {
  return Buffer.isBuffer(obj)
}

AbstractLevelDOWN.prototype._checkKeyValue = function (obj, type) {

  if (obj === null || obj === undefined)
    return new Error(type + ' cannot be `null` or `undefined`')

  if (this._isBuffer(obj)) {
    if (obj.length === 0)
      return new Error(type + ' cannot be an empty Buffer')
  } else if (String(obj) === '')
    return new Error(type + ' cannot be an empty String')
}

module.exports.AbstractLevelDOWN    = AbstractLevelDOWN
module.exports.AbstractIterator     = AbstractIterator
module.exports.AbstractChainedBatch = AbstractChainedBatch

}).call(this,require('_process'),require("buffer").Buffer)
},{"./abstract-chained-batch":120,"./abstract-iterator":121,"_process":11,"buffer":3,"xtend":123}],123:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],124:[function(require,module,exports){
/*global window:false, self:false, define:false, module:false */

/**
 * @license IDBWrapper - A cross-browser wrapper for IndexedDB
 * Copyright (c) 2011 - 2013 Jens Arps
 * http://jensarps.de/
 *
 * Licensed under the MIT (X11) license
 */

(function (name, definition, global) {
  if (typeof define === 'function') {
    define(definition);
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = definition();
  } else {
    global[name] = definition();
  }
})('IDBStore', function () {

  'use strict';

  var defaultErrorHandler = function (error) {
    throw error;
  };

  var defaults = {
    storeName: 'Store',
    storePrefix: 'IDBWrapper-',
    dbVersion: 1,
    keyPath: 'id',
    autoIncrement: true,
    onStoreReady: function () {
    },
    onError: defaultErrorHandler,
    indexes: []
  };

  /**
   *
   * The IDBStore constructor
   *
   * @constructor
   * @name IDBStore
   * @version 1.4.1
   *
   * @param {Object} [kwArgs] An options object used to configure the store and
   *  set callbacks
   * @param {String} [kwArgs.storeName='Store'] The name of the store
   * @param {String} [kwArgs.storePrefix='IDBWrapper-'] A prefix that is
   *  internally used to construct the name of the database, which will be
   *  kwArgs.storePrefix + kwArgs.storeName
   * @param {Number} [kwArgs.dbVersion=1] The version of the store
   * @param {String} [kwArgs.keyPath='id'] The key path to use. If you want to
   *  setup IDBWrapper to work with out-of-line keys, you need to set this to
   *  `null`
   * @param {Boolean} [kwArgs.autoIncrement=true] If set to true, IDBStore will
   *  automatically make sure a unique keyPath value is present on each object
   *  that is stored.
   * @param {Function} [kwArgs.onStoreReady] A callback to be called when the
   *  store is ready to be used.
   * @param {Function} [kwArgs.onError=throw] A callback to be called when an
   *  error occurred during instantiation of the store.
   * @param {Array} [kwArgs.indexes=[]] An array of indexData objects
   *  defining the indexes to use with the store. For every index to be used
   *  one indexData object needs to be passed in the array.
   *  An indexData object is defined as follows:
   * @param {Object} [kwArgs.indexes.indexData] An object defining the index to
   *  use
   * @param {String} kwArgs.indexes.indexData.name The name of the index
   * @param {String} [kwArgs.indexes.indexData.keyPath] The key path of the index
   * @param {Boolean} [kwArgs.indexes.indexData.unique] Whether the index is unique
   * @param {Boolean} [kwArgs.indexes.indexData.multiEntry] Whether the index is multi entry
   * @param {Function} [onStoreReady] A callback to be called when the store
   * is ready to be used.
   * @example
      // create a store for customers with an additional index over the
      // `lastname` property.
      var myCustomerStore = new IDBStore({
        dbVersion: 1,
        storeName: 'customer-index',
        keyPath: 'customerid',
        autoIncrement: true,
        onStoreReady: populateTable,
        indexes: [
          { name: 'lastname', keyPath: 'lastname', unique: false, multiEntry: false }
        ]
      });
   * @example
      // create a generic store
      var myCustomerStore = new IDBStore({
        storeName: 'my-data-store',
        onStoreReady: function(){
          // start working with the store.
        }
      });
   */
  var IDBStore = function (kwArgs, onStoreReady) {

    if (typeof onStoreReady == 'undefined' && typeof kwArgs == 'function') {
      onStoreReady = kwArgs;
    }
    if (Object.prototype.toString.call(kwArgs) != '[object Object]') {
      kwArgs = {};
    }

    for (var key in defaults) {
      this[key] = typeof kwArgs[key] != 'undefined' ? kwArgs[key] : defaults[key];
    }

    this.dbName = this.storePrefix + this.storeName;
    this.dbVersion = parseInt(this.dbVersion, 10) || 1;

    onStoreReady && (this.onStoreReady = onStoreReady);

    var env = typeof window == 'object' ? window : self;
    this.idb = env.indexedDB || env.webkitIndexedDB || env.mozIndexedDB;
    this.keyRange = env.IDBKeyRange || env.webkitIDBKeyRange || env.mozIDBKeyRange;

    this.features = {
      hasAutoIncrement: !env.mozIndexedDB
    };

    this.consts = {
      'READ_ONLY':         'readonly',
      'READ_WRITE':        'readwrite',
      'VERSION_CHANGE':    'versionchange',
      'NEXT':              'next',
      'NEXT_NO_DUPLICATE': 'nextunique',
      'PREV':              'prev',
      'PREV_NO_DUPLICATE': 'prevunique'
    };

    this.openDB();
  };

  IDBStore.prototype = /** @lends IDBStore */ {

    /**
     * A pointer to the IDBStore ctor
     *
     * @type IDBStore
     */
    constructor: IDBStore,

    /**
     * The version of IDBStore
     *
     * @type String
     */
    version: '1.4.1',

    /**
     * A reference to the IndexedDB object
     *
     * @type Object
     */
    db: null,

    /**
     * The full name of the IndexedDB used by IDBStore, composed of
     * this.storePrefix + this.storeName
     *
     * @type String
     */
    dbName: null,

    /**
     * The version of the IndexedDB used by IDBStore
     *
     * @type Number
     */
    dbVersion: null,

    /**
     * A reference to the objectStore used by IDBStore
     *
     * @type Object
     */
    store: null,

    /**
     * The store name
     *
     * @type String
     */
    storeName: null,

    /**
     * The key path
     *
     * @type String
     */
    keyPath: null,

    /**
     * Whether IDBStore uses autoIncrement
     *
     * @type Boolean
     */
    autoIncrement: null,

    /**
     * The indexes used by IDBStore
     *
     * @type Array
     */
    indexes: null,

    /**
     * A hashmap of features of the used IDB implementation
     *
     * @type Object
     * @proprty {Boolean} autoIncrement If the implementation supports
     *  native auto increment
     */
    features: null,

    /**
     * The callback to be called when the store is ready to be used
     *
     * @type Function
     */
    onStoreReady: null,

    /**
     * The callback to be called if an error occurred during instantiation
     * of the store
     *
     * @type Function
     */
    onError: null,

    /**
     * The internal insertID counter
     *
     * @type Number
     * @private
     */
    _insertIdCount: 0,

    /**
     * Opens an IndexedDB; called by the constructor.
     *
     * Will check if versions match and compare provided index configuration
     * with existing ones, and update indexes if necessary.
     *
     * Will call this.onStoreReady() if everything went well and the store
     * is ready to use, and this.onError() is something went wrong.
     *
     * @private
     *
     */
    openDB: function () {

      var openRequest = this.idb.open(this.dbName, this.dbVersion);
      var preventSuccessCallback = false;

      openRequest.onerror = function (error) {

        var gotVersionErr = false;
        if ('error' in error.target) {
          gotVersionErr = error.target.error.name == 'VersionError';
        } else if ('errorCode' in error.target) {
          gotVersionErr = error.target.errorCode == 12;
        }

        if (gotVersionErr) {
          this.onError(new Error('The version number provided is lower than the existing one.'));
        } else {
          this.onError(error);
        }
      }.bind(this);

      openRequest.onsuccess = function (event) {

        if (preventSuccessCallback) {
          return;
        }

        if(this.db){
          this.onStoreReady();
          return;
        }

        this.db = event.target.result;

        if(typeof this.db.version == 'string'){
          this.onError(new Error('The IndexedDB implementation in this browser is outdated. Please upgrade your browser.'));
          return;
        }

        if(!this.db.objectStoreNames.contains(this.storeName)){
          // We should never ever get here.
          // Lets notify the user anyway.
          this.onError(new Error('Something is wrong with the IndexedDB implementation in this browser. Please upgrade your browser.'));
          return;
        }

        var emptyTransaction = this.db.transaction([this.storeName], this.consts.READ_ONLY);
        this.store = emptyTransaction.objectStore(this.storeName);

        // check indexes
        var existingIndexes = Array.prototype.slice.call(this.getIndexList());
        this.indexes.forEach(function(indexData){
          var indexName = indexData.name;

          if(!indexName){
            preventSuccessCallback = true;
            this.onError(new Error('Cannot create index: No index name given.'));
            return;
          }

          this.normalizeIndexData(indexData);

          if(this.hasIndex(indexName)){
            // check if it complies
            var actualIndex = this.store.index(indexName);
            var complies = this.indexComplies(actualIndex, indexData);
            if(!complies){
              preventSuccessCallback = true;
              this.onError(new Error('Cannot modify index "' + indexName + '" for current version. Please bump version number to ' + ( this.dbVersion + 1 ) + '.'));
            }

            existingIndexes.splice(existingIndexes.indexOf(indexName), 1);
          } else {
            preventSuccessCallback = true;
            this.onError(new Error('Cannot create new index "' + indexName + '" for current version. Please bump version number to ' + ( this.dbVersion + 1 ) + '.'));
          }

        }, this);

        if (existingIndexes.length) {
          preventSuccessCallback = true;
          this.onError(new Error('Cannot delete index(es) "' + existingIndexes.toString() + '" for current version. Please bump version number to ' + ( this.dbVersion + 1 ) + '.'));
        }

        preventSuccessCallback || this.onStoreReady();
      }.bind(this);

      openRequest.onupgradeneeded = function(/* IDBVersionChangeEvent */ event){

        this.db = event.target.result;

        if(this.db.objectStoreNames.contains(this.storeName)){
          this.store = event.target.transaction.objectStore(this.storeName);
        } else {
          var optionalParameters = { autoIncrement: this.autoIncrement };
          if (this.keyPath !== null) {
            optionalParameters.keyPath = this.keyPath;
          }
          this.store = this.db.createObjectStore(this.storeName, optionalParameters);
        }

        var existingIndexes = Array.prototype.slice.call(this.getIndexList());
        this.indexes.forEach(function(indexData){
          var indexName = indexData.name;

          if(!indexName){
            preventSuccessCallback = true;
            this.onError(new Error('Cannot create index: No index name given.'));
          }

          this.normalizeIndexData(indexData);

          if(this.hasIndex(indexName)){
            // check if it complies
            var actualIndex = this.store.index(indexName);
            var complies = this.indexComplies(actualIndex, indexData);
            if(!complies){
              // index differs, need to delete and re-create
              this.store.deleteIndex(indexName);
              this.store.createIndex(indexName, indexData.keyPath, { unique: indexData.unique, multiEntry: indexData.multiEntry });
            }

            existingIndexes.splice(existingIndexes.indexOf(indexName), 1);
          } else {
            this.store.createIndex(indexName, indexData.keyPath, { unique: indexData.unique, multiEntry: indexData.multiEntry });
          }

        }, this);

        if (existingIndexes.length) {
          existingIndexes.forEach(function(_indexName){
            this.store.deleteIndex(_indexName);
          }, this);
        }

      }.bind(this);
    },

    /**
     * Deletes the database used for this store if the IDB implementations
     * provides that functionality.
     */
    deleteDatabase: function () {
      if (this.idb.deleteDatabase) {
        this.idb.deleteDatabase(this.dbName);
      }
    },

    /*********************
     * data manipulation *
     *********************/

    /**
     * Puts an object into the store. If an entry with the given id exists,
     * it will be overwritten. This method has a different signature for inline
     * keys and out-of-line keys; please see the examples below.
     *
     * @param {*} [key] The key to store. This is only needed if IDBWrapper
     *  is set to use out-of-line keys. For inline keys - the default scenario -
     *  this can be omitted.
     * @param {Object} value The data object to store.
     * @param {Function} [onSuccess] A callback that is called if insertion
     *  was successful.
     * @param {Function} [onError] A callback that is called if insertion
     *  failed.
     * @returns {IDBTransaction} The transaction used for this operation.
     * @example
        // Storing an object, using inline keys (the default scenario):
        var myCustomer = {
          customerid: 2346223,
          lastname: 'Doe',
          firstname: 'John'
        };
        myCustomerStore.put(myCustomer, mySuccessHandler, myErrorHandler);
        // Note that passing success- and error-handlers is optional.
     * @example
        // Storing an object, using out-of-line keys:
       var myCustomer = {
         lastname: 'Doe',
         firstname: 'John'
       };
       myCustomerStore.put(2346223, myCustomer, mySuccessHandler, myErrorHandler);
      // Note that passing success- and error-handlers is optional.
     */
    put: function (key, value, onSuccess, onError) {
      if (this.keyPath !== null) {
        onError = onSuccess;
        onSuccess = value;
        value = key;
      }
      onError || (onError = defaultErrorHandler);
      onSuccess || (onSuccess = noop);

      var hasSuccess = false,
          result = null,
          putRequest;

      var putTransaction = this.db.transaction([this.storeName], this.consts.READ_WRITE);
      putTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      putTransaction.onabort = onError;
      putTransaction.onerror = onError;

      if (this.keyPath !== null) { // in-line keys
        this._addIdPropertyIfNeeded(value);
        putRequest = putTransaction.objectStore(this.storeName).put(value);
      } else { // out-of-line keys
        putRequest = putTransaction.objectStore(this.storeName).put(value, key);
      }
      putRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      putRequest.onerror = onError;

      return putTransaction;
    },

    /**
     * Retrieves an object from the store. If no entry exists with the given id,
     * the success handler will be called with null as first and only argument.
     *
     * @param {*} key The id of the object to fetch.
     * @param {Function} [onSuccess] A callback that is called if fetching
     *  was successful. Will receive the object as only argument.
     * @param {Function} [onError] A callback that will be called if an error
     *  occurred during the operation.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    get: function (key, onSuccess, onError) {
      onError || (onError = defaultErrorHandler);
      onSuccess || (onSuccess = noop);

      var hasSuccess = false,
          result = null;
      
      var getTransaction = this.db.transaction([this.storeName], this.consts.READ_ONLY);
      getTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      getTransaction.onabort = onError;
      getTransaction.onerror = onError;
      var getRequest = getTransaction.objectStore(this.storeName).get(key);
      getRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      getRequest.onerror = onError;

      return getTransaction;
    },

    /**
     * Removes an object from the store.
     *
     * @param {*} key The id of the object to remove.
     * @param {Function} [onSuccess] A callback that is called if the removal
     *  was successful.
     * @param {Function} [onError] A callback that will be called if an error
     *  occurred during the operation.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    remove: function (key, onSuccess, onError) {
      onError || (onError = defaultErrorHandler);
      onSuccess || (onSuccess = noop);

      var hasSuccess = false,
          result = null;

      var removeTransaction = this.db.transaction([this.storeName], this.consts.READ_WRITE);
      removeTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      removeTransaction.onabort = onError;
      removeTransaction.onerror = onError;

      var deleteRequest = removeTransaction.objectStore(this.storeName)['delete'](key);
      deleteRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      deleteRequest.onerror = onError;

      return removeTransaction;
    },

    /**
     * Runs a batch of put and/or remove operations on the store.
     *
     * @param {Array} dataArray An array of objects containing the operation to run
     *  and the data object (for put operations).
     * @param {Function} [onSuccess] A callback that is called if all operations
     *  were successful.
     * @param {Function} [onError] A callback that is called if an error
     *  occurred during one of the operations.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    batch: function (dataArray, onSuccess, onError) {
      onError || (onError = defaultErrorHandler);
      onSuccess || (onSuccess = noop);

      if(Object.prototype.toString.call(dataArray) != '[object Array]'){
        onError(new Error('dataArray argument must be of type Array.'));
      }
      var batchTransaction = this.db.transaction([this.storeName] , this.consts.READ_WRITE);
      batchTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(hasSuccess);
      };
      batchTransaction.onabort = onError;
      batchTransaction.onerror = onError;
      
      var count = dataArray.length;
      var called = false;
      var hasSuccess = false;

      var onItemSuccess = function () {
        count--;
        if (count === 0 && !called) {
          called = true;
          hasSuccess = true;
        }
      };

      dataArray.forEach(function (operation) {
        var type = operation.type;
        var key = operation.key;
        var value = operation.value;

        var onItemError = function (err) {
          batchTransaction.abort();
          if (!called) {
            called = true;
            onError(err, type, key);
          }
        };

        if (type == 'remove') {
          var deleteRequest = batchTransaction.objectStore(this.storeName)['delete'](key);
          deleteRequest.onsuccess = onItemSuccess;
          deleteRequest.onerror = onItemError;
        } else if (type == 'put') {
          var putRequest;
          if (this.keyPath !== null) { // in-line keys
            this._addIdPropertyIfNeeded(value);
            putRequest = batchTransaction.objectStore(this.storeName).put(value);
          } else { // out-of-line keys
            putRequest = batchTransaction.objectStore(this.storeName).put(value, key);
          }
          putRequest.onsuccess = onItemSuccess;
          putRequest.onerror = onItemError;
        }
      }, this);

      return batchTransaction;
    },

    /**
     * Takes an array of objects and stores them in a single transaction.
     *
     * @param {Array} dataArray An array of objects to store
     * @param {Function} [onSuccess] A callback that is called if all operations
     *  were successful.
     * @param {Function} [onError] A callback that is called if an error
     *  occurred during one of the operations.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    putBatch: function (dataArray, onSuccess, onError) {
      var batchData = dataArray.map(function(item){
        return { type: 'put', value: item };
      });

      return this.batch(batchData, onSuccess, onError);
    },

    /**
     * Takes an array of keys and removes matching objects in a single
     * transaction.
     *
     * @param {Array} keyArray An array of keys to remove
     * @param {Function} [onSuccess] A callback that is called if all operations
     *  were successful.
     * @param {Function} [onError] A callback that is called if an error
     *  occurred during one of the operations.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    removeBatch: function (keyArray, onSuccess, onError) {
      var batchData = keyArray.map(function(key){
        return { type: 'remove', key: key };
      });

      return this.batch(batchData, onSuccess, onError);
    },

    /**
     * Takes an array of keys and fetches matching objects
     *
     * @param {Array} keyArray An array of keys identifying the objects to fetch
     * @param {Function} [onSuccess] A callback that is called if all operations
     *  were successful.
     * @param {Function} [onError] A callback that is called if an error
     *  occurred during one of the operations.
     * @param {String} [arrayType='sparse'] The type of array to pass to the
     *  success handler. May be one of 'sparse', 'dense' or 'skip'. Defaults to
     *  'sparse'. This parameter specifies how to handle the situation if a get
     *  operation did not throw an error, but there was no matching object in
     *  the database. In most cases, 'sparse' provides the most desired
     *  behavior. See the examples for details.
     * @returns {IDBTransaction} The transaction used for this operation.
     * @example
     // given that there are two objects in the database with the keypath
     // values 1 and 2, and the call looks like this:
     myStore.getBatch([1, 5, 2], onError, function (data) { … }, arrayType);

     // this is what the `data` array will be like:

     // arrayType == 'sparse':
     // data is a sparse array containing two entries and having a length of 3:
       [Object, 2: Object]
         0: Object
         2: Object
         length: 3
         __proto__: Array[0]
     // calling forEach on data will result in the callback being called two
     // times, with the index parameter matching the index of the key in the
     // keyArray.

     // arrayType == 'dense':
     // data is a dense array containing three entries and having a length of 3,
     // where data[1] is of type undefined:
       [Object, undefined, Object]
         0: Object
         1: undefined
         2: Object
         length: 3
         __proto__: Array[0]
     // calling forEach on data will result in the callback being called three
     // times, with the index parameter matching the index of the key in the
     // keyArray, but the second call will have undefined as first argument.

     // arrayType == 'skip':
     // data is a dense array containing two entries and having a length of 2:
       [Object, Object]
         0: Object
         1: Object
         length: 2
         __proto__: Array[0]
     // calling forEach on data will result in the callback being called two
     // times, with the index parameter not matching the index of the key in the
     // keyArray.
     */
    getBatch: function (keyArray, onSuccess, onError, arrayType) {
      onError || (onError = defaultErrorHandler);
      onSuccess || (onSuccess = noop);
      arrayType || (arrayType = 'sparse');

      if(Object.prototype.toString.call(keyArray) != '[object Array]'){
        onError(new Error('keyArray argument must be of type Array.'));
      }
      var batchTransaction = this.db.transaction([this.storeName] , this.consts.READ_ONLY);
      batchTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      batchTransaction.onabort = onError;
      batchTransaction.onerror = onError;

      var data = [];
      var count = keyArray.length;
      var called = false;
      var hasSuccess = false;
      var result = null;

      var onItemSuccess = function (event) {
        if (event.target.result || arrayType == 'dense') {
          data.push(event.target.result);
        } else if (arrayType == 'sparse') {
          data.length++;
        }
        count--;
        if (count === 0) {
          called = true;
          hasSuccess = true;
          result = data;
        }
      };

      keyArray.forEach(function (key) {

        var onItemError = function (err) {
          called = true;
          result = err;
          onError(err);
          batchTransaction.abort();
        };

        var getRequest = batchTransaction.objectStore(this.storeName).get(key);
        getRequest.onsuccess = onItemSuccess;
        getRequest.onerror = onItemError;

      }, this);

      return batchTransaction;
    },

    /**
     * Fetches all entries in the store.
     *
     * @param {Function} [onSuccess] A callback that is called if the operation
     *  was successful. Will receive an array of objects.
     * @param {Function} [onError] A callback that will be called if an error
     *  occurred during the operation.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    getAll: function (onSuccess, onError) {
      onError || (onError = defaultErrorHandler);
      onSuccess || (onSuccess = noop);
      var getAllTransaction = this.db.transaction([this.storeName], this.consts.READ_ONLY);
      var store = getAllTransaction.objectStore(this.storeName);
      if (store.getAll) {
        this._getAllNative(getAllTransaction, store, onSuccess, onError);
      } else {
        this._getAllCursor(getAllTransaction, store, onSuccess, onError);
      }

      return getAllTransaction;
    },

    /**
     * Implements getAll for IDB implementations that have a non-standard
     * getAll() method.
     *
     * @param {Object} getAllTransaction An open READ transaction.
     * @param {Object} store A reference to the store.
     * @param {Function} onSuccess A callback that will be called if the
     *  operation was successful.
     * @param {Function} onError A callback that will be called if an
     *  error occurred during the operation.
     * @private
     */
    _getAllNative: function (getAllTransaction, store, onSuccess, onError) {
      var hasSuccess = false,
          result = null;

      getAllTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      getAllTransaction.onabort = onError;
      getAllTransaction.onerror = onError;

      var getAllRequest = store.getAll();
      getAllRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      getAllRequest.onerror = onError;
    },

    /**
     * Implements getAll for IDB implementations that do not have a getAll()
     * method.
     *
     * @param {Object} getAllTransaction An open READ transaction.
     * @param {Object} store A reference to the store.
     * @param {Function} onSuccess A callback that will be called if the
     *  operation was successful.
     * @param {Function} onError A callback that will be called if an
     *  error occurred during the operation.
     * @private
     */
    _getAllCursor: function (getAllTransaction, store, onSuccess, onError) {
      var all = [],
          hasSuccess = false,
          result = null;

      getAllTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      getAllTransaction.onabort = onError;
      getAllTransaction.onerror = onError;

      var cursorRequest = store.openCursor();
      cursorRequest.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          all.push(cursor.value);
          cursor['continue']();
        }
        else {
          hasSuccess = true;
          result = all;
        }
      };
      cursorRequest.onError = onError;
    },

    /**
     * Clears the store, i.e. deletes all entries in the store.
     *
     * @param {Function} [onSuccess] A callback that will be called if the
     *  operation was successful.
     * @param {Function} [onError] A callback that will be called if an
     *  error occurred during the operation.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    clear: function (onSuccess, onError) {
      onError || (onError = defaultErrorHandler);
      onSuccess || (onSuccess = noop);

      var hasSuccess = false,
          result = null;

      var clearTransaction = this.db.transaction([this.storeName], this.consts.READ_WRITE);
      clearTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      clearTransaction.onabort = onError;
      clearTransaction.onerror = onError;

      var clearRequest = clearTransaction.objectStore(this.storeName).clear();
      clearRequest.onsuccess = function (event) {
        hasSuccess = true;
        result = event.target.result;
      };
      clearRequest.onerror = onError;

      return clearTransaction;
    },

    /**
     * Checks if an id property needs to present on a object and adds one if
     * necessary.
     *
     * @param {Object} dataObj The data object that is about to be stored
     * @private
     */
    _addIdPropertyIfNeeded: function (dataObj) {
      if (!this.features.hasAutoIncrement && typeof dataObj[this.keyPath] == 'undefined') {
        dataObj[this.keyPath] = this._insertIdCount++ + Date.now();
      }
    },

    /************
     * indexing *
     ************/

    /**
     * Returns a DOMStringList of index names of the store.
     *
     * @return {DOMStringList} The list of index names
     */
    getIndexList: function () {
      return this.store.indexNames;
    },

    /**
     * Checks if an index with the given name exists in the store.
     *
     * @param {String} indexName The name of the index to look for
     * @return {Boolean} Whether the store contains an index with the given name
     */
    hasIndex: function (indexName) {
      return this.store.indexNames.contains(indexName);
    },

    /**
     * Normalizes an object containing index data and assures that all
     * properties are set.
     *
     * @param {Object} indexData The index data object to normalize
     * @param {String} indexData.name The name of the index
     * @param {String} [indexData.keyPath] The key path of the index
     * @param {Boolean} [indexData.unique] Whether the index is unique
     * @param {Boolean} [indexData.multiEntry] Whether the index is multi entry
     */
    normalizeIndexData: function (indexData) {
      indexData.keyPath = indexData.keyPath || indexData.name;
      indexData.unique = !!indexData.unique;
      indexData.multiEntry = !!indexData.multiEntry;
    },

    /**
     * Checks if an actual index complies with an expected index.
     *
     * @param {Object} actual The actual index found in the store
     * @param {Object} expected An Object describing an expected index
     * @return {Boolean} Whether both index definitions are identical
     */
    indexComplies: function (actual, expected) {
      var complies = ['keyPath', 'unique', 'multiEntry'].every(function (key) {
        // IE10 returns undefined for no multiEntry
        if (key == 'multiEntry' && actual[key] === undefined && expected[key] === false) {
          return true;
        }
        // Compound keys
        if (key == 'keyPath' && Object.prototype.toString.call(expected[key]) == '[object Array]') {
          var exp = expected.keyPath;
          var act = actual.keyPath;

          // IE10 can't handle keyPath sequences and stores them as a string.
          // The index will be unusable there, but let's still return true if
          // the keyPath sequence matches.
          if (typeof act == 'string') {
            return exp.toString() == act;
          }

          // Chrome/Opera stores keyPath squences as DOMStringList, Firefox
          // as Array
          if ( ! (typeof act.contains == 'function' || typeof act.indexOf == 'function') ) {
            return false;
          }

          if (act.length !== exp.length) {
            return false;
          }

          for (var i = 0, m = exp.length; i<m; i++) {
            if ( ! ( (act.contains && act.contains(exp[i])) || act.indexOf(exp[i] !== -1) )) {
              return false;
            }
          }
          return true;
        }
        return expected[key] == actual[key];
      });
      return complies;
    },

    /**********
     * cursor *
     **********/

    /**
     * Iterates over the store using the given options and calling onItem
     * for each entry matching the options.
     *
     * @param {Function} onItem A callback to be called for each match
     * @param {Object} [options] An object defining specific options
     * @param {Object} [options.index=null] An IDBIndex to operate on
     * @param {String} [options.order=ASC] The order in which to provide the
     *  results, can be 'DESC' or 'ASC'
     * @param {Boolean} [options.autoContinue=true] Whether to automatically
     *  iterate the cursor to the next result
     * @param {Boolean} [options.filterDuplicates=false] Whether to exclude
     *  duplicate matches
     * @param {Object} [options.keyRange=null] An IDBKeyRange to use
     * @param {Boolean} [options.writeAccess=false] Whether grant write access
     *  to the store in the onItem callback
     * @param {Function} [options.onEnd=null] A callback to be called after
     *  iteration has ended
     * @param {Function} [options.onError=throw] A callback to be called
     *  if an error occurred during the operation.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    iterate: function (onItem, options) {
      options = mixin({
        index: null,
        order: 'ASC',
        autoContinue: true,
        filterDuplicates: false,
        keyRange: null,
        writeAccess: false,
        onEnd: null,
        onError: defaultErrorHandler
      }, options || {});

      var directionType = options.order.toLowerCase() == 'desc' ? 'PREV' : 'NEXT';
      if (options.filterDuplicates) {
        directionType += '_NO_DUPLICATE';
      }

      var hasSuccess = false;
      var cursorTransaction = this.db.transaction([this.storeName], this.consts[options.writeAccess ? 'READ_WRITE' : 'READ_ONLY']);
      var cursorTarget = cursorTransaction.objectStore(this.storeName);
      if (options.index) {
        cursorTarget = cursorTarget.index(options.index);
      }

      cursorTransaction.oncomplete = function () {
        if (!hasSuccess) {
          options.onError(null);
          return;
        }
        if (options.onEnd) {
          options.onEnd();
        } else {
          onItem(null);
        }
      };
      cursorTransaction.onabort = options.onError;
      cursorTransaction.onerror = options.onError;

      var cursorRequest = cursorTarget.openCursor(options.keyRange, this.consts[directionType]);
      cursorRequest.onerror = options.onError;
      cursorRequest.onsuccess = function (event) {
        var cursor = event.target.result;
        if (cursor) {
          onItem(cursor.value, cursor, cursorTransaction);
          if (options.autoContinue) {
            cursor['continue']();
          }
        } else {
          hasSuccess = true;
        }
      };

      return cursorTransaction;
    },

    /**
     * Runs a query against the store and passes an array containing matched
     * objects to the success handler.
     *
     * @param {Function} onSuccess A callback to be called when the operation
     *  was successful.
     * @param {Object} [options] An object defining specific query options
     * @param {Object} [options.index=null] An IDBIndex to operate on
     * @param {String} [options.order=ASC] The order in which to provide the
     *  results, can be 'DESC' or 'ASC'
     * @param {Boolean} [options.filterDuplicates=false] Whether to exclude
     *  duplicate matches
     * @param {Object} [options.keyRange=null] An IDBKeyRange to use
     * @param {Function} [options.onError=throw] A callback to be called if an error
     *  occurred during the operation.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    query: function (onSuccess, options) {
      var result = [];
      options = options || {};
      options.onEnd = function () {
        onSuccess(result);
      };
      return this.iterate(function (item) {
        result.push(item);
      }, options);
    },

    /**
     *
     * Runs a query against the store, but only returns the number of matches
     * instead of the matches itself.
     *
     * @param {Function} onSuccess A callback to be called if the opration
     *  was successful.
     * @param {Object} [options] An object defining specific options
     * @param {Object} [options.index=null] An IDBIndex to operate on
     * @param {Object} [options.keyRange=null] An IDBKeyRange to use
     * @param {Function} [options.onError=throw] A callback to be called if an error
     *  occurred during the operation.
     * @returns {IDBTransaction} The transaction used for this operation.
     */
    count: function (onSuccess, options) {

      options = mixin({
        index: null,
        keyRange: null
      }, options || {});

      var onError = options.onError || defaultErrorHandler;

      var hasSuccess = false,
          result = null;

      var cursorTransaction = this.db.transaction([this.storeName], this.consts.READ_ONLY);
      cursorTransaction.oncomplete = function () {
        var callback = hasSuccess ? onSuccess : onError;
        callback(result);
      };
      cursorTransaction.onabort = onError;
      cursorTransaction.onerror = onError;

      var cursorTarget = cursorTransaction.objectStore(this.storeName);
      if (options.index) {
        cursorTarget = cursorTarget.index(options.index);
      }
      var countRequest = cursorTarget.count(options.keyRange);
      countRequest.onsuccess = function (evt) {
        hasSuccess = true;
        result = evt.target.result;
      };
      countRequest.onError = onError;

      return cursorTransaction;
    },

    /**************/
    /* key ranges */
    /**************/

    /**
     * Creates a key range using specified options. This key range can be
     * handed over to the count() and iterate() methods.
     *
     * Note: You must provide at least one or both of "lower" or "upper" value.
     *
     * @param {Object} options The options for the key range to create
     * @param {*} [options.lower] The lower bound
     * @param {Boolean} [options.excludeLower] Whether to exclude the lower
     *  bound passed in options.lower from the key range
     * @param {*} [options.upper] The upper bound
     * @param {Boolean} [options.excludeUpper] Whether to exclude the upper
     *  bound passed in options.upper from the key range
     * @param {*} [options.only] A single key value. Use this if you need a key
     *  range that only includes one value for a key. Providing this
     *  property invalidates all other properties.
     * @return {Object} The IDBKeyRange representing the specified options
     */
    makeKeyRange: function(options){
      /*jshint onecase:true */
      var keyRange,
          hasLower = typeof options.lower != 'undefined',
          hasUpper = typeof options.upper != 'undefined',
          isOnly = typeof options.only != 'undefined';

      switch(true){
        case isOnly:
          keyRange = this.keyRange.only(options.only);
          break;
        case hasLower && hasUpper:
          keyRange = this.keyRange.bound(options.lower, options.upper, options.excludeLower, options.excludeUpper);
          break;
        case hasLower:
          keyRange = this.keyRange.lowerBound(options.lower, options.excludeLower);
          break;
        case hasUpper:
          keyRange = this.keyRange.upperBound(options.upper, options.excludeUpper);
          break;
        default:
          throw new Error('Cannot create KeyRange. Provide one or both of "lower" or "upper" value, or an "only" value.');
      }

      return keyRange;

    }

  };

  /** helpers **/

  var noop = function () {
  };
  var empty = {};
  var mixin = function (target, source) {
    var name, s;
    for (name in source) {
      s = source[name];
      if (s !== empty[name] && s !== target[name]) {
        target[name] = s;
      }
    }
    return target;
  };

  IDBStore.version = IDBStore.prototype.version;

  return IDBStore;

}, this);

},{}],125:[function(require,module,exports){
var Buffer = require('buffer').Buffer;

module.exports = isBuffer;

function isBuffer (o) {
  return Buffer.isBuffer(o)
    || /\[object (.+Array|Array.+)\]/.test(Object.prototype.toString.call(o));
}

},{"buffer":3}],126:[function(require,module,exports){
(function (Buffer){

exports.compare = function (a, b) {

  if(Buffer.isBuffer(a)) {
    var l = Math.min(a.length, b.length)
    for(var i = 0; i < l; i++) {
      var cmp = a[i] - b[i]
      if(cmp) return cmp
    }
    return a.length - b.length
  }

  return a < b ? -1 : a > b ? 1 : 0
}

function has(obj, key) {
  return Object.hasOwnProperty.call(obj, key)
}

// to be compatible with the current abstract-leveldown tests
// nullish or empty strings.
// I could use !!val but I want to permit numbers and booleans,
// if possible.

function isDef (val) {
  return val !== undefined && val !== ''
}

function has (range, name) {
  return Object.hasOwnProperty.call(range, name)
}

function hasKey(range, name) {
  return Object.hasOwnProperty.call(range, name) && name
}

var lowerBoundKey = exports.lowerBoundKey = function (range) {
    return (
       hasKey(range, 'gt')
    || hasKey(range, 'gte')
    || hasKey(range, 'min')
    || (range.reverse ? hasKey(range, 'end') : hasKey(range, 'start'))
    || undefined
    )
}

var lowerBound = exports.lowerBound = function (range) {
  var k = lowerBoundKey(range)
  return k && range[k]
  return (
      has(range, 'gt')                      ? range.gt
    : has(range, 'gte')                     ? range.gte
    : has(range, 'min')                     ? range.min
    : has(range, 'start') && !range.reverse ? range.start
    : has(range, 'end')   && range.reverse  ? range.end
    :                                         undefined
  )
}

exports.lowerBoundInclusive = function (range) {
  return has(range, 'gt') ? false : true
}

exports.upperBoundInclusive =
  function (range) {
    return has(range, 'lt') || !range.minEx ? false : true
  }

var lowerBoundExclusive = exports.lowerBoundExclusive =
  function (range) {
    return has(range, 'gt') || range.minEx ? true : false
  }

var upperBoundExclusive = exports.upperBoundExclusive =
  function (range) {
    return has(range, 'lt') ? true : false
  }

var upperBoundKey = exports.upperBoundKey = function (range) {
    return (
       hasKey(range, 'lt')
    || hasKey(range, 'lte')
    || hasKey(range, 'max')
    || (range.reverse ? hasKey(range, 'start') : hasKey(range, 'end'))
    || undefined
    )
}

var upperBound = exports.upperBound = function (range) {
  var k = upperBoundKey(range)
  return k && range[k]
}

function id (e) { return e }

exports.toLtgt = function (range, _range, map, lower, upper) {
  _range = _range || {}
  map = map || id
  var defaults = arguments.length > 3
  var lb = exports.lowerBoundKey(range)
  var ub = exports.upperBoundKey(range)
  if(lb) {
    if(lb === 'gt') _range.gt = map(range.gt)
    else            _range.gte = map(range[lb])
  }
  else if(defaults)
    _range.gte = lower

  if(ub) {
    if(ub === 'lt') _range.lt = map(range.lt)
    else            _range.lte = map(range[ub])
  }
  else if(defaults)
    _range.lte = upper

  _range.reverse = !!range.reverse

  return _range
}

exports.contains = function (range, key, compare) {
  compare = compare || exports.compare

  var lb = lowerBound(range)
  if(isDef(lb)) {
    var cmp = compare(key, lb)
    if(cmp < 0 || (cmp === 0 && lowerBoundExclusive(range)))
      return false
  }

  var ub = upperBound(range)
  if(isDef(ub)) {
    var cmp = compare(key, ub)
    if(cmp > 0 || (cmp === 0) && upperBoundExclusive(range))
      return false
  }

  return true
}

exports.filter = function (range, compare) {
  return function (key) {
    return exports.contains(range, key, compare)
  }
}

}).call(this,require("buffer").Buffer)
},{"buffer":3}],127:[function(require,module,exports){
(function (Buffer){
/**
 * Convert a typed array to a Buffer without a copy
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install typedarray-to-buffer`
 */

module.exports = function (arr) {
  if (typeof Buffer._augment === 'function' && Buffer.TYPED_ARRAY_SUPPORT) {
    // If `Buffer` is from the `buffer` module and this browser supports typed arrays,
    // then augment it with all the `Buffer` methods.
    return Buffer._augment(arr)
  } else {
    // Otherwise, fallback to creating a `Buffer` with a copy.
    return new Buffer(arr)
  }
}

}).call(this,require("buffer").Buffer)
},{"buffer":3}],128:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],129:[function(require,module,exports){
var Keys = require("object-keys")
var hasKeys = require("./has-keys")

module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        if (!hasKeys(source)) {
            continue
        }

        var keys = Keys(source)

        for (var j = 0; j < keys.length; j++) {
            var name = keys[j]
            target[name] = source[name]
        }
    }

    return target
}

},{"./has-keys":128,"object-keys":131}],130:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

var isFunction = function (fn) {
	var isFunc = (typeof fn === 'function' && !(fn instanceof RegExp)) || toString.call(fn) === '[object Function]';
	if (!isFunc && typeof window !== 'undefined') {
		isFunc = fn === window.setTimeout || fn === window.alert || fn === window.confirm || fn === window.prompt;
	}
	return isFunc;
};

module.exports = function forEach(obj, fn) {
	if (!isFunction(fn)) {
		throw new TypeError('iterator must be a function');
	}
	var i, k,
		isString = typeof obj === 'string',
		l = obj.length,
		context = arguments.length > 2 ? arguments[2] : null;
	if (l === +l) {
		for (i = 0; i < l; i++) {
			if (context === null) {
				fn(isString ? obj.charAt(i) : obj[i], i, obj);
			} else {
				fn.call(context, isString ? obj.charAt(i) : obj[i], i, obj);
			}
		}
	} else {
		for (k in obj) {
			if (hasOwn.call(obj, k)) {
				if (context === null) {
					fn(obj[k], k, obj);
				} else {
					fn.call(context, obj[k], k, obj);
				}
			}
		}
	}
};


},{}],131:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":133}],132:[function(require,module,exports){
var toString = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toString.call(value);
	var isArguments = str === '[object Arguments]';
	if (!isArguments) {
		isArguments = str !== '[object Array]'
			&& value !== null
			&& typeof value === 'object'
			&& typeof value.length === 'number'
			&& value.length >= 0
			&& toString.call(value.callee) === '[object Function]';
	}
	return isArguments;
};


},{}],133:[function(require,module,exports){
(function () {
	"use strict";

	// modified from https://github.com/kriskowal/es5-shim
	var has = Object.prototype.hasOwnProperty,
		toString = Object.prototype.toString,
		forEach = require('./foreach'),
		isArgs = require('./isArguments'),
		hasDontEnumBug = !({'toString': null}).propertyIsEnumerable('toString'),
		hasProtoEnumBug = (function () {}).propertyIsEnumerable('prototype'),
		dontEnums = [
			"toString",
			"toLocaleString",
			"valueOf",
			"hasOwnProperty",
			"isPrototypeOf",
			"propertyIsEnumerable",
			"constructor"
		],
		keysShim;

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object',
			isFunction = toString.call(object) === '[object Function]',
			isArguments = isArgs(object),
			theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError("Object.keys called on a non-object");
		}

		if (isArguments) {
			forEach(object, function (value) {
				theKeys.push(value);
			});
		} else {
			var name,
				skipProto = hasProtoEnumBug && isFunction;

			for (name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(name);
				}
			}
		}

		if (hasDontEnumBug) {
			var ctor = object.constructor,
				skipConstructor = ctor && ctor.prototype === object;

			forEach(dontEnums, function (dontEnum) {
				if (!(skipConstructor && dontEnum === 'constructor') && has.call(object, dontEnum)) {
					theKeys.push(dontEnum);
				}
			});
		}
		return theKeys;
	};

	module.exports = keysShim;
}());


},{"./foreach":130,"./isArguments":132}],134:[function(require,module,exports){
const levelup = require('levelup')

function packager (leveldown) {
  function Level (location, options, callback) {
    if (typeof options === 'function')
      callback = options
    if (!(typeof options === 'object' && options !== null))
      options  = {}

    options.db = leveldown

    return levelup(location, options, callback)
  }

  [ 'destroy', 'repair' ].forEach(function (m) {
    if (typeof leveldown[m] === 'function') {
      Level[m] = function (location, callback) {
        leveldown[m](location, callback || function () {})
      }
    }
  })

  return Level
}

module.exports = packager

},{"levelup":136}],135:[function(require,module,exports){
/* Copyright (c) 2012-2015 LevelUP contributors
 * See list at <https://github.com/level/levelup#contributing>
 * MIT License
 * <https://github.com/level/levelup/blob/master/LICENSE.md>
 */

var util          = require('./util')
  , WriteError    = require('level-errors').WriteError

  , getOptions    = util.getOptions
  , dispatchError = util.dispatchError

function Batch (levelup, codec) {
  this._levelup = levelup
  this._codec = codec
  this.batch = levelup.db.batch()
  this.ops = []
}

Batch.prototype.put = function (key_, value_, options) {
  options = getOptions(options)

  var key   = this._codec.encodeKey(key_, options)
    , value = this._codec.encodeValue(value_, options)

  try {
    this.batch.put(key, value)
  } catch (e) {
    throw new WriteError(e)
  }
  this.ops.push({ type : 'put', key : key, value : value })

  return this
}

Batch.prototype.del = function (key_, options) {
  options = getOptions(options)

  var key = this._codec.encodeKey(key_, options)

  try {
    this.batch.del(key)
  } catch (err) {
    throw new WriteError(err)
  }
  this.ops.push({ type : 'del', key : key })

  return this
}

Batch.prototype.clear = function () {
  try {
    this.batch.clear()
  } catch (err) {
    throw new WriteError(err)
  }

  this.ops = []
  return this
}

Batch.prototype.write = function (callback) {
  var levelup = this._levelup
    , ops     = this.ops

  try {
    this.batch.write(function (err) {
      if (err)
        return dispatchError(levelup, new WriteError(err), callback)
      levelup.emit('batch', ops)
      if (callback)
        callback()
    })
  } catch (err) {
    throw new WriteError(err)
  }
}

module.exports = Batch

},{"./util":137,"level-errors":144}],136:[function(require,module,exports){
(function (process){
/* Copyright (c) 2012-2015 LevelUP contributors
 * See list at <https://github.com/level/levelup#contributing>
 * MIT License
 * <https://github.com/level/levelup/blob/master/LICENSE.md>
 */

var EventEmitter        = require('events').EventEmitter
  , inherits            = require('util').inherits
  , deprecate           = require('util').deprecate
  , extend              = require('xtend')
  , prr                 = require('prr')
  , DeferredLevelDOWN   = require('deferred-leveldown')
  , IteratorStream      = require('level-iterator-stream')

  , errors              = require('level-errors')
  , WriteError          = errors.WriteError
  , ReadError           = errors.ReadError
  , NotFoundError       = errors.NotFoundError
  , OpenError           = errors.OpenError
  , EncodingError       = errors.EncodingError
  , InitializationError = errors.InitializationError

  , util                = require('./util')
  , Batch               = require('./batch')
  , Codec               = require('level-codec')

  , getOptions          = util.getOptions
  , defaultOptions      = util.defaultOptions
  , getLevelDOWN        = util.getLevelDOWN
  , dispatchError       = util.dispatchError
  , isDefined           = util.isDefined

function getCallback (options, callback) {
  return typeof options == 'function' ? options : callback
}

// Possible LevelUP#_status values:
//  - 'new'     - newly created, not opened or closed
//  - 'opening' - waiting for the database to be opened, post open()
//  - 'open'    - successfully opened the database, available for use
//  - 'closing' - waiting for the database to be closed, post close()
//  - 'closed'  - database has been successfully closed, should not be
//                 used except for another open() operation

function LevelUP (location, options, callback) {
  if (!(this instanceof LevelUP))
    return new LevelUP(location, options, callback)

  var error

  EventEmitter.call(this)
  this.setMaxListeners(Infinity)

  if (typeof location == 'function') {
    options = typeof options == 'object' ? options : {}
    options.db = location
    location = null
  } else if (typeof location == 'object' && typeof location.db == 'function') {
    options = location
    location = null
  }


  if (typeof options == 'function') {
    callback = options
    options  = {}
  }

  if ((!options || typeof options.db != 'function') && typeof location != 'string') {
    error = new InitializationError(
        'Must provide a location for the database')
    if (callback) {
      return process.nextTick(function () {
        callback(error)
      })
    }
    throw error
  }

  options      = getOptions(options)
  this.options = extend(defaultOptions, options)
  this._codec = new Codec(this.options)
  this._status = 'new'
  // set this.location as enumerable but not configurable or writable
  prr(this, 'location', location, 'e')

  this.open(callback)
}

inherits(LevelUP, EventEmitter)

LevelUP.prototype.open = function (callback) {
  var self = this
    , dbFactory
    , db

  if (this.isOpen()) {
    if (callback)
      process.nextTick(function () { callback(null, self) })
    return this
  }

  if (this._isOpening()) {
    return callback && this.once(
        'open'
      , function () { callback(null, self) }
    )
  }

  this.emit('opening')

  this._status = 'opening'
  this.db      = new DeferredLevelDOWN(this.location)
  dbFactory    = this.options.db || getLevelDOWN()
  db           = dbFactory(this.location)

  db.open(this.options, function (err) {
    if (err) {
      return dispatchError(self, new OpenError(err), callback)
    } else {
      self.db.setDb(db)
      self.db = db
      self._status = 'open'
      if (callback)
        callback(null, self)
      self.emit('open')
      self.emit('ready')
    }
  })
}

LevelUP.prototype.close = function (callback) {
  var self = this

  if (this.isOpen()) {
    this._status = 'closing'
    this.db.close(function () {
      self._status = 'closed'
      self.emit('closed')
      if (callback)
        callback.apply(null, arguments)
    })
    this.emit('closing')
    this.db = new DeferredLevelDOWN(this.location)
  } else if (this._status == 'closed' && callback) {
    return process.nextTick(callback)
  } else if (this._status == 'closing' && callback) {
    this.once('closed', callback)
  } else if (this._isOpening()) {
    this.once('open', function () {
      self.close(callback)
    })
  }
}

LevelUP.prototype.isOpen = function () {
  return this._status == 'open'
}

LevelUP.prototype._isOpening = function () {
  return this._status == 'opening'
}

LevelUP.prototype.isClosed = function () {
  return (/^clos/).test(this._status)
}

function maybeError(db, options, callback) {
  if (!db._isOpening() && !db.isOpen()) {
    dispatchError(
        db
      , new ReadError('Database is not open')
      , callback
    )
    return true
  }
}

function writeError (db, message, callback) {
  dispatchError(
      db
     , new WriteError(message)
     , callback
  )
}

function readError (db, message, callback) {
  dispatchError(
      db
     , new ReadError(message)
     , callback
  )
}


LevelUP.prototype.get = function (key_, options, callback) {
  var self = this
    , key

  callback = getCallback(options, callback)

  if (maybeError(this, options, callback))
    return

  if (key_ === null || key_ === undefined || 'function' !== typeof callback)
    return readError(this
      , 'get() requires key and callback arguments', callback)

  options = util.getOptions(options)
  key = this._codec.encodeKey(key_, options)

  options.asBuffer = this._codec.valueAsBuffer(options)

  this.db.get(key, options, function (err, value) {
    if (err) {
      if ((/notfound/i).test(err) || err.notFound) {
        err = new NotFoundError(
            'Key not found in database [' + key_ + ']', err)
      } else {
        err = new ReadError(err)
      }
      return dispatchError(self, err, callback)
    }
    if (callback) {
      try {
        value = self._codec.decodeValue(value, options)
      } catch (e) {
        return callback(new EncodingError(e))
      }
      callback(null, value)
    }
  })
}

LevelUP.prototype.put = function (key_, value_, options, callback) {
  var self = this
    , key
    , value

  callback = getCallback(options, callback)

  if (key_ === null || key_ === undefined)
    return writeError(this, 'put() requires a key argument', callback)

  if (maybeError(this, options, callback))
    return

  options = getOptions(options)
  key     = this._codec.encodeKey(key_, options)
  value   = this._codec.encodeValue(value_, options)

  this.db.put(key, value, options, function (err) {
    if (err) {
      return dispatchError(self, new WriteError(err), callback)
    } else {
      self.emit('put', key_, value_)
      if (callback)
        callback()
    }
  })
}

LevelUP.prototype.del = function (key_, options, callback) {
  var self = this
    , key

  callback = getCallback(options, callback)

  if (key_ === null || key_ === undefined)
    return writeError(this, 'del() requires a key argument', callback)

  if (maybeError(this, options, callback))
    return

  options = getOptions(options)
  key     = this._codec.encodeKey(key_, options)

  this.db.del(key, options, function (err) {
    if (err) {
      return dispatchError(self, new WriteError(err), callback)
    } else {
      self.emit('del', key_)
      if (callback)
        callback()
    }
  })
}

LevelUP.prototype.batch = function (arr_, options, callback) {
  var self = this
    , keyEnc
    , valueEnc
    , arr

  if (!arguments.length)
    return new Batch(this, this._codec)

  callback = getCallback(options, callback)

  if (!Array.isArray(arr_))
    return writeError(this, 'batch() requires an array argument', callback)

  if (maybeError(this, options, callback))
    return

  options  = getOptions(options)
  arr      = self._codec.encodeBatch(arr_, options)
  arr      = arr.map(function (op) {
    if (!op.type && op.key !== undefined && op.value !== undefined)
      op.type = 'put'
    return op
  })

  this.db.batch(arr, options, function (err) {
    if (err) {
      return dispatchError(self, new WriteError(err), callback)
    } else {
      self.emit('batch', arr_)
      if (callback)
        callback()
    }
  })
}

LevelUP.prototype.approximateSize = deprecate(function (start_, end_, options, callback) {   
  var self = this    
    , start    
    , end    
   
  callback = getCallback(options, callback)    
   
  options = getOptions(options)    
   
  if (start_ === null || start_ === undefined    
        || end_ === null || end_ === undefined || 'function' !== typeof callback)    
    return readError(this, 'approximateSize() requires start, end and callback arguments', callback)   
   
  start = this._codec.encodeKey(start_, options)   
  end   = this._codec.encodeKey(end_, options)   
   
  this.db.approximateSize(start, end, function (err, size) {   
    if (err) {   
      return dispatchError(self, new OpenError(err), callback)   
    } else if (callback) {   
      callback(null, size)   
    }    
  })   
}, 'db.approximateSize() is deprecated. Use db.db.approximateSize() instead')

LevelUP.prototype.readStream =
LevelUP.prototype.createReadStream = function (options) {
  options = extend( {keys: true, values: true}, this.options, options)

  options.keyEncoding   = options.keyEncoding
  options.valueEncoding = options.valueEncoding

  options = this._codec.encodeLtgt(options);
  options.keyAsBuffer   = this._codec.keyAsBuffer(options)
  options.valueAsBuffer = this._codec.valueAsBuffer(options)

  if ('number' !== typeof options.limit)
    options.limit = -1

  return new IteratorStream(this.db.iterator(options), extend(options, {
    decoder: this._codec.createStreamDecoder(options)
  }))
}

LevelUP.prototype.keyStream =
LevelUP.prototype.createKeyStream = function (options) {
  return this.createReadStream(extend(options, { keys: true, values: false }))
}

LevelUP.prototype.valueStream =
LevelUP.prototype.createValueStream = function (options) {
  return this.createReadStream(extend(options, { keys: false, values: true }))
}

LevelUP.prototype.toString = function () {
  return 'LevelUP'
}

function utilStatic (name) {
  return function (location, callback) {
    getLevelDOWN()[name](location, callback || function () {})
  }
}

module.exports         = LevelUP
module.exports.errors  = require('level-errors')
module.exports.destroy = deprecate(
    utilStatic('destroy')
  , 'levelup.destroy() is deprecated. Use leveldown.destroy() instead'
)
module.exports.repair  = deprecate(
    utilStatic('repair')
  , 'levelup.repair() is deprecated. Use leveldown.repair() instead'
)


}).call(this,require('_process'))
},{"./batch":135,"./util":137,"_process":11,"deferred-leveldown":138,"events":8,"level-codec":142,"level-errors":144,"level-iterator-stream":148,"prr":159,"util":32,"xtend":160}],137:[function(require,module,exports){
/* Copyright (c) 2012-2015 LevelUP contributors
 * See list at <https://github.com/level/levelup#contributing>
 * MIT License
 * <https://github.com/level/levelup/blob/master/LICENSE.md>
 */

var extend         = require('xtend')
  , LevelUPError   = require('level-errors').LevelUPError
  , format         = require('util').format
  , defaultOptions = {
        createIfMissing : true
      , errorIfExists   : false
      , keyEncoding     : 'utf8'
      , valueEncoding   : 'utf8'
      , compression     : true
    }

  , leveldown

function getOptions (options) {
  if (typeof options == 'string')
    options = { valueEncoding: options }
  if (typeof options != 'object')
    options = {}
  return options
}

function getLevelDOWN () {
  if (leveldown)
    return leveldown

  var requiredVersion  = require('../package.json').devDependencies.leveldown
    , leveldownVersion

  try {
    leveldownVersion = require('leveldown/package').version
  } catch (e) {
    throw requireError(e)
  }

  if (!require('semver').satisfies(leveldownVersion, requiredVersion)) {
    throw new LevelUPError(
        'Installed version of LevelDOWN ('
      + leveldownVersion
      + ') does not match required version ('
      + requiredVersion
      + ')'
    )
  }

  try {
    return leveldown = require('leveldown')
  } catch (e) {
    throw requireError(e)
  }
}

function requireError (e) {
  var template = 'Failed to require LevelDOWN (%s). Try `npm install leveldown` if it\'s missing'
  return new LevelUPError(format(template, e.message))
}

function dispatchError (db, error, callback) {
  typeof callback == 'function' ? callback(error) : db.emit('error', error)
}

function isDefined (v) {
  return typeof v !== 'undefined'
}

module.exports = {
    defaultOptions  : defaultOptions
  , getOptions      : getOptions
  , getLevelDOWN    : getLevelDOWN
  , dispatchError   : dispatchError
  , isDefined       : isDefined
}

},{"../package.json":161,"level-errors":144,"leveldown":2,"leveldown/package":2,"semver":2,"util":32,"xtend":160}],138:[function(require,module,exports){
(function (process,Buffer){
var util              = require('util')
  , AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN
  , AbstractIterator  = require('abstract-leveldown').AbstractIterator

function DeferredLevelDOWN (location) {
  AbstractLevelDOWN.call(this, typeof location == 'string' ? location : '') // optional location, who cares?
  this._db         = undefined
  this._operations = []
  this._iterators  = []
}

util.inherits(DeferredLevelDOWN, AbstractLevelDOWN)

// called by LevelUP when we have a real DB to take its place
DeferredLevelDOWN.prototype.setDb = function (db) {
  this._db = db
  this._operations.forEach(function (op) {
    db[op.method].apply(db, op.args)
  })
  this._iterators.forEach(function (it) {
    it.setDb(db)
  })
}

DeferredLevelDOWN.prototype._open = function (options, callback) {
  return process.nextTick(callback)
}

// queue a new deferred operation
DeferredLevelDOWN.prototype._operation = function (method, args) {
  if (this._db)
    return this._db[method].apply(this._db, args)
  this._operations.push({ method: method, args: args })
}

// deferrables
'put get del batch approximateSize'.split(' ').forEach(function (m) {
  DeferredLevelDOWN.prototype['_' + m] = function () {
    this._operation(m, arguments)
  }
})

DeferredLevelDOWN.prototype._isBuffer = function (obj) {
  return Buffer.isBuffer(obj)
}

DeferredLevelDOWN.prototype._iterator = function (options) {
  var it = new Iterator(options)
  this._iterators.push(it)
  return it
}

function Iterator (options) {
  AbstractIterator.call(this, options)

  this._options = options
  this._iterator = null
  this._operations = []
}

util.inherits(Iterator, AbstractIterator)

Iterator.prototype.setDb = function (db) {
  var it = this._iterator = db.iterator(this._options)
  this._operations.forEach(function (op) {
    it[op.method].apply(it, op.args)
  })
}

Iterator.prototype._operation = function (method, args) {
  if (this._iterator)
    return this._iterator[method].apply(this._iterator, args)
  this._operations.push({ method: method, args: args })
}

'next end'.split(' ').forEach(function (m) {
  Iterator.prototype['_' + m] = function () {
    this._operation(m, arguments)
  }
})

module.exports = DeferredLevelDOWN


}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":11,"abstract-leveldown":141,"buffer":3,"util":32}],139:[function(require,module,exports){
(function (process){
/* Copyright (c) 2013 Rod Vagg, MIT License */

function AbstractChainedBatch (db) {
  this._db         = db
  this._operations = []
  this._written    = false
}

AbstractChainedBatch.prototype._checkWritten = function () {
  if (this._written)
    throw new Error('write() already called on this batch')
}

AbstractChainedBatch.prototype.put = function (key, value) {
  this._checkWritten()

  var err = this._db._checkKey(key, 'key', this._db._isBuffer)
  if (err)
    throw err

  if (!this._db._isBuffer(key)) key = String(key)
  if (!this._db._isBuffer(value)) value = String(value)

  if (typeof this._put == 'function' )
    this._put(key, value)
  else
    this._operations.push({ type: 'put', key: key, value: value })

  return this
}

AbstractChainedBatch.prototype.del = function (key) {
  this._checkWritten()

  var err = this._db._checkKey(key, 'key', this._db._isBuffer)
  if (err) throw err

  if (!this._db._isBuffer(key)) key = String(key)

  if (typeof this._del == 'function' )
    this._del(key)
  else
    this._operations.push({ type: 'del', key: key })

  return this
}

AbstractChainedBatch.prototype.clear = function () {
  this._checkWritten()

  this._operations = []

  if (typeof this._clear == 'function' )
    this._clear()

  return this
}

AbstractChainedBatch.prototype.write = function (options, callback) {
  this._checkWritten()

  if (typeof options == 'function')
    callback = options
  if (typeof callback != 'function')
    throw new Error('write() requires a callback argument')
  if (typeof options != 'object')
    options = {}

  this._written = true

  if (typeof this._write == 'function' )
    return this._write(callback)

  if (typeof this._db._batch == 'function')
    return this._db._batch(this._operations, options, callback)

  process.nextTick(callback)
}

module.exports = AbstractChainedBatch
}).call(this,require('_process'))
},{"_process":11}],140:[function(require,module,exports){
arguments[4][121][0].apply(exports,arguments)
},{"_process":11,"dup":121}],141:[function(require,module,exports){
(function (process,Buffer){
/* Copyright (c) 2013 Rod Vagg, MIT License */

var xtend                = require('xtend')
  , AbstractIterator     = require('./abstract-iterator')
  , AbstractChainedBatch = require('./abstract-chained-batch')

function AbstractLevelDOWN (location) {
  if (!arguments.length || location === undefined)
    throw new Error('constructor requires at least a location argument')

  if (typeof location != 'string')
    throw new Error('constructor requires a location string argument')

  this.location = location
}

AbstractLevelDOWN.prototype.open = function (options, callback) {
  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('open() requires a callback argument')

  if (typeof options != 'object')
    options = {}

  options.createIfMissing = options.createIfMissing != false
  options.errorIfExists = !!options.errorIfExists

  if (typeof this._open == 'function')
    return this._open(options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.close = function (callback) {
  if (typeof callback != 'function')
    throw new Error('close() requires a callback argument')

  if (typeof this._close == 'function')
    return this._close(callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.get = function (key, options, callback) {
  var err

  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('get() requires a callback argument')

  if (err = this._checkKey(key, 'key', this._isBuffer))
    return callback(err)

  if (!this._isBuffer(key))
    key = String(key)

  if (typeof options != 'object')
    options = {}

  options.asBuffer = options.asBuffer != false

  if (typeof this._get == 'function')
    return this._get(key, options, callback)

  process.nextTick(function () { callback(new Error('NotFound')) })
}

AbstractLevelDOWN.prototype.put = function (key, value, options, callback) {
  var err

  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('put() requires a callback argument')

  if (err = this._checkKey(key, 'key', this._isBuffer))
    return callback(err)

  if (!this._isBuffer(key))
    key = String(key)

  // coerce value to string in node, don't touch it in browser
  // (indexeddb can store any JS type)
  if (value != null && !this._isBuffer(value) && !process.browser)
    value = String(value)

  if (typeof options != 'object')
    options = {}

  if (typeof this._put == 'function')
    return this._put(key, value, options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.del = function (key, options, callback) {
  var err

  if (typeof options == 'function')
    callback = options

  if (typeof callback != 'function')
    throw new Error('del() requires a callback argument')

  if (err = this._checkKey(key, 'key', this._isBuffer))
    return callback(err)

  if (!this._isBuffer(key))
    key = String(key)

  if (typeof options != 'object')
    options = {}

  if (typeof this._del == 'function')
    return this._del(key, options, callback)

  process.nextTick(callback)
}

AbstractLevelDOWN.prototype.batch = function (array, options, callback) {
  if (!arguments.length)
    return this._chainedBatch()

  if (typeof options == 'function')
    callback = options

  if (typeof array == 'function')
    callback = array

  if (typeof callback != 'function')
    throw new Error('batch(array) requires a callback argument')

  if (!Array.isArray(array))
    return callback(new Error('batch(array) requires an array argument'))

  if (!options || typeof options != 'object')
    options = {}

  var i = 0
    , l = array.length
    , e
    , err

  for (; i < l; i++) {
    e = array[i]
    if (typeof e != 'object')
      continue

    if (err = this._checkKey(e.type, 'type', this._isBuffer))
      return callback(err)

    if (err = this._checkKey(e.key, 'key', this._isBuffer))
      return callback(err)
  }

  if (typeof this._batch == 'function')
    return this._batch(array, options, callback)

  process.nextTick(callback)
}

//TODO: remove from here, not a necessary primitive
AbstractLevelDOWN.prototype.approximateSize = function (start, end, callback) {
  if (   start == null
      || end == null
      || typeof start == 'function'
      || typeof end == 'function') {
    throw new Error('approximateSize() requires valid `start`, `end` and `callback` arguments')
  }

  if (typeof callback != 'function')
    throw new Error('approximateSize() requires a callback argument')

  if (!this._isBuffer(start))
    start = String(start)

  if (!this._isBuffer(end))
    end = String(end)

  if (typeof this._approximateSize == 'function')
    return this._approximateSize(start, end, callback)

  process.nextTick(function () {
    callback(null, 0)
  })
}

AbstractLevelDOWN.prototype._setupIteratorOptions = function (options) {
  var self = this

  options = xtend(options)

  ;[ 'start', 'end', 'gt', 'gte', 'lt', 'lte' ].forEach(function (o) {
    if (options[o] && self._isBuffer(options[o]) && options[o].length === 0)
      delete options[o]
  })

  options.reverse = !!options.reverse
  options.keys = options.keys != false
  options.values = options.values != false
  options.limit = 'limit' in options ? options.limit : -1
  options.keyAsBuffer = options.keyAsBuffer != false
  options.valueAsBuffer = options.valueAsBuffer != false

  return options
}

AbstractLevelDOWN.prototype.iterator = function (options) {
  if (typeof options != 'object')
    options = {}

  options = this._setupIteratorOptions(options)

  if (typeof this._iterator == 'function')
    return this._iterator(options)

  return new AbstractIterator(this)
}

AbstractLevelDOWN.prototype._chainedBatch = function () {
  return new AbstractChainedBatch(this)
}

AbstractLevelDOWN.prototype._isBuffer = function (obj) {
  return Buffer.isBuffer(obj)
}

AbstractLevelDOWN.prototype._checkKey = function (obj, type) {

  if (obj === null || obj === undefined)
    return new Error(type + ' cannot be `null` or `undefined`')

  if (this._isBuffer(obj)) {
    if (obj.length === 0)
      return new Error(type + ' cannot be an empty Buffer')
  } else if (String(obj) === '')
    return new Error(type + ' cannot be an empty String')
}

module.exports.AbstractLevelDOWN    = AbstractLevelDOWN
module.exports.AbstractIterator     = AbstractIterator
module.exports.AbstractChainedBatch = AbstractChainedBatch

}).call(this,require('_process'),require("buffer").Buffer)
},{"./abstract-chained-batch":139,"./abstract-iterator":140,"_process":11,"buffer":3,"xtend":160}],142:[function(require,module,exports){
var encodings = require('./lib/encodings');

module.exports = Codec;

function Codec(opts){
  this.opts = opts || {};
  this.encodings = encodings;
}

Codec.prototype._encoding = function(encoding){
  if (typeof encoding == 'string') encoding = encodings[encoding];
  if (!encoding) encoding = encodings.id;
  return encoding;
};

Codec.prototype._keyEncoding = function(opts, batchOpts){
  return this._encoding(batchOpts && batchOpts.keyEncoding
    || opts && opts.keyEncoding
    || this.opts.keyEncoding);
};

Codec.prototype._valueEncoding = function(opts, batchOpts){
  return this._encoding(batchOpts && batchOpts.valueEncoding
    || opts && opts.valueEncoding
    || this.opts.valueEncoding);
};

Codec.prototype.encodeKey = function(key, opts, batchOpts){
  return this._keyEncoding(opts, batchOpts).encode(key);
};

Codec.prototype.encodeValue = function(value, opts, batchOpts){
  return this._valueEncoding(opts, batchOpts).encode(value);
};

Codec.prototype.decodeKey = function(key, opts){
  return this._keyEncoding(opts).decode(key);
};

Codec.prototype.decodeValue = function(value, opts){
  return this._valueEncoding(opts).decode(value);
};

Codec.prototype.encodeBatch = function(ops, opts){
  var self = this;

  return ops.map(function(_op){
    var op = {
      type: _op.type,
      key: self.encodeKey(_op.key, opts, _op)
    };
    if (self.keyAsBuffer(opts, _op)) op.keyEncoding = 'binary';
    if (_op.prefix) op.prefix = _op.prefix;
    if ('value' in _op) {
      op.value = self.encodeValue(_op.value, opts, _op);
      if (self.valueAsBuffer(opts, _op)) op.valueEncoding = 'binary';
    }
    return op;
  });
};

var ltgtKeys = ['lt', 'gt', 'lte', 'gte', 'start', 'end'];

Codec.prototype.encodeLtgt = function(ltgt){
  var self = this;
  var ret = {};
  Object.keys(ltgt).forEach(function(key){
    ret[key] = ltgtKeys.indexOf(key) > -1
      ? self.encodeKey(ltgt[key], ltgt)
      : ltgt[key]
  });
  return ret;
};

Codec.prototype.createStreamDecoder = function(opts){
  var self = this;

  if (opts.keys && opts.values) {
    return function(key, value){
      return {
        key: self.decodeKey(key, opts),
        value: self.decodeValue(value, opts)
      };
    };
  } else if (opts.keys) {
    return function(key) {
      return self.decodeKey(key, opts);
    }; 
  } else if (opts.values) {
    return function(_, value){
      return self.decodeValue(value, opts);
    }
  } else {
    return function(){};
  }
};

Codec.prototype.keyAsBuffer = function(opts){
  return this._keyEncoding(opts).buffer;
};

Codec.prototype.valueAsBuffer = function(opts){
  return this._valueEncoding(opts).buffer;
};


},{"./lib/encodings":143}],143:[function(require,module,exports){
(function (Buffer){

exports.utf8 = exports['utf-8'] = {
  encode: function(data){
    return isBinary(data)
      ? data
      : String(data);
  },
  decode: identity,
  buffer: false,
  type: 'utf8'
};

exports.json = {
  encode: JSON.stringify,
  decode: JSON.parse,
  buffer: false,
  type: 'json'
};

exports.binary = {
  encode: function(data){
    return isBinary(data)
      ? data
      : new Buffer(data);      
  },
  decode: identity,
  buffer: true,
  type: 'binary'
};

exports.id = {
  encode: function(data){
    return data;
  },
  decode: function(data){
    return data;
  },
  buffer: false,
  type: 'id'
};

var bufferEncodings = [
  'hex',
  'ascii',
  'base64',
  'ucs2',
  'ucs-2',
  'utf16le',
  'utf-16le'
];

bufferEncodings.forEach(function(type){
  exports[type] = {
    encode: function(data){
      return isBinary(data)
        ? data
        : new Buffer(data, type);
    },
    decode: function(buffer){
      return buffer.toString(type);
    },
    buffer: true,
    type: type
  };
});

function identity(value){
  return value;
}

function isBinary(data){
  return data === undefined
    || data === null
    || Buffer.isBuffer(data);
}


}).call(this,require("buffer").Buffer)
},{"buffer":3}],144:[function(require,module,exports){
/* Copyright (c) 2012-2015 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License
 * <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

var createError   = require('errno').create
  , LevelUPError  = createError('LevelUPError')
  , NotFoundError = createError('NotFoundError', LevelUPError)

NotFoundError.prototype.notFound = true
NotFoundError.prototype.status   = 404

module.exports = {
    LevelUPError        : LevelUPError
  , InitializationError : createError('InitializationError', LevelUPError)
  , OpenError           : createError('OpenError', LevelUPError)
  , ReadError           : createError('ReadError', LevelUPError)
  , WriteError          : createError('WriteError', LevelUPError)
  , NotFoundError       : NotFoundError
  , EncodingError       : createError('EncodingError', LevelUPError)
}

},{"errno":146}],145:[function(require,module,exports){
var prr = require('prr')

function init (type, message, cause) {
  prr(this, {
      type    : type
    , name    : type
      // can be passed just a 'cause'
    , cause   : typeof message != 'string' ? message : cause
    , message : !!message && typeof message != 'string' ? message.message : message

  }, 'ewr')
}

// generic prototype, not intended to be actually used - helpful for `instanceof`
function CustomError (message, cause) {
  Error.call(this)
  if (Error.captureStackTrace)
    Error.captureStackTrace(this, arguments.callee)
  init.call(this, 'CustomError', message, cause)
}

CustomError.prototype = new Error()

function createError (errno, type, proto) {
  var err = function (message, cause) {
    init.call(this, type, message, cause)
    //TODO: the specificity here is stupid, errno should be available everywhere
    if (type == 'FilesystemError') {
      this.code    = this.cause.code
      this.path    = this.cause.path
      this.errno   = this.cause.errno
      this.message =
        (errno.errno[this.cause.errno]
          ? errno.errno[this.cause.errno].description
          : this.cause.message)
        + (this.cause.path ? ' [' + this.cause.path + ']' : '')
    }
    Error.call(this)
    if (Error.captureStackTrace)
      Error.captureStackTrace(this, arguments.callee)
  }
  err.prototype = !!proto ? new proto() : new CustomError()
  return err
}

module.exports = function (errno) {
  var ce = function (type, proto) {
    return createError(errno, type, proto)
  }
  return {
      CustomError     : CustomError
    , FilesystemError : ce('FilesystemError')
    , createError     : ce
  }
}

},{"prr":147}],146:[function(require,module,exports){
var all = module.exports.all = [
  {
    errno: -2,
    code: 'ENOENT',
    description: 'no such file or directory'
  },
  {
    errno: -1,
    code: 'UNKNOWN',
    description: 'unknown error'
  },
  {
    errno: 0,
    code: 'OK',
    description: 'success'
  },
  {
    errno: 1,
    code: 'EOF',
    description: 'end of file'
  },
  {
    errno: 2,
    code: 'EADDRINFO',
    description: 'getaddrinfo error'
  },
  {
    errno: 3,
    code: 'EACCES',
    description: 'permission denied'
  },
  {
    errno: 4,
    code: 'EAGAIN',
    description: 'resource temporarily unavailable'
  },
  {
    errno: 5,
    code: 'EADDRINUSE',
    description: 'address already in use'
  },
  {
    errno: 6,
    code: 'EADDRNOTAVAIL',
    description: 'address not available'
  },
  {
    errno: 7,
    code: 'EAFNOSUPPORT',
    description: 'address family not supported'
  },
  {
    errno: 8,
    code: 'EALREADY',
    description: 'connection already in progress'
  },
  {
    errno: 9,
    code: 'EBADF',
    description: 'bad file descriptor'
  },
  {
    errno: 10,
    code: 'EBUSY',
    description: 'resource busy or locked'
  },
  {
    errno: 11,
    code: 'ECONNABORTED',
    description: 'software caused connection abort'
  },
  {
    errno: 12,
    code: 'ECONNREFUSED',
    description: 'connection refused'
  },
  {
    errno: 13,
    code: 'ECONNRESET',
    description: 'connection reset by peer'
  },
  {
    errno: 14,
    code: 'EDESTADDRREQ',
    description: 'destination address required'
  },
  {
    errno: 15,
    code: 'EFAULT',
    description: 'bad address in system call argument'
  },
  {
    errno: 16,
    code: 'EHOSTUNREACH',
    description: 'host is unreachable'
  },
  {
    errno: 17,
    code: 'EINTR',
    description: 'interrupted system call'
  },
  {
    errno: 18,
    code: 'EINVAL',
    description: 'invalid argument'
  },
  {
    errno: 19,
    code: 'EISCONN',
    description: 'socket is already connected'
  },
  {
    errno: 20,
    code: 'EMFILE',
    description: 'too many open files'
  },
  {
    errno: 21,
    code: 'EMSGSIZE',
    description: 'message too long'
  },
  {
    errno: 22,
    code: 'ENETDOWN',
    description: 'network is down'
  },
  {
    errno: 23,
    code: 'ENETUNREACH',
    description: 'network is unreachable'
  },
  {
    errno: 24,
    code: 'ENFILE',
    description: 'file table overflow'
  },
  {
    errno: 25,
    code: 'ENOBUFS',
    description: 'no buffer space available'
  },
  {
    errno: 26,
    code: 'ENOMEM',
    description: 'not enough memory'
  },
  {
    errno: 27,
    code: 'ENOTDIR',
    description: 'not a directory'
  },
  {
    errno: 28,
    code: 'EISDIR',
    description: 'illegal operation on a directory'
  },
  {
    errno: 29,
    code: 'ENONET',
    description: 'machine is not on the network'
  },
  {
    errno: 31,
    code: 'ENOTCONN',
    description: 'socket is not connected'
  },
  {
    errno: 32,
    code: 'ENOTSOCK',
    description: 'socket operation on non-socket'
  },
  {
    errno: 33,
    code: 'ENOTSUP',
    description: 'operation not supported on socket'
  },
  {
    errno: 34,
    code: 'ENOENT',
    description: 'no such file or directory'
  },
  {
    errno: 35,
    code: 'ENOSYS',
    description: 'function not implemented'
  },
  {
    errno: 36,
    code: 'EPIPE',
    description: 'broken pipe'
  },
  {
    errno: 37,
    code: 'EPROTO',
    description: 'protocol error'
  },
  {
    errno: 38,
    code: 'EPROTONOSUPPORT',
    description: 'protocol not supported'
  },
  {
    errno: 39,
    code: 'EPROTOTYPE',
    description: 'protocol wrong type for socket'
  },
  {
    errno: 40,
    code: 'ETIMEDOUT',
    description: 'connection timed out'
  },
  {
    errno: 41,
    code: 'ECHARSET',
    description: 'invalid Unicode character'
  },
  {
    errno: 42,
    code: 'EAIFAMNOSUPPORT',
    description: 'address family for hostname not supported'
  },
  {
    errno: 44,
    code: 'EAISERVICE',
    description: 'servname not supported for ai_socktype'
  },
  {
    errno: 45,
    code: 'EAISOCKTYPE',
    description: 'ai_socktype not supported'
  },
  {
    errno: 46,
    code: 'ESHUTDOWN',
    description: 'cannot send after transport endpoint shutdown'
  },
  {
    errno: 47,
    code: 'EEXIST',
    description: 'file already exists'
  },
  {
    errno: 48,
    code: 'ESRCH',
    description: 'no such process'
  },
  {
    errno: 49,
    code: 'ENAMETOOLONG',
    description: 'name too long'
  },
  {
    errno: 50,
    code: 'EPERM',
    description: 'operation not permitted'
  },
  {
    errno: 51,
    code: 'ELOOP',
    description: 'too many symbolic links encountered'
  },
  {
    errno: 52,
    code: 'EXDEV',
    description: 'cross-device link not permitted'
  },
  {
    errno: 53,
    code: 'ENOTEMPTY',
    description: 'directory not empty'
  },
  {
    errno: 54,
    code: 'ENOSPC',
    description: 'no space left on device'
  },
  {
    errno: 55,
    code: 'EIO',
    description: 'i/o error'
  },
  {
    errno: 56,
    code: 'EROFS',
    description: 'read-only file system'
  },
  {
    errno: 57,
    code: 'ENODEV',
    description: 'no such device'
  },
  {
    errno: 58,
    code: 'ESPIPE',
    description: 'invalid seek'
  },
  {
    errno: 59,
    code: 'ECANCELED',
    description: 'operation canceled'
  }
]

module.exports.errno = {}
module.exports.code = {}

all.forEach(function (error) {
  module.exports.errno[error.errno] = error
  module.exports.code[error.code] = error
})

module.exports.custom = require('./custom')(module.exports)
module.exports.create = module.exports.custom.createError

},{"./custom":145}],147:[function(require,module,exports){
/*!
  * prr
  * (c) 2013 Rod Vagg <rod@vagg.org>
  * https://github.com/rvagg/prr
  * License: MIT
  */

(function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports)
    module.exports = definition()
  else
    context[name] = definition()
})('prr', this, function() {

  var setProperty = typeof Object.defineProperty == 'function'
      ? function (obj, key, options) {
          Object.defineProperty(obj, key, options)
          return obj
        }
      : function (obj, key, options) { // < es5
          obj[key] = options.value
          return obj
        }

    , makeOptions = function (value, options) {
        var oo = typeof options == 'object'
          , os = !oo && typeof options == 'string'
          , op = function (p) {
              return oo
                ? !!options[p]
                : os
                  ? options.indexOf(p[0]) > -1
                  : false
            }

        return {
            enumerable   : op('enumerable')
          , configurable : op('configurable')
          , writable     : op('writable')
          , value        : value
        }
      }

    , prr = function (obj, key, value, options) {
        var k

        options = makeOptions(value, options)

        if (typeof key == 'object') {
          for (k in key) {
            if (Object.hasOwnProperty.call(key, k)) {
              options.value = key[k]
              setProperty(obj, k, options)
            }
          }
          return obj
        }

        return setProperty(obj, key, options)
      }

  return prr
})
},{}],148:[function(require,module,exports){
var inherits = require('inherits');
var Readable = require('readable-stream').Readable;
var extend = require('xtend');
var EncodingError = require('level-errors').EncodingError;

module.exports = ReadStream;
inherits(ReadStream, Readable);

function ReadStream(iterator, options){
  if (!(this instanceof ReadStream)) return new ReadStream(iterator, options);
  Readable.call(this, extend(options, {
    objectMode: true
  }));
  this._iterator = iterator;
  this._destroyed = false;
  this._decoder = null;
  if (options && options.decoder) this._decoder = options.decoder;
  this.on('end', this._cleanup.bind(this));
}

ReadStream.prototype._read = function(){
  var self = this;
  if (this._destroyed) return;

  this._iterator.next(function(err, key, value){
    if (self._destroyed) return;
    if (err) return self.emit('error', err);
    if (key === undefined && value === undefined) {
      self.push(null);
    } else {
      if (!self._decoder) return self.push({ key: key, value: value });

      try {
        var value = self._decoder(key, value);
      } catch (err) {
        self.emit('error', new EncodingError(err));
        self.push(null);
        return;
      }
      self.push(value);
    }
  });
};

ReadStream.prototype.destroy =
ReadStream.prototype._cleanup = function(){
  var self = this;
  if (this._destroyed) return;
  this._destroyed = true;

  this._iterator.end(function(err){
    if (err) return self.emit('error', err);
    self.emit('close');
  });
};


},{"inherits":149,"level-errors":144,"readable-stream":158,"xtend":160}],149:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],150:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":152,"./_stream_writable":154,"_process":11,"core-util-is":155,"dup":17,"inherits":149}],151:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./_stream_transform":153,"core-util-is":155,"dup":18,"inherits":149}],152:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./_stream_duplex":150,"_process":11,"buffer":3,"core-util-is":155,"dup":19,"events":8,"inherits":149,"isarray":156,"stream":27,"string_decoder/":157,"util":2}],153:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./_stream_duplex":150,"core-util-is":155,"dup":20,"inherits":149}],154:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./_stream_duplex":150,"_process":11,"buffer":3,"core-util-is":155,"dup":21,"inherits":149,"stream":27}],155:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],156:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],157:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],158:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"./lib/_stream_duplex.js":150,"./lib/_stream_passthrough.js":151,"./lib/_stream_readable.js":152,"./lib/_stream_transform.js":153,"./lib/_stream_writable.js":154,"dup":24,"stream":27}],159:[function(require,module,exports){
arguments[4][147][0].apply(exports,arguments)
},{"dup":147}],160:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],161:[function(require,module,exports){
module.exports={
  "name": "levelup",
  "description": "Fast & simple storage - a Node.js-style LevelDB wrapper",
  "version": "1.2.1",
  "contributors": [
    {
      "name": "Rod Vagg",
      "email": "r@va.gg",
      "url": "https://github.com/rvagg"
    },
    {
      "name": "John Chesley",
      "email": "john@chesl.es",
      "url": "https://github.com/chesles/"
    },
    {
      "name": "Jake Verbaten",
      "email": "raynos2@gmail.com",
      "url": "https://github.com/raynos"
    },
    {
      "name": "Dominic Tarr",
      "email": "dominic.tarr@gmail.com",
      "url": "https://github.com/dominictarr"
    },
    {
      "name": "Max Ogden",
      "email": "max@maxogden.com",
      "url": "https://github.com/maxogden"
    },
    {
      "name": "Lars-Magnus Skog",
      "email": "ralphtheninja@riseup.net",
      "url": "https://github.com/ralphtheninja"
    },
    {
      "name": "David Björklund",
      "email": "david.bjorklund@gmail.com",
      "url": "https://github.com/kesla"
    },
    {
      "name": "Julian Gruber",
      "email": "julian@juliangruber.com",
      "url": "https://github.com/juliangruber"
    },
    {
      "name": "Paolo Fragomeni",
      "email": "paolo@async.ly",
      "url": "https://github.com/hij1nx"
    },
    {
      "name": "Anton Whalley",
      "email": "anton.whalley@nearform.com",
      "url": "https://github.com/No9"
    },
    {
      "name": "Matteo Collina",
      "email": "matteo.collina@gmail.com",
      "url": "https://github.com/mcollina"
    },
    {
      "name": "Pedro Teixeira",
      "email": "pedro.teixeira@gmail.com",
      "url": "https://github.com/pgte"
    },
    {
      "name": "James Halliday",
      "email": "mail@substack.net",
      "url": "https://github.com/substack"
    },
    {
      "name": "Jarrett Cruger",
      "email": "jcrugzz@gmail.com",
      "url": "https://github.com/jcrugzz"
    }
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/level/levelup.git"
  },
  "homepage": "https://github.com/level/levelup",
  "keywords": [
    "leveldb",
    "stream",
    "database",
    "db",
    "store",
    "storage",
    "json"
  ],
  "main": "lib/levelup.js",
  "dependencies": {
    "deferred-leveldown": "~1.0.0",
    "level-codec": "~6.0.0",
    "level-errors": "~1.0.3",
    "level-iterator-stream": "~1.3.0",
    "prr": "~1.0.1",
    "semver": "~4.3.3",
    "xtend": "~4.0.0"
  },
  "devDependencies": {
    "async": "~0.9.0",
    "bustermove": "~1.0.0",
    "delayed": "~1.0.1",
    "faucet": "~0.0.1",
    "leveldown": "^1.1.0",
    "memdown": "~1.0.0",
    "msgpack-js": "~0.3.0",
    "referee": "~1.1.1",
    "rimraf": "~2.3.2",
    "slow-stream": "0.0.4",
    "tape": "~4.0.0"
  },
  "browser": {
    "leveldown": false,
    "leveldown/package": false,
    "semver": false
  },
  "scripts": {
    "test": "tape test/*-test.js | faucet"
  },
  "license": "MIT",
  "gitHead": "8f442f77baea1cdb1b7af844e3374380c2bb015f",
  "bugs": {
    "url": "https://github.com/level/levelup/issues"
  },
  "_id": "levelup@1.2.1",
  "_shasum": "13b537deb4a7536c3aa6fbe008a1af4a0350dbd5",
  "_from": "levelup@>=1.2.0 <1.3.0",
  "_npmVersion": "2.11.0",
  "_nodeVersion": "2.2.1",
  "_npmUser": {
    "name": "ralphtheninja",
    "email": "ralphtheninja@riseup.net"
  },
  "maintainers": [
    {
      "name": "rvagg",
      "email": "rod@vagg.org"
    },
    {
      "name": "ralphtheninja",
      "email": "ralphtheninja@riseup.net"
    },
    {
      "name": "juliangruber",
      "email": "julian@juliangruber.com"
    }
  ],
  "dist": {
    "shasum": "13b537deb4a7536c3aa6fbe008a1af4a0350dbd5",
    "tarball": "http://registry.npmjs.org/levelup/-/levelup-1.2.1.tgz"
  },
  "directories": {},
  "_resolved": "https://registry.npmjs.org/levelup/-/levelup-1.2.1.tgz"
}

},{}],162:[function(require,module,exports){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


module.exports = Duplex;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/



/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

},{"./_stream_readable":163,"./_stream_writable":165,"core-util-is":166,"inherits":167,"process-nextick-args":169}],163:[function(require,module,exports){
(function (process){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/


/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/



/*<replacement>*/
var Stream;
(function (){try{
  Stream = require('st' + 'ream');
}catch(_){}finally{
  if (!Stream)
    Stream = require('events').EventEmitter;
}}())
/*</replacement>*/

var Buffer = require('buffer').Buffer;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/



/*<replacement>*/
var debug = require('util');
if (debug && debug.debuglog) {
  debug = debug.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  var Duplex = require('./_stream_duplex');

  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function')
    this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function() {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      if (!addToFront)
        state.reading = false;

      // if we want the data now, just emit it.
      if (state.flowing && state.length === 0 && !state.sync) {
        stream.emit('data', chunk);
        stream.read(0);
      } else {
        // update the buffer info.
        state.length += state.objectMode ? 1 : chunk.length;
        if (addToFront)
          state.buffer.unshift(chunk);
        else
          state.buffer.push(chunk);

        if (state.needReadable)
          emitReadable(stream);
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else {
      return state.length;
    }
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended)
      endReadable(this);
    else
      emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0)
    endReadable(this);

  if (ret !== null)
    this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!(Buffer.isBuffer(chunk)) &&
      typeof chunk !== 'string' &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync)
      processNextTick(emitReadable_, stream);
    else
      emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    processNextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain &&
        (!dest._writableState || dest._writableState.needDrain))
      ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      debug('false write response, pause',
            src._readableState.awaitDrain);
      src._readableState.awaitDrain++;
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain)
      state.awaitDrain--;
    if (state.awaitDrain === 0 && EE.listenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading)
    stream.read(0);
}

Readable.prototype.pause = function() {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    debug('wrapped data');
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }; }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require('_process'))
},{"./_stream_duplex":162,"_process":11,"buffer":3,"core-util-is":166,"events":8,"inherits":167,"isarray":168,"process-nextick-args":169,"string_decoder/":170,"util":2}],164:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function')
      this._transform = options.transform;

    if (typeof options.flush === 'function')
      this._flush = options.flush;
  }

  this.once('prefinish', function() {
    if (typeof this._flush === 'function')
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":162,"core-util-is":166,"inherits":167}],165:[function(require,module,exports){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/



/*<replacement>*/
var Stream;
(function (){try{
  Stream = require('st' + 'ream');
}catch(_){}finally{
  if (!Stream)
    Stream = require('events').EventEmitter;
}}())
/*</replacement>*/

var Buffer = require('buffer').Buffer;

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

function WritableState(options, stream) {
  var Duplex = require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex)
    this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function (){try {
Object.defineProperty(WritableState.prototype, 'buffer', {
  get: require('util-deprecate')(function() {
    return this.getBuffer();
  }, '_writableState.buffer is deprecated. Use ' +
      '_writableState.getBuffer() instead.')
});
}catch(_){}}());


function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function')
      this._write = options.write;

    if (typeof options.writev === 'function')
      this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;

  if (!(Buffer.isBuffer(chunk)) &&
      typeof chunk !== 'string' &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = nop;

  if (state.ended)
    writeAfterEnd(this, cb);
  else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function() {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function() {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing &&
        !state.corked &&
        !state.finished &&
        !state.bufferProcessing &&
        state.bufferedRequest)
      clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string')
    encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64',
'ucs2', 'ucs-2','utf16le', 'utf-16le', 'raw']
.indexOf((encoding + '').toLowerCase()) > -1))
    throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev)
    stream._writev(chunk, state.onwrite);
  else
    stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync)
    processNextTick(cb, er);
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished &&
        !state.corked &&
        !state.bufferProcessing &&
        state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      processNextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var buffer = [];
    var cbs = [];
    while (entry) {
      cbs.push(entry.callback);
      buffer.push(entry);
      entry = entry.next;
    }

    // count the one we are adding, as well.
    // TODO(isaacs) clean this up
    state.pendingcb++;
    state.lastBufferedRequest = null;
    doWrite(stream, state, true, state.length, buffer, '', function(err) {
      for (var i = 0; i < cbs.length; i++) {
        state.pendingcb--;
        cbs[i](err);
      }
    });

    // Clear buffer
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null)
      state.lastBufferedRequest = null;
  }
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined)
    this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(state) {
  return (state.ending &&
          state.length === 0 &&
          state.bufferedRequest === null &&
          !state.finished &&
          !state.writing);
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      processNextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

},{"./_stream_duplex":162,"buffer":3,"core-util-is":166,"events":8,"inherits":167,"process-nextick-args":169,"util-deprecate":"util-deprecate"}],166:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],167:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],168:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],169:[function(require,module,exports){
(function (process){
'use strict';
module.exports = nextTick;

function nextTick(fn) {
  var args = new Array(arguments.length - 1);
  var i = 0;
  while (i < args.length) {
    args[i++] = arguments[i];
  }
  process.nextTick(function afterTick() {
    fn.apply(null, args);
  });
}

}).call(this,require('_process'))
},{"_process":11}],170:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],171:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"./lib/_stream_transform.js":164,"dup":25}],172:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],173:[function(require,module,exports){
arguments[4][107][0].apply(exports,arguments)
},{"_process":11,"dup":107,"readable-stream/transform":171,"util":32,"xtend":172}],174:[function(require,module,exports){
var ForkDB = require('forkdb');
var inherits = require('inherits');
var through = require('through2');
var defined = require('defined');
var readonly = require('read-only-stream');
var split = require('split');

module.exports = WikiDB;
inherits(WikiDB, ForkDB);

function WikiDB (db, opts) {
    if (!(this instanceof WikiDB)) return new WikiDB(db, opts);
    if (!opts) opts = {};
    ForkDB.call(this, db, opts);
}

WikiDB.prototype.createWriteStream = function (meta, opts, cb) {
    var self = this;
    if (!meta) meta = {};
    if (!meta.time) meta.time = Date.now();
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var pre = opts.prebatch;
    opts.prebatch = prebatch;
    
    var tags = [].concat(meta.tags).filter(Boolean);
    return ForkDB.prototype.createWriteStream.call(this, meta, opts, cb);
    
    function prebatch (rows, wkey, cb_) {
        rows.push({
            type: 'put',
            key: [ 'wiki', meta.time, meta.key ],
            value: wkey
        });
        rows.push({
            type: 'put',
            key: [ 'wiki-key', meta.key, meta.time ],
            value: wkey
        });
        
        var isHead = false, prevHead = null;;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (row.type === 'put' && row.key[0] === 'head') {
                isHead = true;
            }
            else if (row.type === 'del' && row.key[0] === 'head') {
                prevHead = row.key.slice(1);
            }
        }
        
        if (isHead) {
            tags.forEach(function (tag) {
                rows.push({
                    type: 'put',
                    key: [ 'wiki-tag', tag, meta.key, wkey ],
                    value: 0
                });
            });
            if (tags.length) {
                rows.push({
                    type: 'put',
                    key: [ 'wiki-tags', meta.key, wkey ],
                    value: tags
                });
            }
        }
        if (isHead && prevHead) {
            var pkey = [ 'wiki-tags' ].concat(prevHead);
            self.db.get(pkey, function (err, prev) {
                if (err) return cb_(null, rows)
                rows.push({ type: 'del', key: pkey });
                prev.forEach(function (p) {
                    rows.push({
                        type: 'del',
                        key: [ 'wiki-tag', p ].concat(prevHead)
                    });
                });
                if (pre) pre(rows, wkey, cb_)
                else cb_(null, rows);
            });
        }
        else {
            if (pre) pre(rows, wkey, cb_)
            else cb_(null, rows)
        }
    }
};

WikiDB.prototype.tags = function (opts, cb) {
    if (!opts) opts = {};
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    var r = this.db.createReadStream({
        gt: [ 'wiki-tag', defined(opts.gt, null) ],
        lt: [ 'wiki-tag', defined(opts.lt, undefined) ],
        limit: opts.limit
    });
    var output = readonly(r.pipe(through.obj(write)));
    r.on('error', function (err) { output.emit('error', err) });
    if (cb) {
        output.pipe(collect(cb));
        output.on('error', cb);
    }
    return output;
    
    function write (row, enc, next) {
        this.push({ tag: row.key[1] });
        next();
    }
};

WikiDB.prototype.byTag = function (opts, cb) {
    if (!opts) opts = {};
    if (typeof opts === 'string') opts = { tag: opts };
    var r = this.db.createReadStream({
        gt: [ 'wiki-tag', opts.tag, defined(opts.gt, null) ],
        lt: [ 'wiki-tag', opts.tag, defined(opts.lt, undefined) ],
        limit: opts.limit
    });
    var output = readonly(r.pipe(through.obj(write)));
    r.on('error', function (err) { output.emit('error', err) });
    if (cb) {
        output.pipe(collect(cb));
        output.on('error', cb);
    }
    return output;
    
    function write (row, enc, next) {
        this.push({ key: row.key[2], hash: row.key[3] });
        next();
    }
};

WikiDB.prototype.search = function (terms, opts) {
    var self = this;
    if (!opts) opts = {};
    if (typeof terms === 'string') terms = terms.split(/\s+/);
    return readonly(this.keys().pipe(through.obj(kwrite, kend)));
    
    function kwrite (krow, enc, knext) {
        var kstream = this;
        var h = self.heads(krow.key);
        var hstream = h.pipe(through.obj(hwrite, function () { knext() }));
        h.on('error', function (err) { hstream.emit('error', err) });
        
        function hwrite (hrow, enc, hnext) {
            var pending = terms.slice();
            
            var r = self.createReadStream(hrow.hash);
            r.on('error', function (err) { hstream.emit('error', err) });
            r.pipe(split()).pipe(through(function (line, enc, next) {
                for (var i = 0; i < pending.length; i++) {
                    var t = pending[i];
                    if (line.toString('utf8').indexOf(t) >= 0) {
                        pending.splice(i, 1);
                        i--;
                    }
                }
                if (pending.length === 0) {
                    kstream.push({ hash: hrow.hash, key: krow.key });
                    hnext();
                }
                else next();
            }, function () { hnext() }));
        }
    }
    function kend () { this.push(null) }
};

WikiDB.prototype.recent = function (opts, cb) {
    if (!opts) opts = {};
    var self = this;
    var sopts;
    if (opts.key) {
        sopts = {
            gt: [ 'wiki-key', opts.key, defined(opts.gt, null) ],
            lt: [ 'wiki-key', opts.key, opts.lt ],
            limit: opts.limit,
            reverse: !opts.reverse
        };
    }
    else {
        sopts = {
            gt: [ 'wiki', defined(opts.gt, null) ],
            lt: [ 'wiki', opts.lt ],
            limit: opts.limit,
            reverse: !opts.reverse
        };
    }
    if (opts.limit !== undefined) sopts.limit = opts.limit;
    
    var s = self.db.createReadStream(sopts);
    var tr = through.obj(function (row, enc, next) {
        self.get(row.value, function (err, meta) {
            tr.push({ hash: row.value, meta: meta });
            next();
        });
    });
    s.on('error', function (err) { tr.emit('error', err) });
    if (cb) {
        tr.on('error', cb);
        tr.pipe(collect(cb));
    }
    return s.pipe(tr);
};

function collect (cb) {
    var rows = [];
    return through.obj(write, end);
    function write (row, enc, next) { rows.push(row); next() }
    function end () { cb(null, rows) }
}

},{"defined":175,"forkdb":176,"inherits":302,"read-only-stream":303,"split":314,"through2":325}],175:[function(require,module,exports){
arguments[4][68][0].apply(exports,arguments)
},{"dup":68}],176:[function(require,module,exports){
(function (process){
var blob = require('content-addressable-blob-store');
var wrap = require('level-option-wrap');
var fwdb = require('fwdb');
var exchange = require('hash-exchange');
var decode = require('bytewise').decode;

var defined = require('defined');
var has = require('has');
var isarray = require('isarray');
var stringify = require('json-stable-stringify');
var uniq = require('uniq');

var through = require('through2');
var Readable = require('readable-stream').Readable;
var readonly = require('read-only-stream');
var writeonly = require('write-only-stream');
var duplexer = require('duplexer2');

var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

var collect = require('./lib/collect.js');
var dropFirst = require('./lib/drop_first.js');

inherits(ForkDB, EventEmitter);
module.exports = ForkDB;

function ForkDB (db, opts) {
    var self = this;
    if (!(this instanceof ForkDB)) return new ForkDB(db, opts);
    if (!opts) opts = {};
    
    this._db = db;
    this._fwdb = fwdb(db);
    this.db = this._fwdb.db;
    
    this.store = defined(
        opts.store,
        blob({ dir: defined(opts.dir, './forkdb.blob') })
    );
    this._seen = {};
    this._queue = [];
    
    this._id = opts.id;
    if (this._id === undefined) {
        this._queue.push(function (cb) {
            self._getId(function (err, id) {
                if (err) return cb(err);
                self._id = id;
                cb(null);
            });
        });
    }
    this._queue.push(function (cb) {
        self._getSeq(function (err, seq) {
            if (err) return cb(err);
            self._seq = seq;
            cb(null);
        });
    });
    this._runQueue();
}

ForkDB.prototype._runQueue = function () {
    var self = this;
    if (self._running) return;
    self._running = true;
    (function next () {
        if (self._queue.length === 0) {
            self._running = false;
            return;
        }
        self._queue.shift()(function (err) {
            if (err) self.emit('error', err)
            else next()
        });
    })();
};

ForkDB.prototype._getId = function (cb) {
    var self = this;
    self.db.get('_id', function (err, value) {
        if (err && err.type === 'NotFoundError') {
            value = generateId();
            self.db.put('_id', value, function (err) {
                if (err) return cb(err)
                cb(null, value);
            });
        }
        else if (err) return cb(err)
        else cb(null, value)
    });
};

ForkDB.prototype._getSeq = function (cb) {
    var r = this.db.createReadStream({
        gt: [ 'seq', null ],
        lt: [ 'seq', undefined ],
        reverse: true,
        limit: 1
    });
    r.on('error', cb);
    r.pipe(through.obj(write, end));
    
    function write (row, enc, next) { cb(null, row.key[1]) }
    function end () { cb(null, 0) }
};

ForkDB.prototype._getSeen = function (id, cb) {
    var self = this;
    if (has(self._seen, id)) {
        return process.nextTick(function () {
            cb(null, self._seen[id]);
        });
    }
    self.db.get([ '_seen', id ], function (err, seq) {
        if (err && err.type !== 'NotFoundError') return cb(err);
        var n = self._seen[id] = defined(seq, -1);
        cb(null, n);
    });
};

ForkDB.prototype._addSeen = function (id, aseq, cb) {
    var self = this;
    self._getSeen(id, function (err, seq) {
        if (err) return cb(err);
        var mseq = Math.max(seq, aseq) || 0;
        self._seen[id] = mseq;
        cb(null, {
            type: 'put',
            key: [ '_seen', id ],
            value: mseq
        });
    });
};

ForkDB.prototype.replicate = function (opts, cb) {
    var self = this;
    var input = through(), output = through();
    var dup = duplexer(input, output);
    self._queue.push(function (fn) {
        var r = self._replicate(opts, cb);
        r.on('available', dup.emit.bind(dup, 'available'));
        r.on('response', dup.emit.bind(dup, 'response'));
        r.on('since', dup.emit.bind(dup, 'since'));
        
        input.pipe(r).pipe(output);
        fn();
    });
    self._runQueue();
    return dup;
};

ForkDB.prototype._replicate = function (opts, cb) {
    var self = this;
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    if (!cb) cb = function () {};
    
    var mode = defined(opts.mode, 'sync');
    var errors = [], exchanged = [];
    var pending = 1;
    
    var ex = exchange(function (hash, fn) {
        if (mode === 'pull') {
            if (pending === 0) done();
            return;
        }
        pending ++;
        
        self.db.get([ 'seq-hash', hash ], function (err, seq) {
            if (err) return cb(err);
            var r = self.store.createReadStream({ key: hash });
            r.on('error', cb);
            r.on('end', function () { if (-- pending === 0) done() });
            fn(null, r, seq);
        });
    });
    ex.id(JSON.stringify([ self._id, mode ]));
    
    var other = {};
    ex.on('id', function (id) {
        pending --;
        try { var p = JSON.parse(id) }
        catch (err) { return ex.destroy() }
        other.id = p[0];
        other.mode = p[1];
        self._getSeen(other.id, function (err, seq) {
            if (err) return cb(err)
            else ex.since(seq)
        });
    });
    ex.on('since', function (seq) {
        provideSeq(seq);
    });
    ex.on('seen', function (seq) {
        self._addSeen(other.id, seq, function () {});
    });
    
    function provideSeq (seq) {
        var hashes = [];
        var r = self.db.createReadStream({
            gt: [ 'seq', defined(seq, null) ],
            lt: [ 'seq', undefined ]
        });
        var provided = 0;
        r.pipe(through.obj(write, flush));
        function write (row, enc, next) {
            hashes.push(row.value);
            provided ++;
            if (hashes.length >= 25) flush();
            next();
        }
        function flush () {
            if (hashes.length) ex.provide(hashes);
            hashes = [];
            if (provided === 0) done();
        }
    }
    
    ex.on('available', function (hashes) {
        if (mode === 'push') return;
        var p = hashes.length;
        var needed = [];
        if (mode === 'sync' && other.mode === 'pull') return;
        
        hashes.forEach(function (h) {
            self.get(h, function (err) {
                if (err) needed.push(h);
                if (-- p === 0) {
                    pending += needed.length;
                    ex.request(needed);
                }
            });
        });
    });
    
    ex.on('response', function (hash, stream, seq) {
        var opts = {
            expected: hash, // TODO: verify hash
            prebatch: function (rows, key, fn) {
                self._addSeen(other.id, seq, function (err, rows_) {
                    if (err) fn(null, rows)
                    else fn(null, rows.concat(rows_))
                });
            }
        };
        var df = dropFirst(function (err, dmeta) {
            df.pipe(self.createWriteStream(dmeta, opts, function (err) {
                if (err) {
                    errors.push(err);
                    if (-- pending === 0) done();
                }
                else {
                    exchanged.push(hash)
                    self._addSeen(other.id, seq, function (err) {
                        if (err) cb(err)
                        else if (-- pending === 0) done()
                        ex.seen(seq);
                    });
                }
            }));
        });
        stream.pipe(df)
    });
    
    if (opts.live) {
        self._db.on('batch', function (rows) {
            var hashes = [];
            rows.forEach(function (row) {
                try { var key = decode(decode(row.key)[1]) }
                catch (err) { return }
                if (key[0] === 'hash') {
                    hashes.push(key[1]);
                }
            });
            if (hashes.length) ex.provide(hashes);
        });
    }
    return ex;
    
    function done () {
        if (cb) cb(errors.length ? errors : null, exchanged);
        ex.emit('sync', exchanged);
    }
};

ForkDB.prototype.createWriteStream = function (meta, opts, cb) {
    var self = this;
    var input = through();
    self._queue.push(function (fn) {
        var w = self._createWriteStream(meta, opts, cb);
        w.on('error', function (err) { fn() });
        w.on('complete', function () { fn(null) });
        input.pipe(w);
    });
    self._runQueue();
    return writeonly(input);
};

ForkDB.prototype._createWriteStream = function (meta, opts, cb) {
    var self = this;
    if (typeof meta === 'function') {
        cb = meta;
        opts = {};
        meta = {};
    }
    if (!meta || typeof meta !== 'object') meta = {};
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var prebatch = defined(
        opts.prebatch,
        function (rows, key, fn) { fn(null, rows) }
    );
    var w = this.store.createWriteStream();
    w.write(stringify(meta) + '\n');
    if (cb) w.on('error', cb);
    
    w.once('finish', function () {
        var prev = getPrev(meta);
        var doc = { hash: w.key, key: meta.key, prev: prev };
        
        var key = defined(meta.key, 'undefined');
        self._fwdb._create(doc, function (err, rows) {
            if (err) return w.emit('error', err);
            if (prev.length === 0) {
                rows.push({
                    type: 'put',
                    key: [ 'tail', meta.key, w.key ],
                    value: 0
                });
            }
            var skey = [ 'seq', ++ self._seq ];
            var shkey = [ 'seq-hash', w.key ];
            rows.push({ type: 'put', key: [ 'meta', w.key ], value: meta });
            rows.push({ type: 'put', key: shkey, value: self._seq });
            rows.push({ type: 'put', key: skey, value: w.key });
            prebatch(rows, w.key, commit);
        });
    });
    return w;
    
    function commit (err, rows) {
        if (err) return w.emit('error', err);
        if (!isarray(rows)) {
            return w.emit('error', new Error(
                'prebatch result is not an array'
            ));
        }
        self.db.batch(rows, function (err) {
            if (err) return w.emit('error', err);
            if (cb) cb(null, w.key);
            w.emit('complete', w.key);
            self.emit('create', w.key);
        });
    }
};

ForkDB.prototype.forks = function (key, opts, cb) {
    return this._fwdb.heads(key, opts, cb);
};
ForkDB.prototype.heads = ForkDB.prototype.forks;

ForkDB.prototype.keys = function (opts, cb) {
    return this._fwdb.keys(opts, cb);
};

ForkDB.prototype.tails = function (key, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var r = this._fwdb.db.createReadStream(wrap(opts, {
        gt: function (x) { return [ 'tail', key, null ] },
        lt: function (x) { return [ 'tail', key, undefined ] }
    }));
    var tr = through.obj(function (row, enc, next) {
        this.push({ hash: row.key[2] });
        next();
    });
    r.on('error', function (err) { tr.emit('error', err) });
    if (cb) tr.pipe(collect(cb));
    if (cb) tr.on('error', cb);
    return readonly(r.pipe(tr));
};

ForkDB.prototype.list = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var r = this._fwdb.db.createReadStream(wrap(opts, {
        gt: function (x) { return [ 'meta', defined(x, null) ] },
        lt: function (x) { return [ 'meta', defined(x, undefined) ] }
    }));
    var tr = through.obj(function (row, enc, next) {
        this.push({ meta: row.value, hash: row.key[1] });
        next();
    });
    r.on('error', function (err) { tr.emit('error', err) });
    if (cb) tr.pipe(collect(cb));
    if (cb) tr.on('error', cb);
    return readonly(r.pipe(tr));
};

ForkDB.prototype.createReadStream = function (hash) {
    var r = this.store.createReadStream({ key: hash });
    return readonly(r.pipe(dropFirst()));
};

ForkDB.prototype.get = function (hash, cb) {
    this._fwdb.db.get([ 'meta', hash ], function (err, meta) {
        if (err && cb) cb(err)
        else if (cb) cb(null, meta)
    });
};

ForkDB.prototype.links = function (hash, opts, cb) {
    return this._fwdb.links(hash, opts, cb);
};

ForkDB.prototype.history = function (hash) {
    var self = this;
    var r = new Readable({ objectMode: true });
    var next = hash;
    
    r._read = function () {
        if (!next) return r.push(null);
        self.get(next, onget);
    };
    return r;
    
    function onget (err, meta) {
        if (err) return r.emit('error', err)
        var hash = next;
        var prev = getPrev(meta);
        
        if (prev.length === 0) {
            next = null;
            r.push({ hash: hash, meta: meta });
        }
        else if (prev.length === 1) {
            next = hashOf(prev[0]);
            r.push({ hash: hash, meta: meta });
        }
        else {
            next = null;
            r.push({ hash: hash, meta: meta });
            prev.forEach(function (p) {
                r.emit('branch', self.history(hashOf(p)));
            });
        }
    }
};

ForkDB.prototype.future = function (hash) {
    var self = this;
    var r = new Readable({ objectMode: true });
    var next = hash;
    
    r._read = function () {
        if (!next) return r.push(null);
        
        var pending = 2, ref = {};
        self.get(next, function (err, meta) {
            if (err) return r.emit('error', err);
            ref.meta = meta;
            if (-- pending === 0) done();
        });
        
        self.links(next, function (err, crows) {
            if (err) return r.emit('error', err);
            ref.rows = crows;
            if (-- pending === 0) done();
        });
        
        function done () {
            var prev = next;
            if (ref.rows.length === 0) {
                next = null;
                r.push({ hash: prev, meta: ref.meta });
            }
            else if (ref.rows.length === 1) {
                next = hashOf(ref.rows[0]);
                r.push({ hash: prev, meta: ref.meta });
            }
            else {
                next = null;
                r.push({ hash: prev, meta: ref.meta });
                ref.rows.forEach(function (crow) {
                    r.emit('branch', self.future(hashOf(crow)));
                });
            }
        }
    };
    return r;
};

ForkDB.prototype.concestor = function (hashes, cb) {
    var self = this;
    var seen = {};
    var seenh = {};
    var hs = hashes.map(function (h) { return [h] });
    hashes.forEach(function (h, ix) {
        seenh[ix] = {};
    });
    
    (function next (hashes) {
        var results = null;
        for (var i = 0; i < hashes.length; i++) {
            var hs = hashes[i];
            for (var j = 0; j < hs.length; j++) {
                var hash = hs[j];
                if (!has(seenh[i], hash)) {
                    seenh[i][hash] = true;
                    seen[hash] = (seen[hash] || 0) + 1;
                }
                if (seen[hash] === hashes.length) {
                    if (!results) results = [];
                    results.push(hash);
                }
            }
        }
        if (results && results.length) return cb(null, uniq(results));
        
        var pending = 0;
        var prev = [];
        
        hashes.forEach(function (hs, ix) {
            pending += hs.length;
            prev[ix] = [];
            hs.forEach(function (hash) {
                self.get(hash, function (err, value) {
                    if (!value) {}
                    else if (isarray(value.prev)) {
                        prev[ix].push.apply(prev[ix], value.prev.map(hashOf));
                    }
                    else if (value.prev) {
                        prev[ix].push(value.prev);
                    }
                    if (-- pending === 0) next(prev);
                });
            });
        });
        if (pending === 0) return cb(null, []);
    })(hs);
};

function getPrev (meta) {
    if (!meta) return [];
    if (!has(meta, 'prev')) return [];
    var prev = meta.prev;
    if (!isarray(prev)) prev = [ prev ];
    return prev.map(function (p) {
        if (p && typeof p === 'object' && p.hash) return p.hash;
        return p;
    }).filter(Boolean);
}

function hashOf (p) {
    return p && typeof p === 'object' ? p.hash : p;
}


function generateId () {
    var s = '';
    for (var i = 0; i < 4; i++) {
        s += Math.floor(Math.random() * Math.pow(16,8)).toString(16);
    }
    return s;
}

}).call(this,require('_process'))
},{"./lib/collect.js":177,"./lib/drop_first.js":178,"_process":11,"bytewise":180,"content-addressable-blob-store":67,"defined":175,"duplexer2":194,"events":8,"fwdb":195,"has":223,"hash-exchange":224,"inherits":302,"isarray":285,"json-stable-stringify":286,"level-option-wrap":290,"read-only-stream":303,"readable-stream":298,"through2":325,"uniq":300,"write-only-stream":301}],177:[function(require,module,exports){
var through = require('through2');

module.exports = function (cb) {
    var rows = [];
    return through.obj(write, end);
    function write (row, enc, next) { rows.push(row); next() }
    function end () { cb(null, rows) }
};

},{"through2":325}],178:[function(require,module,exports){
(function (Buffer){
var through = require('through2');

module.exports = function (cb) {
    var self = this;
    var line = false;
    var bufs = cb ? [] : null;
    return through(function (buf, enc, next) {
        if (line) {
            this.push(buf);
            return next();
        }
        for (var i = 0; i < buf.length; i++) {
            if (buf[i] === 10) {
                line = true;
                if (bufs) bufs.push(buf.slice(0,i));
                if (cb) {
                    var b = Buffer.concat(bufs).toString('utf8');
                    try { var meta = JSON.parse(b) }
                    catch (err) { return cb(err) }
                    cb(null, meta);
                }
                this.push(buf.slice(i+1));
                return next();
            }
        }
        if (bufs) bufs.push(buf);
    });
};

}).call(this,require("buffer").Buffer)
},{"buffer":3,"through2":325}],179:[function(require,module,exports){
'use strict';

var bops = require('bops')

var compare = function(a, b) {
  var result;
  for (var i = 0, end = Math.min(a.length, b.length); i < end; i++) {
    result = a.get(i) - b.get(i);
    if (result) return result;
  }
  return a.length - b.length;
};

var _type = {
  function: {
    parse: function() {
      throw new Error('Fallback for function reviving NYI');
    },
    serialize: function() {
      throw new Error('Fallback for function serializing NYI');
    }
  }
};

// Attempt to use utilities from optional `typewise` dependency
try {
  var typewise = require('typewise');
  compare = typewise.comparators.bytewise;
  _type.function = typewise.types.function;
}
catch (e) {}

// Sort tags used to preserve binary total order
// The tag is 1 byte, which gives us plenty of room to grow.
// We leave some space between the various types for possible future compatibility with extensions.

// 0x00 reserved for termination character
var NULL = 0x10;
var FALSE = 0x20;
var TRUE = 0x21;
var NEGATIVE_INFINITY = 0x40;
var NEGATIVE_NUMBER = 0x41; // packed in an inverted form to sort bitwise ascending
var POSITIVE_NUMBER = 0x42;
var POSITIVE_INFINITY = 0x43;
var DATE_PRE_EPOCH = 0x51; // packed identically to a NEGATIVE_NUMBER
var DATE_POST_EPOCH = 0x52; // packed identically to a POSITIVE_NUMBER
var BUFFER = 0x60;
var STRING = 0x70;
var ARRAY = 0xa0; // escapes nested types with bit shifting where necessary to maintain order
var OBJECT = 0xb0; // just like couchdb member order is preserved and matters for collation
var REGEXP = 0xd0; // packed as tuple of two strings, the end being flags
var FUNCTION = 0xe0; // packed as array, revived by safe eval in an isolated environment (if available)
var UNDEFINED = 0xf0;
// 0xff reserved for high-key sentinal


var flatTypes = [ BUFFER, STRING ];
var structuredTypes = [ ARRAY, OBJECT, FUNCTION, REGEXP ];
var nullaryTypes = [ NULL, FALSE, TRUE, NEGATIVE_INFINITY, POSITIVE_INFINITY, UNDEFINED ];
var fixedSizeTypes = {};
fixedSizeTypes[NEGATIVE_NUMBER] = 8;
fixedSizeTypes[POSITIVE_NUMBER] = 8;
fixedSizeTypes[DATE_PRE_EPOCH] = 8;
fixedSizeTypes[DATE_POST_EPOCH] = 8;


function encode(source) {

  if (source === void 0) return tag(UNDEFINED);
  if (source === null) return tag(NULL);

  // Unbox possible natives

  var value = source != null && source.valueOf ? source.valueOf() : source;
  var type;

  // NaN and Invalid Date not permitted
  if (value !== value) {
    if (source instanceof Date) throw new TypeError('Invalid Date not permitted');
    throw new TypeError('NaN not permitted');
  }

  if (value === false) return tag(FALSE);
  if (value === true) return tag(TRUE);

  if (source instanceof Date) {
    // Normalize -0 values to 0
    if (Object.is(value, -0)) value = 0;
    type = value < 0 ? DATE_PRE_EPOCH : DATE_POST_EPOCH;
    return tag(type, encodeNumber(value));
  }

  if (typeof value === 'number') {
    if (value === Number.NEGATIVE_INFINITY) return tag(NEGATIVE_INFINITY);
    if (value === Number.POSITIVE_INFINITY) return tag(POSITIVE_INFINITY);
    // Normalize -0 values to 0
    if (Object.is(value, -0)) value = 0;
    type = value < 0 ? NEGATIVE_NUMBER : POSITIVE_NUMBER;
    return tag(type, encodeNumber(value));
  }

  if (bops.is(value)) {
    return tag(BUFFER, value);
  }

  if (typeof value === 'string') {
    return tag(STRING, bops.from(value, 'utf8'));
  }

  // RegExp
  if (value instanceof RegExp) {
    // TODO
    throw new Error('Not Implemented Yet');
  }

  // Function
  if (typeof value === 'function') {
    return tag(FUNCTION, encodeList(_type['function'].serialize(value)));
  }

  // Array
  // TODO better handling for sparse arrays
  if (Array.isArray(value)) {
    return tag(ARRAY, encodeList(value));
  }

  // Object
  if (typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]') {
    // Packs into an array, e.g. [ k1, v1, k2, v2, ... ]
    var items = [];
    Object.keys(value).forEach(function(key) {
      items.push(key);
      items.push(value[key]);
    });
    return tag(OBJECT, encodeList(items));
  }

  // TODO RegExp and other types from Structured Clone algorithm (Blob, File, FileList)

  throw new Error('Cannot encode unknown type: ' + source);
}

function decode(buffer) {

  var type = bops.readUInt8(buffer, 0);

  // Nullary types
  if (~nullaryTypes.indexOf(type)) {
    if (buffer.length !== 1) throw new Error('Invalid encoding in buffer: ' + buffer);

    if (type === UNDEFINED) return;
    if (type === NULL) return null;
    if (type === FALSE) return false;
    if (type === TRUE) return true;
    if (type === NEGATIVE_INFINITY) return Number.NEGATIVE_INFINITY;
    if (type === POSITIVE_INFINITY) return Number.POSITIVE_INFINITY;
  }

  // Fixed size types
  var chunk = bops.subarray(buffer, 1);
  var chunkSize = fixedSizeTypes[type];
  if (chunkSize) {
    if (chunk.length !== chunkSize) throw new Error('Invalid size for buffer: ' + buffer);

    if (type === NEGATIVE_NUMBER || type === POSITIVE_NUMBER) {
      return decodeNumber(chunk, type === NEGATIVE_NUMBER);
    }
    if (type === DATE_PRE_EPOCH || type === DATE_POST_EPOCH) {
      return new Date(decodeNumber(chunk, type === DATE_PRE_EPOCH));
    }
  }

  // Flat types
  if (type === BUFFER) return chunk;
  if (type === STRING) return bops.to(chunk, 'utf8');

  // Structured types
  if (~structuredTypes.indexOf(type)) {
    var result = parseHead(buffer);
    if (result[1] !== buffer.length) {
      throw new Error('List deserialization fail: ' + bops.readUInt8(result, 1) + '!=' + bops.length(buffer));
    }
    return result[0];
  }

}


function tag(type, buffer) {
  // Just return tag byte for nullary types (no buffer provided)
  type = bops.from([ type ]);
  if (!buffer) return type;
  // Prepend a type tag byte to buffer
  return bops.join([ type, buffer ]);
}

function encodeNumber(value) {
  var buffer = bops.create(8);
  if (value < 0) {
    bops.writeDoubleBE(buffer, -value, 0);
    return invert(buffer);
  }
  bops.writeDoubleBE(buffer, value, 0);
  return buffer;
}

function decodeNumber(buffer, negative) {
  if (negative) buffer = invert(buffer);
  var value = bops.readDoubleBE(buffer, 0);
  return negative ? -value : value;
}


function encodeList(items) {
  // TODO pass around a map of references already encoded to detect cycles
  var buffers = [];
  var chunk;
  for (var i = 0, end = items.length; i < end; ++i) {
    chunk = encode(items[i]);
    var type = bops.readUInt8(chunk, 0);
    // We need to escape a few bytes in string and buffer types to prevent confusion with the end byte
    if (~flatTypes.indexOf(type)) chunk = flatEscape(chunk);
    buffers.push(chunk);
  }
  // Close the list with an end byte
  buffers.push(bops.create([ 0 ]));
  return bops.join(buffers);
}

// TODO expose in public API
function flatEscape(buffer) {
  // Escape high and low bytes 0x00 and 0xff (and by necessity, 0x01 and 0xfe)
  var b, bytes = [];
  for (var i = 0, end = buffer.length; i < end; ++i) {
    b = buffer[i];
    // Escape low bytes with 0x01 and by adding 1
    if (b === 0x01 || b === 0x00) bytes.push(0x01, b + 1);
    // Escape high bytes with 0xfe and by subtracting 1
    else if (b === 0xfe || b === 0xff) bytes.push(0xfe, b - 1);
    // Otherwise no escapement needed
    else bytes.push(b);
  }
  // Add end byte
  bytes.push(0);
  return bops.from(bytes);
}

// TODO expose in public API
function flatUnescape(buffer) {
  var b, bytes = [];
  // Don't escape last byte
  for (var i = 0, end = buffer.length; i < end; ++i) {
    b = bops.readUInt8(buffer, i);
    // If low-byte escape tag use the following byte minus 1
    if (b === 0x01) bytes.push(bops.readUInt8(buffer, ++i) - 1);
    // If high-byte escape tag use the following byte plus 1
    else if (b === 0xfe) bytes.push(bops.readUInt8(buffer, ++i) + 1);
    // Otherwise no unescapement needed
    else bytes.push(b);
  }
  return bops.from(bytes);
}


function parseHead(buffer) {
  // Parses and returns the first type on the buffer and the total bytes consumed
  var type = bops.readUInt8(buffer, 0);
  // Nullary
  if (~nullaryTypes.indexOf(type)) return [ decode(bops.from([ type ])), 1 ];
  // Fixed
  var size = fixedSizeTypes[type];
  if (size++) return [ decode(bops.subarray(buffer, 0, size)), size ];
  // Flat
  var index;
  var end;
  if (~flatTypes.indexOf(type)) {
    // Find end byte
    for (index = 1, end = buffer.length; index < end; ++index) {
      if (bops.readUInt8(buffer, index) === 0x00) break;
    }
    if (index >= buffer.length) throw new Error('No ending byte found for list');
    var chunk = flatUnescape(bops.subarray(buffer, 0, index));
    // Add 1 to index to skip over end byte
    return [ decode(chunk), index + 1 ];
  }
  
  // Nested, recurse for each item
  var list = [];
  index = 1;
  var next;
  while ((next = bops.readUInt8(buffer, index)) !== 0) {
    var result = parseHead(bops.subarray(buffer, index));
    list.push(result[0]);
    index += result[1];
    if (index >= buffer.length) throw new Error('No ending byte found for nested list');
  }
  return [ structure(type, list), index + 1 ];
}

function structure(type, list) {
  if (type === ARRAY) return list;
  if (type === FUNCTION) {
    return _type['function'].parse(list);
  }
  var i, end;
  if (type === OBJECT) {
    var object = Object.create(null);
    for (i = 0, end = list.length; i < end; ++i) {
      object[list[i]] = list[++i];
    }
    return object;
  }
  throw new Error('Unknown type: ' + type);
}


function invert(buffer) {
  var bytes = [];
  for (var i = 0, end = buffer.length; i < end; ++i) {
    bytes.push(~bops.readUInt8(buffer, i));
  }
  return bops.from(bytes);
}

exports.encode = encode;
exports.decode = decode;
exports.compare = compare;
exports.buffer = true;
exports.type = 'bytewise';

},{"bops":181,"typewise":2}],180:[function(require,module,exports){
var bops = require('bops');
var bytewise = require('./');

exports.encode = function (val) {
  return bops.to(bytewise.encode(val), 'hex');
};

exports.decode = function (val) {
  return bytewise.decode(bops.from(val, 'hex'));
};

exports.buffer = false;
exports.type = 'bytewise-hex';

},{"./":179,"bops":181}],181:[function(require,module,exports){
var proto = {}
module.exports = proto

proto.from = require('./from.js')
proto.to = require('./to.js')
proto.is = require('./is.js')
proto.subarray = require('./subarray.js')
proto.join = require('./join.js')
proto.copy = require('./copy.js')
proto.create = require('./create.js')

mix(require('./read.js'), proto)
mix(require('./write.js'), proto)

function mix(from, into) {
  for(var key in from) {
    into[key] = from[key]
  }
}

},{"./copy.js":184,"./create.js":185,"./from.js":186,"./is.js":187,"./join.js":188,"./read.js":190,"./subarray.js":191,"./to.js":192,"./write.js":193}],182:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],183:[function(require,module,exports){
module.exports = to_utf8

var out = []
  , col = []
  , fcc = String.fromCharCode
  , mask = [0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]
  , unmask = [
      0x00
    , 0x01
    , 0x02 | 0x01
    , 0x04 | 0x02 | 0x01
    , 0x08 | 0x04 | 0x02 | 0x01
    , 0x10 | 0x08 | 0x04 | 0x02 | 0x01
    , 0x20 | 0x10 | 0x08 | 0x04 | 0x02 | 0x01
    , 0x40 | 0x20 | 0x10 | 0x08 | 0x04 | 0x02 | 0x01
  ]

function to_utf8(bytes, start, end) {
  start = start === undefined ? 0 : start
  end = end === undefined ? bytes.length : end

  var idx = 0
    , hi = 0x80
    , collecting = 0
    , pos
    , by

  col.length =
  out.length = 0

  while(idx < bytes.length) {
    by = bytes[idx]
    if(!collecting && by & hi) {
      pos = find_pad_position(by)
      collecting += pos
      if(pos < 8) {
        col[col.length] = by & unmask[6 - pos]
      }
    } else if(collecting) {
      col[col.length] = by & unmask[6]
      --collecting
      if(!collecting && col.length) {
        out[out.length] = fcc(reduced(col, pos))
        col.length = 0
      }
    } else { 
      out[out.length] = fcc(by)
    }
    ++idx
  }
  if(col.length && !collecting) {
    out[out.length] = fcc(reduced(col, pos))
    col.length = 0
  }
  return out.join('')
}

function find_pad_position(byt) {
  for(var i = 0; i < 7; ++i) {
    if(!(byt & mask[i])) {
      break
    }
  }
  return i
}

function reduced(list) {
  var out = 0
  for(var i = 0, len = list.length; i < len; ++i) {
    out |= list[i] << ((len - i - 1) * 6)
  }
  return out
}

},{}],184:[function(require,module,exports){
module.exports = copy

var slice = [].slice

function copy(source, target, target_start, source_start, source_end) {
  target_start = arguments.length < 3 ? 0 : target_start
  source_start = arguments.length < 4 ? 0 : source_start
  source_end = arguments.length < 5 ? source.length : source_end

  if(source_end === source_start) {
    return
  }

  if(target.length === 0 || source.length === 0) {
    return
  }

  if(source_end > source.length) {
    source_end = source.length
  }

  if(target.length - target_start < source_end - source_start) {
    source_end = target.length - target_start + source_start
  }

  if(source.buffer !== target.buffer) {
    return fast_copy(source, target, target_start, source_start, source_end)
  }
  return slow_copy(source, target, target_start, source_start, source_end)
}

function fast_copy(source, target, target_start, source_start, source_end) {
  var len = (source_end - source_start) + target_start

  for(var i = target_start, j = source_start;
      i < len;
      ++i,
      ++j) {
    target[i] = source[j]
  }
}

function slow_copy(from, to, j, i, jend) {
  // the buffers could overlap.
  var iend = jend + i
    , tmp = new Uint8Array(slice.call(from, i, iend))
    , x = 0

  for(; i < iend; ++i, ++x) {
    to[j++] = tmp[x]
  }
}

},{}],185:[function(require,module,exports){
module.exports = function(size) {
  return new Uint8Array(size)
}

},{}],186:[function(require,module,exports){
module.exports = from

var base64 = require('base64-js')

var decoders = {
    hex: from_hex
  , utf8: from_utf
  , base64: from_base64
}

function from(source, encoding) {
  if(Array.isArray(source)) {
    return new Uint8Array(source)
  }

  return decoders[encoding || 'utf8'](source)
}

function from_hex(str) {
  var size = str.length / 2
    , buf = new Uint8Array(size)
    , character = ''

  for(var i = 0, len = str.length; i < len; ++i) {
    character += str.charAt(i)

    if(i > 0 && (i % 2) === 1) {
      buf[i>>>1] = parseInt(character, 16)
      character = '' 
    }
  }

  return buf 
}

function from_utf(str) {
  var arr = []
    , code

  for(var i = 0, len = str.length; i < len; ++i) {
    code = fixed_cca(str, i)

    if(code === false) {
      continue
    }

    if(code < 0x80) {
      arr[arr.length] = code

      continue
    }

    codepoint_to_bytes(arr, code)
  }

  return new Uint8Array(arr)
}

function codepoint_to_bytes(arr, code) {
  // find MSB, use that to determine byte count
  var copy_code = code
    , bit_count = 0
    , byte_count
    , prefix
    , _byte
    , pos

  do {
    ++bit_count
  } while(copy_code >>>= 1)

  byte_count = Math.ceil((bit_count - 1) / 5) | 0
  prefix = [0, 0, 0xc0, 0xe0, 0xf0, 0xf8, 0xfc][byte_count]
  pos = [0, 0, 3, 4, 5, 6, 7][byte_count]

  _byte |= prefix

  bit_count = (7 - pos) + 6 * (byte_count - 1)

  while(bit_count) {
    _byte |= +!!(code & (1 << bit_count)) << (7 - pos)
    ++pos

    if(pos % 8 === 0) {
      arr[arr.length] = _byte
      _byte = 0x80
      pos = 2
    }

    --bit_count
  }

  if(pos) {
    _byte |= +!!(code & 1) << (7 - pos)
    arr[arr.length] = _byte
  }
}

function pad(str) {
  while(str.length < 8) {
    str = '0' + str
  }

  return str
}

function fixed_cca(str, idx) {
  idx = idx || 0

  var code = str.charCodeAt(idx)
    , lo
    , hi

  if(0xD800 <= code && code <= 0xDBFF) {
    lo = str.charCodeAt(idx + 1)
    hi = code

    if(isNaN(lo)) {
      throw new Error('High surrogate not followed by low surrogate')
    }

    return ((hi - 0xD800) * 0x400) + (lo - 0xDC00) + 0x10000
  }

  if(0xDC00 <= code && code <= 0xDFFF) {
    return false
  }

  return code
}

function from_base64(str) {
  return new Uint8Array(base64.toByteArray(str)) 
}

},{"base64-js":182}],187:[function(require,module,exports){

module.exports = function(buffer) {
  return buffer instanceof Uint8Array;
}

},{}],188:[function(require,module,exports){
module.exports = join

function join(targets, hint) {
  if(!targets.length) {
    return new Uint8Array(0)
  }

  var len = hint !== undefined ? hint : get_length(targets)
    , out = new Uint8Array(len)
    , cur = targets[0]
    , curlen = cur.length
    , curidx = 0
    , curoff = 0
    , i = 0

  while(i < len) {
    if(curoff === curlen) {
      curoff = 0
      ++curidx
      cur = targets[curidx]
      curlen = cur && cur.length
      continue
    }
    out[i++] = cur[curoff++] 
  }

  return out
}

function get_length(targets) {
  var size = 0
  for(var i = 0, len = targets.length; i < len; ++i) {
    size += targets[i].byteLength
  }
  return size
}

},{}],189:[function(require,module,exports){
var proto
  , map

module.exports = proto = {}

map = typeof WeakMap === 'undefined' ? null : new WeakMap

proto.get = !map ? no_weakmap_get : get

function no_weakmap_get(target) {
  return new DataView(target.buffer, 0)
}

function get(target) {
  var out = map.get(target.buffer)
  if(!out) {
    map.set(target.buffer, out = new DataView(target.buffer, 0))
  }
  return out
}

},{}],190:[function(require,module,exports){
module.exports = {
    readUInt8:      read_uint8
  , readInt8:       read_int8
  , readUInt16LE:   read_uint16_le
  , readUInt32LE:   read_uint32_le
  , readInt16LE:    read_int16_le
  , readInt32LE:    read_int32_le
  , readFloatLE:    read_float_le
  , readDoubleLE:   read_double_le
  , readUInt16BE:   read_uint16_be
  , readUInt32BE:   read_uint32_be
  , readInt16BE:    read_int16_be
  , readInt32BE:    read_int32_be
  , readFloatBE:    read_float_be
  , readDoubleBE:   read_double_be
}

var map = require('./mapped.js')

function read_uint8(target, at) {
  return target[at]
}

function read_int8(target, at) {
  var v = target[at];
  return v < 0x80 ? v : v - 0x100
}

function read_uint16_le(target, at) {
  var dv = map.get(target);
  return dv.getUint16(at + target.byteOffset, true)
}

function read_uint32_le(target, at) {
  var dv = map.get(target);
  return dv.getUint32(at + target.byteOffset, true)
}

function read_int16_le(target, at) {
  var dv = map.get(target);
  return dv.getInt16(at + target.byteOffset, true)
}

function read_int32_le(target, at) {
  var dv = map.get(target);
  return dv.getInt32(at + target.byteOffset, true)
}

function read_float_le(target, at) {
  var dv = map.get(target);
  return dv.getFloat32(at + target.byteOffset, true)
}

function read_double_le(target, at) {
  var dv = map.get(target);
  return dv.getFloat64(at + target.byteOffset, true)
}

function read_uint16_be(target, at) {
  var dv = map.get(target);
  return dv.getUint16(at + target.byteOffset, false)
}

function read_uint32_be(target, at) {
  var dv = map.get(target);
  return dv.getUint32(at + target.byteOffset, false)
}

function read_int16_be(target, at) {
  var dv = map.get(target);
  return dv.getInt16(at + target.byteOffset, false)
}

function read_int32_be(target, at) {
  var dv = map.get(target);
  return dv.getInt32(at + target.byteOffset, false)
}

function read_float_be(target, at) {
  var dv = map.get(target);
  return dv.getFloat32(at + target.byteOffset, false)
}

function read_double_be(target, at) {
  var dv = map.get(target);
  return dv.getFloat64(at + target.byteOffset, false)
}

},{"./mapped.js":189}],191:[function(require,module,exports){
module.exports = subarray

function subarray(buf, from, to) {
  return buf.subarray(from || 0, to || buf.length)
}

},{}],192:[function(require,module,exports){
module.exports = to

var base64 = require('base64-js')
  , toutf8 = require('to-utf8')

var encoders = {
    hex: to_hex
  , utf8: to_utf
  , base64: to_base64
}

function to(buf, encoding) {
  return encoders[encoding || 'utf8'](buf)
}

function to_hex(buf) {
  var str = ''
    , byt

  for(var i = 0, len = buf.length; i < len; ++i) {
    byt = buf[i]
    str += ((byt & 0xF0) >>> 4).toString(16)
    str += (byt & 0x0F).toString(16)
  }

  return str
}

function to_utf(buf) {
  return toutf8(buf)
}

function to_base64(buf) {
  return base64.fromByteArray(buf)
}


},{"base64-js":182,"to-utf8":183}],193:[function(require,module,exports){
module.exports = {
    writeUInt8:      write_uint8
  , writeInt8:       write_int8
  , writeUInt16LE:   write_uint16_le
  , writeUInt32LE:   write_uint32_le
  , writeInt16LE:    write_int16_le
  , writeInt32LE:    write_int32_le
  , writeFloatLE:    write_float_le
  , writeDoubleLE:   write_double_le
  , writeUInt16BE:   write_uint16_be
  , writeUInt32BE:   write_uint32_be
  , writeInt16BE:    write_int16_be
  , writeInt32BE:    write_int32_be
  , writeFloatBE:    write_float_be
  , writeDoubleBE:   write_double_be
}

var map = require('./mapped.js')

function write_uint8(target, value, at) {
  return target[at] = value
}

function write_int8(target, value, at) {
  return target[at] = value < 0 ? value + 0x100 : value
}

function write_uint16_le(target, value, at) {
  var dv = map.get(target);
  return dv.setUint16(at + target.byteOffset, value, true)
}

function write_uint32_le(target, value, at) {
  var dv = map.get(target);
  return dv.setUint32(at + target.byteOffset, value, true)
}

function write_int16_le(target, value, at) {
  var dv = map.get(target);
  return dv.setInt16(at + target.byteOffset, value, true)
}

function write_int32_le(target, value, at) {
  var dv = map.get(target);
  return dv.setInt32(at + target.byteOffset, value, true)
}

function write_float_le(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat32(at + target.byteOffset, value, true)
}

function write_double_le(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat64(at + target.byteOffset, value, true)
}

function write_uint16_be(target, value, at) {
  var dv = map.get(target);
  return dv.setUint16(at + target.byteOffset, value, false)
}

function write_uint32_be(target, value, at) {
  var dv = map.get(target);
  return dv.setUint32(at + target.byteOffset, value, false)
}

function write_int16_be(target, value, at) {
  var dv = map.get(target);
  return dv.setInt16(at + target.byteOffset, value, false)
}

function write_int32_be(target, value, at) {
  var dv = map.get(target);
  return dv.setInt32(at + target.byteOffset, value, false)
}

function write_float_be(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat32(at + target.byteOffset, value, false)
}

function write_double_be(target, value, at) {
  var dv = map.get(target);
  return dv.setFloat64(at + target.byteOffset, value, false)
}

},{"./mapped.js":189}],194:[function(require,module,exports){
var stream = require("readable-stream");

var duplex2 = module.exports = function duplex2(options, writable, readable) {
  return new DuplexWrapper(options, writable, readable);
};

var DuplexWrapper = exports.DuplexWrapper = function DuplexWrapper(options, writable, readable) {
  if (typeof readable === "undefined") {
    readable = writable;
    writable = options;
    options = null;
  }

  options = options || {};
  options.objectMode = true;

  stream.Duplex.call(this, options);

  this._bubbleErrors = (typeof options.bubbleErrors === "undefined") || !!options.bubbleErrors;

  this._writable = writable;
  this._readable = readable;

  var self = this;

  writable.once("finish", function() {
    self.end();
  });

  this.once("finish", function() {
    writable.end();
  });

  readable.on("data", function(e) {
    if (!self.push(e)) {
      readable.pause();
    }
  });

  readable.once("end", function() {
    return self.push(null);
  });

  if (this._bubbleErrors) {
    writable.on("error", function(err) {
      return self.emit("error", err);
    });

    readable.on("error", function(err) {
      return self.emit("error", err);
    });
  }
};
DuplexWrapper.prototype = Object.create(stream.Duplex.prototype, {constructor: {value: DuplexWrapper}});

DuplexWrapper.prototype._write = function _write(input, encoding, done) {
  this._writable.write(input, encoding, done);
};

DuplexWrapper.prototype._read = function _read(n) {
  this._readable.resume();
};

},{"readable-stream":298}],195:[function(require,module,exports){
var defaults = require('levelup-defaults');
var bytewise = require('bytewise');
var defined = require('defined');
var through = require('through2');
var readonly = require('read-only-stream');
var wrap = require('level-option-wrap');

var has = require('has');
var isarray = require('isarray');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

module.exports = FWDB;
inherits(FWDB, EventEmitter);

function FWDB (db) {
    if (!(this instanceof FWDB)) return new FWDB(db);
    EventEmitter.call(this);
    this.db = defaults(db, { keyEncoding: bytewise, valueEncoding: 'json' });
}

FWDB.prototype.create = function (opts, cb) {
    if (!cb) cb = noop;

    var i = 0;
    var rows = [];
    var self = this;

    if (!isarray(opts)) this._create(opts, done);
    else loop();

    function loop (err, rows_) {
        if (err) return cb(err);
        if (rows_) rows.push.apply(rows, rows_);
        if (i === opts.length) done(null, rows)
        else self._create(opts[i++], loop);
    }

    function done (err, rows) {
        self.emit('batch', rows);
        self.db.batch(rows, cb);
    }
};

FWDB.prototype._create = function (opts, cb) {
    var self = this;
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var hash = opts.hash;
    var prev = defined(opts.prev, []);
    if (!isarray(prev)) prev = [ prev ];
    var cb_ = function (err, rows) {
        cb(err, rows);
        cb = function () {};
    };
    
    var key = opts.key;
    var prebatch = defined(
        opts.prebatch,
        function (rows, done) { done(null, rows) }
    );
    
    var rows = [];
    rows.push({ type: 'put', key: [ 'key', key ], value: 0 });
    rows.push({ type: 'put', key: [ 'hash', hash ], value: 0 });
    
    var pending = 1 + prev.length;
    prev.forEach(function (phash) {
        exists(self.db, [ 'hash', phash ], function (err, ex) {
            if (err) return cb_(err);
            
            if (ex) {
                rows.push({
                    type: 'del',
                    key: [ 'head', key, phash ],
                    value: 0
                });
                rows.push({
                    type: 'put',
                    key: [ 'link', phash, hash ],
                    value: key
                });
            }
            else {
                rows.push({
                    type: 'put',
                    key: [ 'dangle', key, phash, hash ],
                    value: 0
                });
            }
            if (-- pending === 0) commit();
        });
    });
    
    exists(self.db, [ 'hash', hash ], function (err, ex) {
        if (err) return cb_(err);
        getDangling(self.db, key, hash, function (err, dangling) {
            if (err) return cb_(err);
            ondangling(dangling, ex);
        });
    });
    
    function ondangling (dangling, ex) {
        if (dangling.length === 0 && !ex) {
            rows.push({
                type: 'put',
                key: [ 'head', key, hash ],
                value: 0
            });
        }
        dangling.forEach(function (d) {
            rows.push({ type: 'del', key: d.key });
            rows.push({ type: 'del', key: [ 'head', key, hash ] });
            rows.push({
                type: 'put',
                key: [ 'link', hash, d.key[3] ],
                value: key
            });
        });
        if (-- pending === 0) commit();
    }
    
    function commit () { prebatch(rows, done) }
    
    function done (err, rows_) {
        if (err) return cb_(err);
        if (!isarray(rows_)) return cb_(new Error('prebatch result not an array'));
        cb_(null, rows_)
    }
};

FWDB.prototype.heads = function (key, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var r = this.db.createReadStream(wrap(opts, {
        gt: function (x) { return [ 'head', key, defined(x, null) ] },
        lt: function (x) { return [ 'head', key, defined(x, undefined) ] }
    }));
    var tr = through.obj(function (row, enc, next) {
        this.push({ hash: row.key[2] });
        next();
    });
    if (cb) r.on('error', cb);
    if (cb) tr.pipe(collect(cb));
    r.on('error', function (err) { tr.emit('error', err) });
    return readonly(r.pipe(tr));
};

FWDB.prototype.links = function (hash, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var r = this.db.createReadStream(wrap(opts, {
        gt: function (x) { return [ 'link', hash, defined(x, null) ] },
        lt: function (x) { return [ 'link', hash, defined(x, undefined) ] }
    }));
    var tr = through.obj(function (row, enc, next) {
        this.push({ key: row.value, hash: row.key[2] });
        next();
    });
    if (cb) tr.on('error', cb);
    if (cb) tr.pipe(collect(cb));
    r.on('error', function (err) { tr.emit('error', err) });
    return readonly(r.pipe(tr));
};

FWDB.prototype.keys = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    var r = this.db.createReadStream(wrap(opts, {
        gt: function (x) { return [ 'key', defined(x, null) ] },
        lt: function (x) { return [ 'key', defined(x, undefined) ] }
    }));
    var tr = through.obj(function (row, enc, next) {
        this.push({ key: row.key[1] });
        next();
    });
    if (cb) tr.on('error', cb);
    if (cb) tr.pipe(collect(cb));
    r.on('error', function (err) { tr.emit('error', err) });
    return readonly(r.pipe(tr));
};

function collect (cb) {
    var rows = [];
    return through.obj(write, end);
    function write (row, enc, next) { rows.push(row); next() }
    function end () { cb(null, rows) }
}

function exists (db, key, cb) {
    db.get(key, function (err, value) {
        if (err && err.type === 'NotFoundError') {
            cb(null, false);
        }
        else if (err) cb(err)
        else cb(null, true)
    });
}

function getDangling (db, key, hash, cb) {
    var opts = {
        gt: [ 'dangle', key, hash, null ],
        lt: [ 'dangle', key, hash, undefined ]
    };
    var s = db.createReadStream(opts);
    s.on('error', cb);
    s.pipe(collect(cb));
}

function noop () {}

},{"bytewise":180,"defined":175,"events":8,"has":223,"inherits":302,"isarray":285,"level-option-wrap":290,"levelup-defaults":196,"read-only-stream":303,"through2":325}],196:[function(require,module,exports){
var levelup = require('levelup')

var noop = function() {}

var Proxy = function(db) {
  this.db = db
  this.leveldown = null
}

Proxy.prototype.open = function(opts, cb) {
  if (typeof opts === 'function') return this.open(null, opts)
  if (!cb) cb = noop
  var self = this
  this.db.open(function(err) {
    if (err) return cb(err)
    self.leveldown = self.db.db
    cb()
  })
}

'put get del batch approximateSize iterator close'.split(' ').forEach(function(m) {
  Proxy.prototype[m] = function() {
    return this.leveldown[m].apply(this.leveldown, arguments)
  }
})

module.exports = function(db, defaults) {
  if (!defaults) defaults = {}

  defaults.db = function(l) {
    return new Proxy(db)
  }

  var up = levelup(db.location || 'no-location', defaults)

  up.on('ready', function() { // remove the proxy
    if (up.db instanceof Proxy) up.db = up.db.leveldown
  })

  return up
}
},{"levelup":201}],197:[function(require,module,exports){
/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License
 * <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

var util          = require('./util')
  , WriteError    = require('./errors').WriteError

  , getOptions    = util.getOptions
  , dispatchError = util.dispatchError

function Batch (levelup, codec) {
  this._levelup = levelup
  this._codec = codec
  this.batch = levelup.db.batch()
  this.ops = []
}

Batch.prototype.put = function (key_, value_, options) {
  options = getOptions(this._levelup, options)

  var key   = this._codec.encodeKey(key_, options)
    , value = this._codec.encodeValue(value_, options)

  try {
    this.batch.put(key, value)
  } catch (e) {
    throw new WriteError(e)
  }
  this.ops.push({ type : 'put', key : key, value : value })

  return this
}

Batch.prototype.del = function (key_, options) {
  options = getOptions(this._levelup, options)

  var key = this._codec.encodeKey(key_, options)

  try {
    this.batch.del(key)
  } catch (err) {
    throw new WriteError(err)
  }
  this.ops.push({ type : 'del', key : key })

  return this
}

Batch.prototype.clear = function () {
  try {
    this.batch.clear()
  } catch (err) {
    throw new WriteError(err)
  }

  this.ops = []
  return this
}

Batch.prototype.write = function (callback) {
  var levelup = this._levelup
    , ops     = this.ops

  try {
    this.batch.write(function (err) {
      if (err)
        return dispatchError(levelup, new WriteError(err), callback)
      levelup.emit('batch', ops)
      if (callback)
        callback()
    })
  } catch (err) {
    throw new WriteError(err)
  }
}

module.exports = Batch

},{"./errors":200,"./util":203}],198:[function(require,module,exports){
/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License
 * <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

var encodings = require('./encodings')

function getKeyEncoder (options, op) {
  var type = ((op && op.keyEncoding) || options.keyEncoding) || 'utf8'
  return encodings[type] || type
}

function getValueEncoder (options, op) {
  var type = (((op && (op.valueEncoding || op.encoding))
      || options.valueEncoding || options.encoding)) || 'utf8'
  return encodings[type] || type
}

/*
  Encode a key.
  This method takes two options, because the leveldb instance
  has options, and this operation (a put, del, or batch)
  also has options that may override the leveldb's options.
*/

function encodeKey (key, options, op) {
  return getKeyEncoder(options, op).encode(key)
}

/*
  Encode a value.
  Takes 2 options, for the same reason as encodeKey
*/

function encodeValue (value, options, op) {
  return getValueEncoder(options, op).encode(value)
}

/*
  Decode an encoded key
*/

function decodeKey (key, options) {
  return getKeyEncoder(options).decode(key)
}

/*
  Decode an encoded value
*/

function decodeValue (value, options) {
  return getValueEncoder(options).decode(value)
}

/*
  check whether this value should be requested as a buffer
  (if false, then it will be a string)
  this allows an optimization in leveldown where leveldown
  retrives a string directly, and thus avoids a memory copy.
*/

function isValueAsBuffer (options, op) {
  return getValueEncoder(options, op).buffer
}

/*
  check whether a given key should be requested as a buffer.
*/

function isKeyAsBuffer (options, op) {
  return getKeyEncoder(options, op).buffer
}


module.exports = {
    encodeKey       : encodeKey
  , encodeValue     : encodeValue
  , isValueAsBuffer : isValueAsBuffer
  , isKeyAsBuffer   : isKeyAsBuffer
  , decodeValue     : decodeValue
  , decodeKey       : decodeKey
}

},{"./encodings":199}],199:[function(require,module,exports){
(function (Buffer){
/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License
 * <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

var encodingNames = [
        'hex'
      , 'utf8'
      , 'utf-8'
      , 'ascii'
      , 'binary'
      , 'base64'
      , 'ucs2'
      , 'ucs-2'
      , 'utf16le'
      , 'utf-16le'
    ]

module.exports = (function () {
  function isBinary (data) {
    return data === undefined || data === null || Buffer.isBuffer(data)
  }

  var encodings = {}

  encodings.utf8 = encodings['utf-8'] = {
      encode : function (data) {
        return isBinary(data) ? data : String(data)
      }
    , decode : function (data) { return data }
    , buffer : false
    , type   : 'utf8'
  }

  encodings.json = {
      encode : JSON.stringify
    , decode : JSON.parse
    , buffer : false
    , type   : 'json'
  }

  encodings.binary = {
      encode : function (data) {
        return isBinary(data) ? data : new Buffer(data)
      }
    , decode : function (data) {
        return data
      }
    , buffer : true
    , type   : 'binary'
  }

  encodingNames.forEach(function (type) {
    if (encodings[type])
      return

    encodings[type] = {
        encode : function (data) {
          return isBinary(data) ? data : new Buffer(data, type)
        }
      , decode : function (buffer) {
          return buffer.toString(type)
        }
      , buffer : true
      , type   : type // useful for debugging purposes
    }
  })

  return encodings
})()


}).call(this,require("buffer").Buffer)
},{"buffer":3}],200:[function(require,module,exports){
/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License
 * <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

var createError   = require('errno').create
  , LevelUPError  = createError('LevelUPError')
  , NotFoundError = createError('NotFoundError', LevelUPError)

NotFoundError.prototype.notFound = true
NotFoundError.prototype.status   = 404

module.exports = {
    LevelUPError        : LevelUPError
  , InitializationError : createError('InitializationError', LevelUPError)
  , OpenError           : createError('OpenError', LevelUPError)
  , ReadError           : createError('ReadError', LevelUPError)
  , WriteError          : createError('WriteError', LevelUPError)
  , NotFoundError       : NotFoundError
  , EncodingError       : createError('EncodingError', LevelUPError)
}

},{"errno":211}],201:[function(require,module,exports){
(function (process){
/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License
 * <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

var EventEmitter   = require('events').EventEmitter
  , inherits       = require('util').inherits
  , extend         = require('xtend')
  , prr            = require('prr')
  , DeferredLevelDOWN = require('deferred-leveldown')

  , WriteError     = require('./errors').WriteError
  , ReadError      = require('./errors').ReadError
  , NotFoundError  = require('./errors').NotFoundError
  , OpenError      = require('./errors').OpenError
  , EncodingError  = require('./errors').EncodingError
  , InitializationError = require('./errors').InitializationError

  , ReadStream     = require('./read-stream')
  , WriteStream    = require('./write-stream')
  , util           = require('./util')
  , Batch          = require('./batch')
  , codec          = require('./codec')

  , getOptions     = util.getOptions
  , defaultOptions = util.defaultOptions
  , getLevelDOWN   = util.getLevelDOWN
  , dispatchError  = util.dispatchError
  , isDefined      = util.isDefined

function getCallback (options, callback) {
  return typeof options == 'function' ? options : callback
}

// Possible LevelUP#_status values:
//  - 'new'     - newly created, not opened or closed
//  - 'opening' - waiting for the database to be opened, post open()
//  - 'open'    - successfully opened the database, available for use
//  - 'closing' - waiting for the database to be closed, post close()
//  - 'closed'  - database has been successfully closed, should not be
//                 used except for another open() operation

function LevelUP (location, options, callback) {
  if (!(this instanceof LevelUP))
    return new LevelUP(location, options, callback)

  var error

  EventEmitter.call(this)
  this.setMaxListeners(Infinity)

  if (typeof location == 'function') {
    options = typeof options == 'object' ? options : {}
    options.db = location
    location = null
  } else if (typeof location == 'object' && typeof location.db == 'function') {
    options = location
    location = null
  }


  if (typeof options == 'function') {
    callback = options
    options  = {}
  }

  if ((!options || typeof options.db != 'function') && typeof location != 'string') {
    error = new InitializationError(
        'Must provide a location for the database')
    if (callback) {
      return process.nextTick(function () {
        callback(error)
      })
    }
    throw error
  }

  options      = getOptions(this, options)
  this.options = extend(defaultOptions, options)
  this._codec = options.codec || codec
  this._status = 'new'
  // set this.location as enumerable but not configurable or writable
  prr(this, 'location', location, 'e')

  this.open(callback)
}

inherits(LevelUP, EventEmitter)

LevelUP.prototype.open = function (callback) {
  var self = this
    , dbFactory
    , db

  if (this.isOpen()) {
    if (callback)
      process.nextTick(function () { callback(null, self) })
    return this
  }

  if (this._isOpening()) {
    return callback && this.once(
        'open'
      , function () { callback(null, self) }
    )
  }

  this.emit('opening')

  this._status = 'opening'
  this.db      = new DeferredLevelDOWN(this.location)
  dbFactory    = this.options.db || getLevelDOWN()
  db           = dbFactory(this.location)

  db.open(this.options, function (err) {
    if (err) {
      return dispatchError(self, new OpenError(err), callback)
    } else {
      self.db.setDb(db)
      self.db = db
      self._status = 'open'
      if (callback)
        callback(null, self)
      self.emit('open')
      self.emit('ready')
    }
  })
}

LevelUP.prototype.close = function (callback) {
  var self = this

  if (this.isOpen()) {
    this._status = 'closing'
    this.db.close(function () {
      self._status = 'closed'
      self.emit('closed')
      if (callback)
        callback.apply(null, arguments)
    })
    this.emit('closing')
    this.db = null
  } else if (this._status == 'closed' && callback) {
    return process.nextTick(callback)
  } else if (this._status == 'closing' && callback) {
    this.once('closed', callback)
  } else if (this._isOpening()) {
    this.once('open', function () {
      self.close(callback)
    })
  }
}

LevelUP.prototype.isOpen = function () {
  return this._status == 'open'
}

LevelUP.prototype._isOpening = function () {
  return this._status == 'opening'
}

LevelUP.prototype.isClosed = function () {
  return (/^clos/).test(this._status)
}

function maybeError(db, options, callback) {
  if (!db._isOpening() && !db.isOpen()) {
    dispatchError(
        db
      , new ReadError('Database is not open')
      , callback
    )
    return true
  }
}

function writeError (db, message, callback) {
  dispatchError(
      db
     , new WriteError(message)
     , callback
  )
}

function readError (db, message, callback) {
  dispatchError(
      db
     , new ReadError(message)
     , callback
  )
  return true
}


LevelUP.prototype.get = function (key_, options, callback) {
  var self = this
    , key

  callback = getCallback(options, callback)

  if (maybeError(this, options, callback))
    return

  if (key_ === null || key_ === undefined || 'function' !== typeof callback)
    return readError(this
      , 'get() requires key and callback arguments', callback)

  options = util.getOptions(this, options)
  key = this._codec.encodeKey(key_, options)

  options.asBuffer = this._codec.isValueAsBuffer(options)

  this.db.get(key, options, function (err, value) {
    if (err) {
      if ((/notfound/i).test(err)) {
        err = new NotFoundError(
            'Key not found in database [' + key_ + ']', err)
      } else {
        err = new ReadError(err)
      }
      return dispatchError(self, err, callback)
    }
    if (callback) {
      try {
        value = self._codec.decodeValue(value, options)
      } catch (e) {
        return callback(new EncodingError(e))
      }
      callback(null, value)
    }
  })
}

LevelUP.prototype.put = function (key_, value_, options, callback) {
  var self = this
    , key
    , value

  callback = getCallback(options, callback)

  if (key_ === null || key_ === undefined
        || value_ === null || value_ === undefined)
    return writeError(this, 'put() requires key and value arguments', callback)

  if (maybeError(this, options, callback))
    return

  options = getOptions(this, options)
  key     = this._codec.encodeKey(key_, options)
  value   = this._codec.encodeValue(value_, options)

  this.db.put(key, value, options, function (err) {
    if (err) {
      return dispatchError(self, new WriteError(err), callback)
    } else {
      self.emit('put', key_, value_)
      if (callback)
        callback()
    }
  })
}

LevelUP.prototype.del = function (key_, options, callback) {
  var self = this
    , key

  callback = getCallback(options, callback)

  if (key_ === null || key_ === undefined)
    return writeError(this, 'del() requires a key argument', callback)

  if (maybeError(this, options, callback))
    return

  options = getOptions(this, options)
  key     = this._codec.encodeKey(key_, options)

  this.db.del(key, options, function (err) {
    if (err) {
      return dispatchError(self, new WriteError(err), callback)
    } else {
      self.emit('del', key_)
      if (callback)
        callback()
    }
  })
}

LevelUP.prototype.batch = function (arr_, options, callback) {
  var self = this
    , keyEnc
    , valueEnc
    , arr

  if (!arguments.length)
    return new Batch(this, codec)

  callback = getCallback(options, callback)

  if (!Array.isArray(arr_))
    return writeError(this, 'batch() requires an array argument', callback)

  if (maybeError(this, options, callback))
    return

  options  = getOptions(this, options)
  keyEnc   = options.keyEncoding
  valueEnc = options.valueEncoding

  arr = arr_.map(function (e) {
    if (e.type === undefined || e.key === undefined)
      return {}

    // inherit encoding
    var kEnc = e.keyEncoding || keyEnc
      , vEnc = e.valueEncoding || e.encoding || valueEnc
      , o

    // If we're not dealing with plain utf8 strings or plain
    // Buffers then we have to do some work on the array to
    // encode the keys and/or values. This includes JSON types.

    if (kEnc != 'utf8' && kEnc != 'binary'
        || vEnc != 'utf8' && vEnc != 'binary') {
      o = {
          type: e.type
        , key: self._codec.encodeKey(e.key, options, e)
      }

      if (e.value !== undefined)
        o.value = self._codec.encodeValue(e.value, options, e)

      return o
    } else {
      return e
    }
  })

  this.db.batch(arr, options, function (err) {
    if (err) {
      return dispatchError(self, new WriteError(err), callback)
    } else {
      self.emit('batch', arr_)
      if (callback)
        callback()
    }
  })
}

// DEPRECATED: prefer accessing LevelDOWN for this: db.db.approximateSize()
LevelUP.prototype.approximateSize = function (start_, end_, options, callback) {
  var self = this
    , start
    , end

  callback = getCallback(options, callback)

  options = getOptions(options, callback)

  if (start_ === null || start_ === undefined
        || end_ === null || end_ === undefined || 'function' !== typeof callback)
    return readError(this, 'approximateSize() requires start, end and callback arguments', callback)

  start = this._codec.encodeKey(start_, this.options)
  end   = this._codec.encodeKey(end_, this.options)

  this.db.approximateSize(start, end, function (err, size) {
    if (err) {
      return dispatchError(self, new OpenError(err), callback)
    } else if (callback) {
      callback(null, size)
    }
  })
}

LevelUP.prototype.readStream =
LevelUP.prototype.createReadStream = function (options) {
  var self = this
  options = extend( {keys: true, values: true}, this.options, options)

  options.keyEncoding   = options.keyEncoding   || options.encoding
  options.valueEncoding = options.valueEncoding || options.encoding

  if (isDefined(options.start))
    options.start = this._codec.encodeKey(options.start, options)
  if (isDefined(options.end))
    options.end = this._codec.encodeKey(options.end, options)
  if (isDefined(options.gte))
    options.gte = this._codec.encodeKey(options.gte, options)
  if (isDefined(options.gt))
    options.gt = this._codec.encodeKey(options.gt, options)
  if (isDefined(options.lte))
    options.lte = this._codec.encodeKey(options.lte, options)
  if (isDefined(options.lt))
    options.lt = this._codec.encodeKey(options.lt, options)
  if ('number' !== typeof options.limit)
    options.limit = -1

  options.keyAsBuffer   = this._codec.isKeyAsBuffer(options)
  options.valueAsBuffer = this._codec.isValueAsBuffer(options)

  var makeData = options.keys && options.values
    ? function (key, value) {
        return {
            key: self._codec.decodeKey(key, options)
          , value: self._codec.decodeValue(value, options)
        }
      }
    : options.keys
    ? function (key) {
        return self._codec.decodeKey(key, options)
      }
    : options.values
    ? function (_, value) {
        return self._codec.decodeValue(value, options)
      }
    : function () {}

  var stream = new ReadStream(options, makeData)

  if (this.isOpen()) {
    stream.setIterator(self.db.iterator(options))
  } else {
    this.once('ready', function () {
      stream.setIterator(self.db.iterator(options))
    })
  }

  return stream
}

LevelUP.prototype.keyStream =
LevelUP.prototype.createKeyStream = function (options) {
  return this.createReadStream(extend(options, { keys: true, values: false }))
}

LevelUP.prototype.valueStream =
LevelUP.prototype.createValueStream = function (options) {
  return this.createReadStream(extend(options, { keys: false, values: true }))
}

LevelUP.prototype.writeStream =
LevelUP.prototype.createWriteStream = function (options) {
  //XXX is extend needed here?
  return new WriteStream(extend(options), this)
}

LevelUP.prototype.toString = function () {
  return 'LevelUP'
}

function utilStatic (name) {
  return function (location, callback) {
    getLevelDOWN()[name](location, callback || function () {})
  }
}

module.exports         = LevelUP
module.exports.copy    = util.copy
// DEPRECATED: prefer accessing LevelDOWN for this: require('leveldown').destroy()
module.exports.destroy = utilStatic('destroy')
// DEPRECATED: prefer accessing LevelDOWN for this: require('leveldown').repair()
module.exports.repair  = utilStatic('repair')


}).call(this,require('_process'))
},{"./batch":197,"./codec":198,"./errors":200,"./read-stream":202,"./util":203,"./write-stream":204,"_process":11,"deferred-leveldown":206,"events":8,"prr":212,"util":32,"xtend":221}],202:[function(require,module,exports){
/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

// NOTE: we are fixed to readable-stream@1.0.x for now
// for pure Streams2 across Node versions
var Readable      = require('readable-stream').Readable
  , inherits      = require('util').inherits
  , extend        = require('xtend')
  , EncodingError = require('./errors').EncodingError
  , util          = require('./util')



function ReadStream (options, makeData) {
  if (!(this instanceof ReadStream))
    return new ReadStream(options, makeData)

  Readable.call(this, { objectMode: true, highWaterMark: options.highWaterMark })

  // purely to keep `db` around until we're done so it's not GCed if the user doesn't keep a ref

  this._waiting = false
  this._options = options
  this._makeData = makeData
}

inherits(ReadStream, Readable)

ReadStream.prototype.setIterator = function (it) {
  var self = this
  this._iterator = it
  if(this._destroyed) return it.end(function () {})
  if(this._waiting) {
    this._waiting = false
    return this._read()
  }
  return this
}

ReadStream.prototype._read = function read () {
  var self = this
  if (self._destroyed)
    return
  if(!self._iterator)
    return this._waiting = true

  self._iterator.next(function(err, key, value) {
    if (err || (key === undefined && value === undefined)) {
      if (!err && !self._destroyed)
        self.push(null)
      return self._cleanup(err)
    }


    try {
      value = self._makeData(key, value)
    } catch (e) {
      return self._cleanup(new EncodingError(e))
    }
    if (!self._destroyed)
      self.push(value)
  })
}

ReadStream.prototype._cleanup = function (err) {
  if (this._destroyed)
    return

  this._destroyed = true

  var self = this
  if (err)
    self.emit('error', err)

  if (self._iterator) {
    self._iterator.end(function () {
      self._iterator = null
      self.emit('close')
    })
  } else {
    self.emit('close')
  }
}

ReadStream.prototype.destroy = function () {
  this._cleanup()
}

ReadStream.prototype.toString = function () {
  return 'LevelUP.ReadStream'
}


module.exports = ReadStream


},{"./errors":200,"./util":203,"readable-stream":220,"util":32,"xtend":221}],203:[function(require,module,exports){
/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License
 * <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

var extend        = require('xtend')
  , LevelUPError  = require('./errors').LevelUPError
  , encodings     = require('./encodings')
  , defaultOptions = {
        createIfMissing : true
      , errorIfExists   : false
      , keyEncoding     : 'utf8'
      , valueEncoding   : 'utf8'
      , compression     : true
    }

  , leveldown
  , encodingOpts = (function () {
      var eo = {}
      for(var e in encodings)
        eo[e] = {valueEncoding: encodings[e]}
      return eo
    }())

function copy (srcdb, dstdb, callback) {
  srcdb.readStream()
    .pipe(dstdb.writeStream())
    .on('close', callback ? callback : function () {})
    .on('error', callback ? callback : function (err) { throw err })
}

function getOptions (levelup, options) {
  var s = typeof options == 'string' // just an encoding
  if (!s && options && options.encoding && !options.valueEncoding)
    options.valueEncoding = options.encoding
  return extend(
      (levelup && levelup.options) || {}
    , s ? encodingOpts[options] || encodingOpts[defaultOptions.valueEncoding]
        : options
  )
}

function getLevelDOWN () {
  if (leveldown)
    return leveldown

  var requiredVersion       = require('../package.json').devDependencies.leveldown
    , missingLevelDOWNError = 'Could not locate LevelDOWN, try `npm install leveldown`'
    , leveldownVersion

  try {
    leveldownVersion = require('leveldown/package').version
  } catch (e) {
    throw new LevelUPError(missingLevelDOWNError)
  }

  if (!require('semver').satisfies(leveldownVersion, requiredVersion)) {
    throw new LevelUPError(
        'Installed version of LevelDOWN ('
      + leveldownVersion
      + ') does not match required version ('
      + requiredVersion
      + ')'
    )
  }

  try {
    return leveldown = require('leveldown')
  } catch (e) {
    throw new LevelUPError(missingLevelDOWNError)
  }
}

function dispatchError (levelup, error, callback) {
  return typeof callback == 'function'
    ? callback(error)
    : levelup.emit('error', error)
}

function isDefined (v) {
  return typeof v !== 'undefined'
}

module.exports = {
    defaultOptions  : defaultOptions
  , copy            : copy
  , getOptions      : getOptions
  , getLevelDOWN    : getLevelDOWN
  , dispatchError   : dispatchError
  , isDefined       : isDefined
}

},{"../package.json":222,"./encodings":199,"./errors":200,"leveldown":2,"leveldown/package":2,"semver":2,"xtend":221}],204:[function(require,module,exports){
(function (process,global){
/* Copyright (c) 2012-2014 LevelUP contributors
 * See list at <https://github.com/rvagg/node-levelup#contributing>
 * MIT License
 * <https://github.com/rvagg/node-levelup/blob/master/LICENSE.md>
 */

var Stream       = require('stream').Stream
  , inherits     = require('util').inherits
  , extend       = require('xtend')
  , bl           = require('bl')

  , setImmediate = global.setImmediate || process.nextTick

  , getOptions   = require('./util').getOptions

  , defaultOptions = { type: 'put' }

function WriteStream (options, db) {
  if (!(this instanceof WriteStream))
    return new WriteStream(options, db)

  Stream.call(this)
  this._options = extend(defaultOptions, getOptions(db, options))
  this._db      = db
  this._buffer  = []
  this._status  = 'init'
  this._end     = false
  this.writable = true
  this.readable = false

  var self = this
    , ready = function () {
        if (!self.writable)
          return
        self._status = 'ready'
        self.emit('ready')
        self._process()
      }

  if (db.isOpen())
    setImmediate(ready)
  else
    db.once('ready', ready)
}

inherits(WriteStream, Stream)

WriteStream.prototype.write = function (data) {
  if (!this.writable)
    return false
  this._buffer.push(data)
  if (this._status != 'init')
    this._processDelayed()
  if (this._options.maxBufferLength &&
      this._buffer.length > this._options.maxBufferLength) {
    this._writeBlock = true
    return false
  }
  return true
}

WriteStream.prototype.end = function (data) {
  var self = this
  if (data)
    this.write(data)
  setImmediate(function () {
    self._end = true
    self._process()
  })
}

WriteStream.prototype.destroy = function () {
  this.writable = false
  this.end()
}

WriteStream.prototype.destroySoon = function () {
  this.end()
}

WriteStream.prototype.add = function (entry) {
  if (!entry.props)
    return
  if (entry.props.Directory)
    entry.pipe(this._db.writeStream(this._options))
  else if (entry.props.File || entry.File || entry.type == 'File')
    this._write(entry)
  return true
}

WriteStream.prototype._processDelayed = function () {
  var self = this
  setImmediate(function () {
    self._process()
  })
}

WriteStream.prototype._process = function () {
  var buffer
    , self = this

    , cb = function (err) {
        if (!self.writable)
          return
        if (self._status != 'closed')
          self._status = 'ready'
        if (err) {
          self.writable = false
          return self.emit('error', err)
        }
        self._process()
      }

  if (self._status != 'ready' && self.writable) {
    if (self._buffer.length && self._status != 'closed')
      self._processDelayed()
    return
  }

  if (self._buffer.length && self.writable) {
    self._status = 'writing'
    buffer       = self._buffer
    self._buffer = []

    self._db.batch(buffer.map(function (d) {
      return {
          type          : d.type || self._options.type
        , key           : d.key
        , value         : d.value
        , keyEncoding   : d.keyEncoding || self._options.keyEncoding
        , valueEncoding : d.valueEncoding
            || d.encoding
            || self._options.valueEncoding
      }
    }), cb)

    if (self._writeBlock) {
      self._writeBlock = false
      self.emit('drain')
    }

    // don't allow close until callback has returned
    return
  }

  if (self._end && self._status != 'closed') {
    self._status  = 'closed'
    self.writable = false
    self.emit('close')
  }
}

WriteStream.prototype._write = function (entry) {
  var key = entry.path || entry.props.path
    , self = this

  if (!key)
    return

  entry.pipe(bl(function (err, data) {
    if (err) {
      self.writable = false
      return self.emit('error', err)
    }

    if (self._options.fstreamRoot &&
        key.indexOf(self._options.fstreamRoot) > -1)
      key = key.substr(self._options.fstreamRoot.length + 1)

    self.write({ key: key, value: data.slice(0) })
  }))
}

WriteStream.prototype.toString = function () {
  return 'LevelUP.WriteStream'
}

module.exports = WriteStream

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./util":203,"_process":11,"bl":205,"stream":27,"util":32,"xtend":221}],205:[function(require,module,exports){
(function (Buffer){
var DuplexStream = require('readable-stream').Duplex
  , util         = require('util')

function BufferList (callback) {
  if (!(this instanceof BufferList))
    return new BufferList(callback)

  this._bufs  = []
  this.length = 0

  if (typeof callback == 'function') {
    this._callback = callback

    var piper = function (err) {
      if (this._callback) {
        this._callback(err)
        this._callback = null
      }
    }.bind(this)

    this.on('pipe', function (src) {
      src.on('error', piper)
    })
    this.on('unpipe', function (src) {
      src.removeListener('error', piper)
    })
  }
  else if (Buffer.isBuffer(callback))
    this.append(callback)
  else if (Array.isArray(callback)) {
    callback.forEach(function (b) {
      Buffer.isBuffer(b) && this.append(b)
    }.bind(this))
  }

  DuplexStream.call(this)
}

util.inherits(BufferList, DuplexStream)

BufferList.prototype._offset = function (offset) {
  var tot = 0, i = 0, _t
  for (; i < this._bufs.length; i++) {
    _t = tot + this._bufs[i].length
    if (offset < _t)
      return [ i, offset - tot ]
    tot = _t
  }
}

BufferList.prototype.append = function (buf) {
  this._bufs.push(Buffer.isBuffer(buf) ? buf : new Buffer(buf))
  this.length += buf.length
  return this
}

BufferList.prototype._write = function (buf, encoding, callback) {
  this.append(buf)
  if (callback)
    callback()
}

BufferList.prototype._read = function (size) {
  if (!this.length)
    return this.push(null)
  size = Math.min(size, this.length)
  this.push(this.slice(0, size))
  this.consume(size)
}

BufferList.prototype.end = function (chunk) {
  DuplexStream.prototype.end.call(this, chunk)

  if (this._callback) {
    this._callback(null, this.slice())
    this._callback = null
  }
}

BufferList.prototype.get = function (index) {
  return this.slice(index, index + 1)[0]
}

BufferList.prototype.slice = function (start, end) {
  return this.copy(null, 0, start, end)
}

BufferList.prototype.copy = function (dst, dstStart, srcStart, srcEnd) {
  if (typeof srcStart != 'number' || srcStart < 0)
    srcStart = 0
  if (typeof srcEnd != 'number' || srcEnd > this.length)
    srcEnd = this.length
  if (srcStart >= this.length)
    return dst || new Buffer(0)
  if (srcEnd <= 0)
    return dst || new Buffer(0)

  var copy   = !!dst
    , off    = this._offset(srcStart)
    , len    = srcEnd - srcStart
    , bytes  = len
    , bufoff = (copy && dstStart) || 0
    , start  = off[1]
    , l
    , i

  // copy/slice everything
  if (srcStart === 0 && srcEnd == this.length) {
    if (!copy) // slice, just return a full concat
      return Buffer.concat(this._bufs)

    // copy, need to copy individual buffers
    for (i = 0; i < this._bufs.length; i++) {
      this._bufs[i].copy(dst, bufoff)
      bufoff += this._bufs[i].length
    }

    return dst
  }

  // easy, cheap case where it's a subset of one of the buffers
  if (bytes <= this._bufs[off[0]].length - start) {
    return copy
      ? this._bufs[off[0]].copy(dst, dstStart, start, start + bytes)
      : this._bufs[off[0]].slice(start, start + bytes)
  }

  if (!copy) // a slice, we need something to copy in to
    dst = new Buffer(len)

  for (i = off[0]; i < this._bufs.length; i++) {
    l = this._bufs[i].length - start

    if (bytes > l) {
      this._bufs[i].copy(dst, bufoff, start)
    } else {
      this._bufs[i].copy(dst, bufoff, start, start + bytes)
      break
    }

    bufoff += l
    bytes -= l

    if (start)
      start = 0
  }

  return dst
}

BufferList.prototype.toString = function (encoding, start, end) {
  return this.slice(start, end).toString(encoding)
}

BufferList.prototype.consume = function (bytes) {
  while (this._bufs.length) {
    if (bytes > this._bufs[0].length) {
      bytes -= this._bufs[0].length
      this.length -= this._bufs[0].length
      this._bufs.shift()
    } else {
      this._bufs[0] = this._bufs[0].slice(bytes)
      this.length -= bytes
      break
    }
  }
  return this
}

BufferList.prototype.duplicate = function () {
  var i = 0
    , copy = new BufferList()

  for (; i < this._bufs.length; i++)
    copy.append(this._bufs[i])

  return copy
}

BufferList.prototype.destroy = function () {
  this._bufs.length = 0;
  this.length = 0;
  this.push(null);
}

;(function () {
  var methods = {
      'readDoubleBE' : 8
    , 'readDoubleLE' : 8
    , 'readFloatBE'  : 4
    , 'readFloatLE'  : 4
    , 'readInt32BE'  : 4
    , 'readInt32LE'  : 4
    , 'readUInt32BE' : 4
    , 'readUInt32LE' : 4
    , 'readInt16BE'  : 2
    , 'readInt16LE'  : 2
    , 'readUInt16BE' : 2
    , 'readUInt16LE' : 2
    , 'readInt8'     : 1
    , 'readUInt8'    : 1
  }

  for (var m in methods) {
    (function (m) {
      BufferList.prototype[m] = function (offset) {
        return this.slice(offset, offset + methods[m])[m](0)
      }
    }(m))
  }
}())

module.exports = BufferList

}).call(this,require("buffer").Buffer)
},{"buffer":3,"readable-stream":220,"util":32}],206:[function(require,module,exports){
(function (process,Buffer){
var util              = require('util')
  , AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN

function DeferredLevelDOWN (location) {
  AbstractLevelDOWN.call(this, typeof location == 'string' ? location : '') // optional location, who cares?
  this._db         = undefined
  this._operations = []
}

util.inherits(DeferredLevelDOWN, AbstractLevelDOWN)

// called by LevelUP when we have a real DB to take its place
DeferredLevelDOWN.prototype.setDb = function (db) {
  this._db = db
  this._operations.forEach(function (op) {
    db[op.method].apply(db, op.args)
  })
}

DeferredLevelDOWN.prototype._open = function (options, callback) {
  return process.nextTick(callback)
}

// queue a new deferred operation
DeferredLevelDOWN.prototype._operation = function (method, args) {
  if (this._db)
    return this._db[method].apply(this._db, args)
  this._operations.push({ method: method, args: args })
}

// deferrables
'put get del batch approximateSize'.split(' ').forEach(function (m) {
  DeferredLevelDOWN.prototype['_' + m] = function () {
    this._operation(m, arguments)
  }
})

DeferredLevelDOWN.prototype._isBuffer = function (obj) {
  return Buffer.isBuffer(obj)
}

// don't need to implement this as LevelUP's ReadStream checks for 'ready' state
DeferredLevelDOWN.prototype._iterator = function () {
  throw new TypeError('not implemented')
}

module.exports = DeferredLevelDOWN

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":11,"abstract-leveldown":209,"buffer":3,"util":32}],207:[function(require,module,exports){
arguments[4][120][0].apply(exports,arguments)
},{"_process":11,"dup":120}],208:[function(require,module,exports){
arguments[4][121][0].apply(exports,arguments)
},{"_process":11,"dup":121}],209:[function(require,module,exports){
arguments[4][122][0].apply(exports,arguments)
},{"./abstract-chained-batch":207,"./abstract-iterator":208,"_process":11,"buffer":3,"dup":122,"xtend":221}],210:[function(require,module,exports){
arguments[4][145][0].apply(exports,arguments)
},{"dup":145,"prr":212}],211:[function(require,module,exports){
arguments[4][146][0].apply(exports,arguments)
},{"./custom":210,"dup":146}],212:[function(require,module,exports){
arguments[4][147][0].apply(exports,arguments)
},{"dup":147}],213:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":215,"./_stream_writable":217,"_process":11,"core-util-is":218,"dup":17,"inherits":302}],214:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./_stream_transform":216,"core-util-is":218,"dup":18,"inherits":302}],215:[function(require,module,exports){
arguments[4][98][0].apply(exports,arguments)
},{"_process":11,"buffer":3,"core-util-is":218,"dup":98,"events":8,"inherits":302,"isarray":285,"stream":27,"string_decoder/":219}],216:[function(require,module,exports){
arguments[4][99][0].apply(exports,arguments)
},{"./_stream_duplex":213,"core-util-is":218,"dup":99,"inherits":302}],217:[function(require,module,exports){
arguments[4][100][0].apply(exports,arguments)
},{"./_stream_duplex":213,"_process":11,"buffer":3,"core-util-is":218,"dup":100,"inherits":302,"stream":27}],218:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],219:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],220:[function(require,module,exports){
var Stream = require('stream'); // hack to fix a circular dependency issue when used with browserify
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":213,"./lib/_stream_passthrough.js":214,"./lib/_stream_readable.js":215,"./lib/_stream_transform.js":216,"./lib/_stream_writable.js":217,"stream":27}],221:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],222:[function(require,module,exports){
module.exports={
  "name": "levelup",
  "description": "Fast & simple storage - a Node.js-style LevelDB wrapper",
  "version": "0.19.0",
  "contributors": [
    {
      "name": "Rod Vagg",
      "email": "r@va.gg",
      "url": "https://github.com/rvagg"
    },
    {
      "name": "John Chesley",
      "email": "john@chesl.es",
      "url": "https://github.com/chesles/"
    },
    {
      "name": "Jake Verbaten",
      "email": "raynos2@gmail.com",
      "url": "https://github.com/raynos"
    },
    {
      "name": "Dominic Tarr",
      "email": "dominic.tarr@gmail.com",
      "url": "https://github.com/dominictarr"
    },
    {
      "name": "Max Ogden",
      "email": "max@maxogden.com",
      "url": "https://github.com/maxogden"
    },
    {
      "name": "Lars-Magnus Skog",
      "email": "lars.magnus.skog@gmail.com",
      "url": "https://github.com/ralphtheninja"
    },
    {
      "name": "David Björklund",
      "email": "david.bjorklund@gmail.com",
      "url": "https://github.com/kesla"
    },
    {
      "name": "Julian Gruber",
      "email": "julian@juliangruber.com",
      "url": "https://github.com/juliangruber"
    },
    {
      "name": "Paolo Fragomeni",
      "email": "paolo@async.ly",
      "url": "https://github.com/hij1nx"
    },
    {
      "name": "Anton Whalley",
      "email": "anton.whalley@nearform.com",
      "url": "https://github.com/No9"
    },
    {
      "name": "Matteo Collina",
      "email": "matteo.collina@gmail.com",
      "url": "https://github.com/mcollina"
    },
    {
      "name": "Pedro Teixeira",
      "email": "pedro.teixeira@gmail.com",
      "url": "https://github.com/pgte"
    },
    {
      "name": "James Halliday",
      "email": "mail@substack.net",
      "url": "https://github.com/substack"
    }
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/rvagg/node-levelup.git"
  },
  "homepage": "https://github.com/rvagg/node-levelup",
  "keywords": [
    "leveldb",
    "stream",
    "database",
    "db",
    "store",
    "storage",
    "json"
  ],
  "main": "lib/levelup.js",
  "dependencies": {
    "bl": "~0.8.1",
    "deferred-leveldown": "~0.2.0",
    "errno": "~0.1.1",
    "prr": "~0.0.0",
    "readable-stream": "~1.0.26",
    "semver": "~2.3.1",
    "xtend": "~3.0.0"
  },
  "devDependencies": {
    "leveldown": "~0.10.0",
    "bustermove": "*",
    "tap": "*",
    "referee": "*",
    "rimraf": "*",
    "async": "*",
    "fstream": "*",
    "tar": "*",
    "mkfiletree": "*",
    "readfiletree": "*",
    "slow-stream": ">=0.0.4",
    "delayed": "*",
    "boganipsum": "*",
    "du": "*",
    "memdown": "*",
    "msgpack-js": "*"
  },
  "browser": {
    "leveldown": false,
    "leveldown/package": false,
    "semver": false
  },
  "scripts": {
    "test": "tap test/*-test.js --stderr",
    "functionaltests": "node ./test/functional/fstream-test.js && node ./test/functional/binary-data-test.js && node ./test/functional/compat-test.js",
    "alltests": "npm test && npm run-script functionaltests"
  },
  "license": "MIT",
  "gitHead": "fb742b01990139b44b1816de87a6e1b2de629627",
  "bugs": {
    "url": "https://github.com/rvagg/node-levelup/issues"
  },
  "_id": "levelup@0.19.0",
  "_shasum": "f6b60a168c86c2fe5d5953476cbe9786ccf0a3f7",
  "_from": "levelup@>=0.19.0 <0.20.0",
  "_npmVersion": "1.4.23",
  "_npmUser": {
    "name": "rvagg",
    "email": "rod@vagg.org"
  },
  "maintainers": [
    {
      "name": "rvagg",
      "email": "rod@vagg.org"
    }
  ],
  "dist": {
    "shasum": "f6b60a168c86c2fe5d5953476cbe9786ccf0a3f7",
    "tarball": "http://registry.npmjs.org/levelup/-/levelup-0.19.0.tgz"
  },
  "directories": {},
  "_resolved": "https://registry.npmjs.org/levelup/-/levelup-0.19.0.tgz",
  "readme": "ERROR: No README data found!"
}

},{}],223:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;


module.exports = function has(obj, property) {
  return hasOwn.call(obj, property);
};

},{}],224:[function(require,module,exports){
(function (Buffer){
var multiplex = require('multiplex');
var inherits = require('inherits');
var Duplex = require('readable-stream').Duplex;
var protobuf = require('protocol-buffers');

var through = require('through2');
var isarray = require('isarray');
var has = require('has');

var messages = protobuf(Buffer("ZW51bSBUWVBFIHsKICBBVkFJTEFCTEUgPSAwOwogIFJFUVVFU1QgPSAxOwogIEhBU0hFUyA9IDI7CiAgU0lOQ0UgPSAzOwogIENMT1NFID0gNDsKICBTRUVOID0gNTsKICBJRCA9IDY7Cn0KCm1lc3NhZ2UgUlBDIHsKICByZXF1aXJlZCBUWVBFIHR5cGUgPSAwOwogIHJlcGVhdGVkIHN0cmluZyBoYXNoZXMgPSAxOwogIHJlcGVhdGVkIE1hcCBtYXBwaW5nID0gMjsKICBvcHRpb25hbCB1aW50MzIgc2VxdWVuY2UgPSAzOwp9CgptZXNzYWdlIE1hcCB7CiAgcmVxdWlyZWQgc3RyaW5nIGhhc2ggPSAwOwogIHJlcXVpcmVkIHVpbnQzMiBzZXF1ZW5jZSA9IDE7Cn0K","base64"));
var TYPE = messages.TYPE;
var RPC = messages.RPC;

module.exports = Rep;
inherits(Rep, Duplex);

function Rep (fn) {
    var self = this;
    if (!(this instanceof Rep)) return new Rep(fn);
    Duplex.call(this);
    
    this._mplex = multiplex({}, function (stream, ch) {
        var seq = parseInt(ch, 16);
        var hseq = seq - 1;
        if (seq === 0) {
            stream.pipe(self._handleRPC());
        }
        else if (has(self._hashes, hseq)) {
            var hash = self._hashes[hseq];
            delete self._hashes[hseq];
            self.emit('response', hash, stream, hseq);
        }
        else self.destroy();
    });
    this._mplex.on('readable', function () {
        if (self._reading) {
            self._reading = false;
            self._read();
        }
    });
    this._rpc = this._mplex.createStream('0');
    
    this._provided = {};
    this._requested = {};
    this._hashes = {};
    this._index = 0;
    this._createReadStream = fn;
    this._closed = { local: false, remote: false };
}

Rep.prototype._read = function () {
    if (this._closed.remote && this._closed.local) return;
    
    var buf, times = 0;
    while ((buf = this._mplex.read()) !== null) {
        this.push(buf);
        times ++;
    }
    if (times === 0) this._reading = true;
};

Rep.prototype._write = function (buf, enc, next) {
    return this._mplex._write(buf, enc, next);
};

Rep.prototype.destroy = function () {
    this._mplex.destroy();
};

Rep.prototype._handleRPC = function () {
    var self = this;
    return through.obj(function (buf, enc, next) {
        var msg = decode(buf);
        if (!msg) return self.destroy();
        if (msg.type === TYPE.AVAILABLE) {
            var hs = msg.hashes.filter(function (h) {
                return !has(self._provided, h);
            });
            self.emit('available', hs);
            next();
        }
        else if (msg.type === TYPE.REQUEST) {
            self._handleRequest(msg.hashes, next);
        }
        else if (msg.type === TYPE.HASHES) {
            msg.mapping.forEach(function (m) {
                if (!has(self._requested, m.hash)) return self.destroy();
                if (has(self._hashes, m.sequence)) return self.destroy();
                self._hashes[m.sequence] = m.hash;
            });
            next();
        }
        else if (msg.type === TYPE.SINCE) {
            self.emit('since', msg.sequence - 1);
            next();
        }
        else if (msg.type === TYPE.SEEN) {
            self.emit('seen', msg.sequence - 1);
            next();
        }
        else if (msg.type === TYPE.ID) {
            self.emit('id', msg.hashes[0]);
            next();
        }
        else if (msg.type === TYPE.CLOSE) {
            self._closed.remote = true;
            if (self._closed.local) {
                self.emit('close');
                self.push(null);
            }
        }
        else next();
    });
    
    function decode (buf) {
        try { return RPC.decode(buf) }
        catch (err) { return null }
    }
};

Rep.prototype._handleRequest = function (hashes, next) {
    var self = this;
    var hs = [], rs = {};
    var pending = hashes.length;
    if (pending === 0) done();
    
    hashes.forEach(function (h) {
        if (!has(self._provided, h)) {
            if (-- pending === 0) done();
            return false;
        }
        self._createReadStream(h, function (err, r, seq) {
            if (r) {
                if (seq === undefined) seq = ++ self._index;
                rs[h] = { stream: r, sequence: seq };
                hs.push({ hash: h, sequence: seq });
            }
            if (-- pending === 0) done();
        });
    });
    
    function done () {
        self._rpc.write(RPC.encode({
            type: TYPE.HASHES,
            mapping: hs
        }));
        
        Object.keys(rs).forEach(function (hash) {
            var r = rs[hash].stream, seq = rs[hash].sequence;
            var stream = self._mplex.createStream((seq+1).toString(16));
            r.pipe(stream);
        });
        next();
    }
};

Rep.prototype.since = function (seq) {
    this._rpc.write(RPC.encode({
        type: TYPE.SINCE,
        sequence: seq + 1
    }));
};

Rep.prototype.seen = function (seq) {
    this._rpc.write(RPC.encode({
        type: TYPE.SEEN,
        sequence: seq + 1
    }));
};

Rep.prototype.id = function (id) {
    this._rpc.write(RPC.encode({
        type: TYPE.ID,
        hashes: [ id ]
    }));
};

Rep.prototype.provide = function (hashes) {
    var self = this;
    if (!isarray(hashes) && hashes && typeof hashes === 'object') {
        Object.keys(hashes).forEach(function (key) {
            self._provided[key] = hashes[key];
        });
    }
    else {
        if (!isarray(hashes)) hashes = [ hashes ];
        hashes.forEach(function (h) {
            self._provided[h] = true;
        });
    }
    self._rpc.write(RPC.encode({
        type: TYPE.AVAILABLE,
        hashes: hashes
    }));
};

Rep.prototype.request = function (hashes) {
    var self = this;
    if (!isarray(hashes)) hashes = [ hashes ];
    hashes.forEach(function (h) {
        self._requested[h] = true;
    });
    self._rpc.write(RPC.encode({
        type: TYPE.REQUEST,
        hashes: hashes
    }));
};

Rep.prototype.close = function () {
    this._rpc.write(RPC.encode({
        type: TYPE.CLOSE
    }));
    this._closed.local = true;
    if (this._closed.remote) {
        this.emit('close');
        this.push(null);
    }
};

}).call(this,require("buffer").Buffer)
},{"buffer":3,"has":226,"inherits":302,"isarray":285,"multiplex":227,"protocol-buffers":268,"readable-stream":298,"through2":325}],225:[function(require,module,exports){
var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

module.exports = function bind(that) {
    var target = this;
    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
    }
    var args = slice.call(arguments, 1);

    var binder = function () {
        if (this instanceof bound) {
            var result = target.apply(
                this,
                args.concat(slice.call(arguments))
            );
            if (Object(result) === result) {
                return result;
            }
            return this;
        } else {
            return target.apply(
                that,
                args.concat(slice.call(arguments))
            );
        }
    };

    var boundLength = Math.max(0, target.length - args.length);
    var boundArgs = [];
    for (var i = 0; i < boundLength; i++) {
        boundArgs.push('$' + i);
    }

    var bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

    if (target.prototype) {
        var Empty = function Empty() {};
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
    }

    return bound;
};


},{}],226:[function(require,module,exports){
var bind = require('function-bind');

module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);

},{"function-bind":225}],227:[function(require,module,exports){
(function (Buffer){
var protobuf = require('protocol-buffers')
var duplexify = require('duplexify')
var lpstream = require('length-prefixed-stream')
var through = require('through2')


var messages = protobuf(Buffer("ZW51bSBUWVBFIHsKICBEQVRBID0gMTsKICBFTkQgPSAyOwogIEVSUk9SID0gMzsKfQoKbWVzc2FnZSBGcmFtZSB7CiAgcmVxdWlyZWQgc2ludDMyIGNoYW5uZWwgPSAxOwogIG9wdGlvbmFsIHN0cmluZyBuYW1lID0gMjsKICBvcHRpb25hbCBUWVBFIHR5cGUgPSAzIFtkZWZhdWx0PURBVEFdOwogIG9wdGlvbmFsIGJ5dGVzIGRhdGEgID0gNDsKfQ==","base64"))
var TYPE = messages.TYPE

var multiplex = function(opts, onstream) {
  if (typeof opts === 'function') return multiplex(null, opts)
  if (!opts) opts = {}

  var local = []
  var remote = []
  var encode = lpstream.encode()
  var decode = lpstream.decode()
  var dup = duplexify.obj(decode, encode)

  var addChannel = function(list, index, name) {
    var stream = duplexify.obj()
    var channel = list === remote ? -(index+1) : index+1

    var readable = through.obj()
    var writable = through.obj(function(data, enc, cb) {
      if (typeof data === 'string') data = new Buffer(data)
      encode.write(messages.Frame.encode({channel:channel, data:data, name:name}), cb)
      name = null
    })

    var destroy = function(type, data) {
      if (list[index] !== readable) return
      encode.write(messages.Frame.encode({channel:channel, type:type, data:data, name:name}))
      list[index] = null
    }

    list[index] = readable

    stream.meta = name
    stream.setReadable(readable)
    stream.setWritable(writable)

    var onerror = function(err) {
      destroy(TYPE.ERROR, err && new Buffer(err.message))
    }

    readable.once('destroy', function(err) {
      stream.removeListener('close', onerror)
      stream.removeListener('error', onerror)
      stream.destroy(err)
    })

    stream.on('close', onerror)
    if (opts.error) stream.on('error', onerror)

    writable.on('finish', function() {
      destroy(TYPE.END)
      readable.end()
    })

    return stream
  }

  var decodeFrame = function(data) {
    try {
      return messages.Frame.decode(data)
    } catch (err) {
      return null
    }
  }

  var decoder = function(data, enc, cb) {
    var frame = decodeFrame(data)
    if (!frame) return dup.destroy(new Error('Invalid data'))

    var channel = frame.channel
    var reply = channel < 0
    var index = reply ? -channel-1 : channel-1

    if (!reply && !remote[index] && onstream) {
      onstream(addChannel(remote, index, frame.name), frame.name || index)
    }

    var list = reply ? local : remote
    var stream = list[index]

    if (!stream) return cb()

    switch (frame.type) {
      case TYPE.DATA:
      return stream.write(frame.data, cb)

      case TYPE.END:
      list[index] = null
      stream.end()
      return cb()

      case TYPE.ERROR:
      list[index] = null
      stream.emit('destroy', frame.data && new Error(frame.data.toString()))
      return cb()
    }

    cb()
  }

  decode.pipe(through.obj(decoder))

  dup.on('close', function() {
    local.concat(remote).forEach(function(readable) {
      if (readable) readable.emit('destroy')
    })
  })

  dup.on('finish', function() {
    local.concat(remote).forEach(function(readable) {
      if (readable) readable.end()
    })
    encode.end()
  })

  dup.createStream = function(name) {
    var index = local.indexOf(null)
    if (index === -1) index = local.push(null)-1
    return addChannel(local, index, name && ''+name)
  }

  return dup
}

module.exports = multiplex
}).call(this,require("buffer").Buffer)
},{"buffer":3,"duplexify":228,"length-prefixed-stream":243,"protocol-buffers":268,"through2":265}],228:[function(require,module,exports){
(function (process,Buffer){
var stream = require('readable-stream')
var eos = require('end-of-stream')
var util = require('util')

var SIGNAL_FLUSH = new Buffer([0])

var onuncork = function(self, fn) {
  if (self._corked) self.once('uncork', fn)
  else fn()
}

var destroyer = function(self, end) {
  return function(err) {
    if (err) self.destroy(err.message === 'premature close' ? null : err)
    else if (end && !self._ended) self.end()
  }
}

var end = function(ws, fn) {
  if (!ws) return fn()
  if (ws._writableState && ws._writableState.finished) return fn()
  if (ws._writableState) return ws.end(fn)
  ws.end()
  fn()
}

var toStreams2 = function(rs) {
  return new (stream.Readable)({objectMode:true, highWaterMark:16}).wrap(rs)
}

var Duplexify = function(writable, readable, opts) {
  if (!(this instanceof Duplexify)) return new Duplexify(writable, readable, opts)
  stream.Duplex.call(this, opts)

  this._writable = null
  this._readable = null
  this._readable2 = null

  this._forwardDestroy = !opts || opts.destroy !== false
  this._forwardEnd = !opts || opts.end !== false
  this._corked = 1 // start corked
  this._ondrain = null
  this._drained = false
  this._forwarding = false
  this._unwrite = null
  this._unread = null
  this._ended = false

  this.destroyed = false

  if (writable) this.setWritable(writable)
  if (readable) this.setReadable(readable)
}

util.inherits(Duplexify, stream.Duplex)

Duplexify.obj = function(writable, readable, opts) {
  if (!opts) opts = {}
  opts.objectMode = true
  opts.highWaterMark = 16
  return new Duplexify(writable, readable, opts)
}

Duplexify.prototype.cork = function() {
  if (++this._corked === 1) this.emit('cork')
}

Duplexify.prototype.uncork = function() {
  if (this._corked && --this._corked === 0) this.emit('uncork')
}

Duplexify.prototype.setWritable = function(writable) {
  if (this._unwrite) this._unwrite()

  if (this.destroyed) {
    if (writable && writable.destroy) writable.destroy()
    return
  }

  if (writable === null || writable === false) {
    this.end()
    return
  }

  var self = this
  var unend = eos(writable, {writable:true, readable:false}, destroyer(this, this._forwardEnd))

  var ondrain = function() {
    var ondrain = self._ondrain
    self._ondrain = null
    if (ondrain) ondrain()
  }

  var clear = function() {
    self._writable.removeListener('drain', ondrain)
    unend()
  }

  if (this._unwrite) process.nextTick(ondrain) // force a drain on stream reset to avoid livelocks

  this._writable = writable
  this._writable.on('drain', ondrain)
  this._unwrite = clear

  this.uncork() // always uncork setWritable
}

Duplexify.prototype.setReadable = function(readable) {
  if (this._unread) this._unread()

  if (this.destroyed) {
    if (readable && readable.destroy) readable.destroy()
    return
  }

  if (readable === null || readable === false) {
    this.push(null)
    this.resume()
    return
  }

  var self = this
  var unend = eos(readable, {writable:false, readable:true}, destroyer(this))

  var onreadable = function() {
    self._forward()
  }

  var onend = function() {
    self.push(null)
  }

  var clear = function() {
    self._readable2.removeListener('readable', onreadable)
    self._readable2.removeListener('end', onend)
    unend()
  }

  this._drained = true
  this._readable = readable
  this._readable2 = readable._readableState ? readable : toStreams2(readable)
  this._readable2.on('readable', onreadable)
  this._readable2.on('end', onend)
  this._unread = clear

  this._forward()
}

Duplexify.prototype._read = function() {
  this._drained = true
  this._forward()
}

Duplexify.prototype._forward = function() {
  if (this._forwarding || !this._readable2 || !this._drained) return
  this._forwarding = true

  var data
  var state = this._readable2._readableState

  while ((data = this._readable2.read(state.buffer.length ? state.buffer[0].length : state.length)) !== null) {
    this._drained = this.push(data)
  }

  this._forwarding = false
}

Duplexify.prototype.destroy = function(err) {
  if (this.destroyed) return
  this.destroyed = true

  var self = this
  process.nextTick(function() {
    self._destroy(err)
  })
}

Duplexify.prototype._destroy = function(err) {
  if (err) {
    var ondrain = this._ondrain
    this._ondrain = null
    if (ondrain) ondrain(err)
    else this.emit('error', err)
  }

  if (this._forwardDestroy) {
    if (this._readable && this._readable.destroy) this._readable.destroy()
    if (this._writable && this._writable.destroy) this._writable.destroy()
  }

  this.emit('close')
}

Duplexify.prototype._write = function(data, enc, cb) {
  if (this.destroyed) return cb()
  if (this._corked) return onuncork(this, this._write.bind(this, data, enc, cb))
  if (data === SIGNAL_FLUSH) return this._finish(cb)
  if (!this._writable) return cb()

  if (this._writable.write(data) === false) this._ondrain = cb
  else cb()
}


Duplexify.prototype._finish = function(cb) {
  var self = this
  this.emit('preend')
  onuncork(this, function() {
    end(self._forwardEnd && self._writable, function() {
      // haxx to not emit prefinish twice
      if (self._writableState.prefinished === false) self._writableState.prefinished = true
      self.emit('prefinish')
      onuncork(self, cb)
    })
  })
}

Duplexify.prototype.end = function(data, enc, cb) {
  if (typeof data === 'function') return this.end(null, null, data)
  if (typeof enc === 'function') return this.end(data, null, enc)
  this._ended = true
  if (data) this.write(data)
  if (!this._writableState.ending) this.write(SIGNAL_FLUSH)
  return stream.Writable.prototype.end.call(this, cb)
}

module.exports = Duplexify
}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":11,"buffer":3,"end-of-stream":229,"readable-stream":240,"util":32}],229:[function(require,module,exports){
var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback();
	};

	var onend = function() {
		readable = false;
		if (!writable) callback();
	};

	var onclose = function() {
		if (readable && !(rs && rs.ended)) return callback(new Error('premature close'));
		if (writable && !(ws && ws.ended)) return callback(new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', callback);
	stream.on('close', onclose);

	return function() {
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('end', onend);
		stream.removeListener('error', callback);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;
},{"once":231}],230:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"dup":45}],231:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

},{"wrappy":230}],232:[function(require,module,exports){
arguments[4][162][0].apply(exports,arguments)
},{"./_stream_readable":234,"./_stream_writable":236,"core-util-is":237,"dup":162,"inherits":302,"process-nextick-args":238}],233:[function(require,module,exports){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":235,"core-util-is":237,"inherits":302}],234:[function(require,module,exports){
arguments[4][163][0].apply(exports,arguments)
},{"./_stream_duplex":232,"_process":11,"buffer":3,"core-util-is":237,"dup":163,"events":8,"inherits":302,"isarray":285,"process-nextick-args":238,"string_decoder/":239,"util":2}],235:[function(require,module,exports){
arguments[4][164][0].apply(exports,arguments)
},{"./_stream_duplex":232,"core-util-is":237,"dup":164,"inherits":302}],236:[function(require,module,exports){
arguments[4][165][0].apply(exports,arguments)
},{"./_stream_duplex":232,"buffer":3,"core-util-is":237,"dup":165,"events":8,"inherits":302,"process-nextick-args":238,"util-deprecate":"util-deprecate"}],237:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],238:[function(require,module,exports){
arguments[4][169][0].apply(exports,arguments)
},{"_process":11,"dup":169}],239:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],240:[function(require,module,exports){
var Stream = (function (){
  try {
    return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":232,"./lib/_stream_passthrough.js":233,"./lib/_stream_readable.js":234,"./lib/_stream_transform.js":235,"./lib/_stream_writable.js":236}],241:[function(require,module,exports){
(function (Buffer){
var varint = require('varint')
var stream = require('readable-stream')
var util = require('util')

var Decoder = function (opts) {
  if (!(this instanceof Decoder)) return new Decoder(opts)
  stream.Transform.call(this)

  this._missing = 0
  this._message = null
  this._limit = opts && opts.limit || 0
  this._prefix = new Buffer(this._limit ? varint.encodingLength(this._limit) : 100)
  this._ptr = 0
}

util.inherits(Decoder, stream.Transform)

Decoder.prototype._push = function (message) {
  this._ptr = 0
  this._missing = 0
  this._message = null
  this.push(message)
}

Decoder.prototype._parseLength = function (data, offset) {
  for (offset; offset < data.length; offset++) {
    if (this._ptr >= this._prefix.length) return this._prefixError(data)
    this._prefix[this._ptr++] = data[offset]
    if (!(data[offset] & 0x80)) {
      this._missing = varint.decode(this._prefix)
      if (this._limit && this._missing > this._limit) return this._prefixError(data)
      this._ptr = 0
      return offset + 1
    }
  }
  return data.length
}

Decoder.prototype._prefixError = function (data) {
  this.emit('error', new Error('Message is larger than max length'))
  return data.length
}

Decoder.prototype._parseMessage = function (data, offset) {
  var free = data.length - offset
  var missing = this._missing

  if (!this._message) {
    if (missing <= free) { // fast track - no copy
      this._push(data.slice(offset, offset + missing))
      return offset + missing
    }
    this._message = new Buffer(missing)
  }

  // TODO: add opt-in "partial mode" to completely avoid copys
  data.copy(this._message, this._ptr, offset, offset + missing)

  if (missing <= free) {
    this._push(this._message)
    return offset + missing
  }

  this._missing -= free
  this._ptr += free

  return data.length
}

Decoder.prototype._transform = function (data, enc, cb) {
  var offset = 0

  while (offset < data.length) {
    if (this._missing) offset = this._parseMessage(data, offset)
    else offset = this._parseLength(data, offset)
  }

  cb()
}

module.exports = Decoder

}).call(this,require("buffer").Buffer)
},{"buffer":3,"readable-stream":252,"util":32,"varint":255}],242:[function(require,module,exports){
(function (Buffer){
var varint = require('varint')
var stream = require('readable-stream')
var util = require('util')

var pool = new Buffer(10 * 1024)
var used = 0

var Encoder = function () {
  if (!(this instanceof Encoder)) return new Encoder()
  stream.Transform.call(this)
}

util.inherits(Encoder, stream.Transform)

Encoder.prototype._transform = function (data, enc, cb) {
  varint.encode(data.length, pool, used)
  used += varint.encode.bytes

  this.push(pool.slice(used - varint.encode.bytes, used))
  this.push(data)

  if (pool.length - used < 100) {
    pool = new Buffer(10 * 1024)
    used = 0
  }

  cb()
}

module.exports = Encoder

}).call(this,require("buffer").Buffer)
},{"buffer":3,"readable-stream":252,"util":32,"varint":255}],243:[function(require,module,exports){
exports.encode = require('./encode')
exports.decode = require('./decode')

},{"./decode":241,"./encode":242}],244:[function(require,module,exports){
arguments[4][162][0].apply(exports,arguments)
},{"./_stream_readable":246,"./_stream_writable":248,"core-util-is":249,"dup":162,"inherits":302,"process-nextick-args":250}],245:[function(require,module,exports){
arguments[4][233][0].apply(exports,arguments)
},{"./_stream_transform":247,"core-util-is":249,"dup":233,"inherits":302}],246:[function(require,module,exports){
arguments[4][163][0].apply(exports,arguments)
},{"./_stream_duplex":244,"_process":11,"buffer":3,"core-util-is":249,"dup":163,"events":8,"inherits":302,"isarray":285,"process-nextick-args":250,"string_decoder/":251,"util":2}],247:[function(require,module,exports){
arguments[4][164][0].apply(exports,arguments)
},{"./_stream_duplex":244,"core-util-is":249,"dup":164,"inherits":302}],248:[function(require,module,exports){
arguments[4][165][0].apply(exports,arguments)
},{"./_stream_duplex":244,"buffer":3,"core-util-is":249,"dup":165,"events":8,"inherits":302,"process-nextick-args":250,"util-deprecate":"util-deprecate"}],249:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],250:[function(require,module,exports){
arguments[4][169][0].apply(exports,arguments)
},{"_process":11,"dup":169}],251:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],252:[function(require,module,exports){
arguments[4][240][0].apply(exports,arguments)
},{"./lib/_stream_duplex.js":244,"./lib/_stream_passthrough.js":245,"./lib/_stream_readable.js":246,"./lib/_stream_transform.js":247,"./lib/_stream_writable.js":248,"dup":240}],253:[function(require,module,exports){
module.exports = read

var MSB = 0x80
  , REST = 0x7F

function read(buf, offset) {
  var res    = 0
    , offset = offset || 0
    , shift  = 0
    , counter = offset
    , b
    , l = buf.length
  
  do {
    if(counter >= l) {
      read.bytesRead = 0
      return undefined
    }
    b = buf[counter++]
    res += shift < 28
      ? (b & REST) << shift
      : (b & REST) * Math.pow(2, shift)
    shift += 7
  } while (b >= MSB)
  
  read.bytes = counter - offset
  
  return res
}

},{}],254:[function(require,module,exports){
module.exports = encode

var MSB = 0x80
  , REST = 0x7F
  , MSBALL = ~REST
  , INT = Math.pow(2, 31)

function encode(num, out, offset) {
  out = out || []
  offset = offset || 0
  var oldOffset = offset

  while(num >= INT) {
    out[offset++] = (num & 0xFF) | MSB
    num /= 128
  }
  while(num & MSBALL) {
    out[offset++] = (num & 0xFF) | MSB
    num >>>= 7
  }
  out[offset] = num | 0
  
  encode.bytes = offset - oldOffset + 1
  
  return out
}

},{}],255:[function(require,module,exports){
module.exports = {
    encode: require('./encode.js')
  , decode: require('./decode.js')
  , encodingLength: require('./length.js')
}

},{"./decode.js":253,"./encode.js":254,"./length.js":256}],256:[function(require,module,exports){

var N1 = Math.pow(2,  7)
var N2 = Math.pow(2, 14)
var N3 = Math.pow(2, 21)
var N4 = Math.pow(2, 28)
var N5 = Math.pow(2, 35)
var N6 = Math.pow(2, 42)
var N7 = Math.pow(2, 49)
var N8 = Math.pow(2, 56)
var N9 = Math.pow(2, 63)

module.exports = function (value) {
  return (
    value < N1 ? 1
  : value < N2 ? 2
  : value < N3 ? 3
  : value < N4 ? 4
  : value < N5 ? 5
  : value < N6 ? 6
  : value < N7 ? 7
  : value < N8 ? 8
  : value < N9 ? 9
  :              10
  )
}

},{}],257:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":258,"./_stream_writable":260,"_process":11,"core-util-is":261,"dup":17,"inherits":302}],258:[function(require,module,exports){
arguments[4][98][0].apply(exports,arguments)
},{"_process":11,"buffer":3,"core-util-is":261,"dup":98,"events":8,"inherits":302,"isarray":285,"stream":27,"string_decoder/":262}],259:[function(require,module,exports){
arguments[4][99][0].apply(exports,arguments)
},{"./_stream_duplex":257,"core-util-is":261,"dup":99,"inherits":302}],260:[function(require,module,exports){
arguments[4][100][0].apply(exports,arguments)
},{"./_stream_duplex":257,"_process":11,"buffer":3,"core-util-is":261,"dup":100,"inherits":302,"stream":27}],261:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],262:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],263:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"./lib/_stream_transform.js":259,"dup":25}],264:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],265:[function(require,module,exports){
arguments[4][107][0].apply(exports,arguments)
},{"_process":11,"dup":107,"readable-stream/transform":263,"util":32,"xtend":264}],266:[function(require,module,exports){
(function (Buffer){
var encodings = require('./encodings')
var varint = require('varint')
var genobj = require('generate-object-property')
var genfun = require('generate-function')

var skip = function(type, buffer, offset) {
  switch (type) {
    case 0:
    varint.decode(buffer, offset)
    return offset + varint.decode.bytes

    case 1:
    return offset + 8

    case 2:
    var len = varint.decode(buffer, offset)
    return offset + varint.decode.bytes + len

    case 3:
    case 4:
    throw new Error('Groups are not supported')

    case 5:
    return offset + 4
  }

  throw new Error('Unknown wire type: '+type)
}

var defined = function(val) {
  return val !== null && val !== undefined
}

var isString = function(def) {
  try {
    return !!def && typeof JSON.parse(def) === 'string'
  } catch (err) {
    return false
  }
}

var defaultValue = function(f, def) {
  if (f.repeated) return '[]'

  switch (f.type) {
    case 'string':
    return isString(def) ? def : '""'

    case 'bool':
    if (def === 'true') return 'true'
    return 'false'

    case 'float':
    case 'double':
    case 'sfixed32':
    case 'fixed32':
    case 'varint':
    case 'enum':
    case 'uint64':
    case 'uint32':
    case 'int64':
    case 'int32':
    case 'sint64':
    case 'sint32':
    return ''+parseInt(def || 0)

    default:
    return 'null'
  }
}

module.exports = function(schema, extraEncodings) {
  var messages = {}
  var enums = {}
  var cache = {}

  var visit = function(schema, prefix) {
    if (schema.enums) {
      schema.enums.forEach(function(e) {
        e.id = prefix + (prefix ? '.' : '')+e.name
        enums[e.id] = e
        visit(e, e.id)
      })
    }
    if (schema.messages) {
      schema.messages.forEach(function(m) {
        m.id = prefix + (prefix ? '.' : '')+m.name
        messages[m.id] = m
        visit(m, m.id)
      })
    }
  }

  visit(schema, '')

  var compileEnum = function(e) {
    var conditions = Object.keys(e.values)
      .map(function(k) {
        return 'val !== '+parseInt(e.values[k])
      })
      .join(' && ')

    if (!conditions) conditions = 'true'

    var encode = genfun()
      ('function encode(val, buf, offset) {')
        ('if (%s) throw new Error("Invalid enum value: "+val)', conditions)
        ('varint.encode(val, buf, offset)')
        ('encode.bytes = varint.encode.bytes')
        ('return buf')
      ('}')
      .toFunction({
        varint: varint
      })

    var decode = genfun()
      ('function decode(buf, offset) {')
        ('var val = varint.decode(buf, offset)')
        ('if (%s) throw new Error("Invalid enum value: "+val)', conditions)
        ('decode.bytes = varint.decode.bytes')
        ('return val')
      ('}')
      .toFunction({
        varint: varint
      })

    return encodings.make(0, encode, decode, varint.encodingLength)
  }

  var compileMessage = function(m, exports) {
    m.messages.forEach(function (nested) {
      exports[nested.name] = resolve(nested.name, m.id)
    })

    m.enums.forEach(function( val ) {
      exports[val.name] = val.values
    })

    exports.type = 2
    exports.message = true
    exports.name = m.name

    var oneofMap = {}
    var oneofs = []
    m.oneof.forEach(function(o) {
      o.fields.forEach(function(f) {
        oneofMap[f.name] = o.name
        oneofs.push({
          name: f.name,
          type: f.type,
          tag: f.tag,
          required: false,
          oneof: o.name
        })
      })
    })

    var fields = m.fields.concat(oneofs)
    var enc = fields.map(function(f) {
      return resolve(f.type, m.id)
    })

    var forEach = function(fn) {
      for (var i = 0; i < enc.length; i++) fn(enc[i], fields[i], genobj('obj', fields[i].name), i)
    }

    // compile encodingLength

    var encodingLength = genfun()
      ('function encodingLength(obj) {')
        ('var length = 0')

    forEach(function(e, f, val, i) {
      var packed = f.repeated && f.options && f.options.packed
      var hl = varint.encodingLength(f.tag << 3 | e.type)

      if (f.required) encodingLength('if (!defined(%s)) throw new Error(%s)', val, JSON.stringify(f.name+' is required'))
      else encodingLength('if (defined(%s)) {', val)

      if (packed) {
        encodingLength()
          ('var packedLen = 0')
          ('for (var i = 0; i < %s.length; i++) {', val)
            ('if (!defined(%s)) continue', val+'[i]')
            ('var len = enc[%d].encodingLength(%s)', i, val+'[i]')
            ('packedLen += len')
            if (e.message) encodingLength('packedLen += varint.encodingLength(len)')
          encodingLength('}')
          ('if (packedLen) {')
            ('length += %d + packedLen + varint.encodingLength(packedLen)', hl)
          ('}')
      } else {
        if (f.repeated) {
          encodingLength('for (var i = 0; i < %s.length; i++) {', val)
          val += '[i]'
          encodingLength('if (!defined(%s)) continue', val)
        }

        encodingLength('var len = enc[%d].encodingLength(%s)', i, val)
        if (e.message) encodingLength('length += varint.encodingLength(len)')
        encodingLength('length += %d + len', hl)
        if (f.repeated) encodingLength('}')
      }

      if (!f.required) encodingLength('}')
    })

    encodingLength()
        ('return length')
      ('}')

    encodingLength = encodingLength.toFunction({
      defined: defined,
      varint: varint,
      enc: enc
    })

    // compile encode

    var encode = genfun()
      ('function encode(obj, buf, offset) {')
        if (oneofs.length) {
          // build up clean object with only the last field set for each oneof
          encode()
          ('var cleanObj={}, foundOneofs = {}')
          ('var oneofs = %s', JSON.stringify(oneofMap))
          ('for (var f in obj) {')
            ('cleanObj[f] = obj[f]')
            ('if (oneofs[f]) {')
              ('if (foundOneofs[oneofs[f]]) {')
                ('delete cleanObj[foundOneofs[oneofs[f]]]')
              ('}')
              ('foundOneofs[oneofs[f]] = f')
            ('}')
          ('}')
          ('obj = cleanObj')
        }
        encode()
        ('if (!offset) offset = 0')
        ('if (!buf) buf = new Buffer(encodingLength(obj))')
        ('var oldOffset = offset')

    forEach(function(e, f, val, i) {
      if (f.required) encode('if (!defined(%s)) throw new Error(%s)', val, JSON.stringify(f.name+' is required'))
      else encode('if (defined(%s)) {', val)

      var packed = f.repeated && f.options && f.options.packed
      var p = varint.encode(f.tag << 3 | 2)
      var h = varint.encode(f.tag << 3 | e.type)

      if (packed) {
        encode()
          ('var packedLen = 0')
          ('for (var i = 0; i < %s.length; i++) {', val)
            ('if (!defined(%s)) continue', val+'[i]')
            ('packedLen += enc[%d].encodingLength(%s)', i, val+'[i]')
          ('}')

        encode('if (packedLen) {')
        for (var j = 0; j < h.length; j++) encode('buf[offset++] = %d', p[j])
        encode('varint.encode(packedLen, buf, offset)')
        encode('offset += varint.encode.bytes')
        encode('}')
      }

      if (f.repeated) {
        encode('for (var i = 0; i < %s.length; i++) {', val)
        val += '[i]'
        encode('if (!defined(%s)) continue', val)
      }

      if (!packed) for (var j = 0; j < h.length; j++) encode('buf[offset++] = %d', h[j])

      if (e.message) {
        encode('varint.encode(enc[%d].encodingLength(%s), buf, offset)', i, val)
        encode('offset += varint.encode.bytes')
      }

      encode('enc[%d].encode(%s, buf, offset)', i, val)
      encode('offset += enc[%d].encode.bytes', i)

      if (f.repeated) encode('}')
      if (!f.required) encode('}')
    })

    encode()
        ('encode.bytes = offset - oldOffset')
        ('return buf')
      ('}')

    encode = encode.toFunction({
      encodingLength: encodingLength,
      defined: defined,
      varint: varint,
      enc: enc,
      Buffer: Buffer
    })

    // compile proto

    var Message = genfun()

    Message('function Message() {')
    forEach(function(e, f) {
      var def = f.options && f.options.default
      var resolved = resolve(f.type, m.id, false)
      var vals = resolved && resolved.values

      if (vals) { // is enum
        if (f.repeated) {
          Message('%s = []', genobj('this', f.name))
        } else {
          def = (def && def in vals) ? vals[def] : vals[Object.keys(vals)[0]]
          Message('%s = %s', genobj('this', f.name), ''+parseInt(def || 0))
        }
        return
      }

      // only set defaults if not a oneof
      if (f.oneof == null) {
        Message('%s = %s', genobj('this', f.name), defaultValue(f, def))
      }
    })
    Message('}')

    Message = Message.toFunction()

    // compile decode

    var invalid = m.fields
      .map(function(f, i) {
        return f.required && '!found'+i
      })
      .filter(function(f) {
        return f
      })
      .join(' || ')

    var decode = genfun()

    decode()
      ('function decode(buf, offset, end) {')
        ('if (!offset) offset = 0')
        ('if (!end) end = buf.length')
        ('if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")')
        ('var oldOffset = offset')
        ('var obj = new Message()')
        if (oneofs.length) {
          decode()
          ('var oneofs = %s', JSON.stringify(oneofMap))
          ('var foundOneofs = {}')
        }

    forEach(function(e, f, val, i) {
      if (f.required) decode('var found%d = false', i)
    })

    decode('while (true) {')
      ('if (end <= offset) {')
        (invalid && 'if (%s) throw new Error("Decoded message is not valid")', invalid)
        ('decode.bytes = offset - oldOffset')
        ('return obj')
      ('}')
      ('var prefix = varint.decode(buf, offset)')
      ('offset += varint.decode.bytes')
      ('var tag = prefix >> 3')
      ('switch (tag) {')

    forEach(function(e, f, val, i) {
      var packed = f.repeated && f.options && f.options.packed

      decode('case %d:', f.tag)

      if (packed) {
        decode()
          ('var packedEnd = varint.decode(buf, offset)')
          ('offset += varint.decode.bytes')
          ('packedEnd += offset')
          ('while (offset < packedEnd) {')
      }

      if (e.message) {
        decode('var len = varint.decode(buf, offset)')
        decode('offset += varint.decode.bytes')
        if (f.repeated) decode('%s.push(enc[%d].decode(buf, offset, offset + len))', val, i)
        else decode('%s = enc[%d].decode(buf, offset, offset + len)', val, i)
      } else {
        if (f.repeated) decode('%s.push(enc[%d].decode(buf, offset))', val, i)
        else {
          decode('%s = enc[%d].decode(buf, offset)', val, i)
          // if a oneof, only keep the last value in the buffer
          if (oneofs.length && f.oneof) {
            decode('var f = "%s"', f.name)
            ('if (oneofs[f]) {')
              ('if (foundOneofs[oneofs[f]]) {')
                ('delete obj[foundOneofs[oneofs[f]]]')
              ('}')
              ('foundOneofs[oneofs[f]] = f')
            ('}')
          }
        }
      }

      decode('offset += enc[%d].decode.bytes', i)

      if (packed) decode('}')
      if (f.required) decode('found%d = true', i)
      decode('break')
    })

    decode()
          ('default:')
          ('offset = skip(prefix & 7, buf, offset)')
        ('}')
      ('}')
    ('}')

    decode = decode.toFunction({
      Message: Message,
      varint: varint,
      skip: skip,
      enc: enc
    })


    // end of compilation - return all the things

    encode.bytes = decode.bytes = 0

    exports.buffer = true
    exports.encode = encode
    exports.decode = decode
    exports.encodingLength = encodingLength

    return exports
  }

  var resolve = function(name, from, compile) {
    if (extraEncodings && extraEncodings[name]) return extraEncodings[name]
    if (encodings[name]) return encodings[name]

    var m = (from ? from+'.'+name : name).split('.')
      .map(function(part, i, list) {
        return list.slice(0, i).concat(name).join('.')
      })
      .reverse()
      .reduce(function(result, id) {
        return result || messages[id] || enums[id]
      }, null)

    if (compile === false) return m
    if (!m) throw new Error('Could not resolve '+name)

    if (m.values) return compileEnum(m)
    return cache[m.id] || compileMessage(m, cache[m.id] = {})
  }

  return (schema.enums || []).concat((schema.messages || []).map(function(message) {
    return resolve(message.id)
  }))
}

}).call(this,require("buffer").Buffer)
},{"./encodings":267,"buffer":3,"generate-function":269,"generate-object-property":270,"varint":283}],267:[function(require,module,exports){
(function (Buffer){
var varint = require('varint')
var svarint = require('signed-varint')

var encoder = function(type, encode, decode, encodingLength) {
  encode.bytes = decode.bytes = 0

  return {
    type: type,
    encode: encode,
    decode: decode,
    encodingLength: encodingLength
  }
}

exports.make = encoder

exports.bytes = function(tag) {
  var bufferLength = function(val) {
    return Buffer.isBuffer(val) ? val.length : Buffer.byteLength(val)
  }

  var encodingLength = function(val) {
    var len = bufferLength(val)
    return varint.encodingLength(len) + len
  }

  var encode = function(val, buffer, offset) {
    var oldOffset = offset
    var len = bufferLength(val)

    varint.encode(len, buffer, offset)
    offset += varint.encode.bytes

    if (Buffer.isBuffer(val)) val.copy(buffer, offset)
    else buffer.write(val, offset, len)
    offset += len

    encode.bytes = offset - oldOffset
    return buffer
  }

  var decode = function(buffer, offset) {
    var oldOffset = offset

    var len = varint.decode(buffer, offset)
    offset += varint.decode.bytes

    var val = buffer.slice(offset, offset+len)
    offset += val.length

    decode.bytes = offset - oldOffset
    return val
  }

  return encoder(2, encode, decode, encodingLength)
}()

exports.string = function() {
  var encodingLength = function(val) {
    var len = Buffer.byteLength(val)
    return varint.encodingLength(len) + len
  }

  var encode = function(val, buffer, offset) {
    var oldOffset = offset
    var len = Buffer.byteLength(val)

    varint.encode(len, buffer, offset, 'utf-8')
    offset += varint.encode.bytes

    buffer.write(val, offset, len)
    offset += len

    encode.bytes = offset - oldOffset
    return buffer
  }

  var decode = function(buffer, offset) {
    var oldOffset = offset

    var len = varint.decode(buffer, offset)
    offset += varint.decode.bytes

    var val = buffer.toString('utf-8', offset, offset+len)
    offset += len

    decode.bytes = offset - oldOffset
    return val
  }

  return encoder(2, encode, decode, encodingLength)
}()

exports.bool = function() {
  var encodingLength = function(val) {
    return 1
  }

  var encode = function(val, buffer, offset) {
    buffer[offset] = val ? 1 : 0
    encode.bytes = 1
    return buffer
  }

  var decode = function(buffer, offset) {
    var bool = buffer[offset] > 0
    decode.bytes = 1
    return bool
  }

  return encoder(0, encode, decode, encodingLength)
}()

exports.int32 = function() {
  var decode = function(buffer, offset) {
    var val = varint.decode(buffer, offset)
    decode.bytes = varint.decode.bytes
    return val > 2147483647 ? val - 4294967296 : val
  }

  var encode = function(val, buffer, offset) {
    varint.encode(val < 0 ? val + 4294967296 : val, buffer, offset)
    encode.bytes = varint.encode.bytes
    return buffer
  }

  var encodingLength = function(val) {
    return varint.encodingLength(val < 0 ? val + 4294967296 : val)
  }

  return encoder(0, varint.encode, decode, encodingLength)
}()

exports.int64 = function() {
  var decode = function(buffer, offset) {
    var val = varint.decode(buffer, offset)
    if (val >= Math.pow(2,63)) {
      var limit = 9;
      while (buffer[offset+limit-1] === 0xff) limit--
      limit = limit || 9;
      var subset = new Buffer(limit)
      buffer.copy(subset, 0, offset, offset+limit)
      subset[limit-1] = subset[limit-1] & 0x7f
      val = -1 * varint.decode(subset, 0)
      decode.bytes = 10
    } else {
      decode.bytes = varint.decode.bytes
    }
    return val
  }

  var encode = function(val, buffer, offset) {
    if (val < 0) {
      var last = offset + 9;
      varint.encode(val * -1, buffer, offset)
      offset += varint.encode.bytes - 1
      buffer[offset] = buffer[offset] | 0x80
      while (offset < last - 1) {
        offset++
        buffer[offset] = 0xff
      }
      buffer[last] = 0x01
      encode.bytes = 10
    } else {
      varint.encode(val, buffer, offset)
      encode.bytes = varint.encode.bytes
    }
    return buffer
  }

  var encodingLength = function(val) {
    return val < 0 ? 10 : varint.encodingLength(val)
  }

  return encoder(0, encode, decode, encodingLength)
}()

exports.sint32 =
exports.sint64 = function() {
  return encoder(0, svarint.encode, svarint.decode, svarint.encodingLength)
}()

exports.uint32 =
exports.uint64 =
exports.enum =
exports.varint = function() {
  return encoder(0, varint.encode, varint.decode, varint.encodingLength)
}()

// we cannot represent these in javascript so we just use buffers
exports.fixed64 =
exports.sfixed64 = function() {
  var encodingLength = function(val) {
    return 8
  }

  var encode = function(val, buffer, offset) {
    val.copy(buffer, offset)
    encode.bytes = 8
    return buffer
  }

  var decode = function(buffer, offset) {
    var val = buffer.slice(offset, offset + 8)
    decode.bytes = 8
    return val
  }

  return encoder(1, encode, decode, encodingLength)
}()

exports.double = function() {
  var encodingLength = function(val) {
    return 8
  }

  var encode = function(val, buffer, offset) {
    buffer.writeDoubleLE(val, offset)
    encode.bytes = 8
    return buffer
  }

  var decode = function(buffer, offset) {
    var val = buffer.readDoubleLE(offset)
    decode.bytes = 8
    return val
  }

  return encoder(1, encode, decode, encodingLength)
}()

exports.fixed32 = function() {
  var encodingLength = function(val) {
    return 4
  }

  var encode = function(val, buffer, offset) {
    buffer.writeUInt32LE(val, offset)
    encode.bytes = 4
    return buffer
  }

  var decode = function(buffer, offset) {
    var val = buffer.readUInt32LE(offset)
    decode.bytes = 4
    return val
  }

  return encoder(5, encode, decode, encodingLength)
}()

exports.sfixed32 = function() {
  var encodingLength = function(val) {
    return 4
  }

  var encode = function(val, buffer, offset) {
    buffer.writeInt32LE(val, offset)
    encode.bytes = 4
    return buffer
  }

  var decode = function(buffer, offset) {
    var val = buffer.readInt32LE(offset)
    decode.bytes = 4
    return val
  }

  return encoder(5, encode, decode, encodingLength)
}()

exports.float = function() {
  var encodingLength = function(val) {
    return 4
  }

  var encode = function(val, buffer, offset) {
    buffer.writeFloatLE(val, offset)
    encode.bytes = 4
    return buffer
  }

  var decode = function(buffer, offset) {
    var val = buffer.readFloatLE(offset)
    decode.bytes = 4
    return val
  }

  return encoder(5, encode, decode, encodingLength)
}()

}).call(this,require("buffer").Buffer)
},{"buffer":3,"signed-varint":276,"varint":283}],268:[function(require,module,exports){
(function (Buffer){
var schema = require('protobuf-schema')
var compile = require('./compile')


module.exports = function(proto, opts) {
  if (!opts) opts = {}
  if (!proto) throw new Error('Pass in a .proto string or a protobuf-schema parsed object')

  var sch = (typeof proto === 'object' && !Buffer.isBuffer(proto)) ? proto : schema.parse(proto)

  // to not make toString,toJSON enumarable we make a fire-and-forget prototype
  var Messages = function() {
    var self = this

    compile(sch, opts.encodings || {}).forEach(function(m) {
      self[m.name] = m.values || m
    })
  }

  Messages.prototype.toString = function() {
    return schema.stringify(sch)
  }

  Messages.prototype.toJSON = function() {
    return sch
  }

  return new Messages()
}
}).call(this,require("buffer").Buffer)
},{"./compile":266,"buffer":3,"protobuf-schema":272}],269:[function(require,module,exports){
var util = require('util')

var INDENT_START = /[\{\[]/
var INDENT_END = /[\}\]]/

module.exports = function() {
  var lines = []
  var indent = 0

  var push = function(str) {
    var spaces = ''
    while (spaces.length < indent*2) spaces += '  '
    lines.push(spaces+str)
  }

  var line = function(fmt) {
    if (!fmt) return line

    if (INDENT_END.test(fmt.trim()[0]) && INDENT_START.test(fmt[fmt.length-1])) {
      indent--
      push(util.format.apply(util, arguments))
      indent++
      return line
    }
    if (INDENT_START.test(fmt[fmt.length-1])) {
      push(util.format.apply(util, arguments))
      indent++
      return line
    }
    if (INDENT_END.test(fmt.trim()[0])) {
      indent--
      push(util.format.apply(util, arguments))
      return line
    }

    push(util.format.apply(util, arguments))
    return line
  }

  line.toString = function() {
    return lines.join('\n')
  }

  line.toFunction = function(scope) {
    var src = 'return ('+line.toString()+')'

    var keys = Object.keys(scope || {}).map(function(key) {
      return key
    })

    var vals = keys.map(function(key) {
      return scope[key]
    })

    return Function.apply(null, keys.concat(src)).apply(null, vals)
  }

  if (arguments.length) line.apply(null, arguments)

  return line
}

},{"util":32}],270:[function(require,module,exports){
var isProperty = require('is-property')

var gen = function(obj, prop) {
  return isProperty(prop) ? obj+'.'+prop : obj+'['+JSON.stringify(prop)+']'
}

gen.valid = isProperty
gen.property = function (prop) {
 return isProperty(prop) ? prop : JSON.stringify(prop)
}

module.exports = gen

},{"is-property":271}],271:[function(require,module,exports){
"use strict"
function isProperty(str) {
  return /^[$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc][$A-Z\_a-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc0-9\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19b0-\u19c0\u19c8\u19c9\u19d0-\u19d9\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1dc0-\u1de6\u1dfc-\u1dff\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8e0-\ua8f1\ua900-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f]*$/.test(str)
}
module.exports = isProperty
},{}],272:[function(require,module,exports){
var parse = require('./parse')
var stringify = require('./stringify')

module.exports = parse
module.exports.parse = parse
module.exports.stringify = stringify

},{"./parse":273,"./stringify":274}],273:[function(require,module,exports){
var tokenize = require('./tokenize')
var MAX_RANGE = 0x1FFFFFFF

var onfieldoptions = function (tokens) {
  var opts = {}

  while (tokens.length) {
    switch (tokens[0]) {
      case '[':
      case ',':
        tokens.shift()
        var name = tokens.shift()
        if (tokens[0] !== '=') throw new Error('Unexpected token in field options: ' + tokens[0])
        tokens.shift()
        if (tokens[0] === ']') throw new Error('Unexpected ] in field option')
        opts[name] = tokens.shift()
        break

      case ']':
        tokens.shift()
        return opts

      default:
        throw new Error('Unexpected token in field options: ' + tokens[0])
    }
  }

  throw new Error('No closing tag for field options')
}

var onfield = function (tokens) {
  var field = {
    name: null,
    type: null,
    tag: 0,
    required: false,
    repeated: false,
    options: {}
  }

  while (tokens.length) {
    switch (tokens[0]) {
      case '=':
        tokens.shift()
        field.tag = Number(tokens.shift())
        break

      case 'repeated':
      case 'required':
      case 'optional':
        var t = tokens.shift()
        field.required = t === 'required'
        field.repeated = t === 'repeated'
        field.type = tokens.shift()
        field.name = tokens.shift()
        break

      case '[':
        field.options = onfieldoptions(tokens)
        break

      case ';':
        tokens.shift()
        return field

      default:
        throw new Error('Unexpected token in message field: ' + tokens[0])
    }
  }

  throw new Error('No ; found for message field')
}

var onmessagebody = function (tokens) {
  var body = {
    enums: [],
    messages: [],
    fields: [],
    oneof: [],
    extensions: null
  }

  while (tokens.length) {
    switch (tokens[0]) {
      case 'repeated':
      case 'optional':
      case 'required':
        body.fields.push(onfield(tokens))
        break

      case 'enum':
        body.enums.push(onenum(tokens))
        break

      case 'message':
        body.messages.push(onmessage(tokens))
        break

      case 'extensions':
        body.extensions = onextensions(tokens)
        break

      case 'oneof':
        body.oneof.push(ononeof(tokens))
        break

      case ';':
        tokens.shift()
        break

      default:
        throw new Error('Unexpected token in message: ' + tokens[0])
    }
  }

  return body
}

var onextend = function (tokens) {
  var out = {
    name: tokens[1],
    message: onmessage(tokens)
  }
  return out
}

var onextensions = function (tokens) {
  tokens.shift()
  var from = Number(tokens.shift())
  if (isNaN(from)) throw new Error('Invalid from in extensions definition')
  if (tokens.shift() !== 'to') throw new Error("Expected keyword 'to' in extensions definition")
  var to = tokens.shift()
  if (to === 'max') to = MAX_RANGE
  to = Number(to)
  if (isNaN(to)) throw new Error('Invalid to in extensions definition')
  if (tokens.shift() !== ';') throw new Error('Missing ; in extensions definition')
  return {from: from, to: to}
}
var onmessage = function (tokens) {
  tokens.shift()

  var lvl = 1
  var body = []
  var msg = {
    name: tokens.shift(),
    enums: [],
    oneof: [],
    messages: [],
    fields: []
  }

  if (tokens[0] !== '{') throw new Error('Expected { but found ' + tokens[0])
  tokens.shift()

  while (tokens.length) {
    if (tokens[0] === '{') lvl++
    else if (tokens[0] === '}') lvl--

    if (!lvl) {
      tokens.shift()
      body = onmessagebody(body)
      msg.enums = body.enums
      msg.oneof = body.oneof
      msg.messages = body.messages
      msg.fields = body.fields
      msg.extensions = body.extensions
      return msg
    }

    body.push(tokens.shift())
  }

  if (lvl) throw new Error('No closing tag for message')
}

var onpackagename = function (tokens) {
  tokens.shift()
  var name = tokens.shift()
  if (tokens[0] !== ';') throw new Error('Expected ; but found ' + tokens[0])
  tokens.shift()
  return name
}

var onenumvalue = function (tokens) {
  if (tokens.length < 4) throw new Error('Invalid enum value: ' + tokens.slice(0, 3).join(' '))
  if (tokens[1] !== '=') throw new Error('Expected = but found ' + tokens[1])
  if (tokens[3] !== ';') throw new Error('Expected ; but found ' + tokens[1])

  var name = tokens.shift()
  tokens.shift()

  var value = Number(tokens.shift())
  tokens.shift()

  return {
    name: name,
    value: value
  }
}

var onenum = function (tokens) {
  tokens.shift()

  var e = {
    name: tokens.shift(),
    values: {}
  }

  if (tokens[0] !== '{') throw new Error('Expected { but found ' + tokens[0])
  tokens.shift()

  while (tokens.length) {
    if (tokens[0] === '}') {
      tokens.shift()
      // there goes optional semicolon after the enclosing "}"
      if (tokens[0] === ';') tokens.shift()
      return e
    }
    if (tokens[0] === 'option') {
      // just skip "option allow_alias = true;"
      while (tokens.shift() !== ';') {
        // do nothing
      }
    }
    var val = onenumvalue(tokens)
    e.values[val.name] = val.value
  }

  throw new Error('No closing tag for enum')
}

var ononeof = function (tokens) {
  tokens.shift()

  var oneof = {
    name: tokens.shift(),
    fields: []
  }

  if (tokens[0] !== '{') throw new Error('Expected { but found ' + tokens[0])
  tokens.shift()

  while (tokens.length) {
    if (tokens[0] === '}') {
      tokens.shift()
      return oneof
    }

    var field = {}

    field.type = tokens.shift()
    field.name = tokens.shift()
    if (tokens[0] !== '=') throw new Error('Expected = but found ' + tokens[0])
    tokens.shift()
    field.tag = Number(tokens.shift())

    oneof.fields.push(field)
    if (tokens[0] !== ';') throw new Error('Expected ; but found ' + tokens[0])
    tokens.shift()
  }

  throw new Error('No closing tag for oneof')
}

var onoption = function (tokens) {
  var name = null
  var value = null

  var parse = function (value) {
    if (value === 'true') return true
    if (value === 'false') return false
    return value.replace(/^"+|"+$/gm, '')
  }

  while (tokens.length) {
    if (tokens[0] === ';') {
      tokens.shift()
      return {name: name, value: value}
    }
    switch (tokens[0]) {
      case 'option':
        tokens.shift()
        name = tokens.shift()
        break

      case '=':
        tokens.shift()
        if (name === null) throw new Error('Expected key for option with value: ' + tokens[0])
        value = parse(tokens.shift())
        if (name === 'optimize_for' && !/^(SPEED|CODE_SIZE|LITE_RUNTIME)$/.test(value)) {
          throw new Error('Unexpected value for option optimize_for: ' + value)
        }
        break

      default:
        throw new Error('Unexpected token in option: ' + tokens[0])
    }
  }
}

var onimport = function (tokens) {
  tokens.shift()
  var file = tokens.shift().replace(/^"+|"+$/gm, '')

  if (tokens[0] !== ';') throw new Error('Unexpected token: ' + tokens[0] + '. Expected ";"')

  tokens.shift()
  return file
}

var parse = function (buf) {
  var tokens = tokenize(buf.toString())
  var schema = {
    package: null,
    imports: [],
    enums: [],
    messages: [],
    options: {},
    extends: []
  }

  while (tokens.length) {
    switch (tokens[0]) {
      case 'package':
        schema.package = onpackagename(tokens)
        break

      case 'message':
        schema.messages.push(onmessage(tokens))
        break

      case 'enum':
        schema.enums.push(onenum(tokens))
        break

      case 'option':
        var opt = onoption(tokens)
        if (schema.options[opt.name]) throw new Error('Duplicate option ' + opt.name)
        schema.options[opt.name] = opt.value
        break

      case 'import':
        schema.imports.push(onimport(tokens))
        break

      case 'extend':
        schema.extends.push(onextend(tokens))
        break

      default:
        throw new Error('Unexpected token: ' + tokens[0])
    }
  }

  // now iterate over messages and propagate extends
  schema.extends.forEach(function (ext) {
    schema.messages.forEach(function (msg) {
      if (msg.name === ext.name) {
        ext.message.fields.forEach(function (field) {
          if (!msg.extensions || field.tag < msg.extensions.from || field.tag > msg.extensions.to) {
            throw new Error(msg.name + ' does not declare ' + field.tag + ' as an extension number')
          }
          msg.fields.push(field)
        })
      }
    })
  })

  return schema
}

module.exports = parse

},{"./tokenize":275}],274:[function(require,module,exports){
var onfield = function (f, result) {
  var prefix = f.repeated ? 'repeated' : f.required ? 'required' : 'optional'

  var opts = Object.keys(f.options || {}).map(function (key) {
    return key + ' = ' + f.options[key]
  }).join(',')

  if (opts) opts = ' [' + opts + ']'

  result.push(prefix + ' ' + f.type + ' ' + f.name + ' = ' + f.tag + opts + ';')
  return result
}

var onmessage = function (m, result) {
  result.push('message ' + m.name + ' {')

  if (!m.enums) m.enums = []
  m.enums.forEach(function (e) {
    result.push(onenum(e, []))
  })

  if (!m.messages) m.messages = []
  m.messages.forEach(function (m) {
    result.push(onmessage(m, []))
  })

  if (!m.fields) m.fields = []
  m.fields.forEach(function (f) {
    result.push(onfield(f, []))
  })

  result.push('}', '')
  return result
}

var onenum = function (e, result) {
  result.push('enum ' + e.name + ' {')

  var vals = Object.keys(e.values).map(function (key) {
    return key + ' = ' + e.values[key] + ';'
  })

  result.push(vals)
  result.push('}', '')
  return result
}

var onoption = function (o, result) {
  var keys = Object.keys(o)
  keys.forEach(function (option) {
    var v = o[option]
    if (typeof v === 'string' && option !== 'optimize_for') v = '"' + v + '"'
    result.push('option ' + option + ' = ' + v + ';')
  })
  if (keys.length > 0) {
    result.push('')
  }
}

var indent = function (lvl) {
  return function (line) {
    if (Array.isArray(line)) return line.map(indent(lvl + '  ')).join('\n')
    return lvl + line
  }
}

module.exports = function (schema) {
  var result = []
  if (schema.package) result.push('package ' + schema.package + ';', '')

  if (!schema.options) schema.options = {}

  onoption(schema.options, result)

  if (!schema.enums) schema.enums = []
  schema.enums.forEach(function (e) {
    onenum(e, result)
  })

  if (!schema.messages) schema.messages = []
  schema.messages.forEach(function (m) {
    onmessage(m, result)
  })

  return result.map(indent('')).join('\n')
}

},{}],275:[function(require,module,exports){
module.exports = function (sch) {
  var noComments = function (line) {
    var i = line.indexOf('//')
    return i > -1 ? line.slice(0, i) : line
  }

  var noMultilineComments = function () {
    var inside = false
    return function (token) {
      if (token === '/*') {
        inside = true
        return false
      }
      if (token === '*/') {
        inside = false
        return false
      }
      return !inside
    }
  }

  var trim = function (line) {
    return line.trim()
  }

  return sch
    .replace(/([;,{}=\[\]]|\/\*|\*\/)/g, ' $1 ')
    .split(/\n/)
    .map(trim)
    .filter(Boolean)
    .map(noComments)
    .filter(Boolean)
    .join('\n')
    .split(/\s+|\n+/gm)
    .filter(noMultilineComments())
}

},{}],276:[function(require,module,exports){
var varint = require('varint')
exports.encode = function encode (v, b, o) {
  v = v >= 0 ? v*2 : v*-2 - 1
  var r = varint.encode(v, b, o)
  encode.bytes = varint.encode.bytes
  return r
}
exports.decode = function decode (b, o) {
  var v = varint.decode(b, o)
  decode.bytes = varint.decode.bytes
  return v & 1 ? (v+1) / -2 : v / 2
}

exports.encodingLength = function (v) {
  return varint.encodingLength(v >= 0 ? v*2 : v*-2 - 1)
}

},{"varint":279}],277:[function(require,module,exports){
arguments[4][253][0].apply(exports,arguments)
},{"dup":253}],278:[function(require,module,exports){
arguments[4][254][0].apply(exports,arguments)
},{"dup":254}],279:[function(require,module,exports){
arguments[4][255][0].apply(exports,arguments)
},{"./decode.js":277,"./encode.js":278,"./length.js":280,"dup":255}],280:[function(require,module,exports){

var N1 = Math.pow(2,  7)
var N2 = Math.pow(2, 14)
var N3 = Math.pow(2, 21)
var N4 = Math.pow(2, 28)
var N5 = Math.pow(2, 35)
var N6 = Math.pow(2, 42)
var N7 = Math.pow(2, 49)

module.exports = function (value) {
  return (
    value < N1 ? 1
  : value < N2 ? 2
  : value < N3 ? 3
  : value < N4 ? 4
  : value < N5 ? 5
  : value < N6 ? 6
  : value < N7 ? 7
  :              8
  )
}

},{}],281:[function(require,module,exports){
arguments[4][253][0].apply(exports,arguments)
},{"dup":253}],282:[function(require,module,exports){
arguments[4][254][0].apply(exports,arguments)
},{"dup":254}],283:[function(require,module,exports){
arguments[4][255][0].apply(exports,arguments)
},{"./decode.js":281,"./encode.js":282,"./length.js":284,"dup":255}],284:[function(require,module,exports){
arguments[4][256][0].apply(exports,arguments)
},{"dup":256}],285:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],286:[function(require,module,exports){
var json = typeof JSON !== 'undefined' ? JSON : require('jsonify');

module.exports = function (obj, opts) {
    if (!opts) opts = {};
    if (typeof opts === 'function') opts = { cmp: opts };
    var space = opts.space || '';
    if (typeof space === 'number') space = Array(space+1).join(' ');
    var cycles = (typeof opts.cycles === 'boolean') ? opts.cycles : false;
    var replacer = opts.replacer || function(key, value) { return value; };

    var cmp = opts.cmp && (function (f) {
        return function (node) {
            return function (a, b) {
                var aobj = { key: a, value: node[a] };
                var bobj = { key: b, value: node[b] };
                return f(aobj, bobj);
            };
        };
    })(opts.cmp);

    var seen = [];
    return (function stringify (parent, key, node, level) {
        var indent = space ? ('\n' + new Array(level + 1).join(space)) : '';
        var colonSeparator = space ? ': ' : ':';

        if (node && node.toJSON && typeof node.toJSON === 'function') {
            node = node.toJSON();
        }

        node = replacer.call(parent, key, node);

        if (node === undefined) {
            return;
        }
        if (typeof node !== 'object' || node === null) {
            return json.stringify(node);
        }
        if (isArray(node)) {
            var out = [];
            for (var i = 0; i < node.length; i++) {
                var item = stringify(node, i, node[i], level+1) || json.stringify(null);
                out.push(indent + space + item);
            }
            return '[' + out.join(',') + indent + ']';
        }
        else {
            if (seen.indexOf(node) !== -1) {
                if (cycles) return json.stringify('__cycle__');
                throw new TypeError('Converting circular structure to JSON');
            }
            else seen.push(node);

            var keys = objectKeys(node).sort(cmp && cmp(node));
            var out = [];
            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var value = stringify(node, key, node[key], level+1);

                if(!value) continue;

                var keyValue = json.stringify(key)
                    + colonSeparator
                    + value;
                ;
                out.push(indent + space + keyValue);
            }
            return '{' + out.join(',') + indent + '}';
        }
    })({ '': obj }, '', obj, 0);
};

var isArray = Array.isArray || function (x) {
    return {}.toString.call(x) === '[object Array]';
};

var objectKeys = Object.keys || function (obj) {
    var has = Object.prototype.hasOwnProperty || function () { return true };
    var keys = [];
    for (var key in obj) {
        if (has.call(obj, key)) keys.push(key);
    }
    return keys;
};

},{"jsonify":287}],287:[function(require,module,exports){
exports.parse = require('./lib/parse');
exports.stringify = require('./lib/stringify');

},{"./lib/parse":288,"./lib/stringify":289}],288:[function(require,module,exports){
var at, // The index of the current character
    ch, // The current character
    escapee = {
        '"':  '"',
        '\\': '\\',
        '/':  '/',
        b:    '\b',
        f:    '\f',
        n:    '\n',
        r:    '\r',
        t:    '\t'
    },
    text,

    error = function (m) {
        // Call error when something is wrong.
        throw {
            name:    'SyntaxError',
            message: m,
            at:      at,
            text:    text
        };
    },
    
    next = function (c) {
        // If a c parameter is provided, verify that it matches the current character.
        if (c && c !== ch) {
            error("Expected '" + c + "' instead of '" + ch + "'");
        }
        
        // Get the next character. When there are no more characters,
        // return the empty string.
        
        ch = text.charAt(at);
        at += 1;
        return ch;
    },
    
    number = function () {
        // Parse a number value.
        var number,
            string = '';
        
        if (ch === '-') {
            string = '-';
            next('-');
        }
        while (ch >= '0' && ch <= '9') {
            string += ch;
            next();
        }
        if (ch === '.') {
            string += '.';
            while (next() && ch >= '0' && ch <= '9') {
                string += ch;
            }
        }
        if (ch === 'e' || ch === 'E') {
            string += ch;
            next();
            if (ch === '-' || ch === '+') {
                string += ch;
                next();
            }
            while (ch >= '0' && ch <= '9') {
                string += ch;
                next();
            }
        }
        number = +string;
        if (!isFinite(number)) {
            error("Bad number");
        } else {
            return number;
        }
    },
    
    string = function () {
        // Parse a string value.
        var hex,
            i,
            string = '',
            uffff;
        
        // When parsing for string values, we must look for " and \ characters.
        if (ch === '"') {
            while (next()) {
                if (ch === '"') {
                    next();
                    return string;
                } else if (ch === '\\') {
                    next();
                    if (ch === 'u') {
                        uffff = 0;
                        for (i = 0; i < 4; i += 1) {
                            hex = parseInt(next(), 16);
                            if (!isFinite(hex)) {
                                break;
                            }
                            uffff = uffff * 16 + hex;
                        }
                        string += String.fromCharCode(uffff);
                    } else if (typeof escapee[ch] === 'string') {
                        string += escapee[ch];
                    } else {
                        break;
                    }
                } else {
                    string += ch;
                }
            }
        }
        error("Bad string");
    },

    white = function () {

// Skip whitespace.

        while (ch && ch <= ' ') {
            next();
        }
    },

    word = function () {

// true, false, or null.

        switch (ch) {
        case 't':
            next('t');
            next('r');
            next('u');
            next('e');
            return true;
        case 'f':
            next('f');
            next('a');
            next('l');
            next('s');
            next('e');
            return false;
        case 'n':
            next('n');
            next('u');
            next('l');
            next('l');
            return null;
        }
        error("Unexpected '" + ch + "'");
    },

    value,  // Place holder for the value function.

    array = function () {

// Parse an array value.

        var array = [];

        if (ch === '[') {
            next('[');
            white();
            if (ch === ']') {
                next(']');
                return array;   // empty array
            }
            while (ch) {
                array.push(value());
                white();
                if (ch === ']') {
                    next(']');
                    return array;
                }
                next(',');
                white();
            }
        }
        error("Bad array");
    },

    object = function () {

// Parse an object value.

        var key,
            object = {};

        if (ch === '{') {
            next('{');
            white();
            if (ch === '}') {
                next('}');
                return object;   // empty object
            }
            while (ch) {
                key = string();
                white();
                next(':');
                if (Object.hasOwnProperty.call(object, key)) {
                    error('Duplicate key "' + key + '"');
                }
                object[key] = value();
                white();
                if (ch === '}') {
                    next('}');
                    return object;
                }
                next(',');
                white();
            }
        }
        error("Bad object");
    };

value = function () {

// Parse a JSON value. It could be an object, an array, a string, a number,
// or a word.

    white();
    switch (ch) {
    case '{':
        return object();
    case '[':
        return array();
    case '"':
        return string();
    case '-':
        return number();
    default:
        return ch >= '0' && ch <= '9' ? number() : word();
    }
};

// Return the json_parse function. It will have access to all of the above
// functions and variables.

module.exports = function (source, reviver) {
    var result;
    
    text = source;
    at = 0;
    ch = ' ';
    result = value();
    white();
    if (ch) {
        error("Syntax error");
    }

    // If there is a reviver function, we recursively walk the new structure,
    // passing each name/value pair to the reviver function for possible
    // transformation, starting with a temporary root object that holds the result
    // in an empty key. If there is not a reviver function, we simply return the
    // result.

    return typeof reviver === 'function' ? (function walk(holder, key) {
        var k, v, value = holder[key];
        if (value && typeof value === 'object') {
            for (k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    v = walk(value, k);
                    if (v !== undefined) {
                        value[k] = v;
                    } else {
                        delete value[k];
                    }
                }
            }
        }
        return reviver.call(holder, key, value);
    }({'': result}, '')) : result;
};

},{}],289:[function(require,module,exports){
var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
    gap,
    indent,
    meta = {    // table of character substitutions
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"' : '\\"',
        '\\': '\\\\'
    },
    rep;

function quote(string) {
    // If the string contains no control characters, no quote characters, and no
    // backslash characters, then we can safely slap some quotes around it.
    // Otherwise we must also replace the offending characters with safe escape
    // sequences.
    
    escapable.lastIndex = 0;
    return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
            '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"' : '"' + string + '"';
}

function str(key, holder) {
    // Produce a string from holder[key].
    var i,          // The loop counter.
        k,          // The member key.
        v,          // The member value.
        length,
        mind = gap,
        partial,
        value = holder[key];
    
    // If the value has a toJSON method, call it to obtain a replacement value.
    if (value && typeof value === 'object' &&
            typeof value.toJSON === 'function') {
        value = value.toJSON(key);
    }
    
    // If we were called with a replacer function, then call the replacer to
    // obtain a replacement value.
    if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
    }
    
    // What happens next depends on the value's type.
    switch (typeof value) {
        case 'string':
            return quote(value);
        
        case 'number':
            // JSON numbers must be finite. Encode non-finite numbers as null.
            return isFinite(value) ? String(value) : 'null';
        
        case 'boolean':
        case 'null':
            // If the value is a boolean or null, convert it to a string. Note:
            // typeof null does not produce 'null'. The case is included here in
            // the remote chance that this gets fixed someday.
            return String(value);
            
        case 'object':
            if (!value) return 'null';
            gap += indent;
            partial = [];
            
            // Array.isArray
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                
                // Join all of the elements together, separated with commas, and
                // wrap them in brackets.
                v = partial.length === 0 ? '[]' : gap ?
                    '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                    '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            
            // If the replacer is an array, use it to select the members to be
            // stringified.
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    k = rep[i];
                    if (typeof k === 'string') {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else {
                // Otherwise, iterate through all of the keys in the object.
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            
        // Join all of the member texts together, separated with commas,
        // and wrap them in braces.

        v = partial.length === 0 ? '{}' : gap ?
            '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
            '{' + partial.join(',') + '}';
        gap = mind;
        return v;
    }
}

module.exports = function (value, replacer, space) {
    var i;
    gap = '';
    indent = '';
    
    // If the space parameter is a number, make an indent string containing that
    // many spaces.
    if (typeof space === 'number') {
        for (i = 0; i < space; i += 1) {
            indent += ' ';
        }
    }
    // If the space parameter is a string, it will be used as the indent string.
    else if (typeof space === 'string') {
        indent = space;
    }

    // If there is a replacer, it must be a function or an array.
    // Otherwise, throw an error.
    rep = replacer;
    if (replacer && typeof replacer !== 'function'
    && (typeof replacer !== 'object' || typeof replacer.length !== 'number')) {
        throw new Error('JSON.stringify');
    }
    
    // Make a fake root object containing our value under the key of ''.
    // Return the result of stringifying the value.
    return str('', {'': value});
};

},{}],290:[function(require,module,exports){
var defined = require('defined');

module.exports = function (opts, prefix) {
    if (!opts) opts = {};
    if (!prefix) prefix = {};
    var xopts = {};
    var gte = defined(prefix.gte, prefix.ge, prefix.start);
    var lte = defined(prefix.lte, prefix.le, prefix.end);
    var ogte = defined(opts.gte, opts.ge, opts.start);
    var olte = defined(opts.lte, opts.le, opts.end);
    
    if (prefix.gt) {
        if (ogte !== undefined) {
            xopts.gte = prefix.gt(ogte);
        }
        else xopts.gt = prefix.gt(opts.gt);
    }
    else if (gte) {
        if (ogte !== undefined) {
            xopts.gte = gte(ogte);
        }
        else xopts.gt = gte(opts.gt);
    }
    
    if (prefix.lt) {
        if (olte !== undefined) {
            xopts.lte = prefix.lt(olte);
        }
        else xopts.lt = prefix.lt(opts.lt);
    }
    else if (lte) {
        if (olte !== undefined) {
            xopts.lte = lte(olte);
        }
        else xopts.lt = lte(opts.lt);
    }
    
    if (prefix.limit !== undefined) {
        xopts.limit = prefix.limit(opts.limit);
    }
    else if (opts.limit !== undefined) {
        xopts.limit = opts.limit;
    }
    return xopts;
};

},{"defined":175}],291:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":293,"./_stream_writable":295,"_process":11,"core-util-is":296,"dup":17,"inherits":302}],292:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./_stream_transform":294,"core-util-is":296,"dup":18,"inherits":302}],293:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./_stream_duplex":291,"_process":11,"buffer":3,"core-util-is":296,"dup":19,"events":8,"inherits":302,"isarray":285,"stream":27,"string_decoder/":297,"util":2}],294:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./_stream_duplex":291,"core-util-is":296,"dup":20,"inherits":302}],295:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./_stream_duplex":291,"_process":11,"buffer":3,"core-util-is":296,"dup":21,"inherits":302,"stream":27}],296:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],297:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],298:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"./lib/_stream_duplex.js":291,"./lib/_stream_passthrough.js":292,"./lib/_stream_readable.js":293,"./lib/_stream_transform.js":294,"./lib/_stream_writable.js":295,"dup":24,"stream":27}],299:[function(require,module,exports){
arguments[4][26][0].apply(exports,arguments)
},{"./lib/_stream_writable.js":295,"dup":26}],300:[function(require,module,exports){
"use strict"

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0]
  for(var i=1; i<len; ++i) {
    b = a
    a = list[i]
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0]
  for(var i=1; i<len; ++i, b=a) {
    b = a
    a = list[i]
    if(a !== b) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare)
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort()
  }
  return unique_eq(list)
}

module.exports = unique

},{}],301:[function(require,module,exports){
arguments[4][108][0].apply(exports,arguments)
},{"dup":108,"readable-stream/writable":299}],302:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],303:[function(require,module,exports){
arguments[4][82][0].apply(exports,arguments)
},{"dup":82,"readable-stream/readable":312,"readable-wrap":313}],304:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":306,"./_stream_writable":308,"_process":11,"core-util-is":309,"dup":17,"inherits":302}],305:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"./_stream_transform":307,"core-util-is":309,"dup":18,"inherits":302}],306:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./_stream_duplex":304,"_process":11,"buffer":3,"core-util-is":309,"dup":19,"events":8,"inherits":302,"isarray":310,"stream":27,"string_decoder/":311,"util":2}],307:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./_stream_duplex":304,"core-util-is":309,"dup":20,"inherits":302}],308:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./_stream_duplex":304,"_process":11,"buffer":3,"core-util-is":309,"dup":21,"inherits":302,"stream":27}],309:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],310:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],311:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],312:[function(require,module,exports){
arguments[4][24][0].apply(exports,arguments)
},{"./lib/_stream_duplex.js":304,"./lib/_stream_passthrough.js":305,"./lib/_stream_readable.js":306,"./lib/_stream_transform.js":307,"./lib/_stream_writable.js":308,"dup":24,"stream":27}],313:[function(require,module,exports){
arguments[4][93][0].apply(exports,arguments)
},{"dup":93,"readable-stream":312}],314:[function(require,module,exports){
//filter will reemit the data if cb(err,pass) pass is truthy

// reduce is more tricky
// maybe we want to group the reductions or emit progress updates occasionally
// the most basic reduce just emits one 'data' event after it has recieved 'end'


var through = require('through')
var Decoder = require('string_decoder').StringDecoder

module.exports = split

//TODO pass in a function to map across the lines.

function split (matcher, mapper, options) {
  var decoder = new Decoder()
  var soFar = ''
  var maxLength = options && options.maxLength;
  if('function' === typeof matcher)
    mapper = matcher, matcher = null
  if (!matcher)
    matcher = /\r?\n/

  function emit(stream, piece) {
    if(mapper) {
      try {
        piece = mapper(piece)
      }
      catch (err) {
        return stream.emit('error', err)
      }
      if('undefined' !== typeof piece)
        stream.queue(piece)
    }
    else
      stream.queue(piece)
  }

  function next (stream, buffer) {
    var pieces = ((soFar != null ? soFar : '') + buffer).split(matcher)
    soFar = pieces.pop()

    if (maxLength && soFar.length > maxLength)
      stream.emit('error', new Error('maximum buffer reached'))

    for (var i = 0; i < pieces.length; i++) {
      var piece = pieces[i]
      emit(stream, piece)
    }
  }

  return through(function (b) {
    next(this, decoder.write(b))
  },
  function () {
    if(decoder.end)
      next(this, decoder.end())
    if(soFar != null)
      emit(this, soFar)
    this.queue(null)
  })
}


},{"string_decoder":28,"through":315}],315:[function(require,module,exports){
(function (process){
var Stream = require('stream')

// through
//
// a stream that does nothing but re-emit the input.
// useful for aggregating a series of changing but not ending streams into one stream)

exports = module.exports = through
through.through = through

//create a readable writable stream.

function through (write, end, opts) {
  write = write || function (data) { this.queue(data) }
  end = end || function () { this.queue(null) }

  var ended = false, destroyed = false, buffer = [], _ended = false
  var stream = new Stream()
  stream.readable = stream.writable = true
  stream.paused = false

//  stream.autoPause   = !(opts && opts.autoPause   === false)
  stream.autoDestroy = !(opts && opts.autoDestroy === false)

  stream.write = function (data) {
    write.call(this, data)
    return !stream.paused
  }

  function drain() {
    while(buffer.length && !stream.paused) {
      var data = buffer.shift()
      if(null === data)
        return stream.emit('end')
      else
        stream.emit('data', data)
    }
  }

  stream.queue = stream.push = function (data) {
//    console.error(ended)
    if(_ended) return stream
    if(data === null) _ended = true
    buffer.push(data)
    drain()
    return stream
  }

  //this will be registered as the first 'end' listener
  //must call destroy next tick, to make sure we're after any
  //stream piped from here.
  //this is only a problem if end is not emitted synchronously.
  //a nicer way to do this is to make sure this is the last listener for 'end'

  stream.on('end', function () {
    stream.readable = false
    if(!stream.writable && stream.autoDestroy)
      process.nextTick(function () {
        stream.destroy()
      })
  })

  function _end () {
    stream.writable = false
    end.call(stream)
    if(!stream.readable && stream.autoDestroy)
      stream.destroy()
  }

  stream.end = function (data) {
    if(ended) return
    ended = true
    if(arguments.length) stream.write(data)
    _end() // will emit or queue
    return stream
  }

  stream.destroy = function () {
    if(destroyed) return
    destroyed = true
    ended = true
    buffer.length = 0
    stream.writable = stream.readable = false
    stream.emit('close')
    return stream
  }

  stream.pause = function () {
    if(stream.paused) return
    stream.paused = true
    return stream
  }

  stream.resume = function () {
    if(stream.paused) {
      stream.paused = false
      stream.emit('resume')
    }
    drain()
    //may have become paused again,
    //as drain emits 'data'.
    if(!stream.paused)
      stream.emit('drain')
    return stream
  }
  return stream
}


}).call(this,require('_process'))
},{"_process":11,"stream":27}],316:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"./_stream_readable":317,"./_stream_writable":319,"_process":11,"core-util-is":320,"dup":17,"inherits":302}],317:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"./_stream_duplex":316,"_process":11,"buffer":3,"core-util-is":320,"dup":19,"events":8,"inherits":302,"isarray":321,"stream":27,"string_decoder/":322,"util":2}],318:[function(require,module,exports){
arguments[4][20][0].apply(exports,arguments)
},{"./_stream_duplex":316,"core-util-is":320,"dup":20,"inherits":302}],319:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./_stream_duplex":316,"_process":11,"buffer":3,"core-util-is":320,"dup":21,"inherits":302,"stream":27}],320:[function(require,module,exports){
arguments[4][22][0].apply(exports,arguments)
},{"buffer":3,"dup":22}],321:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"dup":10}],322:[function(require,module,exports){
arguments[4][28][0].apply(exports,arguments)
},{"buffer":3,"dup":28}],323:[function(require,module,exports){
arguments[4][25][0].apply(exports,arguments)
},{"./lib/_stream_transform.js":318,"dup":25}],324:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56}],325:[function(require,module,exports){
arguments[4][107][0].apply(exports,arguments)
},{"_process":11,"dup":107,"readable-stream/transform":323,"util":32,"xtend":324}],326:[function(require,module,exports){
function AppEvents () {
}

AppEvents.ERROR = 'APPERROR'

module.exports = AppEvents
},{}],327:[function(require,module,exports){
var level = require('level-browserify')
var wikidb = require('wikidb')
var wikidbevents = require('./wikidbevents')
var appevents = require('./appevents')
var db = level('pages')
var through = require('through2')
var wdb = wikidb(db, { dir: '/wiki.blob' })
var createBus = require('chrome-bus')
var bus = createBus()
 
bus.on(wikidbevents.WRITE, function (msg) {
  var w = wdb.createWriteStream(msg.opts, function (err, key) {
	if (err) {
	  console.error(err)
	  bus.emit(appevents.ERROR, err)
	}
	msg.opts.key = key
	bus.emit(wikidbevents.WRITERESPONSE, msg.opts)
  })
  w.write(msg.page)
  w.end()
})

bus.on(wikidbevents.RECENT, function (msg) {
  var recentlist = [];
  console.log('WIKI DB RECENT REQUEST')
  var rs = wdb.recent().pipe(through.obj(function (row, enc, next) {
	console.log('key:  ' + row.meta.key)
	console.log('hash: ' + row.hash)
	console.log('date: ' + new Date(row.meta.time))
	console.log('-----------------------------')
	var r = wdb.createReadStream(row.hash)
	r.pipe(through.obj(function(row, enc, next) {
		recentlist.push(row)
	}))
	r.on('end', function () { console.log(); next() })
  }))
  rs.on('end', function () {
	  bus.emit(wikidbevents.RECENTREPONSE, recentlist)
  })
})

},{"./appevents":326,"./wikidbevents":328,"chrome-bus":33,"level-browserify":117,"through2":173,"wikidb":174}],328:[function(require,module,exports){
function WikiEvents () {
}

WikiEvents.WRITE = 'wikiwrite'
WikiEvents.WRITERESPONSE = 'wikiwriteresp'
WikiEvents.RECENT = 'wikirecent'
WikiEvents.RECENTRESPONSE = 'wikirecentresp'
module.exports = WikiEvents

},{}],"debug":[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

var localmem = require('localstorage-memory');
exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return localmem()
  } catch (e) {}
}

},{"./debug":34,"localstorage-memory":35}],"depd":[function(require,module,exports){
(function (process){
/*!
 * depd
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var callSiteToString = require('./lib/compat').callSiteToString
var EventEmitter = require('events').EventEmitter
var relative = require('path').relative

/**
 * Module exports.
 */

module.exports = depd

/**
 * Get the path to base files on.
 */

var basePath = process.cwd()

/**
 * Get listener count on event emitter.
 */

/*istanbul ignore next*/
var eventListenerCount = EventEmitter.listenerCount
  || function (emitter, type) { return emitter.listeners(type).length }

/**
 * Determine if namespace is contained in the string.
 */

function containsNamespace(str, namespace) {
  var val = str.split(/[ ,]+/)

  namespace = String(namespace).toLowerCase()

  for (var i = 0 ; i < val.length; i++) {
    if (!(str = val[i])) continue;

    // namespace contained
    if (str === '*' || str.toLowerCase() === namespace) {
      return true
    }
  }

  return false
}

/**
 * Convert a data descriptor to accessor descriptor.
 */

function convertDataDescriptorToAccessor(obj, prop, message) {
  var descriptor = Object.getOwnPropertyDescriptor(obj, prop)
  var value = descriptor.value

  descriptor.get = function getter() { return value }

  if (descriptor.writable) {
    descriptor.set = function setter(val) { return value = val }
  }

  delete descriptor.value
  delete descriptor.writable

  Object.defineProperty(obj, prop, descriptor)

  return descriptor
}

/**
 * Create arguments string to keep arity.
 */

function createArgumentsString(arity) {
  var str = ''

  for (var i = 0; i < arity; i++) {
    str += ', arg' + i
  }

  return str.substr(2)
}

/**
 * Create stack string from stack.
 */

function createStackString(stack) {
  var str = this.name + ': ' + this.namespace

  if (this.message) {
    str += ' deprecated ' + this.message
  }

  for (var i = 0; i < stack.length; i++) {
    str += '\n    at ' + callSiteToString(stack[i])
  }

  return str
}

/**
 * Create deprecate for namespace in caller.
 */

function depd(namespace) {
  if (!namespace) {
    throw new TypeError('argument namespace is required')
  }

  var stack = getStack()
  var site = callSiteLocation(stack[1])
  var file = site[0]

  function deprecate(message) {
    // call to self as log
    log.call(deprecate, message)
  }

  deprecate._file = file
  deprecate._ignored = isignored(namespace)
  deprecate._namespace = namespace
  deprecate._traced = istraced(namespace)
  deprecate._warned = Object.create(null)

  deprecate.function = wrapfunction
  deprecate.property = wrapproperty

  return deprecate
}

/**
 * Determine if namespace is ignored.
 */

function isignored(namespace) {
  /* istanbul ignore next: tested in a child processs */
  if (process.noDeprecation) {
    // --no-deprecation support
    return true
  }

  var str = process.env.NO_DEPRECATION || ''

  // namespace ignored
  return containsNamespace(str, namespace)
}

/**
 * Determine if namespace is traced.
 */

function istraced(namespace) {
  /* istanbul ignore next: tested in a child processs */
  if (process.traceDeprecation) {
    // --trace-deprecation support
    return true
  }

  var str = process.env.TRACE_DEPRECATION || ''

  // namespace traced
  return containsNamespace(str, namespace)
}

/**
 * Display deprecation message.
 */

function log(message, site) {
  var haslisteners = eventListenerCount(process, 'deprecation') !== 0

  // abort early if no destination
  if (!haslisteners && this._ignored) {
    return
  }

  var caller
  var callFile
  var callSite
  var i = 0
  var seen = false
  var stack = getStack()
  var file = this._file

  if (site) {
    // provided site
    callSite = callSiteLocation(stack[1])
    callSite.name = site.name
    file = callSite[0]
  } else {
    // get call site
    i = 2
    site = callSiteLocation(stack[i])
    callSite = site
  }

  // get caller of deprecated thing in relation to file
  for (; i < stack.length; i++) {
    caller = callSiteLocation(stack[i])
    callFile = caller[0]

    if (callFile === file) {
      seen = true
    } else if (callFile === this._file) {
      file = this._file
    } else if (seen) {
      break
    }
  }

  var key = caller
    ? site.join(':') + '__' + caller.join(':')
    : undefined

  if (key !== undefined && key in this._warned) {
    // already warned
    return
  }

  this._warned[key] = true

  // generate automatic message from call site
  if (!message) {
    message = callSite === site || !callSite.name
      ? defaultMessage(site)
      : defaultMessage(callSite)
  }

  // emit deprecation if listeners exist
  if (haslisteners) {
    var err = DeprecationError(this._namespace, message, stack.slice(i))
    process.emit('deprecation', err)
    return
  }

  // format and write message
  var format = process.stderr.isTTY
    ? formatColor
    : formatPlain
  var msg = format.call(this, message, caller, stack.slice(i))
  process.stderr.write(msg + '\n', 'utf8')

  return
}

/**
 * Get call site location as array.
 */

function callSiteLocation(callSite) {
  var file = callSite.getFileName() || '<anonymous>'
  var line = callSite.getLineNumber()
  var colm = callSite.getColumnNumber()

  if (callSite.isEval()) {
    file = callSite.getEvalOrigin() + ', ' + file
  }

  var site = [file, line, colm]

  site.callSite = callSite
  site.name = callSite.getFunctionName()

  return site
}

/**
 * Generate a default message from the site.
 */

function defaultMessage(site) {
  var callSite = site.callSite
  var funcName = site.name

  // make useful anonymous name
  if (!funcName) {
    funcName = '<anonymous@' + formatLocation(site) + '>'
  }

  var context = callSite.getThis()
  var typeName = context && callSite.getTypeName()

  // ignore useless type name
  if (typeName === 'Object') {
    typeName = undefined
  }

  // make useful type name
  if (typeName === 'Function') {
    typeName = context.name || typeName
  }

  return typeName && callSite.getMethodName()
    ? typeName + '.' + funcName
    : funcName
}

/**
 * Format deprecation message without color.
 */

function formatPlain(msg, caller, stack) {
  var timestamp = new Date().toUTCString()

  var formatted = timestamp
    + ' ' + this._namespace
    + ' deprecated ' + msg

  // add stack trace
  if (this._traced) {
    for (var i = 0; i < stack.length; i++) {
      formatted += '\n    at ' + callSiteToString(stack[i])
    }

    return formatted
  }

  if (caller) {
    formatted += ' at ' + formatLocation(caller)
  }

  return formatted
}

/**
 * Format deprecation message with color.
 */

function formatColor(msg, caller, stack) {
  var formatted = '\x1b[36;1m' + this._namespace + '\x1b[22;39m' // bold cyan
    + ' \x1b[33;1mdeprecated\x1b[22;39m' // bold yellow
    + ' \x1b[0m' + msg + '\x1b[39m' // reset

  // add stack trace
  if (this._traced) {
    for (var i = 0; i < stack.length; i++) {
      formatted += '\n    \x1b[36mat ' + callSiteToString(stack[i]) + '\x1b[39m' // cyan
    }

    return formatted
  }

  if (caller) {
    formatted += ' \x1b[36m' + formatLocation(caller) + '\x1b[39m' // cyan
  }

  return formatted
}

/**
 * Format call site location.
 */

function formatLocation(callSite) {
  return relative(basePath, callSite[0])
    + ':' + callSite[1]
    + ':' + callSite[2]
}

/**
 * Get the stack as array of call sites.
 */

function getStack() {
  var limit = Error.stackTraceLimit
  var obj = {}
  var prep = Error.prepareStackTrace

  Error.prepareStackTrace = prepareObjectStackTrace
  Error.stackTraceLimit = Math.max(10, limit)

  // capture the stack
  Error.captureStackTrace(obj)

  // slice this function off the top
  var stack = obj.stack.slice(1)

  Error.prepareStackTrace = prep
  Error.stackTraceLimit = limit

  return stack
}

/**
 * Capture call site stack from v8.
 */

function prepareObjectStackTrace(obj, stack) {
  return stack
}

/**
 * Return a wrapped function in a deprecation message.
 */

function wrapfunction(fn, message) {
  if (typeof fn !== 'function') {
    throw new TypeError('argument fn must be a function')
  }

  var args = createArgumentsString(fn.length)
  var deprecate = this
  var stack = getStack()
  var site = callSiteLocation(stack[1])

  site.name = fn.name

  // var deprecatedfn = eval('(function (' + args + ') {\n'
  //   + '"use strict"\n'
  //   + 'log.call(deprecate, message, site)\n'
  //   + 'return fn.apply(this, arguments)\n'
  //   + '})')

  return fn
}

/**
 * Wrap property in a deprecation message.
 */

function wrapproperty(obj, prop, message) {
  if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
    throw new TypeError('argument obj must be object')
  }

  var descriptor = Object.getOwnPropertyDescriptor(obj, prop)

  if (!descriptor) {
    throw new TypeError('must call property on owner object')
  }

  if (!descriptor.configurable) {
    throw new TypeError('property must be configurable')
  }

  var deprecate = this
  var stack = getStack()
  var site = callSiteLocation(stack[1])

  // set site name
  site.name = prop

  // convert data descriptor
  if ('value' in descriptor) {
    descriptor = convertDataDescriptorToAccessor(obj, prop, message)
  }

  var get = descriptor.get
  var set = descriptor.set

  // wrap getter
  if (typeof get === 'function') {
    descriptor.get = function getter() {
      log.call(deprecate, message, site)
      return get.apply(this, arguments)
    }
  }

  // wrap setter
  if (typeof set === 'function') {
    descriptor.set = function setter() {
      log.call(deprecate, message, site)
      return set.apply(this, arguments)
    }
  }

  Object.defineProperty(obj, prop, descriptor)
}

/**
 * Create DeprecationError for deprecation
 */

function DeprecationError(namespace, message, stack) {
  var error = new Error()
  var stackString

  Object.defineProperty(error, 'constructor', {
    value: DeprecationError
  })

  Object.defineProperty(error, 'message', {
    configurable: true,
    enumerable: false,
    value: message,
    writable: true
  })

  Object.defineProperty(error, 'name', {
    enumerable: false,
    configurable: true,
    value: 'DeprecationError',
    writable: true
  })

  Object.defineProperty(error, 'namespace', {
    configurable: true,
    enumerable: false,
    value: namespace,
    writable: true
  })

  Object.defineProperty(error, 'stack', {
    configurable: true,
    enumerable: false,
    get: function () {
      if (stackString !== undefined) {
        return stackString
      }

      // prepare stack trace
      return stackString = createStackString.call(this, stack)
    },
    set: function setter(val) {
      stackString = val
    }
  })

  return error
}

}).call(this,require('_process'))
},{"./lib/compat":39,"_process":11,"events":8,"path":"path"}],"dgram":[function(require,module,exports){
(function (Buffer){
/*global chrome */

/**
 * UDP / Datagram Sockets
 * ======================
 *
 * Datagram sockets are available through require('chrome-dgram').
 */

exports.Socket = Socket

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var series = require('run-series')

var BIND_STATE_UNBOUND = 0
var BIND_STATE_BINDING = 1
var BIND_STATE_BOUND = 2

// Track open sockets to route incoming data (via onReceive) to the right handlers.
var sockets = {}

if (typeof chrome !== 'undefined') {
  chrome.sockets.udp.onReceive.addListener(onReceive)
  chrome.sockets.udp.onReceiveError.addListener(onReceiveError)
}

function onReceive (info) {
  if (info.socketId in sockets) {
    sockets[info.socketId]._onReceive(info)
  } else {
    console.error('Unknown socket id: ' + info.socketId)
  }
}

function onReceiveError (info) {
  if (info.socketId in sockets) {
    sockets[info.socketId]._onReceiveError(info.resultCode)
  } else {
    console.error('Unknown socket id: ' + info.socketId)
  }
}

/**
 * dgram.createSocket(type, [callback])
 *
 * Creates a datagram Socket of the specified types. Valid types are `udp4`
 * and `udp6`.
 *
 * Takes an optional callback which is added as a listener for message events.
 *
 * Call socket.bind if you want to receive datagrams. socket.bind() will bind
 * to the "all interfaces" address on a random port (it does the right thing
 * for both udp4 and udp6 sockets). You can then retrieve the address and port
 * with socket.address().address and socket.address().port.
 *
 * @param  {string} type       Either 'udp4' or 'udp6'
 * @param  {function} listener Attached as a listener to message events.
 *                             Optional
 * @return {Socket}            Socket object
 */
exports.createSocket = function (type, listener) {
  return new Socket(type, listener)
}

inherits(Socket, EventEmitter)

/**
 * Class: dgram.Socket
 *
 * The dgram Socket class encapsulates the datagram functionality. It should
 * be created via `dgram.createSocket(type, [callback])`.
 *
 * Event: 'message'
 *   - msg Buffer object. The message
 *   - rinfo Object. Remote address information
 *   Emitted when a new datagram is available on a socket. msg is a Buffer and
 *   rinfo is an object with the sender's address information and the number
 *   of bytes in the datagram.
 *
 * Event: 'listening'
 *   Emitted when a socket starts listening for datagrams. This happens as soon
 *   as UDP sockets are created.
 *
 * Event: 'close'
 *   Emitted when a socket is closed with close(). No new message events will
 *   be emitted on this socket.
 *
 * Event: 'error'
 *   - exception Error object
 *   Emitted when an error occurs.
 */
function Socket (options, listener) {
  var self = this
  EventEmitter.call(self)
  if (typeof options === 'string') options = { type: options }
  if (options.type !== 'udp4') throw new Error('Bad socket type specified. Valid types are: udp4')

  if (typeof listener === 'function') self.on('message', listener)

  self._destroyed = false
  self._bindState = BIND_STATE_UNBOUND
  self._bindTasks = []
}

/**
 * socket.bind(port, [address], [callback])
 *
 * For UDP sockets, listen for datagrams on a named port and optional address.
 * If address is not specified, the OS will try to listen on all addresses.
 * After binding is done, a "listening" event is emitted and the callback(if
 * specified) is called. Specifying both a "listening" event listener and
 * callback is not harmful but not very useful.
 *
 * A bound datagram socket keeps the node process running to receive
 * datagrams.
 *
 * If binding fails, an "error" event is generated. In rare case (e.g. binding
 * a closed socket), an Error may be thrown by this method.
 *
 * @param {number} port
 * @param {string} address Optional
 * @param {function} callback Function with no parameters, Optional. Callback
 *                            when binding is done.
 */
Socket.prototype.bind = function (port, address, callback) {
  var self = this
  if (typeof address === 'function') {
    callback = address
    address = undefined
  }

  if (!address) address = '0.0.0.0'

  if (!port) port = 0

  if (self._bindState !== BIND_STATE_UNBOUND) throw new Error('Socket is already bound')

  self._bindState = BIND_STATE_BINDING

  if (typeof callback === 'function') self.once('listening', callback)

  chrome.sockets.udp.create(function (createInfo) {
    self.id = createInfo.socketId

    sockets[self.id] = self

    var bindFns = self._bindTasks.map(function (t) { return t.fn })

    series(bindFns, function (err) {
      if (err) return self.emit('error', err)
      chrome.sockets.udp.bind(self.id, address, port, function (result) {
        if (result < 0) {
          self.emit('error', new Error('Socket ' + self.id + ' failed to bind. ' +
            chrome.runtime.lastError.message))
          return
        }
        chrome.sockets.udp.getInfo(self.id, function (socketInfo) {
          if (!socketInfo.localPort || !socketInfo.localAddress) {
            self.emit('error', new Error('Cannot get local port/address for Socket ' + self.id))
            return
          }

          self._port = socketInfo.localPort
          self._address = socketInfo.localAddress

          self._bindState = BIND_STATE_BOUND
          self.emit('listening')

          self._bindTasks.map(function (t) {
            t.callback()
          })
        })
      })
    })
  })
}

/**
 * Internal function to receive new messages and emit `message` events.
 */
Socket.prototype._onReceive = function (info) {
  var self = this

  var buf = new Buffer(new Uint8Array(info.data))
  var rinfo = {
    address: info.remoteAddress,
    family: 'IPv4',
    port: info.remotePort,
    size: buf.length
  }
  self.emit('message', buf, rinfo)
}

Socket.prototype._onReceiveError = function (resultCode) {
  var self = this
  self.emit('error', new Error('Socket ' + self.id + ' receive error ' + resultCode))
}

/**
 * socket.send(buf, offset, length, port, address, [callback])
 *
 * For UDP sockets, the destination port and IP address must be
 * specified. A string may be supplied for the address parameter, and it will
 * be resolved with DNS. An optional callback may be specified to detect any
 * DNS errors and when buf may be re-used. Note that DNS lookups will delay
 * the time that a send takes place, at least until the next tick. The only
 * way to know for sure that a send has taken place is to use the callback.
 *
 * If the socket has not been previously bound with a call to bind, it's
 * assigned a random port number and bound to the "all interfaces" address
 * (0.0.0.0 for udp4 sockets, ::0 for udp6 sockets).
 *
 * @param {Buffer|Arrayish|string} buf Message to be sent
 * @param {number} offset Offset in the buffer where the message starts.
 * @param {number} length Number of bytes in the message.
 * @param {number} port destination port
 * @param {string} address destination IP
 * @param {function} callback Callback when message is done being delivered.
 *                            Optional.
 */
// Socket.prototype.send = function (buf, host, port, cb) {
Socket.prototype.send = function (buffer, offset, length, port, address, callback) {
  var self = this
  if (!callback) callback = function () {}

  if (offset !== 0) throw new Error('Non-zero offset not supported yet')

  if (self._bindState === BIND_STATE_UNBOUND) self.bind(0)

  // If the socket hasn't been bound yet, push the outbound packet onto the
  // send queue and send after binding is complete.
  if (self._bindState !== BIND_STATE_BOUND) {
    // If the send queue hasn't been initialized yet, do it, and install an
    // event handler that flishes the send queue after binding is done.
    if (!self._sendQueue) {
      self._sendQueue = []
      self.once('listening', function () {
        // Flush the send queue.
        for (var i = 0; i < self._sendQueue.length; i++) {
          self.send.apply(self, self._sendQueue[i])
        }
        self._sendQueue = undefined
      })
    }
    self._sendQueue.push([buffer, offset, length, port, address, callback])
    return
  }

  if (!Buffer.isBuffer(buffer)) buffer = new Buffer(buffer)

  // assuming buffer is browser implementation (`buffer` package on npm)
  var buf = buffer.buffer
  if (buffer.byteOffset || buffer.byteLength !== buf.byteLength) {
    buf = buf.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }
  if (offset || length !== buffer.length) {
    buf = buf.slice(offset, length)
  }

  chrome.sockets.udp.send(self.id, buf, address, +port, function (sendInfo) {
    if (sendInfo.resultCode < 0) {
      var err = new Error('Socket ' + self.id + ' send error ' + sendInfo.resultCode)
      callback(err)
      self.emit('error', err)
    } else {
      callback(null)
    }
  })
}

/**
 * Close the underlying socket and stop listening for data on it.
 */
Socket.prototype.close = function () {
  var self = this
  if (self._destroyed) return

  delete sockets[self.id]
  chrome.sockets.udp.close(self.id)
  self._destroyed = true

  self.emit('close')
}

/**
 * Returns an object containing the address information for a socket. For UDP
 * sockets, this object will contain address, family and port.
 *
 * @return {Object} information
 */
Socket.prototype.address = function () {
  var self = this
  return {
    address: self._address,
    port: self._port,
    family: 'IPv4'
  }
}

Socket.prototype.setBroadcast = function (flag) {
  // No chrome.sockets equivalent
}

Socket.prototype.setTTL = function (ttl) {
  // No chrome.sockets equivalent
}

// NOTE: Multicast code is untested. Pull requests accepted for bug fixes and to
// add tests!

/**
 * Sets the IP_MULTICAST_TTL socket option. TTL stands for "Time to Live," but
 * in this context it specifies the number of IP hops that a packet is allowed
 * to go through, specifically for multicast traffic. Each router or gateway
 * that forwards a packet decrements the TTL. If the TTL is decremented to 0
 * by a router, it will not be forwarded.
 *
 * The argument to setMulticastTTL() is a number of hops between 0 and 255.
 * The default on most systems is 1.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {number} ttl
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.setMulticastTTL = function (ttl, callback) {
  var self = this
  if (!callback) callback = function () {}
  if (self._bindState === BIND_STATE_BOUND) {
    setMulticastTTL(callback)
  } else {
    self._bindTasks.push({
      fn: setMulticastTTL,
      callback: callback
    })
  }

  function setMulticastTTL (callback) {
    chrome.sockets.udp.setMulticastTimeToLive(self.id, ttl, callback)
  }
}

/**
 * Sets or clears the IP_MULTICAST_LOOP socket option. When this option is
 * set, multicast packets will also be received on the local interface.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {boolean} flag
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.setMulticastLoopback = function (flag, callback) {
  var self = this
  if (!callback) callback = function () {}
  if (self._bindState === BIND_STATE_BOUND) {
    setMulticastLoopback(callback)
  } else {
    self._bindTasks.push({
      fn: setMulticastLoopback,
      callback: callback
    })
  }

  function setMulticastLoopback (callback) {
    chrome.sockets.udp.setMulticastLoopbackMode(self.id, flag, callback)
  }
}

/**
 * Tells the kernel to join a multicast group with IP_ADD_MEMBERSHIP socket
 * option.
 *
 * If multicastInterface is not specified, the OS will try to add membership
 * to all valid interfaces.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {string} multicastAddress
 * @param {string} [multicastInterface] Optional
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.addMembership = function (multicastAddress,
                                           multicastInterface,
                                           callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.sockets.udp.joinGroup(self.id, multicastAddress, callback)
}

/**
 * Opposite of addMembership - tells the kernel to leave a multicast group
 * with IP_DROP_MEMBERSHIP socket option. This is automatically called by the
 * kernel when the socket is closed or process terminates, so most apps will
 * never need to call this.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * If multicastInterface is not specified, the OS will try to drop membership
 * to all valid interfaces.
 *
 * @param  {[type]} multicastAddress
 * @param  {[type]} multicastInterface Optional
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.dropMembership = function (multicastAddress,
                                            multicastInterface,
                                            callback) {
  var self = this
  if (!callback) callback = function () {}
  chrome.sockets.udp.leaveGroup(self.id, multicastAddress, callback)
}

Socket.prototype.unref = function () {
  // No chrome.sockets equivalent
}

Socket.prototype.ref = function () {
  // No chrome.sockets equivalent
}

}).call(this,require("buffer").Buffer)
},{"buffer":3,"events":8,"inherits":40,"run-series":41}],"fs":[function(require,module,exports){
(function (process){
var util = require('util')
var Buffer = require('buffer').Buffer
var Stream = require('stream').Stream
var constants = require('constants')
var p = require('path')
var Readable = Stream.Readable
var Writable = Stream.Writable

var FILESYSTEM_DEFAULT_SIZE = 250 * 1024 * 1024	// 250MB
var DEBUG = false

var O_APPEND = constants.O_APPEND || 0
var O_CREAT = constants.O_CREAT || 0
var O_EXCL = constants.O_EXCL || 0
var O_RDONLY = constants.O_RDONLY || 0
var O_RDWR = constants.O_RDWR || 0
var O_SYNC = constants.O_SYNC || 0
var O_TRUNC = constants.O_TRUNC || 0
var O_WRONLY = constants.O_WRONLY || 0
var fds = {}

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem

function nullCheck (path, callback) {
  if (('' + path).indexOf('\u0000') !== -1) {
    var er = new Error('Path must be a string without null bytes.')
    if (!callback) {
      throw er
    }
    process.nextTick(function () {
      callback(er)
    })
    return false
  }
  return true
}

function maybeCallback (cb) {
  return util.isFunction(cb) ? cb : rethrow()
}

function makeCallback (cb) {
  if (util.isNullOrUndefined(cb)) {
    return rethrow()
  }

  if (!util.isFunction(cb)) {
    throw new TypeError('callback must be a function')
  }

  return function () {
    return cb.apply(null, arguments)
  }
}

function rethrow () {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and
  // is fairly slow to generate.
  if (DEBUG) { // eslint-disable-line
    var backtrace = new Error()
    return function (err) {
      if (err) {
        backtrace.stack = err.name + ': ' + err.message +
          backtrace.stack.substr(backtrace.name.length)
        err = backtrace
        throw err
      }
    }
  }
}

function resolve (path) {
  // Allow null pass through
  if (path === null) {
    return null
  }
  if (typeof path === 'undefined') {
    return null
  }
  // Don't let anything but strings be passed as on
  if (typeof path !== 'string') {
    throw Error('Cannot resolve: Paths must be strings : ' + path.toString())
  }
  var retString = path
  if (retString[0] === '/') {
    retString = retString.slice(1)
  }
  if (retString[retString.length - 1] === '/') {
    retString = retString.slice(0, retString.length - 1)
  }
  return retString
}

function assertEncoding (encoding) {
  if (encoding && !Buffer.isEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding)
  }
}

function modeNum (m, def) {
  if (util.isNumber(m)) {
    return m
  }
  if (util.isString(m)) {
    return parseInt(m, 8)
  }
  if (def) {
    return modeNum(def)
  }
  return undefined
}

exports.chown = function (path, uid, gid, callback) {
  resolve(path)
  callback = makeCallback(callback)
  if (!nullCheck(path, callback)) return

  exports.exists(path, function (exists) {
    if (exists) {
      callback()
    } else {
      callback('File does not exist')
    }
  })
}

exports.utimes = function (name, now, mtime, cb) {
  cb()
}

exports.fchown = function (fd, uid, gid, callback) {
  exports.chown(fd.fullPath, uid, gid, callback)
}

exports.chmod = function (path, mode, callback) {
  resolve(path)
  callback = makeCallback(callback)
  if (!nullCheck(path, callback)) return

  exports.exists(path, function (exists) {
    if (exists) {
      callback()
    } else {
      callback('File does not exist')
    }
  })
}

exports.fchmod = function (fd, mode, callback) {
  exports.chmod(fd.fullPath, mode, callback)
}

exports.exists = function (path, callback) {
  if (path === '/') {
    callback(true)
    return
  }
  path = resolve(path)
  window.requestFileSystem(window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      cfs.root.getFile(path, {},
        function (fileEntry) {
          setTimeout(callback, 0, true)
        }, function () {
          cfs.root.getDirectory(path, {},
            function (dirEntry) {
              setTimeout(callback, 0, true)
            }, function () {
              callback(false)
            })
        })
    }, function () { setTimeout(callback, 0, false) })
}

exports.mkdir = function (path, mode, callback) {
  path = resolve(path)
  if (util.isFunction(mode)) callback = mode
  callback = makeCallback(callback)
  if (!nullCheck(path, callback)) return

  exports.exists(path, function (exists) {
    if (exists) {
      var err = new Error()
      err.code = 'EEXIST'
      err.path = path
      callback(err)
    } else {
      exports.exists(p.dirname(path), function (exists) {
        if (exists || p.dirname(path) === '.') {
          window.requestFileSystem(window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
            function (cfs) {
              cfs.root.getDirectory(path, {create: true},
                function (dirEntry) {
                  setTimeout(callback, 0)
                }, callback)
            }, callback)
        } else {
          var enoent = new Error()
          enoent.code = 'ENOENT'
          enoent.path = path
          callback(enoent)
        }
      })
    }
  })
}

exports.rmdir = function (path, callback) {
  if (path === '/') {
    var permerr = new Error()
    permerr.code = 'EPERM'
    callback(permerr)
    return
  }
  resolve(path)
  callback = maybeCallback(callback)
  if (!nullCheck(path, callback)) return

  window.requestFileSystem(window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      cfs.root.getDirectory(path, {},
        function (dirEntry) {
          dirEntry.remove(function () {
            callback()
          }, function (err) {
            if (err.name === 'NotFoundError') {
              var entryerr = new Error()
              entryerr.code = 'ENOENT'
              entryerr.path = path
              callback(entryerr)
            } else {
              callback(err)
            }
          })
        }, function (err) {
          if (err.name === 'NotFoundError') {
            var entryerr = new Error()
            entryerr.code = 'ENOENT'
            entryerr.path = path
            callback(entryerr)
          } else {
            callback(err)
          }
        })
    }, callback)
}

exports.readdir = function (path, callback) {
  resolve(path)
  window.requestFileSystem(window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      cfs.root.getDirectory(path, {}, function (dirEntry) {
        var dirReader = dirEntry.createReader()
        dirReader.readEntries(function (entries) {
          var fullPathList = []
          for (var i = 0; i < entries.length; i++) {
            fullPathList.push(entries[i].name)
          }
          callback(null, fullPathList)
        }, callback)
      }, function (err) {
        if (err.name === 'NotFoundError') {
          var enoent = new Error()
          enoent.code = 'ENOENT'
          callback(enoent)
        } else {
          callback(err)
        }
      })
    }, callback)
}

exports.rename = function (oldPath, newPath, callback) {
  callback = makeCallback(callback)

  if (!nullCheck(oldPath, callback)) {
    return
  }

  if (!nullCheck(newPath, callback)) {
    return
  }
  // Some shennanigans here as folks rename and move
  // at the same time :/
  // First we strip the prefixed /
  oldPath = resolve(oldPath)
  newPath = resolve(newPath)

  // Then we split the new location to get the name and the too directory
  var tmpPath = newPath.split('/')
  var newName = tmpPath.pop()
  // if the directory happens to be root then we need to supply
  // a / because gooogle devs
  var toDirectory = tmpPath.join('/')

  // Leaving us with oldPath the toDirectory and newName
  window.requestFileSystem(
    window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      // If root is / then we need a pointer to the root dir?
      // Think this needs a couple of sun dir tests
      if (toDirectory === '') {
        toDirectory = cfs.root
      }
      cfs.root.getFile(oldPath, {},
        function (fileEntry) {
          fileEntry.onerror = callback

          cfs.root.getDirectory(toDirectory, {}, function (dirEntry) {
            fileEntry.moveTo(dirEntry, newName)
            callback()
          }, callback)
          fileEntry.moveTo(toDirectory, newName, callback)
        }, function (err) {
          // we need to move the directory instead
          if (err.name === 'TypeMismatchError') {
            cfs.root.getDirectory('/' + oldPath, {}, function (dirEntry) {
              dirEntry.moveTo(toDirectory, newName, function () {
                callback()
              }, function (err) {
                callback(err)
              })
            })
          } else {
            callback(err)
          }
        })
    }, callback)
}

exports.ftruncate = function (fd, len, callback) {
  if (util.isFunction(len)) {
    callback = len
    len = 0
  } else if (util.isUndefined(len)) {
    len = 0
  }
  var cb = makeCallback(callback)
  fd.onerror = cb
  fd.onwriteend = function () {
    cb()
  }
  fd.truncate(len)
}

exports.truncate = function (path, len, callback) {
  if (util.isObject(path)) {
    return exports.ftruncate(path, len, callback)
  }
  if (util.isFunction(len)) {
    callback = len
    len = 0
  } else if (util.isUndefined(len)) {
    len = 0
  }

  callback = maybeCallback(callback)
  exports.open(path, 'w', function (er, fd) {
    if (er) return callback(er)
    fd.onwriteend = function (evt) {
      if (evt.type !== 'writeend') {
        callback(evt)
      } else {
        callback()
      }
    }
    fd.truncate(len)
  })
}

exports.stat = function (path, callback) {
  path = resolve(path)
  window.requestFileSystem(
    window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      var opts = {}
      cfs.root.getFile(path, opts, function (fileEntry) {
        fileEntry.file(function (file) {
          var statval = { dev: 0,
            mode: '0777',
            nlink: 0,
            uid: 0,
            gid: 0,
            rdev: 0,
            ino: 0,
            size: file.size,
            atime: null,
            mtime: file.lastModifiedDate,
          ctime: null }
          statval.isDirectory = function () { return false }
          statval.isFile = function () { return true }
          statval.isSocket = function () { return false }
          statval.isBlockDevice = function () { return false }
          statval.isCharacterDevice = function () { return false }
          statval.isFIFO = function () { return false }
          statval.isSymbolicLink = function () { return false }
          callback(null, statval)
        })
      }, function (err) {
        if (err.name === 'TypeMismatchError') {
          cfs.root.getDirectory(path, opts, function (dirEntry) {
            var statval = { dev: 0,
              mode: '0777',
              nlink: 0,
              uid: 0,
              gid: 0,
              rdev: 0,
              ino: 0,
              size: 0,
              atime: null,
              mtime: new Date(0),
              ctime: null,
              blksize: -1,
            blocks: -1 }
            statval.isDirectory = function () { return true }
            statval.isFile = function () { return false }
            statval.isSocket = function () { return false }
            statval.isBlockDevice = function () { return false }
            statval.isCharacterDevice = function () { return false }
            statval.isFIFO = function () { return false }
            statval.isSymbolicLink = function () { return false }
            callback(null, statval)
          })
        } else {
          callback(err)
        }
      })
    }, callback)
}

exports.fstat = function (fd, callback) {
  if (typeof fds[fd.fullPath] === 'undefined') {
    var ebadf = new Error()
    ebadf.code = 'EBADF'
    window.setTimeout(callback, 0, ebadf)
  } else {
    exports.stat(fd.fullPath, callback)
  }
}

exports.open = function (path, flags, mode, callback) {
  path = resolve(path)
  flags = flagToString(flags)
  callback = makeCallback(arguments[arguments.length - 1])
  mode = modeNum(mode, 438 /* =0666 */)

  if (!nullCheck(path, callback)) return
  window.requestFileSystem(
    window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      var opts = {}
      if (flags.indexOf('w') > -1) {
        opts = {create: true}
      }
      if (flags.indexOf('x') > -1) {
        opts.exclusive = true
      }
      cfs.root.getFile(
        path,
        opts,
        function (fileEntry) {
          // if its a write then we get the file writer
          // otherwise we get the file because 'standards'
          if (flags.indexOf('w') > -1 || flags.indexOf('a') > -1) {
            fileEntry.createWriter(function (fileWriter) {
              fileWriter.flags = flags
              fileWriter.fullPath = fileEntry.fullPath
              fds[fileWriter.fullPath] = {}
              fds[fileWriter.fullPath].status = 'open'
              fileWriter.key = fileWriter.fullPath
              callback(null, fileWriter)
            }, callback)
          } else {
            fileEntry.file(function (file) {
              file.fullPath = fileEntry.fullPath
              fds[file.fullPath] = {}
              fds[file.fullPath].status = 'open'
              file.key = file.fullPath
              callback(null, file)
            })
          }
        }, function (err) {
          if (err.name === 'NotFoundError') {
            var enoent = new Error()
            enoent.code = 'ENOENT'
            callback(enoent)
          } else if (err.name === 'TypeMismatchError' || err.name === 'SecurityError') {
            // Work around for directory file descriptor
            // It's a write on a directory
            if (flags.indexOf('w') > -1) {
              var eisdir = new Error()
              eisdir.code = 'EISDIR'
              callback(eisdir)
            } else {
              var dird = {}
              dird.fullPath = path
              callback(null, dird)
            }

          } else if (err.name === 'InvalidModificationError') {
            var eexists = new Error()
            eexists.code = 'EEXIST'
            callback(eexists)
          } else {
            callback(err)
          }
        })
    }, callback)
}

exports.read = function (fd, buffer, offset, length, position, callback) {
  if (fd === null) {
    callback(null, 0, '')
    return
  }
  if (typeof fds[fd.key] === 'undefined') {
    fds[fd.key].readpos = 0
  }
  if (position !== null) {
    if (position >= 0) {
      fds[fd.key].readpos = position
    }
  }
  if (!util.isBuffer(buffer)) {
    // fs.read(fd, expected.length, 0, 'utf-8', function (err, str, bytesRead)
    // legacy string interface (fd, length, position, encoding, callback)
    var cb = arguments[4]
    var encoding = arguments[3]

    assertEncoding(encoding)

    position = arguments[2]
    length = arguments[1]
    // sbuf = new Buffer(length)
    offset = 0
    callback = function (err, bytesRead, data) {
      if (!cb) return
      var str = ''
      if (fd.type === 'text/plain') {
        str = data
      } else {
        str = (bytesRead > 0) ? buffer.toString(encoding, 0, bytesRead) : '' // eslint-disable-line
      }
      (cb)(err, str, bytesRead)
    }
  }
  fd.onerror = function (err) {
    if (err.name === 'NotFoundError') {
      var enoent = new Error()
      enoent.code = 'ENOENT'
      callback(enoent)
    } else {
      callback(err)
    }
  }
  if (offset < fds[fd.key].readpos) {
    offset = fds[fd.key].readpos
  }
  var data = fd.slice(offset, offset + length)
  var fileReader = new FileReader() // eslint-disable-line
  fileReader.onload = function (evt) {
    var result
    if (fd.type === 'text/plain') {
      result = new Buffer(this.result)
    } else {
      result = new Buffer(new Uint8Array(this.result))
    }
    result.copy(buffer)
    fds[fd.key].readpos = offset + length
    callback(null, result.length, result)
  }
  fileReader.onerror = function (err) {
    if (err.name === 'NotFoundError') {
      var enoent = new Error()
      enoent.code = 'ENOENT'
      callback(enoent)
    } else {
      callback(err)
    }
  }
  // no-op the onprogressevent
  fileReader.onprogress = function () {}
  if (fd.type === 'text/plain') {
    fileReader.readAsText(data)
  } else {
    fileReader.readAsArrayBuffer(data)
  }
}

exports.readFile = function (path, options, cb) {
  var callback = maybeCallback(arguments[arguments.length - 1])

  if (util.isFunction(options) || !options) {
    options = { encoding: null, flag: 'r' }
  } else if (util.isString(options)) {
    options = { encoding: options, flag: 'r' }
  } else if (!util.isObject(options)) {
    throw new TypeError('Bad arguments')
  }
  var encoding = options.encoding
  assertEncoding(encoding)
  window.requestFileSystem(
    window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      var opts = {}
      cfs.root.getFile(
        path,
        opts,
        function (fileEntry) {
          fileEntry.file(function (file) {
            fileEntry.onerror = callback
            var fileReader = new FileReader() // eslint-disable-line
            fileReader.onload = function (evt) {
              if (options.encoding === null) {
                window.setTimeout(callback, 0, null, new Buffer(this.result, 'binary'))
              } else if (options.encoding === 'hex') {
                window.setTimeout(callback, 0, null, new Buffer(this.result).toString('hex'))
              } else {
                window.setTimeout(callback, 0, null, this.result)
              }
            }
            fileReader.onerror = function (evt) {
              callback(evt, null)
            }

            if (file.type === 'text/plain') {
              fileReader.readAsText(file)
            } else {
              fileReader.readAsArrayBuffer(file)
            }
          })
        }, function (err) {
          if (err.name === 'TypeMismatchError') {
            var eisdir = new Error()
            eisdir.code = 'EISDIR'
            callback(eisdir)
          } else {
            callback(err)
          }
        })
    }, callback)
}

exports.write = function (fd, buffer, offset, length, position, callback) {
  if (util.isBuffer(buffer)) {
    if (util.isFunction(position)) {
      callback = position
      position = null
    }
    callback = maybeCallback(callback)

    fd.onerror = callback
    fd.onprogress = function () {}
    var tmpbuf = buffer.slice(offset, length)
    var bufblob = new Blob([tmpbuf], {type: 'application/octet-binary'}) // eslint-disable-line
    if (fd.readyState > 0) {
      // when the ready state is greater than 1 we have to wait until the write end has finished
      // but this causes the stream to keep sending write events.
      // So currently fs and writestream have there own implementations
      fd.onwriteend = function () {
        if (position !== null) {
          fd.seek(position)
        }
        if (fd.flags.indexOf('a') > -1) {
          fd.seek(fd.length)
        }
        fd.write(bufblob)
        callback(null, tmpbuf.length, tmpbuf)
      }
    } else {
      if (position !== null) {
        fd.seek(position)
      }
      if (fd.flags.indexOf('a') > -1) {
        fd.seek(fd.length)
      }
      fd.write(bufblob)
      if (typeof callback === 'function') {
        callback(null, tmpbuf.length, tmpbuf)
      }
    }
  } else {
    if (util.isString(buffer)) {
      buffer += ''
    }
    if (!util.isFunction(position)) {
      if (util.isFunction(offset)) {
        position = offset
        offset = null
      } else {
        position = length
      }
      length = 'utf8'
    }
    callback = maybeCallback(position)
    fd.onerror = callback
    var blob = new Blob([buffer], {type: 'text/plain'}) // eslint-disable-line

    var buf = new Buffer(buffer)

    if (fd.readyState > 0) {
      fd.onwriteend = function () {
        if (position !== null) {
          fd.seek(position)
        }
        fd.write(blob)
        if (typeof callback === 'function') {
          callback(null, buf.length)
        }
      }
    } else {
      if (position !== null) {
        fd.seek(position)
      }
      fd.write(blob)
      if (typeof callback === 'function') {
        callback(null, buf.length)
      }
    }
  }
}

exports.unlink = function (fd, callback) {
  var path = resolve(fd)
  exports.exists(path, function (exists) {
    if (exists) {
      window.requestFileSystem(
        window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
        function (cfs) {
          cfs.root.getFile(
            path,
            {},
            function (fileEntry) {
              fileEntry.remove(callback)
            }, function (err) {
              if (err.name === 'TypeMismatchError') {
                var eisdir = new Error()
                eisdir.code = 'EISDIR'
                eisdir.path = path
                callback(eisdir)
              } else {
                callback(err)
              }
            })
        }, callback)
    } else {
      var enoent = new Error()
      enoent.code = 'ENOENT'
      enoent.path = path
      callback(enoent)
    }
  })
}

exports.writeFile = function (path, data, options, cb) {
  var callback = maybeCallback(arguments[arguments.length - 1])

  if (util.isFunction(options) || !options) {
    options = { encoding: 'utf8', mode: 438, flag: 'w' }
  } else if (util.isString(options)) {
    options = { encoding: options, mode: 438, flag: 'w' }
  } else if (!util.isObject(options)) {
    throw new TypeError('Bad arguments')
  }

  assertEncoding(options.encoding)

  var flag = options.flag || 'w' // eslint-disable-line
  window.requestFileSystem(
    window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      var opts = {}
      if (flag.indexOf('w') > -1) {
        opts = {create: true}
      }
      if (flag.indexOf('x') > -1) {
        opts.exclusive = true
      }
      cfs.root.getFile(
        path,
        opts,
        function (fileEntry) {
          // if its a write then we get the file writer
          // otherwise we get the file because 'standards'
          if (flag.indexOf('w') > -1) {
            fileEntry.createWriter(function (fileWriter) {
              fileWriter.onerror = callback
              // make sure we have an empty file
              // fileWriter.truncate(0)
              if (typeof callback === 'function') {
                fileWriter.onwriteend = function (evt) {
                  window.setTimeout(callback, 0)
                }
              } else {
                fileWriter.onwriteend = function () {}
              }
              fileWriter.onprogress = function () {}
              var blob
              if (typeof data === 'string') {
                blob = new Blob([data], {type: 'text/plain'}) // eslint-disable-line
              } else {
                if (options.encoding === 'hex') {
                  // convert the hex data to a string then save it.
                  blob = new Blob([new Buffer(data, 'hex').toString('hex')], {type: 'text/plain'}) // eslint-disable-line
                } else {
                  blob = new Blob([data], {type: 'application/octet-binary'}) // eslint-disable-line
                }
              }
              fileWriter.write(blob)
            }, function (evt) {
              if (evt.type !== 'writeend') {
                callback()
              } else {
                callback()
              }
            })
          } else {
            var err = new Error()
            err.code = 'UNKNOWN'
            err.message = 'flag not supported: ' + flag
            callback(err)
          }
        }, function (err) {
          if (err.name === 'TypeMismatchError') {
            var eisdir = Error()
            eisdir.code = 'EISDIR'
            callback(eisdir)
          } else {
            callback(err)
          }
        })
    }, function (evt) {
      if (evt.type !== 'writeend') {
        callback(evt)
      } else {
        callback()
      }
    })
}

exports.appendFile = function (path, data, options, cb) {
  var callback = maybeCallback(arguments[arguments.length - 1])

  if (util.isFunction(options) || !options) {
    options = { encoding: 'utf8', mode: 438, flag: 'a' }
  } else if (util.isString(options)) {
    options = { encoding: options, mode: 438, flag: 'a' }
  } else if (!util.isObject(options)) {
    throw new TypeError('Bad arguments')
  }

  var flag = options.flag || 'a' // eslint-disable-line

  window.requestFileSystem(
    window.PERSISTENT, FILESYSTEM_DEFAULT_SIZE,
    function (cfs) {
      var opts = {}
      if (flag === 'a') {
        opts = {create: true}
      }
      cfs.root.getFile(
        path,
        opts,
        function (fileEntry) {
          // if its a write then we get the file writer
          // otherwise we get the file because 'standards'
          if (flag === 'a') {
            fileEntry.createWriter(function (fileWriter) {
              fileWriter.onerror = callback
              if (typeof callback === 'function') {
                fileWriter.onwriteend = function (evt) {
                  window.setTimeout(callback, 0, null, evt)
                }
              } else {
                fileWriter.onwriteend = function () {}
              }
              fileWriter.onprogress = function () {}
              fileWriter.seek(fileWriter.length)
              var blob = new Blob([data], {type: 'text/plain'}) // eslint-disable-line
              fileWriter.write(blob)
            }, callback)
          } else {
            callback('incorrect flag')
          }
        }, callback)
    }, callback)
}

exports.fsync = function (fd, cb) {
  if (!cb) cb = function () {}
  if (typeof fds[fd.fullPath] === 'undefined') {
    var ebadf = new Error()
    ebadf.code = 'EBADF'
    window.setTimeout(cb, 0, ebadf)
  } else {
    window.setTimeout(cb, 0)
  }
}

exports.close = function (fd, callback) {
  delete fds[fd.fullPath]
  var cb = makeCallback(callback)
  if (fd.readyState === 0) {
    cb(null)
  }
  fd.onwriteend = function (progressinfo) {
    cb(null, progressinfo)
  }
}

exports.createReadStream = function (path, options) {
  return new ReadStream(path, options)
}

util.inherits(ReadStream, Readable)
exports.ReadStream = ReadStream

function ReadStream (path, options) {
  if (!(this instanceof ReadStream)) {
    return new ReadStream(path, options)
  }

  // debugger // eslint-disable-line
  // a little bit bigger buffer and water marks by default
  options = util._extend({
    highWaterMark: 33554432 // 1024 * 1024
  }, options || {})

  Readable.call(this, options)

  this.path = path
  this.fd = options.hasOwnProperty('fd') ? options.fd : null
  this.flags = options.hasOwnProperty('flags') ? options.flags : 'r'
  this.mode = options.hasOwnProperty('mode') ? options.mode : 438 /* =0666 */

  this.start = options.hasOwnProperty('start') ? options.start : 0
  this.end = options.hasOwnProperty('end') ? options.end : 0
  this.autoClose = options.hasOwnProperty('autoClose') ?
    options.autoClose : true
  this.pos = undefined

  if (!util.isUndefined(this.start)) {
    if (!util.isNumber(this.start)) {
      throw TypeError('start must be a Number')
    }
    if (util.isUndefined(this.end)) {
      this.end = Infinity
    } else if (!util.isNumber(this.end)) {
      throw TypeError('end must be a Number')
    }

    if (this.start > this.end) {
      throw new Error('start must be <= end')
    }

    this.pos = this.start
  }
  if (this.fd === null) {
    this.pause()
  }

  if (this.path !== null) {
    this.open()
  }
  this.on('end', function () {
    if (this.autoClose) {
      this.destroy()
    }
  })
}

exports.FileReadStream = exports.ReadStream // support the legacy name

ReadStream.prototype.open = function () {
  var self = this

  if (this.flags === null) {
    this.flags = 'r'
  }

  exports.open(this.path, this.flags, this.mode, function (er, fd) {
    if (er) {
      if (self.autoClose) {
        self.destroy()
      }
      self.emit('error', er)
      return
    }
    self.resume()
    self.fd = fd
    self.emit('open', fd)
    self.read()
  })
}

ReadStream.prototype._read = function (n) {
  if (this.fd === null) {
    return this.once('open', function () {
      this._read(n)
    })
  }
  if (this.destroyed) {
    return
  }

  if (this.ispaused) {
    return
  }

  if (this.pos > this.fd.size) {
    return this.push(null)
  }

  if (this.fd.size === 0) {
    return this.push(null)
  }
  var self = this
  // Sketchy implementation that pushes the whole file to the stream
  // But maybe fd has a size that we can iterate to?
  var onread = function (err, length, data) {
    if (err) {
      if (self.autoClose) {
        self.destroy()
      }
      self.emit('error', err)
    }
    self.push(data)
    // self.once('finish', self.close)
  }

  // calculate the offset so read doesn't carry too much
  if (this.end === 0) {
    this.end = this._readableState.highWaterMark
  } else {
    this.end = this.end - this.start + 1
  }

  // exports.read(this.fd, new Buffer(this.fd.size), this.start, this.end, 0, onread)
  exports.read(this.fd, new Buffer(this.fd.size), this.start, this.end, this.pos, onread)
  this.pos += this._readableState.highWaterMark

}

ReadStream.prototype.destroy = function () {
  if (this.destroyed) {
    return
  }
  this.destroyed = true
  this.close()
}

ReadStream.prototype.close = function (cb) {
  var self = this
  if (cb) {
    this.once('close', cb)
  }
  if (this.closed) {
    this.emit('close')
  }
  this.closed = true
  close()
  function close (fd) {
    self.emit('close')
    self.fd = null
  }
}

exports.createWriteStream = function (path, options) {
  return new WriteStream(path, options)
}

util.inherits(WriteStream, Writable)
exports.WriteStream = WriteStream
function WriteStream (path, options) {
  if (!(this instanceof WriteStream)) {
    return new WriteStream(path, options)
  }

  options = options || {}

  Writable.call(this, options)

  this.path = path
  this.fd = null

  this.fd = options.hasOwnProperty('fd') ? options.fd : null
  this.flags = options.hasOwnProperty('flags') ? options.flags : 'w'
  this.mode = options.hasOwnProperty('mode') ? options.mode : 438 /* =0666 */

  this.start = options.hasOwnProperty('start') ? options.start : undefined
  this.pos = undefined
  this.bytesWritten = 0

  if (!util.isUndefined(this.start)) {
    if (!util.isNumber(this.start)) {
      throw TypeError('start must be a Number')
    }
    if (this.start < 0) {
      throw new Error('start must be >= zero')
    }

    this.pos = this.start
  }

  if (this.fd === null) {
    this.open()
  }

  // dispose on finish.
  this.once('finish', this.close)
}

exports.FileWriteStream = exports.WriteStream // support the legacy name

WriteStream.prototype.open = function () {
  this.writelist = []
  this.currentbuffersize = 0
  this.tds = 0

  exports.open(this.path, this.flags, this.mode, function (er, fd) {
    if (er) {
      this.destroy()
      this.emit('error', er)
      return
    }
    this.fd = fd
    if (this.flags.indexOf('a') > -1) {
      this.fd.seek(this.fd.length)
    }
    this.emit('open', fd)
  }.bind(this))
}
WriteStream.prototype.totalsize = 0
WriteStream.prototype._write = function (data, encoding, callbk) {
  if (!util.isBuffer(data)) {
    return this.emit('error', new Error('Invalid data'))
  }
  if (!util.isObject(this.fd)) {
    return this.once('open', function () {
      this._write(data, encoding, callbk)
    })
  }

  if (this.fd === null) {
    return this.once('open', function () {
      this._write(data, encoding, callbk)
    })
  }

  var callback = maybeCallback(callbk)
  this.toCall = callback
  this.isWriting = false
  var self = this

  this.fd.onerror = function (err) {
    if (err.name === 'TypeMismatchError') {
      // It's a write on a directory
      if (self.flags.indexOf('w')) {
        var eisdir = new Error()
        eisdir.code = 'EISDIR'
        callback(eisdir)
      } else {
        callback(err)
      }
    } else if (err.name === 'InvalidModificationError') {
      var eexists = new Error()
      eexists.code = 'EEXIST'
      callback(eexists)
    } else {
      callback(err)
    }
  }
  this.totalsize += data.length
  this.writelist.push(data)
  this.currentbuffersize += data.length
  callback(null, data.length)

  if (this.currentbuffersize > 134217728) {
    this._intenalwrite()
  }

  this.tds += data.length

}

WriteStream.prototype._intenalwrite = function () {
  // filewriter isn't setup so lets ignore it and
  // see if we try again
  if (this.fd === null) {
    return
  }

  if (this.fd.readystate > 0) {
    return
  }
  var dataToWrite = Buffer.concat(this.writelist)
  this.writelist = []
  this.currentbuffersize = 0
  var initblob = new Blob([dataToWrite]) // eslint-disable-line
  if (typeof this.fd.write !== 'undefined') {
    this.fd.write(initblob)
  }
}

WriteStream.prototype.destroy = ReadStream.prototype.destroy
WriteStream.prototype.close = function (cb) {
  this._intenalwrite()
  var self = this
  if (cb) {
    this.once('close', cb)
  }
  if (this.closed) {
    this.emit('close')
  }
  this.closed = true
  close()
  function close (fd) {
    self.emit('close')
    self.fd = null
  }
}

// There is no shutdown() for files.
WriteStream.prototype.destroySoon = WriteStream.prototype.end

function flagToString (flag) {
  // Only mess with strings
  if (util.isString(flag)) {
    return flag
  }

  switch (flag) {
    case O_RDONLY : return 'r'
    case O_RDONLY | O_SYNC : return 'sr'
    case O_RDWR : return 'r+'
    case O_RDWR | O_SYNC : return 'sr+'

    case O_TRUNC | O_CREAT | O_WRONLY : return 'w'
    case O_TRUNC | O_CREAT | O_WRONLY | O_EXCL : return 'xw'

    case O_TRUNC | O_CREAT | O_RDWR : return 'w+'
    case O_TRUNC | O_CREAT | O_RDWR | O_EXCL : return 'xw+'

    case O_APPEND | O_CREAT | O_WRONLY : return 'a'
    case O_APPEND | O_CREAT | O_WRONLY | O_EXCL : return 'xa'

    case O_APPEND | O_CREAT | O_RDWR : return 'a+'
    case O_APPEND | O_CREAT | O_RDWR | O_EXCL : return 'xa+'
  }

  throw new Error('Unknown file open flag: ' + flag)
}

}).call(this,require('_process'))
},{"_process":11,"buffer":3,"constants":7,"path":"path","stream":27,"util":32}],"https":[function(require,module,exports){
var http = require('./http');

var https = module.exports;

for (var key in http) {
    if (http.hasOwnProperty(key)) https[key] = http[key];
};

https.request = function (params, cb) {
    if (!params) params = {};
    params.scheme = 'https';
    return http.request.call(this, params, cb);
}
},{"./http":46}],"http":[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');
var EventEmitter = require('events').EventEmitter;


exports.IncomingMessage = require('./_http_incoming').IncomingMessage;


var common = require('./_http_common');
exports.METHODS = util._extend([], common.methods).sort();


exports.OutgoingMessage = require('./_http_outgoing').OutgoingMessage;


var server = require('./_http_server');
exports.ServerResponse = server.ServerResponse;
exports.STATUS_CODES = server.STATUS_CODES;


var agent = require('./_http_agent');
var Agent = exports.Agent = agent.Agent;
exports.globalAgent = agent.globalAgent;

var client = require('./_http_client');
var ClientRequest = exports.ClientRequest = client.ClientRequest;

exports.request = function(options, cb) {
  return new ClientRequest(options, cb);
};

exports.get = function(options, cb) {
  var req = exports.request(options, cb);
  req.end();
  return req;
};

exports._connectionListener = server._connectionListener;
var Server = exports.Server = server.Server;

exports.createServer = function(requestListener) {
  return new Server(requestListener);
};


// Legacy Interface

function Client(port, host) {
  if (!(this instanceof Client)) return new Client(port, host);
  EventEmitter.call(this);

  host = host || 'localhost';
  port = port || 80;
  this.host = host;
  this.port = port;
  this.agent = new Agent({ host: host, port: port, maxSockets: 1 });
}
util.inherits(Client, EventEmitter);
Client.prototype.request = function(method, path, headers) {
  var self = this;
  var options = {};
  options.host = self.host;
  options.port = self.port;
  if (method[0] === '/') {
    headers = path;
    path = method;
    method = 'GET';
  }
  options.method = method;
  options.path = path;
  options.headers = headers;
  options.agent = self.agent;
  var c = new ClientRequest(options);
  c.on('error', function(e) {
    self.emit('error', e);
  });
  // The old Client interface emitted 'end' on socket end.
  // This doesn't map to how we want things to operate in the future
  // but it will get removed when we remove this legacy interface.
  c.on('socket', function(s) {
    s.on('end', function() {
      if (self._decoder) {
        var ret = self._decoder.end();
        if (ret)
          self.emit('data', ret);
      }
      self.emit('end');
    });
  });
  return c;
};

exports.Client = util.deprecate(Client,
    'http.Client will be removed soon. Do not use it.');

exports.createClient = util.deprecate(function(port, host) {
  return new Client(port, host);
}, 'http.createClient is deprecated. Use `http.request` instead.');

},{"./_http_agent":59,"./_http_client":60,"./_http_common":61,"./_http_incoming":62,"./_http_outgoing":63,"./_http_server":64,"events":8,"util":32}],"net":[function(require,module,exports){
(function (process,Buffer){
/*global chrome */

/**
 * net
 * ===
 *
 * The net module provides you with an asynchronous network wrapper. It
 * contains methods for creating both servers and clients (called streams).
 * You can include this module with require('chrome-net')
 */

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var is = require('core-util-is')
var stream = require('stream')
var deprecate = require('util').deprecate
var timers = require('timers')

// Track open servers and sockets to route incoming sockets (via onAccept and onReceive)
// to the right handlers.
var servers = {}
var sockets = {}

if (typeof chrome !== 'undefined') {
  chrome.sockets.tcpServer.onAccept.addListener(onAccept)
  chrome.sockets.tcpServer.onAcceptError.addListener(onAcceptError)
  chrome.sockets.tcp.onReceive.addListener(onReceive)
  chrome.sockets.tcp.onReceiveError.addListener(onReceiveError)
}

function onAccept (info) {
  if (info.socketId in servers) {
    servers[info.socketId]._onAccept(info.clientSocketId)
  } else {
    console.error('Unknown server socket id: ' + info.socketId)
  }
}

function onAcceptError (info) {
  if (info.socketId in servers) {
    servers[info.socketId]._onAcceptError(info.resultCode)
  } else {
    console.error('Unknown server socket id: ' + info.socketId)
  }
}

function onReceive (info) {
  if (info.socketId in sockets) {
    sockets[info.socketId]._onReceive(info.data)
  } else {
    console.error('Unknown socket id: ' + info.socketId)
  }
}

function onReceiveError (info) {
  if (info.socketId in sockets) {
    sockets[info.socketId]._onReceiveError(info.resultCode)
  } else {
    if (info.resultCode === -100) return // net::ERR_CONNECTION_CLOSED
    console.error('Unknown socket id: ' + info.socketId)
  }
}

/**
 * Creates a new TCP server. The connectionListener argument is automatically
 * set as a listener for the 'connection' event.
 *
 * @param  {Object} options
 * @param  {function} listener
 * @return {Server}
 */
exports.createServer = function (options, listener) {
  return new Server(options, listener)
}

/**
 * net.connect(options, [connectionListener])
 * net.createConnection(options, [connectionListener])
 *
 * Constructs a new socket object and opens the socket to the given location.
 * When the socket is established, the 'connect' event will be emitted.
 *
 * For TCP sockets, options argument should be an object which specifies:
 *
 *   port: Port the client should connect to (Required).
 *   host: Host the client should connect to. Defaults to 'localhost'.
 *   localAddress: Local interface to bind to for network connections.
 *
 * ===============================================================
 *
 * net.connect(port, [host], [connectListener])
 * net.createConnection(port, [host], [connectListener])
 *
 * Creates a TCP connection to port on host. If host is omitted,
 * 'localhost' will be assumed. The connectListener parameter will be
 * added as an listener for the 'connect' event.
 *
 * @param {Object} options
 * @param {function} listener
 * @return {Socket}
 */
exports.connect = exports.createConnection = function () {
  var args = normalizeConnectArgs(arguments)
  var s = new Socket(args[0])
  return Socket.prototype.connect.apply(s, args)
}

inherits(Server, EventEmitter)

/**
 * Class: net.Server
 * =================
 *
 * This class is used to create a TCP server.
 *
 * Event: 'listening'
 *   Emitted when the server has been bound after calling server.listen.
 *
 * Event: 'connection'
 *   - Socket object The connection object
 *   Emitted when a new connection is made. socket is an instance of net.Socket.
 *
 * Event: 'close'
 *   Emitted when the server closes. Note that if connections exist, this event
 *   is not emitted until all connections are ended.
 *
 * Event: 'error'
 *   - Error Object
 *   Emitted when an error occurs. The 'close' event will be called directly
 *   following this event. See example in discussion of server.listen.
 */
function Server (/* [options], listener */) {
  var self = this
  if (!(self instanceof Server)) return new Server(arguments[0], arguments[1])
  EventEmitter.call(self)

  var options

  if (is.isFunction(arguments[0])) {
    options = {}
    self.on('connection', arguments[0])
  } else {
    options = arguments[0] || {}

    if (is.isFunction(arguments[1])) {
      self.on('connection', arguments[1])
    }
  }

  self._connections = 0

  Object.defineProperty(self, 'connections', {
    get: deprecate(function () {
      return self._connections
    }, 'connections property is deprecated. Use getConnections() method'),
    set: deprecate(function (val) {
      return (self._connections = val)
    }, 'connections property is deprecated. Use getConnections() method'),
    configurable: true, enumerable: false
  })

  self.id = null // a number > 0
  self._connecting = false

  self.allowHalfOpen = options.allowHalfOpen || false
  self.pauseOnConnect = !!options.pauseOnConnect
  self._address = null

  self._host = null
  self._port = null
  self._backlog = null
}
exports.Server = Server

Server.prototype._usingSlaves = false // not used

/**
 * server.listen(port, [host], [backlog], [callback])
 *
 * Begin accepting connections on the specified port and host. If the host is
 * omitted, the server will accept connections directed to any IPv4 address
 * (INADDR_ANY). A port value of zero will assign a random port.
 *
 * Backlog is the maximum length of the queue of pending connections. The
 * actual length will be determined by your OS through sysctl settings such as
 * tcp_max_syn_backlog and somaxconn on linux. The default value of this
 * parameter is 511 (not 512).
 *
 * This function is asynchronous. When the server has been bound, 'listening'
 * event will be emitted. The last parameter callback will be added as an
 * listener for the 'listening' event.
 *
 * @return {Socket}
 */
Server.prototype.listen = function (/* variable arguments... */) {
  var self = this

  var lastArg = arguments[arguments.length - 1]
  if (is.isFunction(lastArg)) {
    self.once('listening', lastArg)
  }

  var port = toNumber(arguments[0])

  var address

  // The third optional argument is the backlog size.
  // When the ip is omitted it can be the second argument.
  var backlog = toNumber(arguments[1]) || toNumber(arguments[2]) || undefined

  if (is.isObject(arguments[0])) {
    var h = arguments[0]

    if (h._handle || h.handle) {
      throw new Error('handle is not supported in Chrome Apps.')
    }
    if (is.isNumber(h.fd) && h.fd >= 0) {
      throw new Error('fd is not supported in Chrome Apps.')
    }

    // The first argument is a configuration object
    if (h.backlog) {
      backlog = h.backlog
    }

    if (is.isNumber(h.port)) {
      address = h.host || null
      port = h.port
    } else if (h.path && isPipeName(h.path)) {
      throw new Error('Pipes are not supported in Chrome Apps.')
    } else {
      throw new Error('Invalid listen argument: ' + h)
    }
  } else if (isPipeName(arguments[0])) {
    // UNIX socket or Windows pipe.
    throw new Error('Pipes are not supported in Chrome Apps.')
  } else if (is.isUndefined(arguments[1]) ||
             is.isFunction(arguments[1]) ||
             is.isNumber(arguments[1])) {
    // The first argument is the port, no IP given.
    address = null
  } else {
    // The first argument is the port, the second an IP.
    address = arguments[1]
  }

  // now do something with port, address, backlog

  if (self.id) {
    self.close()
  }

  // If port is invalid or undefined, bind to a random port.
  self._port = port | 0
  if (self._port < 0 || self._port > 65535) { // allow 0 for random port
    throw new RangeError('port should be >= 0 and < 65536: ' + self._port)
  }

  self._host = address

  var isAny6 = !self._host
  if (isAny6) {
    self._host = '::'
  }

  self._backlog = is.isNumber(backlog) ? backlog : undefined

  self._connecting = true

  chrome.sockets.tcpServer.create(function (createInfo) {
    if (!self._connecting || self.id) {
      ignoreLastError()
      chrome.sockets.tcpServer.close(createInfo.socketId)
      return
    }
    if (chrome.runtime.lastError) {
      self.emit('error', new Error(chrome.runtime.lastError.message))
      return
    }

    var socketId = self.id = createInfo.socketId
    servers[self.id] = self

    function listen () {
      chrome.sockets.tcpServer.listen(self.id, self._host, self._port,
          self._backlog, function (result) {
        // callback may be after close
        if (self.id !== socketId) {
          ignoreLastError()
          return
        }
        if (result !== 0 && isAny6) {
          ignoreLastError()
          self._host = '0.0.0.0' // try IPv4
          isAny6 = false
          return listen()
        }

        self._onListen(result)
      })
    }
    listen()
  })

  return self
}

Server.prototype._onListen = function (result) {
  var self = this
  self._connecting = false

  if (result === 0) {
    var idBefore = self.id
    chrome.sockets.tcpServer.getInfo(self.id, function (info) {
      if (self.id !== idBefore) {
        ignoreLastError()
        return
      }
      if (chrome.runtime.lastError) {
        self._onListen(-2) // net::ERR_FAILED
        return
      }

      self._address = {
        port: info.localPort,
        family: info.localAddress &&
          info.localAddress.indexOf(':') !== -1 ? 'IPv6' : 'IPv4',
        address: info.localAddress
      }
      self.emit('listening')
    })
  } else {
    self.emit('error', errnoException(result, 'listen'))
    chrome.sockets.tcpServer.close(self.id)
    delete servers[self.id]
    self.id = null
  }
}

Server.prototype._onAccept = function (clientSocketId) {
  var self = this

  // Set the `maxConnections` property to reject connections when the server's
  // connection count gets high.
  if (self.maxConnections && self._connections >= self.maxConnections) {
    chrome.sockets.tcp.close(clientSocketId)
    console.warn('Rejected connection - hit `maxConnections` limit')
    return
  }

  self._connections += 1

  var acceptedSocket = new Socket({
    server: self,
    id: clientSocketId,
    allowHalfOpen: self.allowHalfOpen,
    pauseOnCreate: self.pauseOnConnect
  })
  acceptedSocket.on('connect', function () {
    self.emit('connection', acceptedSocket)
  })
}

Server.prototype._onAcceptError = function (resultCode) {
  var self = this
  self.emit('error', errnoException(resultCode, 'accept'))
  self.close()
}

/**
 * Stops the server from accepting new connections and keeps existing
 * connections. This function is asynchronous, the server is finally closed
 * when all connections are ended and the server emits a 'close' event.
 * Optionally, you can pass a callback to listen for the 'close' event.
 * @param  {function} callback
 */
Server.prototype.close = function (callback) {
  var self = this

  if (callback) {
    if (!self.id) {
      self.once('close', function () {
        callback(new Error('Not running'))
      })
    } else {
      self.once('close', callback)
    }
  }

  if (self.id) {
    chrome.sockets.tcpServer.close(self.id)
    delete servers[self.id]
    self.id = null
  }
  self._address = null
  self._connecting = false

  self._emitCloseIfDrained()

  return self
}

Server.prototype._emitCloseIfDrained = function () {
  var self = this

  if (self.id || self._connecting || self._connections) {
    return
  }

  process.nextTick(function () {
    if (self.id || self._connecting || self._connections) {
      return
    }
    self.emit('close')
  })
}

/**
 * Returns the bound address, the address family name and port of the socket
 * as reported by the operating system. Returns an object with three
 * properties, e.g. { port: 12346, family: 'IPv4', address: '127.0.0.1' }
 *
 * @return {Object} information
 */
Server.prototype.address = function () {
  return this._address
}

Server.prototype.unref = function () {
  // No chrome.socket equivalent
}

Server.prototype.ref = function () {
  // No chrome.socket equivalent
}

/**
 * Asynchronously get the number of concurrent connections on the server.
 * Works when sockets were sent to forks.
 *
 * Callback should take two arguments err and count.
 *
 * @param  {function} callback
 */
Server.prototype.getConnections = function (callback) {
  var self = this
  process.nextTick(function () {
    callback(null, self._connections)
  })
}

inherits(Socket, stream.Duplex)

/**
 * Class: net.Socket
 * =================
 *
 * This object is an abstraction of a TCP or UNIX socket. net.Socket instances
 * implement a duplex Stream interface. They can be created by the user and
 * used as a client (with connect()) or they can be created by Node and passed
 * to the user through the 'connection' event of a server.
 *
 * Construct a new socket object.
 *
 * options is an object with the following defaults:
 *
 *   { fd: null // NO CHROME EQUIVALENT
 *     type: null
 *     allowHalfOpen: false // NO CHROME EQUIVALENT
 *   }
 *
 * `type` can only be 'tcp4' (for now).
 *
 * Event: 'connect'
 *   Emitted when a socket connection is successfully established. See
 *   connect().
 *
 * Event: 'data'
 *   - Buffer object
 *   Emitted when data is received. The argument data will be a Buffer or
 *   String. Encoding of data is set by socket.setEncoding(). (See the Readable
 *   Stream section for more information.)
 *
 *   Note that the data will be lost if there is no listener when a Socket
 *   emits a 'data' event.
 *
 * Event: 'end'
 *   Emitted when the other end of the socket sends a FIN packet.
 *
 *   By default (allowHalfOpen == false) the socket will destroy its file
 *   descriptor once it has written out its pending write queue. However,
 *   by setting allowHalfOpen == true the socket will not automatically
 *   end() its side allowing the user to write arbitrary amounts of data,
 *   with the caveat that the user is required to end() their side now.
 *
 * Event: 'timeout'
 *   Emitted if the socket times out from inactivity. This is only to notify
 *   that the socket has been idle. The user must manually close the connection.
 *
 *   See also: socket.setTimeout()
 *
 * Event: 'drain'
 *   Emitted when the write buffer becomes empty. Can be used to throttle
 *   uploads.
 *
 *   See also: the return values of socket.write()
 *
 * Event: 'error'
 *   - Error object
 *   Emitted when an error occurs. The 'close' event will be called directly
 *   following this event.
 *
 * Event: 'close'
 *   - had_error Boolean true if the socket had a transmission error
 *   Emitted once the socket is fully closed. The argument had_error is a
 *   boolean which says if the socket was closed due to a transmission error.
 */
function Socket (options) {
  var self = this
  if (!(self instanceof Socket)) return new Socket(options)

  if (is.isNumber(options)) {
    options = { fd: options } // Legacy interface.
  } else if (is.isUndefined(options)) {
    options = {}
  }

  if (options.handle) {
    throw new Error('handle is not supported in Chrome Apps.')
  } else if (!is.isUndefined(options.fd)) {
    throw new Error('fd is not supported in Chrome Apps.')
  }

  options.decodeStrings = true
  options.objectMode = false
  stream.Duplex.call(self, options)

  self.destroyed = false
  self._hadError = false // Used by _http_client.js
  self.id = null // a number > 0
  self._parent = null
  self._host = null
  self._port = null
  self._pendingData = null

  self.ondata = null
  self.onend = null

  self._init()
  self._reset()

  // default to *not* allowing half open sockets
  // Note: this is not possible in Chrome Apps, see https://crbug.com/124952
  self.allowHalfOpen = options.allowHalfOpen || false

  // shut down the socket when we're finished with it.
  self.on('finish', self.destroy)

  if (options.server) {
    self.server = options.server
    self.id = options.id
    sockets[self.id] = self

    if (options.pauseOnCreate) {
      // stop the handle from reading and pause the stream
      // (Already paused in Chrome version)
      self._readableState.flowing = false
    }

    // For incoming sockets (from server), it's already connected.
    self._connecting = true
    self.writable = true
    self._onConnect()
  }
}
exports.Socket = Socket

// called when creating new Socket, or when re-using a closed Socket
Socket.prototype._init = function () {
  var self = this

  // The amount of received bytes.
  self.bytesRead = 0

  self._bytesDispatched = 0
}

// called when creating new Socket, or when closing a Socket
Socket.prototype._reset = function () {
  var self = this

  self.remoteAddress = self.remotePort =
      self.localAddress = self.localPort = null
  self.remoteFamily = 'IPv4'
  self.readable = self.writable = false
  self._connecting = false
}

/**
 * socket.connect(port, [host], [connectListener])
 * socket.connect(options, [connectListener])
 *
 * Opens the connection for a given socket. If port and host are given, then
 * the socket will be opened as a TCP socket, if host is omitted, localhost
 * will be assumed. If a path is given, the socket will be opened as a unix
 * socket to that path.
 *
 * Normally this method is not needed, as net.createConnection opens the
 * socket. Use this only if you are implementing a custom Socket.
 *
 * This function is asynchronous. When the 'connect' event is emitted the
 * socket is established. If there is a problem connecting, the 'connect'
 * event will not be emitted, the 'error' event will be emitted with the
 * exception.
 *
 * The connectListener parameter will be added as an listener for the
 * 'connect' event.
 *
 * @param  {Object} options
 * @param  {function} cb
 * @return {Socket}   this socket (for chaining)
 */
Socket.prototype.connect = function () {
  var self = this
  var args = normalizeConnectArgs(arguments)
  var options = args[0]
  var cb = args[1]

  if (options.path) {
    throw new Error('Pipes are not supported in Chrome Apps.')
  }

  if (self.id) {
    // already connected, destroy and connect again
    self.destroy()
  }

  if (self.destroyed) {
    self._readableState.reading = false
    self._readableState.ended = false
    self._readableState.endEmitted = false
    self._writableState.ended = false
    self._writableState.ending = false
    self._writableState.finished = false
    self._writableState.errorEmitted = false
    self._writableState.length = 0
    self.destroyed = false
  }

  self._connecting = true
  self.writable = true

  self._host = options.host || 'localhost'
  self._port = Number(options.port)

  if (self._port < 0 || self._port > 65535 || isNaN(self._port)) {
    throw new RangeError('port should be >= 0 and < 65536: ' + options.port)
  }

  self._init()

  self._unrefTimer()

  if (is.isFunction(cb)) {
    self.once('connect', cb)
  }

  chrome.sockets.tcp.create(function (createInfo) {
    if (!self._connecting || self.id) {
      ignoreLastError()
      chrome.sockets.tcp.close(createInfo.socketId)
      return
    }
    if (chrome.runtime.lastError) {
      self.destroy(new Error(chrome.runtime.lastError.message))
      return
    }

    self.id = createInfo.socketId
    sockets[self.id] = self

    chrome.sockets.tcp.setPaused(self.id, true)

    chrome.sockets.tcp.connect(self.id, self._host, self._port, function (result) {
      // callback may come after call to destroy
      if (self.id !== createInfo.socketId) {
        ignoreLastError()
        return
      }
      if (result !== 0) {
        self.destroy(errnoException(result, 'connect'))
        return
      }

      self._unrefTimer()
      self._onConnect()
    })
  })

  return self
}

Socket.prototype._onConnect = function () {
  var self = this

  var idBefore = self.id
  chrome.sockets.tcp.getInfo(self.id, function (result) {
    if (self.id !== idBefore) {
      ignoreLastError()
      return
    }
    if (chrome.runtime.lastError) {
      self.destroy(new Error(chrome.runtime.lastError.message))
      return
    }

    self.remoteAddress = result.peerAddress
    self.remoteFamily = result.peerAddress &&
        result.peerAddress.indexOf(':') !== -1 ? 'IPv6' : 'IPv4'
    self.remotePort = result.peerPort
    self.localAddress = result.localAddress
    self.localPort = result.localPort

    self._connecting = false
    self.readable = true

    self.emit('connect')
    // start the first read, or get an immediate EOF.
    // this doesn't actually consume any bytes, because len=0
    // TODO: replace _readableState.flowing with isPaused() after https://github.com/substack/node-browserify/issues/1341
    if (self._readableState.flowing) self.read(0)
  })
}

/**
 * The number of characters currently buffered to be written.
 * @type {number}
 */
Object.defineProperty(Socket.prototype, 'bufferSize', {
  get: function () {
    var self = this
    if (self.id) {
      var bytes = this._writableState.length
      if (self._pendingData) bytes += self._pendingData.length
      return bytes
    }
  }
})

Socket.prototype.end = function (data, encoding) {
  var self = this
  stream.Duplex.prototype.end.call(self, data, encoding)
  self.writable = false
}

Socket.prototype._write = function (chunk, encoding, callback) {
  var self = this
  if (!callback) callback = function () {}

  if (self._connecting) {
    self._pendingData = chunk
    self.once('connect', function () {
      self._write(chunk, encoding, callback)
    })
    return
  }
  self._pendingData = null

  if (!this.id) {
    callback(new Error('This socket is closed.'))
    return
  }

  // assuming buffer is browser implementation (`buffer` package on npm)
  var buffer = chunk.buffer
  if (chunk.byteOffset || chunk.byteLength !== buffer.byteLength) {
    buffer = buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength)
  }

  var idBefore = self.id
  chrome.sockets.tcp.send(self.id, buffer, function (sendInfo) {
    if (self.id !== idBefore) {
      ignoreLastError()
      return
    }

    if (sendInfo.resultCode < 0) {
      self.destroy(errnoException(sendInfo.resultCode, 'write'), callback)
    } else {
      self._unrefTimer()
      callback(null)
    }
  })

  self._bytesDispatched += chunk.length
}

Socket.prototype._read = function (bufferSize) {
  var self = this
  if (self._connecting || !self.id) {
    self.once('connect', self._read.bind(self, bufferSize))
    return
  }

  chrome.sockets.tcp.setPaused(self.id, false)

  var idBefore = self.id
  chrome.sockets.tcp.getInfo(self.id, function (result) {
    if (self.id !== idBefore) {
      ignoreLastError()
      return
    }
    if (chrome.runtime.lastError || !result.connected) {
      self._onReceiveError(-15) // workaround for https://crbug.com/518161
    }
  })
}

Socket.prototype._onReceive = function (data) {
  var self = this
  // assuming buffer is browser implementation (`buffer` package on npm)
  var buffer = Buffer._augment(new Uint8Array(data))
  var offset = self.bytesRead

  self.bytesRead += buffer.length
  self._unrefTimer()

  if (self.ondata) {
    console.error('socket.ondata = func is non-standard, use socket.on(\'data\', func)')
    self.ondata(buffer, offset, self.bytesRead)
  }
  if (!self.push(buffer)) { // if returns false, then apply backpressure
    chrome.sockets.tcp.setPaused(self.id, true)
  }
}

Socket.prototype._onReceiveError = function (resultCode) {
  var self = this
  if (resultCode === -100) { // net::ERR_CONNECTION_CLOSED
    if (self.onend) {
      console.error('socket.onend = func is non-standard, use socket.on(\'end\', func)')
      self.once('end', self.onend)
    }
    self.push(null)
    self.destroy()
  } else if (resultCode < 0) {
    self.destroy(errnoException(resultCode, 'read'))
  }
}

/**
 * The amount of bytes sent.
 * @return {number}
 */
Object.defineProperty(Socket.prototype, 'bytesWritten', {
  get: function () {
    var self = this
    if (self.id) return self._bytesDispatched + self.bufferSize
  }
})

Socket.prototype.destroy = function (exception) {
  var self = this
  self._destroy(exception)
}

Socket.prototype._destroy = function (exception, cb) {
  var self = this

  function fireErrorCallbacks () {
    if (cb) cb(exception)
    if (exception && !self._writableState.errorEmitted) {
      process.nextTick(function () {
        self.emit('error', exception)
      })
      self._writableState.errorEmitted = true
    }
  }

  if (self.destroyed) {
    // already destroyed, fire error callbacks
    fireErrorCallbacks()
    return
  }

  if (self.server) {
    self.server._connections -= 1
    if (self.server._emitCloseIfDrained) self.server._emitCloseIfDrained()
    self.server = null
  }

  self._reset()

  for (var s = self; s !== null; s = s._parent) timers.unenroll(s)

  self.destroyed = true

  // If _destroy() has been called before chrome.sockets.tcp.create()
  // callback, we don't have an id. Therefore we don't need to close
  // or disconnect
  if (self.id) {
    delete sockets[self.id]
    chrome.sockets.tcp.close(self.id, function () {
      if (self.destroyed) {
        self.emit('close', !!exception)
      }
    })
    self.id = null
  }

  fireErrorCallbacks()
}

Socket.prototype.destroySoon = function () {
  var self = this

  if (self.writable) self.end()

  if (self._writableState.finished) self.destroy()
}

/**
 * Sets the socket to timeout after timeout milliseconds of inactivity on the socket.
 * By default net.Socket do not have a timeout. When an idle timeout is triggered the
 * socket will receive a 'timeout' event but the connection will not be severed. The
 * user must manually end() or destroy() the socket.
 *
 * If timeout is 0, then the existing idle timeout is disabled.
 *
 * The optional callback parameter will be added as a one time listener for the 'timeout' event.
 *
 * @param {number}   timeout
 * @param {function} callback
 */
Socket.prototype.setTimeout = function (timeout, callback) {
  var self = this

  if (timeout === 0) {
    timers.unenroll(self)
    if (callback) {
      self.removeListener('timeout', callback)
    }
  } else {
    timers.enroll(self, timeout)
    timers._unrefActive(self)
    if (callback) {
      self.once('timeout', callback)
    }
  }
}

Socket.prototype._onTimeout = function () {
  this.emit('timeout')
}

Socket.prototype._unrefTimer = function unrefTimer () {
  for (var s = this; s !== null; s = s._parent) {
    timers._unrefActive(s)
  }
}

/**
 * Disables the Nagle algorithm. By default TCP connections use the Nagle
 * algorithm, they buffer data before sending it off. Setting true for noDelay
 * will immediately fire off data each time socket.write() is called. noDelay
 * defaults to true.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {boolean} [noDelay] Optional
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.setNoDelay = function (noDelay, callback) {
  var self = this
  if (self.id) {
    // backwards compatibility: assume true when `enable` is omitted
    noDelay = is.isUndefined(noDelay) ? true : !!noDelay
    chrome.sockets.tcp.setNoDelay(self.id, noDelay, chromeCallbackWrap(callback))
  }
}

/**
 * Enable/disable keep-alive functionality, and optionally set the initial
 * delay before the first keepalive probe is sent on an idle socket. enable
 * defaults to false.
 *
 * Set initialDelay (in milliseconds) to set the delay between the last data
 * packet received and the first keepalive probe. Setting 0 for initialDelay
 * will leave the value unchanged from the default (or previous) setting.
 * Defaults to 0.
 *
 * NOTE: The Chrome version of this function is async, whereas the node
 * version is sync. Keep this in mind.
 *
 * @param {boolean} [enable] Optional
 * @param {number} [initialDelay]
 * @param {function} callback CHROME-SPECIFIC: Called when the configuration
 *                            operation is done.
 */
Socket.prototype.setKeepAlive = function (enable, initialDelay, callback) {
  var self = this
  if (self.id) {
    chrome.sockets.tcp.setKeepAlive(self.id, !!enable, ~~(initialDelay / 1000),
        chromeCallbackWrap(callback))
  }
}

/**
 * Returns the bound address, the address family name and port of the socket
 * as reported by the operating system. Returns an object with three
 * properties, e.g. { port: 12346, family: 'IPv4', address: '127.0.0.1' }
 *
 * @return {Object} information
 */
Socket.prototype.address = function () {
  var self = this
  return {
    address: self.localAddress,
    port: self.localPort,
    family: self.localAddress &&
      self.localAddress.indexOf(':') !== -1 ? 'IPv6' : 'IPv4'
  }
}

Object.defineProperty(Socket.prototype, 'readyState', {
  get: function () {
    var self = this
    if (self._connecting) {
      return 'opening'
    } else if (self.readable && self.writable) {
      return 'open'
    } else {
      return 'closed'
    }
  }
})

Socket.prototype.unref = function () {
  // No chrome.socket equivalent
}

Socket.prototype.ref = function () {
  // No chrome.socket equivalent
}

//
// EXPORTED HELPERS
//

// Source: https://developers.google.com/web/fundamentals/input/form/provide-real-time-validation#use-these-attributes-to-validate-input
var IPv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
var IPv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]).){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]).){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/

exports.isIPv4 = IPv4Regex.test.bind(IPv4Regex)
exports.isIPv6 = IPv6Regex.test.bind(IPv6Regex)

exports.isIP = function (ip) {
  return exports.isIPv4(ip) ? 4 : exports.isIPv6(ip) ? 6 : 0
}

//
// HELPERS
//

/**
 * Returns an array [options] or [options, cb]
 * It is the same as the argument of Socket.prototype.connect().
 */
function normalizeConnectArgs (args) {
  var options = {}

  if (is.isObject(args[0])) {
    // connect(options, [cb])
    options = args[0]
  } else if (isPipeName(args[0])) {
    // connect(path, [cb])
    throw new Error('Pipes are not supported in Chrome Apps.')
  } else {
    // connect(port, [host], [cb])
    options.port = args[0]
    if (is.isString(args[1])) {
      options.host = args[1]
    }
  }

  var cb = args[args.length - 1]
  return is.isFunction(cb) ? [options, cb] : [options]
}

function toNumber (x) {
  return (x = Number(x)) >= 0 ? x : false
}

function isPipeName (s) {
  return is.isString(s) && toNumber(s) === false
}

 // This prevents "Unchecked runtime.lastError" errors
function ignoreLastError () {
  chrome.runtime.lastError // call the getter function
}

function chromeCallbackWrap (callback) {
  return function () {
    var error
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message)
      error = new Error(chrome.runtime.lastError.message)
    }
    if (callback) callback(error)
  }
}

// Full list of possible error codes: https://code.google.com/p/chrome-browser/source/browse/trunk/src/net/base/net_error_list.h
// TODO: Try to reproduce errors in both node & Chrome Apps and extend this list
//       (what conditions lead to EPIPE?)
var errorChromeToUv = {
  '-10': 'EACCES',
  '-22': 'EACCES',
  '-138': 'EACCES',
  '-147': 'EADDRINUSE',
  '-108': 'EADDRNOTAVAIL',
  '-103': 'ECONNABORTED',
  '-102': 'ECONNREFUSED',
  '-101': 'ECONNRESET',
  '-16': 'EEXIST',
  '-8': 'EFBIG',
  '-109': 'EHOSTUNREACH',
  '-4': 'EINVAL',
  '-23': 'EISCONN',
  '-6': 'ENOENT',
  '-13': 'ENOMEM',
  '-106': 'ENONET',
  '-18': 'ENOSPC',
  '-11': 'ENOSYS',
  '-15': 'ENOTCONN',
  '-105': 'ENOTFOUND',
  '-118': 'ETIMEDOUT',
  '-100': 'EOF'
}
function errnoException (err, syscall) {
  var uvCode = errorChromeToUv[err] || 'UNKNOWN'
  var message = syscall + ' ' + err
  if (chrome.runtime.lastError) {
    message += ' ' + chrome.runtime.lastError.message
  }
  message += ' (mapped uv code: ' + uvCode + ')'
  var e = new Error(message)
  e.code = e.errno = uvCode
  // TODO: expose chrome error code; what property name?
  e.syscall = syscall
  return e
}

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":11,"buffer":3,"core-util-is":57,"events":8,"inherits":58,"stream":27,"timers":29,"util":32}],"path":[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

exports.parse = function(pathString) {
    assertPath(pathString);

    var allParts = splitPath(pathString);
    if (!allParts || allParts.length !== 4) {
        throw new TypeError("Invalid path '" + pathString + "'");
    }
    allParts[1] = allParts[1] || '';
    allParts[2] = allParts[2] || '';
    allParts[3] = allParts[3] || '';

    return {
        root: allParts[0],
        dir: allParts[0] + allParts[1].slice(0, allParts[1].length - 1),
        base: allParts[2],
        ext: allParts[3],
        name: allParts[2].slice(0, allParts[2].length - allParts[3].length)
    };
};

function assertPath(path) {
  if (typeof path !== 'string') {
    throw new TypeError('Path must be a string. Received ' +
                        util.inspect(path));
  }
}

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":11}],"util-deprecate":[function(require,module,exports){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Currently returns false but should read chrome-manifest.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  return false
}

},{}]},{},[327]);
