const config = require("./config");
const FindObjectUseCase = require("./FindObejctUseCase");
const UpsertUseCase = require("./UpsertUseCase");

const upsertObject = new UpsertUseCase();
const findObject = new FindObjectUseCase();

class DeviceInsertionUseCase {
  async execute(query, devices, deviceInfo) {
    const lastSync = new Date();
    if (devices.length === 0) {
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
    } else {
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
          } else {
            device.stats = "online";
          }
          await upsertObject.execute("devices", device);
        });
      }
    }
  }
}

module.exports = DeviceInsertionUseCase;
