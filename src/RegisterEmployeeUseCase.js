const FindObjectUseCase = require("./FindObejctUseCase");
const UpsertUseCase = require("./UpsertUseCase");

const upsertObject = new UpsertUseCase();
const findObject = new FindObjectUseCase();

function formatTMPString(tmp) {
  // Ensure the TMP string is properly padded to be a valid base64
  return tmp.length % 4 === 0 ? tmp : tmp + "=".repeat(4 - (tmp.length % 4));
}

class RegisterEmployeeUseCase {
  async execute(query, payloads) {
    // console.log("PAYLOAD: ", payloads);
    const employee = await findObject.execute("employees", {
      agency: Number(payloads[0]["FP PIN"]),
    });
    const user = await findObject.execute("users", {
      "employee.id": employee[0].id,
    });
    const empName =
      employee.length > 0 &&
      `${employee[0].Firstname} ${employee[0].Middlename} ${employee[0].surname}`;
    const data = {
      device: query.SN,
      logMessage: `Successfully biometric registration user ${empName}`,
      result: "User biometric registered",
    };
    if (employee.length > 0 && user.length > 0) {
      await upsertObject.execute("biometric_logs", data);

      // Check if the fingerprint and FID arrays already exist
      if (!user[0].fingerPrint) {
        user[0].fingerPrint = [];
      }

      if (!user[0].fingerFid) {
        user[0].fingerFid = [];
      }
      if (!user[0].fingerSize) {
        user[0].fingerSize = [];
      }

      // Iterate over the payloads array and process each entry
      payloads.forEach((payload) => {
        const formattedTMP = formatTMPString(payload.TMP);
        user[0].fingerPrint.push(formattedTMP);
        user[0].fingerFid.push(payload.FID);
        user[0].fingerSize.push(payload.Size);
      });

      // Update the user object with the modified fingerprint and FID arrays
      await upsertObject.execute("users", user[0]);
      console.log("Finer Registered");
      return Promise.resolve("OK");
    } else {
      return Promise.reject("error biometric finger");
    }
  }
}

module.exports = RegisterEmployeeUseCase;
