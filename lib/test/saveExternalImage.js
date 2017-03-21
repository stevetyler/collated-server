'use strict';

const fs = require('fs-promise');
const rp = require('request-promise');
//const imagesize = require('imagesize');

const uri = 'https://avatars2.githubusercontent.com/u/10262982?v=3&s=400';
const id = '6283746283764';
let fileExt;

rp.head(uri).then(res => {
  console.log(res, res['content-type']);
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
