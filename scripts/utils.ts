import { ethers } from "ethers";
import { ParamType } from "ethers/lib/utils";

export function encodeParameters(
  ethers: any,
  types: Array<string | ParamType>,
  values: Array<any>
) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

// export async function wait(
//   hash: string,
//   desc?: string,
//   confirmation: number = 1
// ): Promise<void> {
//   if (desc) {
//     console.log(`Waiting tx ${hash}. action = ${desc}`);
//   } else {
//     console.log(`Waiting tx ${hash}`);
//   }
//   await ethers.providers.waitForTransaction(hash, confirmation);
// }