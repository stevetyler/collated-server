'use strict';

require('any-promise/register/bluebird');
const AWS = require('aws-sdk');
const fs = require('fs-promise');
const gm = require('gm').subClass({imageMagick: true});
const fileType = require('file-type');
const MetaInspector = require('node-metainspector-with-headers');
const BPromise = require('any-promise');
BPromise.promisifyAll(gm.prototype);
const unfurl = require('unfurl-url');
const Url = require('url');
const webshot = require('webshot');

AWS.config.setPromisesDependency(BPromise);

const Helpers = function() {};

Helpers.prototype.authCookieOptions = function() {
  return {
    expires: new Date(Date.now() + 600000),
    httpOnly: true
  };
};

Helpers.prototype.authSuccessRedirect = function(req, res) {
  let withAccountPath = process.env.NODE_ENV === 'production' ?
		'https://app.collated.net/with-account' : 'http://www.collated-dev.net/with-account';

	try {
		if (req.headers.cookie.indexOf('ios=true') > -1) {
			let token = req.user.apiKeys.collatedToken;
      console.log('ios true', token);
			res.redirect('net.collated.ios://' + token);
		}
		else {
			res.redirect(withAccountPath);
		}
	}
	catch(err) {}
};

Helpers.prototype.containsUrl = function(message) {
  return /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig.test(message);
};

Helpers.prototype.extractUrl = function(text) {
  let str = text ? text : '';
  let urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
  let urls = str.match(urlRegex);

  return urls ? urls[0] : null;
};

Helpers.prototype.formatImageUrl = function(url) {
  if (!url) {
    return null;
  }
  else if (url.toLowerCase().indexOf('blank') > -1) {
    return null;
  }
  else if (url.startsWith('cdn')) {
    return 'http://' + url;
  }
  else if (url.startsWith('//cdn')) {
    return 'http:' + url;
  }
  else {
    return url;
  }
};

Helpers.prototype.getPreviewMeta = function(url) {
  let client = new MetaInspector(url, { timeout: 5000 });
  let fetched = new BPromise(function(resolve, reject) {
    client.on('fetch', resolve);
    client.on('error', reject);
  });

  client.fetch();

  return fetched.then(() => {
    return {
      description: client.description || client.title,
      image: client.image,
      keywords: client.keywords,
      title: client.title,
      url: client.url || url,
      rootUrl: client.rootUrl,
      ogDescription: client.ogDescription,
      ogTitle: client.ogTitle,
      ogType: client.ogType,
      ogUpdatedTime: client.ogUpdatedTime,
      ogLocale: client.ogLocale
    };
  }, () => {
    throw new Error('meta error');
  });
};

Helpers.prototype.isBlankImage = function(folder, image) {
  let path = folder + image;
  // if blank image, take webshot and change renderDelay to 2000
  return new Promise((resolve, reject) => {
    // promisify only works for writeAsync ops
    return gm(path).identify((err, data) => {
      if (err) {
        reject(err);
      }
      if (data.Colors === '1') {
        console.log('blank image');
        return resolve(true);
      }
      else {
        console.log('image isn\'t blank');
        return resolve(false);
      }
    });
  }).catch(() => {
    throw new Error('error identifying image');
  });
};

Helpers.prototype.makeRequest = function(url) {
  return new Promise((resolve, reject) => {
    let lib = url.startsWith('https') ? require('https') : require('http');
    let options = Url.parse(url);
    //console.log('get options', url, options);
    let request = lib.get(options, response => {
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      let body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(Buffer.concat(body)));
    });
    //request.on('error', (err) => reject(err));
    request.on('error', () => resolve(null));
  });
};

Helpers.prototype.resizeImage = function(folder, filename, width, suffix) {
  //console.log('resize image called on', filename);
  let ext = filename.split('.').pop();
  let newFilename = filename.split('.')[0] + suffix + '.' + ext;
  let srcPath = folder + filename;
  let dstPath = folder + newFilename;

  return gm(srcPath).resize(width).noProfile().writeAsync(dstPath).then(() => {
    //console.log('resized successfully');
    return newFilename;
  })
  .catch(err => console.log(err));
};

Helpers.prototype.saveMetaImage = function(imageUrl, itemId) {
  //console.log('save preview image called', imageUrl);
  let foldername = '../collated-temp/';
  let extTypes = ['png', 'jpeg'];
  let filename;
  let fileExt;

  return this.makeRequest(imageUrl).then(res => {
    //console.log('save meta image', fileType(res).mime);
    try {
      fileExt = fileType(res).mime.split('/').pop();
    }
    catch (err) {
      console.log('make request error');
    }

    if (extTypes.indexOf(fileExt) > -1) {
      filename = itemId + '.' + fileExt;
      //console.log('writing file to ', foldername + filename);
      return fs.writeFile(foldername + filename, res);
    }
    else {
      console.log('invalid mime type');
      return null;
    }
  }).then(() => {
    return filename;
  }).catch(err => {
    console.log('error saving image', err.message);
    return null;
  });
};

Helpers.prototype.takeWebshot = function(url, itemId) {
  let tempFolder = '../collated-temp/';
  let filename = itemId + '.png';
  let filepath = tempFolder + filename;
  let newWebshot = BPromise.promisify(webshot);
  let options = {
    width: 600,
    height: 450,
    cookies: null,
    //timeout: 3000,
    phantomConfig: {
      'ignore-ssl-errors': 'true',
      'ssl-protocol': 'any',
      //'errorIfJSException': 'true',
      //'errorIfStatusIsNot200': 'true'
    },
    renderDelay: 2000, // remove if creating link manually
  };
  console.log('getWebshot called on', url);

  return newWebshot(url, filepath, options).then(() => {
    //console.log('image saved to' + ' ' + filepath);
    return filename;
  }).catch(err => {
    console.log(err);
    return;
  });
};

Helpers.prototype.unfurlUrl = function(url) {
  let unfurlUrl = BPromise.promisify(unfurl.url);
  //console.log('unfurlUrl', url);

  return url ? unfurlUrl(url) : null;
};

Helpers.prototype.uploadImageToS3 = function(folder, filename) {
  let s3 = new AWS.S3();
  let uploadFolder;

  if (process.env.NODE_ENV === 'production') {
    uploadFolder = 'assets/images/previews/';
  } else {
    uploadFolder = 'assets/images/previews/dev/';
  }

  return fs.readFile(folder + filename).then(data => {
    let params = {
      Bucket: 'collated-assets',
      Key: uploadFolder + filename,
      Body: data,
      ACL: 'public-read'
    };

    return s3.putObject(params).promise();
  }).then(() => {
    return filename;
  }).catch(function(err) {
    console.log(err);
  });
};

module.exports = new Helpers();
