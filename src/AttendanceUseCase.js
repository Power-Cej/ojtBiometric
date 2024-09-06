class AttendanceUseCase {

    execute(query,lines) {
        let total = 0;
        for (let line of lines) {
            const [employee_id, timestamp, status1, status2, status3, status4, status5] = line;
            const record = {
                sn: query.SN,
                table: query.table,
                stamp: query.Stamp,
                employee_id: employee_id.trim(),
                timestamp: timestamp.trim(),
                status1: parseInt(status1, 10),
                status2: parseInt(status2, 10),
                status3: parseInt(status3, 10),
                status4: parseInt(status4, 10),
                status5: parseInt(status5, 10),
                created_at: new Date()
            };
            console.log('Record:', record);
            // Save the record to the database
            // await db.insert('attendances', record);
            total++;
        }
        return `OK: ${total}`;
    }
}

module.exports = AttendanceUseCase;