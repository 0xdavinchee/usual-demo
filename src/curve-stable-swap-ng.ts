import {
  Address,
  BigDecimal,
  BigInt,
  ethereum,
  log,
} from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  TokenExchange as TokenExchangeEvent,
  TokenExchangeUnderlying as TokenExchangeUnderlyingEvent,
  AddLiquidity as AddLiquidityEvent,
  RemoveLiquidity as RemoveLiquidityEvent,
  RemoveLiquidityOne as RemoveLiquidityOneEvent,
  RemoveLiquidityImbalance as RemoveLiquidityImbalanceEvent,
} from "../generated/CurveStableSwapNG/CurveStableSwapNG";
import {
  Transfer,
  TokenExchange,
  TokenExchangeUnderlying,
  AddLiquidity,
  RemoveLiquidity,
  RemoveLiquidityOne,
  RemoveLiquidityImbalance,
} from "../generated/schema";
import {
  getOrInitPool,
  getOrInitPoolSnapshot,
  getOrInitUser,
  getOrInitUserSnapshot,
} from "./mapping-initialisers";

const USD0_ID = BigInt.fromI32(0);

function calculateShareOfPool(
  lpTokenBalance: BigDecimal,
  totalSupply: BigDecimal
): BigDecimal {
  if (totalSupply.gt(BigDecimal.fromString("0"))) {
    return lpTokenBalance.div(totalSupply);
  } else {
    log.critical("Pool total supply is 0", []);
  }
  return BigDecimal.fromString("0");
}

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

    let userSnapshot = getOrInitUserSnapshot(user, event);
    userSnapshot.save();
  }

  // burn sender's LP tokens
  if (event.params.receiver.equals(Address.zero())) {
    let user = getOrInitUser(event.params.sender, event.address, event.block);
    user.lpTokenBalance = user.lpTokenBalance.minus(
      event.params.value.toBigDecimal()
    );
    user.save();

    let userSnapshot = getOrInitUserSnapshot(user, event);
    userSnapshot.save();
  }

  if (
    event.params.sender.notEqual(Address.zero()) &&
    event.params.receiver.notEqual(Address.zero())
  ) {
    let sender = getOrInitUser(event.params.sender, event.address, event.block);
    let receiver = getOrInitUser(
      event.params.receiver,
      event.address,
      event.block
    );
    let pool = getOrInitPool(event.address, event.block);

    sender.lpTokenBalance = sender.lpTokenBalance.minus(
      event.params.value.toBigDecimal()
    );
    sender.shareOfPool = calculateShareOfPool(
      sender.lpTokenBalance,
      pool.totalSupply
    );
    receiver.lpTokenBalance = receiver.lpTokenBalance.plus(
      event.params.value.toBigDecimal()
    );
    receiver.shareOfPool = calculateShareOfPool(
      receiver.lpTokenBalance,
      pool.totalSupply
    );
    sender.save();
    receiver.save();

    let senderSnapshot = getOrInitUserSnapshot(sender, event);
    senderSnapshot.save();

    let receiverSnapshot = getOrInitUserSnapshot(receiver, event);
    receiverSnapshot.save();
  }

  // TODO: this is the transfer of the LP tokens
  // There needs to be some way of calculating the corresponding amount of USD0 / USD0++
  // versus each LP token probably?
}

function processTokenExchange(
  event: ethereum.Event,
  buyer: Address,
  sold_id: BigInt,
  tokens_sold: BigInt,
  _bought_id: BigInt,
  tokens_bought: BigInt
): void {
  const isSellingUsd0 = sold_id.equals(USD0_ID);

  let pool = getOrInitPool(event.address, event.block);
  pool.updatedAt = event.block.timestamp;
  pool.volume = pool.volume.plus(tokens_sold).plus(tokens_bought);

  // When someone sells USD0, pool receives USD0 and gives USD0++
  if (isSellingUsd0) {
    pool.usd0Balance = pool.usd0Balance.plus(tokens_sold);  // Pool receives USD0
    pool.usd0PlusBalance = pool.usd0PlusBalance.minus(tokens_bought);  // Pool gives USD0++
  } else {
    // When someone sells USD0++, pool receives USD0++ and gives USD0
    pool.usd0Balance = pool.usd0Balance.minus(tokens_bought);  // Pool gives USD0
    pool.usd0PlusBalance = pool.usd0PlusBalance.plus(tokens_sold);  // Pool receives USD0++
  }
  pool.save();

  let poolSnapshot = getOrInitPoolSnapshot(pool, event);
  poolSnapshot.save();

  let user = getOrInitUser(buyer, event.address, event.block);
  user.lastActivity = event.block.timestamp;
  user.txCount = user.txCount.plus(BigInt.fromI32(1));
  user.save();

  let userSnapshot = getOrInitUserSnapshot(user, event);
  userSnapshot.save();
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

  let poolSnapshot = getOrInitPoolSnapshot(pool, event);
  poolSnapshot.save();

  let user = getOrInitUser(event.params.provider, event.address, event.block);
  user.lastActivity = event.block.timestamp;
  user.txCount = user.txCount.plus(BigInt.fromI32(1));

  // user.lpTokenBalance is updated in the handleTransfer function
  // Transfer event is emitted prior to AddLiquidity
  // so we need to calculate the share of pool after the transfer event
  // because pool.totalSupply is only updated here
  user.shareOfPool = calculateShareOfPool(
    user.lpTokenBalance,
    pool.totalSupply
  );

  user.save();

  let userSnapshot = getOrInitUserSnapshot(user, event);
  userSnapshot.save();
}

function processRemoveLiquidity(
  event: ethereum.Event,
  provider: Address,
  token_amounts: BigInt[],
  token_supply: BigInt
): void {
  let pool = getOrInitPool(event.address, event.block);
  pool.usd0Balance = pool.usd0Balance.minus(token_amounts[0]);
  pool.usd0PlusBalance = pool.usd0PlusBalance.minus(token_amounts[1]);
  pool.totalSupply = token_supply.toBigDecimal();
  pool.usd0LiquidityRemoved = pool.usd0LiquidityRemoved.plus(
    token_amounts[0].toBigDecimal()
  );
  pool.usd0PlusLiquidityRemoved = pool.usd0PlusLiquidityRemoved.plus(
    token_amounts[1].toBigDecimal()
  );
  pool.save();

  let poolSnapshot = getOrInitPoolSnapshot(pool, event);
  poolSnapshot.save();

  let user = getOrInitUser(provider, event.address, event.block);
  user.lastActivity = event.block.timestamp;
  user.txCount = user.txCount.plus(BigInt.fromI32(1));

  // user.lpTokenBalance is updated in the handleTransfer function
  // Transfer event is emitted prior to RemoveLiquidity
  // so we need to calculate the share of pool after the transfer event
  // because pool.totalSupply is only updated here
  user.shareOfPool = calculateShareOfPool(
    user.lpTokenBalance,
    pool.totalSupply
  );

  user.save();

  let userSnapshot = getOrInitUserSnapshot(user, event);
  userSnapshot.save();
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

  processRemoveLiquidity(
    event,
    event.params.provider,
    event.params.token_amounts,
    event.params.token_supply
  );
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

  processRemoveLiquidity(
    event,
    event.params.provider,
    entity.token_id.equals(USD0_ID)
      ? [entity.token_amount, BigInt.zero()]
      : [BigInt.zero(), entity.token_amount],
    event.params.token_supply
  );
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

  processRemoveLiquidity(
    event,
    event.params.provider,
    event.params.token_amounts,
    event.params.token_supply
  );
}
