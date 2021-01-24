import hre, { ethers } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { readFileSync, writeFileSync } from 'fs';
import { BigNumber, Contract } from 'ethers';

type Context = {
    operator: SignerWithAddress,
    deployedContracts: { [key: string]: any }
    contracts: { [key: string]: Contract }
};

const PROD = false;

/* ========== CONSTANTS ========== */

const SATOSHI_PER_BTC = 100_000_000;
const SLEEP_TIME = PROD ? 3000 : 1000;
const TIMEOUT = PROD ? 400_000 : 200_000;

/* ========== TIME PARAMS ========== */

const T = Math.floor((PROD ? new Date("2021-01-25T09:00:00.000Z") : new Date("2021-01-23T12:00:00.000Z")).getTime() / 1000);
const DAY_SECS = 24 * 60 * 60;
const DATE_SCALE = PROD ? 1 : 0.001;
const KBTC_FUNDS_START = T;
const KLON_FUNDS_START = T;
const ORACLE_START_DATE = T + Math.floor(4 * DAY_SECS * DATE_SCALE);
const TREASURY_START_DATE = T + Math.floor(6 * DAY_SECS * DATE_SCALE);
const ORALCE_PERIOD_SECS = PROD ? 3600 : 60;
const SEIGNORAGE_PERIOD_SECS = PROD ? DAY_SECS : 60;
const TIMELOCK_DELAY = PROD ? 3600 * 24 * 2 : 120;

/* ========== WALLET PARAMS ========== */
const TRADER = PROD ? "0x1be8DAA03cc29E39d6E6710a1570CDaf3f413Ef2" : "0xac602665f618652d53565519eaf24d0326c2ec1a";
const INITIAL_RECEIVER = TRADER;
const MULTISIG_ADDRESSES = PROD ? ["TBA", "0x7217084Dd74CD28c9cFd4C7e612cdc631c4A5030", "0x6c907824d4c5b34920602EbA103649c435AAD449"] : ["0xc699c2611e81a0995f26d4f293ef9dd5bef4da92", "0xCEbc1DEcABb266e064FB9759fd413A885dA885dd", "0x2CEFFCA5C29c3E1d9a2586E49D80c7A057d8c5F9"];

/* ========== FUND PARAMS ========== */

const INITIAL_KBTC_FOR_POOLS = BigNumber.from(ethers.constants.WeiPerEther).mul(3);
const INITIAL_KLON_FOR_WBTC_KBTC = BigNumber.from(ethers.constants.WeiPerEther).mul(750_000);
const INITIAL_KLON_FOR_WBTC_KLON = BigNumber.from(ethers.constants.WeiPerEther).mul(250_000);
const INITIAL_KBTC_DISTRIBUTION = BigNumber.from(ethers.constants.WeiPerEther).mul(2);
const DECAY_RATE = 75;

/* ========== UNISWAP PARAMS ========== */

const MAX_UNISWAP_ALLOWANCE_TOKEN = BigNumber.from(ethers.constants.WeiPerEther).mul(1);
const MAX_UNISWAP_ALLOWANCE_BTC = BigNumber.from(SATOSHI_PER_BTC).mul(1);
const UNISWAP_DEADLINE = Math.floor(new Date().getTime() / 1000) + 10 * 60; // 10 min
const UNISWAP_INITIAL_LIQUIDITY_AMOUNT_TOKEN = BigNumber.from(10).pow(12);
const UNISWAP_INITIAL_LIQUIDITY_AMOUNT_BTC = BigNumber.from(100);

/* ========== STAGE PARAMS ========== */

const WBTC_TOTAL_SUPPLY = BigNumber.from(SATOSHI_PER_BTC).mul(100_000_000_000_000);


