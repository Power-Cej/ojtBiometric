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

// function convertTo24Hour(time) {
//   const [timePart, meridian] = time.split(" "); // Split the time and AM/PM
//   let [hour, minute] = timePart.split(":").map(Number);

//   if (meridian === "PM" && hour !== 12) {
//     hour += 12; // Add 12 to convert PM times except 12 PM
//   } else if (meridian === "AM" && hour === 12) {
//     hour = 0; // Convert 12 AM to 0 (midnight)
//   }

//   // Return in 24-hour format with zero-padding for hours and minutes
//   return `${hour.toString().padStart(2, "0")}:${minute
//     .toString()
//     .padStart(2, "0")}`;
// }

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

// function getOvertimeDuration(timeIn, timeOut) {
//   console.log("TIMEIN: ", timeIn);
//   console.log("TIMEOUT: ", timeOut);
//   const [timeInHour, timeInMinute, timeInSecond] = timeIn
//     .split(":")
//     .map(Number);
//   const [timeOutHour, timeOutMinute, timeOutSecond] = timeOut
//     .split(":")
//     .map(Number);

//   // Convert timeIn and timeOut to seconds
//   const timeInSeconds = timeInHour * 3600 + timeInMinute * 60 + timeInSecond;
//   const timeOutSeconds =
//     timeOutHour * 3600 + timeOutMinute * 60 + timeOutSecond;

//   // Calculate the difference in seconds
//   const durationInSeconds = timeOutSeconds - timeInSeconds;

//   let plainHours = Math.floor(durationInSeconds / 3600);
//   if (plainHours < 0) {
//     plainHours = "0";
//   }
//   return plainHours.toString(); // Assign to data.overtime
// }

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
      hour12: false,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    };
    return new Date().toLocaleTimeString("en-US", options);
  }

  getCurrentTime() {
    const now = new Date();

    // Convert to UTC+8 manually
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const phTime = new Date(utc + 8 * 60 * 60000); // add 8 hours

    const hours = String(phTime.getHours()).padStart(2, "0");
    const minutes = String(phTime.getMinutes()).padStart(2, "0");
    const seconds = String(phTime.getSeconds()).padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
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

      // console.log("TIMESTAMP: ", timestamp);
      // console.log("userID: ", userID);
      // console.log("timeInOutStats: ", timeInOutStats);
      const deviceTime = timestamp.split(" ");

      if (userID === "undefined") {
        return Promise.resolve("OK");
      } else {
        const [dailyTimeRec, users] = await Promise.all([
          findObject.execute("daily_time_record", {
            date: this.getCurrentDate(),
            userID: parseInt(userID),
          }),
          findObject.execute("users", {
            companyID: parseFloat(userID),
          }),
        ]);
        const currentYear = now.getFullYear().toString();
        const currentMonth = now.getMonth().toString();
        let timeRecStats = [];

        let attendance = this.createAttendanceRecord(
          dailyTimeRec,
          users[0],
          currentYear,
          currentMonth,
          timeRecStats,
          this.getCurrentTime()
        );

        if (users.length > 0) {
          this.checkSchedule(
            dailyTimeRec,
            timeRecStats,
            attendance,
            query,
            this.getCurrentTime()
          );
        }

        try {
          await upsertObject.execute("daily_time_record", attendance);
          return Promise.resolve("OK");
        } catch (error) {
          return Promise.reject("Attendace: ", error);
        }
      }
    }
  }

  createAttendanceRecord(
    dailyTimeRec,
    users,
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
        user: users?.username,
        userID: users.companyID,
        year: currentYear,
        month: currentMonth,
      };
    } else {
      return {
        ...dailyTimeRec[0],
        timeRecStats,
        timeOut: deviceTime,
        user: users?.username,
        year: currentYear,
        month: currentMonth,
      };
    }
  }

  async checkSchedule(
    dailyTimeRec,
    timeRecStats,
    attendance,
    query,
    deviceTime
  ) {
    const schedule = { timein: "9:00 AM", timeout: "6:00 PM" };
    if (schedule) {
      let [hours, minutes, _] = deviceTime.split(":").map(Number);
      // const newTimeNow = convertTo24HourTime(deviceTime);
      const newSchedTimeIN = convertTo24HourTime(schedule.timein);
      const newSchedTimeOUT = convertTo24HourTime(schedule.timeout);
      const empName = attendance.user;
      const data = {
        device: query.SN.toString(),
        logMessage: `Successfully Time In ${empName}`,
        result: "Time In",
      };

      if (dailyTimeRec.length === 0) {
        if (
          hours > newSchedTimeIN.hours ||
          (hours === newSchedTimeIN.hours && minutes > newSchedTimeIN.minutes)
        ) {
          timeRecStats.push("LATE");

          try {
            await upsertObject.execute("biometric_logs", data);
          } catch (e) {
            console.error(e);
          }
        }
        // log time in
      } else if (dailyTimeRec.length > 0) {
        // const timeIn = convertTo24HourTime(dailyTimeRec[0].timeIn);
        let [timeInHour, timeInMinute, _] = dailyTimeRec[0]?.timeIn
          .split(":")
          .map(Number);
        if (
          timeInHour > newSchedTimeIN.hours ||
          (timeInHour === newSchedTimeIN.hours &&
            timeInMinute > newSchedTimeIN.minutes)
        ) {
          timeRecStats.push("LATE");
        }

        if (
          hours < newSchedTimeOUT.hours ||
          (hours === newSchedTimeOUT.hours && minutes < newSchedTimeOUT.minutes)
        ) {
          timeRecStats.push("UNDERTIME");
        }
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
