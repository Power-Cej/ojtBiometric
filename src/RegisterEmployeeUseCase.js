const FindObjectUseCase = require("./FindObejctUseCase");
const UpsertUseCase = require("./UpsertUseCase");

const upsertObject = new UpsertUseCase();
const findObject = new FindObjectUseCase();

class RegisterEmployeeUseCase {
  async execute(query, payloads) {
    console.log("PAYLOAD: ", payloads);
    const employee = await findObject.execute("employees", {
      agency: Number(payloads[0]["FP PIN"]),
    });
    const user = await findObject.execute("users", {
      "employee.id": employee[0].id,
    });
    const empName =
      employee.length > 0
        ? `${employee[0].Firstname} ${employee[0].Middlename} ${employee[0].surname}`
        : payloads[0]["FP PIN"];
    const data = {
      device: query.SN,
      logMessage: `Successfully biometric registration user ${empName}`,
      result: "User biometric registered",
    };
    if (employee.length > 0 && user.length > 0) {
      await upsertObject.execute("biometric_logs", data);
      user[0].fingerPrint = payloads[0].TMP;
      await upsertObject.execute("users", user[0]);
      return "Ok";
    } else {
      console.error("No Employee or User");
      return `OK`;
    }
  }
}

module.exports = RegisterEmployeeUseCase;
