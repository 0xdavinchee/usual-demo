import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  ethereum,
} from "@graphprotocol/graph-ts";
import {
  Pool,
  UserSnapshot,
  PoolSnapshot,
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

export function getOrInitUserSnapshot(
  user: User,
  event: ethereum.Event
): UserSnapshot {
  // Create ID using the createLogID utility function
  let snapshotId = createLogID(user.id, event);
  let snapshot = UserSnapshot.load(snapshotId);

  if (snapshot == null) {
    snapshot = new UserSnapshot(snapshotId);
    snapshot.user = user.id;
    snapshot.timestamp = event.block.timestamp;
    snapshot.lpTokenBalance = user.lpTokenBalance;
    snapshot.shareOfPool = user.shareOfPool;
    snapshot.save();
  }

  return snapshot as UserSnapshot;
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
    pool.updatedAt = block.timestamp;
    pool.save();
  }

  return pool as Pool;
}

export function getOrInitPoolSnapshot(
  pool: Pool,
  event: ethereum.Event
): PoolSnapshot {
  // Create transaction ID using the createLogID utility function
  let poolSnapshotId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let poolSnapshot = new PoolSnapshot(poolSnapshotId);
  poolSnapshot.timestamp = event.block.timestamp;
  poolSnapshot.pool = pool.id;
  poolSnapshot.usd0Balance = pool.usd0Balance;
  poolSnapshot.usd0PlusBalance = pool.usd0PlusBalance;
  poolSnapshot.totalSupply = pool.totalSupply;
  poolSnapshot.usd0LiquidityAdded = pool.usd0LiquidityAdded;
  poolSnapshot.usd0LiquidityRemoved = pool.usd0LiquidityRemoved;
  poolSnapshot.usd0PlusLiquidityAdded = pool.usd0PlusLiquidityAdded;
  poolSnapshot.usd0PlusLiquidityRemoved = pool.usd0PlusLiquidityRemoved;
  poolSnapshot.save();

  return poolSnapshot as PoolSnapshot;
}
