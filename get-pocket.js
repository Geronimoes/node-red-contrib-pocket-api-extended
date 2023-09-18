module.exports = function (RED) {
  "use strict";
  const axios = require('axios');

  function getPocket(n) {
    RED.nodes.createNode(this, n);

    this.pocket = RED.nodes.getNode(n.pocket);

    if (!this.pocket.credentials.accessToken) {
      this.status({ fill: "red", shape: "ring", text: "error.no-access-token" });
      return;
    }

    let node = this;

    node.on("input", async function (msg) {
      let searchKey = msg.search || n.search,
        useTag = msg.tag || n.tag,
        sort = msg.sort || n.sort,
        detailType = msg.detailType || n.detailType,
        state = msg.state || n.state || "all",
        sinceType = msg.sinceType || n.sinceType,
        sinceValue = msg.sinceValue || n.sinceValue;

      let params = {
        consumer_key: this.pocket.credentials.consumerKey,
        access_token: this.pocket.credentials.accessToken,
        sort,
        detailType,
        state
      };

      // Handling 'since' parameter based on 'sinceType'
      if (sinceType === "timestamp") {
        params = { ...params, since: sinceValue };
      } else if (sinceType === "relative") {
        // Calculating Unix timestamp based on relative time
        let currentTimestamp = Math.floor(Date.now() / 1000);
        let unit = msg.sinceUnit || n.sinceUnit;

        switch (unit) {
          case "minutes":
            currentTimestamp -= sinceValue * 60;
            break;
          case "hours":
            currentTimestamp -= sinceValue * 60 * 60;
            break;
          case "days":
            currentTimestamp -= sinceValue * 60 * 60 * 24;
            break;
        }
        params = { ...params, since: currentTimestamp };
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
        node.status({ fill: "green", shape: "ring", text: "success.get-list" });
      } catch (error) {
        node.error('Error:', error.response.data);
        node.status({ fill: "red", shape: "dot", text: "error.get-list" });
        return;
      }
    });
  }
  RED.nodes.registerType("get-pocket", getPocket);

  async function getList(params) {
    let { data } = await axios.get("https://getpocket.com/v3/get", { params: params });

    return data;
  }
};
