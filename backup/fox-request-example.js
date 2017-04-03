let AWS = require('aws-sdk'),
    http = require('http'),
    url = require('url')
const imageType = require('image-type')
const path = require('path')
const urljoin = require('url-join')

function Images(config) {
  this.config = config
  AWS.config.update(config.aws)
  this.s3 = new AWS.S3(config.aws.s3)
}

Images.prototype.toS3 = async function(src, dest) {
  if(!src || (src[0] !== '/' && src[0] !== 'h')) {
    return false
  }

  for(const regex of this.config.images.dontMigrate) {
    if (regex.test(src)) {
      return false
    }
  }

  if(src[0] === '/') {
    src = this.config.images.source + src
  }

  dest = urljoin(dest, path.basename(src.split('?')[0]))

  try {
    let res = await makeRequest(src)
    let mime = imageType(res).mime
    if(!this.config.images.validMimeTypes.includes(mime)) {
      return false
    }
    let params = {
      Key: dest,
      Body: res
    };
    Object.assign(params, this.config.aws.s3.params)
    let put = await this.s3.putObject(params).promise()
    return true
  } catch(err) {
    console.log('can\'t download: ', src)
    return false
  }
}

module.exports = Images

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(Buffer.concat(body)));
    });
    request.on('error', (err) => reject(err))
    })
};
