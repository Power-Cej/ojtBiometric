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
const RemoveUserCommand = require("./request/RemoveUserCommand");
const handleAttPhoto = require("./received/handleAttPhoto");
const handleOperationLog = require("./received/handleOperationLog");
const SaveImageUseCase = require("./SaveImageUseCase");

const findObject = new FindObjectUseCase();
const deviceInsertionObject = new DeviceInsertionUseCase();
const deviceOjbect = new DeviceUseCase();
const upsertObject = new UpsertUseCase();
const attendance = new AttendanceUseCase();
const register = new RegisterEmployeeUseCase();
const saveImage = new SaveImageUseCase();

class FunctionsRouter extends PromiseRouter {
  constructor() {
    super();
    this.route("GET", "/iclock/cdata/", this.handleHandshake.bind(this));
    this.route("POST", "/iclock/cdata/", this.handleUpload.bind(this));
    this.route("GET", "/iclock/getrequest/", this.handleRequest.bind(this));
    // this.route("POST", "/iclock/devicecmd", this.handleReturnResult.bind(this));
  }

  async handleHandshake(req) {
    // console.log("req", req);
    const query = queryToJson(req.query);
    const handshake = new HandShakeUseCase();
    return handshake.execute(query);
  }

  // handleReturnResult(req) {
  //   console.log("query: ", req);
  //   const query = queryToJson(req.query);
  //   console.log("line: ", query);
  //   return Promise.resolve("OK");
  // }

  handleUpload(req) {
    // console.log("REQ: ", req);
    const query = queryToJson(req.query);
    const lines = req.body
      .split(/\r?\n/) // Split the data by new lines
      .reduce((acc, cur) => {
        if (cur.trim() !== "") {
          acc.push(cur.split("\t"));
        }
        return acc;
      }, []);

    console.log("QUERY TALE: ", query);
    // return `C:${1}:CLEAR PHOTO`;
    switch (query.table) {
      case "ATTLOG":
        return attendance.execute(query, lines);
      case "OPERLOG":
        const payloads = parsePayload(lines);
        if (payloads.length === 0) {
          return handleOperationLog(query, lines, findObject, upsertObject);
        } else {
          return this.handleOperationUpload(query, payloads);
        }
      case "ATTPHOTO":
        return handleAttPhoto(req.body, saveImage, upsertObject);

      default:
        return Promise.resolve("OK");
    }
  }

  async handleOperationUpload(query, payloads) {
    return register.execute(query, payloads);
  }

  // async handleOperationLog(query, lines) {}

  async handleRequest(req) {
    const query = queryToJson(req.query);
    console.log("query", query);
    const devices = await findObject.execute("devices", {
      serialNum: query.SN,
    });
    const deviceInfo = query?.INFO?.split(",") || "";
    console.log("QUERY: ", query);

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

      // Checks if updatedAt is greater than lastSync
      const users = await findObject.execute("users", {
        updatedAt: { $gt: new Date(devices[0].lastSync) },
      });

      if (devices.length > 0) {
        // Check if query.SN is inside the array
        const findEmployee = users.filter(
          (item) =>
            item.employee[field] === usersQuery?.result ||
            (Array.isArray(item.serialNum) && item.serialNum.includes(query.SN))
        );

        if (users.length > 0) {
          // update the device
          await deviceOjbect.execute(query, devices, deviceInfo);

          // remove Data to the Device
          const removeUser = users.filter(
            (user) =>
              // user.employee[field] !== usersQuery.result ||
              Array.isArray(user.removedSN) && user.removedSN.includes(query.SN)
          );
          if (removeUser.length > 0) {
            const removed = RemoveUserCommand(removeUser, upsertObject);
            return removed;
          }

          // insert Data to the device
          if (findEmployee.length > 0) {
            return SendUserCommand(findEmployee);
          }
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
    return Promise.resolve("OK");
  }
}

module.exports = FunctionsRouter;
