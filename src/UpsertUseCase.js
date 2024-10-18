const request = require("./request");
const config = require("./config");

class UpsertUseCase {
  async execute(collection, data) {
    let method;
    let url;

    if (data.id) {
      //   update Data
      method = "PUT";
      url = `${config.endpoint}/collections/${collection}/${data.id}`;
    } else {
      //   create Data
      method = "POST";
      url = `${config.endpoint}/collections/${collection}`;
    }

    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "X-Application-Id": config.applicationId,
        "X-Master-Key": config.masterKey,
      },
      body: JSON.stringify(data),
    };

    try {
      const response = await request(url, options);
      // console.log("RESPONSE: ", response);
      if (response.ok) {
        // console.log(`${method} operation successful`, response.json);
        return response.json;
      } else {
        throw new Error(`Request failed with status: ${response.status}`);
      }
    } catch (error) {
      console.log("Error in upsert method:", error);
      return Promise.all("Error");
      // throw error;
    }
  }
}

module.exports = UpsertUseCase;
