const FindObjectUseCase = require("./FindObejctUseCase");
const UpsertUseCase = require("./UpsertUseCase");
const config = require("./config");

const findObject = new FindObjectUseCase();

class HrisUseCase {
  async execute(query, devices) {
    // biometric user
    const users = await findObject.execute("employees", {
      area: devices[0]?.area,
    });

    // biometric user
    if (users.length > 0) {
      for (const user of users) {
        // Prepare the data for each device
        const bioData = {
          pin: user.agency,
          name: user.Firstname,
          pass: user.agency,
          // privilege: "0" // nomarl User "0" or super Admin "1"
        };

        const tab = "\t";
        const command = `C:1:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}\n`;

        const updateAt = new Date(user.updatedAt);
        const lastSync = new Date(devices[0].lastSync);
        if (updateAt > lastSync) {
          // Return the command immediately
          console.log("User update");
          const returnCommand = Promise.resolve(command);

          console.log(
            "Data sent to all devices successfully.",
            command,
            " ",
            query
          );

          return returnCommand;
        }
      }
    }
  }
}
module.exports = HrisUseCase;
