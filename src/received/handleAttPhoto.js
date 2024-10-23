const fs = require("fs");
const path = require("path");

async function handleAttPhoto(query, response) {
  console.log("RESPONSE: ", response);
  // Match PIN, SN, size, and CMD from the response
  const pinMatch = response.match(/PIN=([^\s]+)/);
  const snMatch = response.match(/SN=([^\s]+)/);
  const sizeMatch = response.match(/size=([^\s]+)/);
  const cmdMatch = response.match(/CMD=([^\s]+)/);

  if (!pinMatch || !snMatch || !sizeMatch || !cmdMatch) {
    console.error("Error: Could not match required fields in response");
    return Promise.reject("Invalid response format");
  }

  const line = {
    PIN: pinMatch[1],
    SN: snMatch[1],
    SIZE: sizeMatch[1],
    CMD: cmdMatch[1],
  };

  const fileName = line.PIN;

  // Extract image data by splitting at 'uploadphoto'
  const splitCMD = response.split("CMD=uploadphoto");
  if (splitCMD.length < 2) {
    console.error("Error: Image data not found after uploadphoto");
    return Promise.reject("Image data not found");
  }

  // Handle binary data extraction
  const imageData = splitCMD[1].trim();

  // Optionally check for encoding or adjust if it's Base64
  try {
    // If the data is Base64 encoded, use 'base64' instead of 'binary'
    const imageBuffer = Buffer.from(imageData.trim(), "binary");
    console.log("imageData: ", imageData);

    // Define the path for saving the image
    const imageSaved = path.join(__dirname, fileName);

    // Save the image
    fs.writeFileSync(imageSaved, imageBuffer);
    console.log(`Image saved as ${fileName}`);

    return Promise.resolve("OK");
  } catch (error) {
    console.error("Error handling image data:", error);
    return Promise.reject("Error saving image");
  }
}

module.exports = handleAttPhoto;
