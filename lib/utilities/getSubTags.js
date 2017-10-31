'use strict';
const mongoose = require('mongoose');
const uniqWith = require('lodash.uniqwith');
const isEqual = require('lodash.isequal');
const itemSchema = require('../../schemas/item.js');
const Item = mongoose.model('Item', itemSchema);

function getTagIdsArrArr(objArr) {
  let tagsArrArr = objArr.reduce((acc, obj) => {
    if (!Array.isArray(obj.tags)) {
      return acc;
    }
    if (obj.tags.length > 0) {
      acc.push(obj.tags.sort());
    }
    return acc;
  }, []);
  return tagsArrArr;
}

function createUniqueSortedArrObj(tagsArrArr) {
  let idArrArr = tagsArrArr.sort(function (a, b) {
    return b.length - a.length;
  });
  let uniqArrArr = uniqWith(idArrArr, isEqual);
  let obj = {};

  uniqArrArr.map(arr => {
    if (!obj[arr.length]) {
      obj[arr.length] = [arr];
    }
    else {
      obj[arr.length].push(arr);
    }
  });
  return obj;
}

// use in Ember
function findTagIdsDiff(arr1, arr2) {
  let tmpArr1 = arr1.length <= arr2.length ? arr1 : arr2;
  let tmpArr2 = arr1.length <= arr2.length ? arr2 : arr1;

  for (let i = 0; i < tmpArr1.length; i++) {
    let j = tmpArr2.indexOf(tmpArr1[i]);
    if (j === -1) {
      return false;
    }
    tmpArr2.splice(j, 1);
  }
  return tmpArr2.length ? tmpArr2.toString() : false;
}

let arr = [[1,2,3], [4], [2], [3], [1,3], [4,6,8], [3,6,7,8,9]];

console.log(createUniqueSortedArrObj(arr));

// Item.find({user: 'stevetyler_uk'}).then(objArr => {
//   console.log(getTagIdsArrArr(objArr));
//   return getTagIdsArrArr(objArr);
// }).then(arrArr => {
//   console.log(createUniqueSortedArrArr(arrArr));
//   return createUniqueSortedArrObj(arrArr);
//
// });






// var idArr = [[1,2], [1,4,5], [2,3,4], [5], [2, 3], [4,5], [1,2], [4,5,1], [2,1]];
// console.log(uniqWith(idArr, isEqual));



// console.log(findTagIdsDiff([1,2], [1,2,3]) === '3');
// console.log(findTagIdsDiff([2,1], [1,2,3]) === '3');
// console.log(findTagIdsDiff([2,1], [1,3]) === false);
// console.log(findTagIdsDiff([2,1,4], [1,2,4,5,6]) === '5,6');
// console.log(findTagIdsDiff([2,1,4], [1,3,4,5,6]) === false);


// console.log(getSubTags(1) === '2,4,5', 'getSubTags for id 1');
// console.log(getSubTags(2) === '1,3,4', 'getSubTags for id 2', getSubTags(2));
// console.log(getSubTags(3) === '2,4', 'getSubTags for id 3', getSubTags(3));
// console.log(getSubTags(4) === '1,2,3,5', 'getSubTags for id 4', getSubTags(4));

//   tmpArr1.map((id, i) => {
  //   let j = tmpArr2.indexOf(tmpArr1[i]);
  //   if (j === -1) {
  //     return false;
  //   }
  //   tmpArr2.splice(j, 1);
  // });


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
