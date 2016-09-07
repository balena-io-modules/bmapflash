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
const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs'));
const tmp = require('tmp');
const utils = require('../lib/utils');

const readFileContentsAsArray = (file) => {
  return fs.readFileAsync(file).then((data) => {
    return JSON.parse(JSON.stringify(data)).data;
  });
};

describe('Utils', function() {

  describe('.zeroify()', function() {

    // Create a file containing 32 1 bytes for testing purposes
    beforeEach(function() {
      this.file = tmp.fileSync();
      const buffer = Buffer.alloc(32, 1);
      fs.writeSync(this.file.fd, buffer, 0, buffer.length, 0);
    });

    it('should do nothing if count equals zero', function(done) {
      readFileContentsAsArray(this.file.name).then((data) => {
        m.chai.expect(data).to.deep.equal([
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);

        return utils.zeroify(this.file.fd, {
          from: 0,
          count: 0
        });
      }).then(() => {
        return readFileContentsAsArray(this.file.name);
      }).then((data) => {
        m.chai.expect(data).to.deep.equal([
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);
      }).asCallback(done);
    });

    it('should be able to zero out a single byte from the beginning', function(done) {
      readFileContentsAsArray(this.file.name).then((data) => {
        m.chai.expect(data).to.deep.equal([
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);

        return utils.zeroify(this.file.fd, {
          from: 0,
          count: 1
        });
      }).then(() => {
        return readFileContentsAsArray(this.file.name);
      }).then((data) => {
        m.chai.expect(data).to.deep.equal([
          0, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);
      }).asCallback(done);
    });

    it('should be able to zero out multiple bytes from the beginning', function(done) {
      readFileContentsAsArray(this.file.name).then((data) => {
        m.chai.expect(data).to.deep.equal([
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);

        return utils.zeroify(this.file.fd, {
          from: 0,
          count: 5
        });
      }).then(() => {
        return readFileContentsAsArray(this.file.name);
      }).then((data) => {
        m.chai.expect(data).to.deep.equal([
          0, 0, 0, 0, 0, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);
      }).asCallback(done);
    });

    it('should be able to zero out a single byte from the middle of the file', function(done) {
      readFileContentsAsArray(this.file.name).then((data) => {
        m.chai.expect(data).to.deep.equal([
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);

        return utils.zeroify(this.file.fd, {
          from: 8,
          count: 1
        });
      }).then(() => {
        return readFileContentsAsArray(this.file.name);
      }).then((data) => {
        m.chai.expect(data).to.deep.equal([
          1, 1, 1, 1, 1, 1, 1, 1,
          0, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);
      }).asCallback(done);
    });

    it('should be able to zero out multiple bytes from the middle of the file', function(done) {
      readFileContentsAsArray(this.file.name).then((data) => {
        m.chai.expect(data).to.deep.equal([
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);

        return utils.zeroify(this.file.fd, {
          from: 8,
          count: 3
        });
      }).then(() => {
        return readFileContentsAsArray(this.file.name);
      }).then((data) => {
        m.chai.expect(data).to.deep.equal([
          1, 1, 1, 1, 1, 1, 1, 1,
          0, 0, 0, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1
        ]);
      }).asCallback(done);
    });

  });

});
