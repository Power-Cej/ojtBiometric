const AttendanceUseCase = require("../src/AttendanceUseCase");
const FindObjectUseCase = require("../src/FindObejctUseCase");
const UpsertUseCase = require("../src/UpsertUseCase");
// const handleLeaveWithPay = require("./leavetype/handleLeaveWithPay");
// const config = require("./config");

describe("AttendanceUseCase", () => {
  let attendanceUseCase;

  beforeEach(() => {
    attendanceUseCase = new AttendanceUseCase();
  });

  describe("convertTo24HourTime", () => {
    it("should convert AM time correctly", () => {
      const result = attendanceUseCase.convertTo24HourTime("8:30 AM");
      expect(result).toEqual({ hours: 8, minutes: 30 });
    });

    it("should convert PM time correctly", () => {
      const result = attendanceUseCase.convertTo24HourTime("2:45 PM");
      expect(result).toEqual({ hours: 14, minutes: 45 });
    });

    it("should handle 12:00 AM as 00:00", () => {
      const result = attendanceUseCase.convertTo24HourTime("12:00 AM");
      expect(result).toEqual({ hours: 0, minutes: 0 });
    });

    it("should handle 12:00 PM as 12:00", () => {
      const result = attendanceUseCase.convertTo24HourTime("12:00 PM");
      expect(result).toEqual({ hours: 12, minutes: 0 });
    });
  });

  describe("computeCreditDeduction", () => {
    it("should calculate deduction correctly for specific minutes", () => {
      const result = attendanceUseCase.computeCreditDeduction(10);
      expect(result).toBe("0.021");
    });

    it("should apply extra deduction at specific intervals", () => {
      const result = attendanceUseCase.computeCreditDeduction(55);
      expect(result).toBe("0.115");
    });
  });

  describe("getCurrentDate", () => {
    it("should return the current date in the correct format", () => {
      const result = attendanceUseCase.getCurrentDate();
      const options = {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      };
      const expectedDate = new Date().toLocaleDateString("en-US", options);
      expect(result).toBe(expectedDate);
    });
  });

  //   describe("execute", () => {

  //     let findObjectSpy, upsertObjectSpy;

  //     beforeEach(() => {
  //       findObjectSpy = spyOn(
  //         FindObjectUseCase.prototype,
  //         "execute"
  //       ).and.returnValue(Promise.resolve([]));
  //       upsertObjectSpy = spyOn(
  //         UpsertUseCase.prototype,
  //         "execute"
  //       ).and.returnValue(Promise.resolve());
  //       spyOn(console, "log"); // To suppress console logs during tests
  //     });

  //     it("should call findObject and upsertObject methods within execute", async () => {
  //       const query = { SN: "12345" };
  //       const lines = [["1", "2024-10-25 08:00 AM", "IN", "1", "", "", ""]];

  //       await attendanceUseCase.execute(query, lines);

  //       expect(findObjectSpy).toHaveBeenCalledTimes(4);
  //       expect(upsertObjectSpy).toHaveBeenCalled();
  //     });

  //     it('should return "OK" if userID is undefined', async () => {
  //       const query = { SN: "12345" };
  //       const lines = [
  //         ["undefined", "2024-10-25 08:00 AM", "IN", "1", "", "", ""],
  //       ];

  //       const result = await attendanceUseCase.execute(query, lines);
  //       expect(result).toBe("OK");
  //     });
  //   });
});
