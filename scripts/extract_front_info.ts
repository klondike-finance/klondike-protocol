const { readFile, readFileSync, writeFileSync } = require("fs");
import hre from "hardhat";

const NETWORK = "kovan";

async function main() {
    const dataRaw = readFileSync(`${__dirname}/deployed.json`).toString();
    const data = JSON.parse(dataRaw)[NETWORK];
    const extracted: any = {};
    for (const name in data) {
        const contract = await hre.artifacts.readArtifact(name);
        extracted[name] = {
            address: data[name].address,
            abi: contract.abi,
        };
    }
    writeFileSync(`${__dirname}/../../basiscash-frontend/src/basis-cash/deployments/deployments.${NETWORK}.json`, JSON.stringify(extracted, null, 2));
}

main().then(() => console.log("Done")).catch(console.log)
