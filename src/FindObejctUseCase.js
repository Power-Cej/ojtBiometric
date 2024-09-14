// FindObjectUseCase.js
const request = require("./request"); // Import your custom request function
const config = require("./config"); // Import your configuration (applicationId, endpoint)

class FindObjectUseCase {
  async find(collection, where) {
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Application-Id": config.applicationId,
        "X-Master-Key": config.masterKey,
      },
    };

    // Convert the `where` object into a query string for filtering
    const queryString = `where=${JSON.stringify(where)}`;
    const url = `${config.endpoint}/collections/${collection}?include=["employee"]&${queryString}`;

    try {
      // Make the request
      const response = await request(url, options);

      // Check if the response is okay, return the JSON data
      if (response.ok) {
        return response.json; // Assuming the custom request function returns parsed JSON
      } else {
        throw new Error(`Request failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error in find method:", error);
      throw error; // Rethrow or handle the error as needed
    }
  }
}

module.exports = FindObjectUseCase;
