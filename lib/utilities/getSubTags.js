'use strict';

// get all items

function getTagIdsArrArr(itemsArr) {
  let tagsArrArr = itemsArr.reduce((acc, obj) => {
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

function createUniqueSortedArrArr(tagsArrArr) {
  return tagsArrArr.sort(function (a, b) {
    return b.length - a.length;
  });
  // remove duplicates

}

function findTagIdsDiff(arr1, arr2) {
  let tmpArr1 = arr1.length <= arr2.length ? arr1 : arr2;
  let tmpArr2 = arr1.length <= arr2.length ? arr2 : arr1;

  for (var i = 0; i < tmpArr1.length; i++) {
    let j = tmpArr2.indexOf(tmpArr1[i]);
    if (j === -1) {
      return false;
    }
    tmpArr2.splice(j, 1);
  }
  return tmpArr2.length ? tmpArr2.toString() : false;
}

var idArr = [[1,2], [1,4,5], [2,3,4], [5], [2, 3], [4,5], [1,2]];


console.log(findTagIdsDiff([1,2], [1,2,3]) === '3');
console.log(findTagIdsDiff([2,1], [1,2,3]) === '3');
console.log(findTagIdsDiff([2,1], [1,3]) === false);
console.log(findTagIdsDiff([2,1,4], [1,2,4,5,6]) === '5,6');
console.log(findTagIdsDiff([2,1,4], [1,3,4,5,6]) === false);


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
