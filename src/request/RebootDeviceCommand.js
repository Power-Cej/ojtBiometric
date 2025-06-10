async function RebootDeviceCommand(findObject, serialNum) {
  try {
    // Await the asynchronous call to find the devices with isReboot: true
    const data = await findObject.execute("devices", {
      isReboot: true,
      serialNum: serialNum,
    });
    if (data.length > 0) {
      console.log("reboot Triggered");
      return `C:{1}:REBOOT`;
    } else {
      return "OK";
    }
  } catch (error) {
    // Handle any potential errors during the execution of the findObject call
    console.error("Error finding objects for reboot:", error);
    return Promise.reject("ERROR");
  }
}

async function ClearLogsDeviceCommand(findObject, serialNum) {
  try {
    // Await the asynchronous call to find the devices with isReboot: true
    const data = await findObject.execute("devices", {
      isClearLog: true,
      serialNum: serialNum,
    });
    if (data.length > 0) {
      console.log("clear logs Triggered");
      return `C:{{1}}:CLEAR\tLOG`;
    } else {
      return "OK";
    }
  } catch (error) {
    // Handle any potential errors during the execution of the findObject call
    console.error("Error finding objects for clearing logs:", error);
    return Promise.reject("ERROR");
  }
}

// Export both functions separately
module.exports = {
  RebootDeviceCommand,
  ClearLogsDeviceCommand,
};
