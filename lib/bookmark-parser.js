'use strict';
const cheerio = require('cheerio'),
      fs = require('fs');

const getTags = function(element, $, toExclude) {
  let tags = [];

  $(element).parents('dl').each(function(index, dlEl) {
    let tag = $(dlEl).prev().text();

    if (toExclude) {
      if (toExclude.indexOf(tag) === -1) {
        tags.push(tag);
      }
    } else {
      tags.push(tag);
    }
  });
  return tags;
};

const parse = function(file, toExclude) {
  const html = fs.readFileSync(file, 'utf8'),
        $ = cheerio.load(html);
  let bookmarks = [];

  $('dl').find('a').each(function() {
    let bookmark = {};
    let tagsArr = getTags(this, $, toExclude); // returned in reverse order, category is last
    //bookmark.image = $(this).attr('icon');
    bookmark.category = tagsArr[tagsArr.length - 1];
    bookmark.date = $(this).attr('add_date') * 1000;
    bookmark.url = $(this).attr('href');
    bookmark.title = $(this).text();
    bookmark.tags = tagsArr.slice(0, tagsArr.length - 1);
    bookmarks.push(bookmark);
  });
  return bookmarks;
};

module.exports = parse;
