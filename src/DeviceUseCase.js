const FindObjectUseCase = require("./FindObejctUseCase");
const UpsertUseCase = require("./UpsertUseCase");
const config = require("./config");

const findObject = new FindObjectUseCase();
const upsertObject = new UpsertUseCase();

class DeviceUseCase {
  async execute(query, devices, isLastSync) {
    // biometric devices
    if (query.SN || query.INFO) {
      const deviceInfo = query?.INFO?.split(",") || "";
      const lastSync = new Date();
      if (devices.length > 0) {
        devices[0].ipAddress = deviceInfo[4];
        devices[0].update = lastSync;
        devices[0].stats = "online";
        devices[0].port = config.server.port;
        // lastSync Checking
        if (isLastSync) {
          devices[0].lastSync = lastSync;
        }
        await upsertObject.execute("devices", devices[0]);
      } else {
        // If no devices found, create a new device and set status to online
        const device = {
          serialNum: query.SN,
          ipAddress: deviceInfo[4],
          update: lastSync,
          stats: "online",
          port: config.server.port,
          lastSync,
        };
        await upsertObject.execute("devices", device);
        console.log(`New device created: Online ${query.SN}`);
      }
    }

    // device status offline
    const allDevices = await findObject.execute("devices", {});
    const dateNow = new Date();
    if (allDevices.length > 0) {
      allDevices.map(async (device) => {
        const updateAt = new Date(device.update);
        const timeDiffInSeconds = (dateNow - updateAt) / 1000;
        // Device updateAt is within 50 seconds, mark as offline
        if (device.serialNum !== query.SN && timeDiffInSeconds > 50) {
          device.stats = "offline";
        }
        await upsertObject.execute("devices", device);
      });
    }
    return Promise.resolve("OK");
  }
}
module.exports = DeviceUseCase;
