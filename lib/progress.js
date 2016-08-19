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
const progressStream = require('progress-stream');

module.exports = class Progress {

  /**
   * @summary Progress reporter
   * @name Progress
   * @class
   * @public
   *
   * @description
   * This is just a convenient wrapper around `progress-stream`
   * that allows us to make use of all its goodies without streams.
   *
   * @param {Object} options - options
   * @param {Number} [options.length=0] - total length
   * @param {Number} [options.time=500] - report time interval
   * @param {Function} options.callback - callback (state)
   *
   * @example
   * const progress = new Progress({
   *   length: 4096 * 256,
   *   callback: (state) => {
   *     console.log(state);
   *   }
   * });
   */
  constructor(options) {

    _.defaults(options, {
      length: 0,
      time: 500,
      callback: _.noop
    });

    // Prevent callback from being called too often
    this.callback = _.throttle((state) => {
      this._pendingProgress = false;
      return options.callback(state);
    }, options.time);

    this._progress = progressStream({
      length: options.length,
      drain: true
    });
  }

  /**
   * @summary Tick progress
   * @method
   * @public
   *
   * @param {*} data - data
   *
   * @example
   * const progress = new Progress({
   *   length: 4096 * 256,
   *   callback: (state) => {
   *     console.log(state);
   *   }
   * });
   *
   * progress.tick(Buffer.alloc(512));
   */
  tick(data) {
    this._pendingProgress = true;
    this._progress.write(data, () => {
      return this.callback(this._progress.progress());
    });
  }

  /**
   * @summary Stop progress
   * @method
   * @public
   *
   * @param {Function} callback - callback (error)
   *
   * @example
   * const progress = new Progress({
   *   length: 4096 * 256,
   *   callback: (state) => {
   *     console.log(state);
   *   }
   * });
   *
   * progress.stop(() => {
   *   console.log('Done!');
   * });
   */
  stop(callback) {
    if (this._pendingProgress) {
      setTimeout(() => {
        this.stop(callback);
      }, 500);

      return;
    }

    this._progress.end();
    callback();
  }

};
