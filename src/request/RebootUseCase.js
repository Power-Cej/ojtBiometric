async function RebootUseCase(findObject, serialNum) {
  try {
    // Await the asynchronous call to find the devices with isReboot: true
    const data = await findObject.execute("devices", {
      isReboot: true,
      serialNum: serialNum,
    });
    if (data.length > 0) {
      console.log("reboot Triggered");
      return `C:${1}:REBOOT`;
    } else {
      return Promise.all("OK");
    }
  } catch (error) {
    // Handle any potential errors during the execution of the findObject call
    console.error("Error finding objects for reboot:", error);
    Promise.all("ERROR");
  }
}

module.exports = RebootUseCase;
