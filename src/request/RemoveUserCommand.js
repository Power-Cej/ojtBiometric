function RemoveUserCommand(users, upsertObject) {
  return users
    .map((user, index) => {
      user.isRemoved = false;
      user.removedSN = 0;
      upsertObject.execute("users", user);

      const removeData = {
        pin: user.employee.agency,
      };
      const tab = "\t";

      const cValue = index + 1;
      const deleteUserPhoto = `C:${cValue}}:DATA DELETE ATTPHOTO PIN=${removeData.pin}\n`;
      const deleteCommand =
        `C:${cValue}:DATA DELETE USERINFO PIN=${removeData.pin}\n` +
        deleteUserPhoto;
      console.log("DELETE: ", deleteCommand);
      return deleteCommand;
    })
    .join("\n");
}

module.exports = RemoveUserCommand;
