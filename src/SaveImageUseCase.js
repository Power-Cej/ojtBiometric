const FormData = require("form-data");
const config = require("./config");
const request = require("./request");

class SaveImageUseCase {
  async execute(imageBuffer, line) {
    // Define the URL for uploading the image
    const url = `${config.endpoint}/files/${line.PIN}`;

    const options = {
      method: "POST",
      headers: {
        "X-Application-Id": config.applicationId,
        "Content-Type": "image/jpeg",
      },
      body: imageBuffer,
    };

    try {
      const response = await request(url, options);

      if (response.ok) {
        return await response.json; // Return the JSON response from the server
      } else {
        throw new Error(`Request failed with status: ${response.status}`);
      }
    } catch (e) {
      console.error("Error sending image: ", e);
      return Promise.reject(e);
    }
  }
}

module.exports = SaveImageUseCase;
