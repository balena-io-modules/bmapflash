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
const StreamTest = require('streamtest');
const OffsetWriteStream = require('../lib/offset-write-stream');

describe('OffsetWriteStream', function() {

  describe('given a mock buffer array', function() {

    beforeEach(function() {
      this.file = [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
      ];
    });

    StreamTest.versions.forEach(function(version) {

      describe('for ' + version + ' streams', function() {

        it('should write at the expected offsets', function(done) {
          const self = this;

          StreamTest[version].fromObjects([
            {
              offset: 0,
              data: [ 1, 1 ]
            },
            {
              offset: 3,
              data: [ 1 ]
            },
            {
              offset: 4,
              data: [ 1 ]
            },
            {
              offset: 8,
              data: [ 1, 1, 1, 1, 1, 1 ]
            }
          ]).pipe(new OffsetWriteStream({
            write: (data, offset, callback) => {
              Reflect.apply(self.file.splice, self.file, [
                offset,
                data.length
              ].concat(data));

              return callback();
            }
          })).on('finish', function() {
            m.chai.expect(self.file).to.deep.equal([
              1, 1, 0, 1,
              1, 0, 0, 0,
              1, 1, 1, 1,
              1, 1, 0, 0
            ]);

            done();
          });
        });

      });

    });

  });

});
