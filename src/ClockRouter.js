const queryToJson = require("./queryToJson");
const PromiseRouter = require("./PromiseRouter");
const parsePayload = require("./parsePayload");
// UseCases
const HandShakeUseCase = require("./HandShakeUseCase");
const AttendanceUseCase = require("./AttendanceUseCase");
const RegisterEmployeeUseCase = require("./RegisterEmployeeUseCase");
const FindObjectUseCase = require("./FindObejctUseCase");
const HrisUseCase = require("./HrisUseCase");
const UpsertUseCase = require("./UpsertUseCase");
const DeviceUseCase = require("./DeviceUseCase");
const config = require("./config");

const findObject = new FindObjectUseCase();
const hrisObject = new HrisUseCase();
const deviceOjbect = new DeviceUseCase();
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
    const devices = await findObject.execute("devices", {
      serialNum: query.SN,
    });
    console.log("QUERY: ", query);
    // hris relation
    // await hrisObject.execute(query, devices);
    // devices relation

    const users = await findObject.execute("employees", {
      area: devices[0]?.area,
    });

    // biometric user
    if (users.length > 0 && devices.length > 0) {
      for (const user of users) {
        // Prepare the data for each device
        const bioData = {
          pin: user.agency,
          name: user.Firstname,
          pass: user.agency,
          // pri: "14", // nomarl User "0", Registar "2", Admin "6", user-defined "10", super Admin "14";
        };

        const tab = "\t";
        const command = `C:1:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}${tab}\n`;

        const updateAt = new Date(user.lastSync);
        const lastSync = new Date(devices[0].lastSync);

        const isLastSync = updateAt > lastSync;
        // update the device
        await deviceOjbect.execute(query, devices, isLastSync);
        if (isLastSync) {
          console.log(
            "Data sent to all devices successfully.",
            command,
            " ",
            query
          );

          return Promise.resolve(command);
        }
      }
    }

    return Promise.resolve("OK");
  }
}

module.exports = FunctionsRouter;
