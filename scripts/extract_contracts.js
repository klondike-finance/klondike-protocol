const { readFile, readFileSync } = require("fs");

const dataRaw = readFileSync(`${__dirname}/deployed.json`);
const data = JSON.parse(dataRaw).kovan;
const extracted = {};
for (const name in data) {
    extracted[name] = data[name].address;
}
console.log(extracted);