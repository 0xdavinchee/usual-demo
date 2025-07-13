# Usual USD0/USD0++ Curve Pool Subgraph

A comprehensive subgraph for indexing the Curve StableSwapNG USD0 / USD0++ pool between, designed to track USD0++ flows.

## 📊 What This Subgraph Tracks

### Core Entities

#### Pool

- **USD0/USD0++ Pool**: Tracks the Curve StableSwap NG pool at `0x1d08E7adC263CfC70b1BaBe6dC5Bb339c16Eec52`
- **Balances**: Real-time USD0 and USD0++ balances in the pool
- **Liquidity Flows**: Total lifetime liquidity added/removed for both tokens
- **Volume**: Total swap volume across the pool
- **Supply**: Total LP token supply

#### User

- **LP Token Balance**: Current LP token holdings per user
- **Share of Pool**: Percentage ownership of the pool
- **Activity Tracking**: Last activity timestamp and transaction count
- **Position Snapshots**: Historical snapshots of user positions

#### Events

- **Transfers**: LP token minting, burning, and transfers between users
- **Token Exchanges**: USD0 ↔ USD0++ swaps (both regular and underlying)
- **Liquidity Operations**: Add/remove liquidity events with various methods

### Key Features

1. **Real-time Position Tracking**: Monitors user LP token balances and pool shares
2. **Historical Snapshots**: Maintains immutable snapshots for reward calculations
3. **Comprehensive Event Coverage**: Handles all Curve StableSwap NG events
4. **USD0++ Flow Analysis**: Tracks USD0++ movements for reward distribution
5. **Single Pool Architecture**: Optimized for the specific USD0/USD0++ pool

## 🏗️ Architecture

### Event Handlers

- `handleTransfer`: LP token transfers, minting, burning
- `handleTokenExchange`: USD0 ↔ USD0++ swaps
- `handleTokenExchangeUnderlying`: Underlying token swaps
- `handleAddLiquidity`: Liquidity provision
- `handleRemoveLiquidity`: Standard liquidity removal
- `handleRemoveLiquidityOne`: Single-sided liquidity removal
- `handleRemoveLiquidityImbalance`: Imbalanced liquidity removal

### Entity Relationships

```
Pool ←→ Users (1:many)
User ←→ UserSnapshots (1:many)
Pool ←→ PoolSnapshots (1:many)
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- Yarn or npm
- Graph CLI

### Installation

1. **Clone the repository**

   ```bash
   git clone git@github.com:0xdavinchee/usual-demo.git
   cd usual-demo
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Generate types**

   ```bash
   yarn codegen
   ```

4. **Build the subgraph**
   ```bash
   yarn build
   ```

### Development

1. **Run tests**

   ```bash
   yarn test
   ```

2. **Deploy locally**

   ```bash
   yarn deploy-local
   ```

3. **Deploy to The Graph**
   ```bash
   yarn deploy
   ```

## 📈 Query Examples

### Get Pool Statistics

```graphql
{
    pool(id: "0x1d08E7adC263CfC70b1BaBe6dC5Bb339c16Eec52") {
      name
      usd0Balance
      usd0PlusBalance
      totalSupply
      volume
      usd0LiquidityAdded
      usd0LiquidityRemoved
      usd0PlusLiquidityAdded
      usd0PlusLiquidityRemoved
      createdAt
      updatedAt
    }
}
```

### Get User Position

```graphql
{
  user(id: $userId) {
    id
    lpTokenBalance
    shareOfPool
    lastActivity
    txCount
    userSnapshots(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      timestamp
      lpTokenBalance
      shareOfPool
    }
  }
}
```

## 🔧 Configuration

### Network

- **Network**: Ethereum Mainnet
- **Contract**: `0x1d08E7adC263CfC70b1BaBe6dC5Bb339c16Eec52`
- **Start Block**: `20169549`

### Token IDs

- **USD0**: `0`
- **USD0++**: `1`

## 🔍 Monitoring & Debugging

### Common Issues

1. **Negative Balances**: Fixed token exchange logic to prevent negative pool balances
2. **Division by Zero**: Protected share calculations with proper error handling
3. **Event Ordering**: Ensured proper handling of Transfer → Liquidity event sequences

### Logging

- Critical errors logged for zero total supply scenarios
- Comprehensive event tracking for debugging

## 🚀 Deployment

### Local Development

```bash
yarn create-local
yarn deploy-local
```

### Production

```bash
yarn deploy
```

**Built for Usual Protocol** - Pioneering equitable DeFi infrastructure where value flows back to the community.
