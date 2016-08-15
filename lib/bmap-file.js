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

const _ = require('lodash');
const Bluebird = require('bluebird');
const xml2js = require('xml2js');
const xmlParser = Bluebird.promisifyAll(new xml2js.Parser());

/**
 * @summary Parse a bmap file contents
 * @function
 * @public
 *
 * @param {String} contents - bmap file contents
 * @fulfil {Object} - parsed bmap contents
 * @returns {Promise}
 *
 * @example
 * const Bluebird = require('bluebird');
 * const fs = Bluebird.promisifyAll(require('fs'));
 *
 * fs.readFileAsync('path/to/image.bmap', {
 *   encoding: 'utf8'
 * }).then(bmapFile.parse).then((bmap) => {
 *   console.log(bmap);
 * });
 */
exports.parse = (contents) => {
  return xmlParser.parseStringAsync(contents).get('bmap').then((result) => {
    const parseStringProperty = _.flow([ _.get, _.first, _.trim ]);
    const parseNumberProperty = _.flow([ parseStringProperty, _.parseInt ]);

    return {
      version: result.$.version,
      checksumType: parseStringProperty(result, 'ChecksumType') || 'sha1',
      imageSize: parseNumberProperty(result, 'ImageSize'),
      blocksCount: parseNumberProperty(result, 'BlocksCount'),
      mappedBlocksCount: parseNumberProperty(result, 'MappedBlocksCount'),
      blockSize: parseNumberProperty(result, 'BlockSize'),
      ranges: _.map(_.first(result.BlockMap).Range, (details) => {
        const range = _.split(_.trim(_.get(details, '_')), '-');
        return {
          from: _.parseInt(_.first(range)),
          to: _.parseInt(_.last(range)),
          checksum: details.$.chksum || details.$.sha1
        };
      })
    };
  });
};

/**
 * @summary Determine if a version is officially supported by the parser
 * @function
 * @public
 *
 * @param {String} version - version
 * @returns {Boolean} whether the version is supported
 *
 * if (bmapFile.isVersionSupported('1.1')) {
 *   console.log('This version is supported');
 * }
 */
exports.isVersionSupported = (version) => {
  return _.includes([
    '1.1',
    '1.3',
    '1.4',
    '2.0'
  ], version);
};

/**
 * @summary Create a block boolean ranges hash
 * @function
 * @public
 *
 * @description
 * This function parses the bmap ranges and outputs
 * a data structure that allows the writer to determine
 * if a block should be omitted in `O(1)`.
 *
 * The data structure this function returns is simply an object,
 * containing every possible block number as key, and boolean
 * values to signify if the block should be written or not.
 *
 * @param {Object} bmap - bmap parsed file
 * @returns {Object} block boolean ranges hash
 *
 * @example
 * const Bluebird = require('bluebird');
 * const fs = Bluebird.promisifyAll(require('fs'));
 *
 * fs.readFileAsync('path/to/image.bmap', {
 *   encoding: 'utf8'
 * })
 * .then(bmapFile.parse)
 * .then(bmapFile.createBlockBooleanHash)
 * .then((blockBooleanHash) => {
 *   console.log(blockBooleanHash);
 * });
 */
exports.createBlockBooleanHash = (bmap) => {
  return _.reduce(_.range(bmap.blocksCount), (accumulator, value) => {
    accumulator[value] = Boolean(_.find(bmap.ranges, (range) => {
      return range.from <= value && value <= range.to;
    }));

    return accumulator;
  }, {});
};

/**
 * @summary Check if a block should be written
 * @function
 * @public
 *
 * @param {Object} blockBooleanHash - block boolean hash
 * @param {Number} blockNumber - block number
 * @returns {Boolean} whether the block should be written
 *
 * @example
 * fs.readFileAsync('path/to/image.bmap', {
 *   encoding: 'utf8'
 * })
 * .then(bmapFile.parse)
 * .then(bmapFile.createBlockBooleanHash)
 * .then((blockBooleanHash) => {
 *   if (bmapFile.shouldWriteBlock(blockBooleanHash, 512)) {
 *     console.log('This block should be written');
 *   }
 * });
 */
exports.shouldWriteBlock = (blockBooleanHash, blockNumber) => {
  return Boolean(blockBooleanHash[blockNumber]);
};
