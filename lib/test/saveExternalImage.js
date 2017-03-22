'use strict';

const fs = require('fs-promise');
const rp = require('request-promise');
//const imagesize = require('imagesize');

const uri = 'https://i.guim.co.uk/img/media/66aa0199534e44606ce372a9f86913cadba44250/0_188_5128_3075/master/5128.jpg?w=1200&h=630&q=55&auto=format&usm=12&fit=crop&crop=faces%2Centropy&bm=normal&ba=bottom%2Cleft&blend64=aHR0cHM6Ly91cGxvYWRzLmd1aW0uY28udWsvMjAxNi8wNS8yNS9vdmVybGF5LWxvZ28tMTIwMC05MF9vcHQucG5n&s=21be760e31e63ebc50d1aa0502ef5a6d';
const id = '6283746283764';
let fileExt;

rp.head(uri).then(res => {
  console.log(res['content-type']);
  fileExt = res['content-type'].split('/').pop();

  return rp(uri, {encoding: null});
  //return fs.writeFile(uri, '/' + filename);
}).then(data => {
  let filename = id + '-orig.' + fileExt;

  return fs.writeFile('images/' + filename, data);
}).then(() => {
  console.log('file saved');
});

// function saveExternalImage(uri) {
//   const download = function(uri, filename, callback) {
//     rp.head(uri, function(err, res, body){
//       console.log('content-type:', res.headers['content-type']);
//       console.log('content-length:', res.headers['content-length']);
//
//       rp(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
//     });
//
//     rp.head(uri).then();
//   };
//
//   download('https://www.google.com/images/srpr/logo3w.png', 'temp/previews/' + 'filename', function(){
//     console.log('done');
//   });
// }
