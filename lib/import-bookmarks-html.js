'use strict';

const username = 'stevetyler_uk';

const cheerio = require('cheerio');
const fs = require('fs');
const importFile = './data-import/bookmarks/js_bookmarks2.html';
const html = fs.readFileSync(importFile, 'utf8');
const $ = cheerio.load(html);

const bookmarks = $('h3').map(function(i, el) {
  //let body = '<a href="' + $(this).attr('href') + '" target="_blank">' + $(this).text() + '</a>';
  //console.log($(this).find('a').text());
  //.not('h3 dl p dt h3'));

  // return {
  //   user: username,
  //   createdDate: new Date(),
  //   body: body,
  //   author: username,
  //   //tags: [],
  //   isPrivate: false,
  //   type: 'bookmark'
  // };
}).get();

console.log($('h3').find('a').text());
//console.log($('dl > h3').text());
//
// $('dl > a').not('h3 dl p dt h3');
