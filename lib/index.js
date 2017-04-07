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

/**
 * @module bmapflash
 */

const Bluebird = require('bluebird');
const _ = require('lodash');
const EventEmitter = require('events').EventEmitter;
const fs = Bluebird.promisifyAll(require('fs'));
const streamChunker = require('stream-chunker');
const OffsetWriteStream = require('./offset-write-stream');
const offsetTransformStream = require('./offset-transform-stream');
const bmapFile = require('./bmap-file');
const hash = require('./hash');
const utils = require('./utils');
const Progress = require('./progress');

/**
 * @summary Flash image to file descriptor
 * @function
 * @public
 *
 * The returned event emitter might emit the following events:
 *
 * - `done`: Emitted when all the blocks have been written.
 *
 * - `error (Error)`: Emitted when an error happened.
 *
 * - `progress (Object)`: Emitted regularly, passing an object containing
 *   progress state information.
 *
 * @param {ReadableStream} imageStream - image stream
 * @param {Number} deviceFileDescriptor - device file descriptor
 * @param {String} bmapContents - bmap contents
 * @param {Object} [options={}] - options
 * @param {Number} [options.bytesToZeroOutFromTheBeginning=0] - bytes to zero out from the beginning
 * @returns {EventEmitter} event emitter
 *
 * @example
 * fs.open('/dev/rdisk2', 'rs+', (error, fd) => {
 *   if (error) {
 *     throw error;
 *   }
 *
 *   fs.readFile('my/image.bmap', {
 *     encoding: 'utf8'
 *   }, (error, bmapContents) => {
 *     if (error) {
 *       throw error;
 *     }
 *
 *     const image = fs.createReadStream('path/to/image.img');
 *
 *     const flasher = bmapflash.flashImageToFileDescriptor(image, fd, bmapContents);
 *
 *     flasher.on('progress', (state) => {
 *       console.log(state);
 *     });
 *
 *     flasher.on('error', (error) {
 *       throw error;
 *     });
 *
 *     flasher.on('done', () => {
 *       console.log('Done!');
 *     });
 *   });
 * });
 */
exports.flashImageToFileDescriptor = (imageStream, deviceFileDescriptor, bmapContents, options) => {
  const emitter = new EventEmitter();

  bmapFile.parse(bmapContents).then((bmap) => {

    if (!bmapFile.isVersionSupported(bmap.version)) {
      throw new Error(`Unsupported bmap version: ${bmap.version}`);
    }

    const progress = new Progress({
      length: bmap.mappedBlocksCount * bmap.blockSize,
      callback: (state) => {
        emitter.emit('progress', state);
      }
    });

    return utils.zeroify(deviceFileDescriptor, {
      from: 0,
      count: _.get(options, 'bytesToZeroOutFromTheBeginning', 0)
    }).then(() => {
      return new Bluebird((resolve, reject) => {
        imageStream
          .pipe(streamChunker(bmap.blockSize, {
            flush: true,
            align: true
          }))
          .on('error', reject)
          .pipe(offsetTransformStream(bmap))
          .on('error', reject)
          .pipe(new OffsetWriteStream({
            write: (data, offset, callback) => {
              fs.write(deviceFileDescriptor, data, 0, data.length, offset, (error) => {
                if (error) {
                  return callback(error);
                }

                progress.tick(data);
                return callback();
              });
            }
          }))
          .on('error', reject)
          .on('finish', () => {
            progress.stop(resolve);
          });
      });
    });

  }).then(() => {
    return emitter.emit('done');
  }).catch((error) => {
    return emitter.emit('error', error);
  });

  return emitter;
};

/**
 * @summary Validate flashed image
 * @function
 * @public
 *
 * @description
 * This function reads all the mapped blocks as specified by the `.bmap`
 * file, generates checksums, and compares them to the checksums specified
 * in the `.bmap` file.
 *
 * The returned event emitter might emit the following events:
 *
 * - `done (Object[])`: Emitted when all the blocks have been scanned.
 *   This event passes as an argument an array of objects containing the
 *   ranges that did not pass validation.
 *
 * - `error (Error)`: Emitted when an error happened.
 *
 * - `progress (Object)`: Emitted regularly, passing an object containing
 *   progress state information.
 *
 * @param {Number} deviceFileDescriptor - device file descriptor
 * @param {String} bmapContents - bmap contents
 * @returns {EventEmitter} event emitter
 *
 * @example
 * fs.open('/dev/rdisk2', 'rs+', (error, fd) => {
 *   if (error) {
 *     throw error;
 *   }
 *
 *   fs.readFile('my/image.bmap', {
 *     encoding: 'utf8'
 *   }, (error, bmapContents) => {
 *     if (error) {
 *       throw error;
 *     }
 *
 *     const validator = bmapflash.validateFlashedImage(fd, bmapContents);
 *
 *     validator.on('progress', (state) => {
 *       console.log(state);
 *     });
 *
 *     validator.on('error', (error) {
 *       throw error;
 *     });
 *
 *     validator.on('done', (invalidRanges) => {
 *       if (invalidRanges.length !== 0) {
 *         console.log('Validation was not successful');
 *       }
 *     });
 *   });
 * });
 */
exports.validateFlashedImage = (deviceFileDescriptor, bmapContents) => {
  const emitter = new EventEmitter();
  const invalidChunks = [];

  bmapFile.parse(bmapContents).then((bmap) => {

    if (!bmapFile.isVersionSupported(bmap.version)) {
      throw new Error(`Unsupported bmap version: ${bmap.version}`);
    }

    const progress = new Progress({
      length: bmap.mappedBlocksCount * bmap.blockSize,
      callback: (state) => {
        emitter.emit('progress', state);
      }
    });

    return Bluebird.each(bmap.ranges, (range) => {
      const position = range.from * bmap.blockSize;
      const length = (range.to - range.from + 1) * bmap.blockSize;
      const data = [];

      return new Bluebird((resolve, reject) => {
        fs.createReadStream(null, {
          fd: deviceFileDescriptor,
          autoClose: false,
          start: position,
          end: position + length - 1
        })
        .on('error', reject)
        .on('data', (chunk) => {
          data.push(chunk);
          progress.tick(chunk);
        })
        .on('end', () => {
          const checksum = hash.calculateChecksum(Buffer.concat(data), bmap.checksumType);

          if (checksum !== range.checksum) {
            invalidChunks.push(range);
          }

          return resolve();
        });
      });
    }).then(() => {
      return new Bluebird((resolve) => {
        return progress.stop(resolve);
      });
    });
  }).then(() => {
    return emitter.emit('done', invalidChunks);
  }).catch((error) => {
    return emitter.emit('error', error);
  });

  return emitter;
};
