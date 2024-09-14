const queryToJson = require("./queryToJson");
const PromiseRouter = require("./PromiseRouter");
const parsePayload = require("./parsePayload");
// UseCases
const HandShakeUseCase = require("./HandShakeUseCase");
const AttendanceUseCase = require("./AttendanceUseCase");
const RegisterEmployeeUseCase = require("./RegisterEmployeeUseCase");
const FindObjectUseCase = require("./FindObejctUseCase");
const UpsertUseCase = require("./UpsertUseCase");
const config = require("./config");

const findObject = new FindObjectUseCase();
const upsertObject = new UpsertUseCase();

class FunctionsRouter extends PromiseRouter {
  constructor() {
    super();
    this.route("GET", "/iclock/cdata", this.handleHandshake.bind(this));
    this.route("POST", "/iclock/cdata", this.handleUpload.bind(this));
    this.route("GET", "/iclock/getrequest", this.handleRequest.bind(this));
  }

  async handleHandshake(req) {
    const query = queryToJson(req.query);
    const handshake = new HandShakeUseCase();

    return handshake.execute(query);
  }

  handleUpload(req) {
    const query = queryToJson(req.query);
    const lines = req.body
      .split(/\r?\n/) // Split the data by new lines
      .reduce((acc, cur) => {
        if (cur.trim() !== "") {
          acc.push(cur.split("\t"));
        }
        return acc;
      }, []);

    console.log("LOGSSSSS: ", lines);

    const attendance = new AttendanceUseCase();
    switch (query.table) {
      case "ATTLOG":
        return attendance.execute(query, lines);
      case "OPERLOG":
        const payloads = parsePayload(lines);
        if (payloads.length === 0) {
          return this.handleOperationLog(query, lines, payloads);
        } else {
          return this.handleOperationUpload(query, payloads);
        }
      default:
        return Promise.resolve("OK");
    }
  }

  async handleOperationUpload(query, payloads) {
    const data = {
      device: query.SN,
      logMessage: `Successfully biometric registered user ${payloads[0]["FP PIN"]}`,
      result: "User biometric registered",
    };
    await upsertObject.execute("biometric_logs", data);
    const register = new RegisterEmployeeUseCase();
    return register.execute(payloads);
  }

  handleOperationLog(query, lines) {
    // input all field on creating new user it log 7, 30, and 6
    lines.forEach(async (line) => {
      const [type] = line;
      console.log("PPPPP: ", type, " ", lines);
      const data = {
        device: query.SN,
        logMessage: `Successfully deleted user ${line[3]}`,
        result: "User Deleted",
      };
      switch (type) {
        case "OPLOG 4": // Access Menu
          break;
        case "OPLOG 9": // Delete User
          await upsertObject.execute("biometric_logs", data);
          break;
        case "OPLOG 10": // delete fingerPrintOnly
          break;
        case "OPLOG 11": // delete passwordOnly
          break;
        case "OPLOG 30": // Initialize new user
          data.logMessage = `Successfully registered user ${line[3]}`;
          data.result = "User Created";
          await upsertObject.execute("biometric_logs", data);
          break;
        case "OPLOG 36": // edit user
          break;
        case "OPLOG 71": // changing User Role
          break;
        default:
          break;
      }
    });
    return Promise.resolve("OK");
  }

  async handleRequest(req) {
    const query = queryToJson(req.query);
    console.log("QUERY: ", query);
    const users = await findObject.find("users", { sync: "false" });

    // biometric user
    if (users.length > 0) {
      for (const user of users) {
        // Prepare the data for each device
        const bioData = {
          pin: user.employee.agency,
          name: user.username,
          pass: user.employee.agency,
          // privilege: "0" // nomarl User "0" or super Admin "1"
        };

        const tab = "\t";
        const command = `C:1:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}\n`;

        // Return the command immediately
        const returnCommand = Promise.resolve(command);

        // Wait for 30 sec to sync user for all connected Device
        (async () => {
          await new Promise((resolve) => setTimeout(resolve, 30000));
          user.sync = "true";
          await upsertObject.execute("users", user);
        })();

        console.log(
          "Data sent to all devices successfully.",
          command,
          " ",
          query
        );

        return returnCommand;
      }
    }

    // biometric devices
    if (query.SN || query.INFO) {
      const devices = await findObject.find("devices", {
        serialNum: query.SN,
      });
      const deviceInfo = query?.INFO?.split(",") || "";

      if (devices.length > 0) {
        devices[0].ipAddress = deviceInfo[4];
        devices[0].update = new Date();
        devices[0].stats = "online";
        devices[0].port = config.server.port;
        await upsertObject.execute("devices", devices[0]);
      } else {
        // If no devices found, create a new device and set status to online
        const device = {
          serialNum: query.SN,
          ipAddress: deviceInfo[4],
          update: new Date(),
          stats: "online",
          port: config.server.port,
        };
        await upsertObject.execute("devices", device);
        console.log(`New device created: Online ${query.SN}`);
      }
    }

    // device status offline
    const devices = await findObject.find("devices", {});
    const dateNow = new Date();
    if (devices.length > 0) {
      devices.map(async (device) => {
        const updateAt = new Date(device.update);
        const timeDiffInSeconds = (dateNow - updateAt) / 1000;
        // Device is within 50 seconds, mark as offline
        if (device.serialNum !== query.SN && timeDiffInSeconds > 50) {
          // console.log("Offline");
          device.stats = "offline";
        }
        await upsertObject.execute("devices", device);
      });
    }

    return Promise.resolve("OK");
  }
}

module.exports = FunctionsRouter;
