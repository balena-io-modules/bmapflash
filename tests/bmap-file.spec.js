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

const m = require('mochainon');
const path = require('path');
const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs'));
const bmapFile = require('../lib/bmap-file');

const testBmapParse = (xmlFile, jsonFile) => {
  return Bluebird.props({
    bmap: fs.readFileAsync(xmlFile, {
      encoding: 'utf8'
    }).then(bmapFile.parse),
    json: fs.readFileAsync(jsonFile, {
      encoding: 'utf8'
    }).then((contents) => {
      return JSON.parse(contents);
    })
  }).then((results) => {
    m.chai.expect(results.bmap).to.deep.equal(results.json);
  });
};

describe('Bmap File', function() {

  describe('.parse()', function() {

    const BMAP_FILES = path.join(__dirname, 'bmap-xml');

    it('should be able to parse a bmap v1.4 file', function(done) {
      const xmlFile = path.join(BMAP_FILES, '1.4.bmap');
      const jsonFile = path.join(BMAP_FILES, '1.4.json');
      return testBmapParse(xmlFile, jsonFile).asCallback(done);
    });

    it('should be able to parse a bmap v1.1 file', function(done) {
      const xmlFile = path.join(BMAP_FILES, '1.1.bmap');
      const jsonFile = path.join(BMAP_FILES, '1.1.json');
      return testBmapParse(xmlFile, jsonFile).asCallback(done);
    });

    it('should be able to parse a bmap v2.0 file', function(done) {
      const xmlFile = path.join(BMAP_FILES, '2.0.bmap');
      const jsonFile = path.join(BMAP_FILES, '2.0.json');
      return testBmapParse(xmlFile, jsonFile).asCallback(done);
    });

  });

  describe('.isVersionSupported()', function() {

    it('should support 1.1', function() {
      m.chai.expect(bmapFile.isVersionSupported('1.1')).to.be.true;
    });

    it('should support 1.4', function() {
      m.chai.expect(bmapFile.isVersionSupported('1.4')).to.be.true;
    });

    it('should return false if the version is not supported', function() {
      m.chai.expect(bmapFile.isVersionSupported('99.9')).to.be.false;
    });

  });

  describe('.createBlockBooleanHash()', function() {

    it('should consider everything to be a whole if no ranges', function() {
      const blockBooleanHash = bmapFile.createBlockBooleanHash({
        blocksCount: 8,
        ranges: []
      });

      m.chai.expect(blockBooleanHash).to.deep.equal({
        0: false,
        1: false,
        2: false,
        3: false,
        4: false,
        5: false,
        6: false,
        7: false
      });
    });

    it('should set holes to false', function() {
      const blockBooleanHash = bmapFile.createBlockBooleanHash({
        blocksCount: 8,
        ranges: [
          {
            from: 0,
            to: 1
          },
          {
            from: 4,
            to: 7
          }
        ]
      });

      m.chai.expect(blockBooleanHash).to.deep.equal({
        0: true,
        1: true,
        2: false,
        3: false,
        4: true,
        5: true,
        6: true,
        7: true
      });
    });

    it('should accept ranges with the same from/to points', function() {
      const blockBooleanHash = bmapFile.createBlockBooleanHash({
        blocksCount: 8,
        ranges: [
          {
            from: 0,
            to: 0
          },
          {
            from: 4,
            to: 4
          }
        ]
      });

      m.chai.expect(blockBooleanHash).to.deep.equal({
        0: true,
        1: false,
        2: false,
        3: false,
        4: true,
        5: false,
        6: false,
        7: false
      });
    });

  });

  describe('.shouldWriteBlock()', function() {

    const blockBooleanHash = bmapFile.createBlockBooleanHash({
      blocksCount: 8,
      ranges: [
        {
          from: 0,
          to: 0
        },
        {
          from: 4,
          to: 4
        }
      ]
    });

    it('should return true if the block is in the block hash', function() {
      m.chai.expect(bmapFile.shouldWriteBlock(blockBooleanHash, 4)).to.be.true;
    });

    it('should return false if the block is not in the block hash', function() {
      m.chai.expect(bmapFile.shouldWriteBlock(blockBooleanHash, 2)).to.be.false;
    });

    it('should cast to boolean automatically', function() {
      m.chai.expect(bmapFile.shouldWriteBlock(blockBooleanHash, 9999)).to.be.false;
    });

  });

});
