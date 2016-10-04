'use strict';
const rp = require('request-promise');
// get channel names from channels.json
// find each channel name sub-folder and iterate through each message in subfolder
const url = 'http://localhost:3000/api/v1/items/slack';

const fs = require('fs');
const importFolderName = './data-import/slack/collated-dev-slack-export-aug-24-2016';

let channelDataArr = JSON.parse(fs.readFileSync(importFolderName + '/channels.json', 'utf8'));
let channelObj = channelDataArr.reduce((obj, channelObj) => {
  return {
    names: obj.names.concat(channelObj.name),
    ids: obj.ids.concat(channelObj.id)
  };
}, {names: [], ids: []});

let userDataArr = JSON.parse(fs.readFileSync(importFolderName + '/users.json', 'utf8'));
let userObj = userDataArr.reduce((obj, userObj) => {
  return {
    names: obj.names.concat(userObj.name),
    ids: obj.ids.concat(userObj.id)
  };
}, {names: [], ids: []});

let messageArrArr = channelObj.names.reduce((arr, channelName, i) => {
  let jsonFilesArr = fs.readdirSync(importFolderName + '/' + channelName);
  let teamId = JSON.parse(fs.readFileSync(importFolderName + '/users.json', 'utf8'))[0].team_id;
  console.log('teamId', teamId);

  let channelId = channelObj.ids[i];
  let tmpArr = jsonFilesArr.map(fileName => {
    let filePath = importFolderName + '/' + channelName + '/' + fileName;
    let message = JSON.parse(fs.readFileSync(filePath, 'utf8'))[0];
    let username = userObj.names[userObj.ids.indexOf(message.user)];

    return {
      user_name: username,
      text: message.text,
      timestamp: message.ts,
      channel_name: channelName,
			channel_id: channelId,
			team_id: teamId // get id from
	  };
  });
  return arr.concat(tmpArr);
}, []);

let messageArr = [].concat.apply([], messageArrArr);
console.log('message arr', messageArr);
let options = {
  method: 'POST',
  uri: url,
  body: messageArr,
  json: true
};

rp.post(options).then((parsedBody) => {
  console.log('post succeeded', parsedBody);
})
.catch((err) => {
  console.log('post error occurred', err);
});
