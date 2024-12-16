const config = require("./config");
const FindObjectUseCase = require("./FindObejctUseCase");
const handleLeaveWithPay = require("./leavetype/handleLeaveWithPay");
const request = require("./request");
const UpsertUseCase = require("./UpsertUseCase");

const selectedDay = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const findObject = new FindObjectUseCase();
const upsertObject = new UpsertUseCase();
const now = new Date();

function convertTo24Hour(time) {
  const [timePart, meridian] = time.split(" "); // Split the time and AM/PM
  let [hour, minute] = timePart.split(":").map(Number);

  if (meridian === "PM" && hour !== 12) {
    hour += 12; // Add 12 to convert PM times except 12 PM
  } else if (meridian === "AM" && hour === 12) {
    hour = 0; // Convert 12 AM to 0 (midnight)
  }

  // Return in 24-hour format with zero-padding for hours and minutes
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
}

function convertTo24HourTime(time) {
  const [timePart, modifier] = time.split(" ");
  let [hours, minutes] = timePart.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) {
    hours += 12;
  } else if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  return { hours, minutes };
}

function getOvertimeDuration(timeIn, timeOut) {
  console.log("TIMEIN: ", timeIn);
  console.log("TIMEOUT: ", timeOut);
  const [timeInHour, timeInMinute, timeInSecond] = timeIn
    .split(":")
    .map(Number);
  const [timeOutHour, timeOutMinute, timeOutSecond] = timeOut
    .split(":")
    .map(Number);

  // Convert timeIn and timeOut to seconds
  const timeInSeconds = timeInHour * 3600 + timeInMinute * 60 + timeInSecond;
  const timeOutSeconds =
    timeOutHour * 3600 + timeOutMinute * 60 + timeOutSecond;

  // Calculate the difference in seconds
  const durationInSeconds = timeOutSeconds - timeInSeconds;

  let plainHours = Math.floor(durationInSeconds / 3600);
  if (plainHours < 0) {
    plainHours = "0";
  }
  return plainHours.toString(); // Assign to data.overtime
}

