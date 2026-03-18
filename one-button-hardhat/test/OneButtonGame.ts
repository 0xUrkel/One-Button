import { expect } from "chai";
import { network } from "hardhat";

describe("OneButtonGame", function () {
  async function deployFixture() {
    const { ethers } = await network.connect();

    const [owner, treasury, alice, bob, carol] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("OneButtonGame", owner);
    const game = await factory.deploy(treasury.address);
    await game.waitForDeployment();

    return { ethers, game, owner, treasury, alice, bob, carol };
  }

  it("sets treasury and bootstraps season + round", async function () {
    const { game, treasury } = await deployFixture();

    expect(await game.treasury()).to.equal(treasury.address);
    expect(await game.currentSeasonId()).to.equal(1n);
    expect(await game.currentRoundId()).to.equal(1n);

    const round = await game.rounds(1);
    expect(round.id).to.equal(1n);
    expect(round.seasonId).to.equal(1n);
    expect(round.totalPot).to.equal(0n);
    expect(round.totalPresses).to.equal(0n);
    expect(round.lastPresser).to.equal(
      "0x0000000000000000000000000000000000000000",
    );
    expect(round.settled).to.equal(false);
  });

  it("charges escalating per-player press costs", async function () {
    const { game, alice, ethers } = await deployFixture();

    const firstCost = await game.getCurrentPressCost(alice.address);
    expect(firstCost).to.equal(100000000000000000n); // 0.1 AVAX

    await game.connect(alice).press({ value: firstCost });

    await ethers.provider.send("evm_increaseTime", [11]);
    await ethers.provider.send("evm_mine", []);

    const secondCost = await game.getCurrentPressCost(alice.address);
    expect(secondCost).to.equal(135000000000000000n); // 0.135 AVAX

    await game.connect(alice).press({ value: secondCost });

    await ethers.provider.send("evm_increaseTime", [11]);
    await ethers.provider.send("evm_mine", []);

    const thirdCost = await game.getCurrentPressCost(alice.address);
    expect(thirdCost).to.equal(182250000000000000n); // 0.18225 AVAX
  });

  it("uses late-mode and sudden-death extensions", async function () {
    const { game, alice, ethers } = await deployFixture();

    const firstCost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: firstCost });

    const round1 = await game.rounds(1);
    const startEnd = round1.endTime;

    await ethers.provider.send("evm_increaseTime", [11 * 60 * 60 + 30 * 60]); // 11.5h
    await ethers.provider.send("evm_mine", []);

    const secondCost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: secondCost });

    const round2 = await game.rounds(1);
    expect(round2.endTime).to.equal(startEnd + 10n * 60n);

    await ethers.provider.send("evm_increaseTime", [35 * 60]); // move under 10m remaining
    await ethers.provider.send("evm_mine", []);

    const thirdCost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: thirdCost });

    const round3 = await game.rounds(1);
    expect(round3.endTime).to.equal(round2.endTime + 30n);
  });

  it("settles and allows dividend claims", async function () {
    const { game, treasury, alice, bob, ethers } = await deployFixture();

    const aliceCost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: aliceCost });

    const bobCost = await game.getCurrentPressCost(bob.address);
    await game.connect(bob).press({ value: bobCost });

    const totalPot = aliceCost + bobCost;
    const expectedWinner = (totalPot * 8000n) / 10000n;
    const expectedDividendPool = (totalPot * 1000n) / 10000n;
    const expectedTreasury = totalPot - expectedWinner - expectedDividendPool;

    await ethers.provider.send("evm_increaseTime", [12 * 60 * 60 + 5]);
    await ethers.provider.send("evm_mine", []);

    const treasuryBalanceBefore = await ethers.provider.getBalance(
      treasury.address,
    );

    await game.settleRound();

    const roundAfter = await game.rounds(1);
    expect(roundAfter.settled).to.equal(true);
    expect(roundAfter.lastPresser).to.equal(bob.address);
    expect(roundAfter.winnerPayout).to.equal(expectedWinner);
    expect(roundAfter.dividendPool).to.equal(expectedDividendPool);
    expect(roundAfter.treasuryAmount).to.equal(expectedTreasury);

    const treasuryBalanceAfter = await ethers.provider.getBalance(
      treasury.address,
    );
    expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(
      expectedTreasury,
    );

    const aliceDividendBefore = await ethers.provider.getBalance(alice.address);
    const claimTx = await game.connect(alice).claimDividend(1);
    const claimReceipt = await claimTx.wait();

    const effectiveGasPrice = claimReceipt!.gasPrice ?? claimTx.gasPrice ?? 0n;

    const claimGas = claimReceipt!.gasUsed * effectiveGasPrice;

    const aliceDividendAfter = await ethers.provider.getBalance(alice.address);
    const expectedAliceDividend = (expectedDividendPool * aliceCost) / totalPot;

    expect(aliceDividendAfter - aliceDividendBefore + claimGas).to.equal(
      expectedAliceDividend,
    );

    expect(await game.currentRoundId()).to.equal(2n);
  });

  it("reverts on incorrect payment", async function () {
    const { game, alice } = await deployFixture();

    const requiredCost = await game.getCurrentPressCost(alice.address);

    await expect(
      game.connect(alice).press({ value: requiredCost - 1n }),
    ).to.be.revertedWith("incorrect payment");

    await expect(
      game.connect(alice).press({ value: requiredCost + 1n }),
    ).to.be.revertedWith("incorrect payment");
  });

  it("reverts when same wallet presses during cooldown", async function () {
    const { game, alice } = await deployFixture();

    const firstCost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: firstCost });

    const secondCost = await game.getCurrentPressCost(alice.address);

    await expect(
      game.connect(alice).press({ value: secondCost }),
    ).to.be.revertedWith("cooldown active");
  });

  it("cannot settle before the timer expires", async function () {
    const { game, alice } = await deployFixture();

    const cost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: cost });

    await expect(game.settleRound()).to.be.revertedWith("round not ended");
  });

  it("cannot claim dividend twice", async function () {
    const { game, alice, bob, ethers } = await deployFixture();

    const aliceCost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: aliceCost });

    const bobCost = await game.getCurrentPressCost(bob.address);
    await game.connect(bob).press({ value: bobCost });

    await ethers.provider.send("evm_increaseTime", [12 * 60 * 60 + 5]);
    await ethers.provider.send("evm_mine", []);

    await game.settleRound();

    await game.connect(alice).claimDividend(1);

    await expect(game.connect(alice).claimDividend(1)).to.be.revertedWith(
      "already claimed",
    );
  });

  it("cannot claim dividend with no contribution", async function () {
    const { game, alice, bob, carol, ethers } = await deployFixture();

    const aliceCost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: aliceCost });

    const bobCost = await game.getCurrentPressCost(bob.address);
    await game.connect(bob).press({ value: bobCost });

    await ethers.provider.send("evm_increaseTime", [12 * 60 * 60 + 5]);
    await ethers.provider.send("evm_mine", []);

    await game.settleRound();

    await expect(game.connect(carol).claimDividend(1)).to.be.revertedWith(
      "no contribution",
    );
  });

  it("starts a new round immediately after settlement", async function () {
    const { game, alice, ethers } = await deployFixture();

    const cost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: cost });

    await ethers.provider.send("evm_increaseTime", [12 * 60 * 60 + 5]);
    await ethers.provider.send("evm_mine", []);

    await game.settleRound();

    expect(await game.currentRoundId()).to.equal(2n);

    const round2 = await game.rounds(2);
    expect(round2.id).to.equal(2n);
    expect(round2.seasonId).to.equal(1n);
    expect(round2.totalPot).to.equal(0n);
    expect(round2.totalPresses).to.equal(0n);
    expect(round2.lastPresser).to.equal(
      "0x0000000000000000000000000000000000000000",
    );
    expect(round2.settled).to.equal(false);
  });

  it("rolls over to a new season after the season end passes", async function () {
    const { game, alice, ethers } = await deployFixture();

    const season1 = await game.seasons(1);
    const seasonEnd = Number(season1.endTime);

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = Number(latestBlock!.timestamp);

    const secondsUntilAfterSeasonEnd = seasonEnd - now + 1;

    const cost = await game.getCurrentPressCost(alice.address);
    await game.connect(alice).press({ value: cost });

    await ethers.provider.send("evm_increaseTime", [
      secondsUntilAfterSeasonEnd,
    ]);
    await ethers.provider.send("evm_mine", []);

    await game.settleRound();

    expect(await game.currentSeasonId()).to.equal(2n);
    expect(await game.currentRoundId()).to.equal(2n);

    const oldSeason = await game.seasons(1);
    const newSeason = await game.seasons(2);
    const round2 = await game.rounds(2);

    expect(oldSeason.finalized).to.equal(true);
    expect(newSeason.finalized).to.equal(false);
    expect(round2.seasonId).to.equal(2n);
  });
});
