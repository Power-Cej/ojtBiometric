async function handleLeaveWithPay(
  findObject,
  upsertObject,
  convertTo24HourTime,
  attendanceRec,
  schedule,
  dailyTimeRec,
  employee,
  daily_time_record,
  getOvertimeDuration,
  scheduleTimeOut24H
) {
  const late = attendanceRec.stillLate;
  const { stillLate, ...attendance } = attendanceRec;

  // const computeCreditAddtion = (recordLength) => {
  //   let conversionValue = 0.0;

  //   for (let i = 1; i <= recordLength; i++) {
  //     // Reset the conversion value at the start of each 30-day cycle
  //     if ((i - 1) % 30 === 0) {
  //       conversionValue = 0.042; // Reset conversionValue to 0.042 at the start of each cycle
  //     } else if (i % 30 === 2) {
  //       conversionValue += 0.041; // Add 0.041 for the second day of each cycle
  //     } else if (((i % 30) - 2) % 3 === 1 || ((i % 30) - 2) % 3 === 2) {
  //       conversionValue += 0.042; // Add 0.042 on the 3rd, 4th, 6th, 7th, etc., within each cycle
  //     } else {
  //       conversionValue += 0.041; // Add 0.041 on the 5th, 8th, etc., within each cycle
  //     }
  //   }

  //   return conversionValue.toFixed(3);
  // };

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

  let lateMinutes = parseFloat(attendance?.lateMinutes);
  let leaveCredits = leaveCred[0];
  let newlyHiredDeducted = parseFloat(attendance?.lateMinutes);
  if (leaveCred.length > 0) {
    // user timeOut Again
    if (dailyTimeRec[0]?.isTimeOut === true) {
      const scheduleTimeOut = convertTo24HourTime(schedule.timeout);
      const atendanceTimeOut = convertTo24HourTime(attendance.timeOut);
      const isStillUndertimme =
        scheduleTimeOut.hours > atendanceTimeOut.hours ||
        (scheduleTimeOut.hours === atendanceTimeOut.hours &&
          scheduleTimeOut.minutes >= atendanceTimeOut.minutes);

      const recentTimeOut = convertTo24HourTime(dailyTimeRec[0].timeOut);

      const differenceInMinutes = Math.abs(
        atendanceTimeOut.hours * 60 +
          atendanceTimeOut.minutes -
          (recentTimeOut.hours * 60 + recentTimeOut.minutes)
      );
      let minDeduct =
        parseFloat(computeCreditDeduction(differenceInMinutes)) - late;
      let newlyHiredDeduct = 0;

      if (isStillUndertimme) {
        if (parseFloat(attendance.newlyHiredDeduct) !== 0) {
          newlyHiredDeduct =
            parseFloat(attendance?.newlyHiredDeduct) - minDeduct;
        }
        let backDedection = parseFloat(leaveCred[0].current);
        console.log("LEAVVVVVVV: ", parseFloat(attendance?.newlyHiredDeduct));
        console.log("MINNNN: ", minDeduct);
        console.log("NEWLY: ", newlyHiredDeduct);

        if (newlyHiredDeduct < 0) {
          backDedection =
            parseFloat(leaveCred[0].current) + Math.abs(newlyHiredDeduct);
          newlyHiredDeduct = 0;
        }
        leaveCred[0].current = backDedection.toFixed(3);
        leaveCredits = leaveCred[0];
      }
      // not late
      else {
        const differenceFromSched =
          scheduleTimeOut.hours * 60 +
          scheduleTimeOut.minutes -
          (recentTimeOut.hours * 60 + recentTimeOut.minutes);

        minDeduct =
          parseFloat(computeCreditDeduction(differenceFromSched)) - late;
        let backCredits = minDeduct;

        if (parseFloat(attendance.newlyHiredDeduct) !== 0) {
          backCredits = parseFloat(attendance?.newlyHiredDeduct) - minDeduct;
        }
        let backDedection = parseFloat(leaveCred[0].current) + backCredits;
        if (backCredits < 0) {
          backDedection =
            parseFloat(leaveCred[0].current) + Math.abs(backCredits);
          // console.log("BACK: ", newlyHiredDeduct);
        }
        leaveCred[0].current = backDedection.toFixed(3);
        leaveCredits = leaveCred[0];
        newlyHiredDeduct = 0;
      }
      attendance.newlyHiredDeduct = newlyHiredDeduct.toFixed(3);
      attendance.lateMinutes = lateMinutes.toFixed(3);
      console.log("NEWLYHIRED? : ", newlyHiredDeduct);
      console.log("Atten: ", attendance);
      console.log("CREDIT: ", leaveCredits);

      try {
        if (leaveCredits !== undefined) {
          await upsertObject.execute("leave_cred", leaveCredits);
        }
        attendance.overtime = getOvertimeDuration(
          scheduleTimeOut24H,
          attendance.timeOut
        );
        await upsertObject.execute("daily_time_record", attendance);
        return Promise.resolve("OK");
      } catch (e) {
        Promise.reject(e);
      }
      return Promise.resolve("OK");
    }

    // user First time Out

    let deductedData =
      parseFloat(leaveCred[0].current) - parseFloat(lateMinutes);
    if (deductedData < 0) {
      newlyHiredDeducted = Math.abs(deductedData);
      deductedData = 0;
    } else {
      newlyHiredDeducted = 0;
    }
    leaveCred[0].current = deductedData.toFixed(3);
    leaveCredits = leaveCred[0];
  }
  attendance.newlyHiredDeduct = newlyHiredDeducted.toFixed(3);
  attendance.lateMinutes = lateMinutes.toFixed(3);
  try {
    if (leaveCredits !== undefined) {
      console.log("Credit : ", leaveCredits);
      await upsertObject.execute("leave_cred", leaveCredits);
    }
    attendance.overtime = getOvertimeDuration(
      scheduleTimeOut24H,
      attendance.timeOut
    );
    console.log("lateMinutes: ", attendance.lateMinutes);
    console.log("newlyHiredDeduct: ", attendance.newlyHiredDeduct);
    await upsertObject.execute("daily_time_record", attendance);
    return Promise.resolve("OK");
  } catch (e) {
    Promise.reject(e);
  }
}

module.exports = handleLeaveWithPay;
