'use strict';
const mongoose = require('mongoose');
const uniqWith = require('lodash.uniqwith');
const isEqual = require('lodash.isequal');
const itemSchema = require('../../schemas/item.js');
const Item = mongoose.model('Item', itemSchema);

function getTagIdsArrArr(items) {
  let arrArr = items.reduce((acc, obj) => {
    if (!Array.isArray(obj.tags)) {
      return acc;
    }
    if (obj.tags.length > 0) {
      acc.push(obj.tags.sort());
    }
    return acc;
  }, []);

  return uniqWith(arrArr, isEqual);
}

// use in Ember
function findIdsDiff(ids, idArr) {
  let newArr = [];

  idArr.map(arr => {
    if (arr.length > ids.length) {
      for (let i = 0; i < ids.length; i++) {
        let j = arr.indexOf(ids[i]);

        if (j === -1) {
          return false;
        }
        arr.splice(j, 1);
      }
      newArr.push(arr);
    }
  });

  return [].concat.apply([], newArr);
}


let arr = [[1,2,3], [4], [2], [3], [1,3], [4,6,8], [3,6,7,8,9]];




// Item.find({user: 'stevetyler_uk'}).then(objArr => {
//   console.log(getTagIdsArrArr(objArr));
//   return getTagIdsArrArr(objArr);
// }).then(arrArr => {
//   console.log(createUniqueSortedArrArr(arrArr));
//   return createUniqueSortedArrObj(arrArr);
//
// });


// console.log(getSubTags(1) === '2,4,5', 'getSubTags for id 1');
// console.log(getSubTags(2) === '1,3,4', 'getSubTags for id 2', getSubTags(2));
// console.log(getSubTags(3) === '2,4', 'getSubTags for id 3', getSubTags(3));
// console.log(getSubTags(4) === '1,2,3,5', 'getSubTags for id 4', getSubTags(4));


// function createUniqueSortedArrObj(tagsArrArr) {
//   let idArrArr = tagsArrArr.sort(function (a, b) {
//     return b.length - a.length;
//   });
//   let uniqArrArr = uniqWith(idArrArr, isEqual);
//   let obj = {};
//
//   uniqArrArr.map(arr => {
//     if (!obj[arr.length]) {
//       obj[arr.length] = [arr];
//     }
//     else {
//       obj[arr.length].push(arr);
//     }
//   });
//   return obj;
// }


// function getSubTags(id) {
//   let tmpArr = idArr.reduce(function(acc, arr) {
//     // compare ids with arr
//     if (arr.indexOf(id) !== -1) {
//       let filtered = arr.filter(elem => {
//         return elem !== id;
//       });
//       acc.push(filtered);
//     }
//     return acc;
//   }, []);
//
//   let flattenedArr = [].concat.apply([], tmpArr);
//   let uniqueArr = flattenedArr.filter(function(elem, pos) {
//     return flattenedArr.indexOf(elem) === pos;
//   });
//
//   return uniqueArr.toString();
// }
