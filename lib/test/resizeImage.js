'use strict';

require('any-promise/register/bluebird');
//const fs = require('fs-promise');
const gm = require('gm').subClass({imageMagick: true});
const BPromise = require('any-promise');
BPromise.promisifyAll(gm.prototype);
//const filename = 'webshot.png';

function resizeImage(filename, width) {
  // [308, 230], [154, 115]
  let ext = filename.split('.').pop();
  const tmpFolderPath = '../../temp/';
  const srcPath = tmpFolderPath + filename;
  const dstPath = tmpFolderPath + filename.split('.')[0] + '-' + width + '.' + ext;

  return gm(srcPath).resize(width).noProfile().writeAsync(dstPath).then(() => {
    console.log('resized successfully');
  })
  .catch(err => console.log(err));
}

resizeImage('webshot.jpg', 308);