class AttendanceUseCase {
  getCurrentDate() {
    const options = {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return new Date().toLocaleDateString("en-US", options);
  }

  suspensionFormat() {
    const options = {
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    return new Date().toLocaleDateString("en-US", options);
  }

  getCurrentTime() {
    const options = {
      hour12: true,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    };
    return new Date().toLocaleTimeString("en-US", options);
  }

  computeCreditDeduction(undertimeMinutes) {
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
  }

  async execute(query, lines) {
    let total = 0;
    for (let line of lines) {
      const [
        userID,
        timestamp,
        timeInOutStats,
        method, //using fingerprint "1" or password "0"
        status3,
        status4,
        status5,
      ] = line;

      console.log("TIMESTAMP: ", timestamp);
      const deviceTime = timestamp.split(" ");

      if (userID === "undefined") {
        return Promise.resolve("OK");
      } else {
        const [
          employee,
          dailyTimeRec,
          listofHolidays,
          listofSuspension,
          daily_time_record,
        ] = await Promise.all([
          findObject.execute("employees", {
            agency: Number(userID),
          }),
          findObject.execute("daily_time_record", {
            date: this.getCurrentDate(),
            employee: { agency: Number(userID) },
          }),
          findObject.execute("holidays", { date: this.getCurrentDate() }),
          findObject.execute("suspension", {
            status: "active",
            dateFrom: {
              $lte: `${this.suspensionFormat()} at ${this.getCurrentTime()}`,
            },
            dateTo: {
              $gte: `${this.suspensionFormat()} at ${this.getCurrentTime()}`,
            },
          }),
          findObject.execute("daily_time_record", {
            employee: { agency: Number(userID) },
          }),
        ]);
        const listofLeaves = await findObject.execute("leave_request", {
          employee: { id: employee[0].id },
          stats: "Approved",
          startdate: { $lte: this.getCurrentDate() },
          enddate: { $gte: this.getCurrentDate() },
        });

        const currentYear = now.getFullYear().toString();
        const currentMonth = now.getMonth().toString();
        let timeRecStats = [];

        let attendance = this.createAttendanceRecord(
          dailyTimeRec,
          employee,
          currentYear,
          currentMonth,
          timeRecStats,
          deviceTime[1]
        );

        if (listofHolidays.length > 0) {
          this.handleHolidays(listofHolidays, dailyTimeRec, timeRecStats);
        }
        if (listofLeaves.length > 0) {
          this.handleLeaves(listofLeaves, dailyTimeRec, timeRecStats);
        }

        if (this.shouldCheckSchedule(employee, listofHolidays, listofLeaves)) {
          this.checkSchedule(
            employee,
            dailyTimeRec,
            timeRecStats,
            attendance,
            query,
            listofSuspension,
            deviceTime[1]
          );
        }

        try {
          // console.log("employee: ", employee);
          const dayToDay = selectedDay[now.getDay()];
          const schedule = employee[0].schedule.find(
            (sched) => sched.day === dayToDay
          );
          // console.log("attendance get: ", attendance);
          // console.log("emppp", Array.isArray(employee[0].schedule));
          // console.log("scheddd", schedule);
          if (Array.isArray(employee[0].schedule) && schedule) {
            if (
              attendance.timeOut !== "--:--" &&
              employee[0]?.employmentStatus === "Permanent"
            ) {
              const scheduleTimeOut24H = `${convertTo24Hour(
                schedule.timeout
              )}:00`;
              await handleLeaveWithPay(
                findObject,
                upsertObject,
                convertTo24HourTime,
                attendance,
                schedule,
                dailyTimeRec,
                employee,
                daily_time_record,
                getOvertimeDuration,
                scheduleTimeOut24H
              );
              // return;
              return Promise.resolve("OK");
            }
            await upsertObject.execute("daily_time_record", attendance);
            return Promise.resolve("OK");
          } else {
            console.log("Assign Schedule First");
          }
        } catch (error) {
          return Promise.reject("Attendace: ", error);
        }
      }
      return `OK: ${total}`;
    }
  }

  createAttendanceRecord(
    dailyTimeRec,
    employee,
    currentYear,
    currentMonth,
    timeRecStats,
    deviceTime
  ) {
    if (dailyTimeRec.length === 0) {
      return {
        date: this.getCurrentDate(),
        timeRecStats,
        timeIn: deviceTime,
        timeOut: "--:--",
        employee: employee[0],
        year: currentYear,
        month: currentMonth,
      };
    } else {
      return {
        ...dailyTimeRec[0],
        timeRecStats,
        timeOut: deviceTime,
        employee: employee[0],
        year: currentYear,
        month: currentMonth,
      };
    }
  }

  handleHolidays(listofHolidays, dailyTimeRec, timeRecStats) {
    listofHolidays.forEach((holiday) => {
      if (holiday.type) {
        timeRecStats.push(holiday.type);
      }
    });
  }

  handleLeaves(listofLeaves, dailyTimeRec, timeRecStats) {
    listofLeaves.forEach((leave) => {
      if (leave.selectedType) {
        timeRecStats.push(leave.selectedType);
      }
    });
  }

  shouldCheckSchedule(employee, listofHolidays, listofLeaves) {
    return (
      Array.isArray(employee[0].schedule) &&
      employee[0].schedule.length > 0 &&
      listofHolidays.length === 0 &&
      listofLeaves.length === 0
    );
  }

  async checkSchedule(
    employee,
    dailyTimeRec,
    timeRecStats,
    attendance,
    query,
    listofSuspension,
    deviceTime
  ) {
    const dayToDay = selectedDay[now.getDay()];
    const schedule = employee[0].schedule.find(
      (sched) => sched.day === dayToDay
    );

    if (schedule) {
      const newTimeNow = convertTo24HourTime(deviceTime);
      const newSchedTimeIN = convertTo24HourTime(schedule.timein);
      const newSchedTimeOUT = convertTo24HourTime(schedule.timeout);
      const empName = `${attendance?.employee?.Firstname} ${
        attendance?.employee?.Middlename || ""
      } ${attendance?.employee?.surname}`;
      const data = {
        device: query.SN,
        logMessage: `Successfully Time In ${empName}`,
        result: "Time In",
      };

      if (dailyTimeRec.length === 0) {
        if (
          newTimeNow.hours > newSchedTimeIN.hours ||
          (newTimeNow.hours === newSchedTimeIN.hours &&
            newTimeNow.minutes > newSchedTimeIN.minutes)
        ) {
          timeRecStats.push("LATE");

          const lateMinutes =
            (newTimeNow.hours - newSchedTimeIN.hours) * 60 +
            (newTimeNow.minutes - newSchedTimeIN.minutes);
          console.log("LATE: ", lateMinutes);

          const conversionValue = this.computeCreditDeduction(lateMinutes);
          console.log("late Deduction: ", conversionValue);
          attendance.lateMinutes = conversionValue;
          try {
            await upsertObject.execute("biometric_logs", data);
          } catch (e) {
            console.error(e);
          }
        }
        // log time in
      } else if (dailyTimeRec.length > 0) {
        const timeIn = convertTo24HourTime(dailyTimeRec[0].timeIn);
        const timeOut = convertTo24HourTime(dailyTimeRec[0].timeOut);
        if (listofSuspension.length > 0) {
          timeRecStats.push("SUSPENDED");
        }
        if (
          timeIn.hours > newSchedTimeIN.hours ||
          (timeIn.hours === newSchedTimeIN.hours &&
            timeIn.minutes > newSchedTimeIN.minutes)
        ) {
          timeRecStats.push("LATE");
        }

        let lateMinutes =
          (newSchedTimeOUT.hours - newTimeNow.hours) * 60 +
          (newSchedTimeOUT.minutes - newTimeNow.minutes);

        if (lateMinutes < 0) {
          lateMinutes = 0;
        }

        let stillLate =
          (newSchedTimeOUT.hours - timeOut.hours) * 60 +
            (newSchedTimeOUT.minutes - timeOut.minutes) || 0;
        if (stillLate < 0) {
          stillLate = 0;
        }

        if (
          newTimeNow.hours < newSchedTimeOUT.hours ||
          (newTimeNow.hours === newSchedTimeOUT.hours &&
            newTimeNow.minutes < newSchedTimeOUT.minutes)
        ) {
          lateMinutes =
            (newSchedTimeOUT.hours - newTimeNow.hours) * 60 +
            (newSchedTimeOUT.minutes - newTimeNow.minutes);
          stillLate =
            (newTimeNow.hours - timeOut.hours) * 60 +
            (newTimeNow.minutes - timeOut.minutes);

          // if (dailyTimeRec[0].isTimeOut === true) {
          //   underTime = parseFloat(dailyTimeRec[0].lateMinutes || 0);
          //   attendance.newlyHiredDeduct = dailyTimeRec[0].newlyHiredDeduct;
          // } else {
          //   underTime =
          //     parseFloat(dailyTimeRec[0].lateMinutes || 0) +
          //     parseFloat(conversionValue);
          // }
          timeRecStats.push("UNDERTIME");
        }
        const conversionValue = this.computeCreditDeduction(lateMinutes);
        let underTime = 0;

        if (dailyTimeRec[0].isTimeOut === true) {
          const late = this.computeCreditDeduction(stillLate);
          underTime =
            parseFloat(dailyTimeRec[0].lateMinutes || 0) - parseFloat(late);
          console.log("TOTAL Repeated out: ", underTime);
        } else {
          underTime =
            parseFloat(dailyTimeRec[0].lateMinutes || 0) +
            parseFloat(conversionValue);
          console.log("TOTAL First out: ", underTime);
        }
        if (underTime < 0) {
          underTime = 0;
        }

        attendance.lateMinutes = underTime.toFixed(3).toString();
        attendance.newlyHiredDeduct =
          attendance.newlyHiredDeduct - this.computeCreditDeduction(stillLate);
        attendance.stillLate = this.computeCreditDeduction(stillLate);
        attendance.isTimeOut = true;
        try {
          (data.logMessage = `Successfully Time Out ${empName}`),
            (data.result = "Time Out"),
            upsertObject.execute("biometric_logs", data);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return "OK";
  }
}

module.exports = AttendanceUseCase;