async function main() {
    console.log("Starting deploy");
    const deployedContractsPath = `${__dirname}/deployed.json`;
    let deployedContracts = {};
    try {
        deployedContracts = JSON.parse(readFileSync(deployedContractsPath).toString());
    } catch (e) {
        console.log("WARN: Could not read known contracts file.")
    }
    const [operator] = await ethers.getSigners();
    const context: Context = { operator, deployedContracts, contracts: {} };
    await compileContracts();
    try {
        await withTimeout(context, deployContract(context, "KBTC"));
        await withTimeout(context, mintInitial(context));
        await withTimeout(context, deployContract(context, "Kbond"));
        await withTimeout(context, deployContract(context, "Klon"));
        await withTimeout(context, deployToken(context, "WBTC"));
        await withTimeout(context, deployToken(context, "TBTC"));
        await withTimeout(context, deployToken(context, "RenBTC"));
        await withTimeout(context, deployUniswap(context));
        await withTimeout(context, setUniswapAllowance(context, "KBTC", MAX_UNISWAP_ALLOWANCE_TOKEN));
        await withTimeout(context, setUniswapAllowance(context, "Kbond", MAX_UNISWAP_ALLOWANCE_TOKEN));
        await withTimeout(context, setUniswapAllowance(context, "Klon", MAX_UNISWAP_ALLOWANCE_TOKEN));
        await withTimeout(context, setUniswapAllowance(context, "WBTC", MAX_UNISWAP_ALLOWANCE_BTC));
        await withTimeout(context, depositLiquidityToUniswap(context, "KBTC", "WBTC", UNISWAP_INITIAL_LIQUIDITY_AMOUNT_TOKEN, UNISWAP_INITIAL_LIQUIDITY_AMOUNT_BTC));
        await withTimeout(context, depositLiquidityToUniswap(context, "Klon", "WBTC", UNISWAP_INITIAL_LIQUIDITY_AMOUNT_TOKEN, UNISWAP_INITIAL_LIQUIDITY_AMOUNT_BTC));
        await withTimeout(context, deployContract(context, "Boardroom", context.contracts["KBTC"].address, context.contracts["Klon"].address));
        await withTimeout(context, deployContract(context, "Oracle", context.contracts["UniswapV2Factory"].address, context.contracts["KBTC"].address, context.contracts["WBTC"].address, ORALCE_PERIOD_SECS, ORACLE_START_DATE));
        await withTimeout(context, deployContract(context, "DevFund"));
        await withTimeout(context, deployContract(context, "StableFund", context.contracts["WBTC"].address, context.contracts["KBTC"].address, context.contracts["UniswapV2Factory"].address, context.contracts["UniswapV2Router02"].address, TRADER));
        await withTimeout(context, deployContract(context, "Treasury", context.contracts["KBTC"].address, context.contracts["Kbond"].address, context.contracts["Klon"].address, context.contracts["Oracle"].address, context.contracts["Oracle"].address, context.contracts["Boardroom"].address, context.contracts["DevFund"].address, context.contracts["StableFund"].address, TREASURY_START_DATE, SEIGNORAGE_PERIOD_SECS));
        await withTimeout(context, deployKBTCPools(context));
        await withTimeout(context, deployKLONPools(context));
        await withTimeout(context, deployAndMintKBTCDistributor(context, ["KBTCWBTCPool", "KBTCRenBTCPool", "KBTCTBTCPool"]));
        await withTimeout(context, distributeToKBTCPools(context, ["KBTCWBTCPool", "KBTCRenBTCPool", "KBTCTBTCPool"]));
        await withTimeout(context, deployAndMintKlonDistributor(context));
        await withTimeout(context, distributeToKLONPools(context));
        await withTimeout(context, deployContract(context, "MultiSigWallet", MULTISIG_ADDRESSES, 2));
        await withTimeout(context, deployContract(context, "Timelock", context.contracts["MultiSigWallet"].address, TIMELOCK_DELAY));        
        await withTimeout(context, lockOperators(context));
    } finally {
        writeFileSync(deployedContractsPath, JSON.stringify(deployedContracts, null, 2));
    }

}

async function mintInitial(context: Context) {
    console.log(`Minting ${INITIAL_KBTC_DISTRIBUTION} KBTC to ${INITIAL_RECEIVER}`);
    const kbtc = context.contracts["KBTC"];
    await mintIfZero(kbtc, INITIAL_RECEIVER, INITIAL_KBTC_DISTRIBUTION);
}

function withTimeout<T>(context: Context, promise: Promise<T>, timeout: any = TIMEOUT): Promise<void> {
    let done = false;
    return Promise.race([sleep(timeout).then(() => {
        if (done) { return };
        console.log("Operation timeout");
        const deployedContractsPath = `${__dirname}/deployed.json`;
        writeFileSync(deployedContractsPath, JSON.stringify(context.deployedContracts, null, 2));
        process.exit(1);
    }), promise.then(() => { done = true })])
}

async function compileContracts() {
    console.log("Compiling contracts");
    await hre.run('compile');
    console.log("Compiled contracts");
}

