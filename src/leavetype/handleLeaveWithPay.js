async function handleLeaveWithPay(
  findObject,
  upsertObject,
  convertTo24HourTime,
  attendance,
  schedule,
  dailyTimeRec
) {
  const computeCreditDeduction = (undertimeMinutes) => {
    let conversionValue = 0.0;

    for (let i = 1; i <= undertimeMinutes; i++) {
      // Add 0.003 at 7th, 19th, 31st, 43rd, 55th minute of every hour
      if (
        i % 60 === 7 ||
        i % 60 === 19 ||
        i % 60 === 31 ||
        i % 60 === 43 ||
        i % 60 === 55
      ) {
        conversionValue += 0.003;
      } else {
        conversionValue += 0.002;
      }
    }

    return conversionValue.toFixed(3).toString();
  };

  const leaveCred = await findObject.execute("leave_cred", {
    email: attendance.employee.email,
    type: "Leave (WP)",
  });
  const lateMinutes = parseFloat(attendance.lateMinutes);
  if (leaveCred.length > 0) {
    // user timeOut Again
    if (dailyTimeRec[0]?.isTimeOut === true) {
      const scheduleTimeOut = convertTo24HourTime(schedule.timeout);
      const atendanceTimeOut = convertTo24HourTime(attendance.timeOut);
      const isStillUndertimme =
        scheduleTimeOut.hours > atendanceTimeOut.hours ||
        (scheduleTimeOut.hours === atendanceTimeOut.hours &&
          scheduleTimeOut.minutes >= atendanceTimeOut.minutes);

      console.log("isUndertime: ", isStillUndertimme);
      const recentTimeOut = convertTo24HourTime(dailyTimeRec[0].timeOut);

      const differenceInMinutes = Math.abs(
        atendanceTimeOut.hours * 60 +
          atendanceTimeOut.minutes -
          (recentTimeOut.hours * 60 + recentTimeOut.minutes)
      );

      console.log("Difference: ", differenceInMinutes);
      const backCredits = parseFloat(
        computeCreditDeduction(differenceInMinutes)
      );

      const currentCredit = parseFloat(leaveCred[0].current);
      console.log("BACK CRED: ", backCredits);
      console.log("CURRENT CRED: ", currentCredit);

      if (isStillUndertimme) {
        const addCredit = backCredits + currentCredit;

        leaveCred[0].current = addCredit.toFixed(3).toString();
        console.log("ADDED: ", leaveCred[0].current);
        await upsertObject.execute("leave_cred", leaveCred[0]);
      } else {
        const differenceFromSched =
          scheduleTimeOut.hours * 60 +
          scheduleTimeOut.minutes -
          (recentTimeOut.hours * 60 + recentTimeOut.minutes);

        const backCredits = parseFloat(
          computeCreditDeduction(differenceFromSched)
        );
        console.log("SCHED DIFFERENCE: ", differenceFromSched);
        const addCredit = backCredits + currentCredit;
        leaveCred[0].current = addCredit.toFixed(3).toString();
        console.log("ADDED NOT UNDER: ", leaveCred[0].current);
        await upsertObject.execute("leave_cred", leaveCred[0]);
      }
      return Promise.resolve("OK");
    }

    // user First time Out

    let deductedData = parseFloat(leaveCred[0].current) - lateMinutes;

    console.log("DEDUCTED: ", deductedData);

    if (deductedData < 0) {
      deductedData = 0;
    }
    console.log("late: ", lateMinutes);
    const addFixCred = parseFloat(deductedData) + 0.042;
    leaveCred[0].current = addFixCred.toFixed(3).toString();
    console.log("TOTAL: ", addFixCred);
    await upsertObject.execute("leave_cred", leaveCred[0]);
  } else {
    let addFixCred = 0.042 - lateMinutes;
    if (addFixCred < 0) {
      addFixCred = 0;
    }
    const addCredit = {
      current: addFixCred.toFixed(3).toString(),
      type: "Leave (WP)",
      email: employee[0].email,
    };
    await upsertObject.execute("leave_cred", addCredit);
  }
}

module.exports = handleLeaveWithPay;
