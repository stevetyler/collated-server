'use strict';
const rp = require('request-promise');
// get channel names from channels.json
// find each channel name sub-folder and iterate through each messageArr in subfolder
const url = 'http://localhost:3000/api/v1/items/slack';

const fs = require('fs');
//const importFolderName = './data-import/slack/collated-dev-aug-16';
const importFolderName = './data-import/slack/ember-london-dec-16';

const channelDataArr = JSON.parse(fs.readFileSync(importFolderName + '/channels.json', 'utf8'));

const channelObj = channelDataArr.reduce((obj, channelObj) => {
  return {
    names: obj.names.concat(channelObj.name),
    ids: obj.ids.concat(channelObj.id)
  };
}, {names: [], ids: []});

const userDataArr = JSON.parse(fs.readFileSync(importFolderName + '/users.json', 'utf8'));
const userObj = userDataArr.reduce((obj, userObj) => {
  return {
    names: obj.names.concat(userObj.name),
    ids: obj.ids.concat(userObj.id)
  };
}, {names: [], ids: []});

const messageArrArr = channelObj.names.reduce((arr, channelName, i) => {
  const jsonFilesArr = fs.readdirSync(importFolderName + '/' + channelName);
  const teamId = JSON.parse(fs.readFileSync(importFolderName + '/users.json', 'utf8'))[0].team_id;
  const channelId = channelObj.ids[i];

  const tmpArrArr = jsonFilesArr.map(fileName => {
    const filePath = importFolderName + '/' + channelName + '/' + fileName;
    //console.log('file path', filePath);
    const messageArr = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    return messageArr.map(message => {
      const username = userObj.names[userObj.ids.indexOf(message.user)];

      return {
        user_name: username,
        user_id: message.user,
        text: message.text,
        timestamp: message.ts,
        channel_name: channelName,
      	channel_id: channelId,
      	team_id: teamId // get id from
      };
    });
  });
  const tmpArr = [].concat.apply([], tmpArrArr);

  console.log('temp arr', tmpArrArr, tmpArr.length);
  return arr.concat(tmpArr);
}, []);

const messageArr = [].concat.apply([], messageArrArr);
//console.log('message arr', messageArr, messageArr.length);
const options = {
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
