import chai, { expect } from 'chai';
import { ethers } from 'hardhat';
import { solidity } from 'ethereum-waffle';
import { Contract, ContractFactory, BigNumber, utils } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

chai.use(solidity);

describe('Tokens', () => {
  const ETH = utils.parseEther('1');
  const ZERO = BigNumber.from(0);
  const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
  const MIN_ETH_MINT = BigNumber.from(10).pow(12);
  const MIN_BTC_MINT = BigNumber.from(10).pow(2);

  const { provider } = ethers;

  let operator: SignerWithAddress;

  before('setup accounts', async () => {
    [operator] = await ethers.getSigners();
  });

  let Kbond: ContractFactory;
  let KBTC: ContractFactory;
  let Klon: ContractFactory;

  before('fetch contract factories', async () => {
    Kbond = await ethers.getContractFactory('Kbond');
    KBTC = await ethers.getContractFactory('KBTC');
    Klon = await ethers.getContractFactory('Klon');
  });

  describe('Kbond', () => {
    let token: Contract;

    before('deploy token', async () => {
      token = await Kbond.connect(operator).deploy();
    });

    it('mint', async () => {
      const mintAmount = ETH.mul(2);
      await expect(token.connect(operator).mint(operator.address, mintAmount))
        .to.emit(token, 'Transfer')
        .withArgs(ZERO_ADDR, operator.address, mintAmount);
      expect(await token.balanceOf(operator.address)).to.eq(mintAmount);
    });

    it('burn', async () => {
      await expect(token.connect(operator).burn(ETH))
        .to.emit(token, 'Transfer')
        .withArgs(operator.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(operator.address)).to.eq(ETH);
    });

    it('burnFrom', async () => {
      await expect(token.connect(operator).approve(operator.address, ETH));
      await expect(token.connect(operator).burnFrom(operator.address, ETH))
        .to.emit(token, 'Transfer')
        .withArgs(operator.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(operator.address)).to.eq(ZERO);
    });
  });

  describe('KBTC', () => {
    let token: Contract;

    before('deploy token', async () => {
      token = await KBTC.connect(operator).deploy();
    });

    it('mint', async () => {
      await expect(token.connect(operator).mint(operator.address, ETH))
        .to.emit(token, 'Transfer')
        .withArgs(ZERO_ADDR, operator.address, ETH);
      expect(await token.balanceOf(operator.address)).to.eq(ETH.add(MIN_ETH_MINT));
    });

    it('burn', async () => {
      await expect(token.connect(operator).burn(ETH))
        .to.emit(token, 'Transfer')
        .withArgs(operator.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(operator.address)).to.eq(MIN_ETH_MINT);
    });

    it('burnFrom', async () => {
      await token.connect(operator).mint(operator.address, ETH);
      await expect(token.connect(operator).approve(operator.address, ETH));
      await expect(token.connect(operator).burnFrom(operator.address, ETH))
        .to.emit(token, 'Transfer')
        .withArgs(operator.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(operator.address)).to.eq(MIN_ETH_MINT);
    });
  });

  describe('Klon', () => {
    let token: Contract;

    before('deploy token', async () => {
      token = await Klon.connect(operator).deploy();
    });

    it('mint', async () => {
      await expect(token.connect(operator).mint(operator.address, ETH))
        .to.emit(token, 'Transfer')
        .withArgs(ZERO_ADDR, operator.address, ETH);
      expect(await token.balanceOf(operator.address)).to.eq(ETH.add(MIN_ETH_MINT));
    });

    it('burn', async () => {
      await expect(token.connect(operator).burn(ETH))
        .to.emit(token, 'Transfer')
        .withArgs(operator.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(operator.address)).to.eq(MIN_ETH_MINT);
    });

    it('burnFrom', async () => {
      await token.connect(operator).mint(operator.address, ETH);
      await expect(token.connect(operator).approve(operator.address, ETH));
      await expect(token.connect(operator).burnFrom(operator.address, ETH))
        .to.emit(token, 'Transfer')
        .withArgs(operator.address, ZERO_ADDR, ETH);
      expect(await token.balanceOf(operator.address)).to.eq(MIN_ETH_MINT);
    });
  });
});
