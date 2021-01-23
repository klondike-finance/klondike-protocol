import { readFileSync, unlinkSync, writeFileSync } from "fs";

import hre from 'hardhat';

async function main() {
    const deployedContractsPath = `${__dirname}/deployed.json`;
    const data = readFileSync(deployedContractsPath).toString();
    const deployedContracts1 = JSON.parse(data).kovan;
    const deployedContracts: any = {};
    deployedContracts["StableFund"] = deployedContracts1["StableFund"];
    for (const name in deployedContracts) {
        const constructorArgsPath = `${__dirname}/../tmp/verifyArgs${name}.js`;
        const { address, args = [] } = deployedContracts[name];
        console.log(`Verifying ${name} @ ${address} with args ${JSON.stringify(args)}`);
        writeFileSync(constructorArgsPath, `module.exports = ${JSON.stringify(args)}`);
        try {
            await hre.run("verify", {
                address,
                constructorArgs: constructorArgsPath
            });
        }
        catch (e) {
            console.log(e);
        }
    }
}

function sleep(ms: any) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

main().then(() => {
    console.log("Done!");
}).catch(console.log);