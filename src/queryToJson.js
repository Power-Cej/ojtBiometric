/**
 * Convert rest query to json format
 * @param query
 * @returns {{}}
 */
function queryToJson(query) {
    return Object.entries(query)
        .reduce((json, [key, value]) => {
            try {
                json[key] = JSON.parse(value);
            } catch (e) {
                json[key] = value;
            }
            return json;
        }, {});
}

module.exports = queryToJson;
