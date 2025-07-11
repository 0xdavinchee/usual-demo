import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
  TokenExchange as TokenExchangeEvent,
  TokenExchangeUnderlying as TokenExchangeUnderlyingEvent,
  AddLiquidity as AddLiquidityEvent,
  RemoveLiquidity as RemoveLiquidityEvent,
  RemoveLiquidityOne as RemoveLiquidityOneEvent,
  RemoveLiquidityImbalance as RemoveLiquidityImbalanceEvent,
  RampA as RampAEvent,
  StopRampA as StopRampAEvent,
  ApplyNewFee as ApplyNewFeeEvent,
  SetNewMATime as SetNewMATimeEvent,
} from "../generated/CurveStableSwapNG/CurveStableSwapNG";
import {
  Transfer,
  Approval,
  TokenExchange,
  TokenExchangeUnderlying,
  AddLiquidity,
  RemoveLiquidity,
  RemoveLiquidityOne,
  RemoveLiquidityImbalance,
  RampA,
  StopRampA,
  ApplyNewFee,
  SetNewMATime,
} from "../generated/schema";
import {
  getOrInitPool,
  getOrInitPoolTransaction,
  getOrInitSwapTransaction,
  getOrInitUser,
} from "./mapping-initialisers";

const USD0_ID = BigInt.fromI32(0);

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.sender = event.params.sender;
  entity.receiver = event.params.receiver;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // mint receiver's LP tokens
  if (event.params.sender.equals(Address.zero())) {
    let user = getOrInitUser(event.params.receiver, event.address, event.block);
    user.lpTokenBalance = user.lpTokenBalance.plus(
      event.params.value.toBigDecimal()
    );
    user.save();
  }

  // burn sender's LP tokens
  if (event.params.receiver.equals(Address.zero())) {
    let user = getOrInitUser(event.params.sender, event.address, event.block);
    user.lpTokenBalance = user.lpTokenBalance.minus(
      event.params.value.toBigDecimal()
    );
    user.save();
  }

  // TODO: this is the transfer of the LP tokens
  // There needs to be some way of calculating the corresponding amount of USD0 / USD0++
  // versus each LP token probably?
}

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.spender = event.params.spender;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

function processTokenExchange(
  event: ethereum.Event,
  buyer: Address,
  sold_id: BigInt,
  tokens_sold: BigInt,
  bought_id: BigInt,
  tokens_bought: BigInt
): void {
  const isSellingUsd0 = sold_id.equals(USD0_ID);

  let pool = getOrInitPool(event.address, event.block);
  pool.updatedAt = event.block.timestamp;
  pool.volume = pool.volume.plus(tokens_sold).plus(tokens_bought);

  // USD0 in USD0++ out
  if (isSellingUsd0) {
    pool.usd0Balance = pool.usd0Balance.plus(tokens_sold);
    pool.usd0PlusBalance = pool.usd0PlusBalance.minus(tokens_bought);
  } else {
    // USD0++ in USD0 out
    pool.usd0Balance = pool.usd0Balance.minus(tokens_sold);
    pool.usd0PlusBalance = pool.usd0PlusBalance.plus(tokens_bought);
  }

  pool.save();

  let user = getOrInitUser(buyer, event.address, event.block);
  user.lastActivity = event.block.timestamp;
  user.txCount = user.txCount.plus(BigInt.fromI32(1));

  user.save();

  let poolTransaction = getOrInitSwapTransaction(
    user,
    pool,
    event,
    isSellingUsd0 ? tokens_sold : tokens_bought,
    isSellingUsd0 ? tokens_bought : tokens_sold,
    isSellingUsd0
  );

  poolTransaction.save();
}

