const queryToJson = require("./queryToJson");
const PromiseRouter = require("./PromiseRouter");
const parsePayload = require("./parsePayload");
// UseCases
const HandShakeUseCase = require("./HandShakeUseCase");
const AttendanceUseCase = require("./AttendanceUseCase");
const RegisterEmployeeUseCase = require("./RegisterEmployeeUseCase");
const FindObjectUseCase = require("./FindObejctUseCase");
const UpsertUseCase = require("./UpsertUseCase");
const DeviceUseCase = require("./DeviceUseCase");
const config = require("./config");
const DeviceInsertionUseCase = require("./DeviceInsertionUseCase");
const { RebootDeviceCommand } = require("./request/RebootDeviceCommand");
const SendUserCommand = require("./request/SendUserCommand");
const { ClearLogsDeviceCommand } = require("./request/RebootDeviceCommand");

const findObject = new FindObjectUseCase();
const deviceInsertionObject = new DeviceInsertionUseCase();
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

    // console.log("LOGSSSSS: ", lines);

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
    const register = new RegisterEmployeeUseCase();
    return register.execute(query, payloads);
  }

  async handleOperationLog(query, lines) {
    lines.forEach(async (line) => {
      const [type] = line;
      console.log("PPPPP: ", type, " ", lines);
      const employee = await findObject.execute("employees", {
        agency: Number(line[3]),
      });
      const empName =
        employee.length > 0
          ? `${employee[0].Firstname} ${employee[0].Middlename} ${employee[0].surname}`
          : line[3];
      const data = {
        device: query.SN,
        logMessage: `Successfully deleted ${empName}`,
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
          data.logMessage = `Successfully registered ${empName}`;
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
    const deviceInfo = query?.INFO?.split(",") || "";
    console.log("QUERY: ", query);
    // return `C:{{1}}:CLEAR\tLOG`;
    // Function to find the last non-empty field
    const fields = [
      "region",
      "office",
      "division",
      "section",
      "unit",
      "cluster",
    ];
    const getLastNonEmptyField = (source) => {
      let result = "";
      let index = -1;

      fields.forEach((field, i) => {
        if (source[field] && source[field] !== "") {
          result = source[field];
          index = i;
        }
      });

      return { result, index };
    };

    // insert device if there's no device and status
    await deviceInsertionObject.execute(query, devices, deviceInfo);

    // check if devices contain required field
    if (
      devices.length > 0 &&
      fields.some(
        (field) => devices[0].hasOwnProperty(field) && devices[0][field]
      )
    ) {
      const usersQuery = getLastNonEmptyField(devices[0]);
      const field = `${fields[usersQuery.index]}`;

      const users = await findObject.execute("users", {
        // employee: { [field]: usersQuery.result },
        updatedAt: { $gt: new Date(devices[0].lastSync) }, // Checks if updatedAt is greater than lastSync
      });

      if (devices.length > 0) {
        const findEmployee = users.find(
          (item) =>
            item.employee[field] === usersQuery?.result ||
            item.serialNum === query.SN
        );

        if (
          users.length > 0 &&
          findEmployee &&
          Object.keys(findEmployee).length > 0
        ) {
          // update the device
          await deviceOjbect.execute(query, devices, deviceInfo);
          // insert Data to the device
          return SendUserCommand(users);
        } else {
          // reboot device
          const reboot = RebootDeviceCommand(findObject, query.SN);
          // Clear logs
          const clearLogs = ClearLogsDeviceCommand(findObject, query.SN);

          await deviceOjbect.execute(query, devices, deviceInfo);

          if ((await reboot) !== "OK") {
            return reboot;
          }
          if ((await clearLogs) !== "OK") {
            return clearLogs;
          }
          return Promise.resolve("OK");
        }
      } else {
        console.log(
          "there's no available employee, to the device current location!"
        );
        return Promise.resolve("OK");
      }
    }

    console.log("Please Insert Device Location!");
    return Promise.resolve("OK");
  }
}

module.exports = FunctionsRouter;
