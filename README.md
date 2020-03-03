bmapflash
=========

> Flash an image using a `.bmap` file

[![npm version](https://badge.fury.io/js/bmapflash.svg)](http://badge.fury.io/js/bmapflash)
[![dependencies](https://david-dm.org/resin-io-modules/bmapflash.svg)](https://david-dm.org/resin-io-modules/bmapflash.svg)
[![Build Status](https://travis-ci.org/resin-io-modules/bmapflash.svg?branch=master)](https://travis-ci.org/resin-io-modules/bmapflash)
[![Build status](https://ci.appveyor.com/api/projects/status/4x5uis7gro2v8vbq/branch/master?svg=true)](https://ci.appveyor.com/project/resin-io/bmapflash/branch/master)

Installation
------------

Install `bmapflash` by running:

```sh
$ npm install --save bmapflash
```

Documentation
-------------


* [bmapflash](#module_bmapflash)
    * [.flashImageToFileDescriptor(imageStream, deviceFileDescriptor, bmapContents, [options])](#module_bmapflash.flashImageToFileDescriptor) ⇒ <code>EventEmitter</code>
    * [.validateFlashedImage(deviceFileDescriptor, bmapContents)](#module_bmapflash.validateFlashedImage) ⇒ <code>EventEmitter</code>

<a name="module_bmapflash.flashImageToFileDescriptor"></a>

### bmapflash.flashImageToFileDescriptor(imageStream, deviceFileDescriptor, bmapContents, [options]) ⇒ <code>EventEmitter</code>
**Kind**: static method of [<code>bmapflash</code>](#module_bmapflash)  
**Summary**: Flash image to file descriptor  
**Returns**: <code>EventEmitter</code> - event emitter  
**Access**: public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| imageStream | <code>ReadableStream</code> |  | image stream |
| deviceFileDescriptor | <code>Number</code> |  | device file descriptor |
| bmapContents | <code>String</code> |  | bmap contents |
| [options] | <code>Object</code> | <code>{}</code> | options |
| [options.bytesToZeroOutFromTheBeginning] | <code>Number</code> | <code>0</code> | bytes to zero out from the beginning |

**Example**  
```js
fs.open('/dev/rdisk2', 'rs+', (error, fd) => {
  if (error) {
    throw error;
  }

  fs.readFile('my/image.bmap', {
    encoding: 'utf8'
  }, (error, bmapContents) => {
    if (error) {
      throw error;
    }

    const image = fs.createReadStream('path/to/image.img');

    const flasher = bmapflash.flashImageToFileDescriptor(image, fd, bmapContents);

    flasher.on('progress', (state) => {
      console.log(state);
    });

    flasher.on('error', (error) {
      throw error;
    });

    flasher.on('done', () => {
      console.log('Done!');
    });
  });
});
```
<a name="module_bmapflash.validateFlashedImage"></a>

### bmapflash.validateFlashedImage(deviceFileDescriptor, bmapContents) ⇒ <code>EventEmitter</code>
This function reads all the mapped blocks as specified by the `.bmap`
file, generates checksums, and compares them to the checksums specified
in the `.bmap` file.

The returned event emitter might emit the following events:

- `done (Object[])`: Emitted when all the blocks have been scanned.
  This event passes as an argument an array of objects containing the
  ranges that did not pass validation.

- `error (Error)`: Emitted when an error happened.

- `progress (Object)`: Emitted regularly, passing an object containing
  progress state information.

**Kind**: static method of [<code>bmapflash</code>](#module_bmapflash)  
**Summary**: Validate flashed image  
**Returns**: <code>EventEmitter</code> - event emitter  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| deviceFileDescriptor | <code>Number</code> | device file descriptor |
| bmapContents | <code>String</code> | bmap contents |

**Example**  
```js
fs.open('/dev/rdisk2', 'rs+', (error, fd) => {
  if (error) {
    throw error;
  }

  fs.readFile('my/image.bmap', {
    encoding: 'utf8'
  }, (error, bmapContents) => {
    if (error) {
      throw error;
    }

    const validator = bmapflash.validateFlashedImage(fd, bmapContents);

    validator.on('progress', (state) => {
      console.log(state);
    });

    validator.on('error', (error) {
      throw error;
    });

    validator.on('done', (invalidRanges) => {
      if (invalidRanges.length !== 0) {
        console.log('Validation was not successful');
      }
    });
  });
});
```

Support
-------

If you're having any problem, please [raise an issue](https://github.com/resin-io-modules/bmapflash/issues/new) on GitHub and the Resin.io team will be happy to help.

Tests
-----

Run the test suite by doing:

```sh
$ npm test
```

Contribute
----------

- Issue Tracker: [github.com/resin-io-modules/bmapflash/issues](https://github.com/resin-io-modules/bmapflash/issues)
- Source Code: [github.com/resin-io-modules/bmapflash](https://github.com/resin-io-modules/bmapflash)

Before submitting a PR, please make sure that you include tests, and that [jshint](http://jshint.com) runs without any warning:

```sh
$ npm run lint
```

License
-------

`bmapflash` is free software, and may be redistributed under the terms specified in the [license](https://github.com/resin-io-modules/bmapflash/blob/master/LICENSE).
