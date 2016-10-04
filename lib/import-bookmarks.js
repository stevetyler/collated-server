'use strict';

const username = 'stevetyler_uk';
const parse = require('./bookmark-parser.js');
const bookmarks = parse('./data-import/bookmarks/bookmarks_10_2_16.html', ['Bookmarks', 'Bookmarks Bar']);

const newItems = bookmarks.map(bookmark => {
  let body = '<a href="' + bookmark.url + '" target="_blank">' + bookmark.name + '</a>';

  // remove bookmarks bar and bookmarks tags and reverse order
  let tags = bookmark.tags.map((tag, i) => {
    return bookmark.tags[bookmark.tags.length -1 -i];
  });

  return {
    user: username,
    createdDate: bookmark.date,
    body: body,
    author: username,
    tags: tags,
    isPrivate: false,
    type: 'bookmark'
  };
});

console.log(newItems);



// const username = 'stevetyler_uk';
//
// const cheerio = require('cheerio');
// const fs = require('fs');
// const importFile = './data-import/bookmarks/js_bookmarks2.html';
// const html = fs.readFileSync(importFile, 'utf8');
// const $ = cheerio.load(html);
//
// const bookmarks = $('h3').map(function(i, el) {
//   let body = '<a href="' + $(this).attr('href') + '" target="_blank">' + $(this).text() + '</a>';
//   console.log($(this).find('a').text());
//   .not('h3 dl p dt h3'));
//
//   return {
//
//   };
// }).get();
