function userToCommand(users) {
  return users
    .map((user, index) => {
      // Create the bioData for each user
      const bioData = {
        pin: user.employee.agency,
        name: user.username,
        pass: user.employee.agency,
        pri: "0", // Normal User "0", Registrar "2", Admin "6", Super Admin "14"
        TMP: `${user?.fingerPrint}`,
      };

      // Increment the C value based on the index
      const cValue = index + 1;

      // Prepare the command string
      const tab = "\t";
      const commandF = `C:${cValue}:DATA UPDATE FINGERTMP PIN=${bioData.pin}${tab}FID=6${tab}Size=1288${tab}Valid=1${tab}TMP=${bioData.TMP}`;
      const command =
        `C:${cValue}:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}${tab}Priv=${bioData.pri}${tab}\n` +
        commandF;
      // const command = `C:${cValue}:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}${tab}Priv=${bioData.pri}`;
      console.log("Data inserted: ", command);
      return command;
    })
    .join("\n"); // Join all commands with new line
}

module.exports = userToCommand;
