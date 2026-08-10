const hre = require("hardhat");

async function main() {
  const Factory = await hre.ethers.getContractFactory("ServiceAgreementRegistry");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`ServiceAgreementRegistry deployed to: ${address}`);
  console.log("Network:", hre.network.name);
  console.log(
    "Next step: call setAuthorizedRecorder() with freclean-payment's/freclean-api's service account address before recording any agreements.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