async function lockOperators(context: Context) {
    console.log("Locking operators");
    const timelock = context.contracts["Timelock"];
    const treasury = context.contracts["Treasury"];
    const boardroom = context.contracts["Boardroom"];
    const multisig = context.contracts["MultiSigWallet"];
    const stableFund = context.contracts["StableFund"];
    const devFund = context.contracts["DevFund"];
    await setOperatorToTreasury(context, "KBTC", false);
    await setOperatorToTreasury(context, "Kbond", false);
    await setOperatorToTreasury(context, "Klon", false);
    await setOperatorToTreasury(context, "Boardroom", true);
    await sleep(SLEEP_TIME);
    console.log("Setting boardroom ownership");
    await boardroom.transferOwnership(multisig.address);
    await sleep(SLEEP_TIME);
    console.log("Setting stable fund operator");
    await stableFund.transferOperator(multisig.address);
    await sleep(SLEEP_TIME);
    console.log("Setting stable fund ownership");
    await stableFund.transferOwnership(timelock.address);
    await sleep(SLEEP_TIME);
    console.log("Setting treasury operator");
    await treasury.transferOperator(timelock.address);
    await sleep(SLEEP_TIME);
    console.log("Setting treasury ownership");
    await treasury.transferOwnership(timelock.address);
    console.log("Setting devFund operator");
    await devFund.transferOperator(multisig.address);
    await sleep(SLEEP_TIME);
    console.log("Setting devFund ownership");
    await devFund.transferOwnership(timelock.address);

    console.log("Locked operators");
}

async function setOperatorToTreasury(context: Context, name: string, skipOwner: boolean) {
    const treasury = context.contracts["Treasury"];
    const contract = context.contracts[name];
    await sleep(SLEEP_TIME);
    console.log(`Setting operator for ${name} to treasury`);
    const operator = await contract.operator();
    if (operator === treasury.address) {
        console.log("Operator is already treasury, skipping");
    } else {
        await contract.transferOperator(treasury.address);
    }
    if (skipOwner) { return }
    await sleep(SLEEP_TIME);
    console.log(`Setting owner for ${name} to treasury`);
    const owner = await contract.owner();
    if (owner === treasury.address) {
        console.log("Owner is already treasury, skipping");
    } else {
        await contract.transferOwnership(treasury.address);
    }
    console.log("Set operator and owner for treasury");
}

async function deployKBTCPools(context: Context) {
    console.log("Deploying KBTC pools");
    for (const name of ["RenBTC", "TBTC", "WBTC"])
        await deployContract(context, `KBTC${name}Pool`, context.contracts["KBTC"].address, context.contracts[name].address, KBTC_FUNDS_START);
    console.log("Deployed KBTC pools");
}

async function deployKLONPools(context: Context) {
    console.log("Deploying KLON pools");
    const uniswapFactory = context.contracts["UniswapV2Factory"];
    const oracle = context.contracts["Oracle"];
    const KBTC = context.contracts["KBTC"];
    const Klon = context.contracts["Klon"];
    const wbtc = context.contracts["WBTC"];
    const wtbcBacLpt = await oracle.pairFor(uniswapFactory.address, KBTC.address, wbtc.address);
    const wtbcBasLpt = await oracle.pairFor(uniswapFactory.address, Klon.address, wbtc.address);
    await deployContract(context, "WBTCKBTCLPTokenKlonPool", Klon.address, wtbcBacLpt, KLON_FUNDS_START, DECAY_RATE);
    await deployContract(context, "WBTCKLONLPTokenKlonPool", Klon.address, wtbcBasLpt, KLON_FUNDS_START);
    console.log("Deployed KLON pools");
}

async function deployAndMintKBTCDistributor(context: Context, poolNames: string[]) {
    await sleep(SLEEP_TIME);
    console.log("Depoying KBTC distributor");
    const poolContracts = poolNames.map(poolName => context.contracts[poolName]);
    const KBTC = context.contracts["KBTC"];
    const result = await deployContract(context, "InitialKBTCDistributor", KBTC.address, poolContracts.map(c => c.address), INITIAL_KBTC_FOR_POOLS);
    if (!result) {
        console.log("KBTC pools contract already deployed, skipping");
        return;
    }
    const distributor = context.contracts["InitialKBTCDistributor"];
    await mintIfZero(KBTC, distributor.address, INITIAL_KBTC_FOR_POOLS);
    console.log("Depoyed KBTC distributor");
}