export function handleTokenExchange(event: TokenExchangeEvent): void {
  let entity = new TokenExchange(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.buyer = event.params.buyer;
  entity.sold_id = event.params.sold_id;
  entity.tokens_sold = event.params.tokens_sold;
  entity.bought_id = event.params.bought_id;
  entity.tokens_bought = event.params.tokens_bought;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  processTokenExchange(
    event,
    event.params.buyer,
    event.params.sold_id,
    event.params.tokens_sold,
    event.params.bought_id,
    event.params.tokens_bought
  );
}

export function handleTokenExchangeUnderlying(
  event: TokenExchangeUnderlyingEvent
): void {
  let entity = new TokenExchangeUnderlying(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.buyer = event.params.buyer;
  entity.sold_id = event.params.sold_id;
  entity.tokens_sold = event.params.tokens_sold;
  entity.bought_id = event.params.bought_id;
  entity.tokens_bought = event.params.tokens_bought;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  processTokenExchange(
    event,
    event.params.buyer,
    event.params.sold_id,
    event.params.tokens_sold,
    event.params.bought_id,
    event.params.tokens_bought
  );
}

export function handleAddLiquidity(event: AddLiquidityEvent): void {
  let entity = new AddLiquidity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.provider = event.params.provider;
  entity.token_amounts = event.params.token_amounts;
  entity.fees = event.params.fees;
  entity.invariant = event.params.invariant;
  entity.token_supply = event.params.token_supply;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  let pool = getOrInitPool(event.address, event.block);
  pool.usd0Balance = pool.usd0Balance.plus(event.params.token_amounts[0]);
  pool.usd0PlusBalance = pool.usd0PlusBalance.plus(
    event.params.token_amounts[1]
  );
  pool.totalSupply = event.params.token_supply.toBigDecimal();
  pool.usd0LiquidityAdded = pool.usd0LiquidityAdded.plus(
    event.params.token_amounts[0].toBigDecimal()
  );
  pool.usd0PlusLiquidityAdded = pool.usd0PlusLiquidityAdded.plus(
    event.params.token_amounts[1].toBigDecimal()
  );
  pool.save();

  let user = getOrInitUser(event.params.provider, event.address, event.block);
  user.lastActivity = event.block.timestamp;
  user.txCount = user.txCount.plus(BigInt.fromI32(1));
  // user.lpTokenBalance is updated in the handleTransfer function
  // Transfer event is emitted prior to AddLiquidity
  user.shareOfPool = user.lpTokenBalance.div(pool.totalSupply);

  user.save();

  let poolTransaction = getOrInitPoolTransaction(
    user,
    pool,
    event,
    "AddLiquidity",
    event.params.token_amounts[0],
    event.params.token_amounts[1]
  );

  poolTransaction.save();
}

export function handleRemoveLiquidity(event: RemoveLiquidityEvent): void {
  let entity = new RemoveLiquidity(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.provider = event.params.provider;
  entity.token_amounts = event.params.token_amounts;
  entity.fees = event.params.fees;
  entity.token_supply = event.params.token_supply;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // TODO: update User entity
  // txCount
  // totalUSD0 maybe
  // totalUSD0Plus maybe
  // lastActivity
  // TODO: update Pool entity
  // totalLiquidityUSD
  // TODO: update Position entity
  // TODO: create Transaction entity
}

export function handleRemoveLiquidityOne(event: RemoveLiquidityOneEvent): void {
  let entity = new RemoveLiquidityOne(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.provider = event.params.provider;
  entity.token_id = event.params.token_id;
  entity.token_amount = event.params.token_amount;
  entity.coin_amount = event.params.coin_amount;
  entity.token_supply = event.params.token_supply;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // TODO: update User entity
  // txCount
  // totalUSD0 maybe
  // totalUSD0Plus maybe
  // lastActivity
  // TODO: update Pool entity
  // totalLiquidityUSD
  // TODO: update Position entity
  // TODO: create Transaction entity
}

export function handleRemoveLiquidityImbalance(
  event: RemoveLiquidityImbalanceEvent
): void {
  let entity = new RemoveLiquidityImbalance(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.provider = event.params.provider;
  entity.token_amounts = event.params.token_amounts;
  entity.fees = event.params.fees;
  entity.invariant = event.params.invariant;
  entity.token_supply = event.params.token_supply;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // TODO: update User entity
  // txCount
  // totalUSD0 maybe
  // totalUSD0Plus maybe
  // lastActivity
  // TODO: update Pool entity
  // totalLiquidityUSD
  // TODO: update Position entity
  // TODO: create Transaction entity
}

export function handleRampA(event: RampAEvent): void {
  let entity = new RampA(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.old_A = event.params.old_A;
  entity.new_A = event.params.new_A;
  entity.initial_time = event.params.initial_time;
  entity.future_time = event.params.future_time;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleStopRampA(event: StopRampAEvent): void {
  let entity = new StopRampA(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.A = event.params.A;
  entity.t = event.params.t;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleApplyNewFee(event: ApplyNewFeeEvent): void {
  let entity = new ApplyNewFee(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.fee = event.params.fee;
  entity.offpeg_fee_multiplier = event.params.offpeg_fee_multiplier;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleSetNewMATime(event: SetNewMATimeEvent): void {
  let entity = new SetNewMATime(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.ma_exp_time = event.params.ma_exp_time;
  entity.D_ma_time = event.params.D_ma_time;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
