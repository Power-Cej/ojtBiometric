const config = require("./config");
const request = require("./request");
const UpsertUseCase = require("./UpsertUseCase");

class AttendanceUseCase {
  // send(data) {
  //   const options = {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "X-Application-Id": config.applicationId,
  //     },
  //     body: JSON.stringify(data),
  //   };
  //   const url = `${config.endpoint}/collections/daily_time_record`;
  //   return request(url, options);
  // }

  async execute(query, lines) {
    let total = 0;
    const upsertObject = new UpsertUseCase();
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

      console.log("ATTTLOG: ", line);
      const status = timeInOutStats === "0" ? "Time IN" : "Time OUT";
      const dateToday = new Date();
      const utcTime = dateToday.toUTCString(); // Get UTC date and time

      // Extract the local time in HH:MM format
      const localTime = dateToday.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const attendance = {
        userId: parseInt(userID),
        date: utcTime,
        time: localTime,
        stats: status,
      };
      console.log("UTC: ", utcTime);
      try {
        await upsertObject.execute("attendance_rec", attendance);
        total++;
      } catch (error) {
        console.error("error send", error.text);
      }
    }
    return `OK: ${total}`;
  }
}

module.exports = AttendanceUseCase;
