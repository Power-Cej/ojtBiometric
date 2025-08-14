function SendUserCommand(users, upsertObject) {
  return users
    .map((user, index) => {
      // Create the bioData for each user
      // const bioData = {
      //   pin: user.employee.agency,
      //   name: `${user.employee.Firstname || ""} ${
      //     user.employee.Middlename || ""
      //   } ${user.employee.surname || ""}`,
      //   pass: user,
      //   pri: "0", // Normal User "0", Registrar "2", Admin "6", Super Admin "14"
      //   fid: user?.fingerFid,
      //   TMP: user?.fingerPrint,
      //   size: user?.fingerSize,
      // };
      const bioData = {
        pin: user.companyID,
        name: user.username,
        pass: user.companyID,
        pri: "0",
        fid: "",
        size: "",
      };

      // Increment the C value based on the index
      const cValue = index + 1;

      // Prepare the command string
      if (Array.isArray(bioData.TMP) && bioData?.TMP.length > 0) {
        return bioData.TMP.map((item, index) => {
          const data = {
            FID: `${bioData?.fid[index]}`,
            Size: `${bioData?.size[index]}`,
            TMP: `${item}`,
          };
          const tab = "\t";
          const commandF = `C:${cValue}:DATA UPDATE FINGERTMP PIN=${bioData.pin}${tab}FID=${data.FID}${tab}Size=${data.Size}${tab}Valid=1${tab}TMP=${data.TMP}\n`;
          const command =
            `C:${cValue}:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}${tab}Priv=${bioData.pri}${tab}\n` +
            commandF;
          // const command = `C:${cValue}:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}${tab}Priv=${bioData.pri}`;
          console.log("with Bio: ", command);
          return command;
        });
      } else {
        const tab = "\t";
        // const commandF = `C:${cValue}:DATA UPDATE FINGERTMP PIN=${bioData.pin}${tab}FID=6${tab}Size=1288${tab}Valid=1${tab}TMP=${bioData.TMP}`;
        const command = `C:${cValue}:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}${tab}Priv=${bioData.pri}${tab}\n`;
        // + commandF;
        // const command = `C:${cValue}:DATA USER PIN=${bioData.pin}${tab}Name=${bioData.name}${tab}Passwd=${bioData.pass}${tab}Priv=${bioData.pri}`;
        console.log("no Bio: ", command);
        user.updateBio = "added";
        delete user.password;
        upsertObject.execute("users", user);
        return command;
      }
    })
    .join("\n"); // Join all commands with new line
}

module.exports = SendUserCommand;
