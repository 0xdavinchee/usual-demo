import { Bytes, ethereum } from "@graphprotocol/graph-ts";

export function createLogID(
  id: Bytes,
  event: ethereum.Event
): Bytes {
  // Create a unique log ID by concatenating the components
  let logIdString = id +
    "-" +
    event.transaction.hash.toHexString() +
    "-" +
    event.logIndex.toString();
  
  // Convert the string to bytes using UTF-8 encoding
  return Bytes.fromUTF8(logIdString);
}
