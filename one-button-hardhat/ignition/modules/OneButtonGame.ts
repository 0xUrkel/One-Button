import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("OneButtonGameModule", (m) => {
  const treasury = m.getParameter("treasury", process.env.TREASURY_ADDRESS || "0x0000000000000000000000000000000000000001");
  const game = m.contract("OneButtonGame", [treasury]);
  return { game };
});
