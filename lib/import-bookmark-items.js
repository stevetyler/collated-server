'use strict';

const username = 'stevetyler_uk';
const parse = require('./bookmark-parser.js');
const bookmarks = [];

//parse('./data-import/bookmarks/bookmarks_10_2_16.html', ['Bookmarks', 'Bookmarks Bar']);

const newItems = bookmarks.map(bookmark => {
  let body = '<a href="' + bookmark.url + '" ">' + bookmark.name + '</a>';

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
