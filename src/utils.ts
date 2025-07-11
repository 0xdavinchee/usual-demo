import { Bytes, ethereum } from "@graphprotocol/graph-ts";

export function createLogID(id: Bytes, event: ethereum.Event): Bytes {
  // Create a unique log ID by concatenating the components
  return id
    .concatI32(event.block.number.toI32())
    .concatI32(event.logIndex.toI32());
}
