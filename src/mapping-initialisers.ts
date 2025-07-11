import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  Pool,
  PositionSnapshot,
  PoolTransaction,
  User,
} from "../generated/schema";
import { createLogID } from "./utils";

export function getOrInitUser(
  accountAddress: Address,
  poolId: Bytes,
  block: ethereum.Block
): User {
  let user = User.load(accountAddress);

  const currentTimestamp = block.timestamp;
  if (user == null) {
    user = new User(accountAddress);
    user.lpTokenBalance = BigDecimal.fromString("0");
    user.shareOfPool = BigDecimal.fromString("0");
    user.lastActivity = currentTimestamp;
    user.txCount = BigInt.fromI32(0);
    user.pool = poolId;
    user.save();
  }

  return user as User;
}

export function getOrInitPositionSnapshot(
  user: User,
  pool: Pool,
  event: ethereum.Event
): PositionSnapshot {
  // Create ID using the createLogID utility function
  let snapshotId = createLogID(user.id, event);
  let snapshot = PositionSnapshot.load(snapshotId);

  if (snapshot == null) {
    snapshot = new PositionSnapshot(snapshotId);
    snapshot.user = user.id;
    snapshot.pool = pool.id;
    snapshot.timestamp = event.block.timestamp;
    snapshot.lpTokenBalance = user.lpTokenBalance;
    snapshot.shareOfPool = user.shareOfPool;
    snapshot.save();
  }

  return snapshot as PositionSnapshot;
}

export function getOrInitPool(
  poolAddress: Address,
  block: ethereum.Block
): Pool {
  let pool = Pool.load(poolAddress);
  if (pool == null) {
    pool = new Pool(poolAddress);
    pool.name = "USD0-USD0++"; // Default name, can be updated later
    pool.usd0Balance = BigInt.fromI32(0);
    pool.usd0PlusBalance = BigInt.fromI32(0);
    pool.totalSupply = BigDecimal.fromString("0");
    pool.volume = BigInt.fromI32(0);
    pool.usd0LiquidityAdded = BigDecimal.fromString("0");
    pool.usd0LiquidityRemoved = BigDecimal.fromString("0");
    pool.usd0PlusLiquidityAdded = BigDecimal.fromString("0");
    pool.usd0PlusLiquidityRemoved = BigDecimal.fromString("0");
    pool.createdAt = block.timestamp;
    pool.save();
  }

  return pool as Pool;
}

export function getOrInitPoolTransaction(
  user: User,
  pool: Pool,
  event: ethereum.Event,
  type: string,
  amountUSD0: BigInt,
  amountUSD0Plus: BigInt
): PoolTransaction {
  // Create transaction ID using the createLogID utility function
  let poolTransactionId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let poolTransaction = PoolTransaction.load(poolTransactionId);
  
  if (poolTransaction == null) {
    poolTransaction = new PoolTransaction(poolTransactionId);
    poolTransaction.user = user.id;
    poolTransaction.pool = pool.id;
    poolTransaction.type = type;
    poolTransaction.amountUSD0 = amountUSD0;
    poolTransaction.amountUSD0Plus = amountUSD0Plus;
    poolTransaction.timestamp = event.block.timestamp;
    poolTransaction.gasUsed = BigInt.fromI32(0);
    poolTransaction.save();
  }

  return poolTransaction as PoolTransaction;
}

export function getOrInitSwapTransaction(
  user: User,
  pool: Pool,
  event: ethereum.Event,
  amountUSD0: BigInt,
  amountUSD0Plus: BigInt,
  isSellingUsd0: boolean
): PoolTransaction {
  // Create transaction ID using the createLogID utility function
  let poolTransactionId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let poolTransaction = PoolTransaction.load(poolTransactionId);
  
  if (poolTransaction == null) {
    poolTransaction = new PoolTransaction(poolTransactionId);
    poolTransaction.user = user.id;
    poolTransaction.pool = pool.id;
    poolTransaction.type = "Swap";
    poolTransaction.isSellingUsd0 = isSellingUsd0;
    poolTransaction.amountUSD0 = amountUSD0;
    poolTransaction.amountUSD0Plus = amountUSD0Plus;
    poolTransaction.timestamp = event.block.timestamp;
    poolTransaction.gasUsed = BigInt.fromI32(0);
    poolTransaction.save();
  }

  return poolTransaction as PoolTransaction;
}