async function distributeToKBTCPools(context: Context, poolNames: string[]) {
    console.log("Distributing to KBTC pools");
    const distributor = context.contracts["InitialKBTCDistributor"];
    const poolContracts = poolNames.map(poolName => context.contracts[poolName]);
    console.log(`Setting Reward Distributor (${distributor.address}) in pools`);
    for (const poolContract of poolContracts) {
        await sleep(SLEEP_TIME * 2);
        console.log(`For (${poolContract.address})`);
        await poolContract.setRewardDistribution(distributor.address);
    }
    await sleep(SLEEP_TIME * 2);
    console.log(`Distributing tokens`);
    await distributor.distribute();
    console.log("Distributed to KBTC pools");
}

async function deployAndMintKlonDistributor(context: Context) {
    await sleep(SLEEP_TIME);
    console.log("Deploying Klon ditributor");
    const kbtcWBTCBalance = INITIAL_KLON_FOR_WBTC_KBTC;
    const klonWBTCBalance = INITIAL_KLON_FOR_WBTC_KLON;
    const totalBalance = kbtcWBTCBalance.add(klonWBTCBalance);
    const Klon = context.contracts["Klon"];
    const wbtcKBTCLPTokenKlonPool = context.contracts["WBTCKBTCLPTokenKlonPool"];
    const wbtcKLONLPTokenKlonPool = context.contracts["WBTCKLONLPTokenKlonPool"];
    const result = await deployContract(context, "InitialKlonDistributor", Klon.address, wbtcKBTCLPTokenKlonPool.address, kbtcWBTCBalance, wbtcKLONLPTokenKlonPool.address, klonWBTCBalance);
    if (!result) {
        console.log("KLON pools already deployed. Skipping...");
        return;
    }
    const distributor = context.contracts["InitialKlonDistributor"];
    console.log(`Minting to distributor`);
    await mintIfZero(Klon, distributor.address, totalBalance);
    console.log("Deployed Klon ditributor");
}


async function distributeToKLONPools(context: Context) {
    await sleep(SLEEP_TIME);
    console.log("Distributing to KLON pools");
    const wbtcKBTCLPTokenKlonPool = context.contracts["WBTCKBTCLPTokenKlonPool"];
    const wbtcKLONLPTokenKlonPool = context.contracts["WBTCKLONLPTokenKlonPool"];    
    const distributor = context.contracts["InitialKlonDistributor"];
    console.log(`Setting Reward distribution for KBTC LP (${distributor.address})`);
    await wbtcKBTCLPTokenKlonPool.setRewardDistribution(distributor.address);
    await (SLEEP_TIME);
    console.log(`Setting Reward distribution for KLON LP (${distributor.address})`);
    await wbtcKLONLPTokenKlonPool.setRewardDistribution(distributor.address);
    await (SLEEP_TIME * 2);
    console.log(`Distributing tokens`);
    await distributor.distribute();
    console.log("Distributed to KLON pools");
}

async function deployDistributor(context: Context) {
    await sleep(SLEEP_TIME);
    const KBTCDistributror = context.contracts["InitialKBTCDistributor"];
    const KlonDistributror = context.contracts["InitialKlonDistributor"];
    await deployContract(context, "Distributor", [KBTCDistributror.address, KlonDistributror.address]);
}

async function deployToken(context: Context, name: string) {
    await sleep(SLEEP_TIME);
    if (!(await deployContract(context, name))) {
        return;
    };
    const token = context.contracts[name];
    console.log(`Minting ${WBTC_TOTAL_SUPPLY} ${name} tokens to ${context.operator.address}`);
    await mintIfZero(token, context.operator.address, WBTC_TOTAL_SUPPLY);
    console.log("Minted successfully");
}

async function deployUniswap(context: Context) {
    console.log("Deploying Uniswap");
    await deployContract(context, "UniswapV2Factory", context.operator.address);
    await deployContract(context, "UniswapV2Router02", context.contracts["UniswapV2Factory"].address, context.operator.address);
    console.log("Deployed Uniswap");
}

