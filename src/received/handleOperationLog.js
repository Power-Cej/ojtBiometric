async function handleOperationLog(query, lines, findObject, upsertObject) {
  lines.forEach(async (line) => {
    const [type] = line;
    console.log("LOGS: ", type, " ", lines);
    const employee = await findObject.execute("employees", {
      agency: Number(line[3]),
    });
    const empName =
      employee.length > 0
        ? `${employee[0]?.Firstname} ${employee[0]?.Middlename || ""} ${
            employee[0]?.surname
          }`
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

module.exports = handleOperationLog;
