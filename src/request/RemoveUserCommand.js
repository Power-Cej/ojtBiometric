function RemoveUserCommand(users, upsertObject) {
  return users
    .map((user, index) => {
      user.isRemoved = false;
      upsertObject.execute("users", user);

      const removeData = {
        pin: user.employee.agency,
      };
      const tab = "\t";

      const cValue = index + 1;
      const deleteCommand = `C:${cValue}:DATA DELETE USERINFO PIN=${removeData.pin}`;
      console.log("DELETE: ", deleteCommand);
      return deleteCommand;
    })
    .join("\n");
}

module.exports = RemoveUserCommand;