async function depositLiquidityToUniswap(context: Context, klonisTokenName: string, stableTokenName: string, amountBasisToken: BigNumber, amountStableToken: BigNumber) {
    await sleep(SLEEP_TIME);
    console.log(`Depositing liquidity to Uniswap for pair ${klonisTokenName} - ${stableTokenName} in the amount of ${amountBasisToken} - ${amountStableToken}`);
    const klonisToken = context.contracts[klonisTokenName];
    const stableToken = context.contracts[stableTokenName];
    const uniswapRouter = context.contracts["UniswapV2Router02"];
    const uniswapFactory = context.contracts["UniswapV2Factory"];
    if (!klonisToken) { throw `Token not found ${klonisTokenName}` };
    if (!stableToken) { throw `Token not found ${stableTokenName}` };
    if (!uniswapRouter) { throw `Token not found ${"UniswapV2Router02"}` };
    if (!uniswapFactory) { throw `Token not found ${"UniswapV2Factory"}` };
    const pair = await uniswapFactory.getPair(klonisToken.address, stableToken.address);
    if (pair != "0x0000000000000000000000000000000000000000") {
        console.log("Pair already exists, skipping.");
        return;
    }
    console.log(`Calling addLiquidity with ${[klonisToken.address, stableToken.address, amountBasisToken, amountStableToken, amountBasisToken, amountStableToken, context.operator.address, UNISWAP_DEADLINE]}`);
    await uniswapRouter.addLiquidity(
        klonisToken.address, stableToken.address, amountBasisToken, amountStableToken, amountBasisToken, amountStableToken, context.operator.address, UNISWAP_DEADLINE,
    );
    console.log(`Deposited liquidity to Uniswap for pair ${klonisTokenName} - ${stableTokenName} in the amount of ${amountBasisToken} - ${amountStableToken}`);
}

async function setUniswapAllowance(context: Context, tokenName: string, allowanceToSet: BigNumber) {
    await sleep(SLEEP_TIME);
    console.log(`Setting Uniswap allowance for \`${tokenName}\` to \`${allowanceToSet}\``);
    const token = context.contracts[tokenName];
    if (!token) { throw `Token not found ${tokenName}` };
    const uniswapRouter = context.contracts["UniswapV2Router02"];
    const allowance = await token.allowance(context.operator.address, uniswapRouter.address);
    if (BigNumber.from(allowance).lt(allowanceToSet)) {
        await token.approve(uniswapRouter.address, allowanceToSet)
    } else {
        console.log("The allowance is ok, skipping.")
    }
    console.log(`Set Uniswap allowance for \`${tokenName}\` to \`${allowanceToSet}\``);
}

async function deployContract(context: Context, name: string, ...args: Array<any>): Promise<boolean> {
    console.log(`Deploying contract \`${name}\``);
    context.deployedContracts[hre.network.name] ||= {};
    context.deployedContracts[hre.network.name][name] ||= {};
    const deployedContractFromContext = context.deployedContracts[hre.network.name][name];
    if (deployedContractFromContext.frozen) {
        const code = await hre.ethers.provider.getCode(deployedContractFromContext.address);
        if (code) {
            console.log("The contract is frozen, fecthing source.");
            const contract = await ethers.getContractAt(name, deployedContractFromContext.address);
            context.contracts[name] = contract;
            return false;
        } else {
            console.log(`WARN: Contract is frozen but not deployed at specified address: \'${deployedContractFromContext.address}\'`);
        }
    }
    const factory = (await ethers.getContractFactory(name)).connect(context.operator);
    console.log(`Constructor arguments: ${args.map(x => x.toString())}`);
    const deployContract = await factory.deploy(...args);
    const deployedContract = await deployContract.deployed();
    context.contracts[name] = deployedContract;
    deployedContractFromContext.address = deployedContract.address;
    deployedContractFromContext.args = args.map(x => Array.isArray(x) ? JSON.stringify(x) : x.toString());
    deployedContractFromContext.frozen = true;
    console.log(`Deployed contract \`${name}\` at \`${deployedContract.address}\`. Tx hash: \`${deployedContract.deployTransaction.hash}\`.`);
    return true;
}
main().then(() => console.log("Delpoyed successfully")).catch(console.log);

function sleep(ms: any) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}   

function addDays(date: Date, days: number) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

async function mintIfZero(contract: any, to: string, amount: BigNumber) {
    const balance = await contract.balanceOf(to);
    if (balance > 0) {
        console.log(`Skipping minting ${amount} for contract ${contract.address}`);
    };
    await contract.mint(to, amount);
}