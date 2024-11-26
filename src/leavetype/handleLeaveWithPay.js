async function handleLeaveWithPay(
  findObject,
  upsertObject,
  convertTo24HourTime,
  attendance,
  schedule,
  dailyTimeRec,
  employee,
  daily_time_record
) {
  const computeCreditAddtion = (recordLength) => {
    let conversionValue = 0.0;

    for (let i = 1; i <= recordLength; i++) {
      // Reset the conversion value at the start of each 30-day cycle
      if ((i - 1) % 30 === 0) {
        conversionValue = 0.042; // Reset conversionValue to 0.042 at the start of each cycle
      } else if (i % 30 === 2) {
        conversionValue += 0.041; // Add 0.041 for the second day of each cycle
      } else if (((i % 30) - 2) % 3 === 1 || ((i % 30) - 2) % 3 === 2) {
        conversionValue += 0.042; // Add 0.042 on the 3rd, 4th, 6th, 7th, etc., within each cycle
      } else {
        conversionValue += 0.041; // Add 0.041 on the 5th, 8th, etc., within each cycle
      }
    }

    return conversionValue.toFixed(3);
  };

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
    type: "Vacation Leave",
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

    let deductedData =
      parseFloat(leaveCred[0].current) - parseFloat(lateMinutes);

    console.log("DEDUCTED: ", deductedData);

    if (deductedData < 0) {
      deductedData = 0;
    }
    console.log("late: ", lateMinutes);
    const addCred = computeCreditAddtion(daily_time_record.length);
    console.log("ADD CRED: ", parseFloat(deductedData));
    const addFixCred = parseFloat(deductedData) + parseFloat(addCred);
    console.log("TOTAL: ", addFixCred);
    leaveCred[0].current = addFixCred.toFixed(3).toString();
    await upsertObject.execute("leave_cred", leaveCred[0]);
    return Promise.resolve("OK");
  } else {
    const addCred = computeCreditAddtion(daily_time_record.length);
    console.log("ADD CRED: ", addCred);
    let addFixCred = addCred - lateMinutes;
    if (addFixCred < 0) {
      addFixCred = 0;
    }
    const addCredit = {
      email: employee[0].email,
    };

    const vacationLeave = {
      ...addCredit,
      current: addFixCred.toFixed(3).toString(),
      type: "Vacation Leave",
    };
    const sickLeave = { ...addCredit, current: addCred, type: "Sick Leave" };
    await upsertObject.execute("leave_cred", vacationLeave);
    await upsertObject.execute("leave_cred", sickLeave);
  }
}

module.exports = handleLeaveWithPay;
