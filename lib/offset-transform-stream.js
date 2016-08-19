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

const through2 = require('through2');
const bmapFile = require('./bmap-file');

/**
 * @summary Offset transform stream
 * @function
 * @public
 *
 * @description
 * This stream transforms an image stream to an object
 * stream that only contains the blocks that should
 * be written according to the bmap file contents.
 *
 * @param {Object} bmap - bmap parsed object
 * @return {TransformStream} offset transform stream
 *
 * @example
 * fs.readFileAsync('path/to/image.bmap', {
 *   encoding: 'utf8'
 * })
 * .then(bmapFile.parse)
 * .then((bmap) => {
 *   fs.createReadStream('path/to/image.bmap')
 *     .pipe(offsetTransformStream(bmap));
 * });
 */
module.exports = (bmap) => {
  const blockBooleanHash = bmapFile.createBlockBooleanHash(bmap);
  let currentBlock = 0;
  let currentChunk = null;

  return through2.obj(function(chunk, encoding, callback) {
    const pushCurrentChunk = () => {
      if (currentChunk) {
        this.push({
          data: Buffer.concat(currentChunk.data, currentChunk.data.length * bmap.blockSize),
          offset: currentChunk.offset
        });
        currentChunk = null;
      }
    };

    if (!bmapFile.shouldWriteBlock(blockBooleanHash, currentBlock)) {
      currentBlock += 1;
      pushCurrentChunk();
      return callback();
    }

    if (!currentChunk) {
      currentChunk = {
        block: currentBlock,
        offset: currentBlock * bmap.blockSize,
        data: [ chunk ]
      };

    // Are we in the final block?
    } else if (currentBlock === bmap.blocksCount - 1) {
      currentChunk.data.push(chunk);
      pushCurrentChunk();

    // Is this a consecutive non-hole block?
    } else if (currentChunk.block === currentBlock - 1) {

      currentChunk.data.push(chunk);
      currentChunk.block += 1;

      // Don't push more than 1 MB worth of data at once,
      // otherwise we might run some time without emitting
      // progress information.
      if (currentChunk.data.length >= 1024 * 1024 / bmap.blockSize) {
        pushCurrentChunk();
      }

    }

    currentBlock += 1;
    return callback();
  });
};
