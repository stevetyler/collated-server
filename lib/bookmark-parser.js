'use strict';
const cheerio = require('cheerio'),
      fs = require('fs');

const getTags = function(element, $) {
  let tags = [];

  $(element).parents('dl').each(function(index, dlEl) {
    let tag = $(dlEl).prev().text();
    tags.push(tag);
  });

  return tags;
};

const parse = function(file, toExclude) {
  const html = fs.readFileSync(file, 'utf8'),
        $ = cheerio.load(html);

  let bookmarks = [];

  $('dl').find('a').each(function() {
    let bookmark = {};
    bookmark.url = $(this).attr('href');
    bookmark.name = $(this).text();
    bookmark.tags = getTags(this, $);
    bookmarks.push(bookmark);
  });

  return bookmarks;
};

module.exports = parse;
