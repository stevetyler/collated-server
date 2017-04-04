'use strict';

require('any-promise/register/bluebird');
const gm = require('gm').subClass({imageMagick: true});
const BPromise = require('any-promise');
BPromise.promisifyAll(gm.prototype);
//const Url = require('url');


function detectBlankImage(image) {
  // if blank image, take webshot and change renderDelay to 2000
  //http://www.imagemagick.org/script/identify.php

  // With command:
  // $ identify -format "%#" source.png
  // If the number of colors is 1, you have a blank page.
  // You can also use the command:
  // identify -verbose source.png
  // The standard deviation, skew and kurtosis will be 0 for a blank image.
  console.log('detect called on', image);

  // gm.identify doesn't promisify?
  return gm(image).identify().writeAsync('tmp.png').then(data => {
    if (data.Colors === '1') {
      console.log('image is blank');
    }
    else {
      console.log('image isn\'t blank');
    }
  });

}

detectBlankImage('blank.png');
