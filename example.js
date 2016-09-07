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

const fs = require('fs');
const bmapflash = require('./lib');

const BMAP_FILE = process.argv[2];
const IMAGE_FILE = process.argv[3];
const DEVICE = process.argv[4];

if (!BMAP_FILE || !IMAGE_FILE || !DEVICE) {
  console.error('Usage: <bmap_file> <image_file> <device>');
  process.exit(1);
}

const imageStream = fs.createReadStream(IMAGE_FILE);
const deviceFileDescriptor = fs.openSync(DEVICE, 'rs+');
const bmapContents = fs.readFileSync(BMAP_FILE, {
  encoding: 'utf8'
});

const flasher = bmapflash.flashImageToFileDescriptor(
  imageStream,
  deviceFileDescriptor,
  bmapContents, {
    bytesToZeroOutFromTheBeginning: 65536 * 16
  }
);

flasher.on('error', (error) => {
  console.error(error);
  fs.closeSync(deviceFileDescriptor);
});

flasher.on('progress', (state) => {
  console.log(state);
});

flasher.on('done', (error) => {
  console.log('Validating...');

  const validator = bmapflash.validateFlashedImage(deviceFileDescriptor, bmapContents);

  validator.on('error', (error) => {
    console.error(error);
    fs.closeSync(deviceFileDescriptor);
  });

  validator.on('progress', (state) => {
    console.log(state);
  });

  validator.on('done', (invalidChunks) => {
    console.log('Done!');

    if (invalidChunks.length > 0) {
      console.log('Some blocks were not written correctly:');
      console.log(invalidChunks);
    }

    fs.closeSync(deviceFileDescriptor);
  });
});

