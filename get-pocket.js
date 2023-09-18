module.exports = function (RED) {
  'use strict';
  const axios = require('axios');

  function getPocket(n) {
    RED.nodes.createNode(this, n);
    this.pocket = RED.nodes.getNode(n.pocket);

    if (!this.pocket.credentials.accessToken) {
      this.status({ fill: 'red', shape: 'ring', text: 'error.no-access-token' });
      return;
    }

    let node = this;

    node.on('input', async function (msg) {
      let searchKey = msg.search || n.search;
      let useTag = msg.tag || n.tag;
      let sort = msg.sort || n.sort;
      let detailType = msg.detailType || n.detailType;
      let state = msg.state || n.state || 'all';
      let sinceType = msg.sinceType || n.sinceType;
      let sinceValue = msg.sinceValue || n.sinceValue;
      let sinceUnit = msg.sinceUnit || n.sinceUnit;

      let params = {
        consumer_key: this.pocket.credentials.consumerKey,
        access_token: this.pocket.credentials.accessToken,
        sort,
        detailType,
        state
      };

      // Handling 'since' parameter based on 'sinceType'
      if (sinceType === 'relative' && sinceValue) {
        let timestamp = Math.floor(Date.now() / 1000);
        switch (sinceUnit) {
          case 'minutes':
            timestamp -= sinceValue * 60;
            break;
          case 'hours':
            timestamp -= sinceValue * 60 * 60;
            break;
          case 'days':
            timestamp -= sinceValue * 60 * 60 * 24;
            break;
        }
        params = { ...params, since: timestamp };
      } else if (sinceValue) {
        params = { ...params, since: sinceValue };
      }

      // Handling 'tag' or 'search' parameter
      if (useTag) {
        params = { ...params, tag: searchKey };
      } else {
        params = { ...params, search: searchKey };
      }

      try {
        let data = await getList(params);
        msg.payload = data;
        node.send(msg);
        node.status({ fill: 'green', shape: 'ring', text: 'success.get-list' });
      } catch (error) {
        node.error(`Error: ${JSON.stringify(error)}`);
        node.status({ fill: 'red', shape: 'dot', text: 'error.get-list' });
      }
    });
  }

  RED.nodes.registerType('get-pocket', getPocket);

  async function getList(params) {
    let { data } = await axios.get('https://getpocket.com/v3/get', { params: params });
    return data;
  }
}
