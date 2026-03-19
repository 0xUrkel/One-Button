import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect("mainnet");

  const contractAddress = "0xEF443dd4361afF962BC5bC9a9404731Ac5ECc6Cf";
  const contract = await ethers.getContractAt("OneButtonGame", contractAddress);

  const signer = await ethers.provider.getSigner();
  const signerAddress = await signer.getAddress();

  console.log("contract:", contractAddress);
  console.log("signer:", signerAddress);

  try {
    const owner = await contract.owner();
    console.log("owner:", owner);
    console.log(
      "is owner:",
      owner.toLowerCase() === signerAddress.toLowerCase(),
    );
  } catch (err) {
    console.log("owner() read failed:", err);
  }

  try {
    const code = await ethers.provider.getCode(contractAddress);
    console.log("has code:", code !== "0x");
  } catch (err) {
    console.log("getCode failed:", err);
  }

  try {
    console.log(
      "current fullResetDuration:",
      (await contract.fullResetDuration()).toString(),
    );
    console.log(
      "current latePhaseThreshold:",
      (await contract.latePhaseThreshold()).toString(),
    );
    console.log(
      "current suddenDeathThreshold:",
      (await contract.suddenDeathThreshold()).toString(),
    );
    console.log(
      "current latePhaseExtension:",
      (await contract.latePhaseExtension()).toString(),
    );
    console.log(
      "current suddenDeathExtension:",
      (await contract.suddenDeathExtension()).toString(),
    );
  } catch (err) {
    console.log("timing reads failed:", err);
  }

  console.log("calling setTimingConfig...");

  const tx = await contract.setTimingConfig(900, 120, 20, 45, 10);
  console.log("tx:", tx.hash);
  await tx.wait();

  console.log("✅ Timing updated");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
