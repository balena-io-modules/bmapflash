/*
 * Copyright 2016 Resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs'));

/**
 * @summary Zero out a section of a file descriptor
 * @function
 * @public
 *
 * @param {Number} fileDescriptor - file descriptor
 * @param {Object} options = options
 * @param {Number} options.from - starting point
 * @param {Number} options.count - number of bytes to zero out
 * @returns {Promise}
 *
 * @example
 * const fd = fs.openSync('path/to/file', 'rw');
 *
 * utils.zeroify(fd, {
 *   from: 0,
 *   count: 512 * 1024
 * }).then(() => {
 *   console.log(`The first 524288 bytes were zeroed out!`);
 * });
 */
exports.zeroify = (fileDescriptor, options) => {

  // Writing a zero-byte buffer to a common file doesn't
  // result in any issue (the file is basically not written),
  // however doing the same on a block device results in `EIO`.
  if (options.count === 0) {
    return Bluebird.resolve();
  }

  const nullBuffer = Buffer.alloc(options.count, 0);
  return fs.writeAsync(fileDescriptor, nullBuffer, 0, options.count, options.from);
};
