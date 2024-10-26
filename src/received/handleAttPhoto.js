const fs = require("fs");
const path = require("path");

async function handleAttPhoto(query, response, sendImage, upsertObject) {
  // console.log("RESPONSE: ", response);
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

  const imageDataStartIndex = response.indexOf("CMD=uploadphoto");

  // Handle binary data extraction
  const imageData = response.substring(
    imageDataStartIndex + "CMD=uploadphoto ".length
  );
  const imageBuffer = Buffer.from(imageData, "binary");

  try {
    const response = await sendImage.execute(imageBuffer, line);
    console.log("RESPONSE: ", response);
    const faceCapture = {
      faceCapture: response.url,
      fileName: response.name,
    };
    await upsertObject.execute("biometric_face_capture", faceCapture);
    // console.log("RESPONSE: ", response);
    return Promise.resolve("OK");
  } catch (e) {
    console.error("ERROR Upload Image: ", e);
    return Promise.reject(e);
  }
}

module.exports = handleAttPhoto;
